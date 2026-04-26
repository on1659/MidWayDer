# MidWayDer 하네스 문서

> 기준일: 2026-04-13
> 참고 레퍼런스: `github.com/on1659/lamdicebot`의 `feature/harness-system` 브랜치(2026-04-13 확인)

---

## 왜 하네스가 필요한가

MidWayDer는 단순한 CRUD 앱이 아니다. 아래 네 축이 항상 서로 얽혀 있다.

1. **경로/알고리즘 축**
   - `src/lib/detour/**`
   - `src/lib/map-provider/**`
   - 추천 점수, 경로 샘플링, API 호출 비용
2. **API/데이터 축**
   - `src/app/api/**`
   - `prisma/**`
   - 요청 검증, 응답 계약, PostGIS 쿼리
3. **UI/상태 축**
   - `src/app/**`
   - `src/components/**`
   - `src/store/**`
   - 모바일 레이아웃, 지도 오버레이, 검색 플로우
4. **운영/품질 축**
   - `tests/e2e/**`
   - `src/lib/validation/**`
   - `src/locales/**`
   - 접근성, 모바일 QA, 다국어, 오프라인 캐시

문제는 기능 하나를 고쳐도 보통 한 축만 바뀌지 않는다는 점이다.
예를 들어 "검색 결과 카드에 새로운 점수 배지 추가"도 실제로는:

- 알고리즘 점수 노출 기준
- API 응답 타입
- 프론트 렌더링
- 다국어 키
- 모바일 카드 높이
- Playwright 스냅샷

까지 함께 흔든다.

그래서 MidWayDer의 하네스는 "에이전트를 많이 돌리자"가 핵심이 아니다.
핵심은 아래 세 가지다.

1. **수정 전 정찰(Scout)을 강제**해서 영향 범위를 먼저 본다.
2. **역할별 출력 계약**을 고정해서 품질 편차를 줄인다.
3. **Hook + 테스트 증거**로 "대충 됨" 상태를 줄인다.

---

## 이 문서 묶음의 목표

이 `docs/harness/`는 처음에는 `.claude/` 구현 전 설계 문서로 시작했다.
2026-04-14 기준으로는 **코어 `.claude` 골격이 이미 생성된 상태**이며,
이 문서들은 그 골격을 계속 튜닝하고 확장하기 위한 기준선 역할을 한다.

이 문서 묶음은 다음을 정의한다.

- 어떤 작업에서 하네스를 켜야 하는가
- 어느 역할이 언제 활성화되는가
- 각 역할은 무엇을 입력받고 무엇을 출력해야 하는가
- 어떤 변경은 Hook로 막고, 어떤 변경은 경고만 띄울 것인가
- Playwright MCP와 기존 E2E 자산을 어떻게 연결할 것인가
- 실제 `.claude/` 구조를 어떤 파일 트리로 만들 것인가

---

## 설계 원칙

### 1. 문서 먼저, 자동화는 점진적으로

초기에는 문서가 가장 중요하다.
하네스 자동화는 문서가 안정된 뒤 붙인다.

### 2. Block Hook는 최소로 시작

처음부터 모든 걸 막으면 팀이 하네스를 싫어하게 된다.
MidWayDer는 초기 운영에서 아래만 `block`으로 두는 것이 적절하다.

- 비밀값/키 노출
- API 입력 검증 누락

나머지는 `warn`으로 시작해 운영 데이터가 쌓인 뒤 올린다.

### 3. AGENTS.md를 대체하지 않는다

`AGENTS.md`는 **팀 구조** 문서다.
`docs/harness/`는 그 팀 구조를 **실행 파이프라인**으로 연결하는 문서다.

### 4. 간단한 작업엔 과잉 오케스트레이션을 강요하지 않는다

단일 파일 문서 수정, 타입 오타, 테스트 보정 같은 작업은 직접 처리해도 된다.
하네스는 복잡도를 줄이기 위한 도구이지, 모든 작업을 무겁게 만들기 위한 제도가 아니다.

### 5. MidWayDer의 핵심 리스크를 반영한다

LAMDiceBot 레퍼런스는 실시간 게임, MidWayDer는 경로 추천 앱이다.
따라서 MidWayDer 하네스는 아래 리스크를 최우선으로 본다.

- Detour 알고리즘 회귀
- API 계약 드리프트
- Map Provider 추상화 파손
- Prisma/PostGIS 성능 저하
- 모바일 지도 UI 깨짐
- 다국어 키 누락
- 오프라인/캐시 동작 붕괴
- 비밀키 노출과 입력 검증 누락

---

## 문서 구성

| 문서 | 목적 | 우선순위 |
|------|------|----------|
| [current-status-2026-04-13.md](current-status-2026-04-13.md) | 현재 저장소에 실제로 무엇이 있고 무엇이 없는지 기준선 정리 | 최우선 |
| [build-pipeline.md](build-pipeline.md) | 구현 작업용 하네스 파이프라인 | 최우선 |
| [meeting-pipeline.md](meeting-pipeline.md) | 기능 착수 전 검토/회의 하네스 파이프라인 | 높음 |
| [decision-framework.md](decision-framework.md) | 무엇이 MidWayDer에 맞는 올바른 개발방향인지 판정하는 기준 | 최우선 |
| [midwayder-harness-v2.md](midwayder-harness-v2.md) | LAMDiceBot + Superpowers + gstack를 섞은 MidWayDer v2 하네스 설계안 | 최우선 |
| [host-portability.md](host-portability.md) | Claude-first이지만 Claude-only가 아니게 만드는 host 전략 | 높음 |
| [agent-mapping.md](agent-mapping.md) | `AGENTS.md`의 팀/역할을 하네스 운영 역할에 매핑 | 최우선 |
| [hooks-spec.md](hooks-spec.md) | MidWayDer 맞춤 Guard 사양 | 최우선 |
| [playwright-mcp.md](playwright-mcp.md) | 현재 Playwright 자산을 하네스 QA에 연결하는 방식 | 높음 |
| [implementation-roadmap.md](implementation-roadmap.md) | 나중에 실제 `.claude/` 하네스를 구현할 때 바로 따라갈 실행 체크리스트 | 최우선 |
| [external-references.md](external-references.md) | 외부 레퍼런스를 우선순위별로 정리하고 어느 문서에 반영할지 매핑 | 최우선 |
| [improvement-loop.md](improvement-loop.md) | 하네스 자기개선 루프를 Observe / Suggest / Apply로 안전하게 운영하는 방식 | 높음 |
| [claude-planned-dot-claude-changes-2026-04-13.md](claude-planned-dot-claude-changes-2026-04-13.md) | 실제 `.claude/` 파일 설계안 | 높음 |

---

## 추천 읽기 순서

### 1. 현재 상태부터 읽기

먼저 [current-status-2026-04-13.md](current-status-2026-04-13.md)를 읽는다.
이 문서가 "지금 무엇이 이미 구현돼 있고, 무엇은 아직 문서뿐인지"를 선명하게 정리한다.

### 2. 구현 하네스 읽기

그 다음 [build-pipeline.md](build-pipeline.md)를 읽는다.
일상적인 개발 요청이 어떤 단계로 흘러야 하는지 여기서 정한다.

### 3. 역할 매핑 읽기

[agent-mapping.md](agent-mapping.md)를 읽으면 `P1~Q3`이 어느 순간에 켜지는지 보인다.

### 4. 방향 판단 기준 읽기

[decision-framework.md](decision-framework.md)는
"이 아이디어가 좋아 보이는가"가 아니라 "이 변경이 MidWayDer를 올바른 방향으로 밀어주는가"를 판단하는 기준선이다.

### 5. v2 설계안 읽기

[midwayder-harness-v2.md](midwayder-harness-v2.md)는
왜 `LAMDiceBot`, `Superpowers`, `gstack`를 어떻게 섞는지와 MidWayDer 전용 workflow를 설명한다.

### 6. host 전략 읽기

[host-portability.md](host-portability.md)는
현재 하네스가 Claude-first이지만 Claude-only로 굳지 않도록 어떤 부분을 core로 보고 어떤 부분을 adapter로 볼지 정리한다.

### 7. 강제 장치 읽기

[hooks-spec.md](hooks-spec.md)와 [playwright-mcp.md](playwright-mcp.md)를 읽으면
"어디까지는 자동으로 막고, 어디부터는 증거 기반으로 확인할 것인가"가 보인다.

### 8. 실제 구현 로드맵 읽기

[implementation-roadmap.md](implementation-roadmap.md)를 읽으면
문서를 실제 `.claude/` 파일로 옮길 때 어떤 순서로, 어떤 묶음으로 구현해야 하는지 바로 보인다.

### 9. 실제 구현 계획 읽기

마지막으로 [claude-planned-dot-claude-changes-2026-04-13.md](claude-planned-dot-claude-changes-2026-04-13.md)를 읽는다.
이 문서는 이후 실제 `.claude/`에 손댈 때 바로 체크리스트로 쓸 수 있다.

### 10. 외부 레퍼런스 우선순위 읽기

[external-references.md](external-references.md)는 외부 리소스를 단순 링크 모음이 아니라
"지금 반영할 것 / 다음 단계에 볼 것 / 보류할 것"으로 정리한 문서다.

---

## MidWayDer 하네스의 핵심 개념

### 1. Orchestrator First

모든 작업은 먼저 오케스트레이터가 분류한다.

- `SIMPLE`
- `STANDARD`
- `COMPLEX`

이 분류 없이 바로 구현에 들어가면, MidWayDer 같은 다층 앱에서는 쉽게 회귀가 난다.

### 2. Must-Preserve Contracts

Scout는 단순히 "어느 파일을 수정하면 된다"만 말하면 안 된다.
반드시 **깨지면 안 되는 계약**을 함께 보고해야 한다.

MidWayDer에서 계약은 보통 아래다.

- API 요청/응답 JSON shape
- `map-provider` 공통 인터페이스
- Detour 점수 의미와 정렬 기준
- 주요 Zustand store shape
- locale key 체계
- 모바일 핵심 사용자 플로우
- 검색/지도/결과 패널 상호작용

### 3. Plan Before Patch

파일 수가 늘어나거나 계층을 넘나들기 시작하면, 구현보다 계획이 먼저다.
기획/아키텍처/UX/QA가 최소한 짧게라도 선행돼야 한다.

### 4. Direction Before Build

좋은 아이디어처럼 보여도 MidWayDer 핵심 가치와 멀면 우선순위를 낮춘다.
회의 단계에서는 반드시 [decision-framework.md](decision-framework.md)의 아래 다섯 축으로 판단한다.

- Mission Fit
- User Flow Fit
- Contract Safety
- Evidence and Measurability
- Complexity vs Value

### 5. Evidence Before Approval

리뷰어의 "코드상 괜찮아 보임"만으로는 부족하다.
MidWayDer에서는 아래 증거 중 일부가 함께 있어야 한다.

- `npm run lint`
- `npm run type-check`
- `npm run test`
- `npm run test:e2e:smoke`
- `npm run test:e2e:mobile:ui`
- `npm run test:e2e:mobile:visual`
- 대상 영역의 Vitest 결과
- 모바일 스크린샷 또는 Playwright MCP 캡처

### 6. Start Simple, Then Split

공식 Anthropic 멀티에이전트 가이드의 원칙을 따라,
MidWayDer도 처음부터 팀을 크게 벌리지 않는다.

- 같은 파일을 여러 역할이 동시에 편집하는 구조는 피한다
- 순차 태스크는 단일 세션 또는 경량 파이프라인이 낫다
- 멀티에이전트는 파일 소유권과 역할 분리가 선명할 때만 확장한다

이 원칙은 [build-pipeline.md](build-pipeline.md)와 [agent-mapping.md](agent-mapping.md)에 반영한다.

---

## 최소 도입 순서

### Phase 1. 문서 운영

- 이 `docs/harness/`를 기준 문서로 채택
- 팀 내에서 `SIMPLE/STANDARD/COMPLEX`를 공통 언어로 맞춤
- 회의록/구현 보고 형식을 문서대로 맞춤

### Phase 2. 명령 진입점 추가

- `.claude/commands/build.md`
- `.claude/commands/meeting.md`
- `.claude/rules/harness.md`

### Phase 3. 읽기 전용 Scout + 핵심 Block Hook 도입

- `scout.md`
- `env-secrets-guard.sh`
- `api-validation-guard.sh`

### Phase 4. 역할 세분화

- Planner / Developer / Reviewer / QA 전용 agent 파일 추가
- AGENTS.md 팀 구조와 연결

### Phase 5. 브라우저 QA 연결

- `.claude/mcp.json`에 Playwright MCP 추가
- 현재 Playwright E2E 자산과 QA 보고 형식 연결

### Phase 6. Future Guard

- `playwright-required-guard`
- `performance-budget-guard`
- `meeting-format-guard`

구현 단계의 더 구체적인 순서와 PR 분할 기준은 [implementation-roadmap.md](implementation-roadmap.md)에 정리한다.

---

## 성공 기준

하네스 도입 성공은 "문서가 많아졌다"가 아니라 아래로 판단한다.

| 지표 | 목표 |
|------|------|
| 구현 전 정찰 보고서 포함 비율 | 3파일 이상 작업의 90% 이상 |
| API 입력 검증 누락 건수 | 0건 |
| 모바일 회귀를 사후 발견한 비율 | 분기마다 감소 |
| Detour/Provider 변경 시 테스트 증거 첨부 비율 | 80% 이상 |
| 기능 회의에서 액션 아이템 없이 종료되는 비율 | 0% 지향 |

---

## 한 줄 요약

MidWayDer 하네스는 "에이전트를 화려하게 늘리는 시스템"이 아니라,
**복잡한 경로 추천 앱을 안전하게 진화시키기 위한 운영 계약**이다.
