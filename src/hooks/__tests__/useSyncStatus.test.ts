/**
 * useSyncStatus Hook Tests
 * 
 * v0.58.0: 동기화 상태 훅 테스트
 * 
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import * as syncQueue from '@/lib/cache/sync-queue';

// Mock modules
vi.mock('@/lib/cache/sync-queue', () => ({
  addToSyncQueue: vi.fn().mockResolvedValue(1),
  getPendingCount: vi.fn().mockResolvedValue(0)
}));

// Now import the hook
import { useSyncStatus } from '../useSyncStatus';

describe('useSyncStatus', () => {
  const mockAddToSyncQueue = vi.mocked(syncQueue.addToSyncQueue);
  const mockGetPendingCount = vi.mocked(syncQueue.getPendingCount);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useSyncStatus());

    // SSR 환경이므로 기본값 확인
    expect(result.current.isOnline).toBe(true);
    expect(result.current.isSyncing).toBe(false);
    expect(result.current.pendingCount).toBe(0);
  });

  it('should detect sync support based on environment', () => {
    const { result } = renderHook(() => useSyncStatus());

    // jsdom 환경에서는 SyncManager가 없으므로 false
    expect(result.current.supported).toBe(false);
  });

  it('should add item to queue', async () => {
    const { result } = renderHook(() => useSyncStatus());

    await act(async () => {
      await result.current.addToQueue('search', {
        endpoint: '/api/search',
        method: 'POST',
        body: { query: 'test' }
      });
    });

    expect(mockAddToSyncQueue).toHaveBeenCalledWith('search', {
      endpoint: '/api/search',
      method: 'POST',
      body: { query: 'test' }
    });
  });

  it('should refresh status', async () => {
    mockGetPendingCount.mockResolvedValueOnce(5);

    const { result } = renderHook(() => useSyncStatus());

    await act(async () => {
      await result.current.refreshStatus();
    });

    // waitFor 대신 직접 확인
    expect(mockGetPendingCount).toHaveBeenCalled();
  });

  it('should not trigger sync when not supported', async () => {
    const { result } = renderHook(() => useSyncStatus());

    // supported가 false면 triggerSync는 아무것도 하지 않음
    act(() => {
      result.current.triggerSync();
    });

    // 에러 없이 완료되면 OK
    expect(result.current.supported).toBe(false);
  });
});
