/**
 * SyncSettings - 동기화 설정 컴포넌트
 * 
 * v0.58.0: 백그라운드 동기화 상태 및 설정
 */

/* eslint-disable react-hooks/set-state-in-effect */

'use client';

import { RefreshCw, Cloud, CloudOff, Info } from 'lucide-react';
import { useSyncStatus } from '@/hooks/useSyncStatus';
import { getSyncQueueStats, cleanupCompletedItems } from '@/lib/cache/sync-queue';
import { useState, useEffect, useCallback } from 'react';

export function SyncSettings() {
  const { isOnline, isSyncing, pendingCount, supported, triggerSync } = useSyncStatus();
  const [stats, setStats] = useState({
    pending: 0,
    syncing: 0,
    completed: 0,
    failed: 0
  });

  const loadStats = useCallback(async () => {
    const queueStats = await getSyncQueueStats();
    setStats(queueStats);
  }, []);

  // 초기 로드
  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // pendingCount 변경 시 재조회
  useEffect(() => {
    loadStats();
  }, [pendingCount, loadStats]);

  const handleCleanup = async () => {
    const count = await cleanupCompletedItems();
    if (count > 0) {
      loadStats();
    }
  };

  return (
    <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <RefreshCw className="w-5 h-5" aria-hidden="true" />
        백그라운드 동기화
      </h2>

      {/* 브라우저 지원 여부 */}
      {!supported && (
        <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg flex items-start gap-2">
          <Info className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            이 브라우저는 백그라운드 동기화를 지원하지 않습니다. Chrome 또는 Edge를 사용하세요.
          </p>
        </div>
      )}

      {/* 네트워크 상태 */}
      <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Cloud className="w-5 h-5 text-green-500" aria-hidden="true" />
            ) : (
              <CloudOff className="w-5 h-5 text-gray-400" aria-hidden="true" />
            )}
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              네트워크 상태
            </span>
          </div>
          <span className={`text-sm ${isOnline ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}`}>
            {isOnline ? '온라인' : '오프라인'}
          </span>
        </div>
      </div>

      {/* 동기화 상태 */}
      <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            동기화 상태
          </span>
          {isSyncing ? (
            <span className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400">
              <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
              동기화 중...
            </span>
          ) : pendingCount > 0 ? (
            <span className="text-sm text-yellow-600 dark:text-yellow-400">
              {pendingCount}개 대기 중
            </span>
          ) : (
            <span className="text-sm text-green-600 dark:text-green-400">
              동기화됨
            </span>
          )}
        </div>

        {/* 수동 동기화 버튼 */}
        {supported && pendingCount > 0 && isOnline && (
          <button
            onClick={triggerSync}
            disabled={isSyncing}
            className="mt-2 w-full py-2 px-4 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-lg transition-colors text-sm font-medium"
          >
            {isSyncing ? '동기화 중...' : '지금 동기화'}
          </button>
        )}
      </div>

      {/* 큐 통계 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">대기 중</div>
          <div className="text-xl font-bold text-gray-900 dark:text-white">
            {stats.pending}
          </div>
        </div>
        <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">완료됨</div>
          <div className="text-xl font-bold text-green-600 dark:text-green-400">
            {stats.completed}
          </div>
        </div>
        <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">실패</div>
          <div className="text-xl font-bold text-red-600 dark:text-red-400">
            {stats.failed}
          </div>
        </div>
        <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">동기화 중</div>
          <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
            {stats.syncing}
          </div>
        </div>
      </div>

      {/* 정리 버튼 */}
      {stats.completed > 0 && (
        <button
          onClick={handleCleanup}
          className="mt-4 w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors text-sm"
        >
          완료된 항목 정리 ({stats.completed}개)
        </button>
      )}
    </section>
  );
}
