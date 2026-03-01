/**
 * useGeolocation.test.ts
 * GPS 위치 취득 로직 검증 (Node 환경)
 */
import { describe, it, expect } from 'vitest';
import { getGPSErrorMessage, ERROR_MESSAGES } from '@/lib/error-messages';

const makeGeoError = (code: 1 | 2 | 3): GeolocationPositionError =>
  ({ code, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3, message: '' } as GeolocationPositionError);

describe('useGeolocation — GPS 에러 메시지 로직', () => {
  it('PERMISSION_DENIED → 권한 거부 메시지', () => {
    const msg = getGPSErrorMessage(makeGeoError(1));
    expect(msg).toBe(ERROR_MESSAGES.GPS_DENIED);
  });

  it('POSITION_UNAVAILABLE → 위치 불가 메시지', () => {
    const msg = getGPSErrorMessage(makeGeoError(2));
    expect(msg).toBe(ERROR_MESSAGES.GPS_UNAVAILABLE);
  });

  it('TIMEOUT → 타임아웃 메시지', () => {
    const msg = getGPSErrorMessage(makeGeoError(3));
    expect(msg).toBe(ERROR_MESSAGES.GPS_TIMEOUT);
  });

  it('모든 에러 메시지는 비어있지 않은 문자열', () => {
    [1, 2, 3].forEach((code) => {
      const msg = getGPSErrorMessage(makeGeoError(code as 1 | 2 | 3));
      expect(typeof msg).toBe('string');
      expect(msg.length).toBeGreaterThan(0);
    });
  });
});

describe('useGeolocation — 훅 (jsdom 환경 필요)', () => {
  it.todo('renderHook: 초기 gpsLoading은 false');
  it.todo('renderHook: 초기 currentLocation은 null');
  it.todo('renderHook: geolocation 미지원 시 handleGPS 에러 처리');
  it.todo('renderHook: GPS 성공 시 currentLocation 업데이트');
});
