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
  const [loadError, setLoadError] = useState<string | null>(null);

  // Kakao Maps SDK 스크립트 로드
  useEffect(() => {
    const appKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
    if (!appKey) {
      setLoadError('NEXT_PUBLIC_KAKAO_JS_KEY가 설정되지 않았습니다.');
      return;
    }

    // 이미 SDK가 완전히 로드되어 있고 LatLng 등의 클래스가 있으면 바로 사용
    if (window.kakao?.maps?.LatLng) {
      setIsLoaded(true);
      return;
    }

    // 이미 kakao.maps 객체가 있지만 load가 필요한 경우
    if (window.kakao?.maps?.load) {
      window.kakao.maps.load(() => setIsLoaded(true));
      return;
    }

    // 이미 스크립트 태그가 있으면 중복 추가 방지
    if (document.querySelector('script[src*="dapi.kakao.com"]')) {
      const checkLoaded = setInterval(() => {
        if (window.kakao?.maps?.LatLng) {
          clearInterval(checkLoaded);
          setIsLoaded(true);
        } else if (window.kakao?.maps?.load) {
          clearInterval(checkLoaded);
          window.kakao.maps.load(() => setIsLoaded(true));
        }
      }, 100);
      // 10초 타임아웃
      setTimeout(() => {
        clearInterval(checkLoaded);
        if (!isLoaded) setLoadError('카카오맵 SDK 로드 타임아웃');
      }, 10000);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false`;
    script.async = true;
    script.onload = () => {
      if (window.kakao?.maps?.load) {
        window.kakao.maps.load(() => {
          setIsLoaded(true);
        });
      } else {
        setLoadError('카카오맵 SDK 로드 실패: kakao.maps.load를 찾을 수 없습니다.');
      }
    };
    script.onerror = () => {
      setLoadError('카카오맵 SDK 스크립트 로드 실패. 카카오 개발자 콘솔에서 도메인(localhost)이 등록되어 있는지 확인하세요.');
    };

    document.head.appendChild(script);
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
          {loadError ? (
            <div className="text-center p-4">
              <p className="text-red-500 font-medium mb-2">지도 로드 실패</p>
              <p className="text-sm text-gray-500">{loadError}</p>
            </div>
          ) : (
            <p className="text-gray-500">지도를 불러오는 중...</p>
          )}
        </div>
      )}
    </div>
  );
}
