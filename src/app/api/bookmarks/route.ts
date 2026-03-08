import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSessionId } from '@/lib/auth/session';

// GET /api/bookmarks - 즐겨찾기 목록 조회
export async function GET(request: NextRequest) {
  try {
    const sessionId = getSessionId(request);
    if (!sessionId) {
      return NextResponse.json({ bookmarks: [] });
    }

    const bookmarks = await prisma.bookmark.findMany({
      where: { sessionId },
      include: {
        place: {
          select: {
            id: true,
            name: true,
            category: true,
            address: true,
            lat: true,
            lng: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ bookmarks });
  } catch (error) {
    console.error('Error fetching bookmarks:', error);
    return NextResponse.json({ bookmarks: [] });
  }
}

// POST /api/bookmarks - 즐겨찾기 추가
export async function POST(request: NextRequest) {
  try {
    const sessionId = getSessionId(request);
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { placeId, memo } = body;

    if (!placeId) {
      return NextResponse.json({ error: 'placeId is required' }, { status: 400 });
    }

    // placeId가 Place 테이블에 존재하는지 확인
    const place = await prisma.place.findUnique({
      where: { id: placeId },
    });

    if (!place) {
      return NextResponse.json({ error: 'Place not found' }, { status: 404 });
    }

    const bookmark = await prisma.bookmark.upsert({
      where: {
        placeId_sessionId: { placeId, sessionId },
      },
      update: { memo },
      create: { placeId, sessionId, memo },
      include: {
        place: {
          select: {
            id: true,
            name: true,
            category: true,
            address: true,
            lat: true,
            lng: true,
          },
        },
      },
    });

    return NextResponse.json({ bookmark });
  } catch (error) {
    console.error('Error creating bookmark:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
