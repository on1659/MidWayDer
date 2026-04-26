---
name: meeting
description: MidWayDer 설계/기능 검토 하네스 진입점 — Planner, Developer, QA 관점으로 안건을 구조화
user-invocable: true
---

# /meeting — MidWayDer Harness Meeting

이 요청을 `.claude/agents/meeting-orchestrator.md`로 보내라.

즉:

- route는 이미 meeting으로 확정된 상태다
- MidWayDer에 맞는 개발방향인지 먼저 판정한다
- Planner / Developer / QA 관점을 구조화한다
- `generator → evaluator` 루프를 반영한다
- `/build`로 넘길 hand-off를 만든다

## 출력

meeting orchestrator의 closeout과 build hand-off를 따른다.

## 참조

- `.claude/agents/meeting-orchestrator.md`
- `.claude/rules/harness.md`
- `docs/harness/meeting-pipeline.md`
- `docs/harness/decision-framework.md`
