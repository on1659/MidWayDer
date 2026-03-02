import { describe, it, expect, vi } from 'vitest';
import {
  findClosestPointOnRoute,
  estimateDetourDuration,
  calculateFinalScore,
  calculateDetourCosts,
  computePathDistance,
  calculateSingleDetourCost,
} from '../calculator';
import type { Route, Coordinates } from '@/types/location';

// PostGIS 공간 필터링 모킹 (DB 의존성 제거)
vi.mock('../spatial-filter', () => ({
  filterPlacesByRoute: vi.fn().mockResolvedValue([]),
}));

// ⚠️ 실제 시그니처: findClosestPointOnRoute(place: Coordinates, path: RoutePoint[])
describe('findClosestPointOnRoute', () => {
  it('경로 중간 좌표가 가장 가까운 포인트로 반환됨', () => {
    const midpoint = { lat: 37.532, lng: 127.003 };
    const path = [
      { lat: 37.5663, lng: 126.9779 },
      midpoint,
      { lat: 37.4979, lng: 127.0276 },
    ];
    const { distance, index } = findClosestPointOnRoute(midpoint, path);
    expect(distance).toBeCloseTo(0, 0); // 정확히 같은 좌표 → 거리 0
    expect(index).toBe(1);
  });

  it('경로 끝점 너머의 점은 끝점이 최근접', () => {
    const farPoint = { lat: 37.3, lng: 127.5 }; // 강남 훨씬 남쪽
    const path = [
      { lat: 37.5663, lng: 126.9779 },
      { lat: 37.4979, lng: 127.0276 },
    ];
    const { index } = findClosestPointOnRoute(farPoint, path);
    expect(index).toBe(1); // 끝점(index=1)이 가장 가까움
  });
});

// ⚠️ 실제 공식: Math.round((distance * 2) / 5.6) — 20km/h 왕복
describe('estimateDetourDuration', () => {
  it('3000m → 약 1071초 (도심 20km/h 왕복: 3000*2/5.6≈1071)', () => {
    const duration = estimateDetourDuration(3000);
    // 3000 * 2 / 5.6 ≈ 1071s (왕복 약 18분)
    expect(duration).toBeGreaterThan(1000);
    expect(duration).toBeLessThan(1200);
  });

  it('0m → 0초', () => {
    expect(estimateDetourDuration(0)).toBe(0);
  });
});

// calculateFinalScore: (100 - costScore) * 0.7 + proximityScore * 0.3
describe('calculateFinalScore', () => {
  it('costScore=0, proximityScore=100 → finalScore=100', () => {
    expect(calculateFinalScore(0, 100)).toBeCloseTo(100, 0);
  });

  it('costScore=0, proximityScore=0 → finalScore=70 (이탈비용 가중치만)', () => {
    expect(calculateFinalScore(0, 0)).toBeCloseTo(70, 0);
  });

  it('costScore=100, proximityScore=0 → finalScore=0', () => {
    expect(calculateFinalScore(100, 0)).toBeCloseTo(0, 0);
  });

  it('costScore=50, proximityScore=50 → finalScore=50', () => {
    expect(calculateFinalScore(50, 50)).toBeCloseTo(50, 0);
  });
});

describe('calculateDetourCosts — 통합', () => {
  it('공간필터 결과 0개 → 빈 results 반환', async () => {
    const mockRoute = {
      distance: 10500, duration: 1200,
      path: [{ lat: 37.5663, lng: 126.9779 }, { lat: 37.4979, lng: 127.0276 }],
      start: { lat: 37.5663, lng: 126.9779 },
      end: { lat: 37.4979, lng: 127.0276 },
    };
    const { results } = await calculateDetourCosts(mockRoute, '편의점');
    expect(results).toEqual([]);
  });
});

// ========== 엣지케이스 보강 ==========

describe('findClosestPointOnRoute — 엣지케이스', () => {
  it('경로가 단일 포인트일 때 index 0 반환', () => {
    const path = [{ lat: 37.5663, lng: 126.9779 }];
    const { index } = findClosestPointOnRoute({ lat: 37.5, lng: 127.0 }, path);
    expect(index).toBe(0);
  });

  it('모든 경로 포인트가 같을 때 첫 번째(index 0) 반환', () => {
    const pt = { lat: 37.5663, lng: 126.9779 };
    const path = [pt, pt, pt];
    const { index } = findClosestPointOnRoute({ lat: 37.6, lng: 127.0 }, path);
    expect(index).toBe(0);
  });
});

describe('calculateDetourCosts — 엣지케이스', () => {
  it('음수 거리가 입력되어도 crash 없이 빈 배열 반환', async () => {
    const route = {
      distance: -1, duration: -1,
      path: [{ lat: 37.5663, lng: 126.9779 }, { lat: 37.4979, lng: 127.0276 }],
      start: { lat: 37.5663, lng: 126.9779 },
      end: { lat: 37.4979, lng: 127.0276 },
    };
    const { results } = await calculateDetourCosts(route, '편의점');
    expect(results).toEqual([]);
  });

  it('카테고리 빈 문자열도 crash 없이 빈 배열 반환', async () => {
    const route = {
      distance: 5000, duration: 600,
      path: [{ lat: 37.5663, lng: 126.9779 }, { lat: 37.4979, lng: 127.0276 }],
      start: { lat: 37.5663, lng: 126.9779 },
      end: { lat: 37.4979, lng: 127.0276 },
    };
    const { results } = await calculateDetourCosts(route, '');
    expect(results).toEqual([]);
  });
});

describe('computePathDistance — endIdx clamp 방어 코드', () => {
  const path = [
    { lat: 37.5, lng: 126.9 },
    { lat: 37.51, lng: 126.91 },
    { lat: 37.52, lng: 126.92 },
  ];

  it('endIdx가 path.length를 초과해도 크래시 없이 전체 거리 반환', () => {
    const result = computePathDistance(path, 999);
    const expected = computePathDistance(path, 2); // path.length - 1 = 2
    expect(result).toBe(expected);
  });

  it('빈 path이면 0 반환', () => {
    expect(computePathDistance([], 5)).toBe(0);
  });

  it('endIdx=0이면 0 반환', () => {
    expect(computePathDistance(path, 0)).toBe(0);
  });
});

describe('estimateDetourDuration — 엣지케이스', () => {
  it('매우 큰 거리(100km)도 양의 정수 반환', () => {
    const duration = estimateDetourDuration(100000);
    expect(Number.isInteger(duration)).toBe(true);
    expect(duration).toBeGreaterThan(0);
  });
});

describe('computePathDistance', () => {
  it('단일 세그먼트 경로의 누적 거리 계산', () => {
    // 서울시청(126.9779, 37.5663) → 강남역(127.0276, 37.4979) ≈ 8.8km (Haversine)
    const path = [
      { lat: 37.5663, lng: 126.9779 },
      { lat: 37.4979, lng: 127.0276 },
    ];
    const dist = computePathDistance(path, 1);
    expect(dist).toBeGreaterThan(8000);   // 최소 8km
    expect(dist).toBeLessThan(12000);     // 최대 12km
  });

  it('endIdx=0이면 거리 0 반환', () => {
    const path = [{ lat: 37.5663, lng: 126.9779 }, { lat: 37.4979, lng: 127.0276 }];
    expect(computePathDistance(path, 0)).toBe(0);
  });

  it('toWaypoint + fromWaypoint 합산 = 전체 거리 (Haversine 가산성 검증)', () => {
    // 3개 포인트 경로: 서울시청 → 중간점 → 강남역
    const path = [
      { lat: 37.5663, lng: 126.9779 },
      { lat: 37.532, lng: 127.003 },  // 중간 경유지 근처
      { lat: 37.4979, lng: 127.0276 },
    ];
    const total = computePathDistance(path, 2);
    const toWpt = computePathDistance(path, 1);
    // fromWpt: 중간점부터 끝까지 독립 계산 (뺄셈이 아닌 별도 haversine 합산)
    const fromWpt = computePathDistance([path[1], path[2]], 1);
    // haversine은 가산적이어야 한다: 두 구간 합 ≈ 전체 구간
    expect(toWpt + fromWpt).toBeCloseTo(total, -2); // ±100m 허용
  });
});

describe('calculateSingleDetourCost — 일관성', () => {
  const baseRoute: Route = {
    distance: 10000,
    duration: 1200,
    path: [
      { lat: 37.5, lng: 127.0, distance: 0 },
      { lat: 37.51, lng: 127.01, distance: 10000 },
    ],
    start: { lat: 37.5, lng: 127.0 },
    end: { lat: 37.51, lng: 127.01 },
  };
  const waypoint: Coordinates = { lat: 37.505, lng: 127.005 }; // 경로 중간 근처

  it('기본 maxDetourDistance(3000) 사용 시 costScore 범위 [0,100]', () => {
    const { costScore } = calculateSingleDetourCost(baseRoute, waypoint);
    expect(costScore).toBeGreaterThanOrEqual(0);
    expect(costScore).toBeLessThanOrEqual(100);
  });

  it('커스텀 maxDetourDistance 전달 시 공식에 반영 — 분모 클수록 점수 낮음', () => {
    const score3000 = calculateSingleDetourCost(baseRoute, waypoint, 3000).costScore;
    const score5000 = calculateSingleDetourCost(baseRoute, waypoint, 5000).costScore;
    // detourDistance 동일하지만 분모가 다르므로 score3000 >= score5000
    expect(score3000).toBeGreaterThanOrEqual(score5000);
  });

  it('경로에 가까운 경유지가 먼 경유지보다 낮은 costScore', () => {
    const near: Coordinates = { lat: 37.5001, lng: 127.0 }; // 출발점 매우 근접
    const far: Coordinates = { lat: 37.506, lng: 127.0 };    // 출발점에서 더 먼 곳
    const scoreNear = calculateSingleDetourCost(baseRoute, near).costScore;
    const scoreFar = calculateSingleDetourCost(baseRoute, far).costScore;
    expect(scoreNear).toBeLessThan(scoreFar);
  });

  it('distance, duration, costScore 세 필드 모두 반환', () => {
    const result = calculateSingleDetourCost(baseRoute, waypoint);
    expect(typeof result.distance).toBe('number');
    expect(typeof result.duration).toBe('number');
    expect(typeof result.costScore).toBe('number');
  });
});
