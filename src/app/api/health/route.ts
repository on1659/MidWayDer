/**
 * Health Check API - Railway 헬스체크 + 서비스 상태 모니터링
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const checks: Record<string, string> = {};
  let healthy = true;

  try {
    // 1. 데이터베이스 연결 체크
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = 'ok';
    } catch (_dbError) {
      checks.database = 'error';
      healthy = false;
    }

    // 2. 카카오맵 API 토큰 유효성 체크
    try {
      const apiKey = process.env.KAKAO_REST_API_KEY;
      if (!apiKey) {
        checks.kakaoApi = 'missing_key';
        healthy = false;
      } else {
        const response = await fetch(
          'https://dapi.kakao.com/v2/local/search/keyword.json?query=test&size=1',
          {
            headers: {
              Authorization: `KakaoAK ${apiKey}`,
            },
            signal: AbortSignal.timeout(5000), // 5초 타임아웃
          }
        );

        if (response.ok) {
          checks.kakaoApi = 'ok';
        } else if (response.status === 401 || response.status === 403) {
          checks.kakaoApi = 'invalid_key';
          healthy = false;
        } else {
          checks.kakaoApi = `http_${response.status}`;
          healthy = false;
        }
      }
    } catch (_apiError) {
      checks.kakaoApi = 'timeout_or_network_error';
      healthy = false;
    }

    // 3. 환경변수 존재 여부
    checks.envVars = process.env.DATABASE_URL && process.env.KAKAO_REST_API_KEY ? 'ok' : 'missing';
    if (checks.envVars === 'missing') {
      healthy = false;
    }

    const response = {
      status: healthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks,
      uptime: process.uptime(),
      version: process.env.npm_package_version || '0.4.0',
    };

    return NextResponse.json(response, {
      status: healthy ? 200 : 500,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        checks,
      },
      { status: 500 }
    );
  }
}
