#!/usr/bin/env bash
# goal-loop.sh — bounded Ralph/Goal Loop runner for MidWayDer.
#
# Usage:
#   scripts/goal-loop.sh Prompt.md
#   MAX_LOOPS=5 scripts/goal-loop.sh Prompt.md
#   GOAL_LOOP_AGENT_CMD="codex exec --cd /path/to/repo --sandbox workspace-write -" scripts/goal-loop.sh Prompt.md
#   GOAL_LOOP_AUTO_CONTINUE=1 scripts/goal-loop.sh Prompt.md

set -euo pipefail

ROOT_DIR="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT_DIR"

usage() {
  cat <<'USAGE'
Usage: scripts/goal-loop.sh [options] <Prompt.md>

Options:
  --max-loops N       Maximum loop slices. Default: MAX_LOOPS or 3.
  --agent CMD         Agent command. Default: GOAL_LOOP_AGENT_CMD, then codex exec.
  --auto              Do not ask between slices. Default: GOAL_LOOP_AUTO_CONTINUE or off.
  --dry-run           Print resolved settings and generated prompt, then exit.
  -h, --help          Show this help.

Stop markers:
  The agent should print one of these markers when appropriate:
    GOAL_LOOP_DONE
    GOAL_LOOP_BLOCKED
    GOAL_LOOP_HUMAN_REVIEW

Prompt guidance:
  Keep <Prompt.md> self-contained. Include Goal, Done when, Constraints,
  and any issue metadata needed for a fresh agent session.
USAGE
}

MAX_LOOPS="${MAX_LOOPS:-3}"
AGENT_CMD="${GOAL_LOOP_AGENT_CMD:-}"
AUTO_CONTINUE="${GOAL_LOOP_AUTO_CONTINUE:-0}"
DRY_RUN=0
PROMPT_FILE=""

while [ "$#" -gt 0 ]; do
  case "$1" in
    --max-loops)
      MAX_LOOPS="${2:-}"
      shift 2
      ;;
    --agent)
      AGENT_CMD="${2:-}"
      shift 2
      ;;
    --auto)
      AUTO_CONTINUE=1
      shift
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    -*)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
    *)
      if [ -n "$PROMPT_FILE" ]; then
        echo "Only one prompt file is supported." >&2
        exit 2
      fi
      PROMPT_FILE="$1"
      shift
      ;;
  esac
done

if [ -z "$PROMPT_FILE" ]; then
  echo "Prompt file is required." >&2
  usage >&2
  exit 2
fi

if [ ! -f "$PROMPT_FILE" ]; then
  echo "Prompt file not found: $PROMPT_FILE" >&2
  exit 2
fi

case "$MAX_LOOPS" in
  ''|*[!0-9]*)
    echo "--max-loops must be a positive integer." >&2
    exit 2
    ;;
esac

if [ "$MAX_LOOPS" -lt 1 ]; then
  echo "--max-loops must be at least 1." >&2
  exit 2
fi

shell_quote() {
  printf "'%s'" "$(printf '%s' "$1" | sed "s/'/'\\\\''/g")"
}

has_stop_marker() {
  grep -qE '^[[:space:]]*(GOAL_LOOP_DONE|GOAL_LOOP_BLOCKED|GOAL_LOOP_HUMAN_REVIEW)(:|[[:space:]]|$)' "$1"
}

if [ -z "$AGENT_CMD" ]; then
  if command -v codex >/dev/null 2>&1; then
    AGENT_CMD="codex exec --cd $(shell_quote "$ROOT_DIR") --sandbox workspace-write -"
  elif command -v claude >/dev/null 2>&1; then
    AGENT_CMD="claude"
  else
    echo "No agent command found. Set GOAL_LOOP_AGENT_CMD." >&2
    exit 127
  fi
fi

LOG_DIR=".symphony/logs/goal-loop"
mkdir -p "$LOG_DIR"
RUN_ID="$(date '+%Y%m%d-%H%M%S')"
RUN_LOG="$LOG_DIR/$RUN_ID.log"
LAST_OUTPUT="$LOG_DIR/$RUN_ID.last-output.txt"
GENERATED_PROMPT="$LOG_DIR/$RUN_ID.prompt.md"

render_prompt() {
  local slice="$1"
  local repeated_failures="$2"

  cat <<EOF
You are running a MidWayDer Goal Loop slice.

Repository root: $ROOT_DIR
Slice: $slice / $MAX_LOOPS
Repeated agent command failures: $repeated_failures

Required project contracts:
- Read and follow AGENTS.md.
- Read and follow docs/harness/goal-loop.md.
- Treat .claude/* and .codex/* as host adapters.
- Execute one bounded slice only.
- After the slice, print a Goal Loop Check.
- Also print a GOAL_LOOP_STATE_JSON fenced json block with:
  {"goal":"","completed":[],"remaining":[],"evidence":[],"risks":[],"nextSlice":"","result":"continue|human_review|done|blocked","filesChanged":[]}
- If complete, print GOAL_LOOP_DONE.
- If blocked, print GOAL_LOOP_BLOCKED.
- If ready for human review, print GOAL_LOOP_HUMAN_REVIEW.
- If more implementation slices remain, do not print a stop marker. End with Continue: yes.
- Do not perform destructive actions without explicit user approval.

Current git status:
\`\`\`
$(git status --short)
\`\`\`

Previous slice output tail:
\`\`\`
$(if [ -f "$LAST_OUTPUT" ]; then tail -n 80 "$LAST_OUTPUT"; else echo "<none>"; fi)
\`\`\`

User prompt:
$(cat "$PROMPT_FILE")
EOF
}

echo "Goal Loop run: $RUN_ID" | tee -a "$RUN_LOG"
echo "Prompt file: $PROMPT_FILE" | tee -a "$RUN_LOG"
echo "Agent command: $AGENT_CMD" | tee -a "$RUN_LOG"
echo "Max loops: $MAX_LOOPS" | tee -a "$RUN_LOG"

repeated_failures=0

for slice in $(seq 1 "$MAX_LOOPS"); do
  render_prompt "$slice" "$repeated_failures" > "$GENERATED_PROMPT"

  if [ "$DRY_RUN" -eq 1 ]; then
    echo "--- generated prompt ---"
    cat "$GENERATED_PROMPT"
    echo "--- end generated prompt ---"
    exit 0
  fi

  echo "" | tee -a "$RUN_LOG"
  echo "== Goal Loop slice $slice/$MAX_LOOPS ==" | tee -a "$RUN_LOG"

  set +e
  bash -lc "$AGENT_CMD" < "$GENERATED_PROMPT" 2>&1 | tee "$LAST_OUTPUT" | tee -a "$RUN_LOG"
  status="${PIPESTATUS[0]}"
  set -e

  if [ "$status" -ne 0 ]; then
    repeated_failures=$((repeated_failures + 1))
    echo "Agent command failed with status $status ($repeated_failures/3)." | tee -a "$RUN_LOG"
    if [ "$repeated_failures" -ge 3 ]; then
      echo "GOAL_LOOP_BLOCKED: repeated agent command failures." | tee -a "$RUN_LOG"
      exit "$status"
    fi
  else
    repeated_failures=0
  fi

  if has_stop_marker "$LAST_OUTPUT"; then
    echo "Stop marker detected. Ending Goal Loop." | tee -a "$RUN_LOG"
    exit 0
  fi

  echo "" | tee -a "$RUN_LOG"
  echo "Git status after slice:" | tee -a "$RUN_LOG"
  git status --short | tee -a "$RUN_LOG"

  if [ "$slice" -lt "$MAX_LOOPS" ] && [ "$AUTO_CONTINUE" != "1" ]; then
    printf "Continue to next slice? [y/N] "
    read -r answer
    case "$answer" in
      y|Y|yes|YES) ;;
      *)
        echo "Stopped by user after slice $slice." | tee -a "$RUN_LOG"
        exit 0
        ;;
    esac
  fi
done

echo "GOAL_LOOP_HUMAN_REVIEW: max loop budget reached. Review progress and continue with a new run if the goal is still active." | tee -a "$RUN_LOG"
exit 0
