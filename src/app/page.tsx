/**
 * Main Page - MidWayDer v0.3.0
 *
 * 네이버지도 스타일 - 전체화면 지도 + 검색바 오버레이
 */

'use client';

import { useCallback, useState } from 'react';
import { Search } from 'lucide-react';
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

type BottomSheetSnap = 'collapsed' | 'half' | 'full';

export default function HomePage() {
  const { start, end, originalRoute, selectedWaypoint, setStart, setEnd, setOriginalRoute, selectWaypoint } = useRouteStore();
  const { category, results, isLoading, error, totalCandidates, apiCallsUsed, setCategory, search, clearResults } = useSearchStore();

  const [searchOverlayOpen, setSearchOverlayOpen] = useState(false);
  const [bottomSheetSnap, setBottomSheetSnap] = useState<BottomSheetSnap>('collapsed');
  const [mapClickInfo, setMapClickInfo] = useState<{ name: string; address?: string; coords: { lat: number; lng: number } } | null>(null);

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

  const handleSearch = async () => {
    if (!start?.address || !end?.address) return;
    clearResults();
    selectWaypoint(null);
    setOriginalRoute(null);
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
            <p className="text-xs text-center" style={{ color: '#8B95A5' }}>
              {totalCandidates}개 중 {results.length}개 추천
            </p>
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
          originalRoute={originalRoute}
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
            <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-100">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ background: '#6C9CFF' }} />
              <span className="flex-1 text-left text-[15px] truncate" style={{ color: start?.address ? '#2D3748' : '#8B95A5' }}>
                {start?.address || '출발지'}
              </span>
            </div>
            <div className="flex items-center gap-3 px-4 py-2.5">
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
                  <p className="text-xs" style={{ color: '#8B95A5' }}>
                    {totalCandidates}개 중 추천
                  </p>
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

        {/* Version */}
        <div className="absolute bottom-2 left-3 z-10">
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/10 backdrop-blur-sm" style={{ color: '#8B95A5' }}>
            v0.3.0
          </span>
        </div>
      </main>
    </div>
  );
}
