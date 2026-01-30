/**
 * Kakao Local Search API 래퍼
 *
 * 카테고리별 매장 검색 (다이소, 스타벅스 등)
 */

import { kakaoLocalClient, extractKakaoErrorMessage } from './client';
import { KakaoLocalSearchResponse, KakaoLocalDocument } from './types';
import { Place, Coordinates } from '@/types/location';
import { ISearchProvider, SearchOptions } from '../types';
import { haversineDistance } from '@/lib/utils';
import { AxiosError } from 'axios';

// ========================
// 에러 클래스
// ========================

export class KakaoSearchApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'KakaoSearchApiError';
  }
}

// ========================
// Kakao Search Provider
// ========================

export class KakaoSearchProvider implements ISearchProvider {
  /**
   * Kakao Local 키워드 검색
   *
   * @param query - 검색어
   * @param options - 검색 옵션
   * @returns Place 배열
   */
  async searchPlaces(query: string, options: SearchOptions = {}): Promise<Place[]> {
    try {
      if (!query || query.trim().length === 0) {
        throw new KakaoSearchApiError('검색어를 입력해주세요.', 'EMPTY_QUERY');
      }

      const maxResults = options.maxResults || 100;
      const allPlaces: Place[] = [];

      // Kakao는 페이지당 최대 15개, 최대 3페이지(45개)까지 지원
      const maxPages = Math.min(Math.ceil(maxResults / 15), 3);

      for (let page = 1; page <= maxPages; page++) {
        const params: Record<string, any> = {
          query: query.trim(),
          page,
          size: 15,
        };

        // 중심 좌표/반경 필터링 (Kakao API 네이티브 지원)
        if (options.center) {
          params.x = options.center.lng.toString();
          params.y = options.center.lat.toString();
          if (options.radius) {
            params.radius = options.radius;
          }
          params.sort = 'distance';
        }

        const response = await kakaoLocalClient.get<KakaoLocalSearchResponse>(
          '/v2/local/search/keyword.json',
          { params }
        );

        if (!response.data || !Array.isArray(response.data.documents)) {
          throw new KakaoSearchApiError('잘못된 API 응답 형식입니다.', 'INVALID_RESPONSE', response.data);
        }

        const places = response.data.documents.map((doc) => convertKakaoDocToPlace(doc, query));
        allPlaces.push(...places);

        // 마지막 페이지이거나 충분한 결과를 얻었으면 중단
        if (response.data.meta.is_end || allPlaces.length >= maxResults) break;
      }

      // 거리 기반 필터링 (API에서 처리되지 않은 경우)
      let result = allPlaces.slice(0, maxResults);
      if (options.center && options.radius && !result[0]?.id.startsWith('kakao-')) {
        result = filterPlacesByRadius(result, options.center, options.radius);
      }

      return result;
    } catch (error: any) {
      if (error instanceof KakaoSearchApiError) throw error;

      if (error.isAxiosError) {
        const axiosError = error as AxiosError;
        const status = axiosError.response?.status;
        if (status) {
          throw new KakaoSearchApiError(
            `Kakao Search API 요청 실패 (HTTP ${status})`,
            'HTTP_ERROR',
            { status, data: axiosError.response?.data }
          );
        }
        throw new KakaoSearchApiError(
          '네트워크 오류가 발생했습니다.',
          'NETWORK_ERROR',
          { message: error.message }
        );
      }

      throw new KakaoSearchApiError(
        `검색 중 오류 발생: ${extractKakaoErrorMessage(error)}`,
        'UNKNOWN_ERROR',
        error
      );
    }
  }

  /**
   * 지역별 매장 검색
   */
  async searchPlacesByRegion(
    query: string,
    region: string,
    maxResults: number = 100
  ): Promise<Place[]> {
    const fullQuery = `${query} ${region}`;
    return this.searchPlaces(fullQuery, { maxResults });
  }
}

// ========================
// 유틸리티 함수
// ========================

/**
 * Kakao Local Document를 Place로 변환
 */
function convertKakaoDocToPlace(doc: KakaoLocalDocument, category: string): Place {
  const lng = parseFloat(doc.x);
  const lat = parseFloat(doc.y);

  return {
    id: `kakao-${doc.id}`,
    name: doc.place_name,
    category,
    address: doc.address_name || '',
    roadAddress: doc.road_address_name || undefined,
    coordinates: { lat, lng },
    phone: doc.phone || undefined,
  };
}

/**
 * 반경 내 매장 필터링
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
