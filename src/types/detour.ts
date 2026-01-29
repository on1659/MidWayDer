/**
 * Detour(이탈) 관련 타입 정의
 *
 * Detour Cost 계산 알고리즘과 관련된 타입들을 정의합니다.
 */

import { Place, Route } from './location';

/**
 * Detour Cost 정보
 *
 * A→B 경로에서 C를 경유할 때 증가하는 거리/시간입니다.
 */
export interface DetourCost {
  /** 증가하는 거리 (미터) - 양수: 우회, 음수: 단축(거의 없음) */
  distance: number;
  /** 증가하는 시간 (초) - 양수: 추가 소요, 음수: 단축(거의 없음) */
  duration: number;
  /** 정규화된 비용 점수 (0-100, 낮을수록 좋음) */
  costScore: number;
}

/**
 * Detour 계산 결과
 *
 * 한 경유지 후보에 대한 전체 분석 결과입니다.
 */
export interface DetourResult {
  /** 경유지 정보 */
  place: Place;

  /** Detour Cost (이탈 비용) */
  detourCost: DetourCost;

  /** 경로 정보 */
  routes: {
    /** A→B 원본 경로 */
    original: Route;
    /** A→C 경로 (출발지 → 경유지) */
    toWaypoint: Route;
    /** C→B 경로 (경유지 → 도착지) */
    fromWaypoint: Route;
  };

  /** 경로 근접도 점수 (0-100, 높을수록 경로와 가까움) */
  proximityScore: number;

  /** 최종 점수 (0-100, 높을수록 추천) */
  finalScore: number;
}

/**
 * 공간 필터링 옵션
 *
 * PostGIS 공간 쿼리 및 샘플링 관련 설정입니다.
 */
export interface SpatialFilterOptions {
  /** 경로 주변 버퍼 거리 (미터, 기본 1000m = 1km) */
  bufferDistance: number;

  /** 최대 허용 이탈 거리 (미터, 기본 5000m = 5km) */
  maxDetourDistance: number;

  /** Polyline 샘플링 간격 (미터, 기본 500m) */
  sampleInterval: number;
}

/**
 * 근접도 계산 결과
 *
 * 벡터 기반 경로 근접도 분석 결과입니다.
 */
export interface ProximityResult {
  /** 경유지 정보 */
  place: Place;

  /** 경로상 가장 가까운 포인트 인덱스 */
  closestPointIndex: number;

  /** 최소 거리 (미터) */
  minDistance: number;

  /** 경로 진행률 (0-1, 출발지=0, 도착지=1) */
  routeProgress: number;

  /** 근접도 점수 (0-100) */
  score: number;
}

/**
 * 샘플링된 경로 정보
 *
 * 일정 간격으로 샘플링된 경로 포인트들입니다.
 */
export interface SampledRoute {
  /** 원본 경로 정보 */
  original: Route;

  /** 샘플링된 포인트 배열 */
  sampledPoints: Array<{
    /** 좌표 */
    lat: number;
    lng: number;
    /** 원본 경로에서의 인덱스 */
    originalIndex: number;
    /** 누적 거리 (미터) */
    distance: number;
  }>;

  /** 샘플링 간격 (미터) */
  interval: number;
}

/**
 * Detour 계산 통계
 *
 * 성능 모니터링 및 디버깅용 통계 정보입니다.
 */
export interface DetourCalculationStats {
  /** 전체 후보 매장 수 (PostGIS 필터링 전) */
  totalCandidates: number;

  /** 공간 필터링 후 매장 수 */
  spatialFiltered: number;

  /** 근접도 필터링 후 매장 수 */
  proximityFiltered: number;

  /** 최종 정밀 분석 대상 수 */
  detourCalculated: number;

  /** Naver API 호출 횟수 */
  apiCallsUsed: number;

  /** 전체 소요 시간 (밀리초) */
  totalDuration: number;

  /** 각 단계별 소요 시간 */
  timings: {
    /** 원본 경로 조회 (ms) */
    originalRoute: number;
    /** 공간 필터링 (ms) */
    spatialFilter: number;
    /** 근접도 계산 (ms) */
    proximityScore: number;
    /** Detour Cost 계산 (ms) */
    detourCost: number;
  };
}

/**
 * 비용 점수 정규화 파라미터
 *
 * Detour Cost를 0-100 점수로 변환하는 파라미터입니다.
 */
export interface CostScoreParams {
  /** 거리 가중치 (0-1, 기본 0.6) */
  distanceWeight: number;

  /** 시간 가중치 (0-1, 기본 0.4) */
  durationWeight: number;

  /** 최대 허용 거리 증가 (미터, 기본 5000m) */
  maxDistanceIncrease: number;

  /** 최대 허용 시간 증가 (초, 기본 600s = 10분) */
  maxDurationIncrease: number;
}

/**
 * 최종 점수 가중치 설정
 */
export interface FinalScoreWeights {
  /** 이탈 비용 가중치 (0-1, 기본 0.7 = 70%) */
  detourCostWeight: number;

  /** 근접도 가중치 (0-1, 기본 0.3 = 30%) */
  proximityWeight: number;
}
