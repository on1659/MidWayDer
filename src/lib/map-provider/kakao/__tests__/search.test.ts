import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AxiosError } from 'axios';
import { KakaoSearchProvider } from '@/lib/map-provider/kakao/search';

const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }));

vi.mock('@/lib/map-provider/kakao/client', () => ({
  kakaoLocalClient: { get: mockGet },
  extractKakaoErrorMessage: (e: unknown) =>
    e instanceof Error ? e.message : 'Unknown error',
}));

const makeKakaoDocument = (id: string, lat: string, lng: string, name: string) => ({
  id, place_name: name, category_name: '생활용품',
  address_name: `서울 ${name}`, road_address_name: `서울 도로명 ${name}`,
  phone: '02-1234-5678', x: lng, y: lat,
});

const makePageResponse = (
  documents: ReturnType<typeof makeKakaoDocument>[],
  isEnd = true
) => ({
  data: {
    documents,
    meta: { total_count: documents.length, pageable_count: documents.length, is_end: isEnd },
  },
});

beforeEach(() => vi.clearAllMocks());

describe('KakaoSearchProvider', () => {
  const provider = new KakaoSearchProvider();

  it('정상 검색 → Place[] 변환', async () => {
    mockGet.mockResolvedValue(makePageResponse([
      makeKakaoDocument('1', '37.5663', '126.9779', '다이소 종로점'),
    ]));

    const places = await provider.searchPlaces('다이소');

    expect(places).toHaveLength(1);
    expect(places[0].name).toBe('다이소 종로점');
    expect(places[0].coordinates).toEqual({ lat: 37.5663, lng: 126.9779 });
    expect(places[0].id).toBe('kakao-1');
  });

  it('빈 검색 결과 → 빈 배열 반환', async () => {
    mockGet.mockResolvedValue(makePageResponse([]));

    const places = await provider.searchPlaces('없는매장XYZ');
    expect(places).toHaveLength(0);
  });

  it('페이지네이션 — is_end=false이면 다음 페이지 요청', async () => {
    // 1페이지: is_end=false, 2페이지: is_end=true
    mockGet
      .mockResolvedValueOnce(makePageResponse(
        [makeKakaoDocument('1', '37.5', '127.0', 'A')], false
      ))
      .mockResolvedValueOnce(makePageResponse(
        [makeKakaoDocument('2', '37.51', '127.01', 'B')]
      ));

    const places = await provider.searchPlaces('다이소', { maxResults: 30 });
    expect(places.length).toBeGreaterThanOrEqual(2);
    expect(mockGet).toHaveBeenCalledTimes(2);
  });

  it('빈 검색어 → EMPTY_QUERY 에러', async () => {
    await expect(provider.searchPlaces('')).rejects.toMatchObject({
      code: 'EMPTY_QUERY',
    });
  });

  it('center + radius 옵션 → API 파라미터 포함 확인', async () => {
    mockGet.mockResolvedValue(makePageResponse([]));

    await provider.searchPlaces('스타벅스', {
      center: { lat: 37.5663, lng: 126.9779 },
      radius: 500,
    });

    const callArgs = mockGet.mock.calls[0];
    expect(callArgs[1]?.params).toMatchObject({ x: '126.9779', y: '37.5663', radius: 500 });
  });

  it('HTTP 에러 → HTTP_ERROR 에러 전파', async () => {
    const httpError = new AxiosError('Request failed with status 401');
    (httpError as unknown as { response: unknown }).response = { status: 401, data: {} };
    mockGet.mockRejectedValue(httpError);

    await expect(provider.searchPlaces('다이소')).rejects.toMatchObject({
      code: 'HTTP_ERROR',
    });
  });
});
