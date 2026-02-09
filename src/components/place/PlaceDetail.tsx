/**
 * PlaceDetail - 장소 상세 바텀시트/카드
 *
 * 모바일: 하단 슬라이드업 시트
 * 데스크탑: 좌측 하단 플로팅 카드
 */

'use client';

import { useEffect, useState } from 'react';
import { X, Phone, MapPin, Clock, Star, Navigation } from 'lucide-react';
import type { DetourResult } from '@/types/detour';

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
  const { place, detourCost, finalScore } = waypoint;
  const address = place.roadAddress || place.address;

  useEffect(() => {
    // trigger enter animation
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
    finalScore >= 70 ? 'text-green-600' :
    finalScore >= 40 ? 'text-yellow-600' : 'text-red-500';

  return (
    <>
      {/* Backdrop (mobile only) */}
      <div
        className={`md:hidden fixed inset-0 z-40 bg-black/20 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={handleClose}
      />

      {/* Card */}
      <div
        className={[
          // shared
          'z-50 bg-white rounded-2xl shadow-lg transition-all duration-300 ease-out',
          // mobile: bottom sheet
          'fixed inset-x-0 bottom-0 md:inset-auto',
          'md:absolute md:left-6 md:bottom-6 md:w-[360px]',
          // animation
          visible
            ? 'translate-y-0 opacity-100'
            : 'translate-y-full md:translate-y-4 opacity-0',
        ].join(' ')}
      >
        {/* Drag handle (mobile) */}
        <div className="md:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        <div className="px-5 pt-3 pb-5 md:p-5">
          {/* Header: name + close */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-gray-900 truncate">{place.name}</h2>
                <span className="shrink-0 px-2 py-0.5 text-[11px] font-medium rounded-full bg-gray-100 text-gray-500">
                  {place.category}
                </span>
              </div>
              {address && (
                <p className="mt-1 text-sm text-gray-500 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{address}</span>
                </p>
              )}
            </div>
            <button
              onClick={handleClose}
              className="shrink-0 p-1.5 -m-1.5 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="닫기"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Badges row */}
          <div className="flex items-center gap-2 flex-wrap mb-4">
            {/* Distance badge */}
            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-600">
              <Navigation className="w-3 h-3" />
              {formatDistance(detourCost.distance)}
            </span>
            {/* Duration badge */}
            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-orange-50 text-orange-600">
              <Clock className="w-3 h-3" />
              {formatDuration(detourCost.duration)}
            </span>
            {/* Score */}
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-50 ${scoreColor}`}>
              <Star className="w-3 h-3" />
              추천 {Math.round(finalScore)}점
            </span>
          </div>

          {/* Phone */}
          {place.phone && (
            <a
              href={`tel:${place.phone}`}
              className="flex items-center gap-2 text-sm text-gray-600 mb-4 hover:text-blue-600 transition-colors"
            >
              <Phone className="w-4 h-4" />
              {place.phone}
            </a>
          )}

          {/* CTA */}
          <button
            onClick={handleConfirm}
            className="w-full py-3 bg-blue-500 text-white text-sm font-semibold rounded-xl hover:bg-blue-600 active:scale-[0.98] transition-all"
          >
            경유지로 설정
          </button>
        </div>
      </div>
    </>
  );
}
