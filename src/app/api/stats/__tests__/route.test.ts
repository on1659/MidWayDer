import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/stats/route';
import { NextRequest } from 'next/server';

const {
  mockSearchLogCount,
  mockClickLogCount,
  mockSearchLogGroupBy,
  mockClickLogGroupBy,
  mockSearchLogAggregate,
  mockPlaceFindMany,
} = vi.hoisted(() => ({
  mockSearchLogCount: vi.fn(),
  mockClickLogCount: vi.fn(),
  mockSearchLogGroupBy: vi.fn(),
  mockClickLogGroupBy: vi.fn(),
  mockSearchLogAggregate: vi.fn(),
  mockPlaceFindMany: vi.fn(),
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    searchLog: {
      count: mockSearchLogCount,
      groupBy: mockSearchLogGroupBy,
      aggregate: mockSearchLogAggregate,
    },
    clickLog: {
      count: mockClickLogCount,
      groupBy: mockClickLogGroupBy,
    },
    place: { findMany: mockPlaceFindMany },
  },
}));

const adminHeaders = () => ({
  authorization: `Basic ${btoa('admin:test-admin')}`,
});

const makeRequest = (period?: string, authenticated = true) =>
  new NextRequest(`http://localhost/api/stats${period ? `?period=${period}` : ''}`, {
    headers: authenticated ? adminHeaders() : {},
  });

beforeEach(() => {
  vi.clearAllMocks();
  process.env.ADMIN_PASSWORD = 'test-admin';
  // 기본 mock 설정
  mockSearchLogCount.mockResolvedValue(100);
  mockClickLogCount.mockResolvedValue(50);
  mockSearchLogGroupBy.mockResolvedValue([
    { category: '다이소', _count: { id: 30 } },
    { category: '스타벅스', _count: { id: 20 } },
  ]);
  mockClickLogGroupBy.mockResolvedValue([]);
  mockSearchLogAggregate.mockResolvedValue({ _avg: { searchDuration: 1500 } });
  mockPlaceFindMany.mockResolvedValue([]);
});

describe('GET /api/stats', () => {
  it('인증 없음 → 401', async () => {
    const res = await GET(makeRequest(undefined, false));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.success).toBe(false);
    expect(mockSearchLogCount).not.toHaveBeenCalled();
  });

  it('기본 period(today) → 200 + stats 반환', async () => {
    const res = await GET(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.totalSearches).toBe(100);
    expect(json.data.totalClicks).toBe(50);
    expect(json.data.ctr).toBeCloseTo(50, 0); // 50/100 * 100
  });

  it('period=week → 200 + 같은 구조 반환', async () => {
    const res = await GET(makeRequest('week'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.period).toBe('week');
    expect(json.data).toBeDefined();
  });

  it('검색 0건일 때 ctr = 0 (division by zero 방지)', async () => {
    mockSearchLogCount.mockResolvedValue(0);
    mockClickLogCount.mockResolvedValue(0);

    const res = await GET(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.ctr).toBe(0);
  });

  it('categoryBreakdown 배열 반환', async () => {
    const res = await GET(makeRequest());
    const json = await res.json();

    expect(Array.isArray(json.data.categoryBreakdown)).toBe(true);
    expect(json.data.categoryBreakdown[0]).toHaveProperty('category');
    expect(json.data.categoryBreakdown[0]).toHaveProperty('percentage');
  });

  it('DB 에러 → 500', async () => {
    mockSearchLogCount.mockRejectedValue(new Error('DB timeout'));

    const res = await GET(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.success).toBe(false);
  });
});
