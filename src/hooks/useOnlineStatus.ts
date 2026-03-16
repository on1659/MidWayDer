'use client';

import { useState, useEffect } from 'react';

/**
 * 네트워크 연결 상태를 추적하는 훅
 * @returns {boolean} 온라인 상태면 true, 오프라인이면 false
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(true); // 기본값 true로 시작 (SSR 안전)

  useEffect(() => {
    // 클라이언트 마운트 후 실제 온라인 상태로 업데이트
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
