'use client';

/**
 * BottomQuickBar - 모바일 전용, 검색 전 + 즐겨찾기/최근 검색 없을 때 표시되는 퀵 액세스 바
 */

import { Star } from 'lucide-react';
import RoutineBanner from '@/components/search/RoutineBanner';
import { useRouteStore } from '@/store/route-store';
import { useSearchStore } from '@/store/search-store';
import type { Favorite } from '@/lib/favorites';

interface BottomQuickBarProps {
  favorites: Favorite[];
  setBottomSheetSnap: React.Dispatch<React.SetStateAction<'collapsed' | 'half' | 'full'>>;
  setSearchOverlayOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onRoutineApply: (startAddr: string, startCoords: { lat: number; lng: number }, endAddr: string, endCoords: { lat: number; lng: number }) => void;
}

const PRESET_ROUTES = [
  { start: '강남역', end: '여의도역', cat: '카페' },
  { start: '홍대입구역', end: '잠실역', cat: '스타벅스' },
  { start: '서울역', end: '판교역', cat: '편의점' },
  { start: '인천공항', end: '강남역', cat: '편의점' },
  { start: '신촌역', end: '건대입구역', cat: '카페' },
  { start: '역삼역', end: '선릉역', cat: '다이소' },
];

const QUICK_CATEGORIES = [
  { emoji: '☕', label: '카페' },
  { emoji: '🏪', label: '편의점' },
  { emoji: '🛒', label: '다이소' },
  { emoji: '💄', label: '올리브영' },
  { emoji: '⭐', label: '스타벅스' },
];

export default function BottomQuickBar({ favorites, setBottomSheetSnap, setSearchOverlayOpen, onRoutineApply }: BottomQuickBarProps) {
  const { setStart, setEnd } = useRouteStore();
  const { setCategory, search } = useSearchStore();

  return (
    <div className="md:hidden absolute bottom-0 inset-x-0 z-20 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="mx-3 bg-white rounded-2xl shadow-lg shadow-black/5 overflow-hidden">
        <div className="px-3 pt-3">
          <RoutineBanner onApply={onRoutineApply} />
        </div>
        <div className="px-5 pt-3 pb-3">
          <p className="text-xl font-bold" style={{ color: 'var(--text-strong)' }}>🗺️ 가는 길에 어디 들를까요?</p>
          <p className="text-sm mt-1.5" style={{ color: 'var(--text-secondary)' }}>출발지/도착지 설정 후 경유지를 찾아줘요</p>
        </div>
        
        {/* 검색창 추가 */}
        <div className="px-5 pb-3">
          <button
            onClick={() => setSearchOverlayOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl text-left transition-all active:scale-[0.98]"
            style={{
              background: '#F9FAFB',
              border: '2px solid #E5E7EB',
              minHeight: '56px',
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <span style={{ color: '#9CA3AF', fontSize: '16px' }}>어디를 들를까? (예: 홍대입구역, 다이소)</span>
          </button>
        </div>
        {favorites.length > 0 && (
          <div className="px-5 pb-3">
            <p className="text-sm font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>자주 가는 경로</p>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {favorites.slice(0, 3).map((fav) => (
                <button
                  key={fav.id}
                  onClick={async () => {
                    setStart({ address: fav.startAddress, coordinates: fav.startCoords });
                    setEnd({ address: fav.endAddress, coordinates: fav.endCoords });
                    setCategory(fav.category);
                    setSearchOverlayOpen(false);
                    if (fav.startCoords && fav.endCoords) {
                      setTimeout(() => {
                        search({ address: fav.startAddress, coordinates: fav.startCoords }, { address: fav.endAddress, coordinates: fav.endCoords }, fav.category)
                          .then(() => setBottomSheetSnap('half'));
                      }, 100);
                    }
                  }}
                  className="flex items-center gap-2 px-5 py-3 md:px-4 md:py-2.5 rounded-xl whitespace-nowrap shrink-0 transition-all active:scale-95"
                  style={{ background: 'var(--bg-surface)', border: '2px solid var(--accent-light)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
                >
                  <Star className="w-5 h-5 md:w-4 md:h-4" style={{ color: 'var(--accent)' }} fill="var(--accent)" />
                  <span className="text-base md:text-sm font-semibold" style={{ color: 'var(--text-strong)' }}>{fav.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="px-5 pb-3">
          <p className="text-sm font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>인기 경로</p>
          <div className="grid grid-cols-2 gap-2">
            {PRESET_ROUTES.map((preset) => (
              <button
                key={`${preset.start}-${preset.end}`}
                onClick={() => {
                  setStart({ address: preset.start });
                  setEnd({ address: preset.end });
                  setCategory(preset.cat);
                  setSearchOverlayOpen(false);
                  setTimeout(() => {
                    search({ address: preset.start }, { address: preset.end }, preset.cat)
                      .then(() => setBottomSheetSnap('half'));
                  }, 300);
                }}
                className="flex flex-col items-start gap-1 p-3 rounded-xl active:scale-95 transition-all"
                style={{ background: 'var(--bg-surface-muted)' }}
              >
                <span className="text-xs font-medium" style={{ color: 'var(--accent)' }}>{preset.cat}</span>
                <span className="text-sm font-semibold truncate w-full text-left" style={{ color: 'var(--text-strong)' }}>{preset.start} → {preset.end}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2.5 px-5 pb-5 overflow-x-auto">
          {QUICK_CATEGORIES.map((item) => (
            <button
              key={item.label}
              onClick={() => { setCategory(item.label); setSearchOverlayOpen(true); }}
              className="flex items-center gap-2 px-5 py-3.5 rounded-full text-lg font-semibold whitespace-nowrap shrink-0 active:scale-95 transition-all"
              style={{ background: 'var(--blue-150)', color: 'var(--blue-700)' }}
            >
              <span className="text-2xl">{item.emoji}</span>
              {item.label}
            </button>
          ))}
        </div>
        <div className="px-5 pb-3">
          <span className="text-xs" style={{ color: 'var(--text-disabled)' }}>v0.7.0</span>
        </div>
      </div>
    </div>
  );
}
