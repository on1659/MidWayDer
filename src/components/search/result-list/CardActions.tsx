/**
 * CardActions - 검색 결과 카드 액션 버튼 영역
 * 즐겨찾기, 복사, 더보기, 네비 버튼
 */

'use client';

import React from 'react';
import { Copy, Check, Navigation, Star, Phone, CheckCircle, Circle, Share2, Bookmark, Pencil, MoreHorizontal } from 'lucide-react';
import type { NavApp } from '@/lib/navigation-links';

interface CardActionsProps {
  isFav: boolean;
  isCopied: boolean;
  isShared: boolean;
  isPinned: boolean;
  isVisited: boolean;
  hasMemo: boolean;
  hasPhone: boolean;
  phone?: string;
  preferredNavApp: NavApp | null;
  overflowMenuOpen: boolean;
  onToggleFav: (e: React.MouseEvent) => void;
  onCopyAddress: (e: React.MouseEvent) => void;
  onShare: (e: React.MouseEvent) => void;
  onTogglePin: (e: React.MouseEvent) => void;
  onVisitToggle: (e: React.MouseEvent) => void;
  onEditMemo: (e: React.MouseEvent) => void;
  onOpenNavi: (e: React.MouseEvent) => void;
  onOpenNaviSheet: (e: React.MouseEvent) => void;
  onToggleOverflowMenu: (e: React.MouseEvent) => void;
}

export const CardActions = React.memo(function CardActions({
  isFav,
  isCopied,
  isShared,
  isPinned,
  isVisited,
  hasMemo,
  hasPhone,
  phone,
  preferredNavApp,
  overflowMenuOpen,
  onToggleFav,
  onCopyAddress,
  onShare,
  onTogglePin,
  onVisitToggle,
  onEditMemo,
  onOpenNavi,
  onOpenNaviSheet,
  onToggleOverflowMenu,
}: CardActionsProps) {
  const getNavAppLabel = (app: NavApp | null) => {
    switch (app) {
      case 'kakao': return '카카오내비';
      case 'naver': return '네이버지도';
      case 'tmap': return '티맵';
      default: return '네비';
    }
  };

  return (
    <>
      {/* 우측 액션 버튼들 */}
      <div className="flex flex-col gap-1.5 shrink-0 self-start">
        {/* 즐겨찾기 */}
        <button
          onClick={onToggleFav}
          className="p-3 md:p-2 rounded-lg hover:bg-gray-100 transition-colors active:scale-95"
          title={isFav ? '즐겨찾기 해제' : '즐겨찾기 저장'}
        >
          <Star
            className="w-5 h-5 md:w-4 md:h-4"
            fill={isFav ? '#f59e0b' : 'none'}
            style={{ color: isFav ? 'var(--yellow-600)' : 'var(--text-muted)' }}
          />
        </button>

        {/* 주소 복사 */}
        <button
          onClick={onCopyAddress}
          className="p-3 md:p-2 rounded-lg hover:bg-gray-100 transition-colors active:scale-95"
          title="주소 복사"
        >
          {isCopied ? (
            <Check className="w-5 h-5 md:w-4 md:h-4" style={{ color: 'var(--green-600)' }} />
          ) : (
            <Copy className="w-5 h-5 md:w-4 md:h-4" style={{ color: 'var(--text-muted)' }} />
          )}
        </button>

        {/* 더보기 (오버플로우 메뉴) */}
        <button
          onClick={onToggleOverflowMenu}
          className="p-3 md:p-2 rounded-lg hover:bg-gray-100 transition-colors active:scale-95"
          title="더 보기"
        >
          <MoreHorizontal
            className="w-5 h-5 md:w-4 md:h-4"
            style={{ color: overflowMenuOpen ? 'var(--accent)' : 'var(--text-muted)' }}
          />
        </button>

        {/* 오버플로우 메뉴 */}
        {overflowMenuOpen && (
          <div
            className="flex flex-col gap-0.5 pt-1 border-t"
            style={{ borderColor: 'var(--border-soft)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 전화 */}
            {hasPhone && phone && (
              <button
                onClick={(e) => { e.stopPropagation(); window.open(`tel:${phone}`); }}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors active:scale-95"
                title={`전화: ${phone}`}
              >
                <Phone className="w-4 h-4" style={{ color: 'var(--green-600)' }} />
              </button>
            )}

            {/* 공유 */}
            <button
              onClick={onShare}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors active:scale-95"
              title="공유하기"
            >
              {isShared ? (
                <Check className="w-4 h-4" style={{ color: 'var(--green-600)' }} />
              ) : (
                <Share2 className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              )}
            </button>

            {/* 방문 표시 */}
            <button
              onClick={onVisitToggle}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors active:scale-95"
              title={isVisited ? '방문 표시 해제' : '방문했어요'}
            >
              {isVisited
                ? <CheckCircle className="w-4 h-4" style={{ color: '#16a34a' }} />
                : <Circle className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              }
            </button>

            {/* 핀 고정 */}
            <button
              onClick={onTogglePin}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors active:scale-95"
              title={isPinned ? '핀 고정 해제' : '상단에 고정'}
            >
              <Bookmark
                className="w-4 h-4"
                fill={isPinned ? 'var(--accent)' : 'none'}
                style={{ color: isPinned ? 'var(--accent)' : 'var(--text-muted)' }}
              />
            </button>

            {/* 메모 */}
            <button
              onClick={onEditMemo}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors active:scale-95"
              title={hasMemo ? '메모 수정' : '메모 추가'}
            >
              <Pencil
                className="w-4 h-4"
                style={{ color: hasMemo ? '#d97706' : 'var(--text-muted)' }}
              />
            </button>
          </div>
        )}
      </div>

      {/* 하단 네비 버튼 */}
      <div className="mt-3 pt-3 border-t w-full" style={{ borderColor: 'var(--border-soft)' }}>
        {preferredNavApp ? (
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenNavi}
              className="flex-1 flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-[14px] transition-all active:scale-95 justify-center"
              style={{ background: 'var(--accent-weak)', color: 'var(--accent)' }}
            >
              <Navigation className="w-4 h-4" />
              {getNavAppLabel(preferredNavApp)}로 시작
            </button>
            <button
              onClick={onOpenNaviSheet}
              className="px-3 py-2 rounded-lg text-[12px] font-medium transition-all active:scale-95"
              style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)', border: '1px solid var(--border-soft)' }}
              title="다른 앱 선택"
            >
              변경
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenNavi}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-[14px] transition-all active:scale-95 w-full justify-center"
            style={{ background: 'var(--accent-weak)', color: 'var(--accent)' }}
          >
            <Navigation className="w-4 h-4" />
            네비 시작
          </button>
        )}
      </div>
    </>
  );
});
