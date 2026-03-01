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

const MIN_DB_RESULTS = 10;
const MAX_RESULTS = 100;
const DEDUP_DISTANCE_M = 50;

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
  try {
    // === Phase 1: DB 조회 ===
    const dbPlaces = await queryDbPlaces(route, category, bufferDistance);
    logger.debug(`[Spatial Filter] DB hit: ${dbPlaces.length}개 (category=${category})`);

    if (dbPlaces.length >= MIN_DB_RESULTS) {
      return dbPlaces.slice(0, MAX_RESULTS);
    }

    // === Phase 2: 카카오 API 보충 ===
    logger.debug(`[Spatial Filter] DB 결과 부족 (${dbPlaces.length}/${MIN_DB_RESULTS}), 카카오 API 호출`);
    const kakaoPlaces = await fetchFromKakao(route, category, bufferDistance);
    logger.debug(`[Spatial Filter] 카카오 API 결과: ${kakaoPlaces.length}개`);

    // === Phase 3: 중복 제거 & 병합 ===
    const merged = deduplicatePlaces([...dbPlaces, ...kakaoPlaces]);
    logger.debug(`[Spatial Filter] 중복 제거 후: ${merged.length}개`);

    // === Phase 4: 카카오 결과 DB 캐싱 (비동기, 실패해도 결과 반환) ===
    upsertPlacesToDb(kakaoPlaces, category).catch((err) =>
      console.error('[Spatial Filter] DB upsert 실패:', err)
    );

    return merged.slice(0, MAX_RESULTS);
  } catch (error) {
    console.error('[Spatial Filter] Query failed:', error);
    throw new Error('DATABASE_ERROR');
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
    console.warn('[Spatial Filter] queryDbPlaces: empty route.path, skipping DB query');
    return [];
  }

  const lats = route.path.map((p) => p.lat);
  const lngs = route.path.map((p) => p.lng);
  const bufferDeg = (bufferDistance / 111000) * 1.2;
  const minLat = Math.min(...lats) - bufferDeg;
  const maxLat = Math.max(...lats) + bufferDeg;
  const minLng = Math.min(...lngs) - bufferDeg;
  const maxLng = Math.max(...lngs) + bufferDeg;

  const dbPlaces = await prisma.place.findMany({
    where: {
      category,
      lat: { gte: minLat, lte: maxLat },
      lng: { gte: minLng, lte: maxLng },
    },
  });

  const filtered: Place[] = [];
  for (const p of dbPlaces) {
    const placeCoord: Coordinates = { lat: p.lat, lng: p.lng };
    const minDist = minDistanceToPolyline(placeCoord, route.path, 10);
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
    if (filtered.length >= MAX_RESULTS) break;
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
  for (const center of samplePoints) {
    try {
      const places = await kakaoSearch.searchPlaces(category, {
        center,
        radius,
        maxResults: 15,
      });
      allPlaces.push(...places);
    } catch (err) {
      console.warn(`[Spatial Filter] 카카오 검색 실패 (${center.lat},${center.lng}):`, err);
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
    console.warn(`[Spatial Filter] 도착지 주변 검색 실패:`, err);
  }

  // 경로 버퍼 내 필터링 (도착지 근처는 1km까지 허용)
  return allPlaces.filter((p) => {
    const minDistToRoute = minDistanceToPolyline(p.coordinates, route.path, 10);
    const distToEnd = haversineDistance(p.coordinates, endPoint);
    return minDistToRoute <= bufferDistance || distToEnd <= 1000;
  });
}

// ========================
// Phase 3: 중복 제거
// ========================

export function deduplicatePlaces(places: Place[]): Place[] {
  const CELL_DEG = DEDUP_DISTANCE_M / 111000; // 위경도 셀 크기
  // key: "latCell,lngCell" → Place[]
  const grid = new Map<string, Place[]>();

  const cellKey = (lat: number, lng: number) =>
    `${Math.floor(lat / CELL_DEG)},${Math.floor(lng / CELL_DEG)}`;

  const isDuplicate = (candidate: Place): boolean => {
    const lat = candidate.coordinates.lat;
    const lng = candidate.coordinates.lng;
    const latCell = Math.floor(lat / CELL_DEG);
    const lngCell = Math.floor(lng / CELL_DEG);

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
      console.warn(`[Spatial Filter] upsert 실패 (${place.name}):`, err);
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
  polyline: Coordinates[],
  stride: number = 10
): number {
  let min = Infinity;
  for (let i = 0; i < polyline.length; i += stride) {
    const d = haversineDistance(point, polyline[i]);
    if (d < min) min = d;
    if (min < 10) break;
  }
  return min;
}
