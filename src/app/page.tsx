/**
 * Main Page - MidWayDer v0.4.0
 *
 * 네이버지도 스타일 - 전체화면 지도 + 검색바 오버레이
 */

'use client';

import { useCallback, useState, useEffect, useRef } from 'react';
import { Search, Share2, LocateFixed } from 'lucide-react';
import MapContainer from '@/components/map/MapContainer';
import AddressInput from '@/components/search/AddressInput';
import CategorySelect from '@/components/search/CategorySelect';
import ResultList from '@/components/search/ResultList';
import SearchOverlay from '@/components/search/SearchOverlay';
import BottomSheet from '@/components/ui/BottomSheet';
import PlaceDetail from '@/components/place/PlaceDetail';
import MapClickSheet from '@/components/place/MapClickSheet';
import { useRouteStore } from '@/store/route-store';
import { useSearchStore } from '@/store/search-store';
import { addRecentSearch } from '@/lib/recent-searches';
import type { Route } from '@/types/location';

type BottomSheetSnap = 'collapsed' | 'half' | 'full';

export default function HomePage() {
  const { start, end, originalRoute, selectedWaypoint, setStart, setEnd, setOriginalRoute, selectWaypoint } = useRouteStore();
  const { category, results, isLoading, error, totalCandidates, apiCallsUsed, setCategory, search, clearResults } = useSearchStore();

  const [appReady, setAppReady] = useState(false);
  const [searchOverlayOpen, setSearchOverlayOpen] = useState(false);

  // 스플래시 스크린 (1.5초)
  useEffect(() => {
    const timer = setTimeout(() => setAppReady(true), 1500);
    return () => clearTimeout(timer);
  }, []);
  const [bottomSheetSnap, setBottomSheetSnap] = useState<BottomSheetSnap>('collapsed');
  const [mapClickInfo, setMapClickInfo] = useState<{ name: string; address?: string; coords: { lat: number; lng: number } } | null>(null);
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

  const handleMapClick = useCallback(async (coords: { lat: number; lng: number }) => {
    try {
      const res = await fetch(`/api/reverse-geocode?lat=${coords.lat}&lng=${coords.lng}`);
      const data = await res.json();
      if (!data.name) return;
      setMapClickInfo({ name: data.name, address: data.address, coords });
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
    if (!navigator.geolocation) return;
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
      () => setGpsLoading(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [setStart]);

  // Share function
  const handleShare = useCallback(async () => {
    if (!start?.address || !end?.address) return;
    const params = new URLSearchParams();
    params.set('start', start.address);
    params.set('end', end.address);
    params.set('cat', category);
    if (start.coordinates) { params.set('slat', String(start.coordinates.lat)); params.set('slng', String(start.coordinates.lng)); }
    if (end.coordinates) { params.set('elat', String(end.coordinates.lat)); params.set('elng', String(end.coordinates.lng)); }
    const url = `${window.location.origin}?${params.toString()}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'MidWayDer 경유지 검색', url }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      alert('링크가 복사되었습니다!');
    }
  }, [start, end, category]);

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

  const mapCenter = start?.coordinates || { lat: 37.5665, lng: 126.978 };
  const hasResults = results.length > 0 || isLoading || !!error;
  const canSearch = !!(start?.address && end?.address);

  return (
    <div className="h-dvh flex flex-col md:flex-row overflow-hidden" style={{ background: '#F8F9FB' }}>
      {/* Splash Screen Overlay */}
      {!appReady && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity duration-300" style={{ background: '#6C9CFF' }}>
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
          <h1 className="text-2xl font-bold" style={{ color: '#2D3748' }}>🗺️ MidWayDer</h1>
          <p className="text-sm mt-1" style={{ color: '#8B95A5' }}>가는 길에 어디 들를까?</p>
        </header>

        <div className="px-5 pb-5 space-y-5 border-b border-gray-100">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: '#6C9CFF' }} />
              <span className="text-sm font-semibold" style={{ color: '#2D3748' }}>출발</span>
            </div>
            <AddressInput
              label="출발지"
              value={start?.address || ''}
              onChange={handleStartChange}
              onSelect={handleStartSelect}
              placeholder="출발하는 곳"
              mapCenter={mapCenter}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: '#FF8FA3' }} />
              <span className="text-sm font-semibold" style={{ color: '#2D3748' }}>도착</span>
            </div>
            <AddressInput
              label="도착지"
              value={end?.address || ''}
              onChange={handleEndChange}
              onSelect={handleEndSelect}
              placeholder="가고 싶은 곳"
              mapCenter={mapCenter}
            />
          </div>

          <div className="space-y-2">
            <span className="text-sm font-semibold" style={{ color: '#2D3748' }}>어디 들를까?</span>
            <CategorySelect selected={category} onChange={setCategory} />
          </div>

          <button
            onClick={handleSearch}
            disabled={isLoading || !canSearch}
            className="w-full py-3.5 text-white rounded-2xl font-bold text-base
              active:scale-[0.97] disabled:bg-gray-200 disabled:text-gray-400
              transition-all shadow-md"
            style={{ background: isLoading || !canSearch ? undefined : '#6C9CFF' }}
          >
            {isLoading ? '찾는 중...' : '경유지 찾기 🔍'}
          </button>

          {results.length > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-xs" style={{ color: '#8B95A5' }}>
                {totalCandidates}개 중 {results.length}개 추천
              </p>
              <button
                onClick={handleShare}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors hover:bg-gray-50"
                style={{ color: '#6C9CFF' }}
              >
                <Share2 className="w-3.5 h-3.5" />
                공유
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 scrollbar-hide">
          <ResultList
            results={results}
            selectedId={selectedWaypoint?.place.id || null}
            isLoading={isLoading}
            error={error}
            onSelect={handleWaypointSelect}
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
          waypoints={results}
          selectedWaypointId={selectedWaypoint?.place.id || null}
          onWaypointSelect={handleWaypointSelect}
          onMapClick={handleMapClick}
          clickedCoords={mapClickInfo?.coords || null}
        />

        {/* GPS Button */}
        <button
          onClick={handleGPS}
          disabled={gpsLoading}
          className="absolute bottom-20 right-4 z-20 w-11 h-11 bg-white rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-all hover:bg-gray-50 disabled:opacity-50"
          title="현재 위치"
        >
          <LocateFixed className={`w-5 h-5 ${gpsLoading ? 'animate-pulse' : ''}`} style={{ color: '#6C9CFF' }} />
        </button>

        {/* Legend (desktop) */}
        {originalRoute && (
          <div className="hidden md:block absolute bottom-6 left-6 bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-4 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-1 rounded-full" style={{ background: '#6C9CFF' }} />
              <span className="text-xs" style={{ color: '#8B95A5' }}>원본 경로</span>
            </div>
            {selectedWaypoint && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-1 rounded-full" style={{ background: '#7ED6A8' }} />
                <span className="text-xs" style={{ color: '#8B95A5' }}>경유지 경로</span>
              </div>
            )}
          </div>
        )}

        {/* ========== MAP CLICK SHEET ========== */}
        {mapClickInfo && !selectedWaypoint && (
          <MapClickSheet
            name={mapClickInfo.name}
            address={mapClickInfo.address}
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
          <button
            onClick={() => setSearchOverlayOpen(true)}
            className="w-full bg-white rounded-2xl shadow-lg shadow-black/5 active:scale-[0.98] transition-transform overflow-hidden"
          >
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ background: '#6C9CFF' }} />
              <span className="flex-1 text-left text-[15px] truncate" style={{ color: start?.address ? '#2D3748' : '#8B95A5' }}>
                {start?.address || '출발지'}
              </span>
            </div>
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ background: '#FF8FA3' }} />
              <span className="flex-1 text-left text-[15px] truncate" style={{ color: end?.address ? '#2D3748' : '#8B95A5' }}>
                {end?.address || '도착지'}
              </span>
            </div>
          </button>
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
            isLoading={isLoading}
            canSearch={canSearch}
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
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold" style={{ color: '#2D3748' }}>
                    검색 결과 <span style={{ color: '#6C9CFF' }}>{results.length}</span>
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-xs" style={{ color: '#8B95A5' }}>
                      {totalCandidates}개 중 추천
                    </p>
                    <button
                      onClick={handleShare}
                      className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                    >
                      <Share2 className="w-4 h-4" style={{ color: '#6C9CFF' }} />
                    </button>
                  </div>
                </div>
              )}
              <ResultList
                results={results}
                selectedId={selectedWaypoint?.place.id || null}
                isLoading={isLoading}
                error={error}
                onSelect={handleWaypointSelect}
              />
            </div>
          </BottomSheet>
        </div>

        {/* Bottom Quick Bar (모바일, 검색 전) */}
        {!hasResults && !selectedWaypoint && !mapClickInfo && (
          <div className="md:hidden absolute bottom-0 inset-x-0 z-20 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="mx-3 bg-white rounded-2xl shadow-lg shadow-black/5 overflow-hidden">
              {/* 앱 소개 */}
              <div className="px-4 pt-3 pb-2">
                <p className="text-[13px] font-bold" style={{ color: '#2D3748' }}>🗺️ 가는 길에 어디 들를까요?</p>
                <p className="text-[11px] mt-0.5" style={{ color: '#8B95A5' }}>출발지와 도착지를 설정하면 경로 위 편의시설을 찾아드려요</p>
              </div>
              {/* 퀵 카테고리 */}
              <div className="flex gap-1 px-3 pb-3 overflow-x-auto">
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
                    className="flex items-center gap-1.5 px-3 py-2 rounded-full text-[13px] font-medium whitespace-nowrap shrink-0 active:scale-95 transition-all"
                    style={{ background: '#F0F4FF', color: '#4A6FA5' }}
                  >
                    <span>{item.emoji}</span>
                    {item.label}
                  </button>
                ))}
              </div>
              {/* 버전 */}
              <div className="px-4 pb-2">
                <span className="text-[10px]" style={{ color: '#C4CCD8' }}>v0.4.0</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
