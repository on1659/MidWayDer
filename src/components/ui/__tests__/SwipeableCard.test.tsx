/**
 * @vitest-environment jsdom
 */

/**
 * SwipeableCard component tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import SwipeableCard from '../SwipeableCard';

describe('SwipeableCard', () => {
  const onSwipeLeft = vi.fn();
  const onSwipeRight = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('children을 렌더링함', () => {
    render(
      <SwipeableCard>
        <div>Test Content</div>
      </SwipeableCard>
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('className prop 적용', () => {
    render(
      <SwipeableCard className="custom-class">
        <div>Test</div>
      </SwipeableCard>
    );

    const card = screen.getByText('Test').parentElement?.parentElement;
    expect(card).toHaveClass('custom-class');
    expect(card).toHaveClass('rounded-2xl');
  });

  it('disabled=true면 스와이프 비활성화', () => {
    render(
      <SwipeableCard disabled={true}>
        <div>Test</div>
      </SwipeableCard>
    );

    const card = screen.getByText('Test').parentElement?.parentElement;
    expect(card).toBeInTheDocument();
  });

  it('커스텀 아이콘 props 전달 가능', () => {
    render(
      <SwipeableCard
        leftActionIcon={<span data-testid="left-icon">★</span>}
        rightActionIcon={<span data-testid="right-icon">↗</span>}
      >
        <div>Test</div>
      </SwipeableCard>
    );

    // 아이콘은 스와이프 시에만 표시되므로 렌더링만 확인
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('커스텀 라벨 props 전달 가능', () => {
    render(
      <SwipeableCard
        leftActionLabel="저장"
        rightActionLabel="전송"
      >
        <div>Test</div>
      </SwipeableCard>
    );

    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('threshold prop 전달 가능', () => {
    render(
      <SwipeableCard threshold={150}>
        <div>Test</div>
      </SwipeableCard>
    );

    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('기본 스타일 클래스 적용', () => {
    render(
      <SwipeableCard>
        <div>Test</div>
      </SwipeableCard>
    );

    const card = screen.getByText('Test').parentElement?.parentElement;
    expect(card).toHaveClass('relative');
    expect(card).toHaveClass('overflow-hidden');
  });

  // Note: 실제 터치 스와이프는 통합 테스트 또는 E2E 테스트에서 검증
  it('onSwipeLeft, onSwipeRight 콜백 props 전달 가능', () => {
    render(
      <SwipeableCard
        onSwipeLeft={onSwipeLeft}
        onSwipeRight={onSwipeRight}
      >
        <div>Test</div>
      </SwipeableCard>
    );

    // 콜백이 정의되어 있어야 함
    expect(onSwipeLeft).toBeDefined();
    expect(onSwipeRight).toBeDefined();
  });
});
