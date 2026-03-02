/**
 * TimeAccuracyNotice - 시간 정확도 안내 컴포넌트
 * QA_REVIEW 반영: 표시된 시간은 주행 시간만 포함됨을 명시
 */

'use client';

import { useState } from 'react';
import { Info, ChevronDown, ChevronUp, Clock, Car, AlertCircle } from 'lucide-react';

export function TimeAccuracyNotice() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="rounded-xl overflow-hidden transition-all"
      style={{
        background: 'var(--blue-50)',
        border: '1px solid var(--blue-200)',
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left transition-all hover:bg-blue-100/50"
        aria-expanded={expanded}
        aria-controls="time-accuracy-detail"
      >
        <Info className="w-4 h-4 shrink-0" style={{ color: 'var(--blue-600)' }} />
        <span className="flex-1 text-sm font-medium" style={{ color: 'var(--blue-700)' }}>
          표시된 시간은 주행 시간만 포함됩니다
        </span>
        {expanded ? (
          <ChevronUp className="w-4 h-4 shrink-0" style={{ color: 'var(--blue-600)' }} />
        ) : (
          <ChevronDown className="w-4 h-4 shrink-0" style={{ color: 'var(--blue-600)' }} />
        )}
      </button>

      {expanded && (
        <div
          id="time-accuracy-detail"
          className="px-4 pb-4 space-y-3 animate-accordion-down"
        >
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--orange-500)' }} />
            <div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                <strong>신호대기, 주차, 매장 체류 시간</strong>은 별도로 소요됩니다.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Clock className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--green-600)' }} />
            <div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                실제 소요 시간은 교통 상황에 따라{' '}
                <strong style={{ color: 'var(--text-primary)' }}>±20% 차이</strong>가 있을 수 있습니다.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Car className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--blue-600)' }} />
            <div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                표시된 시간은 <strong>Naver Maps 실제 도로 데이터</strong>를 기반으로 계산됩니다.
              </p>
            </div>
          </div>

          <div
            className="mt-3 px-3 py-2 rounded-lg text-xs"
            style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)' }}
          >
            💡 <strong>팁:</strong> 여유 있게 이동하려면 표시된 시간의 1.3배 정도를 계획하세요.
          </div>
        </div>
      )}
    </div>
  );
}
