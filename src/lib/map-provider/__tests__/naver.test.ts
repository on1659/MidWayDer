import { describe, it, expect, vi } from 'vitest';
import { NaverDirectionsProvider, NaverSearchProvider, NaverGeocodingProvider } from '../naver/index';
import type { IDirectionsProvider, ISearchProvider, IGeocodingProvider } from '../types';

vi.mock('../naver/directions', () => ({
  getRoute: vi.fn().mockResolvedValue({
    start: { lat: 37.5663, lng: 126.9779 },
    end: { lat: 37.4979, lng: 127.0276 },
    distance: 12500,
    duration: 1200,
    path: [],
  }),
}));

vi.mock('../naver/search', () => ({
  searchPlaces: vi.fn().mockResolvedValue([]),
  searchPlacesByRegion: vi.fn().mockResolvedValue([]),
}));

vi.mock('../naver/geocoding', () => ({
  geocodeAddress: vi.fn().mockResolvedValue({ lat: 37.5663, lng: 126.9779 }),
  reverseGeocode: vi.fn().mockResolvedValue('서울특별시 중구 세종대로 110'),
}));

describe('NaverDirectionsProvider', () => {
  it('IDirectionsProvider 인터페이스 구현', () => {
    const provider: IDirectionsProvider = new NaverDirectionsProvider();
    expect(provider.getRoute).toBeTypeOf('function');
  });

  it('getRoute() → Route 객체 반환', async () => {
    const provider = new NaverDirectionsProvider();
    const route = await provider.getRoute(
      { lat: 37.5663, lng: 126.9779 },
      { lat: 37.4979, lng: 127.0276 }
    );
    expect(route.distance).toBe(12500);
    expect(route.duration).toBe(1200);
  });
});

describe('NaverSearchProvider', () => {
  it('ISearchProvider 인터페이스 구현', () => {
    const provider: ISearchProvider = new NaverSearchProvider();
    expect(provider.searchPlaces).toBeTypeOf('function');
    expect(provider.searchPlacesByRegion).toBeTypeOf('function');
  });

  it('searchPlaces() → 배열 반환', async () => {
    const provider = new NaverSearchProvider();
    const places = await provider.searchPlaces('다이소');
    expect(Array.isArray(places)).toBe(true);
  });
});

describe('NaverGeocodingProvider', () => {
  it('IGeocodingProvider 인터페이스 구현', () => {
    const provider: IGeocodingProvider = new NaverGeocodingProvider();
    expect(provider.geocodeAddress).toBeTypeOf('function');
    expect(provider.reverseGeocode).toBeTypeOf('function');
  });

  it('geocodeAddress() → Coordinates 반환', async () => {
    const provider = new NaverGeocodingProvider();
    const coords = await provider.geocodeAddress('서울특별시 중구 세종대로 110');
    expect(coords.lat).toBe(37.5663);
    expect(coords.lng).toBe(126.9779);
  });
});
