# Mistakes And Lessons

> 목적: MidWayDer 작업 중 반복될 수 있는 실수와 교훈을 구조화해서, 나중에 hook, QA, skill, 문서 개선으로 연결한다.

---

## 기록 형식

```text
## YYYY-MM-DD - 짧은 제목

- Context:
- What happened:
- Impact:
- Root cause:
- Detection:
- Prevention:
- Follow-up:
- Status:
```

## 분류 태그

- `harness`: 하네스 route, agent, hook, closeout 문제
- `symphony`: issue-board orchestration, workspace, handoff 문제
- `hermes`: memory, skill learning, long-running runtime 후보
- `api`: request/response, validation, Prisma/PostGIS
- `detour`: detour score, sampling, proximity, route sorting
- `map`: map-provider, Naver Maps SDK, retry/fallback
- `mobile`: 375px layout, safe-area, map/list interaction
- `qa`: test gap, E2E, visual, performance, security
- `i18n`: locale key, text fallback
- `ops`: CI, deploy, environment, secret handling

---

## 2026-05-05 - Knowledge base did not exist yet

- Context: Harness v3 added Symphony/Hermes concepts, but there was no dedicated place to store mistakes and lessons.
- What happened: Lessons were spread across `docs/progress/*`, `docs/harness/improvement-loop.md`, and hook specs.
- Impact: Repeated mistakes could be remembered by the person in the session but not promoted into durable project knowledge.
- Root cause: Progress reporting and harness improvement existed, but no explicit knowledge layer existed.
- Detection: User asked whether a knowledge store for past mistakes existed.
- Prevention: Added `docs/knowledge/` and a 5-prompt harness health hook.
- Follow-up: Promote repeated entries into hooks, QA checklists, or skills only after review.
- Status: Open for future entries.
