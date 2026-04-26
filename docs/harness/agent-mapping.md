# MidWayDer 하네스 역할 매핑

> 목적: `AGENTS.md`에 정의된 P1~Q3 팀 구조를 실제 하네스 운영 역할과 연결한다.

---

## 먼저 구분할 것

MidWayDer에는 두 종류의 역할이 있다.

### 1. 조직 역할

이미 `AGENTS.md`에 정의된 역할이다.

- P1 Product Planner
- P2 UX Planner
- P3 API Architect
- D1 Backend Developer
- D2 Algorithm Engineer
- D3 Frontend Developer
- D4 Integration Developer
- Q1 Test Engineer
- Q2 Performance Tester
- Q3 Security Tester

### 2. 하네스 운영 역할

하네스가 작업을 흘릴 때 쓰는 역할이다.

- Orchestrator
- Scout
- Planner Lane
- Dev Lane
- Reviewer
- QA Lane

하네스 문서의 핵심은 이 둘을 연결하는 것이다.

---

## 상위 매핑 표

| 하네스 역할 | MidWayDer 실제 역할 | 비고 |
|------------|---------------------|------|
| Orchestrator | 현재 메인 에이전트 또는 조정자 | 작업 분류, 단계 활성화, 최종 보고 |
| Scout | 읽기 전용 탐색 역할 | 정식 팀원이 아니라 운영상 보조 역할 |
| Planner Lane | P1, P2, P3 | 요청 성격에 따라 일부만 활성화 |
| Dev Lane | D1, D2, D3, D4 | 파일 소유권 기준으로 병렬/순차 분리 |
| Reviewer | 비소유 개발자 + 필요 시 Q3 교차 검토 | 구현자 본인이 아닌 관점 필요 |
| QA Lane | Q1, Q2, Q3 | 작업 성격에 따라 경량/풀가동 |

---

## Orchestrator

### 역할

- 모든 요청의 진입점
- `SIMPLE/STANDARD/COMPLEX` 분류
- 활성화할 역할 결정
- Scout 보고서와 Planner 산출물을 Dev Lane에 연결
- 최종 Closeout 작성

### 입력

- 사용자 요청
- 현재 저장소 상태
- `AGENTS.md`
- `CLAUDE.md`
- `HANDOFF.md`

### 출력

- Intake 요약
- Triage 판정
- 활성화 역할 목록
- 최종 보고

### 절대 놓치면 안 되는 것

- 범위가 큰데 바로 구현으로 보내지 않기
- must-preserve contracts 없이 Dev Lane을 열지 않기
- 검증 증거 없이 "완료" 처리하지 않기

---

## Scout

### 역할

Scout는 AGENTS.md의 팀원 중 하나가 아니라,
**읽기 전용 탐색 전용 역할**이다.

### 왜 별도 역할로 둬야 하는가

P1~Q3는 모두 분석/구현/검증 책임이 섞여 있다.
하지만 MidWayDer에서는 복잡한 요청일수록 먼저 **정찰 보고서**가 있어야 한다.

Scout는 아래만 한다.

- 관련 파일 목록화
- 기존 패턴 발견
- 타입/API/store/provider 연결 추적
- must-preserve contracts 정리

### 입력

- 사용자 요청
- 전체 코드베이스

### 출력

- 수정 대상 파일
- 참조 파일
- 패턴
- 의존성
- 영향 범위
- must-preserve contracts

### 금지

- 코드 수정
- 설계 결론 선점
- 구현 세부안 확정

---

## Planner Lane

Planner Lane은 하나의 역할이 아니라, 아래 세 역할의 묶음이다.

### P1 Product Planner

#### 주 책임

- 사용자가 왜 이 기능을 원하는지 해석
- v1 범위/비범위 정리
- Acceptance criteria 정의

#### 주로 깨우는 상황

- 기능 가치가 모호할 때
- "좋아 보인다" 수준의 요구일 때
- 정렬/추천/배지/요약처럼 제품 의미가 바뀔 때

#### 산출물

- 완료 기준
- 비범위
- 사용자 가치
- 우선순위

### P2 UX Planner

#### 주 책임

- 상태 흐름
- 폴백 전략
- 모바일/데스크톱 정보 우선순위
- 빈 상태/오류 상태/부분 실패 상태 설계

#### 주로 깨우는 상황

- 검색/지도/패널 흐름이 바뀔 때
- 결과 카드, bottom sheet, overlay, settings UX가 바뀔 때
- 오프라인, 알림, 즐겨찾기, 저장 경로 흐름이 엮일 때

#### 산출물

- 상태표
- 사용자 플로우
- fallback
- 모바일 체크포인트

### P3 API Architect

#### 주 책임

- Request/Response shape
- 타입 경계
- DB/provider 계약
- 하위 호환성

#### 주로 깨우는 상황

- `src/app/api/**`
- `src/lib/map-provider/**`
- `prisma/**`
- `src/types/**`

#### 산출물

- 계약 명세
- 타입 영향
- 검증 포인트
- 마이그레이션/호환성 메모

---

## Dev Lane

### D1 Backend Developer

#### 소유 파일

- `src/app/api/**`
- `src/lib/validation/**`
- `prisma/**`
- `src/lib/db/**`

#### 책임

- API route 구현
- validation 연결
- Prisma/PostGIS 반영
- 에러 처리/응답 코드 정리

#### 출력 계약

- 변경 파일
- 응답 계약 유지 여부
- 추가 테스트
- 보안/성능 리스크 메모

### D2 Algorithm Engineer

#### 소유 파일

- `src/lib/detour/**`
- 알고리즘 설명 문서

#### 책임

- Detour 공식/필터/샘플링
- proximity scoring
- 계산 비용과 정확도 균형

#### 출력 계약

- 바뀐 공식/로직
- 경계 조건
- 회귀 위험
- 필요한 성능 확인

### D3 Frontend Developer

#### 소유 파일

- `src/app/**`
- `src/components/**`
- `src/store/**`
- `src/locales/**`
- `src/hooks/**`

#### 책임

- UI 반영
- 상태 연동
- locale 업데이트
- 모바일 대응

#### 출력 계약

- 수정 파일
- 모바일 전략
- 상태/UI 변화
- snapshot/E2E 영향

### D4 Integration Developer

#### 소유 파일

- `src/lib/map-provider/**`
- 외부 API 래퍼
- retry/timeout/error mapping

#### 책임

- provider 연동
- fallback
- 외부 API 오류 정규화
- 공통 인터페이스 유지

#### 출력 계약

- provider 영향
- 공통 타입 유지 여부
- 외부 의존성 리스크
- 테스트 전략

---

## Reviewer

Reviewer는 별도의 팀 표에는 없지만 운영상 꼭 필요하다.

### 왜 필요한가

Dev Lane은 자기 소유 파일에 집중하기 때문에, 아래를 놓치기 쉽다.

- 계층 간 계약 파손
- 모바일 회귀
- locale 누락
- API와 UI의 의미 불일치

### 권장 구성

| 변경 유형 | 기본 Reviewer |
|----------|---------------|
| API/DB 중심 | D1이 구현했다면 D4 또는 P3가 1차 리뷰 |
| Detour 중심 | D2가 구현했다면 P1 또는 Q2가 의미 검토 |
| UI/모바일 중심 | D3가 구현했다면 P2 또는 Q1이 흐름 검토 |
| 보안 민감 | Q3 교차 검토 필수 |

### Reviewer 출력 계약

- 판정
- 핵심 이슈
- 유지된 계약
- 추가 검증 요구

---

## QA Lane

### Q1 Test Engineer

중점:

- 기능 테스트
- E2E 시나리오
- 회귀 체크

주요 대상:

- `tests/e2e/**`
- 기능별 happy path
- 오류/빈 상태/partial failure

### Q2 Performance Tester

중점:

- 응답시간
- 쿼리/알고리즘 비용
- 외부 API 호출 수

주요 대상:

- `src/lib/detour/**`
- `src/app/api/search/route.ts`
- PostGIS 쿼리
- provider 호출

### Q3 Security Tester

중점:

- 입력 검증
- 비밀값 노출
- 악성 입력/오용
- 권한/남용

주요 대상:

- API route
- env 사용
- 외부 API key 처리
- HTML escape/XSS 경로

---

## 파일 경로별 활성화 매핑

| 파일/경로 패턴 | Planner | Dev | QA |
|---------------|---------|-----|----|
| `src/app/api/**` | P3 | D1 | Q1, Q3 |
| `prisma/**` | P3 | D1 | Q2, Q3 |
| `src/lib/detour/**` | P1 | D2 | Q1, Q2 |
| `src/lib/map-provider/**` | P3 | D4 | Q1, Q3 |
| `src/components/**` | P2 | D3 | Q1 |
| `src/app/**` page/layout | P2 | D3 | Q1 |
| `src/store/**` | P2 | D3 | Q1 |
| `src/locales/**` | P2 | D3 | Q1 |
| `public/sw.js`, `src/lib/cache/**` | P2, P3 | D3, D4 | Q1, Q3 |
| `src/lib/validation/**` | P3 | D1 | Q3 |

---

## 작업 유형별 권장 조합

### 1. API 필드 추가

- Scout
- P3
- D1
- D3
- Reviewer
- Q1
- Q3

### 2. Detour 공식 조정

- Scout
- P1
- D2
- D3
- Reviewer
- Q1
- Q2

### 3. 지도 Provider 변경

- Scout
- P3
- D4
- D1
- Reviewer
- Q1
- Q3

### 4. 모바일 검색 UI 개편

- Scout
- P2
- D3
- Reviewer
- Q1

### 5. Prisma schema / migration

- Scout
- P3
- D1
- Reviewer
- Q2
- Q3

---

## 출력 계약 요약

| 역할 | 반드시 포함할 것 |
|------|------------------|
| Orchestrator | 판정, 활성화 역할, 종료 요약 |
| Scout | 수정 대상, 참조 파일, 계약, 영향 범위 |
| P1 | 완료 기준, 비범위 |
| P2 | 상태, fallback, 모바일 포인트 |
| P3 | request/response, 타입 영향, 호환성 |
| D1 | API/DB 영향, 테스트 |
| D2 | 공식 변화, 경계 조건 |
| D3 | 모바일/UI/state 영향 |
| D4 | provider/fallback/test 전략 |
| Reviewer | approve/request-changes, 핵심 이슈 |
| Q1 | 기능/E2E 결과 |
| Q2 | 성능 리스크/측정 |
| Q3 | 보안 리스크/차단 포인트 |

---

## 모델 권장안

`AGENTS.md`의 모델 구분을 존중하면 아래 구성이 자연스럽다.

| 역할 | 권장 모델 |
|------|-----------|
| P1, P2, P3 | sonnet |
| D1, D2 | opus |
| D3, D4 | sonnet |
| Q1, Q2, Q3 | haiku |
| Scout | lightweight read-only agent |
| Reviewer | 변경 영역 따라 sonnet 또는 opus |

---

## 핵심 원칙

1. Scout는 팀 역할이 아니라 운영 역할이다.
2. Reviewer는 구현자와 분리돼야 한다.
3. `COMPLEX` 작업은 Planner 없이 바로 구현하지 않는다.
4. `AGENTS.md`의 팀 구조를 바꾸지 말고, 하네스가 그 위에서 동작해야 한다.

---

## 결론

MidWayDer 하네스는 새로운 조직도를 만드는 문서가 아니다.
이미 있는 `P1~Q3` 조직을 **실제로 작동하는 구현 파이프라인**으로 연결하는 문서다.
