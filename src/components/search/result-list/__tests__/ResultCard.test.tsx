// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import type { DetourResult } from '@/types/detour';
import type { ResultListContextValue } from '../ResultListContext';
import { ResultListContext } from '../ResultListContext';

// ── Mock 외부 의존성 ─────────────────────────────────────────────
vi.mock('@/lib/smart-summary', () => ({
  getSmartOneLiner: vi.fn().mockReturnValue(null),
}));
vi.mock('@/lib/visit-tracking', () => ({
  getVisitCount: vi.fn().mockReturnValue(0),
  recordVisit: vi.fn(),
  getVisitHistory: vi.fn().mockReturnValue([]),
}));
vi.mock('@/lib/recommendation-badges', () => ({
  getRecommendationBadges: vi.fn().mockReturnValue([]),
  getBadgeColor: vi.fn().mockReturnValue(''),
}));
vi.mock('@/lib/business-hours', () => ({
  getBusinessStatus: vi.fn().mockReturnValue({ isOpen: true, label: '영업 중' }),
  getMinutesUntilClose: vi.fn().mockReturnValue(null),
  getMinutesUntilOpen: vi.fn().mockReturnValue(null),
  getBusinessHoursRange: vi.fn().mockReturnValue(null),
}));
vi.mock('@/lib/category-icons', () => ({
  getCategoryIcon: vi.fn().mockReturnValue('🏪'),
}));

// ── Helper Factories ─────────────────────────────────────────────

function makeResult(overrides: Partial<DetourResult> = {}): DetourResult {
  const { place: placeOverride, ...restOverrides } = overrides;
  const basePlace = {
    id: 'place-1',
    name: '테스트 편의점',
    category: '편의점',
    address: '서울시 강남구 테헤란로 123',
    coordinates: { lat: 37.504, lng: 127.024 },
    phone: '',
    businessHours: '',
  };
  return {
    place: placeOverride ? { ...basePlace, ...placeOverride } : basePlace,
    detourCost: { distance: 300, duration: 120, costScore: 20 },
    finalScore: 80,
    proximityScore: 75,
    routes: {
      original: {
        distance: 5000,
        duration: 600,
        path: [],
        start: { lat: 37.5663, lng: 126.9779 },
        end: { lat: 37.4979, lng: 127.0276 },
      },
      toWaypoint: {
        distance: 2500,
        duration: 300,
        path: [],
        start: { lat: 37.5663, lng: 126.9779 },
        end: { lat: 37.504, lng: 127.024 },
      },
      fromWaypoint: {
        distance: 2800,
        duration: 320,
        path: [],
        start: { lat: 37.504, lng: 127.024 },
        end: { lat: 37.4979, lng: 127.0276 },
      },
    },
    ...restOverrides,
  };
}

function makeContextValue(
  overrides: Partial<ResultListContextValue> = {}
): ResultListContextValue {
  return {
    results: [],
    filteredResults: [],
    currentCategory: '편의점',
    sortBy: 'score',
    pinnedIds: new Set(),
    favPlaces: new Set(),
    visitedDates: new Map(),
    memoMap: new Map(),
    popularityMap: {},
    copiedId: null,
    sharedId: null,
    scoreDetailOpenId: null,
    overflowMenuId: null,
    expandedCompactId: null,
    editingMemoId: null,
    editingMemoText: '',
    // === 단일 선택 UX ===
    selectedPlaces: new Set(),
    allowMultiSelect: false,
    departureTime: '09:00',
    departureMs: Date.now(),
    dwellMinutes: 0,
    nowMs: Date.now(),
    isNowDeparture: true,
    isCompact: false,
    isGrouped: false,
    currentLocation: null,
    closestPlaceId: null,
    detourRange: 0,
    maxDetourDuration: 0,
    minDetourDuration: 0,
    preferredNavApp: null,
    routeHash: 'test-hash',
    nameFilter: '',
    onTogglePin: vi.fn(),
    onToggleFav: vi.fn(),
    onVisitToggle: vi.fn(),
    onSelect: vi.fn(),
    onCopyAddress: vi.fn(),
    onShare: vi.fn(),
    onEditMemo: vi.fn(),
    onSaveMemo: vi.fn(),
    onCancelMemo: vi.fn(),
    setEditingMemoText: vi.fn(),
    onSetScoreDetail: vi.fn(),
    onSetOverflowMenu: vi.fn(),
    onSetExpandedCompact: vi.fn(),
    onOpenNavi: vi.fn(),
    onOpenNaviSheet: vi.fn(),
    triggerNav: vi.fn(),
    // === 단일 선택 콜백 ===
    onToggleSelection: vi.fn(),
    onEnableMultiSelect: vi.fn(),
    onResetSelection: vi.fn(),
    ...overrides,
  };
}

const mockSwipeHandlers = {
  onTouchStart: vi.fn(),
  onTouchMove: vi.fn(),
  onTouchEnd: vi.fn(),
};

// ── Tests ─────────────────────────────────────────────────────────

describe('ResultCard', () => {
  let ResultCard: typeof import('../ResultCard').ResultCard;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../ResultCard');
    ResultCard = mod.ResultCard;
  });

  it('장소명과 주소가 렌더링됨', () => {
    const result = makeResult();
    render(
      <ResultListContext.Provider value={makeContextValue({ filteredResults: [result] })}>
        <ResultCard
          result={result}
          index={1}
          isSelected={false}
          swipeHandlers={mockSwipeHandlers}
          swipeVisual={null}
          swipeHintId={null}
          swipeHintDeltaX={0}
        />
      </ResultListContext.Provider>
    );
    expect(screen.getByText('테스트 편의점')).toBeTruthy();
    expect(screen.getByText(/테헤란로/)).toBeTruthy();
  });

  it('카드 클릭 시 onSelect가 index+1 rank로 호출됨', () => {
    const onSelect = vi.fn();
    const result = makeResult();
    render(
      <ResultListContext.Provider value={makeContextValue({ filteredResults: [result], onSelect })}>
        <ResultCard
          result={result}
          index={1}
          isSelected={false}
          swipeHandlers={mockSwipeHandlers}
          swipeVisual={null}
          swipeHintId={null}
          swipeHintDeltaX={0}
        />
      </ResultListContext.Provider>
    );
    // 메인 카드 버튼 클릭 (data-result-index)
    const cardBtn = document.querySelector('[data-result-index="1"]') as HTMLElement;
    expect(cardBtn).not.toBeNull();
    fireEvent.click(cardBtn);
    expect(onSelect).toHaveBeenCalledWith(result, 2); // index+1 = 2
  });

  it('즐겨찾기 버튼 클릭 시 onToggleFav 호출됨', () => {
    const onToggleFav = vi.fn();
    const result = makeResult();
    render(
      <ResultListContext.Provider value={makeContextValue({ filteredResults: [result], onToggleFav })}>
        <ResultCard
          result={result}
          index={1}
          isSelected={false}
          swipeHandlers={mockSwipeHandlers}
          swipeVisual={null}
          swipeHintId={null}
          swipeHintDeltaX={0}
        />
      </ResultListContext.Provider>
    );
    const favBtn = screen.getByRole('button', { name: /즐겨찾기/ });
    fireEvent.click(favBtn);
    expect(onToggleFav).toHaveBeenCalled();
  });

  it('favPlaces에 포함된 장소는 즐겨찾기 버튼이 활성 상태(aria-pressed=true)', () => {
    const result = makeResult();
    const favPlaces = new Set([result.place.id]);
    render(
      <ResultListContext.Provider value={makeContextValue({ favPlaces, filteredResults: [result] })}>
        <ResultCard
          result={result}
          index={1}
          isSelected={false}
          swipeHandlers={mockSwipeHandlers}
          swipeVisual={null}
          swipeHintId={null}
          swipeHintDeltaX={0}
        />
      </ResultListContext.Provider>
    );
    const favBtn = screen.getByRole('button', { name: /즐겨찾기/ });
    expect(favBtn.getAttribute('aria-pressed')).toBe('true');
  });
});
