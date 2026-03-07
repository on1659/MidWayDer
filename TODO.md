# MidWayDer TODO

## v0.45.0 - Accessibility Enhancement ✅ COMPLETE (2026-03-07)

### Priority 1: ARIA 속성 보완 ✅
- [x] 검색 컨테이너 role="search" 추가
- [x] 버튼 aria-label 추가 (GPS, Share)
- [x] 동적 콘텐츠 aria-live 유지

### Priority 2: 스크린 리더 지원 ✅
- [x] .sr-only 클래스 추가
- [x] .sr-only-focusable 클래스 추가

### Test Results ✅
- [x] 712 tests passing
- [x] 0 TypeScript errors
- [x] 0 ESLint warnings
- [x] Build successful

## v0.44.0 - Dark Mode Enhancement ✅ COMPLETE (2026-03-07)

### Priority 1: Dark Mode Improvements ✅
- [x] 전환 애니메이션 추가 (0.2-0.3s ease-out)
- [x] CSS 변수 체계화 (이미 완료됨)
- [x] 누락된 Tailwind 오버라이드 추가 (15개)
- [x] 지도 전환 제외 (성능 최적화)

### Test Results ✅
- [x] 712 tests passing
- [x] 0 TypeScript errors
- [x] 0 ESLint warnings
- [x] Build successful

## v0.43.0 - Performance Optimization ✅ COMPLETE (2026-03-07)

### Priority 1: Font Optimization ✅
- [x] next/font 적용 (Noto Sans KR)
- [x] display: swap 설정
- [x] preload 활성화

### Priority 2: Icon Optimization ✅
- [x] SVG 아이콘 추가 (manifest)
- [x] iOS PWA 메타 태그 개선
- [x] Service Worker 캐시 업데이트

### Test Results ✅
- [x] 712 tests passing
- [x] 0 TypeScript errors
- [x] 0 ESLint warnings
- [x] Build successful

## v0.42.0 - PWA Support ✅ COMPLETE (2026-03-07)

### Priority 1: Service Worker ✅
- [x] Service Worker 구현 (sw.js)
- [x] 오프라인 캐싱 전략 수립
- [x] 캐시 버전 관리

### Priority 2: Manifest & Icons ✅
- [x] manifest.json 검토 및 최적화
- [x] 아이콘 세트 생성 (192x192, 512x512)
- [x] SVG 아이콘 추가

### Priority 3: Offline Support ✅
- [x] 오프라인 페이지 구현
- [x] 오프라인 감지 및 알림
- [ ] 백그라운드 동기화 (선택 - Future)

### Priority 4: Installation ✅
- [x] 홈 화면 설치 배너 (beforeinstallprompt)
- [x] 설치 유도 UI
- [x] 설치 완료 추적

## v0.41.0 - SEO Optimization ✅ COMPLETE (2026-03-07)

### Priority 1: SEO Core ✅
- [x] Meta tags 추가 (title, description, keywords)
- [x] Open Graph tags 추가 (Facebook, LinkedIn)
- [x] Twitter Cards 추가
- [x] Canonical URLs 설정
- [x] robots.txt 최적화
- [x] sitemap.xml 생성

### Priority 2: Performance & Monitoring ✅
- [x] Web Vitals 추적 추가
- [x] Lighthouse 점수 확인 및 개선

### Priority 3: Documentation ✅
- [x] CHANGELOG.md 업데이트
- [ ] README.md SEO 섹션 추가 (optional)

## Future Versions

### v0.44.0 - User Experience
- [ ] 개인화 추천 시스템 강화
- [ ] 다국어 지원 (i18n)
- [ ] 다크 모드 개선

### v0.45.0 - Advanced Features
- [ ] 백그라운드 동기화
- [ ] 푸시 알림
- [ ] 오프라인 검색 캐시
