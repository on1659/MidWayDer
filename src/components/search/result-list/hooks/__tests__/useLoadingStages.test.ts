// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLoadingStages } from '../useLoadingStages';
import { LOADING_STAGES } from '../../utils';

describe('useLoadingStages', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('isLoading=false이면 loadingStage=0', () => {
    const { result } = renderHook(() => useLoadingStages(false));
    expect(result.current.loadingStage).toBe(0);
  });

  it('isLoading=true이면 타이머 경과 후 stage 1로 증가', async () => {
    const { result } = renderHook(() => useLoadingStages(true));

    act(() => vi.advanceTimersByTime(LOADING_STAGES[1].delay));
    expect(result.current.loadingStage).toBe(1);
  });

  it('isLoading=true이면 충분한 시간 후 stage 2로 증가', () => {
    const { result } = renderHook(() => useLoadingStages(true));

    act(() => vi.advanceTimersByTime(LOADING_STAGES[2].delay));
    expect(result.current.loadingStage).toBe(2);
  });

  it('isLoading이 false로 바뀌면 stage 리셋', () => {
    const { result, rerender } = renderHook(
      ({ loading }) => useLoadingStages(loading),
      { initialProps: { loading: true } }
    );

    act(() => vi.advanceTimersByTime(LOADING_STAGES[1].delay));
    expect(result.current.loadingStage).toBe(1);

    rerender({ loading: false });
    expect(result.current.loadingStage).toBe(0);
  });

  it('currentStageName이 현재 단계 텍스트 반환', () => {
    const { result } = renderHook(() => useLoadingStages(true));
    expect(result.current.currentStageName).toBe(LOADING_STAGES[0].text);

    act(() => vi.advanceTimersByTime(LOADING_STAGES[1].delay));
    expect(result.current.currentStageName).toBe(LOADING_STAGES[1].text);
  });
});
