/**
 * 벡터 기반 근접도 점수 계산
 *
 * 샘플링된 경로 포인트와 매장의 최소 거리를 계산하여
 * 경로 근접도 점수를 산출합니다 (0-100).
 * 2차 필터링 단계로 50개 후보 → 20개로 축소합니다.
 */

import { Place, RoutePoint, Route } from '@/types/location';
import { haversineDistance } from '@/lib/utils';

/**
 * 경로 근접도 점수 계산 (0-100)
 *
 * 원리:
 * 1. 샘플링된 경로 포인트들과 매장의 최소 거리 찾기
 * 2. 거리 기반 점수 변환 (0m=100점, 1000m=0점)
 * 3. 경로 후반부(80% 이후) 매장 제외 (목적지 근처는 의미 없음)
 * 4. 경로 중반부(40-60%)에 가중치 부여 (선택사항)
 *
 * @param place - 점수 계산 대상 매장
 * @param sampledPoints - 샘플링된 경로 포인트 배열
 * @param route - 원본 경로 정보 (미사용, 확장용)
 * @returns 근접도 점수 (0-100, 높을수록 경로와 가까움)
 *
 * @example
 * const sampled = samplePolyline(route.path, 500);
 * const score = calculateProximityScore(place, sampled, route);
 * // 경로에서 200m 떨어진 매장 → 약 80점
 * // 경로 후반부(90%) 매장 → 0점 (제외)
 */
export function calculateProximityScore(
  place: Place,
  sampledPoints: RoutePoint[],
  route: Route
): number {
  let minDistance = Infinity;
  let closestPointIndex = -1;

  // 각 샘플 포인트와의 거리 계산
  for (let i = 0; i < sampledPoints.length; i++) {
    const point = sampledPoints[i];
    const distance = haversineDistance(place.coordinates, point);

    if (distance < minDistance) {
      minDistance = distance;
      closestPointIndex = i;
    }
  }

  // sampledPoints가 1개 이하면 진행률 계산 불가 → 0 반환
  if (sampledPoints.length <= 1) {
    if (sampledPoints.length === 0) return 0;
    // 단일 포인트: 해당 포인트와의 거리만 계산, 진행률은 0으로 처리
    const singleDist = haversineDistance(place.coordinates, sampledPoints[0]);
    const MAX_DISTANCE = 800;
    const normalizedDist = Math.min(singleDist / MAX_DISTANCE, 1);
    return Math.max(0, 100 * (1 - normalizedDist * normalizedDist));
  }

  // 경로 진행률 계산 (0-1)
  const routeProgress = closestPointIndex / (sampledPoints.length - 1);

  // 경로 후반부(80% 이후) 매장 제외 (목적지 근처는 의미 없음)
  if (routeProgress >= 0.8) return 0;

  // 거리 기반 점수 변환 (비선형 — 가까울수록 훨씬 높은 점수)
  // 0m → 100점, 100m → 85점, 300m → 50점, 500m → 20점, 800m+ → ~0점
  const MAX_DISTANCE = 800;
  const normalizedDist = Math.min(minDistance / MAX_DISTANCE, 1);
  const distanceScore = Math.max(0, 100 * (1 - normalizedDist * normalizedDist));

  // 도착지 근처(80-95%)는 약간 보너스 (도착 직전에 들르기 편함)
  let positionWeight = 1.0;
  if (routeProgress >= 0.3 && routeProgress <= 0.7) {
    positionWeight = 1.05; // 경로 중반 약간 선호
  } else if (routeProgress >= 0.8 && routeProgress <= 0.95) {
    positionWeight = 0.95; // 도착 근처는 약간 감점
  }

  return Math.min(100, distanceScore * positionWeight);
}

/**
 * 근접도 점수로 상위 N개 필터링
 *
 * @param places - 필터링 대상 매장 목록
 * @param sampledPoints - 샘플링된 경로 포인트 배열
 * @param route - 원본 경로 정보
 * @param topN - 상위 N개 선택 (기본 20개)
 * @returns 점수 내림차순 정렬된 상위 N개 매장 및 점수
 *
 * @example
 * const candidates = await filterPlacesByRoute(route, '다이소');
 * const sampled = samplePolyline(route.path, 500);
 * const topCandidates = filterByProximity(candidates, sampled, route, 20);
 * // => 상위 20개 매장 (점수순)
 */
export function filterByProximity(
  places: Place[],
  sampledPoints: RoutePoint[],
  route: Route,
  topN: number = 20
): Array<{ place: Place; proximityScore: number }> {
  const scored = places
    .map((place) => ({
      place,
      proximityScore: calculateProximityScore(place, sampledPoints, route),
    }))
    .filter((item) => item.proximityScore > 0); // 점수 0인 항목 제외

  // 점수 내림차순 정렬 후 상위 N개
  scored.sort((a, b) => b.proximityScore - a.proximityScore);
  return scored.slice(0, topN);
}
