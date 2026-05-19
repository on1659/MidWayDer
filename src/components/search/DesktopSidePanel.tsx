'use client';

/**
 * Desktop Side Panel - 데스크톱 검색/결과 패널 (md+ only)
 * page.tsx에서 분리된 380px 고정 좌측 패널
 */

import { useCallback } from 'react';
import { Share2, X, Sun, Moon, Star, ArrowUpDown, Search } from 'lucide-react';
import { LanguageSelector } from '@/components/ui/LanguageSelector';
import AddressInput from '@/components/search/AddressInput';
import ResultList from '@/components/search/ResultList';
import RouteTypeFilter from '@/components/search/RouteTypeFilter';
import SortFilter from '@/components/search/SortFilter';
import { useRouteStore } from '@/store/route-store';
import { useSearchStore } from '@/store/search-store';
import { addRecentSearch, getRecentSearches, removeRecentSearch, clearAllRecentSearches, type RecentSearch } from '@/lib/recent-searches';
import { recordLocationVisit } from '@/lib/smart-location';
import { useToast } from '@/hooks/useToast';
import { useSortFilter } from '@/app/hooks/useSortFilter';

const SIMPLE_CATEGORIES = ['카페', '편의점', '다이소', '올리브영', '스타벅스'];

interface DesktopSidePanelProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  recentSearches: RecentSearch[];
  setRecentSearches: React.Dispatch<React.SetStateAction<RecentSearch[]>>;
  onOpenSaveDialog: () => void;
}

export default function DesktopSidePanel({
  theme,
  toggleTheme,
  recentSearches,
  setRecentSearches,
  onOpenSaveDialog,
}: DesktopSidePanelProps) {
  const { start, end, originalRoute, selectedWaypoint, setStart, setEnd, setOriginalRoute, selectWaypoint } = useRouteStore();
  const { category, results, isLoading, error, totalCandidates, hasSearched, isCached, setCategory, search, clearResults, cancelSearch } = useSearchStore();
  const { showToast } = useToast();
  const { routeTypeFilter, setRouteTypeFilter, sortBy, setSortBy, filteredResults, routeTypeCounts } = useSortFilter(results);

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
    await search(
      { address: start.address, ...(start.coordinates ? { coordinates: start.coordinates } : {}) },
      { address: end.address, ...(end.coordinates ? { coordinates: end.coordinates } : {}) },
      category
    );
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
    <aside
      className="hidden md:flex md:w-[360px] md:shrink-0 flex-col z-10"
      style={{
        background: 'var(--surface-1)',
        borderRight: '1px solid var(--border-soft)'
      }}
    >
      <header className="px-4 pt-4 pb-3" style={{ borderBottom: '1px solid var(--border-soft)' }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold tracking-tight" style={{ color: 'var(--text-strong)' }}>MidWayDer</h1>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>가는 길에 어디 들를까?</p>
          </div>
          <button onClick={toggleTheme} aria-label="테마 변경" className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors" style={{ background: 'var(--bg-surface-muted)', color: 'var(--text-muted)', border: '1px solid var(--border-soft)' }}>
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <LanguageSelector />
        </div>
      </header>

      <div className="px-4 py-4 space-y-3" style={{ borderBottom: '1px solid var(--border-soft)' }}>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--accent)' }} />
              <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>출발</span>
            </div>
            <AddressInput density="compact" label="" value={start?.address || ''} onChange={handleStartChange} onSelect={handleStartSelect} placeholder="출발하는 곳" mapCenter={mapCenter} testId="origin-input" />
          </div>
          <div className="flex justify-center -my-1">
            <button onClick={handleSwap} disabled={!start?.address && !end?.address} className="w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-95 active:rotate-180 disabled:opacity-30 disabled:cursor-not-allowed" style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-soft)' }} title="출발지↔도착지 바꾸기">
              <ArrowUpDown className="w-4 h-4 transition-transform duration-300" style={{ color: 'var(--text-muted)' }} />
            </button>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--success)' }} />
              <span className="text-xs font-semibold" style={{ color: 'var(--text-strong)' }}>도착</span>
            </div>
            <AddressInput density="compact" label="" value={end?.address || ''} onChange={handleEndChange} onSelect={handleEndSelect} placeholder="가고 싶은 곳" mapCenter={mapCenter} testId="destination-input" />
          </div>
        </div>
        <div className="space-y-2">
          <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>들를 곳</span>
          <div className="flex flex-wrap gap-2">
            {SIMPLE_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => handleCategoryChange(cat)}
                aria-pressed={category === cat}
                className="min-h-9 rounded-full px-3 text-sm font-semibold transition-all active:scale-95"
                style={{
                  background: category === cat ? 'var(--accent)' : 'var(--bg-surface-muted)',
                  color: category === cat ? 'var(--text-on-accent)' : 'var(--text-secondary)',
                  border: `1px solid ${category === cat ? 'var(--accent)' : 'var(--border-soft)'}`,
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        <button
          data-testid="search-route-btn"
          onClick={handleSearch}
          disabled={isLoading || !canSearch}
          className="w-full py-3 rounded-xl font-bold text-sm active:scale-[0.97] disabled:cursor-not-allowed transition-all"
          style={{
            background: isLoading || !canSearch ? 'var(--bg-surface-muted)' : 'var(--accent)',
            color: isLoading || !canSearch ? 'var(--text-secondary)' : 'var(--text-on-accent)',
            border: `1px solid ${isLoading || !canSearch ? 'var(--border-soft)' : 'var(--accent)'}`,
            boxShadow: isLoading || !canSearch ? 'none' : 'var(--shadow-3)',
          }}
        >
          {isLoading ? '찾는 중...' : '경유지 찾기'}
        </button>
        {results.length > 0 && (
          <>
            {originalRoute && (
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>기본 경로{' '}<span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{(originalRoute.distance / 1000).toFixed(1)}km · {Math.round(originalRoute.duration / 60)}분</span></p>
                {isCached && <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: 'var(--overlay-selected)', color: 'var(--accent)' }}>⚡ 캐시</span>}
              </div>
            )}
            <div className="flex items-center justify-between">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{totalCandidates}개 중 {results.length}개 추천</p>
              <div className="flex items-center gap-2">
                <button onClick={onOpenSaveDialog} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors hover:opacity-80" style={{ color: 'var(--accent)', background: 'var(--bg-surface-muted)' }}><Star className="w-3.5 h-3.5" />저장</button>
                <button onClick={handleShare} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors hover:opacity-80" style={{ color: 'var(--accent)', background: 'var(--bg-surface-muted)' }}><Share2 className="w-3.5 h-3.5" />공유</button>
	              </div>
	            </div>
            <RouteTypeFilter selected={routeTypeFilter} onChange={setRouteTypeFilter} counts={routeTypeCounts} />
            <div className="pt-2"><SortFilter selected={sortBy} onChange={setSortBy} /></div>
          </>
        )}
      </div>

      <div data-testid="route-result-panel" className="flex-1 overflow-y-auto px-4 py-4 scrollbar-hide">
        {results.length === 0 && !isLoading && !error && (
          <>
            {recentSearches.length > 0 && (
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>최근 검색</p>
                  <button onClick={() => { if (confirm(`${recentSearches.length}개의 최근 검색 기록을 모두 삭제하시겠어요?`)) { clearAllRecentSearches(); setRecentSearches([]); showToast(`${recentSearches.length}개 검색 기록 삭제됨`, 'success'); } }} className="text-xs px-2 py-1 rounded-lg transition-colors hover:opacity-80" style={{ color: 'var(--text-muted)', background: 'var(--bg-surface-muted)' }}>전체 삭제</button>
                </div>
                <div className="space-y-2">
                  {recentSearches.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 p-3 rounded-xl transition-colors" style={{ background: 'var(--bg-surface-muted)' }}>
                      <button className="flex-1 text-left min-w-0" onClick={() => { setStart({ address: item.startAddress, coordinates: item.startCoords }); setEnd({ address: item.endAddress, coordinates: item.endCoords }); setCategory(item.category); }}>
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-strong)' }}>{item.startAddress} → {item.endAddress}</p>
                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{item.category}</p>
                      </button>
                      <button onClick={() => handleInstantSearch(item)} className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12px] font-bold transition-all active:scale-95" style={{ background: 'var(--accent)', color: 'var(--text-on-accent)' }} title="바로 검색">▶</button>
                      <button onClick={() => { removeRecentSearch(item.id); setRecentSearches(getRecentSearches()); }} className="shrink-0 p-2 rounded-full hover:opacity-80 transition-colors" style={{ background: 'var(--surface-1)' }}><X className="w-4 h-4" style={{ color: 'var(--text-muted)' }} /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {recentSearches.length === 0 && (
              <div className="flex min-h-[220px] flex-col items-center justify-center px-5 py-8 text-center" style={{ color: 'var(--text-muted)' }}>
                <Search className="mb-4 h-8 w-8" style={{ color: 'var(--accent)' }} />
                <h2 className="text-base font-semibold" style={{ color: 'var(--text-strong)' }}>경로를 입력하세요</h2>
                <p className="mt-2 text-sm leading-relaxed">
                  출발지와 도착지를 고르고, 들를 곳을 하나 선택하면 지도 위에 결과를 보여드릴게요.
                </p>
              </div>
            )}
          </>
        )}
        {(hasSearched || isLoading || error) && (
          <ResultList
	            results={filteredResults} selectedId={selectedWaypoint?.place.id || null}
	            isLoading={isLoading} error={error} hasSearched={hasSearched}
	            currentCategory={category} onSelect={handleWaypointSelect}
	            onCategoryChange={(cat) => { setCategory(cat); if (start?.address && end?.address) search({ address: start.address, ...(start.coordinates ? { coordinates: start.coordinates } : {}) }, { address: end.address, ...(end.coordinates ? { coordinates: end.coordinates } : {}) }, cat); }}
	            onRetry={() => { if (start?.address && end?.address) search({ address: start.address, ...(start.coordinates ? { coordinates: start.coordinates } : {}) }, { address: end.address, ...(end.coordinates ? { coordinates: end.coordinates } : {}) }, category); }}
	            onSaveRoute={onOpenSaveDialog} onExpandRadius={async () => { if (start?.address && end?.address) await search({ address: start.address, ...(start.coordinates ? { coordinates: start.coordinates } : {}) }, { address: end.address, ...(end.coordinates ? { coordinates: end.coordinates } : {}) }, category, { bufferDistance: 2000 }); }}
	            onCancel={cancelSearch} sortBy={sortBy} onHoverResult={() => {}}
	          />
	        )}
      </div>
    </aside>
  );
}
