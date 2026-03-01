import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  recordLocationVisit,
  getSavedLocations,
  addSavedLocation,
  removeSavedLocation,
} from '../smart-location';

const mockCoords = { lat: 37.5663, lng: 126.9779 };

describe('smart-location', () => {
  let _store: Record<string, string> = {};
  beforeEach(() => {
    _store = {};
    vi.stubGlobal('localStorage', {
      getItem(key: string) { return _store[key] ?? null; },
      setItem(key: string, value: string) { _store[key] = value; },
      removeItem(key: string) { delete _store[key]; },
      clear() { _store = {}; },
    });
  });

  it('recordLocationVisit — localStorage에 방문 기록 저장', () => {
    recordLocationVisit('서울시청', mockCoords);
    const visits = JSON.parse(localStorage.getItem('midwayder_location_visits') ?? '[]');
    expect(visits).toHaveLength(1);
    expect(visits[0].address).toBe('서울시청');
  });

  it('getSavedLocations — 저장 없으면 빈 배열 반환', () => {
    const locs = getSavedLocations();
    expect(locs).toEqual([]);
  });

  it('addSavedLocation → getSavedLocations에서 조회 가능', () => {
    addSavedLocation({
      label: 'home',
      address: '서울 마포구',
      coordinates: mockCoords,
      visitCount: 5,
      lastVisited: Date.now(),
    });
    const locs = getSavedLocations();
    expect(locs).toHaveLength(1);
    expect(locs[0].label).toBe('home');
  });

  it('removeSavedLocation — 삭제 후 목록에서 제거', () => {
    addSavedLocation({
      label: 'work',
      address: '서울 강남구',
      coordinates: mockCoords,
      visitCount: 3,
      lastVisited: Date.now(),
    });
    const locs = getSavedLocations();
    removeSavedLocation(locs[0].id);
    expect(getSavedLocations()).toHaveLength(0);
  });
});
