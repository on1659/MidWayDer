/**
 * Share Page - 공유된 검색 결과 자동 실행
 */

'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import MapContainer from '@/components/map/MapContainer';
import ResultList from '@/components/search/ResultList';
import PlaceDetail from '@/components/place/PlaceDetail';
import BottomSheet from '@/components/ui/BottomSheet';
import { useRouteStore } from '@/store/route-store';
import { useSearchStore } from '@/store/search-store';
import type { DetourResult } from '@/types/detour';

function SharePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { originalRoute, selectedWaypoint, selectWaypoint } = useRouteStore();
  const { results, isLoading, search } = useSearchStore();

  const [autoSearchDone, setAutoSearchDone] = useState(false);
  const [sheetSnap, setSheetSnap] = useState<'collapsed' | 'half' | 'full'>('half');

  // URL 파라미터에서 검색 조건 추출 및 자동 검색
  useEffect(() => {
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const category = searchParams.get('category');
    const waypointId = searchParams.get('waypoint');

    if (from && to && category && !autoSearchDone) {
      // 자동 검색 실행
      search({ address: from }, { address: to }, category).then(() => {
        setAutoSearchDone(true);
        
        // 특정 경유지가 지정된 경우 자동 선택
        if (waypointId && results.length > 0) {
          const waypoint = results.find(r => r.place.id === waypointId);
          if (waypoint) {
            selectWaypoint(waypoint);
            setSheetSnap('full');
          }
        }
      });
    }
  }, [searchParams, autoSearchDone, search, results, selectWaypoint]);

  const handleSelectWaypoint = (result: DetourResult) => {
    selectWaypoint(result);
    setSheetSnap('full');
  };

  const handleCloseDetail = () => {
    selectWaypoint(null);
    setSheetSnap('half');
  };

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* 헤더 */}
      <div 
        className="absolute top-0 left-0 right-0 z-10 p-4 shadow-sm"
        style={{ background: 'var(--bg-surface)' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              공유받은 경로
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              {searchParams.get('from')} → {searchParams.get('to')}
            </p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: 'var(--accent)', color: 'white' }}
          >
            새 검색
          </button>
        </div>
      </div>

      {/* 지도 */}
      <div className="absolute inset-0" style={{ paddingTop: '88px' }}>
        <MapContainer
          originalRoute={originalRoute || null}
          waypoints={results}
          selectedWaypointId={selectedWaypoint?.place.id || null}
          onWaypointSelect={handleSelectWaypoint}
        />
      </div>

      {/* 결과 리스트 */}
      <BottomSheet
        snap={sheetSnap}
        onSnapChange={setSheetSnap}
      >
        <div>
          <div className="px-4 pb-3">
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              추천 경유지
            </h2>
            {results.length > 0 && (
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                총 {results.length}개 발견
              </p>
            )}
          </div>
          <div className="px-4 pb-6">
            {isLoading && (
              <div className="text-center py-8">
                <p className="text-sm font-medium animate-pulse" style={{ color: 'var(--accent)' }}>
                  경유지를 찾고 있어요...
                </p>
              </div>
            )}

            {!isLoading && results.length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  검색 조건을 확인해주세요
                </p>
              </div>
            )}

            {!isLoading && results.length > 0 && (
              <ResultList
                results={results}
                selectedId={selectedWaypoint?.place.id || null}
                isLoading={false}
                error={null}
                hasSearched={true}
                currentCategory={searchParams.get('category') || ''}
                onSelect={handleSelectWaypoint}
              />
            )}
          </div>
        </div>
      </BottomSheet>

      {/* 경유지 상세 */}
      {selectedWaypoint && (
        <PlaceDetail
          waypoint={selectedWaypoint}
          onClose={handleCloseDetail}
          onConfirm={handleCloseDetail}
        />
      )}
    </div>
  );
}

export default function SharePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <p className="text-sm font-medium animate-pulse" style={{ color: 'var(--accent)' }}>
          로딩 중...
        </p>
      </div>
    }>
      <SharePageContent />
    </Suspense>
  );
}
