/**
 * MapClickSheet - 지도 클릭 시 주소 + 출발/도착 설정 시트
 */

'use client';

import { Navigation, MapPin, X } from 'lucide-react';

interface MapClickSheetProps {
  address: string;
  coords: { lat: number; lng: number };
  onSetStart: () => void;
  onSetEnd: () => void;
  onClose: () => void;
}

export default function MapClickSheet({
  address,
  coords,
  onSetStart,
  onSetEnd,
  onClose,
}: MapClickSheetProps) {
  return (
    <div className="absolute bottom-0 inset-x-0 z-40 animate-in slide-in-from-bottom duration-200">
      <div className="mx-3 mb-3 bg-white rounded-2xl shadow-lg shadow-black/10 overflow-hidden">
        {/* Handle + Close */}
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <div className="w-8 h-1 rounded-full bg-gray-300" />
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Address */}
        <div className="px-4 pb-3">
          <div className="flex items-start gap-2.5">
            <MapPin className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold text-gray-900 leading-snug">{address}</p>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-2 px-4 pb-4">
          <button
            onClick={onSetStart}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-500 text-white rounded-xl font-semibold text-[15px] active:scale-[0.97] transition-transform"
          >
            <Navigation className="w-4 h-4" />
            출발지 설정
          </button>
          <button
            onClick={onSetEnd}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-500 text-white rounded-xl font-semibold text-[15px] active:scale-[0.97] transition-transform"
          >
            <MapPin className="w-4 h-4" />
            도착지 설정
          </button>
        </div>
      </div>
    </div>
  );
}
