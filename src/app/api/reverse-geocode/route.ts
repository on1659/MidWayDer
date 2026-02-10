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
    // 1. 근처 장소 검색 (카카오 카테고리 검색)
    const placeRes = await fetch(
      `https://dapi.kakao.com/v2/local/search/keyword.json?query=장소&x=${lng}&y=${lat}&radius=50&sort=distance&size=1`,
      { headers: { Authorization: `KakaoAK ${KAKAO_REST_KEY}` } }
    );

    if (placeRes.ok) {
      const placeData = await placeRes.json();
      const place = placeData.documents?.[0];
      if (place) {
        return NextResponse.json({
          address: place.place_name,
          roadAddress: place.road_address_name || place.address_name,
          lat: parseFloat(lat),
          lng: parseFloat(lng),
        });
      }
    }

    // 2. 장소 없으면 주소 변환 폴백
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
