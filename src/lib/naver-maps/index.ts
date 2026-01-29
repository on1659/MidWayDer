/**
 * Naver Maps API 통합 모듈
 *
 * Naver Maps Enterprise SDK 3개 API를 통합한 모듈:
 * - Directions 5 API: 경로 조회
 * - Local Search API: 장소 검색
 * - Reverse Geocoding API: 좌표 → 주소 변환
 *
 * @example
 * ```ts
 * import { getRoute, searchPlaces, reverseGeocode } from '@/lib/naver-maps';
 *
 * // 경로 조회
 * const route = await getRoute(start, end);
 *
 * // 장소 검색
 * const places = await searchPlaces('다이소');
 *
 * // 주소 변환
 * const address = await reverseGeocode(coords);
 * ```
 */

// ========================
// 타입
// ========================

export type {
  NaverDirectionsResponse,
  NaverRoute,
  NaverRouteSection,
  NaverRouteGuide,
  NaverLocalSearchResponse,
  NaverLocalSearchItem,
  NaverReverseGeocodeResponse,
  NaverReverseGeocodeResult,
  NaverApiErrorResponse,
} from './types';

// ========================
// 클라이언트
// ========================

export { naverMapsClient, extractErrorMessage, getErrorMessageByStatus } from './client';

// ========================
// Directions API
// ========================

export {
  getRoute,
  getMultipleRoutes,
  calculateDistance,
  printRouteSummary,
  DirectionsApiError,
} from './directions';

export type { RouteOption } from './directions';

// ========================
// Local Search API
// ========================

export {
  searchPlaces,
  searchPlacesByRegion,
  searchMultipleCategories,
  deduplicatePlaces,
  sortPlacesByDistance,
  printSearchSummary,
  SearchApiError,
} from './search';

export type { SearchOptions } from './search';

// ========================
// Reverse Geocoding API
// ========================

export {
  reverseGeocode,
  reverseGeocodeDetailed,
  reverseGeocodeBatch,
  geocodeAddress,
  getShortAddress,
  printAddressInfo,
  GeocodingApiError,
} from './geocoding';

export type { GeocodingOptions } from './geocoding';
