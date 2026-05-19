#!/bin/bash
set -euo pipefail

EVENT="${1:-UserPromptSubmit}"
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-${PWD:-}}"

if [ -z "$PROJECT_DIR" ] || [ ! -d "$PROJECT_DIR" ]; then
  PROJECT_DIR="$(pwd)"
fi

case "$PROJECT_DIR" in
  /Users/radar/Work/MidWayDer*) ;;
  *)
    echo '{"decision":"allow"}'
    exit 0
    ;;
esac

cd "$PROJECT_DIR" 2>/dev/null || {
  echo '{"decision":"allow"}'
  exit 0
}

STATE_DIR="$PROJECT_DIR/.symphony/logs"
COUNTER_FILE="$STATE_DIR/harness-health-counter"

json_escape() {
  python3 -c 'import json, sys; print(json.dumps(sys.stdin.read(), ensure_ascii=False))'
}

system_message() {
  local message="$1"
  local escaped
  escaped="$(printf '%s' "$message" | json_escape)"
  printf '{"systemMessage":%s}\n' "$escaped"
}

missing_files=()
for path in \
  "AGENTS.md" \
  "WORKFLOW.md" \
  "docs/harness/midwayder-harness-v3.md" \
  "docs/knowledge/mistakes-and-lessons.md" \
  "docs/knowledge/harness-health-checks.md"
do
  if [ ! -f "$PROJECT_DIR/$path" ]; then
    missing_files+=("$path")
  fi
done

if [ "$EVENT" = "SessionStart" ]; then
  if [ "${#missing_files[@]}" -gt 0 ]; then
    system_message "MidWayDer harness health: missing required knowledge/orchestration files: ${missing_files[*]}"
  else
    system_message "MidWayDer harness health active. Knowledge base: docs/knowledge/*. Symphony contract: WORKFLOW.md. Every 5 user prompts, check whether Harness/Symphony/Hermes-style memory is still being used correctly."
  fi
  exit 0
fi

if [ "$EVENT" != "UserPromptSubmit" ]; then
  echo '{"decision":"allow"}'
  exit 0
fi

mkdir -p "$STATE_DIR"

count=0
if [ -f "$COUNTER_FILE" ]; then
  count="$(tr -cd '0-9' < "$COUNTER_FILE" || true)"
  count="${count:-0}"
fi

count=$((count + 1))
printf '%s\n' "$count" > "$COUNTER_FILE"

if [ $((count % 5)) -ne 0 ]; then
  echo '{"decision":"allow"}'
  exit 0
fi

missing_text="none"
if [ "${#missing_files[@]}" -gt 0 ]; then
  missing_text="${missing_files[*]}"
fi

system_message "MidWayDer 5-prompt harness health check #$count

Check the current work against the systems we added:

1. Harness: Is this request routed as meeting/build/review/qa/improve-harness correctly? Are AGENTS.md roles and must-preserve contracts being followed?
2. Symphony: Is the work describable as one issue/ticket? Would WORKFLOW.md produce a clean Human Review handoff with evidence and residual risk?
3. Hermes-style memory: Did this session reveal a repeatable mistake, regression, or checklist worth adding to docs/knowledge/mistakes-and-lessons.md?
4. Safety: Do not auto-merge or auto-change harness policy. Use Observe -> Suggest -> Apply for self-improvement.

Required file check: $missing_text"
