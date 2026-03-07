# MidWayDer TODO

## 완료된 버전 (v0.41.0 ~ v0.54.0)

### v0.54.0 - TypeScript 타입 에러 수정 ✅ (2026-03-08)
- [x] search-cache.test.ts 타입 에러 3개 해결
- [x] 728 tests passing
- [x] 0 TypeScript errors

### v0.53.0 - 설정 페이지 및 캐시 관리 ✅ (2026-03-08)
- [x] /settings 라우트 추가
- [x] CacheSettings 컴포넌트 (IndexedDB 기반)
- [x] ConfirmDialog 컴포넌트
- [x] useCacheStats 훅
- [x] 728 tests passing

### v0.52.0 - ESLint 경고 해결 ✅ (2026-03-08)
- [x] 21개 `@typescript-eslint/no-explicit-any` 경고 → 0개
- [x] 타입 안전성 강화
- [x] 719 tests passing

### v0.51.0 - 캐시 UI 통합 ✅ (2026-03-07)
- [x] CacheStatus 컴포넌트를 ResultList에 추가
- [x] 오프라인/온라인 상태 구분
- [x] 캐시 크기 표시
- [x] 719 tests passing

### v0.50.0 - 오프라인 검색 캐시 ✅ (2026-03-07)
- [x] Dexie.js 도입 (IndexedDB 래퍼)
- [x] 최근 검색 결과 자동 캐시 (24시간 TTL)
- [x] 오프라인 상태에서 캐시된 결과 조회
- [x] Cache-First 전략
- [x] 719 tests passing (+8)

### v0.49.0 - LocaleContext ESLint 에러 수정 ✅ (2026-03-07)
- [x] useState lazy initialization
- [x] useEffect 내부 setState 호출 제거
- [x] 720 tests passing

### v0.48.0 - 다국어 지원 (i18n) ✅ (2026-03-07)
- [x] Context API 기반 경량 i18n 구현
- [x] LocaleContext + useLocale 훅
- [x] localStorage 언어 설정 저장
- [x] 브라우저 언어 자동 감지
- [x] LanguageSelector 컴포넌트
- [x] 한국어/영어 번역 (70+ keys)
- [x] 720 tests passing (+8)

### v0.47.0 - 코드 품질 개선 ✅ (2026-03-07)
- [x] ESLint 에러/경고 4개 → 0개
- [x] SearchOverlay useCallback 조건부 호출 문제 해결
- [x] 미사용 import 제거
- [x] 712 tests passing

### v0.46.0 - 개인화 추천 시스템 ✅ (2026-03-07)
- [x] 검색 히스토리 기반 추천
- [x] 빈도/최신성/시간대 점수 계산
- [x] "자주 찾는 카테고리" 섹션
- [x] 추천 배지 표시
- [x] 712 tests passing

### v0.45.0 - 접근성 강화 ✅ (2026-03-07)
- [x] ARIA 속성 보완 (role="search", aria-label)
- [x] 스크린 리더 지원 (.sr-only)
- [x] 712 tests passing

### v0.44.0 - 다크 모드 개선 ✅ (2026-03-07)
- [x] 전환 애니메이션 추가 (0.2-0.3s ease-out)
- [x] CSS 변수 체계화
- [x] Tailwind 오버라이드 15개 추가
- [x] 712 tests passing

### v0.43.0 - 폰트/아이콘 최적화 ✅ (2026-03-07)
- [x] next/font 적용 (Noto Sans KR)
- [x] SVG 아이콘 추가 (manifest)
- [x] iOS PWA 메타 태그 개선
- [x] 712 tests passing

### v0.42.0 - PWA 지원 ✅ (2026-03-07)
- [x] Service Worker 구현 (sw.js)
- [x] 오프라인 페이지 구현
- [x] 홈 화면 설치 배너
- [x] 712 tests passing

### v0.41.0 - SEO 최적화 ✅ (2026-03-07)
- [x] Meta tags, Open Graph, Twitter Cards
- [x] sitemap.xml, robots.txt
- [x] Web Vitals 추적
- [x] 712 tests passing

---

## 다음 버전 계획

### v0.55.0 - 문서화 정리 ✅ (2026-03-08)
- [x] TODO.md 정리 (완료된 항목 제거)
- [x] README.md 업데이트 (v0.54.0 기능 반영)
- [x] CHANGELOG.md 최신화
- [x] package.json 버전 업데이트 (0.54.0 → 0.55.0)

### v0.56.0 - 성능 모니터링 강화 ✅ (2026-03-08)
- [x] Vercel Analytics 연동 (Web Vitals 자동 수집)
- [x] 커스텀 성능 메트릭 (검색 응답 시간, 지도 렌더링)
- [x] @sentry/nextjs 설치 (DSN 설정 시 활성화)
- [x] 성능 리포트 페이지 (/admin/performance)

### v0.58.0 - 백그라운드 동기화 ✅ (2026-03-08)
- [x] Service Worker 백그라운드 동기화 구현
- [x] 오프라인 검색 큐 (IndexedDB)
- [x] 동기화 상태 표시 UI
- [x] 충돌 해결 전략
- [x] 745 tests passing (+17)

### v0.59.0 - 푸시 알림 (선택)
- [ ] PWA 푸시 알림 구현
- [ ] 알림 권한 요청 UI
- [ ] 알림 구독 관리 (Prisma 모델)
- [ ] 알림 전송 API

### v0.58.0 - 백그라운드 동기화 (선택)
- [ ] Service Worker 백그라운드 동기화
- [ ] 오프라인 검색 큐 (IndexedDB)
- [ ] 동기화 상태 표시 UI
- [ ] 충돌 해결 전략

---

## 장기 로드맵

### v0.60.0 - 고급 기능
- [ ] 경로 저장/공유 기능 강화
- [ ] 커스텀 카테고리 추가
- [ ] 즐겨찾기 기능
- [ ] 검색 필터 고급 옵션

### v0.70.0 - 협업 기능
- [ ] 그룹 경로 계획
- [ ] 실시간 위치 공유
- [ ] 투표 기능 (경유지 선택)

### v0.80.0 - AI 기능
- [ ] AI 기반 경유지 추천
- [ ] 자연어 검색 ("맛있는 거 먹고 싶어")
- [ ] 음성 인터페이스

---

**마지막 업데이트:** 2026-03-08
**현재 버전:** v0.56.0
**다음 버전:** v0.57.0 (푸시 알림)
