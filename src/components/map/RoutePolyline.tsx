/**
 * RoutePolyline - 경로 폴리라인 컴포넌트
 *
 * 지도에 경로를 그립니다.
 * - 원본 경로 (파란색)
 * - 경유지 경로 (초록색, 선택 시)
 */

'use client';

import { useEffect, useRef } from 'react';
import type { Route } from '@/types/location';

interface RoutePolylineProps {
  /** Naver Maps 인스턴스 */
  map: naver.maps.Map | null;
  /** 원본 경로 (A→B) */
  originalRoute: Route | null;
  /** 경유지 경로 (A→C→B) */
  detourRoute?: {
    toWaypoint: Route;
    fromWaypoint: Route;
  } | null;
}

export default function RoutePolyline({
  map,
  originalRoute,
  detourRoute,
}: RoutePolylineProps) {
  const originalPolylineRef = useRef<naver.maps.Polyline | null>(null);
  const detourPolylineRef = useRef<naver.maps.Polyline[]>([]);

  // 원본 경로 그리기
  useEffect(() => {
    if (!map || !window.naver || !originalRoute) return;

    // 기존 폴리라인 제거
    if (originalPolylineRef.current) {
      originalPolylineRef.current.setMap(null);
    }

    // 새 폴리라인 생성
    const path = originalRoute.path.map(
      (point) => new window.naver.maps.LatLng(point.lat, point.lng)
    );

    const polyline = new window.naver.maps.Polyline({
      map,
      path,
      strokeColor: '#3B82F6', // 파란색
      strokeWeight: 5,
      strokeOpacity: 0.7,
    });

    originalPolylineRef.current = polyline;

    // 경로에 맞게 지도 영역 조정
    const bounds = new window.naver.maps.LatLngBounds(
      new window.naver.maps.LatLng(originalRoute.start.lat, originalRoute.start.lng),
      new window.naver.maps.LatLng(originalRoute.end.lat, originalRoute.end.lng)
    );
    map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });

    return () => {
      if (originalPolylineRef.current) {
        originalPolylineRef.current.setMap(null);
      }
    };
  }, [map, originalRoute]);

  // 경유지 경로 그리기
  useEffect(() => {
    if (!map || !window.naver) return;

    // 기존 경유지 폴리라인 제거
    detourPolylineRef.current.forEach((polyline) => {
      polyline.setMap(null);
    });
    detourPolylineRef.current = [];

    if (!detourRoute) return;

    // A→C 경로
    const toWaypointPath = detourRoute.toWaypoint.path.map(
      (point) => new window.naver.maps.LatLng(point.lat, point.lng)
    );
    const toWaypointPolyline = new window.naver.maps.Polyline({
      map,
      path: toWaypointPath,
      strokeColor: '#10B981', // 초록색
      strokeWeight: 5,
      strokeOpacity: 0.8,
    });

    // C→B 경로
    const fromWaypointPath = detourRoute.fromWaypoint.path.map(
      (point) => new window.naver.maps.LatLng(point.lat, point.lng)
    );
    const fromWaypointPolyline = new window.naver.maps.Polyline({
      map,
      path: fromWaypointPath,
      strokeColor: '#10B981', // 초록색
      strokeWeight: 5,
      strokeOpacity: 0.8,
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
