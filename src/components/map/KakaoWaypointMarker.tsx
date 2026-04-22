/**
 * KakaoWaypointMarker - 경유지 마커 컴포넌트 (Kakao Maps)
 *
 * 검색 결과 경유지들을 지도에 마커로 표시합니다.
 * MarkerClusterer를 사용하여 다수 마커 시 클러스터링합니다.
 * 클릭 시 정보창을 표시하고 선택할 수 있습니다.
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';
import type { DetourResult } from '@/types/detour';
import { escapeHtml } from '@/lib/utils/escape-html';
import { getAccentColor, getAccentWeakColor, getSuccessColor } from '@/lib/theme-colors';

interface KakaoWaypointMarkerProps {
  map: kakao.maps.Map | null;
  waypoints: DetourResult[];
  selectedId: string | null;
  hoveredId?: string | null;
  onMarkerClick: (waypoint: DetourResult) => void;
}

export default function KakaoWaypointMarker({
  map,
  waypoints,
  selectedId,
  hoveredId,
  onMarkerClick,
}: KakaoWaypointMarkerProps) {
  const markersRef = useRef<kakao.maps.Marker[]>([]);
  const clustererRef = useRef<kakao.maps.MarkerClusterer | null>(null);
  const infoOverlayRef = useRef<kakao.maps.CustomOverlay | null>(null);
  const onMarkerClickRef = useRef(onMarkerClick);
  const mapClickHandlerRef = useRef<(() => void) | null>(null);
  const markerWaypointMapRef = useRef<Map<kakao.maps.Marker, DetourResult>>(new Map());
  const hoverCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clickedOpenIdRef = useRef<string | null>(null);

  // 최신 콜백 유지
  useEffect(() => {
    onMarkerClickRef.current = onMarkerClick;
  }, [onMarkerClick]);

  // 정보창 닫기
  const closeInfoWindow = useCallback(() => {
    if (infoOverlayRef.current) {
      infoOverlayRef.current.setMap(null);
      infoOverlayRef.current = null;
    }
  }, []);

  // 정보창 표시 함수
  const showInfoWindow = useCallback((waypoint: DetourResult) => {
    if (!map) return;
    
    closeInfoWindow();

    const detourDistance = (waypoint.detourCost.distance / 1000).toFixed(1);
    const detourTime = Math.round(waypoint.detourCost.duration / 60);
    const accentColor = getAccentColor();
    const accentWeakColor = getAccentWeakColor();
    const successColor = getSuccessColor();

    const infoContent = document.createElement('div');
    infoContent.style.cssText = `
      position: relative;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.18);
      padding: 14px 16px;
      min-width: 200px;
      max-width: 260px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      margin-bottom: 50px;
      pointer-events: auto;
      cursor: default;
    `;

    const safeName = escapeHtml(waypoint.place.name);
    const safeAddress = escapeHtml(waypoint.place.roadAddress || waypoint.place.address);

    infoContent.innerHTML = `
      <div style="position: relative;">
        <h4 style="
          margin: 0 0 6px 0;
          font-size: 15px;
          font-weight: 700;
          color: #1a1a1a;
        ">${safeName}</h4>
        <p style="
          margin: 0 0 10px 0;
          font-size: 12px;
          color: #666;
          line-height: 1.4;
        ">${safeAddress}</p>
        <div style="
          display: flex;
          gap: 8px;
          font-size: 12px;
          font-weight: 600;
        ">
          <span style="background: ${accentWeakColor}; color: ${accentColor}; padding: 2px 8px; border-radius: 10px;">+${detourDistance}km</span>
          <span style="background: #FFF7ED; color: #C2410C; padding: 2px 8px; border-radius: 10px;">+${detourTime}분</span>
          <span style="background: #DCFCE7; color: ${successColor}; padding: 2px 8px; border-radius: 10px;">${waypoint.finalScore.toFixed(0)}점</span>
        </div>
        <div style="
          position: absolute;
          bottom: -20px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 10px solid transparent;
          border-right: 10px solid transparent;
          border-top: 10px solid white;
        "></div>
      </div>
    `;

    infoContent.addEventListener('click', (e) => e.stopPropagation());

    const infoOverlay = new window.kakao.maps.CustomOverlay({
      position: new window.kakao.maps.LatLng(
        waypoint.place.coordinates.lat,
        waypoint.place.coordinates.lng
      ),
      content: infoContent,
      xAnchor: 0.5,
      yAnchor: 1,
      zIndex: 2000,
      clickable: true,
    });

    infoOverlay.setMap(map);
    infoOverlayRef.current = infoOverlay;
  }, [map, closeInfoWindow]);

  useEffect(() => {
    if (!map || !window.kakao) return;

    // MarkerClusterer 라이브러리 확인
    if (!window.kakao.maps.MarkerClusterer) {
      console.warn('Kakao MarkerClusterer not loaded, falling back to individual markers');
    }

    // 기존 클러스터러 제거
    if (clustererRef.current) {
      clustererRef.current.clear();
      clustererRef.current.setMap(null);
      clustererRef.current = null;
    }

    // 기존 마커 제거
    markersRef.current.forEach((marker) => {
      marker.setMap(null);
      kakao.maps.event.removeListener(marker, 'click');
      kakao.maps.event.removeListener(marker, 'mouseover');
      kakao.maps.event.removeListener(marker, 'mouseout');
    });
    markersRef.current = [];
    markerWaypointMapRef.current = new Map();
    closeInfoWindow();

    // 기존 지도 클릭 핸들러 제거
    if (mapClickHandlerRef.current) {
      kakao.maps.event.removeListener(map, 'click', mapClickHandlerRef.current);
      mapClickHandlerRef.current = null;
    }

    if (waypoints.length === 0) return;

    // 지도 클릭 시 정보창 닫기 + 클릭 상태 초기화
    const mapClickHandler = () => {
      clickedOpenIdRef.current = null;
      closeInfoWindow();
    };
    mapClickHandlerRef.current = mapClickHandler;
    kakao.maps.event.addListener(map, 'click', mapClickHandler);

    // 마커 생성
    const markers: kakao.maps.Marker[] = [];
    const accentColor = getAccentColor();
    const successColor = getSuccessColor();
    waypoints.forEach((waypoint, index) => {
      const isSelected = selectedId === waypoint.place.id;

      // 마커 이미지 생성 (번호 표시)
      const markerImageContent = `
        <div style="
          width: 40px;
          height: 40px;
          background-color: ${isSelected ? successColor : accentColor};
          border: 3px solid white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 15px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.35);
          transition: transform 0.15s ease;
        ">${index + 1}</div>
      `;

      const markerImage = new window.kakao.maps.MarkerImage(
        'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(markerImageContent))),
        new window.kakao.maps.Size(40, 40),
        { offset: new window.kakao.maps.Point(20, 20) }
      );

      const marker = new window.kakao.maps.Marker({
        position: new window.kakao.maps.LatLng(
          waypoint.place.coordinates.lat,
          waypoint.place.coordinates.lng
        ),
        image: markerImage,
        title: waypoint.place.name,
        zIndex: isSelected ? 1000 : 100,
      });

      markerWaypointMapRef.current.set(marker, waypoint);

      // 클릭 이벤트
      kakao.maps.event.addListener(marker, 'click', () => {
        clickedOpenIdRef.current = waypoint.place.id;
        onMarkerClickRef.current(waypoint);
        showInfoWindow(waypoint);
      });

      // 호버 이벤트 (mouseenter)
      kakao.maps.event.addListener(marker, 'mouseover', () => {
        if (hoverCloseTimeoutRef.current) {
          clearTimeout(hoverCloseTimeoutRef.current);
          hoverCloseTimeoutRef.current = null;
        }
        if (clickedOpenIdRef.current === null) {
          showInfoWindow(waypoint);
        }
      });

      // 호버 이벤트 (mouseleave)
      kakao.maps.event.addListener(marker, 'mouseout', () => {
        if (clickedOpenIdRef.current !== waypoint.place.id) {
          hoverCloseTimeoutRef.current = setTimeout(() => {
            closeInfoWindow();
            hoverCloseTimeoutRef.current = null;
          }, 300);
        }
      });

      markers.push(marker);
    });

    markersRef.current = markers;

    // MarkerClusterer 사용 (라이브러리가 로드된 경우)
    if (window.kakao.maps.MarkerClusterer) {
      const clusterer = new window.kakao.maps.MarkerClusterer({
        map: map,
        markers: markers,
        averageCenter: true,
        minLevel: 10,
        calculator: [10, 30, 50],
        styles: [
          {
            width: '40px',
            height: '40px',
            background: getAccentColor(),
            borderRadius: '50%',
            color: '#fff',
            textAlign: 'center',
            lineHeight: '41px',
            fontWeight: 'bold',
            border: '2px solid white',
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
          },
        ],
        disableClickZoom: false,
      });

      clustererRef.current = clusterer;
    } else {
      // 폴백: 개별 마커 표시
      markers.forEach((marker) => marker.setMap(map));
    }

    return () => {
      if (hoverCloseTimeoutRef.current) {
        clearTimeout(hoverCloseTimeoutRef.current);
        hoverCloseTimeoutRef.current = null;
      }
      clickedOpenIdRef.current = null;

      if (clustererRef.current) {
        clustererRef.current.clear();
        clustererRef.current.setMap(null);
        clustererRef.current = null;
      }

      markersRef.current.forEach((marker) => {
        marker.setMap(null);
        kakao.maps.event.removeListener(marker, 'click');
        kakao.maps.event.removeListener(marker, 'mouseover');
        kakao.maps.event.removeListener(marker, 'mouseout');
      });
      markersRef.current = [];
      markerWaypointMapRef.current = new Map();
      closeInfoWindow();

      if (mapClickHandlerRef.current) {
        kakao.maps.event.removeListener(map, 'click', mapClickHandlerRef.current);
        mapClickHandlerRef.current = null;
      }
    };
  }, [map, waypoints, selectedId, closeInfoWindow, showInfoWindow]);

  // 호버 동기화: hoveredId 변경 시 마커 업데이트
  useEffect(() => {
    markersRef.current.forEach((marker) => {
      const waypoint = markerWaypointMapRef.current.get(marker);
      if (!waypoint) return;

      const isSelected = selectedId === waypoint.place.id;
      const isHovered = hoveredId === waypoint.place.id;

      // 마커 이미지 업데이트
      const index = waypoints.findIndex((w) => w.place.id === waypoint.place.id);
      const scale = isSelected ? 1 : isHovered ? 1.25 : 1;
      const accentColor = getAccentColor();
      const successColor = getSuccessColor();
      const markerImageContent = `
        <div style="
          width: 40px;
          height: 40px;
          background-color: ${isSelected ? successColor : accentColor};
          border: 3px solid white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 15px;
          box-shadow: 0 ${isHovered ? '6px 18px' : '2px 8px'} rgba(0,0,0,${isHovered ? '0.45' : '0.35'});
          transition: transform 0.15s ease;
          transform: scale(${scale});
        ">${index + 1}</div>
      `;

      const markerImage = new window.kakao.maps.MarkerImage(
        'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(markerImageContent))),
        new window.kakao.maps.Size(40, 40),
        { offset: new window.kakao.maps.Point(20, 20) }
      );

      marker.setImage(markerImage);
    });
  }, [hoveredId, selectedId, waypoints]);

  return null;
}
