/**
 * ComparePanel - 경유지 비교 패널
 * 최대 3개의 경유지를 선택해 비교할 수 있습니다.
 */

'use client';

import { X } from 'lucide-react';
import type { DetourResult } from '@/types/detour';

interface ComparePanelProps {
  waypoints: DetourResult[];
  onClose: () => void;
  onSelect: (waypoint: DetourResult) => void;
}

export default function ComparePanel({ waypoints, onClose, onSelect }: ComparePanelProps) {
  if (waypoints.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center md:justify-center p-4">
      <div
        className="bg-white rounded-t-3xl md:rounded-3xl w-full md:max-w-4xl max-h-[80vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-strong)' }}>
              경유지 비교
            </h2>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {waypoints.length}개 선택됨
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        {/* Comparison Table */}
        <div className="p-5 overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--border-soft)' }}>
                <th className="text-left py-3 px-2 text-sm font-semibold" style={{ color: 'var(--text-strong)' }}>
                  이름
                </th>
                <th className="text-center py-3 px-2 text-sm font-semibold" style={{ color: 'var(--text-strong)' }}>
                  이탈 거리
                </th>
                <th className="text-center py-3 px-2 text-sm font-semibold" style={{ color: 'var(--text-strong)' }}>
                  이탈 시간
                </th>
                <th className="text-center py-3 px-2 text-sm font-semibold" style={{ color: 'var(--text-strong)' }}>
                  종합 점수
                </th>
                <th className="text-center py-3 px-2 text-sm font-semibold" style={{ color: 'var(--text-strong)' }}>
                  선택
                </th>
              </tr>
            </thead>
            <tbody>
              {waypoints.map((wp, index) => {
                const detourKm = (wp.detourCost.distance / 1000).toFixed(1);
                const detourMin = Math.round(wp.detourCost.duration / 60);
                const score = wp.finalScore.toFixed(1);

                return (
                  <tr
                    key={wp.place.id}
                    className="border-b hover:bg-gray-50 transition-colors"
                    style={{ borderColor: 'var(--border-soft)' }}
                  >
                    {/* Name */}
                    <td className="py-4 px-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                          style={{
                            background: index === 0 ? 'var(--accent)' : 'var(--blue-150)',
                            color: index === 0 ? 'white' : 'var(--accent)',
                          }}
                        >
                          {index + 1}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                            {wp.place.name}
                          </p>
                          <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                            {wp.place.roadAddress || wp.place.address}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Distance */}
                    <td className="py-4 px-2 text-center">
                      <span
                        className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold"
                        style={{ background: 'var(--accent-weak)', color: 'var(--accent)' }}
                      >
                        +{detourKm}km
                      </span>
                    </td>

                    {/* Duration */}
                    <td className="py-4 px-2 text-center">
                      <span
                        className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold"
                        style={{ background: 'var(--yellow-100)', color: 'var(--yellow-600)' }}
                      >
                        +{detourMin}분
                      </span>
                    </td>

                    {/* Score */}
                    <td className="py-4 px-2 text-center">
                      <span className="text-lg font-bold" style={{ color: 'var(--text-strong)' }}>
                        {score}
                      </span>
                    </td>

                    {/* Select Button */}
                    <td className="py-4 px-2 text-center">
                      <button
                        onClick={() => {
                          onSelect(wp);
                          onClose();
                        }}
                        className="px-4 py-2 rounded-full text-sm font-semibold transition-all active:scale-95"
                        style={{ background: 'var(--accent)', color: 'white' }}
                      >
                        선택
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-100 px-5 py-4">
          <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
            💡 최대 3개까지 선택할 수 있어요
          </p>
        </div>
      </div>
    </div>
  );
}
