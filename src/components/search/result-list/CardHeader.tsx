/**
 * CardHeader - 검색 결과 카드 상단 정보
 * 랭크, 카테고리 아이콘, 이름, 주소 렌더링
 */

'use client';

import React from 'react';
import { CheckCircle } from 'lucide-react';
import { getCategoryIcon } from '@/lib/category-icons';
import { highlightText } from './utils';

interface CardHeaderProps {
  rank: number;
  category: string;
  name: string;
  address?: string;
  nameFilter?: string;
  isPinned: boolean;
  isVisited: boolean;
  visitedAt?: string;
  visitedDateLabel?: string;
}

function getVisitDateLabel(visitedAt: string): string {
  const visited = new Date(visitedAt);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - visited.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return '오늘';
  if (diffDays === 1) return '어제';
  if (diffDays < 7) return `${diffDays}일 전`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`;
  return `${Math.floor(diffDays / 30)}개월 전`;
}

export const CardHeader = React.memo(function CardHeader({
  rank,
  category,
  name,
  address,
  nameFilter,
  isPinned,
  isVisited,
  visitedAt,
}: CardHeaderProps) {
  return (
    <>
      {/* 핀 고정 뱃지 */}
      {isPinned && !isVisited && (
        <div
          className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold pointer-events-none"
          style={{ background: 'var(--accent)', color: 'white' }}
        >
          📌 상단 고정
        </div>
      )}

      {/* 방문 완료 뱃지 */}
      {isVisited && (
        <div
          className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold pointer-events-none"
          style={{ background: '#d1fae5', color: '#065f46' }}
        >
          <CheckCircle className="w-3 h-3" />
          방문함{visitedAt ? ` (${getVisitDateLabel(visitedAt)})` : ''}
        </div>
      )}

      <div className="flex items-start gap-3">
        {/* Rank badge + Category icon */}
        <div className="flex flex-col items-center gap-1 shrink-0">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center text-base font-bold"
            style={{
              background: rank === 0 ? 'var(--accent)' : 'var(--blue-150)',
              color: rank === 0 ? 'var(--bg-surface)' : 'var(--accent)',
            }}
          >
            {rank + 1}
          </div>
          <span className="text-xl">{getCategoryIcon(category)}</span>
        </div>

        {/* Name + Address */}
        <div className="flex-1 min-w-0 mr-2">
          <h3 className="text-lg md:text-[17px] font-bold truncate" style={{ color: 'var(--text-primary)' }}>
            {highlightText(name, nameFilter)}
          </h3>
          {address && (
            <p className="text-sm md:text-[13px] mt-1 truncate" style={{ color: 'var(--text-secondary)' }}>
              {highlightText(address, nameFilter)}
            </p>
          )}
        </div>
      </div>
    </>
  );
});
