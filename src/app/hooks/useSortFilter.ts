'use client';

import { useState, useEffect, useMemo } from 'react';
import type { DetourResult } from '@/types/detour';
import { getMinutesUntilClose, getBusinessStatus } from '@/lib/business-hours';

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

  // sortBy localStorage 복원
  useEffect(() => {
    try {
      const saved = localStorage.getItem('sort-by') as SortBy | null;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved && ['score', 'distance', 'duration', 'closing'].includes(saved)) setSortBy(saved);
    } catch { /* ignore */ }
  }, []);

  // sortBy 변경 시 localStorage 저장
  useEffect(() => {
    try { localStorage.setItem('sort-by', sortBy); } catch { /* ignore */ }
  }, [sortBy]);

  const { filteredResults, routeTypeCounts } = useMemo(() => {
    const counts = {
      all: results.length,
      shortest: results.filter((r) => r.routeType === 'shortest').length,
      fastest: results.filter((r) => r.routeType === 'fastest').length,
    };

    const filtered =
      routeTypeFilter === 'all'
        ? results
        : results.filter((r) => r.routeType === routeTypeFilter);

    const sorted = [...filtered].sort((a, b) => {
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
  }, [results, routeTypeFilter, sortBy]);

  return { routeTypeFilter, setRouteTypeFilter, sortBy, setSortBy, filteredResults, routeTypeCounts };
}
