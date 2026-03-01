/**
 * 에러 객체에서 메시지 문자열을 추출하는 공통 타입 가드 헬퍼
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Unknown error';
}
