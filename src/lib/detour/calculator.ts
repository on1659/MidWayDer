/**
 * Detour Cost 계산 메인 로직
 *
 * 전체 프로세스를 통합하여 최적의 경유지를 추천합니다.
 * 1차 PostGIS 필터링 → 2차 벡터 근접도 필터링 → 정밀 Detour Cost 계산
 */

import { Route, Place, Coordinates } from '@/types/location';
import { DetourResult, SpatialFilterOptions } from '@/types/detour';
import { getDirectionsProvider } from '@/lib/map-provider';
import { filterPlacesByRoute } from './spatial-filter';
import { samplePolyline, getOptimalSampleInterval } from './polyline-sampler';
import { filterByProximity } from './proximity-scorer';

/**
 * Detour Cost 계산 및 최적 경유지 추천
 *
 * 전체 프로세스:
 * 1. Polyline 샘플링 (500m 간격)
 * 2. PostGIS 1차 필터링 (1km 버퍼) → 1000개 → 50개
 * 3. 벡터 근접도 2차 필터링 → 50개 → 20개
 * 4. Naver Directions API 호출 (A→C, C→B) → 20개 × 2 = 40회
 * 5. Detour Cost 계산 및 최종 점수 산출
 * 6. 정렬 후 상위 10개 반환
 *
 * @param originalRoute - A→B 원본 경로
 * @param category - 검색 카테고리 (예: "다이소", "스타벅스")
 * @param options - 공간 필터링 옵션
 * @returns 계산 결과 (상위 10개 경유지, 통계 정보)
 *
 * @example
 * ```ts
 * const originalRoute = await getRoute(
 *   { lat: 37.5663, lng: 126.9779 }, // 서울시청
 *   { lat: 37.4979, lng: 127.0276 }  // 강남역
 * );
 *
 * const { results, totalCandidates, apiCallsUsed } = await calculateDetourCosts(
 *   originalRoute,
 *   '다이소'
 * );
 *
 * console.log(`Top 3 results:`);
 * results.slice(0, 3).forEach((r, i) => {
 *   console.log(`${i + 1}. ${r.place.name}`);
 *   console.log(`   Detour: +${r.detourCost.distance}m / +${r.detourCost.duration}s`);
 *   console.log(`   Final Score: ${r.finalScore.toFixed(1)}`);
 * });
 * ```
 */
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

  // 옵션 기본값
  const {
    bufferDistance = 1000,
    maxDetourDistance = 5000,
    sampleInterval = getOptimalSampleInterval(originalRoute.distance),
  } = options;

  console.log('[Detour] Starting calculation...');
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
    console.log('[Detour] No candidates found within buffer distance');
    return { results: [], totalCandidates: 0, apiCallsUsed: 1 };
  }

  // Step 3: 벡터 근접도 필터링 (2차)
  const proximityFiltered = filterByProximity(
    spatialCandidates,
    sampledPoints,
    originalRoute,
    20 // 상위 20개
  );
  console.log(`[Detour] Proximity filter: ${proximityFiltered.length} candidates`);

  if (proximityFiltered.length === 0) {
    console.log('[Detour] No candidates passed proximity filtering');
    return { results: [], totalCandidates: spatialCandidates.length, apiCallsUsed: 1 };
  }

  // Step 4: Naver Directions API 병렬 호출 (A→C, C→B)
  console.log('[Detour] Calculating detour costs for top candidates...');
  const detourResults = await Promise.all(
    proximityFiltered.map(async ({ place, proximityScore }) => {
      try {
        const [toWaypoint, fromWaypoint] = await Promise.all([
          getDirectionsProvider().getRoute(originalRoute.start, place.coordinates),
          getDirectionsProvider().getRoute(place.coordinates, originalRoute.end),
        ]);

        // Detour Cost 계산
        const detourDistance =
          toWaypoint.distance + fromWaypoint.distance - originalRoute.distance;
        const detourDuration =
          toWaypoint.duration + fromWaypoint.duration - originalRoute.duration;

        // 최대 허용 이탈 거리 초과 시 제외
        if (detourDistance > maxDetourDistance) {
          console.log(
            `[Detour] ${place.name} exceeds max detour distance: +${detourDistance}m`
          );
          return null;
        }

        // Cost Score 정규화 (0-100, 낮을수록 좋음)
        // 거리 60%, 시간 40% 가중치
        const costScore = Math.min(
          100,
          (detourDistance / maxDetourDistance) * 60 + (detourDuration / 600) * 40
        );

        // 최종 점수 = (100 - costScore) * 0.7 + proximityScore * 0.3
        // costScore를 반전(100 - costScore)하여 높을수록 좋게 변환
        const finalScore = (100 - costScore) * 0.7 + proximityScore * 0.3;

        const result: DetourResult = {
          place,
          detourCost: {
            distance: detourDistance,
            duration: detourDuration,
            costScore,
          },
          routes: {
            original: originalRoute,
            toWaypoint,
            fromWaypoint,
          },
          proximityScore,
          finalScore,
        };

        return result;
      } catch (error) {
        console.warn(`[Detour] Route calculation failed for ${place.name}:`, error);
        return null;
      }
    })
  );

  // null 제거 및 최종 점수 내림차순 정렬
  const validResults = detourResults
    .filter((r): r is DetourResult => r !== null)
    .sort((a, b) => b.finalScore - a.finalScore)
    .slice(0, 10); // 상위 10개

  const apiCallsUsed = 1 + proximityFiltered.length * 2; // 원본 경로 1회 + (A→C, C→B) × N
  const duration = Date.now() - startTime;

  console.log(`[Detour] Completed in ${duration}ms`);
  console.log(`[Detour] API calls: ${apiCallsUsed}`);
  console.log(`[Detour] Final results: ${validResults.length} places`);

  // 상위 3개 결과 로그
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
 * 단일 경유지에 대한 Detour Cost 계산
 *
 * 특정 매장을 경유할 때 증가하는 거리/시간을 계산합니다.
 *
 * @param originalRoute - A→B 원본 경로
 * @param waypoint - 경유지 좌표
 * @returns Detour Cost 정보
 *
 * @example
 * ```ts
 * const cost = await calculateSingleDetourCost(
 *   originalRoute,
 *   { lat: 37.5300, lng: 126.9600 }
 * );
 * console.log(`+${cost.distance}m / +${cost.duration}s`);
 * ```
 */
export async function calculateSingleDetourCost(
  originalRoute: Route,
  waypoint: Coordinates
): Promise<{
  distance: number;
  duration: number;
  costScore: number;
}> {
  try {
    const [toWaypoint, fromWaypoint] = await Promise.all([
      getDirectionsProvider().getRoute(originalRoute.start, waypoint),
      getDirectionsProvider().getRoute(waypoint, originalRoute.end),
    ]);

    const detourDistance =
      toWaypoint.distance + fromWaypoint.distance - originalRoute.distance;
    const detourDuration =
      toWaypoint.duration + fromWaypoint.duration - originalRoute.duration;

    // Cost Score 정규화 (0-100, 낮을수록 좋음)
    const costScore = Math.min(
      100,
      (detourDistance / 5000) * 60 + (detourDuration / 600) * 40
    );

    return {
      distance: detourDistance,
      duration: detourDuration,
      costScore,
    };
  } catch (error) {
    console.error('[Detour] Failed to calculate single detour cost:', error);
    throw error;
  }
}
