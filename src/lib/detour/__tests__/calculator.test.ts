import { describe, it, expect, vi } from 'vitest';
import {
  findClosestPointOnRoute,
  estimateDetourDuration,
  calculateFinalScore,
  calculateDetourCosts,
} from '../calculator';

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

describe('estimateDetourDuration — 엣지케이스', () => {
  it('매우 큰 거리(100km)도 양의 정수 반환', () => {
    const duration = estimateDetourDuration(100000);
    expect(Number.isInteger(duration)).toBe(true);
    expect(duration).toBeGreaterThan(0);
  });
});
