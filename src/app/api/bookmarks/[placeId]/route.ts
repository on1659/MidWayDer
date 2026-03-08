import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSessionId } from '@/lib/auth/session';

// GET /api/bookmarks/[placeId] - 즐겨찾기 여부 확인
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ placeId: string }> }
) {
  try {
    const { placeId } = await params;
    const sessionId = getSessionId(request);

    if (!sessionId) {
      return NextResponse.json({ isBookmarked: false });
    }

    const bookmark = await prisma.bookmark.findUnique({
      where: {
        placeId_sessionId: { placeId, sessionId },
      },
    });

    return NextResponse.json({
      isBookmarked: !!bookmark,
      bookmark: bookmark || null,
    });
  } catch (error) {
    console.error('Error checking bookmark:', error);
    return NextResponse.json({ isBookmarked: false });
  }
}

// DELETE /api/bookmarks/[placeId] - 즐겨찾기 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ placeId: string }> }
) {
  try {
    const { placeId } = await params;
    const sessionId = getSessionId(request);

    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.bookmark.delete({
      where: {
        placeId_sessionId: { placeId, sessionId },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting bookmark:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
