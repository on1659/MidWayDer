/**
 * SearchOverlay - 네이버지도 스타일 모바일 풀스크린 검색
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, X, Clock, Sun, Moon, ArrowUpDown, LocateFixed, Mic, MicOff, Star, Trash2, Bookmark, Bus, Car, Footprints, Bike } from 'lucide-react';
import AddressInput from './AddressInput';
import CategorySelect from './CategorySelect';
import { RecommendedCategories } from './RecommendedCategories';
import { getRecentSearches, removeRecentSearch, type RecentSearch } from '@/lib/recent-searches';
import { startVoiceSearchWithFeedback } from '@/lib/voice-search';
import { getPlaceFavorites, removePlaceFavorite, type PlaceFavorite } from '@/lib/place-favorites';
import { getTimeBasedCategoryHints } from '@/lib/smart-category';
import { useCacheStore } from '@/store/cache-store';
import { clearAllCache, getCacheStats } from '@/lib/cache/search-cache';
import dynamic from 'next/dynamic';

// 동적 import: 초기 로딩 속도 개선 (v0.65.0)
const SavedRoutesList = dynamic(
  () => import('@/components/saved-routes/SavedRoutesList').then((mod) => mod.SavedRoutesList),
  {
    loading: () => (
      <div className="animate-pulse h-24 bg-gray-200 dark:bg-gray-700 rounded-xl" />
    ),
    ssr: false,
  }
);
import type { SavedRoute } from '@/types/saved-route';

interface SearchOverlayProps {
  open: boolean;
  onClose: () => void;
  startAddress: string;
  endAddress: string;
  category: string;
  onStartChange: (v: string) => void;
  onEndChange: (v: string) => void;
  onStartSelect?: (result: { address: string; coordinates: { lat: number; lng: number } }) => void;
  onEndSelect?: (result: { address: string; coordinates: { lat: number; lng: number } }) => void;
  mapCenter?: { lat: number; lng: number };
  onCategoryChange: (v: string) => void;
  onSearch: () => void;
  onSwap?: () => void;
  isLoading: boolean;
  canSearch: boolean;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  onGPS?: () => void;
  gpsLoading?: boolean;
  onInstantSearch?: (item: RecentSearch) => void;
  onCancel?: () => void;  // 추가: 검색 취소
  onRouteSelect?: (route: SavedRoute) => void;  // 추가: 저장된 경로 선택
}

export default function SearchOverlay({
  open,
  onClose,
  startAddress,
  endAddress,
  category,
  onStartChange,
  onEndChange,
  onStartSelect,
  onEndSelect,
  mapCenter,
  onCategoryChange,
  onSearch,
  onSwap,
  isLoading,
  canSearch,
  theme = 'light',
  onToggleTheme,
  onGPS,
  gpsLoading = false,
  onInstantSearch,
  onCancel,  // 추가
  onRouteSelect,  // 추가
}: SearchOverlayProps) {
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [placeFavorites, setPlaceFavorites] = useState<PlaceFavorite[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [interimText, setInterimText] = useState<string>('');
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // 캐시 상태 (v0.51.0)
  const { cacheSize, setCacheSize } = useCacheStore();

  const closeOverlay = useCallback(() => {
    onClose();
    requestAnimationFrame(() => {
      previouslyFocusedRef.current?.focus();
      previouslyFocusedRef.current = null;
    });
  }, [onClose]);

  useEffect(() => {
    if (open) {
      setRecentSearches(getRecentSearches());
      setPlaceFavorites(getPlaceFavorites());
      // 캐시 크기 로드
      getCacheStats().then((stats) => setCacheSize(stats.size));
    }
  }, [open, setCacheSize]);

  useEffect(() => {
    if (!open) return;

    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    const frame = requestAnimationFrame(() => closeButtonRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const handlePlaceFavDelete = (placeId: string) => {
    removePlaceFavorite(placeId);
    setPlaceFavorites(getPlaceFavorites());
  };

  // 캐시 삭제 핸들러 (v0.51.0)
  const handleClearCache = useCallback(async () => {
    await clearAllCache();
    setCacheSize(0);
  }, [setCacheSize]);

  // Esc 키로 닫기
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeOverlay();
        return;
      }

      if (e.key !== 'Tab' || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.offsetParent !== null);

      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeOverlay, open]);

  // 카테고리 선택 핸들러 (useCallback으로 최적화)
  const handleCategorySelect = useCallback((selectedCategory: string) => {
    onCategoryChange(selectedCategory);
  }, [onCategoryChange]);

  if (!open) return null;

  const handleSearch = () => {
    onSearch();
    closeOverlay();
  };

  const handleRecentSelect = (item: RecentSearch) => {
    onStartChange(item.startAddress);
    onEndChange(item.endAddress);
    if (item.startCoords && onStartSelect) onStartSelect({ address: item.startAddress, coordinates: item.startCoords });
    if (item.endCoords && onEndSelect) onEndSelect({ address: item.endAddress, coordinates: item.endCoords });
    onCategoryChange(item.category);
  };

  const handleInstantSearchClick = (item: RecentSearch) => {
    if (onInstantSearch) {
      onInstantSearch(item);
      closeOverlay();
    } else {
      handleRecentSelect(item);
      handleSearch();
    }
  };

  const handleRecentDelete = (id: string) => {
    removeRecentSearch(id);
    setRecentSearches(getRecentSearches());
  };

  const handleVoiceSearch = async () => {
    setIsListening(true);
    setVoiceError(null);
    setInterimText('');
    
    try {
      const result = await startVoiceSearchWithFeedback({
        onInterimText: (text) => setInterimText(text),
        setIsListening: (listening) => setIsListening(listening),
        setError: (error) => {
          setVoiceError(error);
          setTimeout(() => setVoiceError(null), 3000);
        },
      });
      
      // 출발지 설정
      if (result.start) {
        onStartChange(result.start);
      }
      
      // 도착지 설정
      if (result.end) {
        onEndChange(result.end);
      }
      
      // 카테고리 설정
      if (result.category) {
        onCategoryChange(result.category);
      }
      
      // 성공 메시지 (간단하게)
      if (result.start || result.end || result.category) {
        setVoiceError('음성 인식 완료');
        setTimeout(() => setVoiceError(null), 2000);
      }
    } catch (err: unknown) {
      setVoiceError(err instanceof Error ? err.message : '음성 인식 실패');
      setTimeout(() => setVoiceError(null), 3000);
    } finally {
      setIsListening(false);
      setInterimText('');
    }
  };

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-[2147483000] flex flex-col overflow-hidden"
      style={{ backgroundColor: 'var(--bg-app)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="search-overlay-title"
    >
      {/* Header */}
      <div className="px-4 pb-2 pt-3 safe-top" style={{ background: 'var(--bg-app)' }}>
        <h2 id="search-overlay-title" className="sr-only">경로 설정</h2>
        <div
          className="flex h-14 items-center gap-1.5 rounded-full px-2 shadow-sm"
          style={{
            background: 'rgba(255,255,255,0.97)',
            border: '1px solid rgba(15,23,42,0.1)',
            boxShadow: '0 12px 30px -22px rgba(15,23,42,0.55)',
          }}
        >
          <button
            ref={closeButtonRef}
            onClick={closeOverlay}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors active:scale-95"
            aria-label="뒤로 가기"
          >
            <ArrowLeft className="h-5 w-5 text-slate-900" />
          </button>
          <button
            type="button"
            onClick={() => document.getElementById('mobile-origin-input-input')?.focus()}
            className="min-w-0 flex-1 truncate text-left text-[16px] font-extrabold leading-none text-slate-900"
          >
            {startAddress || endAddress || category ? [startAddress, endAddress, category].filter(Boolean).join(' · ') : '장소, 버스, 지하철, 주소 검색'}
          </button>
          <button
            onClick={handleVoiceSearch}
            disabled={isListening}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-all active:scale-95 disabled:opacity-50"
            aria-label="음성으로 경로 입력"
            title="음성으로 경로 입력"
          >
            {isListening ? (
              <MicOff className="h-5 w-5 animate-pulse text-blue-600" />
            ) : (
              <Mic className="h-5 w-5 text-slate-800" />
            )}
          </button>
          <button
            onClick={closeOverlay}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors active:scale-95"
            aria-label="검색 닫기"
          >
            <X className="h-5 w-5 text-slate-700" />
          </button>
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors active:scale-95"
              aria-label={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
            >
              {theme === 'dark' ? <Sun className="h-5 w-5 text-blue-600" /> : <Moon className="h-5 w-5 text-slate-600" />}
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-28" data-testid="mobile-search-overlay-scroll">
      {voiceError && (
        <div className={`mx-4 mt-2 rounded-xl px-4 py-2.5 text-center text-sm font-bold ${voiceError.includes('완료') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {voiceError}
        </div>
      )}

      {/* 음성 인식 중: 파형 애니메이션 + 실시간 텍스트 */}
      {isListening && (
        <div className="mx-4 mt-2 px-4 py-3 rounded-xl"
             style={{ background: 'var(--accent)', color: 'white' }}
             aria-live="polite"
             aria-label="음성 인식 중">
          <div className="flex items-center gap-2 mb-1">
            <div className="flex gap-0.5 items-end h-4" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <div key={i}
                     className="w-1 rounded-full animate-bounce bg-white opacity-90"
                     style={{ height: `${8 + i * 4}px`, animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
            <span className="text-sm font-semibold">듣는 중...</span>
          </div>
          {interimText && (
            <p className="text-sm opacity-90 italic">&quot;{interimText}&quot;</p>
          )}
        </div>
      )}

      {/* Route inputs */}
      <section className="mx-4 mt-2 overflow-hidden rounded-[1.25rem] shadow-sm" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(15,23,42,0.12)' }} data-testid="mobile-route-input-card">
        <div className="grid grid-cols-[2.25rem_1fr_2.75rem] items-center gap-2 px-3 py-3">
          <button
            type="button"
            onClick={onSwap}
            disabled={!onSwap || (!startAddress && !endAddress)}
            className="row-span-2 flex h-9 w-9 items-center justify-center rounded-full transition-all active:scale-95 active:rotate-180 disabled:cursor-not-allowed disabled:opacity-30"
            style={{ color: '#64748b' }}
            title="출발지와 도착지 바꾸기"
            aria-label="출발지와 도착지 바꾸기"
          >
            <ArrowUpDown className="h-4 w-4" />
          </button>

          <AddressInput
            label=""
            value={startAddress}
            onChange={onStartChange}
            onSelect={onStartSelect}
            placeholder="출발지 입력"
            mapCenter={mapCenter}
            dotColor="#22c55e"
            testId="mobile-origin-input"
            density="compact"
          />
          <button
            type="button"
            onClick={() => onStartChange('')}
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition active:scale-95"
            aria-label="출발지 지우기"
          >
            <X className="h-5 w-5" />
          </button>

          <AddressInput
            label=""
            value={endAddress}
            onChange={onEndChange}
            onSelect={onEndSelect}
            placeholder="도착지 입력"
            mapCenter={mapCenter}
            dotColor="#ef4444"
            testId="mobile-destination-input"
            density="compact"
          />
          {onGPS ? (
            <button
              onClick={onGPS}
              disabled={gpsLoading}
              className="flex h-9 w-9 items-center justify-center rounded-full transition-all active:scale-95 disabled:opacity-50"
              style={{ color: '#2563eb', background: '#eff6ff' }}
              aria-label="현재 위치를 출발지로 설정"
            >
              <LocateFixed className={`h-4 w-4 ${gpsLoading ? 'animate-spin' : ''}`} />
            </button>
          ) : (
            <span />
          )}
        </div>
      </section>

      <nav data-testid="mobile-transport-tabs" className="mx-4 mt-3 grid grid-cols-4 overflow-hidden rounded-[1.25rem]" aria-label="이동 수단" style={{ background: '#eef2f7' }}>
        {[
          { label: '버스', icon: Bus, active: true },
          { label: '자동차', icon: Car, active: false },
          { label: '도보', icon: Footprints, active: false },
          { label: '자전거', icon: Bike, active: false },
        ].map((mode) => {
          const Icon = mode.icon;
          return (
            <button
              key={mode.label}
              type="button"
              aria-pressed={mode.active}
              className="flex h-12 items-center justify-center transition active:scale-[0.98]"
              style={{ background: mode.active ? '#0b84ff' : 'transparent', color: mode.active ? '#ffffff' : '#111827' }}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span className="sr-only">{mode.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Category chips */}
      <section className="mx-4 mt-3 rounded-[1.25rem] p-3" style={{ background: '#ffffff', border: '1px solid rgba(15,23,42,0.1)' }} data-testid="mobile-category-input-card">
        {/* 시간대별 스마트 제안 칩 */}
        {(() => {
          const timeHints = getTimeBasedCategoryHints();
          if (timeHints.length === 0) return null;
          return (
            <div className="flex items-center gap-2 mb-2.5 flex-wrap">
              <span className="text-xs font-semibold shrink-0" style={{ color: 'var(--text-muted)' }}>
                지금은?
              </span>
              {timeHints.map((hint) => (
                <button
                  key={hint.category}
                  onClick={() => onCategoryChange(hint.category)}
                  className="flex items-center gap-1 rounded-full px-3 py-2 text-xs font-semibold transition-all active:scale-95"
                  style={{
                    background: category === hint.category ? 'var(--accent)' : 'var(--bg-hover)',
                    color: category === hint.category ? 'var(--text-on-accent)' : 'var(--text-primary)',
                    border: `1px solid ${category === hint.category ? 'var(--accent)' : 'var(--border-soft)'}`,
                    minHeight: '36px',
                  }}
                  title={hint.reason}
                >
                  <span>{hint.emoji}</span>
                  <span>{hint.label}</span>
                </button>
              ))}
            </div>
          );
        })()}

        {/* 추천 카테고리 섹션 (카테고리 선택 전에 표시) */}
        {!category && (
          <div className="mb-4">
            <RecommendedCategories
              onCategorySelect={handleCategorySelect}
              maxItems={5}
            />
          </div>
        )}

        <p className="mb-2 text-[13px] font-black text-slate-700">어디 들를까요?</p>
        <CategorySelect selected={category} onChange={onCategoryChange} density="compact" />
      </section>

      {/* Saved places */}
      {placeFavorites.length > 0 && (
        <div className="px-4 pb-3">
          <p className="text-base font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
            <Star className="w-4 h-4" style={{ color: 'var(--yellow-500, #eab308)' }} />
            저장된 장소
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {placeFavorites.map((place) => (
              <div
                key={place.placeId}
                className="shrink-0 flex flex-col gap-1 p-3 rounded-xl min-w-[140px] max-w-[160px] relative"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}
              >
                <button
                  className="absolute top-1.5 right-1.5 p-1 rounded-full transition-colors hover:bg-red-50"
                  onClick={(e) => { e.stopPropagation(); handlePlaceFavDelete(place.placeId); }}
                  title="즐겨찾기 삭제"
                  aria-label={`${place.placeName} 즐겨찾기 삭제`}
                >
                  <X className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
                </button>
                <button
                  className="text-left w-full pr-4"
                  onClick={() => onCategoryChange(place.category)}
                  aria-label={`${place.placeName} 카테고리로 검색`}
                >
                  <p className="text-[13px] font-bold truncate" style={{ color: 'var(--text-strong)' }}>
                    {place.placeName}
                  </p>
                  <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                    {place.category}
                  </p>
                  <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                    {place.address.length > 18 ? place.address.slice(0, 18) + '…' : place.address}
                  </p>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Saved routes (v0.63.0) */}
      {onRouteSelect && (
        <div className="px-4 pb-3">
          <p className="text-base font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
            <Bookmark className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            저장된 경로
          </p>
          <SavedRoutesList onRouteSelect={onRouteSelect} />
        </div>
      )}

      {/* Recent searches */}
      {recentSearches.length > 0 && (
        <div className="px-4 pb-3 flex-1 overflow-y-auto">
          <p className="mb-1.5 flex items-center gap-2 px-1 text-[13px] font-black text-slate-500">
            <Clock className="h-4 w-4" />
            최근 검색
          </p>
          <div className="divide-y divide-slate-100 rounded-[1.25rem] bg-white">
            {recentSearches.map((item) => (
              <div
                key={item.id}
                className="flex min-h-[58px] items-center gap-2 px-3"
              >
                <button
                  className="min-w-0 flex-1 py-3 text-left"
                  onClick={() => handleRecentSelect(item)}
                >
                  <p className="truncate text-[15px] font-bold route-text-truncate text-slate-900" title={`${item.startAddress} → ${item.endAddress}`}>
                    {item.startAddress} → {item.endAddress}
                  </p>
                  <p className="mt-0.5 text-xs font-semibold text-slate-500">{item.category}</p>
                </button>
                <button
                  onClick={() => handleInstantSearchClick(item)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black text-blue-600 transition-all active:scale-95"
                  title="바로 검색 실행"
                  aria-label={`${item.startAddress}에서 ${item.endAddress} 즉시 검색`}
                >
                  ↗
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleRecentDelete(item.id); }}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition-all active:scale-95"
                  title="삭제"
                  aria-label={`${item.startAddress} 검색 기록 삭제`}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      </div>

      {/* Search button */}
      <div className="absolute inset-x-0 bottom-0 z-[90] px-4 py-3 safe-bottom" style={{ background: 'color-mix(in srgb, var(--bg-app) 96%, transparent)', borderTop: '1px solid var(--border-soft)', boxShadow: '0 -18px 42px -30px rgba(0,0,0,0.35)', backdropFilter: 'blur(18px) saturate(180%)', WebkitBackdropFilter: 'blur(18px) saturate(180%)' }} data-testid="mobile-search-sticky-footer">
        {isLoading ? (
          /* 로딩 중: 취소 버튼 */
          <div className="space-y-3">
            <div
              className="flex items-center justify-center gap-2 py-5 rounded-2xl font-bold text-lg"
              style={{ background: 'var(--accent)', color: 'var(--text-loading, white)' }}
              role="status"
              aria-live="polite"
              aria-label="검색 진행 중"
            >
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden="true" />
              <span>찾는 중...</span>
            </div>
            {onCancel && (
              <button
                onClick={onCancel}
                className="w-full py-3 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                aria-label="검색 취소"
              >
                <X className="w-5 h-5" />
                <span>취소</span>
              </button>
            )}
          </div>
        ) : (
          /* 기본: 검색 버튼 */
          <button
            data-testid="mobile-search-route-btn"
            onClick={handleSearch}
            disabled={!canSearch}
            className="mx-auto flex h-12 w-full items-center justify-center rounded-full text-[16px] font-black text-white shadow-md transition-all active:scale-[0.97] disabled:bg-gray-200 disabled:text-gray-400"
            style={{
              minHeight: '48px',
              background: canSearch ? 'var(--accent)' : undefined,
            }}
          >
            경유지 찾기
          </button>
        )}

        {/* 캐시 관리 (v0.51.0) */}
        {cacheSize > 0 && (
          <button
            onClick={handleClearCache}
            className="w-full mt-2 py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all active:scale-95"
            style={{ color: 'var(--text-muted)', background: 'var(--bg-surface-muted)' }}
            aria-label="캐시 삭제"
          >
            <Trash2 className="w-3 h-3" />
            <span>캐시 삭제 ({cacheSize}개)</span>
          </button>
        )}
      </div>
    </div>
  );
}
