#!/bin/bash
# harness-check.sh — CI/pre-commit 파리티 스크립트
# .claude/hooks/* 규칙을 staged/committed 파일에 적용해 CI에서도 동일 차단을 재현한다.
# 로컬 hook (PostToolUse)이 놓친 변경(수동 편집, 외부 PR 등)을 잡는다.
#
# Usage:
#   scripts/harness-check.sh           # 현재 working tree 검사
#   scripts/harness-check.sh --staged  # git staged 파일만 검사 (pre-commit 용)
#   scripts/harness-check.sh --diff main  # main 대비 변경 파일만 검사 (CI PR 용)

set -euo pipefail

cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

MODE="working"
BASE_REF=""
case "${1:-}" in
  --staged) MODE="staged" ;;
  --diff) MODE="diff"; BASE_REF="${2:-main}" ;;
  "") ;;
  *) echo "Usage: $0 [--staged | --diff <ref>]"; exit 2 ;;
esac

collect_files() {
  case "$MODE" in
    staged) git diff --cached --name-only --diff-filter=ACM ;;
    diff)   git diff --name-only --diff-filter=ACM "$BASE_REF"...HEAD ;;
    *)      git ls-files --modified --others --exclude-standard ;;
  esac
}

FILES=$(collect_files)
if [ -z "$FILES" ]; then
  echo "✅ harness-check: 검사할 변경 파일 없음"
  exit 0
fi

FAIL=0
REPORT=""
ok()   { REPORT="${REPORT}  ✅ $1\n"; }
bad()  { REPORT="${REPORT}  ❌ $1\n"; FAIL=1; }

check_detour() {
  local f="$1"
  [ -f "$f" ] || return 0
  case "$f" in
    */calculator.ts)
      local full; full=$(cat "$f")
      if ! printf '%s' "$full" | grep -q 'calculateFinalScore' \
         || [ "$(printf '%s' "$full" | grep -cE '0\.7|0\.3' || true)" -lt 2 ]; then
        bad "$f: calculateFinalScore 또는 가중치(0.7/0.3) 소실"
        return
      fi
      ok "$f: detour 공식 보존"
      ;;
    */constants.ts)
      for k in COST_DISTANCE_WEIGHT COST_DURATION_WEIGHT MAX_PROXIMITY_DISTANCE ROUTE_CUTOFF_RATIO; do
        if ! grep -q "$k" "$f"; then
          bad "$f: 필수 상수 $k 누락"
          return
        fi
      done
      ok "$f: detour 상수 보존"
      ;;
  esac
}

check_provider() {
  local f="$1"
  [ -f "$f" ] || return 0
  case "$f" in
    */types.ts|*/factory.ts|*/index.ts|*__tests__*|*.test.ts|*.spec.ts) return ;;
  esac
  if grep -qE "from ['\"](\.\.?/)+types['\"]" "$f" \
     || grep -qE 'IDirectionsProvider|ISearchProvider|IGeocodingProvider' "$f"; then
    ok "$f: provider 계약 참조"
  else
    bad "$f: ../types 또는 I*Provider 참조 없음"
  fi
}

check_locale_symmetry() {
  local ko="src/locales/ko.json"
  local en="src/locales/en.json"
  [ -f "$ko" ] && [ -f "$en" ] || return 0
  local diff
  diff=$(python3 - <<PY
import json
def keys(d, p=""):
    r=set()
    if isinstance(d, dict):
        for k,v in d.items():
            path=f"{p}.{k}" if p else k
            if isinstance(v, dict): r |= keys(v, path)
            else: r.add(path)
    return r
ko=json.load(open("$ko", encoding="utf-8"))
en=json.load(open("$en", encoding="utf-8"))
kk, ek = keys(ko), keys(en)
out=[]
if kk-ek: out.append("ko-only: "+",".join(sorted(kk-ek)[:5]))
if ek-kk: out.append("en-only: "+",".join(sorted(ek-kk)[:5]))
print(" / ".join(out))
PY
)
  if [ -n "$diff" ]; then bad "locales 비대칭: $diff"
  else ok "locales ko/en 대칭"
  fi
}

check_api_route() {
  local f="$1"
  [ -f "$f" ] || return 0
  case "$f" in
    */api/health/route.ts|*/api/notifications/vapid-public-key/route.ts) return ;;
  esac

  # unsafe raw
  if grep -qE '\$queryRawUnsafe|\$executeRawUnsafe' "$f"; then
    bad "$f: \$queryRawUnsafe/\$executeRawUnsafe 사용 (SQL Injection)"
    return
  fi

  # input without validation
  if grep -qE 'request\.(json|formData)\(|searchParams\.get\(' "$f" \
     && ! grep -qE 'safeParse|\.parse\(|from .zod.|lib/validation' "$f"; then
    bad "$f: 입력 읽음 but validation 없음"
    return
  fi

  # error leak
  if grep -qE 'NextResponse\.json\([^)]*error:[^,}]*\b(err|error|e)\.(message|stack|name)' "$f"; then
    bad "$f: 에러 메시지 직접 노출"
    return
  fi

  ok "$f: API 가드 통과"
}

check_secret() {
  local f="$1"
  [ -f "$f" ] || return 0
  # 면제: env 파일, 하네스 자기 자신(탐지 규칙을 정의하는 파일)
  case "$f" in
    *.env|*.env.*) return ;;
    .claude/hooks/*|.claude/rules/*|scripts/harness-*|docs/harness/*) return ;;
  esac
  if grep -qE 'NEXT_PUBLIC_.*(SECRET|PRIVATE|DATABASE_URL)' "$f" 2>/dev/null; then
    bad "$f: NEXT_PUBLIC_* 에 민감 값 노출"
    return
  fi
  if grep -qE 'NAVER_MAPS_CLIENT_SECRET|DATABASE_URL=postgres|AKIA[0-9A-Z]{16}|sk-[A-Za-z0-9]{16,}' "$f" 2>/dev/null; then
    bad "$f: 하드코딩된 credential 패턴"
  fi
}

check_mobile_css() {
  local f="$1"
  [ -f "$f" ] || return 0
  if grep -oE '100(d?vh|vh)' "$f" 2>/dev/null | grep -q '^100vh$'; then
    bad "$f: 100vh 사용 (iOS Safari 버그) — 100dvh 사용 필요"
  fi
}

check_cache_ttl() {
  local f="$1"
  [ -f "$f" ] || return 0
  case "$f" in
    */search-cache.ts)
      if ! grep -q 'DEFAULT_TTL' "$f" || ! grep -q 'LEGACY_TTL' "$f"; then
        bad "$f: DEFAULT_TTL 또는 LEGACY_TTL 누락"
      fi ;;
    */session-results.ts)
      if ! grep -qE 'TTL_MS|TTL ' "$f"; then
        bad "$f: TTL 상수 누락"
      fi ;;
  esac
}

echo "🔍 harness-check (mode=$MODE, base=${BASE_REF:-<none>})"
while IFS= read -r f; do
  [ -z "$f" ] && continue
  case "$f" in
    src/lib/detour/*) check_detour "$f" ;;
    src/lib/map-provider/*/*.ts) check_provider "$f" ;;
    src/locales/*.json) check_locale_symmetry ;;
    src/app/api/*/route.ts) check_api_route "$f"; check_secret "$f" ;;
    src/lib/cache/*) check_cache_ttl "$f" ;;
    src/app/*.css|src/app/**/*.css) check_mobile_css "$f" ;;
    *.env*) ;;
    *) check_secret "$f" ;;
  esac
done <<< "$FILES"

printf "\n%b" "$REPORT"

if [ "$FAIL" -ne 0 ]; then
  echo ""
  echo "❌ harness-check: 실패. 위 규칙은 .claude/rules/harness.md §10~12 참조."
  exit 1
fi

echo ""
echo "✅ harness-check: 모든 검사 통과"
exit 0
