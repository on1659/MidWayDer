/**
 * MapClickSheet - 카카오맵 스타일 장소 정보 카드
 */

'use client';

import { Navigation, MapPin, X, Phone, ExternalLink, Share2 } from 'lucide-react';

interface MapClickSheetProps {
  name: string;
  address?: string;
  category?: string;
  phone?: string;
  placeUrl?: string;
  coords: { lat: number; lng: number };
  onSetStart: () => void;
  onSetEnd: () => void;
  onClose: () => void;
}

export default function MapClickSheet({
  name,
  address,
  category,
  phone,
  placeUrl,
  coords,
  onSetStart,
  onSetEnd,
  onClose,
}: MapClickSheetProps) {
  const handleShare = async () => {
    const url = placeUrl || `https://map.kakao.com/link/map/${encodeURIComponent(name)},${coords.lat},${coords.lng}`;
    if (navigator.share) {
      try { await navigator.share({ title: name, url }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      alert('링크가 복사되었습니다!');
    }
  };

  return (
    <div className="absolute bottom-0 inset-x-0 z-40 animate-slide-up md:inset-x-auto md:left-6 md:bottom-6 md:w-[380px]">
      <div className="mx-3 mb-3 md:mx-0 bg-white rounded-2xl shadow-lg shadow-black/10 overflow-hidden">
        {/* Header: name + close */}
        <div className="px-5 pt-4 pb-2 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold" style={{ color: 'var(--text-strong)' }}>{name}</h2>
              {placeUrl && (
                <a href={placeUrl} target="_blank" rel="noopener noreferrer"
                  className="shrink-0 text-gray-400 hover:text-blue-500 transition-colors">
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
            {category && (
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{category}</p>
            )}
          </div>
          <button onClick={onClose} className="shrink-0 p-1.5 -m-1.5 rounded-full hover:bg-gray-50 transition-colors">
            <X className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        {/* Address */}
        {address && address !== name && (
          <div className="px-5 pb-2">
            <p className="text-[15px] flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
              <MapPin className="w-4 h-4 shrink-0" />
              {address}
            </p>
          </div>
        )}

        {/* Phone */}
        {phone && (
          <div className="px-5 pb-2">
            <a href={`tel:${phone}`} className="text-[15px] flex items-center gap-1.5 transition-colors" style={{ color: 'var(--accent)' }}>
              <Phone className="w-4 h-4 shrink-0" />
              {phone}
            </a>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-gray-100 mx-5 my-2" />

        {/* Action icons row (카카오맵 스타일) */}
        <div className="flex items-center justify-around px-5 py-3">
          <button onClick={onSetStart} className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'var(--blue-100)' }}>
              <Navigation className="w-6 h-6" style={{ color: 'var(--accent)' }} />
            </div>
            <span className="text-xs font-medium" style={{ color: 'var(--text-strong)' }}>출발</span>
          </button>
          <button onClick={onSetEnd} className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'var(--pink-100)' }}>
              <MapPin className="w-6 h-6" style={{ color: 'var(--pink-500)' }} />
            </div>
            <span className="text-xs font-medium" style={{ color: 'var(--text-strong)' }}>도착</span>
          </button>
          <button onClick={handleShare} className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'var(--blue-150)' }}>
              <Share2 className="w-6 h-6" style={{ color: 'var(--text-muted)' }} />
            </div>
            <span className="text-xs font-medium" style={{ color: 'var(--text-strong)' }}>공유</span>
          </button>
          {placeUrl && (
            <a href={placeUrl} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform">
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'var(--kakao-yellow)' }}>
                <ExternalLink className="w-6 h-6" style={{ color: 'var(--kakao-brown)' }} />
              </div>
              <span className="text-xs font-medium" style={{ color: 'var(--text-strong)' }}>상세</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
