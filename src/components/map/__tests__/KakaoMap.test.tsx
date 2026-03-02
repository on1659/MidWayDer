// @vitest-environment jsdom
/**
 * KakaoMap cleanup 회귀 테스트
 * setTimeout 반환값 변수화 → unmount 시 clearTimeout 호출 확인
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';

// 환경변수 설정
vi.stubEnv('NEXT_PUBLIC_KAKAO_JS_KEY', 'test-app-key');

describe('KakaoMap — cleanup 타이머 누수 방지', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // 기존 스크립트 태그 초기화
    document.head.innerHTML = '';
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('스크립트 태그가 이미 존재할 때 unmount 시 clearInterval + clearTimeout 호출', async () => {
    // 기존 카카오 스크립트 태그를 DOM에 추가 (중복 방지 분기 진입)
    const existingScript = document.createElement('script');
    existingScript.src = 'https://dapi.kakao.com/v2/maps/sdk.js?appkey=test&autoload=false';
    document.head.appendChild(existingScript);

    // window.kakao가 없는 상태 → setInterval 분기 진입
    Object.defineProperty(window, 'kakao', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

    const KakaoMap = (await import('../KakaoMap')).default;
    const { unmount } = render(<KakaoMap />);

    // 컴포넌트 마운트 후 타이머가 등록됨 → unmount로 cleanup 실행
    unmount();

    // clearInterval, clearTimeout 둘 다 호출되어야 함
    expect(clearIntervalSpy).toHaveBeenCalled();
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it('SDK가 즉시 로드된 경우 타이머 없이 바로 완료 (setInterval 미실행)', async () => {
    // 즉시 로드 분기: window.kakao.maps.LatLng 존재 → setInterval/setTimeout 미실행
    class FakeMap {
      addControl = vi.fn();
    }
    class FakeLatLng {}

    Object.defineProperty(window, 'kakao', {
      value: {
        maps: {
          LatLng: FakeLatLng,
          Map: FakeMap,
          ZoomControl: class FakeZoomControl {},
          MapTypeControl: class FakeMapTypeControl {},
          ControlPosition: { RIGHT: 'RIGHT', TOPRIGHT: 'TOPRIGHT' },
        },
      },
      writable: true,
      configurable: true,
    });

    const setIntervalSpy = vi.spyOn(global, 'setInterval');

    const KakaoMap = (await import('../KakaoMap')).default;
    const { unmount } = render(<KakaoMap />);
    unmount();

    // 즉시 로드 분기에서는 setInterval 호출 없음 (타이머 등록 자체가 없어야 함)
    expect(setIntervalSpy).not.toHaveBeenCalled();
  });
});
