/**
 * Search Result Cache (LocalStorage)
 * 
 * 검색 결과를 캐싱하여 재검색 시 즉시 응답
 * - 캐시 키: 출발/도착 좌표 + 카테고리 해시
 * - TTL: 30분
 * - 최대 개수: 10개 (FIFO)
 */

import type { Coordinates, Route } from '@/types/location';
import { logger } from '@/lib/logger';
import type { DetourResult } from '@/types/detour';
import type { SearchWaypointsResponse } from '@/types/api';

export interface SearchCacheKey {
  start: { coordinates: Coordinates };
  end: { coordinates: Coordinates };
  category: string;
  bufferDistance?: number;
}

export interface SearchCacheValue {
  results: DetourResult[];
  originalRoute: Route;
  totalCandidates: number;
  apiCallsUsed: number;
  timestamp: number;
}

const CACHE_KEY_PREFIX = 'midwayder_search_';
const CACHE_KEY_LIST = 'midwayder_cache_keys';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30분
const MAX_CACHE_ITEMS = 10;

/**
 * 캐시 키 생성 (경로 + 카테고리 해시)
 * 좌표는 소수점 4자리까지 (약 11m 정확도)
 */
export const generateCacheKey = (key: SearchCacheKey): string => {
  const startLat = key.start.coordinates.lat.toFixed(4);
  const startLng = key.start.coordinates.lng.toFixed(4);
  const endLat = key.end.coordinates.lat.toFixed(4);
  const endLng = key.end.coordinates.lng.toFixed(4);
  const cat = key.category.replace(/[^a-zA-Z0-9가-힣]/g, '_');
  const buf = key.bufferDistance ?? 1000;
  return `${CACHE_KEY_PREFIX}${startLat}_${startLng}_${endLat}_${endLng}_${cat}_${buf}`;
};

/**
 * 캐시 저장
 */
export const saveSearchCache = (key: SearchCacheKey, value: Omit<SearchCacheValue, 'timestamp'>) => {
  if (typeof window === 'undefined') return;
  
  try {
    const cacheKey = generateCacheKey(key);
    const cacheValue: SearchCacheValue = {
      ...value,
      timestamp: Date.now(),
    };

    localStorage.setItem(cacheKey, JSON.stringify(cacheValue));

    // 캐시 키 목록 업데이트 (최대 10개)
    updateCacheKeyList(cacheKey);
  } catch (err) {
    logger.error('[saveSearchCache] Error:', err);
  }
};

/**
 * 캐시 불러오기
 */
export const loadSearchCache = (key: SearchCacheKey): SearchCacheValue | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    const cacheKey = generateCacheKey(key);
    const data = localStorage.getItem(cacheKey);
    if (!data) return null;

    const cache: SearchCacheValue = JSON.parse(data);
    const age = Date.now() - cache.timestamp;

    // TTL 초과 시 삭제
    if (age > CACHE_TTL_MS) {
      localStorage.removeItem(cacheKey);
      removeCacheKeyFromList(cacheKey);
      return null;
    }

    return cache;
  } catch (err) {
    logger.error('[loadSearchCache] Error:', err);
    return null;
  }
};

/**
 * 캐시 키 목록 관리 (최대 10개, FIFO)
 */
const updateCacheKeyList = (newKey: string) => {
  try {
    const data = localStorage.getItem(CACHE_KEY_LIST);
    const keys: string[] = data ? JSON.parse(data) : [];

    // 중복 제거
    const filtered = keys.filter(k => k !== newKey);

    // 최신 키 추가
    filtered.push(newKey);

    // 10개 초과 시 가장 오래된 것 제거
    if (filtered.length > MAX_CACHE_ITEMS) {
      const removed = filtered.shift();
      if (removed) {
        localStorage.removeItem(removed);
      }
    }

    localStorage.setItem(CACHE_KEY_LIST, JSON.stringify(filtered));
  } catch (err) {
    logger.error('[updateCacheKeyList] Error:', err);
  }
};

/**
 * 캐시 키 목록에서 제거
 */
const removeCacheKeyFromList = (key: string) => {
  try {
    const data = localStorage.getItem(CACHE_KEY_LIST);
    const keys: string[] = data ? JSON.parse(data) : [];
    const filtered = keys.filter(k => k !== key);
    localStorage.setItem(CACHE_KEY_LIST, JSON.stringify(filtered));
  } catch (err) {
    logger.error('[removeCacheKeyFromList] Error:', err);
  }
};

/**
 * routeHash + category 키로 캐시 조회 (search-store 전용)
 */
export const getCachedSearch = (routeHash: string, category: string): SearchWaypointsResponse | null => {
  if (typeof window === 'undefined') return null;
  try {
    const key = `${CACHE_KEY_PREFIX}sc_${routeHash}_${category}`;
    const data = localStorage.getItem(key);
    if (!data) return null;
    const cache: { data: SearchWaypointsResponse; timestamp: number } = JSON.parse(data);
    if (Date.now() - cache.timestamp > CACHE_TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return cache.data;
  } catch {
    return null;
  }
};

/**
 * routeHash + category 키로 캐시 저장 (search-store 전용)
 */
export const setCachedSearch = (routeHash: string, category: string, data: SearchWaypointsResponse): void => {
  if (typeof window === 'undefined') return;
  try {
    const key = `${CACHE_KEY_PREFIX}sc_${routeHash}_${category}`;
    localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
    updateCacheKeyList(key);
  } catch (err) {
    logger.error('[setCachedSearch] Error:', err);
  }
};

/**
 * 캐시 전체 삭제
 */
export const clearAllSearchCache = () => {
  if (typeof window === 'undefined') return;
  
  try {
    const data = localStorage.getItem(CACHE_KEY_LIST);
    const keys: string[] = data ? JSON.parse(data) : [];

    keys.forEach(key => localStorage.removeItem(key));
    localStorage.removeItem(CACHE_KEY_LIST);
  } catch (err) {
    logger.error('[clearAllSearchCache] Error:', err);
  }
};
