'use client';

import { MapPin, Navigation, Flag, X } from 'lucide-react';
import type { AddressSelection } from '@/components/search/AddressInput';

/** 카테고리 → 이모지 매핑 (목업 화면 3 정합성) */
function getCategoryEmoji(category?: string): string | null {
  if (!category) return null;
  const c = category;
  if (c.includes('지하철')) return '🚇';
  if (c.includes('역')) return '🚉';
  if (c.includes('카페') || c.includes('스타벅스')) return '☕';
  if (c.includes('편의점')) return '🏪';
  if (c.includes('다이소')) return '🏬';
  if (c.includes('올리브영') || c.includes('화장품')) return '💄';
  if (c.includes('맥도날드') || c.includes('버거')) return '🍔';
  if (c.includes('주유소')) return '⛽';
  if (c.includes('약국')) return '💊';
  if (c.includes('병원')) return '🏥';
  if (c.includes('은행')) return '🏦';
  if (c.includes('마트')) return '🛒';
  return null;
}

interface PlaceDetailSheetProps {
  place: AddressSelection | null;
  onClose: () => void;
  onSetAsStart: () => void;
  onSetAsEnd: () => void;
  startSelected?: boolean;
  endSelected?: boolean;
  /** 현재 위치 기준 거리 (m). 있으면 거리 뱃지 표시 */
  distanceMeters?: number | null;
  /** 영업 상태 라벨 (예: "운영 중"). 있으면 뱃지 표시 */
  businessLabel?: string | null;
}

export default function PlaceDetailSheet({
  place,
  onClose,
  onSetAsStart,
  onSetAsEnd,
  startSelected = false,
  endSelected = false,
  distanceMeters = null,
  businessLabel = null,
}: PlaceDetailSheetProps) {
  if (!place) return null;

  const title = place.name || place.address;
  const subtitle = place.placeAddress || (place.name ? place.address : '');
  const distanceText = (() => {
    if (distanceMeters == null) return null;
    if (distanceMeters < 1000) return `현 위치 ${Math.round(distanceMeters)}m`;
    return `현 위치 ${(distanceMeters / 1000).toFixed(1)}km`;
  })();

  return (
    <>
      <div
        className="fixed inset-0 z-[80]"
        style={{ background: 'rgba(0, 0, 0, 0.2)' }}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="fixed bottom-0 left-0 right-0 z-[90] flex max-h-[80dvh] flex-col rounded-t-3xl"
        style={{
          background: 'var(--bg-surface)',
          boxShadow: '0 -8px 24px rgba(0, 0, 0, 0.08)',
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)',
          animation: 'sheet-slide-up 280ms cubic-bezier(0.32, 0.72, 0, 1)',
        }}
        role="dialog"
        aria-modal="true"
        aria-label={`${title} 정보`}
      >
        <style jsx>{`
          @keyframes sheet-slide-up {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }
        `}</style>

        <div className="flex flex-shrink-0 justify-center pt-2 pb-1">
          <div
            className="h-1.5 w-9 rounded-full"
            style={{ background: 'var(--border-strong)' }}
          />
        </div>

        <div className="flex-1 overflow-y-auto px-5 pt-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-1 items-start gap-3">
              <div
                className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-2xl"
                style={{
                  background: 'rgba(var(--color-accent-rgb), 0.1)',
                  color: 'var(--accent)',
                }}
              >
                {getCategoryEmoji(place.category) ?? <MapPin className="h-6 w-6" />}
              </div>
              <div className="min-w-0 flex-1">
                <div
                  className="text-lg font-bold leading-tight"
                  style={{ color: 'var(--text-primary)', letterSpacing: '-0.3px' }}
                >
                  {title}
                </div>
                {subtitle && (
                  <div
                    className="mt-1 text-sm leading-snug"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {subtitle}
                  </div>
                )}
                {(place.category || businessLabel || distanceText) && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {place.category && (
                      <span
                        className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                        style={{
                          background: 'var(--bg-surface-muted)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {place.category}
                      </span>
                    )}
                    {businessLabel && (
                      <span
                        className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                        style={{
                          background: 'var(--bg-surface-muted)',
                          color: 'var(--color-success-current)',
                        }}
                      >
                        ● {businessLabel}
                      </span>
                    )}
                    {distanceText && (
                      <span
                        className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                        style={{
                          background: 'rgba(var(--color-accent-rgb), 0.1)',
                          color: 'var(--accent)',
                        }}
                      >
                        {distanceText}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
              style={{ background: 'var(--bg-surface-muted)', color: 'var(--text-secondary)' }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-shrink-0 px-5 pt-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onSetAsStart}
              className="flex items-center justify-center gap-1.5 rounded-xl py-3.5 text-sm font-semibold transition"
              style={{
                background: startSelected ? 'var(--accent)' : 'var(--bg-surface-muted)',
                color: startSelected ? 'var(--text-on-accent, #fff)' : 'var(--text-primary)',
                border: '1px solid var(--border-soft)',
              }}
            >
              <Navigation className="h-4 w-4" style={{ color: startSelected ? '#fff' : 'var(--accent)' }} />
              {startSelected ? '출발지로 설정됨' : '출발지로 설정'}
            </button>
            <button
              type="button"
              onClick={onSetAsEnd}
              className="flex items-center justify-center gap-1.5 rounded-xl py-3.5 text-sm font-semibold transition"
              style={{
                background: endSelected ? 'var(--accent)' : 'var(--accent)',
                color: '#fff',
                opacity: endSelected ? 0.8 : 1,
              }}
            >
              <Flag className="h-4 w-4" />
              {endSelected ? '도착지로 설정됨' : '도착지로 설정'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
