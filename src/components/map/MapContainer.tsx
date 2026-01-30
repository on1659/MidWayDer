/**
 * MapContainer - 지도 프로바이더 선택 컴포넌트
 *
 * 환경 변수에 따라 Naver Maps 또는 Kakao Maps를 렌더링합니다.
 * 두 지도 컴포넌트는 동일한 인터페이스를 제공하므로 투명하게 교체 가능합니다.
 */

'use client';

import { useState, useCallback } from 'react';
import NaverMap from './NaverMap';
import KakaoMap from './KakaoMap';
import RoutePolyline from './RoutePolyline';
import KakaoRoutePolyline from './KakaoRoutePolyline';
import WaypointMarker from './WaypointMarker';
import KakaoWaypointMarker from './KakaoWaypointMarker';
import type { Coordinates, Route } from '@/types/location';
import type { DetourResult } from '@/types/detour';

interface MapContainerProps {
  /** 지도 중심 좌표 */
  center?: Coordinates;
  /** 지도 줌 레벨 (Naver: 12 기본, Kakao: 7 기본) */
  zoom?: number;
  /** 원본 경로 */
  originalRoute: Route | null;
  /** 경유지 경로 */
  detourRoute?: {
    toWaypoint: Route;
    fromWaypoint: Route;
  } | null;
  /** 경유지 목록 */
  waypoints: DetourResult[];
  /** 선택된 경유지 ID */
  selectedWaypointId: string | null;
  /** 경유지 선택 핸들러 */
  onWaypointSelect: (waypoint: DetourResult) => void;
}

export default function MapContainer({
  center,
  zoom,
  originalRoute,
  detourRoute,
  waypoints,
  selectedWaypointId,
  onWaypointSelect,
}: MapContainerProps) {
  // 환경 변수에서 지도 프로바이더 결정 (기본: kakao)
  const mapProvider = process.env.NEXT_PUBLIC_MAP_PROVIDER || 'kakao';

  // 지도 인스턴스 상태 (타입을 union으로 관리)
  const [naverMap, setNaverMap] = useState<naver.maps.Map | null>(null);
  const [kakaoMap, setKakaoMap] = useState<kakao.maps.Map | null>(null);

  // Naver Map 준비 완료 콜백
  const handleNaverMapReady = useCallback((map: naver.maps.Map) => {
    setNaverMap(map);
  }, []);

  // Kakao Map 준비 완료 콜백
  const handleKakaoMapReady = useCallback((map: kakao.maps.Map) => {
    setKakaoMap(map);
  }, []);

  // Kakao Maps 사용 시 줌 레벨 조정 (Naver: 12 ≈ Kakao: 7)
  const kakaoZoom = zoom ? Math.max(1, 13 - zoom) : 7;

  if (mapProvider === 'naver') {
    return (
      <>
        <NaverMap
          center={center}
          zoom={zoom}
          onMapReady={handleNaverMapReady}
        />
        {originalRoute && (
          <RoutePolyline
            map={naverMap}
            originalRoute={originalRoute}
            detourRoute={detourRoute}
          />
        )}
        {waypoints.length > 0 && (
          <WaypointMarker
            map={naverMap}
            waypoints={waypoints}
            selectedId={selectedWaypointId}
            onMarkerClick={onWaypointSelect}
          />
        )}
      </>
    );
  }

  // 기본값: Kakao Maps
  return (
    <>
      <KakaoMap
        center={center}
        zoom={kakaoZoom}
        onMapReady={handleKakaoMapReady}
      />
      {originalRoute && (
        <KakaoRoutePolyline
          map={kakaoMap}
          originalRoute={originalRoute}
          detourRoute={detourRoute}
        />
      )}
      {waypoints.length > 0 && (
        <KakaoWaypointMarker
          map={kakaoMap}
          waypoints={waypoints}
          selectedId={selectedWaypointId}
          onMarkerClick={onWaypointSelect}
        />
      )}
    </>
  );
}
