/**
 * Route Store - 경로 상태 관리
 *
 * 출발지, 도착지, 원본 경로, 선택된 경유지 정보를 관리합니다.
 */

import { create } from 'zustand';
import type { Coordinates, Route } from '@/types/location';
import type { DetourResult } from '@/types/detour';

interface LocationWithAddress {
  address: string;
  coordinates?: Coordinates;
}

interface RouteState {
  /** 출발지 정보 */
  start: LocationWithAddress | null;
  /** 도착지 정보 */
  end: LocationWithAddress | null;
  /** A→B 원본 경로 */
  originalRoute: Route | null;
  /** 선택된 경유지 */
  selectedWaypoint: DetourResult | null;

  // Actions
  /** 출발지 설정 */
  setStart: (start: LocationWithAddress | null) => void;
  /** 도착지 설정 */
  setEnd: (end: LocationWithAddress | null) => void;
  /** 원본 경로 설정 */
  setOriginalRoute: (route: Route | null) => void;
  /** 경유지 선택 */
  selectWaypoint: (waypoint: DetourResult | null) => void;
  /** 모든 상태 초기화 */
  reset: () => void;
}

const initialState = {
  start: null,
  end: null,
  originalRoute: null,
  selectedWaypoint: null,
};

export const useRouteStore = create<RouteState>((set) => ({
  ...initialState,

  setStart: (start) => set({ start }),

  setEnd: (end) => set({ end }),

  setOriginalRoute: (route) => set({ originalRoute: route }),

  selectWaypoint: (waypoint) => set({ selectedWaypoint: waypoint }),

  reset: () => set(initialState),
}));
