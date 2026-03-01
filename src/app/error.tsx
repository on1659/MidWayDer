'use client';

import { useEffect } from 'react';
import { logger } from '@/lib/logger';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    logger.error('[App Error]', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <p className="text-4xl mb-4">⚠️</p>
        <h2 className="text-lg font-bold mb-2">문제가 발생했어요</h2>
        <p className="text-sm text-gray-500 mb-6">
          일시적인 오류입니다. 다시 시도해 주세요.
        </p>
        <button
          onClick={reset}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium"
        >
          다시 시도
        </button>
      </div>
    </div>
  );
}
