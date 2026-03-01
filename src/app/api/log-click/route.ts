/**
 * POST /api/log-click - 경유지 클릭 로그
 *
 * 사용자가 검색 결과에서 경유지를 클릭했을 때 호출됩니다.
 * CTR(Click-Through Rate) 추적 및 알고리즘 정확도 검증에 사용됩니다.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/logger';

const ClickLogSchema = z.object({
  placeId: z.string().min(1).max(100),
  rank: z.number().int().min(1).max(100),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = ClickLogSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_ERROR', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { placeId, rank } = parsed.data;
    const sessionId = request.cookies.get('sessionId')?.value || null;

    // 최근 검색 로그 찾기 (같은 세션, 10분 이내)
    const recentSearchLog = await prisma.searchLog.findFirst({
      where: {
        sessionId: sessionId || undefined,
        timestamp: {
          gte: new Date(Date.now() - 10 * 60 * 1000), // 10분
        },
      },
      orderBy: { timestamp: 'desc' },
    });

    if (!recentSearchLog) {
      // 검색 로그 없으면 무시 (analytics에서 제외)
      logger.warn('[ClickLog] No recent search log found, skipping log');
      return NextResponse.json({ success: true, skipped: true });
    }

    // 클릭 로그 저장
    await prisma.clickLog.create({
      data: {
        searchLogId: recentSearchLog.id,
        placeId,
        rank,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    logger.error('[API /log-click] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
