import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KakaoGeocodingProvider } from '@/lib/map-provider/kakao/geocoding';

const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }));

vi.mock('@/lib/map-provider/kakao/client', () => ({
  kakaoLocalClient: { get: mockGet },
  extractKakaoErrorMessage: (e: unknown) =>
    e instanceof Error ? e.message : 'Unknown error',
}));

beforeEach(() => vi.clearAllMocks());

describe('KakaoGeocodingProvider.geocodeAddress', () => {
  const provider = new KakaoGeocodingProvider();

  it('주소 → 좌표 변환 정상', async () => {
    mockGet.mockResolvedValue({
      data: {
        documents: [{ x: '126.9779', y: '37.5663', address_name: '서울 종로구' }],
      },
    });

    const coords = await provider.geocodeAddress('서울 종로구');
    expect(coords).toEqual({ lat: 37.5663, lng: 126.9779 });
  });

  it('주소 검색 결과 없음 → 키워드 폴백 사용', async () => {
    // 1차: 주소 API 빈 결과
    mockGet.mockResolvedValueOnce({ data: { documents: [] } });
    // 2차: 키워드 API 결과
    mockGet.mockResolvedValueOnce({
      data: {
        documents: [{ x: '127.0276', y: '37.4979', place_name: '강남역' }],
      },
    });

    const coords = await provider.geocodeAddress('강남역');
    expect(coords.lat).toBeCloseTo(37.4979, 3);
    expect(mockGet).toHaveBeenCalledTimes(2); // 폴백 호출 확인
  });

  it('둘 다 빈 결과 → NO_ADDRESS_FOUND 에러', async () => {
    mockGet.mockResolvedValue({ data: { documents: [] } });

    await expect(provider.geocodeAddress('없는주소XYZ')).rejects.toMatchObject({
      code: 'NO_ADDRESS_FOUND',
    });
  });

  it('빈 주소 → EMPTY_ADDRESS 에러', async () => {
    await expect(provider.geocodeAddress('')).rejects.toMatchObject({
      code: 'EMPTY_ADDRESS',
    });
  });
});

describe('KakaoGeocodingProvider.reverseGeocode', () => {
  const provider = new KakaoGeocodingProvider();

  it('좌표 → 도로명 주소 반환', async () => {
    mockGet.mockResolvedValue({
      data: {
        documents: [{
          road_address: { address_name: '서울 종로구 세종대로 175' },
          address: { address_name: '서울 종로구 수송동 146' },
        }],
      },
    });

    const address = await provider.reverseGeocode({ lat: 37.5663, lng: 126.9779 });
    expect(address).toBe('서울 종로구 세종대로 175'); // 도로명 주소 우선
  });

  it('유효하지 않은 좌표 → INVALID_COORDINATES 에러', async () => {
    await expect(
      provider.reverseGeocode(null as unknown as { lat: number; lng: number })
    ).rejects.toMatchObject({ code: 'INVALID_COORDINATES' });
  });
});
