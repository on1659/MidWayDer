---
name: qa
description: MidWayDer QA 진입점 — 기능, 성능, 보안, 모바일 검증과 증거 수집 수행
user-invocable: true
---

# /qa — MidWayDer Harness QA

이 요청을 `.claude/agents/qa-orchestrator.md`로 보내라.

즉:

- route는 이미 qa로 확정된 상태다
- 기능, 성능, 보안, 모바일 관점에서 본다
- 필요 시 Playwright MCP와 기존 test 명령을 활용한다

## 출력

qa orchestrator의 closeout 형식을 따른다.

## 참조

- `.claude/agents/qa-orchestrator.md`
- `.claude/skills/harness/SKILL.md`
- `docs/harness/playwright-mcp.md`
