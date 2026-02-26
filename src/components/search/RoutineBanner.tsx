/**
 * RoutineBanner - 시간대 기반 루틴 경로 자동 제안 배너
 *
 * 출퇴근 시간에 집→회사 / 회사→집 경로를 자동으로 제안합니다.
 * - 평일 7-9시: 출근 경로 (집→회사)
 * - 평일 17-19시: 퇴근 경로 (회사→집)
 *
 * [개선] 집/회사 미설정 시: 인라인 설정 유도 배너 표시
 * - 주소 검색 → 자동완성 → addSavedLocation 저장
 * - 저장 후 즉시 루틴 배너로 전환
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { X, ArrowRight, Home, Briefcase, Search, Check, ChevronRight } from 'lucide-react';
import {
  detectRoutine,
  shouldShowRoutinePrompt,
  markRoutinePromptShown,
  getLastPromptTime,
} from '@/lib/routine/detector';
import {
  getSavedLocationByLabel,
  addSavedLocation,
} from '@/lib/smart-location';
import type { Coordinates } from '@/types/location';

interface RoutineBannerProps {
  onApply: (
    startAddr: string,
    startCoords: Coordinates,
    endAddr: string,
    endCoords: Coordinates
  ) => void;
}

interface AutocompleteResult {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

// ────────────────────────────────────────────────────────────
// 집/회사 설정 인라인 미니 폼
// ────────────────────────────────────────────────────────────
interface SetupMiniFormProps {
  type: 'morning-commute' | 'evening-commute';
  onSaved: () => void;
  onDismiss: () => void;
}

function SetupMiniForm({ type, onSaved, onDismiss }: SetupMiniFormProps) {
  const isMorning = type === 'morning-commute';
  // 아침 → 집 먼저 물어보고, 저녁 → 회사 먼저 물어봄
  const [step, setStep] = useState<'home' | 'work'>(isMorning ? 'home' : 'work');
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<AutocompleteResult[]>([]);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [step]);

  const handleQueryChange = (val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/autocomplete?query=${encodeURIComponent(val)}`);
        const data = await res.json();
        setSuggestions((data.results || []).slice(0, 4));
      } catch {
        setSuggestions([]);
      }
    }, 250);
  };

  const handleSelect = async (result: AutocompleteResult) => {
    setSaving(true);
    setSuggestions([]);

    addSavedLocation({
      label: step,
      address: result.address || result.name,
      coordinates: { lat: result.lat, lng: result.lng },
      visitCount: 0,
      lastVisited: Date.now(),
    });

    // 단계 진행
    if (step === 'home') {
      setQuery('');
      setStep('work');
    } else if (step === 'work') {
      setQuery('');
      setStep('home');
    }

    setSaving(false);

    // 집/회사 모두 저장됐는지 확인
    const home = getSavedLocationByLabel('home');
    const work = getSavedLocationByLabel('work');
    if (home && work) {
      onSaved();
    }
  };

  const isHome = step === 'home';
  const Icon = isHome ? Home : Briefcase;
  const placeholder = isHome ? '집 주소 검색 (예: 서울 마포구 성산동)' : '회사 주소 검색 (예: 강남구 테헤란로)';
  const label = isHome ? '집 주소 등록' : '회사 주소 등록';

  return (
    <div
      className="p-3 rounded-xl animate-fade-in mb-4"
      style={{
        background: 'linear-gradient(135deg, var(--blue-50), var(--accent-weak))',
        border: '1px solid var(--blue-200)',
      }}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-base" aria-hidden="true">
            {isMorning ? '🌅' : '🌇'}
          </span>
          <p className="text-sm font-bold" style={{ color: 'var(--blue-700)' }}>
            {isMorning ? '출근 시간!' : '퇴근 시간!'} 경로 자동화 설정
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="p-1.5 rounded-full hover:bg-blue-100 active:scale-95 transition-all"
          aria-label="닫기"
        >
          <X className="w-4 h-4" style={{ color: 'var(--blue-400)' }} />
        </button>
      </div>

      {/* 진행 상태 */}
      <div className="flex items-center gap-1.5 mb-2.5">
        {(['home', 'work'] as const).map((s) => {
          const done = getSavedLocationByLabel(s) !== null;
          const active = step === s;
          return (
            <div key={s} className="flex items-center gap-1">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{
                  background: done ? 'var(--green-500)' : active ? 'var(--blue-500)' : 'var(--blue-200)',
                  color: done || active ? 'white' : 'var(--blue-500)',
                }}
              >
                {done ? '✓' : s === 'home' ? '집' : '직'}
              </div>
              {s === 'home' && <ChevronRight className="w-3 h-3" style={{ color: 'var(--blue-300)' }} />}
            </div>
          );
        })}
        <span className="text-xs ml-1" style={{ color: 'var(--blue-500)' }}>
          {label}
        </span>
      </div>

      {/* 검색 입력 */}
      <div className="relative">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border"
          style={{ borderColor: 'var(--blue-200)' }}
        >
          <Icon className="w-4 h-4 shrink-0" style={{ color: 'var(--blue-500)' }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder={placeholder}
            className="flex-1 text-sm bg-transparent focus:outline-none"
            style={{ color: 'var(--text-strong)' }}
            disabled={saving}
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setSuggestions([]); }}
              className="p-0.5"
            >
              <X className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
            </button>
          )}
        </div>

        {/* 자동완성 드롭다운 */}
        {suggestions.length > 0 && (
          <div
            className="absolute left-0 right-0 top-full mt-1 rounded-xl overflow-hidden z-20 shadow-lg"
            style={{ background: 'white', border: '1px solid var(--blue-100)' }}
          >
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => handleSelect(s)}
                className="w-full px-3 py-2.5 text-left hover:bg-blue-50 transition-colors flex items-start gap-2 border-b last:border-b-0"
                style={{ borderColor: 'var(--blue-50)' }}
              >
                <Search className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: 'var(--blue-400)' }} />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-strong)' }}>{s.name}</p>
                  <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{s.address}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="text-[11px] mt-2" style={{ color: 'var(--blue-400)' }}>
        설정 후 출퇴근 시간에 자동으로 경로를 제안해드려요
      </p>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// 메인 컴포넌트
// ────────────────────────────────────────────────────────────
export default function RoutineBanner({ onApply }: RoutineBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [routineType, setRoutineType] = useState<'morning-commute' | 'evening-commute' | null>(null);
  const [mode, setMode] = useState<'ready' | 'setup' | 'hidden'>('hidden');
  const [routineInfo, setRoutineInfo] = useState<{
    type: 'morning-commute' | 'evening-commute';
    emoji: string;
    label: string;
    startAddr: string;
    startCoords: Coordinates;
    endAddr: string;
    endCoords: Coordinates;
    startLabel: string;
    endLabel: string;
  } | null>(null);

  useEffect(() => {
    const type = detectRoutine();
    if (!type || type === 'weekend-trip') return;

    const lastPrompt = getLastPromptTime(type);
    if (!shouldShowRoutinePrompt(type, lastPrompt)) return;

    setRoutineType(type);

    const home = getSavedLocationByLabel('home');
    const work = getSavedLocationByLabel('work');

    if (home && work) {
      // 집/회사 모두 저장 → 루틴 자동 제안 모드
      if (type === 'morning-commute') {
        setRoutineInfo({
          type,
          emoji: '🌅',
          label: '출근 시간이에요!',
          startAddr: home.address,
          startCoords: home.coordinates,
          endAddr: work.address,
          endCoords: work.coordinates,
          startLabel: '집',
          endLabel: '회사',
        });
      } else {
        setRoutineInfo({
          type,
          emoji: '🌇',
          label: '퇴근 시간이에요!',
          startAddr: work.address,
          startCoords: work.coordinates,
          endAddr: home.address,
          endCoords: home.coordinates,
          startLabel: '회사',
          endLabel: '집',
        });
      }
      setMode('ready');
    } else {
      // 집/회사 미설정 → 설정 유도 모드
      setMode('setup');
    }
  }, []);

  if (dismissed || mode === 'hidden') return null;

  // ── 설정 유도 모드 ──
  if (mode === 'setup' && routineType) {
    return (
      <SetupMiniForm
        type={routineType}
        onSaved={() => {
          // 저장 완료 → 루틴 배너로 전환
          const home = getSavedLocationByLabel('home');
          const work = getSavedLocationByLabel('work');
          if (!home || !work || !routineType) return;

          if (routineType === 'morning-commute') {
            setRoutineInfo({
              type: routineType,
              emoji: '🌅',
              label: '출근 시간이에요!',
              startAddr: home.address,
              startCoords: home.coordinates,
              endAddr: work.address,
              endCoords: work.coordinates,
              startLabel: '집',
              endLabel: '회사',
            });
          } else {
            setRoutineInfo({
              type: routineType,
              emoji: '🌇',
              label: '퇴근 시간이에요!',
              startAddr: work.address,
              startCoords: work.coordinates,
              endAddr: home.address,
              endCoords: home.coordinates,
              startLabel: '회사',
              endLabel: '집',
            });
          }
          setMode('ready');
        }}
        onDismiss={() => {
          if (routineType) markRoutinePromptShown(routineType);
          setDismissed(true);
        }}
      />
    );
  }

  // ── 루틴 자동 제안 모드 ──
  if (mode !== 'ready' || !routineInfo) return null;

  const handleApply = () => {
    markRoutinePromptShown(routineInfo.type);
    onApply(
      routineInfo.startAddr,
      routineInfo.startCoords,
      routineInfo.endAddr,
      routineInfo.endCoords
    );
    setDismissed(true);
  };

  const handleDismiss = () => {
    markRoutinePromptShown(routineInfo.type);
    setDismissed(true);
  };

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl animate-fade-in mb-4"
      style={{
        background: 'linear-gradient(135deg, var(--blue-50), var(--accent-weak))',
        border: '1px solid var(--blue-200)',
      }}
    >
      <span className="text-2xl shrink-0" aria-hidden="true">
        {routineInfo.emoji}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold mb-1" style={{ color: 'var(--blue-700)' }}>
          {routineInfo.label}
        </p>
        <button
          onClick={handleApply}
          className="flex items-center gap-1.5 active:scale-95 transition-transform"
          aria-label={`${routineInfo.startLabel}에서 ${routineInfo.endLabel}으로 경로 자동 입력`}
        >
          <span
            className="px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{ background: 'var(--blue-150)', color: 'var(--blue-700)' }}
          >
            {routineInfo.startLabel}
          </span>
          <ArrowRight className="w-3 h-3" style={{ color: 'var(--blue-500)' }} />
          <span
            className="px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{ background: 'var(--blue-150)', color: 'var(--blue-700)' }}
          >
            {routineInfo.endLabel}
          </span>
          <span className="text-xs ml-1" style={{ color: 'var(--blue-500)' }}>
            탭해서 입력
          </span>
        </button>
      </div>
      <button
        onClick={handleDismiss}
        className="shrink-0 p-1.5 rounded-full hover:bg-blue-100 active:scale-95 transition-all"
        aria-label="루틴 배너 닫기"
      >
        <X className="w-4 h-4" style={{ color: 'var(--blue-400)' }} />
      </button>
    </div>
  );
}
