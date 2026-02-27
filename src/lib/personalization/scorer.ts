/**
 * Personalization Scorer
 * ClickLog 기반 개인화 점수 계산
 */

import { prisma } from '@/lib/db/prisma';

export interface PersonalizationScore {
  placeId: string;
  personalScore: number; // 0-100 (사용자의 과거 클릭 패턴)
  popularityScore: number; // 0-100 (경로별 인기도)
  finalBoost: number; // -5 ~ +5 (최종 점수 조정)
}

/**
 * 사용자의 과거 클릭 패턴 + 경로별 인기도 기반 개인화 점수 계산
 */
export async function calculatePersonalizationScores(
  sessionId: string,
  routeHash: string,
  placeIds: string[]
): Promise<PersonalizationScore[]> {
  try {
    // 1. 개인 클릭 히스토리 조회 (최근 30일)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const userClicks = await prisma.clickLog.groupBy({
      by: ['placeId'],
      where: {
        sessionId,
        clickedAt: { gte: thirtyDaysAgo },
        placeId: { in: placeIds },
      },
      _count: { placeId: true },
    });

    // 2. 경로별 인기도 조회 (같은 경로에서 다른 사용자들의 선택)
    const routePopularity = await prisma.clickLog.groupBy({
      by: ['placeId'],
      where: {
        searchLog: {
          routeHash,
        },
        placeId: { in: placeIds },
      },
      _count: { placeId: true },
    });

    // 3. 점수 계산
    const maxUserClicks = Math.max(
      ...userClicks.map((c) => c._count.placeId),
      1
    );
    const maxRouteClicks = Math.max(
      ...routePopularity.map((c) => c._count.placeId),
      1
    );

    return placeIds.map((placeId) => {
      const userClickCount =
        userClicks.find((c) => c.placeId === placeId)?._count.placeId || 0;
      const routeClickCount =
        routePopularity.find((c) => c.placeId === placeId)?._count.placeId ||
        0;

      const personalScore = (userClickCount / maxUserClicks) * 100;
      const popularityScore = (routeClickCount / maxRouteClicks) * 100;

      // 최종 boost: 개인 70%, 인기 30%
      // -5 ~ +5 범위 (평균 0)
      const finalBoost = (personalScore * 0.7 + popularityScore * 0.3) / 10 - 5;

      return {
        placeId,
        personalScore,
        popularityScore,
        finalBoost,
      };
    });
  } catch (error) {
    console.error('[Personalization] Scoring error:', error);
    // 에러 시 빈 배열 반환 (기본 점수 사용)
    return placeIds.map((placeId) => ({
      placeId,
      personalScore: 0,
      popularityScore: 0,
      finalBoost: 0,
    }));
  }
}

/**
 * 사용자의 카테고리별 선호도 조회 (최근 30일)
 */
export async function getUserCategoryPreferences(
  sessionId: string
): Promise<Record<string, number>> {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const categoryClicks = await prisma.clickLog.groupBy({
      by: ['searchLogId'],
      where: {
        sessionId,
        clickedAt: { gte: thirtyDaysAgo },
      },
      _count: { searchLogId: true },
    });

    // searchLog에서 카테고리 정보 가져오기
    const searches = await prisma.searchLog.findMany({
      where: {
        id: {
          in: categoryClicks.map((c) => c.searchLogId),
        },
      },
      select: {
        id: true,
        category: true,
      },
    });

    const categoryMap = new Map(searches.map((s) => [s.id, s.category]));

    // 카테고리별 클릭 수 집계
    const preferences: Record<string, number> = {};
    categoryClicks.forEach((click) => {
      const category = categoryMap.get(click.searchLogId);
      if (category) {
        preferences[category] = (preferences[category] || 0) + click._count.searchLogId;
      }
    });

    return preferences;
  } catch (error) {
    console.error('[Personalization] Category preferences error:', error);
    return {};
  }
}
