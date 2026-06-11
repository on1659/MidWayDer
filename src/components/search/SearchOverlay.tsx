/**
 * SearchOverlay - 네이버지도 스타일 모바일 풀스크린 검색
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, X, Clock, Mic, MicOff, Star, Trash2, Home, Building2, Bookmark, ArrowUpDown, LocateFixed, Search, Moon, Sun, MapPin } from 'lucide-react';
import AddressInput, { type AddressSelection } from './AddressInput';
import CategorySelect from './CategorySelect';
import { RecommendedCategories } from './RecommendedCategories';
import { getRecentSearches, removeRecentSearch, type RecentSearch } from '@/lib/recent-searches';
import { startVoiceSearchWithFeedback } from '@/lib/voice-search';
import { getPlaceFavorites, removePlaceFavorite, type PlaceFavorite } from '@/lib/place-favorites';
import { getTimeBasedCategoryHints } from '@/lib/smart-category';
import { useCacheStore } from '@/store/cache-store';
import { clearAllCache, getCacheStats } from '@/lib/cache/search-cache';
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
  onRouteSelect?: (route: SavedRoute) => void;  // 호환: 부모 컴포넌트가 전달하지만 모바일 오버레이에서는 렌더링하지 않음
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
  theme,
  onToggleTheme,
  onGPS,
  gpsLoading,
  onInstantSearch,
  onCancel,
}: SearchOverlayProps) {
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [placeFavorites, setPlaceFavorites] = useState<PlaceFavorite[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [interimText, setInterimText] = useState<string>('');
  const [placeQuery, setPlaceQuery] = useState('');
  const [selectedPlace, setSelectedPlace] = useState<AddressSelection | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // 캐시 상태 (v0.51.0)
  const { cacheSize, setCacheSize } = useCacheStore();

  const quickPlaces = [
    { label: '집', icon: Home },
    { label: '회사', icon: Building2 },
    { label: '저장', icon: Bookmark },
  ];

  const formatRecentDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}.`;
  };

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
    if (!canSearch || isLoading) {
      return;
    }

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
      
      if (result.category) {
        onCategoryChange(result.category);
      }
      
      // 성공 메시지 (간단하게)
      if (result.category) {
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

  const handlePlaceQueryChange = (value: string) => {
    setPlaceQuery(value);
    if (selectedPlace && value !== selectedPlace.address) {
      setSelectedPlace(null);
    }
  };

  const handlePlaceSelect = (place: AddressSelection) => {
    setSelectedPlace(place);
    setPlaceQuery(place.address);
  };

  const focusPlaceSearchInput = () => {
    const focusInput = () => {
      dialogRef.current
        ?.querySelector<HTMLInputElement>('[data-testid="mobile-place-search-input"]')
        ?.focus();
    };

    if (typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(focusInput);
      return;
    }

    window.setTimeout(focusInput, 0);
  };

  const handleSelectAsStart = () => {
    if (!selectedPlace) return;
    onStartChange(selectedPlace.address);
    onStartSelect?.(selectedPlace);
    setPlaceQuery('');
    setSelectedPlace(null);
    focusPlaceSearchInput();
  };

  const handleSelectAsEnd = () => {
    if (!selectedPlace) return;
    onEndChange(selectedPlace.address);
    onEndSelect?.(selectedPlace);
    setPlaceQuery('');
    setSelectedPlace(null);
    focusPlaceSearchInput();
  };

  const missingRouteStep = !startAddress ? 'start' : !endAddress ? 'end' : null;
  const placeSearchPlaceholder = missingRouteStep === 'start'
    ? '출발지로 지정할 장소 검색'
    : missingRouteStep === 'end'
      ? '도착지로 지정할 장소 검색'
      : '장소 또는 주소 검색';
  const routeStepHint = missingRouteStep === 'start'
    ? '장소를 검색하고 출발지로 선택하세요'
    : missingRouteStep === 'end'
      ? '다음으로 도착지를 검색해 선택하세요'
      : '경유지 종류를 고르고 검색을 실행하세요';
  const searchButtonLabel = isLoading
    ? '찾는 중...'
    : missingRouteStep === 'start'
      ? '출발지 선택 필요'
      : missingRouteStep === 'end'
        ? '도착지 선택 필요'
        : '경유지 찾기';
  const selectedPlaceHint = missingRouteStep === 'start'
    ? '출발지로 지정하면 다음에 도착지를 고를 수 있어요'
    : missingRouteStep === 'end'
      ? '도착지로 지정하면 경유지 검색 준비가 끝나요'
      : '필요한 경로 위치로 다시 지정할 수 있어요';
  const startButtonEmphasis = missingRouteStep !== 'end';
  const endButtonEmphasis = missingRouteStep === 'end';

  const overlayScrollPaddingBottom = selectedPlace
    ? 'calc(env(safe-area-inset-bottom, 0px) + 17.5rem)'
    : 'calc(env(safe-area-inset-bottom, 0px) + 6rem)';
  const selectedPlaceSheetBottom = 'calc(env(safe-area-inset-bottom, 0px) + 5.75rem)';

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
        <h2 id="search-overlay-title" className="sr-only">장소·주소 검색</h2>
        <div
          className="flex h-11 items-center gap-1 rounded-full px-1.5 shadow-sm"
          style={{
            background: 'rgba(255,255,255,0.97)',
            border: '1px solid rgba(15,23,42,0.1)',
            boxShadow: '0 12px 30px -22px rgba(15,23,42,0.55)',
          }}
        >
          <button
            ref={closeButtonRef}
            onClick={closeOverlay}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors active:scale-95"
            aria-label="뒤로 가기"
          >
            <ArrowLeft className="h-5 w-5 text-slate-900" />
          </button>
          <div
            data-testid="mobile-route-edit-trigger"
            className="min-w-0 flex-1 truncate text-left text-[15px] font-extrabold leading-none text-slate-900"
          >
            어디를 경유할까요?
          </div>
          {theme && onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all active:scale-95"
              aria-label={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
              title={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5 text-slate-800" aria-hidden="true" />
              ) : (
                <Moon className="h-5 w-5 text-slate-800" aria-hidden="true" />
              )}
            </button>
          )}
          <button
            onClick={handleVoiceSearch}
            disabled={isListening}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all active:scale-95 disabled:opacity-50"
            aria-label="음성으로 장소 검색"
            title="음성으로 장소 검색"
          >
            {isListening ? (
              <MicOff className="h-5 w-5 animate-pulse text-blue-600" />
            ) : (
              <Mic className="h-5 w-5 text-slate-800" />
            )}
          </button>
          <button
            onClick={closeOverlay}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors active:scale-95"
            aria-label="검색 닫기"
          >
            <X className="h-5 w-5 text-slate-700" />
          </button>

        </div>
      </div>

      <div
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
        style={{ paddingBottom: overlayScrollPaddingBottom }}
        data-testid="mobile-search-overlay-scroll"
      >
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

      <nav className="mx-4 mt-2 flex items-center gap-3 overflow-x-auto pb-1 scrollbar-hide" aria-label="빠른 장소">
        {quickPlaces.map((place) => {
          const Icon = place.icon;
          return (
            <button
              key={place.label}
              type="button"
              className="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-white px-3 text-[13px] font-extrabold text-slate-700 shadow-sm active:scale-[0.97]"
              style={{ border: '1px solid rgba(15,23,42,0.08)' }}
            >
              <Icon className="h-4 w-4 text-blue-600" aria-hidden="true" />
              {place.label}
            </button>
          );
        })}
      </nav>

      <section
        className="mx-4 mt-3 rounded-[1.4rem] bg-white p-3 shadow-sm"
        style={{ border: '1px solid rgba(15,23,42,0.08)' }}
        data-testid="mobile-place-search-card"
        aria-label="장소 또는 주소 검색"
      >
        <AddressInput
          density="compact"
          label=""
          value={placeQuery}
          onChange={handlePlaceQueryChange}
          onSelect={handlePlaceSelect}
          placeholder={placeSearchPlaceholder}
          mapCenter={mapCenter}
          testId="mobile-place-search-input"
          onSubmit={canSearch && !isLoading ? handleSearch : undefined}
        />
      </section>

      <section
        className="mx-4 mt-3 rounded-[1.2rem] bg-white p-3 shadow-sm"
        style={{ border: '1px solid rgba(15,23,42,0.08)' }}
        data-testid="mobile-route-summary"
        data-route-ready={canSearch ? 'true' : 'false'}
        aria-label="현재 경로 상태"
      >
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-2.5">
          <div className="min-w-0 space-y-1.5">
            <div
              data-testid="mobile-route-start-row"
              className={`grid min-w-0 grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-2 rounded-2xl px-2.5 py-2 ${startAddress ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'}`}
            >
              <span className="text-[11px] font-black leading-none">출발</span>
              <span className="truncate text-[13px] font-extrabold leading-none" title={startAddress || '미선택'}>
                {startAddress || '미선택'}
              </span>
            </div>
            <div
              data-testid="mobile-route-end-row"
              className={`grid min-w-0 grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-2 rounded-2xl px-2.5 py-2 ${endAddress ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
            >
              <span className="text-[11px] font-black leading-none">도착</span>
              <span className="truncate text-[13px] font-extrabold leading-none" title={endAddress || '미선택'}>
                {endAddress || '미선택'}
              </span>
            </div>
            <p className="px-1 text-[11px] font-bold leading-tight text-slate-500">
              <span data-testid="mobile-route-step-hint">{routeStepHint}</span>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {onGPS && (
              <button
                type="button"
                onClick={onGPS}
                disabled={gpsLoading}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition active:scale-95 disabled:opacity-50"
                aria-label="현재 위치를 출발지로 설정"
              >
                <LocateFixed className={`h-4 w-4 ${gpsLoading ? 'animate-pulse' : ''}`} aria-hidden="true" />
              </button>
            )}
            {onSwap && (
              <button
                type="button"
                onClick={onSwap}
                disabled={!startAddress && !endAddress}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition active:scale-95 disabled:opacity-40"
                aria-label="출발지와 도착지 바꾸기"
              >
                <ArrowUpDown className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Category chips */}
      <section className="mt-3" style={{ marginLeft: '1rem', marginRight: '1rem' }} data-testid="mobile-category-input-card">
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
                  className="flex items-center rounded-full px-3 py-1.5 text-xs font-semibold transition-all active:scale-95"
                  style={{
                    background: category === hint.category ? 'var(--accent)' : 'var(--bg-hover)',
                    color: category === hint.category ? 'var(--text-on-accent)' : 'var(--text-primary)',
                    border: `1px solid ${category === hint.category ? 'var(--accent)' : 'var(--border-soft)'}`,
                    minHeight: '32px',
                  }}
                  title={hint.reason}
                >
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

        <p className="mb-2 px-1 text-[13px] font-black text-slate-600">경유지 종류</p>
        <CategorySelect selected={category} onChange={onCategoryChange} density="compact" />
      </section>

      {/* Saved places */}
      {placeFavorites.length > 0 && (
        <div className="px-4 pb-3">
          <p className="mb-1.5 flex items-center gap-2 px-1 text-[13px] font-black text-slate-500">
            <Star className="h-4 w-4 text-blue-600" aria-hidden="true" />
            저장된 장소
          </p>
          <div className="divide-y divide-slate-100 rounded-[1.25rem] bg-white">
            {placeFavorites.map((place) => (
              <div
                key={place.placeId}
                data-testid="mobile-saved-place-row"
                className="grid min-h-[54px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-3"
              >
                <Star className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                <button
                  className="min-w-0 flex-1 py-2.5 text-left"
                  onClick={() => onCategoryChange(place.category)}
                  aria-label={`${place.placeName} 카테고리로 검색`}
                >
                  <p className="truncate text-[15px] font-bold text-slate-900" title={place.placeName}>
                    {place.placeName}
                  </p>
                  <p className="mt-0.5 truncate text-xs font-semibold text-slate-500" title={`${place.category} · ${place.address}`}>
                    {place.category} · {place.address}
                  </p>
                </button>
                <button
                  type="button"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition-all active:scale-95"
                  onClick={(e) => { e.stopPropagation(); handlePlaceFavDelete(place.placeId); }}
                  title="즐겨찾기 삭제"
                  aria-label={`${place.placeName} 즐겨찾기 삭제`}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
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
                data-testid="mobile-recent-search-row"
                className="grid min-h-[58px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-3"
              >
                <Clock className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                <button
                  className="min-w-0 flex-1 py-3 text-left"
                  onClick={() => handleRecentSelect(item)}
                  aria-label={`${item.startAddress}에서 ${item.endAddress} 경로 입력`}
                >
                  <p className="truncate text-[15px] font-bold route-text-truncate text-slate-900" title={`${item.startAddress} → ${item.endAddress}`}>
                    {item.startAddress} → {item.endAddress}
                  </p>
                  <p className="mt-0.5 truncate text-xs font-semibold text-slate-500" title={item.category}>{item.category}</p>
                </button>
                <div className="grid shrink-0 grid-cols-[2.25rem_2.25rem_2.25rem] items-center gap-1">
                  <span className="truncate text-right text-xs font-semibold text-slate-400">{formatRecentDate(item.timestamp)}</span>
                  <button
                    type="button"
                    onClick={() => handleInstantSearchClick(item)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-blue-600 transition-all active:scale-95"
                    title="바로 검색 실행"
                    aria-label={`${item.startAddress}에서 ${item.endAddress} 즉시 검색`}
                  >
                    <Search className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleRecentDelete(item.id); }}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition-all active:scale-95"
                    title="삭제"
                    aria-label={`${item.startAddress} 검색 기록 삭제`}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      </div>

      {selectedPlace && (
        <div
          data-testid="mobile-selected-place-sheet"
          className="fixed inset-x-0 z-[2147483002] px-4"
          style={{ bottom: selectedPlaceSheetBottom }}
        >
          <div
            className="max-h-[11.75rem] overflow-hidden rounded-[1.35rem] bg-white p-4 shadow-[0_20px_55px_-28px_rgba(15,23,42,0.75)]"
            style={{ border: '1px solid rgba(15,23,42,0.1)' }}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <MapPin className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-black text-slate-950">
                  {selectedPlace.name || selectedPlace.address}
                </p>
                <p className="mt-1 line-clamp-2 text-sm font-semibold text-slate-500">
                  {selectedPlace.placeAddress || selectedPlace.address}
                </p>
                <p data-testid="mobile-selected-place-next-step" className="mt-1 truncate text-xs font-black text-blue-600">
                  {selectedPlaceHint}
                </p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                data-testid="mobile-select-start-btn"
                type="button"
                onClick={handleSelectAsStart}
                className={`min-h-11 min-w-0 rounded-2xl px-3 text-sm font-black leading-tight whitespace-nowrap transition active:scale-[0.98] ${startButtonEmphasis ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 ring-1 ring-inset ring-slate-200'}`}
              >
                출발지로 선택
              </button>
              <button
                data-testid="mobile-select-end-btn"
                type="button"
                onClick={handleSelectAsEnd}
                className={`min-h-11 min-w-0 rounded-2xl px-3 text-sm font-black leading-tight whitespace-nowrap transition active:scale-[0.98] ${endButtonEmphasis ? 'bg-blue-600 text-white' : 'bg-slate-900 text-white'}`}
              >
                도착지로 선택
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        data-testid="mobile-search-sticky-footer"
        className="safe-bottom fixed inset-x-0 bottom-0 z-[2147483001] bg-white/95 px-4 pb-4 pt-3 shadow-[0_-18px_40px_-30px_rgba(15,23,42,0.65)] backdrop-blur-xl"
        style={{ borderTop: '1px solid rgba(15,23,42,0.08)' }}
      >
        <div className="flex gap-2">
          {isLoading && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="min-h-12 rounded-2xl px-4 text-sm font-black text-slate-700"
              style={{ border: '1px solid #dbe3ef', background: '#ffffff' }}
            >
              취소
            </button>
          )}
          <button
            data-testid="mobile-search-route-btn"
            type="button"
            onClick={handleSearch}
            disabled={!canSearch || isLoading}
            className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl text-base font-black transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-65"
            style={{
              background: !canSearch || isLoading ? '#e2e8f0' : 'var(--accent)',
              color: !canSearch || isLoading ? '#64748b' : 'var(--text-on-accent)',
              border: `1px solid ${!canSearch || isLoading ? '#dbe3ef' : 'var(--accent)'}`,
            }}
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            {searchButtonLabel}
          </button>
        </div>
      </div>

      {/* 캐시 관리 (v0.51.0) */}
      {cacheSize > 0 && (
        <div className="px-4 pb-4">
          <button
            onClick={handleClearCache}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-medium transition-all active:scale-95"
            style={{ color: 'var(--text-muted)', background: 'var(--bg-surface-muted)' }}
            aria-label="캐시 삭제"
          >
            <Trash2 className="h-3 w-3" />
            <span>캐시 삭제 ({cacheSize}개)</span>
          </button>
        </div>
      )}
    </div>
  );
}
