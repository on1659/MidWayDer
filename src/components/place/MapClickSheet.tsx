/**
 * MapClickSheet - 지도 클릭 시 파스텔 스타일 바텀시트
 */

'use client';

import { Navigation, MapPin, X } from 'lucide-react';

interface MapClickSheetProps {
  name: string;
  address?: string;
  coords: { lat: number; lng: number };
  onSetStart: () => void;
  onSetEnd: () => void;
  onClose: () => void;
}

export default function MapClickSheet({
  name,
  address,
  coords,
  onSetStart,
  onSetEnd,
  onClose,
}: MapClickSheetProps) {
  return (
    <div className="absolute bottom-0 inset-x-0 z-40 animate-slide-up">
      <div className="mx-3 mb-3 bg-white rounded-2xl shadow-lg shadow-black/8 overflow-hidden">
        {/* Handle + Close */}
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <div className="w-8 h-1 rounded-full bg-gray-200" />
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-50 transition-colors">
            <X className="w-4 h-4" style={{ color: '#8B95A5' }} />
          </button>
        </div>

        {/* Address */}
        <div className="px-4 pb-3">
          <div className="flex items-start gap-2.5">
            <MapPin className="w-6 h-6 mt-0.5 shrink-0" style={{ color: '#FF8FA3' }} />
            <div className="min-w-0 flex-1">
              <p className="text-[17px] font-bold leading-snug" style={{ color: '#2D3748' }}>{name}</p>
              {address && address !== name && (
                <p className="text-[14px] mt-1" style={{ color: '#8B95A5' }}>{address}</p>
              )}
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-2 px-4 pb-4">
          <button
            onClick={onSetStart}
            className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-[16px] text-white active:scale-[0.97] transition-transform"
            style={{ background: '#6C9CFF' }}
          >
            <Navigation className="w-5 h-5" />
            출발지로
          </button>
          <button
            onClick={onSetEnd}
            className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-[16px] text-white active:scale-[0.97] transition-transform"
            style={{ background: '#FF8FA3' }}
          >
            <MapPin className="w-5 h-5" />
            도착지로
          </button>
        </div>
      </div>
    </div>
  );
}
