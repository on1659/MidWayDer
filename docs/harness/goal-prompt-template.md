# Goal Loop Prompt Template

Goal Loop로 진행해줘.

Goal:
- ...

Done when:
- ...
- ...
- ...

Constraints:
- MidWayDer의 `AGENTS.md`와 `docs/harness/goal-loop.md`를 따른다.
- 한 번에 하나의 bounded slice만 진행한다.
- destructive action은 사용자 승인 없이 수행하지 않는다.
- 완료, 차단, Human Review handoff 중 하나로 닫는다.

Preferred evidence:
- ...

Stop markers:
- 완료되면 `GOAL_LOOP_DONE`
- 막히면 `GOAL_LOOP_BLOCKED`
- 사람 검토로 넘길 준비가 되면 `GOAL_LOOP_HUMAN_REVIEW`
