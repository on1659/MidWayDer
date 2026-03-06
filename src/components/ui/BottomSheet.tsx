/**
 * BottomSheet - 파스텔 스타일 바텀시트
 */

'use client';

import { useRef, useCallback, useState } from 'react';

type SnapPoint = 'collapsed' | 'half' | 'full';

interface BottomSheetProps {
  children: React.ReactNode;
  peekHeight?: number;
  snap?: SnapPoint;
  onSnapChange?: (snap: SnapPoint) => void;
  visible?: boolean;
  contentRef?: React.RefObject<HTMLDivElement | null>;
}

export default function BottomSheet({
  children,
  peekHeight = 140,
  snap = 'collapsed',
  onSnapChange,
  visible = true,
  contentRef,
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);
  const dragStartTranslate = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragTranslate, setDragTranslate] = useState(0);

  const getTranslateForSnap = useCallback((s: SnapPoint) => {
    if (typeof window === 'undefined') return 0;
    const vh = window.innerHeight;
    switch (s) {
      case 'full': return 0;
      case 'half': return vh * 0.5;
      case 'collapsed': return vh - peekHeight;
    }
  }, [peekHeight]);

  // 드래그 중이면 dragTranslate, 아니면 snap prop에서 직접 파생
  const currentTranslate = isDragging ? dragTranslate : getTranslateForSnap(snap);

  const handleDragStart = useCallback((clientY: number) => {
    setIsDragging(true);
    dragStartY.current = clientY;
    dragStartTranslate.current = currentTranslate;
  }, [currentTranslate]);

  const handleDragMove = useCallback((clientY: number) => {
    if (!isDragging) return;
    const delta = clientY - dragStartY.current;
    const newTranslate = Math.max(0, dragStartTranslate.current + delta);
    setDragTranslate(newTranslate);
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

    let closest = snapPoints[0];
    for (const sp of snapPoints) {
      if (Math.abs(currentTranslate - sp.value) < Math.abs(currentTranslate - closest.value)) {
        closest = sp;
      }
    }

    onSnapChange?.(closest.point);
  }, [isDragging, currentTranslate, peekHeight, onSnapChange]);

  const onTouchStart = (e: React.TouchEvent) => handleDragStart(e.touches[0].clientY);
  const onTouchMove = (e: React.TouchEvent) => handleDragMove(e.touches[0].clientY);
  const onTouchEnd = () => handleDragEnd();

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
      className="fixed inset-x-0 bottom-0 z-40 rounded-t-3xl safe-bottom-full"
      style={{
        background: 'var(--bg-surface)',
        transform: `translateY(${currentTranslate}px)`,
        transition: isDragging ? 'none' : 'transform 0.22s cubic-bezier(0.32, 0.72, 0, 1)',
        height: '100dvh',
        touchAction: 'none',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.06)',
      }}
    >
      {/* Drag handle */}
      <div
        className="flex items-center justify-center h-14 cursor-grab active:cursor-grabbing"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        aria-label="드래그하여 패널 조절"
        role="slider"
        aria-valuenow={snap === 'full' ? 100 : snap === 'half' ? 50 : 0}
      >
        <div
          className={`
            w-14 h-2
            rounded-full
            mx-auto
            transition-all duration-200
            ${isDragging
              ? 'bg-blue-500 dark:bg-blue-400 scale-x-125'
              : 'bg-gray-400 dark:bg-gray-600'}
          `}
        />
      </div>

      <div ref={contentRef} className="overflow-y-auto scrollbar-hide" style={{ height: 'calc(100% - 28px)' }}>
        {children}
      </div>
    </div>
  );
}
