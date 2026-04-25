# Codex Agent Mapping

Codex uses built-in `spawn_agent` roles instead of Claude's repo-local agent
markdown files. Use the Claude agent files as role prompts and keep ownership
boundaries identical.

Primary mapping:

- Main orchestration: `.claude/agents/orchestrator.md`
- Build orchestration: `.claude/agents/build-orchestrator.md`
- Meeting orchestration: `.claude/agents/meeting-orchestrator.md`
- Review orchestration: `.claude/agents/review-orchestrator.md`
- QA orchestration: `.claude/agents/qa-orchestrator.md`
- Planner roles: `.claude/agents/planner-product.md`, `.claude/agents/planner-ux.md`, `.claude/agents/architect-api.md`
- Developer roles: `.claude/agents/developer-backend.md`, `.claude/agents/developer-algorithm.md`, `.claude/agents/developer-frontend.md`, `.claude/agents/developer-integration.md`
- QA roles: `.claude/agents/qa-functional.md`, `.claude/agents/qa-performance.md`, `.claude/agents/qa-security.md`
- Review role: `.claude/agents/reviewer.md`
- Scout role: `.claude/agents/scout.md`
- Reporter role: `.claude/agents/reporter.md` (model: `sonnet`, writes `docs/progress/YYYY-MM-DD.md`)
- Harness improvement: `.claude/agents/harness-improver.md`

Codex delegation rule:

- Use `explorer` for Scout-style read-only investigation.
- Use `worker` for bounded implementation with explicit file ownership.
- Use local execution for single-file/simple changes.
- Do not spawn agents unless the user explicitly asks for delegation or the
  task is already framed as multi-agent work.
