# MidWayDer Goal Loop

> 목적: Ralph Loop 계열의 장기 실행 방식을 MidWayDer 하네스에 맞게 적용하되, 무한 자율 실행이 아니라 검증 가능한 목표 루프로 운영한다.

---

## 한 줄 원칙

MidWayDer의 Goal Loop는 **Issue를 목표로 고정하고, route별 하네스를 반복 실행하되, 명확한 완료 조건과 정지 조건을 가진다.**

즉:

```text
Issue / User Goal
  -> Goal Contract
  -> Route Selection
  -> Build / Meeting / Review / QA
  -> Evidence Check
  -> Continue / Stop / Escalate
  -> Human Review
```

---

## Ralph Loop를 그대로 쓰지 않는 이유

Ralph Loop의 장점은 에이전트가 중간에 멈추지 않고 목표 달성까지 반복한다는 점이다.
하지만 MidWayDer에서는 아래 리스크 때문에 제한 없는 반복을 허용하지 않는다.

- Detour 점수 의미나 정렬 기준이 조용히 바뀔 수 있음
- Naver Maps / provider 계약이 깨져도 겉보기 UI만 통과할 수 있음
- API shape, validation, Prisma/PostGIS 성능 회귀가 누적될 수 있음
- 모바일 지도 UI는 작은 변경에도 375px 레이아웃이 깨질 수 있음
- 비밀값, 환경변수, 외부 API 비용 문제가 자동 루프에서 확대될 수 있음

따라서 Goal Loop는 “계속해”가 아니라 “증거를 확인하고 계속할지 결정해”에 가깝다.

---

## Goal Contract

Goal Loop를 시작할 때 오케스트레이터는 아래 계약을 먼저 만든다.

```markdown
## Goal Contract
- Goal:
- Source:
- Route:
- Acceptance Criteria:
- Must-Preserve Contracts:
- Evidence Plan:
- Stop Conditions:
- Human Review Handoff:
```

### Goal

사용자 요청 또는 issue title/body를 한 문장으로 고정한다.

좋은 예:

- `MDW-123: 검색 결과 카드에 detour score badge를 추가하고 모바일 375px 레이아웃을 보존한다.`

나쁜 예:

- `검색 UI 개선`
- `좋게 고쳐줘`

### Acceptance Criteria

완료 판정은 구현자의 느낌이 아니라 관찰 가능한 조건이어야 한다.

예:

- API 응답 shape가 기존 클라이언트와 호환된다.
- 결과 카드가 score badge를 렌더링한다.
- 375px 모바일 뷰에서 지도와 결과 패널이 겹치지 않는다.
- 관련 unit/e2e/typecheck가 통과하거나, 실행 불가 사유가 closeout에 남는다.

### Must-Preserve Contracts

항상 아래 중 관련 항목을 명시한다.

- Detour score semantics and sort order
- `map-provider` abstraction
- API request/response shapes and validation behavior
- Prisma/PostGIS query safety
- Zustand store shape
- mobile map/result panel flow
- locale key consistency
- offline/cache behavior
- secret handling

---

## Loop Lifecycle

## 1. Intake

입력은 자연어 요청, `/goal`, Symphony issue prompt 중 하나다.

오케스트레이터는 먼저 Goal Contract를 만들고, route를 선택한다.

- 요구사항이 명확하고 구현 대상이 있으면 `build`
- 방향/계약/UX가 불명확하면 `meeting`
- 변경 검토가 목표면 `review`
- 검증이 목표면 `qa`
- 하네스 자체가 목표면 `improve-harness`

## 2. Execute Slice

한 번의 루프는 하나의 slice만 수행한다.

slice 예:

- Scout and contract map
- API implementation
- UI implementation
- Test repair
- QA verification
- review fix

slice가 커지면 Goal Loop는 child issue 또는 `/meeting` 전환을 제안한다.

## 3. Evidence Check

각 slice 후 아래를 확인한다.

```markdown
## Goal Loop Check
- Completed Criteria:
- Remaining Criteria:
- Evidence:
- New Risks:
- Next Slice:
- Continue: yes / no / blocked
```

증거가 없으면 완료로 보지 않는다.

## 4. Continue / Stop / Escalate

계속 가능한 경우:

- 다음 slice가 명확하다.
- stop condition에 걸리지 않았다.
- must-preserve contract 위반이 없다.

멈춰야 하는 경우:

- 사용자 승인 필요한 파괴적 작업
- 요구사항 충돌
- secret/API key 노출 가능성
- 같은 실패가 3회 반복
- context가 goal/evidence를 안정적으로 유지하지 못함
- acceptance criteria가 검증 불가능함

전환해야 하는 경우:

- 범위가 커지면 child issue 제안
- 설계 판단이 필요하면 `meeting`
- 회귀 의심이면 `review`
- 증거가 부족하면 `qa`

---

## Loop Budget

기본 예산:

| 항목 | 기본값 | 동작 |
|------|--------|------|
| slice 횟수 | 3 | 초과 시 사용자에게 범위 축소 또는 재설계를 제안 |
| 같은 실패 반복 | 3 | 루프 중단 후 원인과 다음 선택지를 보고 |
| issue당 active workspace | 1 | 파일 ownership 충돌 방지 |
| 자동 merge | 0 | 항상 Human Review에서 정지 |

Symphony runner는 `WORKFLOW.md`의 `agent.max_turns`, `codex.stall_timeout_ms`, `codex.turn_timeout_ms`를 함께 따른다.

---

## Codex 적용 방식

Codex CLI에 `/goal`이 있는 환경에서는 Goal Contract를 `/goal` 목표로 넣는다.
Codex 앱 또는 수동 세션에서는 `.codex/commands/goal.md`를 읽고 같은 형식으로 운영한다.
터미널에서 별도 runner를 쓰려면 `scripts/goal-loop.sh`를 사용한다.

중요한 점:

- `/goal`은 route를 대체하지 않는다.
- Goal Loop는 `build / meeting / review / qa / improve-harness` 위에 얹히는 wrapper다.
- Codex가 목표를 기억하더라도, 완료 판정은 이 문서의 evidence check를 따른다.

### Runner 사용법

```bash
npm run goal -- Prompt.md
MAX_LOOPS=5 npm run goal -- Prompt.md
GOAL_LOOP_AGENT_CMD="codex exec --cd /Users/radar/Work/MidWayDer --sandbox workspace-write -" npm run goal -- Prompt.md
GOAL_LOOP_AUTO_CONTINUE=1 npm run goal -- Prompt.md
```

GUI로 실행하려면:

```bash
npm run goal:gui
```

macOS에서는 브라우저가 자동으로 열린다.
기본 주소는 `http://127.0.0.1:8787/`이다.
runner의 기본 agent command는 Codex CLI가 있으면 `codex exec --sandbox workspace-write -`를 사용한다.

`Prompt.md`는 매 slice마다 새 에이전트 세션에 들어가므로 self-contained여야 한다.
시작 템플릿은 `docs/harness/goal-prompt-template.md`를 복사해서 쓰면 된다.

권장 형식:

```markdown
Goal Loop로 진행해줘.

Goal:
- ...

Done when:
- ...

Constraints:
- ...
```

runner는 에이전트 출력에 아래 marker가 나오면 멈춘다.

- `GOAL_LOOP_DONE`
- `GOAL_LOOP_BLOCKED`
- `GOAL_LOOP_HUMAN_REVIEW`

GUI의 기본 `Goal` 모드는 전체 목표 운영용이다.
한 slice가 끝났다는 이유만으로 멈추지 않고, 남은 slice가 명확하면 다음 loop로 계속 간다.
전체 goal이 완료됐거나 사람 검토가 필요한 경계에 도달했을 때만 stop marker로 멈춘다.

---

## Symphony 적용 방식

Symphony issue run에서는 issue metadata가 Goal Contract의 source가 된다.

매핑:

| Issue field | Goal Contract |
|-------------|---------------|
| identifier/title | Goal |
| body/comments | Acceptance Criteria 후보 |
| labels | Route 후보 |
| state | execution permission |
| attempt | retry/slice context |
| PR/check output | Evidence |

성공한 구현은 `Done`이 아니라 `Human Review`로 넘기는 것을 기본으로 한다.

---

## Closeout

Goal Loop를 끝낼 때는 아래 형식으로 닫는다.

```markdown
## Goal Loop Closeout
- Goal:
- Route:
- Result: completed / blocked / escalated
- Acceptance Criteria:
- Evidence:
- Files Changed:
- Residual Risks:
- Human Review Handoff:
```

---

## 결론

MidWayDer에 필요한 것은 무제한 자율 루프가 아니라, **목표를 잃지 않는 반복 실행 + 증거 기반 정지 판단**이다.

Ralph Loop의 추진력은 가져오되, MidWayDer의 하네스 계약과 Human Review 게이트를 루프의 브레이크로 둔다.
