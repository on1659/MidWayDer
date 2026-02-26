/**
 * RoutineBanner - 시간대 기반 루틴 경로 자동 제안 배너
 *
 * 출퇴근 시간에 집→회사 / 회사→집 경로를 자동으로 제안합니다.
 * - 평일 7-9시: 출근 경로 (집→회사)
 * - 평일 17-19시: 퇴근 경로 (회사→집)
 * - 집/회사가 모두 저장된 경우에만 표시
 * - 4시간 이내 재표시 없음 (localStorage 기반)
 */

'use client';

import { useState, useEffect } from 'react';
import { X, ArrowRight } from 'lucide-react';
import {
  detectRoutine,
  shouldShowRoutinePrompt,
  markRoutinePromptShown,
  getLastPromptTime,
} from '@/lib/routine/detector';
import { getSavedLocationByLabel } from '@/lib/smart-location';
import type { Coordinates } from '@/types/location';

interface RoutineBannerProps {
  onApply: (
    startAddr: string,
    startCoords: Coordinates,
    endAddr: string,
    endCoords: Coordinates
  ) => void;
}

export default function RoutineBanner({ onApply }: RoutineBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [routineInfo, setRoutineInfo] = useState<{
    type: 'morning-commute' | 'evening-commute';
    emoji: string;
    label: string;
    startAddr: string;
    startCoords: Coordinates;
    endAddr: string;
    endCoords: Coordinates;
    startLabel: string;
    endLabel: string;
  } | null>(null);

  useEffect(() => {
    const type = detectRoutine();
    if (!type || type === 'weekend-trip') return;

    const lastPrompt = getLastPromptTime(type);
    if (!shouldShowRoutinePrompt(type, lastPrompt)) return;

    const home = getSavedLocationByLabel('home');
    const work = getSavedLocationByLabel('work');
    if (!home || !work) return;

    if (type === 'morning-commute') {
      setRoutineInfo({
        type,
        emoji: '🌅',
        label: '출근 시간이에요!',
        startAddr: home.address,
        startCoords: home.coordinates,
        endAddr: work.address,
        endCoords: work.coordinates,
        startLabel: '집',
        endLabel: '회사',
      });
    } else if (type === 'evening-commute') {
      setRoutineInfo({
        type,
        emoji: '🌇',
        label: '퇴근 시간이에요!',
        startAddr: work.address,
        startCoords: work.coordinates,
        endAddr: home.address,
        endCoords: home.coordinates,
        startLabel: '회사',
        endLabel: '집',
      });
    }
  }, []);

  if (!routineInfo || dismissed) return null;

  const handleApply = () => {
    markRoutinePromptShown(routineInfo.type);
    onApply(
      routineInfo.startAddr,
      routineInfo.startCoords,
      routineInfo.endAddr,
      routineInfo.endCoords
    );
    setDismissed(true);
  };

  const handleDismiss = () => {
    markRoutinePromptShown(routineInfo.type);
    setDismissed(true);
  };

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl animate-fade-in mb-4"
      style={{
        background: 'linear-gradient(135deg, var(--blue-50), var(--accent-weak))',
        border: '1px solid var(--blue-200)',
      }}
    >
      <span className="text-2xl shrink-0" aria-hidden="true">
        {routineInfo.emoji}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold mb-1" style={{ color: 'var(--blue-700)' }}>
          {routineInfo.label}
        </p>
        <button
          onClick={handleApply}
          className="flex items-center gap-1.5 active:scale-95 transition-transform"
          aria-label={`${routineInfo.startLabel}에서 ${routineInfo.endLabel}으로 경로 자동 입력`}
        >
          <span
            className="px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{ background: 'var(--blue-150)', color: 'var(--blue-700)' }}
          >
            {routineInfo.startLabel}
          </span>
          <ArrowRight className="w-3 h-3" style={{ color: 'var(--blue-500)' }} />
          <span
            className="px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{ background: 'var(--blue-150)', color: 'var(--blue-700)' }}
          >
            {routineInfo.endLabel}
          </span>
          <span className="text-xs ml-1" style={{ color: 'var(--blue-500)' }}>
            탭해서 입력
          </span>
        </button>
      </div>
      <button
        onClick={handleDismiss}
        className="shrink-0 p-1.5 rounded-full hover:bg-blue-100 active:scale-95 transition-all"
        aria-label="루틴 배너 닫기"
      >
        <X className="w-4 h-4" style={{ color: 'var(--blue-400)' }} />
      </button>
    </div>
  );
}
