# Harness Health Checks

> 목적: 하네스, Hermes-style runtime 후보, Symphony workflow가 실제 작업 중 계속 유효한지 주기적으로 확인한다.

---

## 5-Prompt Check

`UserPromptSubmit` 기준 5회마다 hook이 아래 항목을 상기시킨다.

### Harness

- 현재 요청이 `meeting`, `build`, `review`, `qa`, `improve-harness` 중 어디에 속하는가?
- `AGENTS.md` 역할과 실제 처리 방식이 맞는가?
- Scout, review, QA가 필요한 규모인데 생략하지 않았는가?
- must-preserve contract를 확인했는가?

### Symphony

- 작업이 이슈/티켓 단위로 설명 가능한가?
- `WORKFLOW.md` 기준 closeout을 남길 수 있는가?
- 여러 작업이 섞여 있다면 child issue로 쪼개야 하는가?
- 자동화 결과를 `Done`이 아니라 `Human Review`로 넘겨야 하는가?

### Hermes-style Memory / Skills

- 이번 작업에서 반복될 만한 실수나 교훈이 있었는가?
- `docs/knowledge/mistakes-and-lessons.md`에 남길 만한가?
- 반복 체크리스트로 만들 가치가 있는가?
- 하네스 self-improvement는 `Observe -> Suggest -> Apply`를 지켰는가?

## 상태 파일

카운터는 커밋하지 않는 runtime state로 둔다.

```text
.symphony/logs/harness-health-counter
```

## 수동 점검 명령

```bash
bash .claude/hooks/harness-health-check.sh UserPromptSubmit
```

5회째가 아니면 `allow`만 반환한다.
