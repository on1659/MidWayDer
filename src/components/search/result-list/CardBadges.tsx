/**
 * CardBadges - 검색 결과 카드 뱃지 영역
 * 이탈정보, 영업시간, 추천 뱃지 렌더링
 */

'use client';

import React from 'react';
import type { DetourResult } from '@/types/detour';
import { getBusinessStatus, getMinutesUntilClose, getMinutesUntilOpen } from '@/lib/business-hours';
import { getRecommendationBadges, getBadgeColor } from '@/lib/recommendation-badges';
import { getVisitCount } from '@/lib/visit-tracking';
import { getRoutePositionLabel } from './utils';

interface CardBadgesProps {
  result: DetourResult;
  rank: number;
  routeHash: string;
  sortBy?: string;
  scoreDetailOpen: boolean;
  onToggleScoreDetail: () => void;
}

export const CardBadges = React.memo(function CardBadges({
  result,
  rank,
  routeHash,
  sortBy = 'score',
  scoreDetailOpen,
  onToggleScoreDetail,
}: CardBadgesProps) {
  const detourKm = ((result.detourCost?.distance ?? 0) / 1000).toFixed(1);
  const detourMin = Math.round(result.detourCost.duration / 60);
  const routeLabel = result.routeType === 'shortest' ? '최단거리' : result.routeType === 'fastest' ? '최단시간' : null;
  const recentClicks = 0; // popularityMap에서 가져와야 함 (Context에서 전달)

  return (
    <div className="flex flex-wrap items-center gap-2 mt-2.5">
      {/* 이탈 거리 */}
      <span
        className="inline-flex items-center px-3 py-1.5 rounded-full text-[13px] font-semibold transition-all"
        style={
          sortBy === 'distance'
            ? { background: 'var(--accent)', color: 'white' }
            : { background: 'var(--accent-weak)', color: 'var(--accent)' }
        }
      >
        {sortBy === 'distance' && '📏 '}+{detourKm}km
      </span>

      {/* 이탈 시간 */}
      <span
        className="inline-flex items-center px-3 py-1.5 rounded-full text-[13px] font-semibold transition-all"
        style={
          sortBy === 'duration'
            ? { background: 'var(--yellow-500, #eab308)', color: 'white' }
            : { background: 'var(--yellow-100)', color: 'var(--yellow-600)' }
        }
      >
        {sortBy === 'duration' && '⏱ '}+{detourMin}분
      </span>

      {/* 경로 타입 */}
      {routeLabel && (
        <span
          className="inline-flex items-center px-3 py-1.5 rounded-full text-[13px] font-semibold"
          style={{ background: 'var(--green-100)', color: 'var(--green-700)' }}
        >
          {routeLabel}
        </span>
      )}

      {/* 경로상 위치 */}
      {(() => {
        const posLabel = getRoutePositionLabel(result);
        if (!posLabel) return null;
        return (
          <span
            className="inline-flex items-center px-3 py-1.5 rounded-full text-[13px] font-semibold"
            style={{ background: 'var(--purple-100)', color: 'var(--purple-700)' }}
          >
            📍 {posLabel}
          </span>
        );
      })()}

      {/* 인기도 */}
      {recentClicks >= 2 && (
        <span
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[13px] font-semibold"
          style={{ background: 'var(--orange-100)', color: 'var(--orange-600)' }}
        >
          🔥 {recentClicks}명 관심
        </span>
      )}

      {/* 영업시간 상태 */}
      {result.place.businessHours && (() => {
        const status = getBusinessStatus(result.place.businessHours);
        if (status.label === '정보 없음') return null;
        const minsUntilClose = status.isOpen ? getMinutesUntilClose(result.place.businessHours) : null;
        const minsUntilOpen = !status.isOpen ? getMinutesUntilOpen(result.place.businessHours) : null;
        const isUrgentClose = minsUntilClose !== null && minsUntilClose <= 30;
        const isOpeningSoon = minsUntilOpen !== null && minsUntilOpen <= 30;

        return (
          <>
            <span
              className="inline-flex items-center px-3 py-1.5 rounded-full text-[13px] font-semibold"
              style={{
                background: isUrgentClose ? '#fef3c7' : status.isOpen ? 'var(--green-100)' : 'var(--red-100)',
                color: isUrgentClose ? '#92400e' : status.color,
                border: isUrgentClose ? '1.5px solid #fbbf24' : undefined,
              }}
            >
              {isUrgentClose ? '⚠️' : status.emoji}{' '}
              {isUrgentClose ? `${minsUntilClose}분 후 마감` : status.label}
            </span>
            {isOpeningSoon && (
              <span
                className="inline-flex items-center px-3 py-1.5 rounded-full text-[13px] font-semibold"
                style={{ background: '#dbeafe', color: '#1d4ed8', border: '1.5px solid #93c5fd' }}
              >
                🕐 {minsUntilOpen}분 후 오픈
              </span>
            )}
          </>
        );
      })()}

      {/* 점수 버튼 */}
      <button
        onClick={onToggleScoreDetail}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[13px] font-semibold transition-all active:scale-95"
        style={{
          background: scoreDetailOpen
            ? 'var(--accent)'
            : sortBy === 'score'
            ? 'var(--blue-200)'
            : 'var(--blue-100)',
          color: scoreDetailOpen ? 'white' : 'var(--blue-700)',
          border: `1.5px solid ${
            scoreDetailOpen
              ? 'var(--accent)'
              : sortBy === 'score'
              ? 'var(--blue-400)'
              : 'var(--blue-200)'
          }`,
        }}
      >
        📊 {Math.round(result.finalScore)}점
      </button>

      {/* 추천 뱃지 */}
      {(() => {
        const visitCount = routeHash ? getVisitCount(result.place.id, routeHash) : 0;
        const badges = getRecommendationBadges(result, rank + 1, undefined, visitCount);
        if (badges.length === 0) return null;

        return (
          <>
            {badges.map((badge, i) => {
              const colors = getBadgeColor(badge.type);
              return (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold"
                  style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
                  title={badge.description}
                >
                  <span>{badge.icon}</span>
                  <span>{badge.label}</span>
                </span>
              );
            })}
          </>
        );
      })()}
    </div>
  );
});
