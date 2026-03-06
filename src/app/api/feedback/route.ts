import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';

const feedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  category: z.enum(['bug', 'suggestion', 'praise']),
  comment: z.string().max(1000).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = feedbackSchema.parse(body);

    const feedback = await prisma.feedback.create({
      data: {
        rating: validated.rating,
        category: validated.category,
        comment: validated.comment,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        metadata: validated.metadata as any,
        userAgent: request.headers.get('user-agent') || undefined,
        url: request.headers.get('referer') || undefined,
      },
    });

    return NextResponse.json({ success: true, id: feedback.id }, { status: 201 });
  } catch (error) {
    console.error('Feedback submission error:', error);
    return NextResponse.json(
      { success: false, error: 'Invalid feedback data' },
      { status: 400 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where = category ? { category } : {};

    const feedbacks = await prisma.feedback.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const stats = await prisma.feedback.aggregate({
      _avg: { rating: true },
      _count: { _all: true },
    });

    return NextResponse.json({
      feedbacks,
      stats: {
        averageRating: stats._avg.rating || 0,
        totalCount: stats._count._all,
      },
    });
  } catch (error) {
    console.error('Feedback fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch feedbacks' },
      { status: 500 }
    );
  }
}
