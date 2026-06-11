// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { DetourResult } from '@/types/detour';
import MobileHomeShell from '../MobileHomeShell';

function makeResult(overrides: Partial<DetourResult> = {}): DetourResult {
  const route = {
    distance: 5000,
    duration: 900,
    path: [],
    start: { lat: 37.4979, lng: 127.0276 },
    end: { lat: 37.5572, lng: 126.9245 },
  };
  const { place: placeOverrides, ...resultOverrides } = overrides;

  return {
    place: {
      id: 'place-1',
      name: '테스트 편의점',
      category: '편의점',
      address: '서울시 마포구 양화로 1',
      coordinates: { lat: 37.55, lng: 126.92 },
      ...placeOverrides,
    },
    detourCost: { distance: 350, duration: 180, costScore: 12 },
    routes: {
      original: route,
      toWaypoint: route,
      fromWaypoint: route,
    },
    proximityScore: 88,
    finalScore: 91,
    ...resultOverrides,
  };
}

const defaultProps = {
  categories: ['편의점', '카페'],
  category: '편의점',
  startAddress: '강남역',
  endAddress: '홍대입구역',
  isLoading: false,
  error: null,
  results: [] as DetourResult[],
  hasSearched: false,
  selectedWaypointId: null,
  totalCandidates: 0,
  onOpenSearch: vi.fn(),
  onCategoryChange: vi.fn(),
  onSaveRoute: vi.fn(),
  onResultSelect: vi.fn(),
  onResultHover: vi.fn(),
  onRetry: vi.fn(),
};

describe('MobileHomeShell', () => {
  it('초기 idle 상태에서는 결과 시트를 렌더링하지 않음', () => {
    render(<MobileHomeShell {...defaultProps} />);

    expect(screen.queryByTestId('mobile-result-sheet')).toBeNull();
    expect(screen.getByTestId('mobile-idle-search-pill')).toHaveTextContent('어디를 경유할까요?');
    expect(screen.getByTestId('mobile-route-entry')).toHaveTextContent('강남역');
    expect(screen.getByTestId('mobile-route-entry')).toHaveTextContent('홍대입구역');
    expect(screen.getByTestId('mobile-route-entry')).toHaveAttribute('data-route-ready', 'true');
    expect(screen.getByTestId('mobile-bottom-search-cta')).toHaveTextContent('조건 입력하고 경유지 찾기');
    expect(screen.getAllByTestId('mobile-category-chip-icon')).toHaveLength(defaultProps.categories.length);
    expect(screen.getByRole('button', { name: '카페' })).toBeInTheDocument();
  });

  it('경로가 비어도 compact 검색 진입부에서 fallback과 열기 동작을 유지함', () => {
    const onOpenSearch = vi.fn();

    render(
      <MobileHomeShell
        {...defaultProps}
        startAddress={undefined}
        endAddress={undefined}
        onOpenSearch={onOpenSearch}
      />
    );

    expect(screen.getByTestId('mobile-route-entry')).toHaveAttribute('data-route-ready', 'false');
    expect(screen.getByTestId('mobile-route-entry')).toHaveTextContent('출발지를 선택하세요');
    expect(screen.getByTestId('mobile-route-entry')).toHaveTextContent('도착지를 선택하세요');

    fireEvent.click(screen.getByTestId('open-search-overlay-btn'));
    fireEvent.click(screen.getByRole('button', { name: '조건 입력하고 경유지 찾기' }));

    expect(onOpenSearch).toHaveBeenCalledTimes(2);
  });

  it('성공 검색 결과가 0개이면 빈 결과 시트와 재시도/조건 수정 경로를 보여줌', () => {
    const onOpenSearch = vi.fn();
    const onRetry = vi.fn();

    render(
      <MobileHomeShell
        {...defaultProps}
        hasSearched
        onOpenSearch={onOpenSearch}
        onRetry={onRetry}
      />
    );

    expect(screen.getByTestId('mobile-result-sheet')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '추천 경유지 없음' })).toBeInTheDocument();
    expect(screen.getByText('0개 후보 확인')).toBeInTheDocument();
    expect(screen.getByTestId('mobile-empty-result')).toHaveTextContent('편의점 경유지를 찾지 못했어요');
    expect(screen.getByTestId('mobile-empty-result-actions')).toHaveClass('grid', 'grid-cols-2');
    expect(screen.getAllByRole('button', { name: '조건 수정' }).at(-1)).toHaveClass('min-w-0', 'whitespace-nowrap');
    expect(screen.getByRole('button', { name: '다시 검색' })).toHaveClass('min-w-0', 'whitespace-nowrap');
    expect(screen.queryByRole('button', { name: '경로 저장' })).toBeNull();

    fireEvent.click(screen.getAllByRole('button', { name: '조건 수정' }).at(-1)!);
    fireEvent.click(screen.getByRole('button', { name: '다시 검색' }));

    expect(onOpenSearch).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('오류 결과 시트는 375px에서 재시도 버튼을 전체 폭 CTA로 유지함', () => {
    const onRetry = vi.fn();

    render(
      <MobileHomeShell
        {...defaultProps}
        error="네트워크 연결이 불안정합니다. 잠시 후 다시 시도해주세요."
        hasSearched
        onRetry={onRetry}
      />
    );

    expect(screen.getByTestId('mobile-result-sheet')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '다시 시도 필요' })).toBeInTheDocument();
    expect(screen.getByTestId('mobile-error-result')).toHaveTextContent('검색이 막혔어요');

    const retryButton = screen.getByRole('button', { name: '다시 검색' });
    expect(retryButton).toHaveClass('w-full', 'min-w-0', 'whitespace-nowrap');

    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('결과가 있으면 기존 결과 카드 시트를 유지함', () => {
    render(
      <MobileHomeShell
        {...defaultProps}
        results={[makeResult()]}
        hasSearched
        totalCandidates={4}
      />
    );

    expect(screen.getByRole('heading', { name: '1개 경유지' })).toBeInTheDocument();
    expect(screen.getByText('4개 후보 중 선별')).toBeInTheDocument();
    expect(screen.getByTestId('mobile-result-sheet-header')).toHaveClass('px-3', 'pb-2');
    expect(screen.getByTestId('mobile-result-sheet-meta')).toHaveClass('flex', 'min-w-0', 'overflow-hidden');
    expect(screen.getByTestId('mobile-result-candidate-summary')).toHaveClass('shrink-0', 'truncate', 'whitespace-nowrap');
    expect(screen.getByTestId('mobile-result-route-context')).toHaveClass('min-w-0', 'flex-1', 'truncate', 'whitespace-nowrap');
    expect(screen.getByTestId('mobile-result-route-context')).toHaveTextContent('강남역 → 홍대입구역');
    expect(screen.getByText('테스트 편의점')).toBeInTheDocument();
    expect(screen.getByTestId('mobile-result-stats-place-1')).toHaveTextContent('우회');
    expect(screen.getByTestId('mobile-result-stats-place-1')).toHaveTextContent('+3분');
    expect(screen.getByTestId('mobile-result-stats-place-1')).toHaveTextContent('0.3km');
    expect(screen.getByTestId('mobile-result-stats-place-1')).toHaveTextContent('91점');
    expect(screen.getByRole('button', { name: '경로 저장' })).toHaveClass('h-8', 'w-8');
    expect(screen.getByRole('button', { name: '조건 수정' })).toHaveClass('h-8', 'w-8');
    expect(screen.queryByTestId('mobile-bottom-search-cta')).toBeNull();
  });

  it('긴 경로 문맥도 결과 시트 header action 영역을 밀지 않음', () => {
    render(
      <MobileHomeShell
        {...defaultProps}
        startAddress="서울특별시 강남구 테헤란로 아주 긴 출발지 빌딩 지하 2층 201호"
        endAddress="서울특별시 마포구 월드컵북로 아주 긴 도착지 오피스 타워 35층"
        results={[makeResult()]}
        hasSearched
        totalCandidates={123}
      />
    );

    expect(screen.getByTestId('mobile-result-sheet-header').firstElementChild).toHaveClass(
      'grid',
      'grid-cols-[minmax(0,1fr)_auto]'
    );
    expect(screen.getByTestId('mobile-result-route-context')).toHaveClass('min-w-0', 'truncate');
    expect(screen.getByTestId('mobile-result-route-context')).toHaveAttribute(
      'title',
      '서울특별시 강남구 테헤란로 아주 긴 출발지 빌딩 지하 2층 201호 → 서울특별시 마포구 월드컵북로 아주 긴 도착지 오피스 타워 35층'
    );
    expect(screen.getByRole('button', { name: '경로 저장' })).toHaveClass('h-8', 'w-8');
    expect(screen.getByRole('button', { name: '조건 수정' })).toHaveClass('h-8', 'w-8');
  });

  it('선택된 결과 카드도 좁은 폭용 점수 영역과 상태 배지를 유지함', () => {
    const result = makeResult();

    render(
      <MobileHomeShell
        {...defaultProps}
        results={[result]}
        hasSearched
        selectedWaypointId={result.place.id}
      />
    );

    expect(screen.getByTestId('mobile-result-stats-place-1')).toHaveTextContent('우회');
    expect(screen.getByText('표시 중')).toBeInTheDocument();
    expect(screen.getByText('BEST')).toBeInTheDocument();
  });

  it('긴 장소명/주소가 지도 액션, 지표, 상태 배지 영역을 밀지 않도록 고정 grid를 사용함', () => {
    const result = makeResult({
      finalScore: 100,
      detourCost: { distance: 12800, duration: 5940, costScore: 7 },
      place: {
        id: 'place-long',
        name: '아주 긴 이름의 편의점 강남대로점 지하상가 연결통로 입구 앞',
        roadAddress: '서울특별시 강남구 아주긴도로명로 123번길 45 지하 2층 연결통로 가장 안쪽 출입구',
        address: '서울특별시 강남구 역삼동 123-45',
        category: '편의점',
        coordinates: { lat: 37.55, lng: 126.92 },
      },
    });

    render(
      <MobileHomeShell
        {...defaultProps}
        results={[result]}
        hasSearched
        selectedWaypointId={result.place.id}
      />
    );

    const card = screen.getByTestId('mobile-result-card-place-long');
    expect(card.firstElementChild).toHaveClass('grid', 'grid-cols-[1.5rem_minmax(0,1fr)]');
    expect(within(card).getByText(result.place.name)).toHaveClass('max-w-full', 'truncate');
    expect(within(card).getByText(result.place.roadAddress!)).toHaveClass('max-w-full', 'truncate');
    expect(screen.getByTestId('mobile-result-map-action-place-long')).toHaveClass('h-7', 'w-7', 'shrink-0');
    expect(screen.getByTestId('mobile-result-stats-place-long')).toHaveClass(
      'grid',
      'grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]'
    );
    expect(screen.getByTestId('mobile-result-badges-place-long')).toHaveClass('flex-wrap', 'overflow-hidden');
    expect(screen.getByTestId('mobile-map-focus-pill')).toHaveClass(
      'grid-cols-[auto_minmax(0,1fr)_auto]',
      'min-w-0'
    );
    expect(within(screen.getByTestId('mobile-map-focus-pill')).getByText(result.place.name)).toHaveClass('truncate');
    expect(screen.getByTestId('mobile-map-focus-pill')).toHaveStyle({
      bottom: 'calc(30dvh + env(safe-area-inset-bottom, 0px) + 0.5rem)',
    });
    expect(screen.getByTestId('mobile-result-stats-place-long')).toHaveTextContent('+99분');
    expect(screen.getByTestId('mobile-result-stats-place-long')).toHaveTextContent('13km');
    expect(screen.getByTestId('mobile-result-stats-place-long')).toHaveTextContent('100점');
  });

  it('결과 카드를 선택하면 지도 확인을 위해 결과 시트를 낮게 접음', () => {
    const result = makeResult();
    const onResultSelect = vi.fn();

    render(
      <MobileHomeShell
        {...defaultProps}
        results={[result]}
        hasSearched
        onResultSelect={onResultSelect}
      />
    );

    expect(screen.getByTestId('mobile-result-sheet')).toHaveAttribute('data-state', 'expanded');
    expect(screen.getByTestId('mobile-result-sheet')).toHaveStyle({ height: '58dvh' });

    fireEvent.click(screen.getByRole('button', { name: '지도에서 테스트 편의점 보기' }));

    expect(onResultSelect).toHaveBeenCalledWith(result);
    expect(screen.getByTestId('mobile-result-sheet')).toHaveAttribute('data-state', 'collapsed');
    expect(screen.getByTestId('mobile-result-sheet')).toHaveStyle({ height: '30dvh' });
    expect(screen.getByTestId('mobile-result-list')).toHaveStyle({
      maxHeight: 'calc(30dvh - 78px - env(safe-area-inset-bottom))',
    });
  });

  it('새 검색 결과가 도착하면 이전 marker focus로 접힌 결과 시트를 다시 펼침', () => {
    const firstResult = makeResult({
      place: {
        id: 'place-1',
        name: '첫 번째 편의점',
        category: '편의점',
        address: '서울시 마포구 양화로 1',
        coordinates: { lat: 37.55, lng: 126.92 },
      },
    });
    const nextResult = makeResult({
      place: {
        id: 'place-2',
        name: '다음 편의점',
        category: '편의점',
        address: '서울시 마포구 양화로 2',
        coordinates: { lat: 37.56, lng: 126.93 },
      },
    });
    const { rerender } = render(
      <MobileHomeShell
        {...defaultProps}
        results={[firstResult]}
        hasSearched
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '지도에서 첫 번째 편의점 보기' }));

    expect(screen.getByTestId('mobile-result-sheet')).toHaveAttribute('data-state', 'collapsed');

    rerender(
      <MobileHomeShell
        {...defaultProps}
        results={[]}
        hasSearched
        isLoading
      />
    );
    rerender(
      <MobileHomeShell
        {...defaultProps}
        results={[nextResult]}
        hasSearched
        isLoading={false}
      />
    );

    expect(screen.getByTestId('mobile-result-sheet')).toHaveAttribute('data-state', 'expanded');
    expect(screen.getByTestId('mobile-result-sheet')).toHaveStyle({ height: '58dvh' });
    expect(screen.getByRole('button', { name: '지도에서 다음 편의점 보기' })).toBeInTheDocument();
  });

  it('지도 marker 선택으로 selectedWaypointId가 바뀌어도 결과 시트를 낮게 접음', () => {
    const result = makeResult();
    const { rerender } = render(
      <MobileHomeShell
        {...defaultProps}
        results={[result]}
        hasSearched
        selectedWaypointId={null}
      />
    );

    expect(screen.getByTestId('mobile-result-sheet')).toHaveAttribute('data-state', 'expanded');

    rerender(
      <MobileHomeShell
        {...defaultProps}
        results={[result]}
        hasSearched
        selectedWaypointId={result.place.id}
      />
    );

    expect(screen.getByTestId('mobile-result-sheet')).toHaveAttribute('data-state', 'collapsed');
    expect(screen.getByTestId('mobile-result-sheet')).toHaveStyle({ height: '30dvh' });
    expect(screen.getByTestId('mobile-result-badges-place-1')).toHaveTextContent('표시 중');
    expect(screen.getByTestId('mobile-map-focus-pill')).toHaveTextContent('테스트 편의점');
    expect(screen.getByTestId('mobile-map-focus-pill')).toHaveTextContent('지도에 표시 중');
    expect(screen.getByTestId('mobile-map-focus-pill')).toHaveTextContent('91점');

    fireEvent.click(screen.getByTestId('mobile-map-focus-pill'));

    expect(screen.getByTestId('mobile-result-sheet')).toHaveAttribute('data-state', 'expanded');
    expect(screen.getByTestId('mobile-result-sheet')).toHaveStyle({ height: '58dvh' });
    expect(screen.queryByTestId('mobile-map-focus-pill')).toBeNull();
  });

});
