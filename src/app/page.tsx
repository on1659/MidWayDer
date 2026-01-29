/**
 * Main Page - MidWayDer 메인 화면
 *
 * 좌측 패널: 검색 컨트롤 + 결과 리스트
 * 우측 패널: 지도 + 경로 + 마커
 */

'use client';

import { useState, useCallback } from 'react';
import { Search, MapPin } from 'lucide-react';
import NaverMap from '@/components/map/NaverMap';
import RoutePolyline from '@/components/map/RoutePolyline';
import WaypointMarker from '@/components/map/WaypointMarker';
import AddressInput from '@/components/search/AddressInput';
import CategorySelect from '@/components/search/CategorySelect';
import ResultList from '@/components/search/ResultList';
import { useRouteStore } from '@/store/route-store';
import { useSearchStore } from '@/store/search-store';

export default function HomePage() {
  const [map, setMap] = useState<naver.maps.Map | null>(null);

  // Route Store
  const { start, end, originalRoute, selectedWaypoint, setStart, setEnd, setOriginalRoute, selectWaypoint } = useRouteStore();

  // Search Store
  const { category, results, isLoading, error, totalCandidates, apiCallsUsed, setCategory, search, clearResults } = useSearchStore();

  // 주소 입력 핸들러
  const handleStartChange = useCallback((address: string) => {
    setStart({ address });
  }, [setStart]);

  const handleEndChange = useCallback((address: string) => {
    setEnd({ address });
  }, [setEnd]);

  // 검색 버튼 클릭
  const handleSearch = async () => {
    if (!start?.address || !end?.address) {
      alert('출발지와 도착지를 모두 입력해주세요.');
      return;
    }

    // 이전 결과 초기화
    clearResults();
    selectWaypoint(null);
    setOriginalRoute(null);

    // 검색 실행
    await search(
      { address: start.address },
      { address: end.address },
      category
    );
  };

  // 경유지 선택 핸들러
  const handleWaypointSelect = useCallback((waypoint: typeof results[0]) => {
    selectWaypoint(waypoint);

    // 원본 경로 저장
    if (waypoint.routes.original) {
      setOriginalRoute(waypoint.routes.original);
    }
  }, [selectWaypoint, setOriginalRoute]);

  // 지도 준비 완료 콜백
  const handleMapReady = useCallback((mapInstance: naver.maps.Map) => {
    setMap(mapInstance);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* 좌측 패널: 검색 컨트롤 + 결과 */}
      <aside className="w-96 bg-white border-r border-gray-200 flex flex-col">
        {/* 헤더 */}
        <header className="px-6 py-5 border-b border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <MapPin className="w-8 h-8 text-blue-500" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">MidWayDer</h1>
              <p className="text-xs text-gray-500">가는 길 중간에 필요한 곳을 더하다</p>
            </div>
          </div>
        </header>

        {/* 검색 컨트롤 */}
        <div className="px-6 py-4 border-b border-gray-200 space-y-4">
          {/* 출발지 */}
          <AddressInput
            label="출발지"
            value={start?.address || ''}
            onChange={handleStartChange}
            placeholder="예: 서울시청"
          />

          {/* 도착지 */}
          <AddressInput
            label="도착지"
            value={end?.address || ''}
            onChange={handleEndChange}
            placeholder="예: 강남역"
          />

          {/* 카테고리 */}
          <CategorySelect
            selected={category}
            onChange={setCategory}
          />

          {/* 검색 버튼 */}
          <button
            onClick={handleSearch}
            disabled={isLoading || !start?.address || !end?.address}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <Search className="w-5 h-5" />
            {isLoading ? '검색 중...' : '경유지 검색'}
          </button>

          {/* 검색 통계 */}
          {results.length > 0 && (
            <div className="text-xs text-gray-500 space-y-1">
              <p>총 {totalCandidates}개 중 상위 {results.length}개 추천</p>
              <p>API 호출: {apiCallsUsed}회</p>
            </div>
          )}
        </div>

        {/* 결과 리스트 */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <ResultList
            results={results}
            selectedId={selectedWaypoint?.place.id || null}
            isLoading={isLoading}
            error={error}
            onSelect={handleWaypointSelect}
          />
        </div>
      </aside>

      {/* 우측 패널: 지도 */}
      <main className="flex-1 relative">
        <NaverMap
          center={start?.coordinates || { lat: 37.5665, lng: 126.978 }}
          zoom={12}
          onMapReady={handleMapReady}
        />

        {/* 경로 폴리라인 */}
        {originalRoute && (
          <RoutePolyline
            map={map}
            originalRoute={originalRoute}
            detourRoute={
              selectedWaypoint
                ? {
                    toWaypoint: selectedWaypoint.routes.toWaypoint,
                    fromWaypoint: selectedWaypoint.routes.fromWaypoint,
                  }
                : null
            }
          />
        )}

        {/* 경유지 마커 */}
        {results.length > 0 && (
          <WaypointMarker
            map={map}
            waypoints={results}
            selectedId={selectedWaypoint?.place.id || null}
            onMarkerClick={handleWaypointSelect}
          />
        )}

        {/* 범례 (좌하단) */}
        {originalRoute && (
          <div className="absolute bottom-6 left-6 bg-white rounded-lg shadow-lg p-4 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-1 bg-blue-500 rounded"></div>
              <span className="text-sm text-gray-700">원본 경로</span>
            </div>
            {selectedWaypoint && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-1 bg-green-500 rounded"></div>
                <span className="text-sm text-gray-700">경유지 경로</span>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
