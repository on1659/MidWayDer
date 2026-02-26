/**
 * SearchStatus - 캐시 상태 표시
 */

import { Zap } from 'lucide-react';

interface SearchStatusProps {
  isCached: boolean;
}

export default function SearchStatus({ isCached }: SearchStatusProps) {
  if (!isCached) return null;

  return (
    <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg" style={{
      backgroundColor: 'var(--surface-secondary)',
      color: 'var(--text-accent)',
    }}>
      <Zap className="w-3.5 h-3.5" strokeWidth={2.5} />
      <span className="font-medium">⚡ 캐시된 결과 (즉시 표시)</span>
    </div>
  );
}
