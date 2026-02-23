/**
 * KakaoRoutePolyline - 경로 폴리라인 컴포넌트 (Kakao Maps)
 *
 * 지도에 경로를 그립니다.
 * - 원본 경로 (파란색)
 * - 경유지 경로 (초록색, 선택 시)
 */

'use client';

import { useEffect, useRef } from 'react';
import type { Route } from '@/types/location';

interface KakaoRoutePolylineProps {
  /** Kakao Maps 인스턴스 */
  map: kakao.maps.Map | null;
  /** 원본 경로 (A→B) */
  originalRoute: Route | null;
  /** 경유지 경로 (A→C→B) */
  detourRoute?: {
    toWaypoint: Route;
    fromWaypoint: Route;
  } | null;
}

export default function KakaoRoutePolyline({
  map,
  originalRoute,
  detourRoute,
}: KakaoRoutePolylineProps) {
  const originalPolylineRef = useRef<kakao.maps.Polyline[]>([]);
  const detourPolylineRef = useRef<kakao.maps.Polyline[]>([]);

  // 원본 경로 그리기
  useEffect(() => {
    if (!map || !window.kakao || !originalRoute) return;

    // 기존 폴리라인 제거
    originalPolylineRef.current.forEach((p) => p.setMap(null));
    originalPolylineRef.current = [];

    // 세그먼트가 있으면 도로 종류별로 색상 분기
    if (originalRoute.segments && originalRoute.segments.length > 0) {
      const segmentPolylines = originalRoute.segments.map((segment) => {
        const path = segment.path.map(
          (point) => new window.kakao.maps.LatLng(point.lat, point.lng)
        );
        return new window.kakao.maps.Polyline({
          map,
          path,
          strokeColor: segment.isHighway ? 'var(--orange-600)' : 'var(--blue-800)', // 저채도 주황/블루
          strokeWeight: 8,
          strokeOpacity: 0.85,
          strokeStyle: 'solid',
        });
      });

      originalPolylineRef.current = segmentPolylines;
    } else {
      // 기존 단일 폴리라인
      const path = originalRoute.path.map(
        (point) => new window.kakao.maps.LatLng(point.lat, point.lng)
      );

      const polyline = new window.kakao.maps.Polyline({
        map,
        path,
        strokeColor: 'var(--blue-800)', // 저채도 블루
        strokeWeight: 8,
        strokeOpacity: 0.85,
        strokeStyle: 'solid',
      });

      originalPolylineRef.current = [polyline];
    }

    // 경로에 맞게 지도 영역 조정
    const bounds = new window.kakao.maps.LatLngBounds();
    originalRoute.path.forEach((point) => {
      bounds.extend(new window.kakao.maps.LatLng(point.lat, point.lng));
    });
    map.setBounds(bounds, 80, 80, 200, 80);

    return () => {
      originalPolylineRef.current.forEach((p) => p.setMap(null));
      originalPolylineRef.current = [];
    };
  }, [map, originalRoute]);

  // 경유지 경로 그리기
  useEffect(() => {
    if (!map || !window.kakao) return;

    // 기존 경유지 폴리라인 제거
    detourPolylineRef.current.forEach((polyline) => {
      polyline.setMap(null);
    });
    detourPolylineRef.current = [];

    if (!detourRoute) return;

    // A→C 경로
    const toWaypointPath = detourRoute.toWaypoint.path.map(
      (point) => new window.kakao.maps.LatLng(point.lat, point.lng)
    );
    const toWaypointPolyline = new window.kakao.maps.Polyline({
      map,
      path: toWaypointPath,
      strokeColor: 'var(--green-600)', // 초록색
      strokeWeight: 5,
      strokeOpacity: 0.8,
      strokeStyle: 'solid',
    });

    // C→B 경로
    const fromWaypointPath = detourRoute.fromWaypoint.path.map(
      (point) => new window.kakao.maps.LatLng(point.lat, point.lng)
    );
    const fromWaypointPolyline = new window.kakao.maps.Polyline({
      map,
      path: fromWaypointPath,
      strokeColor: 'var(--green-600)', // 초록색
      strokeWeight: 5,
      strokeOpacity: 0.8,
      strokeStyle: 'solid',
    });

    detourPolylineRef.current = [toWaypointPolyline, fromWaypointPolyline];

    return () => {
      detourPolylineRef.current.forEach((polyline) => {
        polyline.setMap(null);
      });
    };
  }, [map, detourRoute]);

  return null; // 렌더링 없음 (지도에 직접 그림)
}
