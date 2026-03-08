/**
 * 푸시 알림 구독 API
 *
 * POST: 구독 등록
 * DELETE: 구독 해지
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  saveSubscription,
  deleteSubscription,
  type PushSubscriptionData,
} from '@/lib/push-notifications';

/**
 * 구독 등록
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subscription, sessionId } = body as {
      subscription: PushSubscriptionData;
      sessionId?: string;
    };

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json(
        { error: 'Invalid subscription data' },
        { status: 400 }
      );
    }

    const userAgent = request.headers.get('user-agent') || undefined;

    await saveSubscription(subscription, sessionId, userAgent);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save subscription:', error);
    return NextResponse.json(
      { error: 'Failed to save subscription' },
      { status: 500 }
    );
  }
}

/**
 * 구독 해지
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Endpoint is required' },
        { status: 400 }
      );
    }

    await deleteSubscription(endpoint);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete subscription:', error);
    return NextResponse.json(
      { error: 'Failed to delete subscription' },
      { status: 500 }
    );
  }
}
