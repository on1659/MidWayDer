/**
 * 자동완성 API - 카카오 키워드 검색 기반
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const KAKAO_REST_KEY = process.env.KAKAO_REST_API_KEY;

const QuerySchema = z.object({
  query: z.string().min(2).max(100),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
});

export async function GET(req: NextRequest) {
  if (!KAKAO_REST_KEY) {
    logger.error('[Autocomplete] KAKAO_REST_API_KEY is not configured');
    return NextResponse.json({ results: [] }, { status: 503 });
  }

  const parsed = QuerySchema.safeParse({
    query: req.nextUrl.searchParams.get('query')?.trim(),
    lat: req.nextUrl.searchParams.get('lat') ?? undefined,
    lng: req.nextUrl.searchParams.get('lng') ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ results: [] });
  }

  const { query, lat, lng } = parsed.data;

  try {
    let url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&size=7`;
    if (lat && lng) {
      url += `&y=${lat}&x=${lng}&sort=accuracy`;
    }

    const res = await fetch(url, {
      headers: { Authorization: `KakaoAK ${KAKAO_REST_KEY}` },
    });

    if (!res.ok) {
      logger.error('[Autocomplete] Kakao API error:', res.status);
      return NextResponse.json({ results: [] });
    }

    const data = await res.json();
    const results = (data.documents || []).map((doc: { place_name: string; road_address_name?: string; address_name?: string; y: string; x: string; category_group_name?: string }) => ({
      name: doc.place_name,
      address: doc.road_address_name || doc.address_name,
      lat: parseFloat(doc.y),
      lng: parseFloat(doc.x),
      category: doc.category_group_name || '',
    }));

    return NextResponse.json({ results });
  } catch (err) {
    logger.error('[Autocomplete] Error:', err);
    return NextResponse.json({ results: [] });
  }
}
