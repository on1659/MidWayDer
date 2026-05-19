'use client';

import { useEffect } from 'react';

type SyncManagerLike = {
  register: (tag: string) => Promise<void>;
};

type PeriodicSyncManagerLike = {
  register: (tag: string, options: { minInterval: number }) => Promise<void>;
};

type ServiceWorkerRegistrationWithSync = ServiceWorkerRegistration & {
  sync?: SyncManagerLike;
  periodicSync?: PeriodicSyncManagerLike;
};

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
        const extendedRegistration = registration as ServiceWorkerRegistrationWithSync;

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
        if (extendedRegistration.sync) {
          try {
            await extendedRegistration.sync.register('sync-search-queue');
            console.log('[SW] Background sync registered');
          } catch (syncError) {
            console.debug('[SW] Background sync not supported:', syncError);
          }
        }

        // 주기적 동기화 (지원하는 경우)
        if (extendedRegistration.periodicSync) {
          try {
            const status = await navigator.permissions.query({ name: 'periodic-background-sync' as PermissionName });
            if (status.state === 'granted') {
              await extendedRegistration.periodicSync.register('update-cache', {
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
