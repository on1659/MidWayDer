/**
 * AddressInput - 주소 입력 + 자동완성 (파스텔 스타일)
 */

'use client';

import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { MapPin, X, Loader2 } from 'lucide-react';

interface AutocompleteResult {
  name: string;
  address: string;
  lat: number;
  lng: number;
  category: string;
}

interface AddressInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSelect?: (result: { address: string; coordinates: { lat: number; lng: number } }) => void;
  placeholder?: string;
  icon?: ReactNode;
  mapCenter?: { lat: number; lng: number };
  /** 입력란 왼쪽에 표시할 색깔 점 */
  dotColor?: string;
  /** E2E 테스트용 식별자 */
  testId?: string;
}

export default function AddressInput({
  label,
  value,
  onChange,
  onSelect,
  placeholder = '장소나 주소를 검색하세요',
  icon: _icon,
  mapCenter,
  dotColor,
  testId,
}: AddressInputProps) {
  const [localValue, setLocalValue] = useState(value);
  const [results, setResults] = useState<AutocompleteResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchResults = useCallback(async (query: string) => {
    if (query.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      let url = `/api/autocomplete?query=${encodeURIComponent(query)}`;
      if (mapCenter) {
        url += `&lat=${mapCenter.lat}&lng=${mapCenter.lng}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      setResults(data.results || []);
      setIsOpen((data.results || []).length > 0);
      setActiveIndex(-1);
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [mapCenter]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    onChange(newValue);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => fetchResults(newValue), 300);
  };

  const handleSelect = (result: AutocompleteResult) => {
    const displayValue = result.name;
    setLocalValue(displayValue);
    setIsOpen(false);
    setResults([]);

    if (onSelect) {
      onSelect({
        address: displayValue,
        coordinates: { lat: result.lat, lng: result.lng },
      });
    } else {
      onChange(displayValue);
    }
  };

  const handleClear = () => {
    setLocalValue('');
    setResults([]);
    setIsOpen(false);
    onChange('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(results[activeIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      {label && <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-muted)' }}>{label}</label>}
      <div className="relative flex items-center">
        {dotColor && (
          <div className="w-4 h-4 rounded-full shrink-0 mr-3" style={{ background: dotColor }} />
        )}
        <div className="relative flex-1">
        <input
          ref={inputRef}
          data-testid={testId}
          type="text"
          value={localValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          aria-label={label || placeholder}
          className="w-full px-4 py-3.5 rounded-xl text-base placeholder:text-gray-400 focus:outline-none focus:ring-1 transition-all pr-12"
          style={{
            background: 'var(--bg-surface-muted)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-soft)',
          }}
          onFocusCapture={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent)';
            e.currentTarget.style.background = 'var(--bg-surface)';
          }}
          onBlurCapture={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-soft)';
            e.currentTarget.style.background = 'var(--bg-surface-muted)';
          }}
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--text-muted)' }} />
          ) : localValue ? (
            <button onClick={handleClear} className="p-1.5 rounded-full hover:bg-gray-100 transition-colors">
              <X className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
            </button>
          ) : null}
        </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden z-50 max-h-[260px] overflow-y-auto">
          {results.map((result, i) => (
            <button
              key={`${result.lat}-${result.lng}-${i}`}
              onClick={() => handleSelect(result)}
              className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors ${
                i === activeIndex ? 'bg-blue-50' : 'hover:bg-gray-50'
              } ${i > 0 ? 'border-t border-gray-50' : ''}`}
            >
              <MapPin className="w-5 h-5 mt-0.5 shrink-0" style={{ color: 'var(--accent)' }} />
              <div className="min-w-0 flex-1">
                <p className="text-[16px] font-medium truncate" style={{ color: 'var(--text-strong)' }}>{result.name}</p>
                <p className="text-[13px] truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {result.address}
                  {result.category && (
                    <span className="ml-1.5">· {result.category}</span>
                  )}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
      </div>{/* close flex-1 */}
      </div>{/* close flex items-center */}
    </div>
  );
}
