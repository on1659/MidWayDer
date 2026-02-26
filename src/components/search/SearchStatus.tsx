/**
 * SearchStatus - 검색 중 상태 표시 + 단계별 진행 안내 + 취소 버튼
 *
 * 3초 내외의 검색 시간 동안 단계별 진행 상황을 표시해 사용자 불안을 줄입니다.
 * - 0~1s:   "경로 계산 중..."
 * - 1~2.5s: "경유지 후보 필터링 중..."
 * - 2.5~4s: "이탈 비용 계산 중..."
 * - 4s+:    "결과 정렬 중..."
 */

'use client';

import { useEffect, useState } from 'react';
import { X, Route, Filter, Calculator, SortDesc } from 'lucide-react';
import { useSearchStore } from '@/store/search-store';

interface Stage {
  label: string;
  icon: React.ElementType;
  minMs: number;
}

const STAGES: Stage[] = [
  { label: '경로 계산 중...', icon: Route, minMs: 0 },
  { label: '경유지 후보 필터링 중...', icon: Filter, minMs: 1000 },
  { label: '이탈 비용 계산 중...', icon: Calculator, minMs: 2500 },
  { label: '결과 정렬 중...', icon: SortDesc, minMs: 4000 },
];

export default function SearchStatus() {
  const isLoading = useSearchStore((s) => s.isLoading);
  const cancelSearch = useSearchStore((s) => s.cancelSearch);

  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);

  // 로딩 시작 시 타이머 리셋
  useEffect(() => {
    if (isLoading) {
      setStartedAt(Date.now());
      setElapsed(0);
    } else {
      setStartedAt(null);
    }
  }, [isLoading]);

  // 1초마다 경과 시간 업데이트
  useEffect(() => {
    if (!isLoading || startedAt === null) return;
    const id = setInterval(() => {
      setElapsed(Date.now() - startedAt);
    }, 200);
    return () => clearInterval(id);
  }, [isLoading, startedAt]);

  if (!isLoading) return null;

  // 현재 단계 결정
  const currentStage = STAGES.reduce<Stage>(
    (prev, stage) => (elapsed >= stage.minMs ? stage : prev),
    STAGES[0]
  );
  const stageIndex = STAGES.indexOf(currentStage);

  const Icon = currentStage.icon;

  return (
    <div
      className="flex items-center justify-between p-4 rounded-2xl shadow-sm gap-3"
      style={{ background: 'var(--blue-50)' }}
    >
      {/* 왼쪽: 아이콘 + 진행 정보 */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        {/* 아이콘 (단계별 변화) */}
        <div
          className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: 'var(--blue-150)' }}
        >
          <Icon className="w-4 h-4" style={{ color: 'var(--blue-600)' }} />
        </div>

        <div className="min-w-0 flex-1">
          {/* 단계 메시지 */}
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--blue-700)' }}>
            {currentStage.label}
          </p>

          {/* 단계 도트 인디케이터 */}
          <div className="flex items-center gap-1.5 mt-1.5">
            {STAGES.map((_, i) => (
              <div
                key={i}
                className="h-1 rounded-full transition-all duration-500"
                style={{
                  width: i === stageIndex ? '20px' : '6px',
                  background:
                    i < stageIndex
                      ? 'var(--blue-500)'
                      : i === stageIndex
                      ? 'var(--blue-400)'
                      : 'var(--blue-200)',
                }}
              />
            ))}
            {/* 경과 시간 */}
            <span className="ml-1 text-[11px]" style={{ color: 'var(--blue-400)' }}>
              {(elapsed / 1000).toFixed(1)}s
            </span>
          </div>
        </div>
      </div>

      {/* 오른쪽: 취소 버튼 */}
      <button
        onClick={cancelSearch}
        className="shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 hover:bg-blue-100/50 active:scale-95"
        style={{ color: 'var(--blue-700)' }}
        aria-label="검색 취소"
      >
        <X className="w-3.5 h-3.5" />
        취소
      </button>
    </div>
  );
}
