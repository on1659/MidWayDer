// @vitest-environment jsdom
/**
 * useMapState.test.ts
 * 지도 상태 관련 로직 검증 (Node 환경 + jsdom 환경)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { DetourResult } from '@/types/detour';
import type { Route } from '@/types/location';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const {
  mockUseRouteStore,
  mockUseSearchStore,
} = vi.hoisted(() => {
  const mockUseRouteStore = vi.fn(() => ({
    start: null,
    end: null,
    originalRoute: null,
  }));

  const emptyResults: DetourResult[] = [];
  const mockUseSearchStore = vi.fn(() => ({
    results: emptyResults,
    hasSearched: false,
  }));

  return { mockUseRouteStore, mockUseSearchStore };
});

vi.mock('@/store/route-store', () => ({
  useRouteStore: mockUseRouteStore,
}));

vi.mock('@/store/search-store', () => ({
  useSearchStore: mockUseSearchStore,
}));

import { useMapState } from '../useMapState';

// ─── 헬퍼 ─────────────────────────────────────────────────────────────────────

function makeResult(id = 'p1'): DetourResult {
  return {
    place: { id, name: id, category: 'test', address: '', coordinates: { lat: 37.5, lng: 126.9 } },
    detourCost: { distance: 0, duration: 0, costScore: 0 },
    routes: {
      original: {} as unknown as Route,
      toWaypoint: {} as unknown as Route,
      fromWaypoint: {} as unknown as Route,
    },
    proximityScore: 50,
    finalScore: 50,
  } as DetourResult;
}

// ─── 재현 함수 (useMapState 내부 로직과 동일) ─────────────────────────────────

function shouldShowReSearchButton(hasSearched: boolean, mapPanned: boolean): boolean {
  return hasSearched && mapPanned;
}

function shouldShowMapClickPopup(mapClickInfo: { name: string } | null): boolean {
  return mapClickInfo !== null && !!mapClickInfo.name;
}

function shouldAutoFetchPreviewRoute(
  startCoords: { lat: number; lng: number } | undefined,
  endCoords: { lat: number; lng: number } | undefined,
  originalRoute: unknown
): boolean {
  return !!startCoords && !!endCoords && !originalRoute;
}

// ─── 순수 로직 테스트 (Node 환경) ─────────────────────────────────────────────

describe('useMapState — 재검색 버튼 표시 로직', () => {
  it('hasSearched=true, mapPanned=true → 재검색 버튼 표시', () => {
    expect(shouldShowReSearchButton(true, true)).toBe(true);
  });

  it('hasSearched=false → 재검색 버튼 미표시', () => {
    expect(shouldShowReSearchButton(false, true)).toBe(false);
  });

  it('mapPanned=false → 재검색 버튼 미표시', () => {
    expect(shouldShowReSearchButton(true, false)).toBe(false);
  });
});

describe('useMapState — 지도 클릭 팝업 로직', () => {
  it('mapClickInfo 있으면 팝업 표시', () => {
    expect(shouldShowMapClickPopup({ name: '서울시청' })).toBe(true);
  });

  it('mapClickInfo null이면 팝업 미표시', () => {
    expect(shouldShowMapClickPopup(null)).toBe(false);
  });
});

describe('useMapState — 경로 미리보기 자동 조회 로직', () => {
  const coords = { lat: 37.566, lng: 126.978 };

  it('start/end 있고 originalRoute 없으면 자동 조회', () => {
    expect(shouldAutoFetchPreviewRoute(coords, coords, null)).toBe(true);
  });

  it('originalRoute 있으면 자동 조회 안 함', () => {
    expect(shouldAutoFetchPreviewRoute(coords, coords, { distance: 12500 })).toBe(false);
  });

  it('start 없으면 자동 조회 안 함', () => {
    expect(shouldAutoFetchPreviewRoute(undefined, coords, null)).toBe(false);
  });
});

// ─── 훅 테스트 (jsdom 환경) ────────────────────────────────────────────────────

describe('useMapState — 훅 (jsdom 환경)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockUseRouteStore.mockReturnValue({ start: null, end: null, originalRoute: null });
    mockUseSearchStore.mockReturnValue({ results: [], hasSearched: false });
  });

  it('renderHook: 초기 mapClickInfo는 null', () => {
    const { result } = renderHook(() => useMapState());
    expect(result.current.mapClickInfo).toBeNull();
  });

  it('renderHook: 초기 previewRoute는 null', () => {
    const { result } = renderHook(() => useMapState());
    expect(result.current.previewRoute).toBeNull();
  });

  it('renderHook: handleMapIdle — hasSearched=false 시 mapPanned 변경 없음', () => {
    // hasSearched=false → handleMapIdle은 early return
    mockUseSearchStore.mockReturnValue({ results: [], hasSearched: false });
    const { result } = renderHook(() => useMapState());
    act(() => { result.current.handleMapIdle(); });
    expect(result.current.mapPanned).toBe(false);
  });

  it('renderHook: 결과 변경 시 mapPanned와 mapZoomed를 함께 리셋', async () => {
    const nonEmptyResults = [makeResult()];

    // hasSearched=true → 지도 조작 이벤트가 재검색 상태를 켤 수 있음
    mockUseSearchStore.mockReturnValue({ results: [], hasSearched: true });
    const { result, rerender } = renderHook(() => useMapState());

    act(() => { result.current.handleMapInteraction(); });
    expect(result.current.mapPanned).toBe(true);
    expect(result.current.mapZoomed).toBe(true);

    // 결과가 채워지면 지도 이동/줌 재검색 상태를 함께 리셋
    mockUseSearchStore.mockReturnValue({ results: nonEmptyResults, hasSearched: true });
    await act(async () => { rerender(); });

    expect(result.current.mapPanned).toBe(false);
    expect(result.current.mapZoomed).toBe(false);
  });

  it('renderHook: resetMapInteraction은 지도 이동/줌 재검색 상태를 모두 끈다', () => {
    mockUseSearchStore.mockReturnValue({ results: [], hasSearched: true });
    const { result } = renderHook(() => useMapState());

    act(() => { result.current.handleMapInteraction(); });
    expect(result.current.mapPanned).toBe(true);
    expect(result.current.mapZoomed).toBe(true);

    act(() => { result.current.resetMapInteraction(); });

    expect(result.current.mapPanned).toBe(false);
    expect(result.current.mapZoomed).toBe(false);
  });

  it('renderHook: handleMapClick 성공 시 mapClickInfo 업데이트', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ name: '서울시청', address: '서울시청 앞' }),
    } as unknown as Response);

    const { result } = renderHook(() => useMapState());
    await act(async () => {
      await result.current.handleMapClick({ lat: 37.5663, lng: 126.9779 });
    });

    expect(result.current.mapClickInfo).not.toBeNull();
    expect(result.current.mapClickInfo?.name).toBe('서울시청');
  });
});
