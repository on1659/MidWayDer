'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { DetourResult } from '@/types/detour';
import { getBusinessStatus } from '@/lib/business-hours';

export interface FilterCounts {
  detour5: number;
  detour10: number;
  detour15: number;
  dist1km: number;
  dist2km: number;
  proxScore: number;
}

export interface UseFiltersReturn {
  openNowOnly: boolean;
  maxDetourMin: 5 | 10 | 15 | null;
  maxDetourKm: 1 | 2 | null;
  proxScoreOnly: boolean;
  unvisitedOnly: boolean;
  nameFilter: string;
  activePreset: 'quick' | 'now' | null;
  showFilterChips: boolean;
  setOpenNowOnly: (v: boolean) => void;
  setMaxDetourMin: (v: 5 | 10 | 15 | null) => void;
  setMaxDetourKm: (v: 1 | 2 | null) => void;
  setProxScoreOnly: (v: boolean) => void;
  setUnvisitedOnly: (v: boolean) => void;
  setNameFilter: (v: string) => void;
  setShowFilterChips: (v: boolean) => void;
  filteredResults: DetourResult[];
  filterCounts: FilterCounts;
  hasActiveFilter: boolean;
  applyPreset: (preset: 'quick' | 'now') => void;
  resetAllFilters: () => void;
}

export function useFilters(
  results: DetourResult[],
  visitedDates: Map<string, number>
): UseFiltersReturn {
  const [openNowOnly, setOpenNowOnly] = useState(false);
  const [maxDetourMin, setMaxDetourMin] = useState<5 | 10 | 15 | null>(null);
  const [maxDetourKm, setMaxDetourKm] = useState<1 | 2 | null>(null);
  const [proxScoreOnly, setProxScoreOnly] = useState(false);
  const [unvisitedOnly, setUnvisitedOnly] = useState(false);
  const [nameFilter, setNameFilter] = useState('');
  const [activePreset, setActivePreset] = useState<'quick' | 'now' | null>(null);
  const [showFilterChips, setShowFilterChips] = useState(false);

  // results 변경 시 필터 초기화
  useEffect(() => {
    setOpenNowOnly(false);
    setMaxDetourMin(null);
    setActivePreset(null);
    setNameFilter('');
  }, [results]);

  const filteredResults = useMemo(() => {
    let r = results;
    if (openNowOnly) {
      r = r.filter((x) => {
        if (!x.place.businessHours) return false;
        return getBusinessStatus(x.place.businessHours).isOpen;
      });
    }
    if (maxDetourMin !== null) {
      r = r.filter((x) => x.detourCost.duration <= maxDetourMin * 60);
    }
    if (maxDetourKm !== null) {
      r = r.filter((x) => x.detourCost.distance <= maxDetourKm * 1000);
    }
    if (proxScoreOnly) {
      r = r.filter((x) => (x.proximityScore ?? 0) >= 70);
    }
    if (unvisitedOnly) {
      r = r.filter((x) => !visitedDates.has(x.place.id));
    }
    if (nameFilter.trim()) {
      const q = nameFilter.trim().toLowerCase();
      r = r.filter((x) => x.place.name.toLowerCase().includes(q));
    }
    return r;
  }, [results, openNowOnly, maxDetourMin, maxDetourKm, proxScoreOnly, unvisitedOnly, nameFilter, visitedDates]);

  const applyPreset = useCallback((preset: 'quick' | 'now') => {
    setActivePreset((prev) => {
      if (prev === preset) {
        setOpenNowOnly(false);
        setMaxDetourMin(null);
        setMaxDetourKm(null);
        setProxScoreOnly(false);
        return null;
      }
      setOpenNowOnly(true);
      setMaxDetourMin(5);
      if (preset === 'now') {
        setMaxDetourKm(1);
        setProxScoreOnly(true);
      } else {
        setMaxDetourKm(null);
        setProxScoreOnly(false);
      }
      return preset;
    });
    setShowFilterChips(true);
  }, []);

  const resetAllFilters = useCallback(() => {
    setOpenNowOnly(false);
    setMaxDetourMin(null);
    setMaxDetourKm(null);
    setProxScoreOnly(false);
    setUnvisitedOnly(false);
    setNameFilter('');
    setActivePreset(null);
  }, []);

  const hasActiveFilter = openNowOnly || maxDetourMin !== null ||
    maxDetourKm !== null || proxScoreOnly || unvisitedOnly || nameFilter.trim() !== '';

  // 활성 필터 시 showFilterChips 자동 펼침
  useEffect(() => {
    if (hasActiveFilter) setShowFilterChips(true);
  }, [hasActiveFilter]);

  const filterCounts = useMemo((): FilterCounts => ({
    detour5: results.filter((x) => x.detourCost.duration <= 300).length,
    detour10: results.filter((x) => x.detourCost.duration <= 600).length,
    detour15: results.filter((x) => x.detourCost.duration <= 900).length,
    dist1km: results.filter((x) => x.detourCost.distance <= 1000).length,
    dist2km: results.filter((x) => x.detourCost.distance <= 2000).length,
    proxScore: results.filter((x) => (x.proximityScore ?? 0) >= 70).length,
  }), [results]);

  const handleSetProxScoreOnly = useCallback((v: boolean) => {
    setProxScoreOnly(v);
    if (activePreset) setActivePreset(null);
  }, [activePreset]);

  return {
    openNowOnly, setOpenNowOnly,
    maxDetourMin, setMaxDetourMin,
    maxDetourKm, setMaxDetourKm,
    proxScoreOnly, setProxScoreOnly: handleSetProxScoreOnly,
    unvisitedOnly, setUnvisitedOnly,
    nameFilter, setNameFilter,
    activePreset, showFilterChips, setShowFilterChips,
    filteredResults, filterCounts, hasActiveFilter,
    applyPreset, resetAllFilters,
  };
}
