// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGPSProximity } from '../useGPSProximity';
import type { DetourResult } from '@/types/detour';

const mockGeolocation = {
  getCurrentPosition: vi.fn(),
  watchPosition: vi.fn(),
  clearWatch: vi.fn(),
};

beforeAll(() => {
  Object.defineProperty(navigator, 'geolocation', {
    value: mockGeolocation,
    writable: true,
    configurable: true,
  });
});

const makeResult = (id: string, lat: number, lng: number): DetourResult =>
  ({
    place: { id, name: id, category: 'test', address: '', coordinates: { lat, lng } },
    detourCost: { distance: 0, duration: 0, costScore: 0 },
    routes: { original: {} as any, toWaypoint: {} as any, fromWaypoint: {} as any },
    proximityScore: 50,
    finalScore: 50,
  } as DetourResult);

describe('useGPSProximity', () => {
  it('results가 빈 배열이면 closestPlaceId=null (GPS 요청 안 함)', () => {
    const { result } = renderHook(() => useGPSProximity([]));
    expect(result.current.closestPlaceId).toBeNull();
    expect(result.current.currentLocation).toBeNull();
  });

  it('currentLocation이 null이면 closestPlaceId=null', () => {
    mockGeolocation.getCurrentPosition.mockImplementation((_success: any, error: any) => {
      error(new Error('denied'));
    });

    const results = [makeResult('p1', 37.5, 126.9)];
    const { result } = renderHook(() => useGPSProximity(results));
    expect(result.current.closestPlaceId).toBeNull();
  });

  it('가장 가까운 장소의 id를 반환', () => {
    mockGeolocation.getCurrentPosition.mockImplementation((success: any) => {
      success({ coords: { latitude: 37.5, longitude: 126.9 } });
    });

    const results = [
      makeResult('near', 37.5001, 126.9001), // ~14m
      makeResult('far', 37.6, 127.0),         // ~15km
    ];
    const { result } = renderHook(() => useGPSProximity(results));
    expect(result.current.closestPlaceId).toBe('near');
  });
});
