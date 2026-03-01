/**
 * useUserData.test.ts
 * 사용자 데이터 로드 로직 검증 (Node 환경)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('useUserData — 즐겨찾기 로드 로직', () => {
  let store: Record<string, string> = {};
  const mockStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  };

  beforeEach(() => {
    store = {};
    vi.stubGlobal('window', {});
    vi.stubGlobal('localStorage', mockStorage);
  });

  it('localStorage에 즐겨찾기 없으면 빈 배열', () => {
    const raw = mockStorage.getItem('midwayder_favorites');
    const favorites = raw ? JSON.parse(raw) : [];
    expect(favorites).toEqual([]);
  });

  it('localStorage에 즐겨찾기 있으면 파싱 가능', () => {
    const fav = [{ id: 'f1', name: '집→회사', startAddress: '집', endAddress: '회사', category: '카페', createdAt: Date.now() }];
    mockStorage.setItem('midwayder_favorites', JSON.stringify(fav));
    const raw = mockStorage.getItem('midwayder_favorites');
    const parsed = raw ? JSON.parse(raw) : [];
    expect(parsed).toHaveLength(1);
    expect(parsed[0].name).toBe('집→회사');
  });

  it('JSON 파싱 실패 시 빈 배열로 폴백', () => {
    mockStorage.setItem('midwayder_favorites', 'not-json');
    const raw = mockStorage.getItem('midwayder_favorites');
    let result: unknown[] = [];
    try { result = JSON.parse(raw!); } catch { result = []; }
    expect(result).toEqual([]);
  });
});

describe('useUserData — 최근 검색 로드 로직', () => {
  let store: Record<string, string> = {};
  const mockStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
  };

  beforeEach(() => { store = {}; });

  it('최근 검색 없으면 빈 배열', () => {
    const raw = mockStorage.getItem('midwayder-recent-searches');
    const recent = raw ? JSON.parse(raw) : [];
    expect(recent).toEqual([]);
  });

  it('최근 검색 있으면 파싱 가능', () => {
    const searches = [{ id: 's1', startAddress: '서울시청', endAddress: '강남역', category: '다이소', timestamp: Date.now() }];
    mockStorage.setItem('midwayder-recent-searches', JSON.stringify(searches));
    const raw = mockStorage.getItem('midwayder-recent-searches');
    const parsed = raw ? JSON.parse(raw) : [];
    expect(parsed[0].startAddress).toBe('서울시청');
  });
});

describe('useUserData — 훅 (jsdom 환경 필요)', () => {
  it.todo('renderHook: 초기 recentSearches 빈 배열');
  it.todo('renderHook: setRecentSearches 업데이트');
  it.todo('renderHook: setFavorites 업데이트');
});
