---
name: goal
description: MidWayDer Goal Loop 진입점 — Ralph Loop 방식의 장기 목표를 하네스 route와 증거 기반 정지 조건으로 실행
user-invocable: true
---

# /goal — MidWayDer Goal Loop

이 요청을 Goal Loop wrapper로 실행하라.

## 목적

- 사용자 목표나 issue를 하나의 Goal Contract로 고정한다.
- 목표 달성까지 `work / build / meeting / review / qa / improve-harness` route를 반복하되, 증거와 정지 조건을 매 slice마다 확인한다.
- 성공한 구현은 기본적으로 `Human Review`에서 멈춘다.

## 실행 순서

1. `docs/harness/goal-loop.md`를 읽는다.
2. Goal Contract를 작성한다.
3. `.claude/agents/orchestrator.md` 기준으로 route를 고른다.
4. route-specific orchestrator를 실행한다.
5. Goal Loop Check를 작성한다.
6. 다음 slice가 명확하고 stop condition이 없을 때만 계속한다.

## 정지 조건

- 사용자 승인 필요한 파괴적 작업
- 요구사항 충돌
- secret/API key 노출 가능성
- 같은 실패 3회 반복
- acceptance criteria 검증 불가
- Human Review handoff 도달

## 출력

`docs/harness/goal-loop.md`의 Goal Loop Closeout 형식을 따른다.

## 참조

- `docs/harness/goal-loop.md`
- `.claude/agents/orchestrator.md`
- `.claude/skills/harness/SKILL.md`
- `WORKFLOW.md`
