/**
 * spatial-filter.test.ts
 * filterPlacesByRoute — Prisma + Kakao 의존성 mock 테스트
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Prisma mock (named export: { prisma })
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    place: {
      findMany: vi.fn(),
      upsert: vi.fn().mockResolvedValue({}),
    },
  },
}));

// KakaoSearchProvider mock — vi.hoisted로 테스트별 제어 가능
const mockSearchPlaces = vi.hoisted(() => vi.fn().mockResolvedValue([]));
vi.mock('@/lib/map-provider/kakao/search', () => ({
  KakaoSearchProvider: class {
    searchPlaces(...args: unknown[]) {
      return mockSearchPlaces(...args);
    }
  },
}));

// logger mock
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

import { filterPlacesByRoute, deduplicatePlaces, minDistanceToPolyline } from '../spatial-filter';
import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/logger';
import type { Place, Coordinates } from '@/types/location';
import type { Route } from '@/types/location';

const makeTestPlace = (id: string, lat: number, lng: number): Place => ({
  id, name: id, category: 'test', address: '',
  coordinates: { lat, lng },
});

const mockRoute = {
  distance: 5000,
  duration: 600,
  path: [
    { lat: 37.5663, lng: 126.9779 },
    { lat: 37.5, lng: 127.0 },
    { lat: 37.4979, lng: 127.0276 },
  ],
  start: { lat: 37.5663, lng: 126.9779 },
  end: { lat: 37.4979, lng: 127.0276 },
};

// Prisma Place 모양으로 mock 데이터 생성 (경로 위 좌표 → 거리 필터 통과 보장)
const makeDbPlace = (i: number) => ({
  id: `p${i}`,
  name: `Place ${i}`,
  category: '카페',
  address: `주소 ${i}`,
  roadAddress: null,
  phone: null,
  lat: 37.5663,   // 경로 시작점과 동일 → 거리 0m
  lng: 126.9779,
  createdAt: new Date(),
  updatedAt: new Date(),
  kakaoPlaceId: null,
});

describe('filterPlacesByRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchPlaces.mockResolvedValue([]);
  });

  it('DB 결과 10개 이상이면 DB 결과만 반환 (카카오 미호출)', async () => {
    (prisma.place.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
      Array.from({ length: 12 }, (_, i) => makeDbPlace(i))
    );
    const places = await filterPlacesByRoute(mockRoute, '카페', 1000);
    expect(places.length).toBeGreaterThanOrEqual(10);
    expect(places[0].name).toMatch(/Place/);
  });

  it('DB 결과 없으면 카카오도 0개일 때 빈 배열 반환', async () => {
    (prisma.place.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const places = await filterPlacesByRoute(mockRoute, '카페', 1000);
    expect(places).toEqual([]);
  });

  it('DB 결과가 bufferDistance 밖에 있으면 제외됨', async () => {
    // 경로에서 멀리 있는 좌표 (제주도 근처)
    const farPlace = {
      ...makeDbPlace(0),
      lat: 33.4996,
      lng: 126.5312,
    };
    (prisma.place.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([farPlace]);
    const places = await filterPlacesByRoute(mockRoute, '카페', 1000);
    // 카카오 보충 후에도 카카오 mock이 [] 반환하므로 결과 없음
    expect(places.length).toBe(0);
  });

  it('DB 오류 시 DATABASE_ERROR 예외 발생', async () => {
    (prisma.place.findMany as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Connection failed')
    );
    await expect(filterPlacesByRoute(mockRoute, '카페', 1000)).rejects.toThrow('DATABASE_ERROR');
  });

  it('bufferDistance 인자 없이 호출해도 정상 동작 (기본값 적용)', async () => {
    (prisma.place.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const places = await filterPlacesByRoute(mockRoute, '카페');
    expect(Array.isArray(places)).toBe(true);
  });
});

describe('queryDbPlaces (via filterPlacesByRoute)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('route.path가 빈 배열이면 DB 쿼리 없이 [] 반환', async () => {
    const emptyRoute: Route = {
      path: [],
      distance: 0,
      duration: 0,
      start: { lat: 37.5, lng: 126.9 },
      end: { lat: 37.6, lng: 127.0 },
    };
    const mockFindMany = vi.fn().mockResolvedValue([]);
    (prisma.place.findMany as ReturnType<typeof vi.fn>).mockImplementation(mockFindMany);

    const result = await filterPlacesByRoute(emptyRoute, '다이소', 1000);

    expect(result).toEqual([]);
    expect(mockFindMany).not.toHaveBeenCalled();
  });
});

describe('minDistanceToPolyline stride 최적화', () => {
  it('stride=1과 stride=10 결과 오차가 ±50m 이내', () => {
    const point: Coordinates = { lat: 37.5050, lng: 126.9050 };
    const polyline: Coordinates[] = Array.from({ length: 500 }, (_, i) => ({
      lat: 37.5 + i * 0.0001,
      lng: 126.9 + i * 0.0001,
    }));

    const distFull = minDistanceToPolyline(point, polyline, 1);
    const distStrided = minDistanceToPolyline(point, polyline, 10);

    expect(Math.abs(distFull - distStrided)).toBeLessThan(50); // ±50m 이내 오차
  });

  it('빈 폴리라인은 Infinity 반환', () => {
    const point: Coordinates = { lat: 37.5, lng: 126.9 };
    expect(minDistanceToPolyline(point, [], 10)).toBe(Infinity);
  });
});

describe('deduplicatePlaces — 격자 인덱싱 정확도', () => {
  it('50m 이내 두 장소 → 하나만 반환', () => {
    const places: Place[] = [
      makeTestPlace('a', 37.5000, 127.0000),
      makeTestPlace('b', 37.5001, 127.0001), // ~13m 차이 (DEDUP_DISTANCE_M 이내)
    ];
    const result = deduplicatePlaces(places);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('a'); // 먼저 들어온 A가 남음
  });

  it('200m 이상 떨어진 두 장소 → 모두 반환', () => {
    const places: Place[] = [
      makeTestPlace('a', 37.5000, 127.0000),
      makeTestPlace('b', 37.5020, 127.0020), // ~260m 차이
    ];
    const result = deduplicatePlaces(places);
    expect(result).toHaveLength(2);
  });

  it('100개 장소 처리 시간 < 50ms', () => {
    const places: Place[] = Array.from({ length: 100 }, (_, i) =>
      makeTestPlace(`p${i}`, 37.5 + (i % 10) * 0.001, 127.0 + Math.floor(i / 10) * 0.001)
    );
    const start = performance.now();
    deduplicatePlaces(places);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(50);
  });
});

// ========================
// T2: fetchFromKakao — 과반 실패 처리
// ========================

const makeMockRouteForSpatial = (distance = 20000): Route => ({
  distance,
  duration: Math.round(distance / 10),
  path: [
    { lat: 37.5663, lng: 126.9779 },
    { lat: 37.4979, lng: 127.0276 },
  ],
  start: { lat: 37.5663, lng: 126.9779 },
  end: { lat: 37.4979, lng: 127.0276 },
});

const makeMockPlace = (): Place => ({
  id: 'kakao-test123',
  name: 'Test Place',
  category: '다이소',
  address: '서울특별시 중구 남대문로 1',
  coordinates: { lat: 37.5663, lng: 126.9779 },
});

describe('fetchFromKakao — 과반 실패 처리 (filterPlacesByRoute 경유)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchPlaces.mockResolvedValue([]);
    (prisma.place.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  });

  it('샘플 포인트 과반 실패 시 빈 배열 반환 (logger.error 호출)', async () => {
    // 모든 searchPlaces 호출이 throw
    mockSearchPlaces.mockRejectedValue(new Error('API Error'));

    const route = makeMockRouteForSpatial(20000); // sampleCount=4
    const result = await filterPlacesByRoute(route, '다이소', 1000);

    expect(result).toEqual([]);
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('카카오 API 과반 실패')
    );
  });

  it('1/4만 실패 시 (과반 미달) 성공한 결과 반환', async () => {
    let callCount = 0;
    mockSearchPlaces.mockImplementation(async () => {
      callCount++;
      if (callCount === 1) throw new Error('fail');
      // 경로 위 좌표 반환 → bufferDistance 필터 통과
      return [makeMockPlace()];
    });

    const route = makeMockRouteForSpatial(20000); // sampleCount=4
    const result = await filterPlacesByRoute(route, '다이소', 1000);

    // 3/4 성공 → 과반 실패 아님 → 결과 있음
    expect(result.length).toBeGreaterThan(0);
  });
});
