/**
 * GET /api/stats - 검색/클릭 통계 API
 * 
 * 간단한 통계 조회 (인증 없음, 나중에 추가 가능)
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'today'; // today, week, month, all
    
    // 기간 계산
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'all':
      default:
        startDate = new Date(0); // epoch
        break;
    }
    
    // 1. 총 검색 수
    const totalSearches = await prisma.searchLog.count({
      where: {
        searchedAt: {
          gte: startDate,
        },
      },
    });
    
    // 2. 카테고리별 검색 횟수
    const categoryBreakdown = await prisma.searchLog.groupBy({
      by: ['category'],
      where: {
        searchedAt: {
          gte: startDate,
        },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
    });
    
    // 3. 평균 검색 시간 (duration이 있는 경우)
    const avgDuration = await prisma.searchLog.aggregate({
      where: {
        searchedAt: {
          gte: startDate,
        },
        durationMs: {
          not: null,
        },
      },
      _avg: {
        durationMs: true,
      },
    });
    
    // 4. 총 클릭 수
    const totalClicks = await prisma.clickLog.count({
      where: {
        clickedAt: {
          gte: startDate,
        },
      },
    });
    
    // 5. 가장 많이 클릭된 장소 TOP 10
    const topPlaces = await prisma.clickLog.groupBy({
      by: ['placeId'],
      where: {
        clickedAt: {
          gte: startDate,
        },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 10,
    });
    
    // Place 정보 조회
    const placeIds = topPlaces.map((p) => p.placeId);
    const places = await prisma.place.findMany({
      where: {
        id: {
          in: placeIds,
        },
      },
      select: {
        id: true,
        name: true,
        category: true,
        address: true,
      },
    });
    
    const topPlacesWithDetails = topPlaces.map((tp) => {
      const place = places.find((p) => p.id === tp.placeId);
      return {
        place: place || { id: tp.placeId, name: 'Unknown', category: 'Unknown', address: '' },
        clicks: tp._count.id,
      };
    });
    
    // 6. CTR (Click-Through Rate) - 검색 대비 클릭 비율
    const ctr = totalSearches > 0 ? (totalClicks / totalSearches) * 100 : 0;
    
    return NextResponse.json({
      success: true,
      period,
      data: {
        totalSearches,
        totalClicks,
        ctr: parseFloat(ctr.toFixed(2)),
        avgSearchDurationMs: avgDuration._avg.durationMs 
          ? Math.round(avgDuration._avg.durationMs) 
          : null,
        categoryBreakdown: categoryBreakdown.map((c) => ({
          category: c.category,
          count: c._count.id,
          percentage: totalSearches > 0 
            ? parseFloat(((c._count.id / totalSearches) * 100).toFixed(1))
            : 0,
        })),
        topPlaces: topPlacesWithDetails,
      },
    });
  } catch (error) {
    console.error('[API /stats] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
