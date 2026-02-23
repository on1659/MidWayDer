/**
 * SearchOverlay - 네이버지도 스타일 모바일 풀스크린 검색
 */

'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, X, Clock, Sun, Moon } from 'lucide-react';
import AddressInput from './AddressInput';
import CategorySelect from './CategorySelect';
import { getRecentSearches, removeRecentSearch, type RecentSearch } from '@/lib/recent-searches';

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
  isLoading: boolean;
  canSearch: boolean;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
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
  isLoading,
  canSearch,
  theme = 'light',
  onToggleTheme,
}: SearchOverlayProps) {
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);

  useEffect(() => {
    if (open) setRecentSearches(getRecentSearches());
  }, [open]);

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

  const handleRecentDelete = (id: string) => {
    removeRecentSearch(id);
    setRecentSearches(getRecentSearches());
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

      {/* Route inputs */}
      <div className="px-4 pt-3 pb-2 space-y-2.5 relative z-20">
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

      {/* Category chips */}
      <div className="px-4 pb-3 relative z-10">
        <p className="text-sm font-semibold mb-2.5" style={{ color: 'var(--text-primary)' }}>어디 들를까요?</p>
        <CategorySelect selected={category} onChange={onCategoryChange} />
      </div>

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
                className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 active:bg-gray-100 transition-colors"
              >
                <button
                  className="flex-1 text-left min-w-0"
                  onClick={() => handleRecentSelect(item)}
                >
                  <p className="text-[15px] font-medium truncate" style={{ color: 'var(--text-strong)' }}>
                    {item.startAddress} → {item.endAddress}
                  </p>
                  <p className="text-[13px] mt-1" style={{ color: 'var(--text-muted)' }}>{item.category}</p>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleRecentDelete(item.id); }}
                  className="shrink-0 p-2 rounded-full hover:bg-gray-200 transition-colors"
                >
                  <X className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Spacer */}
      {recentSearches.length === 0 && <div className="flex-1" />}

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
