/**
 * ResultList - 파스텔톤 카드형 결과 리스트
 */

'use client';

import { useState } from 'react';
import { Copy, Check, Navigation } from 'lucide-react';
import type { DetourResult } from '@/types/detour';
import { copyToClipboard } from '@/lib/clipboard';
import { getCategoryIcon } from '@/lib/category-icons';
import { openNavigationApp } from '@/lib/navigation-links';
import ErrorFallback from '@/components/ui/ErrorFallback';
import BottomSheet from '@/components/ui/BottomSheet';

interface ResultListProps {
  results: DetourResult[];
  selectedId: string | null;
  isLoading: boolean;
  error: string | null;
  hasSearched: boolean;
  currentCategory: string;
  onSelect: (result: DetourResult) => void;
  onCategoryChange?: (category: string) => void;
  onRetry?: () => void;
}

export default function ResultList({
  results,
  selectedId,
  isLoading,
  error,
  hasSearched,
  currentCategory,
  onSelect,
  onCategoryChange,
  onRetry,
}: ResultListProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [naviSheetOpen, setNaviSheetOpen] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<DetourResult['place'] | null>(null);

  const handleCopyAddress = async (e: React.MouseEvent, result: DetourResult) => {
    e.stopPropagation();
    const address = result.place.roadAddress || result.place.address;
    if (!address) return;
    
    const success = await copyToClipboard(address);
    if (success) {
      setCopiedId(result.place.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleSelect = async (result: DetourResult, rank: number) => {
    // 클릭 로그 저장 (비동기, 실패해도 UX 차단 안 함)
    fetch('/api/log-click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ placeId: result.place.id, rank }),
    }).catch(err => console.error('[ClickLog] Failed:', err));

    onSelect(result);
  };

  const handleFeedback = async (helpful: boolean) => {
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ helpful }),
      });
      setFeedbackSent(true);
      setTimeout(() => setFeedbackSent(false), 3000);
    } catch (err) {
      console.error('[Feedback] Failed:', err);
    }
  };

  const handleOpenNavi = (e: React.MouseEvent, place: DetourResult['place']) => {
    e.stopPropagation();
    setSelectedPlace(place);
    setNaviSheetOpen(true);
  };

  const handleNaviAppSelect = async (app: 'kakao' | 'naver' | 'tmap') => {
    if (!selectedPlace) return;
    
    try {
      await openNavigationApp(
        app,
        selectedPlace.coordinates.lat,
        selectedPlace.coordinates.lng,
        selectedPlace.name
      );
      setNaviSheetOpen(false);
    } catch (err) {
      console.error('[Navigation] Failed:', err);
    }
  };
  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-center py-4">
          <div className="flex gap-2 items-center">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="relative overflow-hidden p-4 bg-white rounded-2xl shadow-sm">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer" />
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 bg-gray-200 rounded-full animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded-lg w-2/3" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
                <div className="flex gap-2 mt-3">
                  <div className="h-6 bg-gray-200 rounded-full w-16" />
                  <div className="h-6 bg-gray-200 rounded-full w-16" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return <ErrorFallback error={error} onRetry={onRetry} compact />;
  }

  if (results.length === 0) {
    // 검색 전: 초기 상태 메시지
    if (!hasSearched) {
      return (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="text-6xl mb-4 animate-bounce">🗺️</div>
          <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            가는 길에 들를 곳을 찾아드려요
          </h3>
          <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
            출발지와 도착지를 입력하고<br />
            원하는 카테고리를 선택해주세요
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            <span className="px-3 py-1 rounded-full text-xs" style={{ background: 'var(--blue-100)', color: 'var(--blue-600)' }}>
              🔍 스마트 검색
            </span>
            <span className="px-3 py-1 rounded-full text-xs" style={{ background: 'var(--green-100)', color: 'var(--green-600)' }}>
              ⚡ 빠른 경로
            </span>
            <span className="px-3 py-1 rounded-full text-xs" style={{ background: 'var(--purple-100)', color: 'var(--purple-600)' }}>
              📍 정확한 위치
            </span>
          </div>
        </div>
      );
    }

    // 검색 후 결과 없음: 대안 제시
    const alternativeCategories = [
      '다이소', '스타벅스', '이디야', 'CU', 'GS25', '세븐일레븐',
      '맥도날드', '버거킹', '주유소', '휴게소', '은행', '우체국'
    ].filter(cat => cat !== currentCategory).slice(0, 6);

    return (
      <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
        <div className="text-6xl mb-4">😢</div>
        <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          이 경로에는 {currentCategory}가 없어요
        </h3>
        <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
          검색 범위를 넓히거나<br />
          다른 카테고리를 선택해보세요
        </p>

        {onCategoryChange && alternativeCategories.length > 0 && (
          <>
            <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
              대신 이런 카테고리는 어때요?
            </p>
            <div className="flex flex-wrap gap-2 justify-center mb-6">
              {alternativeCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => onCategoryChange(cat)}
                  className="px-4 py-2 rounded-full text-sm font-medium transition-all active:scale-95"
                  style={{
                    background: 'var(--blue-100)',
                    color: 'var(--blue-600)',
                    border: '1px solid var(--blue-300)',
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </>
        )}

        {onRetry && (
          <button
            onClick={onRetry}
            className="px-6 py-2.5 rounded-full text-sm font-semibold transition-all active:scale-95"
            style={{
              background: 'var(--accent)',
              color: 'var(--bg-surface)',
            }}
          >
            다시 검색
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2.5">
      {results.map((result, index) => {
        const isSelected = selectedId === result.place.id;
        const detourKm = (result.detourCost.distance / 1000).toFixed(1);
        const detourMin = Math.round(result.detourCost.duration / 60);
        const routeLabel = (result as any).routeType === 'shortest' ? '최단거리' : (result as any).routeType === 'fastest' ? '최단시간' : null;

        return (
          <button
            key={result.place.id}
            onClick={() => handleSelect(result, index + 1)}
            className="w-full p-4 rounded-2xl text-left transition-all active:scale-[0.98] shadow-sm"
            style={{
              background: isSelected ? 'var(--blue-200)' : 'var(--bg-surface)',
              border: isSelected ? '1.5px solid var(--accent)' : '1px solid var(--border-soft)',
            }}
          >
            <div className="flex items-start gap-3">
              {/* Rank badge with category icon */}
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
                {/* Name */}
                <h3 className="text-[17px] font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                  {result.place.name}
                </h3>
                {/* Address */}
                {(result.place.roadAddress || result.place.address) && (
                  <p className="text-[13px] mt-1 truncate" style={{ color: 'var(--text-secondary)' }}>
                    {result.place.roadAddress || result.place.address}
                  </p>
                )}

                {/* Badges */}
                <div className="flex flex-wrap items-center gap-2 mt-2.5">
                  <span
                    className="inline-flex items-center px-3 py-1.5 rounded-full text-[13px] font-semibold"
                    style={{ background: 'var(--accent-weak)', color: 'var(--accent)' }}
                  >
                    +{detourKm}km
                  </span>
                  <span
                    className="inline-flex items-center px-3 py-1.5 rounded-full text-[13px] font-semibold"
                    style={{ background: 'var(--yellow-100)', color: 'var(--yellow-600)' }}
                  >
                    +{detourMin}분
                  </span>
                  {routeLabel && (
                    <span
                      className="inline-flex items-center px-3 py-1.5 rounded-full text-[13px] font-semibold"
                      style={{ background: 'var(--green-100)', color: 'var(--green-700)' }}
                    >
                      {routeLabel}
                    </span>
                  )}
                </div>

                {/* Navigation Button */}
                <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border-soft)' }}>
                  <button
                    onClick={(e) => handleOpenNavi(e, result.place)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-[14px] transition-all active:scale-95 w-full justify-center"
                    style={{ background: 'var(--accent-weak)', color: 'var(--accent)' }}
                  >
                    <Navigation className="w-4 h-4" />
                    네비 시작
                  </button>
                </div>
              </div>

              {/* Copy button */}
              <button
                onClick={(e) => handleCopyAddress(e, result)}
                className="shrink-0 p-2 rounded-lg hover:bg-gray-100 transition-colors active:scale-95 self-start"
                title="주소 복사"
              >
                {copiedId === result.place.id ? (
                  <Check className="w-4 h-4" style={{ color: 'var(--green-600)' }} />
                ) : (
                  <Copy className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                )}
              </button>
            </div>
          </button>
        );
      })}
      </div>

      {/* Feedback Section */}
      {results.length > 0 && (
        <div className="mt-6 p-4 bg-white rounded-2xl shadow-sm border border-gray-100">
          <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
            이 검색 결과가 도움됐나요?
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => handleFeedback(true)}
              disabled={feedbackSent}
              className="flex-1 py-3 rounded-xl font-medium transition-all active:scale-95 disabled:opacity-50"
              style={{ background: 'var(--green-100)', color: 'var(--green-600)' }}
            >
              👍 도움됐어요
            </button>
            <button
              onClick={() => handleFeedback(false)}
              disabled={feedbackSent}
              className="flex-1 py-3 rounded-xl font-medium transition-all active:scale-95 disabled:opacity-50"
              style={{ background: 'var(--red-100)', color: 'var(--red-600)' }}
            >
              👎 별로예요
            </button>
          </div>
          {feedbackSent && (
            <p className="text-sm mt-2 text-center" style={{ color: 'var(--green-600)' }}>
              감사합니다! 소중한 의견 반영할게요 ✨
            </p>
          )}
        </div>
      )}

      {/* Navigation App Selection Bottom Sheet */}
      <BottomSheet
        isOpen={naviSheetOpen}
        onClose={() => setNaviSheetOpen(false)}
        snap="collapsed"
      >
        <div className="p-6">
          <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            어떤 앱으로 안내할까요?
          </h3>
          {selectedPlace && (
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              {selectedPlace.name}
            </p>
          )}
          <div className="space-y-3">
            <button
              onClick={() => handleNaviAppSelect('kakao')}
              className="w-full flex items-center gap-4 p-4 rounded-xl transition-all active:scale-98 shadow-sm"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}
            >
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-yellow-400">
                <span className="text-2xl">🗺️</span>
              </div>
              <div className="text-left">
                <div className="font-bold" style={{ color: 'var(--text-primary)' }}>카카오내비</div>
                <div className="text-sm" style={{ color: 'var(--text-muted)' }}>KakaoNavi</div>
              </div>
            </button>
            <button
              onClick={() => handleNaviAppSelect('naver')}
              className="w-full flex items-center gap-4 p-4 rounded-xl transition-all active:scale-98 shadow-sm"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}
            >
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-green-500">
                <span className="text-2xl">🧭</span>
              </div>
              <div className="text-left">
                <div className="font-bold" style={{ color: 'var(--text-primary)' }}>네이버지도</div>
                <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Naver Map</div>
              </div>
            </button>
            <button
              onClick={() => handleNaviAppSelect('tmap')}
              className="w-full flex items-center gap-4 p-4 rounded-xl transition-all active:scale-98 shadow-sm"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}
            >
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-red-500">
                <span className="text-2xl">📍</span>
              </div>
              <div className="text-left">
                <div className="font-bold" style={{ color: 'var(--text-primary)' }}>티맵</div>
                <div className="text-sm" style={{ color: 'var(--text-muted)' }}>TMAP</div>
              </div>
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
