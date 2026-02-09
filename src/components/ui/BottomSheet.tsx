/**
 * BottomSheet - 모바일 바텀시트 컴포넌트
 *
 * 드래그로 올리고 내릴 수 있는 바텀시트입니다.
 * snap points: collapsed(peek), half, full
 */

'use client';

import { useRef, useCallback, useEffect, useState } from 'react';

type SnapPoint = 'collapsed' | 'half' | 'full';

interface BottomSheetProps {
  children: React.ReactNode;
  /** 접혔을 때 보이는 높이 (px) */
  peekHeight?: number;
  /** 현재 snap point (외부 제어) */
  snap?: SnapPoint;
  /** snap 변경 콜백 */
  onSnapChange?: (snap: SnapPoint) => void;
  /** 시트가 보이는지 여부 */
  visible?: boolean;
}

export default function BottomSheet({
  children,
  peekHeight = 140,
  snap = 'collapsed',
  onSnapChange,
  visible = true,
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);
  const dragStartTranslate = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const [currentTranslate, setCurrentTranslate] = useState(0);

  // Calculate translate from snap point
  const getTranslateForSnap = useCallback((s: SnapPoint) => {
    if (typeof window === 'undefined') return 0;
    const vh = window.innerHeight;
    switch (s) {
      case 'full': return 0;
      case 'half': return vh * 0.5;
      case 'collapsed': return vh - peekHeight;
    }
  }, [peekHeight]);

  useEffect(() => {
    if (!isDragging) {
      setCurrentTranslate(getTranslateForSnap(snap));
    }
  }, [snap, isDragging, getTranslateForSnap]);

  const handleDragStart = useCallback((clientY: number) => {
    setIsDragging(true);
    dragStartY.current = clientY;
    dragStartTranslate.current = currentTranslate;
  }, [currentTranslate]);

  const handleDragMove = useCallback((clientY: number) => {
    if (!isDragging) return;
    const delta = clientY - dragStartY.current;
    const newTranslate = Math.max(0, dragStartTranslate.current + delta);
    setCurrentTranslate(newTranslate);
  }, [isDragging]);

  const handleDragEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    
    const vh = window.innerHeight;
    const snapPoints: { point: SnapPoint; value: number }[] = [
      { point: 'full', value: 0 },
      { point: 'half', value: vh * 0.5 },
      { point: 'collapsed', value: vh - peekHeight },
    ];

    // Find closest snap point
    let closest = snapPoints[0];
    for (const sp of snapPoints) {
      if (Math.abs(currentTranslate - sp.value) < Math.abs(currentTranslate - closest.value)) {
        closest = sp;
      }
    }

    setCurrentTranslate(closest.value);
    onSnapChange?.(closest.point);
  }, [isDragging, currentTranslate, peekHeight, onSnapChange]);

  // Touch events
  const onTouchStart = (e: React.TouchEvent) => handleDragStart(e.touches[0].clientY);
  const onTouchMove = (e: React.TouchEvent) => handleDragMove(e.touches[0].clientY);
  const onTouchEnd = () => handleDragEnd();

  // Mouse events (for desktop testing)
  const onMouseDown = (e: React.MouseEvent) => {
    handleDragStart(e.clientY);
    const onMouseMove = (ev: MouseEvent) => handleDragMove(ev.clientY);
    const onMouseUp = () => {
      handleDragEnd();
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  if (!visible) return null;

  return (
    <div
      ref={sheetRef}
      className="fixed inset-x-0 bottom-0 z-40 bg-white rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.08)] safe-bottom"
      style={{
        transform: `translateY(${currentTranslate}px)`,
        transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
        height: '100dvh',
        touchAction: 'none',
      }}
    >
      {/* Drag handle */}
      <div
        className="flex items-center justify-center py-3 cursor-grab active:cursor-grabbing"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
      >
        <div className="bottom-sheet-handle" />
      </div>

      {/* Content */}
      <div className="overflow-y-auto scrollbar-hide" style={{ height: 'calc(100% - 28px)' }}>
        {children}
      </div>
    </div>
  );
}
