# /goal - Codex Mirror

Claude source: `.claude/commands/goal.md`

Use `docs/harness/goal-loop.md` as the Goal Loop contract:

- create a Goal Contract before implementation
- choose the smallest safe route through `.codex/commands/work.md`
- execute one bounded slice at a time
- run evidence checks after each slice
- stop on destructive actions, unclear acceptance criteria, repeated failures, or Human Review handoff

For Codex CLI environments with native `/goal`, place the Goal Contract into the CLI goal.
For Codex app or manual sessions, treat this file as the goal-mode adapter.
