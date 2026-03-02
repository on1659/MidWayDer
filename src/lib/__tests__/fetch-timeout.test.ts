/**
 * fetch-timeout.test.ts
 * fetchWithTimeout — AbortController 기반 타임아웃 동작 검증
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchWithTimeout, FetchTimeoutError } from '../fetch-timeout';

/** 어보트 시그널을 인식하는 fetch 목 */
function abortAwareFetchMock() {
  return vi.fn().mockImplementation((_url: string, opts: RequestInit = {}) =>
    new Promise<Response>((_, reject) => {
      const sig = opts.signal as AbortSignal | undefined;
      if (sig?.aborted) {
        reject(sig.reason ?? new DOMException('Aborted', 'AbortError'));
        return;
      }
      sig?.addEventListener('abort', () =>
        reject(sig.reason ?? new DOMException('Aborted', 'AbortError'))
      );
    })
  );
}

describe('fetchWithTimeout — 타임아웃 동작', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('서버가 타임아웃 전 응답 시 정상 Response 반환', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    );
    const resPromise = fetchWithTimeout('/api/fast', {}, 5000);
    const res = await resPromise;
    expect(res.status).toBe(200);
  });

  it('서버가 타임아웃 초과 시 FetchTimeoutError 발생', async () => {
    global.fetch = abortAwareFetchMock();
    const resPromise = fetchWithTimeout('/api/slow', {}, 100);
    vi.advanceTimersByTime(200);
    await expect(resPromise).rejects.toThrow(FetchTimeoutError);
  });

  it('FetchTimeoutError.name이 "FetchTimeoutError"', async () => {
    global.fetch = abortAwareFetchMock();
    const resPromise = fetchWithTimeout('/api/slow', {}, 100);
    vi.advanceTimersByTime(200);
    await expect(resPromise).rejects.toMatchObject({ name: 'FetchTimeoutError' });
  });

  it('외부 AbortSignal abort 시 fetch 취소', async () => {
    global.fetch = abortAwareFetchMock();
    const controller = new AbortController();
    const resPromise = fetchWithTimeout('/api/test', { signal: controller.signal }, 5000);
    controller.abort();
    await expect(resPromise).rejects.toBeDefined();
  });

  it('응답 후 timer가 정리됨 (clearTimeout 호출)', async () => {
    const clearSpy = vi.spyOn(globalThis, 'clearTimeout');
    global.fetch = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }));
    await fetchWithTimeout('/api/fast', {}, 5000);
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });
});
