# MidWayDer Harness v2 설계안

> 목적: `LAMDiceBot`의 repo-local 하네스, `Superpowers`의 실행 규율, `gstack`의 planning/review 운영감을 섞어 MidWayDer에 맞는 v2 하네스 구조를 명시한다.

> 후속 확장: issue-board-driven Codex orchestration은 [midwayder-harness-v3.md](midwayder-harness-v3.md)를 따른다.

---

## 한 줄 결론

MidWayDer Harness v2는
**"Claude에서 가장 먼저 잘 돌지만, Claude에만 종속되지는 않는 하네스"**를 목표로 한다.

즉:

- 구조 뼈대는 `LAMDiceBot`
- 개발 규율은 `Superpowers`
- 회의/판정 운영감은 `gstack`

을 가져오되,

- 핵심 워크플로우는 host-agnostic 하게 문서로 고정하고
- 각 도구별 adapter만 따로 둔다

는 전략이다.

---

## 왜 v2가 필요한가

현재 하네스 v1은 이미 꽤 괜찮다.

- `.claude/commands`
- `.claude/agents`
- `.claude/rules`
- `.claude/hooks`
- `docs/harness/*`

가 실제로 존재하고, `decision-framework`까지 붙어 있다.

하지만 아직 아래 질문이 남아 있다.

1. 이 구조가 Claude 전용으로 굳어지지는 않는가
2. 실제 개발 프로세스와 planning/review/qa 운영이 충분히 강한가
3. repo-local 하네스를 다른 호스트로 옮길 수 있는가

v2는 이 세 질문에 답하기 위한 설계안이다.

---

## 외부 레퍼런스에서 가져올 것

## 1. LAMDiceBot에서 가져올 것

레퍼런스:

- `on1659/LAMDiceBot`
- `feature/harness-system`

가져올 핵심:

- repo-local `.claude` 구조
- command / agent / rule / hook / skill 분리
- 프로젝트 맞춤 guard 운영
- 실제 팀이 쓰는 command 중심 진입 방식

MidWayDer에 주는 의미:

- 하네스는 추상적인 방법론이 아니라, 저장소 안에서 바로 동작하는 구조여야 한다
- 공통론이 아니라 프로젝트 전용 리스크를 반영해야 한다

## 2. Superpowers에서 가져올 것

가져올 핵심:

- spec / plan 선행
- scout 후 구현
- TDD와 evidence 기반 closeout
- implementer / reviewer 분리
- 필요한 경우 worktree 기반 격리

MidWayDer에 주는 의미:

- 큰 작업은 곧바로 구현하지 않는다
- "잘된 것 같음"이 아니라 증거로 닫는다
- 구현 규율을 강하게 둔다

## 3. gstack에서 가져올 것

가져올 핵심:

- `/office-hours`류 planning 감각
- `/review`, `/qa`를 독립 운영 흐름으로 강하게 두는 방식
- 전략/범위/가치에 대한 forcing question

MidWayDer에 주는 의미:

- `/meeting`이 진짜 설계 게이트가 된다
- 좋은 아이디어가 아니라 "지금 해야 할 일"을 고른다
- review / qa를 구현의 부속 단계가 아니라 독립 단계로 취급한다

---

## v2 아키텍처

```text
사용자 요청
  ↓
Single Entry (`/work` or natural request)
  ↓
Router Orchestrator
  ↓
Route Orchestrator
  ├─ meeting
  ├─ build
  ├─ review
  └─ qa
  ↓
Role Agents
  ├─ Scout
  ├─ Planner lane
  ├─ Developer lane
  ├─ Reviewer
  └─ QA lane
  ↓
Hooks / Tests / MCP / Scripts
  ↓
Closeout + Improvement Loop
```

---

## v2 핵심 원칙

## 1. Orchestrator는 얇고 명확해야 한다

메인 오케스트레이터는:

- 라우팅
- 혼합 요청 정리
- route lock 반영

만 한다.

실제 조율은:

- `build-orchestrator`
- `meeting-orchestrator`
- `review-orchestrator`
- `qa-orchestrator`

가 맡는다.

## 2. 큰 변경은 Direction Check 없이 빌드하지 않는다

`meeting`의 핵심은 설계 토론이 아니라 방향 판정이다.

반드시 아래를 본다.

- Mission Fit
- User Flow Fit
- Contract Safety
- Evidence and Measurability
- Complexity vs Value

결론은 아래 넷 중 하나다.

- `Go`
- `Conditional Go`
- `Split`
- `No-Go`

## 3. `build`는 구현 명령이 아니라 실행 하네스다

`build`는:

- triage
- scout
- contracts
- execution plan
- reviewer
- qa

를 거친 뒤 닫아야 한다.

## 4. review / qa는 독립 라인이다

MidWayDer v2에서 review와 qa는 "마지막 확인"이 아니다.

- `review`는 계약과 회귀 위험을 본다
- `qa`는 기능/성능/보안/모바일 증거를 본다

즉 구현자와 결정을 공유하지 않는다.

## 5. self-improve는 제안까지만 자동화한다

하네스는 자기개선할 수 있어야 하지만,
자기수정 권한을 자동으로 가져서는 안 된다.

그래서:

- `Observe`
- `Suggest`

까지만 자동화하고,

- `Apply`

는 승인 기반으로 둔다.

---

## MidWayDer 전용 workflow

## 1. 기본 workflow

```text
Request
  → Route
  → Direction Check (if needed)
  → Triage
  → Scout
  → Execute
  → Review
  → QA
  → Closeout
  → Improve Harness (optional)
```

## 2. 신규 기능 workflow

```text
/work
  → meeting
  → Go / Conditional Go / Split / No-Go
  → build
  → review
  → qa
  → closeout
```

신규 기능은 원칙적으로 `meeting`을 먼저 거친다.

## 3. 버그 수정 workflow

```text
/work
  → build
  → Report → Analyze → Fix → Verify
  → review
  → qa (if needed)
```

단, 아래면 bugfix도 `meeting`으로 올린다.

- `detour` 의미에 영향
- API shape 영향
- provider contract 영향
- 모바일 핵심 플로우 영향

## 4. 리뷰 중심 workflow

```text
/review
  → 계약/회귀/모바일/보안/증거 확인
  → request changes or pass
  → 후속 build / qa 제안
```

## 5. QA 중심 workflow

```text
/qa
  → 기능 확인
  → 모바일 확인
  → 성능/보안 확인
  → 증거 수집
  → closeout
```

---

## MidWayDer에서 특별히 강하게 봐야 할 것

## 1. 알고리즘 층

- `src/lib/detour/**`
- 추천 점수 의미
- 샘플링/근접도 계산
- 정렬 기준

## 2. 계약 층

- `src/app/api/**`
- request / response shape
- validation
- map-provider abstraction

## 3. 모바일 UX 층

- 결과 카드 밀도
- 지도/리스트 상호작용
- 모바일 375px 우선순위
- E2E / visual regression

## 4. 운영 품질 층

- locale 키 누락
- offline / cache
- Prisma/PostGIS 성능
- secret exposure

---

## Host-agnostic core vs host adapter

v2에서 가장 중요한 설계 포인트다.

핵심 워크플로우는 특정 호스트에 묶이지 않는다.

## Core

다음은 host-agnostic 하다.

- `decision-framework`
- `build-pipeline`
- `meeting-pipeline`
- `agent-mapping`
- `hooks-spec`
- `improvement-loop`
- `AGENTS.md`

이건 MidWayDer의 진짜 하네스다.

## Claude adapter

다음은 Claude adapter다.

- `.claude/commands/*`
- `.claude/agents/*`
- `.claude/rules/*`
- `.claude/hooks/*`
- `.claude/mcp.json`
- `.claude/settings.json`

## Codex adapter

Codex adapter는 나중에 아래처럼 붙인다.

- `AGENTS.md`에 Codex-friendly routing 힌트
- `docs/harness/*`를 source of truth로 사용
- 필요 시 `.codex/config.toml`
- 필요 시 `.codex/hooks.json`
- repo-local scripts / check commands

즉, **하네스 자체는 Claude-only가 아니고, 현재 구현체가 Claude-first일 뿐**이다.

---

## v2에서 추천하는 파일 전략

## 1. 유지할 것

- 현재 `.claude` 구조
- 현재 `docs/harness/*`
- `decision-framework`
- `improve-harness`

## 2. 보강할 것

- `current-status` 최신화
- `/work` 사용 가이드
- 운영 데이터 기반 hook 튜닝
- host portability 문서

## 3. 나중에 추가할 것

- `.codex/` companion adapter
- shared harness scripts
- runtime checklists

---

## 도입 우선순위

## Phase A. Core Stabilization

- 방향 판단 기준 안정화
- `meeting`과 `build` 역할 경계 튜닝
- hook 오탐/누락 조정

## Phase B. Claude-first Operations

- 실제 Claude에서 `/work`, `/meeting`, `/review`, `/qa` 운영 검증
- closeout 형식 정착
- improvement loop 데이터 축적

## Phase C. Codex Adapter

- `.codex`용 최소 adapter 설계
- same workflow, different host 원칙 정착
- shared scripts / repo docs 재사용

## Phase D. Mixed-host Operations

- planning은 Claude / execution은 Codex 같은 조합 실험
- review / qa를 host-agnostic 형태로 정착

## Phase E. Issue-board Operations

- `WORKFLOW.md`를 repo-owned Symphony contract로 사용
- issue label/state를 `meeting`, `build`, `review`, `qa`, `improve-harness` route로 매핑
- per-issue workspace를 `.symphony/workspaces/` 아래에 격리
- 성공한 작업은 기본적으로 `Human Review`로 넘긴다
- Hermes식 long-running runtime, persistent memory, skill learning은 v3에서 별도 실험한다

---

## 최종 원칙

MidWayDer Harness v2는
**Claude에서 먼저 잘 돌지만, Claude에 갇히지 않는 하네스**여야 한다.

즉:

- 저장소 안에 있는 실전형 구조를 갖고
- 개발 규율은 강하게 유지하고
- planning / review / qa는 독립적으로 운영하며
- 핵심 워크플로우는 어떤 호스트에서도 재사용 가능하게 문서로 고정한다

이게 v2의 목표다.
