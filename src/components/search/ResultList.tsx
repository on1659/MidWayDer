/**
 * ResultList - 오케스트레이터 (v0.6.0)
 * 분리된 하위 컴포넌트들을 Context로 연결하는 조율자 역할
 */

'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { DetourResult } from '@/types/detour';
import { copyToClipboard } from '@/lib/clipboard';
import { openNavigationApp, getPreferredNavApp, setPreferredNavApp } from '@/lib/navigation-links';
import type { NavApp } from '@/lib/navigation-links';
import { getBusinessStatus } from '@/lib/business-hours';
import { getVisitHistory, recordVisit } from '@/lib/visit-tracking';
import { hashRoute } from '@/lib/utils/route-hash';
import { useRouteStore } from '@/store/route-store';
import ErrorFallback from '@/components/ui/ErrorFallback';
import BottomSheet from '@/components/ui/BottomSheet';
import { getPlaceFavorites, addPlaceFavorite, removePlaceFavorite } from '@/lib/place-favorites';
import { getPlaceMemos, setPlaceMemo } from '@/lib/place-memos';

// 하위 컴포넌트
import { ResultListContext } from './result-list/ResultListContext';
import type { ResultListContextValue } from './result-list/ResultListContext';
import { ResultHeader } from './result-list/ResultHeader';
import { FilterChips } from './result-list/FilterChips';
import { CategoryChips } from './result-list/CategoryChips';
import { ResultCard } from './result-list/ResultCard';
import { CompactCard } from './result-list/CompactCard';
import { RelatedCategories } from './result-list/RelatedCategories';
import { StickyBar } from './result-list/StickyBar';
import { EmptyState } from './result-list/EmptyState';

// 훅
import { useFilters } from './result-list/hooks/useFilters';
import { useSwipe } from './result-list/hooks/useSwipe';
import { useStickyObserver } from './result-list/hooks/useStickyObserver';

// 유틸
import {
  getDefaultDwellMinutes,
  getRoutePositionLabel,
  getSegmentEmoji,
  haversineDistanceKm,
  LOADING_STAGES,
} from './result-list/utils';
import type { RenderItem } from './result-list/utils';

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
  sortBy?: 'score' | 'distance' | 'duration' | 'closing';
  onHoverResult?: (id: string | null) => void;
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
  // ── UI 상태 ──
  const [naviSheetOpen, setNaviSheetOpen] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<DetourResult['place'] | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [scoreDetailOpenId, setScoreDetailOpenId] = useState<string | null>(null);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [sharedId, setSharedId] = useState<string | null>(null);
  const [isCompact, setIsCompact] = useState(false);
  const [isGrouped, setIsGrouped] = useState(false);
  const [overflowMenuId, setOverflowMenuId] = useState<string | null>(null);
  const [expandedCompactId, setExpandedCompactId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(10);

  // ── 카드 데이터 상태 ──
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const [favPlaces, setFavPlaces] = useState<Set<string>>(new Set());
  const [visitedDates, setVisitedDates] = useState<Map<string, number>>(new Map());
  const [memoMap, setMemoMap] = useState<Map<string, string>>(new Map());
  const [editingMemoId, setEditingMemoId] = useState<string | null>(null);
  const [editingMemoText, setEditingMemoText] = useState('');

  // ── ETA 상태 ──
  const [departureTime, setDepartureTime] = useState<string>(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [dwellMinutes, setDwellMinutes] = useState(() => getDefaultDwellMinutes(currentCategory));
  const [nowMs, setNowMs] = useState(Date.now());

  // ── 기타 상태 ──
  const [popularityMap, setPopularityMap] = useState<Record<string, number>>({});
  const [statsCategories, setStatsCategories] = useState<string[]>([]);
  const [isHeaderExpanded, setIsHeaderExpanded] = useState(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('header-expanded') !== 'false';
  });
  const [preferredNavApp, setPreferredNavAppState] = useState<NavApp | null>(null);
  const [loadingStage, setLoadingStage] = useState(0);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [searchedAt, setSearchedAt] = useState<number | null>(null);

  // ── Refs ──
  const listRef = useRef<HTMLDivElement>(null);
  const summaryHeaderRef = useRef<HTMLDivElement>(null);

  // ── 훅 ──
  const filters = useFilters(results, visitedDates);
  const swipe = useSwipe({
    onOpenNaviSheet: (place) => {
      setSelectedPlace(place);
      setNaviSheetOpen(true);
    },
  });
  const { copiedId, setCopiedId, swipeVisual, swipeHintId, swipeHintDeltaX, handlers: swipeHandlers, initHintAnimation } = swipe;
  const { isIntersecting } = useStickyObserver(summaryHeaderRef as React.RefObject<HTMLElement>);
  const showStickyBar = !isIntersecting;

  // ── 라우트 해시 ──
  const { originalRoute } = useRouteStore();
  const routeHash = originalRoute ? hashRoute(originalRoute.start, originalRoute.end) : '';

  // ── departureMs 계산 ──
  const departureMs = useMemo(() => {
    const [h, m] = departureTime.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    if (d.getTime() < Date.now() - 60000) d.setDate(d.getDate() + 1);
    return d.getTime();
  }, [departureTime]);

  const isNowDeparture = Math.abs(departureMs - nowMs) < 120000;

  // ── 실시간 ETA 타이머 ──
  useEffect(() => {
    if (!isNowDeparture) return;
    const interval = setInterval(() => setNowMs(Date.now()), 60000);
    return () => clearInterval(interval);
  }, [isNowDeparture]);

  // ── 로딩 단계 ──
  useEffect(() => {
    if (!isLoading) { setLoadingStage(0); return; }
    const t1 = setTimeout(() => setLoadingStage(1), 2500);
    const t2 = setTimeout(() => setLoadingStage(2), 6000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [isLoading]);

  // ── 초기화 (1회) ──
  useEffect(() => {
    const saved = getPlaceFavorites().map((f) => f.placeId);
    setFavPlaces(new Set(saved));
    setPreferredNavAppState(getPreferredNavApp());
  }, []);

  // ── 메모 초기화 ──
  useEffect(() => {
    if (results.length === 0) return;
    const memos = getPlaceMemos();
    const map = new Map<string, string>();
    for (const m of memos) map.set(m.placeId, m.memo);
    setMemoMap(map);
  }, [results]);

  // ── 방문 기록 초기화 ──
  useEffect(() => {
    if (!routeHash || results.length === 0) return;
    const history = getVisitHistory();
    const dateMap = new Map<string, number>();
    for (const visit of history) {
      if (visit.routeHash === routeHash && !dateMap.has(visit.placeId)) {
        dateMap.set(visit.placeId, visit.visitedAt);
      }
    }
    setVisitedDates(dateMap);
  }, [results, routeHash]);

  // ── 인기도 데이터 ──
  useEffect(() => {
    if (results.length === 0) return;
    const placeIds = results.map((r) => r.place.id).join(',');
    fetch(`/api/popularity?placeIds=${encodeURIComponent(placeIds)}`)
      .then((res) => res.json())
      .then((json) => { if (json.success) setPopularityMap(json.data || {}); })
      .catch(() => {});
  }, [results]);

  // ── 검색 시각 기록 ──
  useEffect(() => {
    if (results.length > 0) setSearchedAt(Date.now());
  }, [results]);

  // ── 결과 없을 때 인기 카테고리 ──
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

  // ── isHeaderExpanded localStorage ──
  useEffect(() => {
    try { localStorage.setItem('header-expanded', String(isHeaderExpanded)); } catch { /* ignore */ }
  }, [isHeaderExpanded]);

  // ── 카테고리 변경 시 체류 시간 기본값 ──
  useEffect(() => {
    setDwellMinutes(getDefaultDwellMinutes(currentCategory));
  }, [currentCategory]);

  // ── GPS 현재 위치 ──
  useEffect(() => {
    if (!results.length || currentLocation || typeof navigator === 'undefined' || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCurrentLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { timeout: 6000, maximumAge: 60000 }
    );
  }, [results.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 새 결과 시 상태 초기화 ──
  useEffect(() => {
    setVisibleCount(10);
    setPinnedIds(new Set());
    setOverflowMenuId(null);
    setExpandedCompactId(null);
    setIsGrouped(false);
  }, [results]);

  // ── 스와이프 힌트 ──
  useEffect(() => {
    if (results.length === 0) return;
    initHintAnimation(results[0].place.id);
  }, [results]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 키보드 접근성 ──
  useEffect(() => {
    if (results.length === 0) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown': e.preventDefault(); setFocusedIndex((p) => Math.min(p + 1, results.length - 1)); break;
        case 'ArrowUp': e.preventDefault(); setFocusedIndex((p) => Math.max(p - 1, 0)); break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          handleSelect(results[focusedIndex], focusedIndex + 1);
          break;
        case 'Home': e.preventDefault(); setFocusedIndex(0); break;
        case 'End': e.preventDefault(); setFocusedIndex(results.length - 1); break;
      }
    };
    const el = listRef.current;
    el?.addEventListener('keydown', handleKeyDown);
    return () => el?.removeEventListener('keydown', handleKeyDown);
  }, [focusedIndex, results]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 포커스 스크롤 ──
  useEffect(() => {
    const item = document.querySelector(`[data-result-index="${focusedIndex}"]`);
    if (item) item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [focusedIndex]);

  // ── selectedId 카드 스크롤 ──
  useEffect(() => {
    if (!selectedId || filters.filteredResults.length === 0) return;
    const idx = filters.filteredResults.findIndex((r) => r.place.id === selectedId);
    if (idx === -1) return;
    const timer = setTimeout(() => {
      const item = document.querySelector(`[data-result-index="${idx}"]`);
      if (item) item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, 350);
    return () => clearTimeout(timer);
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Computed: 정렬 + 핀 ──
  const sortedWithPins = useMemo(() => {
    if (pinnedIds.size === 0) return filters.filteredResults;
    const pinned = filters.filteredResults.filter((r) => pinnedIds.has(r.place.id));
    const rest = filters.filteredResults.filter((r) => !pinnedIds.has(r.place.id));
    return [...pinned, ...rest];
  }, [filters.filteredResults, pinnedIds]);

  const visibleResults = useMemo(() => sortedWithPins.slice(0, visibleCount), [sortedWithPins, visibleCount]);

  const renderItems = useMemo((): RenderItem[] => {
    if (!isGrouped) {
      return visibleResults.map((result, index) => ({ type: 'card' as const, result, index }));
    }
    const items: RenderItem[] = [];
    let prevSegment: string | null = null;
    sortedWithPins.forEach((result, index) => {
      const segment = getRoutePositionLabel(result) ?? '기타';
      if (segment !== prevSegment) {
        const segCount = sortedWithPins.filter((r) => (getRoutePositionLabel(r) ?? '기타') === segment).length;
        items.push({ type: 'header' as const, label: segment, count: segCount });
        prevSegment = segment;
      }
      items.push({ type: 'card' as const, result, index });
    });
    return items;
  }, [isGrouped, sortedWithPins, visibleResults]);

  // ── Computed: 이탈 범위 ──
  const maxDetourDuration = results.length > 1 ? Math.max(...results.map((r) => r.detourCost.duration)) : 0;
  const minDetourDuration = results.length > 1 ? Math.min(...results.map((r) => r.detourCost.duration)) : 0;
  const detourRange = maxDetourDuration - minDetourDuration;

  // ── Computed: 가장 가까운 장소 ──
  const closestPlaceId = useMemo(() => {
    if (!currentLocation || results.length === 0) return null;
    let minDist = Infinity;
    let minId: string | null = null;
    for (const r of results) {
      const d = haversineDistanceKm(
        currentLocation.lat, currentLocation.lng,
        r.place.coordinates.lat, r.place.coordinates.lng
      );
      if (d < minDist) { minDist = d; minId = r.place.id; }
    }
    return minId;
  }, [currentLocation, results]);

  // ── Computed: FilterChips 추가 데이터 ──
  const hasBusinessHoursData = results.some((r) => !!r.place.businessHours);
  const openNowCount = useMemo(() => results.filter((r) => {
    if (!r.place.businessHours) return false;
    return getBusinessStatus(r.place.businessHours).isOpen;
  }).length, [results]);
  const visitedCount = visitedDates.size;

  // ── Handlers ──
  const handleSelect = useCallback(async (result: DetourResult, rank: number) => {
    setOverflowMenuId(null);
    fetch('/api/log-click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ placeId: result.place.id, rank }),
    }).catch((err) => console.error('[ClickLog] Failed:', err));
    onSelect(result);
  }, [onSelect]);

  const handleTogglePin = useCallback((e: React.MouseEvent, result: DetourResult) => {
    e.stopPropagation();
    const id = result.place.id;
    setPinnedIds((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  }, []);

  const handleTogglePlaceFav = useCallback((e: React.MouseEvent, result: DetourResult) => {
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
  }, [favPlaces]);

  const handleVisitToggle = useCallback((e: React.MouseEvent, result: DetourResult) => {
    e.stopPropagation();
    const id = result.place.id;
    if (visitedDates.has(id)) {
      setVisitedDates((prev) => { const m = new Map(prev); m.delete(id); return m; });
    } else {
      if (routeHash) recordVisit(id, result.place.name, result.place.category, routeHash);
      setVisitedDates((prev) => new Map([...prev, [id, Date.now()]]));
    }
  }, [visitedDates, routeHash]);

  const handleCopyAddress = useCallback(async (e: React.MouseEvent, result: DetourResult) => {
    e.stopPropagation();
    const address = result.place.roadAddress || result.place.address;
    if (!address) return;
    const success = await copyToClipboard(address);
    if (success) {
      setCopiedId(result.place.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  }, [setCopiedId]);

  const handleShare = useCallback(async (e: React.MouseEvent, result: DetourResult) => {
    e.stopPropagation();
    const detourMin = Math.round(result.detourCost.duration / 60);
    const detourKm = (result.detourCost.distance / 1000).toFixed(1);
    const address = result.place.roadAddress || result.place.address || '';
    const text = `📍 ${result.place.name}\n🏠 ${address}\n⏱ +${detourMin}분 · 📏 +${detourKm}km 이탈\n🗺 midwayder.up.railway.app`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try { await navigator.share({ title: result.place.name, text }); } catch { /* 취소 */ }
    } else {
      const success = await copyToClipboard(text);
      if (success) {
        setSharedId(result.place.id);
        setTimeout(() => setSharedId(null), 2000);
      }
    }
  }, []);

  const handleEditMemo = useCallback((e: React.MouseEvent, placeId: string) => {
    e.stopPropagation();
    setEditingMemoId(placeId);
    setEditingMemoText(memoMap.get(placeId) ?? '');
  }, [memoMap]);

  const handleSaveMemo = useCallback((e: React.MouseEvent, placeId: string) => {
    e.stopPropagation();
    setPlaceMemo(placeId, editingMemoText);
    setMemoMap((prev) => {
      const m = new Map(prev);
      if (editingMemoText.trim()) m.set(placeId, editingMemoText.trim());
      else m.delete(placeId);
      return m;
    });
    setEditingMemoId(null);
    setEditingMemoText('');
  }, [editingMemoText]);

  const handleCancelMemo = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingMemoId(null);
    setEditingMemoText('');
  }, []);

  const triggerNav = useCallback((place: DetourResult['place']) => {
    if (preferredNavApp) {
      openNavigationApp(preferredNavApp, place.coordinates.lat, place.coordinates.lng, place.name)
        .catch((err) => console.error('[Navigation] Failed:', err));
    } else {
      setSelectedPlace(place);
      setNaviSheetOpen(true);
    }
  }, [preferredNavApp]);

  const handleOpenNavi = useCallback((e: React.MouseEvent, place: DetourResult['place']) => {
    e.stopPropagation();
    triggerNav(place);
  }, [triggerNav]);

  const handleOpenNaviSheet = useCallback((e: React.MouseEvent, place: DetourResult['place']) => {
    e.stopPropagation();
    setSelectedPlace(place);
    setNaviSheetOpen(true);
  }, []);

  const handleQuickGo = useCallback(() => {
    const top = sortedWithPins[0];
    if (!top) return;
    const now = new Date();
    setDepartureTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    triggerNav(top.place);
  }, [sortedWithPins, triggerNav]);

  const handleNaviAppSelect = async (app: NavApp) => {
    if (!selectedPlace) return;
    try {
      await openNavigationApp(app, selectedPlace.coordinates.lat, selectedPlace.coordinates.lng, selectedPlace.name);
      setPreferredNavApp(app);
      setPreferredNavAppState(app);
      setNaviSheetOpen(false);
    } catch (err) {
      console.error('[Navigation] Failed:', err);
    }
  };

  const handleFeedback = async (helpful: boolean) => {
    try {
      await fetch('/api/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ helpful }) });
      setFeedbackSent(true);
      setTimeout(() => setFeedbackSent(false), 3000);
    } catch { /* ignore */ }
  };

  // ── Context Value ──
  const contextValue: ResultListContextValue = {
    results,
    filteredResults: filters.filteredResults,
    currentCategory,
    sortBy,
    pinnedIds,
    favPlaces,
    visitedDates,
    memoMap,
    popularityMap,
    copiedId,
    sharedId,
    scoreDetailOpenId,
    overflowMenuId,
    expandedCompactId,
    editingMemoId,
    editingMemoText,
    departureTime,
    departureMs,
    dwellMinutes,
    nowMs,
    isNowDeparture,
    isCompact,
    isGrouped,
    currentLocation,
    closestPlaceId,
    detourRange,
    maxDetourDuration,
    minDetourDuration,
    preferredNavApp,
    routeHash,
    nameFilter: filters.nameFilter,
    onTogglePin: handleTogglePin,
    onToggleFav: handleTogglePlaceFav,
    onVisitToggle: handleVisitToggle,
    onSelect: handleSelect,
    onCopyAddress: handleCopyAddress,
    onShare: handleShare,
    onEditMemo: handleEditMemo,
    onSaveMemo: handleSaveMemo,
    onCancelMemo: handleCancelMemo,
    setEditingMemoText,
    onSetScoreDetail: setScoreDetailOpenId,
    onSetOverflowMenu: setOverflowMenuId,
    onSetExpandedCompact: setExpandedCompactId,
    onOpenNavi: handleOpenNavi,
    onOpenNaviSheet: handleOpenNaviSheet,
    triggerNav,
  };

  // ── Render: Loading ──
  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="px-4 py-5 rounded-2xl" style={{ background: 'linear-gradient(135deg, var(--blue-50), var(--accent-weak))', border: '1px solid var(--blue-200)' }}>
          <div className="flex justify-between items-start mb-3">
            {LOADING_STAGES.map((stage, i) => (
              <div key={i} className={`flex flex-col items-center gap-1.5 flex-1 transition-all duration-500 ${i <= loadingStage ? 'opacity-100' : 'opacity-30'}`}>
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center text-xl transition-all duration-300 ${i < loadingStage ? 'bg-green-100' : i === loadingStage ? 'shadow-md scale-110' : 'bg-gray-100'}`}
                  style={i === loadingStage ? { background: 'var(--accent-weak)' } : {}}
                >
                  {i < loadingStage ? '✅' : stage.icon}
                </div>
                <span
                  className={`text-[11px] font-semibold text-center leading-tight ${i === loadingStage ? 'font-bold' : ''}`}
                  style={{ color: i <= loadingStage ? 'var(--text-primary)' : 'var(--text-muted)' }}
                >
                  {stage.text}
                </span>
              </div>
            ))}
          </div>
          <div className="relative mx-6 h-1 rounded-full mb-3" style={{ background: 'var(--border-soft)' }}>
            <div
              className="absolute left-0 top-0 h-full rounded-full transition-all duration-700"
              style={{ width: `${(loadingStage / (LOADING_STAGES.length - 1)) * 100}%`, background: 'var(--accent)' }}
            />
          </div>
          <p className="text-center text-sm font-medium animate-pulse" style={{ color: 'var(--text-secondary)' }}>
            {LOADING_STAGES[loadingStage].sub}
          </p>
          {onCancel && (
            <div className="flex justify-center mt-3">
              <button
                onClick={onCancel}
                className="px-5 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95"
                style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border-soft)' }}
              >
                취소
              </button>
            </div>
          )}
        </div>
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

  // ── Render: Error ──
  if (error) return <ErrorFallback error={error} onRetry={onRetry} compact />;

  // ── Render: Empty ──
  if (results.length === 0) {
    return (
      <EmptyState
        hasSearched={hasSearched}
        isLoading={isLoading}
        currentCategory={currentCategory}
        statsCategories={statsCategories}
        onExpandRadius={onExpandRadius}
        onRetry={onRetry}
        onCategoryChange={onCategoryChange}
      />
    );
  }

  // ── Render: 결과 ──
  return (
    <ResultListContext.Provider value={contextValue}>
      <div className="space-y-3" ref={listRef} tabIndex={-1} style={{ outline: 'none' }}>

        <ResultHeader
          ref={summaryHeaderRef}
          results={results}
          filteredResults={filters.filteredResults}
          sortedWithPins={sortedWithPins}
          searchedAt={searchedAt}
          onRetry={onRetry}
          sortBy={sortBy}
          departureTime={departureTime}
          onDepartureTimeChange={setDepartureTime}
          dwellMinutes={dwellMinutes}
          onDwellChange={setDwellMinutes}
          isCompact={isCompact}
          isGrouped={isGrouped}
          onCompactToggle={() => setIsCompact((p) => !p)}
          onGroupedToggle={() => setIsGrouped((p) => !p)}
          isHeaderExpanded={isHeaderExpanded}
          onHeaderExpandToggle={() => setIsHeaderExpanded((p) => !p)}
          isNowDeparture={isNowDeparture}
          pinnedIds={pinnedIds}
          onQuickGo={handleQuickGo}
          currentCategory={currentCategory}
        />

        <CategoryChips
          currentCategory={currentCategory}
          onCategoryChange={onCategoryChange ?? (() => {})}
        />

        <FilterChips
          filterState={filters}
          filteredCount={filters.filteredResults.length}
          totalCount={results.length}
          hasBusinessHoursData={hasBusinessHoursData}
          openNowCount={openNowCount}
          visitedCount={visitedCount}
          isSticky={showStickyBar}
          onScrollTop={() => listRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
        />

        {/* 카드 목록 */}
        <div className="space-y-2">
          {renderItems.map((item) => {
            if (item.type === 'header') {
              return (
                <div key={item.label} className="flex items-center gap-2 px-2 pt-2">
                  <span className="text-base">{getSegmentEmoji(item.label)}</span>
                  <span className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold" style={{ background: 'var(--blue-100)', color: 'var(--blue-600)' }}>
                    {item.count}개
                  </span>
                </div>
              );
            }
            const { result, index } = item;
            return isCompact ? (
              <CompactCard
                key={result.place.id}
                result={result}
                index={index}
                isSelected={selectedId === result.place.id}
                swipeHandlers={swipeHandlers}
                swipeVisual={swipeVisual}
              />
            ) : (
              <ResultCard
                key={result.place.id}
                result={result}
                index={index}
                isSelected={selectedId === result.place.id}
                swipeHandlers={swipeHandlers}
                swipeVisual={swipeVisual}
                swipeHintId={swipeHintId}
                swipeHintDeltaX={swipeHintDeltaX}
                onHoverResult={onHoverResult}
              />
            );
          })}
        </div>

        {/* 더보기 / 접기 */}
        {!isGrouped && sortedWithPins.length > visibleCount && (
          <button
            onClick={() => setVisibleCount((v) => v + 10)}
            className="w-full py-3 rounded-2xl text-sm font-bold transition-all active:scale-95"
            style={{ background: 'var(--blue-50)', color: 'var(--blue-600)', border: '1.5px solid var(--blue-200)' }}
          >
            더 보기 ({sortedWithPins.length - visibleCount}개)
          </button>
        )}
        {!isGrouped && visibleCount > 10 && sortedWithPins.length <= visibleCount && (
          <button
            onClick={() => setVisibleCount(10)}
            className="w-full py-3 rounded-2xl text-sm font-bold transition-all active:scale-95"
            style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1.5px solid var(--border-soft)' }}
          >
            접기
          </button>
        )}

        {/* 즐겨찾기 CTA */}
        {onSaveRoute && (
          <button
            onClick={onSaveRoute}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold transition-all active:scale-95"
            style={{ background: 'var(--yellow-50)', color: 'var(--yellow-700)', border: '1.5px solid var(--yellow-200)' }}
          >
            ⭐ 이 경로 즐겨찾기로 저장
          </button>
        )}

        {/* 피드백 */}
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>도움이 됐나요?</span>
          {feedbackSent ? (
            <span className="text-xs font-semibold" style={{ color: 'var(--green-600)' }}>감사합니다! 🙏</span>
          ) : (
            <>
              <button
                onClick={() => handleFeedback(true)}
                className="px-2 py-0.5 rounded-full text-xs font-semibold transition-all active:scale-95"
                style={{ background: 'var(--green-100)', color: 'var(--green-700)' }}
              >
                👍
              </button>
              <button
                onClick={() => handleFeedback(false)}
                className="px-2 py-0.5 rounded-full text-xs font-semibold transition-all active:scale-95"
                style={{ background: 'var(--red-100)', color: 'var(--red-600)' }}
              >
                👎
              </button>
            </>
          )}
        </div>

        <RelatedCategories currentCategory={currentCategory} onCategoryChange={onCategoryChange ?? (() => {})} />

        <StickyBar bestResult={sortedWithPins[0] ?? null} showStickyBar={showStickyBar} onQuickGo={handleQuickGo} />

        {/* Navigation App Selection Bottom Sheet */}
        <BottomSheet
          visible={naviSheetOpen}
          snap="collapsed"
          onSnapChange={(snap) => { if (snap === 'collapsed') setNaviSheetOpen(false); }}
        >
          <div className="p-6">
            <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>어떤 앱으로 안내할까요?</h3>
            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>선택한 앱을 기억해 다음엔 바로 실행해요</p>
            {selectedPlace && (
              <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>{selectedPlace.name}</p>
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
                    className="w-full flex items-center gap-4 p-4 rounded-xl transition-all shadow-sm"
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
                      <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: 'var(--accent)', color: 'white' }}>기억됨</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </BottomSheet>
      </div>
    </ResultListContext.Provider>
  );
}
