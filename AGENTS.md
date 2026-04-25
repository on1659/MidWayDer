# MidWayDer 에이전트 관리 문서

## 에이전트 아키텍처

```
           조정자 (Orchestrator)
                  │
     ┌────────────┼────────────┐
     ▼            ▼            ▼
 기획자 팀    프로그래머 팀    QA 팀
  (3명)        (4명)        (3명)
```

---

## Core Teams (MVP)

### 기획자 팀 (Planner Team)

| ID | 역할 | 모델 | 담당 영역 | 상태 |
|----|------|------|----------|------|
| P1 | Product Planner | **sonnet** | 비즈니스 요구사항 → 기술 명세, API 데이터 구조 정의 | ✅ 활성 |
| P2 | UX Planner | **sonnet** | 사용자 플로우, UI 상태 관리, 폴백 전략 | ⏳ 대기 |
| P3 | API Architect | **sonnet** | API 설계, 데이터 모델, Request/Response 스키마 | ✅ 활성 |

### 프로그래머 팀 (Developer Team)

| ID | 역할 | 모델 | 담당 영역 | 상태 |
|----|------|------|----------|------|
| D1 | Backend Developer | **opus** | API Routes, Prisma, PostGIS, DB 쿼리 | ✅ 활성 |
| D2 | Algorithm Engineer | **opus** | Detour Cost 알고리즘, Polyline 샘플링, 근접도 계산 | ✅ 활성 |
| D3 | Frontend Developer | **sonnet** | React 컴포넌트, Naver Maps SDK, Zustand 상태 관리 | ⏳ 대기 |
| D4 | Integration Developer | **sonnet** | Naver Maps API 래퍼, Retry 로직, 에러 처리 | ✅ 활성 |

### QA 팀 (QA Team)

| ID | 역할 | 모델 | 담당 영역 | 상태 |
|----|------|------|----------|------|
| Q1 | Test Engineer | **haiku** | 기능 테스트, E2E 테스트, 예외 케이스 검증 | ⏳ 대기 |
| Q2 | Performance Tester | **haiku** | 성능 벤치마크, PostGIS 쿼리 프로파일링 | ⏳ 대기 |
| Q3 | Security Tester | **haiku** | 보안 검증, 입력 검증, API 키 노출 방지 | ⏳ 대기 |

### 운영/리포팅 팀 (Ops Reporting)

| ID | 역할 | 모델 | 담당 영역 | 상태 |
|----|------|------|----------|------|
| R1 | Reporter | **sonnet** | 세션 종료 시 `docs/progress/YYYY-MM-DD.md`에 진행 기록 작성, 세션명/모델명 명시 | ✅ 활성 |

---

## Extended Teams (향후 확장)

### 마케팅 팀

| ID | 역할 | 담당 영역 | 상태 |
|----|------|----------|------|
| M1 | SEO Specialist | 검색 최적화, sitemap, meta 태그 | 🔒 미활성 |
| M2 | Content Marketer | 블로그, 소셜 미디어, 사용 가이드 | 🔒 미활성 |
| M3 | Growth Hacker | A/B 테스트, 전환율 최적화 | 🔒 미활성 |

### 데이터 분석 팀

| ID | 역할 | 담당 영역 | 상태 |
|----|------|----------|------|
| DA1 | Data Analyst | 사용자 행동 분석, 검색 패턴 | 🔒 미활성 |
| DA2 | ML Engineer | 경유지 추천 모델, 개인화 | 🔒 미활성 |
| DA3 | Analytics Engineer | 데이터 파이프라인, 대시보드 | 🔒 미활성 |

### DevOps 팀

| ID | 역할 | 담당 영역 | 상태 |
|----|------|----------|------|
| DO1 | Infrastructure Engineer | Railway, Vercel 인프라 관리 | 🔒 미활성 |
| DO2 | CI/CD Engineer | GitHub Actions, 자동 배포 | 🔒 미활성 |
| DO3 | Monitoring Engineer | 로깅, 알림, 성능 모니터링 | 🔒 미활성 |

### 디자인 팀

| ID | 역할 | 담당 영역 | 상태 |
|----|------|----------|------|
| DS1 | UI Designer | 컴포넌트 디자인, 디자인 시스템 | 🔒 미활성 |
| DS2 | UX Designer | 사용성 테스트, 와이어프레임 | 🔒 미활성 |
| DS3 | Brand Designer | 로고, 브랜딩, 컬러 시스템 | 🔒 미활성 |

---

## 에이전트 활성화 규칙

### 하이브리드 전략 (Option 3)

| 작업 유형 | 처리 방식 | 예시 |
|----------|----------|------|
| **단순 작업** | 직접 처리 (에이전트 X) | 설정 파일, 타입 정의, 단일 파일 수정 |
| **복잡 작업** | 병렬 에이전트 | Naver API 연동, Detour 알고리즘, 프론트엔드 |
| **통합 작업** | 순차 에이전트 | API Routes (백엔드 의존), QA 테스트 |

### 에이전트 배정 기준

1. **파일 수 3개 이상** → 에이전트 사용
2. **독립적 모듈** → 병렬 에이전트
3. **의존성 있음** → 순차 에이전트
4. **단일 파일** → 직접 처리

---

## Codex 어댑터 운영

Claude-first 하네스와 동일한 규칙을 Codex에서도 사용한다.

### 기준 문서

| 계층 | 기준 |
|------|------|
| 팀/역할 | `AGENTS.md` |
| 하네스 코어 | `docs/harness/*` |
| 실행 규칙 | `.claude/rules/*` |
| Hook 로직 | `.claude/hooks/*` |
| Codex 어댑터 | `.codex/*` |

### Codex 라우팅

| 요청 성격 | Codex 처리 |
|----------|------------|
| 일반 작업 | `.codex/commands/work.md` 기준으로 route 분류 |
| 구현/수정 | `.codex/commands/build.md` |
| 설계/방향 검토 | `.codex/commands/meeting.md` |
| 코드 리뷰 | `.codex/commands/review.md` |
| QA/검증 | `.codex/commands/qa.md` |
| 하네스 개선 | `.codex/commands/improve-harness.md` |

### Codex Hook 원칙

1. `.codex/hooks/codex-hook-dispatch.sh`가 Codex 이벤트를 Claude hook 입력 형태로 변환한다.
2. 실제 guard 판단은 `.claude/hooks/*.sh`를 재사용한다.
3. 규칙을 `.codex`와 `.claude`에 중복 정의하지 않는다.
4. Codex 런타임이 project-local hook을 못 읽는 경우를 위해 `~/.codex/hooks.json`은 repo-local dispatcher만 호출한다.

---

## 상태 범례

| 상태 | 의미 |
|------|------|
| ✅ 활성 | 현재 Phase에서 작업 진행 중 |
| ⏳ 대기 | 다음 Phase에서 활성화 예정 |
| 🔒 미활성 | MVP 이후 확장 시 활성화 |
| ✔️ 완료 | 담당 Phase 작업 완료 |
