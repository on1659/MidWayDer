---
name: review
description: MidWayDer 독립 리뷰 진입점 — 계약, 회귀, 보안, 모바일 리스크를 중심으로 검토
user-invocable: true
---

# /review — MidWayDer Harness Review

이 요청을 `.claude/agents/review-orchestrator.md`로 보내라.

즉:

- route는 이미 review로 확정된 상태다
- 계약, 회귀, 보안, 모바일, 증거를 중심으로 본다
- 필요 시 후속 build 또는 qa를 제안할 수 있다

## 출력

review orchestrator의 closeout 형식을 따른다.

## 참조

- `.claude/agents/review-orchestrator.md`
- `.claude/rules/harness.md`
- `docs/harness/build-pipeline.md`
