'use client';

/**
 * MidWayDer v2 - 단순화된 6화면 UX
 *
 * 흐름:
 * 1. 홈: 검색창 1개 (출발/도착 미구분)
 * 2. 검색 오버레이: 자동완성
 * 3. 장소 선택 → 하단 카드 → "출발지로/도착지로" 버튼
 * 4. 출발 채워짐 → 도착 검색 유도
 * 5. 둘 다 채워짐 → 경로 그려짐 → "경유지 찾기" CTA 활성
 * 6. 경유지 결과 시트
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Search, LocateFixed, ArrowLeftRight, Settings } from 'lucide-react';
import Link from 'next/link';

import { useRouteStore } from '@/store/route-store';
import { useSearchStore } from '@/store/search-store';

import PlaceSearchOverlay from '@/components/v2/PlaceSearchOverlay';
import PlaceDetailSheet from '@/components/v2/PlaceDetailSheet';
import RouteSummaryCard from '@/components/v2/RouteSummaryCard';
import WaypointResultsSheet, { CategoryPicker } from '@/components/v2/WaypointResultsSheet';
import type { AddressSelection } from '@/components/search/AddressInput';
import type { DetourResult } from '@/types/detour';

const MapContainer = dynamic(() => import('@/components/map/MapContainer'), {
  ssr: false,
  loading: () => (
    <div
      className="flex h-full w-full items-center justify-center"
      style={{ background: 'var(--bg-app)' }}
    >
      <div className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
        지도 로딩 중...
      </div>
    </div>
  ),
});

type SlotTarget = 'start' | 'end' | null;

export default function V2HomePage() {
  const { start, end, originalRoute, selectedWaypoint, setStart, setEnd, setOriginalRoute, selectWaypoint, reset } = useRouteStore();
  const { category, results, isLoading, hasSearched, totalCandidates, setCategory, search, clearResults, cancelSearch } = useSearchStore();

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTarget, setSearchTarget] = useState<SlotTarget>(null);
  const [pendingPlace, setPendingPlace] = useState<AddressSelection | null>(null);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);

  const mapCenter = useMemo(() => {
    if (selectedWaypoint?.place.coordinates) return selectedWaypoint.place.coordinates;
    if (start?.coordinates) return start.coordinates;
    if (end?.coordinates) return end.coordinates;
    return { lat: 37.5663, lng: 126.9779 };
  }, [start?.coordinates, end?.coordinates, selectedWaypoint]);

  const detourRoute = useMemo(() => {
    if (!selectedWaypoint) return null;
    return {
      toWaypoint: selectedWaypoint.routes.toWaypoint,
      fromWaypoint: selectedWaypoint.routes.fromWaypoint,
    };
  }, [selectedWaypoint]);

  const openSearch = useCallback((target: SlotTarget = null) => {
    setSearchTarget(target);
    setSearchOpen(true);
  }, []);

  const handlePlaceSelected = useCallback(
    (place: AddressSelection) => {
      if (searchTarget === 'start') {
        setStart({ address: place.address, coordinates: place.coordinates });
        clearResults();
        selectWaypoint(null);
        setOriginalRoute(null);
      } else if (searchTarget === 'end') {
        setEnd({ address: place.address, coordinates: place.coordinates });
        clearResults();
        selectWaypoint(null);
        setOriginalRoute(null);
      } else {
        setPendingPlace(place);
      }
      setSearchTarget(null);
    },
    [searchTarget, setStart, setEnd, clearResults, selectWaypoint, setOriginalRoute]
  );

  const handleSetAsStart = useCallback(() => {
    if (!pendingPlace) return;
    setStart({ address: pendingPlace.address, coordinates: pendingPlace.coordinates });
    clearResults();
    selectWaypoint(null);
    setOriginalRoute(null);
    setPendingPlace(null);
  }, [pendingPlace, setStart, clearResults, selectWaypoint, setOriginalRoute]);

  const handleSetAsEnd = useCallback(() => {
    if (!pendingPlace) return;
    setEnd({ address: pendingPlace.address, coordinates: pendingPlace.coordinates });
    clearResults();
    selectWaypoint(null);
    setOriginalRoute(null);
    setPendingPlace(null);
  }, [pendingPlace, setEnd, clearResults, selectWaypoint, setOriginalRoute]);

  const handleClearStart = useCallback(() => {
    setStart(null);
    clearResults();
    selectWaypoint(null);
    setOriginalRoute(null);
  }, [setStart, clearResults, selectWaypoint, setOriginalRoute]);

  const handleClearEnd = useCallback(() => {
    setEnd(null);
    clearResults();
    selectWaypoint(null);
    setOriginalRoute(null);
  }, [setEnd, clearResults, selectWaypoint, setOriginalRoute]);

  const handleSwap = useCallback(() => {
    const prevStart = start;
    setStart(end);
    setEnd(prevStart);
    clearResults();
    selectWaypoint(null);
    setOriginalRoute(null);
  }, [start, end, setStart, setEnd, clearResults, selectWaypoint, setOriginalRoute]);

  const handleSearchWaypoints = useCallback(async () => {
    if (!start?.address || !end?.address) return;
    if (!hasSearched) {
      setCategoryPickerOpen(true);
      return;
    }
    await search(
      { address: start.address, ...(start.coordinates ? { coordinates: start.coordinates } : {}) },
      { address: end.address, ...(end.coordinates ? { coordinates: end.coordinates } : {}) },
      category
    );
  }, [start, end, search, category, hasSearched]);

  const handleCategoryPicked = useCallback(
    async (c: string) => {
      setCategory(c);
      if (!start?.address || !end?.address) return;
      await search(
        { address: start.address, ...(start.coordinates ? { coordinates: start.coordinates } : {}) },
        { address: end.address, ...(end.coordinates ? { coordinates: end.coordinates } : {}) },
        c
      );
    },
    [start, end, search, setCategory]
  );

  const handleUseCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const place: AddressSelection = {
          address: '내 위치',
          coordinates: { lat: pos.coords.latitude, lng: pos.coords.longitude },
        };
        if (searchTarget === 'start') {
          setStart({ address: place.address, coordinates: place.coordinates });
        } else if (searchTarget === 'end') {
          setEnd({ address: place.address, coordinates: place.coordinates });
        } else {
          setPendingPlace(place);
        }
        setSearchTarget(null);
      },
      () => {
        // ignore
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [searchTarget, setStart, setEnd]);

  // Phase: 어떤 화면을 보여줄지 결정
  const phase: 'home' | 'one-slot' | 'both-slots' | 'results' = useMemo(() => {
    if (results.length > 0 || isLoading) return 'results';
    if (start && end) return 'both-slots';
    if (start || end) return 'one-slot';
    return 'home';
  }, [start, end, results.length, isLoading]);

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden" style={{ background: 'var(--bg-app)' }}>
      {/* 지도 (전체) */}
      <div className="absolute inset-0">
        <MapContainer
          center={mapCenter}
          originalRoute={originalRoute}
          detourRoute={detourRoute}
          waypoints={results}
          selectedWaypointId={selectedWaypoint?.place.id ?? null}
          onWaypointSelect={(w) => {
            selectWaypoint(w);
            if (w.routes.original) setOriginalRoute(w.routes.original);
          }}
        />
      </div>

      {/* 상단 영역 */}
      <div
        className="absolute left-3 right-3 z-30"
        style={{ top: 'calc(env(safe-area-inset-top) + 12px)' }}
      >
        {phase === 'home' ? (
          <HomeSearchPill onClick={() => openSearch(null)} onGPS={handleUseCurrentLocation} />
        ) : phase === 'results' ? (
          <CompactRouteHeader
            startAddr={start?.address || ''}
            endAddr={end?.address || ''}
            onEdit={() => clearResults()}
          />
        ) : (
          <RouteSummaryCard
            start={{ address: start?.address ?? null }}
            end={{ address: end?.address ?? null }}
            onClearStart={handleClearStart}
            onClearEnd={handleClearEnd}
            onEditStart={() => openSearch('start')}
            onEditEnd={() => openSearch('end')}
            onSearchWaypoints={handleSearchWaypoints}
            isSearching={isLoading}
          />
        )}
      </div>

      {/* 우상단 설정 */}
      <Link
        href="/settings"
        aria-label="설정"
        className="absolute z-30 flex h-10 w-10 items-center justify-center rounded-full"
        style={{
          top: 'calc(env(safe-area-inset-top) + 12px)',
          right: phase === 'home' ? '12px' : 'auto',
          left: phase === 'home' ? 'auto' : '-9999px',
          background: 'var(--bg-surface)',
          color: 'var(--text-secondary)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        }}
      >
        <Settings className="h-4 w-4" />
      </Link>

      {/* 한쪽만 채워졌을 때 안내 시트 */}
      {phase === 'one-slot' && (
        <div
          className="absolute bottom-0 left-0 right-0 z-20 rounded-t-3xl px-5 pb-6 pt-3"
          style={{
            background: 'var(--bg-surface)',
            boxShadow: '0 -8px 24px rgba(0,0,0,0.08)',
            paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)',
          }}
        >
          <div className="mb-3 flex justify-center">
            <div className="h-1.5 w-9 rounded-full" style={{ background: 'var(--border-strong)' }} />
          </div>
          <p className="mb-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>
              {start ? '출발지' : '도착지'}가 설정됐어요.
            </strong>
            <br />
            이제 {start ? '도착지' : '출발지'}를 검색해주세요.
          </p>
          <button
            type="button"
            onClick={() => openSearch(start ? 'end' : 'start')}
            className="flex w-full items-center gap-2 rounded-xl px-4 py-3.5 text-left transition"
            style={{
              background: 'var(--bg-surface-muted)',
              border: '1px solid var(--border-soft)',
            }}
          >
            <Search className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
            <span
              className="flex-1 text-sm"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {start ? '도착지' : '출발지'} 검색
            </span>
          </button>
        </div>
      )}

      {/* 양쪽 채워진 상태 - 경로 정보 시트 */}
      {phase === 'both-slots' && (
        <div
          className="absolute bottom-0 left-0 right-0 z-20 rounded-t-3xl px-5 pt-3"
          style={{
            background: 'var(--bg-surface)',
            boxShadow: '0 -8px 24px rgba(0,0,0,0.08)',
            paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)',
          }}
        >
          <div className="mb-3 flex justify-center">
            <div className="h-1.5 w-9 rounded-full" style={{ background: 'var(--border-strong)' }} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {category} 경유지를 찾을 준비 완료
              </div>
              <div className="mt-1 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {start?.address} → {end?.address}
              </div>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleSwap}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-3 text-sm font-semibold"
              style={{
                background: 'var(--bg-surface-muted)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-soft)',
              }}
            >
              <ArrowLeftRight className="h-4 w-4" />
              출발↔도착
            </button>
            <button
              type="button"
              onClick={() => setCategoryPickerOpen(true)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-3 text-sm font-semibold"
              style={{
                background: 'var(--bg-surface-muted)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-soft)',
              }}
            >
              📌 {category}
            </button>
          </div>
        </div>
      )}

      {/* 결과 시트 */}
      {phase === 'results' && (
        <div
          className="absolute bottom-0 left-0 right-0 z-20 rounded-t-3xl"
          style={{
            background: 'var(--bg-surface)',
            boxShadow: '0 -8px 24px rgba(0,0,0,0.08)',
          }}
        >
          {isLoading && results.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div
                className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full"
                style={{
                  border: '3px solid var(--border-soft)',
                  borderTopColor: 'var(--accent)',
                }}
              />
              <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {category} 경유지를 찾고 있어요
              </div>
              <div className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                보통 2~3초 정도 걸려요
              </div>
              <button
                type="button"
                onClick={cancelSearch}
                className="mt-4 rounded-lg px-4 py-2 text-xs font-semibold"
                style={{ background: 'var(--bg-surface-muted)', color: 'var(--text-primary)' }}
              >
                ⏹ 취소
              </button>
            </div>
          ) : (
            <WaypointResultsSheet
              results={results}
              totalCandidates={totalCandidates}
              category={category}
              selectedId={selectedWaypoint?.place.id ?? null}
              onSelect={(r) => {
                selectWaypoint(r);
                if (r.routes.original) setOriginalRoute(r.routes.original);
              }}
              onChangeCategory={() => setCategoryPickerOpen(true)}
            />
          )}
        </div>
      )}

      {/* 검색 오버레이 */}
      <PlaceSearchOverlay
        open={searchOpen}
        onClose={() => {
          setSearchOpen(false);
          setSearchTarget(null);
        }}
        onSelect={handlePlaceSelected}
        onUseCurrentLocation={handleUseCurrentLocation}
        mapCenter={mapCenter}
        placeholder={
          searchTarget === 'start'
            ? '출발지 검색'
            : searchTarget === 'end'
              ? '도착지 검색'
              : '장소 또는 주소 검색'
        }
      />

      {/* 장소 상세 시트 (target=null로 검색해서 선택했을 때) */}
      <PlaceDetailSheet
        place={pendingPlace}
        onClose={() => setPendingPlace(null)}
        onSetAsStart={handleSetAsStart}
        onSetAsEnd={handleSetAsEnd}
      />

      {/* 카테고리 선택 시트 */}
      {categoryPickerOpen && (
        <CategoryPicker
          current={category}
          onPick={handleCategoryPicked}
          onClose={() => setCategoryPickerOpen(false)}
        />
      )}
    </main>
  );
}

function HomeSearchPill({
  onClick,
  onGPS,
}: {
  onClick: () => void;
  onGPS: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left"
      style={{
        background: 'var(--bg-surface)',
        boxShadow: '0 12px 24px rgba(0,0,0,0.08), 0 4px 8px rgba(0,0,0,0.04)',
      }}
    >
      <Search className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--text-secondary)' }} />
      <span className="flex-1 text-[15px]" style={{ color: 'var(--text-tertiary)' }}>
        장소 또는 주소 검색
      </span>
      <span
        role="button"
        tabIndex={0}
        aria-label="현재 위치"
        onClick={(e) => {
          e.stopPropagation();
          onGPS();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            onGPS();
          }
        }}
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
        style={{
          background: 'rgba(var(--color-accent-rgb), 0.1)',
          color: 'var(--accent)',
        }}
      >
        <LocateFixed className="h-4 w-4" />
      </span>
    </button>
  );
}

function CompactRouteHeader({
  startAddr,
  endAddr,
  onEdit,
}: {
  startAddr: string;
  endAddr: string;
  onEdit: () => void;
}) {
  return (
    <div
      className="flex items-center gap-2 rounded-xl px-3.5 py-2.5"
      style={{
        background: 'var(--bg-surface)',
        boxShadow: '0 12px 24px rgba(0,0,0,0.08)',
      }}
    >
      <span
        className="h-2 w-2 flex-shrink-0 rounded-full"
        style={{ background: 'var(--accent)' }}
      />
      <span
        className="truncate text-[13px] font-medium"
        style={{ color: 'var(--text-primary)' }}
      >
        {startAddr}
      </span>
      <span style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}>›</span>
      <span
        className="h-2 w-2 flex-shrink-0 rounded-full"
        style={{ background: 'var(--color-error-current, #ef4444)' }}
      />
      <span
        className="flex-1 truncate text-[13px] font-medium"
        style={{ color: 'var(--text-primary)' }}
      >
        {endAddr}
      </span>
      <button
        type="button"
        onClick={onEdit}
        className="flex-shrink-0 text-xs font-semibold"
        style={{ color: 'var(--accent)' }}
      >
        편집
      </button>
    </div>
  );
}
