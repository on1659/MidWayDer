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

  it('검색 입력창이 렌더링됨 (출발지/도착지 placeholder)', () => {
    render(<SearchOverlay {...defaultProps} />);
    expect(screen.getByPlaceholderText('출발지를 입력하세요')).toBeTruthy();
    expect(screen.getByPlaceholderText('도착지를 입력하세요')).toBeTruthy();
  });

  it('카테고리 칩 클릭 시 onCategoryChange 호출됨', () => {
    const onCategoryChange = vi.fn();
    render(<SearchOverlay {...defaultProps} onCategoryChange={onCategoryChange} />);
    // CategorySelect 컴포넌트에서 "편의점" 버튼 클릭
    const convenienceBtn = screen.getByRole('button', { name: /편의점/ });
    fireEvent.click(convenienceBtn);
    expect(onCategoryChange).toHaveBeenCalled();
  });

  it('open=false 이면 컴포넌트가 렌더링되지 않음', () => {
    render(<SearchOverlay {...defaultProps} open={false} />);
    expect(screen.queryByPlaceholderText('출발지를 입력하세요')).toBeNull();
  });
});
