#!/bin/bash
set -euo pipefail

INPUT=$(cat)
FILE=$(printf '%s' "$INPUT" | python3 -c 'import json,sys; data=json.load(sys.stdin); print(data.get("tool_input", {}).get("file_path", ""))')

case "$FILE" in
  */src/lib/cache/search-cache.ts)
    if [ -f "$FILE" ]; then
      FULL=$(cat "$FILE")
      HAS_DEFAULT=$(printf '%s' "$FULL" | grep -cE 'DEFAULT_TTL' || true)
      HAS_LEGACY=$(printf '%s' "$FULL" | grep -cE 'LEGACY_TTL' || true)
      if [ "$HAS_DEFAULT" -eq 0 ] || [ "$HAS_LEGACY" -eq 0 ]; then
        echo '{"decision":"block","reason":"search-cache.ts에서 DEFAULT_TTL 또는 LEGACY_TTL 상수가 사라졌습니다. 캐시 만료 로직 회귀 위험. 네이밍 변경이면 참조처(cache-strategy.ts 등)도 함께 수정하세요."}'
        exit 0
      fi
    fi
    echo '{"decision":"allow","reason":"오프라인 검색 캐시 TTL 변경. invalidation, stale 동작 시나리오 확인 필요."}'
    ;;
  */src/lib/cache/session-results.ts)
    if [ -f "$FILE" ]; then
      FULL=$(cat "$FILE")
      if ! printf '%s' "$FULL" | grep -qE 'TTL_MS|TTL '; then
        echo '{"decision":"block","reason":"session-results.ts에서 TTL 상수가 사라졌습니다. sessionStorage 결과가 무한 유지되면 stale 데이터 복원 위험."}'
        exit 0
      fi
    fi
    echo '{"decision":"allow"}'
    ;;
  */public/sw.js|*/src/lib/cache/*|*/src/store/cache-store.ts|*/src/hooks/useSyncStatus.ts)
    echo '{"decision":"allow","reason":"오프라인/캐시 계층 변경입니다. TTL, invalidation, sync 동작과 회귀 시나리오를 확인하세요."}'
    ;;
  *)
    echo '{"decision":"allow"}'
    ;;
esac
