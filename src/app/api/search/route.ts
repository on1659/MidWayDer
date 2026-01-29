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
import { getRoute } from '@/lib/naver-maps/directions';
import { geocodeAddress } from '@/lib/naver-maps/geocoding';
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
        startCoords = await geocodeAddress(start.address!);
      }

      if (end.coordinates) {
        endCoords = end.coordinates;
      } else {
        endCoords = await geocodeAddress(end.address!);
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

    // 4. A→B 원본 경로 조회
    let originalRoute;
    try {
      originalRoute = await getRoute(startCoords, endCoords);
    } catch (error: any) {
      const errorResponse: SearchWaypointsErrorResponse = {
        success: false,
        error: {
          code: ApiErrorCode.NO_ROUTE_FOUND,
          message: ApiErrorMessage[ApiErrorCode.NO_ROUTE_FOUND],
        },
      };
      return NextResponse.json(errorResponse, { status: 404 });
    }

    // 5. Detour Cost 계산 (PostGIS 필터링 + 근접도 + API 호출)
    const { results, totalCandidates, apiCallsUsed } = await calculateDetourCosts(
      originalRoute,
      category,
      {
        bufferDistance: options?.bufferDistance,
        maxDetourDistance: options?.maxDetourDistance,
      }
    );

    // 6. 결과 반환 (maxResults 적용)
    const maxResults = options?.maxResults ?? 10;
    const trimmedResults = results.slice(0, maxResults);

    const response: SearchWaypointsResponse = {
      success: true,
      data: {
        originalRoute,
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
