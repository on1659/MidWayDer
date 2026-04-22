'use client';

/**
 * StatPods — 결과 카드의 핵심 3통계 (이탈시간 / 이탈거리 / 점수) 를
 * 뱃지 인플레이션 없이 깔끔한 3열 그리드 파드로 표시.
 *
 * 2026 디자인 프로포절 기준. 뱃지 나열식 → 정보 위계 확실한 파드식.
 * 색상은 `--accent`, `--text-*`, `--bg-surface-muted` 등 토큰만 사용.
 */

import React from 'react';
import { BarChart3, ChevronDown } from 'lucide-react';
import type { DetourResult } from '@/types/detour';

interface StatPodsProps {
  result: DetourResult;
  sortBy: 'distance' | 'duration' | 'score' | 'closing' | undefined;
  scoreOpen: boolean;
  onToggleScore: () => void;
  /** 결과 전체 이탈 시간 범위 (카드 위계 표기용) */
  detourRange?: number;
  /** 최소 이탈 시간 (1등의 이탈) — 1등이면 "최단" 배지 표시 */
  minDetourDuration?: number;
}

export const StatPods = React.memo(function StatPods({
  result,
  sortBy,
  scoreOpen,
  onToggleScore,
  detourRange = 0,
  minDetourDuration = 0,
}: StatPodsProps) {
  const detourKm = ((result.detourCost?.distance ?? 0) / 1000).toFixed(1);
  const detourMin = Math.round((result.detourCost?.duration ?? 0) / 60);
  const score = Math.round(result.finalScore);

  const isTimeBest = detourRange > 30 && result.detourCost.duration - minDetourDuration < 30;

  return (
    <div
      className="grid grid-cols-3 gap-2 mt-3"
      role="group"
      aria-label="이탈 시간, 이탈 거리, 추천 점수"
    >
      <Pod
        label="이탈 시간"
        value={`+${detourMin}`}
        unit="분"
        emphasized={sortBy === 'duration'}
        accent={isTimeBest}
        subLabel={isTimeBest ? '⭐ 최단' : undefined}
      />
      <Pod
        label="이탈 거리"
        value={`+${detourKm}`}
        unit="km"
        emphasized={sortBy === 'distance'}
      />
      <ScorePod
        score={score}
        emphasized={sortBy === 'score'}
        open={scoreOpen}
        onClick={onToggleScore}
      />
    </div>
  );
});

interface PodProps {
  label: string;
  value: string;
  unit: string;
  emphasized?: boolean;
  accent?: boolean;
  subLabel?: string;
}

function Pod({ label, value, unit, emphasized, accent, subLabel }: PodProps) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-xl py-2.5 px-2 text-center transition-colors"
      style={{
        background: emphasized
          ? 'var(--overlay-selected)'
          : accent
          ? 'rgba(var(--color-accent-rgb), 0.05)'
          : 'var(--bg-surface-muted)',
        border: `1px solid ${
          emphasized ? 'var(--border-accent)' : 'var(--border-soft)'
        }`,
      }}
    >
      <span
        className="text-[10px] font-medium uppercase tracking-wide mb-0.5"
        style={{
          color: emphasized ? 'var(--accent)' : 'var(--text-tertiary)',
          letterSpacing: 'var(--tracking-wide)',
        }}
      >
        {label}
      </span>
      <div className="flex items-baseline gap-0.5">
        <span
          className="text-lg font-bold leading-none"
          style={{
            color: emphasized ? 'var(--accent)' : 'var(--text-primary)',
          }}
        >
          {value}
        </span>
        <span
          className="text-xs font-semibold"
          style={{
            color: emphasized ? 'var(--accent)' : 'var(--text-secondary)',
          }}
        >
          {unit}
        </span>
      </div>
      {subLabel && (
        <span
          className="text-[10px] font-semibold mt-0.5"
          style={{ color: 'var(--color-success-current)' }}
        >
          {subLabel}
        </span>
      )}
    </div>
  );
}

interface ScorePodProps {
  score: number;
  emphasized: boolean;
  open: boolean;
  onClick: () => void;
}

/**
 * MiniStatStrip — 컴팩트 카드(44px 높이)용 축소판.
 * "+X분 · +Ykm · Z점" 인라인 3요소. 점수 탭하면 scoreDetail 토글.
 * accent/토큰만 사용.
 */
interface MiniStatStripProps {
  result: DetourResult;
  sortBy: 'distance' | 'duration' | 'score' | 'closing' | undefined;
  scoreOpen: boolean;
  onToggleScore: (e: React.MouseEvent) => void;
}

export const MiniStatStrip = React.memo(function MiniStatStrip({
  result,
  sortBy,
  scoreOpen,
  onToggleScore,
}: MiniStatStripProps) {
  const detourKm = ((result.detourCost?.distance ?? 0) / 1000).toFixed(1);
  const detourMin = Math.round((result.detourCost?.duration ?? 0) / 60);
  const score = Math.round(result.finalScore);

  return (
    <div
      className="shrink-0 flex items-center gap-0 rounded-full overflow-hidden"
      style={{
        background: 'var(--bg-surface-muted)',
        border: '1px solid var(--border-soft)',
      }}
      role="group"
      aria-label="핵심 통계"
    >
      <span
        className="px-2 py-0.5 text-[11px] font-bold leading-none tabular-nums"
        style={{
          color: sortBy === 'duration' ? 'var(--accent)' : 'var(--text-primary)',
          background: sortBy === 'duration' ? 'var(--overlay-selected)' : 'transparent',
        }}
        title="이탈 시간"
      >
        +{detourMin}분
      </span>
      <span className="text-[10px] select-none" style={{ color: 'var(--text-tertiary)' }}>·</span>
      <span
        className="px-2 py-0.5 text-[11px] font-bold leading-none tabular-nums"
        style={{
          color: sortBy === 'distance' ? 'var(--accent)' : 'var(--text-primary)',
          background: sortBy === 'distance' ? 'var(--overlay-selected)' : 'transparent',
        }}
        title="이탈 거리"
      >
        +{detourKm}km
      </span>
      <button
        onClick={onToggleScore}
        aria-expanded={scoreOpen}
        aria-label={`추천 점수 ${score}점, 분석 ${scoreOpen ? '닫기' : '열기'}`}
        className="px-2 py-0.5 text-[11px] font-bold leading-none tabular-nums transition-colors active:scale-95 flex items-center gap-0.5"
        style={{
          color: scoreOpen
            ? 'var(--text-on-accent)'
            : sortBy === 'score'
            ? 'var(--accent)'
            : 'var(--text-primary)',
          background: scoreOpen
            ? 'var(--accent)'
            : sortBy === 'score'
            ? 'var(--overlay-selected)'
            : 'transparent',
          borderLeft: '1px solid var(--border-soft)',
        }}
      >
        <BarChart3 className="w-2.5 h-2.5" />
        {score}
      </button>
    </div>
  );
});

function ScorePod({ score, emphasized, open, onClick }: ScorePodProps) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-expanded={open}
      aria-label={`추천 점수 ${score}점, 탭해서 분석 ${open ? '닫기' : '열기'}`}
      className="flex flex-col items-center justify-center rounded-xl py-2.5 px-2 text-center transition-all active:scale-[0.97] cursor-pointer"
      style={{
        background: open
          ? 'var(--accent)'
          : emphasized
          ? 'var(--overlay-selected)'
          : 'var(--bg-surface-muted)',
        border: `1px solid ${
          open
            ? 'var(--accent)'
            : emphasized
            ? 'var(--border-accent)'
            : 'var(--border-soft)'
        }`,
      }}
    >
      <span
        className="text-[10px] font-medium uppercase tracking-wide mb-0.5 flex items-center gap-0.5"
        style={{
          color: open
            ? 'var(--text-on-accent)'
            : emphasized
            ? 'var(--accent)'
            : 'var(--text-tertiary)',
          letterSpacing: 'var(--tracking-wide)',
        }}
      >
        <BarChart3 className="w-2.5 h-2.5" />
        점수
      </span>
      <div className="flex items-baseline gap-0.5">
        <span
          className="text-lg font-bold leading-none"
          style={{
            color: open
              ? 'var(--text-on-accent)'
              : emphasized
              ? 'var(--accent)'
              : 'var(--text-primary)',
          }}
        >
          {score}
        </span>
        <span
          className="text-xs font-semibold"
          style={{
            color: open
              ? 'var(--text-on-accent)'
              : emphasized
              ? 'var(--accent)'
              : 'var(--text-secondary)',
          }}
        >
          점
        </span>
      </div>
      <ChevronDown
        className="w-3 h-3 mt-0.5 transition-transform"
        style={{
          color: open
            ? 'var(--text-on-accent)'
            : emphasized
            ? 'var(--accent)'
            : 'var(--text-tertiary)',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
        }}
      />
    </button>
  );
}
