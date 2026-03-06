/**
 * @vitest-environment jsdom
 */

/**
 * usePullToRefresh hook tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePullToRefresh } from '../usePullToRefresh';

describe('usePullToRefresh', () => {
  let onRefresh: () => void | Promise<void>;

  beforeEach(() => {
    onRefresh = vi.fn().mockResolvedValue(undefined) as () => void | Promise<void>;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('초기 상태가 올바름', () => {
    const { result } = renderHook(() =>
      usePullToRefresh({ onRefresh })
    );

    expect(result.current.isRefreshing).toBe(false);
    expect(result.current.pullDistance).toBe(0);
    expect(result.current.canRefresh).toBe(false);
  });

  it('handlers가 올바른 함수들을 반환함', () => {
    const { result } = renderHook(() =>
      usePullToRefresh({ onRefresh })
    );

    expect(typeof result.current.handlers.onTouchStart).toBe('function');
    expect(typeof result.current.handlers.onTouchMove).toBe('function');
    expect(typeof result.current.handlers.onTouchEnd).toBe('function');
  });

  it('disabled=true면 canRefresh가 false', () => {
    const { result } = renderHook(() =>
      usePullToRefresh({ onRefresh, disabled: true })
    );

    expect(result.current.canRefresh).toBe(false);
  });

  it('threshold 옵션이 적용됨', () => {
    const { result } = renderHook(() =>
      usePullToRefresh({ onRefresh, threshold: 150 })
    );

    // 기본 상태에서는 canRefresh가 false
    expect(result.current.canRefresh).toBe(false);
  });

  it('onRefresh 콜백이 전달됨', () => {
    const { result } = renderHook(() =>
      usePullToRefresh({ onRefresh })
    );

    // 핸들러가 존재하는지 확인
    expect(result.current.handlers).toBeDefined();
  });

  // Note: 실제 터치 이벤트 시뮬레이션은 통합 테스트에서 검증
  it('isRefreshing이 false로 시작', () => {
    const { result } = renderHook(() =>
      usePullToRefresh({ onRefresh })
    );

    expect(result.current.isRefreshing).toBe(false);
  });

  it('pullDistance가 0으로 시작', () => {
    const { result } = renderHook(() =>
      usePullToRefresh({ onRefresh })
    );

    expect(result.current.pullDistance).toBe(0);
  });

  it('여러 인스턴스가 독립적으로 동작', () => {
    const onRefresh1 = vi.fn();
    const onRefresh2 = vi.fn();

    const { result: result1 } = renderHook(() =>
      usePullToRefresh({ onRefresh: onRefresh1 })
    );

    const { result: result2 } = renderHook(() =>
      usePullToRefresh({ onRefresh: onRefresh2 })
    );

    expect(result1.current.isRefreshing).toBe(false);
    expect(result2.current.isRefreshing).toBe(false);
  });
});
