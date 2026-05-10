/**
 * Main Page - MidWayDer frontend reset
 *
 * 새 홈 화면은 기존 API/store/map 계약만 유지하고, 화면 구조는
 * "경로 입력 → 후보 확인 → 장소 선택" 흐름으로 다시 설계한다.
 */

'use client';

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  ArrowUpDown,
  Bookmark,
  LocateFixed,
  MapPin,
  Navigation,
  Moon,
  RefreshCw,
  Search,
  Settings,
  Share2,
  Sun,
  Wifi,
} from 'lucide-react';
import { LanguageSelector } from '@/components/ui/LanguageSelector';
import AddressInput from '@/components/search/AddressInput';
import MapContainer from '@/components/map/MapContainer';
import SearchOverlay from '@/components/search/SearchOverlay';
import MapClickSheet from '@/components/place/MapClickSheet';
import HomeShell from '@/components/home/HomeShell';
import MobileHomeShell from '@/components/home/MobileHomeShell';
import ToastContainer from '@/components/ui/ToastContainer';
import { useRouteStore } from '@/store/route-store';
import { useSearchStore } from '@/store/search-store';
import { addFavorite, getFavorites } from '@/lib/favorites';
import { addRecentSearch, getRecentSearches, type RecentSearch } from '@/lib/recent-searches';
import { recordLocationVisit } from '@/lib/smart-location';
import { startTimer } from '@/lib/monitoring/performance';
import { useToast } from '@/hooks/useToast';
import { useTheme } from './hooks/useTheme';
import { useGeolocation } from './hooks/useGeolocation';
import { useMapState } from './hooks/useMapState';
import { useNetworkStatus } from './hooks/useNetworkStatus';
import { useSortFilter } from './hooks/useSortFilter';
import { useUserData } from './hooks/useUserData';
import type { DetourResult } from '@/types/detour';

const PlaceDetail = dynamic(() => import('@/components/place/PlaceDetail'), {
  loading: () => (
    <div className="h-64 animate-pulse rounded-xl" style={{ background: 'var(--bg-surface-muted)' }} />
  ),
  ssr: false,
});

const SaveRouteDialog = dynamic(() => import('@/components/search/SaveRouteDialog'), {
  loading: () => (
    <div className="h-96 animate-pulse rounded-xl" style={{ background: 'var(--bg-surface-muted)' }} />
  ),
  ssr: false,
});

type LocationInput = { address: string; coordinates?: { lat: number; lng: number } };
type SearchStatus = 'idle' | 'loading' | 'done' | 'error';

const CATEGORIES = ['카페', '편의점', '다이소', '올리브영', '스타벅스'];
const SEOUL_CENTER = { lat: 37.5665, lng: 126.978 };

function formatKm(meters: number): string {
  return `${(meters / 1000).toFixed(meters >= 10000 ? 0 : 1)}km`;
}

function formatMin(seconds: number): string {
  return `${Math.max(1, Math.round(seconds / 60))}분`;
}

function SimpleResultCard({
  result,
  index,
  selected,
  onSelect,
  onHover,
}: {
  result: DetourResult;
  index: number;
  selected: boolean;
  onSelect: (result: DetourResult) => void;
  onHover: (id: string | null) => void;
}) {
  const address = result.place.roadAddress || result.place.address;

  return (
    <button
      type="button"
      data-result-index={index}
      onClick={() => onSelect(result)}
      onMouseEnter={() => onHover(result.place.id)}
      onMouseLeave={() => onHover(null)}
      className="relative w-full overflow-hidden rounded-2xl p-4 text-left transition active:scale-[0.99]"
      style={{
        background: selected ? 'color-mix(in srgb, var(--accent) 10%, var(--bg-surface) 90%)' : 'var(--bg-surface)',
        border: selected ? '1.5px solid var(--accent)' : '1px solid var(--border-soft)',
        boxShadow: selected ? '0 10px 24px rgba(var(--color-accent-rgb), 0.16)' : 'var(--shadow-1)',
      }}
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 z-0"
        style={{ background: selected ? 'color-mix(in srgb, var(--accent) 10%, var(--bg-surface) 90%)' : 'var(--bg-surface)' }}
      />
      <div className="relative z-10 flex items-start gap-3">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold"
          style={{
            background: index === 0 ? 'var(--accent)' : 'var(--bg-surface-muted)',
            color: index === 0 ? 'white' : 'var(--text-secondary)',
          }}
        >
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-base font-bold" style={{ color: 'var(--text-strong)' }}>{result.place.name}</h3>
              <p className="mt-1 line-clamp-2 text-sm leading-snug" style={{ color: 'var(--text-secondary)' }}>{address}</p>
            </div>
            <span className="shrink-0 rounded-full px-2 py-1 text-xs font-bold" style={{ background: 'var(--bg-surface-muted)', color: 'var(--accent)' }}>
              {Math.round(result.finalScore)}점
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <span className="rounded-xl px-3 py-2 text-xs font-semibold" style={{ background: 'var(--bg-surface-muted)', color: 'var(--text-secondary)' }}>
              <span className="block text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>추가 시간</span>
              {formatMin(result.detourCost.duration)}
            </span>
            <span className="rounded-xl px-3 py-2 text-xs font-semibold" style={{ background: 'var(--bg-surface-muted)', color: 'var(--text-secondary)' }}>
              <span className="block text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>우회 거리</span>
              {formatKm(result.detourCost.distance)}
            </span>
          </div>

          <div className="mt-3 flex min-h-10 items-center justify-center gap-2 rounded-xl text-sm font-bold" style={{ background: selected ? 'var(--accent)' : 'color-mix(in srgb, var(--accent) 10%, var(--bg-surface) 90%)', color: selected ? 'var(--text-on-accent)' : 'var(--accent)' }}>
            <Navigation className="h-4 w-4" />
            {selected ? '지도에 표시 중' : '지도에서 보기'}
          </div>
        </div>
      </div>
    </button>
  );
}

export default function HomePage() {
  const {
    start,
    end,
    originalRoute,
    selectedWaypoint,
    setStart,
    setEnd,
    setOriginalRoute,
    selectWaypoint,
  } = useRouteStore();
  const {
    category,
    results,
    isLoading,
    error,
    totalCandidates,
    hasSearched,
    isCached,
    setCategory,
    search,
    clearResults,
    cancelSearch,
  } = useSearchStore();
  const { toasts, showToast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const { gpsLoading, handleGPS } = useGeolocation();
  const { setFavorites, setRecentSearches } = useUserData();
  const { filteredResults } = useSortFilter(results);
  const {
    mapClickInfo,
    setMapClickInfo,
    hoveredWaypointId,
    setHoveredWaypointId,
    mapPanned,
    setMapPanned,
    mapZoomed,
    handleMapClick,
    handleMapIdle,
    handleMapInteraction,
    resetMapInteraction,
  } = useMapState();
  const { isOnline, isSlowConnection } = useNetworkStatus();

  const [appReady, setAppReady] = useState(false);
  const [searchOverlayOpen, setSearchOverlayOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

  const mapCenter = start?.coordinates || SEOUL_CENTER;
  const canSearch = Boolean(start?.address && end?.address);
  const hasVisibleResults = hasSearched || isLoading || Boolean(error);
  const mapRoute = hasSearched ? originalRoute : null;
  const mapWaypoints = hasSearched ? filteredResults : [];
  const searchStatus: SearchStatus = isLoading ? 'loading' : error ? 'error' : results.length > 0 ? 'done' : 'idle';

  const statusCopy = useMemo(() => {
    if (searchStatus === 'loading') return '경로 주변 후보를 찾고 있어요';
    if (searchStatus === 'error') return '검색을 다시 시도해 주세요';
    if (searchStatus === 'done') return `${filteredResults.length}곳 추천`;
    return '출발지와 도착지를 입력하세요';
  }, [filteredResults.length, searchStatus]);

  useEffect(() => {
    const timer = setTimeout(() => setAppReady(true), 450);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!document.cookie.includes('sessionId=')) {
      const sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      const secure = window.location.protocol === 'https:' ? '; Secure' : '';
      document.cookie = `sessionId=${sessionId}; path=/; max-age=604800; SameSite=Lax${secure}`;
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const startAddress = params.get('start');
    const endAddress = params.get('end');
    const shortcutCategory = params.get('cat');
    if (shortcutCategory) {
      setCategory(shortcutCategory);
    }
    if (!startAddress || !endAddress) return;

    const startLocation: LocationInput = {
      address: startAddress,
      ...(params.get('slat') && params.get('slng')
        ? { coordinates: { lat: Number(params.get('slat')), lng: Number(params.get('slng')) } }
        : {}),
    };
    const endLocation: LocationInput = {
      address: endAddress,
      ...(params.get('elat') && params.get('elng')
        ? { coordinates: { lat: Number(params.get('elat')), lng: Number(params.get('elng')) } }
        : {}),
    };
    const nextCategory = shortcutCategory || category;

    setStart(startLocation);
    setEnd(endLocation);
    setCategory(nextCategory);
    clearResults();
    selectWaypoint(null);
    setOriginalRoute(null);

    const timer = setTimeout(() => {
      search(startLocation, endLocation, nextCategory);
    }, 500);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const resetRouteDisplay = useCallback(() => {
    clearResults();
    selectWaypoint(null);
    setOriginalRoute(null);
  }, [clearResults, selectWaypoint, setOriginalRoute]);

  const handleStartChange = useCallback((address: string) => {
    setStart({ address });
    resetRouteDisplay();
  }, [resetRouteDisplay, setStart]);

  const handleEndChange = useCallback((address: string) => {
    setEnd({ address });
    resetRouteDisplay();
  }, [resetRouteDisplay, setEnd]);

  const handleStartSelect = useCallback((result: { address: string; coordinates: { lat: number; lng: number } }) => {
    setStart({ address: result.address, coordinates: result.coordinates });
    recordLocationVisit(result.address, result.coordinates);
    resetRouteDisplay();
  }, [resetRouteDisplay, setStart]);

  const handleEndSelect = useCallback((result: { address: string; coordinates: { lat: number; lng: number } }) => {
    setEnd({ address: result.address, coordinates: result.coordinates });
    resetRouteDisplay();
  }, [resetRouteDisplay, setEnd]);

  const handleSwap = useCallback(() => {
    const previousStart = start;
    setStart(end);
    setEnd(previousStart);
    resetRouteDisplay();
  }, [end, resetRouteDisplay, setEnd, setStart, start]);

  const runSearch = useCallback(async (nextCategory = category) => {
    const endTimer = startTimer('search_duration');
    if (!start?.address || !end?.address) {
      endTimer();
      return;
    }

    addRecentSearch({
      startAddress: start.address,
      endAddress: end.address,
      startCoords: start.coordinates,
      endCoords: end.coordinates,
      category: nextCategory,
    });
    setRecentSearches(getRecentSearches());
    clearResults();
    selectWaypoint(null);
    setOriginalRoute(null);

    try {
      await search(
        { address: start.address, ...(start.coordinates ? { coordinates: start.coordinates } : {}) },
        { address: end.address, ...(end.coordinates ? { coordinates: end.coordinates } : {}) },
        nextCategory
      );
    } finally {
      endTimer();
    }
  }, [category, clearResults, end, search, selectWaypoint, setOriginalRoute, setRecentSearches, start]);

  const handleCategoryChange = useCallback((nextCategory: string) => {
    setCategory(nextCategory);
    if (hasSearched && start?.address && end?.address && !isLoading) {
      runSearch(nextCategory);
    }
  }, [end?.address, hasSearched, isLoading, runSearch, setCategory, start?.address]);

  const handleWaypointSelect = useCallback((waypoint: typeof results[0]) => {
    selectWaypoint(waypoint);
    if (waypoint.routes.original) setOriginalRoute(waypoint.routes.original);
  }, [selectWaypoint, setOriginalRoute]);

  const handleShare = useCallback(async () => {
    if (!start?.address || !end?.address) return;
    const { generateShareUrl, shareUrl } = await import('@/lib/share');
    const url = generateShareUrl({ start: start.address, end: end.address, category });
    const success = await shareUrl({
      url,
      title: 'MidWayDer 경유지 검색',
      text: `${start.address}에서 ${end.address}까지 가는 길의 ${category} 후보입니다.`,
    });
    if (success && !navigator.share) showToast('링크가 복사되었습니다.', 'success');
  }, [category, end?.address, showToast, start?.address]);

  const handleInstantSearch = useCallback(async (item: RecentSearch) => {
    const startLocation = { address: item.startAddress, ...(item.startCoords ? { coordinates: item.startCoords } : {}) };
    const endLocation = { address: item.endAddress, ...(item.endCoords ? { coordinates: item.endCoords } : {}) };
    setStart(startLocation);
    setEnd(endLocation);
    setCategory(item.category);
    clearResults();
    selectWaypoint(null);
    setOriginalRoute(null);
    await search(startLocation, endLocation, item.category);
  }, [clearResults, search, selectWaypoint, setCategory, setEnd, setOriginalRoute, setStart]);

  const handleExpandRadius = useCallback(async () => {
    if (!start?.address || !end?.address) return;
    await search(
      { address: start.address, ...(start.coordinates ? { coordinates: start.coordinates } : {}) },
      { address: end.address, ...(end.coordinates ? { coordinates: end.coordinates } : {}) },
      category,
      { bufferDistance: 2000 }
    );
  }, [category, end, search, start]);

  const rerunMapSearch = useCallback(async () => {
    setMapPanned(false);
    if (!start?.address || !end?.address) return;
    await runSearch(category);
  }, [category, end?.address, runSearch, setMapPanned, start?.address]);

  const desktopPanelClass = hasVisibleResults
    ? 'absolute inset-y-4 left-4 z-30 hidden w-[420px] max-h-[calc(100dvh-2rem)] flex-col overflow-hidden rounded-2xl md:flex'
    : 'absolute left-1/2 top-8 z-30 hidden w-[min(560px,calc(100vw-2rem))] -translate-x-1/2 flex-col overflow-hidden rounded-2xl md:flex';

  const controlSurface = {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-soft)',
    boxShadow: 'var(--shadow-4)',
  } as CSSProperties;

  return (
    <div className="h-dvh overflow-hidden" style={{ background: 'var(--bg-app)' }}>
      <div className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9998] focus:flex focus:gap-2">
        <a href="#search-area" className="skip-link inline-block rounded-lg px-4 py-2 font-semibold" style={{ background: 'var(--accent)', color: 'white' }}>
          검색 영역으로 건너뛰기
        </a>
        <a href="#main-content" className="skip-link inline-block rounded-lg px-4 py-2 font-semibold" style={{ background: 'var(--accent)', color: 'white' }}>
          지도 영역으로 건너뛰기
        </a>
      </div>

      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {isLoading && '경유지를 검색하고 있습니다.'}
        {!isLoading && results.length > 0 && `${results.length}개의 경유지를 찾았습니다.`}
        {error && `검색 실패: ${error}`}
      </div>

      {!appReady && (
        <div data-testid="splash-screen" className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ background: 'var(--bg-app)' }}>
          <div className="rounded-2xl px-5 py-4 text-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)', boxShadow: 'var(--shadow-2)' }}>
            <div className="text-lg font-bold" style={{ color: 'var(--text-strong)' }}>MidWayDer</div>
            <div className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>경로를 준비하고 있어요</div>
          </div>
        </div>
      )}

      <HomeShell
        appReady={appReady}
        isLoading={isLoading}
        resultCount={results.length}
        error={error}
      >
        <MapContainer
          center={mapCenter}
          zoom={12}
          originalRoute={mapRoute}
          detourRoute={selectedWaypoint ? { toWaypoint: selectedWaypoint.routes.toWaypoint, fromWaypoint: selectedWaypoint.routes.fromWaypoint } : null}
          waypoints={mapWaypoints}
          selectedWaypointId={selectedWaypoint?.place.id || null}
          hoveredWaypointId={hoveredWaypointId}
          onWaypointSelect={handleWaypointSelect}
          onMapClick={handleMapClick}
          clickedCoords={mapClickInfo?.coords || null}
          onMapIdle={handleMapIdle}
          onMapInteraction={handleMapInteraction}
          onResetInteraction={resetMapInteraction}
        />

        {(mapPanned || mapZoomed) && hasSearched && !isLoading && (
          <button
            className="absolute left-1/2 top-4 z-20 flex min-h-11 -translate-x-1/2 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold backdrop-blur-xl transition-all active:scale-95"
            style={{ ...controlSurface, color: 'var(--accent)' }}
            onClick={rerunMapSearch}
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            이 지역 재검색
          </button>
        )}

        <section
          id="search-area"
          className={desktopPanelClass}
          style={controlSurface}
        >
          <header className="flex shrink-0 items-start justify-between gap-3 px-5 pb-3 pt-5" style={{ borderBottom: hasVisibleResults ? '1px solid var(--border-soft)' : 'none' }}>
            <div>
              <p className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>MidWayDer</p>
              <h1 className={`${hasVisibleResults ? 'text-xl' : 'text-2xl'} mt-1 font-bold leading-tight`} style={{ color: 'var(--text-strong)' }}>
                가는 길에 들를 곳 찾기
              </h1>
              <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>{statusCopy}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={toggleTheme}
                aria-label="테마 변경"
                className="flex h-9 w-9 items-center justify-center rounded-xl"
                style={{ background: 'var(--bg-surface-muted)', color: 'var(--text-secondary)', border: '1px solid var(--border-soft)' }}
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <LanguageSelector />
            </div>
          </header>

          <div className="shrink-0 px-5 py-4" style={{ borderBottom: hasVisibleResults ? '1px solid var(--border-soft)' : 'none' }}>
            {!isOnline && (
              <div className="mb-3 flex items-center gap-2 rounded-xl px-3 py-2 text-sm" style={{ background: 'var(--color-error-50)', color: 'var(--color-error-700)' }}>
                <Wifi className="h-4 w-4" />
                인터넷 연결을 확인해주세요
              </div>
            )}
            {isOnline && isSlowConnection && (
              <div className="mb-3 flex items-center gap-2 rounded-xl px-3 py-2 text-sm" style={{ background: 'var(--color-warning-50)', color: 'var(--color-warning-700)' }}>
                <Wifi className="h-4 w-4" />
                연결이 느려 검색 시간이 길어질 수 있어요
              </div>
            )}

            <div className={hasVisibleResults ? 'space-y-3' : 'grid grid-cols-[1fr_auto_1fr] items-end gap-3'}>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full text-[11px]" style={{ background: 'var(--accent)', color: 'white' }}>1</span>
                  어디서 출발?
                </div>
                <AddressInput
                  density="compact"
                  label=""
                  value={start?.address || ''}
                  onChange={handleStartChange}
                  onSelect={handleStartSelect}
                  placeholder="출발하는 곳"
                  mapCenter={mapCenter}
                  testId="origin-input"
                />
              </div>

              <div className={hasVisibleResults ? 'flex justify-center' : 'pb-0.5'}>
                <button
                  type="button"
                  onClick={handleSwap}
                  disabled={!start?.address && !end?.address}
                  title="출발지와 도착지 바꾸기"
                  className="flex h-9 w-9 items-center justify-center rounded-xl transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-35"
                  style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-soft)', color: 'var(--text-secondary)' }}
                >
                  <ArrowUpDown className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full text-[11px]" style={{ background: 'var(--success)', color: 'white' }}>2</span>
                  어디까지 가요?
                </div>
                <AddressInput
                  density="compact"
                  label=""
                  value={end?.address || ''}
                  onChange={handleEndChange}
                  onSelect={handleEndSelect}
                  placeholder="도착하는 곳"
                  mapCenter={mapCenter}
                  testId="destination-input"
                />
              </div>
            </div>

            <div className={hasVisibleResults ? 'mt-4' : 'mt-5'}>
              <div className="mb-2 flex items-center gap-2 text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                <span className="flex h-5 w-5 items-center justify-center rounded-full text-[11px]" style={{ background: 'var(--bg-surface-muted)', color: 'var(--text-secondary)' }}>3</span>
                뭘 들를까요?
              </div>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((item) => (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={category === item}
                    onClick={() => handleCategoryChange(item)}
                    className="min-h-9 rounded-full px-3 text-sm font-semibold transition active:scale-95"
                    style={{
                      background: category === item ? 'var(--accent)' : 'var(--bg-surface-muted)',
                      color: category === item ? 'var(--text-on-accent)' : 'var(--text-secondary)',
                      border: `1px solid ${category === item ? 'var(--accent)' : 'var(--border-soft)'}`,
                    }}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <button
              data-testid="search-route-btn"
              type="button"
              onClick={() => runSearch()}
              disabled={isLoading || !canSearch}
              className={`${hasVisibleResults ? 'mt-4' : 'mt-5'} flex min-h-12 w-full items-center justify-center gap-2 rounded-xl text-base font-bold transition active:scale-[0.98] disabled:cursor-not-allowed`}
              style={{
                background: isLoading || !canSearch ? 'var(--bg-surface-muted)' : 'var(--accent)',
                color: isLoading || !canSearch ? 'var(--text-secondary)' : 'var(--text-on-accent)',
                border: `1px solid ${isLoading || !canSearch ? 'var(--border-soft)' : 'var(--accent)'}`,
                boxShadow: isLoading || !canSearch ? 'none' : 'var(--shadow-accent-sm)',
              }}
            >
              <Search className="h-4 w-4" />
              {isLoading ? '찾는 중...' : '경유지 찾기'}
            </button>
          </div>

          <div data-testid="route-result-panel" className={`${hasVisibleResults ? 'block' : 'hidden'} min-h-0 flex-1 overflow-y-auto px-4 py-4 scrollbar-hide`}>
            {!hasVisibleResults && (
              <div className="flex min-h-[220px] flex-col justify-center rounded-xl p-4" style={{ background: 'var(--bg-surface-muted)' }}>
                <MapPin className="mb-4 h-8 w-8" style={{ color: 'var(--accent)' }} />
                <h2 className="text-base font-bold" style={{ color: 'var(--text-strong)' }}>처음부터 다시 단순하게</h2>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  출발지와 도착지를 입력하면, 돌아가지 않고 들르기 좋은 후보만 보여드릴게요.
                </p>
              </div>
            )}

            {hasVisibleResults && (
              <>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold" style={{ color: 'var(--text-strong)' }}>
                      {isLoading ? '검색 중' : error ? '검색 실패' : `추천 ${filteredResults.length}곳`}
                    </p>
                    <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {isCached ? '저장된 결과' : totalCandidates ? `${totalCandidates}개 후보 중 선별` : category}
                    </p>
                  </div>
                  {results.length > 0 && (
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSaveDialogOpen(true)}
                        className="flex h-9 items-center gap-1 rounded-full px-3 text-xs font-semibold"
                        style={{ background: 'var(--bg-surface-muted)', color: 'var(--text-secondary)', border: '1px solid var(--border-soft)' }}
                      >
                        <Bookmark className="h-3.5 w-3.5" />
                        저장
                      </button>
                      <button
                        type="button"
                        onClick={handleShare}
                        className="flex h-9 items-center gap-1 rounded-full px-3 text-xs font-semibold"
                        style={{ background: 'var(--bg-surface-muted)', color: 'var(--accent)', border: '1px solid var(--border-soft)' }}
                      >
                        <Share2 className="h-3.5 w-3.5" />
                        공유
                      </button>
                    </div>
                  )}
                </div>
                {isLoading && (
                  <div className="space-y-3">
                    {[0, 1, 2].map((item) => (
                      <div key={item} className="h-28 animate-pulse rounded-2xl" style={{ background: 'var(--bg-surface-muted)' }} />
                    ))}
                  </div>
                )}

                {error && !isLoading && (
                  <div className="rounded-2xl p-4" style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-soft)' }}>
                    <p className="text-sm font-bold" style={{ color: 'var(--text-strong)' }}>검색이 잠시 막혔어요</p>
                    <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>{error}</p>
                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() => runSearch()}
                        className="min-h-10 rounded-xl px-4 text-sm font-bold"
                        style={{ background: 'var(--accent)', color: 'white' }}
                      >
                        다시 검색
                      </button>
                      <button
                        type="button"
                        onClick={cancelSearch}
                        className="min-h-10 rounded-xl px-4 text-sm font-bold"
                        style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border-soft)' }}
                      >
                        취소
                      </button>
                    </div>
                  </div>
                )}

                {!isLoading && !error && filteredResults.length === 0 && (
                  <div className="rounded-2xl p-4" style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-soft)' }}>
                    <p className="text-sm font-bold" style={{ color: 'var(--text-strong)' }}>아직 추천할 곳이 없어요</p>
                    <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>검색 범위를 넓히거나 다른 카테고리를 선택해보세요.</p>
                    <button
                      type="button"
                      onClick={handleExpandRadius}
                      className="mt-4 min-h-10 rounded-xl px-4 text-sm font-bold"
                      style={{ background: 'var(--accent)', color: 'white' }}
                    >
                      범위 넓히기
                    </button>
                  </div>
                )}

                {!isLoading && !error && filteredResults.length > 0 && (
                  <div className="space-y-3">
                    {filteredResults.slice(0, 8).map((result, index) => (
                      <SimpleResultCard
                        key={result.place.id}
                        result={result}
                        index={index}
                        selected={selectedWaypoint?.place.id === result.place.id}
                        onSelect={handleWaypointSelect}
                        onHover={setHoveredWaypointId}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        <MobileHomeShell
          categories={CATEGORIES}
          category={category}
          startAddress={start?.address}
          endAddress={end?.address}
          isLoading={isLoading}
          error={error}
          results={filteredResults}
          selectedWaypointId={selectedWaypoint?.place.id || null}
          totalCandidates={totalCandidates}
          onOpenSearch={() => setSearchOverlayOpen(true)}
          onCategoryChange={(nextCategory) => {
            handleCategoryChange(nextCategory);
            if (!start?.address || !end?.address) {
              setSearchOverlayOpen(true);
            }
          }}
          onSaveRoute={() => setSaveDialogOpen(true)}
          onResultSelect={handleWaypointSelect}
          onResultHover={setHoveredWaypointId}
          onRetry={() => void runSearch()}
        />

        <div className="md:hidden" role="search" aria-label="장소·주소 검색">
          <SearchOverlay
            open={searchOverlayOpen}
            onClose={() => setSearchOverlayOpen(false)}
            startAddress={start?.address || ''}
            endAddress={end?.address || ''}
            category={category}
            onStartChange={handleStartChange}
            onEndChange={handleEndChange}
            onStartSelect={handleStartSelect}
            onEndSelect={handleEndSelect}
            mapCenter={mapCenter}
            onCategoryChange={handleCategoryChange}
            onSearch={() => {
              setSearchOverlayOpen(false);
              void runSearch();
            }}
            onSwap={handleSwap}
            isLoading={isLoading}
            canSearch={canSearch}
            theme={theme}
            onToggleTheme={toggleTheme}
            onGPS={handleGPS}
            gpsLoading={gpsLoading}
            onInstantSearch={handleInstantSearch}
            onCancel={() => {
              cancelSearch();
              setSearchOverlayOpen(false);
            }}
          />
        </div>

        <div data-testid="desktop-floating-actions" className={`${hasVisibleResults ? 'hidden md:flex' : 'hidden'} absolute bottom-4 right-4 z-30 gap-2`}>
          <Link
            href="/settings"
            className="flex h-12 w-12 items-center justify-center rounded-full backdrop-blur"
            style={controlSurface}
            title="설정"
            aria-label="설정"
          >
            <Settings className="h-5 w-5" style={{ color: 'var(--text-secondary)' }} />
          </Link>
          <button
            type="button"
            onClick={handleGPS}
            disabled={gpsLoading}
            className="flex h-12 w-12 items-center justify-center rounded-full backdrop-blur transition active:scale-95 disabled:opacity-50"
            style={controlSurface}
            title="현재 위치"
            aria-label="현재 위치로 이동"
          >
            <LocateFixed className={`h-5 w-5 ${gpsLoading ? 'animate-pulse' : ''}`} style={{ color: 'var(--accent)' }} />
          </button>
        </div>

        {mapClickInfo && !selectedWaypoint && (
          <MapClickSheet
            name={mapClickInfo.name}
            address={mapClickInfo.address}
            category={mapClickInfo.category}
            phone={mapClickInfo.phone}
            placeUrl={mapClickInfo.placeUrl}
            coords={mapClickInfo.coords}
            onSetStart={() => {
              setStart({ address: mapClickInfo.name, coordinates: mapClickInfo.coords });
              setMapClickInfo(null);
              resetRouteDisplay();
            }}
            onSetEnd={() => {
              setEnd({ address: mapClickInfo.name, coordinates: mapClickInfo.coords });
              setMapClickInfo(null);
              resetRouteDisplay();
            }}
            onClose={() => setMapClickInfo(null)}
          />
        )}

        {selectedWaypoint && (
          <div className="md:hidden">
            <PlaceDetail
              waypoint={selectedWaypoint}
              onClose={() => selectWaypoint(null)}
              onConfirm={(wp) => {
                selectWaypoint(wp);
                if (wp.routes.original) setOriginalRoute(wp.routes.original);
              }}
            />
          </div>
        )}
      </HomeShell>

      {selectedWaypoint && (
        <PlaceDetail
          variant="desktop-pane"
          waypoint={selectedWaypoint}
          onClose={() => selectWaypoint(null)}
          onConfirm={(wp) => {
            selectWaypoint(wp);
            if (wp.routes.original) setOriginalRoute(wp.routes.original);
          }}
        />
      )}

      <SaveRouteDialog
        open={saveDialogOpen}
        onClose={() => setSaveDialogOpen(false)}
        onSave={(name) => {
          if (!start?.address || !end?.address) return;
          addFavorite({
            name,
            startAddress: start.address,
            endAddress: end.address,
            startCoords: start.coordinates,
            endCoords: end.coordinates,
            category,
          });
          setFavorites(getFavorites());
        }}
        defaultName={start?.address && end?.address ? `${start.address.split(' ').slice(0, 2).join(' ')} → ${end.address.split(' ').slice(0, 2).join(' ')}` : ''}
      />

      <ToastContainer toasts={toasts} />
    </div>
  );
}
