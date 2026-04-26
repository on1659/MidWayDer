#!/bin/bash
set -euo pipefail

INPUT=$(cat)
FILE=$(printf '%s' "$INPUT" | python3 -c 'import json,sys; data=json.load(sys.stdin); print(data.get("tool_input", {}).get("file_path", ""))')
CONTENT=$(printf '%s' "$INPUT" | python3 -c 'import json,sys; data=json.load(sys.stdin); print(data.get("tool_input", {}).get("content", ""))')

# ─── locale 파일 자체 변경: ko/en 키 대칭성 강제 ──────────────────
case "$FILE" in
  */src/locales/ko.json|*/src/locales/en.json)
    DIR=$(dirname "$FILE")
    KO="$DIR/ko.json"
    EN="$DIR/en.json"
    if [ -f "$KO" ] && [ -f "$EN" ]; then
      DIFF=$(python3 - <<PY
import json, sys
def flat_keys(obj, prefix=""):
    keys = set()
    if isinstance(obj, dict):
        for k, v in obj.items():
            path = f"{prefix}.{k}" if prefix else k
            if isinstance(v, dict):
                keys |= flat_keys(v, path)
            else:
                keys.add(path)
    return keys
try:
    ko = json.load(open("$KO", encoding="utf-8"))
    en = json.load(open("$EN", encoding="utf-8"))
except Exception as e:
    print(f"PARSE_ERROR:{e}")
    sys.exit(0)
kk = flat_keys(ko); ek = flat_keys(en)
only_ko = sorted(kk - ek)[:5]
only_en = sorted(ek - kk)[:5]
out = []
if only_ko: out.append("ko에만:" + ",".join(only_ko))
if only_en: out.append("en에만:" + ",".join(only_en))
print(" / ".join(out))
PY
)
      if [ -n "$DIFF" ]; then
        case "$DIFF" in
          PARSE_ERROR:*)
            echo "{\"decision\":\"block\",\"reason\":\"locale JSON 파싱 실패 (${DIFF}). 구문 오류를 먼저 고치세요.\"}"
            exit 0
            ;;
          *)
            echo "{\"decision\":\"block\",\"reason\":\"locale 키 비대칭: ${DIFF}. 같은 세션에서 ko.json/en.json을 함께 맞추세요.\"}"
            exit 0
            ;;
        esac
      fi
    fi
    echo '{"decision":"allow"}'
    exit 0
    ;;
esac

# ─── 컴포넌트/페이지 변경: 사용자 노출 문자열 경고 (기존 동작) ────
case "$FILE" in
  */src/app/*.tsx|*/src/app/*/*.tsx|*/src/components/*)
    if printf '%s' "$CONTENT" | grep -qE '[가-힣]|aria-label=|placeholder=|>[^<{]{3,}<'; then
      echo '{"decision":"allow","reason":"사용자 노출 문자열 변경 가능성이 있습니다. src/locales/ko.json, src/locales/en.json 반영을 확인하세요."}'
      exit 0
    fi
    ;;
esac

echo '{"decision":"allow"}'
