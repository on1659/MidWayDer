'use client';

import React from 'react';
import { CheckCircle, Circle, Star, Navigation, Bookmark } from 'lucide-react';
import type { DetourResult } from '@/types/detour';
import { getCategoryIcon } from '@/lib/category-icons';
import { getBusinessStatus, getMinutesUntilClose } from '@/lib/business-hours';
import { useResultList } from './ResultListContext';
import { getRoutePositionLabel, getETAText, highlightText, haversineDistanceKm } from './utils';

interface CompactCardProps {
  result: DetourResult;
  index: number;
  isSelected: boolean;
  swipeHandlers: {
    onTouchStart: (e: React.TouchEvent, id: string) => void;
    onTouchMove: (e: React.TouchEvent, id: string) => void;
    onTouchEnd: (result: DetourResult) => void;
  };
  swipeVisual: { id: string; deltaX: number } | null;
}

export const CompactCard = React.memo(function CompactCard({ result, index, isSelected, swipeHandlers, swipeVisual }: CompactCardProps) {
  const ctx = useResultList();
  const {
    favPlaces, visitedDates, pinnedIds,
    expandedCompactId, onSetExpandedCompact,
    isNowDeparture, nowMs, departureMs, dwellMinutes,
    nameFilter,
    onToggleFav, onVisitToggle, onTogglePin,
    onSelect, onOpenNavi,
    preferredNavApp, triggerNav,
    currentLocation, closestPlaceId,
  } = ctx;

  const isVisited = visitedDates.has(result.place.id);
  const isClosest = closestPlaceId === result.place.id;
  const detourMin = Math.round(result.detourCost.duration / 60);

  const isBeingSwiped = swipeVisual?.id === result.place.id;
  const swipeDeltaX = isBeingSwiped ? swipeVisual!.deltaX : 0;

  const animDelay = index < 10 ? index * 30 : 0;

  const currentDistKm = currentLocation
    ? haversineDistanceKm(
        currentLocation.lat, currentLocation.lng,
        result.place.coordinates.lat, result.place.coordinates.lng
      )
    : null;

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
    >
      <button
        data-result-index={index}
        onClick={() => {
          if (expandedCompactId === result.place.id) {
            onSelect(result, index + 1);
          } else {
            onSetExpandedCompact(result.place.id);
            ctx.onSelect(result, index + 1);
          }
        }}
        onMouseEnter={() => {}}
        onMouseLeave={() => {}}
        onTouchStart={(e) => swipeHandlers.onTouchStart(e, result.place.id)}
        onTouchMove={(e) => swipeHandlers.onTouchMove(e, result.place.id)}
        onTouchEnd={() => swipeHandlers.onTouchEnd(result)}
        className="w-full px-4 py-3 md:px-3 md:py-2.5 rounded-2xl text-left active:scale-[0.98]"
        style={{
          background: isSelected ? 'var(--blue-200)' : 'var(--bg-surface)',
          border: isSelected ? '1.5px solid var(--accent)' : '1px solid var(--border-soft)',
          transform: `translateX(${swipeDeltaX}px)`,
          transition: !isBeingSwiped ? 'transform 0.35s ease' : 'none',
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
            style={{
              background: index === 0 ? 'var(--accent)' : 'var(--blue-150)',
              color: index === 0 ? 'white' : 'var(--accent)',
            }}
          >
            {index + 1}
          </div>
          <span className="text-base shrink-0">{getCategoryIcon(result.place.category)}</span>
          <p className="text-sm font-bold flex-1 truncate min-w-0" style={{ color: 'var(--text-primary)' }}>
            {highlightText(result.place.name, nameFilter)}
          </p>
          {(() => {
            const compactPos = getRoutePositionLabel(result);
            return compactPos ? (
              <span
                className="shrink-0 text-[11px] px-2 py-0.5 rounded-full"
                style={{ background: 'var(--purple-100)', color: 'var(--purple-700)' }}
              >
                📍 {compactPos}
              </span>
            ) : null;
          })()}
          {isClosest && currentDistKm !== null && (
            <span
              className="shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: '#dcfce7', color: '#15803d' }}
              title="현재 내 위치에서 가장 가까운 곳"
            >
              📍근접
            </span>
          )}
          <span
            className="shrink-0 text-[12px] font-bold px-2 py-1 rounded-full"
            style={{ background: 'var(--yellow-100)', color: 'var(--yellow-700)' }}
          >
            +{detourMin}분
          </span>
          {result.place.businessHours && (() => {
            const status = getBusinessStatus(result.place.businessHours);
            const minsUntilClose = status.isOpen ? getMinutesUntilClose(result.place.businessHours) : null;
            if (minsUntilClose !== null && minsUntilClose <= 30) {
              return (
                <span
                  className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fbbf24' }}
                >
                  ⚠️{minsUntilClose}분
                </span>
              );
            }
            return null;
          })()}
          <button
            onClick={(e) => onToggleFav(e, result)}
            className="shrink-0 p-2 rounded-lg active:scale-95 transition-colors"
            title={favPlaces.has(result.place.id) ? '즐겨찾기 해제' : '즐겨찾기 저장'}
          >
            <Star
              className="w-4 h-4"
              fill={favPlaces.has(result.place.id) ? '#f59e0b' : 'none'}
              style={{ color: favPlaces.has(result.place.id) ? 'var(--yellow-600)' : 'var(--text-muted)' }}
            />
          </button>
          <button
            onClick={(e) => onOpenNavi(e, result.place)}
            className="shrink-0 p-2 rounded-lg active:scale-95"
            style={{ background: 'var(--accent-weak)', color: 'var(--accent)' }}
            title="네비 시작"
          >
            <Navigation className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => onVisitToggle(e, result)}
            className="shrink-0 p-2 rounded-lg active:scale-95 transition-colors"
            title={isVisited ? '방문 표시 해제' : '방문했어요'}
          >
            {isVisited
              ? <CheckCircle className="w-4 h-4" style={{ color: '#16a34a' }} />
              : <Circle className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            }
          </button>
          <button
            onClick={(e) => onTogglePin(e, result)}
            className="shrink-0 p-2 rounded-lg active:scale-95 transition-colors"
            title={pinnedIds.has(result.place.id) ? '핀 고정 해제' : '상단에 고정'}
          >
            <Bookmark
              className="w-4 h-4"
              fill={pinnedIds.has(result.place.id) ? 'var(--accent)' : 'none'}
              style={{ color: pinnedIds.has(result.place.id) ? 'var(--accent)' : 'var(--text-muted)' }}
            />
          </button>
        </div>

        {/* 아코디언 확장 */}
        {expandedCompactId === result.place.id && (() => {
          const eta = getETAText(result, isNowDeparture ? nowMs : departureMs, dwellMinutes);
          const address = result.place.roadAddress || result.place.address;
          return (
            <div
              className="mt-2 pt-2 border-t space-y-2"
              style={{ borderColor: 'var(--border-soft)' }}
              onClick={(e) => e.stopPropagation()}
            >
              {address && (
                <p className="text-[12px] leading-snug" style={{ color: 'var(--text-secondary)' }}>
                  {address}
                </p>
              )}
              {eta && (
                <div
                  className="flex items-center gap-1.5 text-[12px] px-2.5 py-1.5 rounded-xl"
                  style={{ background: 'var(--bg-muted, #f3f4f6)', color: 'var(--text-muted)' }}
                >
                  {isNowDeparture ? <span className="animate-pulse">🟢</span> : <span>🕐</span>}
                  <span>
                    경유지 <strong style={{ color: 'var(--text-primary)' }}>{eta.waypoint}</strong>
                    {' '}/ 목적지 <strong style={{ color: 'var(--text-primary)' }}>{eta.destination}</strong>
                  </span>
                </div>
              )}
              <button
                onClick={() => { triggerNav(result.place); onSetExpandedCompact(null); }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-bold text-[13px] transition-all active:scale-95"
                style={{ background: 'var(--accent)', color: 'white' }}
              >
                <Navigation className="w-4 h-4" />
                {preferredNavApp === 'kakao' ? '카카오내비' : preferredNavApp === 'naver' ? '네이버지도' : preferredNavApp === 'tmap' ? '티맵' : '네비'} 시작
              </button>
              <p className="text-[10px] text-center" style={{ color: 'var(--text-muted)' }}>
                한 번 더 탭하면 선택됩니다
              </p>
            </div>
          );
        })()}
      </button>
    </div>
  );
});
