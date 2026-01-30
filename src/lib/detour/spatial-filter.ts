/**
 * 공간 필터링 (Haversine 기반)
 *
 * 경로 주변 매장을 Haversine 거리 계산으로 필터링합니다.
 * 1차 필터링 단계로 전체 후보 → 경로 근처 매장으로 축소합니다.
 */

import { prisma } from '@/lib/db/prisma';
import { Route, Place } from '@/types/location';
import { Coordinates } from '@/types/location';
import { haversineDistance } from '@/lib/utils';

/**
 * 경로 주변 매장 필터링 (Haversine 거리 기반)
 *
 * 1) DB에서 카테고리별 매장을 조회 (bounding box로 1차 필터)
 * 2) 앱 레벨에서 경로 polyline과의 최소 거리를 Haversine으로 계산
 * 3) bufferDistance 이내 매장만 반환
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
    // Bounding box 계산 (경로의 min/max 좌표 + 버퍼)
    const lats = route.path.map((p) => p.lat);
    const lngs = route.path.map((p) => p.lng);
    // 약 0.01도 ≈ 1.1km
    const bufferDeg = (bufferDistance / 111000) * 1.2;
    const minLat = Math.min(...lats) - bufferDeg;
    const maxLat = Math.max(...lats) + bufferDeg;
    const minLng = Math.min(...lngs) - bufferDeg;
    const maxLng = Math.max(...lngs) + bufferDeg;

    // DB에서 bounding box 내 매장 조회
    const dbPlaces = await prisma.place.findMany({
      where: {
        category,
        lat: { gte: minLat, lte: maxLat },
        lng: { gte: minLng, lte: maxLng },
      },
    });

    // 경로 polyline과의 최소 거리로 2차 필터링
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
      if (filtered.length >= 100) break;
    }

    return filtered;
  } catch (error) {
    console.error('[Spatial Filter] Query failed:', error);
    throw new Error('DATABASE_ERROR');
  }
}

/**
 * 점과 polyline 간 최소 거리 (Haversine)
 */
function minDistanceToPolyline(
  point: Coordinates,
  polyline: Coordinates[]
): number {
  let min = Infinity;
  for (const seg of polyline) {
    const d = haversineDistance(point, seg);
    if (d < min) min = d;
    if (min < 10) break; // 충분히 가까우면 조기 종료
  }
  return min;
}
