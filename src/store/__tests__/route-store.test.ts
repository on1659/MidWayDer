import { describe, it, expect, beforeEach } from 'vitest';
import { useRouteStore } from '../route-store';

describe('useRouteStore', () => {
  beforeEach(() => {
    useRouteStore.getState().reset();
  });

  it('초기 상태: start/end/originalRoute/selectedWaypoint 모두 null', () => {
    const state = useRouteStore.getState();
    expect(state.start).toBeNull();
    expect(state.end).toBeNull();
    expect(state.originalRoute).toBeNull();
    expect(state.selectedWaypoint).toBeNull();
  });

  it('setStart — 출발지 설정', () => {
    useRouteStore.getState().setStart({ address: '서울시청', coordinates: { lat: 37.566, lng: 126.978 } });
    expect(useRouteStore.getState().start?.address).toBe('서울시청');
  });

  it('setEnd — 도착지 설정', () => {
    useRouteStore.getState().setEnd({ address: '강남역', coordinates: { lat: 37.498, lng: 127.028 } });
    expect(useRouteStore.getState().end?.address).toBe('강남역');
  });

  it('selectWaypoint — 경유지 선택', () => {
    const waypoint = {
      place: { id: 'p1', name: '다이소', category: '다이소', address: '서울', coordinates: { lat: 37.5, lng: 127.0 } },
      detourCost: { distance: 500, duration: 120, costScore: 20 },
      routes: {
        original: { start: { lat: 37.566, lng: 126.978 }, end: { lat: 37.498, lng: 127.028 }, distance: 12500, duration: 1200, path: [] },
        toWaypoint: { start: { lat: 37.566, lng: 126.978 }, end: { lat: 37.5, lng: 127.0 }, distance: 6500, duration: 600, path: [] },
        fromWaypoint: { start: { lat: 37.5, lng: 127.0 }, end: { lat: 37.498, lng: 127.028 }, distance: 6200, duration: 620, path: [] },
      },
      proximityScore: 80,
      finalScore: 85,
    };
    useRouteStore.getState().selectWaypoint(waypoint);
    expect(useRouteStore.getState().selectedWaypoint?.place.name).toBe('다이소');
  });

  it('reset — 모든 상태 초기화', () => {
    useRouteStore.getState().setStart({ address: '서울시청' });
    useRouteStore.getState().reset();
    expect(useRouteStore.getState().start).toBeNull();
  });
});
