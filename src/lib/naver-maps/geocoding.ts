/**
 * Naver Reverse Geocoding API 래퍼
 *
 * 좌표 → 주소 변환
 */

import { naverMapsClient, extractErrorMessage, getErrorMessageByStatus } from './client';
import { NaverReverseGeocodeResponse, NaverReverseGeocodeResult } from './types';
import { Coordinates, AddressInfo } from '@/types/location';
import { AxiosError } from 'axios';

// ========================
// 타입 정의
// ========================

/** Geocoding 옵션 */
export interface GeocodingOptions {
  /** 주소 순서 (기본: 도로명 주소 우선) */
  orders?: 'roadaddr' | 'addr' | 'roadaddr,addr';
  /** 출력 형식 (기본: json) */
  output?: 'json' | 'xml';
}

/** Geocoding API 에러 */
export class GeocodingApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'GeocodingApiError';
  }
}

// ========================
// API 함수
// ========================

/**
 * Naver Reverse Geocoding API 호출
 *
 * 좌표를 주소로 변환합니다.
 *
 * @param coords - 좌표 (WGS84)
 * @param options - Geocoding 옵션
 * @returns 주소 문자열
 * @throws GeocodingApiError
 *
 * @example
 * ```ts
 * const address = await reverseGeocode({ lat: 37.5663, lng: 126.9779 });
 * console.log(address); // "서울특별시 중구 세종대로 110"
 * ```
 */
export async function reverseGeocode(
  coords: Coordinates,
  options: GeocodingOptions = {}
): Promise<string> {
  try {
    // 좌표 검증
    validateCoordinates(coords);

    // 옵션 기본값
    const orders = options.orders || 'roadaddr,addr';
    const output = options.output || 'json';

    // API 호출
    const response = await naverMapsClient.get<NaverReverseGeocodeResponse>(
      '/map-reversegeocode/v2/gc',
      {
        params: {
          coords: `${coords.lng},${coords.lat}`, // Naver API는 경도,위도 순서
          orders,
          output,
        },
      }
    );

    // 응답 검증
    if (response.data.status.code !== 0) {
      throw new GeocodingApiError(
        response.data.status.message || 'Reverse Geocoding 실패',
        'API_ERROR',
        response.data.status
      );
    }

    // 결과 추출
    const result = response.data.results?.[0];
    if (!result) {
      throw new GeocodingApiError(
        '해당 좌표의 주소를 찾을 수 없습니다.',
        'NO_ADDRESS_FOUND'
      );
    }

    // 주소 조합
    const address = formatAddress(result);

    return address;
  } catch (error: any) {
    // 이미 GeocodingApiError인 경우 그대로 전달
    if (error instanceof GeocodingApiError) {
      throw error;
    }

    // Axios 에러 처리
    if (error.isAxiosError) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status;

      if (status) {
        throw new GeocodingApiError(
          getErrorMessageByStatus(status),
          'HTTP_ERROR',
          { status, data: axiosError.response?.data }
        );
      }

      // 네트워크 에러
      throw new GeocodingApiError(
        '네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.',
        'NETWORK_ERROR',
        { message: error.message }
      );
    }

    // 기타 에러
    throw new GeocodingApiError(
      `주소 변환 중 오류 발생: ${extractErrorMessage(error)}`,
      'UNKNOWN_ERROR',
      error
    );
  }
}

/**
 * 상세 주소 정보 조회
 *
 * 좌표를 AddressInfo 객체로 변환합니다.
 *
 * @param coords - 좌표 (WGS84)
 * @returns AddressInfo 객체
 * @throws GeocodingApiError
 */
export async function reverseGeocodeDetailed(coords: Coordinates): Promise<AddressInfo> {
  try {
    // 좌표 검증
    validateCoordinates(coords);

    // API 호출
    const response = await naverMapsClient.get<NaverReverseGeocodeResponse>(
      '/map-reversegeocode/v2/gc',
      {
        params: {
          coords: `${coords.lng},${coords.lat}`,
          orders: 'roadaddr,addr',
          output: 'json',
        },
      }
    );

    // 응답 검증
    if (response.data.status.code !== 0) {
      throw new GeocodingApiError(
        response.data.status.message || 'Reverse Geocoding 실패',
        'API_ERROR',
        response.data.status
      );
    }

    // 결과 추출
    const result = response.data.results?.[0];
    if (!result) {
      throw new GeocodingApiError(
        '해당 좌표의 주소를 찾을 수 없습니다.',
        'NO_ADDRESS_FOUND'
      );
    }

    // AddressInfo 객체 생성
    const addressInfo = convertResultToAddressInfo(result);

    return addressInfo;
  } catch (error: any) {
    // 이미 GeocodingApiError인 경우 그대로 전달
    if (error instanceof GeocodingApiError) {
      throw error;
    }

    // 기타 에러는 상위에서 처리
    throw error;
  }
}

/**
 * 배치 Reverse Geocoding
 *
 * 여러 좌표를 동시에 주소로 변환합니다.
 *
 * @param coordsList - 좌표 배열
 * @returns 주소 배열
 */
export async function reverseGeocodeBatch(coordsList: Coordinates[]): Promise<string[]> {
  const results = await Promise.allSettled(coordsList.map((coords) => reverseGeocode(coords)));

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      console.error(`[Geocoding] Failed for coords ${index}:`, result.reason);
      return '주소 없음';
    }
  });
}

// ========================
// 유틸리티 함수
// ========================

/**
 * 좌표 유효성 검증
 */
function validateCoordinates(coords: Coordinates): void {
  if (!coords || typeof coords.lat !== 'number' || typeof coords.lng !== 'number') {
    throw new GeocodingApiError('좌표가 유효하지 않습니다.', 'INVALID_COORDINATES');
  }

  if (coords.lat < -90 || coords.lat > 90) {
    throw new GeocodingApiError(
      `위도는 -90 ~ 90 범위여야 합니다. (현재: ${coords.lat})`,
      'INVALID_LATITUDE'
    );
  }

  if (coords.lng < -180 || coords.lng > 180) {
    throw new GeocodingApiError(
      `경도는 -180 ~ 180 범위여야 합니다. (현재: ${coords.lng})`,
      'INVALID_LONGITUDE'
    );
  }
}

/**
 * Reverse Geocoding 결과를 주소 문자열로 포맷팅
 *
 * 도로명 주소 우선, 없으면 지번 주소 사용
 */
function formatAddress(result: NaverReverseGeocodeResult): string {
  const { area1, area2, area3 } = result.region;
  const land = result.land;

  // 도로명 주소 (addition0.value)
  const roadName = land.addition0?.value;

  // 건물 번호 (addition1.value) 또는 지번 (number1-number2)
  const buildingNumber = land.addition1?.value;
  const jibunNumber = land.number2
    ? `${land.number1}-${land.number2}`
    : land.number1;

  // 도로명 주소 조합
  if (roadName) {
    const number = buildingNumber || jibunNumber;
    return `${area1.name} ${area2.name} ${roadName} ${number}`.trim();
  }

  // 지번 주소 조합
  const dongName = area3.name || '';
  const landName = land.name || '';
  return `${area1.name} ${area2.name} ${dongName} ${landName} ${jibunNumber}`.trim();
}

/**
 * Reverse Geocoding 결과를 AddressInfo로 변환
 */
function convertResultToAddressInfo(result: NaverReverseGeocodeResult): AddressInfo {
  const { area1, area2, area3 } = result.region;
  const land = result.land;

  // 도로명 주소
  const roadName = land.addition0?.value;
  const buildingNumber = land.addition1?.value;
  const jibunNumber = land.number2
    ? `${land.number1}-${land.number2}`
    : land.number1;

  const roadAddress = roadName
    ? `${area1.name} ${area2.name} ${roadName} ${buildingNumber || jibunNumber}`.trim()
    : undefined;

  // 지번 주소
  const dongName = area3.name || '';
  const landName = land.name || '';
  const jibunAddress = `${area1.name} ${area2.name} ${dongName} ${landName} ${jibunNumber}`.trim();

  return {
    fullAddress: roadAddress || jibunAddress,
    roadAddress,
    jibunAddress,
    sido: area1.name,
    sigungu: area2.name,
    dong: area3.name,
  };
}

/**
 * Naver Geocoding API 호출 (Forward Geocoding)
 *
 * 주소를 좌표로 변환합니다.
 *
 * @param address - 주소 문자열 (예: "서울특별시 중구 세종대로 110")
 * @returns 좌표 (WGS84)
 * @throws GeocodingApiError
 *
 * @example
 * ```ts
 * const coords = await geocodeAddress("서울특별시 중구 세종대로 110");
 * console.log(coords); // { lat: 37.5663, lng: 126.9779 }
 * ```
 */
export async function geocodeAddress(address: string): Promise<Coordinates> {
  try {
    if (!address || address.trim().length === 0) {
      throw new GeocodingApiError('주소를 입력해주세요.', 'EMPTY_ADDRESS');
    }

    const response = await naverMapsClient.get<{
      status: string;
      meta: { totalCount: number };
      addresses: Array<{
        roadAddress: string;
        jibunAddress: string;
        x: string; // longitude
        y: string; // latitude
      }>;
    }>('/map-geocode/v2/geocode', {
      params: {
        query: address.trim(),
      },
    });

    if (!response.data.addresses || response.data.addresses.length === 0) {
      throw new GeocodingApiError(
        `주소를 찾을 수 없습니다: ${address}`,
        'NO_ADDRESS_FOUND'
      );
    }

    const result = response.data.addresses[0];
    const lat = parseFloat(result.y);
    const lng = parseFloat(result.x);

    if (isNaN(lat) || isNaN(lng)) {
      throw new GeocodingApiError(
        '좌표 변환에 실패했습니다.',
        'INVALID_COORDINATES'
      );
    }

    return { lat, lng };
  } catch (error: any) {
    if (error instanceof GeocodingApiError) {
      throw error;
    }

    if (error.isAxiosError) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status;

      if (status) {
        throw new GeocodingApiError(
          getErrorMessageByStatus(status),
          'HTTP_ERROR',
          { status, data: axiosError.response?.data }
        );
      }

      throw new GeocodingApiError(
        '네트워크 오류가 발생했습니다.',
        'NETWORK_ERROR',
        { message: error.message }
      );
    }

    throw new GeocodingApiError(
      `주소 변환 중 오류 발생: ${extractErrorMessage(error)}`,
      'UNKNOWN_ERROR',
      error
    );
  }
}

/**
 * 주소 간단히 표시 (시/군/구까지만)
 *
 * @example
 * "서울특별시 중구 세종대로 110" → "서울특별시 중구"
 */
export function getShortAddress(fullAddress: string): string {
  const parts = fullAddress.split(' ');
  if (parts.length >= 2) {
    return `${parts[0]} ${parts[1]}`;
  }
  return fullAddress;
}

/**
 * 주소 요약 출력 (디버깅용)
 */
export function printAddressInfo(addressInfo: AddressInfo): void {
  console.log('=== Address Info ===');
  console.log(`Full: ${addressInfo.fullAddress}`);
  console.log(`Road: ${addressInfo.roadAddress || 'N/A'}`);
  console.log(`Jibun: ${addressInfo.jibunAddress || 'N/A'}`);
  console.log(`Region: ${addressInfo.sido} > ${addressInfo.sigungu} > ${addressInfo.dong}`);
}
