'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, BellOff, AlertCircle } from 'lucide-react';

interface NotificationSettingsProps {
  sessionId?: string;
}

export function NotificationSettings({ sessionId }: NotificationSettingsProps) {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [endpoint, setEndpoint] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
      checkSubscriptionStatus();
    }
  }, []);

  const checkSubscriptionStatus = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        setSubscribed(true);
        setEndpoint(subscription.endpoint);
      }
    } catch (error) {
      console.error('Failed to check subscription status:', error);
    }
  };

  const subscribeToPush = useCallback(async () => {
    setLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;

      // VAPID 공개키 가져오기
      const vapidResponse = await fetch('/api/notifications/vapid-public-key');
      const { publicKey } = await vapidResponse.json();

      if (!publicKey) {
        throw new Error('VAPID public key not available');
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

      setSubscribed(true);
      setEndpoint(subscription.endpoint);
    } catch (error) {
      console.error('Failed to subscribe:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const unsubscribeFromPush = useCallback(async () => {
    setLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // 브라우저에서 구독 해지
        await subscription.unsubscribe();

        // 서버에서도 구독 정보 삭제
        await fetch('/api/notifications/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
      }

      setSubscribed(false);
      setEndpoint(null);
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleNotifications = useCallback(async () => {
    if (!('Notification' in window)) {
      alert('이 브라우저는 알림을 지원하지 않습니다.');
      return;
    }

    if (Notification.permission === 'denied') {
      alert('알림 권한이 차단되어 있습니다. 브라우저 설정에서 허용해주세요.');
      return;
    }

    try {
      if (Notification.permission === 'default') {
        const result = await Notification.requestPermission();
        setPermission(result);
        if (result === 'granted') {
          await subscribeToPush();
        }
      } else if (Notification.permission === 'granted') {
        if (subscribed) {
          await unsubscribeFromPush();
        } else {
          await subscribeToPush();
        }
      }
    } catch (error) {
      console.error('Failed to toggle notifications:', error);
      alert('알림 설정 중 오류가 발생했습니다.');
    }
  }, [subscribed, subscribeToPush, unsubscribeFromPush]);

  const getStatusText = () => {
    if (permission === 'denied') return '알림이 차단됨';
    if (subscribed) return '알림 수신 중';
    return '알림 끔';
  };

  const getStatusColor = () => {
    if (permission === 'denied') return 'text-red-500';
    if (subscribed) return 'text-blue-500';
    return 'text-gray-400';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {permission === 'granted' && subscribed ? (
            <Bell className={`w-5 h-5 ${getStatusColor()}`} />
          ) : permission === 'denied' ? (
            <AlertCircle className={`w-5 h-5 ${getStatusColor()}`} />
          ) : (
            <BellOff className={`w-5 h-5 ${getStatusColor()}`} />
          )}
          <div>
            <p className="font-medium text-sm text-gray-900 dark:text-white">
              푸시 알림
            </p>
            <p className={`text-xs ${getStatusColor()}`}>
              {getStatusText()}
            </p>
          </div>
        </div>
        <button
          onClick={toggleNotifications}
          disabled={loading || permission === 'denied'}
          className={`relative w-11 h-6 rounded-full transition-colors ${
            subscribed ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
          } ${(loading || permission === 'denied') ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          aria-label={subscribed ? '알림 끄기' : '알림 켜기'}
        >
          <span
            className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
              subscribed ? 'translate-x-5' : ''
            }`}
          />
        </button>
      </div>

      {permission === 'denied' && (
        <p className="text-xs text-red-500 mt-2">
          브라우저 설정에서 알림 권한을 허용해주세요.
        </p>
      )}

      {subscribed && endpoint && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          구독 ID: {endpoint.slice(0, 30)}...
        </p>
      )}
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
