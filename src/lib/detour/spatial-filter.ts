/**
 * 공간 필터링 (하이브리드: DB + Kakao Local Search)
 *
 * 1) DB에서 경로 주변 매장을 Haversine 거리로 필터링
 * 2) 결과가 부족하면 (< 10개) 카카오 키워드 검색으로 보충
 * 3) 카카오 결과를 DB에 캐싱 (upsert)
 */

import { prisma } from '@/lib/db/prisma';
import { Route, Place, Coordinates } from '@/types/location';
import { haversineDistance } from '@/lib/utils';
import { KakaoSearchProvider } from '@/lib/map-provider/kakao/search';
import { logger } from '@/lib/logger';
import { DatabaseError } from '@/lib/errors';
import {
  MIN_DB_RESULTS,
  MAX_SPATIAL_RESULTS,
  DEDUP_DISTANCE_M,
  MIN_POLYLINE_CHECK_POINTS,
} from './constants';

const kakaoSearch = new KakaoSearchProvider();

/**
 * 경로 주변 매장 필터링 (하이브리드)
 *
 * @param route - 검색 대상 경로
 * @param category - 매장 카테고리 (예: "다이소", "스타벅스")
 * @param bufferDistance - 경로 주변 버퍼 거리 (미터, 기본 1000m)
 * @returns 경로 근처 매장 목록 (최대 100개)
 */
export async function filterPlacesByRoute(
  route: Route,
  category: string,
  bufferDistance: number = 1000
): Promise<Place[]> {
  // ▼ 신규: 입력 검증
  if (bufferDistance <= 0 || !Number.isFinite(bufferDistance)) {
    throw new Error(`Invalid bufferDistance: ${bufferDistance}`);
  }
  // ▲ 이후 기존 try 블록 그대로 유지
  try {
    // === Phase 1: DB 조회 ===
    const dbPlaces = await queryDbPlaces(route, category, bufferDistance);
    logger.debug(`[Spatial Filter] DB hit: ${dbPlaces.length}개 (category=${category})`);

    if (dbPlaces.length >= MIN_DB_RESULTS) {
      return dbPlaces.slice(0, MAX_SPATIAL_RESULTS);
    }

    // === Phase 2: 카카오 API 보충 ===
    logger.debug(`[Spatial Filter] DB 결과 부족 (${dbPlaces.length}/${MIN_DB_RESULTS}), 카카오 API 호출`);
    const kakaoPlaces = await fetchFromKakao(route, category, bufferDistance);
    logger.debug(`[Spatial Filter] 카카오 API 결과: ${kakaoPlaces.length}개`);

    // === Phase 3: 중복 제거 & 병합 ===
    const merged = deduplicatePlaces([...dbPlaces, ...kakaoPlaces]);
    logger.debug(`[Spatial Filter] 중복 제거 후: ${merged.length}개`);

    // === Phase 4: 카카오 결과 DB 캐싱 (타임아웃 3초 내 완료 대기) ===
    const UPSERT_TIMEOUT_MS = 3000;
    try {
      await Promise.race([
        upsertPlacesToDb(kakaoPlaces, category),
        new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error('upsert timeout')), UPSERT_TIMEOUT_MS)
        ),
      ]);
    } catch (err) {
      logger.error('[Spatial Filter] DB upsert 실패 (무시):', err);
    }

    return merged.slice(0, MAX_SPATIAL_RESULTS);
  } catch (error) {
    logger.error('[Spatial Filter] Query failed:', error);
    throw new DatabaseError('Spatial query failed', error);
  }
}

// ========================
// Phase 1: DB 조회
// ========================

async function queryDbPlaces(
  route: Route,
  category: string,
  bufferDistance: number
): Promise<Place[]> {
  // 방어 코드: 경로 포인트가 없으면 즉시 반환
  if (route.path.length === 0) {
    logger.warn('[Spatial Filter] queryDbPlaces: empty route.path, skipping DB query');
    return [];
  }

  // 단일 패스로 bounding box 계산 (6회 순회 → 1회 순회)
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  for (const p of route.path) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
  }

  const centerLat = (minLat + maxLat) / 2;
  const latBufferDeg = bufferDistance / 111000;
  const lngBufferDeg = bufferDistance / (111000 * Math.cos(centerLat * Math.PI / 180));
  const queryMinLat = minLat - latBufferDeg;
  const queryMaxLat = maxLat + latBufferDeg;
  const queryMinLng = minLng - lngBufferDeg;
  const queryMaxLng = maxLng + lngBufferDeg;

  // DB 쿼리에 take 제한 추가 (과도한 데이터 로드 방지)
  const dbPlaces = await prisma.place.findMany({
    where: {
      category,
      lat: { gte: queryMinLat, lte: queryMaxLat },
      lng: { gte: queryMinLng, lte: queryMaxLng },
    },
    take: MAX_SPATIAL_RESULTS * 3, // 필터링 후에도 충분한 결과 확보
  });

  const filtered: Place[] = [];
  for (const p of dbPlaces) {
    const placeCoord: Coordinates = { lat: p.lat, lng: p.lng };
    const minDist = minDistanceToPolyline(placeCoord, route.path);
    if (minDist <= bufferDistance) {
      filtered.push({
        id: p.id,
        name: p.name,
        category: p.category,
        address: p.address,
        roadAddress: p.roadAddress || undefined,
        phone: p.phone || undefined,
        coordinates: placeCoord,
      });
    }
    if (filtered.length >= MAX_SPATIAL_RESULTS) break;
  }

  return filtered;
}

// ========================
// Phase 2: 카카오 API 검색
// ========================

/**
 * 경로 길이에 따라 샘플 포인트 수 결정
 */
function getSampleCount(routeDistanceM: number): number {
  if (routeDistanceM <= 10000) return 3;
  if (routeDistanceM <= 30000) return 4;
  return 5;
}

/**
 * 경로에서 균등 간격으로 포인트 샘플링
 */
function sampleRoutePoints(route: Route, count: number): Coordinates[] {
  const path = route.path;
  if (path.length === 0) return [];
  if (path.length === 1 || count <= 1) return [path[0]];

  const points: Coordinates[] = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.round((i / (count - 1)) * (path.length - 1));
    points.push({ lat: path[idx].lat, lng: path[idx].lng });
  }
  return points;
}

// 지수 백오프 헬퍼 (내부 사용)
async function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchFromKakao(
  route: Route,
  category: string,
  bufferDistance: number
): Promise<Place[]> {
  const sampleCount = getSampleCount(route.distance);
  const samplePoints = sampleRoutePoints(route, sampleCount);
  const radius = Math.min(bufferDistance, 20000);

  // 도착지 주변도 추가 검색 (도착지 1km 반경)
  const endPoint = route.end;

  logger.debug(`[Spatial Filter] 카카오 검색: ${sampleCount}개 포인트 + 도착지 주변, radius=${radius}m`);

  const allPlaces: Place[] = [];

  // 경로 샘플 포인트 검색
  const BACKOFF_BASE_MS = 500;
  const BACKOFF_MAX_MS = 5000;
  const CIRCUIT_BREAKER_THRESHOLD = 3;

  let failCount = 0;
  let consecutiveFails = 0;

  for (const center of samplePoints) {
    // Circuit breaker: 연속 3회 실패 시 early-exit
    if (consecutiveFails >= CIRCUIT_BREAKER_THRESHOLD) {
      logger.error(
        `[Spatial Filter] Circuit breaker 발동: 연속 ${consecutiveFails}회 실패, 루프 중단`
      );
      break;
    }

    try {
      const places = await kakaoSearch.searchPlaces(category, {
        center,
        radius,
        maxResults: 15,
      });
      allPlaces.push(...places);
      consecutiveFails = 0; // 성공 시 리셋
    } catch (err) {
      failCount++;
      consecutiveFails++;
      // 지수 백오프: 500ms → 1000ms → 2000ms → 4000ms → 최대 5000ms
      const backoffMs = Math.min(BACKOFF_BASE_MS * Math.pow(2, consecutiveFails - 1), BACKOFF_MAX_MS);
      logger.warn(
        `[Spatial Filter] 카카오 검색 실패 (연속 ${consecutiveFails}회), ${backoffMs}ms 대기:`,
        err
      );
      await sleepMs(backoffMs);
    }
  }

  if (samplePoints.length > 0 && failCount > samplePoints.length / 2) {
    if (allPlaces.length > 0) {
      logger.warn(
        `[Spatial Filter] 카카오 API 과반 실패 (${failCount}/${samplePoints.length}), 부분 결과 반환: ${allPlaces.length}개 (성공한 ${samplePoints.length - failCount}/${samplePoints.length} 포인트)`
      );
      // fall-through: allPlaces의 부분 결과를 그대로 사용
    } else {
      logger.error(
        `[Spatial Filter] 카카오 API 과반 실패 (${failCount}/${samplePoints.length}). 결과 없음.`
      );
      return [];
    }
  }

  // 도착지 주변 추가 검색 (1km 반경, 도착 직전/직후 매장)
  try {
    const endPlaces = await kakaoSearch.searchPlaces(category, {
      center: endPoint,
      radius: 1000,
      maxResults: 10,
    });
    allPlaces.push(...endPlaces);
    logger.debug(`[Spatial Filter] 도착지 주변: ${endPlaces.length}개`);
  } catch (err) {
    logger.warn(`[Spatial Filter] 도착지 주변 검색 실패:`, err);
  }

  // 경로 버퍼 내 필터링 (도착지 근처는 1km까지 허용)
  return allPlaces.filter((p) => {
    const minDistToRoute = minDistanceToPolyline(p.coordinates, route.path);
    const distToEnd = haversineDistance(p.coordinates, endPoint);
    return minDistToRoute <= bufferDistance || distToEnd <= 1000;
  });
}

// ========================
// Phase 3: 중복 제거
// ========================

export function deduplicatePlaces(places: Place[]): Place[] {
  const LAT_CELL_DEG = DEDUP_DISTANCE_M / 111000;
  // 서비스 지역(한국, 평균 위도 37°) 기준 경도 cos 보정
  // cos(37° × π/180) ≈ 0.7986 → 경도 1° ≈ 88.7km
  const LNG_CELL_DEG = DEDUP_DISTANCE_M / (111000 * Math.cos(37 * Math.PI / 180));
  // key: "latCell,lngCell" → Place[]
  const grid = new Map<string, Place[]>();

  const cellKey = (lat: number, lng: number) =>
    `${Math.floor(lat / LAT_CELL_DEG)},${Math.floor(lng / LNG_CELL_DEG)}`;

  const isDuplicate = (candidate: Place): boolean => {
    const lat = candidate.coordinates.lat;
    const lng = candidate.coordinates.lng;
    const latCell = Math.floor(lat / LAT_CELL_DEG);
    const lngCell = Math.floor(lng / LNG_CELL_DEG);

    // 주변 3×3 셀 확인
    for (let dLat = -1; dLat <= 1; dLat++) {
      for (let dLng = -1; dLng <= 1; dLng++) {
        const key = `${latCell + dLat},${lngCell + dLng}`;
        const cell = grid.get(key);
        if (!cell) continue;
        for (const existing of cell) {
          if (haversineDistance(existing.coordinates, candidate.coordinates) < DEDUP_DISTANCE_M) {
            return true;
          }
        }
      }
    }
    return false;
  };

  const result: Place[] = [];
  for (const place of places) {
    if (!isDuplicate(place)) {
      result.push(place);
      const key = cellKey(place.coordinates.lat, place.coordinates.lng);
      const cell = grid.get(key) ?? [];
      cell.push(place);
      grid.set(key, cell);
    }
  }
  return result;
}

// ========================
// Phase 4: DB 캐싱
// ========================

async function upsertPlacesToDb(places: Place[], category: string): Promise<void> {
  let upserted = 0;
  for (const place of places) {
    // kakao-{id} 형태에서 카카오 ID 추출
    const kakaoId = place.id.startsWith('kakao-') ? place.id.slice(6) : null;

    try {
      if (kakaoId) {
        await prisma.place.upsert({
          where: { kakaoPlaceId: kakaoId },
          update: {
            name: place.name,
            address: place.address,
            roadAddress: place.roadAddress || null,
            phone: place.phone || null,
            lat: place.coordinates.lat,
            lng: place.coordinates.lng,
            updatedAt: new Date(),
          },
          create: {
            name: place.name,
            category,
            address: place.address,
            roadAddress: place.roadAddress || null,
            phone: place.phone || null,
            lat: place.coordinates.lat,
            lng: place.coordinates.lng,
            kakaoPlaceId: kakaoId,
          },
        });
      } else {
        // kakaoPlaceId 없으면 name+category+address 기준
        await prisma.place.upsert({
          where: {
            name_category_address: {
              name: place.name,
              category,
              address: place.address,
            },
          },
          update: {
            lat: place.coordinates.lat,
            lng: place.coordinates.lng,
            roadAddress: place.roadAddress || null,
            phone: place.phone || null,
            updatedAt: new Date(),
          },
          create: {
            name: place.name,
            category,
            address: place.address,
            roadAddress: place.roadAddress || null,
            phone: place.phone || null,
            lat: place.coordinates.lat,
            lng: place.coordinates.lng,
          },
        });
      }
      upserted++;
    } catch (err) {
      logger.warn(`[Spatial Filter] upsert 실패 (${place.name}):`, err);
    }
  }
  logger.debug(`[Spatial Filter] DB 캐싱 완료: ${upserted}/${places.length}개 upsert`);
}

// ========================
// 유틸리티
// ========================

/**
 * 폴리라인 위 가장 가까운 포인트까지의 거리 계산
 * @param stride - 폴리라인 포인트 샘플링 간격 (기본 10 = 10번째마다 계산)
 *                 500포인트 → 50포인트로 축소. 정확도 ±50m 수준.
 */
export function minDistanceToPolyline(
  point: Coordinates,
  polyline: Coordinates[]
): number {
  // 폴리라인 길이에 따라 항상 최소 MIN_POLYLINE_CHECK_POINTS개 검사
  const effectiveStride = Math.max(1, Math.ceil(polyline.length / MIN_POLYLINE_CHECK_POINTS));
  let min = Infinity;
  for (let i = 0; i < polyline.length; i += effectiveStride) {
    const d = haversineDistance(point, polyline[i]);
    if (d < min) min = d;
    if (min < 10) break;
  }
  return min;
}
