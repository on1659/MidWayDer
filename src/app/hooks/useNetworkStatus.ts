'use client';

import { useState, useEffect } from 'react';

export function useNetworkStatus() {
  // Set initial state synchronously to avoid cascading renders
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof window === 'undefined') return true;
    return navigator.onLine;
  });
  
  const [isSlowConnection, setIsSlowConnection] = useState(() => {
    if (typeof window === 'undefined') return false;
    // Check connection speed (experimental API)
    if ('connection' in navigator) {
      const connection = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;
      if (connection && connection.effectiveType) {
        return connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g';
      }
    }
    return false;
  });

  useEffect(() => {
    // Event handlers for online/offline status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for connection speed changes
    if ('connection' in navigator) {
      const connection = (navigator as Navigator & { 
        connection?: { 
          effectiveType?: string; 
          addEventListener?: (event: string, callback: () => void) => void 
        } 
      }).connection;
      
      if (connection && connection.addEventListener) {
        const handleConnectionChange = () => {
          if (connection.effectiveType) {
            setIsSlowConnection(
              connection.effectiveType === '2g' || 
              connection.effectiveType === 'slow-2g'
            );
          }
        };
        
        connection.addEventListener('change', handleConnectionChange);
      }
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, isSlowConnection };
}
