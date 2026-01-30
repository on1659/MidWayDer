/**
 * Kakao Local Geocoding API 래퍼
 *
 * 주소 ↔ 좌표 변환
 */

import { kakaoLocalClient, extractKakaoErrorMessage } from './client';
import { KakaoAddressSearchResponse, KakaoCoord2AddressResponse } from './types';
import { Coordinates } from '@/types/location';
import { IGeocodingProvider } from '../types';
import { AxiosError } from 'axios';

// ========================
// 에러 클래스
// ========================

export class KakaoGeocodingApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'KakaoGeocodingApiError';
  }
}

// ========================
// Kakao Geocoding Provider
// ========================

export class KakaoGeocodingProvider implements IGeocodingProvider {
  /**
   * 주소 → 좌표 변환 (Kakao Address Search)
   *
   * @param address - 주소 문자열
   * @returns 좌표 (WGS84)
   */
  async geocodeAddress(address: string): Promise<Coordinates> {
    try {
      if (!address || address.trim().length === 0) {
        throw new KakaoGeocodingApiError('주소를 입력해주세요.', 'EMPTY_ADDRESS');
      }

      const response = await kakaoLocalClient.get<KakaoAddressSearchResponse>(
        '/v2/local/search/address.json',
        {
          params: { query: address.trim() },
        }
      );

      if (!response.data.documents || response.data.documents.length === 0) {
        throw new KakaoGeocodingApiError(
          `주소를 찾을 수 없습니다: ${address}`,
          'NO_ADDRESS_FOUND'
        );
      }

      const result = response.data.documents[0];
      const lat = parseFloat(result.y);
      const lng = parseFloat(result.x);

      if (isNaN(lat) || isNaN(lng)) {
        throw new KakaoGeocodingApiError('좌표 변환에 실패했습니다.', 'INVALID_COORDINATES');
      }

      return { lat, lng };
    } catch (error: any) {
      if (error instanceof KakaoGeocodingApiError) throw error;

      if (error.isAxiosError) {
        const axiosError = error as AxiosError;
        const status = axiosError.response?.status;
        if (status) {
          throw new KakaoGeocodingApiError(
            `Kakao Geocoding API 요청 실패 (HTTP ${status})`,
            'HTTP_ERROR',
            { status, data: axiosError.response?.data }
          );
        }
        throw new KakaoGeocodingApiError(
          '네트워크 오류가 발생했습니다.',
          'NETWORK_ERROR',
          { message: error.message }
        );
      }

      throw new KakaoGeocodingApiError(
        `주소 변환 중 오류 발생: ${extractKakaoErrorMessage(error)}`,
        'UNKNOWN_ERROR',
        error
      );
    }
  }

  /**
   * 좌표 → 주소 변환 (Kakao Coord2Address)
   *
   * @param coords - 좌표 (WGS84)
   * @returns 주소 문자열
   */
  async reverseGeocode(coords: Coordinates): Promise<string> {
    try {
      if (!coords || typeof coords.lat !== 'number' || typeof coords.lng !== 'number') {
        throw new KakaoGeocodingApiError('좌표가 유효하지 않습니다.', 'INVALID_COORDINATES');
      }

      const response = await kakaoLocalClient.get<KakaoCoord2AddressResponse>(
        '/v2/local/geo/coord2address.json',
        {
          params: {
            x: coords.lng,
            y: coords.lat,
          },
        }
      );

      if (!response.data.documents || response.data.documents.length === 0) {
        throw new KakaoGeocodingApiError(
          '해당 좌표의 주소를 찾을 수 없습니다.',
          'NO_ADDRESS_FOUND'
        );
      }

      const result = response.data.documents[0];

      // 도로명 주소 우선, 없으면 지번 주소
      if (result.road_address) {
        return result.road_address.address_name;
      }
      if (result.address) {
        return result.address.address_name;
      }

      throw new KakaoGeocodingApiError(
        '주소 정보를 파싱할 수 없습니다.',
        'PARSE_ERROR'
      );
    } catch (error: any) {
      if (error instanceof KakaoGeocodingApiError) throw error;

      if (error.isAxiosError) {
        const axiosError = error as AxiosError;
        const status = axiosError.response?.status;
        if (status) {
          throw new KakaoGeocodingApiError(
            `Kakao Reverse Geocoding API 요청 실패 (HTTP ${status})`,
            'HTTP_ERROR',
            { status, data: axiosError.response?.data }
          );
        }
        throw new KakaoGeocodingApiError(
          '네트워크 오류가 발생했습니다.',
          'NETWORK_ERROR',
          { message: error.message }
        );
      }

      throw new KakaoGeocodingApiError(
        `좌표 변환 중 오류 발생: ${extractKakaoErrorMessage(error)}`,
        'UNKNOWN_ERROR',
        error
      );
    }
  }
}
