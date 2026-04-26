# MidWayDer 2026 모바일 인터랙션 현대화 제안

**작성일**: 2026-04-21
**대상**: MidWayDer Next.js PWA (모바일 우선)
**범위**: 인터랙션 / 제스처 / Bottom Sheet / 터치 / 뷰포트
**제약**: Web only. `100vh` 금지 (`100dvh` 강제). 무거운 라이브러리 추가 금지.

---

## 1. 현재 모바일 인터랙션 진단

### 1.1 이미 잘 되는 것 (Keep)

| 영역 | 현황 | 증거 |
|------|------|------|
| 카드 스와이프 | 80px threshold로 복사/네비 액션 | `ResultList.tsx` + `useSwipe.ts` hook |
| 스와이프 힌트 | 최초 1회 흔들기 애니메이션 + `localStorage` flag | `swipeHintId`/`swipeHintDeltaX` state |
| Sticky Mini Bar | 스크롤 임계 시 하단 고정, 베스트픽 요약 | `StickyBar.tsx` + `useStickyObserver` |
| Bottom Sheet | collapsed/half/full 3단 스냅 props 존재 | `BottomQuickBar.tsx` `setBottomSheetSnap` |
| Safe Area | 13곳 `env(safe-area-inset-*)` 적용 | `globals.css` §1.2, §v0.68.0 |
| 100dvh 강제 | Hook이 `100vh` 블록, iOS 주소창 회귀 방지 | `harness.md` §10 |
| Touch 피드백 | `active:scale(0.97)` GPU 가속 | `globals.css:358-363` |
| Prefers-reduced-motion | 시스템 설정 존중 | `globals.css:346-355` |
| 키보드 대응 | `.keyboard-aware` / `.keyboard-hide` / `.keyboard-fixed` 유틸 | `globals.css:223-245` |
| Compact 카드 터치 타겟 | 44×44 명시적 보장 (`min-w-[44px] min-h-[44px]`) | `CompactCard.tsx:148, 159, 167, 177` |

### 1.2 2026 트렌드 대비 빠진 것 (Gap)

| Gap | 영향도 | 비고 |
|-----|-------|------|
| Haptic 피드백 0건 | 높음 | Swipe 성공/실패 체감 차 거의 없음 |
| Bottom Sheet 드래그 핸들 제스처 없음 | 높음 | 현재 snap 전환은 코드 호출로만 — 손가락 드래그 unavailable |
| Spring easing 부재 (거의 `ease-out` 일괄) | 중간 | Apple HIG식 `cubic-bezier(0.32, 0.72, 0, 1)`은 일부만 적용 |
| Pull-to-refresh 없음 | 중간 | 재검색 = "🔄 이 지역 재검색" 버튼 의존 |
| Scroll-linked header shrink 없음 | 중간 | 헤더 섹션 접기는 수동 `▲/▼` 버튼 |
| 지도↔리스트 Peek Preview 부재 | 높음 | `hoveredWaypointId` 동기화는 있지만 시각적 peek는 없음 |
| Progressive blur 부재 | 낮음 | 로딩은 3단계 텍스트 인디케이터만 |
| Live Activity 스타일 고정 바 | 중간 | `nowMs` 카운트다운은 카드 내부에만 |
| 카테고리 칩 snap-scroll 없음 | 낮음 | 현재 `scrollbar-hide` + 자유 스크롤 |
| stacked modal depth/parallax | 낮음 | SearchOverlay + SaveRouteDialog + Toast 3중첩 시 평평함 |

---

## 2. 2026 모바일 인터랙션 트렌드 평가

> ⭐⭐⭐ 적극 도입 권장 / ⭐⭐ 선별 도입 / ⭐ 검토만

| # | 트렌드 | 평가 | MidWayDer 적합성 |
|---|--------|------|-------------------|
| T1 | **Fluid gesture-driven bottom sheet** (드래그로 collapsed↔half↔full) | ⭐⭐⭐ | `BottomQuickBar` + `FavoritesList`가 이미 3 snap 개념을 가짐. 드래그 핸들만 붙이면 immediate win |
| T2 | iOS 17/18 stacked modal + parallax | ⭐ | 중첩 modal 드문 편. 비용 대비 체감 낮음 |
| T3 | **Haptic 모사 (Web Vibration API + CSS motion)** | ⭐⭐⭐ | Swipe 성공 / 즐겨찾기 토글 / 베스트픽 탭 — 즉시 효과. Android만 `navigator.vibrate`, iOS는 CSS shake fallback |
| T4 | **Spring animation on card entry (CSS cubic-bezier)** | ⭐⭐⭐ | 이미 `card-stagger` 존재하나 easing이 `ease-out`. Spring curve로 교체 가능 (무비용) |
| T5 | **Expressive pull-to-refresh → Detour 재검색** | ⭐⭐⭐ | 현재 "🔄 이 지역 재검색" 버튼을 제스처로 승격. 데이터 갱신 UX 일체감 크게 향상 |
| T6 | **Sticky peek preview (지도↔리스트 겹쳐 보기)** | ⭐⭐ | half-snap 상태에서 지도 일부 + 리스트 상단 동시 노출 — 이미 가까운 설계. snap 전환 애니메이션만 개선 |
| T7 | **Scroll-linked shrinking header** | ⭐⭐ | `ResultHeader` 높이가 크다. 스크롤 시 로고/필터 축소 → 카드 영역 확장 |
| T8 | **Magnetic snap scroll for category chips** | ⭐⭐ | `CategoryChips` 가로 스크롤에 `scroll-snap-type: x mandatory` 적용 — CSS만으로 완성 |
| T9 | Blur overlay + progressive reveal (로딩) | ⭐⭐ | 3단계 인디케이터를 backdrop-blur + 점진 공개로 대체. 체감 속도 ↑ |
| T10 | **Live Activity-style persistent bar (출발 카운트다운)** | ⭐⭐⭐ | 사용자가 "지금 출발" 선택 시 Sticky Mini Bar에 ETA 실시간 + 경로 요약 노출. 이미 `isNowDeparture` state 존재 |

**최우선 5개**: T1 (Sheet drag), T3 (Haptic), T4 (Spring), T5 (Pull-to-refresh), T10 (Live Activity Bar)

---

## 3. ResultCard v2 인터랙션 제안

### 3.1 현재 인터랙션 맵

| 제스처 | 현재 동작 | 임계값 |
|--------|----------|-------|
| 탭 (짧은) | 카드 선택 + 지도 카메라 이동 | - |
| 좌 스와이프 | 복사 토스트 | 80px |
| 우 스와이프 | 네비 앱 선택 시트 | 80px |
| 카드 내 버튼 탭 | 즐겨찾기/Copy/⋯ 메뉴 | - |
| 길게 누르기 | **없음** | - |

### 3.2 v2 제안

| 제스처 | 신규 동작 | 구현 난이도 |
|--------|----------|-------------|
| **Long press (500ms)** | Context menu 표시 — 미니 미리보기 카드 + 퀵액션 4개 (복사/네비/공유/핀) | Med |
| **Double tap** | 즐겨찾기 토글 (별 채워짐 + haptic pulse) | Low |
| **Pinch-in** (2-finger) | 컴팩트 모드 전환 (현재 `≡/☰` 토글과 동일 결과) | Med |
| Swipe with velocity | 빠른 플릭 시 threshold 80→60px 낮춤 (velocity 기반) | Med |
| Swipe 상하 (±30px 허용) | 실수 방지: 세로 움직임 우세 시 스와이프 취소 (현재도 `useSwipe`에 있을 것 같지만 명시) | Low |

### 3.3 Haptic 매핑 (T3)

| 이벤트 | Vibration API (Android) | CSS fallback (iOS) |
|-------|-------------------------|---------------------|
| 스와이프 성공 (복사/네비 발동) | `navigator.vibrate(10)` | `transform: translateX` bounce 2회 |
| 즐겨찾기 토글 | `navigator.vibrate([5, 10, 5])` | `scale(1.1)` 150ms |
| 베스트픽 배너 탭 | `navigator.vibrate(15)` | shadow pulse |
| 로딩 단계 전환 | `navigator.vibrate(3)` | - |
| Threshold 도달 경고 (스와이프 60px) | `navigator.vibrate(2)` | `transform: scale(1.01)` |

**가드**: `if ('vibrate' in navigator && !prefersReducedMotion)` 필수.

---

## 4. Bottom Sheet 3단계 스냅 제안

### 4.1 현재 상태

- `setBottomSheetSnap: 'collapsed' | 'half' | 'full'` props 존재 (`BottomQuickBar.tsx:15`)
- 실제 드래그 핸들 `bottom-sheet-handle` CSS 클래스는 `globals.css:104-110`에 있지만 **제스처 핸들러 부재**
- 상태 전환은 검색 완료 후 `setBottomSheetSnap('half')` 코드 호출로만 발생

### 4.2 제안 — Fluid Drag Sheet (T1)

```
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│                  │   │                  │   │      ━━━ (핸들)   │
│      지도        │   │      지도        │   │   결과 리스트    │
│                  │   │                  │   │                  │
│                  │   │     ━━━ (핸들)    │   │                  │
│                  │   │   베스트 3개     │   │                  │
│     ━━━ (핸들)    │   │                  │   │                  │
└──────────────────┘   └──────────────────┘   └──────────────────┘
   collapsed (15%)        half (55%)            full (90%)
```

### 4.3 스냅 규칙

| 스냅 | 높이 | 노출 콘텐츠 | 사용 맥락 |
|-----|------|-----------|-----------|
| **collapsed** | `15dvh` (약 130px) | Sticky Mini Bar만 (베스트픽 이름 + 바로출발) | 지도 탐색 중 |
| **half** | `55dvh` | Mini Bar + 결과 카드 3~4개 + 필터 칩 | 기본 검색 결과 |
| **full** | `90dvh` (top safe-area 제외) | 헤더 + 전체 리스트 + 차트 + 프리셋 | 상세 비교 |

### 4.4 제스처 규칙

| Input | 동작 |
|-------|------|
| 핸들 영역 드래그 | 실시간 `transform: translateY` — velocity 추적 |
| 드래그 종료 시 가장 가까운 스냅으로 스프링 애니메이션 | `cubic-bezier(0.32, 0.72, 0, 1)` 400ms |
| 빠른 플릭 (> 0.5px/ms) | 한 단계 더 진행 (collapsed → half → full) |
| 스냅 임계의 20% 넘으면 다음 스냅으로 확정 | rubberband 아님 |
| 키보드 올라올 시 full 자동 강제 + `keyboard-aware` 적용 | 입력 편의 |

### 4.5 구현 제약

- React state 기반 `translateY` + `touchmove` throttle은 60fps 위험 → `transform` + `will-change` + `useRef`로 DOM 직접 조작 권장
- 드래그 중 body scroll lock (`overscroll-behavior: contain` 이미 `body`에 적용됨)
- iOS 바운스 방지: drag 영역에 `touch-action: none`

---

## 5. Touch Target 재검증 (44×44)

### 5.1 최근 수정됨 (CompactCard.tsx)

| 버튼 | 상태 | 크기 |
|------|------|------|
| 즐겨찾기(Star) | OK | `min-w-[44px] min-h-[44px]` |
| 네비(Navigation) | OK | `min-w-[44px] min-h-[44px]` |
| 방문(Circle/CheckCircle) | OK | `min-w-[44px] min-h-[44px]` |
| 핀(Bookmark) | OK | `min-w-[44px] min-h-[44px]` |

### 5.2 재검증 필요 — 추정 위험 영역

| 위치 | 예상 문제 | 검증 방법 |
|------|----------|----------|
| `ResultCard.tsx` 전체 카드 모드 액션 (7→3 축소 후의 `⋯` 메뉴) | 펼쳐진 Phone/Share/Visit/Pin/Memo 아코디언 각 항목 44px 보장? | Playwright `toHaveCSS('min-height', /4[4-9]px|[5-9]\dpx/)` |
| `FilterChips.tsx` 필터 칩 (🟢영업중 / 📏+1km 등) | py-1.5 = ~28px, 높이 부족 가능 | 시각 측정 + axe |
| `SearchOverlay.tsx` 오버플로 버튼 (X, 🔄, 🎤) | 48px `btn-icon` 클래스 적용 여부 확인 | grep `btn-icon` |
| `StickyBar.tsx` 🚀 바로 출발 버튼 | `px-4 py-2` = 가로 OK, 세로 ~32px (부족) | min-h 추가 필요 |
| 카드 내 🥇 베스트픽 배너 `<button>` (점수 분해 토글) | 텍스트만 탭 영역 — 경계 불명 | padding 확대 필요 |
| 시간 pill 버튼 (+30분/+1시간/+2시간) | py-1 = ~24px, 명백히 부족 | **수정 필요** |
| 체류시간 pill (5/10/15/20/30분) | 동일 이슈 | **수정 필요** |
| RelatedCategories 칩 | 가로 스크롤 + 작은 padding | 재검증 |

### 5.3 처방

- 모든 pill 버튼에 `min-height: 36px` 최소 + 인접 8px gap
- `.btn-touch` / `.btn-icon` 유틸 클래스(`globals.css:133-144`)의 **실제 적용률 감사** — opt-in 방식이라 놓친 곳이 많을 가능성

---

## 6. Safe-area + Dynamic Viewport 현황

### 6.1 양호

- `BottomQuickBar.tsx:34`: `pb-[max(0.75rem,env(safe-area-inset-bottom))]` ✅
- `globals.css` `.safe-top` / `.safe-bottom` / `.safe-sides` / `.safe-all` 유틸 준비
- 100dvh 강제는 Hook이 담보

### 6.2 강화 필요

| 포인트 | 현상 | 제안 |
|-------|------|------|
| StickyBar의 bottom 고정 | `sticky bottom-0` — safe-area-inset-bottom 미반영 | `bottom: env(safe-area-inset-bottom)` 또는 래퍼에 `.safe-bottom` 추가 |
| SearchOverlay 상단 | 검색창이 노치 영역 간섭 가능 | `.safe-top-full` 적용 상태 grep으로 확인 |
| Bottom Sheet drag handle | Safe-area 하단에서 핸들 시각 위치 보장 | full-snap 상태일 때 `env(safe-area-inset-top)` 높이만큼 내려서 시작 |
| 가로 모드 (`orientation: landscape`) | `globals.css:274-294` 가로 모드 축소 규칙 있음 | 좌우 Safe-area까지 포함해 `.safe-sides` 더 적용 |
| 지도 Kakao SDK 컨트롤 UI | 지도 우하단 컨트롤이 홈 인디케이터와 겹칠 위험 | 지도 래퍼에 `padding-bottom: env(safe-area-inset-bottom)` or MapContainer `bottom` offset |

### 6.3 Dynamic Viewport 활용

- `100dvh`는 적용됨. 추가로 `svh` / `lvh` 용도 분리 고려:
  - `100svh` (작은 뷰포트 = 주소창 표시 상태): 중요 콘텐츠는 항상 이 범위 내
  - `100lvh` (큰 뷰포트 = 주소창 숨김 상태): 시각 장식만 허용
- 현재 `.keyboard-aware`는 `100dvh` 사용 — 그대로 유지

---

## 7. 구현 난이도 표 & PA Matrix 매핑

| # | 제안 | 난이도 | 예상 LOC | PA Matrix 영역 | Visual Snapshot 필요 | 회귀 위험 |
|---|------|:-----:|:--------:|:--------------|:--------------------:|:---------:|
| T1 | Bottom Sheet 드래그 (3 snap) | **High** | 200~300 | H1 (Map Provider), F (리스트) | ✅ 신규 5개 (snap별) | Medium — 지도↔리스트 겹침, 100dvh 회귀 주의 |
| T3 | Haptic 피드백 (Vibration API + CSS) | **Low** | 40~80 | D3 (카드 액션), F1 (스와이프) | ❌ | Low |
| T4 | Spring easing 통일 (`card-stagger` + 전환) | **Low** | ~30 | D (카드 UI) 전체 | ✅ 기존 snapshot 갱신 | Low |
| T5 | Pull-to-refresh → 재검색 | **Med** | 120~180 | F (리스트), C1 (/api/search) | ✅ 신규 1개 (pull 진행 상태) | Medium — 과도 트리거로 API 쿼터 소모 방지 필요 |
| T6 | Sticky Peek Preview (half snap 시각 개선) | **Med** | 60~100 | H2 (마커 동기화), F | ✅ 신규 1개 | Low |
| T7 | Scroll-linked shrinking header | **Med** | 80~120 | D (ResultHeader), F4 | ✅ 신규 2개 (축소 전/후) | Medium — sticky 스택 간섭 |
| T8 | Category chip snap-scroll (CSS only) | **Low** | ~15 (CSS) | D (CategoryChips) | ❌ | Low |
| T9 | Blur overlay + progressive reveal (로딩) | **Med** | 100~150 | I2 (로딩 인디케이터) | ✅ 신규 1개 | Low |
| T10 | Live Activity 스타일 Sticky Bar | **Med** | 80~120 | F, `StickyBar.tsx` | ✅ 갱신 1개 | Low — `nowMs` state 이미 존재 |
| C1 | ResultCard Long press 메뉴 | **Med** | 100~140 | D3 (CardActions) | ✅ 신규 1개 | Medium — 스와이프와 제스처 충돌 가능 |
| C2 | ResultCard Double tap 즐겨찾기 | **Low** | ~30 | D3 | ❌ | Low |
| C3 | Touch target 감사 + pill 버튼 수정 | **Low** | ~50 | D, E, J3 | ✅ 기존 갱신 | Low |
| C4 | Safe-area 누락 지점 보강 | **Low** | ~40 | 전체 | ✅ Dark-M + L | Low |
| C5 | Velocity 기반 swipe threshold 조정 | **Med** | ~60 | F1 | ❌ (로직) | Medium — 기존 `useSwipe` 테스트 필요 |

### 7.1 추천 롤아웃 순서

```
Phase 1 (즉시, Low 난이도 묶음)
  → T3 Haptic + T4 Spring easing + T8 Snap chip + C3 Touch target + C4 Safe-area
  → 효과/비용 비율 최고, 회귀 위험 낮음
  → 총 ~180 LOC, 1일 작업

Phase 2 (고임팩트 Med 난이도)
  → T5 Pull-to-refresh + T10 Live Activity Bar + T9 Blur loading
  → 사용자 체감 가장 큰 변화
  → 총 ~350 LOC, 2~3일 작업

Phase 3 (구조 변경 High)
  → T1 Bottom Sheet drag + T6 Peek preview + T7 Shrink header + C1/C2 카드 제스처
  → QA 비용 큰 편 (visual snapshot 대량 갱신)
  → 총 ~600 LOC, 5일 + PA-Visual 전수
```

### 7.2 반드시 병행되어야 할 PA 검사

| Phase | PA-Daily | PA-Matrix | PA-Visual |
|-------|----------|-----------|-----------|
| 1 | Block 2, 3 | D, E | 5 뷰포트 × 기존 3 시나리오 갱신 |
| 2 | Block 1, 3, 7 | F, I, C | 5 뷰포트 × 신규 3 시나리오 추가 |
| 3 | 전 Block | D, F, H | 5 뷰포트 × 신규 7 시나리오 추가 + 수동 겹침 헌팅 §3.2 전수 |

---

## 8. 참고 링크

- 기존 규정: [`.claude/rules/pa-mobile-visual.md`](/Users/radar/Work/MidWayDer/.claude/rules/pa-mobile-visual.md) §1 뷰포트 매트릭스, §6 Touch Target
- Harness 경계: [`.claude/rules/harness.md`](/Users/radar/Work/MidWayDer/.claude/rules/harness.md) §10 (100vh 금지)
- 컴포넌트 기준: [`ResultList.tsx`](/Users/radar/Work/MidWayDer/src/components/search/ResultList.tsx), [`CompactCard.tsx`](/Users/radar/Work/MidWayDer/src/components/search/result-list/CompactCard.tsx), [`StickyBar.tsx`](/Users/radar/Work/MidWayDer/src/components/search/result-list/StickyBar.tsx), [`BottomQuickBar.tsx`](/Users/radar/Work/MidWayDer/src/components/search/BottomQuickBar.tsx)
- CSS 기반: [`globals.css`](/Users/radar/Work/MidWayDer/src/app/globals.css) §v0.68.0 블록

---

**Proposal End**. 본 문서는 제안만 담고 있으며 어떤 코드도 수정하지 않았음. 다음 단계는 Phase 1 항목에 대한 상세 구현 계획(`build` 라우팅) 수립.
