# MidWayDer Knowledge Base

이 폴더는 작업 중 반복해서 겪은 실수, 회귀, 판단 착오, 하네스 개선 포인트를 모으는 곳이다.

`docs/progress/`가 "무엇을 했는가"를 남긴다면, `docs/knowledge/`는 "다음에는 무엇을 조심해야 하는가"를 남긴다.

## 원칙

1. 사실과 추측을 분리한다.
2. 실수한 사람을 기록하지 않는다. 원인과 방지책만 기록한다.
3. 재발 가능성이 있는 것만 남긴다.
4. 하네스, hook, QA, skill 후보로 바꿀 수 있으면 후속 액션을 적는다.
5. 자동 수정은 하지 않는다. 하네스 변경은 `Observe -> Suggest -> Apply` 흐름을 따른다.

## 파일

- `mistakes-and-lessons.md`: 실제 작업 중 나온 실수/교훈/재발 방지책.
- `harness-health-checks.md`: 하네스, Hermes-style runtime, Symphony workflow가 잘 작동하는지 주기적으로 보는 체크리스트.
