/**
 * Polyline 샘플링 유틸리티
 *
 * 경로를 일정 간격으로 샘플링하여 성능 최적화합니다.
 * 예: 10km 경로 → 500m 간격 → 20개 포인트
 */

import { RoutePoint } from '@/types/location';
import { haversineDistance } from '@/lib/utils';

/**
 * Polyline을 일정 간격으로 샘플링
 *
 * 예: 10km 경로 → 500m 간격 → 20개 포인트
 * 목적: PostGIS 쿼리 성능 향상, API 호출 감소
 *
 * @param path - 원본 경로 포인트 배열
 * @param intervalMeters - 샘플링 간격 (미터, 기본 500m)
 * @returns 샘플링된 경로 포인트 배열
 *
 * @example
 * const route = await getRoute(start, end);
 * const sampled = samplePolyline(route.path, 500);
 * // 10km 경로 → 약 20개 포인트로 축소
 */
export function samplePolyline(
  path: RoutePoint[],
  intervalMeters: number = 500
): RoutePoint[] {
  if (path.length === 0) return [];
  if (path.length === 1) return path;

  const sampled: RoutePoint[] = [path[0]]; // 시작점 포함
  let accumulatedDistance = 0;
  let nextSampleDistance = intervalMeters;

  for (let i = 1; i < path.length; i++) {
    const prev = path[i - 1];
    const curr = path[i];
    const segmentDistance = haversineDistance(prev, curr);

    accumulatedDistance += segmentDistance;

    // 샘플링 간격에 도달했는지 확인
    while (accumulatedDistance >= nextSampleDistance) {
      // 보간(interpolation)으로 정확한 샘플 포인트 계산
      const ratio =
        (nextSampleDistance - (accumulatedDistance - segmentDistance)) /
        segmentDistance;
      const sampledPoint: RoutePoint = {
        lat: prev.lat + (curr.lat - prev.lat) * ratio,
        lng: prev.lng + (curr.lng - prev.lng) * ratio,
        distance: nextSampleDistance,
        duration: undefined,
      };
      sampled.push(sampledPoint);
      nextSampleDistance += intervalMeters;
    }
  }

  // 종료점 포함 (정확히 간격에 맞지 않더라도)
  const lastPoint = path[path.length - 1];
  if (sampled[sampled.length - 1] !== lastPoint) {
    sampled.push(lastPoint);
  }

  return sampled;
}

/**
 * 경로 거리에 따라 동적 샘플링 간격 결정
 *
 * 규칙:
 * - 10km 이하: 500m 간격 (고밀도)
 * - 10-50km: 1km 간격 (중간)
 * - 50km 이상: 2km 간격 (저밀도)
 *
 * @param totalDistanceMeters - 전체 경로 거리 (미터)
 * @returns 최적 샘플링 간격 (미터)
 *
 * @example
 * getOptimalSampleInterval(5000)   // => 500  (5km → 500m 간격)
 * getOptimalSampleInterval(30000)  // => 1000 (30km → 1km 간격)
 * getOptimalSampleInterval(80000)  // => 2000 (80km → 2km 간격)
 */
export function getOptimalSampleInterval(totalDistanceMeters: number): number {
  if (totalDistanceMeters <= 10000) return 500;
  if (totalDistanceMeters <= 50000) return 1000;
  return 2000;
}
