/**
 * CacheSettings - 캐시 관리 컴포넌트
 */

'use client';

import { useState } from 'react';
import { Trash2, Database } from 'lucide-react';
import { useCacheStats } from '@/hooks/useCacheStats';
import { db } from '@/lib/cache/search-cache';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export function CacheSettings() {
  const stats = useCacheStats();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  const handleClearCache = async () => {
    setIsDeleting(true);
    setShowConfirm(false);

    try {
      await db.searches.clear();
      setDeleteSuccess(true);
      setTimeout(() => setDeleteSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to clear cache:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <Database className="w-6 h-6 text-blue-500" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            캐시 관리
          </h2>
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-300">
              캐시된 검색:
            </span>
            <span className="font-medium text-gray-900 dark:text-white">
              {stats.count}개
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-300">사용량:</span>
            <span className="font-medium text-gray-900 dark:text-white">
              약 {stats.sizeKB}KB
            </span>
          </div>

          {stats.lastUpdated && (
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-300">
                마지막 업데이트:
              </span>
              <span className="font-medium text-gray-900 dark:text-white">
                {stats.lastUpdated.toLocaleString('ko-KR')}
              </span>
            </div>
          )}
        </div>

        {deleteSuccess && (
          <div className="mb-4 p-3 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-lg">
            ✅ 캐시가 삭제되었습니다.
          </div>
        )}

        <button
          onClick={() => setShowConfirm(true)}
          disabled={isDeleting || stats.count === 0}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
        >
          <Trash2 className="w-5 h-5" />
          {isDeleting ? '삭제 중...' : '캐시 삭제'}
        </button>

        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          💡 캐시를 삭제하면 오프라인에서 이전 검색 결과를 볼 수 없습니다.
        </p>
      </div>

      <ConfirmDialog
        isOpen={showConfirm}
        title="캐시 삭제"
        message="정말로 캐시를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
        confirmText="삭제"
        onConfirm={handleClearCache}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  );
}
