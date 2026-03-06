/**
 * useHaptic - Haptic feedback hook
 *
 * 모바일 기기에서 햅틱 피드백(진동)을 제공합니다.
 * navigator.vibrate() API를 사용하며, 미지원 기기에서는 조용히 실패합니다.
 */

'use client';

import { useCallback, useMemo } from 'react';

// 진동 패턴 (ms)
const HAPTIC_PATTERNS = {
  tap: [10],
  success: [10, 50, 10],
  error: [50, 100, 50],
  warning: [30],
  medium: [20],
  heavy: [30, 10, 30],
} as const;

type HapticType = keyof typeof HAPTIC_PATTERNS;

interface UseHapticReturn {
  isSupported: boolean;
  tap: () => void;
  success: () => void;
  error: () => void;
  warning: () => void;
  medium: () => void;
  heavy: () => void;
  custom: (pattern: number | number[]) => void;
}

export function useHaptic(): UseHapticReturn {
  // SSR 안전하게 체크
  const isSupported = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return typeof navigator !== 'undefined' && 'vibrate' in navigator;
  }, []);

  const vibrate = useCallback((pattern: number | number[]) => {
    if (!isSupported) return;

    try {
      navigator.vibrate(pattern);
    } catch {
      // 진동 실패 시 조용히 무시
    }
  }, [isSupported]);

  const createHaptic = useCallback((type: HapticType) => {
    return () => vibrate([...HAPTIC_PATTERNS[type]]);
  }, [vibrate]);

  const custom = useCallback((pattern: number | number[]) => {
    vibrate(pattern);
  }, [vibrate]);

  return useMemo(() => ({
    isSupported,
    tap: createHaptic('tap'),
    success: createHaptic('success'),
    error: createHaptic('error'),
    warning: createHaptic('warning'),
    medium: createHaptic('medium'),
    heavy: createHaptic('heavy'),
    custom,
  }), [isSupported, createHaptic, custom]);
}

export default useHaptic;
