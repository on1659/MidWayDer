// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import type { DetourResult } from '@/types/detour';

// ── Mock 외부 의존성 ─────────────────────────────────────────────
vi.mock('@/lib/clipboard', () => ({ copyToClipboard: vi.fn() }));
vi.mock('@/lib/navigation-links', () => ({
  openNavigationApp: vi.fn(),
  getPreferredNavApp: vi.fn().mockReturnValue(null),
  setPreferredNavApp: vi.fn(),
}));
vi.mock('@/lib/business-hours', () => ({
  getBusinessStatus: vi.fn().mockReturnValue({ isOpen: true, label: '영업 중' }),
  getMinutesUntilClose: vi.fn().mockReturnValue(null),
  getMinutesUntilOpen: vi.fn().mockReturnValue(null),
  getBusinessHoursRange: vi.fn().mockReturnValue(null),
}));
vi.mock('@/lib/utils/route-hash', () => ({ hashRoute: vi.fn().mockReturnValue('hash-abc') }));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));
vi.mock('@/lib/fetch-timeout', () => ({
  fetchWithTimeout: vi.fn().mockResolvedValue({ ok: false }),
}));
vi.mock('@/lib/smart-summary', () => ({ getSmartOneLiner: vi.fn().mockReturnValue(null) }));
vi.mock('@/lib/visit-tracking', () => ({
  getVisitCount: vi.fn().mockReturnValue(0),
  recordVisit: vi.fn(),
  getVisitHistory: vi.fn().mockReturnValue([]),
}));
vi.mock('@/lib/recommendation-badges', () => ({
  getRecommendationBadges: vi.fn().mockReturnValue([]),
  getBadgeColor: vi.fn().mockReturnValue(''),
}));
vi.mock('@/lib/category-icons', () => ({ getCategoryIcon: vi.fn().mockReturnValue('🏪') }));
vi.mock('@/lib/smart-category', () => ({
  getTimeBasedCategoryHints: vi.fn().mockReturnValue([]),
  getTimeGreeting: vi.fn().mockReturnValue('안녕하세요'),
}));
vi.mock('@/components/ui/ErrorFallback', () => ({
  default: ({ error }: { error: string }) => <div role="alert">{error}</div>,
}));
vi.mock('@/components/ui/BottomSheet', () => ({
  default: ({ children, visible }: { children: React.ReactNode; visible: boolean }) =>
    visible ? <div data-testid="bottom-sheet">{children}</div> : null,
}));
vi.mock('@/hooks/useA11yAnnounce', () => ({
  useA11yAnnounce: () => ({ message: '', announceLoading: vi.fn(), announceResults: vi.fn() }),
}));
vi.mock('@/lib/place-favorites', () => ({
  getPlaceFavorites: vi.fn().mockReturnValue([]),
  addPlaceFavorite: vi.fn(),
  removePlaceFavorite: vi.fn(),
  isPlaceFavorited: vi.fn().mockReturnValue(false),
}));
vi.mock('@/lib/place-memos', () => ({
  getPlaceMemos: vi.fn().mockReturnValue([]),
  setPlaceMemo: vi.fn(),
}));

// ── Helper Factories ─────────────────────────────────────────────

function makeResult(overrides: Partial<DetourResult> = {}): DetourResult {
  const { place: placeOverride, ...restOverrides } = overrides;
  const basePlace = {
    id: `place-${Math.random()}`,
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
        distance: 5000, duration: 600, path: [],
        start: { lat: 37.5663, lng: 126.9779 },
        end: { lat: 37.4979, lng: 127.0276 },
      },
      toWaypoint: {
        distance: 2500, duration: 300, path: [],
        start: { lat: 37.5663, lng: 126.9779 },
        end: { lat: 37.504, lng: 127.024 },
      },
      fromWaypoint: {
        distance: 2800, duration: 320, path: [],
        start: { lat: 37.504, lng: 127.024 },
        end: { lat: 37.4979, lng: 127.0276 },
      },
    },
    ...restOverrides,
  };
}

const defaultProps = {
  selectedId: null,
  error: null,
  hasSearched: true,
  onSelect: vi.fn(),
  onCategoryChange: vi.fn(),
  onRetry: vi.fn(),
  onSaveRoute: vi.fn(),
  onExpandRadius: vi.fn(),
  onCancel: vi.fn(),
  sortBy: 'score' as const,
  onHoverResult: vi.fn(),
};

// ── Tests ─────────────────────────────────────────────────────────

describe('ResultList', () => {
  let ResultList: typeof import('../ResultList').default;

  beforeEach(async () => {
    vi.clearAllMocks();
    // jsdom localStorage 보장 (일부 환경에서 getItem이 함수가 아닌 경우 대비)
    vi.stubGlobal('localStorage', {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(),
      length: 0,
    });
    // IntersectionObserver mock (jsdom 미지원) — class 기반 생성자로 제공
    class MockIntersectionObserver {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    }
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
    // scrollIntoView mock (jsdom 미지원)
    Element.prototype.scrollIntoView = vi.fn();
    const mod = await import('../ResultList');
    ResultList = mod.default;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('results가 없고 hasSearched=true일 때 빈 상태 메시지 표시', () => {
    render(
      <ResultList
        results={[]}
        isLoading={false}
        currentCategory="편의점"
        {...defaultProps}
      />
    );
    expect(screen.getByText(/이 경로에는/)).toBeTruthy();
  });

  it('isLoading=true일 때 큰 단계 카드 대신 작은 진행 상태만 표시', () => {
    render(
      <ResultList
        results={[]}
        isLoading={true}
        currentCategory="편의점"
        {...defaultProps}
      />
    );
    expect(screen.getByText('찾는 중...')).toBeTruthy();
    expect(screen.getByText(/결과가 준비되면/)).toBeTruthy();
    expect(screen.queryByText(/경로 분석 중/)).toBeNull();
  });

  it('results 2개가 카드로 렌더링됨 (role=listitem)', () => {
    const results = [
      makeResult({ place: { id: 'p1', name: '편의점A', category: '편의점', address: '주소A', coordinates: { lat: 37.5, lng: 127.0 } } }),
      makeResult({ place: { id: 'p2', name: '편의점B', category: '편의점', address: '주소B', coordinates: { lat: 37.51, lng: 127.01 } } }),
    ];
    render(
      <ResultList
        results={results}
        isLoading={false}
        currentCategory="편의점"
        {...defaultProps}
      />
    );
    expect(screen.getAllByText('편의점A').length).toBeGreaterThan(0);
    expect(screen.getAllByText('편의점B').length).toBeGreaterThan(0);
    // 두 카드 모두 role=listitem으로 렌더링
    const cards = screen.getAllByRole('listitem');
    expect(cards.length).toBeGreaterThanOrEqual(2);
  });

  it('hasSearched=false일 때 환영 메시지 표시', () => {
    render(
      <ResultList
        results={[]}
        isLoading={false}
        currentCategory="편의점"
        {...defaultProps}
        hasSearched={false}
      />
    );
    expect(screen.getByText(/가는 길에 들를 곳을 찾아드려요/)).toBeTruthy();
  });
});
