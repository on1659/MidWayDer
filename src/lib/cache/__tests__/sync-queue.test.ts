/**
 * Sync Queue Tests
 * 
 * v0.58.0: 백그라운드 동기화 큐 테스트
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
  syncQueueDB, 
  addToSyncQueue, 
  getPendingCount, 
  getPendingItems,
  updateItemStatus,
  incrementRetryCount,
  cleanupCompletedItems,
  getSyncQueueStats
} from '../sync-queue';

// fake-indexeddb로 Dexie 테스트
import 'fake-indexeddb/auto';

describe('SyncQueue', () => {
  beforeEach(async () => {
    // 각 테스트 전에 DB 초기화
    await syncQueueDB.syncQueue.clear();
  });

  afterEach(async () => {
    await syncQueueDB.syncQueue.clear();
  });

  describe('addToSyncQueue', () => {
    it('should add item to queue', async () => {
      const id = await addToSyncQueue('search', {
        endpoint: '/api/search',
        method: 'POST',
        body: { query: 'test' }
      });

      expect(id).toBeGreaterThan(0);

      const items = await syncQueueDB.syncQueue.toArray();
      expect(items).toHaveLength(1);
      expect(items[0].type).toBe('search');
      expect(items[0].status).toBe('pending');
      expect(items[0].retryCount).toBe(0);
    });

    it('should set max retries', async () => {
      await addToSyncQueue('search', {
        endpoint: '/api/search',
        method: 'POST'
      }, 5);

      const items = await syncQueueDB.syncQueue.toArray();
      expect(items[0].maxRetries).toBe(5);
    });
  });

  describe('getPendingCount', () => {
    it('should return 0 when queue is empty', async () => {
      const count = await getPendingCount();
      expect(count).toBe(0);
    });

    it('should return correct count of pending items', async () => {
      await addToSyncQueue('search', { endpoint: '/api/search', method: 'POST' });
      await addToSyncQueue('feedback', { endpoint: '/api/feedback', method: 'POST' });
      
      // 하나는 완료 상태로 변경
      const items = await syncQueueDB.syncQueue.toArray();
      await updateItemStatus(items[0].id!, 'completed');

      const count = await getPendingCount();
      expect(count).toBe(1);
    });
  });

  describe('getPendingItems', () => {
    it('should return only pending items', async () => {
      await addToSyncQueue('search', { endpoint: '/api/search', method: 'POST' });
      await addToSyncQueue('feedback', { endpoint: '/api/feedback', method: 'POST' });

      const items = await syncQueueDB.syncQueue.toArray();
      await updateItemStatus(items[0].id!, 'completed');

      const pending = await getPendingItems();
      expect(pending).toHaveLength(1);
      expect(pending[0].type).toBe('feedback');
    });
  });

  describe('updateItemStatus', () => {
    it('should update status to completed', async () => {
      await addToSyncQueue('search', { endpoint: '/api/search', method: 'POST' });
      
      const items = await syncQueueDB.syncQueue.toArray();
      await updateItemStatus(items[0].id!, 'completed');

      const updated = await syncQueueDB.syncQueue.get(items[0].id!);
      expect(updated?.status).toBe('completed');
      expect(updated?.completedAt).toBeDefined();
    });

    it('should store error message', async () => {
      await addToSyncQueue('search', { endpoint: '/api/search', method: 'POST' });
      
      const items = await syncQueueDB.syncQueue.toArray();
      await updateItemStatus(items[0].id!, 'failed', 'Network error');

      const updated = await syncQueueDB.syncQueue.get(items[0].id!);
      expect(updated?.status).toBe('failed');
      expect(updated?.lastError).toBe('Network error');
    });
  });

  describe('incrementRetryCount', () => {
    it('should increment retry count', async () => {
      await addToSyncQueue('search', { endpoint: '/api/search', method: 'POST' });
      
      const items = await syncQueueDB.syncQueue.toArray();
      const canRetry = await incrementRetryCount(items[0].id!);
      
      expect(canRetry).toBe(true);

      const updated = await syncQueueDB.syncQueue.get(items[0].id!);
      expect(updated?.retryCount).toBe(1);
      expect(updated?.status).toBe('pending');
    });

    it('should mark as failed when max retries exceeded', async () => {
      await addToSyncQueue('search', { endpoint: '/api/search', method: 'POST' }, 2);
      
      const items = await syncQueueDB.syncQueue.toArray();
      
      await incrementRetryCount(items[0].id!); // retryCount: 1
      const canRetry = await incrementRetryCount(items[0].id!); // retryCount: 2 (max)
      
      expect(canRetry).toBe(false);

      const updated = await syncQueueDB.syncQueue.get(items[0].id!);
      expect(updated?.status).toBe('failed');
    });
  });

  describe('getSyncQueueStats', () => {
    it('should return correct stats', async () => {
      await addToSyncQueue('search', { endpoint: '/api/search', method: 'POST' });
      await addToSyncQueue('feedback', { endpoint: '/api/feedback', method: 'POST' });
      await addToSyncQueue('directions', { endpoint: '/api/directions', method: 'POST' });

      const items = await syncQueueDB.syncQueue.toArray();
      await updateItemStatus(items[0].id!, 'completed');
      await updateItemStatus(items[1].id!, 'failed');

      const stats = await getSyncQueueStats();
      
      expect(stats.pending).toBe(1);
      expect(stats.completed).toBe(1);
      expect(stats.failed).toBe(1);
      expect(stats.syncing).toBe(0);
    });
  });

  describe('cleanupCompletedItems', () => {
    it('should remove old completed items', async () => {
      await addToSyncQueue('search', { endpoint: '/api/search', method: 'POST' });
      
      const items = await syncQueueDB.syncQueue.toArray();
      await updateItemStatus(items[0].id!, 'completed');

      // 완료 시간을 8일 전으로 설정
      const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
      await syncQueueDB.syncQueue.update(items[0].id!, {
        completedAt: eightDaysAgo
      });

      const removed = await cleanupCompletedItems();
      expect(removed).toBe(1);

      const remaining = await syncQueueDB.syncQueue.toArray();
      expect(remaining).toHaveLength(0);
    });

    it('should not remove recent completed items', async () => {
      await addToSyncQueue('search', { endpoint: '/api/search', method: 'POST' });
      
      const items = await syncQueueDB.syncQueue.toArray();
      await updateItemStatus(items[0].id!, 'completed');

      const removed = await cleanupCompletedItems();
      expect(removed).toBe(0);

      const remaining = await syncQueueDB.syncQueue.toArray();
      expect(remaining).toHaveLength(1);
    });
  });
});
