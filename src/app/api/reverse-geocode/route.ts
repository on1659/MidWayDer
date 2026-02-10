/**
 * 역지오코딩 API - 좌표 → 장소이름 + 주소 변환
 * 
 * 1. 좌표→주소 변환
 * 2. 주소로 키워드 검색 → 가장 가까운 장소 이름 추출
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
    // 1. 좌표→주소 변환
    const addrRes = await fetch(
      `https://dapi.kakao.com/v2/local/geo/coord2address.json?x=${lng}&y=${lat}`,
      { headers: { Authorization: `KakaoAK ${KAKAO_REST_KEY}` } }
    );

    let address: string | null = null;
    let region: string | null = null;
    if (addrRes.ok) {
      const addrData = await addrRes.json();
      const doc = addrData.documents?.[0];
      address = doc?.road_address?.address_name || doc?.address?.address_name || null;
      // 동네 이름 추출 (예: "중구 무교동")
      const addr = doc?.address;
      if (addr) {
        region = `${addr.region_2depth_name} ${addr.region_3depth_name}`.trim();
      }
    }

    // 2. 동네 이름으로 키워드 검색 → 좌표 가까운 순 정렬
    let placeName: string | null = null;
    if (region) {
      const searchRes = await fetch(
        `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(region)}&x=${lng}&y=${lat}&radius=50&sort=distance&size=1`,
        { headers: { Authorization: `KakaoAK ${KAKAO_REST_KEY}` } }
      );

      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const place = searchData.documents?.[0];
        if (place && parseFloat(place.distance) <= 50) {
          placeName = place.place_name;
        }
      }
    }

    return NextResponse.json({
      name: placeName || address,
      address,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
    });
  } catch (err) {
    console.error('[ReverseGeocode] Error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
