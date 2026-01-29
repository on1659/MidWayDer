/**
 * Naver Directions 5 API 래퍼
 *
 * A→B 경로 조회 (실제 도로 기반)
 */

import { naverMapsClient, extractErrorMessage, getErrorMessageByStatus } from './client';
import { NaverDirectionsResponse } from './types';
import { Route, Coordinates, RoutePoint } from '@/types/location';
import { AxiosError } from 'axios';

// ========================
// 타입 정의
// ========================

/** 경로 옵션 */
export type RouteOption = 'traoptimal' | 'trafast' | 'tracomfort';

/** Directions API 에러 */
export class DirectionsApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'DirectionsApiError';
  }
}

// ========================
// API 함수
// ========================

/**
 * Naver Directions 5 API 호출
 *
 * A→B 경로를 조회하고, 우리 앱의 Route 타입으로 변환합니다.
 *
 * @param start - 출발지 좌표 (WGS84)
 * @param end - 도착지 좌표 (WGS84)
 * @param option - 경로 옵션 (기본: traoptimal)
 * @returns Route 객체
 * @throws DirectionsApiError
 *
 * @example
 * ```ts
 * const route = await getRoute(
 *   { lat: 37.5663, lng: 126.9779 }, // 서울시청
 *   { lat: 37.4979, lng: 127.0276 }  // 강남역
 * );
 * console.log(`${route.distance}m, ${route.duration}s`);
 * ```
 */
export async function getRoute(
  start: Coordinates,
  end: Coordinates,
  option: RouteOption = 'traoptimal'
): Promise<Route> {
  try {
    // 좌표 검증
    validateCoordinates(start, 'start');
    validateCoordinates(end, 'end');

    // API 호출
    const response = await naverMapsClient.get<NaverDirectionsResponse>(
      '/map-direction/v1/driving',
      {
        params: {
          start: `${start.lng},${start.lat}`, // Naver API는 경도,위도 순서
          goal: `${end.lng},${end.lat}`,
          option,
        },
      }
    );

    // 응답 검증
    if (response.data.code !== 0) {
      throw new DirectionsApiError(
        response.data.message || 'Directions API 호출 실패',
        'API_ERROR',
        response.data
      );
    }

    // 경로 데이터 추출
    const routeData = response.data.route[option]?.[0];
    if (!routeData) {
      throw new DirectionsApiError(
        '경로를 찾을 수 없습니다. 출발지와 도착지를 확인해주세요.',
        'NO_ROUTE_FOUND'
      );
    }

    // Naver 응답을 우리 Route 타입으로 변환
    const route = convertNaverRouteToRoute(routeData, start, end);

    return route;
  } catch (error: any) {
    // 이미 DirectionsApiError인 경우 그대로 전달
    if (error instanceof DirectionsApiError) {
      throw error;
    }

    // Axios 에러 처리
    if (error.isAxiosError) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status;

      if (status) {
        throw new DirectionsApiError(
          getErrorMessageByStatus(status),
          'HTTP_ERROR',
          { status, data: axiosError.response?.data }
        );
      }

      // 네트워크 에러 (응답 없음)
      throw new DirectionsApiError(
        '네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.',
        'NETWORK_ERROR',
        { message: error.message }
      );
    }

    // 기타 에러
    throw new DirectionsApiError(
      `경로 조회 중 오류 발생: ${extractErrorMessage(error)}`,
      'UNKNOWN_ERROR',
      error
    );
  }
}

/**
 * 여러 경로 옵션으로 동시에 조회
 *
 * 최적/빠른/편한 경로를 한번에 조회합니다.
 *
 * @param start - 출발지 좌표
 * @param end - 도착지 좌표
 * @param options - 조회할 경로 옵션 배열 (기본: 전체)
 * @returns 경로 옵션별 Route 객체
 */
export async function getMultipleRoutes(
  start: Coordinates,
  end: Coordinates,
  options: RouteOption[] = ['traoptimal', 'trafast', 'tracomfort']
): Promise<Record<RouteOption, Route>> {
  const results = await Promise.allSettled(
    options.map((option) => getRoute(start, end, option))
  );

  const routes: Partial<Record<RouteOption, Route>> = {};

  results.forEach((result, index) => {
    const option = options[index];
    if (result.status === 'fulfilled') {
      routes[option] = result.value;
    } else {
      console.error(`[Directions] Failed to get ${option} route:`, result.reason);
    }
  });

  return routes as Record<RouteOption, Route>;
}

// ========================
// 유틸리티 함수
// ========================

/**
 * 좌표 유효성 검증
 */
function validateCoordinates(coords: Coordinates, name: string): void {
  if (!coords || typeof coords.lat !== 'number' || typeof coords.lng !== 'number') {
    throw new DirectionsApiError(
      `${name} 좌표가 유효하지 않습니다.`,
      'INVALID_COORDINATES'
    );
  }

  if (coords.lat < -90 || coords.lat > 90) {
    throw new DirectionsApiError(
      `${name} 위도는 -90 ~ 90 범위여야 합니다. (현재: ${coords.lat})`,
      'INVALID_LATITUDE'
    );
  }

  if (coords.lng < -180 || coords.lng > 180) {
    throw new DirectionsApiError(
      `${name} 경도는 -180 ~ 180 범위여야 합니다. (현재: ${coords.lng})`,
      'INVALID_LONGITUDE'
    );
  }
}

/**
 * Naver Route를 우리 Route 타입으로 변환
 */
function convertNaverRouteToRoute(
  naverRoute: any,
  start: Coordinates,
  end: Coordinates
): Route {
  // Path 변환: [lng, lat] → RoutePoint
  const path: RoutePoint[] = naverRoute.path.map(([lng, lat]: [number, number]) => ({
    lat,
    lng,
    // distance와 duration은 후처리 필요 (현재는 undefined)
    distance: undefined,
    duration: undefined,
  }));

  // 첫 번째 포인트는 시작점으로 거리/시간 0 설정
  if (path.length > 0) {
    path[0].distance = 0;
    path[0].duration = 0;
  }

  return {
    start,
    end,
    distance: naverRoute.summary.distance, // 미터
    duration: Math.round(naverRoute.summary.duration / 1000), // 밀리초 → 초
    path,
  };
}

/**
 * 경로 거리 계산 (미터)
 *
 * 두 좌표 간의 직선 거리를 Haversine 공식으로 계산합니다.
 * 실제 도로 거리가 아닌 대략적인 거리입니다.
 */
export function calculateDistance(from: Coordinates, to: Coordinates): number {
  const R = 6371000; // 지구 반지름 (미터)
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const deltaLat = ((to.lat - from.lat) * Math.PI) / 180;
  const deltaLng = ((to.lng - from.lng) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // 미터
}

/**
 * 경로 요약 정보 출력 (디버깅용)
 */
export function printRouteSummary(route: Route): void {
  console.log('=== Route Summary ===');
  console.log(`Start: (${route.start.lat}, ${route.start.lng})`);
  console.log(`End: (${route.end.lat}, ${route.end.lng})`);
  console.log(`Distance: ${(route.distance / 1000).toFixed(2)} km`);
  console.log(`Duration: ${Math.round(route.duration / 60)} min`);
  console.log(`Path points: ${route.path.length}`);
}
