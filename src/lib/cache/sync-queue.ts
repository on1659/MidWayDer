/**
 * Sync Queue - 백그라운드 동기화 큐
 * 
 * v0.58.0: 오프라인 검색 요청을 큐에 저장하고 네트워크 복구 시 자동 동기화
 */

import Dexie, { Table } from 'dexie';
import { logger } from '@/lib/logger';

export type SyncItemType = 'search' | 'feedback' | 'directions';
export type SyncItemStatus = 'pending' | 'syncing' | 'completed' | 'failed';

export interface SyncQueueItem {
  id?: number;
  type: SyncItemType;
  payload: {
    endpoint: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: unknown;
    headers?: Record<string, string>;
  };
  createdAt: number;
  retryCount: number;
  maxRetries: number;
  status: SyncItemStatus;
  lastError?: string;
  completedAt?: number;
}

export class SyncQueueDB extends Dexie {
  syncQueue!: Table<SyncQueueItem, number>;

  constructor() {
    super('MidWayDerSyncQueue');
    this.version(1).stores({
      syncQueue: '++id, type, status, createdAt'
    });
  }
}

export const syncQueueDB = new SyncQueueDB();

/**
 * 큐에 아이템 추가
 */
export async function addToSyncQueue(
  type: SyncItemType,
  payload: SyncQueueItem['payload'],
  maxRetries: number = 3
): Promise<number> {
  try {
    const id = await syncQueueDB.syncQueue.add({
      type,
      payload,
      createdAt: Date.now(),
      retryCount: 0,
      maxRetries,
      status: 'pending'
    });
    
    logger.debug(`[SyncQueue] Added item ${id} to queue (type: ${type})`);
    return id;
  } catch (error) {
    logger.error('[SyncQueue] Failed to add item:', error);
    throw error;
  }
}

/**
 * 대기 중인 아이템 수 조회
 */
export async function getPendingCount(): Promise<number> {
  try {
    return await syncQueueDB.syncQueue
      .where('status')
      .equals('pending')
      .count();
  } catch (error) {
    logger.error('[SyncQueue] Failed to get pending count:', error);
    return 0;
  }
}

/**
 * 모든 대기 중인 아이템 조회
 */
export async function getPendingItems(): Promise<SyncQueueItem[]> {
  try {
    return await syncQueueDB.syncQueue
      .where('status')
      .equals('pending')
      .toArray();
  } catch (error) {
    logger.error('[SyncQueue] Failed to get pending items:', error);
    return [];
  }
}

/**
 * 아이템 상태 업데이트
 */
export async function updateItemStatus(
  id: number,
  status: SyncItemStatus,
  error?: string
): Promise<void> {
  try {
    const updates: Partial<SyncQueueItem> = { status };
    
    if (status === 'completed') {
      updates.completedAt = Date.now();
    }
    
    if (error) {
      updates.lastError = error;
    }
    
    await syncQueueDB.syncQueue.update(id, updates);
  } catch (err) {
    logger.error('[SyncQueue] Failed to update item status:', err);
  }
}

/**
 * 아이템 재시도 횟수 증가
 */
export async function incrementRetryCount(id: number): Promise<boolean> {
  try {
    const item = await syncQueueDB.syncQueue.get(id);
    if (!item) return false;
    
    const newRetryCount = item.retryCount + 1;
    
    if (newRetryCount >= item.maxRetries) {
      await updateItemStatus(id, 'failed', 'Max retries exceeded');
      return false;
    }
    
    await syncQueueDB.syncQueue.update(id, { 
      retryCount: newRetryCount,
      status: 'pending'
    });
    
    return true;
  } catch (error) {
    logger.error('[SyncQueue] Failed to increment retry count:', error);
    return false;
  }
}

/**
 * 완료된 아이템 정리 (7일 이상 된 항목)
 */
export async function cleanupCompletedItems(): Promise<number> {
  try {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const oldItems = await syncQueueDB.syncQueue
      .where('status')
      .equals('completed')
      .and(item => (item.completedAt || 0) < sevenDaysAgo)
      .toArray();
    
    await Promise.all(
      oldItems.map(item => syncQueueDB.syncQueue.delete(item.id!))
    );
    
    return oldItems.length;
  } catch (error) {
    logger.error('[SyncQueue] Failed to cleanup completed items:', error);
    return 0;
  }
}

/**
 * 큐 통계 조회
 */
export async function getSyncQueueStats(): Promise<{
  pending: number;
  syncing: number;
  completed: number;
  failed: number;
}> {
  try {
    const all = await syncQueueDB.syncQueue.toArray();
    
    return {
      pending: all.filter(i => i.status === 'pending').length,
      syncing: all.filter(i => i.status === 'syncing').length,
      completed: all.filter(i => i.status === 'completed').length,
      failed: all.filter(i => i.status === 'failed').length
    };
  } catch (error) {
    logger.error('[SyncQueue] Failed to get stats:', error);
    return { pending: 0, syncing: 0, completed: 0, failed: 0 };
  }
}
