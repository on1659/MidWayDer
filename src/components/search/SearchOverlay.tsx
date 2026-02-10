/**
 * SearchOverlay - 네이버지도 스타일 모바일 풀스크린 검색
 */

'use client';

import { ArrowLeft } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 bg-white flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-[env(safe-area-inset-top)] py-3 border-b border-gray-100">
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full flex items-center justify-center active:scale-95 hover:bg-gray-50 transition-colors shrink-0"
        >
          <ArrowLeft className="w-5 h-5" style={{ color: '#2D3748' }} />
        </button>
        <h2 className="text-lg font-bold" style={{ color: '#2D3748' }}>경로 설정</h2>
      </div>

      {/* Route inputs */}
      <div className="px-4 pt-4 pb-3 space-y-3 relative z-20">
        <AddressInput
          label=""
          value={startAddress}
          onChange={onStartChange}
          onSelect={onStartSelect}
          placeholder="출발지를 입력하세요"
          mapCenter={mapCenter}
          dotColor="#6C9CFF"
        />
        <AddressInput
          label=""
          value={endAddress}
          onChange={onEndChange}
          onSelect={onEndSelect}
          placeholder="도착지를 입력하세요"
          mapCenter={mapCenter}
          dotColor="#FF8FA3"
        />
      </div>

      {/* Category chips */}
      <div className="px-4 pb-4 relative z-10">
        <p className="text-sm font-semibold mb-3" style={{ color: '#2D3748' }}>어디 들를까요?</p>
        <CategorySelect selected={category} onChange={onCategoryChange} />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search button */}
      <div className="px-4 py-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <button
          onClick={handleSearch}
          disabled={isLoading || !canSearch}
          className="w-full py-4 text-white rounded-2xl font-bold text-base active:scale-[0.97] disabled:bg-gray-200 disabled:text-gray-400 transition-all shadow-md"
          style={{ background: isLoading || !canSearch ? undefined : '#6C9CFF' }}
        >
          {isLoading ? '찾는 중...' : '경유지 찾기 🔍'}
        </button>
      </div>
    </div>
  );
}
