/**
 * Detour 알고리즘 공유 상수
 *
 * 이 파일의 값을 변경하면 calculator.ts / proximity-scorer.ts
 * 양쪽에 동시 반영됩니다. 매직넘버를 한 곳에서 관리합니다.
 */

/** 도심 평균 주행 속도 (m/s). 약 20km/h 기준. */
export const URBAN_SPEED_MS = 5.6;

/** Cost Score 계산 시 거리 성분 가중치 (0-100 중 최대 60점) */
export const COST_DISTANCE_WEIGHT = 60;

/** Cost Score 계산 시 시간 성분 가중치 (0-100 중 최대 40점) */
export const COST_DURATION_WEIGHT = 40;

/**
 * 시간 정규화 기준 (초).
 * detourDuration이 이 값일 때 시간 성분 = COST_DURATION_WEIGHT점.
 */
export const COST_DURATION_NORM_SEC = 600;

/**
 * 이탈 거리 정규화 기준 (m) — calculateDetourCosts 기본값.
 * options.maxDetourDistance가 없으면 이 값을 사용.
 */
export const DEFAULT_MAX_DETOUR_DISTANCE = 3000;

/**
 * 근접도 점수 최대 허용 거리 (m).
 * 이 거리 이상이면 proximityScore = 0.
 */
export const MAX_PROXIMITY_DISTANCE = 800;

/**
 * 경로 진행률 컷오프 (0-1).
 * 이 비율 이상의 위치에 있는 매장은 proximityScore = 0 (목적지 근처 제외).
 */
export const ROUTE_CUTOFF_RATIO = 0.95;
