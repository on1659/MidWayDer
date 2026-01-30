import { describe, it, expect } from 'vitest';
import { samplePolyline, getOptimalSampleInterval } from '@/lib/detour/polyline-sampler';
import type { RoutePoint } from '@/types/location';

describe('samplePolyline', () => {
  it('빈 배열은 빈 배열 반환', () => {
    expect(samplePolyline([], 500)).toEqual([]);
  });

  it('단일 포인트는 그대로 반환', () => {
    const p: RoutePoint = { lat: 37.5, lng: 127.0 };
    expect(samplePolyline([p], 500)).toEqual([p]);
  });

  it('간격보다 짧은 경로는 시작+끝만 반환', () => {
    // 약 100m 떨어진 두 점
    const path: RoutePoint[] = [
      { lat: 37.5000, lng: 127.0000 },
      { lat: 37.5009, lng: 127.0000 }, // ~100m
    ];
    const result = samplePolyline(path, 500);
    expect(result.length).toBe(2); // 시작 + 끝
  });

  it('1km 경로를 200m 간격으로 샘플링 → 약 5-6개', () => {
    // 약 1km 직선 경로 (위도 0.009 ≈ 1km)
    const path: RoutePoint[] = [];
    for (let i = 0; i <= 100; i++) {
      path.push({ lat: 37.5 + (i * 0.009) / 100, lng: 127.0 });
    }
    const result = samplePolyline(path, 200);
    expect(result.length).toBeGreaterThanOrEqual(5);
    expect(result.length).toBeLessThanOrEqual(8);
  });

  it('첫 포인트와 마지막 포인트가 항상 포함', () => {
    const path: RoutePoint[] = [
      { lat: 37.5, lng: 127.0 },
      { lat: 37.505, lng: 127.0 },
      { lat: 37.51, lng: 127.0 },
    ];
    const result = samplePolyline(path, 200);
    expect(result[0]).toEqual(path[0]);
    expect(result[result.length - 1]).toEqual(path[path.length - 1]);
  });
});

describe('getOptimalSampleInterval', () => {
  it('5km → 500m', () => expect(getOptimalSampleInterval(5000)).toBe(500));
  it('10km → 500m', () => expect(getOptimalSampleInterval(10000)).toBe(500));
  it('30km → 1000m', () => expect(getOptimalSampleInterval(30000)).toBe(1000));
  it('80km → 2000m', () => expect(getOptimalSampleInterval(80000)).toBe(2000));
});
