/**
 * KakaoMap - Kakao Maps SDK 지도 컴포넌트
 *
 * Kakao Maps JavaScript SDK를 동적으로 로드하여 지도를 표시합니다.
 * 경로 및 마커를 표시할 수 있는 기본 지도 컴포넌트입니다.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import type { Coordinates } from '@/types/location';

interface KakaoMapProps {
  /** 지도 중심 좌표 (기본: 서울) */
  center?: Coordinates;
  /** 지도 초기 줌 레벨 (기본: 7, 레벨이 낮을수록 확대) */
  zoom?: number;
  /** 지도 준비 완료 콜백 */
  onMapReady?: (map: kakao.maps.Map) => void;
}

export default function KakaoMap({
  center = { lat: 37.5665, lng: 126.978 }, // 서울시청
  zoom = 7,
  onMapReady,
}: KakaoMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<kakao.maps.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Kakao Maps SDK 스크립트 로드
  useEffect(() => {
    const appKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
    if (!appKey) {
      console.error('NEXT_PUBLIC_KAKAO_JS_KEY is not set');
      return;
    }

    // 이미 로드되어 있으면 스킵
    if (window.kakao?.maps) {
      // 이미 로드되어 있으면 다음 틱에서 상태 업데이트
      const timer = setTimeout(() => setIsLoaded(true), 0);
      return () => clearTimeout(timer);
    }

    const script = document.createElement('script');
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false`;
    script.async = true;
    script.onload = () => {
      // kakao.maps.load()를 호출하여 SDK 초기화
      if (window.kakao?.maps) {
        window.kakao.maps.load(() => {
          setIsLoaded(true);
        });
      }
    };
    script.onerror = () => {
      console.error('Failed to load Kakao Maps SDK');
    };

    document.head.appendChild(script);

    return () => {
      // Clean up: SDK는 한 번만 로드되므로 제거하지 않음
    };
  }, []);

  // 지도 초기화
  useEffect(() => {
    if (!isLoaded || !mapRef.current || map) return;

    const mapInstance = new window.kakao.maps.Map(mapRef.current, {
      center: new window.kakao.maps.LatLng(center.lat, center.lng),
      level: zoom,
    });

    // 줌 컨트롤 추가
    const zoomControl = new window.kakao.maps.ZoomControl();
    mapInstance.addControl(zoomControl, window.kakao.maps.ControlPosition.RIGHT);

    // 지도 타입 컨트롤 추가
    const mapTypeControl = new window.kakao.maps.MapTypeControl();
    mapInstance.addControl(mapTypeControl, window.kakao.maps.ControlPosition.TOPRIGHT);

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
