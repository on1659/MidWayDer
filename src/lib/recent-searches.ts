/**
 * 최근 검색 기록 관리 (localStorage)
 */

export interface RecentSearch {
  id: string;
  startAddress: string;
  endAddress: string;
  startCoords?: { lat: number; lng: number };
  endCoords?: { lat: number; lng: number };
  category: string;
  timestamp: number;
}

const STORAGE_KEY = 'midwayder-recent-searches';
const MAX_ITEMS = 5;

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
