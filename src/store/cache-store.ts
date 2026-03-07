/**
 * Cache Store - 캐시 상태 관리
 */

import { create } from 'zustand';

interface CacheState {
  isFromCache: boolean;
  cacheTimestamp: number | null;
  setFromCache: (fromCache: boolean, timestamp?: number) => void;
}

export const useCacheStore = create<CacheState>((set) => ({
  isFromCache: false,
  cacheTimestamp: null,
  setFromCache: (fromCache, timestamp) => set({
    isFromCache: fromCache,
    cacheTimestamp: timestamp || null
  })
}));
