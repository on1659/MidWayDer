/**
 * 최근 검색 기록 관리 (localStorage)
 */

import type { Location, Route } from '@/types/location';
import type { DetourResult } from '@/types/detour';
import { logger } from '@/lib/logger';

export interface RecentSearch {
  id: string;
  startAddress: string;
  endAddress: string;
  startCoords?: { lat: number; lng: number };
  endCoords?: { lat: number; lng: number };
  category: string;
  timestamp: number;
}

export interface LastSearch {
  start: Location;
  end: Location;
  category: string;
  results: DetourResult[];
  originalRoute: Route;
  timestamp: number;
}

const STORAGE_KEY = 'midwayder-recent-searches';
const LAST_SEARCH_KEY = 'midwayder-last-search';
const MAX_ITEMS = 5;
const LAST_SEARCH_TTL_MS = 30 * 60 * 1000; // 30분

export function getRecentSearches(): RecentSearch[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addRecentSearch(search: Omit<RecentSearch, 'id' | 'timestamp'>): void {
  const items = getRecentSearches();
  const newItem: RecentSearch = {
    ...search,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: Date.now(),
  };
  // Remove duplicate (same start+end+category)
  const filtered = items.filter(
    (s) => !(s.startAddress === search.startAddress && s.endAddress === search.endAddress && s.category === search.category)
  );
  const updated = [newItem, ...filtered].slice(0, MAX_ITEMS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function removeRecentSearch(id: string): void {
  const items = getRecentSearches().filter((s) => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function clearAllRecentSearches(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * 마지막 검색 저장 (앱 재접속 시 복원용)
 */
export function saveLastSearch(search: Omit<LastSearch, 'timestamp'>): void {
  if (typeof window === 'undefined') return;
  try {
    const lastSearch: LastSearch = {
      ...search,
      timestamp: Date.now(),
    };
    localStorage.setItem(LAST_SEARCH_KEY, JSON.stringify(lastSearch));
  } catch (err) {
    logger.error('[saveLastSearch] Error:', err);
  }
}

/**
 * 마지막 검색 불러오기 (30분 이내만)
 */
export function loadLastSearch(): LastSearch | null {
  if (typeof window === 'undefined') return null;
  try {
    const data = localStorage.getItem(LAST_SEARCH_KEY);
    if (!data) return null;

    const search: LastSearch = JSON.parse(data);
    const age = Date.now() - search.timestamp;

    // 30분 초과 시 삭제
    if (age > LAST_SEARCH_TTL_MS) {
      localStorage.removeItem(LAST_SEARCH_KEY);
      return null;
    }

    return search;
  } catch (err) {
    logger.error('[loadLastSearch] Error:', err);
    return null;
  }
}

/**
 * 마지막 검색 삭제
 */
export function clearLastSearch(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(LAST_SEARCH_KEY);
}
