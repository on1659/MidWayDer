/**
 * 성능 메트릭 수집 훅
 * 검색 응답 시간, 지도 렌더링 시간 등을 측정하고 Vercel Analytics에 전송
 */

import { useCallback } from 'react';
import { track } from '@vercel/analytics';

interface PerformanceMetric {
  name: string;
  duration: number;
  metadata?: Record<string, string | number>;
}

/**
 * 성능 측정 결과를 콘솔 및 Analytics에 기록
 */
function logMetric(metric: PerformanceMetric): void {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Performance] ${metric.name}: ${metric.duration.toFixed(2)}ms`, metric.metadata || '');
  }

  // 프로덕션에서만 Analytics 전송
  if (process.env.NODE_ENV === 'production') {
    track(metric.name, {
      duration: Math.round(metric.duration),
      ...metric.metadata,
    });
  }
}

/**
 * 성능 메트릭 수집 훅
 */
export function usePerformanceMetrics() {
  /**
   * 검색 API 응답 시간 측정
   */
  const measureSearchTime = useCallback(async <T,>(
    searchFn: () => Promise<T>,
    metadata?: Record<string, string | number>
  ): Promise<T> => {
    const start = performance.now();
    try {
      const result = await searchFn();
      const duration = performance.now() - start;

      logMetric({
        name: 'search_api_response',
        duration,
        metadata: { status: 'success', ...metadata },
      });

      return result;
    } catch (error) {
      const duration = performance.now() - start;

      logMetric({
        name: 'search_api_response',
        duration,
        metadata: {
          status: 'error',
          error: error instanceof Error ? error.message : 'unknown',
          ...metadata,
        },
      });

      throw error;
    }
  }, []);

  /**
   * 지도 렌더링 시간 측정
   */
  const measureMapRender = useCallback((
    renderFn: () => void,
    metadata?: Record<string, string | number>
  ): void => {
    const start = performance.now();
    renderFn();
    const duration = performance.now() - start;

    logMetric({
      name: 'map_render_time',
      duration,
      metadata,
    });
  }, []);

  /**
   * 커스텀 메트릭 기록
   */
  const trackCustomMetric = useCallback((
    name: string,
    duration: number,
    metadata?: Record<string, string | number>
  ): void => {
    logMetric({ name, duration, metadata });
  }, []);

  /**
   * Web Vital 기록 (LCP, FID, CLS 등)
   */
  const trackWebVital = useCallback((
    name: string,
    value: number,
    metadata?: Record<string, string | number>
  ): void => {
    logMetric({
      name: `web_vital_${name.toLowerCase()}`,
      duration: value,
      metadata,
    });
  }, []);

  return {
    measureSearchTime,
    measureMapRender,
    trackCustomMetric,
    trackWebVital,
  };
}

export default usePerformanceMetrics;
