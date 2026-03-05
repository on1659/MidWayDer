/**
 * MultiStopSelector - 멀티 경유지 선택 및 최적화
 */

'use client';

import { useState } from 'react';
import { ArrowRight, Loader2, MapPin } from 'lucide-react';
import type { Coordinates } from '@/types/location';
import { logger } from '@/lib/logger';

interface Waypoint {
  id: string;
  name: string;
  address: string;
  coordinates: Coordinates;
  detourDistance?: number;
  detourDuration?: number;
}

interface Props {
  start: Coordinates;
  end: Coordinates;
  waypoints: Waypoint[];
  onOptimize?: (optimizedIds: string[]) => void;
}

interface OptimizeResult {
  optimizedOrder: string[];
  totalDistance: number;
  estimatedDuration: number;
}

export default function MultiStopSelector({ start, end, waypoints, onOptimize }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [result, setResult] = useState<OptimizeResult | null>(null);
  const [allowMultiSelect, setAllowMultiSelect] = useState(false);

  const handleToggle = (id: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      // 단일 선택 모드에서 이미 1개 선택됨 → 추가 선택 불가
      if (!allowMultiSelect && newSelected.size >= 1) {
        return;
      }
      if (newSelected.size >= 5) {
        alert('경유지는 최대 5개까지 선택 가능합니다.');
        return;
      }
      newSelected.add(id);
    }
    setSelected(newSelected);
    setResult(null); // 선택 변경 시 결과 초기화
  };

  const handleOptimize = async () => {
    if (selected.size < 2) {
      alert('경유지를 2개 이상 선택해주세요.');
      return;
    }

    setIsOptimizing(true);
    try {
      const selectedWaypoints = waypoints.filter((w) => selected.has(w.id));
      const res = await fetch('/api/optimize-route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start,
          end,
          waypoints: selectedWaypoints.map((w) => ({
            id: w.id,
            name: w.name,
            coordinates: w.coordinates,
          })),
        }),
      });

      const data = await res.json();
      if (data.success && data.data) {
        setResult(data.data);
        onOptimize?.(data.data.optimizedOrder);
      } else {
        alert(data.error?.message || '최적화 실패');
      }
    } catch (err) {
      logger.error('Optimize error:', err);
      alert('경로 최적화 중 오류가 발생했습니다.');
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleClear = () => {
    setSelected(new Set());
    setResult(null);
    setAllowMultiSelect(false); // 단일 선택 모드로 복귀
  };

  // 결과 순서에 맞게 정렬된 waypoint 목록
  const orderedWaypoints = result
    ? result.optimizedOrder.map((id) => waypoints.find((w) => w.id === id)).filter(Boolean) as Waypoint[]
    : [];

  return (
    <div className="mb-4 p-4 rounded-2xl" style={{ background: 'var(--bg-surface)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5" style={{ color: 'var(--accent)' }} />
          <h3 className="font-bold text-lg" style={{ color: 'var(--text-strong)' }}>멀티 경유지</h3>
        </div>
        <span className="text-sm px-2 py-1 rounded-lg" style={{ background: 'var(--bg-surface-muted)', color: 'var(--text-muted)' }}>
          {selected.size}/5 선택
        </span>
      </div>

      <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
        여러 곳을 들러야 하나요? 2~5개 선택 후 최적 순서를 찾아드려요 🚗
      </p>

      {/* 단일 선택 안내 (1개 선택 시) */}
      {selected.size === 1 && !allowMultiSelect && (
        <div className="mb-3 p-3 rounded-xl" style={{ background: 'var(--bg-surface-muted)' }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium" style={{ color: 'var(--text-strong)' }}>
              ✓ 선택됨
            </span>
          </div>
          
          <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
            💡 하나만 선택하면 더 효율적인 경로를 얻을 수 있습니다
          </p>
          
          <div className="flex gap-2">
            <button
              onClick={() => onOptimize?.(Array.from(selected))}
              className="flex-1 px-4 py-2.5 rounded-xl text-white font-bold transition-all active:scale-[0.98]"
              style={{ background: 'var(--accent)' }}
            >
              완료
            </button>
            <button
              onClick={() => setAllowMultiSelect(true)}
              className="px-4 py-2.5 rounded-xl font-medium transition-colors"
              style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border-soft)' }}
            >
              다른 경유지 추가하기
            </button>
          </div>
        </div>
      )}

      {/* 다중 선택 모드 안내 */}
      {allowMultiSelect && selected.size >= 1 && (
        <div className="mb-3 p-3 rounded-xl" style={{ background: 'var(--orange-50)', border: '1px solid var(--orange-200)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium" style={{ color: 'var(--orange-900)' }}>
              선택됨 ({selected.size})
            </span>
            <button
              onClick={() => {
                setSelected(new Set());
                setAllowMultiSelect(false);
              }}
              className="text-xs px-3 py-1 rounded-lg"
              style={{ background: 'var(--bg-surface-muted)', color: 'var(--text-muted)' }}
            >
              초기화
            </button>
          </div>
          
          {selected.size >= 2 && (
            <p className="text-xs" style={{ color: 'var(--orange-700)' }}>
              ⚠️ 여러 경유지 선택 시 더 복잡한 경로가 됩니다
            </p>
          )}
        </div>
      )}

      {/* Selection List */}
      <div className="space-y-2 mb-3">
        {waypoints.slice(0, 10).map((wp) => (
          <label
            key={wp.id}
            className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
              selected.has(wp.id) ? 'ring-2' : ''
            }`}
            style={{
              background: selected.has(wp.id) ? 'var(--accent-light)' : 'var(--bg-surface-muted)',
              borderColor: selected.has(wp.id) ? 'var(--accent)' : 'transparent',
            }}
          >
            <input
              type="checkbox"
              checked={selected.has(wp.id)}
              onChange={() => handleToggle(wp.id)}
              disabled={!allowMultiSelect && selected.size >= 1 && !selected.has(wp.id)}
              className="w-5 h-5 rounded accent-blue-600"
            />
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate" style={{ color: 'var(--text-strong)' }}>
                {wp.name}
              </p>
              <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {wp.address}
              </p>
              {wp.detourDistance !== undefined && (
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  +{(wp.detourDistance / 1000).toFixed(1)}km, +{Math.round(wp.detourDuration! / 60)}분
                </p>
              )}
            </div>
          </label>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        {selected.size > 0 && (
          <button
            onClick={handleClear}
            className="px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
            style={{ background: 'var(--bg-surface-muted)', color: 'var(--text-muted)' }}
          >
            선택 초기화
          </button>
        )}
        
        {/* 다중 선택 모드에서만 최적화 버튼 표시 */}
        {allowMultiSelect && (
          <button
            onClick={handleOptimize}
            disabled={selected.size < 2 || isOptimizing}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white font-bold transition-all
                       active:scale-[0.98] disabled:bg-gray-300 disabled:cursor-not-allowed"
            style={{ background: selected.size >= 2 && !isOptimizing ? 'var(--accent)' : undefined }}
          >
            {isOptimizing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                최적화 중...
              </>
            ) : (
              <>
                <MapPin className="w-4 h-4" />
                경로 최적화
              </>
            )}
          </button>
        )}
      </div>

      {/* Optimization Result */}
      {result && orderedWaypoints.length > 0 && (
        <div className="mt-4 p-4 rounded-xl" style={{ background: 'var(--green-50)', border: '2px solid var(--green-200)' }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--green-600)' }}>
              <span className="text-white text-sm font-bold">✓</span>
            </div>
            <div>
              <p className="font-bold" style={{ color: 'var(--green-900)' }}>최적 경로 완성!</p>
              <p className="text-xs" style={{ color: 'var(--green-700)' }}>
                총 +{(result.totalDistance / 1000).toFixed(1)}km, +{Math.round(result.estimatedDuration / 60)}분
              </p>
            </div>
          </div>

          {/* Route Visualization */}
          <div className="space-y-2">
            {/* Start */}
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--accent)' }}>
                <span className="text-white text-xs font-bold">A</span>
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-strong)' }}>출발</p>
            </div>

            {/* Waypoints */}
            {orderedWaypoints.map((wp, idx) => (
              <div key={wp.id}>
                <div className="flex items-center gap-2 ml-3">
                  <ArrowRight className="w-4 h-4 shrink-0" style={{ color: 'var(--green-600)' }} />
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--green-600)' }}>
                    <span className="text-white text-xs font-bold">{idx + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-strong)' }}>
                      {wp.name}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                      {wp.address.split(' ').slice(0, 3).join(' ')}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {/* End */}
            <div className="flex items-center gap-2 ml-3">
              <ArrowRight className="w-4 h-4 shrink-0" style={{ color: 'var(--green-600)' }} />
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--pink-500)' }}>
                <span className="text-white text-xs font-bold">B</span>
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-strong)' }}>도착</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
