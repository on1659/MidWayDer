/**
 * GET /api/popularity?placeIds=id1,id2,id3
 *
 * ClickLog 기반 실시간 인기도 조회
 * 최근 1시간 내 클릭 수를 장소별로 반환합니다.
 *
 * Response:
 * {
 *   success: true,
 *   data: { [placeId]: number }  // 최근 1시간 클릭 수
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const raw = searchParams.get('placeIds') || '';

  const placeIds = raw
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 20); // 최대 20개 제한

  if (placeIds.length === 0) {
    return NextResponse.json({ success: true, data: {} });
  }

  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // 최근 1시간 내 각 장소별 클릭 수 집계
    const rows = await prisma.clickLog.groupBy({
      by: ['placeId'],
      where: {
        placeId: { in: placeIds },
        clickedAt: { gte: oneHourAgo },
      },
      _count: { id: true },
    });

    const data: Record<string, number> = {};
    for (const row of rows) {
      data[row.placeId] = row._count.id;
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error('[API /popularity] Error:', error);
    // 실패해도 빈 데이터 반환 (UX 차단 안 함)
    return NextResponse.json({ success: true, data: {} });
  }
}
