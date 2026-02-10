/**
 * 자동완성 API - 카카오 키워드 검색 기반
 */

import { NextRequest, NextResponse } from 'next/server';

const KAKAO_REST_KEY = process.env.KAKAO_REST_API_KEY;

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('query')?.trim();
  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const lat = req.nextUrl.searchParams.get('lat');
  const lng = req.nextUrl.searchParams.get('lng');

  try {
    let url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&size=7`;
    if (lat && lng) {
      url += `&y=${lat}&x=${lng}&sort=accuracy`;
    }

    const res = await fetch(url, {
      headers: { Authorization: `KakaoAK ${KAKAO_REST_KEY}` },
    });

    if (!res.ok) {
      console.error('[Autocomplete] Kakao API error:', res.status);
      return NextResponse.json({ results: [] });
    }

    const data = await res.json();
    const results = (data.documents || []).map((doc: any) => ({
      name: doc.place_name,
      address: doc.road_address_name || doc.address_name,
      lat: parseFloat(doc.y),
      lng: parseFloat(doc.x),
      category: doc.category_group_name || '',
    }));

    return NextResponse.json({ results });
  } catch (err) {
    console.error('[Autocomplete] Error:', err);
    return NextResponse.json({ results: [] });
  }
}
