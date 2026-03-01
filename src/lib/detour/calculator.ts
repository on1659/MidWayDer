/**
 * Detour Cost 계산 메인 로직 (v2)
 *
 * 핵심 원칙: 원본 경로(A→B)는 변하지 않음!
 * 경유지는 원본 경로 근처에서 찾고, "경로 이탈→경유지→복귀" 비용만 계산.
 *
 * 프로세스:
 * 1. Polyline 샘플링
 * 2. PostGIS 1차 필터링 (경로 버퍼 내)
 * 3. 벡터 근접도 2차 필터링
 * 4. Detour Cost = 원본 경로 위 가장 가까운 포인트 ↔ 경유지 왕복 거리/시간 추정
 * 5. 최종 점수 산출 → 상위 10개 반환
 *
 * API 호출 최소화: 원본 경로 1회만 호출, 경유지별 추가 호출 없음!
 */

import { Route, Place, Coordinates, RoutePoint } from '@/types/location';
import { DetourResult, SpatialFilterOptions } from '@/types/detour';
import { filterPlacesByRoute } from './spatial-filter';
import { samplePolyline, getOptimalSampleInterval } from './polyline-sampler';
import { filterByProximity } from './proximity-scorer';
import { haversineDistance } from '@/lib/utils';

/**
 * 경로 위 가장 가까운 포인트를 찾고, 해당 포인트에서 경유지까지의 이탈 비용 계산
 */
export function findClosestPointOnRoute(
  place: Coordinates,
  path: RoutePoint[]
): { closestPoint: RoutePoint; distance: number; index: number } {
  let minDist = Infinity;
  let closestPoint = path[0];
  let closestIndex = 0;

  for (let i = 0; i < path.length; i++) {
    const d = haversineDistance(place, path[i]);
    if (d < minDist) {
      minDist = d;
      closestPoint = path[i];
      closestIndex = i;
    }
  }

  return { closestPoint, distance: minDist, index: closestIndex };
}

/**
 * 경로 포인트 배열의 0번 인덱스부터 endIdx까지 누적 거리 계산
 * Haversine 거리를 연속 세그먼트 합산으로 구함
 */
export function computePathDistance(path: RoutePoint[], endIdx: number): number {
  let total = 0;
  for (let i = 0; i < endIdx; i++) {
    total += haversineDistance(path[i], path[i + 1]);
  }
  return Math.round(total);
}

/**
 * 직선거리 기반 detour 시간 추정 (도심 평균 속도 기준)
 * 왕복이므로 ×2, 도심 평균 20km/h = ~5.6m/s
 */
export function estimateDetourDuration(distanceMeters: number): number {
  const URBAN_SPEED_MS = 5.6; // 약 20km/h
  return Math.round((distanceMeters * 2) / URBAN_SPEED_MS);
}

/**
 * 최종 점수 계산 순수 함수 (테스트 용이성을 위해 분리)
 * 공식: (100 - costScore) * 0.7 + proximityScore * 0.3
 */
export function calculateFinalScore(costScore: number, proximityScore: number): number {
  return (100 - costScore) * 0.7 + proximityScore * 0.3;
}

export async function calculateDetourCosts(
  originalRoute: Route,
  category: string,
  options: Partial<SpatialFilterOptions> = {}
): Promise<{
  results: DetourResult[];
  totalCandidates: number;
  apiCallsUsed: number;
}> {
  const startTime = Date.now();

  const {
    bufferDistance = 500,
    maxDetourDistance = 3000,
    sampleInterval = getOptimalSampleInterval(originalRoute.distance),
  } = options;

  console.log('[Detour] Starting calculation (v2 - fixed route)...');
  console.log(`[Detour] Route: ${originalRoute.distance}m, ${originalRoute.duration}s`);
  console.log(`[Detour] Category: ${category}`);

  // Step 1: Polyline 샘플링
  const sampledPoints = samplePolyline(originalRoute.path, sampleInterval);
  console.log(`[Detour] Sampled ${sampledPoints.length} points (interval: ${sampleInterval}m)`);

  // Step 2: PostGIS 공간 필터링 (1차)
  const spatialCandidates = await filterPlacesByRoute(
    originalRoute,
    category,
    bufferDistance
  );
  console.log(`[Detour] Spatial filter: ${spatialCandidates.length} candidates`);

  if (spatialCandidates.length === 0) {
    return { results: [], totalCandidates: 0, apiCallsUsed: 1 };
  }

  // Step 3: 벡터 근접도 필터링 (2차)
  const proximityFiltered = filterByProximity(
    spatialCandidates,
    sampledPoints,
    originalRoute,
    20
  );
  console.log(`[Detour] Proximity filter: ${proximityFiltered.length} candidates`);

  if (proximityFiltered.length === 0) {
    return { results: [], totalCandidates: spatialCandidates.length, apiCallsUsed: 1 };
  }

  // Step 4: Detour Cost 계산 (API 호출 없이 직선거리 기반)
  // 원본 경로는 변하지 않음! 경로 위 가장 가까운 포인트 ↔ 경유지 왕복만 계산.
  console.log('[Detour] Calculating detour costs (route-fixed mode)...');

  const detourResults: DetourResult[] = [];

  for (const { place, proximityScore } of proximityFiltered) {
    const { closestPoint, distance: distToRoute, index: closestIdx } = findClosestPointOnRoute(
      place.coordinates,
      originalRoute.path
    );

    // 왕복 이탈 거리 (경로 → 경유지 → 경로)
    const detourDistance = Math.round(distToRoute * 2);
    const detourDuration = estimateDetourDuration(distToRoute);

    // 최대 허용 이탈 거리 초과 시 제외
    if (detourDistance > maxDetourDistance) {
      continue;
    }

    // Cost Score 정규화 (0-100, 낮을수록 좋음)
    const costScore = Math.min(
      100,
      (detourDistance / maxDetourDistance) * 60 + (detourDuration / 600) * 40
    );

    // 최종 점수 = (100 - costScore) * 0.7 + proximityScore * 0.3
    const finalScore = (100 - costScore) * 0.7 + proximityScore * 0.3;

    const toWaypointDistance = computePathDistance(originalRoute.path, closestIdx);
    const toWaypointDuration = originalRoute.duration > 0 && originalRoute.distance > 0
      ? Math.round((toWaypointDistance / originalRoute.distance) * originalRoute.duration)
      : 0;

    const result: DetourResult = {
      place,
      detourCost: {
        distance: detourDistance,
        duration: detourDuration,
        costScore,
      },
      routes: {
        original: originalRoute,
        // 경유지 경로는 원본 경로 그대로 사용 (경로가 바뀌지 않음)
        toWaypoint: {
          ...originalRoute,
          // 출발지 → 경유지 가장 가까운 경로 포인트까지만 표시
          path: originalRoute.path.slice(0, closestIdx + 1),
          distance: toWaypointDistance,
          duration: toWaypointDuration,
        },
        fromWaypoint: {
          ...originalRoute,
          // 경유지 가장 가까운 경로 포인트 → 도착지까지
          path: originalRoute.path.slice(closestIdx),
          distance: originalRoute.distance - toWaypointDistance,
          duration: originalRoute.duration - toWaypointDuration,
          start: closestPoint,
          end: originalRoute.end,
        },
      },
      proximityScore,
      finalScore,
    };

    detourResults.push(result);
  }

  // 최종 점수 내림차순 정렬, 상위 10개
  detourResults.sort((a, b) => b.finalScore - a.finalScore);
  const validResults = detourResults.slice(0, 10);

  const apiCallsUsed = 1; // 원본 경로 조회 1회만!
  const duration = Date.now() - startTime;

  console.log(`[Detour] Completed in ${duration}ms`);
  console.log(`[Detour] API calls: ${apiCallsUsed} (no per-waypoint calls!)`);
  console.log(`[Detour] Final results: ${validResults.length} places`);

  validResults.slice(0, 3).forEach((r, i) => {
    console.log(
      `[Detour] ${i + 1}. ${r.place.name} - ` +
        `Detour: +${r.detourCost.distance}m / +${r.detourCost.duration}s, ` +
        `Score: ${r.finalScore.toFixed(1)}`
    );
  });

  return {
    results: validResults,
    totalCandidates: spatialCandidates.length,
    apiCallsUsed,
  };
}

/**
 * 단일 경유지에 대한 Detour Cost 계산 (경로 고정 방식)
 */
export function calculateSingleDetourCost(
  originalRoute: Route,
  waypoint: Coordinates
): {
  distance: number;
  duration: number;
  costScore: number;
} {
  const { distance: distToRoute } = findClosestPointOnRoute(waypoint, originalRoute.path);
  const detourDistance = Math.round(distToRoute * 2);
  const detourDuration = estimateDetourDuration(distToRoute);

  const costScore = Math.min(
    100,
    (detourDistance / 5000) * 60 + (detourDuration / 600) * 40
  );

  return { distance: detourDistance, duration: detourDuration, costScore };
}
