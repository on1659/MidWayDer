import { NextRequest, NextResponse } from 'next/server';

// ── 메모리 기반 Rate Limiter ──
// Map<ip, { count: number; resetAt: number }>
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30;       // 분당 최대 요청 수
const WINDOW_MS = 60 * 1000; // 1분

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true; // 허용
  }

  if (entry.count >= RATE_LIMIT) return false; // 차단
  entry.count += 1;
  return true;
}

// ── 보안 헤더 ──
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-DNS-Prefetch-Control': 'on',
};

export function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // 보안 헤더 추가 (전체 경로)
  Object.entries(SECURITY_HEADERS).forEach(([k, v]) => res.headers.set(k, v));

  // API 라우트 rate-limit
  if (req.nextUrl.pathname.startsWith('/api/')) {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1';

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }
  }

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
