/**
 * Cache Strategy - Cache-First 전략 구현
 * 
 * v0.50.0: 오프라인 검색 캐시 지원
 */

import { getCachedSearchNew, setCachedSearchNew, generateCacheKey } from './search-cache';
import type { DetourResult } from '@/types/detour';
import type { Location } from '@/types/location';
import { logger } from '@/lib/logger';

// 캐시 쿼리 타입 (SearchCache.query와 일치)
interface CacheQuery {
  start: { lat: number; lng: number; address?: string };
  end: { lat: number; lng: number; address?: string };
  category: string;
}

export interface CacheStrategyResult {
  results: DetourResult[];
  fromCache: boolean;
  isStale: boolean;
}

export class CacheStrategy {
  private static instance: CacheStrategy;

  static getInstance(): CacheStrategy {
    if (!CacheStrategy.instance) {
      CacheStrategy.instance = new CacheStrategy();
    }
    return CacheStrategy.instance;
  }

  /**
   * 오프라인 검색 지원 (IndexedDB 캐시 사용)
   * 
   * @param start 출발지
   * @param end 도착지
   * @param category 카테고리
   * @param fetchFn 네트워크 요청 함수
   * @returns 캐시된 결과 또는 네트워크 결과
   */
  async searchWithCache(
    start: Location,
    end: Location,
    category: string,
    fetchFn: () => Promise<DetourResult[]>
  ): Promise<CacheStrategyResult> {
    const key = generateCacheKey(
      { lat: start.coordinates.lat, lng: start.coordinates.lng },
      { lat: end.coordinates.lat, lng: end.coordinates.lng },
      category
    );

    // 1. 캐시 확인
    const cached = await getCachedSearchNew(key);

    // 2. 오프라인 상태 확인
    const isOffline = typeof window !== 'undefined' && !navigator.onLine;

    if (isOffline && cached) {
      // 오프라인 + 캐시 있음 → 캐시 반환
      logger.debug('[CacheStrategy] Offline mode: returning cached results');
      return {
        results: cached.results,
        fromCache: true,
        isStale: false
      };
    }

    if (isOffline && !cached) {
      // 오프라인 + 캐시 없음 → 에러
      throw new Error('오프라인 상태입니다. 캐시된 검색 결과가 없습니다.');
    }

    if (cached && !isOffline) {
      // 온라인 + 캐시 있음 → 백그라운드 업데이트
      logger.debug('[CacheStrategy] Cache HIT: returning cached results, updating in background');
      this.updateCacheInBackground(key, cached.query, fetchFn);

      return {
        results: cached.results,
        fromCache: true,
        isStale: false
      };
    }

    // 온라인 + 캐시 없음 → 네트워크 요청
    logger.debug('[CacheStrategy] Cache MISS: fetching from network');
    const results = await fetchFn();
    await setCachedSearchNew(key, {
      start: {
        lat: start.coordinates.lat,
        lng: start.coordinates.lng,
        address: start.address
      },
      end: {
        lat: end.coordinates.lat,
        lng: end.coordinates.lng,
        address: end.address
      },
      category
    }, results);

    return {
      results,
      fromCache: false,
      isStale: false
    };
  }

  private async updateCacheInBackground(
    key: string,
    query: CacheQuery,
    fetchFn: () => Promise<DetourResult[]>
  ): Promise<void> {
    try {
      const results = await fetchFn();
      await setCachedSearchNew(key, query, results);
      logger.debug('[CacheStrategy] Background cache update completed');
    } catch (error) {
      // 백그라운드 업데이트 실패는 무시
      logger.warn('[CacheStrategy] Background cache update failed:', error);
    }
  }
}

export const cacheStrategy = CacheStrategy.getInstance();
