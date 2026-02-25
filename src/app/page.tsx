/**
 * Main Page - MidWayDer v0.4.0
 *
 * 네이버지도 스타일 - 전체화면 지도 + 검색바 오버레이
 */

'use client';

import { useCallback, useState, useEffect, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Search, Share2, LocateFixed, X, Sun, Moon, Star, ArrowUpDown } from 'lucide-react';
import MapContainer from '@/components/map/MapContainer';
import AddressInput from '@/components/search/AddressInput';
import CategorySelect from '@/components/search/CategorySelect';
import ResultList from '@/components/search/ResultList';
import SearchOverlay from '@/components/search/SearchOverlay';
import BottomSheet from '@/components/ui/BottomSheet';
import PlaceDetail from '@/components/place/PlaceDetail';
import MapClickSheet from '@/components/place/MapClickSheet';
import FavoritesList from '@/components/search/FavoritesList';
import RouteTypeFilter from '@/components/search/RouteTypeFilter';
import SortFilter from '@/components/search/SortFilter';
import SaveRouteDialog from '@/components/search/SaveRouteDialog';
import ErrorFallback from '@/components/ui/ErrorFallback';

// Lazy load 컴포넌트 (성능 최적화)
const ComparePanel = dynamic(() => import('@/components/search/ComparePanel'), {
  loading: () => <div className="animate-pulse p-4 text-center text-sm" style={{ color: 'var(--text-muted)' }}>로딩 중...</div>,
});
const RoutePreview = dynamic(() => import('@/components/search/RoutePreview'));
import { useRouteStore } from '@/store/route-store';
import { useSearchStore } from '@/store/search-store';
import { addRecentSearch, getRecentSearches, removeRecentSearch, clearAllRecentSearches, type RecentSearch } from '@/lib/recent-searches';
import { addFavorite, getFavorites } from '@/lib/favorites';
import { getGPSErrorMessage } from '@/lib/error-messages';
import type { Route } from '@/types/location';
import { useToast } from '@/hooks/useToast';
import ToastContainer from '@/components/ui/ToastContainer';

type BottomSheetSnap = 'collapsed' | 'half' | 'full';

export default function HomePage() {
  const { start, end, originalRoute, selectedWaypoint, setStart, setEnd, setOriginalRoute, selectWaypoint } = useRouteStore();
  const { category, results, isLoading, error, totalCandidates, apiCallsUsed, hasSearched, setCategory, search, clearResults } = useSearchStore();
  const { toasts, showToast } = useToast();

  const [appReady, setAppReady] = useState(false);
  const [searchOverlayOpen, setSearchOverlayOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [favorites, setFavorites] = useState(getFavorites());
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [autoTheme, setAutoTheme] = useState(false);
  const [routeTypeFilter, setRouteTypeFilter] = useState<'all' | 'shortest' | 'fastest'>('all');
  const [sortBy, setSortBy] = useState<'score' | 'distance' | 'duration'>('score');
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<typeof results>([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

  // 스플래시 스크린 (1.5초)
  useEffect(() => {
    const timer = setTimeout(() => setAppReady(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  // 세션 ID 초기화 (analytics용)
  useEffect(() => {
    if (!document.cookie.includes('sessionId=')) {
      const sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      document.cookie = `sessionId=${sessionId}; path=/; max-age=604800`; // 7일
    }
  }, []);

  // 최근 검색 로드
  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  // 키보드 단축키 (/ 키로 검색창 포커스)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // / 키를 누르면 검색 오버레이 열기 (입력창에 포커스 중이 아닐 때만)
      if (e.key === '/' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setSearchOverlayOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 테마 초기화 + 시스템 테마 동기화
  useEffect(() => {
    try {
      const saved = localStorage.getItem('theme');
      const autoSaved = localStorage.getItem('auto-theme');
      
      if (autoSaved === 'true') {
        setAutoTheme(true);
        // 자동 전환 모드: 시간 기반
        const hour = new Date().getHours();
        const shouldBeDark = hour < 6 || hour >= 18;
        document.documentElement.classList.toggle('theme-dark', shouldBeDark);
        setTheme(shouldBeDark ? 'dark' : 'light');
      } else if (saved === 'dark') {
        document.documentElement.classList.add('theme-dark');
        setTheme('dark');
      } else if (saved === 'light') {
        // 명시적으로 라이트 모드 설정
        document.documentElement.classList.remove('theme-dark');
        setTheme('light');
      } else {
        // 저장된 값이 없으면 시스템 테마 따름
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
          document.documentElement.classList.add('theme-dark');
          setTheme('dark');
        }
      }
    } catch { /* ignore */ }

    // 시스템 테마 변경 감지
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      try {
        const saved = localStorage.getItem('theme');
        const autoSaved = localStorage.getItem('auto-theme');
        // 사용자가 명시적으로 설정한 경우나 자동 모드는 무시
        if (saved || autoSaved === 'true') return;
        
        const prefersDark = e.matches;
        document.documentElement.classList.toggle('theme-dark', prefersDark);
        setTheme(prefersDark ? 'dark' : 'light');
      } catch { /* ignore */ }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // 자동 테마 전환 (1분마다 체크)
  useEffect(() => {
    if (!autoTheme) return;

    const checkTheme = () => {
      const hour = new Date().getHours();
      const shouldBeDark = hour < 6 || hour >= 18;
      const currentTheme = document.documentElement.classList.contains('theme-dark') ? 'dark' : 'light';
      
      if ((shouldBeDark && currentTheme === 'light') || (!shouldBeDark && currentTheme === 'dark')) {
        const newTheme = shouldBeDark ? 'dark' : 'light';
        document.documentElement.classList.toggle('theme-dark', shouldBeDark);
        setTheme(newTheme);
      }
    };

    const interval = setInterval(checkTheme, 60000); // 1분마다
    return () => clearInterval(interval);
  }, [autoTheme]);

  // theme-color 메타 동기화
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return;
    const accent = getComputedStyle(document.documentElement)
      .getPropertyValue('--accent')
      .trim();
    if (accent) meta.setAttribute('content', accent);
  }, [theme]);

  const toggleTheme = () => {
    // 자동 모드 비활성화
    setAutoTheme(false);
    try { localStorage.removeItem('auto-theme'); } catch { /* ignore */ }

    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.classList.toggle('theme-dark', next === 'dark');
    try { localStorage.setItem('theme', next); } catch { /* ignore */ }
  };

  const toggleAutoTheme = () => {
    const nextAuto = !autoTheme;
    setAutoTheme(nextAuto);
    
    try {
      if (nextAuto) {
        localStorage.setItem('auto-theme', 'true');
        localStorage.removeItem('theme');
        
        // 즉시 자동 테마 적용
        const hour = new Date().getHours();
        const shouldBeDark = hour < 6 || hour >= 18;
        document.documentElement.classList.toggle('theme-dark', shouldBeDark);
        setTheme(shouldBeDark ? 'dark' : 'light');
      } else {
        localStorage.removeItem('auto-theme');
        // 현재 테마 저장
        localStorage.setItem('theme', theme);
      }
    } catch { /* ignore */ }
  };

  const [bottomSheetSnap, setBottomSheetSnap] = useState<BottomSheetSnap>('collapsed');
  const [mapClickInfo, setMapClickInfo] = useState<{ name: string; address?: string; category?: string; phone?: string; placeUrl?: string; coords: { lat: number; lng: number } } | null>(null);
  const [previewRoute, setPreviewRoute] = useState<Route | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const urlProcessed = useRef(false);

  const handleStartChange = useCallback((address: string) => setStart({ address }), [setStart]);
  const handleEndChange = useCallback((address: string) => setEnd({ address }), [setEnd]);
  const handleStartSelect = useCallback((result: { address: string; coordinates: { lat: number; lng: number } }) => {
    setStart({ address: result.address, coordinates: result.coordinates });
  }, [setStart]);
  const handleEndSelect = useCallback((result: { address: string; coordinates: { lat: number; lng: number } }) => {
    setEnd({ address: result.address, coordinates: result.coordinates });
  }, [setEnd]);

  const handleSwap = useCallback(() => {
    const tempStart = start;
    setStart(end);
    setEnd(tempStart);
  }, [start, end, setStart, setEnd]);

  const handleMapClick = useCallback(async (coords: { lat: number; lng: number }) => {
    try {
      const res = await fetch(`/api/reverse-geocode?lat=${coords.lat}&lng=${coords.lng}`);
      const data = await res.json();
      if (!data.name) return;
      setMapClickInfo({ name: data.name, address: data.address, category: data.category, phone: data.phone, placeUrl: data.placeUrl, coords });
    } catch (err) {
      console.error('Reverse geocode failed:', err);
    }
  }, []);

  // Route preview: auto-fetch when both start/end have coordinates
  useEffect(() => {
    const sc = start?.coordinates;
    const ec = end?.coordinates;
    if (!sc || !ec) {
      setPreviewRoute(null);
      return;
    }
    // Don't show preview if we already have search results with originalRoute
    if (originalRoute) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/directions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            start: { lng: sc.lng, lat: sc.lat },
            end: { lng: ec.lng, lat: ec.lat },
          }),
        });
        const data = await res.json();
        if (!cancelled && data.success && data.data) {
          setPreviewRoute(data.data);
        }
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [start?.coordinates, end?.coordinates, originalRoute]);

  // URL params: auto-search from shared link
  useEffect(() => {
    if (urlProcessed.current) return;
    urlProcessed.current = true;
    const params = new URLSearchParams(window.location.search);
    const startAddr = params.get('start');
    const endAddr = params.get('end');
    const cat = params.get('cat');
    const slat = params.get('slat');
    const slng = params.get('slng');
    const elat = params.get('elat');
    const elng = params.get('elng');
    if (startAddr && endAddr) {
      const startLoc = { address: startAddr, ...(slat && slng ? { coordinates: { lat: +slat, lng: +slng } } : {}) };
      const endLoc = { address: endAddr, ...(elat && elng ? { coordinates: { lat: +elat, lng: +elng } } : {}) };
      setStart(startLoc);
      setEnd(endLoc);
      if (cat) setCategory(cat);
      // Auto-search after a short delay
      setTimeout(() => {
        search(
          { address: startAddr },
          { address: endAddr },
          cat || category
        ).then(() => setBottomSheetSnap('half'));
      }, 500);
    }
  }, []);

  // GPS: get current location
  const handleGPS = useCallback(async () => {
    if (!navigator.geolocation) {
      showToast('이 브라우저에서는 위치 기능을 사용할 수 없어요', 'error');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        try {
          const res = await fetch(`/api/reverse-geocode?lat=${coords.lat}&lng=${coords.lng}`);
          const data = await res.json();
          setStart({ address: data.name || data.address || `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`, coordinates: coords });
        } catch {
          setStart({ address: `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`, coordinates: coords });
        }
        setGpsLoading(false);
      },
      (err) => {
        setGpsLoading(false);
        const errorMessage = getGPSErrorMessage(err);
        showToast(errorMessage, 'error');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  }, [setStart]);

  // Share function
  const handleShare = useCallback(async () => {
    if (!start?.address || !end?.address) return;
    const { generateShareUrl, shareUrl } = await import('@/lib/share');
    const url = generateShareUrl({
      start: start.address,
      end: end.address,
      category,
    });
    const success = await shareUrl({
      url,
      title: '미드웨이더 - 경유지 검색',
      text: `${start.address} → ${end.address} 경로의 ${category} 경유지를 찾아봤어요!`,
    });
    if (success && !navigator.share) {
      showToast('링크가 복사되었습니다! 📋', 'success');
    }
  }, [start, end, category, showToast]);

  const handleSearch = async () => {
    if (!start?.address || !end?.address) return;
    // Save to recent searches
    addRecentSearch({
      startAddress: start.address,
      endAddress: end.address,
      startCoords: start.coordinates,
      endCoords: end.coordinates,
      category,
    });
    setRecentSearches(getRecentSearches());
    clearResults();
    selectWaypoint(null);
    setOriginalRoute(null);
    setPreviewRoute(null);
    await search(
      { address: start.address },
      { address: end.address },
      category
    );
    setBottomSheetSnap('half');
  };

  const handleWaypointSelect = useCallback((waypoint: typeof results[0]) => {
    selectWaypoint(waypoint);
    if (waypoint.routes.original) setOriginalRoute(waypoint.routes.original);
    setBottomSheetSnap('collapsed');
  }, [selectWaypoint, setOriginalRoute]);

  // Route type filtering + sorting
  const { filteredResults, routeTypeCounts } = useMemo(() => {
    const counts = {
      all: results.length,
      shortest: results.filter((r: any) => r.routeType === 'shortest').length,
      fastest: results.filter((r: any) => r.routeType === 'fastest').length,
    };

    let filtered =
      routeTypeFilter === 'all'
        ? results
        : results.filter((r: any) => r.routeType === routeTypeFilter);

    // Sort by selected criteria
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'distance':
          return a.detourCost.distance - b.detourCost.distance;
        case 'duration':
          return a.detourCost.duration - b.detourCost.duration;
        case 'score':
        default:
          return b.finalScore - a.finalScore; // higher score first
      }
    });

    return { filteredResults: sorted, routeTypeCounts: counts };
  }, [results, routeTypeFilter, sortBy]);

  const mapCenter = start?.coordinates || { lat: 37.5665, lng: 126.978 };
  const hasResults = results.length > 0 || isLoading || !!error;
  const canSearch = !!(start?.address && end?.address);

  return (
    <div className="h-dvh flex flex-col md:flex-row overflow-hidden" style={{ background: 'var(--bg-app)' }}>
      {/* Splash Screen Overlay */}
      {!appReady && (
        <div
          data-testid="splash-screen"
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity duration-300"
          style={{ background: 'var(--accent)' }}
        >
          <div className="animate-bounce mb-6">
            <div className="w-24 h-24 bg-white rounded-3xl shadow-lg flex items-center justify-center">
              <span className="text-5xl">🗺️</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-wide">MidWayDer</h1>
          <p className="text-white/70 text-sm mt-2">가는 길에 필요한 곳을 더하다</p>
          <div className="mt-8 flex gap-1.5">
            <div className="w-2 h-2 rounded-full bg-white/50 animate-pulse" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 rounded-full bg-white/50 animate-pulse" style={{ animationDelay: '200ms' }} />
            <div className="w-2 h-2 rounded-full bg-white/50 animate-pulse" style={{ animationDelay: '400ms' }} />
          </div>
        </div>
      )}
      {/* ========== DESKTOP SIDE PANEL (md+) ========== */}
      <aside className="hidden md:flex md:w-[420px] md:shrink-0 flex-col bg-white border-r border-gray-100 z-10">
        <header className="px-6 pt-6 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text-strong)' }}>🗺️ MidWayDer</h1>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>가는 길에 어디 들를까?</p>
            </div>
            <button
              onClick={toggleTheme}
              aria-label="테마 변경"
              className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
              style={{ background: 'var(--bg-surface-muted)', color: 'var(--text-muted)' }}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </header>

        <div className="px-5 pb-5 space-y-5 border-b border-gray-100">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: 'var(--accent)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>출발</span>
            </div>
            <AddressInput
              label=""
              value={start?.address || ''}
              onChange={handleStartChange}
              onSelect={handleStartSelect}
              placeholder="출발하는 곳"
              mapCenter={mapCenter}
              testId="origin-input"
            />
          </div>

          {/* 스왑 버튼 */}
          <div className="flex justify-center -my-1">
            <button
              onClick={handleSwap}
              disabled={!start?.address && !end?.address}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-all
                         hover:bg-blue-50 active:scale-95 active:rotate-180 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ border: '1px solid var(--border-soft)' }}
              title="출발지↔도착지 바꾸기"
            >
              <ArrowUpDown className="w-5 h-5 transition-transform duration-300" style={{ color: 'var(--text-muted)' }} />
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: 'var(--pink-500)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--text-strong)' }}>도착</span>
            </div>
            <AddressInput
              label=""
              value={end?.address || ''}
              onChange={handleEndChange}
              onSelect={handleEndSelect}
              placeholder="가고 싶은 곳"
              mapCenter={mapCenter}
              testId="destination-input"
            />
          </div>

          <div className="space-y-2">
            <span className="text-sm font-semibold" style={{ color: 'var(--text-strong)' }}>어디 들를까?</span>
            <CategorySelect selected={category} onChange={setCategory} />
          </div>

          {/* Route Preview */}
          {previewRoute && !originalRoute && (
            <RoutePreview
              distance={previewRoute.distance}
              duration={previewRoute.duration}
            />
          )}

          <button
            data-testid="search-route-btn"
            onClick={handleSearch}
            disabled={isLoading || !canSearch}
            className="w-full py-3.5 text-white rounded-2xl font-bold text-base
              active:scale-[0.97] disabled:bg-gray-200 disabled:text-gray-400
              transition-all shadow-md"
            style={{ background: isLoading || !canSearch ? undefined : 'var(--accent)' }}
          >
            {isLoading ? '찾는 중...' : '경유지 찾기 🔍'}
          </button>

          {/* Quick Categories (Desktop) */}
          {!results.length && !isLoading && (
            <div>
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>빠른 선택</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { emoji: '☕', label: '카페' },
                  { emoji: '🏪', label: '편의점' },
                  { emoji: '🛒', label: '다이소' },
                  { emoji: '💄', label: '올리브영' },
                  { emoji: '⭐', label: '스타벅스' },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => setCategory(item.label)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-all active:scale-95 ${
                      category === item.label ? 'ring-2' : ''
                    }`}
                    style={{
                      background: category === item.label ? 'var(--accent)' : 'var(--blue-150)',
                      color: category === item.label ? 'white' : 'var(--blue-700)',
                      borderColor: category === item.label ? 'var(--accent)' : 'transparent',
                    }}
                  >
                    <span className="text-base">{item.emoji}</span>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {results.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {totalCandidates}개 중 {results.length}개 추천
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSaveDialogOpen(true)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors hover:bg-gray-50"
                    style={{ color: 'var(--accent)' }}
                  >
                    <Star className="w-3.5 h-3.5" />
                    저장
                  </button>
                  <button
                    onClick={handleShare}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors hover:bg-gray-50"
                    style={{ color: 'var(--accent)' }}
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    공유
                  </button>
                  <button
                    onClick={() => {
                      if (filteredResults.length < 2) {
                        showToast('비교할 경유지가 2개 이상 있어야 해요', 'info');
                        return;
                      }
                      // 상위 3개 자동 선택
                      setSelectedForCompare(filteredResults.slice(0, Math.min(3, filteredResults.length)));
                      setCompareMode(true);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors hover:bg-gray-50"
                    style={{ color: 'var(--green-600)' }}
                  >
                    ⚖️ 비교
                  </button>
                </div>
              </div>
              <RouteTypeFilter
                selected={routeTypeFilter}
                onChange={setRouteTypeFilter}
                counts={routeTypeCounts}
              />
              <div className="pt-2">
                <SortFilter
                  selected={sortBy}
                  onChange={setSortBy}
                />
              </div>
            </>
          )}
        </div>

        <div data-testid="route-result-panel" className="flex-1 overflow-y-auto px-5 py-4 scrollbar-hide">
          {results.length === 0 && !isLoading && !error && (
            <>
              <FavoritesList
                onSelect={(fav) => {
                  setStart({ address: fav.startAddress, coordinates: fav.startCoords });
                  setEnd({ address: fav.endAddress, coordinates: fav.endCoords });
                  setCategory(fav.category);
                }}
              />
              {recentSearches.length > 0 && (
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>최근 검색</p>
                    <button
                      onClick={() => {
                        if (confirm(`${recentSearches.length}개의 최근 검색 기록을 모두 삭제하시겠어요?`)) {
                          clearAllRecentSearches();
                          setRecentSearches([]);
                          showToast(`${recentSearches.length}개 검색 기록 삭제됨`, 'success');
                        }
                      }}
                      className="text-xs px-2 py-1 rounded-lg transition-colors hover:bg-gray-100"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      전체 삭제
                    </button>
                  </div>
                  <div className="space-y-2">
                    {recentSearches.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <button
                          className="flex-1 text-left min-w-0"
                          onClick={() => {
                            setStart({ address: item.startAddress, coordinates: item.startCoords });
                            setEnd({ address: item.endAddress, coordinates: item.endCoords });
                            setCategory(item.category);
                          }}
                        >
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--text-strong)' }}>
                            {item.startAddress} → {item.endAddress}
                          </p>
                          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{item.category}</p>
                        </button>
                        <button
                          onClick={() => {
                            removeRecentSearch(item.id);
                            setRecentSearches(getRecentSearches());
                          }}
                          className="shrink-0 p-2 rounded-full hover:bg-gray-200 transition-colors"
                        >
                          <X className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
          <ResultList
            results={filteredResults}
            selectedId={selectedWaypoint?.place.id || null}
            isLoading={isLoading}
            error={error}
            hasSearched={hasSearched}
            currentCategory={category}
            onSelect={handleWaypointSelect}
            onCategoryChange={(newCategory) => {
              setCategory(newCategory);
              if (start?.address && end?.address) {
                search({ address: start.address }, { address: end.address }, newCategory);
              }
            }}
            onRetry={() => {
              if (start?.address && end?.address) {
                search({ address: start.address }, { address: end.address }, category);
              }
            }}
          />
        </div>
      </aside>

      {/* ========== MAP ========== */}
      <main className="flex-1 relative">
        <MapContainer
          center={start?.coordinates || { lat: 37.5665, lng: 126.978 }}
          zoom={12}
          originalRoute={originalRoute || previewRoute}
          detourRoute={
            selectedWaypoint
              ? {
                  toWaypoint: selectedWaypoint.routes.toWaypoint,
                  fromWaypoint: selectedWaypoint.routes.fromWaypoint,
                }
              : null
          }
          waypoints={filteredResults}
          selectedWaypointId={selectedWaypoint?.place.id || null}
          onWaypointSelect={handleWaypointSelect}
          onMapClick={handleMapClick}
          clickedCoords={mapClickInfo?.coords || null}
        />

        {/* GPS Button */}
        <button
          onClick={handleGPS}
          disabled={gpsLoading}
          className="absolute bottom-24 right-4 z-20 w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-all hover:bg-gray-50 disabled:opacity-50"
          title="현재 위치"
        >
          <LocateFixed className={`w-8 h-8 ${gpsLoading ? 'animate-pulse' : ''}`} style={{ color: 'var(--accent)' }} />
        </button>

        {/* Legend (desktop) */}
        {originalRoute && (
          <div className="hidden md:block absolute bottom-6 left-6 bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-4 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-1 rounded-full" style={{ background: 'var(--accent)' }} />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>원본 경로</span>
            </div>
            {selectedWaypoint && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-1 rounded-full" style={{ background: 'var(--green-600)' }} />
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>경유지 경로</span>
              </div>
            )}
          </div>
        )}

        {/* ========== MAP CLICK SHEET ========== */}
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
            }}
            onSetEnd={() => {
              setEnd({ address: mapClickInfo.name, coordinates: mapClickInfo.coords });
              setMapClickInfo(null);
            }}
            onClose={() => setMapClickInfo(null)}
          />
        )}

        {/* ========== PLACE DETAIL ========== */}
        {selectedWaypoint && (
          <PlaceDetail
            waypoint={selectedWaypoint}
            onClose={() => selectWaypoint(null)}
            onConfirm={(wp) => {
              selectWaypoint(wp);
              if (wp.routes.original) setOriginalRoute(wp.routes.original);
            }}
          />
        )}

        {/* ========== MOBILE SEARCH BAR ========== */}
        <div className="md:hidden absolute top-3 inset-x-3 z-30">
          <div className="flex items-start gap-2">
            <button
              data-testid="open-search-overlay-btn"
              onClick={() => setSearchOverlayOpen(true)}
              className="flex-1 bg-white rounded-2xl shadow-lg shadow-black/5 active:scale-[0.98] transition-transform overflow-hidden"
            >
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100">
                <div className="w-5 h-5 rounded-full shrink-0" style={{ background: 'var(--accent)' }} />
                <span className="flex-1 text-left text-xl truncate font-medium" style={{ color: start?.address ? 'var(--text-strong)' : 'var(--text-muted)' }}>
                  {start?.address || '출발지'}
                </span>
              </div>
              <div className="flex items-center gap-3 px-4 py-3.5">
                <div className="w-5 h-5 rounded-full shrink-0" style={{ background: 'var(--pink-500)' }} />
                <span className="flex-1 text-left text-xl truncate font-medium" style={{ color: end?.address ? 'var(--text-strong)' : 'var(--text-muted)' }}>
                  {end?.address || '도착지'}
                </span>
              </div>
            </button>
            <button
              onClick={toggleTheme}
              aria-label="테마 변경"
              className="w-11 h-11 mt-1 rounded-full flex items-center justify-center shadow-lg shadow-black/5"
              style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)' }}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* ========== MOBILE SEARCH OVERLAY ========== */}
        <div className="md:hidden">
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
            onCategoryChange={setCategory}
            onSearch={handleSearch}
            onSwap={handleSwap}
            isLoading={isLoading}
            canSearch={canSearch}
            theme={theme}
            onToggleTheme={toggleTheme}
            onGPS={handleGPS}
            gpsLoading={gpsLoading}
          />
        </div>

        {/* ========== MOBILE BOTTOM SHEET ========== */}
        <div className="md:hidden">
          <BottomSheet
            visible={hasResults}
            snap={bottomSheetSnap}
            onSnapChange={setBottomSheetSnap}
            peekHeight={160}
          >
            <div className="px-4 pb-4">
              {results.length > 0 && (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-strong)' }}>
                      검색 결과 <span style={{ color: 'var(--accent)' }}>{results.length}</span>
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {totalCandidates}개 중 추천
                      </p>
                      <button
                        onClick={handleShare}
                        className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                      >
                        <Share2 className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                      </button>
                    </div>
                  </div>
                  <div className="mb-3">
                    <RouteTypeFilter
                      selected={routeTypeFilter}
                      onChange={setRouteTypeFilter}
                      counts={routeTypeCounts}
                    />
                  </div>
                  <div className="mb-3">
                    <SortFilter
                      selected={sortBy}
                      onChange={setSortBy}
                    />
                  </div>
                </>
              )}
              <ResultList
                results={filteredResults}
                selectedId={selectedWaypoint?.place.id || null}
                isLoading={isLoading}
                error={error}
                hasSearched={hasSearched}
                currentCategory={category}
                onSelect={handleWaypointSelect}
                onCategoryChange={(newCategory) => {
                  setCategory(newCategory);
                  if (start?.address && end?.address) {
                    search({ address: start.address }, { address: end.address }, newCategory);
                  }
                }}
                onRetry={() => {
                  if (start?.address && end?.address) {
                    search({ address: start.address }, { address: end.address }, category);
                  }
                }}
              />
            </div>
          </BottomSheet>
        </div>

        {/* Bottom Quick Bar (모바일, 검색 전) */}
        {!hasResults && !selectedWaypoint && !mapClickInfo && (
          <div className="md:hidden absolute bottom-0 inset-x-0 z-20 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="mx-3 bg-white rounded-2xl shadow-lg shadow-black/5 overflow-hidden">
              {/* 앱 소개 */}
              <div className="px-5 pt-5 pb-3">
                <p className="text-xl font-bold" style={{ color: 'var(--text-strong)' }}>🗺️ 가는 길에 어디 들를까요?</p>
                <p className="text-sm mt-1.5" style={{ color: 'var(--text-secondary)' }}>출발지/도착지 설정 후 경유지를 찾아줘요</p>
              </div>
              
              {/* 즐겨찾기 빠른 접근 */}
              {favorites.length > 0 && (
                <div className="px-5 pb-3">
                  <p className="text-sm font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>자주 가는 경로</p>
                  <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                    {favorites.slice(0, 3).map((fav) => (
                      <button
                        key={fav.id}
                        onClick={async () => {
                          setStart({ address: fav.startAddress, coordinates: fav.startCoords });
                          setEnd({ address: fav.endAddress, coordinates: fav.endCoords });
                          setCategory(fav.category);
                          setSearchOverlayOpen(false);
                          // 자동 검색
                          if (fav.startCoords && fav.endCoords) {
                            setTimeout(() => {
                              search(
                                { address: fav.startAddress, coordinates: fav.startCoords },
                                { address: fav.endAddress, coordinates: fav.endCoords },
                                fav.category
                              ).then(() => setBottomSheetSnap('half'));
                            }, 100);
                          }
                        }}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap shrink-0 transition-all active:scale-95"
                        style={{
                          background: 'var(--bg-surface)',
                          border: '2px solid var(--accent-light)',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                        }}
                      >
                        <Star className="w-4 h-4" style={{ color: 'var(--accent)' }} fill="var(--accent)" />
                        <span className="text-sm font-semibold" style={{ color: 'var(--text-strong)' }}>
                          {fav.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* 인기 경로 프리셋 */}
              <div className="px-5 pb-3">
                <p className="text-sm font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>인기 경로</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { start: '강남역', end: '여의도역', cat: '카페' },
                    { start: '홍대입구역', end: '잠실역', cat: '스타벅스' },
                    { start: '서울역', end: '판교역', cat: '편의점' },
                    { start: '인천공항', end: '강남역', cat: '편의점' },
                    { start: '신촌역', end: '건대입구역', cat: '카페' },
                    { start: '역삼역', end: '선릉역', cat: '다이소' },
                  ].map((preset) => (
                    <button
                      key={`${preset.start}-${preset.end}`}
                      onClick={async () => {
                        setStart({ address: preset.start });
                        setEnd({ address: preset.end });
                        setCategory(preset.cat);
                        setSearchOverlayOpen(false);
                        // 자동 검색
                        setTimeout(() => {
                          search(
                            { address: preset.start },
                            { address: preset.end },
                            preset.cat
                          ).then(() => setBottomSheetSnap('half'));
                        }, 300);
                      }}
                      className="flex flex-col items-start gap-1 p-3 rounded-xl active:scale-95 transition-all"
                      style={{ background: 'var(--bg-surface-muted)' }}
                    >
                      <span className="text-xs font-medium" style={{ color: 'var(--accent)' }}>{preset.cat}</span>
                      <span className="text-sm font-semibold truncate w-full text-left" style={{ color: 'var(--text-strong)' }}>
                        {preset.start} → {preset.end}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 퀵 카테고리 */}
              <div className="flex gap-2.5 px-5 pb-5 overflow-x-auto">
                {[
                  { emoji: '☕', label: '카페' },
                  { emoji: '🏪', label: '편의점' },
                  { emoji: '🛒', label: '다이소' },
                  { emoji: '💄', label: '올리브영' },
                  { emoji: '⭐', label: '스타벅스' },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => {
                      setCategory(item.label);
                      setSearchOverlayOpen(true);
                    }}
                    className="flex items-center gap-2 px-5 py-3.5 rounded-full text-lg font-semibold whitespace-nowrap shrink-0 active:scale-95 transition-all"
                    style={{ background: 'var(--blue-150)', color: 'var(--blue-700)' }}
                  >
                    <span className="text-2xl">{item.emoji}</span>
                    {item.label}
                  </button>
                ))}
              </div>
              {/* 버전 */}
              <div className="px-5 pb-3">
                <span className="text-xs" style={{ color: 'var(--text-disabled)' }}>v0.4.0</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Compare Panel */}
      {compareMode && (
        <ComparePanel
          waypoints={selectedForCompare}
          onClose={() => {
            setCompareMode(false);
            setSelectedForCompare([]);
          }}
          onSelect={(wp) => {
            handleWaypointSelect(wp);
          }}
        />
      )}

      {/* Save Route Dialog */}
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
        defaultName={
          start?.address && end?.address
            ? `${start.address.split(' ').slice(0, 2).join(' ')} → ${end.address.split(' ').slice(0, 2).join(' ')}`
            : ''
        }
      />
    </div>
  );
}
