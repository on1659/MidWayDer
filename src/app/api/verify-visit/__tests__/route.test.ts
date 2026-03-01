// src/app/api/verify-visit/__tests__/route.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    place: { findUnique: vi.fn() },
    visitLog: { findFirst: vi.fn(), create: vi.fn() },
    userPoints: { upsert: vi.fn(), update: vi.fn() },
  },
}));

import { POST } from '../route';
import { prisma } from '@/lib/db/prisma';

// 스타벅스 강남역점 (37.498, 127.028)
const MOCK_PLACE = {
  id: 'place-1',
  name: '스타벅스 강남역점',
  lat: 37.498,
  lng: 127.028,
};

function makeRequest(body: object): NextRequest {
  return new NextRequest('http://localhost/api/verify-visit', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

// 50m 이내 좌표 (≈ 0m, 같은 위치)
const NEARBY = { userLat: 37.498, userLng: 127.028 };
// 100m 초과 좌표 (1km 거리)
const FAR = { userLat: 37.507, userLng: 127.028 };

describe('POST /api/verify-visit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.place.findUnique).mockResolvedValue(MOCK_PLACE as never);
    vi.mocked(prisma.visitLog.findFirst).mockResolvedValue(null); // 중복 없음
    vi.mocked(prisma.visitLog.create).mockResolvedValue({} as never);
    vi.mocked(prisma.userPoints.upsert).mockResolvedValue({
      sessionId: 'sess-1', points: 10, tier: 'bronze',
    } as never);
    vi.mocked(prisma.userPoints.update).mockResolvedValue({} as never);
  });

  it('TC-1: 50m 이내 → 인증 성공 + 10포인트', async () => {
    const req = makeRequest({ placeId: 'place-1', ...NEARBY });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.verified).toBe(true);
    expect(json.points).toBe(10);
    expect(json.message).toContain('+10포인트');
    expect(prisma.visitLog.create).toHaveBeenCalledOnce();
  });

  it('TC-2: 50m 초과 → verified: false + 거리 메시지', async () => {
    const req = makeRequest({ placeId: 'place-1', ...FAR });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.verified).toBe(false);
    expect(json.message).toMatch(/m 떨어져 있어요/);
    expect(prisma.visitLog.create).not.toHaveBeenCalled();
  });

  it('TC-3: 1시간 이내 중복 인증 → verified: false', async () => {
    vi.mocked(prisma.visitLog.findFirst).mockResolvedValue({ id: 'visit-1' } as never);
    const req = makeRequest({ placeId: 'place-1', ...NEARBY });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.verified).toBe(false);
    expect(json.message).toContain('1시간 이내');
  });

  it('TC-4: 누적 50점 도달 → tier silver로 승급 + update 호출', async () => {
    // upsert 후 points=50 → calcTier('silver'), 현재 tier='bronze' → update 필요
    vi.mocked(prisma.userPoints.upsert).mockResolvedValue({
      sessionId: 'sess-1', points: 50, tier: 'bronze',
    } as never);

    const req = makeRequest({ placeId: 'place-1', ...NEARBY });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.verified).toBe(true);
    expect(json.tier).toBe('silver');
    expect(prisma.userPoints.update).toHaveBeenCalledWith({
      where: expect.anything(),
      data: { tier: 'silver' },
    });
  });

  it('TC-5: 존재하지 않는 placeId → 404', async () => {
    vi.mocked(prisma.place.findUnique).mockResolvedValue(null);
    const req = makeRequest({ placeId: 'nonexistent', ...NEARBY });
    const res = await POST(req);

    expect(res.status).toBe(404);
  });

  it('TC-6: Zod 검증 실패 (userLat 누락) → 400', async () => {
    const req = makeRequest({ placeId: 'place-1', userLng: 127.028 }); // userLat 없음
    const res = await POST(req);

    expect(res.status).toBe(400);
  });
});
