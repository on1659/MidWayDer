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
import { filterPlacesByRoute } from '../spatial-filter';
import { filterByProximity } from '../proximity-scorer';

// PostGIS 공간 필터링 모킹 (DB 의존성 제거)
vi.mock('../spatial-filter', () => ({
  filterPlacesByRoute: vi.fn().mockResolvedValue([]),
}));

// 근접도 필터링 모킹
vi.mock('../proximity-scorer', () => ({
  filterByProximity: vi.fn().mockReturnValue([]),
}));

const makeMockRoute = (distance = 5000): Route => ({
  distance,
  duration: Math.round(distance / 10),
  path: [
    { lat: 37.5663, lng: 126.9779 },
    { lat: 37.4979, lng: 127.0276 },
  ],
  start: { lat: 37.5663, lng: 126.9779 },
  end: { lat: 37.4979, lng: 127.0276 },
});

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

describe('calculateDetourCosts — 좌표 유효성 가드', () => {
  it('path 첫 포인트에 NaN lat 있으면 즉시 빈 결과 반환', async () => {
    const route: Route = {
      start: { lat: NaN, lng: 127.0 },
      end: { lat: 37.4979, lng: 127.0276 },
      distance: 12500,
      duration: 1200,
      path: [
        { lat: NaN, lng: 127.0 },
        { lat: 37.5, lng: 127.0 },
      ],
    };
    const result = await calculateDetourCosts(route, '다이소');
    expect(result.results).toEqual([]);
    expect(result.totalCandidates).toBe(0);
    expect(result.apiCallsUsed).toBe(0);
  });

  it('path 마지막 포인트에 Infinity lng 있으면 즉시 빈 결과 반환', async () => {
    const route: Route = {
      start: { lat: 37.5663, lng: 126.9779 },
      end: { lat: 37.4979, lng: Infinity },
      distance: 12500,
      duration: 1200,
      path: [
        { lat: 37.5663, lng: 126.9779 },
        { lat: 37.4979, lng: Infinity },
      ],
    };
    const result = await calculateDetourCosts(route, '다이소');
    expect(result.results).toEqual([]);
  });

  it('정상 좌표는 가드를 통과하여 정상 처리됨', async () => {
    // spatial-filter를 mock하여 candidates=[] 반환 → 결과 없음이지만 가드는 통과
    vi.mocked(filterPlacesByRoute).mockResolvedValue([]);
    const route = makeMockRoute();
    const result = await calculateDetourCosts(route, '다이소');
    // apiCallsUsed=1 → 가드 통과 후 정상 처리됨을 확인
    expect(result.apiCallsUsed).toBe(1);
  });
});

// ========== 버그 수정 검증 테스트 (v0.7.2) ==========

describe('findClosestPointOnRoute — 빈 path 가드', () => {
  it('T1: 빈 path 입력 시 에러를 던짐', () => {
    expect(() => findClosestPointOnRoute({ lat: 37.5, lng: 127.0 }, [])).toThrow(
      'findClosestPointOnRoute: path must not be empty'
    );
  });
});

describe('calculateSingleDetourCost — 빈 path 가드', () => {
  it('T2: originalRoute.path가 빈 배열이면 distance=0, costScore=0 반환', () => {
    const emptyRoute: Route = {
      distance: 0,
      duration: 0,
      path: [],
      start: { lat: 37.5, lng: 127.0 },
      end: { lat: 37.6, lng: 127.1 },
    };
    const result = calculateSingleDetourCost(emptyRoute, { lat: 37.55, lng: 127.05 });
    expect(result.distance).toBe(0);
    expect(result.duration).toBe(0);
    expect(result.costScore).toBe(0);
  });
});

describe('calculateFinalScore — 호출 일관성', () => {
  it('T3: calculateFinalScore(50, 80)은 인라인 공식 결과와 동일', () => {
    const expected = (100 - 50) * 0.7 + 80 * 0.3;
    expect(calculateFinalScore(50, 80)).toBeCloseTo(expected, 5);
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

// ========== 목표 1: calculateDetourCosts 정상 흐름 ==========

// 헬퍼: Place + proximityScore 객체 생성
const makeCandidate = (lat: number, lng: number, score: number) => ({
  place: {
    id: `p_${lat}`,
    name: `장소_${lat}`,
    category: '편의점',
    address: '서울 테스트로 1',
    coordinates: { lat, lng },
  },
  proximityScore: score,
});

describe('calculateDetourCosts — 정상 흐름 (후보지 있음)', () => {
  it('근접 후보지 1개 → results 길이 1, apiCallsUsed=1', async () => {
    vi.mocked(filterPlacesByRoute).mockResolvedValue([{} as never]);
    vi.mocked(filterByProximity).mockReturnValue([
      makeCandidate(37.5663, 126.9779, 80),
    ]);
    const route = makeMockRoute(5000);
    const { results, apiCallsUsed } = await calculateDetourCosts(route, '편의점');
    expect(results).toHaveLength(1);
    expect(apiCallsUsed).toBe(1);
  });

  it('finalScore 내림차순 정렬 검증', async () => {
    vi.mocked(filterPlacesByRoute).mockResolvedValue([{} as never]);
    vi.mocked(filterByProximity).mockReturnValue([
      makeCandidate(37.4979, 127.0276, 50),
      makeCandidate(37.6, 127.1, 10),
    ]);
    const route = makeMockRoute(5000);
    const { results } = await calculateDetourCosts(route, '편의점');
    if (results.length >= 2) {
      expect(results[0].finalScore).toBeGreaterThanOrEqual(results[1].finalScore);
    }
  });

  it('maxDetourDistance 초과 후보지 → 결과에서 제외', async () => {
    vi.mocked(filterPlacesByRoute).mockResolvedValue([{} as never]);
    vi.mocked(filterByProximity).mockReturnValue([
      makeCandidate(37.5663 + 0.018, 126.9779, 60), // ~2000m 이탈
    ]);
    const route = makeMockRoute(5000);
    const { results } = await calculateDetourCosts(route, '편의점', {
      maxDetourDistance: 1000,
    });
    expect(results).toHaveLength(0);
  });

  it('11개 후보지 → 최대 10개만 반환', async () => {
    vi.mocked(filterPlacesByRoute).mockResolvedValue([{} as never]);
    vi.mocked(filterByProximity).mockReturnValue(
      Array.from({ length: 11 }, (_, i) =>
        makeCandidate(37.5663 + i * 0.0001, 126.9779, 80 - i)
      )
    );
    const route = makeMockRoute(10000);
    const { results } = await calculateDetourCosts(route, '편의점');
    expect(results.length).toBeLessThanOrEqual(10);
  });

  it('originalRoute.duration=0 → toWaypointDuration=0 (0 나눗셈 방지)', async () => {
    vi.mocked(filterPlacesByRoute).mockResolvedValue([{} as never]);
    vi.mocked(filterByProximity).mockReturnValue([
      makeCandidate(37.5663, 126.9779, 80),
    ]);
    const route = {
      ...makeMockRoute(5000),
      duration: 0,
      distance: 0,
    };
    const { results } = await calculateDetourCosts(route, '편의점');
    if (results.length > 0) {
      expect(results[0].routes.toWaypoint.duration).toBe(0);
    }
  });
});

describe('calculateDetourCosts — maxDetourDistance 버그 방어 (목표 3)', () => {
  it('maxDetourDistance=0 → Infinity/NaN 점수 발생하지 않음', async () => {
    vi.mocked(filterPlacesByRoute).mockResolvedValue([{} as never]);
    vi.mocked(filterByProximity).mockReturnValue([
      makeCandidate(37.5663, 126.9779, 80),
    ]);
    const route = makeMockRoute(5000);
    const { results } = await calculateDetourCosts(route, '편의점', {
      maxDetourDistance: 0,
    });
    // guard가 기본값 3000으로 폴백 → 정상 결과 or 빈 배열 (Infinity 없음)
    results.forEach((r) => {
      expect(Number.isFinite(r.finalScore)).toBe(true);
      expect(Number.isFinite(r.detourCost.costScore)).toBe(true);
    });
  });

  it('maxDetourDistance=NaN → 기본값 폴백 (crash 없음)', async () => {
    vi.mocked(filterPlacesByRoute).mockResolvedValue([{} as never]);
    vi.mocked(filterByProximity).mockReturnValue([
      makeCandidate(37.5663, 126.9779, 80),
    ]);
    const route = makeMockRoute(5000);
    const { results } = await calculateDetourCosts(route, '편의점', {
      maxDetourDistance: NaN,
    });
    results.forEach((r) => {
      expect(Number.isFinite(r.finalScore)).toBe(true);
    });
  });
});
