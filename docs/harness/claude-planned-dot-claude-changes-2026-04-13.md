# MidWayDer 하네스 구현용 `.claude` 변경 설계안 (2026-04-13)

> 목적: 현재는 문서만 만들고, 나중에 실제 `.claude/` 구조를 추가할 때 어떤 파일을 어떤 책임으로 넣을지 미리 고정한다.

---

## 현재 전제

2026-04-13 기준 MidWayDer 루트 `.claude/`에는 아래가 있다.

- `settings.json`
- `settings.local.json`
- `worktrees/*`

아래는 아직 없다.

- `commands/*`
- `agents/*`
- `rules/harness.md`
- `hooks/*`
- `mcp.json`

따라서 이 문서는 **계획 문서**다.

---

## 목표 트리

```text
.claude/
├── agents/
│   ├── scout.md
│   ├── planner-product.md
│   ├── planner-ux.md
│   ├── architect-api.md
│   ├── developer-backend.md
│   ├── developer-algorithm.md
│   ├── developer-frontend.md
│   ├── developer-integration.md
│   ├── reviewer.md
│   ├── qa-functional.md
│   ├── qa-performance.md
│   └── qa-security.md
├── commands/
│   ├── build.md
│   ├── meeting.md
│   ├── review.md
│   └── qa.md
├── hooks/
│   ├── env-secrets-guard.sh
│   ├── api-validation-guard.sh
│   ├── provider-contract-guard.sh
│   ├── detour-regression-guard.sh
│   ├── prisma-query-guard.sh
│   ├── i18n-guard.sh
│   ├── mobile-ui-guard.sh
│   └── offline-cache-guard.sh
├── rules/
│   └── harness.md
├── skills/
│   └── harness/
│       └── SKILL.md
├── mcp.json
└── settings.json
```

### 선택적 병행 목표

Claude-first 하네스를 먼저 만든 뒤, 나중에 Codex와 병행 운영이 필요해지면
`claude-code-best-practice`를 참고해 아래처럼 최소 `.codex/` 동반 구조를 추가하는 방안을 검토한다.

```text
.codex/
├── config.toml
├── hooks.json
└── hooks/
    └── scripts/
```

중요한 점은, 1차 구현에서는 `.codex/`까지 동시에 만들지 않아도 된다는 것이다.
우선 `.claude/`가 안정화된 뒤, 필요 시 공존 구조로 확장한다.

---

## 1. `commands/`

### `build.md`

목적:

- 구현 요청의 공식 진입점
- `SIMPLE/STANDARD/COMPLEX` 분류
- 필요한 역할만 깨움

참고 패턴:

- `claude-code-best-practice`의 command 중심 오케스트레이션

핵심 문구:

- "Scout 없이 바로 패치하지 말 것"
- "must-preserve contracts를 먼저 정리할 것"
- "증거 기반으로 종료할 것"

### `meeting.md`

목적:

- 기능/리팩터링/운영 변경의 선행 검토 진입점

핵심 문구:

- "회의는 구현을 늦추기 위한 것이 아니라 `/build` 명세를 만들기 위한 것"
- "Planner/Developer/QA 출력을 구조화할 것"

### `review.md`

목적:

- 구현 완료 후 독립 검토 진입점

권장 역할:

- 기본 Reviewer
- 필요 시 Q3 교차 보안 검토

### `qa.md`

목적:

- 기능/성능/보안/모바일 검증 진입점

권장 연결:

- 기존 test 명령
- Playwright MCP

확장 여지:

- 향후 Codex 병행 운영 시 `.codex/hooks.json` 스타일의 QA 관련 hook 이벤트 설계를 참고할 수 있음

---

## 2. `agents/`

### `scout.md`

역할:

- 읽기 전용 코드베이스 정찰

반드시 포함할 출력:

- 수정 대상 파일
- 참조 파일
- 패턴
- 영향 범위
- must-preserve contracts

### `planner-product.md`

역할:

- P1 대응

반드시 포함할 출력:

- 사용자 가치
- 완료 기준
- 비범위

### `planner-ux.md`

역할:

- P2 대응

반드시 포함할 출력:

- 상태표
- fallback
- 모바일 플로우

### `architect-api.md`

역할:

- P3 대응

반드시 포함할 출력:

- request/response shape
- 타입 영향
- 하위 호환성

### `developer-backend.md`

역할:

- D1 대응

포함할 것:

- API/DB/validation 중심 구현 규칙

### `developer-algorithm.md`

역할:

- D2 대응

포함할 것:

- detour 공식, 경계 조건, 성능 고려

### `developer-frontend.md`

역할:

- D3 대응

포함할 것:

- 모바일 우선
- i18n
- 상태/UI 계약

### `developer-integration.md`

역할:

- D4 대응

포함할 것:

- provider contract
- retry/fallback
- 외부 API 오류 정규화

### `reviewer.md`

역할:

- 구현자와 독립된 관점으로 회귀/계약 검토

포함할 것:

- approve/request-changes
- 테스트 증거 충분성 확인
- 모바일/API/알고리즘/보안 교차 점검

### `qa-functional.md`

역할:

- Q1 대응

포함할 것:

- happy path
- regression
- E2E

### `qa-performance.md`

역할:

- Q2 대응

포함할 것:

- 쿼리/API/알고리즘 비용
- 기준 지표

### `qa-security.md`

역할:

- Q3 대응

포함할 것:

- validation
- secret exposure
- abuse surface

---

## 3. `rules/harness.md`

목적:

- 모든 코딩 요청에 공통으로 적용될 하네스 상위 규칙

포함해야 할 항목:

1. `SIMPLE/STANDARD/COMPLEX` 분류표
2. 무조건 `COMPLEX`인 MidWayDer 조건
3. must-preserve contracts 의무
4. 증거 없이 종료 금지
5. UI 변경 시 모바일 관점 누락 금지
6. API route 변경 시 validation 관점 누락 금지

---

## 4. `skills/harness/SKILL.md`

목적:

- `build.md`, `meeting.md`에서 참조하는 상세 운영 매뉴얼

추천 구성:

- 파이프라인 개요
- Stage별 입력/출력
- Triage 표
- 역할 활성화 규칙
- 종료 요약 형식

중요:

이 Skill은 프로젝트 일반 컨텍스트를 다시 길게 복제하기보다,
`docs/harness/*.md`를 요약 참조하는 방식이 더 낫다.

---

## 5. `hooks/`

우선순위별 구현 계획:

### 우선 구현

- `env-secrets-guard.sh`
- `api-validation-guard.sh`

### 다음 단계

- `provider-contract-guard.sh`
- `detour-regression-guard.sh`
- `prisma-query-guard.sh`
- `i18n-guard.sh`
- `mobile-ui-guard.sh`
- `offline-cache-guard.sh`

### 나중 단계

- `playwright-required-guard.sh`
- `performance-budget-guard.sh`
- `meeting-format-guard.sh`

---

## 6. `mcp.json`

### 1차 목표

Playwright MCP 연결

예시:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

### 이유

- 현재 저장소의 Playwright 자산과 바로 연결 가능
- 모바일/데스크톱 탐색 QA에 즉시 가치가 있음

---

## 7. 구현 순서 제안

### Step 1

- `rules/harness.md`
- `commands/build.md`

이 둘만 있어도 기본 진입점과 분기 기준이 생긴다.

### Step 2

- `agents/scout.md`
- `agents/reviewer.md`
- `agents/qa-functional.md`

운영상 가장 먼저 체감되는 역할들이다.

### Step 3

- Planner/Developer 세분화 agent 추가

### Step 4

- Block Hook 2개 추가

### Step 5

- Warn Hook 추가
- `mcp.json` 연결

### Step 6

- 필요성이 생기면 `.codex/config.toml`, `.codex/hooks.json` 최소 골격 검토
- 단, `.claude` 안정화 전에는 동시 도입하지 않음

---

## 구현 시 주의

1. 기존 `.claude/settings.json`과 충돌하지 않게 한다.
2. `worktrees/*`를 건드리는 규칙은 신중히 둔다.
3. 처음부터 너무 많은 Hook를 `block`으로 두지 않는다.
4. `commands/*`는 짧고 단호해야 하고, 상세는 `rules/`와 `skills/`로 보낸다.
5. 문서와 실제 `.claude/` 상태가 어긋나면 `current-status`를 먼저 갱신한다.

---

## 이 문서가 끝까지 문서로만 남아도 의미가 있는 이유

실제 `.claude/` 구현이 다음 턴으로 미뤄져도,
이 문서만 있으면 팀은 이미 아래를 공유하게 된다.

- 어떤 역할이 언제 필요한가
- 무엇을 block/warn할 것인가
- `/build`와 `/meeting`을 어떻게 나눌 것인가
- QA 증거를 무엇으로 볼 것인가

즉, 구현 전에도 **운영 언어를 맞추는 효과**가 있다.

---

## 결론

이 설계안은 MidWayDer 하네스를 바로 구현하기 위한 체크리스트다.
다음 단계에서 실제 `.claude/` 파일을 만들게 되면, 이 문서를 순서대로 따라가면 된다.
