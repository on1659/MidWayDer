'use client';

import { useEffect } from 'react';

/**
 * Service Worker 등록 컴포넌트 (v0.68.0 개선)
 * - 오프라인 지원 강화
 * - 백그라운드 동기화
 * - 푸시 알림 준비
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        console.log('[SW] Service Worker registered:', registration.scope);

        // 업데이트 감지
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // 새 버전 감지 - 사용자에게 알림
                console.log('[SW] New version available!');
                // 선택적: 사용자에게 업데이트 알림 표시
              }
            });
          }
        });

        // 백그라운드 동기화 등록 (지원하는 경우)
        if ('sync' in registration) {
          try {
            await (registration as any).sync.register('sync-favorites');
            console.log('[SW] Background sync registered');
          } catch (syncError) {
            console.debug('[SW] Background sync not supported:', syncError);
          }
        }

        // 주기적 동기화 (지원하는 경우)
        if ('periodicSync' in registration) {
          try {
            const status = await navigator.permissions.query({ name: 'periodic-background-sync' as PermissionName });
            if (status.state === 'granted') {
              await (registration as any).periodicSync.register('update-cache', {
                minInterval: 24 * 60 * 60 * 1000, // 24시간
              });
              console.log('[SW] Periodic sync registered');
            }
          } catch (periodicSyncError) {
            console.debug('[SW] Periodic sync not supported:', periodicSyncError);
          }
        }

      } catch (error) {
        console.error('[SW] Service Worker registration failed:', error);
      }
    };

    // 지연 등록 (초기 로딩 성능 향상)
    if (document.readyState === 'complete') {
      setTimeout(registerSW, 1000);
    } else {
      window.addEventListener('load', () => setTimeout(registerSW, 1000));
    }

    // 컨트롤러 변경 감지 (새 SW 활성화)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[SW] Controller changed - new SW activated');
    });

  }, []);

  return null;
}
