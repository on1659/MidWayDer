/**
 * Search Cache Utility
 * LocalStorage 기반 검색 결과 캐싱 (TTL 30분)
 */

interface CachedSearchResult {
  data: any; // SearchWaypointsResponse
  timestamp: number;
  routeHash: string;
  category: string;
}

const CACHE_TTL_MS = 30 * 60 * 1000; // 30분
const CACHE_KEY_PREFIX = 'midwayder_search_';
const MAX_CACHE_ITEMS = 20;

/**
 * 캐시된 검색 결과 조회
 */
export function getCachedSearch(
  routeHash: string,
  category: string
): CachedSearchResult | null {
  if (typeof window === 'undefined') return null; // SSR 체크

  try {
    const key = `${CACHE_KEY_PREFIX}${routeHash}_${category}`;
    const cached = localStorage.getItem(key);

    if (!cached) return null;

    const parsed: CachedSearchResult = JSON.parse(cached);
    const age = Date.now() - parsed.timestamp;

    if (age > CACHE_TTL_MS) {
      // 만료된 캐시 삭제
      localStorage.removeItem(key);
      return null;
    }

    return parsed;
  } catch (error) {
    console.error('[Cache] Read error:', error);
    return null;
  }
}

/**
 * 검색 결과 캐싱
 */
export function setCachedSearch(
  routeHash: string,
  category: string,
  data: any
): void {
  if (typeof window === 'undefined') return; // SSR 체크

  try {
    const key = `${CACHE_KEY_PREFIX}${routeHash}_${category}`;
    const cached: CachedSearchResult = {
      data,
      timestamp: Date.now(),
      routeHash,
      category,
    };

    localStorage.setItem(key, JSON.stringify(cached));

    // 캐시 크기 제한
    cleanupOldCaches();
  } catch (error) {
    console.error('[Cache] Write error:', error);
  }
}

/**
 * 오래된 캐시 자동 삭제 (최대 20개 유지)
 */
function cleanupOldCaches(): void {
  try {
    const keys = Object.keys(localStorage).filter((k) =>
      k.startsWith(CACHE_KEY_PREFIX)
    );

    if (keys.length <= MAX_CACHE_ITEMS) return;

    // timestamp 기준 정렬 후 오래된 것 삭제
    const caches = keys
      .map((key) => {
        try {
          const data = JSON.parse(localStorage.getItem(key)!);
          return { key, timestamp: data.timestamp || 0 };
        } catch {
          return { key, timestamp: 0 };
        }
      })
      .sort((a, b) => a.timestamp - b.timestamp);

    // 가장 오래된 5개 삭제
    const toDelete = Math.max(1, keys.length - MAX_CACHE_ITEMS);
    caches.slice(0, toDelete).forEach((cache) => {
      localStorage.removeItem(cache.key);
    });
  } catch (error) {
    console.error('[Cache] Cleanup error:', error);
  }
}

/**
 * 캐시 전체 삭제
 */
export function clearSearchCache(): void {
  if (typeof window === 'undefined') return;

  try {
    const keys = Object.keys(localStorage).filter((k) =>
      k.startsWith(CACHE_KEY_PREFIX)
    );
    keys.forEach((key) => localStorage.removeItem(key));
  } catch (error) {
    console.error('[Cache] Clear error:', error);
  }
}

/**
 * 특정 카테고리 캐시 삭제
 */
export function clearCategoryCache(category: string): void {
  if (typeof window === 'undefined') return;

  try {
    const keys = Object.keys(localStorage).filter(
      (k) => k.startsWith(CACHE_KEY_PREFIX) && k.includes(`_${category}`)
    );
    keys.forEach((key) => localStorage.removeItem(key));
  } catch (error) {
    console.error('[Cache] Clear category error:', error);
  }
}

/**
 * 캐시 통계 조회
 */
export function getCacheStats(): {
  count: number;
  totalSize: number;
  oldestTimestamp: number | null;
} {
  if (typeof window === 'undefined')
    return { count: 0, totalSize: 0, oldestTimestamp: null };

  try {
    const keys = Object.keys(localStorage).filter((k) =>
      k.startsWith(CACHE_KEY_PREFIX)
    );
    let totalSize = 0;
    let oldestTimestamp: number | null = null;

    keys.forEach((key) => {
      const value = localStorage.getItem(key);
      if (value) {
        totalSize += value.length;
        try {
          const parsed = JSON.parse(value);
          if (!oldestTimestamp || parsed.timestamp < oldestTimestamp) {
            oldestTimestamp = parsed.timestamp;
          }
        } catch {
          // 무시
        }
      }
    });

    return { count: keys.length, totalSize, oldestTimestamp };
  } catch {
    return { count: 0, totalSize: 0, oldestTimestamp: null };
  }
}
