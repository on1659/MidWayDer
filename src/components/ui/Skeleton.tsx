/**
 * Skeleton UI - 로딩 상태 표시
 */

'use client';

interface SkeletonProps {
  /** 너비 (Tailwind 클래스) */
  width?: string;
  /** 높이 (Tailwind 클래스) */
  height?: string;
  /** 추가 클래스 */
  className?: string;
}

export function Skeleton({ width = 'w-full', height = 'h-4', className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded ${width} ${height} ${className}`}
      style={{ background: 'var(--bg-surface-muted)' }}
    />
  );
}

export function ResultCardSkeleton() {
  return (
    <div
      className="p-5 md:p-4 rounded-2xl animate-pulse"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}
    >
      {/* 매장명 스켈레톤 */}
      <div className="flex items-start gap-3">
        <Skeleton width="w-11" height="h-11" className="rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton width="w-3/4" height="h-5" />
          <Skeleton width="w-1/2" height="h-4" />
          <div className="flex gap-2 mt-3">
            <Skeleton width="w-20" height="h-6" className="rounded-full" />
            <Skeleton width="w-16" height="h-6" className="rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ResultListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <ResultCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function SearchOverlaySkeleton() {
  return (
    <div className="p-4 space-y-4 animate-pulse">
      {/* 검색바 스켈레톤 */}
      <Skeleton height="h-12" className="rounded-xl" />

      {/* 카테고리 칩 스켈레톤 */}
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} width="w-20" height="h-8" className="rounded-full" />
        ))}
      </div>

      {/* 결과 리스트 스켈레톤 */}
      <ResultListSkeleton count={3} />
    </div>
  );
}
