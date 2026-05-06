# MidWayDer Frontend Reset UX/UI Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task after the meeting route is accepted.

**Goal:** 기존 UI를 부분 패치하지 않고, `docs/design/mockups/`와 2026 reset 문서를 기준으로 홈 UX/UI를 새 shell로 재구축한다.

**Architecture:** API, Zustand store, map provider, result/detail contracts는 유지한다. `src/app/page.tsx`를 새 shell의 composition root로 두고, 검색 전/검색 중/결과/상세 4상태만 명확히 표현한다. 기존 컴포넌트는 로직 단위만 재사용하고, `DesktopSidePanel`, `ResultList`, `SearchOverlay`, `PlaceDetail`, `BottomQuickBar`의 표현층은 mockup 기준으로 교체한다.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind 4, Zustand, Kakao Map, Playwright mobile E2E/visual tests.

---

## Source of Truth

### Found redesign traces

- `docs/design/frontend-reset-meeting-2026-05-05.md`
  - 기존 UI/UX 마이그레이션 중단.
  - 홈 프론트엔드를 처음부터 다시 설계.
  - 유지: 검색 API, Zustand store, 지도 provider, 장소 상세/저장 도메인 계약.
  - 기본 화면 제외: rail, routine, favorites, compare, multi-stop, provider toggle, route legend, feedback FAB.
- `docs/design/component-migration-checklist.md`
  - 2026-05-05 reset 결정 반영.
  - `src/app/page.tsx`가 새 홈 shell 기준 파일.
  - `ResultList`, `SearchOverlay`, `PlaceDetail` 순서로 재설계.
- `docs/design/2026-modernization-proposal-ui.md`
  - Glass stack, expressive typography, monochromatic + 1 pop, Dynamic Island pill, haptic micro-interaction.
  - Mockup A/B/C 구조 정의.
- `docs/design/2026-modernization-proposal-mobile.md`
  - Bottom sheet drag, haptic, spring motion, pull-to-refresh, live activity bar.
- `docs/design/mockups/`
  - `mobile.html`, `desktop.html`, `tokens.html`, `theme.js`가 실제 visual target.
- Relevant commits
  - `bfe3567 feat: migrate map UI tokens and add harness assets`
  - `671a484 feat: 2026 디자인 토큰 시스템 도입`
  - `2ed0d4b fix: align desktop shell with mockup`
  - 이후 `f5cd563`, `fc8edb9`, `cda163e`는 부분 패치 성격.

### Non-goals

- 기존 화면에 칩/카드/문구만 추가하는 cosmetic patch 금지.
- 기능 많은 사이드 레일/루틴/피드백 FAB를 기본 홈에 다시 노출하지 않음.
- Detour score, API schema, map-provider abstraction, i18n/offline/cache contract는 변경하지 않음.

---

## Target UX State Machine

1. `idle`
   - 지도 중심.
   - 모바일: 상단 glass search entry + category chips + collapsed bottom prompt.
   - 데스크톱: 왼쪽 simple search panel + map.
2. `searching`
   - Dynamic pill 또는 compact top status only.
   - 대형 loading card, staged loading card, skeleton result sheet 금지.
3. `results`
   - 모바일: draggable bottom sheet with timeline + result cards + sticky CTA.
   - 데스크톱: side panel results + map markers.
4. `detail`
   - 장소 선택 시 decision panel/sheet만 노출.
   - 저장/공유/네비 action은 detail 또는 sticky CTA로 제한.

---

## Implementation Tasks

### Task 1: Create frontend reset feature flag and shell boundary

**Objective:** 새 UX를 독립적으로 적용할 boundary를 만들고 legacy chrome이 다시 섞이지 않게 한다.

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/components/home/HomeShell.tsx`
- Create: `src/components/home/types.ts`

**Steps:**
1. `page.tsx`에서 검색/store/map wiring만 유지하고 visual composition을 `HomeShell`로 이동한다.
2. `HomeShell` props는 `origin`, `destination`, `category`, `isLoading`, `results`, `selectedPlace`, handlers만 받는다.
3. `DesktopSidePanel`, `BottomQuickBar`, legacy default chrome은 `HomeShell` 내부에서 직접 import하지 않는다.
4. 검색 전 기본 화면에서 rail/routine/favorites/provider toggle/route legend/feedback FAB가 렌더되지 않는 E2E assertion 추가.

**Verify:**
```bash
npm run type-check
npm run lint
npm run test:e2e:mobile:ui
```

### Task 2: Implement mobile mockup shell

**Objective:** `docs/design/mockups/mobile.html`의 구조를 실제 앱 모바일 shell로 이식한다.

**Files:**
- Create: `src/components/home/MobileHomeShell.tsx`
- Create: `src/components/home/MobileSearchEntry.tsx`
- Create: `src/components/home/MobileCategoryRail.tsx`
- Modify: `src/app/page.tsx`
- Modify: `tests/e2e/mobile-ui.spec.ts`

**Acceptance:**
- 375px viewport에서 지도는 항상 배경으로 보인다.
- 상단에는 glass search entry만 있다.
- 카테고리 칩은 horizontal scroll/snap.
- 검색 전 하단은 prompt/collapsed sheet 하나만 있다.
- 검색 중에는 `찾는 중...` compact state만 있다.

### Task 3: Rebuild result bottom sheet

**Objective:** 결과 화면을 mockup B 기준 bottom sheet + stat pod card + sticky CTA로 재설계한다.

**Files:**
- Create: `src/components/home/ResultBottomSheet.tsx`
- Create: `src/components/home/ResultStatPods.tsx`
- Create: `src/components/home/RouteTimeline.tsx`
- Modify: `src/components/search/ResultList.tsx` or replace its presentation path
- Modify: `tests/e2e/mobile-ui.spec.ts`

**Acceptance:**
- Result card는 장소명/주소/+분/+km/점수/최대 2개 보조 chip/primary CTA만 기본 노출.
- 대형 badge wrap, stage loading, skeleton sheet는 없음.
- `mobile-result-sheet`는 검색 완료 후에만 노출.

### Task 4: Rebuild desktop shell

**Objective:** 데스크톱은 `왼쪽 검색 패널 + 지도 + 선택 detail` 구조로 단순화한다.

**Files:**
- Create: `src/components/home/DesktopHomeShell.tsx`
- Modify: `src/components/search/DesktopSidePanel.tsx` or replace usage
- Modify: `tests/e2e/mobile-ui.spec.ts` if shared assertions needed

**Acceptance:**
- 기본 화면에는 왼쪽 작업 패널 하나만 있다.
- 결과 전에는 부가 기능 chrome이 보이지 않는다.
- 선택한 장소가 있을 때만 detail pane이 열린다.

### Task 5: Rebuild SearchOverlay

**Objective:** 모바일 overlay를 새 정보 구조로 다시 만든다.

**Files:**
- Modify: `src/components/search/SearchOverlay.tsx`
- Modify: `src/components/search/AddressInput.tsx`
- Modify: `src/components/search/CategorySelect.tsx`

**Acceptance:**
- Overlay는 입력/카테고리/검색 CTA만 우선한다.
- 저장경로/루틴/고급 기능은 검색 후 action 또는 별도 화면으로 이동.
- 키보드 safe-area와 닫기/검색 CTA가 겹치지 않는다.

### Task 6: Service worker/cache versioning for visual deploys

**Objective:** UI가 바뀌었는데 사용자가 예전 화면을 보는 문제를 줄인다.

**Files:**
- Modify: `public/sw.js`
- Modify: `src/components/ServiceWorkerRegister.tsx`
- Modify: `tests/e2e/offline.spec.ts`

**Acceptance:**
- 새 배포 시 SW cache name이 변경된다.
- 새 버전 감지 시 사용자에게 새로고침 CTA 표시.
- production smoke에서 live chunk에 legacy strings가 남지 않는지 확인.

### Task 7: Visual proof and deployment verification

**Objective:** “바뀌었다”를 말하기 전에 캡처로 증명한다.

**Files:**
- Modify: `tests/e2e/mobile-visual.spec.ts`
- Update snapshots intentionally only after visual review.

**Verify:**
```bash
npm run type-check
npm run lint
npm run test:e2e:mobile:ui
npx playwright test --project=mobile-chrome tests/e2e/mobile-visual.spec.ts --update-snapshots
scripts/harness-check.sh --diff HEAD~1
```

**Production verification:**
```bash
curl -sI https://midwayder.up.railway.app | grep -E 'etag|x-nextjs-cache|cache-control'
curl -sL https://midwayder.up.railway.app | grep -E '경로 분석 중|장소 탐색 중|비용 계산 중' && exit 1 || true
```

---

## Execution Order

1. Task 1 + Task 2 in one build commit.
2. Task 3 in one build commit.
3. Task 4 + Task 5 in one build commit.
4. Task 6 + Task 7 in one QA/deploy commit.

Each build commit must include:
- progress note in `docs/progress/YYYY-MM-DD.md`
- mobile screenshot evidence path or Playwright report summary
- staged-only `scripts/harness-check.sh --staged`
- push to `origin/main` unless blocked by unrelated dirty conflicts

---

## Current Risk

The worktree has many unrelated dirty files from prior harness/UI work. Stage only files touched by each task. Do not overwrite unrelated changes without explicit review.
