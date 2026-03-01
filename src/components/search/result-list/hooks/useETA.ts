'use client';

import { useState, useEffect, useMemo } from 'react';
import { getDefaultDwellMinutes } from '../utils';

export interface UseETAReturn {
  departureTime: string;
  setDepartureTime: (t: string) => void;
  dwellMinutes: number;
  setDwellMinutes: (m: number) => void;
  departureMs: number;
  nowMs: number;
  isNowDeparture: boolean;
}

export function useETA(currentCategory: string): UseETAReturn {
  const [departureTime, setDepartureTime] = useState<string>(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [dwellMinutes, setDwellMinutes] = useState(() =>
    getDefaultDwellMinutes(currentCategory)
  );
  const [nowMs, setNowMs] = useState(Date.now());

  // 카테고리 변경 시 체류 시간 기본값 갱신
  useEffect(() => {
    setDwellMinutes(getDefaultDwellMinutes(currentCategory));
  }, [currentCategory]);

  // 1분마다 nowMs 갱신 (실시간 ETA 카운트다운)
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const departureMs = useMemo(() => {
    const [h, m] = departureTime.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    if (d.getTime() < Date.now() - 60000) d.setDate(d.getDate() + 1);
    return d.getTime();
  }, [departureTime]);

  const isNowDeparture = useMemo(() => {
    return Math.abs(departureMs - nowMs) < 120_000; // ±2분 이내 → "지금 출발"
  }, [departureMs, nowMs]);

  return {
    departureTime, setDepartureTime,
    dwellMinutes, setDwellMinutes,
    departureMs, nowMs, isNowDeparture,
  };
}
