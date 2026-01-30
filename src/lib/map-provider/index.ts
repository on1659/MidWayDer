/**
 * Map Provider 통합 모듈
 *
 * MAP_PROVIDER 환경변수에 따라 Naver/Kakao Maps API를 전환합니다.
 *
 * @example
 * ```ts
 * import { getDirectionsProvider, getSearchProvider, getGeocodingProvider } from '@/lib/map-provider';
 *
 * const route = await getDirectionsProvider().getRoute(start, end);
 * const places = await getSearchProvider().searchPlaces('다이소');
 * const coords = await getGeocodingProvider().geocodeAddress('서울시청');
 * ```
 */

// 팩토리 함수
export {
  getDirectionsProvider,
  getSearchProvider,
  getGeocodingProvider,
} from './factory';

// 인터페이스 타입
export type {
  IDirectionsProvider,
  ISearchProvider,
  IGeocodingProvider,
  RouteOption,
  SearchOptions,
} from './types';
