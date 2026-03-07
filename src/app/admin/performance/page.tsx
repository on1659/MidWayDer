/**
 * 성능 모니터링 대시보드 페이지
 * /admin/performance
 * 
 * Web Vitals, API 응답 시간, 에러 로그 등을 표시
 */

'use client';

import { useEffect, useState } from 'react';
import { Activity, Clock, AlertTriangle, TrendingUp } from 'lucide-react';

interface WebVitalMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  description: string;
}

interface PerformanceStats {
  webVitals: WebVitalMetric[];
  avgSearchTime: number;
  totalSearches: number;
  errorCount: number;
  lastUpdated: string;
}

// Mock 데이터 (실제로는 API에서 가져와야 함)
const mockStats: PerformanceStats = {
  webVitals: [
    { name: 'LCP', value: 1.8, rating: 'good', description: 'Largest Contentful Paint' },
    { name: 'FID', value: 45, rating: 'good', description: 'First Input Delay' },
    { name: 'CLS', value: 0.05, rating: 'good', description: 'Cumulative Layout Shift' },
    { name: 'TTFB', value: 200, rating: 'good', description: 'Time to First Byte' },
  ],
  avgSearchTime: 2.4,
  totalSearches: 1234,
  errorCount: 5,
  lastUpdated: new Date().toISOString(),
};

function getRatingColor(rating: string): string {
  switch (rating) {
    case 'good':
      return 'text-green-600 bg-green-100';
    case 'needs-improvement':
      return 'text-yellow-600 bg-yellow-100';
    case 'poor':
      return 'text-red-600 bg-red-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
}

function WebVitalsCard({ metrics }: { metrics: WebVitalMetric[] }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Activity className="w-5 h-5 text-blue-500" />
        Web Vitals
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metrics.map((metric) => (
          <div key={metric.name} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-sm text-gray-500 dark:text-gray-400">{metric.name}</div>
            <div className="text-2xl font-bold">{metric.value}</div>
            <span className={`text-xs px-2 py-1 rounded ${getRatingColor(metric.rating)}`}>
              {metric.rating}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SearchMetricsCard({ avgTime, total }: { avgTime: number; total: number }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Clock className="w-5 h-5 text-purple-500" />
        검색 성능
      </h2>
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="text-sm text-gray-500 dark:text-gray-400">평균 응답 시간</div>
          <div className="text-2xl font-bold">{avgTime.toFixed(2)}s</div>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="text-sm text-gray-500 dark:text-gray-400">총 검색 수</div>
          <div className="text-2xl font-bold">{total.toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
}

function ErrorSummaryCard({ count }: { count: number }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-red-500" />
        에러 요약
      </h2>
      <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <div className="text-sm text-gray-500 dark:text-gray-400">최근 24시간 에러</div>
        <div className="text-2xl font-bold">{count}</div>
        {count > 0 && (
          <p className="text-xs text-red-500 mt-2">
            Sentry 대시보드에서 상세 내용을 확인하세요
          </p>
        )}
      </div>
    </div>
  );
}

export default function PerformancePage() {
  const [stats, setStats] = useState<PerformanceStats>(mockStats);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 실제 환경에서는 API에서 데이터 가져오기
    // 현재는 mock 데이터 사용
    const timer = setTimeout(() => {
      setStats(mockStats);
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-48 mb-6" />
            <div className="grid gap-6">
              <div className="h-48 bg-gray-300 rounded" />
              <div className="grid grid-cols-2 gap-6">
                <div className="h-32 bg-gray-300 rounded" />
                <div className="h-32 bg-gray-300 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="w-6 h-6" />
            성능 대시보드
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            마지막 업데이트: {new Date(stats.lastUpdated).toLocaleString('ko-KR')}
          </p>
        </header>

        <div className="grid gap-6">
          <WebVitalsCard metrics={stats.webVitals} />
          
          <div className="grid md:grid-cols-2 gap-6">
            <SearchMetricsCard avgTime={stats.avgSearchTime} total={stats.totalSearches} />
            <ErrorSummaryCard count={stats.errorCount} />
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              💡 실제 성능 데이터는 Vercel Analytics 대시보드에서 확인할 수 있습니다.
              이 페이지는 요약 정보만 표시합니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
