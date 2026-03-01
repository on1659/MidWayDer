/**
 * Statistics Dashboard - /stats
 * 
 * 검색/클릭 통계를 시각화하는 대시보드
 */

'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, MousePointerClick, Clock, BarChart3, MapPin, ArrowLeft, ThumbsUp } from 'lucide-react';
import Link from 'next/link';
import { logger } from '@/lib/logger';

interface StatsData {
  period: string;
  data: {
    totalSearches: number;
    totalClicks: number;
    ctr: number;
    avgSearchDurationMs: number | null;
    categoryBreakdown: Array<{
      category: string;
      count: number;
      percentage: number;
    }>;
    topPlaces: Array<{
      place: {
        id: string;
        name: string;
        category: string;
        address: string;
      };
      clicks: number;
    }>;
  };
}

export default function StatsPage() {
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all'>('today');
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [satisfactionData, setSatisfactionData] = useState<{
    total: number;
    helpful: number;
    notHelpful: number;
    satisfactionRate: number;
  } | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const [statsRes, feedbackRes] = await Promise.all([
          fetch(`/api/stats?period=${period}`),
          fetch('/api/feedback')
        ]);
        
        const statsData = await statsRes.json();
        const feedbackData = await feedbackRes.json();
        
        if (statsData.success) {
          setStats(statsData);
        }
        if (feedbackData.success) {
          setSatisfactionData(feedbackData.data);
        }
      } catch (err) {
        logger.error('Failed to fetch stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [period]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-app)' }}>
        <div className="animate-pulse text-xl" style={{ color: 'var(--text-muted)' }}>
          통계를 불러오는 중...
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-app)' }}>
        <div className="text-xl" style={{ color: 'var(--text-muted)' }}>
          통계를 불러올 수 없습니다
        </div>
      </div>
    );
  }

  const { data } = stats;
  const periodLabels = {
    today: '오늘',
    week: '이번 주',
    month: '이번 달',
    all: '전체',
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-app)' }}>
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/">
                <button className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors">
                  <ArrowLeft className="w-5 h-5" style={{ color: 'var(--text-strong)' }} />
                </button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-strong)' }}>
                  <BarChart3 className="w-6 h-6" />
                  통계 대시보드
                </h1>
                <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  우리의 발자취를 확인해보세요
                </p>
              </div>
            </div>
          </div>

          {/* Period Selector */}
          <div className="flex gap-2 mt-4">
            {(['today', 'week', 'month', 'all'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  period === p ? 'shadow-md' : 'hover:bg-gray-50'
                }`}
                style={{
                  background: period === p ? 'var(--accent)' : 'var(--bg-surface)',
                  color: period === p ? 'white' : 'var(--text-primary)',
                }}
              >
                {periodLabels[p]}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                총 검색
              </span>
              <TrendingUp className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            </div>
            <p className="text-3xl font-bold" style={{ color: 'var(--text-strong)' }}>
              {data.totalSearches.toLocaleString()}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              {periodLabels[period]} 누적
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                총 클릭
              </span>
              <MousePointerClick className="w-5 h-5" style={{ color: 'var(--green-600)' }} />
            </div>
            <p className="text-3xl font-bold" style={{ color: 'var(--text-strong)' }}>
              {data.totalClicks.toLocaleString()}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              경유지 선택 횟수
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                클릭률 (CTR)
              </span>
              <BarChart3 className="w-5 h-5" style={{ color: 'var(--orange-500)' }} />
            </div>
            <p className="text-3xl font-bold" style={{ color: 'var(--text-strong)' }}>
              {data.ctr}%
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              {data.totalSearches > 0 ? '검색 대비 선택률' : '데이터 없음'}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                평균 검색 시간
              </span>
              <Clock className="w-5 h-5" style={{ color: 'var(--purple-500)' }} />
            </div>
            <p className="text-3xl font-bold" style={{ color: 'var(--text-strong)' }}>
              {data.avgSearchDurationMs 
                ? `${(data.avgSearchDurationMs / 1000).toFixed(1)}s`
                : 'N/A'}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              {data.avgSearchDurationMs && data.avgSearchDurationMs < 3000 
                ? '⚡ 빠른 응답' 
                : data.avgSearchDurationMs && data.avgSearchDurationMs < 5000
                ? '✅ 정상 범위'
                : data.avgSearchDurationMs
                ? '🐢 개선 필요'
                : '데이터 없음'}
            </p>
          </div>

          {/* Satisfaction Card */}
          {satisfactionData && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                  만족도
                </span>
                <ThumbsUp className="w-5 h-5" style={{ color: 'var(--green-600)' }} />
              </div>
              <p className="text-3xl font-bold" style={{ color: 'var(--text-strong)' }}>
                {satisfactionData.satisfactionRate}%
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                {satisfactionData.total > 0 
                  ? `${satisfactionData.total}명이 평가했어요`
                  : '아직 평가 없음'}
              </p>
            </div>
          )}
        </div>

        {/* Category Breakdown */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8">
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-strong)' }}>
            카테고리별 검색
          </h2>
          {data.categoryBreakdown.length > 0 ? (
            <div className="space-y-3">
              {data.categoryBreakdown.map((cat) => (
                <div key={cat.category}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {cat.category}
                    </span>
                    <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      {cat.count}회 ({cat.percentage}%)
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${cat.percentage}%`,
                        background: 'var(--accent)',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
              아직 검색 기록이 없습니다
            </p>
          )}
        </div>

        {/* Top Places */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-strong)' }}>
            인기 경유지 TOP 10
          </h2>
          {data.topPlaces.length > 0 ? (
            <div className="space-y-3">
              {data.topPlaces.map((item, idx) => (
                <div
                  key={item.place.id}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <div
                    className="flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm"
                    style={{
                      background: idx < 3 ? 'var(--accent)' : 'var(--bg-surface-muted)',
                      color: idx < 3 ? 'white' : 'var(--text-muted)',
                    }}
                  >
                    {idx + 1}
                  </div>
                  <MapPin className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate" style={{ color: 'var(--text-strong)' }}>
                      {item.place.name}
                    </p>
                    <p className="text-sm truncate" style={{ color: 'var(--text-muted)' }}>
                      {item.place.category} • {item.place.address}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold" style={{ color: 'var(--accent)' }}>
                      {item.clicks}회
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      선택됨
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
              아직 클릭 기록이 없습니다
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center py-6">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            통계는 실시간으로 업데이트됩니다
          </p>
          <Link href="/">
            <button className="mt-4 px-6 py-3 rounded-full font-medium text-white shadow-md active:scale-95 transition-all"
              style={{ background: 'var(--accent)' }}
            >
              홈으로 돌아가기
            </button>
          </Link>
        </div>
      </main>
    </div>
  );
}
