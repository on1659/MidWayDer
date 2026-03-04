/**
 * spatial-filter.test.ts
 * filterPlacesByRoute — Prisma + Kakao 의존성 mock 테스트
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DatabaseError } from '@/lib/errors';

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

  it('DB 오류 시 DatabaseError 예외 발생', async () => {
    (prisma.place.findMany as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Connection failed')
    );
    await expect(filterPlacesByRoute(mockRoute, '카페', 1000)).rejects.toThrow(DatabaseError);
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

describe('minDistanceToPolyline 적응형 stride', () => {
  it('500포인트 폴리라인에서 유한한 양수 거리 반환', () => {
    const point: Coordinates = { lat: 37.5050, lng: 126.9050 };
    const polyline: Coordinates[] = Array.from({ length: 500 }, (_, i) => ({
      lat: 37.5 + i * 0.0001,
      lng: 126.9 + i * 0.0001,
    }));
    const dist = minDistanceToPolyline(point, polyline);
    expect(Number.isFinite(dist)).toBe(true);
    expect(dist).toBeGreaterThanOrEqual(0);
  });

  it('빈 폴리라인은 Infinity 반환', () => {
    const point: Coordinates = { lat: 37.5, lng: 126.9 };
    expect(minDistanceToPolyline(point, [])).toBe(Infinity);
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

// ─── 경도 버퍼 정확도 ────────────────────────────────────────

describe('queryDbPlaces 경도 버퍼 정확도', () => {
  beforeEach(() => vi.clearAllMocks());

  it('서울(37.5°) 기준 1km 버퍼 — 경도 bufferDeg < 위도 bufferDeg', async () => {
    // 서울 위도 37.5°: cos(37.5°)≈0.793 → 경도 1° ≈ 88km
    // 1km 버퍼: latBuf = 1/111 ≈ 0.009°, lngBuf = 1/(111×0.793) ≈ 0.01136°
    // prisma.findMany where 절의 lat/lng 범위로 검증
    let capturedWhere: { lat?: { gte: number; lte: number }; lng?: { gte: number; lte: number } } | null = null;
    (prisma.place.findMany as ReturnType<typeof vi.fn>).mockImplementation(
      async ({ where }: { where: typeof capturedWhere }) => {
        capturedWhere = where;
        return [];
      }
    );

    const seoulRoute: Route = {
      distance: 1000, duration: 120,
      path: [{ lat: 37.5663, lng: 126.9779 }],
      start: { lat: 37.5663, lng: 126.9779 },
      end: { lat: 37.5663, lng: 126.9779 },
    };
    await filterPlacesByRoute(seoulRoute, '카페', 1000);

    const resolved = capturedWhere as { lat: { gte: number; lte: number }; lng: { gte: number; lte: number } } | null;
    if (!resolved?.lat || !resolved?.lng) throw new Error('where not captured');
    const latRange = resolved.lat.lte - resolved.lat.gte;
    const lngRange = resolved.lng.lte - resolved.lng.gte;
    // 경도 범위가 위도 범위보다 넓어야 함 (cos 보정으로 lngBuf > latBuf)
    expect(lngRange).toBeGreaterThan(latRange);
  });

  it('부산(35.1°) 기준 1km 버퍼 — 서울보다 경도 범위가 더 좁음 (cos(35.1°)>cos(37.5°) → lngBuf 더 작음)', async () => {
    let seoulLngRange = 0;
    let busanLngRange = 0;

    const capture = async (lat: number) => {
      let capturedWhere: { lng?: { gte: number; lte: number } } | null = null;
      (prisma.place.findMany as ReturnType<typeof vi.fn>).mockImplementation(
        async ({ where }: { where: typeof capturedWhere }) => {
          capturedWhere = where;
          return [];
        }
      );
      const route: Route = {
        distance: 1000, duration: 120,
        path: [{ lat, lng: 129.0 }],
        start: { lat, lng: 129.0 }, end: { lat, lng: 129.0 },
      };
      await filterPlacesByRoute(route, '카페', 1000);
      const resolved = capturedWhere as { lng?: { gte: number; lte: number } } | null;
      return resolved?.lng
        ? resolved.lng.lte - resolved.lng.gte
        : 0;
    };

    seoulLngRange = await capture(37.5); // cos(37.5°) ≈ 0.793
    busanLngRange = await capture(35.1); // cos(35.1°) ≈ 0.818 → lngBuf 작아짐

    // 위도가 낮을수록 cos가 커져서 lngBuf가 작아짐
    // 부산(35.1°)이 서울(37.5°)보다 cos 값이 크므로 lngRange 더 작음
    expect(busanLngRange).toBeLessThan(seoulLngRange);
  });
});

// ─── bufferDistance 입력 검증 ────────────────────────────────

describe('filterPlacesByRoute bufferDistance 입력 검증', () => {
  it('bufferDistance 0 → Error throw', async () => {
    await expect(filterPlacesByRoute(mockRoute, '카페', 0))
      .rejects.toThrow('Invalid bufferDistance');
  });

  it('bufferDistance 음수 → Error throw', async () => {
    await expect(filterPlacesByRoute(mockRoute, '카페', -500))
      .rejects.toThrow('Invalid bufferDistance');
  });

  it('bufferDistance Infinity → Error throw', async () => {
    await expect(filterPlacesByRoute(mockRoute, '카페', Infinity))
      .rejects.toThrow('Invalid bufferDistance');
  });
});

// ─── stride 적응형 정확도 ────────────────────────────────────

describe('minDistanceToPolyline 적응형 stride 정확도', () => {
  it('100 포인트 폴리라인 — 동일 입력 시 결과 일관성', () => {
    const point: Coordinates = { lat: 37.5050, lng: 126.9050 };
    const polyline: Coordinates[] = Array.from({ length: 100 }, (_, i) => ({
      lat: 37.50 + i * 0.0001,
      lng: 126.90 + i * 0.0001,
    }));
    const dist1 = minDistanceToPolyline(point, polyline);
    const dist2 = minDistanceToPolyline(point, polyline);
    expect(dist1).toBe(dist2); // 동일 입력 → 동일 결과 (순수함수)
    expect(Number.isFinite(dist1)).toBe(true);
  });
});

// ─── T-1: upsert 타임아웃 ────────────────────────────────────

describe('filterPlacesByRoute — upsert 타임아웃', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchPlaces.mockResolvedValue([]);
  });

  it('upsert가 3초 이상 걸리면 타임아웃 후 결과는 정상 반환', async () => {
    vi.useFakeTimers();
    // DB findMany: 결과 없음 → 카카오 API 호출 유도
    (prisma.place.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    // 카카오: 1개 반환 (경로 위 좌표)
    mockSearchPlaces.mockResolvedValue([makeTestPlace('kakao-k1', 37.5663, 126.9779)]);
    // upsert: 5초 후 완료 (타임아웃 초과)
    (prisma.place.upsert as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({} as never), 5000))
    );

    const resultPromise = filterPlacesByRoute(mockRoute, 'test', 1000);
    // 3초 타임아웃 트리거
    await vi.advanceTimersByTimeAsync(3001);
    const result = await resultPromise;

    // 결과는 정상 반환 (upsert 타임아웃 무시)
    expect(result.length).toBeGreaterThan(0);
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('DB upsert 실패'),
      expect.any(Error)
    );
    vi.useRealTimers();
  });
});

// ─── T-2, T-4: Circuit Breaker + consecutiveFails 리셋 ───────

describe('filterPlacesByRoute — circuit breaker & backoff', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchPlaces.mockResolvedValue([]);
    (prisma.place.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prisma.place.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({});
  });

  it('카카오 API 연속 3회 실패 시 circuit breaker로 루프 중단', async () => {
    // distance=20000 → sampleCount=4 → 4번째 iteration 시작 시 circuit breaker 발동
    const route4 = makeMockRouteForSpatial(20000);
    // 항상 실패 (circuit breaker가 4번째 iter 시작 시 발동)
    mockSearchPlaces.mockRejectedValue(new Error('Rate Limit 429'));

    const result = await filterPlacesByRoute(route4, 'test', 1000);

    // circuit breaker 발동 → 결과 없음 (빈 배열 반환, 크래시 없음)
    expect(result).toEqual([]);
    // error 로그에 circuit breaker 메시지 포함
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Circuit breaker')
    );
  });

  it('실패 후 성공 시 consecutiveFails 리셋으로 circuit breaker 미발동', async () => {
    // distance=20000 → sampleCount=4
    // 순서: fail, success(reset), fail, success → failCount=2, 2 <= 4/2=2 (과반 실패 미발동)
    // consecutiveFails 최대값 1 → circuit breaker(3) 미발동
    const route4 = makeMockRouteForSpatial(20000);
    mockSearchPlaces
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockResolvedValueOnce([makeTestPlace('kakao-k1', 37.5663, 126.9779)]) // 성공 → reset
      .mockRejectedValueOnce(new Error('fail after reset'))
      .mockResolvedValueOnce([makeTestPlace('kakao-k2', 37.5663, 126.9779)]) // 성공
      .mockResolvedValueOnce([]); // 도착지 endpoint 검색

    const result = await filterPlacesByRoute(route4, 'test', 1000);

    // circuit breaker 미발동 → 결과 있음
    expect(result.length).toBeGreaterThan(0);
    // circuit breaker error 로그 없음
    const circuitBreakerCalls = (logger.error as ReturnType<typeof vi.fn>).mock.calls.filter(
      (call: unknown[]) => typeof call[0] === 'string' && call[0].includes('Circuit breaker')
    );
    expect(circuitBreakerCalls.length).toBe(0);
  });
});

// ─── T-5: _stride 제거 후 호출 ───────────────────────────────

describe('minDistanceToPolyline — _stride 제거 후 2개 인수 호출', () => {
  it('minDistanceToPolyline는 2개 인수로 정상 동작', () => {
    const point: Coordinates = { lat: 37.5, lng: 127.0 };
    const polyline: Coordinates[] = [
      { lat: 37.5, lng: 126.99 },
      { lat: 37.5, lng: 127.01 },
    ];
    // 3번째 인수 없이 호출 — 타입 에러 없어야 함
    const dist = minDistanceToPolyline(point, polyline);
    expect(dist).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(dist)).toBe(true);
  });
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
