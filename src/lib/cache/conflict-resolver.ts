/**
 * Conflict Resolver - 캐시 충돌 해결 전략
 * 
 * v0.58.0: 백그라운드 동기화 시 데이터 충돌 감지 및 해결
 */

import { db, SearchCache } from './search-cache';
import { logger } from '@/lib/logger';

export type ConflictStrategy = 'server-wins' | 'client-wins' | 'merge';

export interface ConflictResolution<T = unknown> {
  strategy: ConflictStrategy;
  resolvedData: T;
  hadConflict: boolean;
}

/**
 * 캐시와 서버 데이터의 충돌 감지
 */
export function detectConflict(
  cachedItem: SearchCache | undefined,
  _serverData: unknown
): boolean {
  if (!cachedItem) return false;
  
  // 타임스탬프 비교
  const cacheTime = cachedItem.timestamp;
  const serverTime = Date.now();
  
  // 1시간 이상 차이면 충돌로 간주
  const oneHour = 60 * 60 * 1000;
  return Math.abs(serverTime - cacheTime) > oneHour;
}

/**
 * 검색 결과 충돌 해결
 */
export async function resolveSearchConflict(
  cacheKey: string,
  serverData: {
    results: unknown[];
    timestamp?: number;
  }
): Promise<ConflictResolution> {
  try {
    const cachedItem = await db.searches
      .where('key')
      .equals(cacheKey)
      .first();
    
    // 캐시가 없으면 서버 데이터 사용
    if (!cachedItem) {
      return {
        strategy: 'server-wins',
        resolvedData: serverData,
        hadConflict: false
      };
    }
    
    const hasConflict = detectConflict(cachedItem, serverData);
    
    if (!hasConflict) {
      // 충돌 없음: 최신 데이터 사용
      const cacheTime = cachedItem.timestamp;
      const serverTime = serverData.timestamp || Date.now();
      
      if (serverTime > cacheTime) {
        return {
          strategy: 'server-wins',
          resolvedData: serverData,
          hadConflict: false
        };
      }
      
      return {
        strategy: 'client-wins',
        resolvedData: cachedItem,
        hadConflict: false
      };
    }
    
    // 충돌 발생: 기본 전략은 서버 데이터 우선
    logger.info(`[ConflictResolver] Conflict detected for key: ${cacheKey}`);
    
    return {
      strategy: 'server-wins',
      resolvedData: serverData,
      hadConflict: true
    };
  } catch (error) {
    logger.error('[ConflictResolver] Failed to resolve conflict:', error);
    
    // 에러 발생 시 안전하게 서버 데이터 사용
    return {
      strategy: 'server-wins',
      resolvedData: serverData,
      hadConflict: false
    };
  }
}

/**
 * 동기화 후 캐시 업데이트 (충돌 해결 적용)
 */
export async function updateCacheAfterSync(
  cacheKey: string,
  serverData: {
    results: unknown[];
    originalRoute?: unknown;
  }
): Promise<void> {
  try {
    const resolution = await resolveSearchConflict(cacheKey, {
      results: serverData.results,
      timestamp: Date.now()
    });
    
    if (resolution.strategy === 'server-wins') {
      // 캐시 업데이트
      const now = Date.now();
      const ttl = 24 * 60 * 60 * 1000; // 24시간
      
      await db.searches.put({
        key: cacheKey,
        query: {
          start: { lat: 0, lng: 0 }, // 실제 값은 호출 시점에 설정
          end: { lat: 0, lng: 0 },
          category: ''
        },
        results: serverData.results as SearchCache['results'],
        originalRoute: serverData.originalRoute as SearchCache['originalRoute'],
        timestamp: now,
        expiresAt: now + ttl,
        isOffline: false
      });
      
      logger.debug(`[ConflictResolver] Cache updated for key: ${cacheKey}`);
    }
  } catch (error) {
    logger.error('[ConflictResolver] Failed to update cache:', error);
  }
}
