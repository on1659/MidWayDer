// src/app/api/log-click/__tests__/route.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    searchLog: { findFirst: vi.fn() },
    clickLog: { create: vi.fn() },
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { POST } from '../route';
import { prisma } from '@/lib/db/prisma';

const MOCK_SEARCH_LOG = { id: 'search-log-1', sessionId: 'sess-1' };

function makeRequest(body: object): NextRequest {
  const req = new NextRequest('http://localhost/api/log-click', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
  return req;
}

describe('POST /api/log-click', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.searchLog.findFirst).mockResolvedValue(MOCK_SEARCH_LOG as never);
    vi.mocked(prisma.clickLog.create).mockResolvedValue({ id: 'click-1' } as never);
  });

  it('TC-1: 유효한 클릭 로그 → 200 success', async () => {
    const req = makeRequest({ placeId: 'place-1', rank: 2 });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.skipped).toBeUndefined();
    expect(prisma.clickLog.create).toHaveBeenCalledWith({
      data: { searchLogId: 'search-log-1', placeId: 'place-1', rank: 2 },
    });
  });

  it('TC-2: placeId 누락 → 400 VALIDATION_ERROR', async () => {
    const req = makeRequest({ rank: 2 }); // placeId 없음
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toBe('VALIDATION_ERROR');
  });

  it('TC-3: rank 음수 (유효하지 않은 값) → 400 VALIDATION_ERROR', async () => {
    const req = makeRequest({ placeId: 'place-1', rank: -1 });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toBe('VALIDATION_ERROR');
  });

  it('TC-4: 최근 검색 로그 없음 → 200 skipped: true', async () => {
    vi.mocked(prisma.searchLog.findFirst).mockResolvedValue(null);
    const req = makeRequest({ placeId: 'place-1', rank: 1 });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.skipped).toBe(true);
    expect(prisma.clickLog.create).not.toHaveBeenCalled();
  });

  it('TC-5: DB 에러 → 500', async () => {
    vi.mocked(prisma.searchLog.findFirst).mockRejectedValue(new Error('DB connection failed'));
    const req = makeRequest({ placeId: 'place-1', rank: 1 });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.success).toBe(false);
  });
});
