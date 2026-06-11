#!/bin/bash
set -euo pipefail

# goal-archive.sh — Stop 훅
# 완료된 goal 명세 파일을 docs/goal/applied/ 로 아카이브한다.
#
# 동작:
#   - 큐 파일 .claude/.goal-applied-queue 가 없거나 비어 있으면 즉시 exit 0 (부작용 없음)
#   - 큐의 각 줄을 읽어 docs/goal/*.md 형태(바로 아래 .md만, 하위 폴더 제외)만 허용
#   - 존재하는 파일만 docs/goal/applied/ 로 mv (applied 폴더는 mkdir -p)
#   - 처리 후 큐 파일 삭제, 이동한 파일명을 stderr로 한 줄 로그

ROOT="${CLAUDE_PROJECT_DIR:-$(pwd)}"
QUEUE="$ROOT/.claude/.goal-applied-queue"
DEST="$ROOT/docs/goal/applied"

# 큐가 없거나 비어 있으면 아무 것도 하지 않음
if [ ! -s "$QUEUE" ]; then
  exit 0
fi

mkdir -p "$DEST"

moved=()
while IFS= read -r line || [ -n "$line" ]; do
  # 앞뒤 공백 제거
  path="${line#"${line%%[![:space:]]*}"}"
  path="${path%"${path##*[![:space:]]}"}"
  [ -z "$path" ] && continue

  # docs/goal/ 바로 아래 .md 만 허용 (하위 폴더 제외)
  case "$path" in
    docs/goal/*.md)
      # docs/goal/ 이후에 추가 슬래시가 있으면(하위 폴더) 거부
      rest="${path#docs/goal/}"
      case "$rest" in
        */*) continue ;;  # docs/goal/applied/foo.md 등 하위 폴더 → skip
      esac
      ;;
    *)
      continue
      ;;
  esac

  src="$ROOT/$path"
  if [ -f "$src" ]; then
    mv "$src" "$DEST/"
    moved+=("$(basename "$path")")
  fi
done < "$QUEUE"

# 큐 비우기
rm -f "$QUEUE"

# 이동한 파일 로그 (stderr)
if [ "${#moved[@]}" -gt 0 ]; then
  echo "goal-archive: moved ${#moved[@]} file(s) to docs/goal/applied/ -> ${moved[*]}" >&2
fi

exit 0
