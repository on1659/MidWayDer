# lamdicebot 하네스 참고 자산

`github.com/on1659/lamdicebot` 의 `.claude/` 디렉터리 전체를 2026-05-10 시점에 클론한 사본.

**용도**: 참고 / 비교 / 후속 흡수 검토용. **MidWayDer가 직접 실행하는 하네스가 아님.**
실제 동작 하네스는 [`/.claude/`](../../../.claude/) 와 [`/.claude/rules/`](../../../.claude/rules/) 에 위치.

---

## 흡수된 컨셉 (이미 MidWayDer 하네스에 반영)

| lamdicebot 원본 | MidWayDer 반영 위치 |
|----------------|---------------------|
| `rules/harness.md` — 이더(Ether) 트리아지 SIMPLE/STANDARD/COMPLEX | `.claude/rules/harness.md` §2 (이미 존재) |
| `rules/harness.md` — 재트리아지 규칙 ("확인과 수정은 별개") | `.claude/rules/harness.md` §2 "재트리아지 규칙" (신규 추가) |
| `rules/workflow.md` — 상태 전이표 + 루프 카운터 (Reviewer↔Coder 3회 / QA↔Coder 3회) | `.claude/rules/workflow.md` §1 (신규 작성) |
| `rules/workflow.md` — Meeting → impl 문서 → Build 트랙 연결 | `.claude/rules/workflow.md` §5 (신규) |
| `skills/skill-pd.md` — Quality Gate / 배포 리스크 / 연차별 행동 / 의견 형식 | `.claude/meeting-team-profiles.md` §1 PD (신규 작성) |
| `skills/skill-ui.md` — CSS 변수 아키텍처 + 반응형 + 회의 체크 | `.claude/meeting-team-profiles.md` §2 UI Designer |
| `skills/skill-ux.md` — 사용자 여정 + 접근성 + 인지 부하 | `.claude/meeting-team-profiles.md` §3 UX Designer |
| `skills/skill-backend.md` / `skill-frontend.md` / `skill-qa.md` | `.claude/meeting-team-profiles.md` §4~6 (요약 흡수) |

---

## 흡수하지 않은 자산 (참고 보관)

### lamdicebot 도메인 특화 — MidWayDer에 부적합
- `agents/scout.md` `coder.md` `reviewer.md` `qa.md` — lamdicebot 게임 도메인(Socket.IO, 공정성, 4종 게임 lesson 자동조회) 기반. MidWayDer는 이미 도메인 특화 에이전트(`developer-backend/frontend/algorithm/integration`, `qa-functional/performance/security`) 보유 중이라 충돌 회피.
- `hooks/fairness-guard.sh` — 게임 공정성(서버 측 난수) 검증 — MidWayDer 무관
- `hooks/css-var-guard.sh` — Material Design 팔레트 검증 — MidWayDer는 자체 토큰 시스템(`color-hardcoding-guard.sh`)으로 대체
- `hooks/mobile-guard.sh` — 게임 모바일 룰 — MidWayDer는 `mobile-ui-guard.sh` 존재
- `commands/dev-cycle.md` `harness-audit.md` `meeting-multi.md` `meetsound.md` `summit*.md` `sound*.md` — 게임/사운드/회의 다양화 워크플로우. MidWayDer는 단일 `meeting` + `improve-harness` 로 충분.
- `commands/addvehicle.md` `meeting-team.md` — 게임 컨셉 명령

### 흡수 검토 가치 있음 (후속 작업)

#### 우선순위 ★★★ — Codex 병렬 정찰/리뷰 패턴
`agents/scout-codex.md` + `reviewer-codex.md` 가 정의한 **Claude + Codex 병렬 검증** 구조. MidWayDer가 향후 멀티 LLM 비교를 도입할 때 참고. 현재 `workflow.md` §1 상태 전이표에서 "COMPLEX → SCOUT (또는 SCOUT 병렬)" 로 가능성만 열어둠.

#### 우선순위 ★★ — Meeting Multi (병렬 입장 토론)
`commands/meeting-multi.md` 의 다중 페르소나 동시 토론 루프. 현재 MidWayDer `meeting`은 순차 라운드만 지원. PR 검토 단계에서 평가 후 도입 가능.

#### 우선순위 ★ — agents/codex-planner.md
계획 단계에서 외부 LLM(Codex) 의견을 받는 패턴. 회의 트랙 강화 옵션.

---

## 후속 작업 제안 (사용자 결정 필요)

1. `external/lamdicebot/.claude/` 사본을 git에 커밋할지 vs gitignore 처리할지
2. Codex 병렬 정찰 패턴을 신규 명령(`/build-codex` 등)으로 도입할지
3. `meeting-multi` 의 다중 입장 동시 토론을 `meeting-orchestrator.md`에 흡수할지

---

## 다운로드 명령 (재현용)

```bash
mkdir -p docs/harness/external/lamdicebot/.claude
gh api "repos/on1659/lamdicebot/git/trees/main?recursive=1" \
  --jq '.tree[] | select(.path | startswith(".claude")) | .path' \
  | while read f; do
      [ "${f##*.}" = "$f" ] && continue
      mkdir -p "docs/harness/external/lamdicebot/$(dirname "$f")"
      gh api "repos/on1659/lamdicebot/contents/$f" --jq '.content' \
        | base64 -d > "docs/harness/external/lamdicebot/$f"
    done
```
