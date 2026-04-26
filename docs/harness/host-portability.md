# MidWayDer 하네스 Host Portability 전략

> 목적: MidWayDer 하네스를 Claude 전용 구조로 굳히지 않고, Claude-first로 시작하되 Codex 같은 다른 호스트에도 옮길 수 있게 설계 원칙을 정리한다.

---

## 결론부터

현재 MidWayDer 하네스는 **Claude-first**다.
하지만 **Claude-only로 설계할 필요는 없다.**

정확히는:

- 현재 실행 adapter는 Claude
- 핵심 워크플로우와 판단 기준은 host-agnostic
- Codex adapter는 나중에 추가 가능

즉 지금 상태를 이렇게 이해하면 된다.

```text
Core workflow = portable
Current runtime adapter = Claude
Future adapter = Codex
```

---

## 왜 Claude-only로 가면 안 되나

### 1. 워크플로우가 더 중요하다

MidWayDer에서 진짜 중요한 것은:

- 어떻게 라우팅하는가
- 언제 `meeting`으로 돌리는가
- 언제 Scout를 붙이는가
- 무엇을 must-preserve contract로 보는가
- 무엇을 evidence로 인정하는가

이지,

- command 파일이 `.claude/commands`에 있느냐
- hook가 `.claude/settings.json`에 연결되느냐

만이 아니다.

### 2. 호스트는 바뀔 수 있다

Claude Code, Codex, 다른 agent host는 바뀔 수 있다.
하지만 MidWayDer의 핵심 workflow는 매번 새로 만들고 싶지 않다.

### 3. 문서 기반 core가 있어야 개선이 쉽다

host-specific 파일만 있으면 나중에 포팅할 때 다시 설계해야 한다.
반대로 문서 기반 core가 있으면 adapter만 바꾸면 된다.

---

## 무엇이 portable core인가

아래는 특정 호스트와 무관하게 유지해야 하는 핵심이다.

### 방향 판단

- `docs/harness/decision-framework.md`

### 구현 흐름

- `docs/harness/build-pipeline.md`

### 회의/설계 흐름

- `docs/harness/meeting-pipeline.md`

### 역할 구조

- `docs/harness/agent-mapping.md`
- `AGENTS.md`

### guard 기준

- `docs/harness/hooks-spec.md`

### 하네스 개선 루프

- `docs/harness/improvement-loop.md`

즉, 이 문서들이 MidWayDer 하네스의 진짜 코어다.

---

## 무엇이 Claude adapter인가

아래는 현재 Claude에서 동작하도록 붙여둔 adapter다.

- `.claude/commands/*`
- `.claude/agents/*`
- `.claude/rules/*`
- `.claude/hooks/*`
- `.claude/settings.json`
- `.claude/mcp.json`
- `.claude/skills/harness/SKILL.md`

이 파일들은 중요하지만, core 자체는 아니다.
이건 **Claude라는 호스트에서 core를 실행하기 위한 adapter**다.

---

## Codex adapter는 어떻게 붙일까

Codex adapter를 붙일 때는 Claude 구조를 그대로 복붙하지 않는다.

원칙은:

### 1. core 문서를 재사용한다

- `decision-framework`
- `build-pipeline`
- `meeting-pipeline`
- `agent-mapping`

를 source of truth로 둔다.

### 2. repo-local 규칙은 `AGENTS.md`에 요약한다

Codex는 `AGENTS.md`를 매우 잘 활용하므로,
핵심 workflow 규칙은 여기에 요약 반영한다.

### 3. host-specific 파일만 따로 둔다

예:

```text
.codex/
├── config.toml
├── hooks.json
└── hooks/
```

하지만 이건 adapter일 뿐이다.

2026-04-25 기준 MidWayDer에는 위 Codex adapter가 추가됐다.
Codex hook dispatcher는 `.claude/hooks/*.sh`를 호출하므로 guard 로직의 source of truth는 계속 Claude hook 파일이다.

### 4. 공통 검증 명령은 scripts / package.json으로 둔다

예:

- `npm run type-check`
- `npm run test`
- `npm run test:e2e:smoke`
- `npm run test:e2e:mobile:ui`

이런 것들은 host와 무관하게 재사용된다.

---

## 추천 운영 모델

## 모델 A. Claude-only

설명:

- 모든 planning / build / review / qa를 Claude에서 수행

장점:

- 단순함

단점:

- host lock-in
- 나중에 Codex 병행이 어려움

추천도:

- 낮음

## 모델 B. Claude-first, Codex-ready

설명:

- core workflow는 문서로 고정
- 현재 실행 adapter는 Claude
- 나중에 Codex adapter 추가

장점:

- 지금 빠르게 도입 가능
- 미래 확장 가능

단점:

- 문서 discipline이 필요

추천도:

- 가장 높음

## 모델 C. Mixed-host from day one

설명:

- 처음부터 Claude + Codex 동시 지원

장점:

- 이론상 가장 유연

단점:

- 초기에 복잡도가 너무 큼

추천도:

- 지금은 비추천

---

## MidWayDer에 맞는 실제 결론

MidWayDer는 지금:

- `.claude` 구조가 이미 있고
- planning / build / review / qa 흐름도 이미 있으며
- hook / mcp / skill까지 붙어 있다

그래서 가장 맞는 전략은:

**`Claude-first, Codex-ready`**

다.

즉:

1. 지금은 Claude에서 안정화
2. core workflow는 문서로 고정
3. 나중에 `.codex` adapter 추가
4. 운영 경험이 쌓인 뒤 mixed-host 실험

이 순서가 가장 안전하다.

---

## Codex adapter 체크리스트

1. `AGENTS.md`에 routing / direction / evidence 원칙이 요약돼 있는가 — 완료
2. `docs/harness/*`가 source of truth로 최신 상태인가 — 완료
3. shared commands가 host-independent 한가 — `.codex/commands/*`가 Claude command를 mirror
4. hook 로직이 shell/scripts로 분리돼 재사용 가능한가 — `.codex/hooks/codex-hook-dispatch.sh`가 `.claude/hooks/*.sh` 재사용
5. Claude-specific 표현이 core 문서에 섞여 있지 않은가 — 계속 점검

---

## 하지 말아야 할 것

1. `.claude` 구조 자체를 하네스의 본체로 착각하기
2. core 문서 없이 `.codex`만 급하게 추가하기
3. host마다 서로 다른 workflow를 만들기
4. review / qa 기준을 host마다 다르게 두기

---

## 한 줄 원칙

MidWayDer 하네스는
**"Claude에서 시작하지만, Claude에 갇히지 않는다"**
이 원칙으로 운영하는 것이 맞다.
