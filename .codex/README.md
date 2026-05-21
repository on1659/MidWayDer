# MidWayDer Codex Adapter

This directory mirrors the Claude-first harness for Codex without duplicating
the core rules.

Source of truth:

- `AGENTS.md`
- `docs/harness/*`
- `.claude/rules/*`
- `.claude/hooks/*`

Codex-facing files:

- `.codex/config.toml` enables the Codex companion shape for this project.
- `.codex/hooks.json` maps Codex lifecycle events to the dispatcher.
- `.codex/hooks/codex-hook-dispatch.sh` normalizes Codex hook input and calls
  the existing Claude hook scripts.
- `.codex/commands/*` are command entrypoint mirrors for Codex sessions.
- `.codex/agents/README.md` maps Claude agent roles to Codex subagent usage.
- `../WORKFLOW.md` is the Symphony-style issue execution contract for
  board-driven Codex runs.
- `../docs/harness/goal-loop.md` defines the project-local Goal Loop contract
  for Ralph Loop style long-running work.
- `../docs/harness/midwayder-harness-v3.md` defines how Harness, Hermes-style
  runtime ideas, and Symphony orchestration fit together.
- `../docs/knowledge/*` stores mistakes, lessons, and harness health-check
  guidance.
- `../.claude/hooks/harness-health-check.sh` runs on session start and every
  fifth user prompt through the Codex hook dispatcher.

Runtime note:

Some Codex clients currently execute hooks only from `CODEX_HOME` such as
`~/.codex/hooks.json`. Keep this repo-local adapter as the canonical project
copy. If a client does not load project-local hooks, copy or symlink
`.codex/hooks.json` into `~/.codex/hooks.json` and keep `[features].codex_hooks`
enabled in `~/.codex/config.toml`.
