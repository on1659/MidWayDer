/**
 * 역지오코딩 API - 좌표 → 장소이름/주소 변환
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
    // 1. 근처 장소 검색 (카카오 카테고리 검색 - 반경 30m)
    const categoryRes = await fetch(
      `https://dapi.kakao.com/v2/local/search/category.json?category_group_code=&x=${lng}&y=${lat}&radius=30&sort=distance&size=1`,
      { headers: { Authorization: `KakaoAK ${KAKAO_REST_KEY}` } }
    );

    if (categoryRes.ok) {
      const catData = await categoryRes.json();
      const place = catData.documents?.[0];
      if (place && parseFloat(place.distance) <= 30) {
        return NextResponse.json({
          name: place.place_name,
          address: place.road_address_name || place.address_name,
          lat: parseFloat(lat),
          lng: parseFloat(lng),
        });
      }
    }

    // 2. 폴백: 좌표→주소 변환
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
      return NextResponse.json({ name: null, address: null });
    }

    const address = doc.road_address?.address_name || doc.address?.address_name || null;
    return NextResponse.json({
      name: address,
      address,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
    });
  } catch (err) {
    console.error('[ReverseGeocode] Error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
