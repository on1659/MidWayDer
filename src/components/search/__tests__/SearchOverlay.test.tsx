// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { getRecentSearches, removeRecentSearch } from '@/lib/recent-searches';
import { getPlaceFavorites, removePlaceFavorite } from '@/lib/place-favorites';

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
    vi.mocked(getRecentSearches).mockReturnValue([]);
    vi.mocked(getPlaceFavorites).mockReturnValue([]);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }));
    const mod = await import('../SearchOverlay');
    SearchOverlay = mod.default;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('모바일 검색 화면은 단일 장소 검색 입력과 경로 상태만 제공함', () => {
    render(
      <SearchOverlay
        {...defaultProps}
        startAddress="강남역"
        endAddress="서울역"
        canSearch
      />
    );
    expect(screen.getByTestId('mobile-route-edit-trigger')).toHaveTextContent('어디를 경유할까요?');
    expect(screen.queryByTestId('mobile-route-input-card')).toBeNull();
    expect(screen.queryByTestId('mobile-origin-input')).toBeNull();
    expect(screen.queryByTestId('mobile-destination-input')).toBeNull();
    expect(screen.getByTestId('mobile-place-search-input')).toBeInTheDocument();
    expect(screen.getByTestId('mobile-route-summary')).toHaveAttribute('data-route-ready', 'true');
    expect(screen.getByTestId('mobile-route-start-row')).toHaveTextContent('강남역');
    expect(screen.getByTestId('mobile-route-end-row')).toHaveTextContent('서울역');
    expect(screen.getByTestId('mobile-search-sticky-footer')).toBeInTheDocument();
    expect(screen.getByTestId('mobile-search-route-btn')).toBeEnabled();
    expect(screen.queryByTestId('mobile-transport-tabs')).toBeNull();
    expect(screen.getByText('경유지 종류')).toBeInTheDocument();
  });

  it('모바일 경로 상태는 긴 주소와 액션 버튼을 375px 폭용 고정 구조로 렌더링함', () => {
    const onGPS = vi.fn();
    const onSwap = vi.fn();

    render(
      <SearchOverlay
        {...defaultProps}
        startAddress="서울특별시 강남구 테헤란로 아주 긴 출발지 주소 123"
        endAddress="서울특별시 마포구 양화로 아주 긴 도착지 주소 456"
        canSearch
        onGPS={onGPS}
        onSwap={onSwap}
      />
    );

    expect(screen.getByTestId('mobile-route-summary')).toHaveAttribute('data-route-ready', 'true');
    expect(screen.getByTestId('mobile-route-start-row')).toHaveTextContent('출발');
    expect(screen.getByTestId('mobile-route-start-row')).toHaveTextContent('서울특별시 강남구 테헤란로 아주 긴 출발지 주소 123');
    expect(screen.getByTestId('mobile-route-end-row')).toHaveTextContent('도착');
    expect(screen.getByTestId('mobile-route-end-row')).toHaveTextContent('서울특별시 마포구 양화로 아주 긴 도착지 주소 456');
    expect(screen.getByRole('button', { name: '현재 위치를 출발지로 설정' })).toHaveClass('h-10', 'w-10');
    expect(screen.getByRole('button', { name: '출발지와 도착지 바꾸기' })).toHaveClass('h-10', 'w-10');
  });

  it('빈 경로 슬롯에 맞춰 장소 검색 placeholder와 CTA를 안내함', () => {
    const { rerender } = render(<SearchOverlay {...defaultProps} />);

    expect(screen.getByPlaceholderText('출발지로 지정할 장소 검색')).toBeInTheDocument();
    expect(screen.getByTestId('mobile-route-step-hint')).toHaveTextContent('장소를 검색하고 출발지로 선택하세요');
    expect(screen.getByTestId('mobile-search-route-btn')).toHaveTextContent('출발지 선택 필요');

    rerender(
      <SearchOverlay
        {...defaultProps}
        startAddress="강남역"
      />
    );

    expect(screen.getByPlaceholderText('도착지로 지정할 장소 검색')).toBeInTheDocument();
    expect(screen.getByTestId('mobile-route-step-hint')).toHaveTextContent('다음으로 도착지를 검색해 선택하세요');
    expect(screen.getByTestId('mobile-search-route-btn')).toHaveTextContent('도착지 선택 필요');

    rerender(
      <SearchOverlay
        {...defaultProps}
        startAddress="강남역"
        endAddress="서울역"
        canSearch
      />
    );

    expect(screen.getByPlaceholderText('장소 또는 주소 검색')).toBeInTheDocument();
    expect(screen.getByTestId('mobile-route-step-hint')).toHaveTextContent('경유지 종류를 고르고 검색을 실행하세요');
    expect(screen.getByTestId('mobile-search-route-btn')).toHaveTextContent('경유지 찾기');
  });

  it('최근 검색과 저장 장소 행은 긴 텍스트와 보조 버튼을 375px 폭용 grid로 분리함', () => {
    const onCategoryChange = vi.fn();
    const onInstantSearch = vi.fn();
    vi.mocked(getPlaceFavorites).mockReturnValue([
      {
        placeId: 'place-1',
        placeName: '서울특별시청역 근처 아주 긴 저장 장소 이름 테스트 지점',
        category: '브런치 카페',
        address: '서울특별시 중구 세종대로 아주 긴 도로명 주소 110 15층 1501호',
        lat: 37.5665,
        lng: 126.978,
        savedAt: new Date(2026, 4, 21).getTime(),
      },
    ]);
    vi.mocked(getRecentSearches).mockReturnValue([
      {
        id: 'recent-1',
        startAddress: '서울특별시 강남구 테헤란로 아주 긴 출발지 주소 123',
        endAddress: '서울특별시 마포구 양화로 아주 긴 도착지 주소 456',
        category: '대형 베이커리 카페',
        timestamp: new Date(2026, 4, 21).getTime(),
      },
    ]);

    render(
      <SearchOverlay
        {...defaultProps}
        onCategoryChange={onCategoryChange}
        onInstantSearch={onInstantSearch}
      />
    );

    expect(screen.getByTestId('mobile-saved-place-row')).toHaveClass(
      'grid',
      'grid-cols-[auto_minmax(0,1fr)_auto]'
    );
    expect(screen.getByRole('button', { name: /카테고리로 검색/ })).toHaveClass('min-w-0');
    expect(screen.getByRole('button', { name: /즐겨찾기 삭제/ })).toHaveClass('h-9', 'w-9', 'shrink-0');

    expect(screen.getByTestId('mobile-recent-search-row')).toHaveClass(
      'grid',
      'grid-cols-[auto_minmax(0,1fr)_auto]'
    );
    expect(screen.getByRole('button', { name: /경로 입력/ })).toHaveClass('min-w-0');
    expect(screen.getByText('05.21.')).toHaveClass('truncate', 'text-right');
    expect(screen.getByRole('button', { name: /즉시 검색/ })).toHaveClass('h-9', 'w-9', 'shrink-0');
    expect(screen.getByRole('button', { name: /검색 기록 삭제/ })).toHaveClass('h-9', 'w-9', 'shrink-0');

    fireEvent.click(screen.getByRole('button', { name: /즉시 검색/ }));
    expect(onInstantSearch).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /검색 기록 삭제/ }));
    expect(removeRecentSearch).toHaveBeenCalledWith('recent-1');

    fireEvent.click(screen.getByRole('button', { name: /즐겨찾기 삭제/ }));
    expect(removePlaceFavorite).toHaveBeenCalledWith('place-1');
  });

  it('장소 선택 시 하단 장소 액션 시트를 표시함', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          {
            name: '카페 마일드 서울시청점 아주 긴 장소명 테스트',
            address: '서울 중구 세종대로 110 아주 긴 상세 주소 15층 1501호',
            lat: 37.5665,
            lng: 126.978,
            category: '카페',
          },
        ],
      }),
    } as Response);

    render(<SearchOverlay {...defaultProps} />);

    fireEvent.change(screen.getByTestId('mobile-place-search-input'), { target: { value: '카페' } });
    await waitFor(() => expect(screen.getByRole('option', { name: /카페 마일드/ })).toBeInTheDocument(), { timeout: 1500 });
    fireEvent.click(screen.getByRole('option', { name: /카페 마일드/ }));

    expect(screen.getByTestId('mobile-search-overlay-scroll')).toHaveStyle({
      paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 17.5rem)',
    });
    expect(screen.getByTestId('mobile-selected-place-sheet')).toHaveStyle({
      bottom: 'calc(env(safe-area-inset-bottom, 0px) + 5.75rem)',
    });
    expect(screen.getByTestId('mobile-selected-place-sheet')).toHaveTextContent('카페 마일드 서울시청점 아주 긴 장소명 테스트');
    expect(screen.getByTestId('mobile-selected-place-sheet')).toHaveTextContent('서울 중구 세종대로 110 아주 긴 상세 주소 15층 1501호');
    expect(screen.getByTestId('mobile-selected-place-next-step')).toHaveClass('truncate');
    expect(screen.getByTestId('mobile-selected-place-next-step')).toHaveTextContent('출발지로 지정하면 다음에 도착지를 고를 수 있어요');
    expect(screen.getByTestId('mobile-select-start-btn')).toHaveClass('min-w-0', 'whitespace-nowrap');
    expect(screen.getByTestId('mobile-select-start-btn')).toHaveTextContent('출발지로 선택');
    expect(screen.getByTestId('mobile-select-end-btn')).toHaveClass('min-w-0', 'whitespace-nowrap');
    expect(screen.getByTestId('mobile-select-end-btn')).toHaveTextContent('도착지로 선택');
  });

  it('선택한 장소를 출발지/도착지 콜백으로 전달함', async () => {
    const onStartChange = vi.fn();
    const onEndChange = vi.fn();
    const onStartSelect = vi.fn();
    const onEndSelect = vi.fn();
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          {
            name: '카페 마일드',
            address: '서울 중구 세종대로 110',
            lat: 37.5665,
            lng: 126.978,
            category: '카페',
          },
        ],
      }),
    } as Response).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          {
            name: '카페 마일드',
            address: '서울 중구 세종대로 110',
            lat: 37.5665,
            lng: 126.978,
            category: '카페',
          },
        ],
      }),
    } as Response);

    render(
      <SearchOverlay
        {...defaultProps}
        onStartChange={onStartChange}
        onEndChange={onEndChange}
        onStartSelect={onStartSelect}
        onEndSelect={onEndSelect}
      />
    );

    fireEvent.change(screen.getByTestId('mobile-place-search-input'), { target: { value: '카페' } });
    await waitFor(() => expect(screen.getByRole('option', { name: /카페 마일드/ })).toBeInTheDocument(), { timeout: 1500 });
    fireEvent.click(screen.getByRole('option', { name: /카페 마일드/ }));

    fireEvent.click(screen.getByTestId('mobile-select-start-btn'));
    expect(onStartChange).toHaveBeenCalledWith('카페 마일드');
    expect(onStartSelect).toHaveBeenCalledWith(expect.objectContaining({
      address: '카페 마일드',
      coordinates: { lat: 37.5665, lng: 126.978 },
      name: '카페 마일드',
      placeAddress: '서울 중구 세종대로 110',
      category: '카페',
    }));
    expect(screen.queryByTestId('mobile-selected-place-sheet')).toBeNull();
    expect(screen.getByTestId('mobile-search-overlay-scroll')).toHaveStyle({
      paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 6rem)',
    });
    expect(screen.getByTestId('mobile-place-search-input')).toHaveValue('');
    await waitFor(() => expect(screen.getByTestId('mobile-place-search-input')).toHaveFocus());

    fireEvent.change(screen.getByTestId('mobile-place-search-input'), { target: { value: '카페2' } });
    await waitFor(() => expect(screen.getByRole('option', { name: /카페 마일드/ })).toBeInTheDocument(), { timeout: 1500 });
    fireEvent.click(screen.getByRole('option', { name: /카페 마일드/ }));
    fireEvent.click(screen.getByTestId('mobile-select-end-btn'));
    expect(onEndChange).toHaveBeenCalledWith('카페 마일드');
    expect(onEndSelect).toHaveBeenCalledWith(expect.objectContaining({
      address: '카페 마일드',
      coordinates: { lat: 37.5665, lng: 126.978 },
      name: '카페 마일드',
      placeAddress: '서울 중구 세종대로 110',
      category: '카페',
    }));
    expect(screen.queryByTestId('mobile-selected-place-sheet')).toBeNull();
    expect(screen.getByTestId('mobile-search-overlay-scroll')).toHaveStyle({
      paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 6rem)',
    });
    expect(screen.getByTestId('mobile-place-search-input')).toHaveValue('');
    await waitFor(() => expect(screen.getByTestId('mobile-place-search-input')).toHaveFocus());
  });

  it('경유지 찾기 실행을 부모 핸들러로 전달함', () => {
    const onStartChange = vi.fn();
    const onEndChange = vi.fn();
    const onSearch = vi.fn();
    render(
      <SearchOverlay
        {...defaultProps}
        startAddress=""
        endAddress=""
        canSearch
        onStartChange={onStartChange}
        onEndChange={onEndChange}
        onSearch={onSearch}
      />
    );

    fireEvent.click(screen.getByTestId('mobile-search-route-btn'));

    expect(onStartChange).not.toHaveBeenCalled();
    expect(onEndChange).not.toHaveBeenCalled();
    expect(onSearch).toHaveBeenCalled();
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
