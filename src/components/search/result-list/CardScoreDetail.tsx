/**
 * CardScoreDetail - 점수 분해 패널
 * 이탈비용 점수, 근접도 점수, 최종 점수 시각화
 */

'use client';

import React from 'react';

interface CardScoreDetailProps {
  finalScore: number;
  detourCostScore: number;
  proximityScore: number;
  detourKm: string;
  detourMin: number;
}

export const CardScoreDetail = React.memo(function CardScoreDetail({
  finalScore,
  detourCostScore,
  proximityScore,
  detourKm,
  detourMin,
}: CardScoreDetailProps) {
  const detourScore = Math.max(0, Math.round(100 - detourCostScore));
  const proxScore = Math.round(proximityScore);
  const finalScoreRounded = Math.round(finalScore);

  return (
    <div
      className="mt-2.5 p-3 rounded-xl space-y-2.5"
      style={{ background: 'var(--bg-muted, #f3f4f6)', border: '1px solid var(--border-soft)' }}
    >
      <p className="text-[11px] font-bold" style={{ color: 'var(--text-secondary)' }}>
        📊 추천 점수 분석 (이탈비용 70% + 근접도 30%)
      </p>

      {/* 최종 점수 */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <span className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>최종 점수</span>
          <span className="text-[11px] font-bold" style={{ color: 'var(--accent)' }}>{finalScoreRounded}점</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-soft)' }}>
          <div className="h-full rounded-full" style={{ width: `${finalScoreRounded}%`, background: 'var(--accent)' }} />
        </div>
      </div>

      {/* 이탈 비용 */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
            🚗 이탈 비용 <span style={{ color: 'var(--text-muted)' }}>(70%)</span>
          </span>
          <span className="text-[11px] font-semibold" style={{ color: '#16a34a' }}>{detourScore}점</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-soft)' }}>
          <div className="h-full rounded-full" style={{ width: `${detourScore}%`, background: '#22c55e' }} />
        </div>
        <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
          +{detourKm}km · +{detourMin}분 추가 이탈
        </p>
      </div>

      {/* 경로 근접도 */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
            📍 경로 근접도 <span style={{ color: 'var(--text-muted)' }}>(30%)</span>
          </span>
          <span className="text-[11px] font-semibold" style={{ color: '#7c3aed' }}>{proxScore}점</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-soft)' }}>
          <div className="h-full rounded-full" style={{ width: `${proxScore}%`, background: '#a855f7' }} />
        </div>
      </div>
    </div>
  );
});
