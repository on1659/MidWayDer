'use client';

import { useEffect } from 'react';

/**
 * Service Worker 등록 컴포넌트
 * 클라이언트에서 한 번만 실행되어 Service Worker를 등록합니다.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[SW] Service Worker registered:', registration.scope);
        })
        .catch((error) => {
          console.error('[SW] Service Worker registration failed:', error);
        });
    }
  }, []);

  return null;
}
