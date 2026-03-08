/**
 * 푸시 알림 전송 API (관리자용)
 *
 * 모든 구독자에게 알림을 브로드캐스트하거나 특정 사용자에게 전송합니다.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  broadcastNotification,
  sendPushNotification,
} from '@/lib/push-notifications';
import { prisma } from '@/lib/db/prisma';

/**
 * 관리자 인증 (간단한 토큰 기반)
 */
function isAdmin(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  return token === process.env.ADMIN_API_TOKEN;
}

/**
 * 알림 전송
 */
export async function POST(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { title, body: message, icon, url, sessionId } = body;

    if (!title || !message) {
      return NextResponse.json(
        { error: 'Title and body are required' },
        { status: 400 }
      );
    }

    const payload = { title, body: message, icon, url };

    let result;

    if (sessionId) {
      // 특정 사용자에게 전송
      const subscription = await prisma.pushSubscription.findFirst({
        where: { sessionId },
      });

      if (!subscription) {
        return NextResponse.json(
          { error: 'Subscription not found for this session' },
          { status: 404 }
        );
      }

      await sendPushNotification(
        {
          endpoint: subscription.endpoint,
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
        payload
      );

      result = { total: 1, successful: 1, failed: 0, expired: 0 };
    } else {
      // 모든 사용자에게 브로드캐스트
      result = await broadcastNotification(payload);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to send notification:', error);
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}
