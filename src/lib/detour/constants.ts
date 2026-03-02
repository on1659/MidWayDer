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

// ─── spatial-filter.ts 에서 이동 ───────────────────────────────

/** DB 결과 최소 임계값. 미달 시 카카오 API 보충 호출. */
export const MIN_DB_RESULTS = 10;

/** 공간 필터링 최대 결과 수. */
export const MAX_SPATIAL_RESULTS = 100;

/** 중복 매장 판정 거리 (m). 이 거리 이내면 동일 매장으로 간주. */
export const DEDUP_DISTANCE_M = 50;

/**
 * 폴리라인 최소 검사 포인트 수.
 * minDistanceToPolyline 내부 stride = ceil(polyline.length / 이 값).
 * 항상 최소 이 개수의 포인트를 검사하여 ±50m 이내 오차 보장.
 */
export const MIN_POLYLINE_CHECK_POINTS = 100;

// ─── proximity-scorer.ts 에서 이동 ────────────────────────────

/** 경로 중반(30-70%) 위치 가중치 보너스. */
export const POSITION_WEIGHT_MID_BONUS = 1.05;

/** 도착 근처(80-95%) 위치 가중치 감점. */
export const POSITION_WEIGHT_LATE_PENALTY = 0.95;

/** 경로 중반 시작 진행률 (0-1). */
export const POSITION_MID_START = 0.3;

/** 경로 중반 끝 진행률 (0-1). */
export const POSITION_MID_END = 0.7;

/** 경로 후반(도착 근처 감점 시작) 진행률 (0-1). */
export const POSITION_LATE_START = 0.8;
