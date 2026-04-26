# Hex → Token 매핑 테이블

현재 코드에 남아있는 hex/rgba 리터럴을 **어떤 토큰으로 치환할지** 결정하는 룩업 표.

**쓰는 법**: 파일에서 hex 발견 → 이 표에서 의미 찾음 → 정확히 치환. "상황상 어떤 semantic 인가" 는 §사용 맥락 참고.

**관련**:
- 규약: [`.claude/rules/design-system.md`](../../.claude/rules/design-system.md) §1
- 토큰 원본: [`src/app/theme.css`](../../src/app/theme.css)
- 마이그레이션 체크리스트: [`./component-migration-checklist.md`](./component-migration-checklist.md)

---

## 0. 의사결정 플로우

```
hex 리터럴 발견
  │
  ├─ accent 7테마 500 중 하나? (#3274f9, #6366f1, #8b5cf6, #06b6d4,
  │                               #10b981, #f43f5e, #64748b)
  │     → Hook block. 무조건 var(--accent) 또는 rgba(var(--color-accent-rgb), X).
  │
  ├─ status 의미 (success/warning/error/info)?
  │     → var(--color-{role}-{50|100|500|700}) 또는 current variant
  │
  ├─ accent 의 연한/진한 변형?
  │     → var(--color-accent-{50..950}) 또는 var(--accent-{weak|light|dark})
  │
  ├─ 중립 회색 (텍스트/테두리/배경)?
  │     → var(--text-*) / var(--border-*) / var(--bg-*) / var(--surface-*)
  │
  ├─ 아주 연한 tint 오버레이?
  │     → var(--overlay-{hover|press|selected}) 또는
  │        color-mix(in srgb, var(--accent) X%, transparent)
  │
  └─ DOM 바깥 (SVG data URI, Kakao SDK 직접 전달)?
        → theme-colors.ts 헬퍼 경유 (getAccentColor 등)
```

---

## 1. Accent / Brand

**원칙**: brand 는 `--accent` 하나만. 런타임에 선택된 테마에 따라 바뀜.

| Hex 리터럴 | 의미 | 치환 |
|-----------|------|------|
| `#3274f9` `#3274F9` | blue 500 (기본 브랜드) | `var(--accent)` 또는 `var(--color-accent-500)` |
| `#6366f1` | indigo 500 | 동일 — accent semantic 경유 |
| `#8b5cf6` | violet 500 | 동일 |
| `#06b6d4` | teal 500 | 동일 |
| `#10b981` | emerald 500 | 동일 |
| `#f43f5e` | rose 500 | 동일 (error 역할이면 `--color-error-500` 쓸 것) |
| `#64748b` | slate 500 | 동일 (중립 의미면 `--text-secondary`) |
| `#5B93FA` / `#5b93fa` | blue accent-light | `var(--accent-light)` 또는 `var(--color-accent-400)` |
| `#1E5CD9` / `#1e5cd9` | blue accent-dark | `var(--accent-dark)` 또는 `var(--color-accent-600)` |
| `#2563eb` | blue 600 | `var(--color-accent-600)` |
| `#1d4ed8` | blue 700 | `var(--color-accent-700)` |
| `#93c5fd` | blue 300 | `var(--color-accent-300)` |
| `#60a5fa` | blue 400 | `var(--color-accent-400)` |
| `#dbeafe` | blue 100 (accent-weak) | `var(--accent-weak)` 또는 `var(--color-accent-100)` |
| `#eff6ff` | blue 50 | `var(--color-accent-50)` |
| `#EBF5FF` | blue 100 유사 | `var(--color-accent-100)` |

**예외 (허용)**
- `theme.css` 안 토큰 선언부
- `<meta name="theme-color" content="#3274f9">` — 브라우저가 `var()` 미지원
- `AppearanceSettings.tsx` 스와치 시각화 (`SWATCH_HEX` 배열)
- `theme-colors.ts` SSR 폴백 상수

---

## 2. Status — Success (초록)

| Hex | 의미 | 치환 |
|-----|------|------|
| `#16a34a` | success 500 | `var(--color-success-500)` |
| `#15803d` | success 700 | `var(--color-success-700)` |
| `#22c55e` | 다크 success (토큰에 있음) | `var(--color-success-current)` (라이트는 500, 다크는 22c55e 자동) |
| `#34D399` / `#34d399` | 다크 success light variant | `var(--success)` (다크면 자동 밝은값) |
| `#4CAF50` | 구 kakao-success | `var(--success)` |
| `#dcfce7` | success 100 | `var(--color-success-100)` |
| `#f0fdf4` | success 50 | `var(--color-success-50)` |
| `#e6f7ed` | 구 green-100 | `var(--color-success-100)` |
| `#d1fae5` | success 100 variant | `var(--color-success-100)` |
| `#86efac` | 구 success 200 (토큰 없음) | `var(--color-success-100)` 근사 또는 border 는 `--color-success-500` |
| `#6ee7b7` | 구 success 300 (토큰 없음) | 위와 동일 |
| `#ecfdf5` | 구 green-50 | `var(--color-success-50)` |
| `#10b981` | emerald 500 = accent, success 700 유사 | **맥락에 따라**: accent 의미면 `var(--accent)`, success 의미면 `var(--color-success-700)` |

---

## 3. Status — Warning (주황)

| Hex | 의미 | 치환 |
|-----|------|------|
| `#d97706` | warning 500 | `var(--color-warning-500)` |
| `#b45309` | warning 700 | `var(--color-warning-700)` |
| `#f59e0b` | 다크 warning | `var(--color-warning-current)` |
| `#FF6B00` | 구 kakao-secondary | `var(--color-warning-500)` |
| `#FF8C42` | 다크 warning 변형 | `var(--warning)` |
| `#fef3c7` | warning 100 | `var(--color-warning-100)` |
| `#fffbeb` | warning 50 | `var(--color-warning-50)` |
| `#fff4e5` | 구 orange-100 | `var(--color-warning-100)` |
| `#fff7ed` | 구 orange-200 | `var(--color-warning-50)` 또는 `--color-warning-100` |
| `#ffb366` | 구 orange-500 | `var(--color-warning-500)` |
| `#fbbf24` | 구 yellow-400 | `var(--color-warning-500)` 또는 `--yellow-400` (남아있는 palette) |
| `#facc15` | yellow-500 | palette `--yellow-500` 유지 or 목적에 맞춰 warning |
| `#f97316` / `#FB923C` / `#fb923c` | 구 orange-500/700 | `var(--color-warning-700)` |
| `#ea580c` | 구 orange 더 진한 | `var(--color-warning-700)` |
| `#c2410c` / `#C2410C` | 구 orange-800 | `var(--color-warning-700)` |
| `#92400e` | 구 yellow-700/amber | `var(--color-warning-700)` |
| `#fed7aa` | orange-200 변형 | `var(--color-warning-100)` |

**주의**: 기존 `--yellow-*` / `--orange-*` palette 은 backward-compat alias 로 유지. 완전 삭제는 나중에. 지금은 **semantic 이 맞으면 `--color-warning-*`** 선호.

---

## 4. Status — Error (빨강)

| Hex | 의미 | 치환 |
|-----|------|------|
| `#dc2626` | error 500 | `var(--color-error-500)` |
| `#b91c1c` | error 700 | `var(--color-error-700)` |
| `#ef4444` | 중간 red-500 | `var(--color-error-500)` |
| `#f87171` | 다크 error | `var(--color-error-current)` |
| `#e85d5d` | 구 red-500 | `var(--color-error-500)` |
| `#fff1f2` | error 50 | `var(--color-error-50)` |
| `#ffe4e6` | error 100 | `var(--color-error-100)` |
| `#fee2e2` | 구 red-100 | `var(--color-error-100)` |

**주의**: `#f43f5e` 는 **rose theme 500** (Hook block 대상). error 용도면 `var(--color-error-500)` 로 갈아치울 것. 진짜 rose 테마 스와치 시각화면 예외.

---

## 5. Status — Info (파랑)

주로 알림/안내 배너.

| Hex | 의미 | 치환 |
|-----|------|------|
| `#0284c7` | info 500 | `var(--color-info-500)` |
| `#0369a1` | info 700 | `var(--color-info-700)` |
| `#38bdf8` | 다크 info | `var(--color-info-current)` |
| `#f0f9ff` | info 50 | `var(--color-info-50)` |
| `#e0f2fe` | info 100 | `var(--color-info-100)` |
| `#0f766e` | teal 700 (info-ish) | 맥락 따라 `var(--color-info-700)` 또는 `--color-accent-700` (teal 테마) |

---

## 6. 중립 회색 (텍스트 / 테두리 / 배경)

| Hex | 역할 | 치환 |
|-----|------|------|
| `#1a1a1a` | 거의 검정 텍스트 | `var(--text-strong)` |
| `#1f2937` | 본문 진한 회색 | `var(--text-primary)` |
| `#2d3748` | 강조 회색 | `var(--text-strong)` |
| `#374151` | 진한 회색 | `var(--text-primary)` (다크 모드면 `--text-strong`) |
| `#4B5563` / `#4b5563` | 진한 회색 | `var(--text-secondary)` 또는 다크 `--border-strong` |
| `#6B7280` / `#6b7280` | 보조 텍스트 | `var(--text-secondary)` |
| `#8b95a5` | 흐린 회색 | `var(--text-muted)` |
| `#9CA3AF` / `#9ca3af` | 비활성 텍스트 | `var(--text-tertiary)` |
| `#c4ccd8` | 더 흐린 | `var(--text-disabled)` |
| `#cbd5e1` | neutral-300 | `var(--color-neutral-300)` 또는 `--border-strong` |
| `#d1d5db` | 강한 테두리 | `var(--border-strong)` |
| `#e2e8f0` | neutral-200 | `var(--color-neutral-200)` 또는 `--border-soft` |
| `#e5e7eb` | 연한 테두리 | `var(--border-soft)` |
| `#f1f5f9` | neutral-100 | `var(--color-neutral-100)` 또는 `--bg-surface-muted` |
| `#f2f4f7` | 연한 배경 | `var(--bg-surface-muted)` |
| `#f3f4f6` | 연한 배경 | `var(--bg-surface-muted)` (fallback 형태 OK) |
| `#F3F4F6` | 동일 | 동일 |
| `#f5f5f7` | 앱 배경 | `var(--bg-app)` 또는 `--surface-0` |
| `#F5F5F5` | kakao-bg | `var(--bg-app)` |
| `#f6f7f9` | 앱 배경 | `var(--surface-0)` |
| `#f8fafc` | neutral-50 | `var(--color-neutral-50)` |
| `#f9fafb` / `#F9FAFB` | 아주 연한 | `var(--surface-0)` 또는 `--bg-app` |
| `#ffffff` / `#fff` | 순백 (카드 배경) | `var(--surface-1)` 또는 `--bg-surface` |
| `#0f172a` | neutral-900 (다크 surface-1) | `var(--surface-1)` (다크 모드에서 자동) |
| `#1e293b` | neutral-800 (다크 accent-weak) | `var(--accent-weak)` |
| `#0b1020` | app bg 다크 | `var(--surface-0)` |

---

## 7. 특수 오버레이 / 그림자 rgba

| Rgba 리터럴 | 의미 | 치환 |
|------------|------|------|
| `rgba(0, 0, 0, 0.05)` | 미묘한 그림자 | **내부 토큰화 필요 없음** — `var(--shadow-1)` 로 통합 |
| `rgba(0, 0, 0, 0.06)` | 미묘 그림자 | `var(--shadow-1)` |
| `rgba(0, 0, 0, 0.08)` | card hover | `var(--shadow-2)` |
| `rgba(0, 0, 0, 0.1)` `rgba(0, 0, 0, 0.10)` | 보통 그림자 | `var(--shadow-3)` |
| `rgba(0, 0, 0, 0.15)` | 진한 그림자 | `var(--shadow-3)` or `--shadow-4` |
| `rgba(0, 0, 0, 0.18)` | Info window | `var(--shadow-3)` |
| `rgba(0, 0, 0, 0.3)` / `0.35` / `0.45` | 마커 큰 그림자 | `var(--shadow-3)` or `--shadow-4` |
| `rgba(0, 0, 0, 0.48)` | 모달 뒷배경 | `var(--overlay-scrim)` |
| `rgba(0, 0, 0, 0.72)` | 툴팁 배경 | 필요시 `var(--surface-5)` + text-on-surface 흰색 |
| `rgba(255, 255, 255, 0.25)` | 글라스 오버레이 | `color-mix(in srgb, white 25%, transparent)` 또는 `--bg-overlay` |
| `rgba(50, 116, 249, X)` | blue accent rgba | **Hook block.** → `rgba(var(--color-accent-rgb), X)` |
| `rgba(139, 92, 246, X)` | violet accent rgba | **Hook block.** 동일 |
| `rgba(34, 197, 94, X)` | success accent rgba | `color-mix(in srgb, var(--color-success-500) Y%, transparent)` (X=0.08 → Y=8%) |
| `rgba(59, 130, 246, X)` | 일반 blue rgba | `rgba(var(--color-accent-rgb), X)` or `color-mix` |

**`color-mix` vs `rgba(var(--rgb), X)` 언제?**
- 단순 alpha 변형: `rgba(var(--color-accent-rgb), 0.1)` — 깔끔
- 다른 색 섞음: `color-mix(in srgb, var(--accent) 20%, transparent)` — 브라우저 111+ 필요
- 프로젝트에 `--color-accent-rgb` / `--color-success-rgb` 등 있으면 rgba 형태 선호 (구형 호환성)
- 없으면 color-mix 경유

**주의**: Status 색에는 rgb 튜플 토큰 아직 없음. 필요하면 `theme.css` 에 `--color-success-rgb: 22, 163, 74;` 추가 후 쓸 것.

---

## 8. Purple / Pink / Yellow — palette 유지 or 전환?

현재 token 에 아직 남은 palette:
- `--purple-100`, `--purple-700`
- `--pink-100`, `--pink-500`
- `--yellow-100`, `--yellow-600`, `--yellow-700`

| Hex | 현재 매핑 | 처리 방침 |
|-----|----------|-----------|
| `#7c3aed` `#6d28d9` | purple-700 / violet-700 | palette `--purple-700` 유지 OK (보라는 violet 테마와 다른 맥락에서 쓰임 — 점수 시각화 등) |
| `#a78bfa` `#a855f7` | purple light | `--purple-700` 에 맞는 light variant 없음 — 임시 로 하드 유지 or `color-mix(--purple-700, transparent X%)` |
| `#ddd6fe` `#ede9fe` `#f5f3ff` | purple 50/100/200 | `--purple-100` 또는 accent 변형으로 |
| `#fee500` `#facc15` `#eab308` | yellow | `--yellow-500/600/700` 유지 (kakao 브랜드색 포함) |
| `#ec4899` `#fff0f3` `#ff8fa3` | pink | `--pink-100/500` 유지 |
| `#fef08a` | yellow-200 | `--yellow-100` 근사 |

**정책**: palette 토큰은 **backward-compat 레이어로 유지**. 새 코드는 가급적 semantic 우선. 완전 삭제는 Phase 3 이후.

---

## 9. 지도 마커 / 외부 SDK 전달용

JSX style 이 아닌 **문자열 템플릿 / SVG data URI / Kakao SDK 직접 전달**.

```tsx
import { getAccentColor, getSuccessColor, getErrorColor } from '@/lib/theme-colors';

const accent = getAccentColor();   // 현재 활성 테마의 --accent 런타임 해석
const success = getSuccessColor();
```

**사용처 예**
- `KakaoWaypointMarker.tsx` — SVG data URI markerImage
- `WaypointMarker.tsx` — Naver InfoWindow content
- `KakaoRoutePolyline.tsx` / `RoutePolyline.tsx` — polyline `strokeColor` 옵션

**주의**: 테마 바뀌면 **재렌더가 필요**. 마커는 selectedId 변화 시 재생성되니 OK. 폴리라인은 path 바뀔 때만 재생성이므로, 테마 변경 이벤트 리스너 추가해서 `setOptions({ strokeColor: getAccentColor() })` 호출 권장 (TODO).

---

## 10. 발견 즉시 매핑 안 되는 hex

아래 중 하나면 **일단 남겨두고** 설계 상의 → 규약 업데이트 이슈로 등록:

- 매우 좁은 상황용 색 (예: 특정 카테고리 아이콘 색)
- 디자이너가 의도적으로 고정시킨 브랜드 보조 색 (카카오 노랑 등)
- 에러 로그 바 / 디버그용 UI

임시 에스케이프:
```css
color: var(--my-edge-case, #abc123);
```
→ 이후 토큰 추가 시 fallback 제거.

---

## 11. grep 레시피 (발견용)

```bash
# 전체 hex 정렬된 카운트
grep -rhEo "#[0-9a-fA-F]{6}" src --include="*.tsx" --include="*.ts" | sort | uniq -c | sort -rn

# 특정 hex 위치 찾기
grep -rn "#3274" src --include="*.tsx"

# accent rgba 튜플 전체 검색
grep -rhEo "rgba\(\s*[0-9]+,\s*[0-9]+,\s*[0-9]+" src --include="*.tsx" | sort -u

# color-mix 이미 사용 중인 곳
grep -rn "color-mix" src --include="*.tsx"
```

---

## 12. 규약 위반 자가 점검

한 파일 치환 후 아래 3개 돌려봄:

```bash
# 1. 해당 파일에 accent 7테마 hex 남았나
grep -E "#(3274[fF]9|6366[fF]1|8[bB]5[cC][fF]6|06[bB]6[dD]4|10[bB]981|[fF]43[fF]5[eE]|64748[bB])" src/components/path/to/file.tsx

# 2. accent rgb 튜플 남았나
grep -E "rgba\(\s*(50,\s*116,\s*249|99,\s*102,\s*241|139,\s*92,\s*246|6,\s*182,\s*212|16,\s*185,\s*129|244,\s*63,\s*94|100,\s*116,\s*139)" src/components/path/to/file.tsx

# 3. Hook 이 통과하나 (실제 Hook 스크립트 돌려봄)
echo '{"tool_input": {"file_path": "'$PWD'/src/components/path/to/file.tsx", "content": "'"$(cat src/components/path/to/file.tsx | head -c 50000)"'"}}' | bash .claude/hooks/color-hardcoding-guard.sh
```

세 개 다 깨끗하면 해당 파일 색 규약 통과.
