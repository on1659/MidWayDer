/**
 * Main Page - MidWayDer v0.7.0
 *
 * 네이버지도 스타일 - 전체화면 지도 + 검색바 오버레이
 * (커스텀 훅으로 관심사 분리, DesktopSidePanel/BottomQuickBar 컴포넌트 분리)
 */

'use client';

import { useCallback, useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { LocateFixed, Moon, RefreshCw, Search, Settings, Share2, Star, Sun, Wifi } from 'lucide-react';
import Link from 'next/link';
import { LanguageSelector } from '@/components/ui/LanguageSelector';
import MapContainer from '@/components/map/MapContainer';
import SearchOverlay from '@/components/search/SearchOverlay';
import BottomSheet from '@/components/ui/BottomSheet';
import MapClickSheet from '@/components/place/MapClickSheet';
import RouteTypeFilter from '@/components/search/RouteTypeFilter';
import SortFilter from '@/components/search/SortFilter';
import { FilterChips } from '@/components/search/FilterChips';
import MultiStopSelector from '@/components/search/MultiStopSelector';
import DesktopSidePanel from '@/components/search/DesktopSidePanel';
import BottomQuickBar from '@/components/search/BottomQuickBar';
import { ResultListSkeleton } from '@/components/ui/Skeleton';

const ComparePanel = dynamic(() => import('@/components/search/ComparePanel'), {
  loading: () => (
    <div className="p-4 space-y-3 animate-pulse rounded-2xl gpu-accelerate" style={{ background: 'var(--bg-surface)' }}>
      <div className="h-6 rounded-lg w-1/3" style={{ background: 'var(--bg-surface-muted)' }} />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-24 rounded-xl" style={{ background: 'var(--bg-surface-muted)' }} />
        <div className="h-24 rounded-xl" style={{ background: 'var(--bg-surface-muted)' }} />
      </div>
    </div>
  ),
});

const ResultList = dynamic(() => import('@/components/search/ResultList'), {
  loading: () => <ResultListSkeleton count={5} />,
  ssr: false,
});

const PlaceDetail = dynamic(() => import('@/components/place/PlaceDetail'), {
  loading: () => (
    <div className="h-64 animate-pulse rounded-xl gpu-accelerate" style={{ background: 'var(--bg-surface-muted)' }} />
  ),
  ssr: false,
});

const SaveRouteDialog = dynamic(() => import('@/components/search/SaveRouteDialog'), {
  loading: () => (
    <div className="h-96 animate-pulse rounded-xl gpu-accelerate" style={{ background: 'var(--bg-surface-muted)' }} />
  ),
  ssr: false,
});

const FeedbackWidget = dynamic(
  () => import('@/components/feedback/FeedbackWidget').then((mod) => ({ default: mod.FeedbackWidget })),
  {
    loading: () => (
      <div className="h-12 w-12 animate-pulse rounded-full gpu-accelerate" style={{ background: 'var(--bg-surface-muted)' }} />
    ),
    ssr: false,
  }
);

import { useRouteStore } from '@/store/route-store';
import { useSearchStore } from '@/store/search-store';

import { addFavorite, getFavorites } from '@/lib/favorites';
import { recordLocationVisit } from '@/lib/smart-location';
import { useToast } from '@/hooks/useToast';
import ToastContainer from '@/components/ui/ToastContainer';
import type { SavedRoute } from '@/types/saved-route';

// Custom Hooks
import { useTheme } from './hooks/useTheme';
import { useGeolocation } from './hooks/useGeolocation';
import { useUserData } from './hooks/useUserData';
import { useSortFilter } from './hooks/useSortFilter';
import { useMapState } from './hooks/useMapState';
import { useSearch } from './hooks/useSearch';
import { useNetworkStatus } from './hooks/useNetworkStatus';
import type { DetourResult } from '@/types/detour';
import { logger } from '@/lib/logger';

type BottomSheetSnap = 'collapsed' | 'half' | 'full';

export default function HomePage() {
  // ① Zustand stores
  const { start, end, originalRoute, selectedWaypoint, setStart, setEnd, setOriginalRoute, selectWaypoint } = useRouteStore();
  const { category, results, isLoading, error, totalCandidates, isCached, hasSearched, search, clearResults, cancelSearch, setCategory } = useSearchStore();
  const { toasts, showToast } = useToast();

  // ② 로컬 UI 상태
  const [appReady, setAppReady] = useState(false);
  const [searchOverlayOpen, setSearchOverlayOpen] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<DetourResult[]>([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [bottomSheetSnap, setBottomSheetSnap] = useState<BottomSheetSnap>('collapsed');
  const bottomSheetContentRef = useRef<HTMLDivElement>(null);
  const savedScrollRef = useRef<number>(0);

  // ③ 커스텀 훅
  const { theme, toggleTheme } = useTheme();
  const { gpsLoading, handleGPS } = useGeolocation();
  const { routeTypeFilter, setRouteTypeFilter, sortBy, setSortBy, filteredResults, routeTypeCounts } = useSortFilter(results);
  const { recentSearches, setRecentSearches, favorites, setFavorites } = useUserData();
  const { mapClickInfo, setMapClickInfo, hoveredWaypointId, setHoveredWaypointId, mapPanned, setMapPanned, mapZoomed, handleMapClick, handleMapIdle, handleMapInteraction, resetMapInteraction } = useMapState();
  const { handleSearch, handleInstantSearch, handleExpandRadius, handleCategoryChange } = useSearch({ setBottomSheetSnap, setRecentSearches, savedScrollRef });
  const { isOnline, isSlowConnection } = useNetworkStatus();

  // 검색 취소 핸들러
  const handleCancelSearch = useCallback(() => {
    cancelSearch();
    setSearchOverlayOpen(false);
  }, [cancelSearch]);

  // 스플래시 스크린
  useEffect(() => {
    const timer = setTimeout(() => setAppReady(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  // v0.68.0: 뒤로가기 버튼 처리 (모바일)
  useEffect(() => {
    const handlePopState = () => {
      // 검색 오버레이가 열려있으면 닫기
      if (searchOverlayOpen) {
        setSearchOverlayOpen(false);
        return;
      }
      // 선택된 경유지가 있으면 해제
      if (selectedWaypoint) {
        selectWaypoint(null);
        return;
      }
      // 바텀시트가 펼쳐져 있으면 접기
      if (bottomSheetSnap !== 'collapsed') {
        setBottomSheetSnap('collapsed');
        return;
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [searchOverlayOpen, selectedWaypoint, bottomSheetSnap, selectWaypoint, setSearchOverlayOpen, setBottomSheetSnap]);

  // 세션 ID 초기화
  useEffect(() => {
    if (!document.cookie.includes('sessionId=')) {
      const sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      const secure = window.location.protocol === 'https:' ? '; Secure' : '';
      document.cookie = `sessionId=${sessionId}; path=/; max-age=604800; SameSite=Lax${secure}`;
    }
  }, []);

  // 키보드 단축키
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setSearchOverlayOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // snap='full' 스크롤 복원
  useEffect(() => {
    if (bottomSheetSnap === 'full' && bottomSheetContentRef.current) {
      const t = setTimeout(() => {
        if (bottomSheetContentRef.current) bottomSheetContentRef.current.scrollTop = savedScrollRef.current;
      }, 400);
      return () => clearTimeout(t);
    }
  }, [bottomSheetSnap]);

  // ④ 나머지 핸들러
  const handleStartChange = useCallback((address: string) => setStart({ address }), [setStart]);
  const handleEndChange = useCallback((address: string) => setEnd({ address }), [setEnd]);
  const handleStartSelect = useCallback((result: { address: string; coordinates: { lat: number; lng: number } }) => {
    setStart({ address: result.address, coordinates: result.coordinates });
    recordLocationVisit(result.address, result.coordinates);
  }, [setStart]);
  const handleEndSelect = useCallback((result: { address: string; coordinates: { lat: number; lng: number } }) => {
    setEnd({ address: result.address, coordinates: result.coordinates });
  }, [setEnd]);
  const handleSwap = useCallback(() => { const tmp = start; setStart(end); setEnd(tmp); }, [start, end, setStart, setEnd]);
  const handleRoutineApply = useCallback((startAddr: string, startCoords: { lat: number; lng: number }, endAddr: string, endCoords: { lat: number; lng: number }) => {
    setStart({ address: startAddr, coordinates: startCoords });
    setEnd({ address: endAddr, coordinates: endCoords });
  }, [setStart, setEnd]);
  const handleSnapChange = useCallback((snap: BottomSheetSnap) => {
    if (snap !== 'full') savedScrollRef.current = bottomSheetContentRef.current?.scrollTop ?? 0;
    setBottomSheetSnap(snap);
  }, []);
  const handleShare = useCallback(async () => {
    if (!start?.address || !end?.address) return;
    const { generateShareUrl, shareUrl } = await import('@/lib/share');
    const url = generateShareUrl({ start: start.address, end: end.address, category });
    const success = await shareUrl({ url, title: '미드웨이더 - 경유지 검색', text: `${start.address} → ${end.address} 경로의 ${category} 경유지를 찾아봤어요!` });
    if (success && !navigator.share) showToast('링크가 복사되었습니다! 📋', 'success');
  }, [start, end, category, showToast]);
  const handleWaypointSelect = useCallback((waypoint: typeof results[0]) => {
    selectWaypoint(waypoint);
    if (waypoint.routes.original) setOriginalRoute(waypoint.routes.original);
    savedScrollRef.current = bottomSheetContentRef.current?.scrollTop ?? 0;
    setBottomSheetSnap('collapsed');
  }, [selectWaypoint, setOriginalRoute]);

  // 저장된 경로 선택 핸들러 (v0.63.0)
  const handleRouteSelect = useCallback((route: SavedRoute) => {
    // 출발지/도착지 설정
    setStart({ address: route.startAddress, coordinates: route.startCoords });
    setEnd({ address: route.endAddress, coordinates: route.endCoords });

    // 카테고리 설정 (있는 경우)
    if (route.category) {
      setCategory(route.category);
    }

    // 자동 검색 실행
    search(
      { address: route.startAddress, coordinates: route.startCoords },
      { address: route.endAddress, coordinates: route.endCoords },
      route.category || category
    ).then(() => {
      setBottomSheetSnap('half');
    });

    // 오버레이 닫기
    setSearchOverlayOpen(false);
  }, [setStart, setEnd, setCategory, search, category, setBottomSheetSnap]);

  const mapCenter = start?.coordinates || { lat: 37.5665, lng: 126.978 };
  const hasResults = results.length > 0 || isLoading || !!error;
  const canSearch = !!(start?.address && end?.address);

  return (
    <div className="h-dvh flex flex-col md:flex-row overflow-hidden safe-all" style={{ background: 'var(--bg-app)' }}>
      {/* Skip Links (접근성) */}
      <div className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9998] focus:flex focus:gap-2">
        <a
          href="#main-content"
          className="skip-link inline-block px-4 py-2 rounded-lg font-semibold focus:outline-none focus:ring-2 focus:ring-white"
          style={{ background: 'var(--accent)', color: 'white' }}
        >
          메인 콘텐츠로 건너뛰기
        </a>
        <a
          href="#search-area"
          className="skip-link inline-block px-4 py-2 rounded-lg font-semibold focus:outline-none focus:ring-2 focus:ring-white"
          style={{ background: 'var(--accent)', color: 'white' }}
        >
          검색 영역으로 건너뛰기
        </a>
        <a
          href="#results"
          className="skip-link inline-block px-4 py-2 rounded-lg font-semibold focus:outline-none focus:ring-2 focus:ring-white"
          style={{ background: 'var(--accent)', color: 'white' }}
        >
          검색 결과로 건너뛰기
        </a>
      </div>

      {/* ARIA Live Region (검색 상태 알림) */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {isLoading && '경로를 검색하고 있습니다. 잠시만 기다려주세요.'}
        {!isLoading && results.length > 0 && `${results.length}개의 경유지를 찾았습니다.`}
        {error && `검색 실패: ${error}`}
      </div>

      {/* Splash Screen */}
      {!appReady && (
        <div data-testid="splash-screen" className="fixed inset-0 z-[9999] flex flex-col items-center justify-center" style={{ background: 'var(--accent)' }}>
          <div className="animate-bounce mb-6">
            <div className="w-24 h-24 bg-white rounded-3xl shadow-lg flex items-center justify-center">
              <span className="text-5xl">🗺️</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-wide">MidWayDer</h1>
          <p className="text-white/70 text-sm mt-2">가는 길에 필요한 곳을 더하다</p>
          <div className="mt-8 flex gap-1.5">
            {[0, 200, 400].map((delay) => (
              <div key={delay} className="w-2 h-2 rounded-full bg-white/50 animate-pulse" style={{ animationDelay: `${delay}ms` }} />
            ))}
          </div>
        </div>
      )}

      {/* ========== DESKTOP SIDE PANEL (md+) ========== */}
      <DesktopSidePanel
        theme={theme}
        toggleTheme={toggleTheme}
        recentSearches={recentSearches}
        setRecentSearches={setRecentSearches}
        onOpenSaveDialog={() => setSaveDialogOpen(true)}
        onStartCompare={(items) => { setSelectedForCompare(items); setCompareMode(true); }}
      />

      {/* ========== MAP ========== */}
      <main id="main-content" className="flex-1 relative" role="main">
        <MapContainer
          center={mapCenter}
          zoom={12}
          originalRoute={originalRoute}
          detourRoute={selectedWaypoint ? { toWaypoint: selectedWaypoint.routes.toWaypoint, fromWaypoint: selectedWaypoint.routes.fromWaypoint } : null}
          waypoints={filteredResults}
          selectedWaypointId={selectedWaypoint?.place.id || null}
          hoveredWaypointId={hoveredWaypointId}
          onWaypointSelect={handleWaypointSelect}
          onMapClick={handleMapClick}
          clickedCoords={mapClickInfo?.coords || null}
          onMapIdle={handleMapIdle}
          onMapInteraction={handleMapInteraction}
          onResetInteraction={resetMapInteraction}
        />

        {/* 지도 영역 재검색 */}
        {(mapPanned || mapZoomed) && hasSearched && !isLoading && (
          <button className="absolute top-16 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold backdrop-blur transition-all active:scale-95" style={{ background: 'var(--bg-overlay)', color: 'var(--accent)', border: '1.5px solid var(--border-accent)', boxShadow: 'var(--shadow-3)' }}
            onClick={async () => {
              setMapPanned(false);
              if (!start?.address || !end?.address) return;
              clearResults(); selectWaypoint(null); setOriginalRoute(null);
              await search({ address: start.address, ...(start.coordinates ? { coordinates: start.coordinates } : {}) }, { address: end.address, ...(end.coordinates ? { coordinates: end.coordinates } : {}) }, category);
              setBottomSheetSnap('half');
            }}
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            이 지역 재검색
          </button>
        )}

        {/* Settings Button — z-50: BottomSheet(z-40) 위에 표시, 바텀시트 상태에 따라 위치 조정 */}
        <Link
          href="/settings"
          className={`absolute right-4 z-50 w-14 h-14 rounded-full flex items-center justify-center active:scale-95 transition-all backdrop-blur ${
            hasResults && bottomSheetSnap !== 'full' ? 'bottom-52' : 'bottom-44'
          }`}
          style={{
            background: 'var(--bg-overlay)',
            border: '1px solid var(--border-soft)',
            boxShadow: 'var(--shadow-3)',
          }}
          title="설정"
          aria-label="설정"
        >
          <Settings className="w-6 h-6" style={{ color: 'var(--accent)' }} />
        </Link>

        {/* GPS Button — z-50: BottomSheet(z-40) 위에 표시 */}
        <button
          onClick={handleGPS}
          disabled={gpsLoading}
          className={`absolute right-4 z-50 w-16 h-16 rounded-full flex items-center justify-center active:scale-95 transition-all backdrop-blur disabled:opacity-50 ${
            hasResults && bottomSheetSnap !== 'full' ? 'bottom-32' : 'bottom-24'
          }`}
          style={{
            background: 'var(--bg-overlay)',
            border: '1px solid var(--border-soft)',
            boxShadow: 'var(--shadow-3)',
          }}
          title="현재 위치"
          aria-label="현재 위치로 이동"
        >
          <LocateFixed className={`w-8 h-8 ${gpsLoading ? 'animate-pulse' : ''}`} style={{ color: 'var(--accent)' }} />
        </button>

        {/* Legend */}
        {originalRoute && (
          <div
            className="hidden md:block absolute bottom-6 left-6 backdrop-blur-sm rounded-2xl p-4 space-y-2"
            style={{
              background: 'var(--bg-overlay)',
              border: '1px solid var(--border-soft)',
              boxShadow: 'var(--shadow-1)',
            }}
          >
            <div className="flex items-center gap-2"><div className="w-8 h-1 rounded-full" style={{ background: 'var(--accent)' }} /><span className="text-xs" style={{ color: 'var(--text-muted)' }}>원본 경로</span></div>
            {selectedWaypoint && <div className="flex items-center gap-2"><div className="w-8 h-1 rounded-full" style={{ background: 'var(--success)' }} /><span className="text-xs" style={{ color: 'var(--text-muted)' }}>경유지 경로</span></div>}
          </div>
        )}

        {/* Map Click Sheet */}
        {mapClickInfo && !selectedWaypoint && (
          <MapClickSheet name={mapClickInfo.name} address={mapClickInfo.address} category={mapClickInfo.category} phone={mapClickInfo.phone} placeUrl={mapClickInfo.placeUrl} coords={mapClickInfo.coords}
            onSetStart={() => { setStart({ address: mapClickInfo.name, coordinates: mapClickInfo.coords }); setMapClickInfo(null); }}
            onSetEnd={() => { setEnd({ address: mapClickInfo.name, coordinates: mapClickInfo.coords }); setMapClickInfo(null); }}
            onClose={() => setMapClickInfo(null)}
          />
        )}

        {/* Place Detail */}
        {selectedWaypoint && (
          <PlaceDetail waypoint={selectedWaypoint} onClose={() => selectWaypoint(null)} onConfirm={(wp) => { selectWaypoint(wp); if (wp.routes.original) setOriginalRoute(wp.routes.original); }} />
        )}

        {/* Mobile Search Bar - 카카오맵 스타일 (상단 고정) */}
        <div className="md:hidden absolute top-4 inset-x-4 z-30 safe-top">
          {/* Network Status Warning */}
          {!isOnline && (
            <div className="mb-2 px-4 py-2 text-sm text-red-700 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center gap-2">
              <Wifi className="w-4 h-4" />
              인터넷 연결을 확인해주세요
            </div>
          )}
          {isOnline && isSlowConnection && (
            <div className="mb-2 px-4 py-2 text-sm text-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg flex items-center gap-2">
              <Wifi className="w-4 h-4" />
              느린 연결 감지됨. 검색 시간이 오래 걸릴 수 있습니다.
            </div>
          )}

          {/* 카카오맵 스타일: 검색창 + 태그가 상단에 */}
          <div
            className="rounded-2xl overflow-hidden backdrop-blur"
            style={{
              background: 'var(--bg-overlay)',
              border: '1px solid var(--border-soft)',
              boxShadow: 'var(--shadow-3)',
            }}
          >
            {/* 검색창 */}
            <button
              data-testid="open-search-overlay-btn"
              onClick={() => setSearchOverlayOpen(true)}
              className="w-full flex items-center gap-3 px-4 py-4 transition-colors"
              style={{ borderBottom: '1px solid var(--border-soft)' }}
            >
              <Search className="w-5 h-5 shrink-0" style={{ color: 'var(--accent)' }} />
              <span className="flex-1 text-left text-base font-medium" style={{ color: 'var(--text-secondary)' }}>
                어디를 들를까? (예: 홍대입구역, 다이소)
              </span>
            </button>

            {/* 출발지/도착지 표시 */}
            {(start?.address || end?.address) && (
              <button
                onClick={() => setSearchOverlayOpen(true)}
                className="w-full flex flex-col gap-2 px-4 py-3 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white" style={{ background: 'var(--accent)' }}>출</div>
                  <span className="flex-1 text-left text-sm truncate" style={{ color: 'var(--text-strong)' }}>{start?.address || '출발지 선택'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white" style={{ background: 'var(--success)' }}>도</div>
                  <span className="flex-1 text-left text-sm truncate" style={{ color: 'var(--text-strong)' }}>{end?.address || '도착지 선택'}</span>
                </div>
              </button>
            )}

            {/* 카테고리 태그 (카카오맵처럼 상단에) */}
            <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide" style={{ borderTop: '1px solid var(--border-soft)' }}>
              {['카페', '편의점', '다이소', '올리브영', '스타벅스'].map((cat) => (
                <button
                  key={cat}
                  tabIndex={0}
                  aria-label={`${cat} 카테고리 선택`}
                  onClick={() => {
                    setCategory(cat);
                    if (start?.address && end?.address) {
                      search({ address: start.address }, { address: end.address }, cat);
                    } else {
                      setSearchOverlayOpen(true);
                    }
                  }}
                  className="px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all active:scale-95"
                  style={{
                    background: category === cat ? 'var(--accent)' : 'var(--bg-surface-muted)',
                    color: category === cat ? 'var(--text-on-accent)' : 'var(--text-secondary)',
                    border: `1px solid ${category === cat ? 'var(--border-accent)' : 'var(--border-soft)'}`,
                    boxShadow: category === cat ? 'var(--shadow-1)' : 'none',
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* 테마/언어 버튼 */}
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={toggleTheme}
              aria-label="테마 변경"
              className="w-12 h-12 rounded-full flex items-center justify-center backdrop-blur"
              style={{
                background: 'var(--bg-overlay)',
                border: '1px solid var(--border-soft)',
                boxShadow: 'var(--shadow-1)',
                color: 'var(--text-muted)',
              }}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <LanguageSelector />
          </div>
        </div>

        {/* Mobile Search Overlay */}
        <div className="md:hidden" role="search" aria-label="경로 검색">
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
            onSearch={handleSearch}
            onSwap={handleSwap}
            isLoading={isLoading}
            canSearch={canSearch}
            theme={theme}
            onToggleTheme={toggleTheme}
            onGPS={handleGPS}
            gpsLoading={gpsLoading}
            onInstantSearch={handleInstantSearch}
            onCancel={handleCancelSearch}
            onRouteSelect={handleRouteSelect}
          />
        </div>

        {/* Mobile Bottom Sheet */}
        <div className="md:hidden">
          <BottomSheet visible={hasResults || favorites.length > 0 || recentSearches.length > 0} snap={hasResults ? bottomSheetSnap : 'collapsed'} onSnapChange={handleSnapChange} peekHeight={160} contentRef={bottomSheetContentRef}>
            <div className="px-4 pb-4">
              {!hasResults && !isLoading && (
                <div className="mb-2">
                  {favorites.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-semibold mb-2.5 flex items-center gap-2" style={{ color: 'var(--text-strong)' }}><Star className="w-4 h-4" style={{ color: 'var(--accent)', fill: 'var(--accent)' }} />즐겨찾기 경로</p>
                      <div className="space-y-2">
                        {favorites.slice(0, 5).map((fav) => (
                          <div key={fav.id} className="flex items-center gap-2 p-3 rounded-xl transition-all active:scale-[0.99]" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}>
                            <button className="flex-1 text-left min-w-0" onClick={() => { setStart({ address: fav.startAddress, coordinates: fav.startCoords }); setEnd({ address: fav.endAddress, coordinates: fav.endCoords }); setCategory(fav.category); if (fav.startCoords && fav.endCoords) search({ address: fav.startAddress, coordinates: fav.startCoords }, { address: fav.endAddress, coordinates: fav.endCoords }, fav.category).then(() => setBottomSheetSnap('half')); }}>
                              <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-strong)' }}><Star className="w-3.5 h-3.5 inline mr-1" style={{ color: 'var(--accent)', fill: 'var(--accent)' }} />{fav.name}</p>
                              <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{fav.startAddress} → {fav.endAddress}</p>
                              <p className="text-xs" style={{ color: 'var(--text-disabled)' }}>{fav.category}</p>
                            </button>
                            <button onClick={() => { setStart({ address: fav.startAddress, coordinates: fav.startCoords }); setEnd({ address: fav.endAddress, coordinates: fav.endCoords }); setCategory(fav.category); if (fav.startCoords && fav.endCoords) search({ address: fav.startAddress, coordinates: fav.startCoords }, { address: fav.endAddress, coordinates: fav.endCoords }, fav.category).then(() => setBottomSheetSnap('half')); }} className="shrink-0 px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all active:scale-95" style={{ background: 'var(--accent)', color: 'white' }}>▶</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {recentSearches.length > 0 && favorites.length === 0 && (
                    <div>
                      <p className="text-sm font-semibold mb-2.5 flex items-center gap-2" style={{ color: 'var(--text-strong)' }}><Search className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />최근 검색</p>
                      <div className="space-y-2">
                        {recentSearches.slice(0, 3).map((item) => (
                          <div key={item.id} className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}>
                            <button className="flex-1 text-left min-w-0" onClick={() => { setStart({ address: item.startAddress, coordinates: item.startCoords }); setEnd({ address: item.endAddress, coordinates: item.endCoords }); setCategory(item.category); }}>
                              <p className="text-sm font-medium truncate" style={{ color: 'var(--text-strong)' }}>{item.startAddress} → {item.endAddress}</p>
                              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{item.category}</p>
                            </button>
                            <button onClick={() => handleInstantSearch(item)} className="shrink-0 px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all active:scale-95" style={{ background: 'var(--accent)', color: 'white' }}>▶</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {results.length > 0 && (
                <>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-strong)' }}>검색 결과 <span style={{ color: 'var(--accent)' }}>{results.length}</span></p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{totalCandidates}개 중 추천</p>
                      {isCached && <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: 'var(--blue-100)', color: 'var(--blue-600)' }}>⚡ 캐시</span>}
                      <button
                        onClick={handleShare}
                        className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                        aria-label="경로 공유"
                      >
                        <Share2 className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                      </button>
                    </div>
                  </div>
                  {originalRoute && <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>기본 경로{' '}<span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{(originalRoute.distance / 1000).toFixed(1)}km · {Math.round(originalRoute.duration / 60)}분</span></p>}
                  <div className="mb-3"><RouteTypeFilter selected={routeTypeFilter} onChange={setRouteTypeFilter} counts={routeTypeCounts} /></div>
                  <div className="mb-3"><SortFilter selected={sortBy} onChange={setSortBy} /></div>
                  {hasSearched && results.length > 0 && <div className="mb-3"><FilterChips /></div>}
                </>
              )}
              {results.length >= 2 && start?.coordinates && end?.coordinates && (
                <div className="mb-3">
                  <MultiStopSelector start={start.coordinates} end={end.coordinates} waypoints={results.map((r) => ({ id: r.place.id, name: r.place.name, address: r.place.address, coordinates: r.place.coordinates, detourDistance: r.detourCost?.distance ?? 0, detourDuration: r.detourCost?.duration ?? 0 }))} onOptimize={(ids) => { logger.debug('Optimized:', ids); showToast(`${ids.length}개 경유지 최적 경로 완성! 🎉`, 'success'); }} />
                </div>
              )}
              <ResultList results={filteredResults} selectedId={selectedWaypoint?.place.id || null} isLoading={isLoading} error={error} hasSearched={hasSearched} currentCategory={category}
                onSelect={handleWaypointSelect}
                onCategoryChange={(cat) => { setCategory(cat); if (start?.address && end?.address) search({ address: start.address }, { address: end.address }, cat); }}
                onRetry={() => { if (start?.address && end?.address) search({ address: start.address }, { address: end.address }, category); }}
                onSaveRoute={() => setSaveDialogOpen(true)} onExpandRadius={handleExpandRadius} onCancel={cancelSearch} sortBy={sortBy} onHoverResult={setHoveredWaypointId}
              />
            </div>
          </BottomSheet>
        </div>

        {/* Bottom Quick Bar (모바일) - BottomSheet가 안 보일 때만 표시 (즐겨찾기/최근검색 있으면 BottomSheet에서 처리) */}
        {!hasResults && !selectedWaypoint && !mapClickInfo && favorites.length === 0 && recentSearches.length === 0 && (
          <BottomQuickBar favorites={favorites} setBottomSheetSnap={setBottomSheetSnap} setSearchOverlayOpen={setSearchOverlayOpen} onRoutineApply={handleRoutineApply} />
        )}
      </main>

      {/* Compare Panel */}
      {compareMode && (
        <ComparePanel waypoints={selectedForCompare} onClose={() => { setCompareMode(false); setSelectedForCompare([]); }} onSelect={handleWaypointSelect} />
      )}

      {/* Save Route Dialog */}
      <SaveRouteDialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)}
        onSave={(name) => {
          if (!start?.address || !end?.address) return;
          addFavorite({ name, startAddress: start.address, endAddress: end.address, startCoords: start.coordinates, endCoords: end.coordinates, category });
          setFavorites(getFavorites());
        }}
        defaultName={start?.address && end?.address ? `${start.address.split(' ').slice(0, 2).join(' ')} → ${end.address.split(' ').slice(0, 2).join(' ')}` : ''}
      />

      <ToastContainer toasts={toasts} />

      {/* Feedback Widget */}
      <FeedbackWidget />
    </div>
  );
}
