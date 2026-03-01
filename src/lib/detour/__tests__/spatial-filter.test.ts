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

// KakaoSearchProvider mock (class 문법 사용 — arrow function은 constructor 불가)
vi.mock('@/lib/map-provider/kakao/search', () => ({
  KakaoSearchProvider: class {
    searchPlaces() {
      return Promise.resolve([]);
    }
  },
}));

import { filterPlacesByRoute, deduplicatePlaces } from '../spatial-filter';
import { prisma } from '@/lib/db/prisma';
import type { Place } from '@/types/location';

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
  beforeEach(() => vi.clearAllMocks());

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
