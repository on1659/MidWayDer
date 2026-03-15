'use client';

import type { DetourResult } from '@/types/detour';

interface StickyBarProps {
  bestResult: DetourResult | null;
  showStickyBar: boolean;
  onQuickGo: () => void;
}

export function StickyBar({ bestResult, showStickyBar, onQuickGo }: StickyBarProps) {
  if (!showStickyBar || !bestResult) return null;

  const bMin = Math.round(bestResult.detourCost.duration / 60);
  const bKm = ((bestResult.detourCost?.distance ?? 0) / 1000).toFixed(1);

  return (
    <div
      className="sticky bottom-0 left-0 right-0 z-10 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg"
      style={{
        background: 'linear-gradient(135deg, var(--bg-surface), var(--blue-50))',
        border: '1.5px solid var(--blue-200)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <span className="text-lg shrink-0">🏆</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
          {bestResult.place.name}
        </p>
        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
          베스트 픽 · +{bMin}분 · +{bKm}km
        </p>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onQuickGo(); }}
        className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95"
        style={{ background: 'var(--accent)', color: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.18)' }}
      >
        🚀 바로 출발
      </button>
    </div>
  );
}
