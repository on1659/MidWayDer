---
name: work
description: MidWayDer 단일 진입점 — 메인 오케스트레이터가 요청 의도를 분류해 build, meeting, review, qa로 자동 라우팅
user-invocable: true
---

# /work — MidWayDer Single Entry

이 요청을 `.claude/agents/orchestrator.md`의 메인 오케스트레이터로 보내라.

## 목적

- 사용자가 `/build`, `/meeting`, `/review`, `/qa`를 직접 고르지 않아도 된다
- 오케스트레이터가 먼저 의도를 분류한다
- 분류 결과에 따라 적절한 route orchestrator로 라우팅한다

## 규칙

- 먼저 route를 결정한다
- 적절한 route orchestrator로 넘긴다
- 세부 triage와 역할 활성화는 route orchestrator가 담당한다
- 최종 closeout은 router + route orchestrator 결과로 정리한다

## 참조

- `.claude/agents/orchestrator.md`
- `.claude/rules/harness.md`
- `.claude/skills/harness/SKILL.md`
