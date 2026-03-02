import { describe, it, expect } from 'vitest';
import { searchRequestSchema, directionsRequestSchema } from '@/lib/validation/schemas';

// ────────────────────────────────────────────────────
// 정상 케이스
// ────────────────────────────────────────────────────
describe('searchRequestSchema — 정상 입력', () => {
  it('서울시청 → 강남역, 다이소 검색 정상 파싱', () => {
    const input = {
      start: { coordinates: { lat: 37.5663, lng: 126.9779 } },
      end:   { coordinates: { lat: 37.4979, lng: 127.0276 } },
      category: '다이소',
    };
    const result = searchRequestSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('경계값 좌표 (lat=90, lng=-180) 허용', () => {
    const input = {
      start: { coordinates: { lat: 90, lng: -180 } },
      end:   { coordinates: { lat: -90, lng: 180 } },
      category: '카페',
    };
    expect(searchRequestSchema.safeParse(input).success).toBe(true);
  });

  it('address 문자열로 입력 시 정상 파싱', () => {
    const input = {
      start: { address: '서울특별시 중구 세종대로 110' },
      end:   { address: '서울특별시 강남구 테헤란로 152' },
      category: '스타벅스',
    };
    expect(searchRequestSchema.safeParse(input).success).toBe(true);
  });

  it('options.maxResults 1~50 범위 허용', () => {
    const base = {
      start: { coordinates: { lat: 37.5, lng: 127.0 } },
      end:   { coordinates: { lat: 37.4, lng: 127.0 } },
      category: '편의점',
      options: { maxResults: 20 },
    };
    expect(searchRequestSchema.safeParse(base).success).toBe(true);
  });
});

// ────────────────────────────────────────────────────
// NaN / Infinity 방어 (Bug 1-C 검증)
// ────────────────────────────────────────────────────
describe('coordinatesSchema — NaN / Infinity 거부', () => {
  it('lat=NaN 거부', () => {
    const input = {
      start: { coordinates: { lat: NaN, lng: 127.0 } },
      end:   { coordinates: { lat: 37.4, lng: 127.0 } },
      category: '카페',
    };
    expect(searchRequestSchema.safeParse(input).success).toBe(false);
  });

  it('lng=Infinity 거부', () => {
    const input = {
      start: { coordinates: { lat: 37.5, lng: Infinity } },
      end:   { coordinates: { lat: 37.4, lng: 127.0 } },
      category: '카페',
    };
    expect(searchRequestSchema.safeParse(input).success).toBe(false);
  });

  it('lat=-Infinity 거부', () => {
    const input = {
      start: { coordinates: { lat: -Infinity, lng: 127.0 } },
      end:   { coordinates: { lat: 37.4, lng: 127.0 } },
      category: '카페',
    };
    expect(searchRequestSchema.safeParse(input).success).toBe(false);
  });

  it('lat 범위 초과 (91) 거부', () => {
    const input = {
      start: { coordinates: { lat: 91, lng: 127.0 } },
      end:   { coordinates: { lat: 37.4, lng: 127.0 } },
      category: '카페',
    };
    expect(searchRequestSchema.safeParse(input).success).toBe(false);
  });
});

// ────────────────────────────────────────────────────
// 카테고리 검증
// ────────────────────────────────────────────────────
describe('searchRequestSchema — 카테고리 검증', () => {
  const base = {
    start: { coordinates: { lat: 37.5, lng: 127.0 } },
    end:   { coordinates: { lat: 37.4, lng: 127.0 } },
  };

  it('빈 문자열 카테고리 거부', () => {
    expect(searchRequestSchema.safeParse({ ...base, category: '' }).success).toBe(false);
  });

  it('주소/좌표 둘 다 없으면 거부', () => {
    const input = { start: {}, end: {}, category: '카페' };
    expect(searchRequestSchema.safeParse(input).success).toBe(false);
  });

  it('options.maxResults 0 거부 (최소 1)', () => {
    expect(searchRequestSchema.safeParse({
      ...base, category: '카페', options: { maxResults: 0 }
    }).success).toBe(false);
  });

  it('options.maxResults 51 거부 (최대 50)', () => {
    expect(searchRequestSchema.safeParse({
      ...base, category: '카페', options: { maxResults: 51 }
    }).success).toBe(false);
  });
});

// ────────────────────────────────────────────────────
// directionsRequestSchema
// ────────────────────────────────────────────────────
describe('directionsRequestSchema', () => {
  it('유효한 option 열거형 허용', () => {
    const input = {
      start: { lat: 37.5, lng: 127.0 },
      end:   { lat: 37.4, lng: 127.0 },
      option: 'traoptimal',
    };
    expect(directionsRequestSchema.safeParse(input).success).toBe(true);
  });

  it('유효하지 않은 option 문자열 거부', () => {
    const input = {
      start: { lat: 37.5, lng: 127.0 },
      end:   { lat: 37.4, lng: 127.0 },
      option: 'invalid_option',
    };
    expect(directionsRequestSchema.safeParse(input).success).toBe(false);
  });
});
