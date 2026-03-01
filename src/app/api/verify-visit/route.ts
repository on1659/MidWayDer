/**
 * POST /api/verify-visit — GPS 기반 방문 인증
 *
 * 사용자 현재 위치가 장소에서 50m 이내일 때 방문 인증 + 포인트 적립.
 * 1시간 이내 중복 인증 방지.
 *
 * Tier:
 *   bronze   0~49점
 *   silver   50~199점
 *   gold     200~499점
 *   platinum 500점 이상
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';

const BodySchema = z.object({
  placeId: z.string().min(1).max(100),
  userLat: z.number().min(-90).max(90),
  userLng: z.number().min(-180).max(180),
});

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calcTier(points: number): string {
  if (points >= 500) return 'platinum';
  if (points >= 200) return 'gold';
  if (points >= 50) return 'silver';
  return 'bronze';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = BodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: '필수 파라미터 누락 또는 형식 오류' }, { status: 400 });
    }

    const { placeId, userLat, userLng } = parsed.data;

    const sessionId = request.cookies.get('sessionId')?.value || 'anonymous';

    // 장소 조회
    const place = await prisma.place.findUnique({ where: { id: placeId } });
    if (!place) {
      return NextResponse.json({ error: '장소를 찾을 수 없어요' }, { status: 404 });
    }

    // 거리 체크 (50m 이내)
    const distance = haversineMeters(userLat, userLng, place.lat, place.lng);
    if (distance > 50) {
      return NextResponse.json({
        verified: false,
        message: `${place.name}에서 ${Math.round(distance)}m 떨어져 있어요 (50m 이내여야 인증 가능)`,
      });
    }

    // 중복 인증 체크 (1시간 이내)
    const recent = await prisma.visitLog.findFirst({
      where: {
        placeId,
        sessionId,
        verifiedAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
      },
    });
    if (recent) {
      return NextResponse.json({
        verified: false,
        message: '1시간 이내에 이미 인증했어요',
      });
    }

    const POINTS = 10;

    // 방문 로그 저장
    await prisma.visitLog.create({
      data: { placeId, sessionId, points: POINTS },
    });

    // 포인트 누적 (upsert)
    const updated = await prisma.userPoints.upsert({
      where: { sessionId },
      create: { sessionId, points: POINTS, tier: calcTier(POINTS) },
      update: { points: { increment: POINTS } },
    });

    // 티어 재계산
    const newTotal = updated.points;
    const newTier = calcTier(newTotal);
    if (newTier !== updated.tier) {
      await prisma.userPoints.update({
        where: { sessionId },
        data: { tier: newTier },
      });
    }

    return NextResponse.json({
      verified: true,
      points: POINTS,
      totalPoints: newTotal,
      tier: newTier,
      message: `🎉 방문 인증 완료! +${POINTS}포인트 (누적 ${newTotal}점)`,
    });
  } catch (err: any) {
    console.error('[verify-visit]', err);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}
