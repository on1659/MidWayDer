'use client';

/**
 * KakaoEndpointMarker — 출발/도착 핀을 지도에 표시
 *
 * 목업 화면 4/5의 파란 출발 핀 + 빨간 도착 핀을 카카오 SDK CustomOverlay로 구현.
 * 메인 / 라우트에는 영향 없도록 옵셔널로만 사용.
 */

import { useEffect, useRef } from 'react';
import type { Coordinates } from '@/types/location';
import { getAccentColor, getErrorColor } from '@/lib/theme-colors';

interface KakaoEndpointMarkerProps {
  map: kakao.maps.Map | null;
  start?: Coordinates | null;
  end?: Coordinates | null;
}

function buildPinHtml(label: '출발' | '도착', color: string) {
  return `
    <div style="
      position: relative;
      width: 36px;
      height: 46px;
      transform: translate(-50%, -100%);
      filter: drop-shadow(0 4px 8px rgba(0,0,0,0.25));
      pointer-events: none;
    ">
      <svg width="36" height="46" viewBox="0 0 36 46" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 0 C8 0 0 8 0 18 C0 30 18 46 18 46 C18 46 36 30 36 18 C36 8 28 0 18 0 Z"
          fill="${color}" />
        <circle cx="18" cy="18" r="6" fill="white" opacity="0.9" />
      </svg>
      <span style="
        position: absolute;
        top: 8px;
        left: 50%;
        transform: translateX(-50%);
        font-size: 10px;
        font-weight: 700;
        color: white;
        letter-spacing: -0.3px;
      ">${label}</span>
    </div>
  `;
}

export default function KakaoEndpointMarker({ map, start, end }: KakaoEndpointMarkerProps) {
  const overlaysRef = useRef<kakao.maps.CustomOverlay[]>([]);

  useEffect(() => {
    if (!map || !window.kakao?.maps) return;

    // 기존 오버레이 제거
    overlaysRef.current.forEach((o) => o.setMap(null));
    overlaysRef.current = [];

    const accentColor = getAccentColor();
    const errorColor = getErrorColor();

    if (start) {
      const overlay = new window.kakao.maps.CustomOverlay({
        position: new window.kakao.maps.LatLng(start.lat, start.lng),
        content: buildPinHtml('출발', accentColor),
        yAnchor: 1,
        xAnchor: 0.5,
        zIndex: 200,
      });
      overlay.setMap(map);
      overlaysRef.current.push(overlay);
    }

    if (end) {
      const overlay = new window.kakao.maps.CustomOverlay({
        position: new window.kakao.maps.LatLng(end.lat, end.lng),
        content: buildPinHtml('도착', errorColor),
        yAnchor: 1,
        xAnchor: 0.5,
        zIndex: 200,
      });
      overlay.setMap(map);
      overlaysRef.current.push(overlay);
    }

    return () => {
      overlaysRef.current.forEach((o) => o.setMap(null));
      overlaysRef.current = [];
    };
  }, [map, start?.lat, start?.lng, end?.lat, end?.lng]);

  return null;
}
