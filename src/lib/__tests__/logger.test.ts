import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('logger — production 모드', () => {
  // isDev는 모듈 로드 시 고정되므로, vi.resetModules()로 재로드해야 NODE_ENV 변경이 반영됨
  beforeEach(() => vi.resetModules());
  afterEach(() => vi.restoreAllMocks());

  it('debug()는 console.log를 호출하지 않는다', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const { logger } = await import('@/lib/logger');
    logger.debug('test message');
    expect(console.log).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
  });

  it('warn()은 console.warn을 항상 호출한다', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { logger } = await import('@/lib/logger');
    logger.warn('경고 메시지');
    expect(console.warn).toHaveBeenCalledWith('경고 메시지');
    vi.unstubAllEnvs();
  });

  it('error()는 console.error를 항상 호출한다', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { logger } = await import('@/lib/logger');
    logger.error('에러 메시지');
    expect(console.error).toHaveBeenCalledWith('에러 메시지');
    vi.unstubAllEnvs();
  });

  it('개발: debug()는 console.log를 호출한다', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const { logger } = await import('@/lib/logger');
    logger.debug('[Detour] test');
    expect(console.log).toHaveBeenCalledWith('[Detour] test');
    vi.unstubAllEnvs();
  });
});
