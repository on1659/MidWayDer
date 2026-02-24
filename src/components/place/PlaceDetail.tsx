/**
 * PlaceDetail - 경유지 상세 바텀시트 (파스텔 스타일)
 */

'use client';

import { useEffect, useState } from 'react';
import { X, Phone, MapPin, Clock, Star, Navigation, ExternalLink, Copy, Check } from 'lucide-react';
import type { DetourResult } from '@/types/detour';
import { useRouteStore } from '@/store/route-store';
import { openNavigationApp } from '@/lib/navigation-links';
import { copyToClipboard } from '@/lib/clipboard';

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
  const [copied, setCopied] = useState(false);
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

  const handleCopyAddress = async () => {
    if (!address) return;
    const success = await copyToClipboard(address);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      alert('복사 실패');
    }
  };

  const handleNavigate = (app: 'kakao' | 'naver' | 'tmap') => {
    openNavigationApp(app, place.coordinates.lat, place.coordinates.lng, place.name);
  };

  const scoreColor =
    finalScore >= 70 ? 'var(--green-700)' :
    finalScore >= 40 ? 'var(--orange-600)' : 'var(--red-500)';

  const scoreBg =
    finalScore >= 70 ? 'var(--green-100)' :
    finalScore >= 40 ? 'var(--orange-100)' : 'var(--pink-100)';

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
                <h2 className="text-xl font-bold truncate" style={{ color: 'var(--text-strong)' }}>{place.name}</h2>
                <span
                  className="shrink-0 px-3 py-1 text-[13px] font-medium rounded-full"
                  style={{ background: 'var(--blue-150)', color: 'var(--accent)' }}
                >
                  {place.category}
                </span>
              </div>
              {address && (
                <div className="mt-1.5 flex items-center gap-2">
                  <p className="text-[15px] flex items-center gap-1.5 min-w-0 flex-1" style={{ color: 'var(--text-muted)' }}>
                    <MapPin className="w-4 h-4 shrink-0" />
                    <span className="truncate">{address}</span>
                  </p>
                  <button
                    onClick={handleCopyAddress}
                    className="shrink-0 p-1.5 rounded-lg hover:bg-gray-100 transition-colors active:scale-95"
                    title="주소 복사"
                  >
                    {copied ? (
                      <Check className="w-4 h-4" style={{ color: 'var(--green-600)' }} />
                    ) : (
                      <Copy className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                    )}
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={handleClose}
              className="shrink-0 p-1.5 -m-1.5 rounded-full hover:bg-gray-50 transition-colors"
              aria-label="닫기"
            >
              <X className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
            </button>
          </div>

          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap mb-4">
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-full"
              style={{ background: 'var(--blue-100)', color: 'var(--blue-600)' }}
            >
              <Navigation className="w-4 h-4" />
              {formatDistance(detourCost.distance)}
            </span>
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-full"
              style={{ background: 'var(--orange-100)', color: 'var(--orange-600)' }}
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
              style={{ color: 'var(--accent)' }}
            >
              <Phone className="w-4 h-4" />
              {place.phone}
            </a>
          )}

          {/* Navigation Apps */}
          <div className="mb-3">
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>네비게이션 앱으로 열기</p>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleNavigate('kakao')}
                className="py-2.5 px-3 rounded-xl text-sm font-semibold transition-all active:scale-95 flex items-center justify-center gap-1.5"
                style={{ background: '#FEE500', color: '#3C1E1E' }}
              >
                <Navigation className="w-4 h-4" />
                카카오
              </button>
              <button
                onClick={() => handleNavigate('naver')}
                className="py-2.5 px-3 rounded-xl text-sm font-semibold transition-all active:scale-95 flex items-center justify-center gap-1.5"
                style={{ background: '#03C75A', color: 'white' }}
              >
                <Navigation className="w-4 h-4" />
                네이버
              </button>
              <button
                onClick={() => handleNavigate('tmap')}
                className="py-2.5 px-3 rounded-xl text-sm font-semibold transition-all active:scale-95 flex items-center justify-center gap-1.5"
                style={{ background: '#E94235', color: 'white' }}
              >
                <Navigation className="w-4 h-4" />
                티맵
              </button>
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={handleConfirm}
            className="w-full py-4 text-white text-base font-bold rounded-2xl active:scale-[0.98] transition-all shadow-md"
            style={{ background: 'var(--accent)' }}
          >
            경유지로 선택
          </button>
        </div>
      </div>
    </>
  );
}
