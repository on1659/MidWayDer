import { describe, test, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';

// ─── autocomplete: 외부 fetch mock ───────────────────────────────────────────
vi.mock('node:fetch', () => ({ default: vi.fn() }));

// ─── verify-visit: prisma mock ──────────────────────────────────────────────
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    place: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
    visitLog: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
    },
    userPoints: {
      upsert: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// ─── autocomplete route ─────────────────────────────────────────────────────
import { GET } from '@/app/api/autocomplete/route';

describe('GET /api/autocomplete', () => {
  test('lat 범위 초과 시 빈 results 반환', async () => {
    const req = new NextRequest('http://localhost/api/autocomplete?query=다이소&lat=999&lng=127');
    const res = await GET(req);
    const json = await res.json();
    expect(json.results).toEqual([]);
  });

  test('lng 범위 초과 시 빈 results 반환', async () => {
    const req = new NextRequest('http://localhost/api/autocomplete?query=스타벅스&lat=37&lng=999');
    const res = await GET(req);
    const json = await res.json();
    expect(json.results).toEqual([]);
  });

  test('query 1글자 시 빈 results 반환', async () => {
    const req = new NextRequest('http://localhost/api/autocomplete?query=A');
    const res = await GET(req);
    const json = await res.json();
    expect(json.results).toEqual([]);
  });
});

// ─── verify-visit route ─────────────────────────────────────────────────────
import { POST } from '@/app/api/verify-visit/route';

describe('POST /api/verify-visit', () => {
  test('placeId 없을 때 400 반환', async () => {
    const req = new NextRequest('http://localhost/api/verify-visit', {
      method: 'POST',
      body: JSON.stringify({ userLat: 37.5, userLng: 127.0 }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  test('userLat 범위 초과 시 400 반환', async () => {
    const req = new NextRequest('http://localhost/api/verify-visit', {
      method: 'POST',
      body: JSON.stringify({ placeId: 'abc', userLat: 999, userLng: 127.0 }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
