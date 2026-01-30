/**
 * Map Provider 공통 인터페이스
 *
 * Naver/Kakao 등 지도 API를 추상화하는 인터페이스입니다.
 * MAP_PROVIDER 환경변수로 런타임에 구현체를 선택합니다.
 */

import { Route, Coordinates, Place } from '@/types/location';

// ========================
// Directions Provider
// ========================

/** 경로 옵션 (공통) */
export type RouteOption = 'optimal' | 'fast' | 'comfort';

/**
 * 경로 조회 프로바이더 인터페이스
 */
export interface IDirectionsProvider {
  /**
   * A→B 경로 조회
   *
   * @param start - 출발지 좌표
   * @param end - 도착지 좌표
   * @param option - 경로 옵션 (기본: optimal)
   * @returns Route 객체
   */
  getRoute(start: Coordinates, end: Coordinates, option?: RouteOption): Promise<Route>;
}

// ========================
// Search Provider
// ========================

/** 검색 옵션 */
export interface SearchOptions {
  /** 최대 결과 수 (기본 100) */
  maxResults?: number;
  /** 필터링: 중심 좌표 */
  center?: Coordinates;
  /** 필터링: 반경 (미터, center와 함께 사용) */
  radius?: number;
}

/**
 * 장소 검색 프로바이더 인터페이스
 */
export interface ISearchProvider {
  /**
   * 키워드로 장소 검색
   *
   * @param query - 검색어 (예: "다이소", "스타벅스")
   * @param options - 검색 옵션
   * @returns Place 배열
   */
  searchPlaces(query: string, options?: SearchOptions): Promise<Place[]>;

  /**
   * 지역별 장소 검색
   *
   * @param query - 검색어 (예: "다이소")
   * @param region - 지역명 (예: "서울", "강남구")
   * @param maxResults - 최대 결과 수
   * @returns Place 배열
   */
  searchPlacesByRegion(query: string, region: string, maxResults?: number): Promise<Place[]>;
}

// ========================
// Geocoding Provider
// ========================

/**
 * 주소/좌표 변환 프로바이더 인터페이스
 */
export interface IGeocodingProvider {
  /**
   * 주소 → 좌표 변환 (Forward Geocoding)
   *
   * @param address - 주소 문자열
   * @returns 좌표 (WGS84)
   */
  geocodeAddress(address: string): Promise<Coordinates>;

  /**
   * 좌표 → 주소 변환 (Reverse Geocoding)
   *
   * @param coords - 좌표 (WGS84)
   * @returns 주소 문자열
   */
  reverseGeocode(coords: Coordinates): Promise<string>;
}
