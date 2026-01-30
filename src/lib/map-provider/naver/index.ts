/**
 * Naver Maps API 어댑터
 *
 * 기존 src/lib/naver-maps/ 함수들을 공통 인터페이스에 맞게 래핑합니다.
 * 기존 파일을 수정하지 않고 어댑터 패턴으로 연결합니다.
 */

import { getRoute as naverGetRoute } from '@/lib/naver-maps/directions';
import { searchPlaces as naverSearchPlaces, searchPlacesByRegion as naverSearchPlacesByRegion } from '@/lib/naver-maps/search';
import { geocodeAddress as naverGeocodeAddress, reverseGeocode as naverReverseGeocode } from '@/lib/naver-maps/geocoding';
import { Route, Coordinates, Place } from '@/types/location';
import { IDirectionsProvider, ISearchProvider, IGeocodingProvider, RouteOption, SearchOptions } from '../types';

// ========================
// Naver RouteOption 매핑
// ========================

type NaverRouteOption = 'traoptimal' | 'trafast' | 'tracomfort';

function mapOptionToNaver(option: RouteOption): NaverRouteOption {
  switch (option) {
    case 'fast':
      return 'trafast';
    case 'comfort':
      return 'tracomfort';
    case 'optimal':
    default:
      return 'traoptimal';
  }
}

// ========================
// Naver Directions Provider
// ========================

export class NaverDirectionsProvider implements IDirectionsProvider {
  async getRoute(
    start: Coordinates,
    end: Coordinates,
    option: RouteOption = 'optimal'
  ): Promise<Route> {
    return naverGetRoute(start, end, mapOptionToNaver(option));
  }
}

// ========================
// Naver Search Provider
// ========================

export class NaverSearchProvider implements ISearchProvider {
  async searchPlaces(query: string, options: SearchOptions = {}): Promise<Place[]> {
    // Naver SearchOptions와 호환되도록 매핑
    return naverSearchPlaces(query, {
      maxResults: options.maxResults,
      center: options.center,
      radius: options.radius,
    });
  }

  async searchPlacesByRegion(
    query: string,
    region: string,
    maxResults: number = 100
  ): Promise<Place[]> {
    return naverSearchPlacesByRegion(query, region, maxResults);
  }
}

// ========================
// Naver Geocoding Provider
// ========================

export class NaverGeocodingProvider implements IGeocodingProvider {
  async geocodeAddress(address: string): Promise<Coordinates> {
    return naverGeocodeAddress(address);
  }

  async reverseGeocode(coords: Coordinates): Promise<string> {
    return naverReverseGeocode(coords);
  }
}
