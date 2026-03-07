/**
 * Search Cache - IndexedDB 기반 검색 결과 캐시
 * 
 * v0.50.0: IndexedDB로 마이그레이션 (localStorage → Dexie.js)
 * - 대용량 캐시 지원 (100개까지)
 * - 오프라인 검색 지원
 * - 기존 API와 호환성 유지
 */

import Dexie, { Table } from 'dexie';
import type { DetourResult } from '@/types/detour';
import type { SearchWaypointsResponse } from '@/types/api';
import type { Route } from '@/types/location';
import { logger } from '@/lib/logger';

// 기존 API 호환용 캐시 키 타입
interface LegacyCacheKey {
  start: { coordinates: { lat: number; lng: number } };
  end: { coordinates: { lat: number; lng: number } };
  category: string;
  bufferDistance?: number;
}

// 기존 API 호환용 캐시 값 타입
interface LegacyCacheValue {
  originalRoute: Route;
  results: DetourResult[];
  totalCandidates: number;
  apiCallsUsed: number;
  timestamp?: number;
}

export interface SearchCache {
  id?: number;
  key: string;              // "start.lat,start.lng|end.lat,end.lng|category"
  query: {
    start: { lat: number; lng: number; address?: string };
    end: { lat: number; lng: number; address?: string };
    category: string;
  };
  results: DetourResult[];
  originalRoute?: Route;
  totalCandidates?: number;
  apiCallsUsed?: number;
  timestamp: number;
  expiresAt: number;
  isOffline: boolean;
  // 기존 API 호환용
  data?: SearchWaypointsResponse;
}

export class SearchCacheDB extends Dexie {
  searches!: Table<SearchCache, number>;

  constructor() {
    super('MidWayDerCache');
    this.version(1).stores({
      searches: '++id, key, timestamp, expiresAt'
    });
  }
}

export const db = new SearchCacheDB();

const DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24시간
const LEGACY_TTL = 30 * 60 * 1000; // 30분 (기존 localStorage TTL)

/**
 * 캐시 키 생성 (새로운 API)
 */
export function generateCacheKey(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
  category: string
): string {
  return `${start.lat.toFixed(4)},${start.lng.toFixed(4)}|${end.lat.toFixed(4)},${end.lng.toFixed(4)}|${category}`;
}

/**
 * 캐시 조회 (새로운 API)
 */
export async function getCachedSearchNew(key: string): Promise<SearchCache | undefined> {
  try {
    const cache = await db.searches.where('key').equals(key).first();
    if (!cache) return undefined;

    // 만료 확인
    if (Date.now() > cache.expiresAt) {
      await db.searches.delete(cache.id!);
      return undefined;
    }

    return cache;
  } catch (error) {
    logger.error('[getCachedSearchNew] Error:', error);
    return undefined;
  }
}

/**
 * 캐시 저장 (새로운 API)
 */
export async function setCachedSearchNew(
  key: string,
  query: SearchCache['query'],
  results: DetourResult[],
  ttl: number = DEFAULT_TTL
): Promise<void> {
  try {
    const now = Date.now();
    await db.searches.put({
      key,
      query,
      results,
      timestamp: now,
      expiresAt: now + ttl,
      isOffline: false
    });
  } catch (error) {
    logger.error('[setCachedSearchNew] Error:', error);
  }
}

/**
 * 기존 API 호환용 - routeHash + category로 캐시 조회
 * (search-store.ts에서 사용)
 */
export function getCachedSearch(routeHash: string, category: string): SearchWaypointsResponse | null {
  // IndexedDB는 비동기이므로 동기 localStorage로 폴백
  // TODO: v0.51.0에서 search-store를 async로 변경 후 IndexedDB 사용
  if (typeof window === 'undefined') return null;
  
  try {
    const key = `midwayder_search_sc_${routeHash}_${category}`;
    const data = localStorage.getItem(key);
    if (!data) return null;
    
    const cache: { data: SearchWaypointsResponse; timestamp: number } = JSON.parse(data);
    if (Date.now() - cache.timestamp > LEGACY_TTL) {
      localStorage.removeItem(key);
      return null;
    }
    
    return cache.data;
  } catch {
    return null;
  }
}

/**
 * 기존 API 호환용 - routeHash + category로 캐시 저장
 * (search-store.ts에서 사용)
 */
export function setCachedSearch(routeHash: string, category: string, data: SearchWaypointsResponse): void {
  // IndexedDB는 비동기이므로 동기 localStorage로 폴백
  // TODO: v0.51.0에서 search-store를 async로 변경 후 IndexedDB 사용
  if (typeof window === 'undefined') return;
  
  try {
    const key = `midwayder_search_sc_${routeHash}_${category}`;
    localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
    
    // 백그라운드에서 IndexedDB에도 저장 (오프라인용)
    if (typeof window !== 'undefined') {
      const startCoords = data.data.originalRoute?.start;
      const endCoords = data.data.originalRoute?.end;
      
      if (startCoords && endCoords) {
        const indexedDBKey = generateCacheKey(
          { lat: startCoords.lat, lng: startCoords.lng },
          { lat: endCoords.lat, lng: endCoords.lng },
          category
        );
        
        setCachedSearchNew(
          indexedDBKey,
          {
            start: { lat: startCoords.lat, lng: startCoords.lng },
            end: { lat: endCoords.lat, lng: endCoords.lng },
            category
          },
          data.data.results,
          DEFAULT_TTL
        ).catch(err => logger.error('[setCachedSearch] Background save failed:', err));
      }
    }
  } catch (err) {
    logger.error('[setCachedSearch] Error:', err);
  }
}

/**
 * 만료된 캐시 정리
 */
export async function cleanupExpiredCache(): Promise<number> {
  try {
    const now = Date.now();
    const expired = await db.searches.where('expiresAt').below(now).toArray();
    await Promise.all(expired.map(cache => db.searches.delete(cache.id!)));
    return expired.length;
  } catch (error) {
    logger.error('[cleanupExpiredCache] Error:', error);
    return 0;
  }
}

/**
 * 전체 캐시 삭제
 */
export async function clearAllCache(): Promise<void> {
  try {
    await db.searches.clear();
  } catch (error) {
    logger.error('[clearAllCache] Error:', error);
  }
}

/**
 * 캐시 통계 조회
 */
export async function getCacheStats(): Promise<{
  total: number;
  expired: number;
  size: number;
}> {
  try {
    const now = Date.now();
    const all = await db.searches.toArray();
    const expired = all.filter(c => c.expiresAt < now);

    return {
      total: all.length,
      expired: expired.length,
      size: all.length
    };
  } catch (error) {
    logger.error('[getCacheStats] Error:', error);
    return { total: 0, expired: 0, size: 0 };
  }
}

/**
 * 기존 API 호환용 - 캐시 저장 (search API route에서 사용)
 */
export const saveSearchCache = (
  key: LegacyCacheKey,
  value: LegacyCacheValue
): void => {
  if (typeof window === 'undefined') return;

  try {
    const cacheKey = generateCacheKey(
      { lat: key.start.coordinates.lat, lng: key.start.coordinates.lng },
      { lat: key.end.coordinates.lat, lng: key.end.coordinates.lng },
      key.category
    );

    // localStorage에 저장 (기존 방식 유지)
    const legacyKey = `midwayder_search_${cacheKey.replace(/\|/g, '_')}`;
    localStorage.setItem(legacyKey, JSON.stringify({
      ...value,
      timestamp: Date.now()
    }));
  } catch (err) {
    logger.error('[saveSearchCache] Error:', err);
  }
};

/**
 * 기존 API 호환용 - 캐시 조회 (search API route에서 사용)
 */
export const loadSearchCache = (
  key: LegacyCacheKey
): LegacyCacheValue | null => {
  if (typeof window === 'undefined') return null;

  try {
    const cacheKey = generateCacheKey(
      { lat: key.start.coordinates.lat, lng: key.start.coordinates.lng },
      { lat: key.end.coordinates.lat, lng: key.end.coordinates.lng },
      key.category
    );

    const legacyKey = `midwayder_search_${cacheKey.replace(/\|/g, '_')}`;
    const data = localStorage.getItem(legacyKey);
    if (!data) return null;

    const cache = JSON.parse(data);
    const age = Date.now() - cache.timestamp;

    // 30분 TTL
    if (age > LEGACY_TTL) {
      localStorage.removeItem(legacyKey);
      return null;
    }

    return cache;
  } catch (err) {
    logger.error('[loadSearchCache] Error:', err);
    return null;
  }
};
