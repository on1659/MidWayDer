---
name: improve-harness
description: MidWayDer 하네스 자기개선 진입점 — observe/suggest 모드로 하네스 문제를 분석하고 개선안만 제안
user-invocable: true
---

# /improve-harness — MidWayDer Harness Self-Improvement

이 요청을 `.claude/agents/harness-improver.md`로 보내라.

## 목적

- 하네스가 어디서 불편했는지 관찰
- 반복되는 실패/오탐/오분류를 정리
- 개선안을 제안

## 기본 모드

- 명시가 없으면 `Observe`
- 사용자가 명시적으로 수정안까지 원하면 `Suggest`

## 금지

- 자동 적용 전제 금지
- 무증거 개선 금지
- review/qa를 약하게 만드는 방향의 개선 금지

## 출력

`Harness Improver`의 Observe 또는 Suggest 형식을 따른다.

## 참조

- `.claude/agents/harness-improver.md`
- `docs/harness/improvement-loop.md`
