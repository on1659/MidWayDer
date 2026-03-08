'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, X } from 'lucide-react';

interface NotificationPermissionBannerProps {
  sessionId?: string;
}

export function NotificationPermissionBanner({ sessionId }: NotificationPermissionBannerProps) {
  const [show, setShow] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
      // 3초 후에 표시 (너무 바로 뜨지 않게)
      const timer = setTimeout(() => {
        if (Notification.permission === 'default') {
          setShow(true);
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      alert('이 브라우저는 알림을 지원하지 않습니다.');
      return;
    }

    setLoading(true);

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        // Service Worker 등록 후 구독
        const registration = await navigator.serviceWorker.ready;

        // VAPID 공개키 가져오기
        const vapidResponse = await fetch('/api/notifications/vapid-public-key');
        const { publicKey } = await vapidResponse.json();

        if (!publicKey) {
          console.error('VAPID public key not available');
          return;
        }

        // 푸시 구독 생성
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as BufferSource,
        });

        // 서버에 구독 정보 저장
        await fetch('/api/notifications/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription: subscription.toJSON(),
            sessionId,
          }),
        });

        setShow(false);
      }
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  if (!show || permission !== 'default') {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 z-50 border border-gray-200 dark:border-gray-700">
      <div className="flex items-start gap-3">
        <Bell className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-medium text-sm">알림 받기</h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            경로 관련 업데이트를 실시간으로 받아보세요.
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={requestPermission}
              disabled={loading}
              className="text-xs px-3 py-1.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {loading ? '처리 중...' : '허용'}
            </button>
            <button
              onClick={() => setShow(false)}
              className="text-xs px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              나중에
            </button>
          </div>
        </div>
        <button
          onClick={() => setShow(false)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/**
 * Base64 URL을 Uint8Array로 변환
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
