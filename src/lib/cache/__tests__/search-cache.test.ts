import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateCacheKey,
  saveSearchCache,
  loadSearchCache,
  clearAllSearchCache,
} from '../search-cache';
import type { SearchCacheKey } from '../search-cache';

const mockKey: SearchCacheKey = {
  start: { coordinates: { lat: 37.5663, lng: 126.9779 } },
  end: { coordinates: { lat: 37.4979, lng: 127.0276 } },
  category: '다이소',
};

const mockValue = {
  results: [],
  originalRoute: {
    start: { lat: 37.5663, lng: 126.9779 },
    end: { lat: 37.4979, lng: 127.0276 },
    distance: 12500,
    duration: 1200,
    path: [],
  },
  totalCandidates: 50,
  apiCallsUsed: 41,
};

describe('generateCacheKey — 충돌 방지', () => {
  it('출발지가 다르면 키가 다름', () => {
    const key1 = generateCacheKey({
      start: { coordinates: { lat: 37.5663, lng: 126.9779 } },
      end:   { coordinates: { lat: 37.4979, lng: 127.0276 } },
      category: '다이소',
    });
    const key2 = generateCacheKey({
      start: { coordinates: { lat: 37.5664, lng: 126.9779 } }, // lat 미세 변경
      end:   { coordinates: { lat: 37.4979, lng: 127.0276 } },
      category: '다이소',
    });
    expect(key1).not.toBe(key2);
  });

  it('도착지가 다르면 키가 다름', () => {
    const base = {
      start: { coordinates: { lat: 37.5663, lng: 126.9779 } },
      end:   { coordinates: { lat: 37.4979, lng: 127.0276 } },
      category: '다이소',
    };
    const key1 = generateCacheKey(base);
    const key2 = generateCacheKey({
      ...base,
      end: { coordinates: { lat: 37.4980, lng: 127.0276 } },
    });
    expect(key1).not.toBe(key2);
  });

  it('카테고리가 다르면 키가 다름', () => {
    const base = {
      start: { coordinates: { lat: 37.5663, lng: 126.9779 } },
      end:   { coordinates: { lat: 37.4979, lng: 127.0276 } },
      category: '다이소',
    };
    const key1 = generateCacheKey(base);
    const key2 = generateCacheKey({ ...base, category: '스타벅스' });
    expect(key1).not.toBe(key2);
  });

  it('키 형식이 "midwayder_search_" 프리픽스로 시작', () => {
    const key = generateCacheKey({
      start: { coordinates: { lat: 37.5663, lng: 126.9779 } },
      end:   { coordinates: { lat: 37.4979, lng: 127.0276 } },
      category: '다이소',
    });
    expect(key).toMatch(/^midwayder_search_/);
  });

  it('카테고리 특수문자는 안전하게 치환됨', () => {
    const key = generateCacheKey({
      start: { coordinates: { lat: 37.5663, lng: 126.9779 } },
      end:   { coordinates: { lat: 37.4979, lng: 127.0276 } },
      category: 'GS25 편의점!',
    });
    // 특수문자가 localStorage 키에 그대로 들어가지 않음
    expect(key).not.toContain('!');
    expect(key).not.toContain(' ');
  });
});

describe('search-cache', () => {
  let _store: Record<string, string> = {};
  beforeEach(() => {
    _store = {};
    vi.stubGlobal('window', {});
    vi.stubGlobal('localStorage', {
      getItem(key: string) { return _store[key] ?? null; },
      setItem(key: string, value: string) { _store[key] = value; },
      removeItem(key: string) { delete _store[key]; },
      clear() { _store = {}; },
    });
  });

  it('generateCacheKey — 동일 입력 → 동일 키 반환', () => {
    const key1 = generateCacheKey(mockKey);
    const key2 = generateCacheKey(mockKey);
    expect(key1).toBe(key2);
  });

  it('generateCacheKey — 다른 카테고리 → 다른 키', () => {
    const key1 = generateCacheKey(mockKey);
    const key2 = generateCacheKey({ ...mockKey, category: '스타벅스' });
    expect(key1).not.toBe(key2);
  });

  it('saveSearchCache + loadSearchCache — 저장 후 조회', () => {
    saveSearchCache(mockKey, mockValue);
    const cached = loadSearchCache(mockKey);
    expect(cached).not.toBeNull();
    expect(cached?.totalCandidates).toBe(50);
  });

  it('TTL 만료 시 null 반환', () => {
    vi.useFakeTimers();
    saveSearchCache(mockKey, mockValue);
    vi.advanceTimersByTime(31 * 60 * 1000); // 31분 경과
    const cached = loadSearchCache(mockKey);
    expect(cached).toBeNull();
    vi.useRealTimers();
  });

  it('clearAllSearchCache — 전체 캐시 삭제', () => {
    saveSearchCache(mockKey, mockValue);
    clearAllSearchCache();
    const cached = loadSearchCache(mockKey);
    expect(cached).toBeNull();
  });
});
