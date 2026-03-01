/**
 * Test Factories — 공통 목 데이터 생성 헬퍼
 */

import type { DetourResult } from '@/types/detour';
import type { Route, Place } from '@/types/location';

/** Route 목 생성 */
export function makeRoute(distance: number, duration: number): Route {
  return {
    start: { lat: 37.566, lng: 126.978 },
    end: { lat: 37.498, lng: 127.028 },
    distance,
    duration,
    path: [],
  };
}

/** Place 목 생성 */
export function makePlace(overrides?: Partial<Place>): Place {
  return {
    id: 'p1',
    name: '테스트 다이소',
    category: '다이소',
    address: '서울시 중구',
    coordinates: { lat: 37.566, lng: 126.978 },
    ...overrides,
  };
}

/** DetourResult 목 생성 */
export function makeDetourResult(overrides?: Partial<DetourResult>): DetourResult {
  return {
    place: makePlace(),
    detourCost: { distance: 500, duration: 120, costScore: 20 },
    routes: {
      original: makeRoute(12500, 1200),
      toWaypoint: makeRoute(6800, 650),
      fromWaypoint: makeRoute(6200, 650),
    },
    proximityScore: 80,
    finalScore: 85,
    ...overrides,
  };
}
