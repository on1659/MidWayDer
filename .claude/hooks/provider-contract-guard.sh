#!/bin/bash
set -euo pipefail

INPUT=$(cat)
FILE=$(printf '%s' "$INPUT" | python3 -c 'import json,sys; data=json.load(sys.stdin); print(data.get("tool_input", {}).get("file_path", ""))')

case "$FILE" in
  # 공통 파일은 경고만 — 계약 소유자이므로 block할 일 없음
  */src/lib/map-provider/types.ts|*/src/lib/map-provider/factory.ts|*/src/lib/map-provider/index.ts)
    echo '{"decision":"allow","reason":"map-provider 공통 계약 변경. 모든 구현(kakao/naver)과 provider tests 동반 확인 필수."}'
    exit 0
    ;;
  # kakao/naver 구현 파일
  */src/lib/map-provider/*/*.ts)
    # types.ts, 테스트, __tests__ 디렉터리는 제외
    case "$FILE" in
      */__tests__/*|*.test.ts|*.spec.ts|*/types.ts) echo '{"decision":"allow"}'; exit 0 ;;
    esac
    if [ -f "$FILE" ]; then
      FULL=$(cat "$FILE")
      # 구현 파일은 공통 types 혹은 IDirectionsProvider/ISearchProvider 계약을 반드시 참조해야 함
      if printf '%s' "$FULL" | grep -qE "from ['\"](\.\.?/)+types['\"]"; then
        echo '{"decision":"allow"}'
        exit 0
      fi
      if printf '%s' "$FULL" | grep -qE 'IDirectionsProvider|ISearchProvider|IGeocodingProvider'; then
        echo '{"decision":"allow"}'
        exit 0
      fi
      echo '{"decision":"block","reason":"map-provider 구현 파일이 상위 types 계약(../types)을 import하지 않습니다. 계약 일탈은 금지. IDirectionsProvider/ISearchProvider 등 공통 인터페이스를 따르세요."}'
      exit 0
    fi
    echo '{"decision":"allow"}'
    ;;
  *)
    echo '{"decision":"allow"}'
    ;;
esac
