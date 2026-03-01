/**
 * 역지오코딩 API - 좌표 → 가장 가까운 장소 상세정보
 * 
 * 전략: 여러 카테고리 그룹으로 검색해서 가장 가까운 장소를 찾음
 * 음식점(FD6), 카페(CE7), 편의점(CS2), 대형마트(MT1) 4개만 검색 (API 절약)
 * fallback: 좌표→주소
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

const KAKAO_REST_KEY = process.env.KAKAO_REST_API_KEY;

// 자주 있는 카테고리만 (API 호출 최소화)
const PRIORITY_CATEGORIES = ['FD6', 'CE7', 'CS2', 'MT1'];

export async function GET(req: NextRequest) {
  const lng = req.nextUrl.searchParams.get('lng');
  const lat = req.nextUrl.searchParams.get('lat');

  if (!lng || !lat) {
    return NextResponse.json({ error: 'lat, lng required' }, { status: 400 });
  }

  if (!KAKAO_REST_KEY) {
    logger.error('[ReverseGeocode] KAKAO_REST_API_KEY is not configured');
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }

  try {
    // 1. 좌표→주소 + 카테고리 검색 병렬
    const [addrRes, ...catResults] = await Promise.all([
      fetch(
        `https://dapi.kakao.com/v2/local/geo/coord2address.json?x=${lng}&y=${lat}`,
        { headers: { Authorization: `KakaoAK ${KAKAO_REST_KEY}` } }
      ),
      ...PRIORITY_CATEGORIES.map((code) =>
        fetch(
          `https://dapi.kakao.com/v2/local/search/category.json?category_group_code=${code}&x=${lng}&y=${lat}&radius=50&sort=distance&size=1`,
          { headers: { Authorization: `KakaoAK ${KAKAO_REST_KEY}` } }
        )
      ),
    ]);

    // 주소 파싱
    let address: string | null = null;
    if (addrRes.ok) {
      const addrData = await addrRes.json();
      const doc = addrData.documents?.[0];
      address = doc?.road_address?.address_name || doc?.address?.address_name || null;
    }

    // 가장 가까운 장소 찾기
    type KakaoPlace = { place_name: string; road_address_name?: string; address_name?: string; category_name?: string; phone?: string; place_url?: string; id?: string; distance?: string };
    let closest: KakaoPlace | null = null;
    let closestDist = Infinity;

    for (const res of catResults) {
      if (!res.ok) continue;
      const data = await res.json();
      const place = data.documents?.[0];
      if (!place) continue;
      const dist = parseFloat(place.distance) || Infinity;
      if (dist < closestDist) {
        closestDist = dist;
        closest = place;
      }
    }

    if (closest) {
      return NextResponse.json({
        name: closest.place_name,
        address: closest.road_address_name || closest.address_name || address,
        category: closest.category_name?.split(' > ').pop() || '',
        phone: closest.phone || null,
        placeUrl: closest.place_url || null,
        kakaoId: closest.id || null,
        distance: Math.round(closestDist),
        lat: parseFloat(lat),
        lng: parseFloat(lng),
      });
    }

    // fallback: 주소만
    return NextResponse.json({
      name: address || `${parseFloat(lat).toFixed(4)}, ${parseFloat(lng).toFixed(4)}`,
      address,
      category: null,
      phone: null,
      placeUrl: null,
      kakaoId: null,
      distance: null,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
    });
  } catch (err) {
    logger.error('[ReverseGeocode] Error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
