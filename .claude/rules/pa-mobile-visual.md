# PA Mobile & Visual — 겹침/표기 검증 체계

**목적**: "UI 요소끼리 겹치지 않는가", "모바일에서 글자가 잘리거나 가려지지 않는가"를 체계적으로 검증.
**주체**: PA 수행자(기획/개발/QA 누구나) + CI Playwright.
**상위 문서**: [`pa-daily-smoke.md`](./pa-daily-smoke.md) Block3, [`qa-gates.md`](./qa-gates.md) PA-Primary.

---

## 0. 왜 별도 체계가 필요한가

카드/뱃지/지도/sticky/Bottom Sheet/키보드/다크모드가 **동시에** 움직인다. 각각 따로 보면 OK인데 조합하면 겹친다. 이런 건 유닛 테스트로 못 잡는다. **눈 + 자동 스크린샷 diff**로만 잡힌다.

---

## 1. 뷰포트 매트릭스 (필수 테스트 조합)

| 프리셋 | 해상도 | 대상 기기 | 잡는 버그 |
|--------|--------|----------|----------|
| **XS** | 360×640 | 구형 Android 저가폰 | 좁은 폭에서 텍스트 줄바꿈, 뱃지 오버플로 |
| **S**  | 375×667 | iPhone SE, iPhone 8 | Apple 최소폭, sticky 간섭 |
| **M**  | 390×844 | iPhone 12/13/14, Pixel 7 | 현재 기본 (CI 커버) |
| **L**  | 414×896 | iPhone Pro Max | 큰 폭에서 레이아웃 늘어짐 |
| **XL** | 600×900 | 작은 태블릿 세로 | 데스크톱 레이아웃 전환 경계 |
| **Dark M** | 390×844 + prefers-color-scheme: dark | 모든 기기 다크 | 다크 색상 회귀 |

**현재 gap**: [playwright.config.ts](playwright.config.ts)는 `Pixel 7` 하나만 있음. 최소 XS + S + M + Dark M 4개로 확장 필요.

### 뷰포트 추가 가이드 (playwright.config.ts)

```typescript
projects: [
  { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'] } },
  { name: 'mobile-xs',   use: { viewport: { width: 360, height: 640 }, isMobile: true, hasTouch: true } },
  { name: 'mobile-s',    use: { ...devices['iPhone SE'] } },
  { name: 'mobile-m',    use: { ...devices['Pixel 7'] } },
  { name: 'mobile-l',    use: { ...devices['iPhone 13 Pro Max'] } },
  { name: 'mobile-dark', use: { ...devices['Pixel 7'], colorScheme: 'dark' } },
],
```

---

## 2. 자동화 레이어 — Playwright Visual Regression

### 2.1 기존 자산
- [tests/e2e/mobile-visual.spec.ts](tests/e2e/mobile-visual.spec.ts) — 3 시나리오 스냅샷
  - `mobile-home-empty` (초기)
  - `mobile-search-overlay` (검색창 열림)
  - `mobile-loading-state` (로딩 중)
- 스냅샷 경로: `tests/e2e/mobile-visual.spec.ts-snapshots/*.png`
- [tests/e2e/mobile-ui.spec.ts](tests/e2e/mobile-ui.spec.ts) — 기능 위주 spec (5개 mock 결과)

### 2.2 확장 필요 시나리오 (TODO)

각 시나리오는 **XS + S + M + L + Dark M** 5 프리셋에서 스냅샷 필요.

| 시나리오 | 목적 | 현재 상태 |
|---------|------|----------|
| 초기 빈 화면 | 기본 레이아웃 | ✅ 존재 (M만) |
| 검색창 열림 | SearchOverlay + 즐겨찾기/최근검색 | ✅ 존재 (M만) |
| 로딩 3단계 | 로딩 인디케이터 + 취소 버튼 | ✅ 존재 (M만) |
| 결과 10개 표시 | 기본 결과 리스트 | ❌ 신규 |
| 베스트픽 배너 + 점수분해 펼침 | 카드 액션 확장 | ❌ 신규 |
| 컴팩트 모드 + 아코디언 펼침 | 카드 2단 상태 | ❌ 신규 |
| 필터 칩 펼침 + 프리셋 활성 | 필터 UI 밀도 | ❌ 신규 |
| 상위 3개 비교 패널 열림 | ComparePanel | ❌ 신규 |
| Sticky mini bar + sticky filter | 스크롤 상태 | ❌ 신규 |
| 지도 마커 InfoWindow + 카드 하이라이트 | 지도↔리스트 | ❌ 신규 |
| 결과 0건 empty state | 빈 상태 CTA | ❌ 신규 |
| 오프라인 복원 토스트 | 토스트 overlay | ❌ 신규 |
| 키보드 올라온 상태 (input focus) | viewport resize | ❌ 신규 |
| 다중 경유지 2개 추가 | MultiStopSelector | ❌ 신규 |

### 2.3 스냅샷 diff 허용치

`expect(page).toHaveScreenshot('name.png', { maxDiffPixelRatio: 0.01 })` — 1% 픽셀 이내.

**실패 유형별 대응**:
- 의도된 디자인 변경 → `--update-snapshots` 플래그로 갱신 + 커밋 시 PR에 before/after 이미지 링크 필수
- 폰트 렌더링 차이(OS) → CI는 Linux, 로컬은 macOS라 자연스러운 diff 있음. 임계치 0.02까지 허용
- 실제 회귀 → 실패 아티팩트 첨부 후 fix

### 2.4 실행

```bash
# 전체 visual
npx playwright test --project=mobile-m mobile-visual

# 스냅샷 갱신 (의도된 변경)
npx playwright test --project=mobile-m mobile-visual --update-snapshots

# 5 프리셋 병렬
npx playwright test mobile-visual --project=mobile-xs --project=mobile-s --project=mobile-m --project=mobile-l --project=mobile-dark
```

---

## 3. 겹침 헌팅 루틴 (수동)

자동으로 못 잡는 **층간 간섭**을 찾는 체계.

### 3.1 Z-축 스택 지도 그리기

현재 MidWayDer의 z-index 층:

| Layer | 요소 | z-index 경계 |
|-------|------|------------|
| L0 (base) | 지도 | 0 |
| L1 | 결과 카드 리스트 | 10 |
| L2 | Sticky 필터 바 | 20 |
| L3 | Sticky Mini Bar (하단) | 20 |
| L4 | BottomSheet / BottomQuickBar | 30 |
| L5 | 지도 InfoWindow | 40 |
| L6 | SearchOverlay (전체 덮음) | 50 |
| L7 | Modal / ActionSheet | 60 |
| L8 | Toast | 70 |

**체크**: 동일 z-index가 동시 활성 시 우선순위 확정인가? Layer 간 간섭 가능한 조합은?

### 3.2 겹침 발생 고위험 조합 (수동 체크리스트)

#### 🔴 스크롤 + Sticky 스택
- [ ] 결과 30개 스크롤 중 **필터 바(L2) + Mini Bar(L3)** 동시 sticky 될 때 겹치지 않는가
- [ ] 키보드 올라올 때 Mini Bar(L3)가 키보드 뒤로 사라지는가, 위로 밀리는가
- [ ] SearchOverlay(L6) 열린 상태에서 뒤의 sticky가 z-index로 보이지 않는가 확실한가

#### 🔴 카드 내 뱃지 오버플로
재현: `MOCK_RESULTS_5` 중 1개에 많은 뱃지 몰아서 주기
- [ ] 뱃지 5개 이상 (🥇 + 🔥 + 📍 + 🚶 + 마감임박) → 줄바꿈 위치 정상
- [ ] 뱃지 줄바꿈 → 카드 높이 자동 증가, 다음 카드 밀림 OK
- [ ] 매장명 30자+ "스타벅스 리저브 로스터리 도쿄 나카메구로점" → `...`  ellipsis or 줄바꿈
- [ ] 주소 50자+ → 2줄 제한

#### 🔴 지도 ↔ 카드 동시 동작
- [ ] 카드 탭 → 지도 카메라 이동 → InfoWindow(L5) 자동 오픈 → 위치가 **상단 필터바(L2) 안 가리나**
- [ ] 마커 여러 개 겹친 위치(같은 건물 내 카페 2개) → InfoWindow 포개짐 회피 로직
- [ ] 지도 확대 최대 시 마커 간격 → 탭 가능한가

#### 🔴 BottomSheet + 다른 UI
- [ ] BottomQuickBar(L4) 열려있을 때 Toast(L8) 뜨면 → Toast가 Bar 위에
- [ ] ActionSheet(L7) 오픈 중 → 뒤의 카드 탭 비활성화 (이벤트 차단)
- [ ] 스와이프 제스처(카드) + BottomSheet 스와이프 → 이벤트 경합 없음

#### 🔴 Modal / Overlay 중첩
- [ ] SearchOverlay + SaveRouteDialog 동시 → 상위가 하위 입력 차단
- [ ] 3개 중첩까지 테스트: Overlay > Dialog > Toast

### 3.3 긴 콘텐츠 스트레스 테스트

고의로 엣지 데이터를 넣는다. 다음 mock을 `mobile-ui.spec.ts`에 추가해 검증:

```typescript
const STRESS_RESULTS = [
  makeMockResult('stress-1', '스타벅스 리저브 로스터리 도쿄 나카메구로점'), // 30자
  makeMockResult('stress-2', 'A'),  // 1자
  makeMockResult('stress-3', '', {  // 빈 이름
    place: { ...base, name: '', address: '' }
  }),
  makeMockResult('stress-4', '다이소 역삼점', { detourCost: { distance: 999999, duration: 86400 } }), // 99km, 24시간
  makeMockResult('stress-5', '다이소 상암점 (서울특별시 마포구 상암동 DMC 첨단산업센터 지하 1층 110호)'), // 긴 주소
];
```

체크:
- [ ] 매우 긴 매장명: ellipsis 동작 or 줄바꿈 후 레이아웃 유지
- [ ] 빈 이름: 카드가 깨지지 않고 placeholder ("이름 없음")
- [ ] 거대 이탈값: "+1440분 / +999km" 표기 시 카드 가로 스크롤 생기지 않음
- [ ] 긴 주소: 2줄 제한 + `...`

---

## 4. 다크모드 파리티

### 4.1 전환 체크
- [ ] OS 다크 → 라이트 전환 시 **깜빡임 없음** (FOUC)
- [ ] 페이지 로드 첫 프레임에 이미 맞는 모드 (SSR에서 prefers-color-scheme 존중)

### 4.2 색 대비 (WCAG AA 4.5:1)
주요 조합만 체크:

| 배경 | 전경 | 다크 |
|------|------|------|
| 카드 배경 | 매장명 텍스트 | ≥ 4.5:1 |
| 카드 배경 | 주소 (secondary) | ≥ 3:1 (large) |
| 뱃지 배경 | 뱃지 텍스트 | ≥ 4.5:1 |
| 필터 칩 활성 | 칩 텍스트 | ≥ 4.5:1 |
| 지도 InfoWindow | 내부 텍스트 | ≥ 4.5:1 |

**툴**: Chrome DevTools > Lighthouse Accessibility, 또는 `axe-core` Playwright 플러그인.

### 4.3 뱃지 색상 다크 파리티
- [ ] 🥇 베스트픽 황금 → 다크에서 가독성
- [ ] 🔥 인기 레드 → 다크에서 지나치게 쨍하지 않음
- [ ] 영업중 초록 / 종료 회색 → 다크에서도 구분
- [ ] 마감임박 amber / 오픈임박 blue → 눈부심 없음

---

## 5. Safe Area / Notch / 홈 인디케이터

### 5.1 iOS Safari / Android 크롬 체크
- [ ] 상단 노치/다이나믹 아일랜드 → 컨텐츠 안 가림 (`env(safe-area-inset-top)`)
- [ ] 하단 홈 인디케이터 → BottomSheet/BottomQuickBar 위로 → 겹침 없음 (`env(safe-area-inset-bottom)`)
- [ ] 랜드스케이프(회전) → 좌우 safe-area 반영

### 5.2 현재 적용 확인
- `src/app/globals.css`에 13곳 safe-area 사용 존재
- `src/components/search/BottomQuickBar.tsx`에 1곳
- **gap**: 다른 BottomSheet 계열 컴포넌트는 검증 필요

### 5.3 시뮬레이터 테스트 필수
- Chrome DevTools만으론 **safe-area 에뮬레이션 불완전** — 실기기 or Xcode Simulator 필요
- iOS 16+ Safari + Android Chrome 12+ 각 1회/릴리스

---

## 6. Touch Target 감사 (44×44)

### 6.1 원칙
- Apple HIG: 최소 **44×44pt**
- WCAG 2.5.5: **44×44 CSS px** (Level AAA)
- MidWayDer 타겟: **44×44 minimum**, 인접 타겟 간 8px 여백

### 6.2 고위험 요소
- [ ] 카드 내 ⭐/Copy/⋯ 3개 버튼 → 서로 8px+ 떨어져 있나
- [ ] 필터 칩 → 최소 32px 높이는 보장하지만 너비 좁은 것(예: "5분") → 탭 영역 pad 확장?
- [ ] 스와이프 힌트 닫기 X 버튼 → 44×44 이상
- [ ] 지도 마커 → 자체는 작아도 탭 영역 50px+ (Kakao SDK 기본 확인)
- [ ] 뒤로가기/상단 액션 버튼 → header height 48px 보장

### 6.3 자동화
- Playwright `toHaveCSS('min-height', /4[4-9]px|[5-9]\dpx/)` 체크로 회귀 방지

---

## 7. 키보드 & Dynamic Viewport

### 7.1 키보드 포커스 시
- [ ] input focus → 화면이 keyboard 만큼 축소 (dvh 반응)
- [ ] 결과 영역 **잘리지 않음** — 스크롤 가능 상태 유지
- [ ] Sticky Mini Bar → 키보드 위로 올라옴 (숨겨지지 않음)

### 7.2 dvh 회귀 방지
- `src/app/globals.css` 이미 `100dvh` 사용 중 (hook 강제)
- [ ] iOS Safari 주소창 표시/숨김 시 레이아웃 리플로우 자연스러움
- [ ] 100vh가 **한 군데라도** 새로 들어오면 mobile-ui-guard.sh block

### 7.3 iOS 가상 키보드 특이사항
- `visualViewport` API 활용 시만 정확한 키보드 높이
- 서드파티 IME(한국어) 자동완성 바 → 추가 높이 고려

---

## 8. 접근성 (A11y) 빠른 체크

### 8.1 WCAG 2.1 AA 기본
- [ ] 모든 이미지 `alt` 또는 `aria-label`
- [ ] 버튼 `aria-label` 또는 내부 텍스트
- [ ] 색만으로 정보 전달 안 함 (영업중/종료 → 색 + 아이콘 + 텍스트 3중)
- [ ] 포커스 링 가시 (키보드 Tab 탐색)
- [ ] VoiceOver/TalkBack 읽기 순서 논리적

### 8.2 자동화
```bash
npm i -D @axe-core/playwright
```
```typescript
import AxeBuilder from '@axe-core/playwright';
const results = await new AxeBuilder({ page }).analyze();
expect(results.violations).toEqual([]);
```

릴리스 전 `mobile-a11y.spec.ts` 신규 추가 권장.

---

## 9. 툴체인 & 실행 순서

### 9.1 일일 (PA-Daily Block3와 병행)
1. Chrome DevTools > Device Mode → M(Pixel 7) 프리셋
2. Rendering tab → "Emulate CSS media feature prefers-color-scheme" dark 토글
3. 수동 겹침 헌팅 §3.2 체크리스트 5분

### 9.2 기능 수정 시
1. 해당 컴포넌트 영역 스냅샷 있으면 `npx playwright test mobile-visual` 실행
2. 스냅샷 diff 확인 → 의도된 변경이면 `--update-snapshots`
3. 없으면 신규 시나리오 추가 (§2.2 TODO 참고)

### 9.3 릴리스 전
1. 5 프리셋 전체 visual 실행
2. 실기기 1종 iOS + 1종 Android 수동 스위핑 (§3.2 고위험 조합)
3. A11y axe 스캔
4. 스트레스 데이터(§3.3)로 mobile-ui.spec.ts 1회 실행

### 9.4 회귀 분석
- CI 실패 시 `test-results/` 내 실패 스크린샷 + diff 이미지 확인
- `playwright show-report` 로컬에서 재현

---

## 10. Verdict 기록

`.bkit/state/pa-visual-{YYYYMMDD}.json` 에 수행 결과 기록 (선택):

```json
{
  "date": "2026-04-21",
  "viewports": ["xs", "s", "m", "l", "dark-m"],
  "visual_diffs": 0,
  "overlap_hunts_passed": 14,
  "overlap_hunts_failed": 0,
  "a11y_violations": 0,
  "verdict": "pass"
}
```

PA-Daily Block3 대체 가능 (깊은 검증 수행 시).

---

## 관련 문서
- [`pa-daily-smoke.md`](./pa-daily-smoke.md) Block3 — 짧은 수동 체크
- [`pa-feature-matrix.md`](./pa-feature-matrix.md) 영역 D, F — 카드 UI/리스트 기능
- [`harness.md`](./harness.md) §10 — 100vh 회귀 Hook 차단
- [tests/e2e/mobile-visual.spec.ts](tests/e2e/mobile-visual.spec.ts), [mobile-ui.spec.ts](tests/e2e/mobile-ui.spec.ts)
