# MidWayDer Workflow — 실행 흐름 정의

[`harness.md`](./harness.md) 트리아지 결과로부터 실제 파이프라인이 어떻게 흐르는지, 어디서 분기하고 어디서 루프하는지를 정의한다. 트리아지 기준은 harness.md §2를, must-preserve 계약은 harness.md §5를 참조.

**상위 흐름**: `Orchestrator(work)` → `triage` → `build/meeting/review/qa` 중 하나.

---

## 1. Build 트랙 (구현/수정)

```
요청 → TRIAGE
         ├─ SIMPLE → IMPLEMENT → DONE
         ├─ STANDARD → SCOUT → SPEC → CODE ←→ REVIEW (max 3) → DONE
         └─ COMPLEX → SCOUT → SPEC → CODE ←→ REVIEW (max 3) → QA ←→ CODE (max 3) → DONE
```

### 상태 전이표

| 현재 상태 | 조건 | 다음 상태 |
|-----------|------|-----------|
| TRIAGE | SIMPLE 판정 | IMPLEMENT |
| TRIAGE | STANDARD 판정 | SCOUT |
| TRIAGE | COMPLEX 판정 | SCOUT (또는 SCOUT 병렬) |
| SCOUT 완료 | 영향 범위가 최초 트리아지 초과 | TRIAGE (상향 재판정) |
| SCOUT 완료 | 정상 | SPEC (Build Orchestrator가 지시서 작성) |
| SPEC 완료 | 항상 | CODE (Developer 역할 분배) |
| CODE 완료 | 항상 | REVIEW |
| REVIEW | approve | DONE (STANDARD) 또는 QA (COMPLEX) |
| REVIEW | request-changes, 루프 < 3 | CODE (피드백 누적 전달) |
| REVIEW | request-changes, 루프 ≥ 3 | ESCALATE |
| QA | risk-zone 변경 있음 | TEST (vitest + 필요 시 Playwright) + Q-Evidence 수집 |
| QA | PA Primary 통과 + Q축 통과 | DONE |
| QA | PA fail OR Q3(security) fail, 루프 < 3 | CODE (수정 지시 누적) → REVIEW → QA |
| QA | 루프 ≥ 3 | ESCALATE |
| ESCALATE | 항상 | 미해결 이슈 + 현재 결과 보고, 사용자 판단 요청 |

### 루프 카운터

- **Reviewer → Developer 루프**: 최대 **3회**
- **QA → Developer 루프**: 최대 **3회** (QA 루프 시 Reviewer도 다시 거침)
- 루프마다 이전 피드백을 누적해서 다음 Developer 호출에 전달
- 같은 이슈가 2회 연속 지적되면 Build Orchestrator가 직접 개입해 방향 조정

### 재트리아지 전이

| 현재 상태 | 조건 | 다음 상태 |
|-----------|------|-----------|
| 조사 중 | 수정 필요성 발견 | TRIAGE (처음부터) |
| SIMPLE 진행 중 | 영향 범위 3파일+ 또는 강제 COMPLEX 영역 진입 | TRIAGE (상향 재판정) |
| SCOUT 완료 | 보고 영향이 최초 트리아지 수준 초과 | TRIAGE (상향 재판정) |
| QA TEST 중 | 새 risk-zone 변경 발견 | TRIAGE (상향 재판정) |

---

## 2. Meeting 트랙 (설계/검토)

```
/meeting [주제]
  → CONTEXT (Scout 정찰 + 관련 docs/harness/decision-framework 로드)
  → DRAFT (Planner Product/UX가 3~7개 포인트 작성)
  → REVIEW_LOOP (최대 3라운드)
       Planner 입장 → Developer/QA 시점 응답 → 평가
       ├─ 전부 AGREE → SYNTHESIS
       ├─ PARTIAL → 수정 후 다음 라운드
       ├─ DISAGREE 2회 교착 → UNRESOLVED 분류
       └─ 3라운드 도달 → SYNTHESIS
  → SYNTHESIS
       ├─ 미결 없음 → DONE (회의록 + impl 문서 생성)
       └─ 미결 있음 → ASK_USER → DONE
```

### 상태 전이표

| 현재 상태 | 조건 | 다음 상태 |
|-----------|------|-----------|
| CONTEXT | 수집 완료 | DRAFT |
| DRAFT | 포인트 작성 완료 | REVIEW_LOOP (라운드 1) |
| REVIEW_LOOP | 전 포인트 AGREE | SYNTHESIS |
| REVIEW_LOOP | PARTIAL/DISAGREE 존재, 라운드 < 3 | REVIEW_LOOP (다음 라운드) |
| REVIEW_LOOP | 같은 포인트 DISAGREE 2회 연속 | 해당 포인트 UNRESOLVED, 나머지 계속 |
| REVIEW_LOOP | 라운드 = 3 | SYNTHESIS |
| SYNTHESIS | 미결 없음 | DONE (회의록 + impl 저장) |
| SYNTHESIS | 미결 있음 | ASK_USER |
| ASK_USER | 사용자 결정 | DONE (결정 반영 후 impl 저장) |

### Output

- 회의록: `docs/automeeting/YYYYMMDD[-HHMM].md` 또는 `docs/design/...-meeting-{date}.md`
- impl 문서(선택): `docs/design/...-impl-{date}.md` — Build 트랙의 입력으로 사용

---

## 3. Review 트랙 (독립 리뷰)

```
/review [범위]
  → SCOUT (변경 범위 파악)
  → 4축 리뷰 (계약 / 회귀 / 보안 / 모바일)
       ├─ Reviewer (구현 일관성, 계약 준수)
       ├─ QA Security (OWASP, validation, secret)
       └─ QA Functional (회귀 위험, mobile UX)
  → VERDICT (approve / request-changes / blocked)
  → DONE
```

- Build 트랙과 달리 코드 수정은 하지 않는다 (제안만)
- 발견 이슈는 follow-up Build 요청으로 사용자가 결정

---

## 4. QA 트랙 (검증/테스트)

```
/qa [범위]
  → SCOUT (변경 범위 + risk-zone 매핑)
  → PA Primary
       ├─ PA-Daily 관련 블록
       ├─ PA-Matrix 영역(A~J)
       └─ PA-Visual (UI 변경 시)
  → Engineering Secondary
       ├─ Q1 Functional (vitest, regression)
       ├─ Q2 Performance (CLAUDE.md 벤치마크)
       ├─ Q3 Security (OWASP, hook block 0)
       └─ Q-Evidence (.bkit/state/last-check.json)
  → VERDICT
       ├─ PA pass + Q pass → DONE
       ├─ PA 1건 fail → 영역 제한 closeout, Report 복귀
       └─ PA 2건+ OR Q3 fail → BLOCK (배포 중단)
```

자세한 PA/Q 기준은 [`qa-gates.md`](./qa-gates.md) 참조.

---

## 5. 트랙 간 연결

```
계획 트랙 (Meeting)            개발 트랙 (Build)
/meeting
     ↓
  impl 문서 생성
     ↓
  사용자 검토/승인
     ↓
  "이거 구현해줘" ──────────→ TRIAGE (impl 문서 = 입력)
                                 ↓
                            SCOUT → CODE → REVIEW → QA → DONE
                                                    ↓
                                              /review (선택, 외부 시각)
                                                    ↓
                                              /qa (closeout 직전)
```

- Meeting 트랙은 `/meeting` 명시 호출
- Build 트랙은 일반 코딩 요청 시 Orchestrator(`work`)가 자동 라우팅
- impl 문서가 두 트랙을 연결하는 인터페이스 (없어도 Build 단독 실행 가능)
- Review/QA 트랙은 Build 완료 후 추가 검증으로 호출 가능

---

## 6. 에이전트 매핑

| 단계 | MidWayDer 에이전트 |
|------|-------------------|
| Orchestrator (라우팅) | `.claude/agents/orchestrator.md` |
| Build 오케스트레이션 | `.claude/agents/build-orchestrator.md` |
| Meeting 오케스트레이션 | `.claude/agents/meeting-orchestrator.md` |
| Review 오케스트레이션 | `.claude/agents/review-orchestrator.md` |
| QA 오케스트레이션 | `.claude/agents/qa-orchestrator.md` |
| Scout (정찰) | `.claude/agents/scout.md` |
| Spec (지시서 작성) | Build/Meeting Orchestrator가 직접 |
| Code (구현) | `developer-backend.md` / `developer-frontend.md` / `developer-algorithm.md` / `developer-integration.md` |
| Planner | `planner-product.md` / `planner-ux.md` |
| Architect | `architect-api.md` |
| Review | `reviewer.md` |
| QA | `qa-functional.md` / `qa-performance.md` / `qa-security.md` |
| Reporter | `reporter.md` (Closeout 보고 작성) |
| Harness Improver | `harness-improver.md` (자기 개선 제안) |

---

## 7. 관련 문서

- [`harness.md`](./harness.md) — 트리아지/계약/Hook 강제 경계
- [`qa-gates.md`](./qa-gates.md) — PA + Q축 통합 판정
- [`pa-daily-smoke.md`](./pa-daily-smoke.md) / [`pa-feature-matrix.md`](./pa-feature-matrix.md) / [`pa-mobile-visual.md`](./pa-mobile-visual.md) — PA 검증 체계
- [`design-system.md`](./design-system.md) — 디자인 토큰 규약
- `docs/harness/decision-framework.md` — Mission/Flow/Contract/Evidence/Complexity 5축 판단
