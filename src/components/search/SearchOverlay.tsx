/**
 * SearchOverlay - 키즈 프렌들리 모바일 풀스크린 검색
 */

'use client';

import { X } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 bg-amber-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-[env(safe-area-inset-top)] py-4">
        <h2 className="text-2xl font-black text-gray-800">🗺️ 어디로 갈까?</h2>
        <button
          onClick={onClose}
          className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center active:scale-95"
        >
          <X className="w-6 h-6 text-gray-400" />
        </button>
      </div>

      {/* Form */}
      <div className="flex-1 px-5 py-4 space-y-5 overflow-y-auto">
        <div className="space-y-3">
          <div className="text-lg font-bold text-gray-700">📍 출발</div>
          <AddressInput
            label="출발지"
            value={startAddress}
            onChange={onStartChange}
            onSelect={onStartSelect}
            placeholder="출발하는 곳"
            mapCenter={mapCenter}
          />
        </div>

        <div className="space-y-3">
          <div className="text-lg font-bold text-gray-700">🏁 도착</div>
          <AddressInput
            label="도착지"
            value={endAddress}
            onChange={onEndChange}
            onSelect={onEndSelect}
            placeholder="가고 싶은 곳"
            mapCenter={mapCenter}
          />
        </div>

        {/* Category */}
        <div className="space-y-3">
          <div className="text-lg font-bold text-gray-700">🏬 어디 들를까?</div>
          <CategorySelect selected={category} onChange={onCategoryChange} />
        </div>
      </div>

      {/* Search button */}
      <div className="px-5 py-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <button
          onClick={handleSearch}
          disabled={isLoading || !canSearch}
          className="w-full py-5 bg-blue-500 text-white rounded-3xl font-black text-xl
            hover:bg-blue-600 active:scale-[0.97] disabled:bg-gray-200 disabled:text-gray-400
            transition-all shadow-lg shadow-blue-500/30"
        >
          {isLoading ? '🔍 찾는 중...' : '🔍 검색하기!'}
        </button>
      </div>
    </div>
  );
}
