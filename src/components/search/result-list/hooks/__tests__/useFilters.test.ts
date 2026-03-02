// @vitest-environment jsdom
/**
 * useFilters 회귀 테스트
 * results 변경 시 필터 초기화 (useEffect 전환 후 동작 검증)
 */
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFilters } from '../useFilters';
import type { DetourResult } from '@/types/detour';
import type { Route } from '@/types/location';

const makeResult = (id: string): DetourResult =>
  ({
    place: {
      id,
      name: id,
      category: 'test',
      address: '',
      coordinates: { lat: 37.5, lng: 126.9 },
    },
    detourCost: { distance: 300, duration: 120, costScore: 20 },
    routes: {
      original: {} as unknown as Route,
      toWaypoint: {} as unknown as Route,
      fromWaypoint: {} as unknown as Route,
    },
    proximityScore: 80,
    finalScore: 80,
  } as DetourResult);

describe('useFilters — results 변경 시 필터 초기화', () => {
  it('results가 새 배열로 교체되면 openNowOnly, maxDetourMin이 초기화됨', async () => {
    const initialResults = [makeResult('p1'), makeResult('p2')];
    const visitedDates = new Map<string, number>();

    const { result, rerender } = renderHook(
      ({ results }) => useFilters(results, visitedDates),
      { initialProps: { results: initialResults } }
    );

    // 필터 값 설정
    act(() => {
      result.current.setOpenNowOnly(true);
      result.current.setMaxDetourMin(5);
    });

    expect(result.current.openNowOnly).toBe(true);
    expect(result.current.maxDetourMin).toBe(5);

    // results를 새 배열로 교체
    const newResults = [makeResult('p3')];
    await act(async () => {
      rerender({ results: newResults });
    });

    // useEffect로 초기화되므로 act 완료 후 확인
    expect(result.current.openNowOnly).toBe(false);
    expect(result.current.maxDetourMin).toBeNull();
  });

  it('같은 배열 참조를 유지하면 필터가 초기화되지 않음', async () => {
    const results = [makeResult('p1')];
    const visitedDates = new Map<string, number>();

    const { result, rerender } = renderHook(
      ({ results }) => useFilters(results, visitedDates),
      { initialProps: { results } }
    );

    act(() => {
      result.current.setOpenNowOnly(true);
    });

    expect(result.current.openNowOnly).toBe(true);

    // 같은 배열 참조로 rerender
    await act(async () => {
      rerender({ results });
    });

    // 필터 초기화가 되지 않아야 함
    expect(result.current.openNowOnly).toBe(true);
  });

  it('nameFilter도 results 변경 시 초기화됨', async () => {
    const initialResults = [makeResult('p1')];
    const visitedDates = new Map<string, number>();

    const { result, rerender } = renderHook(
      ({ results }) => useFilters(results, visitedDates),
      { initialProps: { results: initialResults } }
    );

    act(() => {
      result.current.setNameFilter('스타벅스');
    });

    expect(result.current.nameFilter).toBe('스타벅스');

    const newResults = [makeResult('p2')];
    await act(async () => {
      rerender({ results: newResults });
    });

    expect(result.current.nameFilter).toBe('');
  });
});
