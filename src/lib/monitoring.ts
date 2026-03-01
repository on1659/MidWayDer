/**
 * 에러 모니터링 유틸리티
 *
 * Sentry(@sentry/nextjs)와 호환되는 인터페이스를 제공합니다.
 * DSN이 설정된 경우 Sentry로 전달하고, 미설정 시 콘솔에 출력합니다.
 *
 * 향후 @sentry/nextjs 설치 후:
 *   import * as Sentry from '@sentry/nextjs';
 *   captureException → Sentry.captureException
 */

import { logger } from '@/lib/logger';

type SentryLike = {
  captureException: (error: unknown, context?: Record<string, unknown>) => void;
};

// 런타임에 Sentry가 로드되어 있으면 사용
function getSentry(): SentryLike | null {
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    if (w.__SENTRY__ && typeof w.__SENTRY__.captureException === 'function') {
      return w.__SENTRY__;
    }
  }
  return null;
}

/**
 * 예외 캡처 — Sentry 또는 콘솔 로깅으로 에러 전달
 */
export function captureException(
  error: unknown,
  context?: Record<string, unknown>
): void {
  const sentry = getSentry();
  if (sentry) {
    sentry.captureException(error, context);
    return;
  }

  // Sentry 없음 → 서버 로그에만 기록
  if (process.env.NODE_ENV !== 'test') {
    logger.error('[captureException]', error, context ?? '');
  }
}

/**
 * 사용자 컨텍스트 설정
 */
export function setUserContext(userId: string): void {
  // @sentry/nextjs 설치 후: Sentry.setUser({ id: userId });
  logger.debug('[monitoring] setUserContext:', userId);
}
