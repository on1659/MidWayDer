'use client';

/**
 * Desktop Side Panel - 데스크톱 검색/결과 패널 (md+ only)
 * page.tsx에서 분리된 440px 고정 좌측 패널
 */

import { useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Share2, X, Sun, Moon, Star, ArrowUpDown } from 'lucide-react';
import AddressInput from '@/components/search/AddressInput';
import CategorySelect from '@/components/search/CategorySelect';
import ResultList from '@/components/search/ResultList';
import FavoritesList from '@/components/search/FavoritesList';
import RouteTypeFilter from '@/components/search/RouteTypeFilter';
import SortFilter from '@/components/search/SortFilter';
import MultiStopSelector from '@/components/search/MultiStopSelector';
import RoutineBanner from '@/components/search/RoutineBanner';
import { useRouteStore } from '@/store/route-store';
import { useSearchStore } from '@/store/search-store';
import { addRecentSearch, getRecentSearches, removeRecentSearch, clearAllRecentSearches, type RecentSearch } from '@/lib/recent-searches';
import { recordLocationVisit } from '@/lib/smart-location';
import { useToast } from '@/hooks/useToast';
import { useSortFilter } from '@/app/hooks/useSortFilter';
import type { DetourResult } from '@/types/detour';

const RoutePreview = dynamic(() => import('@/components/search/RoutePreview'));

interface DesktopSidePanelProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  recentSearches: RecentSearch[];
  setRecentSearches: React.Dispatch<React.SetStateAction<RecentSearch[]>>;
  onOpenSaveDialog: () => void;
  onStartCompare: (items: DetourResult[]) => void;
}

export default function DesktopSidePanel({
  theme,
  toggleTheme,
  recentSearches,
  setRecentSearches,
  onOpenSaveDialog,
  onStartCompare,
}: DesktopSidePanelProps) {
  const { start, end, originalRoute, selectedWaypoint, setStart, setEnd, setOriginalRoute, selectWaypoint } = useRouteStore();
  const { category, results, isLoading, error, totalCandidates, hasSearched, isCached, setCategory, search, clearResults, cancelSearch } = useSearchStore();
  const { showToast } = useToast();
  const { routeTypeFilter, setRouteTypeFilter, sortBy, setSortBy, filteredResults, routeTypeCounts } = useSortFilter(results);

  const previewRoute = null; // TODO: integrate with useMapState if needed

  const mapCenter = start?.coordinates || { lat: 37.5665, lng: 126.978 };
  const canSearch = !!(start?.address && end?.address);

  const handleStartChange = useCallback((address: string) => setStart({ address }), [setStart]);
  const handleEndChange = useCallback((address: string) => setEnd({ address }), [setEnd]);
  const handleStartSelect = useCallback((result: { address: string; coordinates: { lat: number; lng: number } }) => {
    setStart({ address: result.address, coordinates: result.coordinates });
    recordLocationVisit(result.address, result.coordinates);
  }, [setStart]);
  const handleEndSelect = useCallback((result: { address: string; coordinates: { lat: number; lng: number } }) => {
    setEnd({ address: result.address, coordinates: result.coordinates });
  }, [setEnd]);
  const handleSwap = useCallback(() => {
    const tmp = start;
    setStart(end);
    setEnd(tmp);
  }, [start, end, setStart, setEnd]);
  const handleRoutineApply = useCallback((startAddr: string, startCoords: { lat: number; lng: number }, endAddr: string, endCoords: { lat: number; lng: number }) => {
    setStart({ address: startAddr, coordinates: startCoords });
    setEnd({ address: endAddr, coordinates: endCoords });
  }, [setStart, setEnd]);
  const handleCategoryChange = useCallback((cat: string) => {
    setCategory(cat);
    if (hasSearched && start?.address && end?.address && !isLoading) {
      clearResults();
      selectWaypoint(null);
      setOriginalRoute(null);
      search(
        { address: start.address, ...(start.coordinates ? { coordinates: start.coordinates } : {}) },
        { address: end.address, ...(end.coordinates ? { coordinates: end.coordinates } : {}) },
        cat
      );
    }
  }, [hasSearched, start, end, isLoading, setCategory, clearResults, selectWaypoint, setOriginalRoute, search]);
  const handleSearch = useCallback(async () => {
    if (!start?.address || !end?.address) return;
    addRecentSearch({ startAddress: start.address, endAddress: end.address, startCoords: start.coordinates, endCoords: end.coordinates, category });
    setRecentSearches(getRecentSearches());
    clearResults();
    selectWaypoint(null);
    setOriginalRoute(null);
    await search({ address: start.address }, { address: end.address }, category);
  }, [start, end, category, clearResults, selectWaypoint, setOriginalRoute, search, setRecentSearches]);
  const handleWaypointSelect = useCallback((waypoint: typeof results[0]) => {
    selectWaypoint(waypoint);
    if (waypoint.routes.original) setOriginalRoute(waypoint.routes.original);
  }, [selectWaypoint, setOriginalRoute]);
  const handleShare = useCallback(async () => {
    if (!start?.address || !end?.address) return;
    const { generateShareUrl, shareUrl } = await import('@/lib/share');
    const url = generateShareUrl({ start: start.address, end: end.address, category });
    const success = await shareUrl({ url, title: '미드웨이더 - 경유지 검색', text: `${start.address} → ${end.address} 경로의 ${category} 경유지를 찾아봤어요!` });
    if (success && !navigator.share) showToast('링크가 복사되었습니다! 📋', 'success');
  }, [start, end, category, showToast]);
  const handleInstantSearch = useCallback(async (item: RecentSearch) => {
    setStart({ address: item.startAddress, coordinates: item.startCoords });
    setEnd({ address: item.endAddress, coordinates: item.endCoords });
    setCategory(item.category);
    addRecentSearch({ startAddress: item.startAddress, endAddress: item.endAddress, startCoords: item.startCoords, endCoords: item.endCoords, category: item.category });
    setRecentSearches(getRecentSearches());
    clearResults();
    selectWaypoint(null);
    setOriginalRoute(null);
    await search(
      { address: item.startAddress, ...(item.startCoords ? { coordinates: item.startCoords } : {}) },
      { address: item.endAddress, ...(item.endCoords ? { coordinates: item.endCoords } : {}) },
      item.category
    );
  }, [setStart, setEnd, setCategory, clearResults, selectWaypoint, setOriginalRoute, search, setRecentSearches]);

  return (
    <aside className="hidden md:flex md:w-[420px] md:shrink-0 flex-col bg-white border-r border-gray-100 z-10">
      <header className="px-6 pt-6 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-strong)' }}>🗺️ MidWayDer</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>가는 길에 어디 들를까?</p>
          </div>
          <button onClick={toggleTheme} aria-label="테마 변경" className="w-9 h-9 rounded-full flex items-center justify-center transition-colors" style={{ background: 'var(--bg-surface-muted)', color: 'var(--text-muted)' }}>
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
          <AddressInput label="" value={start?.address || ''} onChange={handleStartChange} onSelect={handleStartSelect} placeholder="출발하는 곳" mapCenter={mapCenter} testId="origin-input" />
        </div>
        <div className="flex justify-center -my-1">
          <button onClick={handleSwap} disabled={!start?.address && !end?.address} className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:bg-blue-50 active:scale-95 active:rotate-180 disabled:opacity-30 disabled:cursor-not-allowed" style={{ border: '1px solid var(--border-soft)' }} title="출발지↔도착지 바꾸기">
            <ArrowUpDown className="w-5 h-5 transition-transform duration-300" style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: 'var(--pink-500)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--text-strong)' }}>도착</span>
          </div>
          <AddressInput label="" value={end?.address || ''} onChange={handleEndChange} onSelect={handleEndSelect} placeholder="가고 싶은 곳" mapCenter={mapCenter} testId="destination-input" />
        </div>
        <div className="space-y-2">
          <span className="text-sm font-semibold" style={{ color: 'var(--text-strong)' }}>어디 들를까?</span>
          <CategorySelect selected={category} onChange={handleCategoryChange} />
        </div>
        {/* previewRoute is always null; RoutePreview rendered via useMapState when available */}
        <button data-testid="search-route-btn" onClick={handleSearch} disabled={isLoading || !canSearch} className="w-full py-3.5 text-white rounded-2xl font-bold text-base active:scale-[0.97] disabled:bg-gray-200 disabled:text-gray-400 transition-all shadow-md" style={{ background: isLoading || !canSearch ? undefined : 'var(--accent)' }}>
          {isLoading ? '찾는 중...' : '경유지 찾기 🔍'}
        </button>
        {!results.length && !isLoading && (
          <div>
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>빠른 선택</p>
            <div className="flex flex-wrap gap-2">
              {[{ emoji: '☕', label: '카페' }, { emoji: '🏪', label: '편의점' }, { emoji: '🛒', label: '다이소' }, { emoji: '💄', label: '올리브영' }, { emoji: '⭐', label: '스타벅스' }].map((item) => (
                <button key={item.label} onClick={() => setCategory(item.label)} className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-all active:scale-95 ${category === item.label ? 'ring-2' : ''}`} style={{ background: category === item.label ? 'var(--accent)' : 'var(--blue-150)', color: category === item.label ? 'white' : 'var(--blue-700)' }}>
                  <span className="text-base">{item.emoji}</span>{item.label}
                </button>
              ))}
            </div>
          </div>
        )}
        {results.length > 0 && (
          <>
            {originalRoute && (
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>기본 경로{' '}<span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{(originalRoute.distance / 1000).toFixed(1)}km · {Math.round(originalRoute.duration / 60)}분</span></p>
                {isCached && <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: 'var(--blue-100)', color: 'var(--blue-600)' }}>⚡ 캐시</span>}
              </div>
            )}
            <div className="flex items-center justify-between">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{totalCandidates}개 중 {results.length}개 추천</p>
              <div className="flex items-center gap-2">
                <button onClick={onOpenSaveDialog} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors hover:bg-gray-50" style={{ color: 'var(--accent)' }}><Star className="w-3.5 h-3.5" />저장</button>
                <button onClick={handleShare} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors hover:bg-gray-50" style={{ color: 'var(--accent)' }}><Share2 className="w-3.5 h-3.5" />공유</button>
                <button onClick={() => { if (filteredResults.length < 2) { showToast('비교할 경유지가 2개 이상 있어야 해요', 'info'); return; } onStartCompare(filteredResults.slice(0, 3)); }} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors hover:bg-gray-50" style={{ color: 'var(--green-600)' }}>⚖️ 비교</button>
              </div>
            </div>
            <RouteTypeFilter selected={routeTypeFilter} onChange={setRouteTypeFilter} counts={routeTypeCounts} />
            <div className="pt-2"><SortFilter selected={sortBy} onChange={setSortBy} /></div>
          </>
        )}
      </div>

      <div data-testid="route-result-panel" className="flex-1 overflow-y-auto px-5 py-4 scrollbar-hide">
        {results.length === 0 && !isLoading && !error && (
          <>
            <RoutineBanner onApply={handleRoutineApply} />
            <FavoritesList onSelect={(fav) => { setStart({ address: fav.startAddress, coordinates: fav.startCoords }); setEnd({ address: fav.endAddress, coordinates: fav.endCoords }); setCategory(fav.category); }} />
            {recentSearches.length > 0 && (
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>최근 검색</p>
                  <button onClick={() => { if (confirm(`${recentSearches.length}개의 최근 검색 기록을 모두 삭제하시겠어요?`)) { clearAllRecentSearches(); setRecentSearches([]); showToast(`${recentSearches.length}개 검색 기록 삭제됨`, 'success'); } }} className="text-xs px-2 py-1 rounded-lg transition-colors hover:bg-gray-100" style={{ color: 'var(--text-muted)' }}>전체 삭제</button>
                </div>
                <div className="space-y-2">
                  {recentSearches.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                      <button className="flex-1 text-left min-w-0" onClick={() => { setStart({ address: item.startAddress, coordinates: item.startCoords }); setEnd({ address: item.endAddress, coordinates: item.endCoords }); setCategory(item.category); }}>
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-strong)' }}>{item.startAddress} → {item.endAddress}</p>
                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{item.category}</p>
                      </button>
                      <button onClick={() => handleInstantSearch(item)} className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12px] font-bold transition-all active:scale-95" style={{ background: 'var(--accent)', color: 'white' }} title="바로 검색">▶</button>
                      <button onClick={() => { removeRecentSearch(item.id); setRecentSearches(getRecentSearches()); }} className="shrink-0 p-2 rounded-full hover:bg-gray-200 transition-colors"><X className="w-4 h-4" style={{ color: 'var(--text-muted)' }} /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        {results.length >= 2 && start?.coordinates && end?.coordinates && (
          <MultiStopSelector start={start.coordinates} end={end.coordinates} waypoints={results.map((r) => ({ id: r.place.id, name: r.place.name, address: r.place.address, coordinates: r.place.coordinates, detourDistance: r.detourCost.distance, detourDuration: r.detourCost.duration }))} onOptimize={(ids) => { console.log('Optimized:', ids); showToast(`${ids.length}개 경유지 최적 경로 완성! 🎉`, 'success'); }} />
        )}
        <ResultList
          results={filteredResults} selectedId={selectedWaypoint?.place.id || null}
          isLoading={isLoading} error={error} hasSearched={hasSearched}
          currentCategory={category} onSelect={handleWaypointSelect}
          onCategoryChange={(cat) => { setCategory(cat); if (start?.address && end?.address) search({ address: start.address }, { address: end.address }, cat); }}
          onRetry={() => { if (start?.address && end?.address) search({ address: start.address }, { address: end.address }, category); }}
          onSaveRoute={onOpenSaveDialog} onExpandRadius={async () => { if (start?.address && end?.address) await search({ address: start.address, ...(start.coordinates ? { coordinates: start.coordinates } : {}) }, { address: end.address, ...(end.coordinates ? { coordinates: end.coordinates } : {}) }, category, { bufferDistance: 2000 }); }}
          onCancel={cancelSearch} sortBy={sortBy} onHoverResult={() => {}}
        />
      </div>
    </aside>
  );
}
