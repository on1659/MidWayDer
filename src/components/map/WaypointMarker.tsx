/**
 * WaypointMarker - 경유지 마커 컴포넌트
 *
 * 검색 결과 경유지들을 지도에 마커로 표시합니다.
 * 클릭 시 정보창을 표시하고 선택할 수 있습니다.
 */

'use client';

import { useEffect, useRef } from 'react';
import type { DetourResult } from '@/types/detour';

interface WaypointMarkerProps {
  /** Naver Maps 인스턴스 */
  map: naver.maps.Map | null;
  /** 경유지 후보 목록 */
  waypoints: DetourResult[];
  /** 선택된 경유지 ID */
  selectedId: string | null;
  /** 마커 클릭 콜백 */
  onMarkerClick: (waypoint: DetourResult) => void;
}

export default function WaypointMarker({
  map,
  waypoints,
  selectedId,
  onMarkerClick,
}: WaypointMarkerProps) {
  const markersRef = useRef<naver.maps.Marker[]>([]);
  const infoWindowRef = useRef<naver.maps.InfoWindow | null>(null);

  useEffect(() => {
    if (!map || !window.naver) return;

    // 기존 마커 제거
    markersRef.current.forEach((marker) => {
      marker.setMap(null);
    });
    markersRef.current = [];

    // 기존 정보창 제거
    if (infoWindowRef.current) {
      infoWindowRef.current.close();
    }

    // 새 마커 생성
    waypoints.forEach((waypoint, index) => {
      const isSelected = selectedId === waypoint.place.id;

      const marker = new window.naver.maps.Marker({
        map,
        position: new window.naver.maps.LatLng(
          waypoint.place.coordinates.lat,
          waypoint.place.coordinates.lng
        ),
        title: waypoint.place.name,
        icon: {
          content: `
            <div style="
              position: relative;
              width: 32px;
              height: 32px;
            ">
              <div style="
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
              ">
                ${index + 1}
              </div>
            </div>
          `,
          size: new window.naver.maps.Size(32, 32),
          anchor: new window.naver.maps.Point(16, 16),
        },
        zIndex: isSelected ? 1000 : 100,
      });

      // 마커 클릭 이벤트
      window.naver.maps.Event.addListener(marker, 'click', () => {
        onMarkerClick(waypoint);

        // 정보창 표시
        const detourDistance = (waypoint.detourCost.distance / 1000).toFixed(1);
        const detourTime = Math.round(waypoint.detourCost.duration / 60);

        const infoWindow = new window.naver.maps.InfoWindow({
          content: `
            <div style="
              padding: 12px;
              min-width: 200px;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            ">
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
            </div>
          `,
        });

        if (infoWindowRef.current) {
          infoWindowRef.current.close();
        }
        infoWindow.open(map, marker);
        infoWindowRef.current = infoWindow;
      });

      markersRef.current.push(marker);
    });

    return () => {
      markersRef.current.forEach((marker) => {
        marker.setMap(null);
      });
      if (infoWindowRef.current) {
        infoWindowRef.current.close();
      }
    };
  }, [map, waypoints, selectedId, onMarkerClick]);

  return null; // 렌더링 없음 (지도에 직접 그림)
}
