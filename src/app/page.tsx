/**
 * Main Page - MidWayDer (리디자인)
 *
 * 모바일: 전체화면 지도 + 검색바 오버레이 + 바텀시트 결과
 * 데스크탑(md+): 좌측 사이드패널(400px) + 우측 지도
 */

'use client';

import { useCallback, useState } from 'react';
import { Search, ChevronRight } from 'lucide-react';
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

  // Mobile UI state
  const [searchOverlayOpen, setSearchOverlayOpen] = useState(false);
  const [bottomSheetSnap, setBottomSheetSnap] = useState<BottomSheetSnap>('collapsed');
  const [mapClickInfo, setMapClickInfo] = useState<{ address: string; coords: { lat: number; lng: number } } | null>(null);

  const handleStartChange = useCallback((address: string) => setStart({ address }), [setStart]);
  const handleEndChange = useCallback((address: string) => setEnd({ address }), [setEnd]);
  const handleStartSelect = useCallback((result: { address: string; coordinates: { lat: number; lng: number } }) => {
    setStart({ address: result.address, coordinates: result.coordinates });
  }, [setStart]);
  const handleEndSelect = useCallback((result: { address: string; coordinates: { lat: number; lng: number } }) => {
    setEnd({ address: result.address, coordinates: result.coordinates });
  }, [setEnd]);

  // 지도 클릭 → 역지오코딩 → 바텀시트에 주소 표시
  const handleMapClick = useCallback(async (coords: { lat: number; lng: number }) => {
    try {
      const res = await fetch(`/api/reverse-geocode?lat=${coords.lat}&lng=${coords.lng}`);
      const data = await res.json();
      if (!data.address) return;
      setMapClickInfo({ address: data.address, coords });
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

    // Auto-show results on mobile
    setBottomSheetSnap('half');
  };

  const handleWaypointSelect = useCallback((waypoint: typeof results[0]) => {
    selectWaypoint(waypoint);
    if (waypoint.routes.original) setOriginalRoute(waypoint.routes.original);
    // Collapse sheet to show map on mobile
    setBottomSheetSnap('collapsed');
  }, [selectWaypoint, setOriginalRoute]);

  const mapCenter = start?.coordinates || { lat: 37.5665, lng: 126.978 };
  const hasResults = results.length > 0 || isLoading || !!error;
  const canSearch = !!(start?.address && end?.address);

  // Summary text for mobile search bar
  const searchSummary = start?.address && end?.address
    ? `${start.address} → ${end.address}`
    : '어디서 어디로 가시나요?';

  return (
    <div className="h-dvh flex flex-col md:flex-row overflow-hidden bg-gray-50">
      {/* ========== DESKTOP SIDE PANEL (md+) ========== */}
      <aside className="hidden md:flex md:w-[420px] md:shrink-0 flex-col bg-amber-50 border-r border-amber-100 z-10">
        {/* Header */}
        <header className="px-6 pt-6 pb-4">
          <h1 className="text-2xl font-black text-gray-800">🗺️ MidWayDer</h1>
          <p className="text-sm text-gray-500 mt-1">가는 길에 어디 들를까?</p>
        </header>

        {/* Search controls */}
        <div className="px-5 pb-5 space-y-5 border-b border-amber-200/50">
          <div className="space-y-3">
            <div className="text-base font-bold text-gray-700">📍 출발</div>
            <AddressInput
              label="출발지"
              value={start?.address || ''}
              onChange={handleStartChange}
              onSelect={handleStartSelect}
              placeholder="출발하는 곳"
              mapCenter={mapCenter}
            />
          </div>
          <div className="space-y-3">
            <div className="text-base font-bold text-gray-700">🏁 도착</div>
            <AddressInput
              label="도착지"
              value={end?.address || ''}
              onChange={handleEndChange}
              onSelect={handleEndSelect}
              placeholder="가고 싶은 곳"
              mapCenter={mapCenter}
            />
          </div>

          <div className="space-y-3">
            <div className="text-base font-bold text-gray-700">🏬 어디 들를까?</div>
            <CategorySelect selected={category} onChange={setCategory} />
          </div>

          <button
            onClick={handleSearch}
            disabled={isLoading || !canSearch}
            className="w-full py-4 bg-blue-500 text-white rounded-3xl font-black text-lg
              hover:bg-blue-600 active:scale-[0.97] disabled:bg-gray-200 disabled:text-gray-400
              transition-all shadow-lg shadow-blue-500/30"
          >
            {isLoading ? '🔍 찾는 중...' : '🔍 검색하기!'}
          </button>

          {results.length > 0 && (
            <p className="text-xs text-gray-400 text-center">
              {totalCandidates}개 중 {results.length}개 추천
            </p>
          )}
        </div>

        {/* Results */}
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

      {/* ========== MAP (full area) ========== */}
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
        />

        {/* Legend (desktop) */}
        {originalRoute && (
          <div className="hidden md:block absolute bottom-6 left-6 bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-4 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-1 bg-blue-500 rounded-full" />
              <span className="text-xs text-gray-600">원본 경로</span>
            </div>
            {selectedWaypoint && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-1 bg-green-500 rounded-full" />
                <span className="text-xs text-gray-600">경유지 경로</span>
              </div>
            )}
          </div>
        )}

        {/* ========== MAP CLICK SHEET ========== */}
        {mapClickInfo && !selectedWaypoint && (
          <MapClickSheet
            address={mapClickInfo.address}
            coords={mapClickInfo.coords}
            onSetStart={() => {
              setStart({ address: mapClickInfo.address, coordinates: mapClickInfo.coords });
              setMapClickInfo(null);
            }}
            onSetEnd={() => {
              setEnd({ address: mapClickInfo.address, coordinates: mapClickInfo.coords });
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

        {/* ========== MOBILE SEARCH BAR (overlay on map) ========== */}
        <div className="md:hidden absolute top-4 inset-x-4 z-30">
          <button
            onClick={() => setSearchOverlayOpen(true)}
            className="w-full flex items-center gap-3 px-5 py-4 bg-white rounded-3xl shadow-lg shadow-black/10 active:scale-[0.97] transition-transform"
          >
            <span className="text-2xl shrink-0">🔍</span>
            <span className={`flex-1 text-left text-base font-bold truncate ${canSearch ? 'text-gray-800' : 'text-gray-400'}`}>
              {searchSummary}
            </span>
            <ChevronRight className="w-5 h-5 text-gray-300 shrink-0" />
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

        {/* ========== MOBILE BOTTOM SHEET (results) ========== */}
        <div className="md:hidden">
          <BottomSheet
            visible={hasResults}
            snap={bottomSheetSnap}
            onSnapChange={setBottomSheetSnap}
            peekHeight={160}
          >
            <div className="px-4 pb-4">
              {/* Stats header */}
              {results.length > 0 && (
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-900">
                    검색 결과 <span className="text-blue-500">{results.length}</span>
                  </p>
                  <p className="text-xs text-gray-400">
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
      </main>
    </div>
  );
}
