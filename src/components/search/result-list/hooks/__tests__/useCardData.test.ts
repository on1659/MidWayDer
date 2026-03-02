// @vitest-environment jsdom
/**
 * useCardData.test.ts
 * 카드 UI 상태 (Pin, Favorite, Visit, Memo) 검증
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { DetourResult } from '@/types/detour';
import type { Route } from '@/types/location';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/place-favorites', () => ({
  getPlaceFavorites: vi.fn().mockReturnValue([]),
  addPlaceFavorite: vi.fn(),
  removePlaceFavorite: vi.fn(),
}));

vi.mock('@/lib/place-memos', () => ({
  getPlaceMemos: vi.fn().mockReturnValue([]),
  setPlaceMemo: vi.fn(),
}));

vi.mock('@/lib/visit-tracking', () => ({
  getVisitHistory: vi.fn().mockReturnValue([]),
  recordVisit: vi.fn(),
}));

import { useCardData } from '../useCardData';

// ─── 헬퍼 ─────────────────────────────────────────────────────────────────────

function makeResult(id: string): DetourResult {
  return {
    place: {
      id,
      name: `장소${id}`,
      category: '카페',
      address: '서울시청',
      coordinates: { lat: 37.5663, lng: 126.9779 },
    },
    detourCost: { distance: 500, duration: 120, costScore: 20 },
    routes: {
      original: {} as unknown as Route,
      toWaypoint: {} as unknown as Route,
      fromWaypoint: {} as unknown as Route,
    },
    proximityScore: 70,
    finalScore: 80,
  } as DetourResult;
}

// 안정적인 빈 배열 참조 (렌더마다 새 []을 만들면 useEffect가 무한 루프)
const EMPTY_RESULTS: DetourResult[] = [];

// ─── 모듈 export 검증 ──────────────────────────────────────────────────────────

describe('useCardData — 모듈 export 검증', () => {
  it('useCardData 함수가 export됨', () => {
    expect(typeof useCardData).toBe('function');
  });
});

// ─── 핀 고정 로직 ─────────────────────────────────────────────────────────────

describe('useCardData — 핀 고정 로직', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('초기 pinnedIds는 빈 Set', () => {
    const { result } = renderHook(() => useCardData(EMPTY_RESULTS, 'hash1'));
    expect(result.current.pinnedIds.size).toBe(0);
  });

  it('togglePin() → pinnedIds에 추가', () => {
    const results = [makeResult('p1')];
    const { result } = renderHook(() => useCardData(results, 'hash1'));
    act(() => { result.current.togglePin('p1'); });
    expect(result.current.pinnedIds.has('p1')).toBe(true);
  });

  it('togglePin() 두 번 → pinnedIds에서 제거', () => {
    const results = [makeResult('p1')];
    const { result } = renderHook(() => useCardData(results, 'hash1'));
    act(() => { result.current.togglePin('p1'); });
    act(() => { result.current.togglePin('p1'); });
    expect(result.current.pinnedIds.has('p1')).toBe(false);
  });

  it('pinnedIds: 새 results 배열이 들어오면 초기화', async () => {
    const initialResults = [makeResult('p1')];
    const { result, rerender } = renderHook(
      ({ results }: { results: DetourResult[] }) => useCardData(results, 'hash1'),
      { initialProps: { results: initialResults } }
    );
    act(() => { result.current.togglePin('p1'); });
    expect(result.current.pinnedIds.has('p1')).toBe(true);

    const newResults = [makeResult('p2')];
    await act(async () => { rerender({ results: newResults }); });

    expect(result.current.pinnedIds.has('p1')).toBe(false);
    expect(result.current.pinnedIds.size).toBe(0);
  });
});

// ─── 즐겨찾기 로직 ────────────────────────────────────────────────────────────

describe('useCardData — 즐겨찾기 로직', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('toggleFav() → favPlaces에 추가', () => {
    const result1 = makeResult('p1');
    const { result } = renderHook(() => useCardData(EMPTY_RESULTS, 'hash1'));
    act(() => { result.current.toggleFav('p1', result1); });
    expect(result.current.favPlaces.has('p1')).toBe(true);
  });

  it('초기화: getPlaceFavorites() 기반 favPlaces 구성', async () => {
    const { getPlaceFavorites } = await import('@/lib/place-favorites');
    vi.mocked(getPlaceFavorites).mockReturnValue([
      { placeId: 'saved1', placeName: '저장된 장소', category: '카페', address: '서울', lat: 37.5, lng: 126.9, savedAt: Date.now() },
    ]);
    const { result } = renderHook(() => useCardData(EMPTY_RESULTS, 'hash1'));
    await act(async () => {});
    expect(result.current.favPlaces.has('saved1')).toBe(true);
  });
});

// ─── 메모 편집 로직 ───────────────────────────────────────────────────────────

describe('useCardData — 메모 편집 로직', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('startEditMemo() → editingMemoId 설정', () => {
    const { result } = renderHook(() => useCardData(EMPTY_RESULTS, 'hash1'));
    act(() => { result.current.startEditMemo('p1'); });
    expect(result.current.editingMemoId).toBe('p1');
  });

  it('cancelMemo() → editingMemoId 초기화', () => {
    const { result } = renderHook(() => useCardData(EMPTY_RESULTS, 'hash1'));
    act(() => { result.current.startEditMemo('p1'); });
    act(() => { result.current.cancelMemo(); });
    expect(result.current.editingMemoId).toBeNull();
  });

  it('saveMemo() → 메모 저장 후 editingMemoId 초기화', () => {
    const { result } = renderHook(() => useCardData(EMPTY_RESULTS, 'hash1'));
    act(() => {
      result.current.startEditMemo('p1');
      result.current.saveMemo('p1', '메모 내용');
    });
    expect(result.current.editingMemoId).toBeNull();
  });
});
