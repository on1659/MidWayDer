/**
 * AddressInput - 주소 입력 + 자동완성 (파스텔 스타일)
 */

'use client';

import { useState, useEffect, useRef, useCallback, useId, type ReactNode } from 'react';
import { MapPin, X, Loader2 } from 'lucide-react';

interface AutocompleteResult {
  name: string;
  address: string;
  lat: number;
  lng: number;
  category: string;
}

export interface AddressSelection {
  address: string;
  coordinates: { lat: number; lng: number };
  name?: string;
  placeAddress?: string;
  category?: string;
}

interface AddressInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSelect?: (result: AddressSelection) => void;
  placeholder?: string;
  icon?: ReactNode;
  mapCenter?: { lat: number; lng: number };
  /** 입력란 왼쪽에 표시할 색깔 점 */
  dotColor?: string;
  /** E2E 테스트용 식별자 */
  testId?: string;
  /** 데스크톱 패널처럼 밀도 높은 곳에서 쓰는 축소형 */
  density?: 'default' | 'compact';
  /** 모바일 키보드의 검색/완료 키로 상위 검색을 실행 */
  onSubmit?: () => void;
}

export default function AddressInput({
  label,
  value,
  onChange,
  onSelect,
  placeholder = '어디를 들를까? (예: 홍대입구역, 다이소, 스타벅스)',
  icon: _icon,
  mapCenter,
  dotColor,
  testId,
  density = 'default',
  onSubmit,
}: AddressInputProps) {
  const generatedId = useId();
  const stableBaseId = testId || `address-input-${generatedId.replace(/:/g, '')}`;
  const inputId = `${stableBaseId}-input`;
  const hintId = `${stableBaseId}-hint`;
  const listboxId = `${stableBaseId}-listbox`;
  const optionIdPrefix = `${stableBaseId}-result`;
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
        name: result.name,
        placeAddress: result.address,
        category: result.category,
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
    if (e.key === 'Enter') {
      if (isOpen && results.length > 0 && activeIndex >= 0) {
        e.preventDefault();
        handleSelect(results[activeIndex]);
        return;
      }
      if (onSubmit && localValue.trim()) {
        e.preventDefault();
        onSubmit();
        return;
      }
    }

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
      {label && (
        <label htmlFor={inputId} className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-muted)' }}>
          {label}
        </label>
      )}
      
      {/* Screen reader hint */}
      <span id={hintId} className="sr-only">
        {placeholder} 입력 후 자동완성 결과가 표시됩니다
      </span>

      <div className="relative flex items-center">
        {dotColor && (
          <div className="w-4 h-4 rounded-full shrink-0 mr-3" style={{ background: dotColor }} />
        )}
        <div className="relative flex-1">
        <input
          id={inputId}
          ref={inputRef}
          data-testid={testId}
          type="text"
          value={localValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          role="combobox"
          aria-label={label || placeholder}
          aria-describedby={hintId}
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={isOpen}
          aria-activedescendant={activeIndex >= 0 ? `${optionIdPrefix}-${activeIndex}` : undefined}
          autoComplete="street-address"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          enterKeyHint="search"
	          className={`w-full rounded-2xl placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-all pr-12 gpu-accelerate ${
            density === 'compact' ? 'px-3 py-2.5 text-[13px]' : 'px-4 py-4 text-base'
          }`}
          style={{
            background: density === 'compact' ? 'var(--bg-surface-muted)' : 'var(--bg-surface)',
            color: 'var(--text-primary)',
            border: density === 'compact' ? '1px solid transparent' : '2px solid var(--border-strong)',
            fontSize: '16px', // iOS 자동 줌 방지
            minHeight: density === 'compact' ? '40px' : '56px', // 모바일 터치 영역 확보
          }}
          onFocusCapture={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent)';
            e.currentTarget.style.background = 'var(--bg-surface)';
            e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-weak)';
          }}
          onBlurCapture={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-strong)';
            e.currentTarget.style.background = 'var(--bg-surface)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--text-muted)' }} />
          ) : localValue ? (
            <>
              <button
                type="button"
                onClick={() => fetchResults(localValue)}
	                className="p-2 rounded-lg transition-colors hover:bg-[var(--overlay-selected)] hover:text-[var(--accent)]"
	                title="검색"
	                aria-label="주소 검색"
	                style={{ color: 'var(--text-muted)' }}
	              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </button>
              <button
                type="button"
                onClick={handleClear}
	                className="p-1.5 rounded-full hover:bg-[var(--overlay-hover)] transition-colors"
                title="삭제"
                aria-label="삭제"
              >
                <X className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
              </button>
            </>
          ) : null}
        </div>

      {isOpen && results.length > 0 && (
        <div
          id={listboxId}
	          className="absolute top-full left-0 right-0 mt-2 border rounded-2xl overflow-hidden z-[100] max-h-[260px] overflow-y-auto backdrop-blur-xl"
          role="listbox"
          aria-label="검색 결과"
          style={{
	            background: 'var(--bg-overlay)',
	            borderColor: 'var(--border-soft)',
	            boxShadow: 'var(--shadow-4)',
          }}
        >
          {results.map((result, i) => (
            <button
              key={`${result.lat}-${result.lng}-${i}`}
              onClick={() => handleSelect(result)}
	              className={`w-full text-left px-4 py-4 flex items-start gap-3 transition-colors hover:bg-[var(--overlay-hover)] ${i > 0 ? 'border-t' : ''}`}
	              style={{
	                background: i === activeIndex ? 'var(--overlay-selected)' : 'transparent',
	                borderColor: 'var(--border-soft)',
	                minHeight: '60px',
	              }}
              role="option"
              aria-selected={i === activeIndex}
              id={`${optionIdPrefix}-${i}`}
            >
	              <MapPin className="w-5 h-5 mt-1 shrink-0" style={{ color: 'var(--text-tertiary)' }} />
              <div className="min-w-0 flex-1">
                <p className="text-base font-bold truncate" style={{ color: 'var(--accent)' }}>{result.name}</p>
	                <p className="text-sm truncate mt-1" style={{ color: 'var(--text-secondary)' }}>
	                  {result.address}
	                  {result.category && (
	                    <span className="ml-1.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>· {result.category}</span>
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
