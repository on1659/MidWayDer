import { getCategoryIcon } from '@/lib/category-icons';
import { MOBILE_HOME_LAYOUT } from './mobileHomeLayout';

export type MobileCategoryRailProps = {
  categories: string[];
  selectedCategory: string;
  disabled?: boolean;
  onSelect: (category: string) => void;
};

export default function MobileCategoryRail({ categories, selectedCategory, disabled, onSelect }: MobileCategoryRailProps) {
  return (
    <div
      data-testid="mobile-category-rail"
      className="absolute inset-x-0 z-[990] hidden overflow-x-auto px-4 pb-1 max-md:block scrollbar-hide"
      style={{
        top: `calc(${MOBILE_HOME_LAYOUT.topInset} + ${MOBILE_HOME_LAYOUT.categoryRailTopOffset})`,
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
              className="flex h-9 max-w-[9rem] items-center gap-1.5 overflow-hidden whitespace-nowrap rounded-full px-3.5 text-[13px] font-extrabold leading-none transition active:scale-[0.97] disabled:opacity-60"
              style={{
                scrollSnapAlign: 'start',
                background: active
                  ? 'linear-gradient(135deg, #3b82f6, #5b5cf6)'
                  : 'rgba(255,255,255,0.94)',
                color: active ? '#ffffff' : '#0f172a',
                border: active ? '1px solid #2563eb' : '1px solid rgba(15,23,42,0.14)',
                boxShadow: active ? '0 12px 28px -16px rgba(37,99,235,0.75)' : '0 10px 24px -18px rgba(15,23,42,0.45)',
                backdropFilter: 'blur(18px) saturate(160%)',
                WebkitBackdropFilter: 'blur(18px) saturate(160%)',
              }}
            >
              <span
                data-testid="mobile-category-chip-icon"
                aria-hidden="true"
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[12px]"
                style={{
                  background: active ? 'rgba(255,255,255,0.18)' : 'rgba(15,23,42,0.06)',
                }}
              >
                {getCategoryIcon(item)}
              </span>
              <span className="min-w-0 truncate">{item}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
