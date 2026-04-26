#!/bin/bash
set -euo pipefail

INPUT=$(cat)
FILE=$(printf '%s' "$INPUT" | python3 -c 'import json,sys; data=json.load(sys.stdin); print(data.get("tool_input", {}).get("file_path", ""))')
CONTENT=$(printf '%s' "$INPUT" | python3 -c 'import json,sys; data=json.load(sys.stdin); print(data.get("tool_input", {}).get("content", ""))')

# ─── 100vh 회귀 방지 (iOS Safari 주소창 버그). 100dvh 강제 ─────
case "$FILE" in
  */src/app/globals.css|*/src/app/theme.css|*/src/app/*.css)
    # content 또는 최종 파일에서 100vh 직접 사용(100dvh가 아닌 경우) 검사
    if [ -f "$FILE" ]; then FULL=$(cat "$FILE"); else FULL="$CONTENT"; fi
    # 100vh 중 100dvh가 아닌 인스턴스가 있는지
    if printf '%s' "$FULL" | grep -oE '100(d?vh|vh)' | grep -q '^100vh$'; then
      echo '{"decision":"block","reason":"100vh는 iOS Safari에서 주소창 만큼 가려집니다. 100dvh (dynamic viewport)를 사용하세요. MidWayDer는 이 버그를 이미 수정한 적이 있으므로 회귀 금지."}'
      exit 0
    fi
    ;;
esac

# ─── 모바일 px 경고 (기존 동작 유지) ──────────────────────────
case "$FILE" in
  */src/components/*|*/src/app/*)
    WARN=0
    if printf '%s' "$CONTENT" | grep -qE 'width:\s*[3-9][0-9]{2,}px'; then
      WARN=1
    fi
    if printf '%s' "$CONTENT" | grep -qE '(width|height):\s*([1-3]?[0-9])px'; then
      WARN=1
    fi
    if [ "$WARN" -eq 1 ]; then
      echo '{"decision":"allow","reason":"모바일 UI 리스크가 감지됐습니다. 375px 기준 레이아웃과 mobile E2E를 확인하세요."}'
      exit 0
    fi
    ;;
esac

echo '{"decision":"allow"}'
