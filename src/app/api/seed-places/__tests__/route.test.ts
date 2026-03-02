/**
 * seed-places API 테스트
 * development 전용 DB 시딩 엔드포인트
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    $executeRaw: vi.fn().mockResolvedValue(1),
  },
}));

vi.mock('@/lib/map-provider', () => ({
  getSearchProvider: vi.fn().mockResolvedValue({
    searchPlacesByRegion: vi.fn().mockResolvedValue([
      {
        name: '다이소 강남점',
        category: '다이소',
        address: '서울 강남구',
        coordinates: { lat: 37.5172, lng: 127.0473 },
      },
    ]),
  }),
}));

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/monitoring', () => ({
  captureException: vi.fn(),
}));

import { POST } from '../route';

// ─── 헬퍼 ─────────────────────────────────────────────────────────────────────

function makeRequest(body: object): NextRequest {
  return new NextRequest('http://localhost/api/seed-places', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ─── 테스트 ───────────────────────────────────────────────────────────────────

describe('POST /api/seed-places — 환경 검증', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('production 환경에서 403 반환', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const req = makeRequest({ categories: ['다이소'], cities: ['서울'] });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it('development 환경에서 200 반환', async () => {
    // NODE_ENV가 이미 'test'이므로 development로 설정
    vi.stubEnv('NODE_ENV', 'development');
    const req = makeRequest({ categories: ['다이소'], cities: ['서울'] });
    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(typeof json.data.placesCreated).toBe('number');
  });

  it('입력 검증: categories 없으면 400', async () => {
    // NODE_ENV=test 이면 development 가드에 걸림 → 먼저 development로 설정
    vi.stubEnv('NODE_ENV', 'development');
    const req = makeRequest({ cities: ['서울'] });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
