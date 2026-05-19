#!/bin/bash
set -euo pipefail

# Codex hook adapter for the existing Claude-first MidWayDer harness.
# It normalizes Codex hook payloads into the JSON shape consumed by
# .claude/hooks/*.sh so the actual guard logic stays single-sourced.

EVENT="${1:-}"
INPUT="$(cat)"

PROJECT_DIR=$(printf '%s' "$INPUT" | python3 -c '
import json, os, sys
try:
    data = json.load(sys.stdin)
except Exception:
    data = {}
cwd = data.get("cwd") or os.environ.get("PWD") or os.getcwd()
print(cwd)
' 2>/dev/null || pwd)

cd "$PROJECT_DIR" 2>/dev/null || exit 0

case "$PROJECT_DIR" in
  /Users/radar/Work/MidWayDer*) ;;
  *) exit 0 ;;
esac

export CLAUDE_PROJECT_DIR="$PROJECT_DIR"

normalize_payload() {
  python3 -c '
import json, sys
try:
    data = json.load(sys.stdin)
except Exception:
    data = {}

tool_input = data.get("tool_input") or data.get("input") or {}
tool_response = data.get("tool_response") or data.get("response") or {}
tool_name = data.get("tool_name") or data.get("tool") or data.get("name") or ""

cmd = (
    tool_input.get("command")
    or tool_input.get("cmd")
    or tool_input.get("shell_command")
    or data.get("command")
    or ""
)

file_path = (
    tool_input.get("file_path")
    or tool_input.get("path")
    or data.get("file_path")
    or data.get("path")
    or ""
)

content = tool_input.get("content") or data.get("content") or ""
exit_code = (
    tool_response.get("exit_code")
    if isinstance(tool_response, dict) and "exit_code" in tool_response
    else tool_response.get("exitCode") if isinstance(tool_response, dict) and "exitCode" in tool_response
    else data.get("exit_code", data.get("exitCode", 0))
)

print(json.dumps({
    "session_name": data.get("session_name") or data.get("sessionName") or "",
    "session_id": data.get("session_id") or data.get("sessionId") or "",
    "tool_name": tool_name,
    "tool_input": {
        "command": cmd,
        "file_path": file_path,
        "content": content,
    },
    "tool_response": {
        "exit_code": exit_code,
    },
}, ensure_ascii=False))
' <<< "$INPUT"
}

run_claude_hook() {
  local hook="$1"
  normalize_payload | bash "$PROJECT_DIR/.claude/hooks/$hook"
}

pre_tool_use() {
  local command
  command=$(normalize_payload | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("tool_input", {}).get("command", ""))' 2>/dev/null || true)

  if printf '%s' "$command" | grep -qE '(^|[;&|[:space:]])rm[[:space:]]+-rf[[:space:]]+(/|/\*|~|~/?\*|\$HOME)($|[[:space:]])'; then
    echo '{"decision":"block","reason":"Codex harness: destructive rm -rf pattern blocked. This mirrors .claude/settings.json deny rules."}'
    exit 0
  fi

  if printf '%s' "$command" | grep -qE 'git[[:space:]]+push[[:space:]]+(-f|--force)[[:space:]]+origin[[:space:]]+(main|master)'; then
    echo '{"decision":"block","reason":"Codex harness: force-push to main/master blocked. This mirrors .claude/settings.json deny rules."}'
    exit 0
  fi

  if printf '%s' "$command" | grep -qE 'git[[:space:]]+reset[[:space:]]+--hard[[:space:]]+origin/(main|master)|git[[:space:]]+branch[[:space:]]+-D[[:space:]]+(main|master)'; then
    echo '{"decision":"block","reason":"Codex harness: destructive git command blocked. This mirrors .claude/settings.json deny rules."}'
    exit 0
  fi

  if printf '%s' "$command" | grep -qE '(^|[[:space:]])(npx[[:space:]]+)?prisma[[:space:]]+migrate[[:space:]]+reset([[:space:]]|$)'; then
    echo '{"decision":"block","reason":"Codex harness: prisma migrate reset blocked. This mirrors .claude/settings.json deny rules."}'
    exit 0
  fi

  echo '{"decision":"allow"}'
}

post_tool_use() {
  local payload tool file
  payload="$(normalize_payload)"
  tool=$(printf '%s' "$payload" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("tool_name",""))' 2>/dev/null || true)
  file=$(printf '%s' "$payload" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("tool_input",{}).get("file_path",""))' 2>/dev/null || true)

  case "$tool" in
    Bash|bash|Shell|shell|exec_command|Command|command)
      printf '%s' "$payload" | bash "$PROJECT_DIR/.claude/hooks/record-check.sh"
      ;;
  esac

  if [ -n "$file" ]; then
    for hook in \
      env-secrets-guard.sh \
      api-validation-guard.sh \
      provider-contract-guard.sh \
      detour-regression-guard.sh \
      prisma-query-guard.sh \
      i18n-guard.sh \
      mobile-ui-guard.sh \
      offline-cache-guard.sh \
      color-hardcoding-guard.sh
    do
      output=$(printf '%s' "$payload" | bash "$PROJECT_DIR/.claude/hooks/$hook" 2>/dev/null || true)
      decision=$(printf '%s' "$output" | python3 -c 'import json,sys
try:
    print(json.load(sys.stdin).get("decision", ""))
except Exception:
    print("")
' 2>/dev/null || true)
      if [ "$decision" = "block" ]; then
        printf '%s\n' "$output"
        exit 0
      fi
    done
  fi

  echo '{"decision":"allow"}'
}

stop_hooks() {
  local evidence progress
  evidence="$(run_claude_hook evidence-gate.sh 2>/dev/null || true)"
  progress="$(run_claude_hook progress-report.sh 2>/dev/null || true)"

  python3 -c '
import json, sys

messages = []
for raw in sys.argv[1:]:
    raw = raw.strip()
    if not raw:
        continue
    try:
        data = json.loads(raw)
    except Exception:
        continue
    msg = data.get("systemMessage") or data.get("reason") or ""
    if msg:
        messages.append(msg)

if messages:
    print(json.dumps({"systemMessage": "\n".join(messages)}, ensure_ascii=False))
else:
    print(json.dumps({"decision": "allow"}))
' "$evidence" "$progress"
}

health_hook() {
  local event="$1"
  bash "$PROJECT_DIR/.claude/hooks/harness-health-check.sh" "$event"
}

case "$EVENT" in
  SessionStart)
    health="$(health_hook SessionStart 2>/dev/null || true)"
    python3 -c '
import json, sys
base = "MidWayDer Codex harness active. Use AGENTS.md, docs/harness/*, .claude/rules/* as source of truth."
extra = ""
raw = sys.argv[1].strip() if len(sys.argv) > 1 else ""
if raw:
    try:
        extra = json.loads(raw).get("systemMessage", "")
    except Exception:
        extra = ""
message = base if not extra else base + "\n" + extra
print(json.dumps({"systemMessage": message}, ensure_ascii=False))
' "$health"
    ;;
  UserPromptSubmit)
    health_hook UserPromptSubmit
    ;;
  PreToolUse)
    pre_tool_use
    ;;
  PostToolUse)
    post_tool_use
    ;;
  Stop)
    stop_hooks
    ;;
  *)
    echo '{"decision":"allow"}'
    ;;
esac
