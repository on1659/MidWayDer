#!/bin/bash
set -euo pipefail

INPUT=$(cat)
FILE=$(printf '%s' "$INPUT" | python3 -c 'import json,sys; data=json.load(sys.stdin); print(data.get("tool_input", {}).get("file_path", ""))')
CONTENT=$(printf '%s' "$INPUT" | python3 -c 'import json,sys; data=json.load(sys.stdin); print(data.get("tool_input", {}).get("content", ""))')

# 면제 경로: env 파일, 하네스 자기 자신(탐지 규칙 정의 파일)
case "$FILE" in
  *.env|*.env.*) exit 0 ;;
  */.claude/hooks/*|*/.claude/rules/*|*/scripts/harness-*|*/docs/harness/*) echo '{"decision":"allow"}'; exit 0 ;;
esac

if printf '%s' "$CONTENT" | grep -qE 'NEXT_PUBLIC_.*(SECRET|PRIVATE|DATABASE_URL)'; then
  echo '{"decision":"block","reason":"민감한 server-only 값을 NEXT_PUBLIC_*로 노출하려는 패턴이 감지됐습니다."}'
  exit 0
fi

if printf '%s' "$CONTENT" | grep -qE '(NAVER_MAPS_CLIENT_SECRET|DATABASE_URL=postgres|AKIA[0-9A-Z]{16}|sk-[A-Za-z0-9]{16,})'; then
  echo '{"decision":"block","reason":"민감정보 또는 credential로 보이는 문자열이 일반 파일에 포함됐습니다. .env 계열과 서버 측 경로만 사용하세요."}'
  exit 0
fi

echo '{"decision":"allow"}'
