/**
 * POST /api/search — 단위 테스트 (7개 시나리오)
 *
 * 의존성 전략:
 * - 외부 API: getDirectionsProvider / getGeocodingProvider mock
 * - DB: prisma mock
 * - 캐시: loadSearchCache / saveSearchCache mock
 * - 개인화: calculatePersonalizationScores mock
 * - 해시: hashRoute mock (DATABASE_ERROR 시나리오 트리거용)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { DatabaseError } from '@/lib/errors';

// ─── Mocks (vi.mock 호이스팅 → 파일 최상단에 위치해야 함) ────────────────────

vi.mock('@/lib/map-provider', () => ({
  getDirectionsProvider: vi.fn(),
  getGeocodingProvider: vi.fn(),
}));

vi.mock('@/lib/detour/calculator', () => ({
  calculateDetourCosts: vi.fn(),
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    searchLog: {
      create: vi.fn().mockResolvedValue({ id: 'log-1' }),
    },
    clickLog: {
      groupBy: vi.fn().mockResolvedValue([]),
    },
  },
}));

vi.mock('@/lib/cache/search-cache', () => ({
  loadSearchCache: vi.fn().mockReturnValue(null),
  saveSearchCache: vi.fn(),
}));

vi.mock('@/lib/personalization/scorer', () => ({
  calculatePersonalizationScores: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/utils/route-hash', () => ({
  hashRoute: vi.fn().mockReturnValue('test-route-hash'),
}));

vi.mock('@/lib/monitoring', () => ({
  captureException: vi.fn(),
}));

// ─── 실제 모듈 import (mock 이후에 위치) ─────────────────────────────────────

import { POST, shouldDropShortestRoute } from '../route';
import { loadSearchCache } from '@/lib/cache/search-cache';
import { getDirectionsProvider } from '@/lib/map-provider';
import { calculateDetourCosts } from '@/lib/detour/calculator';
import { calculatePersonalizationScores } from '@/lib/personalization/scorer';
import { hashRoute } from '@/lib/utils/route-hash';
import type { DetourResult } from '@/types/detour';
import type { Route } from '@/types/location';

// ─── 테스트 픽스처 ─────────────────────────────────────────────────────────────

const VALID_COORDS_BODY = {
  start: { coordinates: { lat: 37.5663, lng: 126.9779 } },
  end: { coordinates: { lat: 37.4979, lng: 127.0276 } },
  category: '스타벅스',
};

const MOCK_ROUTE = {
  distance: 10500,
  duration: 1200,
  path: [
    { lat: 37.5663, lng: 126.9779 },
    { lat: 37.4979, lng: 127.0276 },
  ],
  start: { lat: 37.5663, lng: 126.9779 },
  end: { lat: 37.4979, lng: 127.0276 },
};

const MOCK_DETOUR_RESULT = {
  place: {
    id: 'place-1',
    name: '스타벅스 강남역점',
    category: '스타벅스',
    address: '서울 강남구 강남대로 396',
    coordinates: { lat: 37.498, lng: 127.028 },
  },
  detourCost: { distance: 300, duration: 120, costScore: 20 },
  routes: {
    original: MOCK_ROUTE,
    toWaypoint: MOCK_ROUTE,
    fromWaypoint: MOCK_ROUTE,
  },
  proximityScore: 85,
  finalScore: 81,
};

/** NextRequest 헬퍼 */
function makeRequest(body: object): NextRequest {
  return new NextRequest('http://localhost/api/search', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

// ─── 테스트 스위트 ─────────────────────────────────────────────────────────────

describe('POST /api/search', () => {
  let mockDirectionsProvider: { getRoute: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();

    // 기본 directions mock: 두 경로 모두 성공
    mockDirectionsProvider = {
      getRoute: vi.fn().mockResolvedValue(MOCK_ROUTE),
    };
    vi.mocked(getDirectionsProvider).mockReturnValue(mockDirectionsProvider as unknown as ReturnType<typeof getDirectionsProvider>);

    // 기본 detour mock: 1개 결과 반환
    vi.mocked(calculateDetourCosts).mockResolvedValue({
      results: [MOCK_DETOUR_RESULT as unknown as DetourResult],
      totalCandidates: 5,
      apiCallsUsed: 2,
    });

    // 기본 캐시: 미스
    vi.mocked(loadSearchCache).mockReturnValue(null);

    // 기본 개인화: 빈 배열 (부스트 없음)
    vi.mocked(calculatePersonalizationScores).mockResolvedValue([]);

    // 기본 hashRoute: 정상 동작
    vi.mocked(hashRoute).mockReturnValue('test-route-hash');
  });

  // ── TC-1: 유효한 검색 요청 ────────────────────────────────────────────────────
  it('TC-1: 유효한 요청 → 200 + results 반환', async () => {
    const req = makeRequest(VALID_COORDS_BODY);
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.fromCache).toBe(false);
    expect(json.data.results).toHaveLength(1);
    expect(json.data.results[0].place.id).toBe('place-1');
    // shortest + fastest 두 경로 각 5개 → 합산 10 (중복 제거 후 place-1 하나만 결과)
    expect(json.data.totalCandidates).toBe(10);
  });

  // ── TC-2: Zod 검증 실패 ───────────────────────────────────────────────────────
  it('TC-2: 잘못된 입력 (빈 category, 좌표 없음) → 400 VALIDATION_ERROR', async () => {
    const req = makeRequest({
      start: {}, // 주소도 좌표도 없음
      end: { coordinates: { lat: 37.4979, lng: 127.0276 } },
      category: '', // 빈 문자열
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('VALIDATION_ERROR');
  });

  // ── TC-3: 경로 없음 (directions API 모두 실패) ────────────────────────────────
  it('TC-3: 양쪽 directions API 실패 → 404 NO_ROUTE_FOUND', async () => {
    mockDirectionsProvider.getRoute.mockRejectedValue(new Error('No route available'));

    const req = makeRequest(VALID_COORDS_BODY);
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('NO_ROUTE_FOUND');
  });

  // ── TC-4: 캐시 히트 ────────────────────────────────────────────────────────────
  it('TC-4: 캐시 히트 → fromCache: true, directions API 미호출', async () => {
    vi.mocked(loadSearchCache).mockReturnValue({
      results: [MOCK_DETOUR_RESULT as unknown as DetourResult],
      originalRoute: MOCK_ROUTE as unknown as Route,
      totalCandidates: 5,
      apiCallsUsed: 2,
      timestamp: Date.now(),
    });

    const req = makeRequest(VALID_COORDS_BODY);
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.fromCache).toBe(true);
    // 캐시 히트 시 directions API 호출 없어야 함
    expect(mockDirectionsProvider.getRoute).not.toHaveBeenCalled();
    // calculateDetourCosts도 호출되지 않아야 함
    expect(calculateDetourCosts).not.toHaveBeenCalled();
  });

  // ── TC-5: shortest 경로 제거 (durationRatio ≥ 1.35) ─────────────────────────
  it('TC-5: shortest가 fastest보다 35% 이상 느리면 shortest 드롭 → calculateDetourCosts 1회만 호출', async () => {
    // shortest: 1700s (느림), fastest: 1200s
    // durationRatio = 1700/1200 ≈ 1.42 ≥ 1.35 → shortest 제외
    mockDirectionsProvider.getRoute.mockImplementation(
      (_start: unknown, _end: unknown, type: unknown) => {
        if (type === 'shortest') {
          return Promise.resolve({ ...MOCK_ROUTE, duration: 1700 });
        }
        return Promise.resolve({ ...MOCK_ROUTE, duration: 1200 });
      }
    );

    const req = makeRequest(VALID_COORDS_BODY);
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    // fastest만 남으므로 calculateDetourCosts는 1회만 호출됨
    expect(vi.mocked(calculateDetourCosts)).toHaveBeenCalledTimes(1);
  });

  // ── TC-6: 개인화 실패 → 원본 결과 반환 ───────────────────────────────────────
  it('TC-6: 개인화 스코어 실패해도 원본 결과 200 반환', async () => {
    vi.mocked(calculatePersonalizationScores).mockRejectedValue(
      new Error('DB connection timeout')
    );

    const req = makeRequest(VALID_COORDS_BODY);
    const res = await POST(req);
    const json = await res.json();

    // 개인화 실패해도 원본 결과 그대로 반환
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.results).toHaveLength(1);
    expect(json.data.results[0].place.id).toBe('place-1');
  });

  // ── TC-7: 개인화 점수 Map 변환 검증 ─────────────────────────────────────────
  it('TC-7: 개인화 점수 Map 매핑 — 각 result에 올바른 personalScore/popularityScore 반영', async () => {
    // 2개 결과 mock
    const result1 = { ...MOCK_DETOUR_RESULT, place: { ...MOCK_DETOUR_RESULT.place, id: 'place-A' } };
    const result2 = { ...MOCK_DETOUR_RESULT, place: { ...MOCK_DETOUR_RESULT.place, id: 'place-B' } };

    vi.mocked(calculateDetourCosts).mockResolvedValue({
      results: [result1, result2] as unknown as DetourResult[],
      totalCandidates: 5,
      apiCallsUsed: 4,
    });

    // place-A: 높은 부스트, place-B: 낮은 부스트
    vi.mocked(calculatePersonalizationScores).mockResolvedValue([
      { placeId: 'place-B', personalScore: 10, popularityScore: 5, finalBoost: 5 },
      { placeId: 'place-A', personalScore: 90, popularityScore: 80, finalBoost: 20 },
    ]);

    const req = makeRequest(VALID_COORDS_BODY);
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    const results = json.data.results as Array<{ place: { id: string }; personalScore: number; popularityScore: number }>;

    // place-A 확인 (personalScore=90, popularityScore=80)
    const placeA = results.find(r => r.place.id === 'place-A');
    const placeB = results.find(r => r.place.id === 'place-B');
    expect(placeA).toBeDefined();
    expect(placeA!.personalScore).toBe(90);
    expect(placeA!.popularityScore).toBe(80);

    // place-B 확인 (personalScore=10, popularityScore=5)
    expect(placeB).toBeDefined();
    expect(placeB!.personalScore).toBe(10);
    expect(placeB!.popularityScore).toBe(5);
  });

  // ── TC-8: DB 에러 → 500 DATABASE_ERROR ───────────────────────────────────────
  it('TC-8: DB 에러(DatabaseError 예외) → 500 DATABASE_ERROR 반환', async () => {
    // hashRoute는 allSettled 외부에서 호출되므로 outer catch로 전파됨
    vi.mocked(hashRoute).mockImplementationOnce(() => {
      throw new DatabaseError('Spatial query failed');
    });

    const req = makeRequest(VALID_COORDS_BODY);
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('DATABASE_ERROR');
  });
});

// ========== 키워드 검색 테스트 (v0.20.0) ==========

describe('POST /api/search - Keyword Search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadSearchCache).mockReturnValue(null);
    vi.mocked(getDirectionsProvider).mockResolvedValue({
      getRoute: vi.fn().mockResolvedValue(MOCK_ROUTE),
    } as any);
    vi.mocked(calculateDetourCosts).mockResolvedValue({
      results: [MOCK_DETOUR_RESULT],
      totalCandidates: 10,
      apiCallsUsed: 5,
    });
    vi.mocked(calculatePersonalizationScores).mockResolvedValue([]);
    vi.mocked(hashRoute).mockReturnValue('test-route-hash');
  });

  it('TC-9: 키워드 검색 (query=홍대입구역) → 200 + results 반환', async () => {
    const req = new NextRequest('http://localhost/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        start: { coordinates: { lat: 37.5663, lng: 126.9779 } },
        end: { coordinates: { lat: 37.4979, lng: 127.0276 } },
        query: '홍대입구역',
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.results).toBeDefined();
    expect(json.data.results.length).toBeGreaterThan(0);
    expect(calculateDetourCosts).toHaveBeenCalledWith(
      expect.anything(),
      '홍대입구역',
      expect.anything(),
      'keyword' // searchType 자동 감지
    );
  });

  it('TC-10: 검색 타입 자동 감지 (category vs keyword)', async () => {
    // 카테고리 검색
    const catReq = new NextRequest('http://localhost/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        start: { coordinates: { lat: 37.5663, lng: 126.9779 } },
        end: { coordinates: { lat: 37.4979, lng: 127.0276 } },
        category: '다이소',
      }),
    });

    vi.mocked(calculateDetourCosts).mockResolvedValue({
      results: [MOCK_DETOUR_RESULT],
      totalCandidates: 10,
      apiCallsUsed: 5,
    });

    const catRes = await POST(catReq);
    const catJson = await catRes.json();

    expect(catRes.status).toBe(200);
    expect(catJson.success).toBe(true);
    expect(calculateDetourCosts).toHaveBeenCalledWith(
      expect.anything(),
      '다이소',
      expect.anything(),
      'category'
    );

    // 키워드 검색
    vi.clearAllMocks();
    vi.mocked(loadSearchCache).mockReturnValue(null);
    vi.mocked(getDirectionsProvider).mockResolvedValue({
      getRoute: vi.fn().mockResolvedValue(MOCK_ROUTE),
    } as any);
    vi.mocked(calculateDetourCosts).mockResolvedValue({
      results: [MOCK_DETOUR_RESULT],
      totalCandidates: 10,
      apiCallsUsed: 5,
    });
    vi.mocked(calculatePersonalizationScores).mockResolvedValue([]);

    const kwReq = new NextRequest('http://localhost/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        start: { coordinates: { lat: 37.5663, lng: 126.9779 } },
        end: { coordinates: { lat: 37.4979, lng: 127.0276 } },
        query: '이태원 맛집',
      }),
    });

    const kwRes = await POST(kwReq);
    const kwJson = await kwRes.json();

    expect(kwRes.status).toBe(200);
    expect(kwJson.success).toBe(true);
    expect(calculateDetourCosts).toHaveBeenCalledWith(
      expect.anything(),
      '이태원 맛집',
      expect.anything(),
      'keyword'
    );
  });
});

// ========== 버그 수정 검증 테스트 (v0.7.2) ==========

describe('shouldDropShortestRoute — duration ratio 0 나누기 방지', () => {
  it('T6a: fastest.duration이 0이면 shortest를 제거하지 않음 (Infinity 방지)', () => {
    expect(
      shouldDropShortestRoute(
        { route: { duration: 100 } },
        { route: { duration: 0 } }
      )
    ).toBe(false);
  });

  it('T6b: durationRatio < 1.35이면 shortest를 제거하지 않음', () => {
    expect(
      shouldDropShortestRoute(
        { route: { duration: 130 } },
        { route: { duration: 100 } }
      )
    ).toBe(false);
  });

  it('T6c: durationRatio >= 1.35이면 shortest를 제거함', () => {
    expect(
      shouldDropShortestRoute(
        { route: { duration: 140 } },
        { route: { duration: 100 } }
      )
    ).toBe(true);
  });
});
