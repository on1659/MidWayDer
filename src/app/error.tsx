'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

/**
 * Next.js Root Error Boundary
 * 앱 전체에서 포착되지 않은 에러를 처리
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to console (Sentry would capture this in production)
    console.error('[App Error]', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center">
      <AlertTriangle className="w-16 h-16 text-red-500 mb-6" />
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
        문제가 발생했어요
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
        예상치 못한 오류가 발생했습니다. 잠시 후 다시 시도해주세요.
      </p>
      <div className="flex gap-4">
        <button
          onClick={reset}
          className="flex items-center gap-2 px-6 py-3 text-base font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
        >
          <RefreshCw className="w-5 h-5" />
          다시 시도
        </button>
        <button
          onClick={() => (window.location.href = '/')}
          className="flex items-center gap-2 px-6 py-3 text-base font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors dark:text-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700"
        >
          <Home className="w-5 h-5" />
          홈으로
        </button>
      </div>
    </div>
  );
}
