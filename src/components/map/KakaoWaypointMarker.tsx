/**
 * KakaoWaypointMarker - 경유지 마커 컴포넌트 (Kakao Maps)
 *
 * 검색 결과 경유지들을 지도에 마커로 표시합니다.
 * 클릭 시 정보창을 표시하고 선택할 수 있습니다.
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';
import type { DetourResult } from '@/types/detour';

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
  const overlaysRef = useRef<kakao.maps.CustomOverlay[]>([]);
  const infoOverlayRef = useRef<kakao.maps.CustomOverlay | null>(null);
  const onMarkerClickRef = useRef(onMarkerClick);
  const mapClickHandlerRef = useRef<(() => void) | null>(null);
  // 마커 inner 엘리먼트 ref (호버 동기화용)
  const markerInnersRef = useRef<Map<string, HTMLDivElement>>(new Map());

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

  useEffect(() => {
    if (!map || !window.kakao) return;

    // 기존 오버레이 제거
    overlaysRef.current.forEach((overlay) => overlay.setMap(null));
    overlaysRef.current = [];
    markerInnersRef.current = new Map();
    closeInfoWindow();

    // 기존 지도 클릭 핸들러 제거
    if (mapClickHandlerRef.current) {
      kakao.maps.event.removeListener(map, 'click', mapClickHandlerRef.current);
      mapClickHandlerRef.current = null;
    }

    if (waypoints.length === 0) return;

    // 지도 클릭 시 정보창 닫기 핸들러
    const mapClickHandler = () => closeInfoWindow();
    mapClickHandlerRef.current = mapClickHandler;
    kakao.maps.event.addListener(map, 'click', mapClickHandler);

    // 마커 생성
    waypoints.forEach((waypoint, index) => {
      const isSelected = selectedId === waypoint.place.id;

      const markerContent = document.createElement('div');
      markerContent.style.cssText = `
        position: relative;
        width: 40px;
        height: 40px;
        cursor: pointer;
        pointer-events: auto;
        z-index: ${isSelected ? 1000 : 100};
      `;

      const markerInner = document.createElement('div');
      markerInner.style.cssText = `
        width: 40px;
        height: 40px;
        background-color: ${isSelected ? 'var(--green-600)' : 'var(--accent)'};
        border: 3px solid white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 15px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.35);
        pointer-events: none;
        transition: transform 0.15s ease;
      `;
      markerInner.textContent = String(index + 1);
      markerContent.appendChild(markerInner);
      // 호버 동기화용 ref 저장
      markerInnersRef.current.set(waypoint.place.id, markerInner);

      const overlay = new window.kakao.maps.CustomOverlay({
        position: new window.kakao.maps.LatLng(
          waypoint.place.coordinates.lat,
          waypoint.place.coordinates.lng
        ),
        content: markerContent,
        xAnchor: 0.5,
        yAnchor: 0.5,
        zIndex: isSelected ? 1000 : 100,
        clickable: true,
      });

      overlay.setMap(map);
      overlaysRef.current.push(overlay);

      // 호버 효과
      markerContent.addEventListener('mouseenter', () => {
        markerInner.style.transform = 'scale(1.15)';
      });
      markerContent.addEventListener('mouseleave', () => {
        markerInner.style.transform = 'scale(1)';
      });

      // 클릭 이벤트 — stopPropagation으로 지도 클릭 전파 방지
      markerContent.addEventListener('click', (e) => {
        e.stopPropagation();
        onMarkerClickRef.current(waypoint);
        showInfoWindow(waypoint);
      });
    });

    function showInfoWindow(waypoint: DetourResult) {
      closeInfoWindow();

      const detourDistance = (waypoint.detourCost.distance / 1000).toFixed(1);
      const detourTime = Math.round(waypoint.detourCost.duration / 60);

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

      infoContent.innerHTML = `
        <div style="position: relative;">
          <h4 style="
            margin: 0 0 6px 0;
            font-size: 15px;
            font-weight: 700;
            color: var(--text-primary);
          ">${waypoint.place.name}</h4>
          <p style="
            margin: 0 0 10px 0;
            font-size: 12px;
            color: var(--text-secondary);
            line-height: 1.4;
          ">${waypoint.place.roadAddress || waypoint.place.address}</p>
          <div style="
            display: flex;
            gap: 8px;
            font-size: 12px;
            font-weight: 600;
          ">
            <span style="background: var(--blue-50); color: var(--accent); padding: 2px 8px; border-radius: 10px;">+${detourDistance}km</span>
            <span style="background: #FFF7ED; color: var(--orange-700); padding: 2px 8px; border-radius: 10px;">+${detourTime}분</span>
            <span style="background: var(--green-200); color: var(--green-500); padding: 2px 8px; border-radius: 10px;">${waypoint.finalScore.toFixed(0)}점</span>
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

      // 정보창 클릭 시 지도로 전파 방지
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
    }

    return () => {
      overlaysRef.current.forEach((overlay) => overlay.setMap(null));
      overlaysRef.current = [];
      closeInfoWindow();
      if (mapClickHandlerRef.current) {
        kakao.maps.event.removeListener(map, 'click', mapClickHandlerRef.current);
        mapClickHandlerRef.current = null;
      }
    };
  }, [map, waypoints, selectedId, closeInfoWindow]);

  // 호버 동기화: hoveredId 변경 시 마커 스타일만 업데이트 (마커 재생성 없음)
  useEffect(() => {
    markerInnersRef.current.forEach((el, id) => {
      const isSelected = selectedId === id;
      const isHovered = hoveredId === id;
      if (isSelected) {
        el.style.transform = 'scale(1)';
        el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.35)';
      } else if (isHovered) {
        el.style.transform = 'scale(1.25)';
        el.style.boxShadow = '0 6px 18px rgba(0,0,0,0.45)';
      } else {
        el.style.transform = 'scale(1)';
        el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.35)';
      }
    });
  }, [hoveredId, selectedId]);

  return null;
}
