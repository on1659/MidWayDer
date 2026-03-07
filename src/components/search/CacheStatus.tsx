/**
 * Cache Status - 캐시 상태 표시 컴포넌트
 *
 * v0.51.0: UI 개선
 * - 온라인 상태에서도 캐시 크기 표시
 * - 오프라인 상태에서 캐시 사용 표시
 */

'use client';

import { useCacheStore } from '@/store/cache-store';
import { WifiOff, Clock, Database } from 'lucide-react';
import { formatDistanceToNow } from '@/lib/utils/date';

export function CacheStatus() {
  const { isFromCache, cacheTimestamp, cacheSize } = useCacheStore();

  // 온라인 + 캐시 없음 → 표시 안 함
  if (!isFromCache && cacheSize === 0) return null;

  const timeAgo = cacheTimestamp
    ? formatDistanceToNow(new Date(cacheTimestamp))
    : '';

  // 오프라인 + 캐시 사용
  if (isFromCache) {
    return (
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm mb-2"
        style={{
          background: 'var(--orange-100)',
          color: 'var(--orange-700)',
          border: '1px solid var(--orange-200)'
        }}
      >
        <WifiOff className="w-4 h-4" />
        <span className="font-medium">오프라인 - 캐시된 결과</span>
        {timeAgo && (
          <>
            <Clock className="w-3.5 h-3.5 ml-1" />
            <span className="text-xs opacity-80">{timeAgo} 전</span>
          </>
        )}
      </div>
    );
  }

  // 온라인 + 캐시 있음
  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs mb-2"
      style={{
        background: 'var(--green-50)',
        color: 'var(--green-600)',
        border: '1px solid var(--green-100)'
      }}
    >
      <Database className="w-3.5 h-3.5" />
      <span>캐시 {cacheSize}개 저장됨</span>
    </div>
  );
}
