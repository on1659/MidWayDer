import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AxiosError } from 'axios';
import { KakaoDirectionsProvider } from '@/lib/map-provider/kakao/directions';

const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }));

vi.mock('@/lib/map-provider/kakao/client', () => ({
  kakaoNaviClient: { get: mockGet },
  extractKakaoErrorMessage: (e: unknown) =>
    e instanceof Error ? e.message : 'Unknown error',
}));

// Kakao vertexes: flat array [lng1, lat1, lng2, lat2, ...]
const makeKakaoResponse = (vertexes: number[]) => ({
  data: {
    trans_id: 'test',
    routes: [{
      result_code: 0,
      result_msg: 'OK',
      summary: {
        distance: 12500,
        duration: 1200,
        origin: { x: 126.9779, y: 37.5663 },
        destination: { x: 127.0276, y: 37.4979 },
      },
      sections: [{
        distance: 12500,
        duration: 1200,
        roads: [{ vertexes, name: '테스트도로' }],
      }],
    }],
  },
});

beforeEach(() => vi.clearAllMocks());

describe('KakaoDirectionsProvider', () => {
  const provider = new KakaoDirectionsProvider();
  const start = { lat: 37.5663, lng: 126.9779 };
  const end = { lat: 37.4979, lng: 127.0276 };

  it('정상 응답 → Route 타입으로 변환', async () => {
    // vertexes: [lng1, lat1, lng2, lat2]
    mockGet.mockResolvedValue(makeKakaoResponse([126.9779, 37.5663, 127.0276, 37.4979]));

    const route = await provider.getRoute(start, end);

    expect(route.distance).toBe(12500);
    expect(route.duration).toBe(1200);
    expect(route.path).toHaveLength(2);
    expect(route.path[0]).toMatchObject({ lat: 37.5663, lng: 126.9779 });
  });

  it('vertexes flat array → RoutePoint[] 변환 (lng/lat 순서 확인)', async () => {
    mockGet.mockResolvedValue(makeKakaoResponse([
      126.9779, 37.5663,  // 첫 포인트
      127.0000, 37.5400,  // 중간 포인트
      127.0276, 37.4979,  // 마지막 포인트
    ]));

    const route = await provider.getRoute(start, end);
    expect(route.path[1]).toMatchObject({ lat: 37.5400, lng: 127.0000 });
  });

  it('result_code != 0 → NO_ROUTE_FOUND 에러', async () => {
    mockGet.mockResolvedValue({
      data: {
        routes: [{ result_code: 104, result_msg: '경로 없음', summary: {}, sections: [] }],
      },
    });

    await expect(provider.getRoute(start, end)).rejects.toMatchObject({
      code: 'NO_ROUTE_FOUND',
    });
  });

  it('네트워크 에러 → NETWORK_ERROR 에러', async () => {
    const networkError = new AxiosError('Network Error', 'ECONNREFUSED');
    mockGet.mockRejectedValue(networkError);

    await expect(provider.getRoute(start, end)).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
    });
  });

  it('유효하지 않은 좌표 → INVALID_COORDINATES 에러', async () => {
    await expect(
      provider.getRoute({ lat: null as any, lng: 126.9779 }, end)
    ).rejects.toMatchObject({ code: 'INVALID_COORDINATES' });
  });

  it('HTTP 500 에러 → HTTP_ERROR 에러', async () => {
    const httpError = new AxiosError('Request failed with status 500');
    (httpError as any).response = { status: 500, data: {} };
    mockGet.mockRejectedValue(httpError);

    await expect(provider.getRoute(start, end)).rejects.toMatchObject({
      code: 'HTTP_ERROR',
    });
  });
});
