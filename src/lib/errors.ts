/**
 * 커스텀 에러 클래스
 * 에러 타입별로 명확한 구분을 위해 사용
 */

/**
 * 데이터베이스 관련 에러
 * Prisma 쿼리 실패, 연결 오류 등
 */
export class DatabaseError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'DatabaseError';
  }
}

/**
 * 외부 API 프로바이더 에러
 * Kakao, Naver 등 지도 API 오류
 */
export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: 'kakao' | 'naver',
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

/**
 * 유효성 검사 에러
 * 입력값 검증 실패
 */
export class ValidationError extends Error {
  constructor(message: string, public readonly field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * 에러 타입 가드
 */
export function isDatabaseError(error: unknown): error is DatabaseError {
  return error instanceof DatabaseError;
}

export function isProviderError(error: unknown): error is ProviderError {
  return error instanceof ProviderError;
}

export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}
