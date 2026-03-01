/**
 * Sentry 서버 설정
 *
 * Next.js 서버(Node.js) 환경에서 Sentry 에러 추적을 초기화합니다.
 * SENTRY_DSN 환경 변수가 설정된 경우에만 활성화됩니다.
 *
 * 설치: npm install @sentry/nextjs
 * Railway 환경 변수: SENTRY_DSN=https://...@sentry.io/...
 */

// @sentry/nextjs 설치 후 아래 주석을 해제하세요:
// import * as Sentry from '@sentry/nextjs';
//
// const SENTRY_DSN = process.env.SENTRY_DSN;
//
// if (SENTRY_DSN) {
//   Sentry.init({
//     dsn: SENTRY_DSN,
//     tracesSampleRate: 0.1,
//     debug: false,
//   });
// }

export {};
