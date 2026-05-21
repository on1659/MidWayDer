---
tracker:
  kind: linear
  api_key: $LINEAR_API_KEY
  project_slug: $SYMPHONY_PROJECT_SLUG
  active_states:
    - Todo
    - Ready for Codex
    - Codex Active
    - In Progress
  terminal_states:
    - Done
    - Closed
    - Canceled
    - Cancelled
    - Duplicate
polling:
  interval_ms: 30000
workspace:
  root: .symphony/workspaces
hooks:
  after_create: |
    git status --short
  before_run: |
    test -f AGENTS.md
    test -f docs/harness/midwayder-harness-v3.md
    test -f docs/harness/goal-loop.md
  after_run: |
    git status --short
  timeout_ms: 60000
agent:
  max_concurrent_agents: 2
  max_turns: 12
  max_retry_backoff_ms: 300000
  max_concurrent_agents_by_state:
    ready for codex: 2
    codex active: 2
    in progress: 1
codex:
  command: codex app-server
  turn_timeout_ms: 3600000
  read_timeout_ms: 5000
  stall_timeout_ms: 300000
goal_loop:
  max_slices: 3
  max_repeated_failures: 3
  terminal_handoff_state: Human Review
---

# MidWayDer Symphony Workflow

You are working on a MidWayDer issue from the project board.

Issue:

- ID: `{{ issue.identifier }}`
- Title: `{{ issue.title }}`
- State: `{{ issue.state }}`
- URL: `{{ issue.url }}`
- Labels: `{{ issue.labels }}`
- Attempt: `{{ attempt }}`

## Required Context

Before changing files, read these repository-owned contracts:

1. `AGENTS.md`
2. `docs/harness/README.md`
3. `docs/harness/midwayder-harness-v3.md`
4. `docs/harness/goal-loop.md`
5. The route-specific command mirror under `.codex/commands/`

Treat `AGENTS.md` and `docs/harness/*` as the source of truth. Treat `.claude/*` and `.codex/*` as host adapters.

## Route Selection

Classify the issue into one route:

- `meeting`: ambiguous product direction, new feature scope, UX/API contract decisions, or cross-team planning.
- `build`: implementation, bug fix, refactor, or test update with a clear target.
- `review`: code review, regression analysis, PR audit, or risk review.
- `qa`: functional, mobile, performance, or security validation.
- `improve-harness`: changes to `AGENTS.md`, `.claude/*`, `.codex/*`, `WORKFLOW.md`, `.symphony/*`, or `docs/harness/*`.

If the route is unclear, start with `meeting` and leave an issue comment describing the blocking question.

## MidWayDer Guardrails

Preserve these project contracts:

- Detour score semantics and sort order.
- `map-provider` abstraction and Naver Maps integration boundaries.
- API request/response shapes and validation behavior.
- Prisma/PostGIS query safety and performance expectations.
- Zustand store shape and search/map/result panel flows.
- Mobile-first map UI, especially 375px layouts and safe-area behavior.
- Locale key consistency and offline/cache behavior.
- Secret handling. Never expose API keys or environment values.

## Execution Rules

1. Keep one issue in one isolated workspace.
2. Prefer the smallest route that can finish the issue safely.
3. For file ownership conflicts, stop and report the conflict instead of overwriting unrelated work.
4. For complex work, scout first and write the affected files, contracts, and test plan before editing.
5. Use the repo's existing patterns and tests. Do not invent a new architecture unless the issue explicitly asks for one and `meeting` approves it.
6. If the issue is too broad, split it by filing or proposing child issues rather than forcing one large PR.
7. Treat the issue as a Goal Loop source: write a Goal Contract, execute one bounded slice at a time, and run an evidence check after each slice.
8. Stop the loop if destructive action requires approval, acceptance criteria are unclear, the same failure repeats 3 times, or a Human Review handoff is reached.

## Evidence And Handoff

Close every run with:

- Route selected.
- Files changed or intentionally not changed.
- Tests/checks run, with pass/fail status.
- Residual risks.
- Follow-up issues suggested, if any.
- PR link or clear human-review handoff.
- Goal Loop result: completed, blocked, or escalated.

Successful implementation usually ends in `Human Review`, not directly in `Done`.
