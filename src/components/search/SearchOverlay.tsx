/**
 * SearchOverlay - 네이버지도 스타일 모바일 풀스크린 검색
 */

'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, X, Clock, Sun, Moon, ArrowUpDown, LocateFixed, Home, Briefcase, Mic, MicOff, Star } from 'lucide-react';
import AddressInput from './AddressInput';
import CategorySelect from './CategorySelect';
import { getRecentSearches, removeRecentSearch, type RecentSearch } from '@/lib/recent-searches';
import { getSavedLocationByLabel } from '@/lib/smart-location';
import { startVoiceSearch } from '@/lib/voice-search';
import { getPlaceFavorites, removePlaceFavorite, type PlaceFavorite } from '@/lib/place-favorites';
import { getTimeBasedCategoryHints } from '@/lib/smart-category';

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
}: SearchOverlayProps) {
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [placeFavorites, setPlaceFavorites] = useState<PlaceFavorite[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setRecentSearches(getRecentSearches());
      setPlaceFavorites(getPlaceFavorites());
    }
  }, [open]);

  const handlePlaceFavDelete = (placeId: string) => {
    removePlaceFavorite(placeId);
    setPlaceFavorites(getPlaceFavorites());
  };

  // Esc 키로 닫기
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleSearch = () => {
    onSearch();
    onClose();
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
      onClose();
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
    
    try {
      const result = await startVoiceSearch();
      
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
        setVoiceError('✅ 음성 인식 완료!');
        setTimeout(() => setVoiceError(null), 2000);
      }
    } catch (err: unknown) {
      setVoiceError(err instanceof Error ? err.message : '음성 인식 실패');
      setTimeout(() => setVoiceError(null), 3000);
    } finally {
      setIsListening(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col animate-fade-in" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-[env(safe-area-inset-top)] py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full flex items-center justify-center active:scale-95 transition-colors shrink-0"
          style={{ backgroundColor: 'var(--bg-hover)' }}
        >
          <ArrowLeft className="w-5 h-5" style={{ color: 'var(--text-strong)' }} />
        </button>
        <h2 className="text-xl font-bold flex-1" style={{ color: 'var(--text-primary)' }}>경로 설정</h2>
        
        {/* 음성 검색 버튼 */}
        <button
          onClick={handleVoiceSearch}
          disabled={isListening}
          className="w-10 h-10 rounded-full flex items-center justify-center active:scale-95 transition-all shrink-0 disabled:opacity-50"
          style={{ 
            backgroundColor: isListening ? 'var(--accent)' : 'var(--bg-hover)',
            color: isListening ? 'white' : 'var(--text-strong)',
          }}
          aria-label="음성으로 경로 입력"
          title="음성으로 경로 입력 🎤"
        >
          {isListening ? (
            <MicOff className="w-5 h-5 animate-pulse" />
          ) : (
            <Mic className="w-5 h-5" />
          )}
        </button>

        {onToggleTheme && (
          <button
            onClick={onToggleTheme}
            className="w-10 h-10 rounded-full flex items-center justify-center active:scale-95 transition-colors shrink-0"
            style={{ backgroundColor: 'var(--bg-hover)' }}
            aria-label={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            ) : (
              <Moon className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
            )}
          </button>
        )}
      </div>

      {/* Voice error/success message */}
      {voiceError && (
        <div className={`mx-4 mt-2 px-4 py-2.5 rounded-xl text-sm font-medium text-center ${voiceError.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {voiceError}
        </div>
      )}

      {/* Route inputs */}
      <div className="px-4 pt-3 pb-2 relative z-20">
        {/* 📍 현재 위치 CTA 버튼 (홈/회사 칩보다 상단) */}
        {onGPS && (
          <button
            onClick={() => { onGPS(); }}
            disabled={gpsLoading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-50 mb-3"
            style={{ background: 'var(--accent-light, #ede9fe)', color: 'var(--accent)' }}
            aria-label="현재 위치를 출발지로 설정"
          >
            <LocateFixed className={`w-4 h-4 ${gpsLoading ? 'animate-spin' : ''}`} />
            {gpsLoading ? '위치 확인 중...' : '📍 현재 위치에서 출발'}
          </button>
        )}
        {/* 스마트 출발지 빠른 선택 */}
        <div className="flex gap-2 mb-3">
          {(() => {
            const home = getSavedLocationByLabel('home');
            const work = getSavedLocationByLabel('work');
            return (
              <>
                {home && (
                  <button
                    onClick={() => {
                      onStartChange(home.address);
                      if (onStartSelect) onStartSelect({ address: home.address, coordinates: home.coordinates });
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-all active:scale-95"
                    style={{ background: 'var(--blue-150)', color: 'var(--blue-700)' }}
                  >
                    <Home className="w-4 h-4" />
                    집
                  </button>
                )}
                {work && (
                  <button
                    onClick={() => {
                      onStartChange(work.address);
                      if (onStartSelect) onStartSelect({ address: work.address, coordinates: work.coordinates });
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-all active:scale-95"
                    style={{ background: 'var(--green-150)', color: 'var(--green-700)' }}
                  >
                    <Briefcase className="w-4 h-4" />
                    회사
                  </button>
                )}
              </>
            );
          })()}
        </div>
        
        <div className="space-y-2.5">
          {/* 출발지 입력 + GPS 버튼 */}
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <AddressInput
                label=""
                value={startAddress}
                onChange={onStartChange}
                onSelect={onStartSelect}
                placeholder="출발지를 입력하세요"
                mapCenter={mapCenter}
                dotColor="var(--accent)"
                testId="mobile-origin-input"
              />
            </div>
            {onGPS && (
              <button
                onClick={onGPS}
                disabled={gpsLoading}
                className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center active:scale-95 transition-all disabled:opacity-50"
                style={{ background: 'var(--accent)', color: 'white' }}
                title="현재 위치"
              >
                <LocateFixed className={`w-5 h-5 ${gpsLoading ? 'animate-pulse' : ''}`} />
              </button>
            )}
          </div>
          
          {/* 스왑 버튼 */}
          {onSwap && (
            <div className="flex justify-center -my-1">
              <button
                onClick={onSwap}
                disabled={!startAddress && !endAddress}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-all
                           hover:bg-blue-50 active:scale-95 active:rotate-180 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ border: '1px solid var(--border-soft)', backgroundColor: 'var(--bg-surface)' }}
                title="출발지↔도착지 바꾸기"
              >
                <ArrowUpDown className="w-5 h-5 transition-transform duration-300" style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>
          )}

          <AddressInput
            label=""
            value={endAddress}
            onChange={onEndChange}
            onSelect={onEndSelect}
            placeholder="도착지를 입력하세요"
            mapCenter={mapCenter}
            dotColor="var(--pink-500)"
            testId="mobile-destination-input"
          />
        </div>
      </div>

      {/* Category chips */}
      <div className="px-4 pb-3 relative z-10">
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
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all active:scale-95"
                  style={{
                    background: category === hint.category ? 'var(--accent)' : 'var(--bg-hover)',
                    color: category === hint.category ? 'white' : 'var(--text-secondary)',
                    border: `1px solid ${category === hint.category ? 'var(--accent)' : 'var(--border-soft)'}`,
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
        <p className="text-sm font-semibold mb-2.5" style={{ color: 'var(--text-primary)' }}>어디 들를까요?</p>
        <CategorySelect selected={category} onChange={onCategoryChange} />
      </div>

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
                >
                  <X className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
                </button>
                <button
                  className="text-left w-full pr-4"
                  onClick={() => onCategoryChange(place.category)}
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

      {/* Recent searches */}
      {recentSearches.length > 0 && (
        <div className="px-4 pb-3 flex-1 overflow-y-auto">
          <p className="text-base font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
            <Clock className="w-5 h-5" />
            최근 검색
          </p>
          <div className="space-y-2">
            {recentSearches.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 transition-colors"
              >
                <button
                  className="flex-1 text-left min-w-0"
                  onClick={() => handleRecentSelect(item)}
                >
                  <p className="text-[14px] font-medium truncate" style={{ color: 'var(--text-strong)' }}>
                    {item.startAddress} → {item.endAddress}
                  </p>
                  <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{item.category}</p>
                </button>
                <button
                  onClick={() => handleInstantSearchClick(item)}
                  className="shrink-0 flex items-center gap-1 px-3 py-2 rounded-xl text-[12px] font-bold transition-all active:scale-95"
                  style={{ background: 'var(--accent)', color: 'white' }}
                  title="바로 검색 실행"
                >
                  ▶
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleRecentDelete(item.id); }}
                  className="shrink-0 p-2 rounded-full hover:bg-gray-200 transition-colors"
                >
                  <X className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Spacer */}
      {recentSearches.length === 0 && placeFavorites.length === 0 && <div className="flex-1" />}

      {/* Search button */}
      <div className="px-4 py-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <button
          data-testid="mobile-search-route-btn"
          onClick={handleSearch}
          disabled={isLoading || !canSearch}
          className="w-full py-5 text-white rounded-2xl font-bold text-lg active:scale-[0.97] disabled:bg-gray-200 disabled:text-gray-400 transition-all shadow-md"
          style={{ background: isLoading || !canSearch ? undefined : 'var(--accent)' }}
        >
          {isLoading ? '찾는 중...' : '경유지 찾기 🔍'}
        </button>
      </div>
    </div>
  );
}
