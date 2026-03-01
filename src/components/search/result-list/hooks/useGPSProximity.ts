'use client';

import { useState, useEffect, useMemo } from 'react';
import type { DetourResult } from '@/types/detour';
import { haversineDistanceKm } from '../utils';

export interface UseGPSProximityReturn {
  currentLocation: { lat: number; lng: number } | null;
  closestPlaceId: string | null;
}

export function useGPSProximity(results: DetourResult[]): UseGPSProximityReturn {
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (results.length === 0 || currentLocation) return;
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!cancelled) {
          setCurrentLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        }
      },
      () => {},
      { timeout: 6000, maximumAge: 60000 }
    );
    return () => { cancelled = true; };
  }, [results.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const closestPlaceId = useMemo(() => {
    if (!currentLocation || results.length === 0) return null;
    let minDist = Infinity;
    let closestId: string | null = null;
    for (const r of results) {
      const d = haversineDistanceKm(
        currentLocation.lat, currentLocation.lng,
        r.place.coordinates.lat, r.place.coordinates.lng
      );
      if (d < minDist) {
        minDist = d;
        closestId = r.place.id;
      }
    }
    return closestId;
  }, [currentLocation, results]);

  return { currentLocation, closestPlaceId };
}
