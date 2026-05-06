export type MobileCategoryRailProps = {
  categories: string[];
  selectedCategory: string;
  disabled?: boolean;
  onSelect: (category: string) => void;
};

const CATEGORY_META: Record<string, string> = {
  카페: '커피',
  편의점: '24시',
  다이소: '생활',
  올리브영: '뷰티',
  스타벅스: '카페',
};

export default function MobileCategoryRail({ categories, selectedCategory, disabled, onSelect }: MobileCategoryRailProps) {
  return (
    <div
      data-testid="mobile-category-rail"
      className="absolute inset-x-0 z-[990] hidden overflow-x-auto px-4 pb-2 max-md:block scrollbar-hide"
      style={{
        top: 'calc(max(0.75rem, env(safe-area-inset-top)) + 4.75rem)',
        scrollSnapType: 'x mandatory',
      }}
      aria-label="들를 곳 카테고리"
    >
      <div className="flex w-max gap-2 pr-4">
        {categories.map((item) => {
          const active = item === selectedCategory;
          return (
            <button
              key={item}
              type="button"
              aria-pressed={active}
              disabled={disabled}
              onClick={() => onSelect(item)}
              className="min-h-11 rounded-full px-4 text-sm font-extrabold transition active:scale-[0.97] disabled:opacity-60"
              style={{
                scrollSnapAlign: 'start',
                background: active
                  ? 'linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 55%, #8b5cf6))'
                  : 'color-mix(in srgb, var(--bg-surface) 76%, transparent)',
                color: active ? 'var(--text-on-accent)' : 'var(--text-secondary)',
                border: active ? '1px solid var(--accent)' : '1px solid color-mix(in srgb, var(--border-soft) 72%, transparent)',
                boxShadow: active ? '0 12px 28px -16px rgba(var(--color-accent-rgb), 0.75)' : '0 8px 22px -18px rgba(0,0,0,0.5)',
                backdropFilter: 'blur(18px) saturate(160%)',
                WebkitBackdropFilter: 'blur(18px) saturate(160%)',
              }}
            >
              <span className="mr-2 text-[11px] font-bold opacity-70">{CATEGORY_META[item] || '추천'}</span>
              {item}
            </button>
          );
        })}
      </div>
    </div>
  );
}
