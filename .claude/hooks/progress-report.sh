#!/bin/bash
set -euo pipefail

# Progress Report Hook
# 세션 종료 시 docs/progress/YYYY-MM-DD.md 에 Reporter 진행 기록을 append 한다.
#
# LLM/CLI 재귀 호출은 하지 않는다. Stop hook 안에서 Claude/Codex를 다시 부르면
# 비용 폭발/무한 루프 위험이 있어, 이 훅은 git 근거 기반의 사실 기록만 남긴다.
# 더 정교한 요약이 필요하면 .claude/agents/reporter.md 의 Sonnet Reporter를 호출한다.
#
# 환경변수:
#   MIDWAYDER_REPORT_SILENT=1       -> 실행 안 함
#   MIDWAYDER_SESSION_NAME=<name>   -> 진행 기록 세션명
#   MIDWAYDER_REPORT_MODEL=<model>  -> 기본 sonnet

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
cd "$PROJECT_DIR" 2>/dev/null || exit 0

# Silent mode
if [ "${MIDWAYDER_REPORT_SILENT:-0}" = "1" ]; then
  exit 0
fi

if ! command -v git >/dev/null 2>&1; then
  exit 0
fi

HOOK_INPUT="$(cat || true)"

read_hook_field() {
  local field="$1"
  python3 -c '
import json, sys
field = sys.argv[1]
raw = sys.stdin.read()
try:
    data = json.loads(raw) if raw.strip() else {}
except Exception:
    data = {}
value = data.get(field) or ""
print(value)
' "$field" <<< "$HOOK_INPUT" 2>/dev/null || true
}

TODAY=$(date +%Y-%m-%d)
NOW=$(date +%H:%M)
AGENT_NAME="Reporter"
MODEL_NAME="${MIDWAYDER_REPORT_MODEL:-sonnet}"
SESSION_NAME="${MIDWAYDER_SESSION_NAME:-}"

if [ -z "$SESSION_NAME" ]; then
  SESSION_NAME="$(read_hook_field session_name)"
fi
if [ -z "$SESSION_NAME" ]; then
  SESSION_NAME="$(read_hook_field sessionName)"
fi
if [ -z "$SESSION_NAME" ]; then
  SESSION_ID="$(read_hook_field session_id)"
  if [ -z "$SESSION_ID" ]; then
    SESSION_ID="$(read_hook_field sessionId)"
  fi
  if [ -n "$SESSION_ID" ]; then
    SESSION_NAME="session-${SESSION_ID}"
  fi
fi
if [ -z "$SESSION_NAME" ]; then
  SESSION_NAME="${TODAY} ${NOW} 세션"
fi

# 변경 감지: docs/progress 자체는 리포터 산출물이므로 중복 기록 방지를 위해 제외한다.
STATUS="$(git status --porcelain 2>/dev/null | grep -v 'docs/progress/' || true)"
DIRTY=$(printf '%s\n' "$STATUS" | sed '/^$/d' | wc -l | tr -d ' ')
RECENT=$(git log --since="6 hours ago" --oneline 2>/dev/null | wc -l | tr -d ' ')

# 변경 없으면 조용히 종료
if [ "$DIRTY" -eq 0 ] && [ "$RECENT" -eq 0 ]; then
  exit 0
fi

mkdir -p docs/progress
PROGRESS_FILE="docs/progress/${TODAY}.md"
LOCK_DIR="${PROJECT_DIR}/.bkit/state/progress-report.lock"
mkdir -p "${PROJECT_DIR}/.bkit/state"

LOCKED=0
for _ in 1 2 3 4 5; do
  if mkdir "$LOCK_DIR" 2>/dev/null; then
    LOCKED=1
    break
  fi
  sleep 0.2
done

if [ "$LOCKED" -ne 1 ]; then
  MSG="Reporter 진행 기록: 다른 progress-report 훅이 실행 중이라 이번 기록을 건너뜁니다."
  python3 -c "import json,sys; print(json.dumps({'systemMessage': sys.argv[1]}, ensure_ascii=False))" "$MSG"
  exit 0
fi
trap 'rmdir "$LOCK_DIR" 2>/dev/null || true' EXIT

RECENT_LOG="$(git log --since="6 hours ago" --pretty=format:"%h %s" 2>/dev/null | sed -n '1,20p' || true)"
DIFF_STAT_HEAD="$(git diff --stat HEAD -- . ':(exclude)docs/progress/**' 2>/dev/null | sed -n '1,60p' || true)"
DIFF_STAT_UNSTAGED="$(git diff --stat -- . ':(exclude)docs/progress/**' 2>/dev/null | sed -n '1,60p' || true)"
CHANGED_FILES="$(printf '%s\n' "$STATUS" | sed '/^$/d' | sed -E 's/^...//' | sed -n '1,30p')"

FINGERPRINT="$(
  {
    printf '%s\n' "$STATUS"
    printf '%s\n' "$RECENT_LOG"
    printf '%s\n' "$DIFF_STAT_HEAD"
  } | shasum -a 256 | awk '{print $1}'
)"

if [ -f "$PROGRESS_FILE" ] && grep -q "reporter-fingerprint: ${FINGERPRINT}" "$PROGRESS_FILE"; then
  MSG="Reporter 진행 기록: ${PROGRESS_FILE}에 이미 같은 변경 묶음이 기록되어 있습니다."
  python3 -c "import json,sys; print(json.dumps({'systemMessage': sys.argv[1]}, ensure_ascii=False))" "$MSG"
  exit 0
fi

if [ ! -f "$PROGRESS_FILE" ]; then
  {
    printf '# %s 진행 기록\n\n' "$TODAY"
  } >> "$PROGRESS_FILE"
fi

{
  printf '<!-- reporter-fingerprint: %s -->\n' "$FINGERPRINT"
  printf '## %s 세션 - %s\n\n' "$NOW" "$SESSION_NAME"
  printf '### 세션 정보\n'
  printf -- '- 세션명: `%s`\n' "$SESSION_NAME"
  printf -- '- 에이전트: `%s`\n' "$AGENT_NAME"
  printf -- '- 모델: `%s`\n\n' "$MODEL_NAME"
  printf '### 작업 내역\n'
  printf -- '- [리포트] 미커밋 변경 %s건, 최근 6시간 커밋 %s건을 기준으로 세션 진행 상황을 기록했다.\n' "$DIRTY" "$RECENT"
  if [ -n "$DIFF_STAT_HEAD" ]; then
    printf -- '- [변경] HEAD 대비 변경 규모를 확인했다.\n'
  fi
  if [ -n "$RECENT_LOG" ]; then
    printf -- '- [커밋] 최근 커밋 이력을 진행 근거로 포함했다.\n'
  fi
  printf '\n'

  if [ -n "$CHANGED_FILES" ]; then
    printf '### 변경 파일\n'
    printf '%s\n' "$CHANGED_FILES" | while IFS= read -r file; do
      [ -n "$file" ] || continue
      printf -- '- `%s` - git status 기준 변경 감지\n' "$file"
    done
    printf '\n'
  fi

  printf '### 결정/배경\n'
  printf -- '- Reporter 훅은 LLM 재귀 호출 없이 git 근거만 기록한다.\n'
  printf -- '- 상세 자연어 정리는 Sonnet 모델의 Reporter 에이전트가 후속으로 보강한다.\n\n'

  printf '### 증거\n'
  printf -- '- 최근 커밋 수: `%s`\n' "$RECENT"
  printf -- '- 미커밋 변경 수: `%s`\n' "$DIRTY"
  if [ -n "$RECENT_LOG" ]; then
    printf -- '- 최근 커밋:\n\n'
    printf '```text\n%s\n```\n\n' "$RECENT_LOG"
  fi
  if [ -n "$DIFF_STAT_HEAD" ]; then
    printf -- '- HEAD 대비 diff stat:\n\n'
    printf '```text\n%s\n```\n\n' "$DIFF_STAT_HEAD"
  fi
  if [ -n "$DIFF_STAT_UNSTAGED" ]; then
    printf -- '- unstaged diff stat:\n\n'
    printf '```text\n%s\n```\n\n' "$DIFF_STAT_UNSTAGED"
  fi
} >> "$PROGRESS_FILE"

MSG="Reporter 진행 기록 작성 완료: ${PROGRESS_FILE} (${SESSION_NAME}, model=${MODEL_NAME})"
python3 -c "import json,sys; print(json.dumps({'systemMessage': sys.argv[1]}, ensure_ascii=False))" "$MSG"
