#!/bin/bash
set -euo pipefail

# PostToolUse (Bash matcher) — type-check/test 성공 시 타임스탬프 + 커밋 SHA 기록
# evidence-gate가 이 파일을 읽어 risk-zone mtime + 현재 HEAD와 비교한다.
# 엄격히 토큰 경계 매칭해서 HEREDOC/grep/echo 등 문자열 포함만으로는 기록하지 않는다.
# 브랜치 전환 시 SHA 변화로 자동 무효화된다.

INPUT=$(cat)
CMD=$(printf '%s' "$INPUT" | python3 -c 'import json,sys; data=json.load(sys.stdin); print(data.get("tool_input", {}).get("command", ""))' 2>/dev/null || echo "")
EXIT_CODE=$(printf '%s' "$INPUT" | python3 -c 'import json,sys; data=json.load(sys.stdin); print(data.get("tool_response", {}).get("exit_code", data.get("tool_response", {}).get("exitCode", 0)))' 2>/dev/null || echo "0")

if [ "$EXIT_CODE" != "0" ]; then
  exit 0
fi

# HEREDOC 패턴은 테스트 하네스로 간주하고 제외
if [[ "$CMD" =~ \<\<[[:space:]]*[\'\"]?[A-Z_]+ ]]; then
  exit 0
fi

RECORD=0
KIND=""
if [[ "$CMD" =~ (^|[[:space:]]|[;\&\|]|\&\&|\|\|)(npm[[:space:]]+run[[:space:]]+type-check|npm[[:space:]]+run[[:space:]]+typecheck|tsc[[:space:]]+--noEmit|tsc[[:space:]]+-b)([[:space:]]|$) ]]; then
  RECORD=1; KIND="typecheck"
elif [[ "$CMD" =~ (^|[[:space:]]|[;\&\|]|\&\&|\|\|)(npm[[:space:]]+test|npm[[:space:]]+run[[:space:]]+test|vitest[[:space:]]+run|vitest)([[:space:]]|$) ]]; then
  RECORD=1; KIND="test"
elif [[ "$CMD" =~ (^|[[:space:]]|[;\&\|]|\&\&|\|\|)(playwright[[:space:]]+test|npm[[:space:]]+run[[:space:]]+test:e2e)([[:space:]]|$) ]]; then
  RECORD=1; KIND="e2e"
fi

if [ "$RECORD" -eq 0 ]; then
  exit 0
fi

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
STATE_DIR="$PROJECT_DIR/.bkit/state"
mkdir -p "$STATE_DIR" 2>/dev/null || exit 0

TS=$(date +%s)
SHA=""
if command -v git >/dev/null 2>&1; then
  SHA=$(cd "$PROJECT_DIR" && git rev-parse HEAD 2>/dev/null || echo "")
fi

FILE="$STATE_DIR/last-check.json"

python3 - <<PY 2>/dev/null || true
import json, os
path = "$FILE"
data = {}
if os.path.exists(path):
    try:
        with open(path) as f:
            data = json.load(f)
    except Exception:
        data = {}
# SHA 변경 감지 — 이전 SHA와 다르면 기존 기록을 무효화하고 새로 시작
old_sha = data.get("sha", "")
new_sha = "$SHA"
if old_sha and new_sha and old_sha != new_sha:
    data = {}
data["$KIND"] = $TS
if new_sha:
    data["sha"] = new_sha
with open(path, "w") as f:
    json.dump(data, f, indent=2)
PY

exit 0
