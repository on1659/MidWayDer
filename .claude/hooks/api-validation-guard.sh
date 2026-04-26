#!/bin/bash
set -euo pipefail

INPUT=$(cat)
FILE=$(printf '%s' "$INPUT" | python3 -c 'import json,sys; data=json.load(sys.stdin); print(data.get("tool_input", {}).get("file_path", ""))')
CONTENT=$(printf '%s' "$INPUT" | python3 -c 'import json,sys; data=json.load(sys.stdin); print(data.get("tool_input", {}).get("content", ""))')

case "$FILE" in
  */src/app/api/*/route.ts) ;;
  *) echo '{"decision":"allow"}'; exit 0 ;;
esac

# 건강체크/공개키 등은 validation 면제
if printf '%s' "$FILE" | grep -qE '/api/(health|notifications/vapid-public-key)/route\.ts$'; then
  echo '{"decision":"allow"}'
  exit 0
fi

# 최종 파일을 기준으로 판단 (Edit 스니펫만 보는 것보다 정확)
if [ -f "$FILE" ]; then FULL=$(cat "$FILE"); else FULL="$CONTENT"; fi

# ─── [1] Input validation 누락 block ───────────────────────────
READS_BODY=0
if printf '%s' "$FULL" | grep -qE 'request\.json\(|request\.formData\(|request\.nextUrl\.searchParams|searchParams\.get\(|new URL\(request\.url\)' ; then
  READS_BODY=1
fi

if [ "$READS_BODY" -eq 1 ]; then
  HAS_VALIDATION=0
  if printf '%s' "$FULL" | grep -qE '(safeParse|\.parse\(|from .zod.|from .*/lib/validation|from .*/validation/schemas)'; then
    HAS_VALIDATION=1
  fi

  if [ "$HAS_VALIDATION" -eq 0 ]; then
    echo '{"decision":"block","reason":"API route에서 입력을 읽는 패턴이 감지됐지만 validation(safeParse/parse/lib/validation)이 보이지 않습니다."}'
    exit 0
  fi
fi

# ─── [2] 에러 메시지 직접 노출 block (OWASP) ───────────────────
# 패턴: NextResponse.json({ ... error: error.message / error.stack / err.message ... })
# 또는: return ... JSON.stringify(error)
if printf '%s' "$FULL" | grep -qE 'NextResponse\.json\([^)]*error:[^,}]*\b(err|error|e)\.(message|stack|name|toString)\b'; then
  echo '{"decision":"block","reason":"에러 응답에 error.message/stack/name 직접 노출이 감지됐습니다. 스택 누출은 OWASP A04 위반. 일반화된 메시지(예: \"Internal Server Error\")를 사용하고 상세 에러는 logger에만 기록하세요."}'
  exit 0
fi

if printf '%s' "$FULL" | grep -qE 'JSON\.stringify\((err|error|e)\)|\.json\(\{[^}]*\.\.\.(err|error|e)'; then
  echo '{"decision":"block","reason":"Error 객체를 응답 body에 그대로 직렬화하는 패턴이 감지됐습니다. 내부 구조 누출 위험."}'
  exit 0
fi

echo '{"decision":"allow"}'
