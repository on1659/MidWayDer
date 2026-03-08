/**
 * VAPID 공개키 조회 API
 *
 * 클라이언트에서 푸시 알림 구독 시 필요한 VAPID 공개키를 제공합니다.
 */

import { NextResponse } from 'next/server';
import { getVapidPublicKey, isVapidConfigured } from '@/lib/push-notifications';

export async function GET() {
  if (!isVapidConfigured()) {
    return NextResponse.json(
      { error: 'VAPID keys not configured' },
      { status: 500 }
    );
  }

  const publicKey = getVapidPublicKey();

  if (!publicKey) {
    return NextResponse.json(
      { error: 'VAPID public key not found' },
      { status: 500 }
    );
  }

  return NextResponse.json({ publicKey });
}
