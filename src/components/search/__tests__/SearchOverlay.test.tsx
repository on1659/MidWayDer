// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// ── Mock 외부 의존성 ─────────────────────────────────────────────
vi.mock('@/lib/recent-searches', () => ({
  getRecentSearches: vi.fn().mockReturnValue([]),
  removeRecentSearch: vi.fn(),
  addRecentSearch: vi.fn(),
}));
vi.mock('@/lib/smart-location', () => ({
  getSavedLocationByLabel: vi.fn().mockReturnValue(null),
  saveLocation: vi.fn(),
}));
vi.mock('@/lib/voice-search', () => ({
  startVoiceSearchWithFeedback: vi.fn().mockResolvedValue({}),
  VOICE_SEARCH_EXAMPLES: ['서울역에서 강남역 가는 길에 스타벅스'],
}));
vi.mock('@/lib/place-favorites', () => ({
  getPlaceFavorites: vi.fn().mockReturnValue([]),
  addPlaceFavorite: vi.fn(),
  removePlaceFavorite: vi.fn(),
}));
vi.mock('@/lib/smart-category', () => ({
  getTimeBasedCategoryHints: vi.fn().mockReturnValue([]),
}));
// AddressInput 내부에서 사용하는 fetch 자동완성 API를 mocking
vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }));

// ── Default Props ─────────────────────────────────────────────────

const defaultProps = {
  open: true,
  onClose: vi.fn(),
  startAddress: '',
  endAddress: '',
  category: '편의점',
  onStartChange: vi.fn(),
  onEndChange: vi.fn(),
  onCategoryChange: vi.fn(),
  onSearch: vi.fn(),
  isLoading: false,
  canSearch: false,
};

// ── Tests ─────────────────────────────────────────────────────────

describe('SearchOverlay', () => {
  let SearchOverlay: typeof import('../SearchOverlay').default;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../SearchOverlay');
    SearchOverlay = mod.default;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('모바일 장소 검색 화면에서 경로 편집 입력을 숨김', () => {
    render(
      <SearchOverlay
        {...defaultProps}
        startAddress="강남역"
        endAddress="서울역"
      />
    );
    expect(screen.getByTestId('mobile-route-edit-trigger')).toHaveTextContent('어디를 경유할까요?');
    expect(screen.queryByText('강남역 → 서울역')).toBeNull();
    expect(screen.queryByTestId('mobile-origin-input')).toBeNull();
    expect(screen.queryByTestId('mobile-destination-input')).toBeNull();
    expect(screen.queryByTestId('mobile-route-input-card')).toBeNull();
    expect(screen.queryByTestId('mobile-transport-tabs')).toBeNull();
    expect(screen.queryByTestId('mobile-search-sticky-footer')).toBeNull();
    expect(screen.getByText('경유지 종류')).toBeInTheDocument();
  });

  it('카테고리 칩 클릭 시 onCategoryChange 호출됨', () => {
    const onCategoryChange = vi.fn();
    render(<SearchOverlay {...defaultProps} onCategoryChange={onCategoryChange} />);
    // CategorySelect 컴포넌트에서 "편의점" 버튼 클릭
    const convenienceBtn = screen.getByRole('button', { name: /편의점/ });
    fireEvent.click(convenienceBtn);
    expect(onCategoryChange).toHaveBeenCalled();
  });

  it('직접 입력 토글 클릭 시 카테고리 입력 필드가 나타남', () => {
    render(<SearchOverlay {...defaultProps} />);

    fireEvent.click(screen.getByTestId('custom-category-toggle'));

    expect(screen.getByTestId('custom-category-input')).toBeInTheDocument();
  });

  it('open=false 이면 컴포넌트가 렌더링되지 않음', () => {
    render(<SearchOverlay {...defaultProps} open={false} />);
    expect(screen.queryByTestId('mobile-category-input-card')).toBeNull();
  });
});
