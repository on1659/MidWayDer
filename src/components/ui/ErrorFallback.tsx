/**
 * Error Fallback - 에러 발생 시 표시되는 UI
 */

'use client';

import { AlertCircle } from 'lucide-react';

interface ErrorFallbackProps {
  /** 에러 메시지 */
  error: string;
  /** 재시도 핸들러 (선택적) */
  onRetry?: () => void;
  /** 컴팩트 모드 (작은 공간에 표시) */
  compact?: boolean;
}

export default function ErrorFallback({ error, onRetry, compact = false }: ErrorFallbackProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg text-sm">
        <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
        <p className="text-red-700 dark:text-red-400 flex-1">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-red-600 dark:text-red-500 font-medium hover:underline flex-shrink-0"
          >
            재시도
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] p-8 text-center">
      <AlertCircle size={48} className="text-red-500 mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
        오류가 발생했어요
      </h3>
      <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
        {error}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
        >
          다시 시도
        </button>
      )}
    </div>
  );
}
