/**
 * useSyncStatus - 백그라운드 동기화 상태 훅
 * 
 * v0.58.0: Service Worker와 통신하여 동기화 상태 관리
 */

/* eslint-disable react-hooks/set-state-in-effect */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { addToSyncQueue, getPendingCount } from '@/lib/cache/sync-queue';
import type { SyncItemType, SyncQueueItem } from '@/lib/cache/sync-queue';
import { logger } from '@/lib/logger';

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncTime: Date | null;
  supported: boolean;
}

export interface UseSyncStatusReturn extends SyncStatus {
  addToQueue: (type: SyncItemType, payload: SyncQueueItem['payload']) => Promise<number>;
  triggerSync: () => void;
  refreshStatus: () => Promise<void>;
}

// 브라우저 환경인지 확인
const isBrowser = typeof window !== 'undefined';
const isServiceWorkerSupported = isBrowser && 'serviceWorker' in navigator;
const isSyncManagerSupported = isBrowser && 'SyncManager' in window;

// ServiceWorkerRegistration 타입 확장 (Background Sync API)
interface ServiceWorkerRegistrationWithSync extends ServiceWorkerRegistration {
  sync: {
    register: (tag: string) => Promise<void>;
  };
}

export function useSyncStatus(): UseSyncStatusReturn {
  const [status, setStatus] = useState<SyncStatus>({
    isOnline: isBrowser ? navigator.onLine : true,
    isSyncing: false,
    pendingCount: 0,
    lastSyncTime: null,
    supported: isSyncManagerSupported
  });

  // 상태 새로고침
  const refreshStatus = useCallback(async () => {
    try {
      const pendingCount = await getPendingCount();
      setStatus(prev => ({ ...prev, pendingCount }));
    } catch (error) {
      logger.error('[useSyncStatus] Failed to refresh status:', error);
    }
  }, []);

  // 동기화 트리거
  const triggerSync = useCallback(() => {
    if (!isSyncManagerSupported) {
      logger.warn('[useSyncStatus] Background sync not supported');
      return;
    }

    setStatus(prev => ({ ...prev, isSyncing: true }));

    navigator.serviceWorker.ready
      .then((registration) => {
        const regWithSync = registration as ServiceWorkerRegistrationWithSync;
        return regWithSync.sync.register('sync-search-queue');
      })
      .then(() => {
        logger.debug('[useSyncStatus] Sync registered');
      })
      .catch(error => {
        logger.error('[useSyncStatus] Failed to register sync:', error);
        setStatus(prev => ({ ...prev, isSyncing: false }));
      });
  }, []);

  // 큐에 아이템 추가
  const addToQueue = useCallback(async (
    type: SyncItemType,
    payload: SyncQueueItem['payload']
  ): Promise<number> => {
    try {
      const id = await addToSyncQueue(type, payload);
      
      // 새로운 pending 상태를 가져옴
      const newPendingCount = await getPendingCount();
      
      setStatus(prev => ({
        ...prev,
        pendingCount: newPendingCount
      }));
      
      // 온라인 상태면 즉시 동기화 시도
      if (status.isOnline && status.supported) {
        triggerSync();
      }
      
      return id;
    } catch (error) {
      logger.error('[useSyncStatus] Failed to add to queue:', error);
      throw error;
    }
  }, [status.isOnline, status.supported, triggerSync]);

  // 네트워크 상태 변경 감지
  useEffect(() => {
    if (!isBrowser) return;

    const handleOnline = () => {
      logger.debug('[useSyncStatus] Network online');
      setStatus(prev => {
        // 백그라운드 동기화 트리거
        if (prev.supported) {
          triggerSync();
        }
        return { ...prev, isOnline: true };
      });
    };

    const handleOffline = () => {
      logger.debug('[useSyncStatus] Network offline');
      setStatus(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [triggerSync]);

  // Service Worker 메시지 수신
  useEffect(() => {
    if (!isServiceWorkerSupported) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SYNC_COMPLETED') {
        logger.debug('[useSyncStatus] Sync completed');
        setStatus(prev => ({
          ...prev,
          isSyncing: false,
          lastSyncTime: new Date()
        }));
        // 비동기로 상태 새로고침
        refreshStatus().catch(err => 
          logger.error('[useSyncStatus] Refresh failed:', err)
        );
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, [refreshStatus]);

  // 초기 상태 로드
  useEffect(() => {
    refreshStatus().catch(err => 
      logger.error('[useSyncStatus] Initial refresh failed:', err)
    );
  }, [refreshStatus]);

  return {
    ...status,
    addToQueue,
    triggerSync,
    refreshStatus
  };
}
