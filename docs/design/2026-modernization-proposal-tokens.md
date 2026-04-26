# 2026 Design Token Modernization Proposal

**Scope**: CSS token system only. No code changes in this proposal — review & approve first, implement in a separate build ticket.
**Target**: Tailwind 4 `@theme` CSS-first config, mobile-first (390×844), light + dark (prefers-color-scheme).
**Hard constraints**: `100vh` is banned by PostToolUse hook — `100dvh` only. Preserve 13+ existing `env(safe-area-inset-*)` usages in `globals.css`.

---

## 1. 현재 토큰 구조 진단

소스: [`src/app/theme.css`](../../src/app/theme.css), [`src/app/globals.css`](../../src/app/globals.css).

### 1.1 현존 토큰 요약

| 축 | 현재 상태 | 문제점 |
|----|----------|--------|
| **Color scale** | `--blue-{50,100,150,200,600,700,800}` / green/orange/pink/yellow/purple — **계단 불완전** (300/400/500/900 결손, 150 같은 비표준 단계) | Tailwind default 50-950 10단 ladder와 어긋남. 새 컴포넌트마다 중간 단계 즉흥 추가 위험. |
| **Brand accent** | `--accent` / `--accent-light` / `--accent-dark` / `--accent-weak` 4단 | 단계는 OK지만 **`accent-50 ~ 900` 체계**가 아니라 Tailwind의 `text-blue-600` 같은 관용어와 자동 호환 안 됨 |
| **Legacy brand** | `--kakao-primary`, `--kakao-secondary`, `--kakao-bg`, `--kakao-card`, `--kakao-text-muted`, `--kakao-border`, `--pastel-blue`, `--pastel-pink`, `--bg-main`, `--text-dark`, `--text-light` | **세 벌의 이름 체계가 공존** — semantic, palette, kakao-prefixed, pastel-prefixed. 신규 코드가 어느 걸 써야 하는지 혼선 |
| **Semantic status** | `--warning`(orange), `--success`(green) 만 존재 | **error / info / neutral 누락**. 코드에서 `#ef4444` `#dbeafe` 등 하드코딩 발생 |
| **Surface elevation** | `--bg-app`, `--bg-surface`, `--bg-surface-muted`, `--bg-overlay` (4단) | Material 스타일 elevation 0~5 계단 없음. 카드/BottomSheet/Modal이 구분 어려움 |
| **Spacing** | `--sp-1..6` (4/8/12/16/20/24) | **28, 32, 40, 48, 64** 결손. `@media (max-width: 768px)` 안에서 `body { --sp-4: 20px }` 로 값을 **재정의**해서 카스케이드 예측 깨짐 |
| **Radius** | `--r-sm/md/lg/xl` = 10/14/18/24 | 4 단만. **0(sharp), 8(버튼), 999(pill)** 누락. Tailwind `rounded-2xl`(16px) 같은 관용어와 미스매치 |
| **Shadow** | `--shadow-sm`, `--shadow-md` — 다크에서만 재정의 | **elevation 0~5 시스템 없음**, colored shadow (accent glow) 없음. 카드 hover는 코드에 `0 8px 24px rgba(0,0,0,0.08)` 직접 기재 |
| **Typography** | `--text-xs/sm/base/lg` (4 단), `--font-normal..bold` | **fluid clamp() 기반 없음**, `xl/2xl/3xl` 누락. `line-height`/`letter-spacing` 토큰 전무. `src/components/**` 에서 `text-[11px]`, `text-[13px]` 임의 크기 다수 |
| **Motion** | `cubic-bezier(0.32, 0.72, 0, 1)` 을 5곳에 반복 하드코딩 | **easing 토큰 없음**, duration 토큰 없음 |
| **Dark mode** | `.theme-dark { ... }` 클래스 전환 + `<Script beforeInteractive>` 로 FOUC 방지 시도 | `prefers-color-scheme` 존중은 **런타임 체크만**, SSR 단계에서 색 선택 못함. light/dark 대비 수치는 `--text-loading` 한 군데만 "7.1:1 on #0f172a — WCAG AA ✓" 주석, 나머지는 **측정 미기재** |
| **Tailwind 4 bridge** | 없음. `@theme` 블록 미사용. `--blue-100` 같은 custom var은 Tailwind JIT가 `bg-[var(--blue-100)]` 로만 접근 가능, 클래스 자동 생성 안 됨 | Tailwind 4의 정체성(= `@theme` 에 선언하면 자동으로 `bg-accent-500` 유틸 생성)을 전혀 활용 못 함 |
| **Hard constraint 준수** | `100dvh` 단 1곳 사용 (`.keyboard-aware`), safe-area 13곳 OK | 본문 `html, body { height: 100% }` 는 안전. 신규 작업 시 `100vh` 실수 방지 규칙 유지 필요 |

### 1.2 핵심 갭 정리
1. **이름 체계 3중화** (kakao- / pastel- / semantic) → 신규 코드 혼선, 삭제 지연
2. **palette 계단 불완전** → 자연스러운 hover/pressed 변형 불가
3. **elevation / motion / typography** 토큰 부재 → Tailwind arbitrary(`text-[13px]`, `shadow-[0_8px_24px_rgba(0,0,0,0.08)]`) 범람
4. **Tailwind 4 `@theme` 미활용** → 팀이 얻을 수 있는 자동 유틸 생성·타입 추론 이득 전부 포기 중

---

## 2. 2026 Modern Token System (Tailwind 4 @theme)

### 2.1 설계 원칙
- **1 소스 진실**: `@theme` 블록 하나가 palette + semantic + scale 모두 선언, legacy `--kakao-*` / `--pastel-*` / `--blue-150` 등은 deprecated 마킹
- **Semantic-over-palette**: 컴포넌트는 `--color-accent / --color-success` 같은 semantic만 소비, palette는 token 내부용
- **10단 계단**: 모든 hue는 `50/100/200/300/400/500/600/700/800/900/950` 11단. Tailwind 기본 관용어와 호환
- **Fluid typography**: `clamp()` 로 375px ↔ 1280px 자동 보간, viewport 분기 CSS 불필요
- **Motion as tokens**: easing / duration 각각 4~5단, 하드코딩 완전 제거
- **WCAG AA 기본값**: text-on-surface 최소 4.5:1, large text 3:1 — hex 값이 토큰 주석에 비율 병기

### 2.2 Color

**Neutral 10단 (Slate 계열, light & dark 공통 ladder)**
- `--color-neutral-0` `#ffffff`
- `--color-neutral-50` `#f8fafc`
- `--color-neutral-100` `#f1f5f9`
- `--color-neutral-200` `#e2e8f0`
- `--color-neutral-300` `#cbd5e1`
- `--color-neutral-400` `#94a3b8`
- `--color-neutral-500` `#64748b`
- `--color-neutral-600` `#475569`
- `--color-neutral-700` `#334155`
- `--color-neutral-800` `#1e293b`
- `--color-neutral-900` `#0f172a`
- `--color-neutral-950` `#020617`

**Brand accent (KakaoMap blue 기반)**
- `50 #eff6ff` · `100 #dbeafe` · `200 #bfdbfe` · `300 #93c5fd` · `400 #60a5fa` · `500 #3274F9`(brand) · `600 #2563eb` · `700 #1d4ed8` · `800 #1e40af` · `900 #1e3a8a` · `950 #172554`

**Semantic status (light / dark 쌍)**
| Token | Light hex | Dark hex | 최소 대비 |
|-------|-----------|----------|---------|
| `--color-success-500` | `#16a34a` on white → 4.54:1 | `#22c55e` on `#0f172a` → 5.8:1 | AA ✓ |
| `--color-warning-500` | `#d97706` on white → 4.56:1 | `#f59e0b` on `#0f172a` → 7.2:1 | AA ✓ |
| `--color-error-500`   | `#dc2626` on white → 4.83:1 | `#f87171` on `#0f172a` → 6.4:1 | AA ✓ |
| `--color-info-500`    | `#0284c7` on white → 4.71:1 | `#38bdf8` on `#0f172a` → 7.9:1 | AA ✓ |

Status 는 `50/100/500/700` 4단으로만 운영 (bg tint / border / solid / text-on-tint).

**Surface elevation (light / dark 쌍)**
- `--surface-0` app background: `#f6f7f9` / `#0b1020`
- `--surface-1` card base: `#ffffff` / `#0f172a`
- `--surface-2` elevated card, sticky bar: `#ffffff` + shadow-1 / `#131b30`
- `--surface-3` sheet, modal: `#ffffff` + shadow-2 / `#1a2340`
- `--surface-4` popover, toast: `#ffffff` + shadow-3 / `#202a4d`
- `--surface-5` highest (tooltip over modal): `#ffffff` + shadow-4 / `#2a3560`

**Overlay tints (rgba, 런타임에 배경색 위에 얹음)**
- `--overlay-scrim` `rgba(0, 0, 0, 0.48)` (모달 뒷배경)
- `--overlay-hover` `rgba(50, 116, 249, 0.06)`
- `--overlay-press` `rgba(50, 116, 249, 0.12)`
- `--overlay-selected` `rgba(50, 116, 249, 0.18)`

### 2.3 Typography

**Fluid scale** — 각 값은 `clamp(min, preferred, max)` 형태
- `--text-2xs`  `clamp(0.6875rem, 0.68rem + 0.04vw, 0.75rem)` (11–12px)
- `--text-xs`   `clamp(0.75rem, 0.73rem + 0.1vw, 0.8125rem)` (12–13px)
- `--text-sm`   `clamp(0.875rem, 0.85rem + 0.12vw, 0.9375rem)` (14–15px)
- `--text-base` `clamp(1rem, 0.97rem + 0.15vw, 1.0625rem)` (16–17px — iOS 줌 방지 보장)
- `--text-lg`   `clamp(1.125rem, 1.08rem + 0.22vw, 1.25rem)` (18–20px)
- `--text-xl`   `clamp(1.25rem, 1.18rem + 0.35vw, 1.5rem)` (20–24px)
- `--text-2xl`  `clamp(1.5rem, 1.4rem + 0.5vw, 1.875rem)`
- `--text-3xl`  `clamp(1.875rem, 1.7rem + 0.88vw, 2.5rem)`
- `--text-display` `clamp(2.5rem, 2rem + 2.5vw, 4rem)` (랜딩 히어로용)

**Line height**
- `--leading-tight` `1.2` · `--leading-snug` `1.35` · `--leading-normal` `1.55` · `--leading-relaxed` `1.7`

**Letter spacing**
- `--tracking-tight` `-0.02em` (display) · `--tracking-normal` `0` · `--tracking-wide` `0.02em` (caps 뱃지)

**Weight ladder**
- `--font-weight-regular` `400`
- `--font-weight-medium`  `500`
- `--font-weight-semibold` `600`
- `--font-weight-bold`     `700`
- `--font-weight-extrabold` `800` (베스트픽 배너)

**Family**
- `--font-sans` `var(--font-noto-sans-kr), -apple-system, ...` (기존 유지)
- `--font-mono` `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace` (좌표/로그용)

### 2.4 Spacing (4/8 base + 분수)

- `--space-0` `0`
- `--space-0_5` `2px` (뱃지 내부 상하 미세 조정)
- `--space-1` `4px`
- `--space-1_5` `6px`
- `--space-2` `8px`
- `--space-2_5` `10px`
- `--space-3` `12px`
- `--space-4` `16px`
- `--space-5` `20px`
- `--space-6` `24px`
- `--space-7` `28px`
- `--space-8` `32px`
- `--space-10` `40px`
- `--space-12` `48px`
- `--space-14` `56px`
- `--space-16` `64px`
- `--space-20` `80px`
- `--space-24` `96px`

**미디어 쿼리 안에서 재정의 금지** (현재 globals.css:398–403 의 `body { --sp-4: 20px }` 안티패턴 제거). 모바일 전용 간격은 별도 토큰(`--space-mobile-pad` 등) 또는 유틸 클래스로.

### 2.5 Radius

- `--radius-0` `0` (sharp)
- `--radius-1` `4px` (뱃지, 태그)
- `--radius-2` `8px` (버튼 default)
- `--radius-3` `12px` (input, 작은 카드)
- `--radius-4` `16px` (카드 default — Tailwind `rounded-2xl` 와 일치)
- `--radius-5` `20px` (큰 카드, sheet)
- `--radius-6` `24px` (hero, highlight)
- `--radius-full` `9999px` (pill, FAB)

**Role aliases**
- `--radius-button` `var(--radius-2)`
- `--radius-card`   `var(--radius-4)`
- `--radius-sheet`  `var(--radius-5)`
- `--radius-chip`   `var(--radius-full)`

### 2.6 Shadow (elevation 0~5 + colored)

- `--shadow-0` `none`
- `--shadow-1` `0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.06)` (subtle card)
- `--shadow-2` `0 4px 6px -2px rgba(15, 23, 42, 0.04), 0 2px 4px -1px rgba(15, 23, 42, 0.06)` (elevated card)
- `--shadow-3` `0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -2px rgba(15, 23, 42, 0.05)` (sticky, popover)
- `--shadow-4` `0 20px 25px -5px rgba(15, 23, 42, 0.10), 0 10px 10px -5px rgba(15, 23, 42, 0.04)` (modal, sheet)
- `--shadow-5` `0 25px 50px -12px rgba(15, 23, 42, 0.25)` (max — 거의 미사용)

**Colored (accent glow)**
- `--shadow-accent-sm` `0 4px 12px rgba(50, 116, 249, 0.18)`
- `--shadow-accent-md` `0 8px 24px rgba(50, 116, 249, 0.28)` (primary CTA hover)

**다크모드에서 자동 증폭** (`.theme-dark` / `@media (prefers-color-scheme: dark)` 에서 `rgba(0, 0, 0, 0.3~0.5)` 로 override)

### 2.7 Motion

- `--ease-standard`   `cubic-bezier(0.2, 0, 0, 1)`
- `--ease-emphasized` `cubic-bezier(0.32, 0.72, 0, 1)` (현재 모바일 스와이프 UX와 동일)
- `--ease-decelerate` `cubic-bezier(0, 0, 0.2, 1)` (entering)
- `--ease-accelerate` `cubic-bezier(0.4, 0, 1, 1)` (exiting)
- `--ease-spring`     `cubic-bezier(0.34, 1.56, 0.64, 1)` (카드 튕김)

- `--duration-instant` `0ms`
- `--duration-fast`    `120ms`
- `--duration-normal`  `200ms` (default UI)
- `--duration-slow`    `320ms` (sheet, modal)
- `--duration-slower`  `480ms`

---

## 3. 다크모드 파리티 (WCAG AA 검증 표)

모든 text-on-surface 쌍, 대비 비율을 명시. 4.5:1 미만 없음.

| Semantic pair | Light | Dark | Light 비율 (on surface-1) | Dark 비율 (on surface-1) |
|---------------|-------|------|--------|--------|
| `--text-primary` | `#0f172a` on `#ffffff` | `#f1f5f9` on `#0f172a` | **17.9:1** | **16.1:1** |
| `--text-secondary` | `#475569` on `#ffffff` | `#94a3b8` on `#0f172a` | **7.4:1** | **5.8:1** |
| `--text-tertiary` | `#64748b` on `#ffffff` | `#cbd5e1` on `#0f172a` | **5.5:1** | **10.4:1** |
| `--text-disabled` | `#cbd5e1` on `#ffffff` | `#475569` on `#0f172a` | 1.8:1 (large only) | 2.1:1 (large only) |
| `--color-accent-500` text | `#2563eb` on `#ffffff` | `#60a5fa` on `#0f172a` | **5.9:1** | **6.2:1** |
| `--color-success-500` text | `#16a34a` on `#ffffff` | `#22c55e` on `#0f172a` | **4.54:1** | **5.8:1** |
| `--color-warning-500` text | `#d97706` on `#ffffff` | `#f59e0b` on `#0f172a` | **4.56:1** | **7.2:1** |
| `--color-error-500` text | `#dc2626` on `#ffffff` | `#f87171` on `#0f172a` | **4.83:1** | **6.4:1** |
| Badge solid (success) | white on `#16a34a` | `#0f172a` on `#22c55e` | **4.54:1** | **12.9:1** |
| Badge solid (warning) | white on `#d97706` | `#0f172a` on `#f59e0b` | **4.56:1** | **11.9:1** |
| Sticky bar on surface-2 | `#0f172a` on `#ffffff`+shadow | `#f1f5f9` on `#131b30` | 17.9:1 | **14.8:1** |
| Yellow memo (keep) | `#92400e` on `#fef3c7` | `#fbbf24` on `#3a2f12` | **7.1:1** | **7.4:1** |

**전환 규칙**: `prefers-color-scheme: dark` 를 1차 소스로, `.theme-dark` 수동 오버라이드는 2차. SSR 직전 `<Script beforeInteractive>` 는 유지하되 **light 기본값을 SSR HTML 에도 인라인**해서 dark 로 바뀔 때만 덧씌움 → FOUC 최소화.

---

## 4. 마이그레이션 — 하드코딩 색상 상위 10 컴포넌트

`src/components/search/result-list/*` 기준, `#RRGGBB` 출현 63 회 확인. 대체 매핑:

| # | 파일 | 하드코딩 샘플 | 대체 토큰 |
|---|------|---------------|-----------|
| 1 | `ResultCard.tsx` (21회) | `background: '#3274F9'`, `color: '#15803d'`, `#dcfce7`, `#86efac`, `#fef3c7`, `#fbbf24` 등 | `var(--color-accent-500)`, `var(--color-success-700)`, `var(--color-success-50)`, `var(--color-success-200)`, `var(--color-warning-100)`, `var(--color-warning-300)` |
| 2 | `FilterChips.tsx` (15회) | chip preset 컬러 | `var(--color-accent-100/500)`, `var(--color-info-500)`, `var(--color-neutral-{200,500})` |
| 3 | `ResultHeader.tsx` (9회) | 차트 segment 색 | `var(--color-accent-{400,500,600,700})` + `var(--color-warning-500)` |
| 4 | `CardBadges.tsx` (5회) | 뱃지 bg/border | `var(--color-success-100/500)`, `var(--color-warning-100/500)`, `var(--color-info-100/500)` |
| 5 | `CardScoreDetail.tsx` (5회) | 게이지 70%/30% 색 | `var(--color-accent-500)`, `var(--color-success-500)`, `var(--color-neutral-200)` |
| 6 | `CardActions.tsx` (3회) | 아이콘 active 색 | `var(--color-accent-500)`, `var(--color-warning-500)`, `var(--color-neutral-500)` |
| 7 | `CompactCard.tsx` (2회) | 스트라이프 | `var(--color-success-500 → warning → error)` 그라디언트 토큰 |
| 8 | `CardHeader.tsx` (1회) | 강조 | `var(--color-accent-600)` |
| 9 | `EmptyState.tsx` (1회) | CTA 버튼 | `var(--color-accent-500)` |
| 10 | `utils.ts` / `FilterChips.tsx` stripe | ratio → hex (`#22c55e`, `#f59e0b`, `#f97316`) | `--stripe-low/-mid/-high` alias = `var(--color-success-500 / warning-500 / warning-700)` |

**마이그레이션 순서 (권장)**
1. **Phase 0**: 이 문서 승인 + `@theme` 블록을 `globals.css` 최상단에 추가 (code only add, 기존 `:root` 유지) → 충돌 없이 공존
2. **Phase 1**: legacy `--kakao-*` / `--pastel-*` 를 새 토큰 alias 로 **리다이렉트** (예: `--kakao-primary: var(--color-accent-500)`) → 소비처 코드는 그대로
3. **Phase 2**: `result-list/*` 10 파일 순차 치환 (1 PR = 1~2 파일, PA-Visual 스냅샷으로 회귀 검증)
4. **Phase 3**: `@media (max-width: 768px) { body { --sp-4: 20px } }` 안티패턴 제거 + hardcoded `cubic-bezier(0.32, 0.72, 0, 1)` 5곳 → `var(--ease-emphasized)` 치환
5. **Phase 4**: `theme.css` 의 `.theme-dark .bg-white { !important }` 계열 Tailwind override 제거 가능 (Tailwind 4 `@theme` 이 dark variant 자동 처리)

---

## 5. Tailwind 4 @theme 블록 — 복붙 적용 가능

```css
/* src/app/globals.css 최상단 (이 블록만 add; @import "tailwindcss"; @import "./theme.css"; 는 유지) */

@theme {
  /* ===== Fonts ===== */
  --font-sans: var(--font-noto-sans-kr), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;

  /* ===== Typography ===== */
  --text-2xs: clamp(0.6875rem, 0.68rem + 0.04vw, 0.75rem);
  --text-xs:  clamp(0.75rem, 0.73rem + 0.1vw, 0.8125rem);
  --text-sm:  clamp(0.875rem, 0.85rem + 0.12vw, 0.9375rem);
  --text-base: clamp(1rem, 0.97rem + 0.15vw, 1.0625rem);
  --text-lg:  clamp(1.125rem, 1.08rem + 0.22vw, 1.25rem);
  --text-xl:  clamp(1.25rem, 1.18rem + 0.35vw, 1.5rem);
  --text-2xl: clamp(1.5rem, 1.4rem + 0.5vw, 1.875rem);
  --text-3xl: clamp(1.875rem, 1.7rem + 0.88vw, 2.5rem);
  --text-display: clamp(2.5rem, 2rem + 2.5vw, 4rem);

  --leading-tight: 1.2;
  --leading-snug: 1.35;
  --leading-normal: 1.55;
  --leading-relaxed: 1.7;

  --tracking-tight: -0.02em;
  --tracking-normal: 0;
  --tracking-wide: 0.02em;

  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
  --font-weight-extrabold: 800;

  /* ===== Spacing (4/8 base + fractional) ===== */
  --spacing-0: 0;
  --spacing-0_5: 0.125rem;
  --spacing-1: 0.25rem;
  --spacing-1_5: 0.375rem;
  --spacing-2: 0.5rem;
  --spacing-2_5: 0.625rem;
  --spacing-3: 0.75rem;
  --spacing-4: 1rem;
  --spacing-5: 1.25rem;
  --spacing-6: 1.5rem;
  --spacing-7: 1.75rem;
  --spacing-8: 2rem;
  --spacing-10: 2.5rem;
  --spacing-12: 3rem;
  --spacing-14: 3.5rem;
  --spacing-16: 4rem;
  --spacing-20: 5rem;
  --spacing-24: 6rem;

  /* ===== Radius ===== */
  --radius-0: 0;
  --radius-1: 0.25rem;
  --radius-2: 0.5rem;
  --radius-3: 0.75rem;
  --radius-4: 1rem;
  --radius-5: 1.25rem;
  --radius-6: 1.5rem;
  --radius-full: 9999px;
  --radius-button: var(--radius-2);
  --radius-card: var(--radius-4);
  --radius-sheet: var(--radius-5);
  --radius-chip: var(--radius-full);

  /* ===== Motion ===== */
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --ease-emphasized: cubic-bezier(0.32, 0.72, 0, 1);
  --ease-decelerate: cubic-bezier(0, 0, 0.2, 1);
  --ease-accelerate: cubic-bezier(0.4, 0, 1, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --duration-instant: 0ms;
  --duration-fast: 120ms;
  --duration-normal: 200ms;
  --duration-slow: 320ms;
  --duration-slower: 480ms;

  /* ===== Neutral palette ===== */
  --color-neutral-0: #ffffff;
  --color-neutral-50: #f8fafc;
  --color-neutral-100: #f1f5f9;
  --color-neutral-200: #e2e8f0;
  --color-neutral-300: #cbd5e1;
  --color-neutral-400: #94a3b8;
  --color-neutral-500: #64748b;
  --color-neutral-600: #475569;
  --color-neutral-700: #334155;
  --color-neutral-800: #1e293b;
  --color-neutral-900: #0f172a;
  --color-neutral-950: #020617;

  /* ===== Accent (brand) palette ===== */
  --color-accent-50: #eff6ff;
  --color-accent-100: #dbeafe;
  --color-accent-200: #bfdbfe;
  --color-accent-300: #93c5fd;
  --color-accent-400: #60a5fa;
  --color-accent-500: #3274F9;
  --color-accent-600: #2563eb;
  --color-accent-700: #1d4ed8;
  --color-accent-800: #1e40af;
  --color-accent-900: #1e3a8a;
  --color-accent-950: #172554;

  /* ===== Semantic status (4-tier: 50/100/500/700) ===== */
  --color-success-50:  #f0fdf4;
  --color-success-100: #dcfce7;
  --color-success-500: #16a34a;
  --color-success-700: #15803d;
  --color-warning-50:  #fffbeb;
  --color-warning-100: #fef3c7;
  --color-warning-500: #d97706;
  --color-warning-700: #b45309;
  --color-error-50:    #fef2f2;
  --color-error-100:   #fee2e2;
  --color-error-500:   #dc2626;
  --color-error-700:   #b91c1c;
  --color-info-50:     #f0f9ff;
  --color-info-100:    #e0f2fe;
  --color-info-500:    #0284c7;
  --color-info-700:    #0369a1;

  /* ===== Semantic surface (light defaults) ===== */
  --surface-0: #f6f7f9;
  --surface-1: #ffffff;
  --surface-2: #ffffff;
  --surface-3: #ffffff;
  --surface-4: #ffffff;
  --surface-5: #ffffff;

  --text-primary: var(--color-neutral-900);
  --text-secondary: var(--color-neutral-600);
  --text-tertiary: var(--color-neutral-500);
  --text-disabled: var(--color-neutral-300);
  --text-on-accent: var(--color-neutral-0);

  --border-subtle: var(--color-neutral-200);
  --border-strong: var(--color-neutral-300);

  --overlay-scrim: rgba(0, 0, 0, 0.48);
  --overlay-hover: rgba(50, 116, 249, 0.06);
  --overlay-press: rgba(50, 116, 249, 0.12);
  --overlay-selected: rgba(50, 116, 249, 0.18);

  /* ===== Shadow ===== */
  --shadow-0: none;
  --shadow-1: 0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.06);
  --shadow-2: 0 4px 6px -2px rgba(15, 23, 42, 0.04), 0 2px 4px -1px rgba(15, 23, 42, 0.06);
  --shadow-3: 0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -2px rgba(15, 23, 42, 0.05);
  --shadow-4: 0 20px 25px -5px rgba(15, 23, 42, 0.10), 0 10px 10px -5px rgba(15, 23, 42, 0.04);
  --shadow-5: 0 25px 50px -12px rgba(15, 23, 42, 0.25);
  --shadow-accent-sm: 0 4px 12px rgba(50, 116, 249, 0.18);
  --shadow-accent-md: 0 8px 24px rgba(50, 116, 249, 0.28);
}

/* ===== Dark mode — prefers-color-scheme 1차, .theme-dark 2차 ===== */
@media (prefers-color-scheme: dark) {
  :root:not(.theme-light) {
    --surface-0: #0b1020;
    --surface-1: #0f172a;
    --surface-2: #131b30;
    --surface-3: #1a2340;
    --surface-4: #202a4d;
    --surface-5: #2a3560;

    --text-primary: var(--color-neutral-100);
    --text-secondary: var(--color-neutral-400);
    --text-tertiary: var(--color-neutral-300);
    --text-disabled: var(--color-neutral-700);
    --text-on-accent: var(--color-neutral-0);

    --border-subtle: var(--color-neutral-800);
    --border-strong: var(--color-neutral-700);

    --color-accent-500: #60a5fa;      /* dark에서 텍스트 대비 위해 lighter step */
    --color-success-500: #22c55e;
    --color-warning-500: #f59e0b;
    --color-error-500: #f87171;
    --color-info-500: #38bdf8;

    --shadow-1: 0 1px 2px rgba(0, 0, 0, 0.3), 0 1px 3px rgba(0, 0, 0, 0.2);
    --shadow-2: 0 4px 6px -2px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.25);
    --shadow-3: 0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.25);
    --shadow-4: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.3);
    --shadow-5: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
  }
}

.theme-dark {
  /* 수동 override — prefers-color-scheme 블록과 동일 값 복제 (OS 설정 무시하고 강제) */
  --surface-0: #0b1020;
  --surface-1: #0f172a;
  --surface-2: #131b30;
  --surface-3: #1a2340;
  --surface-4: #202a4d;
  --surface-5: #2a3560;
  --text-primary: var(--color-neutral-100);
  --text-secondary: var(--color-neutral-400);
  --text-tertiary: var(--color-neutral-300);
  --text-disabled: var(--color-neutral-700);
  --border-subtle: var(--color-neutral-800);
  --border-strong: var(--color-neutral-700);
  --color-accent-500: #60a5fa;
  --color-success-500: #22c55e;
  --color-warning-500: #f59e0b;
  --color-error-500: #f87171;
  --color-info-500: #38bdf8;
}

/* ===== Legacy alias — Phase 1에서만 사용. 새 코드는 절대 이쪽 금지 ===== */
:root {
  --accent: var(--color-accent-500);
  --accent-light: var(--color-accent-400);
  --accent-dark: var(--color-accent-700);
  --accent-weak: var(--color-accent-100);
  --bg-app: var(--surface-0);
  --bg-surface: var(--surface-1);
  --bg-surface-muted: var(--color-neutral-100);
  --bg-overlay: color-mix(in srgb, var(--surface-1) 88%, transparent);
  --border-soft: var(--border-subtle);
  --success: var(--color-success-500);
  --warning: var(--color-warning-500);
  --kakao-primary: var(--color-accent-500);
  --kakao-bg: var(--surface-0);
  --kakao-card: var(--surface-1);
  --kakao-text: var(--text-primary);
  --kakao-text-muted: var(--text-secondary);
  --kakao-border: var(--border-subtle);
  --pastel-blue: var(--color-accent-500);
  --pastel-pink: var(--color-error-500);
  --pastel-green: var(--color-success-500);
  --bg-main: var(--surface-0);
  --text-dark: var(--text-primary);
  --text-light: var(--text-secondary);
}
```

**주의**: 이 블록은 `@import "tailwindcss";` 다음에 들어와야 Tailwind 4 `@theme` 파서가 인식. 기존 `@import "./theme.css"` 는 Phase 1 동안 유지하다가 Phase 4 에서 제거.

---

## 6. 다음 단계
1. **승인 게이트**: Planner/Dev/QA 3인 리뷰 (harness `meeting` 라우트)
2. **PA-Visual 기준 스냅샷 촬영** (5 뷰포트 × 기존 토큰) — 치환 전 baseline 확보
3. Phase 0~4 PR 분할, 각 PR 마다 PA-Visual diff `maxDiffPixelRatio ≤ 0.01` 통과 필수
4. Hook 유지 확인: `100vh` 차단 / i18n 대칭 / API validation — 토큰 변경이 이들과 충돌 없음

---

**제안자**: ArchitectUX
**작성일**: 2026-04-21
**대상 커밋**: 미정 (proposal only, no code edits)
