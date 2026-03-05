import { describe, it, expect } from 'vitest';
import { validateRoute, formatDistance } from '../route-validation';

describe('validateRoute', () => {
  it('같은 좌표면 SAME_LOCATION 에러', () => {
    const result = validateRoute(
      { lat: 37.5, lng: 127.0, address: 'test' },
      { lat: 37.5, lng: 127.0, address: 'test' }
    );
    expect(result.valid).toBe(false);
    expect(result.error).toBe('SAME_LOCATION');
  });

  it('50m 이내면 TOO_CLOSE 에러', () => {
    const result = validateRoute(
      { lat: 37.5, lng: 127.0, address: 'test' },
      { lat: 37.5004, lng: 127.0, address: 'test' } // 약 44m
    );
    expect(result.valid).toBe(false);
    expect(result.error).toBe('TOO_CLOSE');
  });

  it('500km 초과면 TOO_FAR 에러', () => {
    const result = validateRoute(
      { lat: 37.5, lng: 127.0, address: '서울' },
      { lat: 35.0, lng: 139.0, address: '도쿄' } // 약 1155km
    );
    expect(result.valid).toBe(false);
    expect(result.error).toBe('TOO_FAR');
  });

  it('유효한 경로면 success', () => {
    const result = validateRoute(
      { lat: 37.5663, lng: 126.9779, address: '서울시청' },
      { lat: 37.4979, lng: 127.0276, address: '강남역' } // 약 11km
    );
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('NaN 좌표면 INVALID_COORDINATES 에러', () => {
    const result = validateRoute(
      { lat: NaN, lng: 127.0, address: 'test' },
      { lat: 37.5, lng: 127.0, address: 'test' }
    );
    expect(result.valid).toBe(false);
    expect(result.error).toBe('INVALID_COORDINATES');
  });

  it('좌표 범위 초과면 COORDINATES_OUT_OF_RANGE 에러', () => {
    const result = validateRoute(
      { lat: 91, lng: 127.0, address: 'test' },
      { lat: 37.5, lng: 127.0, address: 'test' }
    );
    expect(result.valid).toBe(false);
    expect(result.error).toBe('COORDINATES_OUT_OF_RANGE');
  });
});

describe('formatDistance', () => {
  it('1km 미만은 m 단위', () => {
    expect(formatDistance(0.5)).toBe('500m');
    expect(formatDistance(0.123)).toBe('123m');
  });

  it('1km 이상은 km 단위 (소수점 1자리)', () => {
    expect(formatDistance(1.5)).toBe('1.5km');
    expect(formatDistance(11.234)).toBe('11.2km');
  });
});
