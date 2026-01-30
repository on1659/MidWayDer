import { describe, it, expect } from 'vitest';
import { KakaoDirectionsProvider } from '../kakao/directions';
import { KakaoSearchProvider } from '../kakao/search';
import { KakaoGeocodingProvider } from '../kakao/geocoding';
import type { IDirectionsProvider, ISearchProvider, IGeocodingProvider } from '../types';

describe('Map Provider - Kakao 구현체 인터페이스 확인', () => {
  it('KakaoDirectionsProvider는 IDirectionsProvider를 구현', () => {
    const provider: IDirectionsProvider = new KakaoDirectionsProvider();
    expect(provider.getRoute).toBeTypeOf('function');
  });

  it('KakaoSearchProvider는 ISearchProvider를 구현', () => {
    const provider: ISearchProvider = new KakaoSearchProvider();
    expect(provider.searchPlaces).toBeTypeOf('function');
    expect(provider.searchPlacesByRegion).toBeTypeOf('function');
  });

  it('KakaoGeocodingProvider는 IGeocodingProvider를 구현', () => {
    const provider: IGeocodingProvider = new KakaoGeocodingProvider();
    expect(provider.geocodeAddress).toBeTypeOf('function');
    expect(provider.reverseGeocode).toBeTypeOf('function');
  });
});
