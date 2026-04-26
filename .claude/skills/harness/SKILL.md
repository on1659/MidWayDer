# MidWayDer Harness Skill

이 스킬은 MidWayDer에서 하네스 명령을 실행할 때 공통 운영 규칙을 제공한다.

## 소스 오브 트루스

아래 문서를 우선 참조한다.

- `docs/harness/README.md`
- `docs/harness/build-pipeline.md`
- `docs/harness/meeting-pipeline.md`
- `docs/harness/decision-framework.md`
- `docs/harness/agent-mapping.md`
- `docs/harness/hooks-spec.md`
- `docs/harness/playwright-mcp.md`
- `docs/harness/external-references.md`
- `docs/harness/improvement-loop.md`
- `AGENTS.md`
- `CLAUDE.md`

## 상위 운영 흐름

`Research → Plan → Execute → Review → Ship`

단, MidWayDer에서는 이 상위 흐름을 아래처럼 세분화한다.

- Research: Scout, 현재 코드 구조 파악
- Plan: Planner/Product/UX/API 관점 정리
- Execute: Dev lane 구현
- Review: Reviewer 검토
- Ship: QA 증거와 closeout

## 계층 원칙

`Command → Orchestrator → Agent → Skill` 계층을 혼동하지 마라.

- Command: `/work`, `/build`, `/meeting`, `/review`, `/qa`
- Orchestrator:
  - Router: `orchestrator.md`
  - Route-specific: `build-orchestrator.md`, `meeting-orchestrator.md`, `review-orchestrator.md`, `qa-orchestrator.md`
- Agent: Scout, P1/P2/P3, D1~D4, Reviewer, Q1~Q3
- Skill / Rule: 이 파일, `rules/harness.md`, `docs/harness/*`

### 기본 진입 순서

- 일반 자연어 요청:
  - Router Orchestrator가 먼저 route를 분류
- 명시적 command 요청:
  - 해당 command가 route-specific orchestrator를 직접 호출한다

## 실행 원칙

1. 요청을 먼저 router orchestrator가 라우팅한다.
2. route-specific orchestrator가 triage한다.
3. 방향이 애매하면 `decision-framework.md` 기준으로 `meeting`에서 먼저 판정한다.
4. `STANDARD / COMPLEX`면 Scout 정찰을 먼저 수행한다.
5. `must-preserve contracts`를 명시한다.
6. 필요한 역할만 활성화한다.
7. 구현자와 리뷰어를 분리한다.
8. 증거 없이 종료하지 않는다.

## MidWayDer 전용 경계 포인트

- detour 회귀
- map-provider contract drift
- API validation 누락
- locale 누락
- mobile UI 회귀
- offline/cache 붕괴
- secret exposure

## 기본 closeout

```markdown
## Harness Closeout
- Triage:
- Activated Roles:
- Contracts:
- Evidence:
- Risks:
```
