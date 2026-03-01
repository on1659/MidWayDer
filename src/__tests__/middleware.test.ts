import { describe, test, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from '@/middleware';

// NOTE: rate-limit Map은 모듈 레벨 싱글톤이므로 테스트 순서가 중요합니다.
// 각 describe 블록은 새로운 IP를 사용합니다.

describe('middleware rate-limit', () => {
  test('30회 이내 API 요청은 허용', () => {
    for (let i = 0; i < 30; i++) {
      const req = new NextRequest('http://localhost/api/search', {
        headers: { 'x-forwarded-for': '1.2.3.4' },
      });
      const res = middleware(req);
      expect(res.status).not.toBe(429);
    }
  });

  test('31번째 요청에서 429 반환', () => {
    // 위 루프에서 1.2.3.4 IP는 30회 소진
    const req = new NextRequest('http://localhost/api/search', {
      headers: { 'x-forwarded-for': '1.2.3.4' },
    });
    const res = middleware(req);
    expect(res.status).toBe(429);
  });

  test('보안 헤더가 응답에 포함됨', () => {
    const req = new NextRequest('http://localhost/', {
      headers: { 'x-forwarded-for': '5.6.7.8' },
    });
    const res = middleware(req);
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(res.headers.get('X-Frame-Options')).toBe('DENY');
    expect(res.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
  });
});
