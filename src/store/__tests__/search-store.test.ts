/**
 * search-store.test.ts
 * Zustand useSearchStore 상태 전이 테스트
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useSearchStore } from '../search-store';
import { hashRoute } from '@/lib/utils/route-hash';

// 캐시 모듈 mock (항상 miss)
vi.mock('@/lib/cache/search-cache', () => ({
  getCachedSearch: vi.fn().mockReturnValue(null),
  setCachedSearch: vi.fn(),
}));

// 경로 해시 mock
vi.mock('@/lib/utils/route-hash', () => ({
  hashRoute: vi.fn().mockReturnValue('mock-route-hash'),
}));

// 에러 메시지 mock (순수 문자열 반환)
vi.mock('@/lib/error-messages', () => ({
  getAPIErrorMessage: vi.fn().mockReturnValue('API 오류가 발생했습니다.'),
}));

const mockResult = {
  place: {
    id: 'p1',
    name: '다이소 강남점',
    category: '다이소',
    address: '서울 강남구',
    coordinates: { lat: 37.5, lng: 127.0 },
  },
  detourCost: { distance: 500, duration: 60, costScore: 10 },
  routes: {
    original: { distance: 5000, duration: 600, path: [], start: { lat: 37.56, lng: 126.97 }, end: { lat: 37.49, lng: 127.02 } },
    toWaypoint: { distance: 2000, duration: 240, path: [], start: { lat: 37.56, lng: 126.97 }, end: { lat: 37.5, lng: 127.0 } },
    fromWaypoint: { distance: 3000, duration: 360, path: [], start: { lat: 37.5, lng: 127.0 }, end: { lat: 37.49, lng: 127.02 } },
  },
  proximityScore: 80,
  finalScore: 85,
  routeType: 'fastest' as const,
};

const mockHashRoute = vi.mocked(hashRoute);

describe('useSearchStore', () => {
  beforeEach(() => {
    useSearchStore.getState().cancelSearch();
    useSearchStore.getState().clearResults();
    vi.clearAllMocks();
  });

  afterEach(() => {
    useSearchStore.getState().cancelSearch();
    vi.useRealTimers();
  });

  it('초기 상태: isLoading=false, results=[], hasSearched=false', () => {
    const state = useSearchStore.getState();
    expect(state.isLoading).toBe(false);
    expect(state.results).toEqual([]);
    expect(state.hasSearched).toBe(false);
    expect(state.error).toBeNull();
  });

  it('setCategory → category 업데이트', () => {
    useSearchStore.getState().setCategory('카페');
    expect(useSearchStore.getState().category).toBe('카페');
  });

  it('restoreResults → results + hasSearched + isCached 복원', () => {
    useSearchStore.getState().restoreResults([mockResult], 10, 5);
    const state = useSearchStore.getState();
    expect(state.results).toHaveLength(1);
    expect(state.hasSearched).toBe(true);
    expect(state.totalCandidates).toBe(10);
    expect(state.apiCallsUsed).toBe(5);
    expect(state.isCached).toBe(true);
    expect(state.isLoading).toBe(false);
  });

  it('clearResults → results 초기화 + hasSearched=false', () => {
    useSearchStore.getState().restoreResults([mockResult], 5, 3);
    useSearchStore.getState().clearResults();
    const state = useSearchStore.getState();
    expect(state.results).toEqual([]);
    expect(state.hasSearched).toBe(false);
    expect(state.totalCandidates).toBe(0);
  });

  it('search() API 오류 시 error 설정 + isLoading=false', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () =>
        Promise.resolve({
          success: false,
          error: { message: 'Internal Server Error' },
        }),
    });

    await useSearchStore.getState().search(
      { address: '서울시청', coordinates: { lat: 37.5663, lng: 126.9779 } },
      { address: '강남역', coordinates: { lat: 37.4979, lng: 127.0276 } },
      '카페'
    );

    const state = useSearchStore.getState();
    expect(state.error).toBeTruthy();
    expect(state.isLoading).toBe(false);
  });

  it('search() 성공 시 results 업데이트 + isLoading=false', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          success: true,
          data: {
            results: [mockResult],
            totalCandidates: 5,
            apiCallsUsed: 3,
          },
        }),
    });

    await useSearchStore.getState().search(
      { address: '서울시청', coordinates: { lat: 37.5663, lng: 126.9779 } },
      { address: '강남역', coordinates: { lat: 37.4979, lng: 127.0276 } },
      '카페'
    );

    const state = useSearchStore.getState();
    expect(state.results).toHaveLength(1);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('search() 주소-only 요청은 route hash 캐시를 건너뛰고 API 요청한다', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          success: true,
          data: {
            results: [mockResult],
            totalCandidates: 5,
            apiCallsUsed: 3,
          },
        }),
    });

    await useSearchStore.getState().search(
      { address: '서울시청' },
      { address: '강남역' },
      '카페'
    );

    expect(mockHashRoute).not.toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/search',
      expect.objectContaining({
        body: expect.stringContaining('"address":"서울시청"'),
      })
    );
    expect(useSearchStore.getState().results).toHaveLength(1);
  });

  it('cancelSearch()는 응답이 안 오는 검색도 즉시 로딩을 해제한다', async () => {
    global.fetch = vi.fn((_url, init) => new Promise<Response>((_resolve, reject) => {
      const signal = (init as RequestInit).signal as AbortSignal | undefined;
      signal?.addEventListener('abort', () => {
        reject(new DOMException('Aborted', 'AbortError'));
      });
    }));

    const searchPromise = useSearchStore.getState().search(
      { address: '명지대학교 인문캠퍼스' },
      { address: '강남역' },
      '다이소'
    );

    expect(useSearchStore.getState().isLoading).toBe(true);
    useSearchStore.getState().cancelSearch();

    expect(useSearchStore.getState().isLoading).toBe(false);
    expect(useSearchStore.getState().abortController).toBeNull();
    expect(useSearchStore.getState().searchPhase).toBe('idle');

    await searchPromise;
    expect(useSearchStore.getState().isLoading).toBe(false);
  });

  it('30초 타임아웃은 검색을 실패 상태로 종료한다', async () => {
    vi.useFakeTimers();
    global.fetch = vi.fn((_url, init) => new Promise<Response>((_resolve, reject) => {
      const signal = (init as RequestInit).signal as AbortSignal | undefined;
      signal?.addEventListener('abort', () => {
        reject(new DOMException('Aborted', 'AbortError'));
      });
    }));

    const searchPromise = useSearchStore.getState().search(
      { address: '명지대학교 인문캠퍼스' },
      { address: '강남역' },
      '다이소'
    );

    expect(useSearchStore.getState().isLoading).toBe(true);
    await vi.advanceTimersByTimeAsync(30000);
    await searchPromise;

    const state = useSearchStore.getState();
    expect(state.isLoading).toBe(false);
    expect(state.abortController).toBeNull();
    expect(state.error).toContain('검색이 오래 걸려');
  });
});
