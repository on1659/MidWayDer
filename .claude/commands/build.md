---
name: build
description: MidWayDer 구현 하네스 진입점 — 요청을 triage하고 Scout → Planner/Dev → Reviewer → QA 흐름으로 실행
user-invocable: true
---

# /build — MidWayDer Harness Build

이 요청을 `.claude/agents/build-orchestrator.md`로 보내라.

즉:

- route는 이미 build로 확정된 상태다
- build orchestrator가 triage와 하위 역할 활성화를 담당한다
- Scout → Planner/Dev → Reviewer → QA 흐름은 필요에 따라 활성화한다

## Build 목적

- 구현
- 수정
- 리팩터링
- 신규 기능 추가

Goal Loop 안에서 호출된 경우에는 하나의 bounded slice만 구현하고,
남은 acceptance criteria와 다음 slice를 closeout에 남긴다.

## 출력

build orchestrator의 closeout 형식을 따른다.

## 참조

- `.claude/agents/build-orchestrator.md`
- `.claude/rules/harness.md`
- `docs/harness/build-pipeline.md`
