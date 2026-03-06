'use client';

import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { WifiOff } from 'lucide-react';

/**
 * 오프라인 상태를 감지하고 사용자에게 알리는 배너 컴포넌트
 * - 오프라인 시 상단에 빨간 배너 표시
 */
export function OfflineBanner() {
  const isOnline = useOnlineStatus();

  // 오프라인 배너
  if (!isOnline) {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className="fixed top-0 left-0 right-0 z-[9999] bg-red-500 text-white py-2.5 px-4 text-center text-sm font-medium shadow-lg animate-slide-down"
      >
        <WifiOff className="inline w-4 h-4 mr-2 -mt-0.5" aria-hidden="true" />
        오프라인 상태입니다. 일부 기능이 제한될 수 있습니다.
      </div>
    );
  }

  return null;
}
