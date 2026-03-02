// @vitest-environment jsdom
/**
 * useGeolocation.test.ts
 * GPS 위치 취득 로직 검증 (Node 환경 + jsdom 환경)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { getGPSErrorMessage, ERROR_MESSAGES } from '@/lib/error-messages';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/store/route-store', () => ({
  useRouteStore: vi.fn(() => ({ setStart: vi.fn() })),
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: vi.fn(() => ({ showToast: vi.fn() })),
}));

vi.mock('@/lib/smart-location', () => ({
  recordLocationVisit: vi.fn(),
}));

import { useGeolocation } from '../useGeolocation';

// ─── 헬퍼 ─────────────────────────────────────────────────────────────────────

const makeGeoError = (code: 1 | 2 | 3): GeolocationPositionError =>
  ({ code, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3, message: '' } as GeolocationPositionError);

const mockGeolocation = {
  getCurrentPosition: vi.fn(),
  watchPosition: vi.fn(),
  clearWatch: vi.fn(),
};

// ─── GPS 에러 메시지 로직 (기존 Node 테스트) ──────────────────────────────────

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

// ─── 훅 테스트 (jsdom 환경) ────────────────────────────────────────────────────

describe('useGeolocation — 훅 (jsdom 환경)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    Object.defineProperty(navigator, 'geolocation', {
      value: mockGeolocation,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renderHook: 초기 gpsLoading은 false', () => {
    const { result } = renderHook(() => useGeolocation());
    expect(result.current.gpsLoading).toBe(false);
  });

  it('renderHook: 초기 currentLocation은 null', () => {
    const { result } = renderHook(() => useGeolocation());
    expect(result.current.currentLocation).toBeNull();
  });

  it('renderHook: geolocation 미지원 시 handleGPS 에러 처리', async () => {
    Object.defineProperty(navigator, 'geolocation', {
      value: undefined,
      writable: true,
      configurable: true,
    });
    const { result } = renderHook(() => useGeolocation());
    await act(async () => {
      await result.current.handleGPS();
    });
    // geolocation 미지원 시 gpsLoading이 false 유지 (에러 표시 후 종료)
    expect(result.current.gpsLoading).toBe(false);
  });

  it('renderHook: GPS 성공 시 currentLocation 업데이트', async () => {
    mockGeolocation.getCurrentPosition.mockImplementation(
      (success: (pos: GeolocationPosition) => void) => {
        success({
          coords: { latitude: 37.5663, longitude: 126.9779, accuracy: 10 },
        } as GeolocationPosition);
      }
    );
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ address: '서울시청' }),
    } as unknown as Response);

    const { result } = renderHook(() => useGeolocation());
    await act(async () => {
      result.current.handleGPS();
      // 마이크로태스크 플러시 (fetch resolve 포함)
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.currentLocation).toEqual({ lat: 37.5663, lng: 126.9779 });
  });
});
