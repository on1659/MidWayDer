#!/usr/bin/env bash
# MidWayDer 하네스 트리아지 강제 검사
# PreToolUse(Edit|Write) 단계에서 실행 — 현재 turn 응답에 트리아지 선언이 없으면 exit 2로 차단.
# 분류 자체(SIMPLE/STANDARD/COMPLEX)는 Claude가 .claude/rules/harness.md §2 기준으로 판단.
# 훅은 "어떤 트리아지든 1번 선언" 여부만 강제한다.
#
# 통과 조건 (현재 turn assistant 출력에 다음 중 하나 포함):
#   - SIMPLE / STANDARD / COMPLEX (영문 대문자)
#   - "트리아지" (한글)
#
# 우회: 정말 필요하면 응답 첫 줄에 "[트리아지: SIMPLE] 한 줄 사유" 형태로 선언

input=$(cat)

# stdin JSON에서 transcript_path 추출 (jq 없이 동작)
transcript_path=$(printf '%s' "$input" \
  | grep -oE '"transcript_path"[[:space:]]*:[[:space:]]*"[^"]*"' \
  | sed -E 's/.*"transcript_path"[[:space:]]*:[[:space:]]*"([^"]*)"/\1/' \
  | head -1)

# transcript 없으면 통과 (안전 기본값 — 훅 자체로 인한 작업 중단 방지)
if [ -z "$transcript_path" ] || [ ! -f "$transcript_path" ]; then
    exit 0
fi

# 마지막 REAL user 메시지 라인 번호 찾기
# (tool_result도 type:"user"로 기록되므로 제외)
last_user=$(grep -n '"type":"user"' "$transcript_path" \
  | grep -v '"type":"tool_result"' \
  | tail -1 \
  | cut -d: -f1)

# user 메시지 없으면 통과
if [ -z "$last_user" ]; then
    exit 0
fi

# 마지막 user 메시지 이후 내용 = 현재 turn의 assistant 메시지들
after_user=$(tail -n +$((last_user + 1)) "$transcript_path")

# 트리아지 키워드 검사
if printf '%s' "$after_user" | grep -qE 'SIMPLE|STANDARD|COMPLEX|트리아지'; then
    exit 0
fi

# 미선언 → 차단
cat >&2 <<'EOF'
❌ [MidWayDer Harness] 트리아지 미선언 — Edit/Write 차단

수정 전에 응답 첫 줄(또는 명확한 위치)에서 트리아지를 1줄 선언하세요.

형식 예:
  [트리아지: SIMPLE] result-list 단일 파일 텍스트 수정, 계약 영향 없음
  [트리아지: STANDARD] 새 필터 칩 추가 — ResultList + FilterChips 2파일
  [트리아지: COMPLEX] /api/search route + detour calculator 변경, 강제 COMPLEX

기준: .claude/rules/harness.md §2
강제 COMPLEX 영역 (자동으로 COMPLEX):
  - src/lib/detour/**
  - src/lib/map-provider/** 공통 타입/팩토리
  - src/app/api/search/route.ts
  - prisma/schema.prisma 또는 migration
  - 오프라인/캐시/PWA, locale 구조, 모바일 결과 패널 + 지도 상호작용
EOF
exit 2
