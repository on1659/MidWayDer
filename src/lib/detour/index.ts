/**
 * Detour Cost 계산 라이브러리
 *
 * 경유지 추천을 위한 핵심 알고리즘 모듈입니다.
 *
 * @example
 * ```ts
 * import { calculateDetourCosts } from '@/lib/detour';
 *
 * const route = await getRoute(start, end);
 * const { results } = await calculateDetourCosts(route, '다이소');
 * console.log(results[0].place.name); // 최적 경유지
 * ```
 */

// 메인 계산 함수
export { calculateDetourCosts, calculateSingleDetourCost } from './calculator';

// 샘플링 유틸리티
export { samplePolyline, getOptimalSampleInterval } from './polyline-sampler';

// 공간 필터링
export { filterPlacesByRoute } from './spatial-filter';

// 근접도 점수 계산
export { calculateProximityScore, filterByProximity } from './proximity-scorer';
