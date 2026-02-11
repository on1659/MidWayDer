/**
 * 역지오코딩 API - 좌표 → 장소 상세정보 변환
 * 
 * 1. 좌표 근처 카카오 카테고리/키워드 검색 → 가장 가까운 장소 상세정보
 * 2. fallback: 좌표→주소 변환
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
    if (addrRes.ok) {
      const addrData = await addrRes.json();
      const doc = addrData.documents?.[0];
      address = doc?.road_address?.address_name || doc?.address?.address_name || null;
    }

    // 2. 근처 장소 키워드 검색 (반경 50m 내 가장 가까운 장소)
    const searchRes = await fetch(
      `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent('장소')}&x=${lng}&y=${lat}&radius=50&sort=distance&size=5&category_group_code=`,
      { headers: { Authorization: `KakaoAK ${KAKAO_REST_KEY}` } }
    );

    let place: any = null;
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      // 가장 가까운 장소
      if (searchData.documents?.length > 0) {
        place = searchData.documents[0];
      }
    }

    if (place) {
      return NextResponse.json({
        name: place.place_name,
        address: place.road_address_name || place.address_name || address,
        category: place.category_name?.split(' > ').pop() || '',
        phone: place.phone || null,
        placeUrl: place.place_url || null,
        kakaoId: place.id || null,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
      });
    }

    // fallback: 주소만 반환
    return NextResponse.json({
      name: address,
      address,
      category: null,
      phone: null,
      placeUrl: null,
      kakaoId: null,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
    });
  } catch (err) {
    console.error('[ReverseGeocode] Error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
