/**
 * usePullToRefresh - Pull to refresh gesture hook
 *
 * 모바일에서 아래로 당겨서 새로고침하는 제스처를 지원합니다.
 * scrollTop이 0일 때만 동작하며, threshold 이상 당기면 onRefresh를 호출합니다.
 */

'use client';

import { useState, useCallback, useRef } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  threshold?: number;
  disabled?: boolean;
}

interface UsePullToRefreshReturn {
  isRefreshing: boolean;
  pullDistance: number;
  canRefresh: boolean;
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
  };
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  disabled = false,
}: UsePullToRefreshOptions): UsePullToRefreshReturn {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);

  const startY = useRef(0);
  const currentScrollTop = useRef(0);
  const isDragging = useRef(false);

  const canRefresh = pullDistance >= threshold && !isRefreshing && !disabled;

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || isRefreshing) return;

    const touch = e.touches[0];
    startY.current = touch.clientY;

    // 현재 스크롤 위치 저장
    const target = e.currentTarget as HTMLElement;
    currentScrollTop.current = target.scrollTop;

    // 스크롤이 최상단일 때만 드래그 시작
    if (currentScrollTop.current <= 0) {
      isDragging.current = true;
    }
  }, [disabled, isRefreshing]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current || disabled || isRefreshing) return;

    const touch = e.touches[0];
    const deltaY = touch.clientY - startY.current;

    // 아래로만 당길 때만 (양수)
    if (deltaY > 0) {
      // 저항감 추가 (거리가 멀어질수록 증가율 감소)
      const resistance = 0.5;
      const distance = deltaY * resistance;
      setPullDistance(Math.min(distance, threshold * 2));
    } else {
      setPullDistance(0);
    }
  }, [disabled, isRefreshing, threshold]);

  const onTouchEnd = useCallback(async () => {
    if (!isDragging.current) return;

    isDragging.current = false;

    if (pullDistance >= threshold && !isRefreshing && !disabled) {
      setIsRefreshing(true);
      setPullDistance(0);

      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    } else {
      // 애니메이션을 위해 천천히 줄어들도록
      setPullDistance(0);
    }
  }, [pullDistance, threshold, isRefreshing, disabled, onRefresh]);

  return {
    isRefreshing,
    pullDistance,
    canRefresh,
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
    },
  };
}

export default usePullToRefresh;
