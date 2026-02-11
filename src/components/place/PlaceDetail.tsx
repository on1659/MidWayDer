/**
 * PlaceDetail - 경유지 상세 바텀시트 (파스텔 스타일)
 */

'use client';

import { useEffect, useState } from 'react';
import { X, Phone, MapPin, Clock, Star, Navigation, ExternalLink } from 'lucide-react';
import type { DetourResult } from '@/types/detour';
import { useRouteStore } from '@/store/route-store';

interface PlaceDetailProps {
  waypoint: DetourResult;
  onClose: () => void;
  onConfirm: (waypoint: DetourResult) => void;
}

function formatDistance(meters: number): string {
  if (meters >= 1000) return `+${(meters / 1000).toFixed(1)}km`;
  return `+${Math.round(meters)}m`;
}

function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins >= 60) return `+${Math.floor(mins / 60)}시간 ${mins % 60}분`;
  return `+${mins}분`;
}

export default function PlaceDetail({ waypoint, onClose, onConfirm }: PlaceDetailProps) {
  const [visible, setVisible] = useState(false);
  const start = useRouteStore((s) => s.start);
  const { place, detourCost, finalScore } = waypoint;
  const address = place.roadAddress || place.address;

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  const handleConfirm = () => {
    onConfirm(waypoint);
    handleClose();
  };

  const scoreColor =
    finalScore >= 70 ? '#2D8F5E' :
    finalScore >= 40 ? '#D4850F' : '#E85D5D';

  const scoreBg =
    finalScore >= 70 ? '#E6F7ED' :
    finalScore >= 40 ? '#FFF4E5' : '#FFF0F3';

  return (
    <>
      {/* Backdrop */}
      <div
        className={`md:hidden fixed inset-0 z-40 bg-black/20 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={handleClose}
      />

      {/* Card */}
      <div
        className={[
          'z-50 bg-white rounded-2xl shadow-lg transition-all duration-300 ease-out',
          'fixed inset-x-0 bottom-0 md:inset-auto',
          'md:absolute md:left-6 md:bottom-6 md:w-[360px]',
          visible
            ? 'translate-y-0 opacity-100'
            : 'translate-y-full md:translate-y-4 opacity-0',
        ].join(' ')}
      >
        {/* Drag handle */}
        <div className="md:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        <div className="px-5 pt-3 pb-5 md:p-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold truncate" style={{ color: '#2D3748' }}>{place.name}</h2>
                <span
                  className="shrink-0 px-3 py-1 text-[13px] font-medium rounded-full"
                  style={{ background: '#F0F4FF', color: '#6C9CFF' }}
                >
                  {place.category}
                </span>
              </div>
              {address && (
                <p className="mt-1.5 text-[15px] flex items-center gap-1.5" style={{ color: '#8B95A5' }}>
                  <MapPin className="w-4 h-4 shrink-0" />
                  <span className="truncate">{address}</span>
                </p>
              )}
            </div>
            <button
              onClick={handleClose}
              className="shrink-0 p-1.5 -m-1.5 rounded-full hover:bg-gray-50 transition-colors"
              aria-label="닫기"
            >
              <X className="w-5 h-5" style={{ color: '#8B95A5' }} />
            </button>
          </div>

          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap mb-4">
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-full"
              style={{ background: '#E8F0FE', color: '#4A7AE8' }}
            >
              <Navigation className="w-4 h-4" />
              {formatDistance(detourCost.distance)}
            </span>
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-full"
              style={{ background: '#FFF4E5', color: '#D4850F' }}
            >
              <Clock className="w-4 h-4" />
              {formatDuration(detourCost.duration)}
            </span>
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-full"
              style={{ background: scoreBg, color: scoreColor }}
            >
              <Star className="w-4 h-4" />
              추천 {Math.round(finalScore)}점
            </span>
          </div>

          {/* Phone */}
          {place.phone && (
            <a
              href={`tel:${place.phone}`}
              className="flex items-center gap-2 text-sm mb-4 transition-colors"
              style={{ color: '#6C9CFF' }}
            >
              <Phone className="w-4 h-4" />
              {place.phone}
            </a>
          )}

          {/* CTA */}
          <div className="flex gap-2">
            <button
              onClick={handleConfirm}
              className="flex-1 py-4 text-white text-base font-bold rounded-2xl active:scale-[0.98] transition-all shadow-md"
              style={{ background: '#7ED6A8' }}
            >
              경유지로 선택
            </button>
            <button
              onClick={() => {
                const wp = place.coordinates;
                const name = encodeURIComponent(place.name);
                if (start?.coordinates) {
                  // Try kakaomap app first
                  const appUrl = `kakaomap://route?sp=${start.coordinates.lat},${start.coordinates.lng}&ep=${wp.lat},${wp.lng}&by=CAR`;
                  const webUrl = `https://map.kakao.com/link/to/${name},${wp.lat},${wp.lng}`;
                  const w = window.open(appUrl, '_blank');
                  setTimeout(() => {
                    try { if (!w || w.closed) window.open(webUrl, '_blank'); } catch { window.open(webUrl, '_blank'); }
                  }, 1500);
                } else {
                  window.open(`https://map.kakao.com/link/to/${name},${wp.lat},${wp.lng}`, '_blank');
                }
              }}
              className="px-5 py-4 text-base font-bold rounded-2xl active:scale-[0.98] transition-all shadow-md flex items-center gap-2"
              style={{ background: '#FEE500', color: '#3C1E1E' }}
            >
              <ExternalLink className="w-4 h-4" />
              길안내
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
