/**
 * PlaceDetail - 경유지 상세 바텀시트 (파스텔 스타일)
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { X, Phone, MapPin, Clock, Star, Navigation, Copy, Check, Share2, CheckCircle, MapPinCheckInside } from 'lucide-react';
import type { DetourResult } from '@/types/detour';
import { useRouteStore } from '@/store/route-store';
import { openNavigationApp, getKakaoNaviLinkWithWaypoint } from '@/lib/navigation-links';
import { copyToClipboard } from '@/lib/clipboard';
import { generateShareUrl, shareUrl } from '@/lib/share';
import { recordVisit } from '@/lib/visit-tracking';
import { hashRoute } from '@/lib/utils/route-hash';
import { getBusinessStatus, formatBusinessHours } from '@/lib/business-hours';

interface PlaceDetailProps {
  waypoint: DetourResult;
  onClose: () => void;
  onConfirm: (waypoint: DetourResult) => void;
  variant?: 'floating' | 'desktop-pane';
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

export default function PlaceDetail({ waypoint, onClose, onConfirm, variant = 'floating' }: PlaceDetailProps) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [gpsVerifying, setGpsVerifying] = useState(false);
  const [gpsResult, setGpsResult] = useState<{ verified: boolean; message: string; points?: number; totalPoints?: number; tier?: string } | null>(null);
  const start = useRouteStore((s) => s.start);
  const end = useRouteStore((s) => s.end);
  const { place, detourCost, finalScore } = waypoint;
  const address = place.roadAddress || place.address;
  const isDesktopPane = variant === 'desktop-pane';

  // 경로 해시 계산
  const routeHash = start?.coordinates && end?.coordinates 
    ? hashRoute(start.coordinates, end.coordinates)
    : '';

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 300);
  }, [onClose]);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  // Esc 키로 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClose]);

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
    // 출발지/도착지가 있으면 경유지 포함 딥링크 사용 (카카오내비만 지원)
    if (app === 'kakao' && start?.coordinates && end?.coordinates) {
      const deepLink = getKakaoNaviLinkWithWaypoint(
        start.coordinates,
        { ...place.coordinates, name: place.name },
        end.coordinates
      );
      window.open(deepLink, '_self');
    } else {
      openNavigationApp(app, place.coordinates.lat, place.coordinates.lng, place.name);
    }
  };

  const handleShareWaypoint = async () => {
    if (!start?.address || !end?.address) return;
    const url = generateShareUrl({
      start: start.address,
      end: end.address,
      category: place.category,
      waypointId: place.id,
    });
    const success = await shareUrl({
      url,
      title: `미드웨이더 - ${place.name}`,
      text: `${start.address} → ${end.address} 경로에 있는 ${place.name} 추천해요!`,
    });
    if (success) {
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 2000);
    }
  };

  const handleGpsVerify = async () => {
    if (!navigator.geolocation) {
      setGpsResult({ verified: false, message: 'GPS를 지원하지 않는 기기예요' });
      return;
    }
    setGpsVerifying(true);
    setGpsResult(null);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        })
      );
      const { latitude, longitude } = position.coords;
      const res = await fetch('/api/verify-visit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeId: place.id, userLat: latitude, userLng: longitude }),
      });
      const data = await res.json();
      setGpsResult(data);
      if (data.verified && routeHash) {
        recordVisit(place.id, place.name, place.category, routeHash);
      }
    } catch {
      setGpsResult({ verified: false, message: 'GPS 권한이 필요해요. 설정에서 허용해주세요.' });
    } finally {
      setGpsVerifying(false);
    }
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
      {!isDesktopPane && (
        <div
          className={`md:hidden fixed inset-0 z-40 bg-black/20 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          onClick={handleClose}
        />
      )}

      {/* Card */}
      <div
        className={
          isDesktopPane
            ? 'hidden md:block md:w-[440px] md:shrink-0 z-20 h-dvh overflow-y-auto'
            : [
                'z-50 rounded-2xl shadow-lg transition-all duration-300 ease-out',
                'fixed inset-x-0 bottom-0 md:inset-auto',
                'md:absolute md:left-6 md:bottom-6 md:w-[360px]',
                visible
                  ? 'translate-y-0 opacity-100'
                  : 'translate-y-full md:translate-y-4 opacity-0',
              ].join(' ')
        }
        style={{
          background: 'var(--surface-1)',
          borderLeft: isDesktopPane ? '1px solid var(--border-soft)' : undefined,
          boxShadow: isDesktopPane ? 'var(--shadow-2)' : undefined,
        }}
      >
        {/* Drag handle */}
        {!isDesktopPane && (
          <div className="md:hidden flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border-soft)' }} />
          </div>
        )}

        <div className={isDesktopPane ? 'px-6 py-6' : 'px-5 pt-3 pb-5 md:p-5'}>
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
                    className="shrink-0 p-1.5 rounded-lg hover:opacity-80 transition-colors active:scale-95"
                    style={{ background: 'var(--bg-surface-muted)' }}
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
              className="shrink-0 p-1.5 -m-1.5 rounded-full hover:opacity-80 transition-colors"
              style={{ background: 'var(--bg-surface-muted)' }}
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
            {/* 영업 상태 뱃지 */}
            {place.businessHours && (() => {
              const status = getBusinessStatus(place.businessHours);
              if (status.label === '정보 없음') return null;
              return (
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-full"
                  style={{
                    background: status.isOpen ? 'var(--green-100)' : 'var(--red-100)',
                    color: status.color,
                  }}
                  title={formatBusinessHours(place.businessHours)}
                >
                  <Clock className="w-4 h-4" />
                  {status.emoji} {status.label}
                </span>
              );
            })()}
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

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button
              onClick={handleShareWaypoint}
              className="py-3 rounded-xl text-sm font-semibold transition-all active:scale-95 flex items-center justify-center gap-2"
              style={{ 
                background: shareSuccess ? 'var(--green-100)' : 'var(--blue-100)', 
                color: shareSuccess ? 'var(--green-700)' : 'var(--accent)' 
              }}
            >
              {shareSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  완료
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  공유
                </>
              )}
            </button>

            <button
              onClick={handleGpsVerify}
              disabled={gpsVerifying || (gpsResult?.verified === true)}
              className="py-3 rounded-xl text-sm font-semibold transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60"
              style={{
                background:
                  gpsResult?.verified
                    ? 'var(--green-100)'
                    : 'var(--purple-100)',
                color:
                  gpsResult?.verified
                    ? 'var(--green-700)'
                    : 'var(--purple-600)',
              }}
              title="GPS로 방문 인증하고 포인트 받기"
            >
              {gpsVerifying ? (
                <>
                  <MapPinCheckInside className="w-4 h-4 animate-pulse" />
                  인증 중...
                </>
              ) : gpsResult?.verified ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  인증 완료
                </>
              ) : (
                <>
                  <MapPinCheckInside className="w-4 h-4" />
                  방문 인증 +10P
                </>
              )}
            </button>
          </div>

          {/* GPS 인증 결과 메시지 */}
          {gpsResult && (
            <div
              className="mb-3 px-3 py-2.5 rounded-xl text-sm font-medium"
              style={{
                background: gpsResult.verified ? 'var(--green-50)' : 'var(--pink-50)',
                color: gpsResult.verified ? 'var(--green-700)' : 'var(--red-600)',
                border: `1px solid ${gpsResult.verified ? 'var(--green-200)' : 'var(--pink-200)'}`,
              }}
            >
              {gpsResult.message}
              {gpsResult.verified && gpsResult.tier && (
                <span className="ml-2 text-xs font-bold px-1.5 py-0.5 rounded" style={{ background: 'var(--green-200)' }}>
                  {gpsResult.tier.toUpperCase()}
                </span>
              )}
            </div>
          )}

          {/* Navigation Apps */}
          <div className="mb-3">
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>내비게이션 앱으로 열기</p>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleNavigate('kakao')}
                className="py-2.5 px-3 rounded-xl text-sm font-semibold transition-all active:scale-95 flex items-center justify-center gap-1.5"
                style={{ background: '#FEE500', color: '#3C1E1E' }}
                aria-label="카카오내비로 열기"
              >
                <Navigation className="w-4 h-4" />
                카카오
              </button>
              <button
                onClick={() => handleNavigate('naver')}
                className="py-2.5 px-3 rounded-xl text-sm font-semibold transition-all active:scale-95 flex items-center justify-center gap-1.5"
                style={{ background: '#03C75A', color: 'white' }}
                aria-label="네이버지도로 열기"
              >
                <Navigation className="w-4 h-4" />
                네이버
              </button>
              <button
                onClick={() => handleNavigate('tmap')}
                className="py-2.5 px-3 rounded-xl text-sm font-semibold transition-all active:scale-95 flex items-center justify-center gap-1.5"
                style={{ background: '#E94235', color: 'white' }}
                aria-label="티맵으로 열기"
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
