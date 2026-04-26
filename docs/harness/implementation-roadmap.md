# MidWayDer 하네스 구현 로드맵

> 목적: 지금 만든 `docs/harness/`를 나중에 실제 `.claude/` 하네스로 구현할 때, 그대로 따라가면 되는 실행 체크리스트를 제공한다.

---

## 이 문서의 역할

이 문서는 설계 문서가 아니라 **실행 로드맵**이다.
즉, "좋은 방향"을 말하는 문서가 아니라 아래를 바로 결정해준다.

- 어떤 순서로 구현할지
- 한 번에 어디까지 묶을지
- 어떤 파일을 먼저 만들지
- 언제 테스트하고 멈출지
- 어떤 단계는 아직 하지 말아야 할지

---

## 한 줄 전략

MidWayDer 하네스는 한 번에 완성하지 않는다.
**문서 → 진입점 → 읽기 전용 역할 → 최소 Block Guard → QA 연결 → Warn Guard → 회의 하네스** 순서로 올린다.

그리고 장기적으로는
**Claude-first 운영 → host-agnostic core 정착 → Codex adapter 추가**
순서로 확장한다.

---

## 추천 구현 원칙

### 1. 한 PR에 너무 많이 넣지 않는다

하네스는 운영 규칙이라 한번 꼬이면 팀 전체가 불편해진다.
그래서 기능처럼 크게 한 번에 넣기보다, 작은 묶음으로 올리는 편이 안전하다.

상위 운영 흐름은 `claude-code-best-practice`의 표현을 빌려
`Research → Plan → Execute → Review → Ship`으로 보되,
실제 구현은 MidWayDer 문서 기준으로 쪼갠다.

### 2. Block는 가장 늦게가 아니라 가장 좁게 먼저 넣는다

처음 Block로 올릴 것은 적어야 한다.
대신 정말 중요한 두 개는 초기에 넣어도 된다.

- secret 노출
- API validation 누락

### 3. 문서와 실제 파일 상태를 항상 같이 갱신한다

`.claude/` 구현이 시작되면, `current-status-2026-04-13.md`도 함께 갱신해야 한다.

### 4. `AGENTS.md`를 재정의하지 않는다

하네스는 `AGENTS.md` 위에서 동작해야 한다.
별도 조직도를 또 만들면 운영 언어가 갈라진다.

### 5. 외부 레퍼런스는 한 번에 다 들여오지 않는다

우선순위는 [external-references.md](external-references.md)를 따른다.

- 1차: Anthropic 공식 패턴 + `correctless` + `Pimzino`
- 1.5차: `claude-code-best-practice`로 `.claude`/`.codex` 공존 구조 참고
- v2 조합 재료: `LAMDiceBot` + `Superpowers` + `gstack`
- 2차: `awesome-claude-code`, `cc-sdd`
- 3차: `autoresearch`, `Piebald`, `ATDD`

---

## 최종 목표 상태

최종적으로는 아래 수준까지 가는 것을 목표로 한다.

```text
1. /build 진입점 존재
2. harness rule 존재
3. scout/reviewer/qa agent 존재
4. planner/dev 세부 agent 존재
5. env-secrets/api-validation block guard 존재
6. warn guard 존재
7. playwright mcp 연결
8. /meeting 진입점 존재
```

하지만 이걸 한 번에 하지 않는다.

---

## 구현 단계 요약표

| 단계 | 이름 | 목표 | 권장 PR 수 |
|------|------|------|-----------|
| 0 | Baseline Freeze | 현재 상태 기준선 고정 | 1 |
| 1 | Entry Point | `/build`와 harness rule 추가 | 1 |
| 2 | Core Agents | `scout`, `reviewer`, `qa-functional` 추가 | 1 |
| 3 | Minimal Block Guards | `env-secrets`, `api-validation` 추가 | 1 |
| 4 | Planner/Dev Split | P1~D4 대응 agent 세분화 | 1~2 |
| 5 | QA Expansion | Playwright MCP와 QA 명령 정리 | 1 |
| 6 | Warn Guards | provider/detour/i18n/mobile/cache guard 추가 | 1~2 |
| 7 | `/meeting` Harness | 회의 진입점과 형식 정리 | 1 |
| 8 | Host Portability | host-agnostic core와 Codex adapter 준비 | 1 |
| 9 | Future Guards | 필요 시 미래 Guard 검토 | 나중 |

---

## Host 전략

지금 MidWayDer는 Claude-first다.
하지만 구현 순서를 그렇게 가져간다는 뜻이지, 하네스를 Claude-only로 묶는다는 뜻은 아니다.

원칙은 아래다.

1. core workflow는 `docs/harness/*`에 고정한다
2. `.claude/*`는 Claude adapter로 본다
3. `.codex/*`는 나중에 붙일 Codex adapter로 본다
4. routing / direction / review / qa 기준은 host마다 달라지지 않게 한다

자세한 내용은 [host-portability.md](host-portability.md)를 본다.

---

## 단계별 상세

## Phase 0. Baseline Freeze

### 목표

문서 기준선과 실제 저장소 상태를 고정한다.

### 해야 할 일

1. `docs/harness/` 문서 세트 검토
2. 현재 `.claude/` 실제 파일 목록 재확인
3. 하네스 구현은 아직 시작 안 했다는 상태를 팀에 공유

### 손댈 파일

- `docs/harness/current-status-2026-04-13.md`
- 필요 시 `docs/harness/README.md`

### 완료 기준

- 누구든 문서를 읽고 "지금은 설계만 있고 구현은 아직 없다"를 알 수 있다.

### 멈춤 체크

- `.claude/commands`, `.claude/agents`, `.claude/hooks`가 아직 없는 상태인지 확인

---

## Phase 1. Entry Point

### 목표

하네스의 최소 진입점만 만든다.

### 추가 파일

- `.claude/commands/build.md`
- `.claude/rules/harness.md`

### 권장 내용

#### `build.md`

- `/build`가 Orchestrator 하네스를 탄다는 선언
- `SIMPLE/STANDARD/COMPLEX` 분류 요구
- `STANDARD/COMPLEX`는 Scout 선행 요구
- must-preserve contracts 요구

#### `harness.md`

- MidWayDer 전용 분류 기준
- 무조건 `COMPLEX`로 보는 조건
- 검증 증거 첨부 원칙

### 이 단계에서 하지 말 것

- Planner/Dev 역할 세분화
- Hook 연결
- `/meeting` 구현

### 참고하면 좋은 외부 예시

- `claude-code-best-practice`
  - command 중심 오케스트레이션 문서화 방식
  - `.claude`와 `.codex`를 같이 두는 레이아웃 감각

### 완료 기준

- `/build`라는 공통 진입 언어가 생긴다.
- 문서 없이도 기본 분기 기준이 작동한다.

### 검증

- 문서 기준과 명령 내용이 모순 없는지 수동 검토

### 권장 커밋 단위

`feat(harness): add build entrypoint and core harness rule`

---

## Phase 2. Core Agents

### 목표

하네스가 가장 자주 필요로 하는 세 역할만 먼저 만든다.

### 추가 파일

- `.claude/agents/scout.md`
- `.claude/agents/reviewer.md`
- `.claude/agents/qa-functional.md`

### 왜 이 셋부터인가

- Scout: 복잡한 작업에서 영향 범위를 먼저 보게 함
- Reviewer: 구현자 혼자 끝내지 않게 함
- QA Functional: 최소 기능/E2E 증거를 강제하기 쉬움

### 각 파일의 최소 책임

#### `scout.md`

- 읽기 전용
- 수정 대상/참조 파일 구분
- must-preserve contracts 보고

#### `reviewer.md`

- approve/request-changes
- 계약/회귀/테스트 충분성 점검

#### `qa-functional.md`

- happy path
- regression
- E2E 권장 명령

### 완료 기준

- `STANDARD` 이상 작업에서 Scout → Reviewer → QA-lite 흐름이 가능하다.

### 검증

- 각 에이전트 파일이 `docs/harness/build-pipeline.md`, `agent-mapping.md`와 모순 없는지 비교

### 권장 커밋 단위

`feat(harness): add scout reviewer and functional qa agents`

---

## Phase 3. Minimal Block Guards

### 목표

가장 치명적인 실수 두 가지만 자동으로 막는다.

### 추가 파일

- `.claude/hooks/env-secrets-guard.sh`
- `.claude/hooks/api-validation-guard.sh`

### settings 연결

- `.claude/settings.json` 또는 관련 훅 설정 파일

### 왜 이 두 개만 먼저인가

- 비밀값 노출은 한 번 새면 되돌리기 어렵다.
- API validation 누락은 MidWayDer의 route 수가 많아서 초기에 막을 가치가 크다.

### 구현 시 체크포인트

#### `env-secrets-guard`

- 오탐이 너무 많지 않은가
- `.env*`와 일반 코드 파일을 구분하는가
- `NEXT_PUBLIC_` 오사용을 잡는가

#### `api-validation-guard`

- `src/app/api/**/route.ts`만 트리거되는가
- `zod` 또는 `src/lib/validation/**` 사용을 인지하는가
- 검증 실패 응답 패턴을 강요할 수 있는가

### 완료 기준

- route 파일에서 검증 누락 시 block
- 일반 코드에 secret 패턴 삽입 시 block

### 반드시 할 검증

1. 정상 파일 수정 시 과차단이 없는가
2. 의도적인 위반 케이스에서 실제 block 되는가

### 권장 커밋 단위

`feat(harness): add minimal block guards for secrets and api validation`

---

## Phase 4. Planner/Dev Split

### 목표

`AGENTS.md`의 P1~D4를 하네스 역할 파일로 세분화한다.

### 추가 파일

- `.claude/agents/planner-product.md`
- `.claude/agents/planner-ux.md`
- `.claude/agents/architect-api.md`
- `.claude/agents/developer-backend.md`
- `.claude/agents/developer-algorithm.md`
- `.claude/agents/developer-frontend.md`
- `.claude/agents/developer-integration.md`

### 이 단계에서 중요한 것

- 역할 소개보다 출력 계약이 더 중요하다.
- "멋있는 페르소나"보다 "반드시 포함할 항목"이 중요하다.

### 각 파일에 꼭 넣을 것

#### Planner 계열

- acceptance criteria
- fallback
- request/response contract
- 범위/비범위

#### Dev 계열

- 소유 파일 범위
- must-preserve contracts
- 테스트/모바일/보안 관점

### 완료 기준

- `COMPLEX` 작업에서 문서상의 P1~D4 체계를 실제 agent 파일로 호출 가능하다.

### 권장 분할

#### PR A

- Planner 3종

#### PR B

- Developer 4종

이렇게 나누면 리뷰가 편하다.

---

## Phase 5. QA Expansion

### 목표

기존 Playwright/Vitest 자산을 하네스 QA 흐름에 실전 연결한다.

### 추가 파일

- `.claude/commands/qa.md`
- `.claude/mcp.json`
- 필요 시 `.claude/agents/qa-performance.md`
- 필요 시 `.claude/agents/qa-security.md`

### 참고하면 좋은 외부 예시

- `claude-code-best-practice`
  - `.codex/hooks.json` 이벤트 구성을 참고해, 나중에 Codex 병행 운영 시 hook 설계를 쉽게 옮길 수 있다

### 먼저 할 일

1. `qa.md`에 기본 검증 명령 정의
2. Playwright MCP 연결
3. `docs/harness/playwright-mcp.md` 기준으로 QA 출력 템플릿 맞춤

### 권장 QA 기본 세트

#### 공통

```bash
npm run type-check
npm run test
```

#### UI 변경

```bash
npm run test:e2e:smoke
npm run test:e2e:mobile:ui
```

#### 시각 회귀 우려

```bash
npm run test:e2e:mobile:visual
```

### 완료 기준

- Q1이 자동 명령 + MCP 탐색을 함께 언급할 수 있다.
- 모바일 증거를 수집하는 표준 흐름이 생긴다.

### 권장 커밋 단위

`feat(harness): connect qa command and playwright mcp`

---

## Phase 6. Warn Guards

### 목표

치명적이진 않지만 자주 놓치는 회귀를 경고로 띄운다.

### 추가 후보 파일

- `.claude/hooks/provider-contract-guard.sh`
- `.claude/hooks/detour-regression-guard.sh`
- `.claude/hooks/prisma-query-guard.sh`
- `.claude/hooks/i18n-guard.sh`
- `.claude/hooks/mobile-ui-guard.sh`
- `.claude/hooks/offline-cache-guard.sh`

### 권장 구현 순서

1. `i18n-guard`
2. `mobile-ui-guard`
3. `provider-contract-guard`
4. `detour-regression-guard`
5. `offline-cache-guard`
6. `prisma-query-guard`

### 이유

- i18n/mobile은 체감 가치가 빠르고 오탐을 조정하기 쉽다.
- provider/detour/offline/prisma는 중요하지만 문맥 의존성이 더 크다.

### 완료 기준

- 경고 메시지가 추상적이지 않고 후속 행동을 제안한다.
- warn 때문에 작업 흐름이 과하게 흔들리지 않는다.

### 검증

- 실제 파일 몇 개를 대상으로 dry-run 성격 점검
- 오탐 사례 기록

---

## Phase 7. `/meeting` Harness

### 목표

복잡한 기능을 구현 전에 구조화하는 공식 진입점을 만든다.

### 추가 파일

- `.claude/commands/meeting.md`
- 필요 시 `.claude/agents/qa-performance.md`
- 필요 시 `.claude/agents/qa-security.md`

### 이 단계에서 중요한 것

- `/meeting`은 장식용 명령이 되면 안 된다.
- 반드시 `/build`에 넘길 산출물을 남겨야 한다.

### 최소 요구

- 안건 요약
- P1/P2/P3 출력 형식
- D1~D4 영향 분석 형식
- Q1/Q2/Q3 리스크 형식
- 최종 Go / Conditional Go / No-Go / Split
- generator-evaluator 루프 반영
- 신규 기능 vs 버그 수정 분리

### 완료 기준

- 복잡한 안건을 `/meeting`으로 보냈을 때, 구현 명세가 남는다.

---

## Phase 7.5. Optional Codex Companion

### 목표

Claude-first 하네스가 안정화된 뒤, 필요할 때만 `.codex/` 동반 구조를 검토한다.

2026-04-25 기준 최소 companion adapter는 구현됐다.

### 참고 레퍼런스

- `claude-code-best-practice`
  - `.codex/config.toml`
  - `.codex/hooks.json`

### 최소 후보 파일

- `.codex/config.toml` — 완료
- `.codex/hooks.json` — 완료
- `.codex/hooks/codex-hook-dispatch.sh` — 완료
- `.codex/commands/*` — 완료
- `.codex/agents/README.md` — 완료
- `.codex/rules/README.md` — 완료
- `.codex/skills/harness/README.md` — 완료

### 이 단계에서의 원칙

- `.claude`를 먼저 안정화한다
- `.codex`는 공존용 보조 계층으로 붙인다
- 같은 규칙을 중복 정의하지 않고, 문서 기준선은 `docs/harness/*`로 유지한다

---

## Phase 8. Future Guards

### 목표

운영 데이터가 충분히 쌓였을 때만 고급 Guard를 검토한다.

### 후보

- `playwright-required-guard`
- `performance-budget-guard`
- `meeting-format-guard`

### 지금 하지 않는 이유

- 아직은 팀이 하네스에 적응하는 단계다.
- 성급한 block는 반발과 우회만 낳을 수 있다.

---

## 실제 작업용 체크리스트

## 체크리스트 A. 첫 번째 구현 묶음

- [ ] `.claude/commands/build.md`
- [ ] `.claude/rules/harness.md`
- [ ] `current-status` 문서 업데이트 준비
- [ ] 간단한 예시 요청으로 흐름 점검

## 체크리스트 B. 두 번째 구현 묶음

- [ ] `.claude/agents/scout.md`
- [ ] `.claude/agents/reviewer.md`
- [ ] `.claude/agents/qa-functional.md`
- [ ] `build-pipeline.md`와 출력 형식 대조

## 체크리스트 C. 세 번째 구현 묶음

- [ ] `env-secrets-guard.sh`
- [ ] `api-validation-guard.sh`
- [ ] 훅 설정 연결
- [ ] 정상/위반 케이스 수동 검증

## 체크리스트 D. 네 번째 구현 묶음

- [ ] Planner agent 3개
- [ ] Developer agent 4개
- [ ] `agent-mapping.md`와 대조

## 체크리스트 E. 다섯 번째 구현 묶음

- [ ] `.claude/commands/qa.md`
- [ ] `.claude/mcp.json`
- [ ] Playwright MCP 연결 확인
- [ ] Q1 보고 형식 정리

---

## 권장 PR 분할안

### PR 1

- 문서 정리
- `/build`
- `rules/harness`

### PR 2

- `scout`
- `reviewer`
- `qa-functional`

### PR 3

- `env-secrets-guard`
- `api-validation-guard`

### PR 4

- Planner/Developer agent 세분화

### PR 5

- `qa.md`
- `mcp.json`
- QA 확장

### PR 6+

- Warn Guard들
- `/meeting`

---

## 단계별 완료 후 반드시 할 문서 업데이트

실제 `.claude/` 구현을 시작한 뒤에는 아래 문서도 같이 갱신해야 한다.

### 항상 갱신

- `docs/harness/current-status-2026-04-13.md`

### 필요 시 갱신

- `docs/harness/README.md`
- `docs/harness/external-references.md`
- `docs/harness/claude-planned-dot-claude-changes-2026-04-13.md`

### 이유

문서와 실제 상태가 어긋나면, 하네스는 도입하자마자 신뢰를 잃는다.

---

## 나중에 구현할 사람을 위한 빠른 시작 순서

시간이 없으면 아래 순서만 따라도 된다.

1. `README.md`
2. `current-status-2026-04-13.md`
3. `build-pipeline.md`
4. `agent-mapping.md`
5. `hooks-spec.md`
6. `claude-planned-dot-claude-changes-2026-04-13.md`
7. 이 `implementation-roadmap.md`

그 다음 실제 구현은 아래 순서다.

1. `build.md`
2. `harness.md`
3. `scout.md`
4. `reviewer.md`
5. `qa-functional.md`
6. `env-secrets-guard.sh`
7. `api-validation-guard.sh`
8. 나머지

---

## 절대 하지 말아야 할 구현 순서

1. Hook부터 잔뜩 넣고 명령/역할은 나중에 만들기
2. `/meeting`부터 화려하게 만들고 `/build`는 비워두기
3. Planner/Developer/QA agent를 한 번에 다 만들고 검증 없이 끝내기
4. Block Guard를 5개 이상 한꺼번에 켜기

---

## 한 줄 결론

나중에 실제 하네스를 구현할 때는,
**`/build` 진입점과 최소 안전장치부터 올리고, 나머지는 단계적으로 확장하는 방식**이 MidWayDer에 가장 안전하다.
