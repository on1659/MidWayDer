import { describe, it, expect } from 'vitest';
import { calculateProximityScore, filterByProximity } from '@/lib/detour/proximity-scorer';
import type { Place, RoutePoint, Route } from '@/types/location';

const makeRoute = (path: RoutePoint[]): Route => ({
  start: path[0],
  end: path[path.length - 1],
  distance: 10000,
  duration: 600,
  path,
});

// 직선 경로: 37.50 ~ 37.59 (약 10km)
const samplePoints: RoutePoint[] = Array.from({ length: 10 }, (_, i) => ({
  lat: 37.50 + i * 0.01,
  lng: 127.0,
}));

const route = makeRoute(samplePoints);

const makePlace = (lat: number, lng: number, id = 'p1'): Place => ({
  id,
  name: 'Test',
  category: 'test',
  address: 'test',
  coordinates: { lat, lng },
});

describe('calculateProximityScore', () => {
  it('경로 바로 위 매장 → 높은 점수', () => {
    const place = makePlace(37.53, 127.0); // 경로 위
    const score = calculateProximityScore(place, samplePoints, route);
    expect(score).toBeGreaterThan(90);
  });

  it('경로에서 500m 떨어진 매장 → 중간 점수', () => {
    // lng 0.005 ≈ 441m at lat 37.5
    // distanceScore(800m max) ≈ 69.6, positionWeight(중반) 1.05 → ≈73.1
    const place = makePlace(37.53, 127.005);
    const score = calculateProximityScore(place, samplePoints, route);
    expect(score).toBeGreaterThan(40);
    expect(score).toBeLessThan(80);  // ← 73.1 기준 여유 범위
  });

  it('경로에서 1km 이상 → 0점', () => {
    const place = makePlace(37.53, 127.02); // ~1.8km
    const score = calculateProximityScore(place, samplePoints, route);
    expect(score).toBe(0);
  });

  it('경로 후반부(80%+) 매장 → 0점', () => {
    // 경로 끝부분 (index 9 = 100%)
    const place = makePlace(37.59, 127.0);
    const score = calculateProximityScore(place, samplePoints, route);
    expect(score).toBe(0);
  });

  it('경로 후반부 88% 매장 → 양수 점수 (0.95 미만이라 제외 안 됨)', () => {
    // samplePoints[8] = lat 37.58 (인덱스 8/9 ≈ 88.9%, 0.95 미만)
    const place = makePlace(37.58, 127.0); // 인덱스 8, routeProgress = 88.9%
    const score = calculateProximityScore(place, samplePoints, route);
    expect(score).toBeGreaterThan(0); // 제외되지 않음
  });

  it('경로 후반부 96%+ 매장 → 0점 (0.95 임계값)', () => {
    // samplePoints[9] = lat 37.59, routeProgress = 9/9 = 100% → 0점
    const place = makePlace(37.59, 127.0);
    const score = calculateProximityScore(place, samplePoints, route);
    expect(score).toBe(0);
  });
});

describe('edge cases — Division by Zero 방지', () => {
  it('sampledPoints가 빈 배열이면 0 반환', () => {
    const place = makePlace(37.53, 127.0);
    const score = calculateProximityScore(place, [], makeRoute(samplePoints));
    expect(score).toBe(0);
    expect(Number.isNaN(score)).toBe(false);
  });

  it('sampledPoints가 단일 포인트이면 NaN 없이 점수 반환', () => {
    const singlePoint: RoutePoint[] = [{ lat: 37.53, lng: 127.0 }];
    const place = makePlace(37.53, 127.0); // 정확히 같은 위치
    const score = calculateProximityScore(place, singlePoint, makeRoute(singlePoint));
    expect(Number.isNaN(score)).toBe(false);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('sampledPoints 1개, 멀리 있는 매장 → 0점', () => {
    const singlePoint: RoutePoint[] = [{ lat: 37.5, lng: 127.0 }];
    const place = makePlace(37.6, 127.1); // ~14km 이상
    const score = calculateProximityScore(place, singlePoint, makeRoute(singlePoint));
    expect(score).toBe(0);
  });
});

describe('filterByProximity', () => {
  it('점수 높은 순으로 상위 N개 반환', () => {
    const places = [
      makePlace(37.53, 127.0, 'near'),     // 경로 위
      makePlace(37.53, 127.005, 'mid'),     // 약간 떨어짐
      makePlace(37.53, 127.02, 'far'),      // 1km+
    ];
    const result = filterByProximity(places, samplePoints, route, 2);
    expect(result.length).toBe(2);
    expect(result[0].place.id).toBe('near');
    expect(result[0].proximityScore).toBeGreaterThan(result[1].proximityScore);
  });

  it('점수 0인 항목은 제외', () => {
    const places = [makePlace(37.53, 127.02, 'far')]; // 1km+ → 0점
    const result = filterByProximity(places, samplePoints, route);
    expect(result.length).toBe(0);
  });
});
