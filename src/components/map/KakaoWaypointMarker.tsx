/**
 * KakaoWaypointMarker - 경유지 마커 컴포넌트 (Kakao Maps)
 *
 * 검색 결과 경유지들을 지도에 마커로 표시합니다.
 * 클릭 시 정보창을 표시하고 선택할 수 있습니다.
 */

'use client';

import { useEffect, useRef } from 'react';
import type { DetourResult } from '@/types/detour';

interface KakaoWaypointMarkerProps {
  /** Kakao Maps 인스턴스 */
  map: kakao.maps.Map | null;
  /** 경유지 후보 목록 */
  waypoints: DetourResult[];
  /** 선택된 경유지 ID */
  selectedId: string | null;
  /** 마커 클릭 콜백 */
  onMarkerClick: (waypoint: DetourResult) => void;
}

export default function KakaoWaypointMarker({
  map,
  waypoints,
  selectedId,
  onMarkerClick,
}: KakaoWaypointMarkerProps) {
  const markersRef = useRef<kakao.maps.Marker[]>([]);
  const overlaysRef = useRef<kakao.maps.CustomOverlay[]>([]);

  useEffect(() => {
    if (!map || !window.kakao) return;

    // 기존 마커 및 오버레이 제거
    markersRef.current.forEach((marker) => {
      marker.setMap(null);
    });
    markersRef.current = [];

    overlaysRef.current.forEach((overlay) => {
      overlay.setMap(null);
    });
    overlaysRef.current = [];

    // 새 마커 생성
    waypoints.forEach((waypoint, index) => {
      const isSelected = selectedId === waypoint.place.id;

      // 커스텀 마커 HTML
      const markerContent = document.createElement('div');
      markerContent.style.cssText = `
        position: relative;
        width: 32px;
        height: 32px;
      `;

      const markerInner = document.createElement('div');
      markerInner.style.cssText = `
        width: 32px;
        height: 32px;
        background-color: ${isSelected ? '#10B981' : '#3B82F6'};
        border: 2px solid white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 14px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        cursor: pointer;
      `;
      markerInner.textContent = String(index + 1);
      markerContent.appendChild(markerInner);

      // 커스텀 오버레이로 마커 생성
      const overlay = new window.kakao.maps.CustomOverlay({
        position: new window.kakao.maps.LatLng(
          waypoint.place.coordinates.lat,
          waypoint.place.coordinates.lng
        ),
        content: markerContent,
        xAnchor: 0.5,
        yAnchor: 0.5,
        zIndex: isSelected ? 1000 : 100,
      });

      overlay.setMap(map);
      overlaysRef.current.push(overlay);

      // 마커 클릭 이벤트
      markerContent.addEventListener('click', () => {
        onMarkerClick(waypoint);
        showInfoWindow(waypoint, overlay);
      });
    });

    // 정보창 표시 함수
    const infoWindowRef = { current: null as kakao.maps.CustomOverlay | null };

    const showInfoWindow = (waypoint: DetourResult, markerOverlay: kakao.maps.CustomOverlay) => {
      // 기존 정보창 제거
      if (infoWindowRef.current) {
        infoWindowRef.current.setMap(null);
      }

      const detourDistance = (waypoint.detourCost.distance / 1000).toFixed(1);
      const detourTime = Math.round(waypoint.detourCost.duration / 60);

      // 정보창 HTML
      const infoContent = document.createElement('div');
      infoContent.style.cssText = `
        position: relative;
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        padding: 12px;
        min-width: 200px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        margin-bottom: 45px;
      `;

      infoContent.innerHTML = `
        <div style="position: relative;">
          <h4 style="
            margin: 0 0 8px 0;
            font-size: 14px;
            font-weight: bold;
            color: #1F2937;
          ">${waypoint.place.name}</h4>
          <p style="
            margin: 0 0 8px 0;
            font-size: 12px;
            color: #6B7280;
            line-height: 1.4;
          ">${waypoint.place.address}</p>
          <div style="
            display: flex;
            gap: 12px;
            font-size: 12px;
            color: #3B82F6;
            font-weight: 500;
          ">
            <span>+${detourDistance}km</span>
            <span>+${detourTime}분</span>
            <span>${waypoint.finalScore.toFixed(0)}점</span>
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

      const infoOverlay = new window.kakao.maps.CustomOverlay({
        position: new window.kakao.maps.LatLng(
          waypoint.place.coordinates.lat,
          waypoint.place.coordinates.lng
        ),
        content: infoContent,
        xAnchor: 0.5,
        yAnchor: 1,
        zIndex: 2000,
      });

      infoOverlay.setMap(map);
      infoWindowRef.current = infoOverlay;

      // 다른 곳 클릭 시 정보창 닫기
      const closeHandler = () => {
        if (infoWindowRef.current) {
          infoWindowRef.current.setMap(null);
          infoWindowRef.current = null;
        }
      };

      // 지도 클릭 시 정보창 닫기
      window.kakao.maps.event.addListener(map, 'click', closeHandler);
    };

    return () => {
      markersRef.current.forEach((marker) => {
        marker.setMap(null);
      });
      overlaysRef.current.forEach((overlay) => {
        overlay.setMap(null);
      });
    };
  }, [map, waypoints, selectedId, onMarkerClick]);

  return null; // 렌더링 없음 (지도에 직접 그림)
}
