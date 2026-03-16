'use client';

import { useSyncExternalStore } from 'react';

/**
 * 네트워크 연결 상태를 추적하는 훅
 * @returns {boolean} 온라인 상태면 true, 오프라인이면 false
 */
function getSnapshot(): boolean {
  // Node.js/테스트 환경에서 navigator가 없을 수 있음
  if (typeof navigator === 'undefined') {
    return true;
  }
  return navigator.onLine;
}

function getServerSnapshot(): boolean {
  return true; // SSR에서는 기본값 true
}

function subscribe(callback: () => void): () => void {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
