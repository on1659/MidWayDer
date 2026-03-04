import { describe, it, expect, vi, afterEach } from 'vitest';
import { captureException, setUserContext } from '../monitoring';

vi.mock('../logger', () => ({
  logger: { error: vi.fn(), debug: vi.fn() },
}));
import { logger } from '../logger';

describe('captureException', () => {
  afterEach(() => vi.restoreAllMocks());

  // T1: Sentry 없을 때 (test 환경 → logger 미호출)
  it('Sentry 미설치 + NODE_ENV=test → logger.error 미호출', () => {
    vi.stubGlobal('window', {}); // __SENTRY__ 없음
    captureException(new Error('테스트 에러'));
    // process.env.NODE_ENV === 'test' → logger 미호출
    expect(logger.error).not.toHaveBeenCalled();
  });

  // T2: Sentry 있을 때
  it('window.__SENTRY__ 존재 시 captureException 위임', () => {
    const mockCapture = vi.fn();
    vi.stubGlobal('window', {
      __SENTRY__: { captureException: mockCapture },
    });
    const err = new Error('Sentry 에러');
    captureException(err, { route: '/api/search' });
    expect(mockCapture).toHaveBeenCalledWith(err, { route: '/api/search' });
  });

  // T3: context 없이 호출
  it('context 없이 captureException 호출 → crash 없음', () => {
    vi.stubGlobal('window', {});
    expect(() => captureException(new Error('no context'))).not.toThrow();
  });
});

describe('setUserContext', () => {
  // T4
  it('setUserContext 호출 → crash 없음', () => {
    expect(() => setUserContext('user-123')).not.toThrow();
  });
});
