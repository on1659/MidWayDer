#!/bin/bash
set -euo pipefail

INPUT=$(cat)
FILE=$(printf '%s' "$INPUT" | python3 -c 'import json,sys; data=json.load(sys.stdin); print(data.get("tool_input", {}).get("file_path", ""))')

case "$FILE" in
  */src/lib/detour/calculator.ts)
    if [ -f "$FILE" ]; then
      FULL=$(cat "$FILE")
      # 공식 보호: calculateFinalScore 함수 + 0.7/0.3 가중치가 모두 살아있어야 함
      HAS_FN=$(printf '%s' "$FULL" | grep -c 'calculateFinalScore' || true)
      HAS_WEIGHT=$(printf '%s' "$FULL" | grep -cE '0\.7|0\.3' || true)
      if [ "$HAS_FN" -eq 0 ] || [ "$HAS_WEIGHT" -lt 2 ]; then
        echo '{"decision":"block","reason":"detour calculator.ts에서 calculateFinalScore 혹은 가중치(0.7/0.3)가 사라졌습니다. 점수 공식 회귀 위험. 의도한 변경이면 같은 세션에서 관련 Vitest도 함께 갱신하세요."}'
        exit 0
      fi
    fi
    echo '{"decision":"allow","reason":"detour calculator 변경. src/lib/detour/__tests__/ 증거를 확인하세요."}'
    ;;
  */src/lib/detour/constants.ts)
    if [ -f "$FILE" ]; then
      FULL=$(cat "$FILE")
      # 핵심 상수 보호
      REQUIRED="COST_DISTANCE_WEIGHT COST_DURATION_WEIGHT MAX_PROXIMITY_DISTANCE ROUTE_CUTOFF_RATIO"
      MISSING=""
      for k in $REQUIRED; do
        if ! printf '%s' "$FULL" | grep -q "$k"; then
          MISSING="$MISSING $k"
        fi
      done
      if [ -n "$MISSING" ]; then
        echo "{\"decision\":\"block\",\"reason\":\"detour constants.ts에서 핵심 상수 누락:$MISSING . 명칭 변경이면 calculator/proximity-scorer 양쪽 반영을 확인하세요.\"}"
        exit 0
      fi
    fi
    echo '{"decision":"allow","reason":"detour 상수 변경. calculator.ts, proximity-scorer.ts 동반 확인 필요."}'
    ;;
  */src/lib/detour/*)
    echo '{"decision":"allow","reason":"detour 핵심 로직 변경입니다. 경계 조건, 정렬 의미, 관련 Vitest 증거를 확인하세요."}'
    ;;
  *)
    echo '{"decision":"allow"}'
    ;;
esac
