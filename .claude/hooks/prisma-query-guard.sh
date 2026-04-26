#!/bin/bash
set -euo pipefail

INPUT=$(cat)
FILE=$(printf '%s' "$INPUT" | python3 -c 'import json,sys; data=json.load(sys.stdin); print(data.get("tool_input", {}).get("file_path", ""))')
CONTENT=$(printf '%s' "$INPUT" | python3 -c 'import json,sys; data=json.load(sys.stdin); print(data.get("tool_input", {}).get("content", ""))')

# ─── Prisma/DB 경로 가드 ───────────────────────────────────────
case "$FILE" in
  */prisma/*|*/src/lib/db/*|*/src/app/api/*/route.ts)
    # 1) queryRawUnsafe / executeRawUnsafe 는 SQL Injection 위험. 테스트 파일 제외.
    case "$FILE" in
      *__tests__*|*.test.ts|*.spec.ts) ;;
      *)
        if [ -f "$FILE" ]; then FULL=$(cat "$FILE"); else FULL="$CONTENT"; fi
        if printf '%s' "$FULL" | grep -qE '\$queryRawUnsafe|\$executeRawUnsafe'; then
          echo '{"decision":"block","reason":"$queryRawUnsafe/$executeRawUnsafe는 SQL Injection 위험이 있어 금지. tagged template $queryRaw`...` 또는 Prisma 쿼리 빌더를 사용하세요."}'
          exit 0
        fi
        ;;
    esac
    echo '{"decision":"allow","reason":"Prisma/PostGIS 영향 가능성이 있습니다. migration, 인덱스, 성능 메모를 함께 확인하세요."}'
    ;;
  *)
    echo '{"decision":"allow"}'
    ;;
esac
