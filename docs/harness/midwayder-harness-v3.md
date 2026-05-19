# MidWayDer Harness v3: Harness + Hermes + Symphony

> 목적: 기존 MidWayDer 하네스 위에 Hermes식 장기 실행 에이전트 운영과 Symphony식 이슈 보드 오케스트레이션을 얹는 기준을 정의한다.

---

## 한 줄 결론

MidWayDer v3는
**repo-local 하네스가 작업 규율을 정하고, Symphony가 이슈 보드를 실행 제어면으로 쓰며, Hermes식 runtime은 장기 실행/메모리/스킬 계층 후보로 둔다.**

즉:

- **Harness**: 무엇을 지켜야 하는지 정하는 프로젝트 운영 규칙
- **Codex adapter**: 그 규칙을 Codex 세션에서 실행하는 호스트 어댑터
- **Symphony**: 이슈/작업 보드를 읽어 Codex 실행을 자동으로 배정하는 오케스트레이터
- **Hermes**: 장기 실행 에이전트, persistent memory, skill learning, messaging gateway를 참고할 runtime 방향
- **Knowledge**: 작업 중 반복 실수와 교훈을 `docs/knowledge/*`에 남기고, 검증된 패턴만 hook/QA/skill로 승격하는 기억 계층

---

## 왜 v3가 필요한가

v2는 Claude-first 하네스를 Codex-ready로 확장했다.
하지만 사람이 여전히 각 세션을 직접 열고 지휘해야 한다면, 작업 수가 늘 때 병목은 사람의 주의력이다.

v3의 목표는 작업 단위를 세션이 아니라 **이슈**로 올리는 것이다.

```text
Issue / Task Board
  ↓
Symphony Orchestrator
  ↓
Per-Issue Workspace
  ↓
Codex Session
  ↓
MidWayDer Harness Route
  ├─ meeting
  ├─ build
  ├─ review
  ├─ qa
  └─ improve-harness
  ↓
PR / Evidence / Human Review
```

---

## 역할 경계

## 1. Harness

Harness는 MidWayDer의 운영 헌법이다.

Source of truth:

- `AGENTS.md`
- `docs/harness/*`
- `.claude/rules/*`
- `.claude/hooks/*`

Harness가 정하는 것:

- route 선택 기준
- must-preserve contracts
- agent role ownership
- review / qa evidence
- guard severity
- progress report 형식

Harness가 하지 않는 것:

- 이슈 보드 polling
- 장기 실행 프로세스 관리
- workspace lifecycle 관리
- tracker 상태 전환 자동화

## 2. Symphony

Symphony는 이슈 보드를 Codex 실행 제어면으로 만든다.

Repo-owned contract:

- `WORKFLOW.md`

Symphony가 정하는 것:

- 어떤 이슈가 active인지
- per-issue workspace를 어디에 만들지
- 동시에 몇 개의 Codex 세션을 돌릴지
- 실패/정지/재시도/종료를 어떻게 관찰할지
- issue metadata를 Codex prompt로 어떻게 넘길지

Symphony가 하지 않는 것:

- MidWayDer의 제품 판단
- Detour/API/UI 계약 판단
- 구현 세부 정책 정의

이 판단은 반드시 Harness에 남긴다.

## 3. Hermes

Hermes는 당장 복제할 구조가 아니라, runtime 진화 방향으로 참고한다.

MidWayDer가 가져올 것:

- long-running agent process 관점
- persistent memory 후보
- skill 생성/개선 루프
- Slack/CLI/메신저 gateway 후보
- model/provider lock-in을 줄이는 runtime abstraction

MidWayDer가 지금 가져오지 않을 것:

- 사용자 개인 기억을 repo에 저장하는 방식
- 모든 에이전트를 Hermes runtime으로 즉시 이관하는 것
- project guard를 우회하는 자체 skill 자동수정

Hermes식 자기개선은 `docs/harness/improvement-loop.md`의 `Observe → Suggest → Apply` 원칙을 따라야 한다.

## 4. Knowledge

Knowledge layer는 사람이 세션에서 배운 교훈을 다음 작업으로 넘기는 저장소다.

Repo-owned files:

- `docs/knowledge/README.md`
- `docs/knowledge/mistakes-and-lessons.md`
- `docs/knowledge/harness-health-checks.md`

Knowledge가 정하는 것:

- 반복 실수와 교훈 기록 형식
- regression, QA gap, hook 오탐, orchestration 문제의 후속 액션
- Hermes-style skill 후보로 승격할 수 있는 반복 체크리스트

Knowledge가 하지 않는 것:

- 자동으로 하네스 정책 변경
- 개인/민감 memory 저장
- 검증되지 않은 경험을 block hook으로 승격

`UserPromptSubmit` 5회마다 `.claude/hooks/harness-health-check.sh`가 하네스, Symphony, Hermes-style memory 사용 상태를 점검하도록 상기시킨다.

---

## MidWayDer v3 운영 모델

## 1. Board State

초기 권장 상태:

| 상태 | 의미 | 에이전트 동작 |
|------|------|---------------|
| `Todo` | 아직 사람이 정리 중 | 기본 active 후보지만 낮은 우선순위 |
| `Ready for Codex` | Codex 실행 가능 | Symphony가 우선 dispatch |
| `Codex Active` | 에이전트 작업 중 | per-issue workspace 유지 |
| `Human Review` | 사람이 결과 검토 | 에이전트는 추가 요청 전 대기 |
| `Merging` | PR landing 단계 | CI/rebase/merge 보조만 허용 |
| `Done` | 종료 | workspace 정리 후보 |
| `Canceled` | 중단 | workspace 정리 후보 |

`WORKFLOW.md`에는 `Todo`, `Ready for Codex`, `Codex Active`, `In Progress`를 active 후보로 둔다.
운영이 안정되면 `Todo`를 active에서 빼고 `Ready for Codex`만 dispatch하게 좁혀도 된다.

## 2. Label Routing

권장 label:

| Label | Route |
|-------|-------|
| `meeting` | `meeting` |
| `feature` | `meeting` 후 `build` |
| `bug` | `build` |
| `review` | `review` |
| `qa` | `qa` |
| `harness` | `improve-harness` |
| `security` | `qa` + Q3 |
| `performance` | `qa` + Q2 |
| `mobile` | `build` + mobile QA |

label이 없거나 충돌하면 route는 `meeting`으로 시작한다.

## 3. Workspace Policy

Symphony workspace는 issue 단위로 분리한다.

```text
.symphony/
  workspaces/
    MDW-123/
    MDW-124/
  logs/
```

규칙:

- workspace와 logs는 git에 커밋하지 않는다.
- 각 workspace는 한 issue만 처리한다.
- 같은 파일을 여러 workspace가 동시에 수정할 가능성이 있으면 issue dependency를 걸고 병렬 실행을 멈춘다.
- terminal state issue의 workspace는 정리 대상이다.

## 4. Concurrency Policy

초기값:

- 전체 동시 실행: 2
- `Codex Active`: 2
- `In Progress`: 1
- `max_turns`: 12

MidWayDer는 Detour/API/UI 계약이 촘촘하므로 처음부터 높은 동시성을 쓰지 않는다.
운영 데이터가 쌓이면 독립적인 문서/테스트/프론트엔드 작업부터 늘린다.

---

## Issue Prompt Contract

Symphony가 Codex에 넘기는 prompt는 반드시 아래를 포함한다.

- issue identifier/title/state/url/labels
- route selection requirement
- `AGENTS.md`와 `docs/harness/*`를 source of truth로 읽으라는 지시
- must-preserve contracts
- test/evidence closeout
- PR 또는 human review handoff

이 계약의 repo-local 구현은 `WORKFLOW.md`다.

---

## Safety Policy

## 1. 자동 merge 금지로 시작

초기 v3에서는 agent가 `Done`까지 밀지 않는다.
성공한 구현은 `Human Review`로 넘긴다.

자동 merge는 아래가 충분히 쌓인 뒤에만 검토한다.

- 안정적인 CI
- flaky test 분리
- review packet 품질
- secret/API validation guard 신뢰도
- rollback 절차

## 2. 자기개선은 제안까지만 자동화

Hermes식 skill learning과 Symphony식 follow-up issue 생성은 허용한다.
하지만 하네스 자체 수정은 사람 승인 없이 자동 적용하지 않는다.

허용:

- follow-up issue 제안
- guard 오탐 기록
- skill/harness 개선안 작성

불허:

- `.claude/hooks/*` severity 자동 상향
- `AGENTS.md` 역할 자동 변경
- secret/sandbox/approval 정책 자동 완화

## 3. Confusion은 실패가 아니라 신호다

에이전트가 아래 상태면 구현을 강행하지 않는다.

- 요구사항이 서로 충돌
- owner가 불명확
- API shape 변경 범위가 불명확
- Detour 의미가 바뀔 수 있음
- 모바일 UX acceptance가 없음

이 경우 issue에 blocking question을 남기고 `meeting`으로 전환한다.

---

## 도입 단계

## Phase 1. Repo Contract

완료 기준:

- `WORKFLOW.md` 존재
- `.symphony/README.md` 존재
- `.symphony/workspaces/`, `.symphony/logs/` git ignore
- `docs/harness/midwayder-harness-v3.md` 존재
- `docs/knowledge/*` 존재
- `.claude/hooks/harness-health-check.sh` 존재

## Phase 2. Manual Symphony-lite

사람이 issue를 보고 Codex를 열되, prompt와 closeout은 `WORKFLOW.md`를 따른다.

목표:

- issue 단위 작업 언어 정착
- label routing 검증
- review packet 형식 안정화

## Phase 3. Runner Pilot

신뢰된 환경에서만 Symphony runner를 켠다.

초기 조건:

- 동시 실행 1~2개
- 자동 merge 없음
- `Human Review` handoff 필수
- secret/API validation guard 활성

## Phase 4. Hermes-style Runtime Experiments

반복되는 운영 패턴만 Hermes식 장기 기억/스킬 후보로 승격한다.

예:

- Naver Maps QA checklist
- Detour regression checklist
- mobile visual review checklist
- CI failure triage skill

## Phase 5. Higher Autonomy

충분한 증거가 쌓인 뒤 검토한다.

- 일부 low-risk issue 자동 PR 생성
- flaky CI retry 자동화
- stale PR 정리
- worktree cleanup automation

---

## 현재 적용 상태

2026-05-04 기준 이 repo에 적용된 것은 **Phase 1 Repo Contract**다.

구현된 파일:

- `WORKFLOW.md`
- `.symphony/README.md`
- `docs/harness/midwayder-harness-v3.md`
- `docs/knowledge/README.md`
- `docs/knowledge/mistakes-and-lessons.md`
- `docs/knowledge/harness-health-checks.md`
- `.claude/hooks/harness-health-check.sh`

아직 하지 않은 것:

- 실제 Symphony daemon 설치/실행
- Linear/GitHub token 설정
- 자동 issue 상태 변경
- 자동 merge
- Hermes runtime 도입

이 구분을 유지해야 한다.
v3는 지금부터 쓸 수 있는 운영 계약이지만, 장기 실행 자동화는 별도 환경 설정과 신뢰도 검증 후 켠다.
