/**
 * SyncStatus - 동기화 상태 표시 컴포넌트
 * 
 * v0.58.0: 오프라인/동기화 상태를 시각적으로 표시
 */

/* eslint-disable react-hooks/purity */

'use client';

import { Cloud, CloudOff, RefreshCw, CheckCircle } from 'lucide-react';
import { useSyncStatus } from '@/hooks/useSyncStatus';
import { useMemo } from 'react';

export function SyncStatus() {
  const { isOnline, isSyncing, pendingCount, lastSyncTime, supported } = useSyncStatus();
  
  // 동기화 완료 후 3초간 성공 표시
  const showSuccess = useMemo(() => {
    if (!lastSyncTime || isSyncing || pendingCount > 0) return false;
    const elapsed = Date.now() - lastSyncTime.getTime();
    return elapsed < 3000;
  }, [lastSyncTime, isSyncing, pendingCount]);

  // 지원하지 않는 브라우저
  if (!supported) {
    return null;
  }

  // 온라인 + 대기 없음 + 동기화 중 아님 + 성공 메시지 없음
  if (isOnline && pendingCount === 0 && !isSyncing && !showSuccess) {
    return null;
  }

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 transition-all duration-300"
      role="status"
      aria-live="polite"
    >
      {/* 오프라인 상태 */}
      {!isOnline && (
        <>
          <CloudOff className="w-4 h-4 text-gray-500" aria-hidden="true" />
          <span className="text-sm text-gray-600 dark:text-gray-300">오프라인</span>
        </>
      )}

      {/* 동기화 중 */}
      {isOnline && isSyncing && (
        <>
          <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" aria-hidden="true" />
          <span className="text-sm text-gray-600 dark:text-gray-300">동기화 중...</span>
        </>
      )}

      {/* 대기 중인 항목 있음 */}
      {isOnline && !isSyncing && pendingCount > 0 && (
        <>
          <Cloud className="w-4 h-4 text-yellow-500" aria-hidden="true" />
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {pendingCount}개 대기 중
          </span>
        </>
      )}

      {/* 동기화 완료 */}
      {isOnline && !isSyncing && pendingCount === 0 && showSuccess && (
        <>
          <CheckCircle className="w-4 h-4 text-green-500" aria-hidden="true" />
          <span className="text-sm text-gray-600 dark:text-gray-300">동기화 완료</span>
        </>
      )}
    </div>
  );
}

/**
 * 인라인 동기화 상태 (설정 페이지용)
 */
export function SyncStatusInline() {
  const { isOnline, isSyncing, pendingCount, supported } = useSyncStatus();

  if (!supported) {
    return (
      <div className="text-sm text-gray-500">
        이 브라우저는 백그라운드 동기화를 지원하지 않습니다
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      {/* 네트워크 상태 */}
      <div className="flex items-center gap-2">
        <div
          className={`w-2 h-2 rounded-full ${
            isOnline ? 'bg-green-500' : 'bg-gray-400'
          }`}
          aria-hidden="true"
        />
        <span className="text-sm text-gray-600 dark:text-gray-300">
          {isOnline ? '온라인' : '오프라인'}
        </span>
      </div>

      {/* 동기화 상태 */}
      {isSyncing && (
        <div className="flex items-center gap-2">
          <RefreshCw className="w-3 h-3 text-blue-500 animate-spin" aria-hidden="true" />
          <span className="text-sm text-gray-600 dark:text-gray-300">동기화 중</span>
        </div>
      )}

      {/* 대기 항목 */}
      {pendingCount > 0 && (
        <div className="text-sm text-yellow-600 dark:text-yellow-400">
          {pendingCount}개 대기 중
        </div>
      )}
    </div>
  );
}
