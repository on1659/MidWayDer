/**
 * HTML 특수문자를 이스케이프하여 XSS를 방지한다.
 * innerHTML에 외부 데이터를 삽입하기 전 반드시 이 함수를 통과시킨다.
 *
 * 치환 대상: & < > " ' (OWASP 기준 5가지)
 */
export function escapeHtml(str: unknown): string {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}
