import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getRecentSearches, addRecentSearch, removeRecentSearch, clearAllRecentSearches,
  saveLastSearch, loadLastSearch, clearLastSearch,
} from '../recent-searches';

vi.mock('../logger', () => ({ logger: { error: vi.fn() } }));

const store: Record<string, string> = {};
vi.stubGlobal('window', {});
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
});

const makeSearch = (n: number) => ({
  startAddress: `출발 ${n}`, endAddress: `도착 ${n}`, category: '카페',
});

describe('recent-searches', () => {
  beforeEach(() => Object.keys(store).forEach((k) => delete store[k]));

  // T1
  it('addRecentSearch 후 목록에 포함', () => {
    addRecentSearch(makeSearch(1));
    expect(getRecentSearches()).toHaveLength(1);
  });

  // T2
  it('동일 항목 재검색 → 중복 제거 후 최신 1개', () => {
    addRecentSearch(makeSearch(1));
    addRecentSearch(makeSearch(1)); // 동일
    expect(getRecentSearches()).toHaveLength(1);
  });

  // T3
  it('MAX_ITEMS(5) 초과 시 오래된 항목 제거', () => {
    for (let i = 0; i < 6; i++) addRecentSearch(makeSearch(i));
    expect(getRecentSearches()).toHaveLength(5);
  });

  // T4
  it('removeRecentSearch id로 제거', () => {
    addRecentSearch(makeSearch(1));
    const id = getRecentSearches()[0].id;
    removeRecentSearch(id);
    expect(getRecentSearches()).toHaveLength(0);
  });

  // T5
  it('clearAllRecentSearches 후 빈 배열', () => {
    addRecentSearch(makeSearch(1));
    clearAllRecentSearches();
    expect(getRecentSearches()).toHaveLength(0);
  });

  // T6: TTL 이내
  it('loadLastSearch: 30분 이내 데이터 → 반환', () => {
    const now = Date.now();
    store['midwayder-last-search'] = JSON.stringify({
      start: {}, end: {}, category: 'x', results: [], originalRoute: {},
      timestamp: now - 10 * 60 * 1000, // 10분 전
    });
    const result = loadLastSearch();
    expect(result).not.toBeNull();
  });

  // T7: TTL 만료
  it('loadLastSearch: 30분 초과 → null 반환 + 스토리지 삭제', () => {
    store['midwayder-last-search'] = JSON.stringify({
      start: {}, end: {}, category: 'x', results: [], originalRoute: {},
      timestamp: Date.now() - 31 * 60 * 1000, // 31분 전
    });
    const result = loadLastSearch();
    expect(result).toBeNull();
    expect(store['midwayder-last-search']).toBeUndefined();
  });

  // T8: saveLastSearch + clearLastSearch
  it('saveLastSearch → loadLastSearch 왕복 일관성', () => {
    saveLastSearch({ start: { address: 'A' } as never, end: { address: 'B' } as never,
      category: '편의점', results: [], originalRoute: {} as never });
    const loaded = loadLastSearch();
    expect(loaded?.category).toBe('편의점');
    clearLastSearch();
    expect(loadLastSearch()).toBeNull();
  });
});
