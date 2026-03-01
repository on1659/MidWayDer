'use client';

import { getTimeBasedCategoryHints, getTimeGreeting } from '@/lib/smart-category';

interface EmptyStateProps {
  hasSearched: boolean;
  isLoading: boolean;
  currentCategory: string;
  statsCategories: string[];
  onExpandRadius?: () => void;
  onRetry?: () => void;
  onCategoryChange?: (category: string) => void;
}

export function EmptyState({
  hasSearched,
  currentCategory,
  statsCategories,
  onExpandRadius,
  onRetry,
  onCategoryChange,
}: EmptyStateProps) {
  if (!hasSearched) {
    const timeHints = getTimeBasedCategoryHints();
    const greeting = getTimeGreeting();

    return (
      <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
        <div className="text-5xl mb-3 animate-bounce">🗺️</div>
        <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
          가는 길에 들를 곳을 찾아드려요
        </h3>
        <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
          출발지와 도착지를 입력하고<br />
          원하는 카테고리를 선택해주세요
        </p>

        {timeHints.length > 0 && onCategoryChange && (
          <div className="w-full mb-4">
            <p className="text-xs font-semibold mb-2.5" style={{ color: 'var(--text-secondary)' }}>
              {greeting} 지금 이 시간엔 어때요?
            </p>
            <div className="flex gap-2 justify-center">
              {timeHints.map((hint) => (
                <button
                  key={hint.category}
                  onClick={() => onCategoryChange(hint.category)}
                  className="flex flex-col items-center gap-1 px-4 py-3 rounded-2xl transition-all active:scale-95 flex-1 max-w-[140px]"
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1.5px solid var(--border-soft)',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                  }}
                >
                  <span className="text-2xl">{hint.emoji}</span>
                  <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                    {hint.label}
                  </span>
                  <span className="text-[11px] leading-tight" style={{ color: 'var(--text-muted)' }}>
                    {hint.reason}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 justify-center">
          <span className="px-3 py-1 rounded-full text-xs" style={{ background: 'var(--blue-100)', color: 'var(--blue-600)' }}>
            🔍 스마트 검색
          </span>
          <span className="px-3 py-1 rounded-full text-xs" style={{ background: 'var(--green-100)', color: 'var(--green-600)' }}>
            ⚡ 빠른 경로
          </span>
          <span className="px-3 py-1 rounded-full text-xs" style={{ background: 'var(--purple-100)', color: 'var(--purple-600)' }}>
            📍 정확한 위치
          </span>
        </div>
      </div>
    );
  }

  const fallbackCategories = [
    '다이소', '스타벅스', '이디야', 'CU', 'GS25', '세븐일레븐',
    '맥도날드', '버거킹', '주유소', '휴게소', '은행', '우체국'
  ].filter(cat => cat !== currentCategory).slice(0, 6);
  const alternativeCategories = statsCategories.length > 0 ? statsCategories : fallbackCategories;

  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="text-6xl mb-4">😢</div>
      <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
        이 경로에는 {currentCategory}가 없어요
      </h3>
      <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
        검색 범위를 넓히거나<br />
        다른 카테고리를 선택해보세요
      </p>

      {onCategoryChange && alternativeCategories.length > 0 && (
        <>
          <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
            {statsCategories.length > 0 ? '🔥 이 경로에서 인기 있는 카테고리' : '대신 이런 카테고리는 어때요?'}
          </p>
          <div className="flex flex-wrap gap-2 justify-center mb-6">
            {alternativeCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => onCategoryChange(cat)}
                className="px-4 py-2 rounded-full text-sm font-medium transition-all active:scale-95"
                style={{
                  background: 'var(--blue-100)',
                  color: 'var(--blue-600)',
                  border: '1px solid var(--blue-300)',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </>
      )}

      {onExpandRadius && (
        <button
          onClick={onExpandRadius}
          className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-bold transition-all active:scale-95 mb-3"
          style={{
            background: 'linear-gradient(135deg, var(--blue-50), var(--accent-weak))',
            color: 'var(--blue-700)',
            border: '1.5px solid var(--blue-200)',
          }}
        >
          <span>🔍</span>
          반경 2km로 확장해서 재검색
        </button>
      )}

      {onRetry && (
        <button
          onClick={onRetry}
          className="px-6 py-2.5 rounded-full text-sm font-semibold transition-all active:scale-95"
          style={{ background: 'var(--accent)', color: 'var(--bg-surface)' }}
        >
          다시 검색
        </button>
      )}
    </div>
  );
}
