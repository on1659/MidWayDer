'use client';

import { createContext, useContext } from 'react';
import type { DetourResult } from '@/types/detour';
import type { NavApp } from '@/lib/navigation-links';

export interface ResultListContextValue {
  // 핵심 데이터
  results: DetourResult[];
  filteredResults: DetourResult[];
  currentCategory: string;
  sortBy: 'score' | 'distance' | 'duration' | 'closing' | undefined;

  // 카드 상태
  pinnedIds: Set<string>;
  favPlaces: Set<string>;
  visitedDates: Map<string, number>;
  memoMap: Map<string, string>;
  popularityMap: Record<string, number>;
  copiedId: string | null;
  sharedId: string | null;
  scoreDetailOpenId: string | null;
  overflowMenuId: string | null;
  expandedCompactId: string | null;
  editingMemoId: string | null;
  editingMemoText: string;

  // ETA 관련
  departureTime: string;
  departureMs: number;
  dwellMinutes: number;
  nowMs: number;
  isNowDeparture: boolean;

  // 뷰 설정
  isCompact: boolean;
  isGrouped: boolean;

  // 위치 + 범위 데이터
  currentLocation: { lat: number; lng: number } | null;
  closestPlaceId: string | null;
  detourRange: number;
  maxDetourDuration: number;
  minDetourDuration: number;

  // 네비
  preferredNavApp: NavApp | null;
  routeHash: string;

  // 콜백
  onTogglePin: (e: React.MouseEvent, result: DetourResult) => void;
  onToggleFav: (e: React.MouseEvent, result: DetourResult) => void;
  onVisitToggle: (e: React.MouseEvent, result: DetourResult) => void;
  onSelect: (result: DetourResult, rank: number) => void;
  onCopyAddress: (e: React.MouseEvent, result: DetourResult) => void;
  onShare: (e: React.MouseEvent, result: DetourResult) => void;
  onEditMemo: (e: React.MouseEvent, placeId: string) => void;
  onSaveMemo: (e: React.MouseEvent, placeId: string) => void;
  onCancelMemo: (e: React.MouseEvent) => void;
  setEditingMemoText: (text: string) => void;
  onSetScoreDetail: (id: string | null) => void;
  onSetOverflowMenu: (id: string | null) => void;
  onSetExpandedCompact: (id: string | null) => void;
  onOpenNavi: (e: React.MouseEvent, place: DetourResult['place']) => void;
  onOpenNaviSheet: (e: React.MouseEvent, place: DetourResult['place']) => void;
  triggerNav: (place: DetourResult['place']) => void;
  nameFilter: string;
}

export const ResultListContext = createContext<ResultListContextValue | null>(null);

export function useResultList(): ResultListContextValue {
  const ctx = useContext(ResultListContext);
  if (!ctx) throw new Error('useResultList must be used within ResultListContext.Provider');
  return ctx;
}
