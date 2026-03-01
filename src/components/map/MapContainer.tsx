/**
 * MapContainer - 지도 프로바이더 선택 컴포넌트
 *
 * 환경 변수에 따라 Naver Maps 또는 Kakao Maps를 렌더링합니다.
 * 두 지도 컴포넌트는 동일한 인터페이스를 제공하므로 투명하게 교체 가능합니다.
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
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
  /** 리스트 호버 중인 경유지 ID (지도 마커 강조용) */
  hoveredWaypointId?: string | null;
  /** 경유지 선택 핸들러 */
  onWaypointSelect: (waypoint: DetourResult) => void;
  /** 지도 클릭 핸들러 (좌표 반환) */
  onMapClick?: (coords: Coordinates) => void;
  /** 클릭한 위치 표시용 좌표 */
  clickedCoords?: Coordinates | null;
  /** 지도 팬/줌 후 idle 상태 콜백 (중심 좌표 반환) */
  onMapIdle?: (center: Coordinates) => void;
}

export default function MapContainer({
  center,
  zoom,
  originalRoute,
  detourRoute,
  waypoints,
  selectedWaypointId,
  hoveredWaypointId,
  onWaypointSelect,
  onMapClick,
  clickedCoords,
  onMapIdle,
}: MapContainerProps) {
  // 환경 변수 기본값 + 런타임 전환 가능
  const defaultProvider = process.env.NEXT_PUBLIC_MAP_PROVIDER || 'kakao';
  const [mapProvider, setMapProvider] = useState<string>(defaultProvider);

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

  // 카카오맵 클릭 이벤트 (지도 클릭으로 장소 선택)
  useEffect(() => {
    if (!kakaoMap || !onMapClick) return;
    const handler = (ev: unknown) => {
      const mouseEvent = ev as { latLng: kakao.maps.LatLng };
      const latlng = mouseEvent.latLng;
      onMapClick({ lat: latlng.getLat(), lng: latlng.getLng() });
    };
    kakao.maps.event.addListener(kakaoMap, 'click', handler);
    return () => {
      kakao.maps.event.removeListener(kakaoMap, 'click', handler);
    };
  }, [kakaoMap, onMapClick]);

  // 지도 idle 이벤트 (팬/줌 완료 시) → 재검색 버튼 표시용
  useEffect(() => {
    if (!kakaoMap || !onMapIdle) return;
    const handler = () => {
      const c = kakaoMap.getCenter();
      onMapIdle({ lat: c.getLat(), lng: c.getLng() });
    };
    kakao.maps.event.addListener(kakaoMap, 'idle', handler);
    return () => {
      kakao.maps.event.removeListener(kakaoMap, 'idle', handler);
    };
  }, [kakaoMap, onMapIdle]);

  // 클릭 위치 마커 표시
  useEffect(() => {
    if (!kakaoMap || !window.kakao) return;

    // 이전 마커 제거
    if (kakaoMap.__clickMarker) {
      kakaoMap.__clickMarker.setMap(null);
      kakaoMap.__clickMarker = null;
    }

    if (!clickedCoords) return;

    const el = document.createElement('div');
    el.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;pointer-events:none;">
        <div style="width:44px;height:44px;background:var(--pink-500);border:5px solid var(--bg-surface);border-radius:50%;box-shadow:0 4px 14px rgba(0,0,0,0.3);"></div>
        <div style="width:5px;height:28px;background:var(--pink-500);margin-top:-4px;border-radius:0 0 3px 3px;"></div>
      </div>
    `;

    const overlay = new window.kakao.maps.CustomOverlay({
      position: new window.kakao.maps.LatLng(clickedCoords.lat, clickedCoords.lng),
      content: el,
      xAnchor: 0.5,
      yAnchor: 1.0,
      zIndex: 900,
    });

    overlay.setMap(kakaoMap);
    kakaoMap.__clickMarker = overlay;

    return () => {
      overlay.setMap(null);
    };
  }, [kakaoMap, clickedCoords]);

  // center 변경 시 지도 이동
  useEffect(() => {
    if (!center) return;
    if (kakaoMap && window.kakao) {
      kakaoMap.panTo(new window.kakao.maps.LatLng(center.lat, center.lng));
    } else if (naverMap && window.naver) {
      naverMap.panTo(new window.naver.maps.LatLng(center.lat, center.lng));
    }
  }, [center?.lat, center?.lng, kakaoMap, naverMap]);

  // Kakao Maps 사용 시 줌 레벨 조정 (Naver: 12 ≈ Kakao: 7)
  const kakaoZoom = zoom ? Math.max(1, 13 - zoom) : 7;

  // 프로바이더 토글 버튼
  const providerToggle = (
    <div className="absolute top-4 left-4 z-10 bg-white rounded-lg shadow-lg p-1 flex gap-1">
      <button
        onClick={() => { setMapProvider('kakao'); setNaverMap(null); }}
        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          mapProvider === 'kakao'
            ? 'bg-yellow-400 text-black'
            : 'text-gray-500 hover:bg-gray-100'
        }`}
      >
        카카오
      </button>
      <button
        onClick={() => { setMapProvider('naver'); setKakaoMap(null); }}
        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          mapProvider === 'naver'
            ? 'bg-green-500 text-white'
            : 'text-gray-500 hover:bg-gray-100'
        }`}
      >
        네이버
      </button>
    </div>
  );

  if (mapProvider === 'naver') {
    return (
      <div className="relative w-full h-full">
        {providerToggle}
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
      </div>
    );
  }

  // 기본값: Kakao Maps
  return (
    <div className="relative w-full h-full">
      {providerToggle}
      <div className="absolute top-4 right-4 z-10 bg-white/95 rounded-lg shadow-lg px-3 py-2 text-xs text-gray-700">
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full" style={{ background: 'var(--blue-800)' }} />
          <span>일반도로</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="inline-block w-3 h-3 rounded-full" style={{ background: 'var(--orange-600)' }} />
          <span>고속화/고속도로</span>
        </div>
      </div>
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
          hoveredId={hoveredWaypointId}
          onMarkerClick={onWaypointSelect}
        />
      )}
    </div>
  );
}
