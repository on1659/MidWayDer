'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouteStore } from '@/store/route-store';
import { useSearchStore } from '@/store/search-store';
import type { Route } from '@/types/location';

interface MapClickInfo {
  name: string;
  address?: string;
  category?: string;
  phone?: string;
  placeUrl?: string;
  coords: { lat: number; lng: number };
}

interface UseMapStateReturn {
  mapClickInfo: MapClickInfo | null;
  setMapClickInfo: React.Dispatch<React.SetStateAction<MapClickInfo | null>>;
  previewRoute: Route | null;
  setPreviewRoute: React.Dispatch<React.SetStateAction<Route | null>>;
  hoveredWaypointId: string | null;
  setHoveredWaypointId: React.Dispatch<React.SetStateAction<string | null>>;
  mapPanned: boolean;
  setMapPanned: React.Dispatch<React.SetStateAction<boolean>>;
  handleMapClick: (coords: { lat: number; lng: number }) => Promise<void>;
  handleMapIdle: () => void;
}

export function useMapState(): UseMapStateReturn {
  const { start, end, originalRoute } = useRouteStore();
  const { results, hasSearched } = useSearchStore();

  const [mapClickInfo, setMapClickInfo] = useState<MapClickInfo | null>(null);
  const [previewRoute, setPreviewRoute] = useState<Route | null>(null);
  const [hoveredWaypointId, setHoveredWaypointId] = useState<string | null>(null);
  const [mapPanned, setMapPanned] = useState(false);
  const mapIdleIgnoreRef = useRef(false);

  const handleMapClick = useCallback(async (coords: { lat: number; lng: number }) => {
    try {
      const res = await fetch(`/api/reverse-geocode?lat=${coords.lat}&lng=${coords.lng}`);
      const data = await res.json();
      if (!data.name) return;
      setMapClickInfo({ name: data.name, address: data.address, category: data.category, phone: data.phone, placeUrl: data.placeUrl, coords });
    } catch (err) {
      console.error('Reverse geocode failed:', err);
    }
  }, []);

  // Route preview: auto-fetch when both start/end have coordinates
  useEffect(() => {
    const sc = start?.coordinates;
    const ec = end?.coordinates;
    if (!sc || !ec) {
      setPreviewRoute(null);
      return;
    }
    if (originalRoute) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/directions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            start: { lng: sc.lng, lat: sc.lat },
            end: { lng: ec.lng, lat: ec.lat },
          }),
        });
        const data = await res.json();
        if (!cancelled && data.success && data.data) {
          setPreviewRoute(data.data);
        }
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [start?.coordinates, end?.coordinates, originalRoute]);

  // 새 검색 결과 직후 2초간 지도 팬 이벤트 무시
  useEffect(() => {
    if (results.length > 0) {
      mapIdleIgnoreRef.current = true;
      setMapPanned(false);
      const t = setTimeout(() => { mapIdleIgnoreRef.current = false; }, 2000);
      return () => clearTimeout(t);
    }
  }, [results]);

  const handleMapIdle = useCallback(() => {
    if (!hasSearched || mapIdleIgnoreRef.current) return;
    setMapPanned(true);
  }, [hasSearched]);

  return {
    mapClickInfo,
    setMapClickInfo,
    previewRoute,
    setPreviewRoute,
    hoveredWaypointId,
    setHoveredWaypointId,
    mapPanned,
    setMapPanned,
    handleMapClick,
    handleMapIdle,
  };
}
