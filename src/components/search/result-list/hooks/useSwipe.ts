'use client';

import { useState, useRef, useCallback } from 'react';
import type { DetourResult } from '@/types/detour';
import { copyToClipboard } from '@/lib/clipboard';
import { openNavigationApp, getPreferredNavApp } from '@/lib/navigation-links';
import type { NavApp } from '@/lib/navigation-links';
import { logger } from '@/lib/logger';

interface SwipeCallbacks {
  onOpenNaviSheet: (place: DetourResult['place']) => void;
}

interface UseSwipeReturn {
  swipeVisual: { id: string; deltaX: number } | null;
  swipeHintId: string | null;
  swipeHintDeltaX: number;
  handlers: {
    onTouchStart: (e: React.TouchEvent, id: string) => void;
    onTouchMove: (e: React.TouchEvent, id: string) => void;
    onTouchEnd: (result: DetourResult) => void;
  };
  setCopiedId: (id: string | null) => void;
  copiedId: string | null;
  initHintAnimation: (firstId: string) => void;
}

export function useSwipe(callbacks: SwipeCallbacks): UseSwipeReturn {
  const swipeInfoRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    deltaX: number;
    locked: boolean;
  } | null>(null);

  const [swipeVisual, setSwipeVisual] = useState<{ id: string; deltaX: number } | null>(null);
  const [swipeHintId, setSwipeHintId] = useState<string | null>(null);
  const [swipeHintDeltaX, setSwipeHintDeltaX] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent, id: string) => {
    swipeInfoRef.current = {
      id,
      startX: e.touches[0].clientX,
      startY: e.touches[0].clientY,
      deltaX: 0,
      locked: false,
    };
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent, id: string) => {
    const info = swipeInfoRef.current;
    if (!info || info.id !== id) return;
    const deltaX = e.touches[0].clientX - info.startX;
    const deltaY = e.touches[0].clientY - info.startY;
    if (!info.locked) {
      if (Math.abs(deltaX) < 8 && Math.abs(deltaY) < 8) return;
      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        swipeInfoRef.current = null;
        setSwipeVisual(null);
        return;
      }
      info.locked = true;
    }
    info.deltaX = deltaX;
    setSwipeVisual({ id, deltaX });
  }, []);

  const onTouchEnd = useCallback((result: DetourResult) => {
    const info = swipeInfoRef.current;
    swipeInfoRef.current = null;
    setSwipeVisual(null);
    if (!info || info.id !== result.place.id || !info.locked) return;
    const preferredNavApp = getPreferredNavApp();
    if (info.deltaX > 80) {
      if (preferredNavApp) {
        openNavigationApp(preferredNavApp as NavApp, result.place.coordinates.lat, result.place.coordinates.lng, result.place.name)
          .catch((err) => logger.error('[Navigation] Failed:', err));
      } else {
        callbacks.onOpenNaviSheet(result.place);
      }
    } else if (info.deltaX < -80) {
      const address = result.place.roadAddress || result.place.address;
      if (address) {
        copyToClipboard(address).then((success) => {
          if (success) {
            setCopiedId(result.place.id);
            setTimeout(() => setCopiedId(null), 2000);
          }
        });
      }
    }
  }, [callbacks]);

  const initHintAnimation = useCallback((firstId: string) => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem('swipe-hint-shown')) return;
    const t0 = setTimeout(() => { setSwipeHintId(firstId); setSwipeHintDeltaX(62); }, 900);
    const t1 = setTimeout(() => setSwipeHintDeltaX(0), 1350);
    const t2 = setTimeout(() => setSwipeHintDeltaX(-62), 1650);
    const t3 = setTimeout(() => {
      setSwipeHintDeltaX(0);
      setSwipeHintId(null);
      localStorage.setItem('swipe-hint-shown', '1');
    }, 2100);
    return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return {
    swipeVisual,
    swipeHintId,
    swipeHintDeltaX,
    handlers: { onTouchStart, onTouchMove, onTouchEnd },
    setCopiedId,
    copiedId,
    initHintAnimation,
  };
}
