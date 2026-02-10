/**
 * BottomSheet - 파스텔 스타일 바텀시트
 */

'use client';

import { useRef, useCallback, useEffect, useState } from 'react';

type SnapPoint = 'collapsed' | 'half' | 'full';

interface BottomSheetProps {
  children: React.ReactNode;
  peekHeight?: number;
  snap?: SnapPoint;
  onSnapChange?: (snap: SnapPoint) => void;
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

    let closest = snapPoints[0];
    for (const sp of snapPoints) {
      if (Math.abs(currentTranslate - sp.value) < Math.abs(currentTranslate - closest.value)) {
        closest = sp;
      }
    }

    setCurrentTranslate(closest.value);
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
      className="fixed inset-x-0 bottom-0 z-40 bg-white rounded-t-3xl safe-bottom"
      style={{
        transform: `translateY(${currentTranslate}px)`,
        transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
        height: '100dvh',
        touchAction: 'none',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.06)',
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

      <div className="overflow-y-auto scrollbar-hide" style={{ height: 'calc(100% - 28px)' }}>
        {children}
      </div>
    </div>
  );
}
