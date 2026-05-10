'use client';

import { X, ArrowRight, Search } from 'lucide-react';

interface SlotInfo {
  address: string | null;
  name?: string;
}

interface RouteSummaryCardProps {
  start: SlotInfo;
  end: SlotInfo;
  onClearStart: () => void;
  onClearEnd: () => void;
  onEditStart: () => void;
  onEditEnd: () => void;
  onSearchWaypoints: () => void;
  isSearching?: boolean;
}

export default function RouteSummaryCard({
  start,
  end,
  onClearStart,
  onClearEnd,
  onEditStart,
  onEditEnd,
  onSearchWaypoints,
  isSearching = false,
}: RouteSummaryCardProps) {
  const hasStart = !!start.address;
  const hasEnd = !!end.address;
  const canSearch = hasStart && hasEnd && !isSearching;

  return (
    <div
      className="rounded-2xl p-3"
      style={{
        background: 'var(--bg-surface)',
        boxShadow: '0 12px 24px rgba(0,0,0,0.08), 0 4px 8px rgba(0,0,0,0.04)',
      }}
    >
      <SlotRow
        kind="start"
        label="출발"
        info={start}
        onClear={onClearStart}
        onEdit={onEditStart}
      />
      <div
        className="my-1 ml-9 h-px"
        style={{ background: 'var(--border-soft)' }}
      />
      <SlotRow
        kind="end"
        label="도착"
        info={end}
        onClear={onClearEnd}
        onEdit={onEditEnd}
      />

      <button
        type="button"
        onClick={onSearchWaypoints}
        disabled={!canSearch}
        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl py-3 text-sm font-semibold transition"
        style={{
          background: canSearch ? 'var(--accent)' : 'var(--bg-surface-muted)',
          color: canSearch ? '#fff' : 'var(--text-tertiary)',
          cursor: canSearch ? 'pointer' : 'not-allowed',
        }}
      >
        {isSearching ? (
          <>경유지 찾는 중...</>
        ) : (
          <>
            <Search className="h-4 w-4" />
            경유지 찾기
            {canSearch && <ArrowRight className="h-4 w-4" />}
          </>
        )}
      </button>
    </div>
  );
}

interface SlotRowProps {
  kind: 'start' | 'end';
  label: string;
  info: SlotInfo;
  onClear: () => void;
  onEdit: () => void;
}

function SlotRow({ kind, label, info, onClear, onEdit }: SlotRowProps) {
  const filled = !!info.address;
  const dotColor = kind === 'start' ? 'var(--accent)' : 'var(--color-error-current, #ef4444)';
  const display = info.name || info.address || '';

  return (
    <button
      type="button"
      onClick={onEdit}
      className="flex w-full items-center gap-2.5 rounded-lg px-1 py-1.5 text-left transition hover:bg-[var(--bg-surface-muted)]"
    >
      <span
        className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
        style={{
          background: dotColor,
          opacity: filled ? 1 : 0.3,
        }}
      />
      <span
        className="w-7 flex-shrink-0 text-[11px] font-semibold uppercase tracking-wide"
        style={{ color: 'var(--text-tertiary)' }}
      >
        {label}
      </span>
      <span
        className="flex-1 truncate text-sm"
        style={{
          color: filled ? 'var(--text-primary)' : 'var(--text-tertiary)',
          fontWeight: filled ? 500 : 400,
        }}
      >
        {filled ? display : `${label}지를 검색하세요`}
      </span>
      {filled && (
        <span
          role="button"
          tabIndex={0}
          aria-label={`${label}지 지우기`}
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              onClear();
            }
          }}
          className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <X className="h-3.5 w-3.5" />
        </span>
      )}
    </button>
  );
}
