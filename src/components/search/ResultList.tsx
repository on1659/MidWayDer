/**
 * ResultList - 파스텔톤 카드형 결과 리스트
 */

'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Copy, Check, Navigation, Clock, Zap, Star } from 'lucide-react';
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
import { getPlaceFavorites, addPlaceFavorite, removePlaceFavorite } from '@/lib/place-favorites';

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
  onExpandRadius?: () => void;
  onCancel?: () => void;
  sortBy?: 'score' | 'distance' | 'duration';
  onHoverResult?: (id: string | null) => void;
}

const LOADING_STAGES = [
  { icon: '🔍', text: '경로 분석 중', sub: '최적 경로를 계산하고 있어요' },
  { icon: '📍', text: '장소 탐색 중', sub: '경로 주변 매장을 찾고 있어요' },
  { icon: '⚡', text: '비용 계산 중', sub: '이탈 비용을 정밀하게 계산 중이에요' },
];

/** 예상 도착 시간 계산 (baseMs: 출발 기준 밀리초, 기본값 지금) */
function getETAText(result: DetourResult, baseMs?: number): { waypoint: string; destination: string } | null {
  const toSec = result.routes?.toWaypoint?.duration;
  const fromSec = result.routes?.fromWaypoint?.duration;
  if (!toSec || !fromSec) return null;
  const now = baseMs ?? Date.now();
  const fmt = (ms: number) => {
    const d = new Date(ms);
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  };
  return {
    waypoint: fmt(now + toSec * 1000),
    destination: fmt(now + toSec * 1000 + fromSec * 1000),
  };
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
  onExpandRadius,
  onCancel,
  sortBy,
  onHoverResult,
}: ResultListProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [naviSheetOpen, setNaviSheetOpen] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<DetourResult['place'] | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [scoreDetailOpenId, setScoreDetailOpenId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // 스와이프 액션 상태 (ref = 실제 추적, state = 시각적 반영)
  const swipeInfoRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    deltaX: number;
    locked: boolean;
  } | null>(null);
  const [swipeVisual, setSwipeVisual] = useState<{ id: string; deltaX: number } | null>(null);

  // 빠른 필터 상태
  const [openNowOnly, setOpenNowOnly] = useState(false);
  const [maxDetourMin, setMaxDetourMin] = useState<5 | 10 | 15 | null>(null);
  const [isCompact, setIsCompact] = useState(false);

  // 출발 예정 시각 (기본: 현재 시각)
  const [departureTime, setDepartureTime] = useState<string>(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });

  // departureTime → ms 변환 (과거 시각이면 다음날로)
  const departureMs = useMemo(() => {
    const [h, m] = departureTime.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    if (d.getTime() < Date.now() - 60000) d.setDate(d.getDate() + 1);
    return d.getTime();
  }, [departureTime]);

  // 실시간 인기도 (최근 1시간 클릭 수)
  const [popularityMap, setPopularityMap] = useState<Record<string, number>>({});

  // 데이터 기반 인기 카테고리 (결과 없을 때 표시)
  const [statsCategories, setStatsCategories] = useState<string[]>([]);

  // 선호 네비 앱
  const [preferredNavApp, setPreferredNavAppState] = useState<NavApp | null>(null);

  useEffect(() => {
    setPreferredNavAppState(getPreferredNavApp());
  }, []);

  // 로딩 단계 (0: 경로 분석, 1: 장소 탐색, 2: 비용 계산)
  const [loadingStage, setLoadingStage] = useState(0);

  useEffect(() => {
    if (!isLoading) { setLoadingStage(0); return; }
    const t1 = setTimeout(() => setLoadingStage(1), 2500);
    const t2 = setTimeout(() => setLoadingStage(2), 6000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [isLoading]);

  // 개별 장소 즐겨찾기
  const [favPlaces, setFavPlaces] = useState<Set<string>>(new Set());

  useEffect(() => {
    const saved = getPlaceFavorites().map((f) => f.placeId);
    setFavPlaces(new Set(saved));
  }, []);

  const handleTogglePlaceFav = (e: React.MouseEvent, result: DetourResult) => {
    e.stopPropagation();
    const id = result.place.id;
    if (favPlaces.has(id)) {
      removePlaceFavorite(id);
      setFavPlaces((prev) => { const s = new Set(prev); s.delete(id); return s; });
    } else {
      addPlaceFavorite({
        placeId: id,
        placeName: result.place.name,
        category: result.place.category,
        address: result.place.roadAddress || result.place.address || '',
        lat: result.place.coordinates.lat,
        lng: result.place.coordinates.lng,
      });
      setFavPlaces((prev) => new Set([...prev, id]));
    }
  };

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

  // ── 스와이프 액션 핸들러 ──
  const handleCardTouchStart = useCallback((e: React.TouchEvent, id: string) => {
    swipeInfoRef.current = {
      id,
      startX: e.touches[0].clientX,
      startY: e.touches[0].clientY,
      deltaX: 0,
      locked: false,
    };
  }, []);

  const handleCardTouchMove = useCallback((e: React.TouchEvent, id: string) => {
    const info = swipeInfoRef.current;
    if (!info || info.id !== id) return;
    const deltaX = e.touches[0].clientX - info.startX;
    const deltaY = e.touches[0].clientY - info.startY;
    if (!info.locked) {
      if (Math.abs(deltaX) < 8 && Math.abs(deltaY) < 8) return;
      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        swipeInfoRef.current = null;
        setSwipeVisual(null);
        return;
      }
      info.locked = true;
    }
    info.deltaX = deltaX;
    setSwipeVisual({ id, deltaX });
  }, []);

  const handleCardTouchEnd = useCallback((result: DetourResult) => {
    const info = swipeInfoRef.current;
    swipeInfoRef.current = null;
    setSwipeVisual(null);
    if (!info || info.id !== result.place.id || !info.locked) return;
    if (info.deltaX > 80) {
      // Swipe right → 네비
      if (preferredNavApp) {
        openNavigationApp(preferredNavApp, result.place.coordinates.lat, result.place.coordinates.lng, result.place.name)
          .catch((err) => console.error('[Navigation] Failed:', err));
      } else {
        setSelectedPlace(result.place);
        setNaviSheetOpen(true);
      }
    } else if (info.deltaX < -80) {
      // Swipe left → 주소 복사
      const address = result.place.roadAddress || result.place.address;
      if (address) {
        copyToClipboard(address).then((success) => {
          if (success) {
            setCopiedId(result.place.id);
            setTimeout(() => setCopiedId(null), 2000);
          }
        });
      }
    }
  }, [preferredNavApp]);

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
        {/* 3단계 로딩 인디케이터 */}
        <div
          className="px-4 py-5 rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, var(--blue-50), var(--accent-weak))',
            border: '1px solid var(--blue-200)',
          }}
        >
          {/* 단계 아이콘 */}
          <div className="flex justify-between items-start mb-3">
            {LOADING_STAGES.map((stage, i) => (
              <div
                key={i}
                className={`flex flex-col items-center gap-1.5 flex-1 transition-all duration-500 ${
                  i <= loadingStage ? 'opacity-100' : 'opacity-30'
                }`}
              >
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center text-xl transition-all duration-300 ${
                    i < loadingStage
                      ? 'bg-green-100'
                      : i === loadingStage
                      ? 'shadow-md scale-110'
                      : 'bg-gray-100'
                  }`}
                  style={i === loadingStage ? { background: 'var(--accent-weak)' } : {}}
                >
                  {i < loadingStage ? '✅' : stage.icon}
                </div>
                <span
                  className={`text-[11px] font-semibold text-center leading-tight ${
                    i === loadingStage ? 'font-bold' : ''
                  }`}
                  style={{ color: i <= loadingStage ? 'var(--text-primary)' : 'var(--text-muted)' }}
                >
                  {stage.text}
                </span>
              </div>
            ))}
          </div>
          {/* 진행 바 */}
          <div
            className="relative mx-6 h-1 rounded-full mb-3"
            style={{ background: 'var(--border-soft)' }}
          >
            <div
              className="absolute left-0 top-0 h-full rounded-full transition-all duration-700"
              style={{
                width: `${(loadingStage / (LOADING_STAGES.length - 1)) * 100}%`,
                background: 'var(--accent)',
              }}
            />
          </div>
          {/* 설명 텍스트 */}
          <p
            className="text-center text-sm font-medium animate-pulse"
            style={{ color: 'var(--text-secondary)' }}
          >
            {LOADING_STAGES[loadingStage].sub}
          </p>
          {/* 취소 버튼 */}
          {onCancel && (
            <div className="flex justify-center mt-3">
              <button
                onClick={onCancel}
                className="px-5 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95"
                style={{
                  background: 'var(--bg-surface)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-soft)',
                }}
              >
                취소
              </button>
            </div>
          )}
        </div>

        {/* 스켈레톤 카드 */}
        {[1, 2, 3].map((i) => (
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

        {/* 반경 확장 재검색 CTA */}
        {onExpandRadius && (
          <button
            onClick={onExpandRadius}
            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-bold transition-all active:scale-95 mb-3"
            style={{
              background: 'linear-gradient(135deg, var(--blue-50), var(--accent-weak))',
              color: 'var(--blue-700)',
              border: '1.5px solid var(--blue-200)',
            }}
          >
            <span>🔍</span>
            반경 2km로 확장해서 재검색
          </button>
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
        className="px-4 py-3 rounded-2xl space-y-2.5"
        style={{
          background: 'linear-gradient(135deg, var(--blue-50), var(--accent-weak))',
          border: '1px solid var(--blue-200)',
        }}
      >
        <div className="flex items-center justify-between gap-2">
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
          <div className="shrink-0 text-right">
            <p className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>최단</p>
            <p className="text-xs font-bold truncate max-w-[80px]" style={{ color: 'var(--text-primary)' }}>
              {bestResult.place.name}
            </p>
          </div>
        </div>

        {/* 출발 예정 시각 설정 */}
        <div className="flex items-center gap-2 pt-1 border-t" style={{ borderColor: 'var(--blue-200)' }}>
          <span className="text-[12px] font-semibold shrink-0" style={{ color: 'var(--blue-700)' }}>
            🕐 출발 시각
          </span>
          <input
            type="time"
            value={departureTime}
            onChange={(e) => setDepartureTime(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 min-w-0 px-3 py-1.5 rounded-xl text-sm font-bold border-0 outline-none focus:ring-2 transition-all"
            style={{
              background: 'white',
              color: 'var(--text-primary)',
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            }}
          />
          <button
            onClick={() => {
              const now = new Date();
              setDepartureTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
            }}
            className="shrink-0 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all active:scale-95"
            style={{ background: 'var(--blue-200)', color: 'var(--blue-700)' }}
          >
            지금
          </button>
        </div>
      </div>

      {/* ── 빠른 필터 칩 ── */}
      <div className="flex items-center justify-between gap-2">
        {/* 왼쪽: 필터 칩들 */}
        <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
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
        </div>

        {/* 오른쪽: 간략/자세히 보기 토글 (항상 고정) */}
        <button
          onClick={() => setIsCompact((v) => !v)}
          className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
          style={{
            background: isCompact
              ? 'linear-gradient(135deg, var(--accent), var(--blue-600, #2563eb))'
              : 'var(--bg-surface)',
            color: isCompact ? 'white' : 'var(--text-secondary)',
            border: `1.5px solid ${isCompact ? 'transparent' : 'var(--border-soft)'}`,
            boxShadow: isCompact ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
          }}
          title={isCompact ? '자세히 보기로 전환' : '간략 보기로 전환'}
        >
          <span className="text-sm leading-none">{isCompact ? '☰' : '≡'}</span>
          {isCompact ? '자세히' : '간략'}
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

        const isBeingSwiped = swipeVisual?.id === result.place.id;
        const swipeDeltaX = isBeingSwiped ? swipeVisual!.deltaX : 0;
        const swipeOpacity = Math.min(1, Math.abs(swipeDeltaX) / 80);

        return (
          <div key={result.place.id} className="relative overflow-hidden rounded-2xl shadow-sm">
            {/* Swipe right → 네비 힌트 */}
            <div
              className="absolute inset-y-0 left-0 flex items-center gap-1.5 px-5"
              style={{
                background: `rgba(34, 197, 94, ${swipeOpacity})`,
                opacity: swipeDeltaX > 8 ? 1 : 0,
                transition: !isBeingSwiped ? 'all 0.2s' : 'none',
                minWidth: 88,
                pointerEvents: 'none',
              }}
            >
              <Navigation className="w-5 h-5 text-white" />
              <span className="text-white text-xs font-bold whitespace-nowrap">네비</span>
            </div>
            {/* Swipe left → 복사 힌트 */}
            <div
              className="absolute inset-y-0 right-0 flex items-center justify-end gap-1.5 px-5"
              style={{
                background: `rgba(59, 130, 246, ${swipeOpacity})`,
                opacity: swipeDeltaX < -8 ? 1 : 0,
                transition: !isBeingSwiped ? 'all 0.2s' : 'none',
                minWidth: 88,
                pointerEvents: 'none',
              }}
            >
              <span className="text-white text-xs font-bold whitespace-nowrap">복사</span>
              <Copy className="w-5 h-5 text-white" />
            </div>
          <button
            data-result-index={index}
            onClick={() => handleSelect(result, index + 1)}
            onMouseEnter={() => onHoverResult?.(result.place.id)}
            onMouseLeave={() => onHoverResult?.(null)}
            onTouchStart={(e) => handleCardTouchStart(e, result.place.id)}
            onTouchMove={(e) => handleCardTouchMove(e, result.place.id)}
            onTouchEnd={() => handleCardTouchEnd(result)}
            className={`w-full ${isCompact ? 'px-3 py-2.5' : 'p-4'} rounded-2xl text-left active:scale-[0.98]`}
            style={{
              background: isSelected ? 'var(--blue-200)' : 'var(--bg-surface)',
              border: isSelected ? '1.5px solid var(--accent)' : '1px solid var(--border-soft)',
              transform: `translateX(${swipeDeltaX}px)`,
              transition: !isBeingSwiped ? 'transform 0.2s ease' : 'none',
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
                onClick={(e) => handleTogglePlaceFav(e, result)}
                className="shrink-0 p-2 rounded-lg active:scale-95 transition-colors"
                title={favPlaces.has(result.place.id) ? '즐겨찾기 해제' : '즐겨찾기 저장'}
              >
                <Star
                  className="w-4 h-4"
                  fill={favPlaces.has(result.place.id) ? '#f59e0b' : 'none'}
                  style={{ color: favPlaces.has(result.place.id) ? 'var(--yellow-600)' : 'var(--text-muted)' }}
                />
              </button>
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
                  {/* 기본 정보 뱃지: 이탈 거리/시간 — sortBy 강조 */}
                  <span
                    className="inline-flex items-center px-3 py-1.5 rounded-full text-[13px] font-semibold transition-all"
                    style={
                      sortBy === 'distance'
                        ? { background: 'var(--accent)', color: 'white' }
                        : { background: 'var(--accent-weak)', color: 'var(--accent)' }
                    }
                    title={sortBy === 'distance' ? '거리순 정렬 기준' : undefined}
                  >
                    {sortBy === 'distance' && '📏 '}+{detourKm}km
                  </span>
                  <span
                    className="inline-flex items-center px-3 py-1.5 rounded-full text-[13px] font-semibold transition-all"
                    style={
                      sortBy === 'duration'
                        ? { background: 'var(--yellow-500, #eab308)', color: 'white' }
                        : { background: 'var(--yellow-100)', color: 'var(--yellow-600)' }
                    }
                    title={sortBy === 'duration' ? '시간순 정렬 기준' : undefined}
                  >
                    {sortBy === 'duration' && '⏱ '}+{detourMin}분
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
                  {/* 점수 분해 토글 버튼 — sortBy=score 시 강조 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setScoreDetailOpenId((prev) =>
                        prev === result.place.id ? null : result.place.id
                      );
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[13px] font-semibold transition-all active:scale-95"
                    style={{
                      background: scoreDetailOpenId === result.place.id
                        ? 'var(--accent)'
                        : sortBy === 'score'
                        ? 'var(--blue-200)'
                        : 'var(--blue-100)',
                      color: scoreDetailOpenId === result.place.id ? 'white' : 'var(--blue-700)',
                      border: `1.5px solid ${
                        scoreDetailOpenId === result.place.id
                          ? 'var(--accent)'
                          : sortBy === 'score'
                          ? 'var(--blue-400)'
                          : 'var(--blue-200)'
                      }`,
                    }}
                    title={sortBy === 'score' ? '점수순 정렬 기준 — 클릭해서 상세 보기' : '추천 점수 분석 보기'}
                  >
                    📊 {Math.round(result.finalScore)}점
                  </button>
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

                {/* 📊 점수 분해 상세 */}
                {scoreDetailOpenId === result.place.id && (() => {
                  const detourScore = Math.max(0, Math.round(100 - result.detourCost.costScore));
                  const proxScore = Math.round(result.proximityScore);
                  const finalScoreRounded = Math.round(result.finalScore);
                  return (
                    <div
                      className="mt-2.5 p-3 rounded-xl space-y-2.5"
                      style={{ background: 'var(--bg-muted, #f3f4f6)', border: '1px solid var(--border-soft)' }}
                    >
                      <p className="text-[11px] font-bold" style={{ color: 'var(--text-secondary)' }}>
                        📊 추천 점수 분석 (이탈비용 70% + 근접도 30%)
                      </p>
                      {/* 최종 점수 */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>최종 점수</span>
                          <span className="text-[11px] font-bold" style={{ color: 'var(--accent)' }}>{finalScoreRounded}점</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-soft)' }}>
                          <div className="h-full rounded-full" style={{ width: `${finalScoreRounded}%`, background: 'var(--accent)' }} />
                        </div>
                      </div>
                      {/* 이탈 비용 */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                            🚗 이탈 비용 <span style={{ color: 'var(--text-muted)' }}>(70%)</span>
                          </span>
                          <span className="text-[11px] font-semibold" style={{ color: '#16a34a' }}>{detourScore}점</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-soft)' }}>
                          <div className="h-full rounded-full" style={{ width: `${detourScore}%`, background: '#22c55e' }} />
                        </div>
                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          +{detourKm}km · +{detourMin}분 추가 이탈
                        </p>
                      </div>
                      {/* 경로 근접도 */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                            📍 경로 근접도 <span style={{ color: 'var(--text-muted)' }}>(30%)</span>
                          </span>
                          <span className="text-[11px] font-semibold" style={{ color: '#7c3aed' }}>{proxScore}점</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-soft)' }}>
                          <div className="h-full rounded-full" style={{ width: `${proxScore}%`, background: '#a855f7' }} />
                        </div>
                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          경로상 샘플 포인트와의 근접 정도
                        </p>
                      </div>
                    </div>
                  );
                })()}

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

                {/* 출발 시각 기준 예상 도착 시간 */}
                {(() => {
                  const eta = getETAText(result, departureMs);
                  if (!eta) return null;
                  const isNowDeparture = Math.abs(departureMs - Date.now()) < 120000;
                  return (
                    <div
                      className="mt-2 flex items-center gap-1.5 text-[12px] px-2.5 py-1.5 rounded-xl"
                      style={{ background: 'var(--bg-muted, #f3f4f6)', color: 'var(--text-muted)' }}
                    >
                      <span>🕐</span>
                      <span>
                        {isNowDeparture ? '지금 출발' : `${departureTime} 출발`} → 경유지{' '}
                        <strong style={{ color: 'var(--text-primary)' }}>{eta.waypoint}</strong>
                        {' '}/ 목적지{' '}
                        <strong style={{ color: 'var(--text-primary)' }}>{eta.destination}</strong>
                        {' '}도착 예상
                      </span>
                    </div>
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

              {/* 즐겨찾기 + 주소 복사 버튼 */}
              <div className="flex flex-col gap-1 shrink-0 self-start">
                <button
                  onClick={(e) => handleTogglePlaceFav(e, result)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors active:scale-95"
                  title={favPlaces.has(result.place.id) ? '즐겨찾기 해제' : '즐겨찾기 저장'}
                >
                  <Star
                    className="w-4 h-4"
                    fill={favPlaces.has(result.place.id) ? '#f59e0b' : 'none'}
                    style={{ color: favPlaces.has(result.place.id) ? 'var(--yellow-600)' : 'var(--text-muted)' }}
                  />
                </button>
                <button
                  onClick={(e) => handleCopyAddress(e, result)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors active:scale-95"
                  title="주소 복사"
                >
                  {copiedId === result.place.id ? (
                    <Check className="w-4 h-4" style={{ color: 'var(--green-600)' }} />
                  ) : (
                    <Copy className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                  )}
                </button>
              </div>
            </div>
          )}
          </button>
          </div>
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
