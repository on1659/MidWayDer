import { describe, it, expect } from 'vitest';
import { POST } from '@/app/api/optimize-route/route';
import { NextRequest } from 'next/server';

const makeRequest = (body: unknown) =>
  new NextRequest('http://localhost/api/optimize-route', {
    method: 'POST',
    body: JSON.stringify(body),
  });

const start = { lat: 37.5663, lng: 126.9779 };
const end = { lat: 37.4979, lng: 127.0276 };

const makeWaypoint = (id: string, lat: number, lng: number) => ({
  id, name: `WP-${id}`, coordinates: { lat, lng },
});

describe('POST /api/optimize-route', () => {
  it('2개 경유지 → 최적 순서 반환', async () => {
    const body = {
      start, end,
      waypoints: [
        makeWaypoint('a', 37.55, 127.0),
        makeWaypoint('b', 37.52, 126.99),
      ],
    };
    const res = await POST(makeRequest(body));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.optimizedOrder).toHaveLength(2);
    expect(json.data.totalDistance).toBeGreaterThan(0);
  });

  it('경유지 없음 → 400 INVALID_INPUT', async () => {
    const res = await POST(makeRequest({ start, end, waypoints: [] }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('INVALID_INPUT');
  });

  it('경유지 1개 → 200 성공 (1개도 허용)', async () => {
    const res = await POST(makeRequest({
      start, end, waypoints: [makeWaypoint('a', 37.55, 127.0)],
    }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.optimizedOrder).toHaveLength(1);
    expect(json.data.optimizedOrder[0]).toBe('a');
  });

  it('경유지 11개 → 400 TOO_MANY_WAYPOINTS', async () => {
    const waypoints = Array.from({ length: 11 }, (_, i) =>
      makeWaypoint(`w${i}`, 37.5 + i * 0.01, 127.0)
    );
    const res = await POST(makeRequest({ start, end, waypoints }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('TOO_MANY_WAYPOINTS');
  });

  it('start 누락 → 400', async () => {
    const res = await POST(makeRequest({ end, waypoints: [makeWaypoint('a', 37.55, 127.0)] }));
    expect(res.status).toBe(400);
  });

  it('출발지에서 가까운 경유지가 먼저 선택됨 (Greedy 알고리즘 검증)', async () => {
    // start(37.5663, 126.9779)에서 더 가까운 'near'가 먼저 선택되어야 함
    const body = {
      start, end,
      waypoints: [
        makeWaypoint('far', 37.4, 127.1),   // 멀리
        makeWaypoint('near', 37.56, 126.98), // 가까이
      ],
    };
    const res = await POST(makeRequest(body));
    const json = await res.json();

    expect(json.data.optimizedOrder[0]).toBe('near');
  });
});
