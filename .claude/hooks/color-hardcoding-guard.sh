#!/bin/bash
set -euo pipefail

# ─── 색 하드코딩 차단 (design-system.md §1) ───────────────────
# 7개 테마의 500-단계 hex 또는 accent rgb 튜플이 감지되면 block.
# 예외: theme.css(토큰 선언), theme-colors.ts(SSR 폴백), 스와치 시각화.

INPUT=$(cat)
FILE=$(printf '%s' "$INPUT" | python3 -c 'import json,sys; data=json.load(sys.stdin); print(data.get("tool_input", {}).get("file_path", ""))')
CONTENT=$(printf '%s' "$INPUT" | python3 -c 'import json,sys; data=json.load(sys.stdin); print(data.get("tool_input", {}).get("content", ""))')

# 체크 범위: src/ 내부의 .ts / .tsx / .css
case "$FILE" in
  */src/*.ts|*/src/*.tsx|*/src/*.css) ;;
  *) echo '{"decision":"allow"}'; exit 0 ;;
esac

# 예외 경로: 토큰 정의/시각화/폴백/메타태그
case "$FILE" in
  */src/app/theme.css) echo '{"decision":"allow"}'; exit 0 ;;
  */src/lib/theme-colors.ts) echo '{"decision":"allow"}'; exit 0 ;;
  */src/components/settings/AppearanceSettings.tsx) echo '{"decision":"allow"}'; exit 0 ;;
  */src/app/layout.tsx) echo '{"decision":"allow"}'; exit 0 ;;  # meta theme-color: 브라우저가 var() 미지원 (design-system.md §1.4)
esac

# content 없으면 최종 파일에서 읽음 (Edit 후 상태 검사)
if [ -z "$CONTENT" ] && [ -f "$FILE" ]; then
  CONTENT=$(cat "$FILE")
fi

[ -z "$CONTENT" ] && { echo '{"decision":"allow"}'; exit 0; }

# ─── 7개 테마 500-단계 hex ────────────────────────────────────
# blue:    #3274f9
# indigo:  #6366f1
# violet:  #8b5cf6
# teal:    #06b6d4
# emerald: #10b981
# rose:    #f43f5e
# slate:   #64748b
HEX_PATTERN='#(3274[fF]9|6366[fF]1|8[bB]5[cC][fF]6|06[bB]6[dD]4|10[bB]981|[fF]43[fF]5[eE]|64748[bB])'

# ─── accent rgb 튜플 ─────────────────────────────────────────
# 7테마 500의 rgb 컴마-튜플 (유연한 공백)
RGB_PATTERN='rgba?\(\s*(50,\s*116,\s*249|99,\s*102,\s*241|139,\s*92,\s*246|6,\s*182,\s*212|16,\s*185,\s*129|244,\s*63,\s*94|100,\s*116,\s*139)'

HEX_MATCHES=$(printf '%s' "$CONTENT" | grep -oE "$HEX_PATTERN" | head -3 || true)
RGB_MATCHES=$(printf '%s' "$CONTENT" | grep -oE "$RGB_PATTERN" | head -3 || true)

if [ -n "$HEX_MATCHES" ] || [ -n "$RGB_MATCHES" ]; then
  SAMPLES=$(printf '%s\n%s' "$HEX_MATCHES" "$RGB_MATCHES" | grep -v '^$' | head -3 | tr '\n' ',' | sed 's/,$//')
  REASON="색 하드코딩 감지 ($SAMPLES). 테마 전환이 깨집니다. var(--accent) / rgba(var(--color-accent-rgb), X) 또는 theme-colors.ts 헬퍼를 사용하세요. 규약: .claude/rules/design-system.md §1"
  printf '{"decision":"block","reason":"%s"}\n' "$REASON"
  exit 0
fi

echo '{"decision":"allow"}'
