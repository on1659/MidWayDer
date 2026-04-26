# MidWayDer 하네스 외부 레퍼런스 우선순위

> 목적: 참고할 만한 외부 리소스를 "좋아 보이는 링크 모음"이 아니라, MidWayDer 하네스에 실제로 어떤 순서로 반영할지 기준으로 정리한다.

---

## 한 줄 결론

지금 MidWayDer에 가장 먼저 반영할 것은:

1. **Anthropic 공식 generator-evaluator / multi-agent 원칙**
2. **`correctless`의 구현자-리뷰어-적대적 QA 분리 철학**
3. **`Pimzino`의 feature/bug 분리 워크플로우**
4. **`shanraisshan/claude-code-best-practice`의 실전 `.claude`/`.codex` 공존 구조**
5. **`awesome-claude-code`는 인덱스 용도**

그리고 MidWayDer v2 설계의 조합 재료로는 아래 세 개를 함께 본다.

- `on1659/LAMDiceBot` `feature/harness-system`
- `obra/superpowers`
- `garrytan/gstack`

`autoresearch`, `Piebald`, `ATDD`는 가치가 있지만 **1차 하네스 구축 후** 보는 편이 맞다.

---

## MidWayDer v2 조합 관점

MidWayDer v2에서는 세 레퍼런스를 이렇게 역할 분담해 본다.

| 리소스 | MidWayDer에서 가져올 핵심 |
|--------|---------------------------|
| `on1659/LAMDiceBot` | repo-local `.claude` 구조, command/agent/rule/hook 분리, project-specific guard |
| `obra/superpowers` | plan/TDD/evidence/worktree 중심 실행 규율 |
| `garrytan/gstack` | planning forcing question, 독립 review/qa 운영감, command 문화 |

이 조합의 자세한 설계는 [midwayder-harness-v2.md](midwayder-harness-v2.md)를 본다.

---

## 우선순위 표

| 순위 | 리소스 | 반영 시점 | MidWayDer에서의 용도 |
|------|--------|----------|----------------------|
| 1 | Anthropic `evaluator_optimizer` cookbook | 지금 | `meeting`의 Skeptic/evaluator 루프 보강 |
| 2 | Anthropic `multi-agent coordination patterns` / `when to use multi-agent systems` | 지금 | 멀티에이전트 남용 방지, 소유권 분리 원칙 |
| 3 | `joshft/correctless` | 지금 | `build`에서 Implementer/Reviewer/Adversarial QA 분리 원칙 강화 |
| 4 | `Pimzino/claude-code-spec-workflow` | 지금 | 신규 기능과 버그 수정 플로우 분기 |
| 5 | `shanraisshan/claude-code-best-practice` | 지금 | 실제 `.claude`/`.codex` 병행 구조와 orchestration/hook 이벤트 참고 |
| 6 | `hesreallyhim/awesome-claude-code` | 지금 | 다음에 필요한 commands/hooks/skills를 찾는 카탈로그 |
| 7 | `gotalab/cc-sdd` | 다음 단계 | 더 엄격한 requirements→design→tasks 확장 |
| 8 | `uditgoenka/autoresearch` | 다음 단계 | 지표 기반 반복 개선 루프 실험 |
| 9 | `Piebald-AI/claude-code-system-prompts` | 다음 단계 | 실제 `.claude/agents/*.md` 품질 점검 |
| 10 | `swingerman/atdd` | 보류 | 장기적으로 acceptance-test-first 문화 검토 |
| 11 | `yibie/awesome-autoresearch` | 보류 | autoresearch 실험 확장 시 탐색 인덱스 |

---

## Tier 1. 지금 바로 반영할 것

## 1. Anthropic `evaluator_optimizer`

### 왜 1순위인가

이미 MidWayDer 문서에는 `meeting`에서 여러 역할이 안건을 검토하는 구조가 있다.
여기에 공식적인 `generator → evaluator` 루프를 덧대면, 현재의 회의 하네스가 더 명확해진다.

### MidWayDer에 어떻게 반영할까

- `meeting-pipeline.md`에 제안 생성 후 Skeptic/Evaluator가 평가하는 루프를 명시
- Orchestrator가 첫 안을 확정하지 않고, 평가 후 수정본을 만드는 구조 강조

### 실제 적용 위치

- `docs/harness/meeting-pipeline.md`
- 필요 시 `docs/harness/build-pipeline.md`

### 기대 효과

- 회의가 단순 의견 나열이 아니라, 제안-비판-수정 루프로 굳어진다
- Skeptic 역할이 "분위기상 한마디"가 아니라 공식 평가 단계가 된다

---

## 2. Anthropic 멀티에이전트 공식 원칙

대상:

- `Multi-agent coordination patterns`
- `When to use multi-agent systems`
- Claude Code `Agent Teams`

### 왜 중요하나

이 리소스들은 "멀티에이전트를 언제 쓰면 좋은가"보다,
**언제 쓰지 말아야 하는가**를 잘 정리해 준다.

MidWayDer에 딱 필요한 경고는 아래다.

- 같은 파일을 여러 에이전트가 동시에 만지지 말 것
- 의존성이 강한 순차 태스크는 단일 세션 또는 좁은 파이프라인으로 갈 것
- 가장 단순한 패턴부터 시작할 것

### MidWayDer에 어떻게 반영할까

- `build-pipeline.md`의 병렬화 기준 보강
- `agent-mapping.md`의 파일 소유권 강조
- `implementation-roadmap.md`의 단계적 도입 원칙 보강

---

## 3. `joshft/correctless`

### 왜 중요하나

우리 설계에서 이미 Reviewer와 QA를 분리해두긴 했지만,
`correctless`는 그 철학을 더 분명하게 밀어준다.

핵심은 이거다.

- 구현자는 구현만 한다
- 리뷰어는 구현자의 자기합리화를 믿지 않는다
- QA는 "잘 되는지"보다 "어떻게 깨지는지"를 본다

### MidWayDer에 어떻게 반영할까

- `build-pipeline.md`에 Implementer/Reviewer/Adversarial QA 분리 원칙 명시
- `agent-mapping.md`에서 Reviewer를 구현자와 분리된 역할로 더 강하게 표현
- `qa-functional` 또는 `qa-security` 설계 시 적대적 검증 관점 반영

### 기대 효과

- "구현자가 자기 코드 리뷰까지 끝냈다" 식의 약한 종료를 줄인다
- QA가 단순 smoke test가 아니라 공격적 검증 역할을 갖게 된다

---

## 4. `Pimzino/claude-code-spec-workflow`

### 왜 `cc-sdd`보다 먼저인가

MidWayDer는 신규 기능도 있지만, 실제로는 버그 수정과 회귀 대응도 많다.
`Pimzino`는 feature spec뿐 아니라 bug workflow를 따로 가진 점이 실용적이다.

### 바로 가져올 수 있는 것

- 신규 기능:
  - Requirements
  - Design
  - Tasks
  - Implementation
- 버그 수정:
  - Report
  - Analyze
  - Fix
  - Verify

### MidWayDer에 어떻게 반영할까

- `build-pipeline.md`에 bugfix fast-lane 추가
- `meeting-pipeline.md`에서 신규 기능과 버그 수정 안건을 다르게 다루는 원칙 추가
- `implementation-roadmap.md`에서 `/meeting`과 `/build` 확장 방향에 포함

---

## 5. `shanraisshan/claude-code-best-practice`

### 왜 지금 넣을 가치가 있나

이 리포지토리는 단순 큐레이션이 아니라, 실제로 `.claude`, `.codex`, `.mcp.json`을 함께 두고
운영 구조를 설명하는 **실전형 베스트 프랙티스 저장소**라는 점이 강점이다.

특히 아래가 MidWayDer에 직접 유용하다.

- README가 `subagents`, `commands`, `skills`, `hooks`, `MCP servers`, `settings`, `memory`를 한 구조로 설명함
- 별도 오케스트레이션 문서에서 `Command → Agent → Skill` 패턴을 예제로 설명함
- `.codex/config.toml`, `.codex/hooks.json`을 통해 Codex 훅 이벤트 구성도 같이 보여줌

### MidWayDer에 어떻게 반영할까

- Claude-first 하네스를 만들되, 나중에 Codex와 공존할 수 있는 디렉토리 구조 참고
- `build`/`meeting` 진입점을 설계할 때 command 중심 오케스트레이션 문서화 참고
- Hook 체계를 설계할 때 Codex 쪽 `SessionStart`, `PreToolUse`, `PostToolUse`, `Stop`, `UserPromptSubmit` 이벤트 구성 참고

### 무엇을 차용하고 무엇을 차용하지 않을까

#### 차용할 것

- `.claude`와 `.codex`를 함께 운영하는 레이아웃 감각
- 오케스트레이션 문서를 별도 예제로 분리하는 방식
- hook 이벤트를 기능별로 분리해 관리하는 방식

#### 차용하지 않을 것

- 저장소 전체 구조를 그대로 복제하는 것
- MidWayDer 고유 리스크를 무시한 일반론적 분류
- 우리 팀 구조(`AGENTS.md`)를 덮어쓰는 식의 조직 재정의

### 근거 포인트

- README는 `subagents`, `commands`, `skills`, `hooks`, `MCP servers`, `settings`, `memory`를 각 기능별 위치와 역할로 설명한다.
- 오케스트레이션 문서는 `Command → Agent → Skill` 패턴을 weather 예제로 설명한다.
- `.codex/config.toml`은 `notify` 엔트리로 hook 스크립트를 연결한다.
- `.codex/hooks.json`은 `SessionStart`, `PreToolUse`, `PostToolUse`, `Stop`, `UserPromptSubmit` 이벤트 훅을 정의한다.

### MidWayDer에서의 정확한 위치

- `implementation-roadmap.md`:
  - 실제 `.claude`를 구현할 때 폴더 구성 참고
- `claude-planned-dot-claude-changes-2026-04-13.md`:
  - `.claude` 골격 구현 후 Codex 공존 구조 참고
- 향후 Codex 병행 운영 시:
  - `.codex/` 별도 디렉토리 설계 참고

---

## 6. `hesreallyhim/awesome-claude-code`

### 왜 6순위인가

이 저장소는 프레임워크가 아니라 **카탈로그**다.
즉, 오늘 당장 설계를 결정해 주기보다, 다음에 필요한 것을 찾는 인덱스에 가깝다.

### MidWayDer에서의 올바른 용도

- commands 예시 찾기
- hooks 예시 찾기
- MCP/skills 후보 탐색
- 다른 팀이 어떻게 구조화했는지 샘플 확인

### 주의

- 그대로 복붙해서 우리 구조로 삼는 용도는 아니다
- 라이선스와 각 리소스의 품질 편차를 직접 봐야 한다

---

## Tier 2. 다음 단계에서 볼 것

## 7. `gotalab/cc-sdd`

### 장점

- requirements → design → tasks를 강하게 밀어준다
- 여러 에이전트 툴을 지원한다

### 왜 지금 1순위는 아닌가

- MidWayDer는 이미 `meeting`과 `build` 문서가 있어서, 먼저 현재 구조를 정착시키는 게 더 중요하다
- 처음부터 너무 엄격하게 가져오면 하네스 도입 장벽이 높아진다

### 언제 보나

- `/meeting`이 실제로 안정된 뒤
- spec 문서를 자동으로 쪼개고 싶을 때

---

## 8. `uditgoenka/autoresearch`

### 왜 매력적인가

MidWayDer는 장기적으로 아래 같은 반복 최적화 주제가 있다.

- Detour 점수 품질
- 검색 결과 만족도
- 테스트 커버리지
- 성능 지표

`autoresearch`는 이걸 "한 번 수정 → 기계적 검증 → 좋아지면 유지" 루프로 만들 수 있다.

### 왜 지금은 보류인가

- 먼저 하네스 기본 구조부터 안정화해야 한다
- 지금 바로 붙이면 운영 복잡도가 갑자기 커진다

### 나중 후보

- `detour` 성능/품질 실험
- coverage 증가 루프
- 검색 결과 ranking 품질 실험

---

## 9. `Piebald-AI/claude-code-system-prompts`

### 왜 유용한가

실제 Claude Code 시스템 프롬프트와 subagent 프롬프트를 비교해볼 수 있다.
우리가 작성할 `.claude/agents/*.md`가 공식 패턴과 너무 동떨어졌는지 점검하기 좋다.

### 왜 지금 1순위는 아닌가

- 아직 MidWayDer에 실제 `.claude/agents/*.md`가 없는 상태다
- 먼저 골격을 만든 뒤 품질 점검용으로 쓰는 게 맞다

---

## Tier 3. 장기 보류

## 10. `swingerman/atdd`

### 가치

- acceptance test first 철학은 강력하다

### 보류 이유

- MidWayDer는 아직 ATDD보다 API validation, E2E, mobile QA 정착이 먼저다

## 11. `yibie/awesome-autoresearch`

### 가치

- autoresearch 계열 탐색 인덱스

### 보류 이유

- 지금은 원본 실험 대상(`autoresearch`)만 봐도 충분하다

---

## 문서별 반영 매핑

| 문서 | 지금 반영할 외부 레퍼런스 |
|------|---------------------------|
| `README.md` | Anthropic 멀티에이전트 원칙, 우선순위 문서 링크 |
| `build-pipeline.md` | `correctless`, Anthropic 멀티에이전트 원칙, `Pimzino` bug flow |
| `meeting-pipeline.md` | `evaluator_optimizer`, `Pimzino` spec/bug 분리 |
| `agent-mapping.md` | `correctless`의 역할 분리 철학 |
| `implementation-roadmap.md` | 위 우선순위 자체를 구현 순서에 반영, `claude-code-best-practice`를 구조 참고로 사용 |
| `claude-planned-dot-claude-changes-2026-04-13.md` | 실제 `.claude` 구현 후 `Piebald`로 점검, 필요 시 `claude-code-best-practice`와 구조 비교 |

---

## 지금 반영하지 않을 것

아래는 "좋은데 아직은 넣지 않는 것"으로 문서에 명시한다.

- autoresearch를 기본 하네스 루프에 넣기
- ATDD를 기본 규칙으로 강제하기
- system prompt 구조를 과도하게 따라 프롬프트를 비대하게 만들기

---

## 최종 권장 순서

1. Anthropic 공식 evaluator / multi-agent 원칙
2. `correctless`
3. `Pimzino`
4. `claude-code-best-practice`
5. `awesome-claude-code`
6. `cc-sdd`
7. `autoresearch`
8. `Piebald`
9. `ATDD`

---

## 참고 링크

- Anthropic `Building effective agents`: [anthropic.com/research/building-effective-agents](https://www.anthropic.com/research/building-effective-agents/)
- Anthropic `Multi-agent coordination patterns`: [claude.com/blog/multi-agent-coordination-patterns](https://claude.com/blog/multi-agent-coordination-patterns)
- Claude Code `Agent Teams`: [code.claude.com/docs/en/agent-teams](https://code.claude.com/docs/en/agent-teams)
- `shanraisshan/claude-code-best-practice`: [github.com/shanraisshan/claude-code-best-practice](https://github.com/shanraisshan/claude-code-best-practice)
- `orchestration-workflow.md`: [github.com/shanraisshan/claude-code-best-practice/blob/main/orchestration-workflow/orchestration-workflow.md](https://github.com/shanraisshan/claude-code-best-practice/blob/main/orchestration-workflow/orchestration-workflow.md)
- `Pimzino/claude-code-spec-workflow`: [github.com/Pimzino/claude-code-spec-workflow](https://github.com/Pimzino/claude-code-spec-workflow)
- `gotalab/cc-sdd`: [github.com/gotalab/cc-sdd](https://github.com/gotalab/cc-sdd)
- `hesreallyhim/awesome-claude-code`: [github.com/hesreallyhim/awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code)
- `uditgoenka/autoresearch`: [udit.co/projects/autoresearch](https://udit.co/projects/autoresearch)
- `Piebald-AI/claude-code-system-prompts`: [github.com/Piebald-AI/claude-code-system-prompts](https://github.com/Piebald-AI/claude-code-system-prompts)

### 참고 메모

`correctless`와 Anthropic cookbook `evaluator_optimizer`는 사용자 조사 메모를 우선 근거로 반영했다.
`claude-code-best-practice` 평가는 저장소 README, 오케스트레이션 문서, `.codex/config.toml`, `.codex/hooks.json`을 확인해 반영했다.
이번 정리는 "구조적 참고 가치" 기준이지, 각 프로젝트를 설치/실행해서 적합성을 검증한 문서는 아니다.
