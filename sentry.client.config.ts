/**
 * Sentry 클라이언트 설정
 *
 * 브라우저 환경에서 Sentry 에러 추적을 초기화합니다.
 * NEXT_PUBLIC_SENTRY_DSN 환경 변수가 설정된 경우에만 활성화됩니다.
 *
 * 설치: npm install @sentry/nextjs
 * Railway 환경 변수: NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
 */

// @sentry/nextjs 설치 후 아래 주석을 해제하세요:
// import * as Sentry from '@sentry/nextjs';
//
// const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
//
// if (SENTRY_DSN) {
//   Sentry.init({
//     dsn: SENTRY_DSN,
//     tracesSampleRate: 0.1,
//     replaysOnErrorSampleRate: 1.0,
//     replaysSessionSampleRate: 0.0,
//     debug: false,
//     integrations: [
//       Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }),
//     ],
//   });
// }

export {};
