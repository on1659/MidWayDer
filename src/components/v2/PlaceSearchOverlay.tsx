'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Search, X, Loader2, MapPin, LocateFixed } from 'lucide-react';
import type { AddressSelection } from '@/components/search/AddressInput';

interface AutocompleteResult {
  name: string;
  address: string;
  lat: number;
  lng: number;
  category: string;
}

interface PlaceSearchOverlayProps {
  open: boolean;
  onClose: () => void;
  onSelect: (place: AddressSelection) => void;
  onUseCurrentLocation?: () => void;
  mapCenter?: { lat: number; lng: number };
  placeholder?: string;
}

export default function PlaceSearchOverlay({
  open,
  onClose,
  onSelect,
  onUseCurrentLocation,
  mapCenter,
  placeholder = '장소 또는 주소 검색',
}: PlaceSearchOverlayProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AutocompleteResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const fetchAutocomplete = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({ query: q });
      if (mapCenter) {
        params.set('lat', String(mapCenter.lat));
        params.set('lng', String(mapCenter.lng));
      }
      const res = await fetch(`/api/autocomplete?${params.toString()}`);
      if (!res.ok) throw new Error('autocomplete failed');
      const data = await res.json();
      setResults(Array.isArray(data.results) ? data.results : []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [mapCenter]);

  const handleQueryChange = (v: string) => {
    setQuery(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchAutocomplete(v), 200);
  };

  const handleSelect = (r: AutocompleteResult) => {
    onSelect({
      address: r.address,
      coordinates: { lat: r.lat, lng: r.lng },
      name: r.name,
      placeAddress: r.address,
      category: r.category,
    });
    onClose();
  };

  const renderHighlight = (text: string) => {
    if (!query.trim()) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark style={{ background: 'transparent', color: 'var(--accent)', fontWeight: 700 }}>
          {text.slice(idx, idx + query.length)}
        </mark>
        {text.slice(idx + query.length)}
      </>
    );
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col"
      style={{ background: 'var(--bg-app)' }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="flex items-center gap-2 border-b px-3 py-2"
        style={{
          background: 'var(--bg-surface)',
          borderColor: 'var(--border-soft)',
          paddingTop: 'calc(env(safe-area-inset-top) + 8px)',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="flex h-10 w-10 items-center justify-center rounded-lg"
          style={{ color: 'var(--text-primary)' }}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div
          className="flex flex-1 items-center gap-2 rounded-xl px-3 py-2.5"
          style={{ background: 'var(--bg-surface-muted)' }}
        >
          <Search className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--text-secondary)' }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-base outline-none"
            style={{ color: 'var(--text-primary)' }}
            autoComplete="off"
          />
          {loading && <Loader2 className="h-4 w-4 animate-spin" style={{ color: 'var(--text-tertiary)' }} />}
          {!loading && query && (
            <button
              type="button"
              onClick={() => handleQueryChange('')}
              aria-label="입력 지우기"
              className="flex h-6 w-6 items-center justify-center rounded-full"
              style={{ background: 'var(--text-tertiary)', color: 'var(--bg-surface)' }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ background: 'var(--bg-surface)' }}>
        {!query && onUseCurrentLocation && (
          <button
            type="button"
            onClick={() => { onUseCurrentLocation(); onClose(); }}
            className="flex w-full items-center gap-3 border-b px-4 py-3.5 text-left"
            style={{ borderColor: 'var(--border-soft)' }}
          >
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full"
              style={{ background: 'rgba(var(--color-accent-rgb), 0.1)', color: 'var(--accent)' }}
            >
              <LocateFixed className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
                현재 위치 사용
              </div>
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                GPS로 내 위치 가져오기
              </div>
            </div>
          </button>
        )}

        {query && results.length === 0 && !loading && (
          <div className="px-4 py-12 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
            검색 결과가 없습니다
          </div>
        )}

        {results.map((r, idx) => (
          <button
            key={`${r.address}-${idx}`}
            type="button"
            onClick={() => handleSelect(r)}
            className="flex w-full items-start gap-3 border-b px-4 py-3.5 text-left"
            style={{ borderColor: 'var(--border-soft)' }}
          >
            <div
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full"
              style={{ background: 'var(--bg-surface-muted)', color: 'var(--text-secondary)' }}
            >
              <MapPin className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {renderHighlight(r.name || r.address)}
              </div>
              <div className="mt-0.5 truncate text-xs" style={{ color: 'var(--text-secondary)' }}>
                {renderHighlight(r.address)}
              </div>
            </div>
            {r.category && (
              <span
                className="flex-shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium"
                style={{ background: 'var(--bg-surface-muted)', color: 'var(--text-secondary)' }}
              >
                {r.category}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
