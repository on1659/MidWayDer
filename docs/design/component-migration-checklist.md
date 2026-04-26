# 컴포넌트별 마이그레이션 체크리스트

2026 토큰 시스템으로 프론트엔드 전체를 마이그레이션 할 때 쓰는 **영역별 할 일 목록**.

**사용법**: 한 번에 한 영역만. PR 단위는 영역(Section) 기준. 각 영역 끝나면 § Verdict 로 기록.

**관련**:
- 규약: [`.claude/rules/design-system.md`](../../.claude/rules/design-system.md)
- 설계 근거: [`docs/design/2026-modernization-proposal-*.md`](./2026-modernization-proposal-tokens.md)
- 시각 타겟: [`docs/design/mockups/`](./mockups/) (브라우저로 index.html 열기)
- hex → 토큰 매핑: [`./hex-to-token-map.md`](./hex-to-token-map.md)
- 갭 가이드: [`./before-after-gaps.md`](./before-after-gaps.md)

**상태 범례**
- ✅ 완료 · 🔄 진행중 · ⬜ 미착수 · ⚠️ 블락/이슈

---

## 우선순위 오버뷰

| # | 영역 | 파일 수 | 상태 | PR 묶음 |
|---|------|--------|------|---------|
| 1 | 결과 카드 (result-list) | 13 | ✅ | Phase 2 완료 |
| 2 | 필터 & 칩 | 3 | ⬜ | PR-A |
| 3 | 지도 & 오버레이 | 4 | 🔄 부분 | PR-B |
| 4 | Search/Overlay/Bottom UI | 5 | ⬜ | PR-C |
| 5 | Side/Desktop 패널 | 2 | ⬜ | PR-D |
| 6 | 공용 UI 컴포넌트 | 8 | ⬜ | PR-E |
| 7 | Settings 하위 | 4 | ⬜ | PR-F |
| 8 | 지역 (Place / Saved Routes) | 3 | ⬜ | PR-G |

---

## 리팩터 vs 신규 구현 경계

이 프로젝트는 **백엔드/API/상태 로직을 유지**하고, 프론트엔드는 **단계적 마이그레이션**으로 갈아엎는 형태다. 체감상 "새로 만드는 수준"이 맞지만, 구현 방식은 아래 4개로 나뉜다.

### 1. 리팩터로 본다 — 로직/계약 유지, UI 셸 교체

**특징**
- 기존 props / store contract / 검색 플로우 유지
- 파일은 유지하거나 분리하되, 핵심 상태 로직은 재사용
- 변경의 70% 이상이 스타일 / 구조 / 접근성 / motion 이면 리팩터

**대상**
- `src/components/search/result-list/*`
- `src/components/search/FilterChips.tsx`
- `src/components/search/SortFilter.tsx`
- `src/components/search/RouteTypeFilter.tsx`
- `src/components/search/CategorySelect.tsx`
- `src/components/search/BottomQuickBar.tsx`
- `src/components/search/FavoritesList.tsx`
- `src/components/search/RecommendedCategories.tsx`
- `src/components/search/CacheStatus.tsx`
- `src/components/search/SaveRouteDialog.tsx`
- `src/components/map/KakaoRoutePolyline.tsx`
- `src/components/map/RoutePolyline.tsx`
- `src/components/map/MapContainer.tsx`
- `src/components/settings/CacheSettings.tsx`
- `src/components/settings/SyncSettings.tsx`
- `src/components/settings/NotificationSettings.tsx`
- `src/components/settings/CustomCategorySettings.tsx`
- `src/components/ui/ConfirmDialog.tsx`
- `src/components/ui/ToastContainer.tsx`
- `src/components/ui/ErrorFallback.tsx`
- `src/components/ui/OfflineBanner.tsx`
- `src/components/ui/InstallBanner.tsx`
- `src/components/ui/NotificationPermissionBanner.tsx`
- `src/components/ui/Skeleton.tsx`
- `src/components/ui/BookmarkButton.tsx`
- `src/components/ui/LanguageSelector.tsx`
- `src/components/ui/SyncStatus.tsx`

**판단 근거**
- 검색/지도/설정/공용 UI 는 이미 기능과 상태 구조가 있다.
- 지금 필요한 건 mockup/토큰 시스템에 맞는 **표현층 전면 교체**다.

### 2. 혼합 영역 — 기존 로직은 살리고, 화면 셸은 사실상 새로 만든다

**특징**
- 데이터/행동은 재사용
- 레이아웃 계층, 상호작용, 시각 구조는 새로 설계
- "리팩터"라고 부르지만 공수는 신규 구현에 가깝다

**대상**
- `src/app/page.tsx`
- `src/components/search/SearchOverlay.tsx`
- `src/components/search/DesktopSidePanel.tsx`
- `src/components/search/ComparePanel.tsx`
- `src/components/search/MultiStopSelector.tsx`
- `src/components/search/RoutineBanner.tsx`
- `src/components/place/PlaceDetail.tsx`
- `src/components/saved-routes/SavedRoutesList.tsx`
- `src/components/saved-routes/SavedRouteCard.tsx`
- `src/components/saved-routes/QRCodeShare.tsx`

**판단 근거**
- 홈 화면 shell, 모바일 오버레이, 상세 패널은 기존 비즈니스 로직이 있지만 mockup 타겟과 구조 차이가 커서 레이아웃을 새로 짜야 한다.
- 특히 `PlaceDetail` 은 모바일 바텀시트 로직은 유지 가능하지만, desktop 우측 detail pane 은 별도 셸로 보는 편이 맞다.

### 3. 신규 구현으로 본다 — 현재 코드에 대응 구조가 없거나, 목업 전용 요소

**특징**
- 현재 앱에 같은 역할의 UI 계층이 없음
- 신규 컴포넌트/레이아웃/상태 연결이 필요
- meeting 후 범위 확정이 필요한 경우 많음

**대상**
- 좌측 56px `RailNavigation` (desktop 4-pane)
- 우측 440px `DetailPane` shell
- desktop 4-pane grid (`56px 380px 1fr 440px`)
- Dynamic Island Pill 상태 인디케이터
- 지도 위 Bento Pods / floating summary cards
- 지도 컨트롤 커스텀 스킨 (SDK 기본 버튼 대체 시)
- mockup 전용 hero/timeline/chart 블록

**판단 근거**
- 이 요소들은 현재 `2-pane + modal/bottom-sheet` 구조 밖에 있다.
- 기존 컴포넌트를 예쁘게 고치는 수준이 아니라 **새 레이아웃 계층을 추가**하는 작업이다.

### 4. 그대로 유지한다 — 프론트엔드 갈아엎어도 계약은 보존

**핵심 유지 대상**
- Zustand stores: `src/store/*`
- page hooks: `src/app/hooks/*`
- detour / scoring / validation: `src/lib/detour/*`, `src/lib/validation/*`
- map provider wrappers: `src/lib/map-provider/*`
- share / favorites / recent search / visit tracking 같은 도메인 로직
- API routes: `src/app/api/*`

**원칙**
- UI migration 중에도 store shape / API response / route search contract 는 가능하면 건드리지 않는다.
- 새 컴포넌트가 필요해도 **기존 hook/store 위에 얹는 방식**을 우선한다.

### 한 줄 판단 규칙

- store/hook/API contract 안 건드리고 화면만 바꾸면: `리팩터`
- 로직은 재사용하지만 layout tree 가 크게 달라지면: `혼합`
- 현재 없는 pane/rail/hero shell 을 추가하면: `신규`
- 검색/추천/지도 데이터 계약 자체를 건드리면: `프론트엔드 migration 범위 밖`

---

## 영역 1. 결과 카드 (result-list) ✅ 완료

**파일 13개** (영역 대표 완료 상태 — 참고용 레퍼런스로 활용)
- `StatPods.tsx` · `ResultCard.tsx` · `CompactCard.tsx` · `CardActions.tsx` · `CardBadges.tsx` · `CardScoreDetail.tsx` · `CardHeader.tsx` · `FilterChips.tsx` · `CategoryChips.tsx` · `RelatedCategories.tsx` · `StickyBar.tsx` · `EmptyState.tsx` · `ResultListContext.tsx`

**완료된 것**
- [x] StatPods 신규 — 핵심 3통계 3열 파드 (+분 / +km / 점수)
- [x] MiniStatStrip — 컴팩트 카드용 축소판
- [x] status hex 23리터럴 → 토큰 (success/warning/error/info/accent)
- [x] rgba 하드코딩 → `color-mix(in srgb, var(--accent) X%, transparent)`
- [x] 중립 회색 → `--text-*/--bg-*/--border-*`

**남은 것 (후속 작업)**
- [ ] `CardHeader.tsx` / `FilterChips.tsx` / `CategoryChips.tsx` / `EmptyState.tsx` 안에 남은 hex (hex-to-token-map.md 참고)
- [ ] 컴팩트 카드 아코디언 확장 시 Stat Pods 전체(large) 렌더하도록 개선 검토

---

## 영역 2. 필터 & 칩 — PR-A ⬜

**파일**
- `src/components/search/FilterChips.tsx` ← result-list/FilterChips 와 다른 파일 (주의)
- `src/components/search/SortFilter.tsx`
- `src/components/search/RouteTypeFilter.tsx`

**목표 상태** (목업 desktop.html 필터 섹션 + mobile.html 상단 고정 바)
- 칩: `radius-chip` (pill), 비활성은 `--bg-surface-muted`, 활성은 `--overlay-selected` + `--accent` 글자
- 활성 칩에 `--border-accent` 1.5px
- 정렬 탭: 현재 pill 그대로 두되 색만 토큰화

### 작업 항목
- [ ] hex 리터럴 제거 — hex-to-token-map.md 참고
- [ ] `rounded-full` + `radius-chip` 토큰 alias 적용
- [ ] 활성/비활성 트랜지션 `--duration-fast` + `--ease-standard`
- [ ] 아이콘 크기 `w-4 h-4` 통일
- [ ] 터치 타겟 44×44 확보 (여백은 padding 으로, 크기는 유지)
- [ ] 다크 모드에서 활성 칩 텍스트 대비 4.5:1 검증

### Verification
- [ ] PA-Feature-Matrix 영역 E (E1/E2/E3/E4)
- [ ] PA-Mobile-Visual §3.2 — 칩 줄바꿈 시 겹침 없음
- [ ] 7개 테마 × light/dark = 14조합 스팟 체크 (최소 blue/violet/emerald)

---

## 영역 3. 지도 & 오버레이 — PR-B 🔄 부분 완료

**파일**
- `src/components/map/KakaoWaypointMarker.tsx` ✅ (accent 토큰화 완료)
- `src/components/map/WaypointMarker.tsx` ✅ (accent 토큰화 완료)
- `src/components/map/KakaoMap.tsx` ⬜
- `src/components/map/NaverMap.tsx` ⬜
- `src/components/map/KakaoRoutePolyline.tsx` ⬜
- `src/components/map/RoutePolyline.tsx` ⬜
- `src/components/map/MapContainer.tsx` ⬜

**목표 상태**
- 폴리라인 색 `var(--accent)` 런타임 해석 (theme-colors.ts 경유)
- 재검색 버튼: 목업 스펙 (floating pill, shadow-3, backdrop-blur)
- 지도 컨트롤 버튼: `--surface-2` + `--shadow-1`

### 작업 항목
- [ ] `KakaoRoutePolyline.tsx` — polyline stroke 색 `getAccentColor()` 경유
- [ ] `RoutePolyline.tsx` — 같음 (Naver 변종)
- [ ] `MapContainer.tsx` — 재검색 버튼 스타일 목업 맞춤
- [ ] hex 하드코딩 전부 제거 (hex-to-token-map.md 참고)
- [ ] 다크 모드에서 마커 대비 (A/B markers 이미 tokens.html 에서 해결됨)

### Verification
- [ ] PA-Feature-Matrix 영역 H (H1/H2/H3/H4)
- [ ] 실기기 iOS Safari — 지도 태그 터치 반응 확인

---

## 영역 4. Search / Overlay / Bottom UI — PR-C ⬜

**파일**
- `src/components/search/AddressInput.tsx` ✅ 부분 (accent text 완료)
- `src/components/search/SearchOverlay.tsx` ⬜
- `src/components/search/BottomQuickBar.tsx` ⬜
- `src/components/search/RoutineBanner.tsx` ⬜
- `src/components/search/ComparePanel.tsx` ⬜
- `src/components/search/MultiStopSelector.tsx` ⬜
- `src/components/search/RecommendedCategories.tsx` ⬜
- `src/components/search/CategorySelect.tsx` ⬜
- `src/components/search/FavoritesList.tsx` ⬜
- `src/components/search/CacheStatus.tsx` ⬜
- `src/components/search/RoutePreview.tsx` ⬜
- `src/components/search/SaveRouteDialog.tsx` ⬜
- `src/components/ui/BottomSheet.tsx` ✅ (motion + a11y 완료)

**목표 상태** (목업 mobile.html 참고)
- SearchOverlay: 글래스 스택 (`backdrop-filter: blur(24px) saturate(180%)`), `--surface-3`
- BottomQuickBar: 하단 고정, `--shadow-3`, FAB accent
- 시간대별 카테고리 배너: `--overlay-selected` tint
- Routine Banner: 목업의 Dynamic Island Pill 영감 디자인

### 작업 항목
- [ ] `SearchOverlay.tsx` — glass effect + `--surface-3` 적용, 자동완성 리스트 토큰화
- [ ] `BottomQuickBar.tsx` — FAB 그림자 `--shadow-accent-md`, 활성 버튼 그라디언트
- [ ] `RoutineBanner.tsx` — 목업 Pill 스타일 (backdrop-blur + border-accent)
- [ ] `ComparePanel.tsx` — 3열 비교 그리드 StatPods 재활용 검토
- [ ] `MultiStopSelector.tsx` — 경유지 카드 `--surface-1` + `--shadow-1`
- [ ] `FavoritesList.tsx` — 가로 스크롤 카드 `--radius-4` + `--shadow-1`
- [ ] `CacheStatus.tsx` — 뱃지 `--overlay-selected`
- [ ] 키보드 포커스 링 전부 `--accent` + 2px offset
- [ ] SearchOverlay 오픈 시 `--overlay-scrim` 뒷배경

### Verification
- [ ] PA-Feature-Matrix 영역 A (A1/A2/A3), F (F1-F5), G (G1-G6), I (I1-I4), J (J1-J5)
- [ ] PA-Mobile-Visual §3.2 — 글래스 블러 + sticky 바 겹침 없음
- [ ] 키보드 올라올 때 BottomQuickBar 가림/밀림 올바름

---

## 영역 5. Side / Desktop 패널 — PR-D ⬜

**파일**
- `src/components/search/DesktopSidePanel.tsx`
- (신규 가능성) RailNavigation — 목업 desktop.html 의 좌측 56px rail

**목표 상태** (목업 desktop.html 참고)
- 4-pane 레이아웃: `56px 380px 1fr 440px`
- Rail: 아이콘 세로 목록, 활성은 `--overlay-selected`
- Side panel: `--surface-1` + `--shadow-2`, 리스트/결과/필터
- Detail pane (우측 440px): 히어로 그라디언트 + StatPods 2×2

### 작업 항목
- [ ] 현재 `DesktopSidePanel.tsx` 구조 Scout — 단일 패널인지 분리 가능한지
- [ ] 목업 4-pane 대비 갭 분석 (before-after-gaps.md 참고)
- [ ] 좌측 rail 신규 컴포넌트 추가 검토 (홈/검색/즐겨찾기/최근/경로/설정)
- [ ] Split detail 패널 (카드 클릭 시 우측 상세 노출)
- [ ] 카카오·네이버 지도 스타일 유지하면서 토큰만 적용

### Verification
- [ ] 데스크톱 1280px 이상 4-pane 정상
- [ ] 태블릿 768–1024px 경계 처리 (3-pane 축소 or 모바일 폴백?)
- [ ] PA-Feature-Matrix 영역 H4 (경로 그리기)

---

## 영역 6. 공용 UI 컴포넌트 — PR-E ⬜

**파일**
- `src/components/ui/BottomSheet.tsx` ✅
- `src/components/ui/ConfirmDialog.tsx` ⬜
- `src/components/ui/ToastContainer.tsx` ⬜
- `src/components/ui/ErrorFallback.tsx` ⬜
- `src/components/ui/ErrorBoundary.tsx` ⬜ (JSX 없지만 에러 UI가 있다면)
- `src/components/ui/OfflineBanner.tsx` ⬜
- `src/components/ui/InstallBanner.tsx` ⬜
- `src/components/ui/NotificationPermissionBanner.tsx` ⬜
- `src/components/ui/Skeleton.tsx` ⬜
- `src/components/ui/SwipeableCard.tsx` ⬜
- `src/components/ui/BookmarkButton.tsx` ⬜
- `src/components/ui/LanguageSelector.tsx` ⬜
- `src/components/ui/SyncStatus.tsx` ⬜

**목표 상태**
- Dialog/Modal: `--surface-3` + `--shadow-4` + `--radius-5`, 뒷배경 `--overlay-scrim`
- Toast: `--surface-4` + `--shadow-3`, 상태별 left border (`--color-success-500` 등)
- Skeleton: `--bg-surface-muted` + shimmer (accent tint 5%)
- Banners: `--color-info-100` / `--color-warning-100` 배경

### 작업 항목
- [ ] `ConfirmDialog.tsx` — 뒷배경 scrim + dialog 토큰화
- [ ] `ToastContainer.tsx` — 상태별 색 semantic 토큰 사용
- [ ] `ErrorFallback.tsx` — 에러 카드 `--color-error-100` tint
- [ ] `Skeleton.tsx` — shimmer 애니메이션 `--ease-standard` + `--duration-slower`
- [ ] `OfflineBanner.tsx` / `InstallBanner.tsx` — info/warning 배너 통일 스타일
- [ ] `SwipeableCard.tsx` — 스와이프 배경 accent/success mix
- [ ] `BookmarkButton.tsx` — 활성 시 accent, 비활성 `--text-muted`

### Verification
- [ ] PA-Feature-Matrix 영역 I (I1/I2/I3/I4)
- [ ] 다크 모드 모든 UI 컴포넌트 대비 체크

---

## 영역 7. Settings 하위 — PR-F ⬜

**파일**
- `src/components/settings/AppearanceSettings.tsx` ✅ (참고 레퍼런스)
- `src/components/settings/CacheSettings.tsx` ⬜
- `src/components/settings/SyncSettings.tsx` ⬜
- `src/components/settings/NotificationSettings.tsx` ⬜
- `src/components/settings/CustomCategorySettings.tsx` ⬜

**목표 상태** (AppearanceSettings.tsx 를 기준으로 통일)
- 섹션 컨테이너: `--bg-surface` + `--border-soft` 1px + `--radius-4` + `--shadow-0`
- 섹션 제목: `--text-primary` + `--font-weight-semibold` + 아이콘 `--accent`
- 토글 버튼: `--bg-surface-muted` 비활성, `--overlay-selected` 활성
- 입력 필드: `--border-soft` → focus 시 `--accent`

### 작업 항목
- [ ] `CacheSettings.tsx` — 4섹션 카드 통일 스타일
- [ ] `SyncSettings.tsx` — 상태 뱃지 `--color-success-100`
- [ ] `NotificationSettings.tsx` — 권한 상태별 `--color-info/warning-100`
- [ ] `CustomCategorySettings.tsx` — 카테고리 추가 input + 칩 스타일 통일
- [ ] 섹션 간 `gap-6` 유지, 각 섹션 `p-5`

### Verification
- [ ] /settings 스크롤하며 모든 섹션 통일감 확인
- [ ] 7색 테마 전환 시 모든 섹션 accent 반영

---

## 영역 8. 지역 (Place / Saved Routes) — PR-G ⬜

**파일**
- `src/components/place/PlaceDetail.tsx`
- `src/components/saved-routes/QRCodeShare.tsx`
- (기타 saved-routes 하위)

**목표 상태**
- PlaceDetail: 목업 desktop.html 우측 detail 패널과 유사 (히어로 + StatPods + 영업시간 타임라인)
- QR Share: 모달 안 중앙 배치 + 테두리 `--border-soft`

### 작업 항목
- [ ] `PlaceDetail.tsx` — 목업 detail 패널과 갭 분석
- [ ] `QRCodeShare.tsx` — QR 컨테이너 토큰화
- [ ] 액션 그리드 (네비/공유/즐겨찾기/전화) 2×2 or 4×1 통일

### Verification
- [ ] 공유 링크 열기 → 상세 렌더
- [ ] 다크 모드 QR 가독성

---

## 영역별 PR 작성 가이드

### PR 본문 템플릿
```markdown
## Migration: 영역 N — {영역명}

### 범위
- 파일: N개
- hex 리터럴 청소: M개
- 신규/리팩터 컴포넌트: {있으면 나열}

### Before / After
{목업 대비 스크린샷 또는 text description}

### 준수
- [ ] design-system.md §8 체크리스트 전부 통과
- [ ] hex-to-token-map.md 매핑 따라 치환
- [ ] color-hardcoding-guard.sh 통과 (accent 7테마 500 0건)
- [ ] typecheck / vitest pass
- [ ] PA-Feature-Matrix 영역 {X} 통과
- [ ] 7테마 × light/dark spot check (blue/violet/emerald)

### Evidence
- typecheck: pass
- vitest: N/M
- test:prod: passed
```

---

## 진척 추적

이 파일 자체가 할 일 목록. 영역 완료 시:
1. 상단 오버뷰 테이블의 상태 컬럼 ✅ 표시
2. 해당 영역 섹션에 완료 체크 `[x]`
3. Verdict 섹션에 실행 증거 기록

**전체 완료 시점** — 8개 영역 모두 ✅ + 프로덕션 e2e `npm run test:prod` 12/12 pass 유지.
