import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe('GET /api/reverse-geocode', () => {
  const ORIGINAL_KEY = process.env.KAKAO_REST_API_KEY;

  beforeEach(() => {
    process.env.KAKAO_REST_API_KEY = 'test-kakao-key';
    vi.resetModules();
  });

  afterEach(() => {
    process.env.KAKAO_REST_API_KEY = ORIGINAL_KEY;
    vi.restoreAllMocks();
  });

  it('TC-1: 유효한 lat/lng → 200, name/address/kakaoId 포함', async () => {
    process.env.KAKAO_REST_API_KEY = 'test-kakao-key';
    vi.resetModules();
    const { GET } = await import('../route');

    const addrResponse = new Response(
      JSON.stringify({
        documents: [{ road_address: { address_name: '서울 강남구 테헤란로 123' }, address: null }],
      }),
      { status: 200 }
    );
    const fd6Response = new Response(
      JSON.stringify({
        documents: [{ place_name: '맥도날드 강남점', road_address_name: '서울 강남구', distance: '10', id: 'kakao-123' }],
      }),
      { status: 200 }
    );
    const emptyResponse = () =>
      new Response(JSON.stringify({ documents: [] }), { status: 200 });

    vi.spyOn(global, 'fetch')
      .mockResolvedValueOnce(addrResponse)
      .mockResolvedValueOnce(fd6Response)
      .mockResolvedValueOnce(emptyResponse())
      .mockResolvedValueOnce(emptyResponse())
      .mockResolvedValueOnce(emptyResponse());

    const req = new NextRequest('http://localhost/api/reverse-geocode?lat=37.5&lng=127.0');
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.name).toBe('맥도날드 강남점');
    expect(json.kakaoId).toBe('kakao-123');
  });

  it('TC-2: lat 누락 → 400, error: lat, lng required', async () => {
    process.env.KAKAO_REST_API_KEY = 'test-kakao-key';
    vi.resetModules();
    const { GET } = await import('../route');

    const req = new NextRequest('http://localhost/api/reverse-geocode?lng=127.0');
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('lat, lng required');
  });

  it('TC-3: 카테고리 응답 없음, 주소만 → 200, name = 주소 문자열', async () => {
    process.env.KAKAO_REST_API_KEY = 'test-kakao-key';
    vi.resetModules();
    const { GET } = await import('../route');

    const addrResponse = new Response(
      JSON.stringify({
        documents: [{ road_address: { address_name: '서울 강남구 테헤란로 123' }, address: null }],
      }),
      { status: 200 }
    );
    const emptyResponse = () =>
      new Response(JSON.stringify({ documents: [] }), { status: 200 });

    vi.spyOn(global, 'fetch')
      .mockResolvedValueOnce(addrResponse)
      .mockResolvedValueOnce(emptyResponse())
      .mockResolvedValueOnce(emptyResponse())
      .mockResolvedValueOnce(emptyResponse())
      .mockResolvedValueOnce(emptyResponse());

    const req = new NextRequest('http://localhost/api/reverse-geocode?lat=37.5&lng=127.0');
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.name).toBe('서울 강남구 테헤란로 123');
  });

  it('TC-4: KAKAO_REST_KEY 미설정 → 503', async () => {
    delete process.env.KAKAO_REST_API_KEY;
    vi.resetModules();

    const { GET: GETFresh } = await import('../route');
    const req = new NextRequest('http://localhost/api/reverse-geocode?lat=37.5&lng=127.0');
    const res = await GETFresh(req);
    const json = await res.json();

    expect(res.status).toBe(503);
    expect(json.error).toBe('Service unavailable');
  });

  it('TC-5: fetch 예외 → 500', async () => {
    process.env.KAKAO_REST_API_KEY = 'test-kakao-key';
    vi.resetModules();
    const { GET } = await import('../route');

    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));

    const req = new NextRequest('http://localhost/api/reverse-geocode?lat=37.5&lng=127.0');
    const res = await GET(req);

    expect(res.status).toBe(500);
  });
});
