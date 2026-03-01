'use client';

import { useState, useEffect } from 'react';
import { LOADING_STAGES } from '../utils';

export interface UseLoadingStagesReturn {
  loadingStage: number;
  currentStageName: string;
}

export function useLoadingStages(isLoading: boolean): UseLoadingStagesReturn {
  const [loadingStage, setLoadingStage] = useState(0);

  useEffect(() => {
    if (!isLoading) {
      setLoadingStage(0);
      return;
    }
    const timers: ReturnType<typeof setTimeout>[] = [];
    LOADING_STAGES.forEach((stage, idx) => {
      if (idx === 0 || stage.delay === 0) return; // 0번째는 즉시 표시
      const timer = setTimeout(() => setLoadingStage(idx), stage.delay);
      timers.push(timer);
    });
    return () => timers.forEach(clearTimeout);
  }, [isLoading]);

  const currentStageName = LOADING_STAGES[loadingStage]?.text ?? '';

  return { loadingStage, currentStageName };
}
