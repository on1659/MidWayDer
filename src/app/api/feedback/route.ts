/**
 * POST /api/feedback - 검색 결과 피드백
 * 
 * 사용자가 검색 결과에 대해 피드백을 남깁니다.
 * 알고리즘 개선 및 사용자 만족도 측정에 사용됩니다.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/logger';

interface FeedbackRequest {
  searchLogId?: string; // 선택적 (최근 검색 찾기)
  helpful: boolean; // true: 👍, false: 👎
  comment?: string; // 선택적 코멘트
}

export async function POST(request: NextRequest) {
  try {
    const body: FeedbackRequest = await request.json();
    const { searchLogId, helpful, comment } = body;

    if (typeof helpful !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'helpful must be a boolean' },
        { status: 400 }
      );
    }

    const sessionId = request.cookies.get('sessionId')?.value || null;

    let targetSearchLogId = searchLogId;

    // searchLogId가 없으면 최근 검색 로그 찾기
    if (!targetSearchLogId) {
      const recentSearchLog = await prisma.searchLog.findFirst({
        where: {
          sessionId: sessionId || undefined,
          timestamp: {
            gte: new Date(Date.now() - 30 * 60 * 1000), // 30분 이내
          },
        },
        orderBy: { timestamp: 'desc' },
      });

      if (!recentSearchLog) {
        return NextResponse.json(
          { success: false, error: 'No recent search found' },
          { status: 404 }
        );
      }

      targetSearchLogId = recentSearchLog.id;
    }

    // 중복 피드백 방지 (같은 searchLogId에 이미 피드백 있으면 업데이트)
    const existing = await prisma.searchFeedback.findUnique({
      where: { searchLogId: targetSearchLogId },
    });

    if (existing) {
      // 업데이트
      await prisma.searchFeedback.update({
        where: { id: existing.id },
        data: { helpful, comment },
      });
    } else {
      // 생성
      await prisma.searchFeedback.create({
        data: {
          searchLogId: targetSearchLogId,
          helpful,
          comment,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    logger.error('[API /feedback] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/feedback/stats - 피드백 통계
 * 
 * 전체 피드백 만족도 조회
 */
export async function GET() {
  try {
    const total = await prisma.searchFeedback.count();
    const helpful = await prisma.searchFeedback.count({
      where: { helpful: true },
    });

    const satisfaction = total > 0 ? Math.round((helpful / total) * 100) : 0;

    return NextResponse.json({
      success: true,
      data: {
        total,
        helpful,
        notHelpful: total - helpful,
        satisfactionRate: satisfaction,
      },
    });
  } catch (error) {
    logger.error('[API /feedback/stats] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
