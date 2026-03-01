/**
 * useSortFilter.test.ts
 * 필터링·정렬 순수 로직 검증 (Node 환경 — React 렌더링 없이)
 *
 * useSortFilter 훅의 핵심 비즈니스 로직(필터링·정렬)을
 * 동일한 알고리즘으로 재현하여 동작을 검증합니다.
 */
import { describe, it, expect } from 'vitest';
import type { DetourResult } from '@/types/detour';

// ---- 재현 함수 (useSortFilter 내부 로직과 동일) ----

function applyRouteTypeFilter(
  results: DetourResult[],
  filter: 'all' | 'shortest' | 'fastest'
): DetourResult[] {
  return filter === 'all' ? results : results.filter((r) => r.routeType === filter);
}

function applySort(
  results: DetourResult[],
  sortBy: 'score' | 'distance' | 'duration'
): DetourResult[] {
  return [...results].sort((a, b) => {
    switch (sortBy) {
      case 'distance':
        return a.detourCost.distance - b.detourCost.distance;
      case 'duration':
        return a.detourCost.duration - b.detourCost.duration;
      case 'score':
      default:
        return b.finalScore - a.finalScore;
    }
  });
}

function calcRouteCounts(results: DetourResult[]) {
  return {
    all: results.length,
    shortest: results.filter((r) => r.routeType === 'shortest').length,
    fastest: results.filter((r) => r.routeType === 'fastest').length,
  };
}

// ---- 테스트 데이터 ----

const base = (id: string, overrides: Partial<DetourResult>): DetourResult => ({
  place: { id, name: `장소 ${id}`, category: '카페', address: `주소 ${id}`, coordinates: { lat: 37.5, lng: 127.0 } },
  detourCost: { distance: 500, duration: 60, costScore: 10 },
  routes: {
    original: { distance: 5000, duration: 600, path: [], start: { lat: 37.56, lng: 126.97 }, end: { lat: 37.49, lng: 127.02 } },
    toWaypoint: { distance: 2500, duration: 300, path: [], start: { lat: 37.56, lng: 126.97 }, end: { lat: 37.5, lng: 127.0 } },
    fromWaypoint: { distance: 2500, duration: 300, path: [], start: { lat: 37.5, lng: 127.0 }, end: { lat: 37.49, lng: 127.02 } },
  },
  proximityScore: 70,
  finalScore: 75,
  routeType: 'fastest',
  ...overrides,
});

const mockResults: DetourResult[] = [
  base('A', { finalScore: 80, detourCost: { distance: 500, duration: 60, costScore: 10 }, routeType: 'fastest' }),
  base('B', { finalScore: 90, detourCost: { distance: 300, duration: 30, costScore: 5  }, routeType: 'shortest' }),
  base('C', { finalScore: 70, detourCost: { distance: 800, duration: 90, costScore: 20 }, routeType: 'fastest' }),
];

describe('useSortFilter — 정렬 로직', () => {
  it('score 정렬: finalScore 내림차순', () => {
    const sorted = applySort(mockResults, 'score');
    expect(sorted[0].finalScore).toBe(90);
    expect(sorted[1].finalScore).toBe(80);
    expect(sorted[2].finalScore).toBe(70);
  });

  it('distance 정렬: detourCost.distance 오름차순', () => {
    const sorted = applySort(mockResults, 'distance');
    expect(sorted[0].detourCost.distance).toBe(300);
    expect(sorted[1].detourCost.distance).toBe(500);
    expect(sorted[2].detourCost.distance).toBe(800);
  });

  it('duration 정렬: detourCost.duration 오름차순', () => {
    const sorted = applySort(mockResults, 'duration');
    expect(sorted[0].detourCost.duration).toBe(30);
    expect(sorted[1].detourCost.duration).toBe(60);
    expect(sorted[2].detourCost.duration).toBe(90);
  });
});

describe('useSortFilter — 필터 로직', () => {
  it('routeType=all → 전체 반환', () => {
    expect(applyRouteTypeFilter(mockResults, 'all')).toHaveLength(3);
  });

  it('routeType=fastest → fastest만 반환', () => {
    const filtered = applyRouteTypeFilter(mockResults, 'fastest');
    expect(filtered).toHaveLength(2);
    expect(filtered.every((r) => r.routeType === 'fastest')).toBe(true);
  });

  it('routeType=shortest → shortest만 반환', () => {
    const filtered = applyRouteTypeFilter(mockResults, 'shortest');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].place.id).toBe('B');
  });

  it('routeTypeCounts 정확히 계산', () => {
    const counts = calcRouteCounts(mockResults);
    expect(counts.all).toBe(3);
    expect(counts.fastest).toBe(2);
    expect(counts.shortest).toBe(1);
  });
});

describe('useSortFilter — 필터 + 정렬 조합', () => {
  it('fastest 필터 + distance 정렬', () => {
    const filtered = applyRouteTypeFilter(mockResults, 'fastest');
    const sorted = applySort(filtered, 'distance');
    expect(sorted.every((r) => r.routeType === 'fastest')).toBe(true);
    expect(sorted[0].detourCost.distance).toBe(500); // A
    expect(sorted[1].detourCost.distance).toBe(800); // C
  });

  it('빈 배열 입력 시 모든 결과 빈 배열', () => {
    expect(applySort([], 'score')).toEqual([]);
    expect(applyRouteTypeFilter([], 'fastest')).toEqual([]);
    expect(calcRouteCounts([])).toEqual({ all: 0, fastest: 0, shortest: 0 });
  });
});
