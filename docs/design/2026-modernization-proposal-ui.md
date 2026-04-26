# MidWayDer 2026 UI 모더나이제이션 제안서

**작성일**: 2026-04-21
**대상 버전**: v0.6.x → v0.7.0 (디자인 토큰 리브랜딩)
**스코프**: 시각 언어만 (기능/로직 변경 없음)
**전제**: Next.js 16 + React 19 + Tailwind 4, Kakao Map primary, 모바일 First
**전제 2**: 기존 하네스 hook(100vh 금지, Detour 가중치, i18n 키 대칭) 유지

---

## 1. 현재 디자인 진단 — "2026 기준 올드한 포인트"

현재 MidWayDer는 **기능 밀도는 v2026급**인데 **시각 언어가 v2022 (Kakao-lookalike flat Material)** 에 머물러 있다. v0.6.0까지 40+ 기능을 붙이면서 각 뱃지/칩/버튼이 독립적으로 추가된 결과, **"한 화면에 뱃지 8종, 칩 9종, 컬러 12종"** 이 경쟁한다.

### D1. 플랫 색면 + 단조로운 그림자 (Kakao 2019 미학)
- **증거**: `theme.css` 다크 `--bg-app: #0b1020`(navy) + `--bg-surface: #0f172a`(slate), 단일 레이어. 라이트는 `#f6f7f9` 1톤.
- **증거**: `--shadow-sm: 0 2px 8px rgba(0,0,0,0.06)` — Material 1.0식 평면 drop shadow 단일 레시피.
- **문제**: 2026 기준은 **다층 blur + color-tinted shadow**(예: accent를 띄운 `0 8px 32px -8px rgba(50,116,249,0.25)`) 또는 **ambient/key 2단 분리**. 현재는 "흰 카드 위에 회색 그림자" 전형 Material stamp.
- **스크린샷**: `tests/e2e/mobile-visual.spec.ts-snapshots/mobile-home-empty-mobile-chrome-darwin.png` — 하단 BottomQuickBar가 전부 흰 직사각형, 시각적 위계 없음.

### D2. 뱃지/칩 인플레이션 + 이모지 과다 (1카드 뱃지 9종)
- **증거**: `ResultCard.tsx:253-377` — `+Nkm`, `+N분`, 경로타입, 위치라벨, 🔥N명, 영업중, 마감임박, 내위치최근접, 🚶도보, 📊점수 **총 10종 뱃지가 한 카드 내 flex-wrap**.
- **문제**: 각 뱃지가 `rounded-full px-3 py-1.5 text-[13px] font-semibold` 동일 톤. **위계 없음**. 사용자 눈엔 "알록달록한 pill 밭"으로만 보인다.
- **문제**: 이모지가 정보 전달과 장식을 동시에 함 (🏆🔥📍⭐🚶🕐⚠️🟢🗺️📊📌📝) — 2026 트렌드는 **정제된 pictogram + 최소 1~2 accent emoji**.

### D3. 경쟁하는 Accent 컬러 — Blue, Orange, Green이 모두 primary
- **증거**: `globals.css:30-32` — `--kakao-primary: #3274F9`, `--kakao-secondary: #FF6B00`, `--kakao-success: #4CAF50` 세 색이 같은 strength(100% saturation)로 쓰임.
- **증거**: `ResultCard.tsx:243` 매장명이 `color: '#3274F9'` 하드코딩 Blue. 점수 버튼도 Blue. 근데 이탈시간 뱃지는 Green, 이탈거리 뱃지도 Green. `sortBy` 활성 시 또 Green을 강조색으로 사용 → **Green이 어떤 맥락에선 "중립"인데 어떤 맥락에선 "활성 강조"**.
- **문제**: 2026 트렌드는 **1 signature hue + 1 neutral pair + semantic color는 채도 낮춰 subdued**. 지금은 Kakao Blue가 브랜드인지 Kakao SDK 기본인지 불분명.

### D4. Typography Scale 의존성 붕괴 — inline `text-[12px]` `text-[10px]` 남발
- **증거**: `ResultCard.tsx`에만 `text-[10px]`, `text-[11px]`, `text-[12px]`, `text-[13px]`, `text-[17px]` 5종 inline size. `globals.css:18-22`에 선언된 `--text-xs/sm/base/lg` 4단계 스케일은 거의 사용되지 않음.
- **문제**: 스케일 무시 + **font-weight가 거의 `font-bold` 또는 `font-semibold` 두 종류만** (400/500 weight 활용 저조) → 위계가 크기로만 표현되고 굵기/색 대비 활용 부족.
- **2026 트렌드**: **expressive typography** — 숫자/지표는 `font-variant-numeric: tabular-nums` + `font-feature-settings: "ss01"`, weight를 300~900 넓게 쓰는 **typographic hierarchy**.

### D5. 모바일 하단 스택이 "흰 카드 3개 겹침" — 레이어 구분 없음
- **증거**: 스크린샷 `mobile-home-empty`. BottomQuickBar(RoutineBanner + 인기경로 그리드) + Sticky Mini Bar + BottomSheet 전부 **white solid + 동일 shadow**. 3층인데 시각적으로 1층처럼 보인다.
- **문제**: 2026 트렌드는 **glass / translucent + depth layering** (배경 맵이 살짝 비치는 blur), 또는 **elevation을 색/채도로 표현**(L1 pure white, L4 accent-tinted translucent).
- **관련 gap**: `backdrop-filter: blur(8px)`가 StickyBar 한 군데만 적용되어 있음 (`StickyBar.tsx:23`). 체계적이지 않음.

---

## 2. 2026 UI 트렌드 맵 — MidWayDer 적합도 평가

| 트렌드 | 설명 | 경로앱 적합도 | 권장 |
|--------|------|---------------|------|
| **Glassmorphism v3 (subtle glass)** | 지도 위 오버레이에 `backdrop-filter: blur(16px) saturate(180%)` + 1px inner border. iOS 26 Liquid Glass와 유사 | ⭐⭐⭐ 지도 위에 떠 있는 UI가 전제라 완벽 적합 | 채택 |
| **Bento Grid** | 불균등 그리드 카드 (대/중/소) | ⭐ 결과는 동등한 순위 리스트라 bento가 어색. 단 대시보드/설정에만 | 부분 채택 (Settings만) |
| **Soft Neumorphism v2** | 작은 depth, 배경색과 유사한 surface + inset/outer shadow 페어 | ⭐⭐ 카드 위계와 경쟁, 접근성 대비 저하 위험 | 거부 |
| **Expressive Typography** | Variable font + 숫자 tabular + 강한 weight 대비 | ⭐⭐⭐ "+5분", "+1.2km", "87점" 지표가 핵심 정보 → 타이포가 곧 제품 | 채택 (핵심) |
| **Animated Gradients / Mesh** | 움직이는 mesh gradient 배경 | ⭐ 지도 위라 배경이 거의 안 보임. 로딩 스테이트 한정 | 부분 채택 (Loading/BestPick banner) |
| **Neon on Dark** | 다크 배경 + 네온 accent (cyan/magenta) | ⭐⭐ 경로 폴리라인, 베스트픽에만 | 부분 채택 |
| **Adaptive Density** | 스크롤 깊이/뷰포트에 따라 카드 밀도 자동 조정 | ⭐⭐⭐ 이미 컴팩트/자세히 토글 존재 → 자동화로 승격 | 채택 (v2) |
| **Haptic-first Micro-interactions** | 터치 타겟 누를 때 scale + haptic feedback 시뮬레이션 | ⭐⭐⭐ 현재 `active:scale-95` 단조로움 | 채택 |
| **Monochromatic + 1 Pop** | 전체 그레이스케일 + 단일 accent 채도 폭발 | ⭐⭐⭐ 색 인플레이션 해결 | 채택 (핵심) |
| **Spatial Depth (Parallax scroll)** | 스크롤 시 Z-축 레이어 시차 | ⭐ 지도 Sticky와 충돌 | 거부 |
| **Organic Blob / Shape** | SVG organic shape 배경 장식 | ⭐⭐ EmptyState 일러스트에만 | 부분 채택 |
| **Dynamic Island-like Pill** | 상단 고정 pill에 상태 morph (로딩→결과→토스트) | ⭐⭐⭐ 3단계 로딩 인디케이터를 이걸로 통합 | 채택 |

**채택 5대 축**:
1. Glassmorphism v3 (지도 오버레이 전제)
2. Expressive Typography (지표 가독성)
3. Monochromatic + Pop (색 노이즈 제거)
4. Dynamic Island Pill (로딩/토스트 통합)
5. Haptic Micro-interaction (v0.68.0 gpu-accelerate와 연계)

---

## 3. MidWayDer 전용 적용 제안 — 5영역 Before → After

### 3.1 Color / Token Palette

**Before** (`theme.css`):
```
--accent: #3274F9           # Kakao Blue (채도 95%)
--warning: #FF6B00          # 쨍한 Orange
--success: #4CAF50          # Material Green
(세 색 동등 weight, 의미 경쟁)
```

**After** — **Signature Hue Ink + Neutral Spectrum + Semantic Subdued**:
```
# Brand (1 signature)
--ink-500: #2563EB          # Deep Electric Blue (brand, 한 톤 낮춤)
--ink-400: #3B82F6          # Hover
--ink-600: #1D4ED8          # Pressed
--ink-glow: rgba(37,99,235,0.35)  # shadow tint

# Neutral 9단계 (OKLCH 기반 지각 균등)
--neutral-0 ~ --neutral-950  # 라이트/다크 auto flip

# Semantic — 채도 낮춘 subdued
--sem-ok: #16A34A           # (현 #4CAF50 → 덜 네온)
--sem-warn: #D97706         # (현 #FF6B00 → burnt orange)
--sem-alert: #DC2626
--sem-info: #0891B2         # Cyan (새로 — 점수분해 등에)

# Dark mode: Deep Graphite + Ink Glow
--bg-app: #0A0A0F           # (현 #0b1020 navy → pure graphite)
--bg-surface: #141420       # raised
--bg-surface-2: #1C1C2E     # raised+
--glass-surface: rgba(20,20,32,0.55)   # backdrop-filter 동반
```

**관련 토큰 신설**:
```
--glass-blur: 16px
--glass-saturate: 180%
--shadow-ambient: 0 1px 2px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.02)
--shadow-elevated: 0 8px 32px -8px var(--ink-glow), 0 2px 6px rgba(0,0,0,0.06)
--shadow-floating: 0 16px 48px -12px rgba(0,0,0,0.18)
```

**핵심 규칙**:
- **뱃지는 chromatic chip만 3종 허용**: `ink`(정보/액션), `ok`(긍정), `warn`(주의). 나머지(purple/pink/yellow)는 **neutral tint + icon color**로 표현.
- Green을 "sortBy 활성"에 쓰지 말 것. sortBy 활성은 **ink-500 + ring**로 통일.

---

### 3.2 Typography Scale + Weight

**Before**:
- 하나의 scale(`--text-xs~lg`) 선언 + inline `text-[10px]~[17px]` 섞임
- weight 400/500/600/700 네 단계지만 실사용은 bold/semibold 2단계

**After** — **Display + UI + Numeric 3-track**:
```css
/* Display (헤드라인 — SearchOverlay 타이틀, EmptyState 헤더) */
--font-display: "Pretendard Variable", "Inter Variable", system-ui;
--display-xl: 28px / 1.15 / 700;
--display-lg: 22px / 1.2 / 700;
--display-md: 18px / 1.3 / 600;

/* UI Text (카드명, 주소, 라벨) */
--ui-lg: 17px / 1.4 / 600;    # 매장명
--ui-md: 15px / 1.45 / 500;   # 본문
--ui-sm: 13px / 1.4 / 500;    # 보조
--ui-xs: 11px / 1.35 / 600;   # 라벨 (uppercase + letter-spacing 0.02em)

/* Numeric — 지표 전용 */
--num-hero: 32px / 1 / 800;           # 최종점수
--num-lg: 20px / 1 / 700 tabular-nums; # +N분
--num-md: 15px / 1 / 600 tabular-nums; # +Nkm
font-feature-settings: "tnum", "ss01";
```

**도입**:
- Pretendard Variable (한국어 최적 variable font, CJK/Latin 일관성) + weight 범위 100~900 활용.
- 지표 숫자는 `tabular-nums` 강제 → 스크롤 중 숫자 흔들림 제거.
- `--ui-xs`는 uppercase + letter-spacing 0.02em으로 **섹션 라벨 품질** 상승.

**영향 범위**:
- `ResultCard.tsx:243` → `text-[17px]` → `var(--ui-lg)` 토큰 class화
- `ResultCard.tsx` 뱃지 `text-[13px]` → `var(--ui-sm)`, 점수 `text-[11px]` → `var(--num-md)`

---

### 3.3 Spacing / Radius / Shadow

**Before**:
- 4px 기반 6단계 (`--sp-1~6`) + 모바일에서 `--sp-4/5/6`만 재정의
- `--r-sm: 10px` ~ `--r-xl: 24px` 4단계
- shadow-sm, shadow-md 2종

**After** — **8pt grid + expressive radius + layered shadow**:
```css
# Spacing (모듈러 8pt)
--sp-0: 0; --sp-1: 4px; --sp-2: 8px; --sp-3: 12px;
--sp-4: 16px; --sp-5: 24px; --sp-6: 32px; --sp-7: 48px; --sp-8: 64px;

# Radius (카드 언어)
--r-xs: 8px;      # 칩, 인풋
--r-sm: 12px;     # 버튼
--r-md: 18px;     # 카드 내부 요소
--r-lg: 24px;     # 카드 outer (현 rounded-2xl)
--r-xl: 32px;     # Sheet, Overlay
--r-pill: 9999px;

# Shadow (5단계 elevation)
--e0: none;
--e1: 0 1px 2px rgba(0,0,0,0.04);           # 칩
--e2: 0 4px 12px -2px rgba(0,0,0,0.06);     # 카드 resting
--e3: 0 12px 32px -8px rgba(0,0,0,0.12);    # 카드 hover, 베스트픽
--e4: 0 20px 48px -12px rgba(0,0,0,0.18);   # BottomSheet, overlay
--e-ink: 0 8px 32px -8px var(--ink-glow);   # accent-tinted (selected, FAB)
```

**Before → After 예시**:
- 카드: `shadow-sm rounded-2xl` → `shadow-[var(--e2)] rounded-[var(--r-lg)] hover:shadow-[var(--e3)]`
- 베스트픽 카드(index===0): 추가로 `shadow-[var(--e-ink)]` → **선택된 느낌이 색온도로 전달**
- Sticky MiniBar: solid bg → `backdrop-blur-[16px] bg-[var(--glass-surface)] border border-white/10`

---

### 3.4 Card (ResultCard) Visual Language

**Before** — 시각적 대시보드 (뱃지 10종 꽉꽉):
```
┌─────────────────────────────────┐
│ 🏆 베스트 픽 — 1등인 이유      │
│ ①  🏪 스타벅스 XXX점           │
│     서울특별시 강남구...        │
│     [+0.8km][+5분][최단시간]   │
│     [📍경로중간][🔥3명][영업중]│
│     [📍내위치최근접][🚶도보3분] │
│     [📊87점]                   │
│     ━━━━━━━━━━━ 이탈 바       │
│     ━━━━━━━━━━━ 영업타임라인  │
│     🕐 ETA 15:30 도착 예상     │
│     📝 메모...                 │
│     [🧭 네비 시작] [변경]      │
│                    ⭐ 📋 ⋯   │
└─────────────────────────────────┘
```

**After** — 정보 **3층 위계** (Primary / Supporting / Tools):

```
┌─────────────────────────────────┐
│  [Ink glow strip left, 3px]     │  <- detour stripe (subtle)
│                                 │
│  ①   스타벅스 강남 2호점        │  <- ui-lg / weight 600, ink-950
│      서울 강남구 테헤란로 123   │  <- ui-sm / weight 500, neutral-500
│                                 │
│      ┌──────┬──────┬──────┐     │  <- 3 stat pods (num-lg tabular)
│      │ +5분 │+0.8km│ 87점 │     │
│      └──────┴──────┴──────┘     │
│                                 │
│      [✓ 영업중] [🔥 인기]       │  <- chip row (max 3 shown, +N...)
│                                 │
│      ━━━━━━━━━▓▓▓ 이탈 min      │  <- 미니 바 (slim 2px, full width)
│                                 │
│ ─────────────────────────────── │
│  🧭 카카오내비으로 시작  ⋯      │  <- 단일 primary CTA + overflow
└─────────────────────────────────┘
```

**핵심 변화**:
1. **Stat Pods** — `+N분 / +Nkm / N점`을 **3 equal-width cells**로 tabular-nums 숫자 크게. 뱃지에서 승격. 카드마다 시각적 anchor.
2. **Chip row 축약** — 보조 뱃지는 **max 3개**만 노출 + `+N more` 펼침. 영업상태, 인기, 근접 등은 "가장 중요한 한 개"만.
3. **Left stripe 감도 down** — 현재 4px solid → **3px linear-gradient with opacity**. 정보이긴 하지만 방해되지 않게.
4. **ETA/점수분해/영업타임라인/메모** → **progressive disclosure** (오버플로우 메뉴 또는 long-press로 expand). 처음부터 다 보여주지 않음.
5. **베스트픽 배너** → 카드 상단 금색 그라디언트 대신 **카드 전체에 ink-glow shadow + "BEST" micro-pill** (top-right).
6. **우측 액션 컬럼 삭제** → Star + Copy + Overflow 3개는 **CTA 바 우측**으로 재배치. 세로 공간 회수.

---

### 3.5 Map Overlay + Bottom Sheet Stack

**Before** (`BottomQuickBar`, `StickyBar`, BottomSheet 동시 표시):
- 모두 **solid white** + 동일 `shadow-lg`
- 3층인데 **Z축 감각 없음**
- 지도가 위에서 보여야 하는데 거의 안 보임 (하단 60% 흰 블록)

**After** — **Glass Stack Hierarchy**:

```
L0: Map (always visible)
  ↓
L1: Scrim (scroll 진입 시 하단 그라디언트) — 지도→UI 전환 부드럽게
    linear-gradient(to top, rgba(0,0,0,0.08) 0%, transparent 100%)
  ↓
L2: BottomSheet content — bg-surface + blur(0) (fully opaque 영역)
  ↓
L3: Sticky Filter Bar (스크롤 시 sticky)
    backdrop-blur(20px) saturate(180%) + bg-surface/80 + top border 1px white/10
  ↓
L4: Sticky MiniBar (bottom)
    backdrop-blur(20px) + bg-surface/90 + ink-glow shadow (selected item)
  ↓
L5: Dynamic Island Pill (top-center, 30px wide collapsed, morph to 280px expanded)
    bg: neutral-950/90 + backdrop-blur(24px)
    상태: idle(숨김) → loading(3단계 인디케이터) → toast(복사됨) → result(검색완료 "10개 발견")
```

**BottomSheet 스냅 체계** — 현재 `collapsed/half/full`:
- `collapsed`: 상단 12px pill handle + 최상위 1개 결과만 peek (현재 mini bar 대체)
- `half`: 40vh, 결과 5개 + 필터
- `full`: 92dvh (100dvh 금지 hook 존중), 스와이프 down으로 half

**지도 위 FAB 재배치**:
- 현재 스크린샷에서 **설정 ⚙️ + GPS 📍 FAB**이 Bottom Card 안에 꽂혀 있어 방해 → 우하단 고정 FAB stack으로 분리. glass bg + ink icon.

**Map 폴리라인 모더나이제이션**:
- 현재: 파란색 solid line
- After: **gradient polyline** (출발지 ink-400 → 도착지 ink-600) + **subtle glow** (Kakao SDK `strokeOpacity: 0.85, strokeWeight: 6` + 배경에 12px blur 층)
- 선택된 경유지 마커: **ink-glow ring + pulse** (selected state)

---

## 4. 우선순위 3단계 롤아웃

### **Phase 1 — Token Swap Only** (2~3일, 코드 변경 최소)
**목표**: JSX 수정 0, `theme.css` + `globals.css` 토큰만 교체. 전 화면 톤이 바뀌는 효과.
- `theme.css`에 신규 색 토큰 (`--ink-*`, `--neutral-*`, `--sem-*`, `--glass-*`) 추가
- 기존 `--accent`, `--warning`, `--success`를 **alias**로 신규 토큰에 연결 (backward compat)
- `--shadow-sm/md` → `--e1~e4` 5단계 확장, legacy alias 유지
- `globals.css`에 `--font-display/ui/num` track 추가, Pretendard Variable import
- **검증**: Playwright 기존 3 스냅샷 `--update-snapshots` + 시각 diff PR에 before/after 첨부
- **리스크**: 낮음. QA-Visual 자동 회귀로 검증.

### **Phase 2 — Card Redesign** (1주)
**목표**: `ResultCard.tsx` + `CompactCard.tsx` + `StickyBar.tsx` 재설계. 뱃지 인플레이션 해결.
- Stat Pods 컴포넌트 신설 (`StatPod.tsx` — +분/+km/점수)
- 뱃지 축약 로직 (`useVisibleBadges` hook — max 3 + overflow)
- 베스트픽 배너 → ink-glow shadow + BEST micro-pill로 교체
- 우측 액션 세로 컬럼 → CTA 바 통합
- **검증**: PA-Matrix D (결과 카드 UI) 전수 재실행, Visual 5뷰포트 스냅샷 재생성
- **리스크**: 중간. 스와이프 제스처 / 호버 동기화 hook과 DOM 구조 변경 충돌 가능. CardActions, CardBadges, CardScoreDetail 서브컴포넌트 계약 유지할 것.

### **Phase 3 — Motion & Micro-interaction** (1주)
**목표**: Dynamic Island pill + Glass stack + haptic feedback.
- `DynamicPill.tsx` 신설 (top-center, framer-motion layout morph) — 기존 3단계 로딩 인디케이터 + Toast + OfflineBanner를 통합
- BottomSheet glass layer (`backdrop-blur-[20px] saturate-[180%]`)
- Polyline gradient + glow (Kakao SDK custom overlay)
- Haptic simulation: `active:scale-[0.97] active:brightness-95` + `navigator.vibrate(10)` (지원 기기)
- Map FAB stack 우하단 분리
- **검증**: `prefers-reduced-motion` 완전 준수, PA-Visual §4 (다크모드 파리티), performance p95 < 3s 유지 (Q2)
- **리스크**: 높음. backdrop-filter는 구형 안드로이드 Chrome < 96에서 미지원 → fallback solid bg 필수. 60fps 애니메이션이 지도 리소스와 경쟁.

---

## 5. 위험 / 주의 — Harness Hook 충돌 가능 지점

### H1. 100vh 금지 (`.claude/rules/harness.md` §10)
- Phase 3에서 BottomSheet full 스냅 시 `100dvh` 고수 필수. `100vh` 절대 금지.
- Dynamic Pill 상단 고정 위치는 `env(safe-area-inset-top)` + `dvh` 조합으로만.

### H2. Detour 가중치 보존
- 색 토큰 변경이 **점수 분해 UI**(`CardScoreDetail.tsx`)의 "이탈비용 70% + 근접도 30%" 라벨 텍스트를 건드리지 말 것. PostToolUse hook 트리거.

### H3. Q2 Performance 벤치마크
- `backdrop-filter: blur(20px) saturate(180%)`는 모바일 GPU 비용 큼. 저사양 안드로이드에서 `p95 < 3s` 영향 가능 → Phase 3 이전 **Lighthouse 측정 + reduced-motion/저사양 감지 시 폴백** 필요.
- 카드 리스트 60fps 유지를 위해 `will-change: backdrop-filter` 남용 금지 (메모리).

### H4. 다크모드 파리티 (`pa-mobile-visual.md` §4)
- 신규 glass surface가 다크에서 대비 부족 가능. `--glass-surface` dark variant는 **blur+saturate 없이 opacity만** 낮춰 WCAG AA 4.5:1 유지.
- sem-warn #D97706 dark variant → 밝은 amber로 flip 필요 (대비 검증).

### H5. PA-Daily Golden Route 재실행
- Phase 2 이후 G1~G3 9개 블록 전수 재실행. 특히 Block 4(필터/정렬) — 정렬 활성 시 "Green 강조" 제거로 시각 피드백 달라짐 → FilterChips + SortFilter ink-500 ring 통일로 대체.

### H6. i18n 키 대칭 (harness §10)
- 만약 "BEST" / "+5분" 등의 라벨 텍스트를 바꾸면 `ko.json`/`en.json` 동시 반영 필수.

### H7. Kakao SDK 충돌
- Polyline glow 레이어 추가 시 Kakao Map `kakao.maps.Polyline` 이중 render 비용. 성능 측정 후 결정.
- InfoWindow 커스텀 스타일은 Kakao 기본 템플릿 override라 glass 적용 어려움 → **커스텀 overlay로 교체** 필요 (Phase 3).

### H8. Accessibility
- `prefers-reduced-motion` 존중 규칙(`globals.css:346`)과 Dynamic Pill morph 애니메이션 충돌. transform-only fallback 제공.
- Glass bg + 텍스트 대비 WCAG AA 재검증 (axe-core 스캔 릴리스 전 필수).

---

## 6. 스크린샷 참고 + Mockup Description

### 현재 baseline 스냅샷
- `tests/e2e/mobile-visual.spec.ts-snapshots/mobile-home-empty-mobile-chrome-darwin.png`
- `tests/e2e/mobile-visual.spec.ts-snapshots/mobile-search-overlay-mobile-chrome-darwin.png`
- `tests/e2e/mobile-visual.spec.ts-snapshots/mobile-loading-state-mobile-chrome-darwin.png`

### Mockup A — `mobile-home-empty` after redesign (text description)
```
[ 지도 배경, 경로선 gradient ink-400→ink-600, 출발/도착 마커 glow ring ]
    ↓
[ 상단 플로팅 글래스 검색창 — backdrop-blur(20px), rounded-[28px],
  "어디를 들를까요?" ui-md neutral-500, 좌측 돋보기 icon, 우측 GPS+음성 pill ]

[ 카테고리 가로 스크롤 칩 — 선택된 칩만 ink-500 filled, 나머지 neutral-100
  pill shape, 12px 간격, 이모지 제거하고 icon stroke 1.5 ]

[ (중앙 빈 공간 — 지도 노출) ]

[ 하단 Bottom Sheet (collapsed):
   handle 40x4 rounded-full neutral-300
   "🗺️ 가는 길에 어디 들를까요?" display-lg
   "자주 가는 경로" ui-xs uppercase tracked
   [Glass chip ← ] 강남→여의도·카페   ≡ 스와이프 가로
   [Glass chip] 홍대→잠실·스타벅스

   인기 경로: bento-style 2x2 그리드 card (glass bg + 좌측 아이콘 + 메타) ]

[ 우하단 FAB stack: GPS(ink glow) + Setting(glass) ]
```

### Mockup B — Result List (after Phase 2)
```
[ Sticky glass filter bar — 2단:
   row1: [⚡ 빠른경유] [🔥 지금당장] 2 preset buttons, 활성 시 ink-500 filled
   row2: [영업중] [+5분] [+1km] [📍근접] [미방문]  max 5 visible + ▾ more ]

[ BEST card (index 0):
   ink-glow shadow e-ink
   top-right "BEST" micro-pill ink-500 filled text-[10px]
   Rank circle ① ink-500 filled

   스타벅스 강남 2호점     ui-lg 600 neutral-900
   서울 강남구 테헤란로    ui-sm 500 neutral-500

   ┌──────┬──────┬──────┐
   │+5분  │+0.8km│ 87점 │    num-lg 700 tabular
   └──────┴──────┴──────┘

   [✓ 영업중 neutral chip] [🔥 인기 warn chip]  max 2 + "+2개"
   ━━━━━━━▓▓▓ (2px full-width mini bar, ok→warn gradient)

   ─────────────────────
   🧭 카카오내비으로 시작    (primary ink-500 CTA, full width)
   ⭐  📋  ⋯                (우측 작은 icon tray) ]

[ Regular cards (same structure, no glow, no BEST pill) ]

[ Sticky bottom mini-pill bar — glass e4
   ① 스타벅스 +5분 · 87점     [🚀 바로 출발] ink-500 CTA ]
```

### Mockup C — Dynamic Pill (top-center)
```
idle:        [ · ]                    (1px dot, ink-500 glow, 32x8)
loading:     [ ● ● ● 매장 탐색 중 ]   (morph to 240x32, 3-stage progress)
toast:       [ ✓ 주소가 복사됐어요 ]  (2.5s auto dismiss)
offline:     [ ⚠ 오프라인 — 세션 복원 ] (amber tint)
result:      [ 🏆 10개 발견 · 최단 +5분 ] (3s, 탭하면 베스트픽으로 이동)
```

---

## 7. 요약 체크리스트 (실행 순서)

- [ ] **Phase 1**: theme.css 신규 토큰 추가 + legacy alias → Visual 스냅샷 재생성 → PR
- [ ] **Phase 2**: StatPod 컴포넌트 → ResultCard 재설계 → CompactCard 연동 → PA-Matrix D 전수 → Visual 5뷰포트
- [ ] **Phase 3**: DynamicPill 컴포넌트 → Glass stack → Polyline gradient → performance p95 재측정
- [ ] 다크모드 대비 axe-core 전구간 스캔
- [ ] `prefers-reduced-motion` / 저사양 감지 fallback path 구현
- [ ] PA-Daily Golden Route 재실행 (G1/G2/G3)
- [ ] i18n 키 대칭 검증 (ko/en 동일 라벨)

---

## 부록 — 관련 파일 경로 (재작업 시 참조)

**토큰/테마**:
- `/Users/radar/Work/MidWayDer/src/app/theme.css`
- `/Users/radar/Work/MidWayDer/src/app/globals.css`

**카드 UI**:
- `/Users/radar/Work/MidWayDer/src/components/search/result-list/ResultCard.tsx`
- `/Users/radar/Work/MidWayDer/src/components/search/result-list/CompactCard.tsx`
- `/Users/radar/Work/MidWayDer/src/components/search/result-list/CardBadges.tsx`
- `/Users/radar/Work/MidWayDer/src/components/search/result-list/CardScoreDetail.tsx`
- `/Users/radar/Work/MidWayDer/src/components/search/result-list/StickyBar.tsx`
- `/Users/radar/Work/MidWayDer/src/components/search/result-list/FilterChips.tsx`
- `/Users/radar/Work/MidWayDer/src/components/search/result-list/EmptyState.tsx`

**오버레이/Sheet**:
- `/Users/radar/Work/MidWayDer/src/components/search/SearchOverlay.tsx`
- `/Users/radar/Work/MidWayDer/src/components/search/BottomQuickBar.tsx`

**스냅샷**:
- `/Users/radar/Work/MidWayDer/tests/e2e/mobile-visual.spec.ts-snapshots/`

---

**제안 종료**. 구현은 본 문서 채택 후 `build` 하네스로 진입하여 Phase 1부터 순차 진행.
