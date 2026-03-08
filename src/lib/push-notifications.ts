/**
 * Web Push 알림 유틸리티
 *
 * VAPID 프로토콜을 사용하여 PWA 푸시 알림을 관리합니다.
 */

import webpush from 'web-push';
import { prisma } from './db/prisma';

// VAPID 설정 초기화
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:contact@midwayder.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  url?: string;
}

/**
 * 구독 정보 저장
 */
export async function saveSubscription(
  subscription: PushSubscriptionData,
  sessionId?: string,
  userAgent?: string
) {
  return prisma.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    update: {
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      userAgent,
      sessionId,
      lastUsedAt: new Date(),
    },
    create: {
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      userAgent,
      sessionId,
    },
  });
}

/**
 * 구독 삭제
 */
export async function deleteSubscription(endpoint: string) {
  return prisma.pushSubscription.delete({
    where: { endpoint },
  });
}

/**
 * 세션 ID로 구독 조회
 */
export async function getSubscriptionBySession(sessionId: string) {
  return prisma.pushSubscription.findFirst({
    where: { sessionId },
  });
}

/**
 * 엔드포인트로 구독 존재 여부 확인
 */
export async function hasSubscription(endpoint: string): Promise<boolean> {
  const count = await prisma.pushSubscription.count({
    where: { endpoint },
  });
  return count > 0;
}

/**
 * 단일 구독에 알림 전송
 */
export async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: NotificationPayload
) {
  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  };

  return webpush.sendNotification(
    pushSubscription,
    JSON.stringify(payload)
  );
}

/**
 * 모든 구독에 알림 브로드캐스트
 */
export async function broadcastNotification(payload: NotificationPayload) {
  const subscriptions = await prisma.pushSubscription.findMany();

  if (subscriptions.length === 0) {
    return { total: 0, successful: 0, failed: 0 };
  }

  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      sendPushNotification(
        {
          endpoint: sub.endpoint,
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
        payload
      )
    )
  );

  // 만료된 구독 정리 (410 Gone 응답)
  const expiredEndpoints: string[] = [];

  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      const error = result.reason as Error;
      if (error.message?.includes('410') || error.message?.includes('expired')) {
        expiredEndpoints.push(subscriptions[index].endpoint);
      }
    }
  });

  // 만료된 구독 일괄 삭제
  if (expiredEndpoints.length > 0) {
    await prisma.pushSubscription.deleteMany({
      where: { endpoint: { in: expiredEndpoints } },
    });
  }

  return {
    total: subscriptions.length,
    successful: results.filter((r) => r.status === 'fulfilled').length,
    failed: results.filter((r) => r.status === 'rejected').length,
    expired: expiredEndpoints.length,
  };
}

/**
 * VAPID 공개키 조회
 */
export function getVapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY || null;
}

/**
 * VAPID 키가 설정되어 있는지 확인
 */
export function isVapidConfigured(): boolean {
  return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}
