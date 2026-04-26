# Codex Harness Skill Adapter

Claude's harness skill lives at `.claude/skills/harness/SKILL.md`.

Codex does not need a duplicated skill body here. Use this adapter as the
Codex-facing pointer:

1. Read `docs/harness/README.md`.
2. Read `.claude/skills/harness/SKILL.md` if the task explicitly mentions the
   harness workflow.
3. Apply the matching command mirror in `.codex/commands/*`.
