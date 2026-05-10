/**
 * MapContainer - 지도 프로바이더 선택 컴포넌트
 *
 * 환경 변수에 따라 Naver Maps 또는 Kakao Maps를 렌더링합니다.
 * 두 지도 컴포넌트는 동일한 인터페이스를 제공하므로 투명하게 교체 가능합니다.
 */

'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';
import type { Coordinates, Route } from '@/types/location';
import type { DetourResult } from '@/types/detour';

function MapLoading({ label = '지도를 준비하는 중...' }: { label?: string }) {
  return (
    <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--bg-surface-muted)' }}>
      <p style={{ color: 'var(--text-secondary)' }}>{label}</p>
    </div>
  );
}

const NaverMap = dynamic(() => import('./NaverMap'), {
  ssr: false,
  loading: () => <MapLoading label="네이버 지도를 준비하는 중..." />,
});

const KakaoMap = dynamic(() => import('./KakaoMap'), {
  ssr: false,
  loading: () => <MapLoading label="카카오 지도를 준비하는 중..." />,
});

const RoutePolyline = dynamic(() => import('./RoutePolyline'), {
  ssr: false,
});

const KakaoRoutePolyline = dynamic(() => import('./KakaoRoutePolyline'), {
  ssr: false,
});

const WaypointMarker = dynamic(() => import('./WaypointMarker'), {
  ssr: false,
});

const KakaoWaypointMarker = dynamic(() => import('./KakaoWaypointMarker'), {
  ssr: false,
});

const KakaoEndpointMarker = dynamic(() => import('./KakaoEndpointMarker'), {
  ssr: false,
});

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
  /** 지도 상호작용 시작 (드래그/줌) */
  onMapInteraction?: () => void;
  /** 지도 상호작용 종료 */
  onResetInteraction?: () => void;
  /** v2 라우트용: 출발/도착 핀 표시 (기본 false — 메인 / 영향 0) */
  showEndpointMarkers?: boolean;
  /** showEndpointMarkers=true일 때만 사용 — 출발 좌표 */
  startCoords?: Coordinates | null;
  /** showEndpointMarkers=true일 때만 사용 — 도착 좌표 */
  endCoords?: Coordinates | null;
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
  onMapInteraction,
  onResetInteraction,
  showEndpointMarkers = false,
  startCoords = null,
  endCoords = null,
}: MapContainerProps) {
  const mapProvider = process.env.NEXT_PUBLIC_MAP_PROVIDER === 'naver' ? 'naver' : 'kakao';

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

  // 지도 상호작용 이벤트 (드래그/줌 시작)
  useEffect(() => {
    if (!kakaoMap || !onMapInteraction) return;

    const dragStartHandler = () => onMapInteraction();
    const zoomStartHandler = () => onMapInteraction();

    kakao.maps.event.addListener(kakaoMap, 'dragstart', dragStartHandler);
    kakao.maps.event.addListener(kakaoMap, 'zoom_start', zoomStartHandler);

    return () => {
      kakao.maps.event.removeListener(kakaoMap, 'dragstart', dragStartHandler);
      kakao.maps.event.removeListener(kakaoMap, 'zoom_start', zoomStartHandler);
    };
  }, [kakaoMap, onMapInteraction]);

  // 지도 상호작용 종료 이벤트 (드래그/줌 완료)
  useEffect(() => {
    if (!kakaoMap || !onResetInteraction) return;

    const dragEndHandler = () => onResetInteraction();
    const zoomChangedHandler = () => {
      // 줌 완료 후 1초 뒤 복원
      setTimeout(onResetInteraction, 1000);
    };

    kakao.maps.event.addListener(kakaoMap, 'dragend', dragEndHandler);
    kakao.maps.event.addListener(kakaoMap, 'zoom_changed', zoomChangedHandler);

    return () => {
      kakao.maps.event.removeListener(kakaoMap, 'dragend', dragEndHandler);
      kakao.maps.event.removeListener(kakaoMap, 'zoom_changed', zoomChangedHandler);
    };
  }, [kakaoMap, onResetInteraction]);

  // 클릭 위치 마커 표시
  useEffect(() => {
    if (!kakaoMap || !window.kakao) return;

    // 이전 마커 제거
    if (kakaoMap.__clickMarker) {
      kakaoMap.__clickMarker.setMap(null);
      // eslint-disable-next-line react-hooks/immutability
      kakaoMap.__clickMarker = null;
    }

    if (!clickedCoords) return;

    const el = document.createElement('div');
    el.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;pointer-events:none;">
        <div style="width:44px;height:44px;background:var(--accent);border:5px solid var(--bg-surface);border-radius:50%;box-shadow:var(--shadow-3);"></div>
        <div style="width:5px;height:28px;background:var(--accent);margin-top:-4px;border-radius:0 0 3px 3px;"></div>
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
  }, [center, kakaoMap, naverMap]);

  // Kakao Maps 사용 시 줌 레벨 조정 (Naver: 12 ≈ Kakao: 7)
  const kakaoZoom = zoom ? Math.max(1, 13 - zoom) : 7;

  if (mapProvider === 'naver') {
    return (
      <div className="relative w-full h-full" aria-label="경로를 보여주는 지도" role="application">
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
    <div className="map-contrast-canvas relative w-full h-full" aria-label="경로를 보여주는 지도" role="application">
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
      {showEndpointMarkers && (
        <KakaoEndpointMarker map={kakaoMap} start={startCoords} end={endCoords} />
      )}
    </div>
  );
}
