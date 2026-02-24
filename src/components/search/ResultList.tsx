/**
 * ResultList - 파스텔톤 카드형 결과 리스트
 */

'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import type { DetourResult } from '@/types/detour';
import { copyToClipboard } from '@/lib/clipboard';

interface ResultListProps {
  results: DetourResult[];
  selectedId: string | null;
  isLoading: boolean;
  error: string | null;
  onSelect: (result: DetourResult) => void;
}

export default function ResultList({
  results,
  selectedId,
  isLoading,
  error,
  onSelect,
}: ResultListProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyAddress = async (e: React.MouseEvent, result: DetourResult) => {
    e.stopPropagation();
    const address = result.place.roadAddress || result.place.address;
    if (!address) return;
    
    const success = await copyToClipboard(address);
    if (success) {
      setCopiedId(result.place.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleSelect = async (result: DetourResult, rank: number) => {
    // 클릭 로그 저장 (비동기, 실패해도 UX 차단 안 함)
    fetch('/api/log-click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ placeId: result.place.id, rank }),
    }).catch(err => console.error('[ClickLog] Failed:', err));

    onSelect(result);
  };
  if (isLoading) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-center font-medium animate-pulse" style={{ color: 'var(--accent)' }}>
          경유지를 찾고 있어요...
        </p>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-4 bg-white rounded-2xl animate-pulse shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-gray-100 rounded-full shrink-0" />
              <div className="flex-1">
                <div className="h-4 bg-gray-100 rounded-lg w-2/3 mb-2" />
                <div className="h-3 bg-gray-50 rounded-lg w-1/2 mb-3" />
                <div className="flex gap-1.5">
                  <div className="h-6 w-16 bg-blue-50 rounded-full" />
                  <div className="h-6 w-14 bg-orange-50 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-2xl" style={{ background: 'var(--pink-100)' }}>
        <p className="text-sm font-medium" style={{ color: 'var(--pink-500)' }}>😢 {error}</p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="py-16 text-center">
        <div className="text-4xl mb-3">🗺️</div>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          출발지와 도착지를 설정하고<br />경유지를 검색해보세요
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {results.map((result, index) => {
        const isSelected = selectedId === result.place.id;
        const detourKm = (result.detourCost.distance / 1000).toFixed(1);
        const detourMin = Math.round(result.detourCost.duration / 60);
        const routeLabel = (result as any).routeType === 'shortest' ? '최단거리' : (result as any).routeType === 'fastest' ? '최단시간' : null;

        return (
          <button
            key={result.place.id}
            onClick={() => handleSelect(result, index + 1)}
            className="w-full p-4 rounded-2xl text-left transition-all active:scale-[0.98] shadow-sm"
            style={{
              background: isSelected ? 'var(--blue-200)' : 'var(--bg-surface)',
              border: isSelected ? '1.5px solid var(--accent)' : '1px solid var(--border-soft)',
            }}
          >
            <div className="flex items-start gap-3">
              {/* Rank badge */}
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center text-base font-bold shrink-0"
                style={{
                  background: index === 0 ? 'var(--accent)' : 'var(--blue-150)',
                  color: index === 0 ? 'var(--bg-surface)' : 'var(--accent)',
                }}
              >
                {index + 1}
              </div>

              <div className="flex-1 min-w-0 mr-2">
                {/* Name */}
                <h3 className="text-[17px] font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                  {result.place.name}
                </h3>
                {/* Address */}
                {(result.place.roadAddress || result.place.address) && (
                  <p className="text-[13px] mt-1 truncate" style={{ color: 'var(--text-secondary)' }}>
                    {result.place.roadAddress || result.place.address}
                  </p>
                )}

                {/* Badges */}
                <div className="flex flex-wrap items-center gap-2 mt-2.5">
                  <span
                    className="inline-flex items-center px-3 py-1.5 rounded-full text-[13px] font-semibold"
                    style={{ background: 'var(--accent-weak)', color: 'var(--accent)' }}
                  >
                    +{detourKm}km
                  </span>
                  <span
                    className="inline-flex items-center px-3 py-1.5 rounded-full text-[13px] font-semibold"
                    style={{ background: 'var(--yellow-100)', color: 'var(--yellow-600)' }}
                  >
                    +{detourMin}분
                  </span>
                  {routeLabel && (
                    <span
                      className="inline-flex items-center px-3 py-1.5 rounded-full text-[13px] font-semibold"
                      style={{ background: 'var(--green-100)', color: 'var(--green-700)' }}
                    >
                      {routeLabel}
                    </span>
                  )}
                </div>
              </div>

              {/* Copy button */}
              <button
                onClick={(e) => handleCopyAddress(e, result)}
                className="shrink-0 p-2 rounded-lg hover:bg-gray-100 transition-colors active:scale-95 self-start"
                title="주소 복사"
              >
                {copiedId === result.place.id ? (
                  <Check className="w-4 h-4" style={{ color: 'var(--green-600)' }} />
                ) : (
                  <Copy className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                )}
              </button>
            </div>
          </button>
        );
      })}
    </div>
  );
}
