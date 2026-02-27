/**
 * ResultList - 파스텔톤 카드형 결과 리스트
 */

'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Copy, Check, Navigation, Clock, Zap } from 'lucide-react';
import type { DetourResult } from '@/types/detour';
import { copyToClipboard } from '@/lib/clipboard';
import { getCategoryIcon } from '@/lib/category-icons';
import { openNavigationApp, getPreferredNavApp, setPreferredNavApp } from '@/lib/navigation-links';
import type { NavApp } from '@/lib/navigation-links';
import { getBusinessStatus, formatBusinessHours } from '@/lib/business-hours';
import { getRecommendationBadges, getBadgeColor } from '@/lib/recommendation-badges';
import { getVisitCount } from '@/lib/visit-tracking';
import { hashRoute } from '@/lib/utils/route-hash';
import { getTimeBasedCategoryHints, getTimeGreeting } from '@/lib/smart-category';
import { getSmartOneLiner } from '@/lib/smart-summary';
import { useRouteStore } from '@/store/route-store';
import ErrorFallback from '@/components/ui/ErrorFallback';
import BottomSheet from '@/components/ui/BottomSheet';

interface ResultListProps {
  results: DetourResult[];
  selectedId: string | null;
  isLoading: boolean;
  error: string | null;
  hasSearched: boolean;
  currentCategory: string;
  onSelect: (result: DetourResult) => void;
  onCategoryChange?: (category: string) => void;
  onRetry?: () => void;
  onSaveRoute?: () => void;
}

/** 경로상 위치를 5단계 자연어 라벨로 변환 */
function getRoutePositionLabel(result: DetourResult): string | null {
  const toWaypointDist = result.routes.toWaypoint.distance;
  const originalDist = result.routes.original.distance;
  if (!originalDist || originalDist === 0) return null;
  const progress = toWaypointDist / originalDist;
  if (progress < 0.2) return '출발 직후';
  if (progress < 0.4) return '경로 초반';
  if (progress < 0.6) return '경로 중간';
  if (progress < 0.8) return '경로 후반';
  return '도착 직전';
}

export default function ResultList({
  results,
  selectedId,
  isLoading,
  error,
  hasSearched,
  currentCategory,
  onSelect,
  onCategoryChange,
  onRetry,
  onSaveRoute,
}: ResultListProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [naviSheetOpen, setNaviSheetOpen] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<DetourResult['place'] | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  // 빠른 필터 상태
  const [openNowOnly, setOpenNowOnly] = useState(false);
  const [maxDetourMin, setMaxDetourMin] = useState<5 | 10 | 15 | null>(null);
  const [isCompact, setIsCompact] = useState(false);

  // 실시간 인기도 (최근 1시간 클릭 수)
  const [popularityMap, setPopularityMap] = useState<Record<string, number>>({});

  // 데이터 기반 인기 카테고리 (결과 없을 때 표시)
  const [statsCategories, setStatsCategories] = useState<string[]>([]);

  // 선호 네비 앱
  const [preferredNavApp, setPreferredNavAppState] = useState<NavApp | null>(null);

  useEffect(() => {
    setPreferredNavAppState(getPreferredNavApp());
  }, []);

  // 검색 결과 로드 완료 시 인기도 데이터 비동기 로드
  useEffect(() => {
    if (results.length === 0) return;
    const placeIds = results.map((r) => r.place.id).join(',');
    fetch(`/api/popularity?placeIds=${encodeURIComponent(placeIds)}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setPopularityMap(json.data || {});
      })
      .catch(() => {
        // 실패해도 UX 차단 안 함
      });
  }, [results]);

  // 결과 없을 때 인기 카테고리 데이터 로드 (SearchLog 기반)
  useEffect(() => {
    if (!hasSearched || results.length > 0) return;
    fetch('/api/stats?period=week')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data?.categoryBreakdown)) {
          const cats = (json.data.categoryBreakdown as { category: string }[])
            .map((c) => c.category)
            .filter((c) => c !== currentCategory)
            .slice(0, 6);
          if (cats.length > 0) setStatsCategories(cats);
        }
      })
      .catch(() => {});
  }, [hasSearched, results.length, currentCategory]);

  // 새로운 검색 결과 로드 시 빠른 필터 자동 초기화
  useEffect(() => {
    setOpenNowOnly(false);
    setMaxDetourMin(null);
  }, [results]);

  // 경로 해시 계산 (추천 뱃지용)
  const { originalRoute } = useRouteStore();
  const routeHash = originalRoute
    ? hashRoute(originalRoute.start, originalRoute.end)
    : '';

  // 빠른 필터 적용
  const filteredResults = useMemo(() => {
    let res = results;
    if (openNowOnly) {
      res = res.filter((r) => {
        if (!r.place.businessHours) return false;
        const status = getBusinessStatus(r.place.businessHours);
        return status.isOpen;
      });
    }
    if (maxDetourMin !== null) {
      res = res.filter((r) => r.detourCost.duration <= maxDetourMin * 60);
    }
    return res;
  }, [results, openNowOnly, maxDetourMin]);

  // 상대적 이탈 비교 바 계산용 (전체 결과 기준)
  const maxDetourDuration = results.length > 1
    ? Math.max(...results.map((r) => r.detourCost.duration))
    : 0;
  const minDetourDuration = results.length > 1
    ? Math.min(...results.map((r) => r.detourCost.duration))
    : 0;
  const detourRange = maxDetourDuration - minDetourDuration;

  const handleCopyAddress = async (e: React.MouseEvent, result: DetourResult) => {
    e.stopPropagation();
    const address = result.place.roadAddress || result.place.address;
    if (!address) return;
    
    const success = await copyToClipboard(address);
    if (success) {
      setCopiedId(result.place.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleSelect = async (result: DetourResult, rank: number) => {
    // 클릭 로그 저장 (비동기, 실패해도 UX 차단 안 함)
    fetch('/api/log-click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ placeId: result.place.id, rank }),
    }).catch(err => console.error('[ClickLog] Failed:', err));

    onSelect(result);
  };

  const handleFeedback = async (helpful: boolean) => {
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ helpful }),
      });
      setFeedbackSent(true);
      setTimeout(() => setFeedbackSent(false), 3000);
    } catch (err) {
      console.error('[Feedback] Failed:', err);
    }
  };

  const handleOpenNavi = (e: React.MouseEvent, place: DetourResult['place']) => {
    e.stopPropagation();
    // 선호 앱이 있으면 바로 열기
    if (preferredNavApp) {
      openNavigationApp(preferredNavApp, place.coordinates.lat, place.coordinates.lng, place.name)
        .catch((err) => console.error('[Navigation] Failed:', err));
      return;
    }
    setSelectedPlace(place);
    setNaviSheetOpen(true);
  };

  const handleOpenNaviSheet = (e: React.MouseEvent, place: DetourResult['place']) => {
    e.stopPropagation();
    setSelectedPlace(place);
    setNaviSheetOpen(true);
  };

  const handleNaviAppSelect = async (app: NavApp) => {
    if (!selectedPlace) return;

    try {
      await openNavigationApp(
        app,
        selectedPlace.coordinates.lat,
        selectedPlace.coordinates.lng,
        selectedPlace.name
      );
      // 선택한 앱 저장
      setPreferredNavApp(app);
      setPreferredNavAppState(app);
      setNaviSheetOpen(false);
    } catch (err) {
      console.error('[Navigation] Failed:', err);
    }
  };

  // 키보드 접근성: 화살표 키로 탐색
  useEffect(() => {
    if (results.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex((prev) => Math.min(prev + 1, results.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          handleSelect(results[focusedIndex], focusedIndex + 1);
          break;
        case 'Home':
          e.preventDefault();
          setFocusedIndex(0);
          break;
        case 'End':
          e.preventDefault();
          setFocusedIndex(results.length - 1);
          break;
      }
    };

    if (listRef.current) {
      listRef.current.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      if (listRef.current) {
        listRef.current.removeEventListener('keydown', handleKeyDown);
      }
    };
  }, [focusedIndex, results]);

  // 포커스된 항목 자동 스크롤
  useEffect(() => {
    const item = document.querySelector(`[data-result-index="${focusedIndex}"]`);
    if (item) {
      item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [focusedIndex]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-center py-4">
          <div className="flex gap-2 items-center">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="relative overflow-hidden p-4 bg-white rounded-2xl shadow-sm">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer" />
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 bg-gray-200 rounded-full animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded-lg w-2/3" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
                <div className="flex gap-2 mt-3">
                  <div className="h-6 bg-gray-200 rounded-full w-16" />
                  <div className="h-6 bg-gray-200 rounded-full w-16" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return <ErrorFallback error={error} onRetry={onRetry} compact />;
  }

  if (results.length === 0) {
    // 검색 전: 초기 상태 메시지
    if (!hasSearched) {
      const timeHints = getTimeBasedCategoryHints();
      const greeting = getTimeGreeting();

      return (
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
          <div className="text-5xl mb-3 animate-bounce">🗺️</div>
          <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
            가는 길에 들를 곳을 찾아드려요
          </h3>
          <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
            출발지와 도착지를 입력하고<br />
            원하는 카테고리를 선택해주세요
          </p>

          {/* 시간대 카테고리 스마트 제안 */}
          {timeHints.length > 0 && onCategoryChange && (
            <div className="w-full mb-4">
              <p className="text-xs font-semibold mb-2.5" style={{ color: 'var(--text-secondary)' }}>
                {greeting} 지금 이 시간엔 어때요?
              </p>
              <div className="flex gap-2 justify-center">
                {timeHints.map((hint) => (
                  <button
                    key={hint.category}
                    onClick={() => onCategoryChange(hint.category)}
                    className="flex flex-col items-center gap-1 px-4 py-3 rounded-2xl transition-all active:scale-95 flex-1 max-w-[140px]"
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1.5px solid var(--border-soft)',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                    }}
                  >
                    <span className="text-2xl">{hint.emoji}</span>
                    <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                      {hint.label}
                    </span>
                    <span className="text-[11px] leading-tight" style={{ color: 'var(--text-muted)' }}>
                      {hint.reason}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 justify-center">
            <span className="px-3 py-1 rounded-full text-xs" style={{ background: 'var(--blue-100)', color: 'var(--blue-600)' }}>
              🔍 스마트 검색
            </span>
            <span className="px-3 py-1 rounded-full text-xs" style={{ background: 'var(--green-100)', color: 'var(--green-600)' }}>
              ⚡ 빠른 경로
            </span>
            <span className="px-3 py-1 rounded-full text-xs" style={{ background: 'var(--purple-100)', color: 'var(--purple-600)' }}>
              📍 정확한 위치
            </span>
          </div>
        </div>
      );
    }

    // 검색 후 결과 없음: 대안 제시 (SearchLog 기반 → 없으면 폴백)
    const fallbackCategories = [
      '다이소', '스타벅스', '이디야', 'CU', 'GS25', '세븐일레븐',
      '맥도날드', '버거킹', '주유소', '휴게소', '은행', '우체국'
    ].filter(cat => cat !== currentCategory).slice(0, 6);
    const alternativeCategories = statsCategories.length > 0 ? statsCategories : fallbackCategories;

    return (
      <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
        <div className="text-6xl mb-4">😢</div>
        <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          이 경로에는 {currentCategory}가 없어요
        </h3>
        <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
          검색 범위를 넓히거나<br />
          다른 카테고리를 선택해보세요
        </p>

        {onCategoryChange && alternativeCategories.length > 0 && (
          <>
            <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
              {statsCategories.length > 0 ? '🔥 이 경로에서 인기 있는 카테고리' : '대신 이런 카테고리는 어때요?'}
            </p>
            <div className="flex flex-wrap gap-2 justify-center mb-6">
              {alternativeCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => onCategoryChange(cat)}
                  className="px-4 py-2 rounded-full text-sm font-medium transition-all active:scale-95"
                  style={{
                    background: 'var(--blue-100)',
                    color: 'var(--blue-600)',
                    border: '1px solid var(--blue-300)',
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </>
        )}

        {onRetry && (
          <button
            onClick={onRetry}
            className="px-6 py-2.5 rounded-full text-sm font-semibold transition-all active:scale-95"
            style={{
              background: 'var(--accent)',
              color: 'var(--bg-surface)',
            }}
          >
            다시 검색
          </button>
        )}
      </div>
    );
  }

  // 결과 요약 데이터 계산 (전체 기준)
  const avgDetourMin = Math.round(
    results.reduce((sum, r) => sum + r.detourCost.duration, 0) / results.length / 60
  );
  const withinFiveMin = results.filter((r) => r.detourCost.duration <= 300).length;
  const bestResult = results.reduce((best, r) =>
    r.detourCost.duration < best.detourCost.duration ? r : best, results[0]
  );
  const hasBusinessHoursData = results.some((r) => !!r.place.businessHours);
  const openNowCount = results.filter((r) => {
    if (!r.place.businessHours) return false;
    return getBusinessStatus(r.place.businessHours).isOpen;
  }).length;

  return (
    <div className="space-y-3">
      {/* 결과 요약 스마트 헤더 */}
      <div
        className="flex items-center justify-between px-4 py-3 rounded-2xl"
        style={{
          background: 'linear-gradient(135deg, var(--blue-50), var(--accent-weak))',
          border: '1px solid var(--blue-200)',
        }}
      >
        <div className="flex items-center gap-3 flex-wrap min-w-0 flex-1">
          <span className="text-sm font-bold" style={{ color: 'var(--blue-700)' }}>
            ✅ {results.length}개 발견
          </span>
          <span
            className="text-xs px-2 py-1 rounded-full font-semibold"
            style={{ background: 'var(--blue-150)', color: 'var(--blue-600)' }}
          >
            평균 +{avgDetourMin}분
          </span>
          {withinFiveMin > 0 && (
            <span
              className="text-xs px-2 py-1 rounded-full font-semibold"
              style={{ background: 'var(--green-100)', color: 'var(--green-700)' }}
            >
              ⚡ {withinFiveMin}개 +5분 이내
            </span>
          )}
        </div>
        <div className="shrink-0 text-right ml-2">
          <p className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>최단</p>
          <p className="text-xs font-bold truncate max-w-[80px]" style={{ color: 'var(--text-primary)' }}>
            {bestResult.place.name}
          </p>
        </div>
      </div>

      {/* ── 빠른 필터 칩 ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* 지금 열려있는 곳만 */}
        {hasBusinessHoursData && (
          <button
            onClick={() => setOpenNowOnly((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95"
            style={{
              background: openNowOnly ? 'var(--green-500)' : 'var(--green-50)',
              color: openNowOnly ? 'white' : 'var(--green-700)',
              border: `1.5px solid ${openNowOnly ? 'var(--green-500)' : 'var(--green-200)'}`,
            }}
          >
            <Clock className="w-3 h-3" />
            지금 열려있는 곳만
            {openNowOnly && openNowCount > 0 && (
              <span className="ml-0.5 opacity-80">({openNowCount})</span>
            )}
          </button>
        )}

        {/* 이탈 시간 상한 */}
        {([5, 10, 15] as const).map((min) => (
          <button
            key={min}
            onClick={() => setMaxDetourMin((v) => (v === min ? null : min))}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95"
            style={{
              background: maxDetourMin === min ? 'var(--accent)' : 'var(--blue-50)',
              color: maxDetourMin === min ? 'white' : 'var(--blue-700)',
              border: `1.5px solid ${maxDetourMin === min ? 'var(--accent)' : 'var(--blue-200)'}`,
            }}
          >
            <Zap className="w-3 h-3" />
            +{min}분 이내
          </button>
        ))}

        {/* 필터 적용 중 안내 */}
        {(openNowOnly || maxDetourMin !== null) && (
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {filteredResults.length}개 표시 중
          </span>
        )}

        {/* 간략/자세히 보기 토글 */}
        <button
          onClick={() => setIsCompact((v) => !v)}
          className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 shrink-0"
          style={{
            background: isCompact ? 'var(--text-primary)' : 'var(--bg-muted, #f3f4f6)',
            color: isCompact ? 'white' : 'var(--text-secondary)',
            border: '1.5px solid var(--border-soft)',
          }}
          title={isCompact ? '자세히 보기로 전환' : '간략 보기로 전환'}
        >
          {isCompact ? '☰ 자세히' : '≡ 간략'}
        </button>
      </div>

      {/* 필터 결과 없음 안내 */}
      {filteredResults.length === 0 && (openNowOnly || maxDetourMin !== null) && (
        <div className="py-8 text-center">
          <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            조건에 맞는 경유지가 없어요
          </p>
          <button
            onClick={() => { setOpenNowOnly(false); setMaxDetourMin(null); }}
            className="mt-3 text-xs underline"
            style={{ color: 'var(--accent)' }}
          >
            필터 초기화
          </button>
        </div>
      )}

      <div className="space-y-2.5">
      {filteredResults.map((result, index) => {
        const isSelected = selectedId === result.place.id;
        const detourKm = (result.detourCost.distance / 1000).toFixed(1);
        const detourMin = Math.round(result.detourCost.duration / 60);
        const routeLabel = (result as any).routeType === 'shortest' ? '최단거리' : (result as any).routeType === 'fastest' ? '최단시간' : null;
        const recentClicks = popularityMap[result.place.id] ?? 0;

        return (
          <button
            key={result.place.id}
            data-result-index={index}
            onClick={() => handleSelect(result, index + 1)}
            className={`w-full ${isCompact ? 'px-3 py-2.5' : 'p-4'} rounded-2xl text-left transition-all active:scale-[0.98] shadow-sm`}
            style={{
              background: isSelected ? 'var(--blue-200)' : 'var(--bg-surface)',
              border: isSelected ? '1.5px solid var(--accent)' : '1px solid var(--border-soft)',
            }}
          >
          {isCompact ? (
            // ── 컴팩트 모드 ──
            <div className="flex items-center gap-2.5">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                style={{
                  background: index === 0 ? 'var(--accent)' : 'var(--blue-150)',
                  color: index === 0 ? 'white' : 'var(--accent)',
                }}
              >
                {index + 1}
              </div>
              <span className="text-base shrink-0">{getCategoryIcon(result.place.category)}</span>
              <p className="text-sm font-bold flex-1 truncate min-w-0" style={{ color: 'var(--text-primary)' }}>
                {result.place.name}
              </p>
              {(() => {
                const compactPos = getRoutePositionLabel(result);
                return compactPos ? (
                  <span
                    className="shrink-0 text-[11px] px-2 py-0.5 rounded-full"
                    style={{ background: 'var(--purple-100)', color: 'var(--purple-700)' }}
                  >
                    📍 {compactPos}
                  </span>
                ) : null;
              })()}
              <span
                className="shrink-0 text-[12px] font-bold px-2 py-1 rounded-full"
                style={{ background: 'var(--yellow-100)', color: 'var(--yellow-700)' }}
              >
                +{detourMin}분
              </span>
              <button
                onClick={(e) => handleOpenNavi(e, result.place)}
                className="shrink-0 p-2 rounded-lg active:scale-95"
                style={{ background: 'var(--accent-weak)', color: 'var(--accent)' }}
                title="네비 시작"
                aria-label="네비 시작"
              >
                <Navigation className="w-4 h-4" />
              </button>
            </div>
          ) : (
            // ── 전체 카드 모드 ──
            <div className="flex items-start gap-3">
              {/* Rank badge with category icon */}
              <div className="flex flex-col items-center gap-1 shrink-0">
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-base font-bold"
                  style={{
                    background: index === 0 ? 'var(--accent)' : 'var(--blue-150)',
                    color: index === 0 ? 'var(--bg-surface)' : 'var(--accent)',
                  }}
                >
                  {index + 1}
                </div>
                <span className="text-xl">{getCategoryIcon(result.place.category)}</span>
              </div>

              <div className="flex-1 min-w-0 mr-2">
                {/* Name */}
                <h3 className="text-[17px] font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                  {result.place.name}
                </h3>
                {/* Address */}
                {(result.place.roadAddress || result.place.address) && (
                  <p className="text-[13px] mt-1 truncate" style={{ color: 'var(--text-secondary)' }}>
                    {result.place.roadAddress || result.place.address}
                  </p>
                )}

                {/* Badges */}
                <div className="flex flex-wrap items-center gap-2 mt-2.5">
                  {/* 기본 정보 뱃지: 이탈 거리/시간 */}
                  <span
                    className="inline-flex items-center px-3 py-1.5 rounded-full text-[13px] font-semibold"
                    style={{ background: 'var(--accent-weak)', color: 'var(--accent)' }}
                  >
                    +{detourKm}km
                  </span>
                  <span
                    className="inline-flex items-center px-3 py-1.5 rounded-full text-[13px] font-semibold"
                    style={{ background: 'var(--yellow-100)', color: 'var(--yellow-600)' }}
                  >
                    +{detourMin}분
                  </span>
                  {routeLabel && (
                    <span
                      className="inline-flex items-center px-3 py-1.5 rounded-full text-[13px] font-semibold"
                      style={{ background: 'var(--green-100)', color: 'var(--green-700)' }}
                    >
                      {routeLabel}
                    </span>
                  )}
                  {/* 경로상 위치 뱃지 */}
                  {(() => {
                    const posLabel = getRoutePositionLabel(result);
                    if (!posLabel) return null;
                    return (
                      <span
                        className="inline-flex items-center px-3 py-1.5 rounded-full text-[13px] font-semibold"
                        style={{ background: 'var(--purple-100)', color: 'var(--purple-700)' }}
                        title="원본 경로상 이 장소의 위치"
                      >
                        📍 {posLabel}
                      </span>
                    );
                  })()}
                  {/* 실시간 인기도 뱃지 */}
                  {recentClicks >= 2 && (
                    <span
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[13px] font-semibold"
                      style={{ background: 'var(--orange-100)', color: 'var(--orange-600)' }}
                      title="최근 1시간 내 다른 사용자들이 클릭한 횟수"
                    >
                      🔥 {recentClicks}명 관심
                    </span>
                  )}
                  {/* 영업 상태 뱃지 */}
                  {result.place.businessHours && (() => {
                    const status = getBusinessStatus(result.place.businessHours);
                    if (status.label === '정보 없음') return null;
                    return (
                      <span
                        className="inline-flex items-center px-3 py-1.5 rounded-full text-[13px] font-semibold"
                        style={{
                          background: status.isOpen ? 'var(--green-100)' : 'var(--red-100)',
                          color: status.color,
                        }}
                      >
                        {status.emoji} {status.label}
                      </span>
                    );
                  })()}
                </div>

                {/* 상대적 이탈 비교 바 */}
                {detourRange > 30 && (
                  <div className="mt-2.5 flex items-center gap-2">
                    <span className="text-[10px] shrink-0" style={{ color: 'var(--text-muted)' }}>이탈</span>
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-soft)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${Math.max(4, Math.round(((result.detourCost.duration - minDetourDuration) / detourRange) * 100))}%`,
                          background:
                            (result.detourCost.duration - minDetourDuration) / detourRange < 0.3
                              ? '#22c55e'
                              : (result.detourCost.duration - minDetourDuration) / detourRange < 0.65
                              ? '#f59e0b'
                              : '#f97316',
                        }}
                      />
                    </div>
                    <span
                      className="text-[10px] font-semibold shrink-0 w-6"
                      style={{
                        color:
                          (result.detourCost.duration - minDetourDuration) / detourRange < 0.3
                            ? '#16a34a'
                            : (result.detourCost.duration - minDetourDuration) / detourRange < 0.65
                            ? '#b45309'
                            : '#ea580c',
                      }}
                    >
                      {(result.detourCost.duration - minDetourDuration) / detourRange < 0.3
                        ? '최소'
                        : (result.detourCost.duration - minDetourDuration) / detourRange < 0.65
                        ? '보통'
                        : '높음'}
                    </span>
                  </div>
                )}

                {/* 추천 이유 뱃지 + 스마트 한 줄 요약 */}
                {(() => {
                  const visitCount = routeHash ? getVisitCount(result.place.id, routeHash) : 0;
                  const badges = getRecommendationBadges(
                    result,
                    index + 1,
                    undefined, // totalClicks는 서버에서 가져와야 함 (TODO)
                    visitCount
                  );
                  const oneLiner = getSmartOneLiner(result, index + 1, visitCount || undefined);

                  return (
                    <>
                      {badges.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {badges.map((badge, i) => {
                            const colors = getBadgeColor(badge.type);
                            return (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold"
                                style={{
                                  background: colors.bg,
                                  color: colors.text,
                                  border: `1px solid ${colors.border}`,
                                }}
                                title={badge.description}
                              >
                                <span>{badge.icon}</span>
                                <span>{badge.label}</span>
                              </span>
                            );
                          })}
                        </div>
                      )}
                      {/* 스마트 한 줄 추천 문구 */}
                      {oneLiner && (
                        <p
                          className="text-[12px] mt-2 font-medium leading-snug"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {oneLiner}
                        </p>
                      )}
                    </>
                  );
                })()}

                {/* Navigation Button */}
                <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border-soft)' }}>
                  {preferredNavApp ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => handleOpenNavi(e, result.place)}
                        className="flex-1 flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-[14px] transition-all active:scale-95 justify-center"
                        style={{ background: 'var(--accent-weak)', color: 'var(--accent)' }}
                      >
                        <Navigation className="w-4 h-4" />
                        {preferredNavApp === 'kakao' ? '카카오내비' : preferredNavApp === 'naver' ? '네이버지도' : '티맵'}으로 시작
                      </button>
                      <button
                        onClick={(e) => handleOpenNaviSheet(e, result.place)}
                        className="px-3 py-2 rounded-lg text-[12px] font-medium transition-all active:scale-95"
                        style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)', border: '1px solid var(--border-soft)' }}
                        title="다른 앱 선택"
                      >
                        변경
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => handleOpenNavi(e, result.place)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-[14px] transition-all active:scale-95 w-full justify-center"
                      style={{ background: 'var(--accent-weak)', color: 'var(--accent)' }}
                    >
                      <Navigation className="w-4 h-4" />
                      네비 시작
                    </button>
                  )}
                </div>
              </div>

              {/* Copy button */}
              <button
                onClick={(e) => handleCopyAddress(e, result)}
                className="shrink-0 p-2 rounded-lg hover:bg-gray-100 transition-colors active:scale-95 self-start"
                title="주소 복사"
              >
                {copiedId === result.place.id ? (
                  <Check className="w-4 h-4" style={{ color: 'var(--green-600)' }} />
                ) : (
                  <Copy className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                )}
              </button>
            </div>
          )}
          </button>
        );
      })}
      </div>

      {/* 즐겨찾기 저장 CTA */}
      {results.length > 0 && onSaveRoute && (
        <button
          onClick={onSaveRoute}
          className="mt-4 w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-[15px] transition-all active:scale-[0.98] shadow-sm"
          style={{
            background: 'linear-gradient(135deg, var(--yellow-100), var(--orange-50, #fff7ed))',
            color: 'var(--yellow-700)',
            border: '1.5px solid var(--yellow-300)',
          }}
        >
          <span className="text-lg">⭐</span>
          이 경로 즐겨찾기로 저장
        </button>
      )}

      {/* Feedback Section */}
      {results.length > 0 && (
        <div className="mt-4 p-4 bg-white rounded-2xl shadow-sm border border-gray-100">
          <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
            이 검색 결과가 도움됐나요?
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => handleFeedback(true)}
              disabled={feedbackSent}
              className="flex-1 py-3 rounded-xl font-medium transition-all active:scale-95 disabled:opacity-50"
              style={{ background: 'var(--green-100)', color: 'var(--green-600)' }}
            >
              👍 도움됐어요
            </button>
            <button
              onClick={() => handleFeedback(false)}
              disabled={feedbackSent}
              className="flex-1 py-3 rounded-xl font-medium transition-all active:scale-95 disabled:opacity-50"
              style={{ background: 'var(--red-100)', color: 'var(--red-600)' }}
            >
              👎 별로예요
            </button>
          </div>
          {feedbackSent && (
            <p className="text-sm mt-2 text-center" style={{ color: 'var(--green-600)' }}>
              감사합니다! 소중한 의견 반영할게요 ✨
            </p>
          )}
        </div>
      )}

      {/* Navigation App Selection Bottom Sheet */}
      <BottomSheet
        visible={naviSheetOpen}
        snap="collapsed"
        onSnapChange={(snap) => { if (snap === 'collapsed') setNaviSheetOpen(false); }}
      >
        <div className="p-6">
          <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
            어떤 앱으로 안내할까요?
          </h3>
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
            선택한 앱을 기억해 다음엔 바로 실행해요
          </p>
          {selectedPlace && (
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              {selectedPlace.name}
            </p>
          )}
          <div className="space-y-3">
            {(
              [
                { app: 'kakao' as NavApp, label: '카카오내비', sub: 'KakaoNavi', bg: 'bg-yellow-400', emoji: '🗺️' },
                { app: 'naver' as NavApp, label: '네이버지도', sub: 'Naver Map', bg: 'bg-green-500', emoji: '🧭' },
                { app: 'tmap' as NavApp, label: '티맵', sub: 'TMAP', bg: 'bg-red-500', emoji: '📍' },
              ] as const
            ).map(({ app, label, sub, bg, emoji }) => {
              const isPreferred = preferredNavApp === app;
              return (
                <button
                  key={app}
                  onClick={() => handleNaviAppSelect(app)}
                  className="w-full flex items-center gap-4 p-4 rounded-xl transition-all active:scale-98 shadow-sm"
                  style={{
                    background: isPreferred ? 'var(--blue-50)' : 'var(--bg-surface)',
                    border: `1px solid ${isPreferred ? 'var(--accent)' : 'var(--border-soft)'}`,
                  }}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${bg}`}>
                    <span className="text-2xl">{emoji}</span>
                  </div>
                  <div className="text-left flex-1">
                    <div className="font-bold" style={{ color: 'var(--text-primary)' }}>{label}</div>
                    <div className="text-sm" style={{ color: 'var(--text-muted)' }}>{sub}</div>
                  </div>
                  {isPreferred && (
                    <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: 'var(--accent)', color: 'white' }}>
                      기억됨
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
