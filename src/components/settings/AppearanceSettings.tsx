'use client';

import { Palette, Sun, Moon, Clock, Check } from 'lucide-react';
import { useTheme, COLOR_THEMES, getColorThemeLabel, type ColorTheme } from '@/app/hooks/useTheme';

const SWATCH_HEX: Record<ColorTheme, string> = {
  blue:    '#3274f9',
  indigo:  '#6366f1',
  violet:  '#8b5cf6',
  teal:    '#06b6d4',
  emerald: '#10b981',
  rose:    '#f43f5e',
  slate:   '#64748b',
};

export function AppearanceSettings() {
  const { theme, autoTheme, colorTheme, toggleTheme, toggleAutoTheme, setColorTheme } = useTheme();

  return (
    <section
      className="rounded-2xl p-5 shadow-sm"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-soft)',
      }}
    >
      <header className="flex items-center gap-2 mb-4">
        <Palette className="w-5 h-5" style={{ color: 'var(--accent)' }} />
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          화면 테마
        </h2>
      </header>

      {/* 라이트 / 다크 / 자동 */}
      <div className="space-y-3 mb-6">
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          밝기
        </p>
        <div className="grid grid-cols-3 gap-2">
          <ModeButton
            active={!autoTheme && theme === 'light'}
            onClick={() => {
              if (autoTheme) toggleAutoTheme();
              if (theme !== 'light') toggleTheme();
            }}
            icon={<Sun className="w-4 h-4" />}
            label="라이트"
          />
          <ModeButton
            active={!autoTheme && theme === 'dark'}
            onClick={() => {
              if (autoTheme) toggleAutoTheme();
              if (theme !== 'dark') toggleTheme();
            }}
            icon={<Moon className="w-4 h-4" />}
            label="다크"
          />
          <ModeButton
            active={autoTheme}
            onClick={() => {
              if (!autoTheme) toggleAutoTheme();
            }}
            icon={<Clock className="w-4 h-4" />}
            label="시간대별"
          />
        </div>
        {autoTheme && (
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            오후 6시 ~ 오전 6시 자동으로 다크 모드로 전환됩니다.
          </p>
        )}
      </div>

      {/* 색상 테마 스와치 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            색상 테마
          </p>
          <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
            {getColorThemeLabel(colorTheme)}
          </span>
        </div>
        <div className="flex flex-wrap gap-3">
          {COLOR_THEMES.map((t) => {
            const isActive = colorTheme === t;
            return (
              <button
                key={t}
                onClick={() => setColorTheme(t)}
                className="relative rounded-full flex items-center justify-center transition-transform"
                aria-label={getColorThemeLabel(t)}
                aria-pressed={isActive}
                style={{
                  width: 40,
                  height: 40,
                  background: SWATCH_HEX[t],
                  border: isActive
                    ? '3px solid var(--text-primary)'
                    : '3px solid transparent',
                  boxShadow: isActive
                    ? `0 4px 12px ${SWATCH_HEX[t]}55`
                    : '0 1px 3px rgba(0,0,0,0.1)',
                  transform: isActive ? 'scale(1.1)' : 'scale(1)',
                  cursor: 'pointer',
                }}
              >
                {isActive && <Check className="w-4 h-4" style={{ color: '#fff' }} />}
              </button>
            );
          })}
        </div>

        {/* 미리보기: 현재 accent로 렌더되는 샘플 */}
        <div
          className="mt-4 rounded-xl p-4 flex items-center gap-3"
          style={{
            background: 'var(--accent-weak)',
            border: '1px solid var(--border-accent)',
          }}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
            style={{ background: 'var(--accent)' }}
          >
            1
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--accent)' }}>
              다이소 강남점
            </p>
            <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
              +2분 · +0.8km · 미리보기
            </p>
          </div>
          <button
            className="text-xs font-semibold px-3 py-1.5 rounded-lg"
            style={{
              background: 'var(--accent)',
              color: 'var(--text-on-accent)',
            }}
          >
            출발
          </button>
        </div>
      </div>
    </section>
  );
}

interface ModeButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function ModeButton({ active, onClick, icon, label }: ModeButtonProps) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className="flex flex-col items-center gap-1.5 py-3 rounded-xl transition-colors"
      style={{
        background: active ? 'var(--accent-weak)' : 'var(--bg-surface-muted)',
        border: `1px solid ${active ? 'var(--border-accent)' : 'var(--border-soft)'}`,
        color: active ? 'var(--accent)' : 'var(--text-secondary)',
        fontWeight: active ? 600 : 500,
      }}
    >
      {icon}
      <span className="text-xs">{label}</span>
    </button>
  );
}
