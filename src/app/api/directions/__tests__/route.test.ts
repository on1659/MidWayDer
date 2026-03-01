import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/directions/route';
import { NextRequest } from 'next/server';

// getDirectionsProvider가 반환하는 provider를 mock
const mockGetRoute = vi.fn();
vi.mock('@/lib/map-provider', () => ({
  getDirectionsProvider: vi.fn(() => ({ getRoute: mockGetRoute })),
}));

const makeRequest = (body: unknown) =>
  new NextRequest('http://localhost/api/directions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

const validBody = {
  start: { lat: 37.5663, lng: 126.9779 },
  end: { lat: 37.4979, lng: 127.0276 },
};

beforeEach(() => vi.clearAllMocks());

describe('POST /api/directions', () => {
  it('정상 요청 → 200 + Route 반환', async () => {
    const mockRoute = {
      start: validBody.start, end: validBody.end,
      distance: 12500, duration: 1200, path: [],
    };
    mockGetRoute.mockResolvedValue(mockRoute);

    const res = await POST(makeRequest(validBody));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.distance).toBe(12500);
  });

  it('start 누락 → 400 VALIDATION_ERROR', async () => {
    const res = await POST(makeRequest({ end: validBody.end }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('VALIDATION_ERROR');
  });

  it('좌표 범위 초과 → 400 VALIDATION_ERROR', async () => {
    const res = await POST(makeRequest({
      start: { lat: 999, lng: 126.9779 },
      end: validBody.end,
    }));
    expect(res.status).toBe(400);
  });

  it('경로 없음 에러 → 404 NO_ROUTE_FOUND', async () => {
    mockGetRoute.mockRejectedValue({ code: 'NO_ROUTE_FOUND' });
    const res = await POST(makeRequest(validBody));
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error.code).toBe('NO_ROUTE_FOUND');
  });

  it('option 파라미터 포함 정상 요청 → 200', async () => {
    mockGetRoute.mockResolvedValue({ ...({} as any), distance: 0, duration: 0, path: [] });
    const res = await POST(makeRequest({ ...validBody, option: 'trafast' }));
    expect(res.status).toBe(200);
  });

  it('잘못된 JSON 바디 → 500 INTERNAL_ERROR', async () => {
    const res = await POST(new NextRequest('http://localhost/api/directions', {
      method: 'POST',
      body: 'invalid json {{}',
      headers: { 'Content-Type': 'application/json' },
    }));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error.code).toBe('INTERNAL_ERROR');
  });
});
