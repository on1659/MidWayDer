/**
 * PostGIS 공간 필터링
 *
 * ST_DWithin을 사용하여 경로 주변 매장을 효율적으로 필터링합니다.
 * 1차 필터링 단계로 1000개 후보 → 50개로 축소합니다.
 */

import { prisma } from '@/lib/db/prisma';
import { Route, Place } from '@/types/location';

/**
 * PostGIS ST_DWithin으로 경로 주변 매장 필터링
 *
 * 쿼리 예시:
 * SELECT * FROM Place
 * WHERE ST_DWithin(
 *   coordinates,
 *   ST_GeomFromText('LINESTRING(...)'),
 *   1000  -- 1km 버퍼
 * )
 *
 * @param route - 검색 대상 경로
 * @param category - 매장 카테고리 (예: "다이소", "스타벅스")
 * @param bufferDistance - 경로 주변 버퍼 거리 (미터, 기본 1000m)
 * @returns PostGIS 공간 쿼리로 필터링된 매장 목록
 *
 * @example
 * const route = await getRoute(start, end);
 * const candidates = await filterPlacesByRoute(route, '다이소', 1000);
 * // => 경로 1km 이내의 다이소 매장들 (최대 100개)
 */
export async function filterPlacesByRoute(
  route: Route,
  category: string,
  bufferDistance: number = 1000
): Promise<Place[]> {
  // Polyline → PostGIS LineString 변환
  // 형식: LINESTRING(lng1 lat1, lng2 lat2, ...)
  // 주의: PostGIS는 lng, lat 순서 (X, Y)
  const lineString = `LINESTRING(${route.path
    .map((p) => `${p.lng} ${p.lat}`)
    .join(',')})`;

  try {
    // PostGIS 공간 쿼리 (Raw SQL)
    // ST_DWithin: geography 타입으로 미터 단위 거리 계산
    const places = await prisma.$queryRaw<
      Array<{
        id: string;
        name: string;
        category: string;
        address: string;
        roadAddress: string | null;
        phone: string | null;
        lat: number;
        lng: number;
      }>
    >`
      SELECT
        id,
        name,
        category,
        address,
        "roadAddress",
        phone,
        ST_Y(coordinates::geometry) as lat,
        ST_X(coordinates::geometry) as lng
      FROM "Place"
      WHERE category = ${category}
        AND ST_DWithin(
          coordinates::geography,
          ST_GeomFromText(${lineString}, 4326)::geography,
          ${bufferDistance}
        )
      LIMIT 100
    `;

    // Place 타입으로 변환
    return places.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      address: p.address,
      roadAddress: p.roadAddress || undefined,
      phone: p.phone || undefined,
      coordinates: { lat: p.lat, lng: p.lng },
    }));
  } catch (error) {
    console.error('[Spatial Filter] PostGIS query failed:', error);
    throw new Error('DATABASE_ERROR');
  }
}
