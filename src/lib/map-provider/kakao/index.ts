/**
 * Kakao Maps API 통합 모듈
 *
 * Kakao Mobility (Directions) 및 Kakao Local (Search, Geocoding) API를 통합합니다.
 */

export { KakaoDirectionsProvider, KakaoDirectionsApiError } from './directions';
export { KakaoSearchProvider, KakaoSearchApiError } from './search';
export { KakaoGeocodingProvider, KakaoGeocodingApiError } from './geocoding';

export type {
  KakaoDirectionsResponse,
  KakaoRoute,
  KakaoRouteSummary,
  KakaoRouteSection,
  KakaoRoad,
  KakaoLocalSearchResponse,
  KakaoLocalDocument,
  KakaoAddressSearchResponse,
  KakaoAddressDocument,
  KakaoCoord2AddressResponse,
  KakaoCoord2AddressDocument,
} from './types';
