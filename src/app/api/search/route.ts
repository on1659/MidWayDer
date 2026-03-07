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
import { DatabaseError } from '@/lib/errors';
import type { Coordinates, Location } from '@/types/location';
import type { SearchWaypointsResponse, SearchWaypointsErrorResponse } from '@/types/api';
import type { DetourResult } from '@/types/detour';

type TaggedDetourResult = DetourResult & {
  routeType: 'shortest' | 'fastest';
  personalScore?: number;
  popularityScore?: number;
};
import { prisma } from '@/lib/db/prisma';
import { hashRoute } from '@/lib/utils/route-hash';
import { calculatePersonalizationScores, type PersonalizationScore } from '@/lib/personalization/scorer';
import { loadSearchCache, saveSearchCache } from '@/lib/cache/search-cache';
import { captureException } from '@/lib/monitoring';
import { getErrorMessage } from '@/lib/error-utils';
import { logger } from '@/lib/logger';
import { shouldDropShortestRoute } from '@/lib/utils/route-utils';

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

    const { start, end, category, query, searchType, options } = parseResult.data;

    // 검색어 결정 (category 또는 query)
    const searchQuery = category || query || '';
    if (!searchQuery) {
      const errorResponse: SearchWaypointsErrorResponse = {
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: 'category 또는 query 중 하나는 필수입니다.',
        },
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // 검색 타입 자동 감지
    const CATEGORY_LIST = ['다이소', '스타벅스', '올리브영', '이디야', 'CU', 'GS25', '세븐일레븐', '파리바게트', '빽다방', '커피빈'];
    const detectedSearchType = searchType || (CATEGORY_LIST.includes(searchQuery) ? 'category' : 'keyword');

    logger.info(`[API /search] Search type: ${detectedSearchType}, Query: ${searchQuery}`);

    // 3. 주소 → 좌표 변환 (필요 시)
    let startCoords: Coordinates;
    let endCoords: Coordinates;
    let startLocation: Location;
    let endLocation: Location;

    try {
      if (start.coordinates) {
        startCoords = start.coordinates;
        startLocation = { coordinates: startCoords, address: start.address ?? '' };
      } else {
        const geocodingProvider = await getGeocodingProvider();
        startCoords = await geocodingProvider.geocodeAddress(start.address!);
        startLocation = { coordinates: startCoords, address: start.address ?? '' };
      }

      if (end.coordinates) {
        endCoords = end.coordinates;
        endLocation = { coordinates: endCoords, address: end.address ?? '' };
      } else {
        const geocodingProvider = await getGeocodingProvider();
        endCoords = await geocodingProvider.geocodeAddress(end.address!);
        endLocation = { coordinates: endCoords, address: end.address ?? '' };
      }
    } catch (error: unknown) {
      const errorResponse: SearchWaypointsErrorResponse = {
        success: false,
        error: {
          code: ApiErrorCode.INVALID_COORDINATES,
          message: `주소를 좌표로 변환할 수 없습니다: ${getErrorMessage(error)}`,
        },
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // 4. 캐시 체크
    const cached = loadSearchCache({
      start: startLocation,
      end: endLocation,
      category: searchQuery, // category 또는 query
      bufferDistance: options?.bufferDistance,
    });
    if (cached) {
      logger.debug('[API /search] Cache hit! ✅ — re-applying personalization');

      const sessionId = request.cookies.get('sessionId')?.value || 'anonymous';
      const routeHash = hashRoute(startCoords, endCoords);
      const maxResults = options?.maxResults ?? 10;

      const placeIds = cached.results.map((r: any) => r.place.id);
      const personalizationScores = await Promise.race([
        calculatePersonalizationScores(sessionId, routeHash, placeIds),
        new Promise<PersonalizationScore[]>((_, reject) =>
          setTimeout(() => reject(new Error('PERSONALIZATION_TIMEOUT')), 2000)
        ),
      ]).catch(() => [] as PersonalizationScore[]);

      const scoreMap = new Map(personalizationScores.map(p => [p.placeId, p]));

      const personalizedResults = cached.results
        .map((result: any) => {
          const pScore = scoreMap.get(result.place.id);
          return {
            ...result,
            personalScore: pScore?.personalScore || 0,
            popularityScore: pScore?.popularityScore || 0,
            finalScore: Math.max(0, Math.min(100,
              result.finalScore + (pScore?.finalBoost || 0)
            )),
          };
        })
        .sort((a: any, b: any) => b.finalScore - a.finalScore)
        .slice(0, maxResults);

      return NextResponse.json({
        success: true,
        fromCache: true,
        data: {
          originalRoute: cached.originalRoute,
          results: personalizedResults,
          totalCandidates: cached.totalCandidates,
          apiCallsUsed: cached.apiCallsUsed,
          duration: Date.now() - startTime,
        },
      } satisfies SearchWaypointsResponse);
    }

    logger.debug('[API /search] Cache miss, fetching...');

    // 4. A→B 경로 조회 (최단거리 + 최단시간 병렬)
    const directionsProvider = await getDirectionsProvider();
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
      if (shouldDropShortestRoute(shortest, fastest)) {
        logger.warn(
          `[API /search] Drop shortest route (durationRatio=${(shortest.route.duration / fastest.route.duration).toFixed(2)})`
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
        calculateDetourCosts(route, searchQuery, {
          bufferDistance: options?.bufferDistance,
          maxDetourDistance: options?.maxDetourDistance,
        }, detectedSearchType).then(res => ({ ...res, routeType: type, originalRoute: route }))
      )
    );

    // 결과 합치기 + 중복 제거 (place.id 기준, 더 높은 점수 유지)
    const seenPlaces = new Map<string, TaggedDetourResult>();
    let totalCandidates = 0;
    let apiCallsUsed = 0;
    const fastestEntry = routeEntries.find((r) => r.type === 'fastest');
    const primaryOriginalRoute = (fastestEntry || routeEntries[0]).route;

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

    let finalResults: TaggedDetourResult[] = Array.from(seenPlaces.values());

    // 6. 캐시 저장 — raw 결과 (개인화 전) 저장
    saveSearchCache(
      { start: startLocation, end: endLocation, category: searchQuery, bufferDistance: options?.bufferDistance },
      {
        results: finalResults,
        originalRoute: primaryOriginalRoute,
        totalCandidates,
        apiCallsUsed,
      }
    );

    // 7. 개인화 점수 적용 (ClickLog 기반)
    const sessionId = request.cookies.get('sessionId')?.value || 'anonymous';
    const routeHash = hashRoute(startCoords, endCoords);

    const PERSONALIZATION_TIMEOUT_MS = 2000;
    const placeIds = finalResults.map(r => r.place.id);
    const personalizationScores = await Promise.race([
      calculatePersonalizationScores(sessionId, routeHash, placeIds),
      new Promise<PersonalizationScore[]>((_, reject) =>
        setTimeout(
          () => reject(new Error('PERSONALIZATION_TIMEOUT')),
          PERSONALIZATION_TIMEOUT_MS
        )
      ),
    ]).catch((error: Error) => {
      if (error.message === 'PERSONALIZATION_TIMEOUT') {
        logger.warn('[Personalization] Timeout after 2s — using default scores');
      } else {
        logger.error('[Personalization] Failed:', error);
      }
      return [] as PersonalizationScore[];
    });

    // 최종 점수 재계산
    const scoreMap = new Map(personalizationScores.map(p => [p.placeId, p]));

    finalResults = finalResults.map(result => {
      const pScore = scoreMap.get(result.place.id);
      const boostedScore = result.finalScore + (pScore?.finalBoost || 0);

      return {
        ...result,
        personalScore: pScore?.personalScore || 0,
        popularityScore: pScore?.popularityScore || 0,
        finalScore: Math.max(0, Math.min(100, boostedScore)), // 0-100 범위
      };
    });

    logger.debug('[Personalization] Applied to', finalResults.length, 'results');

    // 재정렬 (개인화 적용 후)
    finalResults.sort((a, b) => b.finalScore - a.finalScore);

    // 8. 결과 반환 (maxResults 적용)
    const maxResults = options?.maxResults ?? 10;
    const trimmedResults = finalResults.slice(0, maxResults);

    const searchDuration = Date.now() - startTime;

    // 9. 검색 로그 저장 — intentional fire-and-forget
    // Response 반환 속도 유지를 위해 await 생략. 실패 시 에러만 로깅.
    // 개인화 데이터에 영향이 있으나 단일 실패는 허용 가능한 수준.
    void prisma.searchLog.create({
      data: {
        startAddress: start.address || `${startCoords.lat.toFixed(4)}, ${startCoords.lng.toFixed(4)}`,
        endAddress: end.address || `${endCoords.lat.toFixed(4)}, ${endCoords.lng.toFixed(4)}`,
        category: searchQuery,
        resultsCount: trimmedResults.length,
        searchDuration,
        sessionId: sessionId === 'anonymous' ? null : sessionId,
        routeHash, // 개인화용 경로 해시 저장
      },
    }).catch(err => logger.error('[SearchLog] Failed to save:', err));

    const response: SearchWaypointsResponse = {
      success: true,
      fromCache: false,
      data: {
        originalRoute: primaryOriginalRoute,
        results: trimmedResults,
        totalCandidates,
        apiCallsUsed,
        duration: searchDuration,
      },
    };

    return NextResponse.json(response);
  } catch (error: unknown) {
    logger.error('[API /search] Unexpected error:', error);
    captureException(error, { endpoint: '/api/search' });

    // DB 에러
    if (error instanceof DatabaseError) {
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
