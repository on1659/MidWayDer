/**
 * Cache Status - 캐시 상태 표시 컴포넌트
 */

'use client';

import { useCacheStore } from '@/store/cache-store';
import { WifiOff, Clock } from 'lucide-react';
import { formatDistanceToNow } from '@/lib/utils/date';

export function CacheStatus() {
  const { isFromCache, cacheTimestamp } = useCacheStore();

  if (!isFromCache) return null;

  const timeAgo = cacheTimestamp
    ? formatDistanceToNow(new Date(cacheTimestamp))
    : '';

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
      style={{ background: 'var(--bg-surface-muted)', color: 'var(--text-secondary)' }}
    >
      <WifiOff className="w-4 h-4" />
      <span>캐시된 결과</span>
      {timeAgo && (
        <>
          <Clock className="w-4 h-4 ml-2" />
          <span>{timeAgo} 전</span>
        </>
      )}
    </div>
  );
}
