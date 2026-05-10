'use client';

import { useState } from 'react';
import { ChevronRight, Clock, Route as RouteIcon, Filter } from 'lucide-react';
import type { DetourResult } from '@/types/detour';
import { getBusinessStatus, getMinutesUntilClose } from '@/lib/business-hours';

interface WaypointResultsSheetProps {
  results: DetourResult[];
  totalCandidates: number;
  category: string;
  selectedId?: string | null;
  onSelect: (result: DetourResult) => void;
  onChangeCategory?: () => void;
}

type FilterKey = 'all' | 'fast' | 'near' | 'open' | 'close-route';

const CATEGORIES = ['카페', '편의점', '다이소', '올리브영', '스타벅스', '맥도날드', '주유소'];

export default function WaypointResultsSheet({
  results,
  totalCandidates,
  category,
  selectedId,
  onSelect,
  onChangeCategory,
}: WaypointResultsSheetProps) {
  const [filter, setFilter] = useState<FilterKey>('all');

  const filtered = results.filter((r) => {
    if (filter === 'fast') return r.detourCost.duration <= 300;
    if (filter === 'near') return r.detourCost.distance <= 1000;
    if (filter === 'open') {
      const status = getBusinessStatus(r.place.businessHours);
      // 정보 없음 매장은 제외하지 않음 (B-6: 영업시간 미입력 매장 일괄 제외 방지)
      return status.isOpen || status.label === '정보 없음';
    }
    if (filter === 'close-route') return r.proximityScore >= 70;
    return true;
  });

  return (
    <div className="flex max-h-[75dvh] min-h-[40dvh] flex-col">
      <div className="flex justify-center pt-2 pb-1">
        <div className="h-1.5 w-9 rounded-full" style={{ background: 'var(--border-strong)' }} />
      </div>

      <div className="px-4 pt-1">
        <div className="flex items-center justify-between">
          <div>
            <h2
              className="text-lg font-bold tracking-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              {category}{' '}
              <span style={{ color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>
                {results.length}개
              </span>
            </h2>
            <p className="mt-0.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
              경로에서 가장 가기 편한 곳부터 정렬
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {/* 정렬 라벨: 현재는 추천순 단일 — 향후 정렬 옵션 추가 시 button으로 승격 */}
            <span
              className="text-[13px] font-semibold"
              style={{ color: 'var(--accent)' }}
            >
              ⇅ 추천순
            </span>
            {onChangeCategory && (
              <button
                type="button"
                onClick={onChangeCategory}
                aria-label="카테고리 변경"
                className="flex h-7 w-7 items-center justify-center rounded-full"
                style={{ background: 'var(--bg-surface-muted)', color: 'var(--text-primary)' }}
              >
                <Filter className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="mt-3 -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
          <Chip active={filter === 'all'} onClick={() => setFilter('all')}>
            전체
          </Chip>
          <Chip active={filter === 'fast'} onClick={() => setFilter('fast')}>
            ⏱ 5분 이내
          </Chip>
          <Chip active={filter === 'near'} onClick={() => setFilter('near')}>
            📏 1km 이내
          </Chip>
          <Chip active={filter === 'open'} onClick={() => setFilter('open')}>
            🟢 영업 중
          </Chip>
          <Chip active={filter === 'close-route'} onClick={() => setFilter('close-route')}>
            📍 경로 근접
          </Chip>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6 pt-2">
        {filtered.length === 0 && (
          <div
            className="rounded-2xl px-6 py-12 text-center"
            style={{ background: 'var(--bg-surface-muted)' }}
          >
            <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              조건에 맞는 결과가 없어요
            </div>
            <div className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
              필터를 풀고 다시 확인해주세요
            </div>
          </div>
        )}

        {filtered.map((r, idx) => (
          <ResultCard
            key={r.place.id}
            result={r}
            rank={idx + 1}
            isBest={idx === 0}
            isSelected={selectedId === r.place.id}
            onClick={() => onSelect(r)}
          />
        ))}

        {totalCandidates > results.length && (
          <div
            className="mt-3 rounded-xl px-4 py-3 text-center text-xs"
            style={{ background: 'var(--bg-surface-muted)', color: 'var(--text-secondary)' }}
          >
            {totalCandidates}개 후보 중 가장 좋은 {results.length}개 표시
          </div>
        )}
      </div>
    </div>
  );
}

// WCAG 2.5.5 / Apple HIG 44×44 터치 타겟 보장 (Tailwind arbitrary — 향후 --touch-target 토큰 추가 시 교체)
function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[44px] flex-shrink-0 items-center whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold transition"
      style={{
        background: active ? 'rgba(var(--color-accent-rgb), 0.1)' : 'var(--bg-surface-muted)',
        color: active ? 'var(--accent)' : 'var(--text-secondary)',
        border: active
          ? '1px solid rgba(var(--color-accent-rgb), 0.25)'
          : '1px solid transparent',
      }}
    >
      {children}
    </button>
  );
}

interface ResultCardProps {
  result: DetourResult;
  rank: number;
  isBest: boolean;
  isSelected: boolean;
  onClick: () => void;
}

function ResultCard({ result, rank, isBest, isSelected, onClick }: ResultCardProps) {
  const detourMin = Math.round(result.detourCost.duration / 60);
  const detourKm = (result.detourCost.distance / 1000).toFixed(1);
  const businessStatus = getBusinessStatus(result.place.businessHours);
  const minutesUntilClose = getMinutesUntilClose(result.place.businessHours);
  const statusLabel = (() => {
    if (!businessStatus.label || businessStatus.label === '정보 없음') return null;
    // 30분 이내 마감 임박: "22:00 마감" 형식 (목업 D-11 정합성)
    if (businessStatus.isOpen && minutesUntilClose != null && minutesUntilClose <= 30) {
      const closeAt = new Date(Date.now() + minutesUntilClose * 60 * 1000);
      const hh = String(closeAt.getHours()).padStart(2, '0');
      const mm = String(closeAt.getMinutes()).padStart(2, '0');
      return { text: `● ${hh}:${mm} 마감`, color: 'var(--color-warning-current)' };
    }
    return {
      text: `● ${businessStatus.label}`,
      color: businessStatus.isOpen ? 'var(--color-success-current)' : 'var(--text-tertiary)',
    };
  })();

  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-2 flex w-full items-start gap-3 rounded-2xl p-3.5 text-left transition"
      style={{
        background: 'var(--bg-surface)',
        border: isBest
          ? '2px solid var(--accent)'
          : `1px solid ${isSelected ? 'var(--accent)' : 'var(--border-soft)'}`,
        boxShadow: isBest ? '0 4px 12px rgba(var(--color-accent-rgb), 0.15)' : 'none',
      }}
    >
      <div
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold"
        style={
          isBest
            ? {
                background: 'linear-gradient(135deg, #fde047, #f59e0b)',
                color: '#fff',
              }
            : {
                background: 'var(--bg-surface-muted)',
                color: 'var(--text-secondary)',
              }
        }
      >
        {isBest ? '🥇' : rank}
      </div>

      <div className="min-w-0 flex-1">
        <div
          className="text-[15px] font-bold leading-tight"
          style={{ color: 'var(--text-primary)' }}
        >
          {result.place.name}
        </div>
        <div
          className="mt-0.5 truncate text-xs"
          style={{ color: 'var(--text-secondary)' }}
        >
          {result.place.address}
        </div>
        <div className="mt-2 flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1 font-semibold">
            <Clock className="h-3 w-3" style={{ color: 'var(--color-warning-current)' }} />
            <strong
              className="text-sm"
              style={{ color: 'var(--color-warning-current)' }}
            >
              +{detourMin}분
            </strong>
            <span style={{ color: 'var(--text-secondary)' }}>추가</span>
          </div>
          <div className="flex items-center gap-1 font-semibold">
            <RouteIcon className="h-3 w-3" style={{ color: 'var(--text-secondary)' }} />
            <strong className="text-sm" style={{ color: 'var(--text-primary)' }}>
              +{detourKm}km
            </strong>
          </div>
          {statusLabel && (
            <span className="font-semibold" style={{ color: statusLabel.color }}>
              {statusLabel.text}
            </span>
          )}
        </div>
      </div>

      <ChevronRight
        className="h-4 w-4 flex-shrink-0 self-center"
        style={{ color: 'var(--text-tertiary)' }}
      />
    </button>
  );
}

export function CategoryPicker({
  current,
  onPick,
  onClose,
}: {
  current: string;
  onPick: (c: string) => void;
  onClose: () => void;
}) {
  return (
    <>
      <div
        className="fixed inset-0 z-[110]"
        style={{ background: 'rgba(0,0,0,0.3)' }}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="fixed bottom-0 left-0 right-0 z-[120] rounded-t-3xl px-5 pb-6 pt-3"
        style={{
          background: 'var(--bg-surface)',
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)',
        }}
      >
        <div className="mb-4 flex justify-center">
          <div className="h-1.5 w-9 rounded-full" style={{ background: 'var(--border-strong)' }} />
        </div>
        <h3 className="mb-3 text-base font-bold" style={{ color: 'var(--text-primary)' }}>
          어떤 곳을 들를까요?
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                onPick(c);
                onClose();
              }}
              className="rounded-xl py-3 text-sm font-semibold transition"
              style={{
                background:
                  c === current
                    ? 'rgba(var(--color-accent-rgb), 0.1)'
                    : 'var(--bg-surface-muted)',
                color: c === current ? 'var(--accent)' : 'var(--text-primary)',
                border:
                  c === current
                    ? '1px solid rgba(var(--color-accent-rgb), 0.3)'
                    : '1px solid transparent',
              }}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
