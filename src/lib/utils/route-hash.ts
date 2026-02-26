/**
 * Route Hash Utility
 * 경로별 집계를 위한 해시 생성
 */

import type { Coordinates } from '@/types/location';

/**
 * 출발/도착 좌표로 경로 해시 생성
 * 소수점 4자리까지만 사용 (~10m 정확도)
 */
export function hashRoute(start: Coordinates, end: Coordinates): string {
  return `${start.lat.toFixed(4)},${start.lng.toFixed(4)}_${end.lat.toFixed(4)},${end.lng.toFixed(4)}`;
}

/**
 * 경로 해시를 좌표로 역변환
 */
export function unhashRoute(hash: string): { start: Coordinates; end: Coordinates } | null {
  try {
    const [startStr, endStr] = hash.split('_');
    const [startLat, startLng] = startStr.split(',').map(Number);
    const [endLat, endLng] = endStr.split(',').map(Number);

    if ([startLat, startLng, endLat, endLng].some(isNaN)) {
      return null;
    }

    return {
      start: { lat: startLat, lng: startLng },
      end: { lat: endLat, lng: endLng },
    };
  } catch {
    return null;
  }
}
