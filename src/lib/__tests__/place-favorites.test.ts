/**
 * place-favorites.test.ts
 * localStorage 기반 개별 장소 즐겨찾기 CRUD 테스트
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  addPlaceFavorite,
  removePlaceFavorite,
  getPlaceFavorites,
  isPlaceFavorited,
} from '../place-favorites';

// Node 환경에서 window/localStorage 사용 가능하도록 stub
const store: Record<string, string> = {};
vi.stubGlobal('window', {});
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
  clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
});

const makeFav = (id: string) => ({
  placeId: id,
  placeName: `장소 ${id}`,
  category: '다이소',
  address: `서울 강남구 테스트로 ${id}`,
  lat: 37.5 + Number(id) * 0.001,
  lng: 127.0 + Number(id) * 0.001,
});

describe('place-favorites', () => {
  beforeEach(() => {
    Object.keys(store).forEach((k) => delete store[k]);
  });

  it('저장 후 getPlaceFavorites에 포함', () => {
    addPlaceFavorite(makeFav('1'));
    const favs = getPlaceFavorites();
    expect(favs).toHaveLength(1);
    expect(favs[0].placeId).toBe('1');
    expect(favs[0].savedAt).toBeTypeOf('number');
  });

  it('중복 저장 시 1개만 유지', () => {
    addPlaceFavorite(makeFav('1'));
    addPlaceFavorite(makeFav('1'));
    expect(getPlaceFavorites()).toHaveLength(1);
  });

  it('삭제 후 목록에서 제거', () => {
    addPlaceFavorite(makeFav('1'));
    removePlaceFavorite('1');
    expect(getPlaceFavorites()).toHaveLength(0);
  });

  it('isPlaceFavorited — 저장된 장소는 true, 없는 장소는 false', () => {
    addPlaceFavorite(makeFav('1'));
    expect(isPlaceFavorited('1')).toBe(true);
    expect(isPlaceFavorited('999')).toBe(false);
  });

  it('여러 장소 저장 후 순서 유지 (최신 우선)', () => {
    addPlaceFavorite(makeFav('1'));
    addPlaceFavorite(makeFav('2'));
    addPlaceFavorite(makeFav('3'));
    const favs = getPlaceFavorites();
    expect(favs).toHaveLength(3);
    // 가장 최근에 추가한 것이 맨 앞
    expect(favs[0].placeId).toBe('3');
  });

  it('존재하지 않는 id 삭제 시 오류 없이 처리', () => {
    addPlaceFavorite(makeFav('1'));
    expect(() => removePlaceFavorite('non-existent')).not.toThrow();
    expect(getPlaceFavorites()).toHaveLength(1);
  });
});
