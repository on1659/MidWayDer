import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSessionId } from '@/lib/auth/session';
import { z } from 'zod';

const SaveRouteSchema = z.object({
  name: z.string().min(1).max(100),
  startAddress: z.string().min(1),
  endAddress: z.string().min(1),
  startCoords: z.object({ lat: z.number(), lng: z.number() }),
  endCoords: z.object({ lat: z.number(), lng: z.number() }),
  category: z.string().optional(),
});

// GET /api/routes - 저장된 경로 목록 조회
export async function GET(request: NextRequest) {
  try {
    const sessionId = getSessionId(request);
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const routes = await prisma.savedRoute.findMany({
      where: { sessionId },
      orderBy: { lastUsedAt: 'desc' },
    });

    return NextResponse.json({ routes });
  } catch (error) {
    console.error('Error fetching routes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/routes - 새 경로 저장
export async function POST(request: NextRequest) {
  try {
    const sessionId = getSessionId(request);
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = SaveRouteSchema.parse(body);

    // routeHash 생성 (출발+도착 좌표)
    const routeHash = `${validated.startCoords.lat.toFixed(6)},${validated.startCoords.lng.toFixed(6)}-${validated.endCoords.lat.toFixed(6)},${validated.endCoords.lng.toFixed(6)}`;

    // 중복 체크
    const existing = await prisma.savedRoute.findUnique({
      where: { sessionId_routeHash: { sessionId, routeHash } },
    });

    if (existing) {
      return NextResponse.json({ error: 'Route already saved', route: existing }, { status: 409 });
    }

    const route = await prisma.savedRoute.create({
      data: {
        sessionId,
        name: validated.name,
        startAddress: validated.startAddress,
        endAddress: validated.endAddress,
        startCoords: validated.startCoords,
        endCoords: validated.endCoords,
        category: validated.category,
        routeHash,
      },
    });

    return NextResponse.json({ route }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Error saving route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
