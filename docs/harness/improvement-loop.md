# MidWayDer 하네스 자기개선 루프

> 목적: 하네스가 스스로 문제를 관찰하고 개선안을 제안할 수 있게 하되, 자동으로 규칙을 바꾸는 위험한 구조는 피한다.

---

## 한 줄 원칙

MidWayDer 하네스의 자기개선은 **Observe / Suggest까지만 자동화**하고,
**Apply는 항상 승인 기반**으로 한다.

---

## 왜 자동 적용을 막는가

하네스가 자기 자신을 다루기 시작하면, 잘못된 최적화 방향으로 빠지기 쉽다.

대표 위험:

1. Hook가 불편하다고 guard를 약하게 만들어버림
2. review/qa 단계를 줄이면 속도는 빨라지니 그쪽으로 수렴함
3. 특정 세션의 특수 케이스를 일반 규칙으로 과대 일반화함
4. 문서와 구현이 동시에 어긋나기 시작함

즉, 하네스 자기개선은 가능하지만 **자기수정 권한까지 바로 주면 안 된다.**

---

## 운영 모드

## 1. Observe

### 목적

- 문제를 수집하고 패턴을 정리한다

### 수집 대상

- route 오분류
- review reject 패턴
- qa fail 패턴
- false positive hook
- false negative hook
- 사용자 반복 불편
- docs drift

### 출력 예시

```markdown
## Harness Observation
- Signals:
- Repeated Failures:
- Misroutes:
- Hook Noise:
- Documentation Drift:
- Recommended Next Investigation:
```

### 적용 시점

- 새 하네스 도입 직후
- 실제 세션이 몇 번 쌓인 뒤
- 오탐/불편이 생기기 시작했을 때

---

## 2. Suggest

### 목적

- 문제에 대한 구체적 개선안을 제시한다

### 출력 내용

- 문제 정의
- 근거
- 수정 대상 파일
- 위험
- 패치 개요
- 지금 반영할지 여부

### 출력 예시

```markdown
## Harness Improvement Proposal
- Problem:
- Evidence:
- Proposed Change:
- Target Files:
- Risk:
- Apply Now: yes / no
- Patch Outline:
```

### 적용 시점

- 문제 패턴이 반복될 때
- 한두 줄 조정이 아닌 구조 조정이 필요할 때
- 문서와 `.claude` 상태가 어긋날 때

---

## 3. Apply

### 원칙

자동 모드로 두지 않는다.

### 의미

Suggest 결과를 사람이 보고:

- 지금 반영할지
- 문서만 바꿀지
- `.claude` 파일을 바꿀지
- 보류할지

를 결정한다.

---

## MidWayDer에서 우선 관찰할 신호

### 1. 라우팅 신호

- 구현 요청인데 `meeting`으로 과하게 보냄
- 리뷰 요청인데 `build`로 가버림
- “리뷰하고 필요하면 수정” 같은 혼합 요청을 이상하게 처리

### 2. Hook 신호

- `api-validation-guard` 오탐
- `env-secrets-guard` 과차단
- `i18n-guard` 잡음이 너무 많음
- `mobile-ui-guard`가 너무 약하거나 너무 시끄러움

### 3. QA 신호

- mobile 회귀를 자꾸 놓침
- review에선 통과했는데 qa에서 자주 깨짐
- 증거가 부족한 closeout이 반복됨

### 4. 문서 신호

- `current-status`와 실제 `.claude` 상태 불일치
- route 구조가 바뀌었는데 문서가 따라오지 않음

---

## 개선 우선순위

| 우선순위 | 대상 | 이유 |
|----------|------|------|
| 1 | route 오분류 | 사용자 체감이 가장 큼 |
| 2 | block hook 오탐 | 작업 흐름을 직접 막음 |
| 3 | mobile / QA 누락 | 실제 회귀로 이어짐 |
| 4 | hand-off 품질 | build/review/qa 연결이 흐트러짐 |
| 5 | 문서 drift | 장기 유지보수에 악영향 |

---

## 어떤 파일을 주로 손대게 될까

### 라우팅 문제

- `.claude/agents/orchestrator.md`
- `.claude/commands/work.md`

### 실행 흐름 문제

- `.claude/agents/build-orchestrator.md`
- `.claude/agents/meeting-orchestrator.md`
- `.claude/agents/review-orchestrator.md`
- `.claude/agents/qa-orchestrator.md`

### Guard 문제

- `.claude/hooks/*.sh`
- `.claude/settings.json`

### 문서 문제

- `docs/harness/current-status-2026-04-13.md`
- `docs/harness/README.md`
- `docs/harness/build-pipeline.md`
- `docs/harness/meeting-pipeline.md`

---

## 안전장치

1. 개선 제안은 항상 증거를 포함한다.
2. “속도 향상”을 이유로 review/qa를 제거하는 제안은 기본적으로 거부한다.
3. block hook를 없애거나 약화하는 제안은 별도 검토 대상으로 본다.
4. 문서 변경 없는 `.claude` 구조 변경은 지양한다.

---

## 추천 사용 흐름

### 루틴 점검

```text
/improve-harness
  → Observe
  → 최근 세션 기준 문제 패턴만 요약
```

### 명시적 개선 제안

```text
/improve-harness "Suggest mode: 최근 mobile-ui-guard 오탐 줄이는 안 제안해줘"
```

### 적용 직전

1. Suggest 결과 검토
2. 위험도 확인
3. 승인 후 실제 패치 수행

---

## 결론

MidWayDer 하네스는 스스로를 개선할 수 있어야 하지만,
그 개선은 **자동 수정이 아니라 승인형 개선 루프**로 운영해야 안전하다.
