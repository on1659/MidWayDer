# 모바일 버그 수정 계획

**작성일**: 2026-04-09
**버전**: v0.66.0 → v0.67.0
**트리거**: QA 에이전트 E2E 테스트 실행 결과
**배경**: 지도 UX 불편 / 모바일 동작 불안정 / 검색 신뢰도 저하 이슈 접수 후 Playwright 테스트로 baseline 측정

---

## 테스트 Baseline (수정 전)

| 구분 | 수 |
|------|----|
| 전체 테스트 | 74 |
| ✅ PASS | 36 |
| ❌ FAIL | 10 |
| ⚠️ SKIP | 28 |

**핵심 발견**: 실패 10건 전부 `mobile-chrome` 프로젝트에서만 발생. 데스크톱(chromium-desktop)은 실패 0건.

---

## 버그 목록

### BUG-01 — 결과 카드가 모바일에서 hidden 처리됨 (최우선)

**영향 범위**: 7개 테스트 실패
**심각도**: Critical — 모바일 핵심 기능 불동작

**증상**
모바일(Pixel 7, 412×915) 뷰포트에서 검색 결과 카드(`다이소 강남점` 등)가 DOM에는 존재하지만 Playwright `toBeVisible()` 기준 실패. 즉 렌더링은 되었으나 사용자 화면에 보이지 않음.

**근본 원인**
BottomSheet 컴포넌트([src/components/ui/BottomSheet.tsx](../src/components/ui/BottomSheet.tsx))가 `collapsed` 상태일 때 카드가 viewport 밖으로 밀려남.

- BottomSheet는 `height: 100dvh`, `position: fixed`, `transform: translate3d(0, Y, 0)` 구조
- `collapsed` 상태: `Y = vh - peekHeight = 915 - 160 = 755px`
- 드래그 핸들 높이(h-14 = 56px) 이후 콘텐츠 시작: `811px`
- 뷰포트 하단: `915px` → 콘텐츠 가용 공간 **104px**
- 결과 카드 높이 ~190px → **첫 카드조차 완전히 표시 불가**

검색 완료 후 `setBottomSheetSnap('half')`가 호출되어야 하지만, 테스트 환경 API 모킹 시 타이밍 문제로 snap이 `collapsed`로 유지될 가능성 있음.

**관련 파일**
- [src/components/ui/BottomSheet.tsx](../src/components/ui/BottomSheet.tsx)
- [src/app/page.tsx](../src/app/page.tsx) — `setBottomSheetSnap('half')` 호출 위치 (line ~232)
- [src/components/search/ResultList.tsx](../src/components/search/ResultList.tsx)

**실패 테스트 목록**

| 테스트 | 파일 |
|--------|------|
| BottomSheet 콘텐츠 영역이 스크롤 가능해야 한다 | mobile-ui.spec.ts:168 |
| GPS/설정 버튼이 BottomSheet 위에 표시되어야 한다 | mobile-ui.spec.ts:207 |
| BottomQuickBar와 BottomSheet가 동시에 표시되지 않아야 한다 | mobile-ui.spec.ts:265 |
| 다크 모드에서 하드코딩된 흰색 배경이 없어야 한다 | mobile-ui.spec.ts:310 |
| 터치 타겟 크기가 적절해야 한다 | mobile-ui.spec.ts:372 |
| results state (스크린샷 회귀) | mobile-visual.spec.ts:332 |
| dark mode results (스크린샷 회귀) | mobile-visual.spec.ts:375 |

**수정 방향**
1. 검색 결과 도착 시 `setBottomSheetSnap('half')` 호출이 실제로 완료되는지 보장 (비동기 타이밍 검토)
2. `peekHeight` 기준 재검토 — 최소 1개 카드가 보이도록 (카드 높이 + 핸들 높이 = ~250px로 상향 검토)
3. 또는 결과 있을 때 snap 초기값을 `'half'`로 강제 설정

**수용 기준**
- [ ] `mobile-chrome` 프로젝트에서 7개 테스트 모두 PASS
- [ ] 결과 카드 첫 번째 항목이 `toBeVisible()` 통과
- [ ] 수동 확인: 실기기(또는 DevTools 모바일 시뮬레이터)에서 검색 후 결과 즉시 노출

---

### BUG-02 — SearchOverlay가 모바일에서 마운트되지 않음

**영향 범위**: 2개 테스트 실패
**심각도**: High — 모바일 검색 진입 불가

**증상**
`data-testid="open-search-overlay-btn"` 클릭 후 `[role="search"][aria-label="경유지 검색"]` 요소가 DOM에 나타나지 않음 (5초 타임아웃).
`data-testid="mobile-origin-input"`도 찾히지 않음.

**근본 원인 (추정 2가지)**

**A. 조건부 렌더링 타이밍 문제**
SearchOverlay([src/components/search/SearchOverlay.tsx](../src/components/search/SearchOverlay.tsx))는 `open` prop으로 마운트 여부 결정. 버튼 클릭 → `setSearchOverlayOpen(true)` → React 리렌더 → DOM 업데이트 사이 Playwright가 너무 빨리 로케이터를 쿼리할 수 있음.

**B. `testId` prop이 실제 `data-testid`로 전달 안 됨**
SearchOverlay 내 AddressInput에 `testId="mobile-origin-input"` 전달 중 (line 369). AddressInput이 `data-testid={testId}`를 input에 적용하는 구조이지만 ([src/components/search/AddressInput.tsx:162](../src/components/search/AddressInput.tsx)), `open=false` 상태일 때 SearchOverlay 자체가 렌더링되지 않아 input이 DOM에 없을 수 있음.

**관련 파일**
- [src/components/search/SearchOverlay.tsx](../src/components/search/SearchOverlay.tsx) — line 216~217 (`role="search"`, `aria-label`), line 369 (`testId`)
- [src/app/page.tsx](../src/app/page.tsx) — line 408~421 (버튼), line 474~476 (SearchOverlay 렌더)
- [src/components/search/AddressInput.tsx](../src/components/search/AddressInput.tsx) — line 162 (`data-testid`)

**실패 테스트 목록**

| 테스트 | 파일 |
|--------|------|
| 검색 오버레이가 올바르게 열리고 닫혀야 한다 | mobile-ui.spec.ts:425 |
| search overlay open (스크린샷 회귀) | mobile-visual.spec.ts:286 |

**수정 방향**
1. SearchOverlay의 `open=false` 시 처리 확인: `if (!open) return null` 구조라면 → `visibility: hidden` + `display: none` 방식으로 교체하여 DOM 상시 유지 검토
2. 또는 테스트에서 `await page.waitForSelector('[role="search"]')` 패턴 보장 (이미 12s timeout 설정되어 있음 — 컴포넌트 마운트 자체가 안 되는 문제로 판단)
3. 컴포넌트 레벨: `open` prop 변경 후 `focus()` 자동 호출 확인

**수용 기준**
- [ ] `mobile-chrome`에서 2개 테스트 PASS
- [ ] 버튼 클릭 → 오버레이 등장 → `mobile-origin-input` 포커스 정상 동작
- [ ] 오버레이 닫기(뒤로가기/X 버튼) 후 재오픈 정상 동작

---

### BUG-03 — 테마 변경 버튼 aria-label 중복

**영향 범위**: 1개 테스트 실패
**심각도**: Medium — 접근성 위반 + 테스트 strict mode 오류

**증상**
`button[aria-label="테마 변경"]`이 DOM에서 2개 매칭. Playwright strict mode가 하나를 요구하므로 실패.

**근본 원인**
동일한 `aria-label="테마 변경"` 버튼이 두 군데 동시 렌더링:

| 위치 | 파일 | 클래스 |
|------|------|--------|
| 데스크톱 사이드패널 헤더 | [src/components/search/DesktopSidePanel.tsx:134](../src/components/search/DesktopSidePanel.tsx) | `w-9 h-9` |
| 지도 위 FAB 버튼 | [src/app/page.tsx:465](../src/app/page.tsx) | `w-12 h-12` |

모바일 뷰포트에서도 데스크톱 사이드패널이 렌더링 트리에 포함되어 두 버튼이 동시 존재.

**실패 테스트 목록**

| 테스트 | 파일 |
|--------|------|
| dark mode home (스크린샷 회귀) | mobile-visual.spec.ts:356 |

**수정 방향**
지도 FAB 버튼의 aria-label 변경:
```
"테마 변경" → "지도 테마 변경"
```
또는 데스크톱 사이드패널이 모바일에서 렌더링되지 않도록 조건부 처리 검토.

**수용 기준**
- [ ] `button[aria-label="테마 변경"]` DOM 내 1개만 존재
- [ ] `mobile-visual.spec.ts:356` PASS
- [ ] 스크린 리더 접근성 유지 (버튼 역할 명확)

---

## 수정 우선순위

| 순위 | 버그 | 실패 수 | 예상 난이도 |
|------|------|---------|-------------|
| 1 | BUG-01 결과 카드 hidden | 7건 | 중 (BottomSheet 상태 타이밍) |
| 2 | BUG-02 SearchOverlay 미마운트 | 2건 | 중 (렌더링 조건 분석 필요) |
| 3 | BUG-03 aria-label 중복 | 1건 | 낮 (문자열 1개 수정) |

---

## 수정 완료 목표

| 지표 | 현재 | 목표 |
|------|------|------|
| 전체 PASS | 36/74 | 46/74 (실패 10건 → 0건) |
| mobile-chrome PASS | 0/10 | 10/10 |
| 데스크톱 PASS | 유지 | 유지 |

---

## 참고: 지도 UX 이슈

QA 테스트 결과 지도 인터랙션(터치, 마커 호버) 전용 테스트는 현재 suite에 없음.
지도 UX 문제는 별도 테스트 작성 및 분석 필요 — 다음 사이클에서 다룰 것.

**다음 단계**: BUG-01~03 수정 완료 후 `/pdca analyze` 재실행으로 match rate 검증.
