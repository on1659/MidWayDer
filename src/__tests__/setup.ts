/**
 * Global test setup — jsdom 환경 전용
 * setupFiles에 등록하지 않고, 각 jsdom 테스트 파일에서 필요 시 사용하거나
 * 파일별 beforeAll/beforeEach에서 직접 설정합니다.
 */
import { vi } from 'vitest';

// matchMedia 모킹 (useTheme 등에서 window.matchMedia 사용)
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // navigator.geolocation 모킹
  if (!navigator.geolocation) {
    Object.defineProperty(navigator, 'geolocation', {
      writable: true,
      configurable: true,
      value: {
        getCurrentPosition: vi.fn(),
        watchPosition: vi.fn(),
        clearWatch: vi.fn(),
      },
    });
  }
}
