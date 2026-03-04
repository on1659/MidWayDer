import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getFavorites, addFavorite, removeFavorite, updateFavorite, clearAllFavorites } from '../favorites';

vi.mock('../logger', () => ({ logger: { error: vi.fn(), debug: vi.fn() } }));

const store: Record<string, string> = {};
vi.stubGlobal('window', {});
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
});

const makeFav = (n: number) => ({
  name: `경로 ${n}`,
  startAddress: `출발지 ${n}`,
  endAddress: `도착지 ${n}`,
  category: '편의점',
});

describe('favorites', () => {
  beforeEach(() => Object.keys(store).forEach((k) => delete store[k]));

  // T1
  it('addFavorite 후 getFavorites에서 조회 가능', () => {
    addFavorite(makeFav(1));
    const favs = getFavorites();
    expect(favs).toHaveLength(1);
    expect(favs[0].name).toBe('경로 1');
    expect(favs[0].id).toMatch(/^fav_/);
    expect(typeof favs[0].createdAt).toBe('number');
  });

  // T2
  it('동일 출발지+도착지+카테고리 중복 추가 → 1개만 저장', () => {
    addFavorite(makeFav(1));
    addFavorite(makeFav(1));
    expect(getFavorites()).toHaveLength(1);
  });

  // T3
  it('removeFavorite 후 목록에서 제거', () => {
    addFavorite(makeFav(1));
    const id = getFavorites()[0].id;
    removeFavorite(id);
    expect(getFavorites()).toHaveLength(0);
  });

  // T4
  it('updateFavorite — name 필드 업데이트', () => {
    addFavorite(makeFav(1));
    const id = getFavorites()[0].id;
    updateFavorite(id, { name: '수정된 이름' });
    expect(getFavorites()[0].name).toBe('수정된 이름');
  });

  // T5
  it('MAX_FAVORITES(10) 초과 시 가장 오래된 항목 제거', () => {
    for (let i = 0; i < 11; i++) addFavorite(makeFav(i));
    expect(getFavorites()).toHaveLength(10);
  });

  // T6
  it('clearAllFavorites 후 빈 배열 반환', () => {
    addFavorite(makeFav(1));
    clearAllFavorites();
    expect(getFavorites()).toHaveLength(0);
  });

  // T7
  it('localStorage 손상 데이터 → 빈 배열 반환 (크래시 없음)', () => {
    store['midwayder_favorites'] = 'INVALID_JSON{{';
    expect(() => getFavorites()).not.toThrow();
    expect(getFavorites()).toEqual([]);
  });
});
