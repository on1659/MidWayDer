---
name: goaldoc
description: goal 명세 문서 생성기. 자연어 요청을 /goal 로 그대로 실행 가능한 docs/goal/<슬러그>.md 문서로 변환한다. 구현은 하지 않고 명세 문서까지만 만든다. Triggers - /goaldoc, goal 문서, goal 명세, goal doc 만들어, goaldoc.
user-invocable: true
---

# /goaldoc — goal 명세 문서 생성기

`/goal` Goal Loop의 **입력 문서를 찍어내는 전처리 도구**다.
요청을 받아 `docs/goal/<슬러그>.md` 명세 문서를 작성하는 데서 끝낸다.
**구현은 하지 않는다.** 구현은 사용자가 `/goal docs/goal/<슬러그>.md` 로 직접 실행한다.

## 역할 경계

| 도구 | 역할 |
|------|------|
| `/goaldoc` (이 스킬) | 요청 → goal 명세 문서 작성 (대본 작가) |
| `/goal` | 그 문서를 읽어 Ralph Loop로 반복 실행 (실행기) |

`/goaldoc`은 코드를 **수정하지 않는다**. 정찰(읽기)만 한다.

---

## 실행 절차

### 1. 요청 분해

`$ARGUMENTS`를 독립적으로 검증 가능한 항목으로 쪼갠다.

- 한 요청에 여러 목표가 섞여 있으면 → 각각을 Acceptance Criteria 후보로 분리.
- **불명확하면 추측하지 말고 한 줄로 질문한다.** (예: "검색 결과 카드 어느 영역에 추가할까요? 헤더 / 카드 본문 / 뱃지 행?")
- 질문이 2개를 넘으면 `AskUserQuestion`으로 묶어 한 번에 받는다.

### 2. 슬러그 결정

- 영문 **kebab-case**. 예: `search-card-detour-badge`, `mobile-filter-chip-redesign`.
- 목표 핵심을 3~5단어로 압축.
- **게임 대상이면 게임명을 접두**로 붙인다. 예: `<게임명>-balance-rework`.
- `docs/goal/<슬러그>.md` 가 이미 있으면 사용자에게 덮어쓸지 / 새 슬러그를 쓸지 묻는다.

### 3. 가벼운 정찰 (읽기 전용)

명세를 **정확히 쓸 만큼만** 코드베이스를 본다. 과하게 파지 않는다.

- 관련 파일/컴포넌트 위치 확인 (Glob/Grep/Read)
- 영향받는 must-preserve 계약 식별 (아래 목록 참고)
- 기존 통합 지점 파악 (이 목표가 어디에 얹히는가)
- **절대 Edit/Write로 코드 수정 금지.** 정찰 결과는 문서에만 반영한다.

`docs/harness/goal-loop.md`의 Must-Preserve Contracts 중 관련 항목을 고른다:
detour 점수 의미/정렬 · `map-provider` 추상화 · API request/response shape + validation · Prisma/PostGIS 안전성 · Zustand store shape · 모바일 지도/결과 패널 플로우 · locale 키 일관성 · offline/cache 동작 · secret 처리.

### 4. 문서 작성

`docs/goal/<슬러그>.md` 를 **아래 템플릿**대로 작성한다.
이 템플릿은 `/goal`이 읽는 Goal Contract(`docs/harness/goal-loop.md`)와
runner 프롬프트(`docs/harness/goal-prompt-template.md`) 양쪽을 동시에 만족하도록 설계됐다 —
즉 이 문서 하나로 `/goal docs/goal/<슬러그>.md` 가 바로 돈다.

### 5. 안내

작성 후 다음을 출력한다:

- 생성 파일 **풀 경로**
- **첫 실행 프롬프트**: `/goal docs/goal/<슬러그>.md 해줘`
- 핵심 Acceptance Criteria 1~3줄 요약
- 정찰 중 발견한 미해결 질문이 있으면 명시

---

## 문서 템플릿

````markdown
# Goal: <한 문장 목표 — "무엇을, 어떤 제약 안에서">

> Slug: `<슬러그>`
> Created: <YYYY-MM-DD>
> Route 후보: build / meeting / review / qa / improve-harness 중 하나

---

## Goal Contract

- **Goal:** <한 문장. 관찰 가능한 결과로. "검색 UI 개선" 같은 모호한 표현 금지>
- **Source:** <사용자 요청 / issue 번호 / 회의록 경로>
- **Route:** <build | meeting | review | qa | improve-harness — 불명확하면 meeting>
- **Acceptance Criteria:**
  - [ ] <관찰 가능한 완료 조건 1>
  - [ ] <관찰 가능한 완료 조건 2>
  - [ ] 관련 type-check / test / e2e 통과 또는 실행 불가 사유 closeout 기록
- **Must-Preserve Contracts:**
  - <이 목표가 닿는 계약만 나열. 예: detour 점수 의미/정렬>
  - <예: 모바일 375px 결과 패널 ↔ 지도 플로우>
- **Evidence Plan:**
  - <어떤 증거로 완료를 증명할지. 예: `npm run test`, 관련 Vitest, Playwright mobile-m 스냅샷>
- **Stop Conditions:**
  - 사용자 승인 필요한 파괴적 작업
  - 요구사항 충돌 / secret 노출 가능성
  - 같은 실패 3회 반복
  - acceptance criteria 검증 불가
- **Human Review Handoff:** <성공 시 어디서 멈추고 사람이 무엇을 검토하는가>

---

## Scope

### In Scope
- <이번 goal에서 다룰 것>

### Out of Scope
- <명시적으로 제외할 것 — 범위 폭주 방지>

---

## 정찰 노트 (읽기 전용 조사 결과)

- 관련 파일: <경로:라인 — 무엇이 있는지>
- 기존 통합 지점: <이 목표가 얹히는 곳>
- 영향 범위 추정: SIMPLE / STANDARD / COMPLEX
- 알려진 리스크: <회귀 가능 지점>

---

## Goal Loop 실행용 프롬프트

> `/goal`이 매 slice마다 self-contained 프롬프트로 사용한다.
> (`docs/harness/goal-prompt-template.md` 형식 준수)

```markdown
Goal Loop로 진행해줘.

Goal:
- <한 문장 목표>

Done when:
- <Acceptance Criteria 1>
- <Acceptance Criteria 2>
- 관련 type-check/test가 통과하거나 실행 불가 사유가 closeout에 남는다

Constraints:
- MidWayDer의 AGENTS.md와 docs/harness/goal-loop.md를 따른다.
- 한 번에 하나의 bounded slice만 진행한다.
- Must-Preserve: <위 계약 재명시>
- destructive action은 사용자 승인 없이 수행하지 않는다.
- 완료, 차단, Human Review handoff 중 하나로 닫는다.

Preferred evidence:
- <증거 항목>

Stop markers:
- 완료되면 `GOAL_LOOP_DONE`
- 막히면 `GOAL_LOOP_BLOCKED`
- 사람 검토로 넘길 준비가 되면 `GOAL_LOOP_HUMAN_REVIEW`
```
````

---

## 게임 대상 추가 섹션

목표가 **게임 시스템/밸런스/콘텐츠**를 다루면 위 템플릿의 `## Scope` 뒤에 아래를 끼워 넣는다.

````markdown
## 게임 공정성 & 기존 통합 유지

### 공정성 (Fairness)
- [ ] 기존 플레이어 진행도/보상이 소급 손해 없이 유지
- [ ] P2W 또는 무과금-과금 격차를 새로 만들지 않음
- [ ] RNG/확률 변경 시 명시적 공개 + 기댓값 회귀 검증

### 기존 시스템 통합 유지
- [ ] 변경 시스템이 의존하는 기존 루프(경제/진행/매칭)와 계약 보존
- [ ] 세이브 데이터 마이그레이션 경로 명시 (스키마 변경 시)
- [ ] 기존 콘텐츠/튜토리얼/업적 참조가 깨지지 않음
````

---

## 작성 원칙

1. **Goal은 한 문장, 관찰 가능하게.** "좋게 고쳐줘" ❌ → "결과 카드에 detour score 뱃지 렌더링, 375px 레이아웃 보존" ✅
2. **Acceptance Criteria는 체크박스 + 검증 가능한 조건.** 느낌이 아니라 관찰.
3. **Out of Scope를 반드시 채운다.** Goal Loop의 slice 폭주를 막는 브레이크.
4. **Must-Preserve는 닿는 것만.** 전부 나열하면 의미 없다 — 이 목표가 실제로 위협하는 계약만.
5. **프롬프트 블록은 self-contained.** runner가 매 slice마다 새 세션에 넣으므로, 그 블록만 읽어도 목표가 선다.

## 참조

- `.claude/commands/goal.md` — 실행기
- `docs/harness/goal-loop.md` — Goal Contract / Closeout 원본
- `docs/harness/goal-prompt-template.md` — runner 프롬프트 형식
- `.claude/rules/harness.md` — triage / must-preserve 경계
