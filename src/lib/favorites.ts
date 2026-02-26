/**
 * Favorites - 즐겨찾기 경로 관리
 */

export interface Favorite {
  id: string;
  name: string; // 사용자 지정 이름 (예: "집 → 회사")
  startAddress: string;
  endAddress: string;
  startCoords?: { lat: number; lng: number };
  endCoords?: { lat: number; lng: number };
  category: string;
  routineType?: 'morning-commute' | 'evening-commute' | 'weekend-trip'; // 루틴 자동화
  createdAt: number;
}

const STORAGE_KEY = 'midwayder_favorites';
const MAX_FAVORITES = 10;

export function getFavorites(): Favorite[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function addFavorite(favorite: Omit<Favorite, 'id' | 'createdAt'>): void {
  const favorites = getFavorites();
  
  // 중복 체크 (출발지+도착지+카테고리가 같으면 중복)
  const exists = favorites.some(
    f => f.startAddress === favorite.startAddress &&
         f.endAddress === favorite.endAddress &&
         f.category === favorite.category
  );
  if (exists) return;

  const newFavorite: Favorite = {
    ...favorite,
    id: `fav_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    createdAt: Date.now(),
  };

  const updated = [newFavorite, ...favorites].slice(0, MAX_FAVORITES);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save favorite:', e);
  }
}

export function removeFavorite(id: string): void {
  const favorites = getFavorites();
  const updated = favorites.filter(f => f.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to remove favorite:', e);
  }
}

export function updateFavorite(id: string, updates: Partial<Omit<Favorite, 'id' | 'createdAt'>>): void {
  const favorites = getFavorites();
  const updated = favorites.map(f => f.id === id ? { ...f, ...updates } : f);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to update favorite:', e);
  }
}

export function clearAllFavorites(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear favorites:', e);
  }
}
