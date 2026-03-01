import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const mockPrisma = {
  searchLog: { findFirst: vi.fn() },
  searchFeedback: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
};

vi.mock('@/lib/db/prisma', () => ({
  prisma: mockPrisma,
}));

describe('POST /api/feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TC-1: 신규 피드백 → 200, create 호출', async () => {
    const { POST } = await import('../route');

    mockPrisma.searchFeedback.findUnique.mockResolvedValueOnce(null);
    mockPrisma.searchFeedback.create.mockResolvedValueOnce({ id: 'fb-1' });

    const req = new NextRequest('http://localhost/api/feedback', {
      method: 'POST',
      body: JSON.stringify({ helpful: true, searchLogId: 'log-1' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(mockPrisma.searchFeedback.create).toHaveBeenCalledOnce();
    expect(mockPrisma.searchFeedback.update).not.toHaveBeenCalled();
  });

  it('TC-2: 기존 피드백 존재 → 200, update 호출', async () => {
    const { POST } = await import('../route');

    mockPrisma.searchFeedback.findUnique.mockResolvedValueOnce({ id: 'fb-existing' });
    mockPrisma.searchFeedback.update.mockResolvedValueOnce({ id: 'fb-existing' });

    const req = new NextRequest('http://localhost/api/feedback', {
      method: 'POST',
      body: JSON.stringify({ helpful: false, searchLogId: 'log-1' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(mockPrisma.searchFeedback.update).toHaveBeenCalledOnce();
    expect(mockPrisma.searchFeedback.create).not.toHaveBeenCalled();
  });

  it('TC-3: helpful이 boolean이 아님 → 400', async () => {
    const { POST } = await import('../route');

    const req = new NextRequest('http://localhost/api/feedback', {
      method: 'POST',
      body: JSON.stringify({ helpful: 'yes', searchLogId: 'log-1' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it('TC-4: searchLogId 없음 + sessionId 쿠키 없음 → findFirst(null) → 404', async () => {
    const { POST } = await import('../route');

    mockPrisma.searchLog.findFirst.mockResolvedValueOnce(null);

    const req = new NextRequest('http://localhost/api/feedback', {
      method: 'POST',
      body: JSON.stringify({ helpful: true }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.success).toBe(false);
  });
});

describe('GET /api/feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TC-5: count → satisfactionRate 80 반환', async () => {
    const { GET } = await import('../route');

    mockPrisma.searchFeedback.count
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(8);

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.satisfactionRate).toBe(80);
    expect(json.data.total).toBe(10);
    expect(json.data.helpful).toBe(8);
  });

  it('TC-6: count throw → 500', async () => {
    const { GET } = await import('../route');

    mockPrisma.searchFeedback.count.mockRejectedValueOnce(new Error('DB error'));

    const res = await GET();

    expect(res.status).toBe(500);
  });
});
