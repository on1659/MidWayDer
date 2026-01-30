/**
 * Kakao Mobility Directions API 래퍼
 *
 * A→B 경로 조회 (실제 도로 기반)
 */

import { kakaoNaviClient, extractKakaoErrorMessage } from './client';
import { KakaoDirectionsResponse } from './types';
import { Route, Coordinates, RoutePoint } from '@/types/location';
import { IDirectionsProvider, RouteOption } from '../types';
import { AxiosError } from 'axios';

// ========================
// 에러 클래스
// ========================

export class KakaoDirectionsApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'KakaoDirectionsApiError';
  }
}

// ========================
// Kakao Directions Provider
// ========================

export class KakaoDirectionsProvider implements IDirectionsProvider {
  /**
   * Kakao Mobility Directions API 호출
   *
   * @param start - 출발지 좌표
   * @param end - 도착지 좌표
   * @param option - 경로 옵션 (기본: optimal)
   * @returns Route 객체
   */
  async getRoute(
    start: Coordinates,
    end: Coordinates,
    option: RouteOption = 'optimal'
  ): Promise<Route> {
    try {
      validateCoordinates(start, 'start');
      validateCoordinates(end, 'end');

      // Kakao API 호출: origin/destination은 lng,lat 형식
      const response = await kakaoNaviClient.get<KakaoDirectionsResponse>(
        '/v1/directions',
        {
          params: {
            origin: `${start.lng},${start.lat}`,
            destination: `${end.lng},${end.lat}`,
            priority: mapOptionToKakaoPriority(option),
          },
        }
      );

      // 응답 검증
      const routeData = response.data.routes?.[0];
      if (!routeData || routeData.result_code !== 0) {
        throw new KakaoDirectionsApiError(
          routeData?.result_msg || '경로를 찾을 수 없습니다.',
          'NO_ROUTE_FOUND'
        );
      }

      // Kakao 응답을 Route 타입으로 변환
      return convertKakaoRouteToRoute(routeData, start, end);
    } catch (error: any) {
      if (error instanceof KakaoDirectionsApiError) throw error;

      if (error.isAxiosError) {
        const axiosError = error as AxiosError;
        const status = axiosError.response?.status;

        if (status) {
          throw new KakaoDirectionsApiError(
            `Kakao Directions API 요청 실패 (HTTP ${status})`,
            'HTTP_ERROR',
            { status, data: axiosError.response?.data }
          );
        }

        throw new KakaoDirectionsApiError(
          '네트워크 오류가 발생했습니다.',
          'NETWORK_ERROR',
          { message: error.message }
        );
      }

      throw new KakaoDirectionsApiError(
        `경로 조회 중 오류 발생: ${extractKakaoErrorMessage(error)}`,
        'UNKNOWN_ERROR',
        error
      );
    }
  }
}

// ========================
// 유틸리티 함수
// ========================

/** RouteOption → Kakao priority 매핑 */
function mapOptionToKakaoPriority(option: RouteOption): string {
  switch (option) {
    case 'fast':
      return 'FAST';
    case 'comfort':
      return 'COMFORT';
    case 'optimal':
    default:
      return 'RECOMMEND';
  }
}

/** 좌표 유효성 검증 */
function validateCoordinates(coords: Coordinates, name: string): void {
  if (!coords || typeof coords.lat !== 'number' || typeof coords.lng !== 'number') {
    throw new KakaoDirectionsApiError(`${name} 좌표가 유효하지 않습니다.`, 'INVALID_COORDINATES');
  }
  if (coords.lat < -90 || coords.lat > 90) {
    throw new KakaoDirectionsApiError(
      `${name} 위도는 -90 ~ 90 범위여야 합니다. (현재: ${coords.lat})`,
      'INVALID_LATITUDE'
    );
  }
  if (coords.lng < -180 || coords.lng > 180) {
    throw new KakaoDirectionsApiError(
      `${name} 경도는 -180 ~ 180 범위여야 합니다. (현재: ${coords.lng})`,
      'INVALID_LONGITUDE'
    );
  }
}

/**
 * Kakao Route를 우리 Route 타입으로 변환
 *
 * vertexes는 flat array [lng1, lat1, lng2, lat2, ...]
 * duration은 초 단위 (변환 불필요)
 */
function convertKakaoRouteToRoute(
  kakaoRoute: KakaoDirectionsResponse['routes'][0],
  start: Coordinates,
  end: Coordinates
): Route {
  // 모든 sections의 roads에서 vertexes를 추출하여 path 생성
  const path: RoutePoint[] = [];

  for (const section of kakaoRoute.sections) {
    for (const road of section.roads) {
      // vertexes: [lng1, lat1, lng2, lat2, ...]
      for (let i = 0; i < road.vertexes.length; i += 2) {
        const lng = road.vertexes[i];
        const lat = road.vertexes[i + 1];
        path.push({ lat, lng });
      }
    }
  }

  // 첫 번째 포인트 거리/시간 0 설정
  if (path.length > 0) {
    path[0].distance = 0;
    path[0].duration = 0;
  }

  return {
    start,
    end,
    distance: kakaoRoute.summary.distance, // 미터
    duration: kakaoRoute.summary.duration,  // 초 (Kakao는 이미 초 단위)
    path,
  };
}
