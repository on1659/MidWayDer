/**
 * WaypointMarker - 경유지 마커 컴포넌트 (Naver Maps)
 *
 * 검색 결과 경유지들을 지도에 마커로 표시합니다.
 * MarkerClustering을 사용하여 다수 마커 시 클러스터링합니다.
 * 클릭 시 정보창을 표시하고 선택할 수 있습니다.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
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
  const clustererRef = useRef<naver.maps.MarkerClustering | null>(null);
  const infoWindowRef = useRef<naver.maps.InfoWindow | null>(null);
  const [clustererLoaded, setClustererLoaded] = useState(false);

  // MarkerClustering 라이브러리 로드
  useEffect(() => {
    if (window.naver?.maps?.MarkerClustering) {
      setClustererLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://navermaps.github.io/maps.js.ncp/docs/tutorial-code/clusterer/MarkerClustering.js';
    script.async = true;
    script.onload = () => {
      setClustererLoaded(true);
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
                background-color: ${isSelected ? '#16A34A' : '#3274F9'};
                border: 3px solid white;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: bold;
                font-size: 15px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.35);
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
                color: #1a1a1a;
              ">${waypoint.place.name}</h4>
              <p style="
                margin: 0 0 8px 0;
                font-size: 12px;
                color: #666;
                line-height: 1.4;
              ">${waypoint.place.address}</p>
              <div style="
                display: flex;
                gap: 12px;
                font-size: 12px;
                color: #3274F9;
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

      markers.push(marker);
    });

    markersRef.current = markers;

    // MarkerClustering 사용 (라이브러리가 로드된 경우)
    if (clustererLoaded && window.naver?.maps?.MarkerClustering) {
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
            background: '#3274F9',
            borderRadius: '50%',
            color: '#fff',
            textAlign: 'center',
            lineHeight: '41px',
            fontWeight: 'bold',
            border: '2px solid white',
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
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
  }, [map, waypoints, selectedId, onMarkerClick, clustererLoaded]);

  return null;
}
