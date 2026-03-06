/**
 * @vitest-environment jsdom
 */

/**
 * useHaptic hook tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHaptic } from '../useHaptic';

describe('useHaptic', () => {
  const originalVibrate = navigator.vibrate;

  beforeEach(() => {
    // navigator.vibrate 모킹
    Object.defineProperty(navigator, 'vibrate', {
      value: vi.fn(),
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    // 원래 값 복원
    Object.defineProperty(navigator, 'vibrate', {
      value: originalVibrate,
      writable: true,
      configurable: true,
    });
  });

  it('isSupported가 navigator.vibrate 존재 여부 반영', () => {
    const { result } = renderHook(() => useHaptic());
    expect(result.current.isSupported).toBe(true);
  });

  it('tap() 호출 시 [10] 진동', () => {
    const { result } = renderHook(() => useHaptic());

    act(() => {
      result.current.tap();
    });

    expect(navigator.vibrate).toHaveBeenCalledWith([10]);
  });

  it('success() 호출 시 [10, 50, 10] 진동', () => {
    const { result } = renderHook(() => useHaptic());

    act(() => {
      result.current.success();
    });

    expect(navigator.vibrate).toHaveBeenCalledWith([10, 50, 10]);
  });

  it('error() 호출 시 [50, 100, 50] 진동', () => {
    const { result } = renderHook(() => useHaptic());

    act(() => {
      result.current.error();
    });

    expect(navigator.vibrate).toHaveBeenCalledWith([50, 100, 50]);
  });

  it('warning() 호출 시 [30] 진동', () => {
    const { result } = renderHook(() => useHaptic());

    act(() => {
      result.current.warning();
    });

    expect(navigator.vibrate).toHaveBeenCalledWith([30]);
  });

  it('medium() 호출 시 [20] 진동', () => {
    const { result } = renderHook(() => useHaptic());

    act(() => {
      result.current.medium();
    });

    expect(navigator.vibrate).toHaveBeenCalledWith([20]);
  });

  it('heavy() 호출 시 [30, 10, 30] 진동', () => {
    const { result } = renderHook(() => useHaptic());

    act(() => {
      result.current.heavy();
    });

    expect(navigator.vibrate).toHaveBeenCalledWith([30, 10, 30]);
  });

  it('custom() 호출 시 커스텀 패턴 진동', () => {
    const { result } = renderHook(() => useHaptic());

    act(() => {
      result.current.custom([100, 200, 100]);
    });

    expect(navigator.vibrate).toHaveBeenCalledWith([100, 200, 100]);
  });

  it('custom() 호출 시 숫자 패턴 진동', () => {
    const { result } = renderHook(() => useHaptic());

    act(() => {
      result.current.custom(50);
    });

    expect(navigator.vibrate).toHaveBeenCalledWith(50);
  });

  it('미지원 브라우저에서도 에러 없이 동작', async () => {
    // 새로운 훅을 렌더링하기 전에 vibrate 제거
    const originalNavigator = global.navigator;
    Object.defineProperty(global, 'navigator', {
      value: {},
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useHaptic());

    // isSupported가 false여야 함
    expect(result.current.isSupported).toBe(false);

    // 에러 없이 호출 가능해야 함
    expect(() => {
      act(() => {
        result.current.tap();
        result.current.success();
        result.current.error();
      });
    }).not.toThrow();

    // 복원
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
  });

  it('vibrate가 throw해도 에러 없이 무시', () => {
    Object.defineProperty(navigator, 'vibrate', {
      value: vi.fn().mockImplementation(() => {
        throw new Error('Vibration not allowed');
      }),
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useHaptic());

    // 에러 없이 호출 가능해야 함
    expect(() => {
      act(() => {
        result.current.tap();
      });
    }).not.toThrow();
  });
});
