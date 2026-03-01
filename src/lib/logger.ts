const isDev = process.env.NODE_ENV === 'development';

export const logger = {
  /** 개발 전용: 알고리즘 추적, 캐시 히트, 필터 단계 등 */
  debug: (...args: unknown[]) => {
    if (isDev) console.log(...args);
  },
  /** 개발 전용: 주요 이벤트 정보 */
  info: (...args: unknown[]) => {
    if (isDev) console.info(...args);
  },
  /** 항상 출력: 예상 가능한 경고 */
  warn: (...args: unknown[]) => console.warn(...args),
  /** 항상 출력: 에러 상황 */
  error: (...args: unknown[]) => console.error(...args),
};
