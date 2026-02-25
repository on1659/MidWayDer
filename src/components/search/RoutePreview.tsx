/**
 * RoutePreview - 검색 전 직통 경로 미리보기
 */

'use client';

import { Navigation } from 'lucide-react';

interface RoutePreviewProps {
  distance: number; // meters
  duration: number; // seconds
}

export default function RoutePreview({ distance, duration }: RoutePreviewProps) {
  const km = (distance / 1000).toFixed(1);
  const minutes = Math.round(duration / 60);

  return (
    <div
      className="mb-3 p-3 rounded-xl flex items-center gap-3"
      style={{ background: 'var(--blue-50)' }}
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
        style={{ background: 'var(--accent)' }}
      >
        <Navigation className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
          직통 경로
        </p>
        <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--accent)' }}>
          {km}km · {minutes}분
        </p>
      </div>
    </div>
  );
}
