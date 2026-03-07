'use client';

import React from 'react';
import { Copy, Check, Navigation, Star, Phone, CheckCircle, Circle, Share2, Bookmark, Pencil, MoreHorizontal } from 'lucide-react';
import type { DetourResult } from '@/types/detour';
import { getCategoryIcon } from '@/lib/category-icons';
import { getBusinessStatus, getMinutesUntilClose, getMinutesUntilOpen, getBusinessHoursRange } from '@/lib/business-hours';
import { getRecommendationBadges, getBadgeColor } from '@/lib/recommendation-badges';
import { getVisitCount } from '@/lib/visit-tracking';
import { getSmartOneLiner } from '@/lib/smart-summary';
import { useResultList } from './ResultListContext';
import {
  getRoutePositionLabel,
  getETAText,
  getVisitDateLabel,
  getBestPickReason,
  highlightText,
  haversineDistanceKm,
} from './utils';

interface ResultCardProps {
  result: DetourResult;
  index: number;
  isSelected: boolean;
  swipeHandlers: {
    onTouchStart: (e: React.TouchEvent, id: string) => void;
    onTouchMove: (e: React.TouchEvent, id: string) => void;
    onTouchEnd: (result: DetourResult) => void;
  };
  swipeVisual: { id: string; deltaX: number } | null;
  swipeHintId: string | null;
  swipeHintDeltaX: number;
  onHoverResult?: (id: string | null) => void;
  disabled?: boolean;
}

export const ResultCard = React.memo(function ResultCard({
  result,
  index,
  isSelected,
  swipeHandlers,
  swipeVisual,
  swipeHintId,
  swipeHintDeltaX,
  onHoverResult,
  disabled = false,
}: ResultCardProps) {
  const ctx = useResultList();
  const {
    favPlaces, visitedDates, pinnedIds, memoMap, popularityMap,
    copiedId, sharedId, scoreDetailOpenId, overflowMenuId, editingMemoId, editingMemoText,
    isNowDeparture, nowMs, departureMs, dwellMinutes, departureTime,
    sortBy, currentLocation, closestPlaceId,
    detourRange, minDetourDuration,
    preferredNavApp, routeHash, nameFilter,
    onTogglePin, onToggleFav, onVisitToggle, onSelect, onCopyAddress, onShare,
    onEditMemo, onSaveMemo, onCancelMemo, setEditingMemoText,
    onSetScoreDetail, onSetOverflowMenu,
    onOpenNavi, onOpenNaviSheet,
  } = ctx;

  const isVisited = visitedDates.has(result.place.id);
  const visitedAt = visitedDates.get(result.place.id);
  const detourKm = (result.detourCost.distance / 1000).toFixed(1);
  const detourMin = Math.round(result.detourCost.duration / 60);
  const routeLabel = result.routeType === 'shortest' ? '최단거리' : result.routeType === 'fastest' ? '최단시간' : null;
  const recentClicks = popularityMap[result.place.id] ?? 0;

  const currentDistKm = currentLocation
    ? haversineDistanceKm(
        currentLocation.lat, currentLocation.lng,
        result.place.coordinates.lat, result.place.coordinates.lng
      )
    : null;
  const isClosest = closestPlaceId === result.place.id;

  const isBeingSwiped = swipeVisual?.id === result.place.id;
  const isHinting = swipeHintId === result.place.id;
  const swipeDeltaX = isBeingSwiped ? swipeVisual!.deltaX : (isHinting ? swipeHintDeltaX : 0);
  const swipeOpacity = Math.min(1, Math.abs(swipeDeltaX) / 80);

  const detourRatio = detourRange > 30
    ? (result.detourCost.duration - minDetourDuration) / detourRange
    : 0;
  const stripeColor = detourRatio < 0.3 ? '#22c55e' : detourRatio < 0.65 ? '#f59e0b' : '#f97316';

  const animDelay = index < 10 ? index * 30 : 0;

  return (
    <div
      className="card-stagger result-card-hover relative overflow-hidden rounded-2xl shadow-sm"
      style={{
        animationDelay: `${animDelay}ms`,
        opacity: isVisited ? 0.65 : 1,
        transition: 'opacity 0.3s',
      }}
      role="listitem"
      aria-setsize={-1}
      aria-posinset={index + 1}
      aria-describedby={`result-desc-${result.place.id}`}
    >
      {/* 스크린 리더용 부가 정보 */}
      <span
        id={`result-desc-${result.place.id}`}
        className="sr-only"
      >
        {result.place.name}, 이탈 {detourKm}km {detourMin}분
      </span>
      {/* 이탈비용 컬러 스트라이프 */}
      <div
        className="absolute left-0 top-0 bottom-0 z-[1] rounded-l-2xl pointer-events-none"
        style={{ width: 4, background: stripeColor }}
        aria-hidden="true"
      />
      {/* 핀 고정 뱃지 */}
      {pinnedIds.has(result.place.id) && !isVisited && (
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
          style={{ background: 'var(--green-100)', color: 'var(--green-700)' }}
        >
          <CheckCircle className="w-3 h-3" />
          방문함{visitedAt ? ` (${getVisitDateLabel(visitedAt)})` : ''}
        </div>
      )}
      {/* 스와이프 힌트 툴팁 */}
      {isHinting && (
        <div
          className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2.5 px-3 py-1.5 rounded-full text-[11px] font-bold pointer-events-none"
          style={{ background: 'rgba(0,0,0,0.72)', color: 'white', whiteSpace: 'nowrap' }}
        >
          <span>← 주소 복사</span>
          <span style={{ opacity: 0.35 }}>|</span>
          <span>네비 →</span>
        </div>
      )}
      {/* Swipe right → 네비 힌트 */}
      <div
        className="absolute inset-y-0 left-0 flex items-center gap-1.5 px-5"
        style={{
          background: `rgba(34, 197, 94, ${swipeOpacity})`,
          opacity: swipeDeltaX > 8 ? 1 : 0,
          transition: !isBeingSwiped ? 'all 0.2s' : 'none',
          minWidth: 88,
          pointerEvents: 'none',
        }}
      >
        <Navigation className="w-5 h-5 text-white" />
        <span className="text-white text-xs font-bold whitespace-nowrap">네비</span>
      </div>
      {/* Swipe left → 복사 힌트 */}
      <div
        className="absolute inset-y-0 right-0 flex items-center justify-end gap-1.5 px-5"
        style={{
          background: `rgba(59, 130, 246, ${swipeOpacity})`,
          opacity: swipeDeltaX < -8 ? 1 : 0,
          transition: !isBeingSwiped ? 'all 0.2s' : 'none',
          minWidth: 88,
          pointerEvents: 'none',
        }}
      >
        <span className="text-white text-xs font-bold whitespace-nowrap">복사</span>
        <Copy className="w-5 h-5 text-white" />
      </div>

      <div
        data-result-index={index}
        onClick={() => !disabled && onSelect(result, index + 1)}
        onMouseEnter={() => onHoverResult?.(result.place.id)}
        onMouseLeave={() => onHoverResult?.(null)}
        onTouchStart={(e) => !disabled && swipeHandlers.onTouchStart(e, result.place.id)}
        onTouchMove={(e) => !disabled && swipeHandlers.onTouchMove(e, result.place.id)}
        onTouchEnd={() => !disabled && swipeHandlers.onTouchEnd(result)}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
            e.preventDefault();
            onSelect(result, index + 1);
          }
        }}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={`${result.place.name}, ${result.place.category}, 이탈 거리 ${detourKm}킬로미터, 이탈 시간 ${detourMin}분${isSelected ? ', 선택됨' : ''}${disabled ? ', 비활성화됨' : ''}`}
        className={`w-full p-5 md:p-4 rounded-2xl text-left ${disabled ? 'cursor-not-allowed' : 'cursor-pointer active:scale-[0.98]'} group hover:shadow-md transition-shadow`}
        style={{
          background: isSelected ? 'var(--blue-200)' : disabled ? 'var(--bg-surface-muted)' : 'var(--bg-surface)',
          border: isSelected ? '1.5px solid var(--accent)' : '1px solid var(--border-soft)',
          transform: `translateX(${swipeDeltaX}px)`,
          transition: !isBeingSwiped ? 'transform 0.35s ease' : 'none',
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {/* 🏆 베스트 픽 배너 */}
        {index === 0 && (
          <button
            className="mb-3 -mx-1 px-3 py-1.5 rounded-xl flex items-center gap-2 text-[12px] font-bold transition-all active:scale-[0.98]"
            style={{
              width: 'calc(100% + 8px)',
              textAlign: 'left',
              background: 'linear-gradient(90deg, var(--yellow-100), var(--orange-50, #fff7ed))',
              color: 'var(--yellow-700)',
              border: scoreDetailOpenId === result.place.id
                ? '1.5px solid var(--yellow-400, #facc15)'
                : '1px solid var(--yellow-300)',
            }}
            onClick={(e) => {
              e.stopPropagation();
              onSetScoreDetail(scoreDetailOpenId === result.place.id ? null : result.place.id);
            }}
            title="탭해서 추천 점수 분석 보기"
          >
            <span>🏆</span>
            <span className="flex-1">베스트 픽 — {getBestPickReason(result)}</span>
            <span className="text-[10px] opacity-60 shrink-0">
              {scoreDetailOpenId === result.place.id ? '▲ 접기' : '📊 분석'}
            </span>
          </button>
        )}

        <div className="flex items-start gap-3">
          {/* Rank badge */}
          <div className="flex flex-col items-center gap-1 shrink-0">
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center text-base font-bold"
              style={{
                background: index === 0 ? 'var(--accent)' : 'var(--blue-150)',
                color: index === 0 ? 'var(--bg-surface)' : 'var(--accent)',
              }}
            >
              {index + 1}
            </div>
            <span className="text-xl">{getCategoryIcon(result.place.category)}</span>
          </div>

          <div className="flex-1 min-w-0 mr-2">
            <h3 className="text-lg md:text-[17px] font-bold truncate" style={{ color: '#3274F9' }}>
              {highlightText(result.place.name, nameFilter)}
            </h3>
            {(result.place.roadAddress || result.place.address) && (
              <p className="text-sm md:text-[13px] mt-1 truncate" style={{ color: 'var(--text-secondary)' }}>
                {highlightText(result.place.roadAddress || result.place.address || '', nameFilter)}
              </p>
            )}

            {/* 뱃지 */}
            <div className="flex flex-wrap items-center gap-2 mt-2.5">
              <span
                className="inline-flex items-center px-3 py-1.5 rounded-full text-[13px] font-semibold transition-all"
                style={
                  sortBy === 'distance'
                    ? { background: 'var(--success)', color: 'white' }
                    : { background: 'var(--green-100)', color: 'var(--success)' }
                }
              >
                {sortBy === 'distance' && '📏 '}+{detourKm}km
              </span>
              <span
                className="inline-flex items-center px-3 py-1.5 rounded-full text-[13px] font-semibold transition-all"
                style={
                  sortBy === 'duration'
                    ? { background: 'var(--success)', color: 'white' }
                    : { background: 'var(--green-100)', color: 'var(--success)' }
                }
              >
                {sortBy === 'duration' && '⏱ '}+{detourMin}분
              </span>
              {routeLabel && (
                <span
                  className="inline-flex items-center px-3 py-1.5 rounded-full text-[13px] font-semibold"
                  style={{ background: 'var(--green-100)', color: 'var(--green-700)' }}
                >
                  {routeLabel}
                </span>
              )}
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
              {recentClicks >= 2 && (
                <span
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[13px] font-semibold"
                  style={{ background: 'var(--orange-100)', color: 'var(--orange-600)' }}
                >
                  🔥 {recentClicks}명 관심
                </span>
              )}
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
              {currentDistKm !== null && (
                <span
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[13px] font-semibold transition-all"
                  style={
                    isClosest
                      ? { background: '#dcfce7', color: '#15803d', border: '1.5px solid #86efac' }
                      : { background: 'var(--bg-surface)', color: 'var(--text-muted)', border: '1px solid var(--border-soft)' }
                  }
                >
                  {isClosest ? '📍 내 위치 최근접' : '📍'} {currentDistKm < 1 ? `${Math.round(currentDistKm * 1000)}m` : `${currentDistKm.toFixed(1)}km`}
                </span>
              )}
              {currentDistKm !== null && currentDistKm < 0.3 && (
                <span
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[13px] font-semibold"
                  style={{ background: '#ecfdf5', color: '#059669', border: '1.5px solid #6ee7b7' }}
                >
                  🚶 도보 {Math.ceil(currentDistKm * 1000 / 80)}분
                </span>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSetScoreDetail(scoreDetailOpenId === result.place.id ? null : result.place.id);
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[13px] font-semibold transition-all active:scale-95"
                style={{
                  background: scoreDetailOpenId === result.place.id
                    ? 'var(--accent)'
                    : sortBy === 'score'
                    ? 'var(--blue-200)'
                    : 'var(--blue-100)',
                  color: scoreDetailOpenId === result.place.id ? 'white' : 'var(--blue-700)',
                  border: `1.5px solid ${
                    scoreDetailOpenId === result.place.id
                      ? 'var(--accent)'
                      : sortBy === 'score'
                      ? 'var(--blue-400)'
                      : 'var(--blue-200)'
                  }`,
                }}
              >
                📊 {Math.round(result.finalScore)}점
              </button>
            </div>

            {/* 상대적 이탈 비교 바 */}
            {detourRange > 30 && (() => {
              const deltaSec = result.detourCost.duration - minDetourDuration;
              const deltaMin = Math.round(deltaSec / 60);
              const ratio = deltaSec / detourRange;
              const barColor = ratio < 0.3 ? '#22c55e' : ratio < 0.65 ? '#f59e0b' : '#f97316';
              const textColor = ratio < 0.3 ? '#16a34a' : ratio < 0.65 ? '#b45309' : '#ea580c';
              const isBest = deltaSec < 30;
              return (
                <div className="mt-2.5 flex items-center gap-2">
                  <span className="text-[10px] shrink-0" style={{ color: 'var(--text-muted)' }}>이탈</span>
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-soft)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${Math.max(4, Math.round(ratio * 100))}%`, background: barColor }}
                    />
                  </div>
                  <span
                    className="text-[10px] font-semibold shrink-0 min-w-[44px] text-right"
                    style={{ color: isBest ? '#16a34a' : textColor }}
                  >
                    {isBest ? '⭐최단' : `+${deltaMin}분 더`}
                  </span>
                </div>
              );
            })()}

            {/* 영업시간 타임라인 */}
            {result.place.businessHours && (() => {
              const range = getBusinessHoursRange(result.place.businessHours);
              if (!range || range.is24h) return null;
              const TOTAL = 24 * 60;
              const now = new Date();
              const currentMin = now.getHours() * 60 + now.getMinutes();
              const openPct = (range.startMin / TOTAL) * 100;
              const closePct = Math.min((range.endMin / TOTAL) * 100, 100);
              const nowPct = (currentMin / TOTAL) * 100;
              const fmtMin = (m: number) => {
                const h = Math.floor((m % (24 * 60)) / 60);
                const min = (m % (24 * 60)) % 60;
                return `${h}:${String(min).padStart(2, '0')}`;
              };
              const bizStatus = getBusinessStatus(result.place.businessHours);
              return (
                <div className="mt-2" title={`영업: ${fmtMin(range.startMin)} ~ ${fmtMin(range.endMin)}`}>
                  <div className="relative h-2 rounded-full" style={{ background: 'var(--border-soft)' }}>
                    <div
                      className="absolute top-0 bottom-0 rounded-full"
                      style={{
                        left: `${openPct}%`,
                        width: `${Math.max(0, closePct - openPct)}%`,
                        background: bizStatus.isOpen ? '#22c55e' : '#9ca3af',
                      }}
                    />
                    <div
                      className="absolute top-[-1px] bottom-[-1px] z-10 rounded-sm"
                      style={{ left: `${nowPct}%`, width: 2, background: '#ef4444' }}
                    />
                  </div>
                  <div className="flex justify-between mt-0.5">
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{fmtMin(range.startMin)}</span>
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{fmtMin(range.endMin)}</span>
                  </div>
                </div>
              );
            })()}

            {/* 점수 분해 */}
            {scoreDetailOpenId === result.place.id && (() => {
              const detourScore = Math.max(0, Math.round(100 - result.detourCost.costScore));
              const proxScore = Math.round(result.proximityScore);
              const finalScoreRounded = Math.round(result.finalScore);
              return (
                <div
                  className="mt-2.5 p-3 rounded-xl space-y-2.5"
                  style={{ background: 'var(--bg-muted, #f3f4f6)', border: '1px solid var(--border-soft)' }}
                >
                  <p className="text-[11px] font-bold" style={{ color: 'var(--text-secondary)' }}>
                    📊 추천 점수 분석 (이탈비용 70% + 근접도 30%)
                  </p>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>최종 점수</span>
                      <span className="text-[11px] font-bold" style={{ color: 'var(--accent)' }}>{finalScoreRounded}점</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-soft)' }}>
                      <div className="h-full rounded-full" style={{ width: `${finalScoreRounded}%`, background: 'var(--accent)' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                        🚗 이탈 비용 <span style={{ color: 'var(--text-muted)' }}>(70%)</span>
                      </span>
                      <span className="text-[11px] font-semibold" style={{ color: '#16a34a' }}>{detourScore}점</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-soft)' }}>
                      <div className="h-full rounded-full" style={{ width: `${detourScore}%`, background: '#22c55e' }} />
                    </div>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      +{detourKm}km · +{detourMin}분 추가 이탈
                    </p>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                        📍 경로 근접도 <span style={{ color: 'var(--text-muted)' }}>(30%)</span>
                      </span>
                      <span className="text-[11px] font-semibold" style={{ color: '#7c3aed' }}>{proxScore}점</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-soft)' }}>
                      <div className="h-full rounded-full" style={{ width: `${proxScore}%`, background: '#a855f7' }} />
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 추천 뱃지 + 스마트 한 줄 */}
            {(() => {
              const visitCount = routeHash ? getVisitCount(result.place.id, routeHash) : 0;
              const badges = getRecommendationBadges(result, index + 1, undefined, visitCount);
              const oneLiner = getSmartOneLiner(result, index + 1, visitCount || undefined);
              return (
                <>
                  {badges.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 mt-2">
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
                    </div>
                  )}
                  {oneLiner && (
                    <p className="text-[12px] mt-2 font-medium leading-snug" style={{ color: 'var(--text-secondary)' }}>
                      {oneLiner}
                    </p>
                  )}
                </>
              );
            })()}

            {/* ETA */}
            {(() => {
              const eta = getETAText(result, isNowDeparture ? nowMs : departureMs, dwellMinutes);
              if (!eta) return null;
              return (
                <div
                  className="mt-2 flex items-center gap-1.5 text-[12px] px-2.5 py-1.5 rounded-xl"
                  style={{ background: 'var(--bg-muted, #f3f4f6)', color: 'var(--text-muted)' }}
                >
                  {isNowDeparture ? <span className="animate-pulse">🟢</span> : <span>🕐</span>}
                  <span>
                    {isNowDeparture ? '지금 출발 중' : `${departureTime} 출발`} → 경유지{' '}
                    <strong style={{ color: 'var(--text-primary)' }}>{eta.waypoint}</strong>
                    {dwellMinutes > 0 && (
                      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}> (+{dwellMinutes}분 체류)</span>
                    )}
                    {' '}/ 목적지{' '}
                    <strong style={{ color: 'var(--text-primary)' }}>{eta.destination}</strong>
                    {' '}도착 예상
                    {isNowDeparture && <span className="ml-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>· 1분마다 갱신</span>}
                  </span>
                </div>
              );
            })()}

            {/* 메모 */}
            {editingMemoId === result.place.id ? (
              <div className="mt-2.5 space-y-1.5" onClick={(e) => e.stopPropagation()}>
                <textarea
                  value={editingMemoText}
                  onChange={(e) => setEditingMemoText(e.target.value)}
                  placeholder="이 장소에 대한 메모를 남겨보세요"
                  maxLength={200}
                  rows={2}
                  className="w-full px-3 py-2 text-sm rounded-xl resize-none outline-none focus:ring-2 transition-all"
                  style={{ background: 'var(--yellow-100)', border: '1.5px solid var(--yellow-600)', color: 'var(--text-primary)' }}
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={onCancelMemo}
                    className="px-3 py-1 rounded-lg text-xs font-semibold transition-all active:scale-95"
                    style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)', border: '1px solid var(--border-soft)' }}
                  >
                    취소
                  </button>
                  <button
                    onClick={(e) => onSaveMemo(e, result.place.id)}
                    className="px-3 py-1 rounded-lg text-xs font-semibold transition-all active:scale-95"
                    style={{ background: 'var(--yellow-600)', color: 'white' }}
                  >
                    저장
                  </button>
                </div>
              </div>
            ) : memoMap.has(result.place.id) ? (
              <div
                className="mt-2 flex items-start gap-2 px-2.5 py-2 rounded-xl"
                style={{ background: 'var(--yellow-100)', border: '1px solid var(--yellow-600)', color: 'var(--yellow-600)' }}
              >
                <span className="text-sm shrink-0">📝</span>
                <p className="text-[12px] flex-1 leading-snug break-words">{memoMap.get(result.place.id)}</p>
              </div>
            ) : null}

            {/* 네비 버튼 */}
            <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border-soft)' }}>
              {preferredNavApp ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => onOpenNavi(e, result.place)}
                    className="flex-1 flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-[14px] transition-all active:scale-95 justify-center"
                    style={{ background: 'var(--accent-weak)', color: 'var(--accent)' }}
                    aria-label="네비게이션으로 안내"
                  >
                    <Navigation className="w-4 h-4" />
                    {preferredNavApp === 'kakao' ? '카카오내비' : preferredNavApp === 'naver' ? '네이버지도' : '티맵'}으로 시작
                  </button>
                  <button
                    onClick={(e) => onOpenNaviSheet(e, result.place)}
                    className="px-3 py-2 rounded-lg text-[12px] font-medium transition-all active:scale-95"
                    style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)', border: '1px solid var(--border-soft)' }}
                    title="다른 앱 선택"
                  >
                    변경
                  </button>
                </div>
              ) : (
                <button
                  onClick={(e) => onOpenNavi(e, result.place)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-[14px] transition-all active:scale-95 w-full justify-center"
                  style={{ background: 'var(--accent-weak)', color: 'var(--accent)' }}
                  aria-label="네비게이션으로 안내"
                >
                  <Navigation className="w-4 h-4" />
                  네비 시작
                </button>
              )}
            </div>
          </div>

          {/* 우측 액션 버튼들 */}
          <div className="flex flex-col gap-1.5 shrink-0 self-start">
            <button
              onClick={(e) => onToggleFav(e, result)}
              className="p-3 md:p-2 rounded-lg transition-colors active:scale-95"
              style={{ background: 'transparent' }}
              title={favPlaces.has(result.place.id) ? '즐겨찾기 해제' : '즐겨찾기 추가'}
              aria-label={favPlaces.has(result.place.id) ? '즐겨찾기 해제' : '즐겨찾기 추가'}
              aria-pressed={favPlaces.has(result.place.id)}
            >
              <Star
                className="w-5 h-5 md:w-4 md:h-4"
                fill={favPlaces.has(result.place.id) ? 'var(--yellow-600)' : 'none'}
                style={{ color: favPlaces.has(result.place.id) ? 'var(--yellow-600)' : 'var(--text-muted)' }}
              />
            </button>
            <button
              onClick={(e) => onCopyAddress(e, result)}
              className="p-3 md:p-2 rounded-lg transition-colors active:scale-95"
              style={{ background: 'transparent' }}
              title="주소 복사"
              aria-label="주소 복사"
            >
              {copiedId === result.place.id ? (
                <Check className="w-5 h-5 md:w-4 md:h-4" style={{ color: 'var(--green-600)' }} />
              ) : (
                <Copy className="w-5 h-5 md:w-4 md:h-4" style={{ color: 'var(--text-muted)' }} />
              )}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSetOverflowMenu(overflowMenuId === result.place.id ? null : result.place.id);
              }}
              className="p-3 md:p-2 rounded-lg transition-colors active:scale-95"
              style={{ background: 'transparent' }}
              title="더 보기"
              aria-label="더 많은 옵션"
            >
              <MoreHorizontal
                className="w-5 h-5 md:w-4 md:h-4"
                style={{ color: overflowMenuId === result.place.id ? 'var(--accent)' : 'var(--text-muted)' }}
              />
            </button>
            {overflowMenuId === result.place.id && (
              <div
                className="flex flex-col gap-0.5 pt-1 border-t"
                style={{ borderColor: 'var(--border-soft)' }}
                onClick={(e) => e.stopPropagation()}
              >
                {result.place.phone && (
                  <button
                    onClick={(e) => { e.stopPropagation(); window.open(`tel:${result.place.phone}`); }}
                    className="p-2 rounded-lg transition-colors active:scale-95"
                    style={{ background: 'transparent' }}
                    title={`전화: ${result.place.phone}`}
                    aria-label={`${result.place.name}에 전화하기`}
                  >
                    <Phone className="w-4 h-4" style={{ color: 'var(--green-600)' }} />
                  </button>
                )}
                <button
                  onClick={(e) => onShare(e, result)}
                  className="p-2 rounded-lg transition-colors active:scale-95"
                  style={{ background: 'transparent' }}
                  title="공유하기"
                  aria-label="공유하기"
                >
                  {sharedId === result.place.id ? (
                    <Check className="w-4 h-4" style={{ color: 'var(--green-600)' }} />
                  ) : (
                    <Share2 className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                  )}
                </button>
                <button
                  onClick={(e) => onVisitToggle(e, result)}
                  className="p-2 rounded-lg transition-colors active:scale-95"
                  style={{ background: 'transparent' }}
                  title={isVisited ? '방문 표시 해제' : '방문했어요'}
                  aria-label={isVisited ? '방문 완료 취소' : '방문 완료 표시'}
                >
                  {isVisited
                    ? <CheckCircle className="w-4 h-4" style={{ color: 'var(--green-600)' }} />
                    : <Circle className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                  }
                </button>
                <button
                  onClick={(e) => onTogglePin(e, result)}
                  className="p-2 rounded-lg transition-colors active:scale-95"
                  style={{ background: 'transparent' }}
                  title={pinnedIds.has(result.place.id) ? '핀 고정 해제' : '상단에 고정'}
                  aria-label={pinnedIds.has(result.place.id) ? '핀 고정 해제' : '핀으로 고정'}
                  aria-pressed={pinnedIds.has(result.place.id)}
                >
                  <Bookmark
                    className="w-4 h-4"
                    fill={pinnedIds.has(result.place.id) ? 'var(--accent)' : 'none'}
                    style={{ color: pinnedIds.has(result.place.id) ? 'var(--accent)' : 'var(--text-muted)' }}
                  />
                </button>
                <button
                  onClick={(e) => onEditMemo(e, result.place.id)}
                  className="p-2 rounded-lg transition-colors active:scale-95"
                  style={{ background: 'transparent' }}
                  title={memoMap.has(result.place.id) ? '메모 수정' : '메모 추가'}
                  aria-label="경유지 메모 편집"
                >
                  <Pencil
                    className="w-4 h-4"
                    style={{ color: memoMap.has(result.place.id) ? 'var(--yellow-600)' : 'var(--text-muted)' }}
                  />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
