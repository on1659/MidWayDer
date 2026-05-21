# /work - Codex Mirror

Claude source: `.claude/commands/work.md`

Route the request through `.claude/agents/orchestrator.md` semantics:

- classify intent
- apply `docs/harness/goal-loop.md` first when the request is `/goal`, Ralph Loop, or long-running goal work
- choose `meeting`, `build`, `review`, or `qa`
- preserve AGENTS.md activation rules
- close with evidence and residual risk

When invoked by Symphony or another issue-board runner:

- treat issue identifier/title/state/url/labels as first-class task context
- read `WORKFLOW.md` and `docs/harness/midwayder-harness-v3.md`
- treat issue metadata as the Goal Contract source per `docs/harness/goal-loop.md`
- map labels to the smallest safe route
- hand off successful implementation to `Human Review` unless the user explicitly asks for a stronger terminal action
