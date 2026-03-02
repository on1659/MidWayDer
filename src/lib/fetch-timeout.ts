/**
 * fetchWithTimeout — AbortController 기반 타임아웃 래퍼
 *
 * 사용법:
 *   const res = await fetchWithTimeout('/api/popularity', {}, 5000);
 *   const res = await fetchWithTimeout(url, { signal: existingSignal }, 3000);
 */

export class FetchTimeoutError extends Error {
  constructor(url: string, timeoutMs: number) {
    super(`fetch timeout: ${url} (${timeoutMs}ms)`);
    this.name = 'FetchTimeoutError';
  }
}

export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 5000
): Promise<Response> {
  const controller = new AbortController();

  // 외부에서 signal이 전달된 경우 두 signal을 모두 처리
  const externalSignal = options.signal as AbortSignal | undefined;
  if (externalSignal) {
    externalSignal.addEventListener('abort', () => controller.abort());
  }

  const timer = setTimeout(() => {
    controller.abort(new FetchTimeoutError(url, timeoutMs));
  }, timeoutMs);

  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } catch (err) {
    if (controller.signal.aborted) {
      throw new FetchTimeoutError(url, timeoutMs);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
