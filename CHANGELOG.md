# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
