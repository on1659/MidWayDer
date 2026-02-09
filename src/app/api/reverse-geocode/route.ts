/**
 * 역지오코딩 API - 좌표 → 주소 변환
 */

import { NextRequest, NextResponse } from 'next/server';

const KAKAO_REST_KEY = process.env.KAKAO_REST_API_KEY;

export async function GET(req: NextRequest) {
  const lng = req.nextUrl.searchParams.get('lng');
  const lat = req.nextUrl.searchParams.get('lat');

  if (!lng || !lat) {
    return NextResponse.json({ error: 'lat, lng required' }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://dapi.kakao.com/v2/local/geo/coord2address.json?x=${lng}&y=${lat}`,
      { headers: { Authorization: `KakaoAK ${KAKAO_REST_KEY}` } }
    );

    if (!res.ok) {
      return NextResponse.json({ error: 'Kakao API error' }, { status: 502 });
    }

    const data = await res.json();
    const doc = data.documents?.[0];

    if (!doc) {
      return NextResponse.json({ address: null });
    }

    return NextResponse.json({
      address: doc.road_address?.address_name || doc.address?.address_name || null,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
    });
  } catch (err) {
    console.error('[ReverseGeocode] Error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
