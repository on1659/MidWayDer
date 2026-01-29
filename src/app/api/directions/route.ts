/**
 * POST /api/directions - 경로 조회 엔드포인트
 *
 * 출발지→도착지 간 경로를 조회합니다.
 */

import { NextRequest, NextResponse } from 'next/server';
import { directionsRequestSchema } from '@/lib/validation/schemas';
import { getRoute } from '@/lib/naver-maps/directions';
import { ApiErrorCode, ApiErrorMessage } from '@/types/api';
import type { DirectionsResponse } from '@/types/api';

export async function POST(request: NextRequest) {
  try {
    // 1. 요청 본문 파싱
    const body = await request.json();

    // 2. Zod 입력 검증
    const parseResult = directionsRequestSchema.safeParse(body);
    if (!parseResult.success) {
      const response: DirectionsResponse = {
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: ApiErrorMessage[ApiErrorCode.VALIDATION_ERROR],
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    const { start, end, option } = parseResult.data;

    // 3. 경로 조회
    try {
      const route = await getRoute(start, end, option);

      const response: DirectionsResponse = {
        success: true,
        data: route,
      };

      return NextResponse.json(response);
    } catch (error: any) {
      const response: DirectionsResponse = {
        success: false,
        error: {
          code: ApiErrorCode.NO_ROUTE_FOUND,
          message: error.message || ApiErrorMessage[ApiErrorCode.NO_ROUTE_FOUND],
        },
      };
      return NextResponse.json(response, { status: 404 });
    }
  } catch (error: any) {
    console.error('[API /directions] Unexpected error:', error);

    const response: DirectionsResponse = {
      success: false,
      error: {
        code: ApiErrorCode.INTERNAL_ERROR,
        message: ApiErrorMessage[ApiErrorCode.INTERNAL_ERROR],
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
