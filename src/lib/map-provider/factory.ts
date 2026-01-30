/**
 * Map Provider 팩토리
 *
 * MAP_PROVIDER 환경변수에 따라 적절한 프로바이더를 반환합니다.
 * 기본값: 'kakao'
 *
 * @example
 * ```ts
 * const directions = getDirectionsProvider();
 * const route = await directions.getRoute(start, end);
 * ```
 */

import { IDirectionsProvider, ISearchProvider, IGeocodingProvider } from './types';

// ========================
// 싱글톤 인스턴스
// ========================

let directionsProvider: IDirectionsProvider | null = null;
let searchProvider: ISearchProvider | null = null;
let geocodingProvider: IGeocodingProvider | null = null;

/** 현재 프로바이더 타입 (캐시 무효화용) */
let currentProvider: string | null = null;

/**
 * 현재 MAP_PROVIDER 환경변수 값을 반환합니다.
 */
function getProviderType(): string {
  return process.env.MAP_PROVIDER || 'kakao';
}

/**
 * 프로바이더가 변경되었는지 확인하고 캐시를 무효화합니다.
 */
function checkProviderChange(): void {
  const provider = getProviderType();
  if (currentProvider !== provider) {
    directionsProvider = null;
    searchProvider = null;
    geocodingProvider = null;
    currentProvider = provider;
  }
}

// ========================
// 팩토리 함수
// ========================

/**
 * Directions 프로바이더 반환 (싱글톤)
 */
export function getDirectionsProvider(): IDirectionsProvider {
  checkProviderChange();

  if (!directionsProvider) {
    const provider = getProviderType();
    console.log(`[MapProvider] Creating Directions provider: ${provider}`);

    if (provider === 'naver') {
      const { NaverDirectionsProvider } = require('./naver');
      directionsProvider = new NaverDirectionsProvider();
    } else {
      const { KakaoDirectionsProvider } = require('./kakao');
      directionsProvider = new KakaoDirectionsProvider();
    }
  }

  return directionsProvider!;
}

/**
 * Search 프로바이더 반환 (싱글톤)
 */
export function getSearchProvider(): ISearchProvider {
  checkProviderChange();

  if (!searchProvider) {
    const provider = getProviderType();
    console.log(`[MapProvider] Creating Search provider: ${provider}`);

    if (provider === 'naver') {
      const { NaverSearchProvider } = require('./naver');
      searchProvider = new NaverSearchProvider();
    } else {
      const { KakaoSearchProvider } = require('./kakao');
      searchProvider = new KakaoSearchProvider();
    }
  }

  return searchProvider!;
}

/**
 * Geocoding 프로바이더 반환 (싱글톤)
 */
export function getGeocodingProvider(): IGeocodingProvider {
  checkProviderChange();

  if (!geocodingProvider) {
    const provider = getProviderType();
    console.log(`[MapProvider] Creating Geocoding provider: ${provider}`);

    if (provider === 'naver') {
      const { NaverGeocodingProvider } = require('./naver');
      geocodingProvider = new NaverGeocodingProvider();
    } else {
      const { KakaoGeocodingProvider } = require('./kakao');
      geocodingProvider = new KakaoGeocodingProvider();
    }
  }

  return geocodingProvider!;
}
