#!/bin/bash
set -euo pipefail

# Stop hook — closeout 증거 게이트
# Risk-zone 파일의 mtime과 .bkit/state/last-check.json 타임스탬프를 비교해
# 검증 없이 종료하려는지 판단한다. 하드 블록은 아님(systemMessage로 상기).

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
cd "$PROJECT_DIR" 2>/dev/null || exit 0

if ! command -v git >/dev/null 2>&1; then
  exit 0
fi

# 1) risk-zone 미커밋 변경 수집
RISK=$(git status --porcelain 2>/dev/null | awk '{print $2}' | grep -E '^(src/lib/detour/|src/lib/map-provider/|src/app/api/|prisma/schema|src/lib/validation/)' || true)

if [ -z "$RISK" ]; then
  echo '{"systemMessage":"MidWayDer harness closeout: docs/harness/current-status 문서 갱신이 필요한지 확인하세요."}'
  exit 0
fi

# 2) 최신 risk-zone mtime 계산 (초단위)
LATEST_MTIME=0
while IFS= read -r f; do
  [ -f "$f" ] || continue
  M=$(stat -f %m "$f" 2>/dev/null || stat -c %Y "$f" 2>/dev/null || echo 0)
  if [ "$M" -gt "$LATEST_MTIME" ]; then
    LATEST_MTIME="$M"
  fi
done <<< "$RISK"

# 3) 마지막 type-check/test 타임스탬프 로드
STATE_FILE="$PROJECT_DIR/.bkit/state/last-check.json"
LAST_TYPECHECK=0
LAST_TEST=0
if [ -f "$STATE_FILE" ]; then
  LAST_TYPECHECK=$(python3 -c "import json; d=json.load(open('$STATE_FILE')); print(d.get('typecheck', 0))" 2>/dev/null || echo 0)
  LAST_TEST=$(python3 -c "import json; d=json.load(open('$STATE_FILE')); print(max(d.get('test', 0), d.get('e2e', 0)))" 2>/dev/null || echo 0)
fi

COUNT=$(printf '%s\n' "$RISK" | wc -l | tr -d ' ')
SAMPLE=$(printf '%s\n' "$RISK" | head -5 | tr '\n' ',' | sed 's/,$//')

NEED_TC=1
NEED_TEST=1
if [ "$LAST_TYPECHECK" -ge "$LATEST_MTIME" ]; then NEED_TC=0; fi
if [ "$LAST_TEST" -ge "$LATEST_MTIME" ]; then NEED_TEST=0; fi

if [ "$NEED_TC" -eq 0 ] && [ "$NEED_TEST" -eq 0 ]; then
  MSG="✅ Risk-zone 변경 ${COUNT}건 있지만 type-check/test가 최신 변경 이후 통과했습니다. closeout 가능."
else
  MISSING=""
  [ "$NEED_TC" -eq 1 ] && MISSING="${MISSING}npm run type-check "
  [ "$NEED_TEST" -eq 1 ] && MISSING="${MISSING}npm run test"
  MSG="⚠️  Risk-zone 미커밋 변경 ${COUNT}건 (${SAMPLE}). 최신 변경 이후 미실행 증거: ${MISSING}. 종료 전 실행 권장."
fi

python3 -c "import json; print(json.dumps({'systemMessage': '''$MSG'''}))"
