/**
 * Route Validation - 경로 검증 유틸리티
 */

import type { Location } from '@/types/location';

export interface ValidationResult {
  valid: boolean;
  error?: string;
  message?: string;
}

/**
 * 두 좌표 간의 하버사인 거리 계산 (km)
 */
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // 지구 반지름 (km)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * 경로 유효성 검사
 */
export function validateRoute(start: Location, end: Location): ValidationResult {
  // 좌표가 완전히 동일한 경우
  if (start.lat === end.lat && start.lng === end.lng) {
    return {
      valid: false,
      error: 'SAME_LOCATION',
      message: '출발지와 도착지가 같습니다',
    };
  }

  // 좌표가 유효한지 확인
  if (
    !isFinite(start.lat) ||
    !isFinite(start.lng) ||
    !isFinite(end.lat) ||
    !isFinite(end.lng)
  ) {
    return {
      valid: false,
      error: 'INVALID_COORDINATES',
      message: '유효하지 않은 좌표입니다',
    };
  }

  // 좌표 범위 확인
  if (
    Math.abs(start.lat) > 90 ||
    Math.abs(end.lat) > 90 ||
    Math.abs(start.lng) > 180 ||
    Math.abs(end.lng) > 180
  ) {
    return {
      valid: false,
      error: 'COORDINATES_OUT_OF_RANGE',
      message: '좌표가 허용 범위를 벗어났습니다',
    };
  }

  // 거리 계산
  const distance = haversineDistance(start.lat, start.lng, end.lat, end.lng);

  // 매우 가까운 경우 (50m 이내)
  if (distance < 0.05) {
    return {
      valid: false,
      error: 'TOO_CLOSE',
      message: '출발지와 도착지가 너무 가깝습니다 (50m 이내)',
    };
  }

  // 너무 먼 거리 (500km 이상)
  if (distance > 500) {
    return {
      valid: false,
      error: 'TOO_FAR',
      message: '경로가 너무 멉니다 (500km 초과)',
    };
  }

  return { valid: true };
}

/**
 * 거리 포맷팅
 */
export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }
  return `${km.toFixed(1)}km`;
}
