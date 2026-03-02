// @vitest-environment jsdom
/**
 * useSearch 훅 테스트
 * jsdom 환경에서 Zustand store와 의존성을 mock하여 검증
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ─── Mocks (vi.hoisted: mock factory 안에서 참조 가능한 변수) ────────────────
const {
  mockSearch,
  mockClearResults,
  mockSelectWaypoint,
  mockSetOriginalRoute,
  mockSetStart,
  mockSetEnd,
  mockSetCategory,
  mockRestoreResults,
  mockShowToast,
  mockGetState,
  mockUseRouteStore,
  mockUseSearchStore,
  mockLoadSessionResults,
} = vi.hoisted(() => {
  const mockSearch = vi.fn().mockResolvedValue(undefined);
  const mockClearResults = vi.fn();
  const mockSelectWaypoint = vi.fn();
  const mockSetOriginalRoute = vi.fn();
  const mockSetStart = vi.fn();
  const mockSetEnd = vi.fn();
  const mockSetCategory = vi.fn();
  const mockRestoreResults = vi.fn();
  const mockShowToast = vi.fn();
  const mockGetState = vi.fn(() => ({ totalCandidates: 0, apiCallsUsed: 0 }));
  const mockLoadSessionResults = vi.fn().mockReturnValue(null);

  const mockUseRouteStore = vi.fn(() => ({
    start: null,
    end: null,
    setStart: mockSetStart,
    setEnd: mockSetEnd,
    setOriginalRoute: mockSetOriginalRoute,
    selectWaypoint: mockSelectWaypoint,
  }));

  const mockUseSearchStore = Object.assign(
    vi.fn(() => ({
      category: '다이소',
      results: [],
      isLoading: false,
      hasSearched: false,
      search: mockSearch,
      clearResults: mockClearResults,
      restoreResults: mockRestoreResults,
      setCategory: mockSetCategory,
    })),
    { getState: mockGetState }
  );

  return {
    mockSearch,
    mockClearResults,
    mockSelectWaypoint,
    mockSetOriginalRoute,
    mockSetStart,
    mockSetEnd,
    mockSetCategory,
    mockRestoreResults,
    mockShowToast,
    mockGetState,
    mockUseRouteStore,
    mockUseSearchStore,
    mockLoadSessionResults,
  };
});

vi.mock('@/store/route-store', () => ({
  useRouteStore: mockUseRouteStore,
}));

vi.mock('@/store/search-store', () => ({
  useSearchStore: mockUseSearchStore,
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: vi.fn(() => ({ showToast: mockShowToast })),
}));

vi.mock('@/lib/cache/session-results', () => ({
  loadSessionResults: mockLoadSessionResults,
  saveSessionResults: vi.fn(),
}));

vi.mock('@/lib/recent-searches', () => ({
  addRecentSearch: vi.fn(),
  getRecentSearches: vi.fn().mockReturnValue([]),
}));

// ─── 실제 모듈 import ─────────────────────────────────────────────────────────
import { useSearch } from '../useSearch';

// ─── 헬퍼 ─────────────────────────────────────────────────────────────────────
function makeHookParams() {
  return {
    setBottomSheetSnap: vi.fn(),
    setRecentSearches: vi.fn(),
    savedScrollRef: { current: 0 },
  };
}

function setRouteState(start: { address: string; coordinates?: { lat: number; lng: number } } | null, end: typeof start | null) {
  mockUseRouteStore.mockReturnValue({
    start,
    end,
    setStart: mockSetStart,
    setEnd: mockSetEnd,
    setOriginalRoute: mockSetOriginalRoute,
    selectWaypoint: mockSelectWaypoint,
  });
}

function setSearchState(overrides: Record<string, unknown>) {
  mockUseSearchStore.mockReturnValue({
    category: '다이소',
    results: [],
    isLoading: false,
    hasSearched: false,
    search: mockSearch,
    clearResults: mockClearResults,
    restoreResults: mockRestoreResults,
    setCategory: mockSetCategory,
    ...overrides,
  });
}

// ─── 테스트 스위트 ─────────────────────────────────────────────────────────────
describe('useSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearch.mockResolvedValue(undefined);
    mockLoadSessionResults.mockReturnValue(null);
    // 기본 상태: start/end null
    setRouteState(null, null);
    setSearchState({});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── 케이스 1: handleSearch start/end 미설정 시 search() 미호출 ──────────────
  it('handleSearch: start/end 미설정 시 search() 미호출', async () => {
    const params = makeHookParams();
    const { result } = renderHook(() => useSearch(params));

    await act(async () => {
      await result.current.handleSearch();
    });

    expect(mockSearch).not.toHaveBeenCalled();
  });

  // ── 케이스 2: handleSearch 성공 시 bottomSheetSnap=half 설정 ─────────────────
  it('handleSearch: search() 성공 시 bottomSheetSnap=half 설정', async () => {
    setRouteState(
      { address: '서울시청', coordinates: { lat: 37.5663, lng: 126.9779 } },
      { address: '강남역', coordinates: { lat: 37.4979, lng: 127.0276 } }
    );

    const params = makeHookParams();
    const { result } = renderHook(() => useSearch(params));

    await act(async () => {
      await result.current.handleSearch();
    });

    expect(mockSearch).toHaveBeenCalledTimes(1);
    expect(params.setBottomSheetSnap).toHaveBeenCalledWith('half');
  });

  // ── 케이스 3: handleInstantSearch RecentSearch 데이터로 즉시 호출 ─────────────
  it('handleInstantSearch: RecentSearch 데이터로 search() 즉시 호출', async () => {
    const params = makeHookParams();
    const { result } = renderHook(() => useSearch(params));

    const recentItem = {
      startAddress: '서울시청',
      endAddress: '강남역',
      startCoords: { lat: 37.5663, lng: 126.9779 },
      endCoords: { lat: 37.4979, lng: 127.0276 },
      category: '스타벅스',
      searchedAt: Date.now(),
    };

    await act(async () => {
      await result.current.handleInstantSearch(recentItem);
    });

    expect(mockSetStart).toHaveBeenCalledWith(expect.objectContaining({ address: '서울시청' }));
    expect(mockSetEnd).toHaveBeenCalledWith(expect.objectContaining({ address: '강남역' }));
    expect(mockSetCategory).toHaveBeenCalledWith('스타벅스');
    expect(mockSearch).toHaveBeenCalledTimes(1);
    expect(params.setBottomSheetSnap).toHaveBeenCalledWith('half');
  });

  // ── 케이스 4: handleExpandRadius bufferDistance=2000으로 재검색 ──────────────
  it('handleExpandRadius: bufferDistance=2000으로 재검색', async () => {
    setRouteState(
      { address: '서울시청', coordinates: { lat: 37.5663, lng: 126.9779 } },
      { address: '강남역', coordinates: { lat: 37.4979, lng: 127.0276 } }
    );

    const params = makeHookParams();
    const { result } = renderHook(() => useSearch(params));

    await act(async () => {
      await result.current.handleExpandRadius();
    });

    expect(mockSearch).toHaveBeenCalledWith(
      expect.objectContaining({ address: '서울시청' }),
      expect.objectContaining({ address: '강남역' }),
      '다이소',
      { bufferDistance: 2000 }
    );
  });

  // ── 케이스 5: handleCategoryChange 800ms 디바운스 후 search() 호출 ───────────
  it('handleCategoryChange: 800ms 디바운스 후 search() 호출', async () => {
    vi.useFakeTimers();

    setRouteState({ address: '서울시청' }, { address: '강남역' });
    setSearchState({ hasSearched: true, isLoading: false });

    const params = makeHookParams();
    const { result } = renderHook(() => useSearch(params));

    act(() => {
      result.current.handleCategoryChange('스타벅스');
    });

    // 800ms 이전 → search 미호출
    expect(mockSearch).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(800);
    });

    expect(mockSearch).toHaveBeenCalledTimes(1);
  });

  // ── 케이스 6: handleCategoryChange 빠른 연속 호출 시 마지막 값만 반영 ──────────
  it('handleCategoryChange: 빠른 연속 호출 시 마지막 값만 반영', async () => {
    vi.useFakeTimers();

    setRouteState({ address: '서울시청' }, { address: '강남역' });
    setSearchState({ hasSearched: true, isLoading: false });

    const params = makeHookParams();
    const { result } = renderHook(() => useSearch(params));

    act(() => {
      result.current.handleCategoryChange('스타벅스');
    });

    act(() => {
      vi.advanceTimersByTime(400);
    });

    act(() => {
      result.current.handleCategoryChange('다이소');
    });

    await act(async () => {
      vi.advanceTimersByTime(800);
    });

    // 타이머가 리셋되어 최종 1회만 호출
    expect(mockSearch).toHaveBeenCalledTimes(1);
  });

  // ── 케이스 7: URL params 자동검색 ─────────────────────────────────────────────
  it('URL params 자동검색: ?start=&end=&cat= → search() 호출', async () => {
    vi.useFakeTimers();

    Object.defineProperty(window, 'location', {
      value: {
        search: '?start=%EC%84%9C%EC%9A%B8%EC%8B%9C%EC%B2%AD&end=%EA%B0%95%EB%82%A8%EC%97%AD&cat=%EC%8A%A4%ED%83%80%EB%B2%85%EC%8A%A4&slat=37.5663&slng=126.9779&elat=37.4979&elng=127.0276',
      },
      writable: true,
      configurable: true,
    });

    const params = makeHookParams();
    renderHook(() => useSearch(params));

    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    expect(mockSetStart).toHaveBeenCalled();
    expect(mockSetEnd).toHaveBeenCalled();
    expect(mockSearch).toHaveBeenCalledTimes(1);

    Object.defineProperty(window, 'location', {
      value: { search: '' },
      writable: true,
      configurable: true,
    });
  });

  // ── 케이스 8: 세션 캐시 복원 ─────────────────────────────────────────────────
  it('세션 캐시 복원: 마운트 시 restoreResults() 자동 호출', async () => {
    const savedData = {
      results: [],
      startAddress: '서울시청',
      startCoords: { lat: 37.5663, lng: 126.9779 },
      endAddress: '강남역',
      endCoords: { lat: 37.4979, lng: 127.0276 },
      category: '다이소',
      totalCandidates: 5,
      apiCallsUsed: 10,
      savedAt: Date.now(),
    };
    mockLoadSessionResults.mockReturnValue(savedData);

    const params = makeHookParams();
    await act(async () => {
      renderHook(() => useSearch(params));
    });

    expect(mockRestoreResults).toHaveBeenCalledWith(
      savedData.results,
      savedData.totalCandidates,
      savedData.apiCallsUsed
    );
    expect(mockShowToast).toHaveBeenCalledWith('🕐 이전 검색 결과를 복원했어요', 'info');
  });

  // ── 케이스 9: 카테고리 토스트 ────────────────────────────────────────────────
  it('카테고리 토스트: 검색 완료 후 pendingCategoryToastRef 메시지 표시', async () => {
    vi.useFakeTimers();

    setRouteState({ address: '서울시청' }, { address: '강남역' });
    setSearchState({ hasSearched: true, isLoading: false, results: [] });

    const params = makeHookParams();
    const { result, rerender } = renderHook(() => useSearch(params));

    act(() => {
      result.current.handleCategoryChange('스타벅스');
    });

    expect(result.current.pendingCategoryToastRef.current).toBe('스타벅스');

    // 800ms 경과 → search 호출
    await act(async () => {
      vi.advanceTimersByTime(800);
    });

    // 검색 완료 후: results 있고 isLoading=false → 토스트 표시
    setSearchState({ hasSearched: true, isLoading: false, results: [{ place: { id: 'p1' } }] });

    await act(async () => {
      rerender();
    });

    expect(mockShowToast).toHaveBeenCalledWith(
      expect.stringContaining('스타벅스'),
      'success'
    );
  });
});
