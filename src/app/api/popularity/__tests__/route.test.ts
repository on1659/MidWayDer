// src/app/api/popularity/__tests__/route.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    clickLog: { groupBy: vi.fn() },
  },
}));

import { GET } from '../route';
import { prisma } from '@/lib/db/prisma';

function makeRequest(placeIds: string): NextRequest {
  return new NextRequest(
    `http://localhost/api/popularity?placeIds=${placeIds}`
  );
}

describe('GET /api/popularity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TC-1: 유효한 placeIds → 1시간 내 클릭 수 반환', async () => {
    vi.mocked(prisma.clickLog.groupBy).mockResolvedValue([
      { placeId: 'place-1', _count: { id: 3 } },
      { placeId: 'place-2', _count: { id: 7 } },
    ] as never);

    const req = makeRequest('place-1,place-2');
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data['place-1']).toBe(3);
    expect(json.data['place-2']).toBe(7);
    expect(prisma.clickLog.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          placeId: { in: ['place-1', 'place-2'] },
        }),
      })
    );
  });

  it('TC-2: placeIds 빈 문자열 → data: {}, DB 호출 없음', async () => {
    const req = makeRequest('');
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toEqual({});
    expect(prisma.clickLog.groupBy).not.toHaveBeenCalled();
  });

  it('TC-3: DB 에러 → 200 + 빈 data (graceful fallback)', async () => {
    vi.mocked(prisma.clickLog.groupBy).mockRejectedValue(new Error('Connection timeout'));

    const req = makeRequest('place-1');
    const res = await GET(req);
    const json = await res.json();

    // UX 차단 없이 빈 데이터 반환
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toEqual({});
  });
});
