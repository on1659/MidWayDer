/**
 * NaverMap - Naver Maps SDK 지도 컴포넌트
 *
 * Naver Maps JavaScript SDK를 동적으로 로드하여 지도를 표시합니다.
 * 경로 및 마커를 표시할 수 있는 기본 지도 컴포넌트입니다.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import type { Coordinates } from '@/types/location';

interface NaverMapProps {
  /** 지도 중심 좌표 (기본: 서울) */
  center?: Coordinates;
  /** 지도 초기 줌 레벨 (기본: 12) */
  zoom?: number;
  /** 지도 준비 완료 콜백 */
  onMapReady?: (map: naver.maps.Map) => void;
}

export default function NaverMap({
  center = { lat: 37.5665, lng: 126.978 }, // 서울시청
  zoom = 12,
  onMapReady,
}: NaverMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<naver.maps.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Naver Maps SDK 스크립트 로드
  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_NAVER_MAPS_CLIENT_ID;
    if (!clientId) {
      console.error('NEXT_PUBLIC_NAVER_MAPS_CLIENT_ID is not set');
      return;
    }

    // 이미 로드되어 있으면 스킵
    if (window.naver?.maps) {
      // 이미 로드되어 있으면 다음 틱에서 상태 업데이트
      const timer = setTimeout(() => setIsLoaded(true), 0);
      return () => clearTimeout(timer);
    }

    const script = document.createElement('script');
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${clientId}`;
    script.async = true;
    script.onload = () => setIsLoaded(true);
    script.onerror = () => {
      console.error('Failed to load Naver Maps SDK');
    };

    document.head.appendChild(script);

    return () => {
      // Clean up: SDK는 한 번만 로드되므로 제거하지 않음
    };
  }, []);

  // 지도 초기화
  useEffect(() => {
    if (!isLoaded || !mapRef.current || map) return;

    const mapInstance = new window.naver.maps.Map(mapRef.current, {
      center: new window.naver.maps.LatLng(center.lat, center.lng),
      zoom,
      zoomControl: true,
      zoomControlOptions: {
        position: window.naver.maps.Position.TOP_RIGHT,
      },
      mapTypeControl: true,
      mapTypeControlOptions: {
        position: window.naver.maps.Position.TOP_LEFT,
      },
    });

    setMap(mapInstance);
    onMapReady?.(mapInstance);
  }, [isLoaded, center, zoom, map, onMapReady]);

  return (
    <div ref={mapRef} className="w-full h-full">
      {!isLoaded && (
        <div className="w-full h-full flex items-center justify-center bg-gray-100">
          <p className="text-gray-500">지도를 불러오는 중...</p>
        </div>
      )}
    </div>
  );
}
