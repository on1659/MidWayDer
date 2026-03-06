/**
 * SwipeableCard - Swipe gesture card component
 *
 * 좌우 스와이프로 빠른 액션을 수행할 수 있는 카드 컴포넌트입니다.
 * - 왼쪽 스와이프: 즐겨찾기 토글 (노란색 배경)
 * - 오른쪽 스와이프: 공유 (파란색 배경)
 */

'use client';

import { useRef, useState, useCallback } from 'react';
import { Star, Share2 } from 'lucide-react';

interface SwipeableCardProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftActionIcon?: React.ReactNode;
  rightActionIcon?: React.ReactNode;
  leftActionLabel?: string;
  rightActionLabel?: string;
  threshold?: number;
  className?: string;
  disabled?: boolean;
}

export default function SwipeableCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftActionIcon,
  rightActionIcon,
  leftActionLabel = '즐겨찾기',
  rightActionLabel = '공유',
  threshold = 100,
  className = '',
  disabled = false,
}: SwipeableCardProps) {
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const startX = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);

  // 기본 아이콘
  const leftIcon = leftActionIcon || <Star className="w-6 h-6 text-yellow-500" />;
  const rightIcon = rightActionIcon || <Share2 className="w-6 h-6 text-blue-500" />;

  // 스와이프 방향에 따른 배경색
  const getBackgroundColor = () => {
    if (translateX > threshold / 2) {
      return 'bg-yellow-50 dark:bg-yellow-900/20'; // 왼쪽 스와이프 (즐겨찾기)
    }
    if (translateX < -threshold / 2) {
      return 'bg-blue-50 dark:bg-blue-900/20'; // 오른쪽 스와이프 (공유)
    }
    return '';
  };

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled) return;
    startX.current = e.touches[0].clientX;
    setIsDragging(true);
  }, [disabled]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || disabled) return;

    const currentX = e.touches[0].clientX;
    const delta = startX.current - currentX;

    // 저항감 추가 (멀어질수록 증가율 감소)
    const resistance = 0.6;
    const newTranslate = delta * resistance;

    // 최대 이동 거리 제한
    const maxTranslate = threshold * 1.5;
    setTranslateX(Math.max(-maxTranslate, Math.min(maxTranslate, newTranslate)));
  }, [isDragging, disabled, threshold]);

  const onTouchEnd = useCallback(() => {
    if (!isDragging || disabled) return;

    setIsDragging(false);

    // 왼쪽으로 충분히 스와이프 (즐겨찾기)
    if (translateX > threshold && onSwipeLeft) {
      onSwipeLeft();
    }
    // 오른쪽으로 충분히 스와이프 (공유)
    else if (translateX < -threshold && onSwipeRight) {
      onSwipeRight();
    }

    // 원위치
    setTranslateX(0);
  }, [isDragging, disabled, translateX, threshold, onSwipeLeft, onSwipeRight]);

  // 드래그 중이 아닐 때 애니메이션 적용
  const transitionStyle = isDragging
    ? 'none'
    : 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)';

  // 좌우 액션 표시 여부
  const showLeftAction = translateX > 20 && onSwipeLeft;
  const showRightAction = translateX < -20 && onSwipeRight;

  return (
    <div
      ref={cardRef}
      className={`relative overflow-hidden rounded-2xl ${getBackgroundColor()} ${className}`}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* 왼쪽 액션 표시 (즐겨찾기) */}
      {showLeftAction && (
        <div
          className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-yellow-600 dark:text-yellow-400 transition-opacity"
          style={{ opacity: Math.min(1, translateX / threshold) }}
          aria-hidden="true"
        >
          {leftIcon}
          <span className="text-sm font-medium">{leftActionLabel}</span>
        </div>
      )}

      {/* 오른쪽 액션 표시 (공유) */}
      {showRightAction && (
        <div
          className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-blue-600 dark:text-blue-400 transition-opacity"
          style={{ opacity: Math.min(1, Math.abs(translateX) / threshold) }}
          aria-hidden="true"
        >
          <span className="text-sm font-medium">{rightActionLabel}</span>
          {rightIcon}
        </div>
      )}

      {/* 카드 콘텐츠 */}
      <div
        className="relative z-10"
        style={{
          transform: `translateX(${-translateX}px)`,
          transition: transitionStyle,
        }}
      >
        {children}
      </div>
    </div>
  );
}
