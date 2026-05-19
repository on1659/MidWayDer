# MidWayDer 하네스 현행 상태 (2026-04-13, updated 2026-05-04)

> 목적: 오늘 기준으로 저장소에 실제 존재하는 것과 존재하지 않는 것을 분리해, `docs/harness/`가 설계 문서인지 운영 문서인지 헷갈리지 않게 한다.

---

## 한 줄 판단

MidWayDer는 2026-05-04 기준으로 **코어 `.claude` 하네스, Codex companion adapter, Symphony/Hermes v3 repo contract가 구현된 상태**다.
아직 실제 Symphony runner와 Hermes runtime은 붙이지 않았지만, 최소 진입점과 역할 파일, 규칙, Hook, MCP, Codex mirror, issue-board workflow contract는 실제 파일로 존재한다.

더 정확히 말하면:

- 팀 구조 문서: 있음
- 프로젝트 컨텍스트 문서: 있음
- 테스트 스택: 있음
- QA 설정: 있음
- worktree 흔적: 있음
- 하네스 전용 명령/에이전트/Hook/MCP: **있음**
- Codex companion adapter: **있음**
- Symphony/Hermes v3 repo contract: **있음**
- Knowledge base: **있음**

즉, 이제 `docs/harness/`는 순수 설계 문서만이 아니라
**이미 생성된 `.claude` 골격의 운영 설명 문서**이기도 하다.

---

## 현재 확인된 기반 자산

### 1. 팀 구조 문서

존재:

- `AGENTS.md`

의미:

- P1~P3, D1~D4, Q1~Q3 역할이 이미 정의되어 있다.
- "파일 수 3개 이상이면 에이전트 사용" 같은 기준이 이미 적혀 있다.
- 하네스는 이 기준을 실제 실행 파이프라인으로 올려주면 된다.

### 2. 프로젝트 컨텍스트 문서

존재:

- `CLAUDE.md`
- `HANDOFF.md`

의미:

- 프로젝트 목적, 핵심 로직, 기술 스택, 인수인계 방식이 이미 문서화되어 있다.
- 하네스가 새로 발명해야 하는 정보량이 크지 않다.
- 특히 `CLAUDE.md`는 Planner/Developer/QA 역할 힌트가 이미 풍부하다.

### 3. 테스트 기반

존재:

- `vitest.config.ts`
- `playwright.config.ts`
- `tests/e2e/**`
- `src/**/__tests__/**`
- `.qa-config.json`

의미:

- 하네스가 기대하는 "증거 기반 QA"를 받쳐줄 기본 러너는 이미 있다.
- 특히 모바일 관련 스크립트가 이미 package.json에 정의돼 있다.

현재 확인된 주요 명령:

- `npm run lint`
- `npm run type-check`
- `npm run test`
- `npm run test:coverage`
- `npm run test:e2e`
- `npm run test:e2e:smoke`
- `npm run test:e2e:mobile`
- `npm run test:e2e:mobile:ui`
- `npm run test:e2e:mobile:visual`

### 4. `.claude` 기반 자산

존재:

- `.claude/settings.json`
- `.claude/settings.local.json`
- `.claude/worktrees/*`
- `.claude/commands/*`
- `.claude/agents/*`
- `.claude/rules/harness.md`
- `.claude/hooks/*`
- `.claude/mcp.json`
- `.claude/skills/harness/SKILL.md`

의미:

- Claude 관련 로컬 운영은 이미 일부 사용 중이다.
- 특히 `.claude/worktrees/*`가 있다는 것은 격리 작업 개념이 완전히 낯선 상태는 아니라는 뜻이다.
- 그리고 이제 하네스 진입점과 역할 파일이 실제로 생성되어, 문서 기반 설계가 실행 파일 구조로 옮겨지기 시작했다.

---

## 현재 구현된 하네스 항목

### 1. 하네스 명령 진입점

존재:

- `.claude/commands/work.md`
- `.claude/commands/build.md`
- `.claude/commands/meeting.md`
- `.claude/commands/review.md`
- `.claude/commands/qa.md`
- `.claude/commands/improve-harness.md`

의미:

- `/work`, `/build`, `/meeting`, `/review`, `/qa`용 진입점 골격이 생겼다.
- `/work`는 단일 입구, 나머지는 route-specific orchestrator 직접 진입점 역할을 한다.
- Command 계층이 Agent와 Rule 계층과 분리됐다.

### 2. 하네스 전용 에이전트 정의

존재:

- `.claude/agents/orchestrator.md`
- `.claude/agents/build-orchestrator.md`
- `.claude/agents/meeting-orchestrator.md`
- `.claude/agents/review-orchestrator.md`
- `.claude/agents/qa-orchestrator.md`
- `.claude/agents/harness-improver.md`
- `.claude/agents/scout.md`
- `.claude/agents/planner-product.md`
- `.claude/agents/planner-ux.md`
- `.claude/agents/architect-api.md`
- `.claude/agents/developer-backend.md`
- `.claude/agents/developer-algorithm.md`
- `.claude/agents/developer-frontend.md`
- `.claude/agents/developer-integration.md`
- `.claude/agents/reviewer.md`
- `.claude/agents/qa-functional.md`
- `.claude/agents/qa-performance.md`
- `.claude/agents/qa-security.md`

의미:

- `AGENTS.md`의 P1~Q3 구조를 `.claude` 실행 역할로 옮길 골격이 마련됐다.
- 메인 Orchestrator는 router brain 역할을 하고, route-specific orchestrator들이 실제 실행 조율을 담당한다.
- Scout, Reviewer, QA 기능이 분리되어 `correctless`식 역할 분리 원칙을 반영할 수 있는 상태가 됐다.

### 3. 하네스 규칙 파일

존재:

- `.claude/rules/harness.md`

의미:

- `SIMPLE / STANDARD / COMPLEX`
- 방향 판단 프레임워크 참조
- `must-preserve contracts`
- 증거 기반 종료

같은 핵심 규칙이 실제 파일로 존재하게 됐다.

### 3-1. 방향 판단 기준 문서

존재:

- `docs/harness/decision-framework.md`

의미:

- "좋아 보이는 기능"과 "MidWayDer에 맞는 올바른 개발방향"을 구분하는 기준선이 생겼다.
- 특히 `/meeting`에서 `Go / Conditional Go / Split / No-Go`를 내릴 때 사용할 공통 프레임워크가 마련됐다.

### 4. Guard Hook

존재:

- `.claude/hooks/env-secrets-guard.sh`
- `.claude/hooks/api-validation-guard.sh`
- `.claude/hooks/provider-contract-guard.sh`
- `.claude/hooks/detour-regression-guard.sh`
- `.claude/hooks/prisma-query-guard.sh`
- `.claude/hooks/i18n-guard.sh`
- `.claude/hooks/mobile-ui-guard.sh`
- `.claude/hooks/offline-cache-guard.sh`

의미:

- 최소 block 2개와 warn 계열 guard 골격이 생겼다.
- `.claude/settings.json`에 PostToolUse hook 연결도 반영됐다.

### 5. Playwright MCP 연결

존재:

- `.claude/mcp.json`

의미:

- Playwright MCP를 붙일 위치와 파일이 생겼다.
- 기존 Playwright 자산을 하네스 QA에 연결할 기반이 마련됐다.

---

## 아직 미완인 것

### 1. 실제 운영 검증

아직 남음:

- Claude에서 `/build`, `/meeting`, `/review`, `/qa`를 실제로 여러 번 태워보는 작업
- warn hook의 오탐률 조정
- 팀의 실제 사용 패턴에 맞춘 문구 다듬기

### 2. Codex 병행 구조

2026-04-25 기준 추가됨:

- `.codex/config.toml`
- `.codex/hooks.json`
- `.codex/hooks/codex-hook-dispatch.sh`
- `.codex/commands/*`
- `.codex/agents/README.md`
- `.codex/rules/README.md`
- `.codex/skills/harness/README.md`

전역 Codex 런타임 연결:

- `~/.codex/config.toml`에 `[features].codex_hooks = true`
- `~/.codex/hooks.json`이 현재 작업 디렉터리의 `.codex/hooks/codex-hook-dispatch.sh`를 호출

의미:

- 하네스 코어는 여전히 `docs/harness/*`, `AGENTS.md`, `.claude/rules/*`다.
- Codex 어댑터는 `.claude/hooks/*.sh`를 재사용하므로 guard 로직을 중복 정의하지 않는다.
- 현재 구조는 Claude-first에서 Claude + Codex companion 구조로 확장됐다.

### 3. Symphony/Hermes v3 repo contract

2026-05-04 기준 추가됨:

- `WORKFLOW.md`
- `.symphony/README.md`
- `docs/harness/midwayder-harness-v3.md`
- `docs/knowledge/README.md`
- `docs/knowledge/mistakes-and-lessons.md`
- `docs/knowledge/harness-health-checks.md`
- `.claude/hooks/harness-health-check.sh`

의미:

- `WORKFLOW.md`는 issue metadata를 Codex prompt로 바꾸는 repo-owned Symphony contract다.
- `.symphony/workspaces/`와 `.symphony/logs/`는 git ignore 대상이다.
- 현재 자동화의 기본 종착점은 `Done`이 아니라 `Human Review`다.
- Hermes는 즉시 도입된 runtime이 아니라, long-running agent, memory, skill learning, messaging gateway를 위한 참고 레이어다.
- 반복 실수와 교훈은 `docs/knowledge/mistakes-and-lessons.md`에 남긴다.
- `UserPromptSubmit` 5회마다 health check hook이 Harness/Symphony/Hermes-style memory 사용 상태를 상기시킨다.

아직 하지 않은 것:

- 실제 Symphony daemon 실행
- Linear/GitHub token 또는 board id 설정
- issue 상태 자동 전환
- 자동 merge
- Hermes runtime 설치/이관

### 4. 고급 Guard

아직 없음:

- `playwright-required-guard`
- `performance-budget-guard`
- `meeting-format-guard`

의미:

- 지금은 최소 운영 가드만 올린 상태다.
- 과한 block는 아직 피하고 있다.

### 4. 자기개선 루프

부분 구현:

- `.claude/commands/improve-harness.md`
- `.claude/agents/harness-improver.md`
- `docs/harness/improvement-loop.md`

의미:

- 하네스가 자기개선을 위해 Observe / Suggest는 할 수 있는 구조가 생겼다.
- 그러나 자동 Apply는 여전히 intentionally 비활성 상태다.

---

## MidWayDer 기준으로 특히 중요한 현재 공백

### 1. API Route 변경 검증의 실제 운영 튜닝

`src/app/api/**/route.ts`는 많이 존재하지만,
이제 `api-validation-guard` 골격은 생겼다.
하지만 예외 route와 정상 패턴에 대한 오탐 조정은 앞으로 실제 운영에서 다듬어야 한다.

리스크:

- Zod 검증 누락
- 응답 shape 드리프트
- 민감한 내부 에러 노출

### 2. Map Provider 추상화에 대한 경고 수준 튜닝

`src/lib/map-provider/`는 Kakao와 Naver를 같이 다룬다.
여기서 계약이 흔들리면 알고리즘과 API, UI가 연쇄적으로 흔들린다.
현재는 `provider-contract-guard`가 경고만 띄우므로, 실제 운영에서 얼마나 유효한지 봐야 한다.

리스크:

- provider factory 동작 불일치
- 타입 호환성 붕괴
- 테스트 누락 상태의 provider drift

### 3. Detour 알고리즘 변경의 증거 체계 강화 필요

`src/lib/detour/**`는 제품 차별점의 핵심인데,
`detour-regression-guard` 골격이 생겼어도 아직 경고 수준이다.
증거를 어느 정도까지 요구할지 운영 기준을 더 쌓아야 한다.

리스크:

- 랭킹 회귀
- 계산 비용 증가
- 경계 조건(후반 경로 후보 제외, 샘플링 간격 등) 파손

### 4. 모바일 회귀를 사후 발견하는 비율을 더 줄여야 함

모바일 Playwright 스펙은 이미 있지만,
이제 `mobile-ui-guard`와 `mcp.json` 기반이 생겼지만,
어떤 UI 변경에서 mobile E2E를 사실상 필수로 볼지 추가 운영 룰이 더 필요하다.

리스크:

- 검색 오버레이 가림
- 지도/결과 패널 충돌
- 작은 터치 타겟
- 시각 스냅샷 회귀

### 5. 다국어/오프라인 관련 변경은 아직 경고 수준

`src/locales/**`, `src/lib/cache/**`, `public/sw.js`, `src/store/cache-store.ts` 같은 영역은
변경 시 동시 검토가 필요한데, 이제 경고 훅은 생겼어도 아직 팀 사용 습관과 결합된 운영 룰은 더 필요하다.

---

## 현재 상태를 전제로 한 도입 전략

### 지금 당장 가능한 것

- `/build`, `/meeting`, `/review`, `/qa` 파일 기반 시범 운영
- Block Hook 2개 우선 운용
- warn hook 오탐률 점검
- Playwright MCP 연결 확인
- Warn Hook 몇 개를 실험 운영

### 아직 바로 올리면 위험한 것

- 모든 코드 경로에 TDD guard block
- 모든 UI 변경에 Playwright 필수 block
- 성능 예산을 자동 block으로 강제

이유:

- 현재 테스트 자산과 운영 습관이 아직 그 수준으로 정착되지 않았다.

---

## 이 문서 세트가 전제하는 운영 원칙

1. **문서가 실제 구현보다 한 발 앞선다**
   - 지금은 설계 문서가 먼저다.
2. **현재 상태와 목표 상태를 혼동하지 않는다**
   - 문서에 적혀 있다고 실제 `.claude/`에 있는 것은 아니다.
3. **도입은 계단식으로 한다**
   - 문서 → 명령 → 최소 Hook → QA MCP → 고급 Guard

---

## 권장 다음 단계

1. `docs/harness/README.md`를 총괄 문서로 삼는다.
2. `build-pipeline.md`와 `agent-mapping.md` 기준으로 역할/출력 형식을 맞춘다.
3. `.claude/commands/build.md`와 `.claude/rules/harness.md`를 먼저 만든다.
4. `env-secrets-guard`, `api-validation-guard` 두 개만 `block`으로 올린다.
5. Playwright MCP는 문서 정착 뒤에 붙인다.

---

## 결론

MidWayDer는 "하네스가 전혀 없는 프로젝트"는 아니다.
정확히는 **하네스를 얹기 좋은 준비물은 갖췄지만, 실행 계약이 비어 있는 프로젝트**다.
