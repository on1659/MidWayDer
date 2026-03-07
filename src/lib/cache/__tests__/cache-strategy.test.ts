/**
 * Cache Strategy Tests
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CacheStrategy } from '../cache-strategy';
import { db } from '../search-cache';

describe('CacheStrategy', () => {
  let strategy: CacheStrategy;

  beforeEach(async () => {
    await db.searches.clear();
    strategy = CacheStrategy.getInstance();
  });

  describe('searchWithCache', () => {
    it('온라인 + 캐시 없음 → 네트워크 요청', async () => {
      const start = {
        coordinates: { lat: 37.5, lng: 127.0 },
        address: '서울'
      };
      const end = {
        coordinates: { lat: 37.6, lng: 127.1 },
        address: '강남'
      };
      const mockResults = [
        { place: { id: '1', name: '다이소 강남점' } }
      ] as any;

      const fetchFn = vi.fn().mockResolvedValue(mockResults);

      const result = await strategy.searchWithCache(
        start as any,
        end as any,
        '다이소',
        fetchFn
      );

      expect(result.fromCache).toBe(false);
      expect(result.results).toEqual(mockResults);
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    it('온라인 + 캐시 있음 → 캐시 반환 + 백그라운드 업데이트', async () => {
      const start = {
        coordinates: { lat: 37.5, lng: 127.0 },
        address: '서울'
      };
      const end = {
        coordinates: { lat: 37.6, lng: 127.1 },
        address: '강남'
      };
      const cachedResults = [
        { place: { id: '1', name: '다이소 강남점 (cached)' } }
      ] as any;
      const freshResults = [
        { place: { id: '1', name: '다이소 강남점 (fresh)' } }
      ] as any;

      // 먼저 캐시 저장
      const fetchFn1 = vi.fn().mockResolvedValue(cachedResults);
      await strategy.searchWithCache(start as any, end as any, '다이소', fetchFn1);

      // 백그라운드 업데이트를 위한 fetchFn
      const fetchFn2 = vi.fn().mockResolvedValue(freshResults);

      const result = await strategy.searchWithCache(
        start as any,
        end as any,
        '다이소',
        fetchFn2
      );

      expect(result.fromCache).toBe(true);
      expect(result.results).toEqual(cachedResults);
      // 백그라운드 업데이트가 호출되었는지 확인 (약간의 지연 후)
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(fetchFn2).toHaveBeenCalled();
    });

    it('오프라인 + 캐시 있음 → 캐시 반환', async () => {
      const start = {
        coordinates: { lat: 37.5, lng: 127.0 },
        address: '서울'
      };
      const end = {
        coordinates: { lat: 37.6, lng: 127.1 },
        address: '강남'
      };
      const cachedResults = [
        { place: { id: '1', name: '다이소 강남점 (cached)' } }
      ] as any;

      // 먼저 온라인 상태에서 캐시 저장
      const fetchFn1 = vi.fn().mockResolvedValue(cachedResults);
      await strategy.searchWithCache(start as any, end as any, '다이소', fetchFn1);

      // 오프라인 상태로 전환
      Object.defineProperty(window.navigator, 'onLine', {
        writable: true,
        value: false
      });

      // 오프라인 상태에서 다시 검색
      const fetchFn2 = vi.fn();
      const result = await strategy.searchWithCache(
        start as any,
        end as any,
        '다이소',
        fetchFn2
      );

      expect(result.fromCache).toBe(true);
      expect(result.results).toEqual(cachedResults);
      expect(fetchFn2).not.toHaveBeenCalled();

      // navigator.onLine 복원
      Object.defineProperty(window.navigator, 'onLine', {
        writable: true,
        value: true
      });
    });

    it('오프라인 + 캐시 없음 → 에러', async () => {
      // navigator.onLine 모킹
      Object.defineProperty(window.navigator, 'onLine', {
        writable: true,
        value: false
      });

      const start = {
        coordinates: { lat: 37.5, lng: 127.0 },
        address: '서울'
      };
      const end = {
        coordinates: { lat: 37.6, lng: 127.1 },
        address: '강남'
      };
      const fetchFn = vi.fn();

      await expect(
        strategy.searchWithCache(start as any, end as any, '다이소', fetchFn)
      ).rejects.toThrow('오프라인 상태입니다. 캐시된 검색 결과가 없습니다.');

      expect(fetchFn).not.toHaveBeenCalled();

      // navigator.onLine 복원
      Object.defineProperty(window.navigator, 'onLine', {
        writable: true,
        value: true
      });
    });
  });
});
