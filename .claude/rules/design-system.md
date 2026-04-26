# MidWayDer Design System Rule

2026 토큰 기반 디자인 시스템의 **작성/수정 규약**.
색·타이포·간격·모션을 전부 토큰으로 통일하고, 7개 컬러 테마(`[data-theme]`) + 다크모드(`.theme-dark`)가 항상 일관되게 반응하도록 강제한다.

**관련 문서**
- [`harness.md`](./harness.md) §10 — Hook 강제 경계 (색 하드코딩 차단 포함)
- [`pa-mobile-visual.md`](./pa-mobile-visual.md) — 겹침/표기 검증 체계
- [`src/app/theme.css`](../../src/app/theme.css) — 토큰 원본
- [`docs/design/2026-modernization-proposal-tokens.md`](../../docs/design/2026-modernization-proposal-tokens.md) — 설계 배경

---

## 0. 원칙 5줄 요약

1. **색은 무조건 토큰.** `#xxxxxx`, `rgb(…)`, `rgba(…)` 로 브랜드/accent 계열 하드코딩 금지.
2. **semantic 우선.** `var(--accent)` 같은 semantic을 쓰고, palette(`--color-accent-500`)는 토큰 선언 안쪽에서만 사용.
3. **Tailwind arbitrary 금지.** `text-[13px]`, `shadow-[0_8px…]`, `rounded-[14px]` 같은 즉흥 값 쓰지 말고 토큰 스케일에 맞춘다.
4. **다크·7테마 파리티.** 라이트/다크 × 7컬러 = 14조합에서 전부 통과해야 한다.
5. **한 파일 한 번만 결정.** `theme.css` 외부에서 색/그림자/모션 값을 재정의하지 않는다.

---

## 1. 색상

### 1.1 반드시 써라 — Semantic 토큰

컴포넌트 코드는 **아래 semantic만** 써라. palette(`--color-accent-500` 등)는 테마 레이어(`[data-theme]`, `.theme-dark`) 안에서만 정의한다.

| 쓰임 | 토큰 | 비고 |
|------|------|------|
| 브랜드/강조 | `var(--accent)` | 테마 전환 시 자동 바뀜 |
| 링크 텍스트 | `var(--text-link)` | |
| 본문 텍스트 | `var(--text-primary)` | |
| 서브 텍스트 | `var(--text-secondary)` | |
| 비활성 텍스트 | `var(--text-tertiary)` / `var(--text-muted)` | |
| 카드 배경 | `var(--bg-surface)` / `var(--surface-1..5)` | elevation 올라갈수록 1→5 |
| 앱 배경 | `var(--bg-app)` / `var(--surface-0)` | |
| 테두리 | `var(--border-soft)` / `var(--border-strong)` | |
| 성공 | `var(--color-success-current)` 또는 `var(--success)` | |
| 경고 | `var(--color-warning-current)` 또는 `var(--warning)` | |
| 에러 | `var(--color-error-current)` | |
| 정보 | `var(--color-info-current)` | |
| 스크림(오버레이) | `var(--overlay-scrim)` | modal 뒷배경 |
| accent 호버 면 | `var(--overlay-hover)` | rgba 자동 조합됨 |
| 선택 하이라이트 | `var(--overlay-selected)` | |

### 1.2 rgba 합성 — `--color-accent-rgb`

불투명도가 들어간 accent 파생 색은 **`rgba(var(--color-accent-rgb), X)`** 로 작성:

```css
/* OK */
background: rgba(var(--color-accent-rgb), 0.08);
box-shadow: 0 4px 12px rgba(var(--color-accent-rgb), 0.22);

/* NO */
background: rgba(50, 116, 249, 0.08);  /* 하드코딩 — Hook block */
```

### 1.3 금지 — 하드코딩 색상 종류

- ❌ `#3274f9`, `#6366f1`, `#8b5cf6` 등 **브랜드/accent 팔레트에 해당하는 hex**
- ❌ `rgba(50, 116, 249, …)` · `rgba(99, 102, 241, …)` 등 accent rgb 튜플
- ❌ `#ef4444`, `#22c55e` 등 **status 역할을 가지는 hex** (→ `--color-error-current` 등 semantic 사용)

### 1.4 예외 — 하드코딩이 허용되는 경우

| 케이스 | 이유 | 예 |
|--------|------|-----|
| `theme.css` 안쪽 palette/테마 선언 | 토큰 정의 자체가 목적 | `--color-accent-500: #3274f9` |
| `<meta name="theme-color">` HTML | 브라우저가 `var()` 지원 안 함 | `content="#3274f9"` (기본 테마 색) |
| 스와치 시각화 리터럴 | UI 미리보기 목적 | `AppearanceSettings.tsx` 의 `SWATCH_HEX` 매핑 |
| SSR 폴백 상수 | document 없을 때 안전망 | `theme-colors.ts` 의 `DEFAULT_ACCENT` |
| 고정 중립색 (검정/흰색/회색 특정값) | 상태/브랜드와 무관 | `#1a1a1a` 같은 placeholder — 그래도 가능한 `var(--text-primary)` 권장 |

예외가 아니면 전부 토큰으로.

### 1.5 JSX에서 색 쓰는 법

```tsx
// ✅ 인라인 style — SSR 깜빡임 없음
<h3 style={{ color: 'var(--accent)' }}>

// ✅ Tailwind 커스텀 프로퍼티
<div className="bg-[var(--bg-surface)]">

// ✅ @theme 로 생성된 유틸 (Tailwind 4)
<button className="bg-accent-500 text-white">

// ❌ 하드코딩
<h3 style={{ color: '#3274f9' }}>   // Hook block
```

### 1.6 지도 마커처럼 DOM 외부에서 색이 필요한 경우

Kakao/Naver 지도 마커는 SVG data URI 안에 색이 들어가서 CSS 변수를 직접 못 쓴다. **`src/lib/theme-colors.ts` 헬퍼 경유**:

```tsx
import { getAccentColor, getSuccessColor } from '@/lib/theme-colors';

const accent = getAccentColor();   // runtime getComputedStyle('--accent')
const success = getSuccessColor();
const markerHTML = `<div style="background: ${accent}">${index}</div>`;
```

헬퍼는 현재 `[data-theme]` + `.theme-dark` 조합을 실시간으로 읽으므로, 테마 바뀌면 마커 재렌더 시 자동 반영된다.

---

## 2. 타이포그래피

### 2.1 스케일 — fluid clamp

직접 `font-size: 15px` 지정 금지. 대신 토큰:

```css
font-size: var(--text-2xs);   /* 11–12 */
font-size: var(--text-xs);    /* 12–13 */
font-size: var(--text-sm);    /* 14–15 */
font-size: var(--text-base);  /* 16–17 (iOS 줌 방지 ≥16px) */
font-size: var(--text-lg);    /* 18–20 */
font-size: var(--text-xl);    /* 20–24 */
font-size: var(--text-2xl);
font-size: var(--text-3xl);
font-size: var(--text-display); /* 히어로 */
```

### 2.2 Weight / Line-height / Tracking

```css
font-weight: var(--font-weight-semibold);     /* 400/500/600/700/800 */
line-height: var(--leading-normal);           /* tight/snug/normal/relaxed */
letter-spacing: var(--tracking-tight);        /* 음수는 display/h1 에만 */
```

### 2.3 iOS 입력 줌 방지

`<input>`, `<textarea>` 의 font-size는 **16px 이상** 보장. 현재 `globals.css` 에서 `font-size: 16px !important` 강제. 이 규칙 제거 금지.

---

## 3. 간격 · 반경 · 그림자

### 3.1 Spacing — `--space-*`

```css
padding: var(--space-3) var(--space-4);   /* 12px 16px */
gap: var(--space-2);                       /* 8px */
margin-top: var(--space-6);                /* 24px */
```

- `0 / 0_5 / 1 / 1_5 / 2 / 2_5 / 3 / 4 / 5 / 6 / 7 / 8 / 10 / 12 / 14 / 16 / 20 / 24`
- 중간값 필요하면 **팀 합의 후** 토큰 추가. 임의 값 금지.
- ❌ 미디어 쿼리 안에서 `body { --space-4: 20px }` 같은 재정의 — 카스케이드 깨짐, Hook 감시.

### 3.2 Radius — `--radius-*`

```css
border-radius: var(--radius-card);    /* 16px — 카드 default */
border-radius: var(--radius-button);  /* 8px */
border-radius: var(--radius-sheet);   /* 20px — Bottom Sheet */
border-radius: var(--radius-chip);    /* 9999px */
```

role alias (`--radius-button`, `--radius-card`, `--radius-sheet`, `--radius-chip`) 우선.

### 3.3 Shadow — `--shadow-*`

```css
box-shadow: var(--shadow-1);          /* 미묘한 카드 */
box-shadow: var(--shadow-3);          /* sticky, popover */
box-shadow: var(--shadow-4);          /* modal, sheet */
box-shadow: var(--shadow-accent-md);  /* CTA hover glow */
```

`--shadow-0..5` + `--shadow-accent-sm/md`. **`box-shadow: 0 8px 24px rgba(0,0,0,0.12)` 하드코딩 금지.**

### 3.4 다크모드 그림자 자동 증폭

dark 모드에선 `--shadow-*` 가 자동으로 불투명도 증폭된 값으로 오버라이드된다. 컴포넌트에서 `.theme-dark .card { box-shadow: ... }` 수동 오버라이드 금지.

---

## 4. 모션

### 4.1 Easing / Duration — `--ease-*` / `--duration-*`

```css
transition: transform var(--duration-normal) var(--ease-emphasized);
animation: slideUp var(--duration-slow) var(--ease-decelerate) forwards;
```

| 용도 | Easing | Duration |
|------|--------|---------|
| 일반 UI 반응 | `--ease-standard` | `--duration-normal` (200ms) |
| 모바일 스와이프·카드 | `--ease-emphasized` | `--duration-normal` |
| 진입 애니메이션 | `--ease-decelerate` | `--duration-slow` (320ms) |
| 퇴장 애니메이션 | `--ease-accelerate` | `--duration-fast` (120ms) |
| 튕김/강조 | `--ease-spring` | `--duration-slow` |

### 4.2 하드코딩 금지

```css
/* ❌ */
transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);

/* ✅ */
transition: transform var(--duration-slow) var(--ease-emphasized);
```

### 4.3 접근성 — `prefers-reduced-motion`

`globals.css` 의 `@media (prefers-reduced-motion: reduce)` 블록이 전역 `animation-duration: 0.01ms` 강제. 개별 컴포넌트가 이걸 `!important` 로 덮어쓰지 말 것.

---

## 5. 다크모드 & 7컬러 테마 파리티

### 5.1 테스트 매트릭스 (필수)

| 밝기 | 컬러 | 검사 여부 |
|------|------|----------|
| light | blue | ✅ 기본 |
| light | 나머지 6개 | ✅ 최소 spot check |
| dark | blue | ✅ |
| dark | 나머지 6개 | ✅ 최소 spot check |

**적어도 light·dark × blue·violet·emerald 6조합**은 `/settings` 에서 바꿔보며 깨짐 없음 확인.

### 5.2 대비 비율 (WCAG AA)

- 본문 텍스트 ≥ 4.5:1
- 큰 텍스트 / 비텍스트 UI 컴포넌트 ≥ 3:1
- 뱃지·칩 텍스트 ≥ 4.5:1 (accent 테마 중 slate/teal 주의)

다크 모드 slate·emerald accent 는 명도 낮아서 검증 필수. Chrome DevTools > Rendering > "Emulate CSS media feature prefers-color-scheme".

### 5.3 금지 패턴

- ❌ `.theme-dark .my-card { background: #1e293b }` — 이미 `--bg-surface` / `--surface-1` 에서 처리됨. 중복 오버라이드 금지.
- ❌ `[data-theme="emerald"] .cta { background: #10b981 }` — `var(--accent)` 로 끝내야 함. 테마 추가될 때마다 컴포넌트 안 고쳐도 되게.

---

## 6. 컴포넌트 패턴

### 6.1 카드

```tsx
<div
  style={{
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-soft)',
    borderRadius: 'var(--radius-card)',
    padding: 'var(--space-4)',
    boxShadow: 'var(--shadow-1)',
    transition: 'all var(--duration-normal) var(--ease-emphasized)',
  }}
>
```

- 카드 hover 시 `--shadow-3` + `translateY(-2px)` 권장.
- 선택 상태는 `--overlay-selected` 오버레이 + `border-color: var(--border-accent)`.

### 6.2 버튼

| 유형 | 배경 | 텍스트 | 반경 |
|------|------|--------|------|
| Primary | `var(--accent)` | `var(--text-on-accent)` | `var(--radius-button)` |
| Secondary | `var(--bg-surface-muted)` | `var(--text-primary)` | `var(--radius-button)` |
| Ghost | transparent | `var(--accent)` | `var(--radius-button)` |
| Destructive | `var(--color-error-current)` | `#fff` | `var(--radius-button)` |
| FAB | `var(--accent)` | `var(--text-on-accent)` | `var(--radius-full)` |

Tailwind 유틸이라면 `bg-accent-500 text-white rounded-lg` 사용 가능 (Tailwind 4 `@theme` 으로 생성됨).

### 6.3 칩 (필터/카테고리)

- 반경: `var(--radius-chip)` (pill)
- 비활성: `background: var(--bg-surface-muted)`, `color: var(--text-secondary)`
- 활성: `background: var(--overlay-selected)`, `color: var(--accent)`, `border: 1px solid var(--border-accent)`

### 6.4 뱃지

- 반경: `var(--radius-1)` (4px)
- 폰트: `var(--text-2xs)` + `--font-weight-semibold`
- tracking: `var(--tracking-wide)`

### 6.5 Bottom Sheet / Modal

- 반경 상단: `var(--radius-sheet) var(--radius-sheet) 0 0`
- 그림자: `var(--shadow-4)`
- 뒷배경: `var(--overlay-scrim)`
- 드래그 핸들: `.bottom-sheet-handle` 기존 유틸 재사용

---

## 7. Hook 강제 경계

[`harness.md`](./harness.md) §10 에 아래 항목 추가 (신규):

> **색 하드코딩**: JSX/CSS 에서 다음 중 하나라도 감지되면 block.
> - `#3274F9` / `#3274f9` (blue accent 리터럴)
> - `rgba(50,\s*116,\s*249` 같은 accent rgb 튜플
> - 다른 6개 테마의 500 단계 hex (`#6366f1`, `#8b5cf6`, `#06b6d4`, `#10b981`, `#f43f5e`, `#64748b`) — `theme.css` 내부 선언은 예외
>
> 우회하려면 해당 리터럴이 왜 필요한지 주석으로 명시하고, 가능하면 `theme-colors.ts` 헬퍼 경유.

(PostToolUse hook 스크립트는 별도 티켓에서 `scripts/harness-check.sh` 에 추가.)

---

## 8. 새 컴포넌트 작성 체크리스트

새 파일 작성 전 / PR 올리기 전에 돌린다:

- [ ] **색**: 모든 색 값이 `var(--…)` 또는 `rgba(var(--color-accent-rgb), X)` 형태
- [ ] **타이포**: `font-size` / `line-height` / `font-weight` 전부 토큰
- [ ] **간격**: `padding` / `margin` / `gap` 전부 `var(--space-*)`
- [ ] **반경**: `border-radius` 전부 `var(--radius-*)` (role alias 우선)
- [ ] **그림자**: `box-shadow` 전부 `var(--shadow-*)`
- [ ] **모션**: `transition` / `animation` 의 easing + duration 전부 토큰
- [ ] **터치 타겟**: 모바일 버튼 44×44 이상 (`.btn-touch` 또는 padding 으로 확보)
- [ ] **다크 검증**: `/settings` 에서 라이트↔다크 토글 후 깨짐 없음
- [ ] **컬러 테마 검증**: 최소 3개 테마 (blue/violet/emerald) 전환 테스트
- [ ] **Tailwind arbitrary 없음**: `text-[13px]`, `p-[11px]`, `rounded-[14px]` 0건
- [ ] **접근성**: 포커스 링 존재, `aria-label` 또는 텍스트 레이블 존재

---

## 9. 기존 컴포넌트 마이그레이션

점진 마이그레이션 우선순위:

1. **결과 카드 계열** (`ResultCard`, `CompactCard`, `CardActions`, `CardBadges`, `CardScoreDetail`)
   — 가장 노출 많은 UI. Phase 2 에서 리뉴얼 예정.

2. **필터/칩 계열** (`FilterChips`, `SortFilter`, `CategoryChips`)
   — 활성/비활성 상태가 정적 색 하드코딩되어 있는지 점검.

3. **지도 오버레이** (`MapContainer`, `MapControls`, `KakaoMap`, 마커류)
   — `theme-colors.ts` 헬퍼 이미 도입됨. 나머지 오버레이도 적용.

4. **SearchOverlay / BottomSheet / BottomQuickBar**
   — elevation·shadow·radius 토큰화.

5. **Settings 하위** (`CacheSettings`, `SyncSettings`, `NotificationSettings`, `CustomCategorySettings`)
   — `AppearanceSettings.tsx` 를 참고 레퍼런스로 맞춘다.

마이그레이션 시 한 PR에 **한 영역**만. 크로스 컴포넌트 토큰 변경은 회귀 위험 크다.

---

## 10. 토큰 변경/추가 프로세스

새 토큰이 필요하면:

1. `docs/design/2026-modernization-proposal-tokens.md` 에 설계 의도 추가
2. `src/app/theme.css` 에 light + dark + 7 테마 4레이어 전부 반영 (palette 파생이면 자동)
3. `pa-mobile-visual.md` 시나리오에 검증 항목 추가
4. 관련 컴포넌트 마이그레이션은 **다음 PR** 에서 진행 (토큰 추가와 소비 분리)

기존 토큰 **rename / remove 금지** — backward compat alias 레이어를 거쳐야 한다. `theme.css` 하단의 alias 섹션 참고.

---

## 11. Verdict 기록

디자인 관련 PR closeout 에 아래 한 줄이라도 기록:

```markdown
## Design Verdict
- 색 하드코딩: 0건 (grep `#3274|rgba\(50,\s*116` 확인)
- 토큰 준수: 신규 `.tsx` N개 전부 체크리스트 §8 통과
- 테마 검증: light/dark × blue/violet/emerald 6조합 spot check pass
```

---

## 관련 문서
- [`harness.md`](./harness.md) §10 — Hook 차단 규칙 원본
- [`pa-mobile-visual.md`](./pa-mobile-visual.md) — 겹침/다크/뷰포트 검증
- [`pa-feature-matrix.md`](./pa-feature-matrix.md) 영역 D, E — 카드/필터 UI 체크리스트
- [`qa-gates.md`](./qa-gates.md) — PA + Q축 통합 판정
- [src/app/theme.css](../../src/app/theme.css) — 토큰 원본
- [src/lib/theme-colors.ts](../../src/lib/theme-colors.ts) — 런타임 색 헬퍼
- [docs/design/mockups/](../../docs/design/mockups/) — 목업 (index.html/mobile.html/desktop.html/tokens.html)
