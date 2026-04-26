/**
 * WaypointMarker - 경유지 마커 컴포넌트 (Naver Maps)
 *
 * 검색 결과 경유지들을 지도에 마커로 표시합니다.
 * MarkerClustering을 사용하여 다수 마커 시 클러스터링합니다.
 * 클릭 시 정보창을 표시하고 선택할 수 있습니다.
 */

'use client';

import { useEffect, useRef } from 'react';
import type { DetourResult } from '@/types/detour';
import { escapeHtml } from '@/lib/utils/escape-html';
import {
  getAccentColor,
  getAccentWeakColor,
  getShadow1,
  getShadow3,
  getSuccessColor,
  getSuccessWeakColor,
  getSurface1,
  getSurface2,
  getTextOnAccent,
  getTextPrimary,
  getTextSecondary,
  getWarningColor,
  getWarningWeakColor,
} from '@/lib/theme-colors';

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
  const clustererRef = useRef<naver.maps.MarkerClustering | null>(null);
  const infoWindowRef = useRef<naver.maps.InfoWindow | null>(null);
  const clustererLoadedRef = useRef(false);

  // MarkerClustering 라이브러리 로드
  useEffect(() => {
    if (window.naver?.maps?.MarkerClustering) {
      clustererLoadedRef.current = true;
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://navermaps.github.io/maps.js.ncp/docs/tutorial-code/clusterer/MarkerClustering.js';
    script.async = true;
    script.onload = () => {
      clustererLoadedRef.current = true;
    };
    script.onerror = () => {
      console.warn('Failed to load Naver MarkerClustering library');
    };
    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  useEffect(() => {
    if (!map || !window.naver) return;

    // 기존 클러스터러 제거
    if (clustererRef.current) {
      clustererRef.current.clear();
      clustererRef.current.setMap(null);
      clustererRef.current = null;
    }

    // 기존 마커 제거
    markersRef.current.forEach((marker) => {
      marker.setMap(null);
    });
    markersRef.current = [];

    // 기존 정보창 제거
    if (infoWindowRef.current) {
      infoWindowRef.current.close();
    }

    if (waypoints.length === 0) return;

    // 새 마커 생성
    const markers: naver.maps.Marker[] = [];
    const accentColor = getAccentColor();
    const successColor = getSuccessColor();
    const surfaceColor = getSurface1();
    const textOnAccent = getTextOnAccent();
    const markerShadow = getShadow3();
    waypoints.forEach((waypoint, index) => {
      const isSelected = selectedId === waypoint.place.id;

      const marker = new window.naver.maps.Marker({
        position: new window.naver.maps.LatLng(
          waypoint.place.coordinates.lat,
          waypoint.place.coordinates.lng
        ),
        title: waypoint.place.name,
        icon: {
          content: `
            <div style="
              position: relative;
              width: 40px;
              height: 40px;
            ">
              <div style="
                width: 40px;
                height: 40px;
                background-color: ${isSelected ? successColor : accentColor};
                border: 3px solid ${surfaceColor};
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: ${textOnAccent};
                font-weight: bold;
                font-size: 15px;
                box-shadow: ${markerShadow};
              ">
                ${index + 1}
              </div>
            </div>
          `,
          size: new window.naver.maps.Size(40, 40),
          anchor: new window.naver.maps.Point(20, 20),
        },
        zIndex: isSelected ? 1000 : 100,
      });

      // 마커 클릭 이벤트
      window.naver.maps.Event.addListener(marker, 'click', () => {
        onMarkerClick(waypoint);

        // 정보창 표시
        const detourDistance = (waypoint.detourCost.distance / 1000).toFixed(1);
        const detourTime = Math.round(waypoint.detourCost.duration / 60);
        const safeName = escapeHtml(waypoint.place.name);
        const safeAddress = escapeHtml(waypoint.place.roadAddress || waypoint.place.address);
        const accentWeakColor = getAccentWeakColor();
        const warningColor = getWarningColor();
        const warningWeakColor = getWarningWeakColor();
        const successWeakColor = getSuccessWeakColor();
        const infoSurface = getSurface2();
        const infoShadow = getShadow3();
        const textPrimary = getTextPrimary();
        const textSecondary = getTextSecondary();

        const infoWindow = new window.naver.maps.InfoWindow({
          content: `
            <div style="
              padding: 12px;
              min-width: 200px;
              background: ${infoSurface};
              box-shadow: ${infoShadow};
              border-radius: 12px;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            ">
              <h4 style="
                margin: 0 0 8px 0;
                font-size: 14px;
                font-weight: bold;
                color: ${textPrimary};
              ">${safeName}</h4>
              <p style="
                margin: 0 0 8px 0;
                font-size: 12px;
                color: ${textSecondary};
                line-height: 1.4;
              ">${safeAddress}</p>
              <div style="
                display: flex;
                gap: 12px;
                font-size: 12px;
                font-weight: 500;
              ">
                <span style="color: ${accentColor}; background: ${accentWeakColor}; padding: 2px 8px; border-radius: 10px;">+${detourDistance}km</span>
                <span style="color: ${warningColor}; background: ${warningWeakColor}; padding: 2px 8px; border-radius: 10px;">+${detourTime}분</span>
                <span style="color: ${successColor}; background: ${successWeakColor}; padding: 2px 8px; border-radius: 10px;">${waypoint.finalScore.toFixed(0)}점</span>
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

      markers.push(marker);
    });

    markersRef.current = markers;

    // MarkerClustering 사용 (라이브러리가 로드된 경우)
    if (clustererLoadedRef.current && window.naver?.maps?.MarkerClustering) {
      const clusterer = new window.naver.maps.MarkerClustering({
        minClusterSize: 2,
        maxZoom: 12,
        map: map,
        markers: markers,
        disableClickZoom: false,
        styles: [
          {
            width: '40px',
            height: '40px',
            background: accentColor,
            borderRadius: '50%',
            color: textOnAccent,
            textAlign: 'center',
            lineHeight: '41px',
            fontWeight: 'bold',
            border: `2px solid ${surfaceColor}`,
            boxShadow: getShadow1(),
          },
        ],
      });

      clustererRef.current = clusterer;
    } else {
      // 폴백: 개별 마커 표시
      markers.forEach((marker) => marker.setMap(map));
    }

    return () => {
      if (clustererRef.current) {
        clustererRef.current.clear();
        clustererRef.current.setMap(null);
        clustererRef.current = null;
      }

      markersRef.current.forEach((marker) => {
        marker.setMap(null);
      });
      markersRef.current = [];

      if (infoWindowRef.current) {
        infoWindowRef.current.close();
      }
    };
  }, [map, waypoints, selectedId, onMarkerClick]);

  return null;
}
