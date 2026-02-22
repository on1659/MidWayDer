/**
 * POST /api/search - 경유지 검색 엔드포인트
 *
 * 출발지(A)→도착지(B) 경로상에서 최적의 경유지(C)를 추천합니다.
 *
 * Flow:
 * 1. Zod 입력 검증
 * 2. 주소 → 좌표 변환 (필요 시)
 * 3. A→B 원본 경로 조회
 * 4. PostGIS 공간 필터링
 * 5. Detour Cost 계산
 * 6. 상위 10개 결과 반환
 */

import { NextRequest, NextResponse } from 'next/server';
import { searchRequestSchema } from '@/lib/validation/schemas';
import { getDirectionsProvider, getGeocodingProvider } from '@/lib/map-provider';
import { calculateDetourCosts } from '@/lib/detour/calculator';
import { ApiErrorCode, ApiErrorMessage } from '@/types/api';
import type { Coordinates } from '@/types/location';
import type { SearchWaypointsResponse, SearchWaypointsErrorResponse } from '@/types/api';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. 요청 본문 파싱
    const body = await request.json();

    // 2. Zod 입력 검증
    const parseResult = searchRequestSchema.safeParse(body);
    if (!parseResult.success) {
      const errorResponse: SearchWaypointsErrorResponse = {
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: ApiErrorMessage[ApiErrorCode.VALIDATION_ERROR],
          details: parseResult.error.flatten(),
        },
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    const { start, end, category, options } = parseResult.data;

    // 3. 주소 → 좌표 변환 (필요 시)
    let startCoords: Coordinates;
    let endCoords: Coordinates;

    try {
      if (start.coordinates) {
        startCoords = start.coordinates;
      } else {
        startCoords = await getGeocodingProvider().geocodeAddress(start.address!);
      }

      if (end.coordinates) {
        endCoords = end.coordinates;
      } else {
        endCoords = await getGeocodingProvider().geocodeAddress(end.address!);
      }
    } catch (error: any) {
      const errorResponse: SearchWaypointsErrorResponse = {
        success: false,
        error: {
          code: ApiErrorCode.INVALID_COORDINATES,
          message: `주소를 좌표로 변환할 수 없습니다: ${error.message}`,
        },
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // 4. A→B 경로 조회 (최단거리 + 최단시간 병렬)
    const directionsProvider = getDirectionsProvider();
    const routeResults = await Promise.allSettled([
      directionsProvider.getRoute(startCoords, endCoords, 'shortest'),
      directionsProvider.getRoute(startCoords, endCoords, 'fastest'),
    ]);

    // 성공한 경로들 수집
    const routeEntries: Array<{ route: typeof routeResults[0] extends PromiseSettledResult<infer T> ? T : never; type: 'shortest' | 'fastest' }> = [];
    if (routeResults[0].status === 'fulfilled') routeEntries.push({ route: routeResults[0].value, type: 'shortest' });
    if (routeResults[1].status === 'fulfilled') routeEntries.push({ route: routeResults[1].value, type: 'fastest' });

    // shortest가 지나치게 느리면(도심 관통 등) 제외
    if (routeEntries.length === 2) {
      const shortest = routeEntries.find((r) => r.type === 'shortest')!;
      const fastest = routeEntries.find((r) => r.type === 'fastest')!;
      const durationRatio = shortest.route.duration / fastest.route.duration;
      if (durationRatio >= 1.35) {
        console.warn(
          `[API /search] Drop shortest route (durationRatio=${durationRatio.toFixed(2)})`
        );
        const idx = routeEntries.indexOf(shortest);
        if (idx >= 0) routeEntries.splice(idx, 1);
      }
    }

    if (routeEntries.length === 0) {
      const errorResponse: SearchWaypointsErrorResponse = {
        success: false,
        error: {
          code: ApiErrorCode.NO_ROUTE_FOUND,
          message: ApiErrorMessage[ApiErrorCode.NO_ROUTE_FOUND],
        },
      };
      return NextResponse.json(errorResponse, { status: 404 });
    }

    // 5. 각 경로별 Detour Cost 계산 (병렬)
    const detourResults = await Promise.allSettled(
      routeEntries.map(({ route, type }) =>
        calculateDetourCosts(route, category, {
          bufferDistance: options?.bufferDistance,
          maxDetourDistance: options?.maxDetourDistance,
        }).then(res => ({ ...res, routeType: type, originalRoute: route }))
      )
    );

    // 결과 합치기 + 중복 제거 (place.id 기준, 더 높은 점수 유지)
    const seenPlaces = new Map<string, typeof allResults[0]>();
    let totalCandidates = 0;
    let apiCallsUsed = 0;
    const fastestEntry = routeEntries.find((r) => r.type === 'fastest');
    let primaryOriginalRoute = (fastestEntry || routeEntries[0]).route;

    const allResults: Array<any> = [];
    for (const dr of detourResults) {
      if (dr.status !== 'fulfilled') continue;
      totalCandidates += dr.value.totalCandidates;
      apiCallsUsed += dr.value.apiCallsUsed;
      for (const result of dr.value.results) {
        const tagged = { ...result, routeType: dr.value.routeType };
        const existing = seenPlaces.get(result.place.id);
        if (!existing || existing.finalScore < tagged.finalScore) {
          seenPlaces.set(result.place.id, tagged);
        }
      }
    }

    const mergedResults = Array.from(seenPlaces.values()).sort((a, b) => b.finalScore - a.finalScore);

    // 6. 결과 반환 (maxResults 적용)
    const maxResults = options?.maxResults ?? 10;
    const trimmedResults = mergedResults.slice(0, maxResults);

    const response: SearchWaypointsResponse = {
      success: true,
      data: {
        originalRoute: primaryOriginalRoute,
        results: trimmedResults,
        totalCandidates,
        apiCallsUsed,
        duration: Date.now() - startTime,
      },
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[API /search] Unexpected error:', error);

    // DB 에러
    if (error.message === 'DATABASE_ERROR') {
      const errorResponse: SearchWaypointsErrorResponse = {
        success: false,
        error: {
          code: ApiErrorCode.DATABASE_ERROR,
          message: ApiErrorMessage[ApiErrorCode.DATABASE_ERROR],
        },
      };
      return NextResponse.json(errorResponse, { status: 500 });
    }

    const errorResponse: SearchWaypointsErrorResponse = {
      success: false,
      error: {
        code: ApiErrorCode.INTERNAL_ERROR,
        message: ApiErrorMessage[ApiErrorCode.INTERNAL_ERROR],
      },
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
