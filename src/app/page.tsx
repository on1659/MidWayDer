/**
 * Main Page - MidWayDer v0.7.0
 *
 * 네이버지도 스타일 - 전체화면 지도 + 검색바 오버레이
 * (커스텀 훅으로 관심사 분리, DesktopSidePanel/BottomQuickBar 컴포넌트 분리)
 */

'use client';

import { useCallback, useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Search, Share2, LocateFixed, Sun, Moon, Star } from 'lucide-react';
import MapContainer from '@/components/map/MapContainer';
import SearchOverlay from '@/components/search/SearchOverlay';
import BottomSheet from '@/components/ui/BottomSheet';
import PlaceDetail from '@/components/place/PlaceDetail';
import MapClickSheet from '@/components/place/MapClickSheet';
import RouteTypeFilter from '@/components/search/RouteTypeFilter';
import SortFilter from '@/components/search/SortFilter';
import SaveRouteDialog from '@/components/search/SaveRouteDialog';
import MultiStopSelector from '@/components/search/MultiStopSelector';
import ResultList from '@/components/search/ResultList';
import DesktopSidePanel from '@/components/search/DesktopSidePanel';
import BottomQuickBar from '@/components/search/BottomQuickBar';

const ComparePanel = dynamic(() => import('@/components/search/ComparePanel'), {
  loading: () => <div className="animate-pulse p-4 text-center text-sm" style={{ color: 'var(--text-muted)' }}>로딩 중...</div>,
});

import { useRouteStore } from '@/store/route-store';
import { useSearchStore } from '@/store/search-store';
import { addFavorite, getFavorites } from '@/lib/favorites';
import { recordLocationVisit } from '@/lib/smart-location';
import { useToast } from '@/hooks/useToast';
import ToastContainer from '@/components/ui/ToastContainer';

// Custom Hooks
import { useTheme } from './hooks/useTheme';
import { useGeolocation } from './hooks/useGeolocation';
import { useUserData } from './hooks/useUserData';
import { useSortFilter } from './hooks/useSortFilter';
import { useMapState } from './hooks/useMapState';
import { useSearch } from './hooks/useSearch';
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
  const { mapClickInfo, setMapClickInfo, hoveredWaypointId, setHoveredWaypointId, mapPanned, setMapPanned, handleMapClick, handleMapIdle } = useMapState();
  const { handleSearch, handleInstantSearch, handleExpandRadius, handleCategoryChange } = useSearch({ setBottomSheetSnap, setRecentSearches, savedScrollRef });

  // 스플래시 스크린
  useEffect(() => {
    const timer = setTimeout(() => setAppReady(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  // 세션 ID 초기화
  useEffect(() => {
    if (!document.cookie.includes('sessionId=')) {
      const sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      document.cookie = `sessionId=${sessionId}; path=/; max-age=604800`;
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

  const mapCenter = start?.coordinates || { lat: 37.5665, lng: 126.978 };
  const hasResults = results.length > 0 || isLoading || !!error;
  const canSearch = !!(start?.address && end?.address);

  return (
    <div className="h-dvh flex flex-col md:flex-row overflow-hidden" style={{ background: 'var(--bg-app)' }}>
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
      <main className="flex-1 relative">
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
        />

        {/* 지도 영역 재검색 */}
        {mapPanned && hasSearched && !isLoading && (
          <button className="absolute top-16 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold shadow-lg transition-all active:scale-95 hover:shadow-xl" style={{ background: 'white', color: 'var(--accent)', border: '1.5px solid var(--accent)' }}
            onClick={async () => {
              setMapPanned(false);
              if (!start?.address || !end?.address) return;
              clearResults(); selectWaypoint(null); setOriginalRoute(null);
              await search({ address: start.address, ...(start.coordinates ? { coordinates: start.coordinates } : {}) }, { address: end.address, ...(end.coordinates ? { coordinates: end.coordinates } : {}) }, category);
              setBottomSheetSnap('half');
            }}
          >🔄 이 지역 재검색</button>
        )}

        {/* GPS Button */}
        <button onClick={handleGPS} disabled={gpsLoading} className="absolute bottom-24 right-4 z-20 w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-all hover:bg-gray-50 disabled:opacity-50" title="현재 위치">
          <LocateFixed className={`w-8 h-8 ${gpsLoading ? 'animate-pulse' : ''}`} style={{ color: 'var(--accent)' }} />
        </button>

        {/* Legend */}
        {originalRoute && (
          <div className="hidden md:block absolute bottom-6 left-6 bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-4 space-y-2">
            <div className="flex items-center gap-2"><div className="w-8 h-1 rounded-full" style={{ background: 'var(--accent)' }} /><span className="text-xs" style={{ color: 'var(--text-muted)' }}>원본 경로</span></div>
            {selectedWaypoint && <div className="flex items-center gap-2"><div className="w-8 h-1 rounded-full" style={{ background: 'var(--green-600)' }} /><span className="text-xs" style={{ color: 'var(--text-muted)' }}>경유지 경로</span></div>}
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

        {/* Mobile Search Bar */}
        <div className="md:hidden absolute top-3 inset-x-3 z-30">
          <div className="flex items-start gap-2">
            <button data-testid="open-search-overlay-btn" onClick={() => setSearchOverlayOpen(true)} className="flex-1 bg-white rounded-2xl shadow-lg shadow-black/5 active:scale-[0.98] transition-transform overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100">
                <div className="w-5 h-5 rounded-full shrink-0" style={{ background: 'var(--accent)' }} />
                <span className="flex-1 text-left text-xl truncate font-medium" style={{ color: start?.address ? 'var(--text-strong)' : 'var(--text-muted)' }}>{start?.address || '출발지'}</span>
              </div>
              <div className="flex items-center gap-3 px-4 py-3.5">
                <div className="w-5 h-5 rounded-full shrink-0" style={{ background: 'var(--pink-500)' }} />
                <span className="flex-1 text-left text-xl truncate font-medium" style={{ color: end?.address ? 'var(--text-strong)' : 'var(--text-muted)' }}>{end?.address || '도착지'}</span>
              </div>
            </button>
            <button onClick={toggleTheme} aria-label="테마 변경" className="w-11 h-11 mt-1 rounded-full flex items-center justify-center shadow-lg shadow-black/5" style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)' }}>
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Search Overlay */}
        <div className="md:hidden">
          <SearchOverlay open={searchOverlayOpen} onClose={() => setSearchOverlayOpen(false)} startAddress={start?.address || ''} endAddress={end?.address || ''} category={category} onStartChange={handleStartChange} onEndChange={handleEndChange} onStartSelect={handleStartSelect} onEndSelect={handleEndSelect} mapCenter={mapCenter} onCategoryChange={handleCategoryChange} onSearch={handleSearch} onSwap={handleSwap} isLoading={isLoading} canSearch={canSearch} theme={theme} onToggleTheme={toggleTheme} onGPS={handleGPS} gpsLoading={gpsLoading} onInstantSearch={handleInstantSearch} />
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
                              <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--text-strong)' }}><Star className="w-3 h-3 inline mr-1" style={{ color: 'var(--accent)', fill: 'var(--accent)' }} />{fav.name}</p>
                              <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{fav.startAddress} → {fav.endAddress}</p>
                              <p className="text-[11px]" style={{ color: 'var(--text-disabled)' }}>{fav.category}</p>
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
                              <p className="text-[13px] font-medium truncate" style={{ color: 'var(--text-strong)' }}>{item.startAddress} → {item.endAddress}</p>
                              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{item.category}</p>
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
                      <button onClick={handleShare} className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"><Share2 className="w-4 h-4" style={{ color: 'var(--accent)' }} /></button>
                    </div>
                  </div>
                  {originalRoute && <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>기본 경로{' '}<span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{(originalRoute.distance / 1000).toFixed(1)}km · {Math.round(originalRoute.duration / 60)}분</span></p>}
                  <div className="mb-3"><RouteTypeFilter selected={routeTypeFilter} onChange={setRouteTypeFilter} counts={routeTypeCounts} /></div>
                  <div className="mb-3"><SortFilter selected={sortBy} onChange={setSortBy} /></div>
                </>
              )}
              {results.length >= 2 && start?.coordinates && end?.coordinates && (
                <div className="mb-3">
                  <MultiStopSelector start={start.coordinates} end={end.coordinates} waypoints={results.map((r) => ({ id: r.place.id, name: r.place.name, address: r.place.address, coordinates: r.place.coordinates, detourDistance: r.detourCost.distance, detourDuration: r.detourCost.duration }))} onOptimize={(ids) => { logger.debug('Optimized:', ids); showToast(`${ids.length}개 경유지 최적 경로 완성! 🎉`, 'success'); }} />
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

        {/* Bottom Quick Bar (모바일, 검색 전 + 즐겨찾기/최근 검색 없을 때) */}
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
    </div>
  );
}
