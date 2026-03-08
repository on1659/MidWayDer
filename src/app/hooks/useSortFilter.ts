'use client';

import { useState, useEffect, useMemo } from 'react';
import type { DetourResult } from '@/types/detour';
import { getMinutesUntilClose, getBusinessStatus } from '@/lib/business-hours';
import { useSearchStore } from '@/store/search-store';

type SortBy = 'score' | 'distance' | 'duration' | 'closing';

interface UseSortFilterReturn {
  routeTypeFilter: 'all' | 'shortest' | 'fastest';
  setRouteTypeFilter: React.Dispatch<React.SetStateAction<'all' | 'shortest' | 'fastest'>>;
  sortBy: SortBy;
  setSortBy: React.Dispatch<React.SetStateAction<SortBy>>;
  filteredResults: DetourResult[];
  routeTypeCounts: { all: number; shortest: number; fastest: number };
}

export function useSortFilter(results: DetourResult[]): UseSortFilterReturn {
  const [routeTypeFilter, setRouteTypeFilter] = useState<'all' | 'shortest' | 'fastest'>('all');
  const [sortBy, setSortBy] = useState<SortBy>('score');
  const { filters } = useSearchStore();

  // sortBy localStorage 복원
  useEffect(() => {
    try {
      const saved = localStorage.getItem('sort-by') as SortBy | null;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved && ['score', 'distance', 'duration', 'closing'].includes(saved)) setSortBy(saved);
    } catch {
      // localStorage 접근 불가 시 무시 (Private 모드, 저장 공간 부족 등)
    }
  }, []);

  // sortBy 변경 시 localStorage 저장
  useEffect(() => {
    try { localStorage.setItem('sort-by', sortBy); } catch {
      // localStorage 접근 불가 시 무시 (Private 모드, 저장 공간 부족 등)
    }
  }, [sortBy]);

  const { filteredResults, routeTypeCounts } = useMemo(() => {
    // 1. 거리 필터 적용 (v0.61.0)
    const distanceFiltered = filters.maxDetourDistance
      ? results.filter((r) => r.detourCost.distance <= (filters.maxDetourDistance ?? Infinity))
      : results;

    // 2. 경로 타입 필터 적용
    const counts = {
      all: distanceFiltered.length,
      shortest: distanceFiltered.filter((r) => r.routeType === 'shortest').length,
      fastest: distanceFiltered.filter((r) => r.routeType === 'fastest').length,
    };

    const routeTypeFiltered =
      routeTypeFilter === 'all'
        ? distanceFiltered
        : distanceFiltered.filter((r) => r.routeType === routeTypeFilter);

    // 3. 정렬 적용
    const sorted = [...routeTypeFiltered].sort((a, b) => {
      switch (sortBy) {
        case 'distance':
          return a.detourCost.distance - b.detourCost.distance;
        case 'duration':
          return a.detourCost.duration - b.detourCost.duration;
        case 'closing': {
          const getMins = (r: DetourResult) => {
            if (!r.place.businessHours) return 9999;
            const status = getBusinessStatus(r.place.businessHours);
            if (status.label === '24시간 영업') return -1;
            const mins = getMinutesUntilClose(r.place.businessHours);
            if (mins !== null) return mins;
            return status.isOpen ? 9999 : 8888;
          };
          return getMins(a) - getMins(b);
        }
        case 'score':
        default:
          return b.finalScore - a.finalScore;
      }
    });

    return { filteredResults: sorted, routeTypeCounts: counts };
  }, [results, routeTypeFilter, sortBy, filters.maxDetourDistance]);

  return { routeTypeFilter, setRouteTypeFilter, sortBy, setSortBy, filteredResults, routeTypeCounts };
}
