// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { DetourResult } from '@/types/detour';
import MobileHomeShell from '../MobileHomeShell';

function makeResult(): DetourResult {
  const route = {
    distance: 5000,
    duration: 900,
    path: [],
    start: { lat: 37.4979, lng: 127.0276 },
    end: { lat: 37.5572, lng: 126.9245 },
  };

  return {
    place: {
      id: 'place-1',
      name: '테스트 편의점',
      category: '편의점',
      address: '서울시 마포구 양화로 1',
      coordinates: { lat: 37.55, lng: 126.92 },
    },
    detourCost: { distance: 350, duration: 180, costScore: 12 },
    routes: {
      original: route,
      toWaypoint: route,
      fromWaypoint: route,
    },
    proximityScore: 88,
    finalScore: 91,
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
    expect(screen.queryByRole('button', { name: '경로 저장' })).toBeNull();

    fireEvent.click(screen.getAllByRole('button', { name: '조건 수정' }).at(-1)!);
    fireEvent.click(screen.getByRole('button', { name: '다시 검색' }));

    expect(onOpenSearch).toHaveBeenCalledTimes(1);
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
    expect(screen.getByText('테스트 편의점')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '경로 저장' })).toBeInTheDocument();
  });
});
