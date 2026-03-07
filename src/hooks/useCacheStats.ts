/**
 * useCacheStats - 캐시 통계 조회 훅
 */

'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/cache/search-cache';

export interface CacheStats {
  count: number;
  sizeKB: number;
  lastUpdated: Date | null;
}

export function useCacheStats(): CacheStats {
  const [stats, setStats] = useState<CacheStats>({
    count: 0,
    sizeKB: 0,
    lastUpdated: null
  });

  useEffect(() => {
    async function loadStats() {
      try {
        const count = await db.searches.count();
        const lastEntry = await db.searches.orderBy('timestamp').last();

        setStats({
          count,
          sizeKB: count * 5, // 추정치 (각 캐시 약 5KB)
          lastUpdated: lastEntry ? new Date(lastEntry.timestamp) : null
        });
      } catch (error) {
        console.error('Failed to load cache stats:', error);
      }
    }

    loadStats();
  }, []);

  return stats;
}
