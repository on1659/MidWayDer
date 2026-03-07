/**
 * Cache Store - 캐시 상태 관리
 */

import { create } from 'zustand';

interface CacheState {
  isFromCache: boolean;
  cacheTimestamp: number | null;
  cacheSize: number;
  setFromCache: (fromCache: boolean, timestamp?: number) => void;
  setCacheSize: (size: number) => void;
}

export const useCacheStore = create<CacheState>((set) => ({
  isFromCache: false,
  cacheTimestamp: null,
  cacheSize: 0,
  setFromCache: (fromCache, timestamp) => set({
    isFromCache: fromCache,
    cacheTimestamp: timestamp || null
  }),
  setCacheSize: (size) => set({ cacheSize: size })
}));
