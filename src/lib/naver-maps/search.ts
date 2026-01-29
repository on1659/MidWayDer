/**
 * Naver Local Search API 래퍼
 *
 * 카테고리별 매장 검색 (다이소, 스타벅스 등)
 */

import axios, { AxiosError } from 'axios';
import { extractErrorMessage, getErrorMessageByStatus } from './client';
import { NaverLocalSearchResponse, NaverLocalSearchItem } from './types';
import { Place, Coordinates } from '@/types/location';
import { haversineDistance } from '@/lib/utils';

/**
 * Naver 검색 API 클라이언트 (developers.naver.com)
 * NCP Maps API와 별도 인증
 */
const naverSearchClient = axios.create({
  baseURL: 'https://openapi.naver.com',
  timeout: 10000,
});

// 런타임에 환경변수를 읽도록 인터셉터 사용
naverSearchClient.interceptors.request.use((config) => {
  config.headers['X-Naver-Client-Id'] = process.env.NAVER_SEARCH_CLIENT_ID || '';
  config.headers['X-Naver-Client-Secret'] = process.env.NAVER_SEARCH_CLIENT_SECRET || '';
  return config;
});

// ========================
// 타입 정의
// ========================

/** 검색 옵션 */
export interface SearchOptions {
  /** 최대 결과 수 (기본 100, 최대 100) */
  maxResults?: number;
  /** 정렬 기준 (기본 random) */
  sort?: 'random' | 'comment';
  /** 필터링: 중심 좌표 */
  center?: Coordinates;
  /** 필터링: 반경 (미터, center와 함께 사용) */
  radius?: number;
}

/** Search API 에러 */
export class SearchApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'SearchApiError';
  }
}

// ========================
// API 함수
// ========================

/**
 * Naver Local Search API 호출
 *
 * 카테고리별 매장을 검색하고, 우리 앱의 Place 타입으로 변환합니다.
 *
 * @param query - 검색 쿼리 (예: "다이소", "스타벅스 강남")
 * @param options - 검색 옵션
 * @returns Place 배열
 * @throws SearchApiError
 *
 * @example
 * ```ts
 * const places = await searchPlaces('다이소', {
 *   maxResults: 50,
 *   center: { lat: 37.5665, lng: 126.9780 },
 *   radius: 5000, // 5km
 * });
 * console.log(`Found ${places.length} places`);
 * ```
 */
export async function searchPlaces(
  query: string,
  options: SearchOptions = {}
): Promise<Place[]> {
  try {
    // 입력 검증
    if (!query || query.trim().length === 0) {
      throw new SearchApiError('검색어를 입력해주세요.', 'EMPTY_QUERY');
    }

    // 옵션 기본값
    const maxResults = Math.min(options.maxResults || 100, 100);
    const sort = options.sort || 'random';

    // API 호출 (Naver 검색 API - developers.naver.com)
    const encodedQuery = encodeURIComponent(query.trim());
    const url = `/v1/search/local.json?query=${encodedQuery}&display=${Math.min(maxResults, 5)}&start=1`;
    const response = await naverSearchClient.get<NaverLocalSearchResponse>(url);

    // 응답 검증
    if (!response.data || !Array.isArray(response.data.items)) {
      throw new SearchApiError('잘못된 API 응답 형식입니다.', 'INVALID_RESPONSE', response.data);
    }

    // Naver 응답을 우리 Place 타입으로 변환
    let places = response.data.items.map((item) => convertNaverItemToPlace(item, query));

    // 거리 기반 필터링 (선택사항)
    if (options.center && options.radius) {
      places = filterPlacesByRadius(places, options.center, options.radius);
    }

    return places;
  } catch (error: any) {
    // 이미 SearchApiError인 경우 그대로 전달
    if (error instanceof SearchApiError) {
      throw error;
    }

    // Axios 에러 처리
    if (error.isAxiosError) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status;

      if (status) {
        throw new SearchApiError(
          getErrorMessageByStatus(status),
          'HTTP_ERROR',
          { status, data: axiosError.response?.data }
        );
      }

      // 네트워크 에러
      throw new SearchApiError(
        '네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.',
        'NETWORK_ERROR',
        { message: error.message }
      );
    }

    // 기타 에러
    throw new SearchApiError(
      `검색 중 오류 발생: ${extractErrorMessage(error)}`,
      'UNKNOWN_ERROR',
      error
    );
  }
}

/**
 * 지역별 매장 검색
 *
 * 특정 지역의 매장을 검색합니다.
 *
 * @param query - 검색 쿼리 (예: "다이소")
 * @param region - 지역명 (예: "서울", "강남구")
 * @param maxResults - 최대 결과 수
 * @returns Place 배열
 */
export async function searchPlacesByRegion(
  query: string,
  region: string,
  maxResults: number = 100
): Promise<Place[]> {
  const fullQuery = `${query} ${region}`;
  return searchPlaces(fullQuery, { maxResults });
}

/**
 * 여러 카테고리 동시 검색
 *
 * 여러 카테고리의 매장을 동시에 검색합니다.
 *
 * @param categories - 카테고리 배열 (예: ["다이소", "스타벅스"])
 * @param options - 검색 옵션
 * @returns 카테고리별 Place 배열
 */
export async function searchMultipleCategories(
  categories: string[],
  options: SearchOptions = {}
): Promise<Record<string, Place[]>> {
  const results = await Promise.allSettled(
    categories.map((category) => searchPlaces(category, options))
  );

  const placesByCategory: Record<string, Place[]> = {};

  results.forEach((result, index) => {
    const category = categories[index];
    if (result.status === 'fulfilled') {
      placesByCategory[category] = result.value;
    } else {
      console.error(`[Search] Failed to search ${category}:`, result.reason);
      placesByCategory[category] = [];
    }
  });

  return placesByCategory;
}

// ========================
// 좌표 변환
// ========================

/**
 * KATECH 좌표 → WGS84 변환
 *
 * Naver Local Search API는 KATECH 좌표계를 사용합니다.
 * 정수형 문자열을 WGS84 좌표로 변환합니다.
 *
 * @param x - 경도 (KATECH, 정수형 문자열)
 * @param y - 위도 (KATECH, 정수형 문자열)
 * @returns WGS84 좌표
 *
 * @example
 * ```ts
 * katechToWgs84("1270000000", "375665000")
 * // { lat: 37.5665, lng: 127.0000 }
 * ```
 */
function katechToWgs84(x: string, y: string): Coordinates {
  try {
    // KATECH 좌표는 실제 좌표 * 10,000,000 으로 인코딩됨
    const lng = parseInt(x) / 10000000;
    const lat = parseInt(y) / 10000000;

    // 좌표 유효성 검증
    if (isNaN(lng) || isNaN(lat)) {
      throw new Error('Invalid KATECH coordinates');
    }

    return { lat, lng };
  } catch (error) {
    console.error('[Search] KATECH to WGS84 conversion error:', { x, y, error });
    // 기본값 반환 (서울시청)
    return { lat: 37.5663, lng: 126.9779 };
  }
}

// ========================
// 유틸리티 함수
// ========================

/**
 * Naver Local Search Item을 Place로 변환
 */
function convertNaverItemToPlace(item: NaverLocalSearchItem, category: string): Place {
  // HTML 태그 제거 (예: "<b>다이소</b> 강남점" → "다이소 강남점")
  const cleanTitle = item.title.replace(/<\/?b>/g, '');

  // KATECH → WGS84 변환
  const coordinates = katechToWgs84(item.mapx, item.mapy);

  return {
    id: `temp-${item.mapx}-${item.mapy}`, // 임시 ID (DB 저장 시 cuid로 교체)
    name: cleanTitle,
    category,
    address: item.address || '',
    roadAddress: item.roadAddress || undefined,
    coordinates,
    phone: item.telephone || undefined,
  };
}

/**
 * 반경 내 매장 필터링
 *
 * 중심 좌표로부터 특정 반경 내의 매장만 반환합니다.
 *
 * @param places - 매장 배열
 * @param center - 중심 좌표
 * @param radius - 반경 (미터)
 * @returns 필터링된 매장 배열
 */
function filterPlacesByRadius(
  places: Place[],
  center: Coordinates,
  radius: number
): Place[] {
  return places.filter((place) => {
    const distance = haversineDistance(center, place.coordinates);
    return distance <= radius;
  });
}

/**
 * 중복 매장 제거
 *
 * 같은 이름과 주소를 가진 매장을 제거합니다.
 *
 * @param places - 매장 배열
 * @returns 중복 제거된 매장 배열
 */
export function deduplicatePlaces(places: Place[]): Place[] {
  const seen = new Set<string>();
  const result: Place[] = [];

  for (const place of places) {
    const key = `${place.name}-${place.address}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(place);
    }
  }

  return result;
}

/**
 * 거리순 정렬
 *
 * 특정 좌표로부터의 거리 순으로 매장을 정렬합니다.
 *
 * @param places - 매장 배열
 * @param from - 기준 좌표
 * @returns 정렬된 매장 배열
 */
export function sortPlacesByDistance(places: Place[], from: Coordinates): Place[] {
  return places.slice().sort((a, b) => {
    const distA = haversineDistance(from, a.coordinates);
    const distB = haversineDistance(from, b.coordinates);
    return distA - distB;
  });
}

/**
 * 검색 결과 요약 출력 (디버깅용)
 */
export function printSearchSummary(query: string, places: Place[]): void {
  console.log('=== Search Summary ===');
  console.log(`Query: ${query}`);
  console.log(`Results: ${places.length}`);
  if (places.length > 0) {
    console.log(`First: ${places[0].name} (${places[0].address})`);
  }
}
