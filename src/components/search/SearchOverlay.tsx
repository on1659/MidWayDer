/**
 * SearchOverlay - 모바일 풀스크린 검색 오버레이
 *
 * 검색바를 탭하면 나타나는 풀스크린 입력 화면입니다.
 */

'use client';

import { X, MapPin, Navigation, Search } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 bg-white flex flex-col animate-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">경유지 검색</h2>
        <button
          onClick={onClose}
          className="p-2 -mr-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Form */}
      <div className="flex-1 px-5 py-6 space-y-5 overflow-y-auto">
        {/* Route inputs */}
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="flex flex-col items-center pt-10 gap-1">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <div className="w-0.5 flex-1 bg-gray-200" />
              <div className="w-3 h-3 rounded-full bg-red-500" />
            </div>
            <div className="flex-1 space-y-3">
              <AddressInput
                label="출발지"
                value={startAddress}
                onChange={onStartChange}
                onSelect={onStartSelect}
                placeholder="예: 서울시청"
                icon={<Navigation className="w-4 h-4 text-blue-500" />}
                mapCenter={mapCenter}
              />
              <AddressInput
                label="도착지"
                value={endAddress}
                onChange={onEndChange}
                onSelect={onEndSelect}
                placeholder="예: 강남역"
                icon={<MapPin className="w-4 h-4 text-red-500" />}
                mapCenter={mapCenter}
              />
            </div>
          </div>
        </div>

        {/* Category */}
        <CategorySelect selected={category} onChange={onCategoryChange} />
      </div>

      {/* Search button (sticky bottom) */}
      <div className="px-5 py-4 border-t border-gray-100 safe-bottom">
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
