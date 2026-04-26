# MidWayDer `/meeting` 하네스 파이프라인

> 목적: 구현에 바로 들어가기 전에, 기능/리팩터링/운영 변화가 MidWayDer의 핵심 계약을 깨지 않는지 다각도로 검토하는 회의 하네스를 정의한다.

---

## `/meeting`이 필요한 상황

아래는 바로 `/build`로 가지 말고 먼저 `/meeting`으로 보내는 것이 안전한 주제다.

### 1. 알고리즘 의미가 바뀌는 작업

- Detour 공식 변경
- proximity score 가중치 변경
- 정렬 기준 변경
- 추천 배지 기준 변경

### 2. API/데이터 계약이 바뀌는 작업

- `/api/search` 응답 필드 추가/삭제/의미 변경
- bookmark / routes / stats API shape 변경
- Prisma schema 변경
- provider abstraction 변경

### 3. UX 흐름이 바뀌는 작업

- 검색 플로우 재구성
- 결과 리스트와 지도 레이아웃 재설계
- 멀티스톱/저장 경로/공유 UX 변경
- 오프라인/에러/빈 상태 전략 변경

### 4. 운영 비용이나 성능에 영향이 큰 작업

- API 호출 수 증가 가능성
- PostGIS 쿼리 전략 변경
- 캐시 전략 변경
- PWA/offline 범위 확대

---

## 한 줄 정의

`/meeting`은 "회의를 위한 회의"가 아니다.
MidWayDer의 `/meeting`은 **복잡한 요청을 구현 가능한 명세와 위험 목록으로 바꿔서 `/build`에 넘기는 준비 하네스**다.

이 문서는 Anthropic 공식 `generator-evaluator` 패턴을 참고해,
"초안 생성 → 비판적 평가 → 수정된 결론" 루프를 회의 단계에 녹이는 것을 기본 원칙으로 삼는다.

---

## 방향 판단 기준

`/meeting`의 가장 중요한 책임은
"좋아 보이는 아이디어"를 모으는 것이 아니라,
그 안건이 **MidWayDer에 맞는 올바른 개발방향인지 판정**하는 것이다.

판정 기준은 [decision-framework.md](decision-framework.md)를 따른다.

회의에서는 아래 다섯 축을 반드시 짚는다.

- Mission Fit
- User Flow Fit
- Contract Safety
- Evidence and Measurability
- Complexity vs Value

즉 `/meeting`은 단순 의견 수렴이 아니라:

- `Go`
- `Conditional Go`
- `Split`
- `No-Go`

중 하나를 내리는 의사결정 단계다.

---

## 전체 흐름

```text
사용자 안건
  ↓
Stage 0. Orchestrator Agenda 정리
  ↓
Phase 1. Planner Lane (P1/P2/P3)
  ↓
Phase 2. Developer Lane (D1/D2/D3/D4 중 관련자)
  ↓
Phase 3. QA Lane (Q1/Q2/Q3)
  ↓
Phase 4. Orchestrator Decision
  ↓
/build로 넘길 실행 명세 또는 보류 결정
```

---

## Stage 0. Agenda 정리

오케스트레이터는 회의를 시작하기 전에 안건을 **실행 가능한 질문**으로 바꿔야 한다.

### 정리할 항목

- 안건 제목
- 왜 지금 이 안건을 다루는가
- 사용자/비즈니스 가치
- MidWayDer 핵심 가치와의 연결
- 바뀔 수 있는 계층
- 바뀌면 안 되는 계약
- 회의가 끝났을 때 필요한 결정

### Agenda 예시

```markdown
# 안건
검색 결과 카드에 "경로상 추천" 배지를 표시할지 검토

## 회의 목표
- 배지의 사용자 가치가 있는지 판단
- 어떤 점수를 기준으로 노출할지 정리
- API 응답 변경이 필요한지 결정
- 모바일 카드 UI와 충돌 없는지 확인
- `/build`로 넘길 구현 범위를 확정
```

---

## 공식 Evaluator 루프 적용

`meeting`은 단순히 각 역할이 의견을 하나씩 던지고 끝나는 구조가 아니다.
Anthropic cookbook의 `generator-evaluator` 사고방식을 가져와 아래 루프를 적용한다.

```text
초기 제안 생성
  ↓
Skeptic / Evaluator 검토
  ↓
수정안 생성
  ↓
Go / Conditional Go / No-Go / Split
```

### MidWayDer에서 Skeptic이 보는 것

- 사용자 가치가 약한데 공수만 큰가
- 알고리즘 의미와 UI 표현이 충돌하는가
- 모바일 우선순위가 어긋나는가
- API 계약 변화가 과한가
- 검증 비용이 구현 가치보다 큰가

Skeptic은 별도 영웅 역할이 아니라, Orchestrator 또는 Reviewer 성격의 평가 단계로 운영해도 된다.

### Evaluator의 필수 판단 질문

- 이 변경이 "가장 가기 편한 경유지 추천" 가치와 직접 연결되는가
- 검색 → 결과 확인 → 지도 확인 → 선택 흐름을 더 쉽게 만드는가
- 계약과 하위 호환성을 명확히 설명할 수 있는가
- 테스트/지표/모바일 검증 계획이 있는가
- 가치보다 복잡도를 더 크게 늘리지는 않는가

---

## Phase 1. Planner Lane

Planner Lane은 병렬로 실행하되, 각자의 출력 형식이 명확해야 한다.

### P1 Product Planner

중점 질문:

- 이 기능이 실제로 사용자의 결정을 더 쉽게 만드는가
- 핵심 KPI 또는 전환 지표와 연결되는가
- v1에서 꼭 필요한가, 아니면 나중으로 미뤄도 되는가

필수 출력:

- 대상 사용자
- 문제 정의
- Must / Should / Could
- 완료 기준
- 제외 범위

### P2 UX Planner

중점 질문:

- 기존 검색 플로우에 마찰이 생기지 않는가
- 빈 상태/로딩/오류 상태가 자연스러운가
- 모바일 첫 화면에서 정보 우선순위가 맞는가

필수 출력:

- 상태 전이표
- 폴백 전략
- 모바일/데스크톱 차이
- 접근성 고려

### P3 API Architect

중점 질문:

- API/타입/DB/provider 계약이 바뀌는가
- 하위 호환성을 유지할 수 있는가
- 캐시와 기존 클라이언트 소비 코드를 깨뜨리지 않는가

필수 출력:

- 요청/응답 shape
- 타입 파일 영향
- 하위 호환성
- 테스트 포인트

---

## Phase 2. Developer Lane

개발자 회의 단계는 "어떻게 구현할지"보다 먼저
"어떤 파일과 계층이 실제로 흔들리는지"를 명확히 하는 단계다.

### D1 Backend Developer

다룰 것:

- API Route 영향
- Prisma/PostGIS 영향
- validation 위치
- 서버 에러 처리

필수 출력:

- 수정 파일 목록
- DB 영향
- 보안 우려
- 구현 난이도

### D2 Algorithm Engineer

다룰 것:

- Detour/score/샘플링 공식 영향
- 계산량 변화
- 경계 조건
- 설명 가능성

필수 출력:

- 공식 영향
- 회귀 위험
- 필요한 테스트
- 성능 우려

### D3 Frontend Developer

다룰 것:

- 컴포넌트 구조
- Zustand/store 영향
- 지도/결과 패널/오버레이 상호작용
- 다국어 키

필수 출력:

- 수정 파일 목록
- 모바일 레이아웃 전략
- 상태/UI 영향
- 필요한 스냅샷/테스트

### D4 Integration Developer

다룰 것:

- map-provider 호출 영향
- 외부 API 재시도/실패 처리
- provider contract drift
- fallback 전략

필수 출력:

- provider 영향
- 외부 API 리스크
- 모킹/테스트 전략
- 실패 시 fallback

---

## Phase 3. QA Lane

QA는 마지막 실행 검증이 아니라, 회의 단계에서도 이미 개입해야 한다.
왜냐하면 MidWayDer의 핵심 리스크는 구현 후에야 보이는 것이 아니라, 설계 단계에서 이미 예측 가능한 경우가 많기 때문이다.

### Q1 Test Engineer

질문:

- 해피 패스는 무엇인가
- 실패 경로는 무엇인가
- 어떤 기존 시나리오가 회귀하기 쉬운가

출력:

- 기능 테스트 시나리오
- E2E 대상 플로우
- 수동 확인 포인트

### Q2 Performance Tester

질문:

- 이 변경이 응답시간/쿼리/API 호출 수를 악화시키는가
- 측정해야 할 지표는 무엇인가

출력:

- 성능 리스크 등급
- 측정 지표
- 벤치마크 필요 여부

### Q3 Security Tester

질문:

- 입력 검증이 충분한가
- 외부 API 키/민감정보 노출 경로가 생기지 않는가
- 악의적 요청을 막을 수 있는가

출력:

- 보안 리스크 등급
- 검증 포인트
- 막아야 할 안티패턴

---

## Phase 4. Orchestrator Decision

Planner/Developer/QA 출력을 받은 뒤, 오케스트레이터는 아래 중 하나를 내려야 한다.

- `Go`
- `Conditional Go`
- `No-Go`
- `Split`

### Direction Check

최종 결론 전에 반드시 [decision-framework.md](decision-framework.md)의 다섯 축을 명시적으로 정리한다.

```markdown
## Direction Check
- Mission Fit:
- User Flow Fit:
- Contract Safety:
- Evidence Plan:
- Complexity vs Value:
- Decision: Go / Conditional Go / Split / No-Go
```

### 판정 기준

#### Go

- 범위가 명확하고
- 계약이 정리됐고
- 리스크가 감당 가능하며
- `/build`로 넘길 명세가 충분할 때

#### Conditional Go

- 가능은 하지만 선행 조건이 필요할 때
- 예: API shape 동결 후 진행, 모바일 fallback 정의 후 진행

#### No-Go

- 사용자 가치가 약하거나
- 회귀 리스크가 과도하거나
- 현재 단계에서 굳이 건드릴 이유가 약할 때

#### Split

- 한 번에 구현하면 지나치게 크기 때문에
- v1 / v2 / 후속 연구로 쪼갤 필요가 있을 때

### 신규 기능 vs 버그 수정 분리

`Pimzino`의 워크플로우처럼, `/meeting`에서도 안건 성격을 먼저 나눈다.

- 신규 기능:
  - Requirements
  - Design
  - Tasks
- 버그 수정:
  - Report
  - Analyze
  - Fix
  - Verify

즉, 모든 안건을 같은 무게의 spec 회의로 다루지 않는다.

---

## `/meeting`의 최종 산출물

회의가 끝나면 아래 중 하나를 남겨야 한다.

### 1. `/build` 지시용 실행 명세

가장 이상적인 결과다.

포함 항목:

- 구현 범위
- 비범위
- 관련 파일/계층
- must-preserve contracts
- 테스트/QA 요구

### 2. 보류 결정 문서

지금 하지 않기로 했다면 그 이유를 남긴다.

포함 항목:

- 왜 보류하는가
- 무엇이 더 필요했는가
- 재검토 조건

### 3. 스플릿된 로드맵

크면 나눈다.

포함 항목:

- v1
- v2
- 추후 조사

---

## 회의록 권장 형식

```markdown
# MidWayDer Harness Meeting: [안건 제목]
> 일시: YYYY-MM-DD
> 판정: Go / Conditional Go / No-Go / Split

## 안건 요약

## P1 Product Planner
- 대상 사용자:
- 문제 정의:
- 완료 기준:
- 제외 범위:

## P2 UX Planner
- 상태 전이:
- 폴백:
- 모바일 포인트:

## P3 API Architect
- 계약:
- 타입 영향:
- 하위 호환성:

## D1 Backend
- 파일:
- 서버 리스크:

## D2 Algorithm
- 공식 영향:
- 회귀 위험:

## D3 Frontend
- UI 영향:
- 모바일 전략:

## D4 Integration
- provider 영향:
- fallback:

## Q1 Test
- 기능/E2E 시나리오:

## Q2 Performance
- 지표:
- 성능 우려:

## Q3 Security
- 보안 우려:
- 필수 방어:

## 최종 결정
- Direction Check:
- 판정:
- 실행 범위:
- must-preserve contracts:
- `/build` 전달 항목:
```

---

## `/meeting`에서 반드시 합의해야 하는 MidWayDer 전용 항목

1. API shape를 바꾸는가, 안 바꾸는가
2. Detour score 의미를 바꾸는가, 표현만 바꾸는가
3. 모바일 375px 기준에서 가장 먼저 보일 정보는 무엇인가
4. provider 실패 시 fallback이 무엇인가
5. locale 키 추가가 필요한가
6. 캐시/오프라인 동작에 영향이 있는가
7. 최소 검증 명령은 무엇인가

---

## `/meeting`을 생략해도 되는 경우

아래는 회의 없이 `/build`로 바로 가도 된다.

- 문구 수정
- 테스트 보정
- 단일 파일 버그 수정
- 하위 호환성 없는 내부 리팩터링
- 기능 의미/계약/UI 플로우를 바꾸지 않는 작은 수정

---

## 결론

MidWayDer의 `/meeting`은 "아이디어 회의"가 아니라,
**복잡한 요청을 구현 가능한 명세와 리스크 목록으로 압축하는 설계 게이트**다.

판정의 기준선은 항상 [decision-framework.md](decision-framework.md)다.
