/**
 * Performance Monitoring Utilities
 * Web Vitals 수집 및 커스텀 메트릭 추적
 */

type MetricValue = number;
type MetricName = string;

interface PerformanceMetric {
  name: MetricName;
  value: MetricValue;
  timestamp: number;
  category: 'web-vital' | 'custom';
}

// Store metrics in memory (for development)
const metrics: PerformanceMetric[] = [];

/**
 * Web Vitals 수집 (CLS, FID, LCP, TTFB, INP)
 * Next.js layout.tsx에서 자동 호출됨
 */
export function reportWebVitals(metric: { name: string; value: number; id: string }) {
  const { name, value } = metric;

  // Log in development only
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Web Vitals] ${name}: ${value.toFixed(2)}ms`);
  }

  // Store metric
  metrics.push({
    name,
    value,
    timestamp: Date.now(),
    category: 'web-vital',
  });

  // Send to Sentry (if available and in production)
  if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined' && (window as any).Sentry) {
    (window as any).Sentry.addBreadcrumb({
      category: 'web-vitals',
      message: `${name}: ${value}`,
      level: 'info',
    });
  }
}

/**
 * 커스텀 메트릭 기록
 */
export function recordMetric(name: string, value: number) {
  metrics.push({
    name,
    value,
    timestamp: Date.now(),
    category: 'custom',
  });

  if (process.env.NODE_ENV === 'development') {
    console.log(`[Custom Metric] ${name}: ${value.toFixed(2)}ms`);
  }
}

/**
 * 성능 타이머 시작
 * @example
 * const endTimer = startTimer('search_duration');
 * // ... do work ...
 * const duration = endTimer(); // automatically recorded
 */
export function startTimer(name: string): () => number {
  const startTime = performance.now();

  return () => {
    const duration = performance.now() - startTime;
    recordMetric(name, duration);
    return duration;
  };
}

/**
 * 모든 메트릭 가져오기
 */
export function getMetrics(): PerformanceMetric[] {
  return [...metrics];
}

/**
 * 메트릭 초기화
 */
export function clearMetrics() {
  metrics.length = 0;
}

/**
 * 평균 메트릭 계산
 */
export function getAverageMetric(name: string): number | null {
  const filtered = metrics.filter((m) => m.name === name);
  if (filtered.length === 0) return null;

  const sum = filtered.reduce((acc, m) => acc + m.value, 0);
  return sum / filtered.length;
}

/**
 * 특정 카테고리 메트릭 가져오기
 */
export function getMetricsByCategory(category: 'web-vital' | 'custom'): PerformanceMetric[] {
  return metrics.filter((m) => m.category === category);
}
