import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe('GET /api/autocomplete', () => {
  const ORIGINAL_KEY = process.env.KAKAO_REST_API_KEY;

  beforeEach(() => {
    process.env.KAKAO_REST_API_KEY = 'test-kakao-key';
    vi.resetModules();
  });

  afterEach(() => {
    process.env.KAKAO_REST_API_KEY = ORIGINAL_KEY;
    vi.restoreAllMocks();
  });

  it('TC-1: 유효한 쿼리 → 200 results 반환', async () => {
    process.env.KAKAO_REST_API_KEY = 'test-kakao-key';
    vi.resetModules();
    const { GET } = await import('../route');

    const mockDocs = [
      {
        place_name: '다이소 강남점',
        road_address_name: '서울 강남구',
        y: '37.5',
        x: '127.0',
        category_group_name: '마트',
      },
    ];
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ documents: mockDocs }), { status: 200 })
    );

    const req = new NextRequest('http://localhost/api/autocomplete?query=다이소');
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.results).toHaveLength(1);
    expect(json.results[0].name).toBe('다이소 강남점');
  });

  it('TC-2: 1글자 쿼리 → 200, results: [] (zod 실패 → 빈 배열)', async () => {
    process.env.KAKAO_REST_API_KEY = 'test-kakao-key';
    vi.resetModules();
    const { GET } = await import('../route');

    const req = new NextRequest('http://localhost/api/autocomplete?query=다');
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.results).toEqual([]);
  });

  it('TC-3: lat/lng 포함 쿼리 → URL에 y, x 파라미터 포함', async () => {
    process.env.KAKAO_REST_API_KEY = 'test-kakao-key';
    vi.resetModules();
    const { GET } = await import('../route');

    const mockDocs = [
      {
        place_name: '스타벅스 강남점',
        road_address_name: '서울 강남구',
        y: '37.5',
        x: '127.0',
        category_group_name: '카페',
      },
    ];

    let capturedUrl = '';
    vi.spyOn(global, 'fetch').mockImplementationOnce((url) => {
      capturedUrl = String(url);
      return Promise.resolve(
        new Response(JSON.stringify({ documents: mockDocs }), { status: 200 })
      );
    });

    const req = new NextRequest(
      'http://localhost/api/autocomplete?query=스타벅스&lat=37.5&lng=127.0'
    );
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(capturedUrl).toContain('y=37.5');
    expect(capturedUrl).toContain('x=127');
    expect(json.results).toHaveLength(1);
  });

  it('TC-4: KAKAO_REST_KEY 미설정 → 503', async () => {
    delete process.env.KAKAO_REST_API_KEY;
    vi.resetModules();

    const { GET: GETFresh } = await import('../route');
    const req = new NextRequest('http://localhost/api/autocomplete?query=다이소');
    const res = await GETFresh(req);
    const json = await res.json();

    expect(res.status).toBe(503);
    expect(json.results).toEqual([]);
  });

  it('TC-5: fetch 예외 발생 → 200, results: [] (catch 폴백)', async () => {
    process.env.KAKAO_REST_API_KEY = 'test-kakao-key';
    vi.resetModules();
    const { GET } = await import('../route');

    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));

    const req = new NextRequest('http://localhost/api/autocomplete?query=다이소');
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.results).toEqual([]);
  });
});
