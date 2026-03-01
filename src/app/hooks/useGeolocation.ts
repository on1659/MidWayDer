'use client';

import { useState, useCallback } from 'react';
import { useRouteStore } from '@/store/route-store';
import { useToast } from '@/hooks/useToast';
import { getGPSErrorMessage } from '@/lib/error-messages';
import { recordLocationVisit } from '@/lib/smart-location';

interface UseGeolocationReturn {
  gpsLoading: boolean;
  currentLocation: { lat: number; lng: number } | null;
  handleGPS: () => Promise<void>;
}

export function useGeolocation(): UseGeolocationReturn {
  const { setStart } = useRouteStore();
  const { showToast } = useToast();
  const [gpsLoading, setGpsLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);

  const handleGPS = useCallback(async () => {
    if (!navigator.geolocation) {
      showToast('이 브라우저에서는 위치 기능을 사용할 수 없어요', 'error');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCurrentLocation(coords);
        try {
          const res = await fetch(`/api/reverse-geocode?lat=${coords.lat}&lng=${coords.lng}`);
          const data = await res.json();
          const address = data.name || data.address || `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;
          setStart({ address, coordinates: coords });
          recordLocationVisit(address, coords);
        } catch {
          const address = `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;
          setStart({ address, coordinates: coords });
          recordLocationVisit(address, coords);
        }
        setGpsLoading(false);
      },
      (err) => {
        setGpsLoading(false);
        const errorMessage = getGPSErrorMessage(err);
        showToast(errorMessage, 'error');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  }, [setStart, showToast]);

  return { gpsLoading, currentLocation, handleGPS };
}
