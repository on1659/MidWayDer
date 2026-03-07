/**
 * Search Cache Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { db, generateCacheKey, getCachedSearchNew, setCachedSearchNew, cleanupExpiredCache, clearAllCache } from '../search-cache';

// 테스트용 최소 타입
interface MockPlace {
  place: { id: string; name?: string };
}

describe('SearchCache', () => {
  beforeEach(async () => {
    await db.searches.clear();
  });

  describe('generateCacheKey', () => {
    it('캐시 키 생성', () => {
      const key = generateCacheKey(
        { lat: 37.5665, lng: 126.9780 },
        { lat: 37.4979, lng: 127.0276 },
        '다이소'
      );
      expect(key).toBe('37.5665,126.9780|37.4979,127.0276|다이소');
    });

    it('소수점 4자리까지 반올림', () => {
      const key = generateCacheKey(
        { lat: 37.5665678, lng: 126.9780123 },
        { lat: 37.4979987, lng: 127.0276654 },
        '스타벅스'
      );
      expect(key).toBe('37.5666,126.9780|37.4980,127.0277|스타벅스');
    });
  });

  describe('setCachedSearchNew & getCachedSearchNew', () => {
    it('캐시 저장 및 조회', async () => {
      const key = 'test-key';
      const query = {
        start: { lat: 37.5, lng: 127.0 },
        end: { lat: 37.6, lng: 127.1 },
        category: '다이소'
      };
      const results: MockPlace[] = [
        { place: { id: '1', name: '다이소 강남점' } }
      ];

      await setCachedSearchNew(key, query, results, 1000);
      const cached = await getCachedSearchNew(key);

      expect(cached).toBeDefined();
      expect(cached?.results).toEqual(results);
      expect(cached?.query).toEqual(query);
    });

    it('만료된 캐시 자동 삭제', async () => {
      const key = 'test-key-expired';
      const query = {
        start: { lat: 1, lng: 1 },
        end: { lat: 2, lng: 2 },
        category: 'test'
      };
      const results: MockPlace[] = [];

      await setCachedSearchNew(key, query, results, 1); // 1ms TTL

      // 만료 대기
      await new Promise(resolve => setTimeout(resolve, 10));

      const cached = await getCachedSearchNew(key);
      expect(cached).toBeUndefined();
    });

    it('여러 캐시 저장 및 조회', async () => {
      const keys = ['key1', 'key2', 'key3'];
      const query = {
        start: { lat: 1, lng: 1 },
        end: { lat: 2, lng: 2 },
        category: 'test'
      };

      for (const key of keys) {
        await setCachedSearchNew(key, query, [{ place: { id: key } }] as MockPlace[]);
      }

      for (const key of keys) {
        const cached = await getCachedSearchNew(key);
        expect(cached).toBeDefined();
        expect(cached?.results[0].place.id).toBe(key);
      }
    });
  });

  describe('cleanupExpiredCache', () => {
    it('만료된 캐시 정리', async () => {
      const query = {
        start: { lat: 1, lng: 1 },
        end: { lat: 2, lng: 2 },
        category: 'test'
      };

      // 만료될 캐시
      await setCachedSearchNew('expired1', query, [], 1);
      await setCachedSearchNew('expired2', query, [], 1);

      // 유효한 캐시
      await setCachedSearchNew('valid', query, [], 60000);

      // 만료 대기
      await new Promise(resolve => setTimeout(resolve, 10));

      const deletedCount = await cleanupExpiredCache();
      expect(deletedCount).toBe(2);

      const valid = await getCachedSearchNew('valid');
      expect(valid).toBeDefined();
    });
  });

  describe('clearAllCache', () => {
    it('전체 캐시 삭제', async () => {
      const query = {
        start: { lat: 1, lng: 1 },
        end: { lat: 2, lng: 2 },
        category: 'test'
      };

      await setCachedSearchNew('key1', query, []);
      await setCachedSearchNew('key2', query, []);
      await setCachedSearchNew('key3', query, []);

      await clearAllCache();

      const all = await db.searches.toArray();
      expect(all.length).toBe(0);
    });
  });
});
