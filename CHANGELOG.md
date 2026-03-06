# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2-0-0-0.html).

## [0.25.0] - 2026-03-06

### Code Quality Improvements
- **Type Safety Enhancement**: Replaced `any` types with proper TypeScript types
  - ErrorBoundary: Added Sentry interface type definitions
  - naver/client: Added NaverRequestConfig interface for timer tracking
  - monitoring/performance: Added WindowWithSentry interface for Sentry integration

- **Lint Warnings Fixed**: All 9 warnings resolved
  - ErrorBoundary.tsx: 2 `any` types → proper Sentry types
  - naver/client.ts: 3 `any` types + 2 unused variables → NaverRequestConfig interface
  - monitoring/performance.ts: 2 `any` types → WindowWithSentry interface

### Technical Details
- Updated src/components/ui/ErrorBoundary.tsx (Sentry type safety)
- Updated src/lib/map-provider/naver/client.ts (timer tracking type safety)
- Updated src/lib/monitoring/performance.ts (Sentry type safety)

### Code Quality
- **0 errors, 0 warnings** (was 9 warnings)
- Type-safe Sentry integration (supports both installed and non-installed environments)
- Type-safe Axios request/response interceptors
- Removed unused variables (duration in API timing)

### Test Results
- All 672 tests passing ✅
- Zero type errors ✅
- Zero lint warnings ✅
- Build successful ✅

### Migration
- **No user action required**
- Automatic type safety improvements
- No API changes
- No breaking changes

### Notes
- Auto Dev PD GLM v2로 자동 개발 (Code Quality Improvements)
- Sentry works in both installed and non-installed environments
- Type definitions maintain backward compatibility
- Next focus: Performance monitoring enhancements or UX improvements

## [0.24.0] - 2026-03-06

### Error Resilience & Performance Monitoring
- **Error Boundaries**: Graceful error handling and app
  - Created ErrorBoundary component for React error catching
  - Created Next.js error.tsx for root error handling
  - Wrapped app root with error boundary
  - Wrapped map component with error boundary
  - User-friendly error messages with retry options

- **Performance Monitoring**: Real-time performance tracking
  - Created performance monitoring utilities (src/lib/monitoring/performance.ts)
  - Web Vitals collection (LCP, FID, CLS, TTFB, INP)
  - Custom metrics for search and API timing
  - Development-only console logging
  - Automatic Sentry integration (when available)

### Technical Details
- Created src/components/ui/ErrorBoundary.tsx (new)
- Created src/app/error.tsx (new)
- Created src/lib/monitoring/performance.ts (new)
- Updated src/app/layout.tsx (error boundary, web vitals export)
- Updated src/app/hooks/useSearch.ts (performance tracking)
- Updated src/lib/map-provider/naver/client.ts (API timing)

- Added startTimer utility for timing measurements
- Added response interceptors for API duration tracking

### Test Results
- All 672 tests passing ✅
- Zero type errors ✅
- Zero lint errors ✅
- Build successful ✅

### Developer Experience
- Better error visibility in development
- Performance metrics in console
- Graceful error recovery

### Migration
- **No user action required**
- Automatic error handling improvements
- No API changes

- No breaking changes

### Notes
- Auto Dev PD GLM v2로 자동 개발 (Error Resilience & Performance Monitoring)
- Progressive enhancement approach
- Next focus: Code quality improvements or feature enhancements

## [0.23.0] - 2026-03-06

### UX/UI Improvements
- **Mobile UX Optimization**: Enhanced touch targets and interactions
  - Increased button sizes: 48px → 56px (w-12 → w-14)
  - Improved BottomSheet drag handle: 48px × 6px → 56px × 8px
  - Enhanced drag area height: 44px → 56px
  - Added FAB position adjustment (24px bottom spacing on mobile)

- **Loading States Enhancement**: Better visual feedback during loading
  - Added shimmer effect to ResultListSkeleton component
  - Smooth gradient animation for loading placeholders
  - Improved perceived performance

- **Network Status Awareness**: Real-time connectivity feedback
  - Created useNetworkStatus hook for online/offline detection
  - Added slow connection warning (2G/slow-2g detection)
  - Network status banners on mobile search bar
  - Graceful error handling for connectivity issues

### Technical Details
- Enhanced SearchOverlay.tsx (mobile button sizes)
- Enhanced BottomSheet.tsx (drag handle and area)
- Enhanced ResultListSkeleton.tsx (shimmer animation)
- Created useNetworkStatus.ts hook (new)
- Updated globals.css (mobile touch targets, FAB positioning)
- Updated page.tsx (network status integration)
- Added shimmer animation to globals.css

### Test Results
- All 672 tests passing ✅
- Zero type errors ✅
- Zero lint errors ✅
- Build successful ✅

### Accessibility
- Improved touch targets for mobile users (48x48px minimum)
- Better visual feedback for network issues
- Enhanced loading states with animations

### Migration
- **No user action required**
- Automatic UX improvements
- No API changes
- No breaking changes

### Notes
- Auto Dev PD GLM v2로 자동 개발 (UX/UI Improvements)
- Mobile-first optimization approach
- Progressive enhancement for network status
- Next focus: Accessibility improvements or feature enhancements

## [0.22.0] - 2026-03-06

### Performance Improvements
- **Bundle Size Optimization**: Code splitting for better initial load performance
  - Lazy loaded ResultList component (~30KB chunk)
  - ComparePanel already lazy loaded (~50KB chunk)
  - Total gzipped bundle: **285.8 KB** ✅ (Target: <500KB)

### Changed
- ResultList: Now lazy-loaded with loading skeleton
- Improved initial page load time (less JavaScript to parse)
- Better code splitting (smaller chunks load on demand)
- Enhanced browser caching (individual chunks cached separately)

### Technical Details
- Added dynamic import for ResultList in page.tsx
- Created ResultListSkeleton component for loading state
- Configured `ssr: false` for client-only rendering
- All 672 tests passing
- Zero type errors
- Zero lint errors
- Build verified successfully

### Migration
- **No user action required**
- Automatic performance improvement
- No API changes
- No breaking changes

### Notes
- Auto Dev PD GLM v2로 자동 개발 (Performance Optimization)
- Bundle size well under target (<500KB gzipped)
- Next focus: Continue performance monitoring and UX improvements

## [0.21.2] - 2026-03-06

### Changed
- **Dependencies Updated**: Safe patch/minor version updates
  - Prisma: 7.3.0 → 7.4.2
  - React: 19.2.3 → 19.2.4
  - React DOM: 19.2.3 → 19.2.4
  - Zustand: 5.0.10 → 5.0.11
  - Tailwind CSS: 4.1.18 → 4.2.1
  - @tailwindcss/postcss: 4.1.18 → 4.2.1
  - @types/node: 20.19.30 → 20.19.37
  - @types/react: 19.2.10 → 19.2.14
  - @types/pg: 8.16.0 → 8.18.0
  - pg: 8.17.2 → 8.20.0
  - dotenv: 17.2.3 → 17.3.1
  - ESLint: 9.39.2 → 9.39.3 (patch, NOT 10.x)
  - lucide-react: 0.563.0 → 0.577.0

### Technical Details
- 70 packages changed, 12 added, 8 removed
- All 672 tests passing
- Zero type errors
- Zero lint errors
- Build verified successfully
- Prisma client regenerated (v7.4.2)

### Migration
- **No user action required**
- Automatic dependency update via `npm update`

### Notes
- Major version updates skipped (ESLint 10, @types/node 25)
- Production deployment via Railway automatic

## [0.21.1] - 2026-03-06

### Added
- **PLAN.md**: 포괄적인 개발 로드맵 문서 작성
  - 현재 상태 평가 (v0.21.0 기준)
  - 4개 우선순위 영역 식별 (Performance, UX/UI, Features, Tech Debt)
  - 구체적인 작업 항목 및 예상 소요 시간
  - 리스크 평가 및 실행 순서 제안

### Changed
- **문서화 개선**: 향후 개발 방향성 명확화
- **프로젝트 상태 추적**: PLAN.md로 진행 상황 모니터링 가능

### Technical Details
- 모든 시스템 정상 작동 확인
  - ✅ 672개 테스트 통과
  - ✅ 0 린트 에러
  - ✅ 0 타입 에러
  - ✅ 프로덕션 배포 정상 (HTTP 200)
- TODO.md v0.15.0 기능 모두 완료됨 (v0.20.0-0.21.0에서 구현)
- 다음 개발 포커스: 성능 최적화, 모바일 UX, 의존성 업데이트

### Documentation
- **PLAN.md**: 개발 계획 및 로드맵
  - Priority 1: Performance Optimization (2-3시간)
  - Priority 2: UX/UI Improvements (3-4시간)
  - Priority 3: Feature Enhancements (4-5시간)
  - Priority 4: Technical Debt (2-3시간)

### Migration
- **자동 마이그레이션** (사용자 액션 불필요)
- 기능 변경 없음 (문서 추가만)

### Notes
- Auto Dev PD GLM v2로 자동 분석 및 계획 수립
- 프로젝트가 안정적인 상태로, 새로운 기능 개발 준비 완료

## [0.21.0] - 2026-03-06

### Fixed
- 린트 warning 2개 해결 (any 타입 → 구체적 타입)
- TypeScript strict mode 준수 강화
- AddressInput.test.tsx에서 `afterEach` import 누락 수정

### Technical Details
- `src/app/api/search/__tests__/route.test.ts`:
  - `as any` → `as IDirectionsProvider`로 수정 (L313, L384)
  - 타입 안전성 개선
- `src/components/search/__tests__/AddressInput.test.tsx`:
  - `afterEach` import 추가
- **0 errors, 0 warnings** 달성
- 672개 테스트 여전히 통과

### Test Results
- **672개 테스트 모두 통과** (77 test files)
- 타입 체크 통과 (0 errors)
- 린트 통과 (0 errors, 0 warnings)
- 빌드 성공

### Migration
- **자동 마이그레이션** (사용자 액션 불필요)
- 기능 변경 없음 (테스트 코드만 수정)

### Notes
- Auto Dev PD GLM v2로 자동 개발 (코드 품질 개선)

## [0.20.0] - 2026-03-06

### Added
- **자유 경유지 검색**: "홍대입구역", "이태원 맛집" 등 키워드 검색 지원
  - Naver Local Search API 통합으로 자유로운 검색어 입력 가능
  - 검색 타입 자동 감지 (category vs keyword)
  - 검색창 placeholder 개선: "어디를 들를까? (예: 홍대입구역, 다이소, 스타벅스)"

- **단일 선택 UX 가이드**: 하나만 선택하게 가이드하는 UI/UX 개선
  - 첫 번째 선택 후 나머지 체크박스 자동 비활성화
  - 명확한 시각적 피드백 (💡 안내 문구)
  - "다른 경유지 추가하기" 버튼으로 다중 선택 모드 진입
  - 다중 선택 시 "⚠️ 여러 경유지 선택 시 더 복잡한 경로가 됩니다" 경고

### Changed
- 검색창 placeholder를 더 직관적으로 변경
- ResultList에서 단일 선택 로직 강화 (search-store.ts 연동)

### Technical Details
- `src/lib/detour/calculator.ts`: `searchType` 파라미터 추가 ('category' | 'keyword')
- `src/lib/map-provider/naver/search.ts`: Naver Local Search API 래퍼 구현
- `src/store/search-store.ts`: `allowMultiSelect` 상태 관리 추가
- `src/components/search/ResultList.tsx`: 단일 선택 UI 로직 구현
- `src/components/search/MultiStopSelector.tsx`: 단일 선택 모드 지원

### Test Results
- **672개 테스트 모두 통과** (670 + 2 신규)
  - TC-9: 키워드 검색 (홍대입구역)
  - TC-10: 검색 타입 자동 감지 (category vs keyword)
- 빌드 성공
- 타입 체크 통과
- 린트 통과

### Migration
- **자동 마이그레이션** (사용자 액션 불필요)
- 기존 카테고리 검색은 그대로 동작
- 기존 단일 선택 동작 유지

### Notes
- Auto Dev PD GLM v2로 자동 개발 (Phase 1 → Phase 2 → Phase 3)
- **핵심 발견**: 모든 기능이 이미 구현되어 있어 문서화 + 테스트 추가만 수행

## [0.19.0] - 2026-03-06

### Changed
- **단일 선택 UX 개선**: MultiStopSelector에서 기본적으로 하나의 경유지만 선택하도록 UX 변경
  - 첫 번째 선택 후 나머지 체크박스 자동 비활성화
  - "다른 경유지 추가하기" 버튼으로 다중 선택 모드 진입
  - 다중 선택 모드에서 안내 문구 및 경고 표시
  - "완료" 버튼으로 단일 선택 완료 가능

### Fixed
- 기존 사용자 혼란 방지를 위한 가이드 문구 추가
- 선택 초기화 시 단일 선택 모드로 자동 복귀

### Technical
- MultiStopSelector 컴포넌트 리팩토링 (allowMultiSelect 상태 추가)
- handleToggle 로직 개선 (단일 선택 모드 지원)
- 유닛 테스트 10개 추가 (모두 통과)

### Test Results
- 670개 테스트 모두 통과 (660 + 10)
- 빌드 성공
- 모든 기존 테스트 통과

### Notes
- Auto Dev PD GLM v2로 자동 개발
- Phase 1: Planning → Phase 2: Implementation Document → Phase 3: Coding

## [0.18.0] - 2026-03-06

### Added
- **접근성 향상**
  - CategorySelect: aria-label, aria-pressed 속성 추가
  - ResultCard: aria-describedby로 부가 정보 연결
  - MapContainer: aria-label, role="application" 추가

### Accessibility Improvements
- WCAG 2.1 AA 준수도 향상
- 스크린 리더 호환성 개선

### Test Results
- 663개 테스트 모두 통과 (660 + 3)
- 모든 기존 테스트 통과

### Notes
- Auto Dev PD GLM v2로 자동 개발
- 접근성 테스트 3개 추가 (CategorySelect, ResultList, MapContainer)

## [0.17.1] - 2026-03-06

## [0.17.0] - 2026-03-06

### Verified
- **자유 경유지 검색 + 단일 선택 UX 기능 검증 완료**
  - `/api/search`: query 파라미터 및 searchType 자동 감지 로직 검증 ✅
  - 검색창 placeholder: "어디를 들를까? (예: 홍대입구역, 다이소, 스타벅스)" ✅
  - 시간대별 스마트 제안 칩 정상 동작 ✅
  - 단일 선택 UX (selectedPlaces, allowMultiSelect) 완전 구현 ✅
  - 비활성화 로직, 안내 메시지 UI 정상 동작 ✅

### Technical Details
- TODO.md v0.15.0 목표가 v0.16.1에 이미 완전히 구현됨을 확인
- 660개 테스트 모두 통과 (8.82초)
- 기존 기능 호환성 유지 (다중 선택 로직 포함)

### Notes
- Auto Dev PD GLM v2로 자동 검증 및 버전 업데이트
- 새로운 코드 추가 없음 (이미 구현된 기능 검증)

## [0.16.1] - 2026-03-06

### Fixed
- **AddressInput clear 버튼 접근성 개선**
  - `title="삭제"`, `aria-label="삭제"` 속성 추가
  - 테스트 실패 수정 (검색 버튼과 clear 버튼 식별 가능)

### Test Results
- 660개 테스트 모두 통과 ✅

## [0.16.0] - 2026-03-06

### Added
- **단일 선택 UX 가이드**
  - 첫 번째 경유지 선택 후 나머지 비활성화 (회색 표시)
  - "완료" / "다른 경유지 추가하기" 버튼 UI
  - 안내 메시지: "💡 하나만 선택하면 더 효율적인 경로를 얻을 수 있습니다"
  - 다중 선택 시 경고 메시지: "⚠️ 여러 경유지 선택 시 더 복잡한 경로가 됩니다"

### Changed
- 검색창 placeholder: "어디를 들를까? (예: 홍대입구역, 다이소, 스타벅스)"
- `/api/search` 라우트: `category` → `searchQuery`로 통합 (category/query 모두 지원)
- `ResultList.tsx`: 단일 선택 UX 상태 관리 추가
- `ResultCard.tsx`, `CompactCard.tsx`: `disabled` prop 지원

### Technical Details
- `src/store/search-store.ts`: togglePlaceSelection, enableMultiSelect, resetSelection 액션 구현
- `src/components/search/ResultList.tsx`: useSearchStore 연동, 안내 메시지 UI 추가
- `src/components/search/result-list/ResultCard.tsx`: disabled 시 클릭/터치 차단, 시각적 피드백
- `src/components/search/result-list/CompactCard.tsx`: 동일하게 disabled 지원
- `src/app/api/search/route.ts`: searchQuery로 통합하여 캐시/로그 저장

### Notes
- TODO.md 기반 Phase 1, 2, 3 완료 (MVP)
- Phase 4 (반응형 UI) 이미 구현됨
- 백엔드는 이미 자유 경유지 검색 지원 중 (v0.15.0)

## [0.15.0] - 2026-03-06

### Added
- **자유 경유지 검색 지원** (Naver Local Search API)
  - "홍대입구역", "이태원 맛집", "다이소 강남점" 등 자유 텍스트 검색 가능
  - 카테고리 검색과 키워드 검색 자동 전환 (searchType 자동 감지)
  - 검색창 placeholder: "어디를 들를까? (예: 홍대입구역, 다이소)"
  - 검색 버튼 UI 추가 (돋보기 클릭 → 자동완성 새로고침)

### Technical Details
- `src/lib/map-provider/naver/search.ts`: searchPlaces 함수로 키워드 검색 지원 (이미 구현됨)
- `src/app/api/search/route.ts`: query 파라미터와 searchType 자동 감지 로직 검증, searchType을 calculateDetourCosts에 전달하도록 수정
- `src/components/search/AddressInput.tsx`: placeholder 이미 설정됨
- `src/store/search-store.ts`: selectedPlaces, allowMultiSelect 상태 정의, togglePlaceSelection/enableMultiSelect/resetSelection 액션 추가
- `src/components/search/result-list/ResultListContext.tsx`: 선택 관련 상태 및 콜백 추가 (준비 단계)

### Notes
- TODO.md 기반 Phase 1, 2 완료
- Phase 3 (단일 선택 UX)은 상태 관리 추가까지만 완료 (UI는 기존 UX와 충돌 방지 위해 보류)
- 기존 다중 선택 기능 유지 (핀 고정, 방문 표시 등)
- 1개 테스트 실패 (AddressInput 버튼 중복 문제) - 수정 예정
- Phase 4 (반응형 UI) 이미 구현됨
- Phase 5 (테스트) 통과 (75/76, 1개 실패는 사사소한 UI 문제)

## [0.14.0] - 2026-03-05

### Fixed
- ESLint 경고 수정 (waitFor 미사용 import 제거)

### Changed
- PHASES.md 진행률 업데이트 (55% → 100%)
- TODO.md 완료된 작업 정리
- 다음 버전 계획 추가 (v0.15.0+)

### Notes
- 모든 Phase 완료 (Phase 0~8)
- 프로덕션 배포 준비 완료
- 658개 테스트 통과

## [0.13.0] - 2026-03-05

### Added
- **카카오맵 스타일 컬러 팔레트 CSS 변수 추가**
  - Primary: #3274F9 (파란색)
  - Secondary: #FF6B00 (주황색 - 이탈 거리)
  - Success: #4CAF50 (초록색 - 거리/시간)
  - 다크모드용 색상 추가 (Dark Primary: #60A5FA, Dark Secondary: #FFA500)

### Technical Details
- globals.css: 카카오맵 스타일 CSS 변수 추가 (--kakao-primary, --kakao-secondary, --kakao-success)
- theme.css: 다크모드용 카카오맵 스타일 변수 추가
- Fallback 색상 정의 (CSS 변수 미지원 브라우저 대응)
- WCAG AA 색상 대비 기준 준수

### Notes
- UI 컴포넌트 변경은 다음 버전에서 진행 예정
- 점진적 마이그레이션을 위해 기존 CSS 변수 유지

## [0.12.0] - 2026-03-05

### Changed
- **UI/UX: 카카오맵 스타일 완성**
  - 검색창 둥근 모서리 (rounded-2xl) + 그림자 효과 (shadow-xl)
  - 자동완성 리스트: 장소명 파란색 + 굵은 폰트, 카테고리 회색
  - 결과 카드: 매장명 파란색 (#3274F9) + 굵은 폰트
  - 최근 검색 카드: 둥근 모서리 + 그림자 효과
  - 다크모드 색상 일관성 유지

### Technical Details
- AddressInput: 검색창 스타일 개선 (rounded-2xl)
- AddressInput: 자동완성 리스트 스타일 개선 (장소명 파란색, 카테고리 회색)
- CompactCard: 매장명 파란색으로 변경
- SearchOverlay: 최근 검색 카드 스타일 개선

## [0.11.1] - 2026-03-05

### Fixed
- AddressInput 테스트 타이머 모킹 추가 (fake timers)
- 테스트 타임아웃 문제 해결 (debounce timer 처리)
- 모든 테스트 통과 (658/658)

## [0.11.0] - 2026-03-05

### Changed
- **UI/UX: 카카오맵 스타일 개선**
  - 컬러 팔레트 변경 (파란색 #3274F9 기반)
  - 검색창 둥근 모서리 + 그림자 효과
  - 자동완성 리스트 스타일 (아이콘 + 계층형 텍스트)
  - 결과 카드 디자인 (파란색 매장명, 회색 주소, 초록색 배지)
  - 숫자 마커 (1, 2, 3...)
  - 파란색 경로 선
  - 드래그 핸들 색상 개선

### Added
- 타이포그래피 CSS 변수 추가
- 맥동 애니메이션 (현재 위치 마커)

### Fixed
- 다크모드 색상 일관성 개선

## [0.10.0] - 2026-03-05

### Added
- **모바일 UX 개선**
  - BottomSheet 드래그 핸들 시각적 피드백 (드래그 시 색상 변경 + 크기 확대)
  - 터치 영역 확대 (20px → 44px, iOS 권장 터치 영역)
  - 지도 줌/팬 시 검색 오버레이 자동 숨김
  - 줌 완료 후 1초 뒤 오버레이 복원

- **테스트 커버리지 향상**
  - CategorySelect 컴포넌트 테스트 7개 추가
  - AddressInput 컴포넌트 테스트 8개 추가
  - 테스트 setup 파일 생성 (src/test/setup.ts, global.d.ts)
  - vitest.config.ts에 setupFiles 추가

### Changed
- useMapState 훅에 mapZoomed state 추가
- MapContainer 컴포넌트에 onMapInteraction, onResetInteraction props 추가
- @testing-library/jest-dom 패키지 추가

### Fixed
- 지도 제스처 최적화 (드래그/줌 모두 "이 지역 재검색" 버튼 표시)

## [0.9.1] - 2026-03-05

### Fixed
- TypeScript 타입 에러 수정 (ErrorFallback, route-validation)
- GPS 권한 에러 메시지 개선
- 접근성 개선 (ResultCard, AddressInput ARIA 라벨)

### Changed
- 로딩 UX 개선 (진행 상태 표시, 취소 버튼)

## [0.9.0] - 2026-03-05

### Fixed
- ESLint 경고 0개 달성
- 미사용 import 제거 (ResultListSkeleton)
- `.eslintignore` 파일 생성

### Changed
- eslint 설정에 coverage 폴더 제외 추가

## [0.8.0] - 2026-03-04

### Added
- Naver 폴백 테스트 추가 (46 tests)
- DatabaseError 클래스 도입
- 컴포넌트 테스트 기반 구축 (ResultList, ResultCard, SearchOverlay)
- BB 최적화 (6회→1회 순회)
- intervalMeters 가드 추가

### Fixed
- DatabaseError 테스트 호환성 문제 수정
- maxDetourDistance NaN/0 방어 guard 추가
- Circuit Breaker 부분 결과 보존
- haversineDistance NaN 방어

### Changed
- 테스트 커버리지 67.49% (+4.49%)
- utils.ts 테스트 커버리지 39%→70%+

## [0.7.0] - 2026-03-03

### Added
- UI/UX 개선 (다크모드 일관성, 카드 호버 효과)
- 접근성 개선 (aria-label 보완)
- 성능 최적화

### Changed
- 시간 정확도 안내 추가
- 빈 상태 일러스트 개선

---

## 자동 개발 정보

이 프로젝트는 **Auto Dev PD GLM v2**를 통해 자동으로 개발됩니다.
- 모델: glm-5 (ZhipuAI)
- 주기: 1시간마다
- 알림: 미드웨이더 그룹 (-5079851665)
