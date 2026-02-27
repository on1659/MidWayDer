/**
 * Place Favorites - 개별 장소 즐겨찾기 관리 (localStorage)
 */

export interface PlaceFavorite {
  placeId: string;
  placeName: string;
  category: string;
  address: string;
  lat: number;
  lng: number;
  savedAt: number;
}

const STORAGE_KEY = 'midwayder_place_favs';
const MAX_PLACE_FAVORITES = 20;

export function getPlaceFavorites(): PlaceFavorite[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function addPlaceFavorite(place: Omit<PlaceFavorite, 'savedAt'>): void {
  const favorites = getPlaceFavorites();
  if (favorites.some((f) => f.placeId === place.placeId)) return;
  const updated = [{ ...place, savedAt: Date.now() }, ...favorites].slice(0, MAX_PLACE_FAVORITES);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch { /* ignore */ }
}

export function removePlaceFavorite(placeId: string): void {
  const favorites = getPlaceFavorites();
  const updated = favorites.filter((f) => f.placeId !== placeId);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch { /* ignore */ }
}

export function isPlaceFavorited(placeId: string): boolean {
  return getPlaceFavorites().some((f) => f.placeId === placeId);
}
