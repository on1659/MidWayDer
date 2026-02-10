/**
 * SearchOverlay - 모바일 풀스크린 검색 오버레이
 */

'use client';

import { X, Search } from 'lucide-react';
import AddressInput from './AddressInput';
import CategorySelect from './CategorySelect';

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
}: SearchOverlayProps) {
  if (!open) return null;

  const handleSearch = () => {
    onSearch();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-[env(safe-area-inset-top)] py-3 border-b border-gray-100">
        <h2 className="text-lg font-bold text-gray-900">경유지 검색</h2>
        <button
          onClick={onClose}
          className="p-2 -mr-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Form */}
      <div className="flex-1 px-4 py-5 space-y-4 overflow-y-auto">
        <AddressInput
          label="출발지"
          value={startAddress}
          onChange={onStartChange}
          onSelect={onStartSelect}
          placeholder="출발지를 검색하세요"
          mapCenter={mapCenter}
        />
        <AddressInput
          label="도착지"
          value={endAddress}
          onChange={onEndChange}
          onSelect={onEndSelect}
          placeholder="도착지를 검색하세요"
          mapCenter={mapCenter}
        />

        {/* Category */}
        <div className="pt-1">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">카테고리</label>
          <CategorySelect selected={category} onChange={onCategoryChange} />
        </div>
      </div>

      {/* Search button (sticky bottom) */}
      <div className="px-4 py-4 border-t border-gray-100 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button
          onClick={handleSearch}
          disabled={isLoading || !canSearch}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-500 text-white rounded-2xl font-semibold text-base hover:bg-blue-600 active:scale-[0.98] disabled:bg-gray-200 disabled:text-gray-400 transition-all"
        >
          <Search className="w-5 h-5" />
          {isLoading ? '검색 중...' : '경유지 검색'}
        </button>
      </div>
    </div>
  );
}
