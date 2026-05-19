'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRouteStore } from '@/store/route-store';
import { useSearchStore } from '@/store/search-store';
import { useToast } from '@/hooks/useToast';
import { addRecentSearch, getRecentSearches, type RecentSearch } from '@/lib/recent-searches';
import { saveSessionResults, loadSessionResults } from '@/lib/cache/session-results';
import { startTimer } from '@/lib/monitoring/performance';

type BottomSheetSnap = 'collapsed' | 'half' | 'full';

interface UseSearchParams {
  setBottomSheetSnap: React.Dispatch<React.SetStateAction<BottomSheetSnap>>;
  setRecentSearches: React.Dispatch<React.SetStateAction<RecentSearch[]>>;
  savedScrollRef: React.RefObject<number>;
}

interface UseSearchReturn {
  handleSearch: () => Promise<void>;
  handleInstantSearch: (item: RecentSearch) => Promise<void>;
  handleExpandRadius: () => Promise<void>;
  handleCategoryChange: (cat: string) => void;
  pendingCategoryToastRef: React.RefObject<string | null>;
}

export function useSearch({
  setBottomSheetSnap,
  setRecentSearches,
  savedScrollRef,
}: UseSearchParams): UseSearchReturn {
  const { start, end, setStart, setEnd, setOriginalRoute, selectWaypoint } = useRouteStore();
  const { category, results, isLoading, hasSearched, search, clearResults, restoreResults, setCategory } = useSearchStore();
  const { showToast } = useToast();

  const autoSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingCategoryToastRef = useRef<string | null>(null);
  const urlProcessed = useRef(false);

  // 세션 캐시 복원 (마운트 1회)
  useEffect(() => {
    const saved = loadSessionResults();
    if (!saved) return;
    setStart({ address: saved.startAddress, coordinates: saved.startCoords });
    setEnd({ address: saved.endAddress, coordinates: saved.endCoords });
    setCategory(saved.category);
    restoreResults(saved.results, saved.totalCandidates, saved.apiCallsUsed);
    setBottomSheetSnap('half');
    showToast('🕐 이전 검색 결과를 복원했어요', 'info');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // URL params 자동검색 (마운트 1회)
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
      setTimeout(() => {
        search(startLoc, endLoc, cat || category).then(() => setBottomSheetSnap('half'));
      }, 500);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 검색 결과 변경 시 sessionStorage에 저장
  useEffect(() => {
    if (results.length === 0 || !start?.address || !end?.address) return;
    saveSessionResults({
      results,
      startAddress: start.address,
      startCoords: start.coordinates,
      endAddress: end.address,
      endCoords: end.coordinates,
      category,
      totalCandidates: useSearchStore.getState().totalCandidates,
      apiCallsUsed: useSearchStore.getState().apiCallsUsed,
      savedAt: Date.now(),
    });
  }, [results]); // eslint-disable-line react-hooks/exhaustive-deps

  // 카테고리 전환 재검색 완료 → 토스트 알림
  useEffect(() => {
    if (pendingCategoryToastRef.current && !isLoading && results.length > 0) {
      showToast(`✨ ${pendingCategoryToastRef.current} ${results.length}개 새로 발견!`, 'success');
      pendingCategoryToastRef.current = null;
    }
  }, [results, isLoading, showToast]);

  const handleSearch = useCallback(async () => {
    const endTimer = startTimer('search_duration');
    if (!start?.address || !end?.address) {
      endTimer();
      return;
    }
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
    if (savedScrollRef.current !== undefined) savedScrollRef.current = 0;
    try {
      await search(
        { address: start.address, ...(start.coordinates ? { coordinates: start.coordinates } : {}) },
        { address: end.address, ...(end.coordinates ? { coordinates: end.coordinates } : {}) },
        category
      );
      setBottomSheetSnap('half');
    } finally {
      endTimer();
    }
  }, [start, end, category, clearResults, selectWaypoint, setOriginalRoute, search, setBottomSheetSnap, setRecentSearches, savedScrollRef]);

  const handleInstantSearch = useCallback(async (item: RecentSearch) => {
    setStart({ address: item.startAddress, coordinates: item.startCoords });
    setEnd({ address: item.endAddress, coordinates: item.endCoords });
    setCategory(item.category);
    addRecentSearch({
      startAddress: item.startAddress,
      endAddress: item.endAddress,
      startCoords: item.startCoords,
      endCoords: item.endCoords,
      category: item.category,
    });
    setRecentSearches(getRecentSearches());
    clearResults();
    selectWaypoint(null);
    setOriginalRoute(null);
    await search(
      { address: item.startAddress, ...(item.startCoords ? { coordinates: item.startCoords } : {}) },
      { address: item.endAddress, ...(item.endCoords ? { coordinates: item.endCoords } : {}) },
      item.category
    );
    setBottomSheetSnap('half');
  }, [setStart, setEnd, setCategory, clearResults, selectWaypoint, setOriginalRoute, search, setBottomSheetSnap, setRecentSearches]);

  const handleExpandRadius = useCallback(async () => {
    if (!start?.address || !end?.address) return;
    await search(
      { address: start.address, ...(start.coordinates ? { coordinates: start.coordinates } : {}) },
      { address: end.address, ...(end.coordinates ? { coordinates: end.coordinates } : {}) },
      category,
      { bufferDistance: 2000 }
    );
    setBottomSheetSnap('half');
  }, [start, end, category, search, setBottomSheetSnap]);

  const handleCategoryChange = useCallback((cat: string) => {
    setCategory(cat);
    if (!hasSearched || !start?.address || !end?.address || isLoading) return;
    if (autoSearchTimerRef.current) clearTimeout(autoSearchTimerRef.current);
    pendingCategoryToastRef.current = cat;
    autoSearchTimerRef.current = setTimeout(async () => {
      clearResults();
      selectWaypoint(null);
      setOriginalRoute(null);
      await search(
        { address: start.address, ...(start.coordinates ? { coordinates: start.coordinates } : {}) },
        { address: end.address, ...(end.coordinates ? { coordinates: end.coordinates } : {}) },
        cat
      );
      setBottomSheetSnap('half');
    }, 800);
  }, [hasSearched, start, end, isLoading, setCategory, clearResults, selectWaypoint, setOriginalRoute, search, setBottomSheetSnap]);

  return { handleSearch, handleInstantSearch, handleExpandRadius, handleCategoryChange, pendingCategoryToastRef };
}
