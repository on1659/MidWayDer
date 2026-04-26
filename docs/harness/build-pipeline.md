# MidWayDer `/build` 하네스 파이프라인

> 목적: 구현 요청이 들어왔을 때, MidWayDer의 팀 구조와 리스크 특성을 반영해 어떤 순서로 정찰, 설계, 구현, 리뷰, QA를 수행할지 정의한다.

---

## 한 줄 정의

`/build`는 "바로 코드를 치는 명령"이 아니라,
**오케스트레이터가 작업 복잡도를 판정하고 필요한 팀만 깨워서 증거까지 수집한 뒤 닫는 구현 하네스**다.

단, 구현 전에 **방향 자체가 맞는지 확정되지 않았다면 `/meeting`과 [decision-framework.md](decision-framework.md)로 되돌아가야 한다.**

---

## MidWayDer에 맞는 이유

MidWayDer는 아래 영역이 자주 같이 바뀐다.

- `src/app/api/**`
- `src/lib/detour/**`
- `src/lib/map-provider/**`
- `src/components/**`
- `src/store/**`
- `src/locales/**`
- `prisma/**`

그래서 "한 명이 빨리 고친다"보다
"누가 어디까지 보고 들어가야 하는지"를 고정하는 편이 더 안전하다.

---

## 외부 패턴 반영 원칙

이 문서는 아래 외부 패턴을 우선 반영한다.

- Anthropic 공식 멀티에이전트 원칙:
  - 가장 단순한 패턴부터 시작
  - 같은 파일을 여러 역할이 동시에 편집하지 않기
  - 소유권이 분리될 때만 멀티에이전트 확장
- `correctless`:
  - Implementer와 Reviewer를 분리
  - QA는 "통과 확인"이 아니라 "깨뜨리기" 관점도 가져야 함
- `Pimzino` bug workflow:
  - 버그 수정은 `Report → Analyze → Fix → Verify` fast-lane로 다루기
- `claude-code-best-practice`:
  - 상위 흐름을 `Research → Plan → Execute → Review → Ship`으로 정리
  - 실행 단위는 `Command → Agent → Skill` 계층으로 분리

세부 우선순위는 [external-references.md](external-references.md)를 본다.

### `Command → Agent → Skill`을 MidWayDer에 대입하면

`claude-code-best-practice`의 오케스트레이션 문서에서 유용한 점은,
명령과 역할과 지식 묶음을 섞지 않고 층으로 나눈다는 것이다.

MidWayDer에 대입하면 아래처럼 볼 수 있다.

| 계층 | MidWayDer 예시 |
|------|----------------|
| Command | `/build`, `/meeting`, `/qa`, `/review` |
| Agent | Orchestrator, Scout, P1/P2/P3, D1~D4, Reviewer, Q1~Q3 |
| Skill / Rule | `docs/harness/*`, `CLAUDE.md`, `AGENTS.md`, 향후 `.claude/rules/*` |

이 구분을 지키면 나중에 `.claude`를 실제로 구현할 때도 구조가 덜 꼬인다.

---

## 전체 흐름

```text
사용자 요청
  ↓
Stage 0. Orchestrator Intake
  ↓
Stage 1. Triage (SIMPLE / STANDARD / COMPLEX)
  ├─ SIMPLE   → 직접 수정 → Reviewer-lite → QA-lite → 종료
  ├─ STANDARD → Scout → 필요한 Planner/Architect → Developer → Reviewer → QA-lite → 종료
  └─ COMPLEX  → Scout → Planner lane → Multi-dev lane → Reviewer → Full QA → 종료
```

실제 상세 흐름은 아래와 같다.

```text
사용자
  ↓
┌───────────────────────────────────────────────────────┐
│ Stage 0. Orchestrator                                 │
│ - 요청을 1문장으로 재정의                              │
│ - 영향 도메인 라벨링                                   │
│ - 성공 기준 초안 작성                                  │
└───────────────────────┬───────────────────────────────┘
                        ↓
┌───────────────────────────────────────────────────────┐
│ Stage 1. Triage                                       │
│ - SIMPLE / STANDARD / COMPLEX 판정                    │
│ - 어떤 역할을 깨울지 결정                              │
└──────────────┬───────────────────────┬────────────────┘
               │                       │
               │ SIMPLE                │ STANDARD/COMPLEX
               │                       │
               ↓                       ↓
     ┌────────────────┐      ┌────────────────────────────┐
     │ Direct Fix     │      │ Stage 2. Scout            │
     │ + Reviewer-lite│      │ - 관련 파일                │
     │ + QA-lite      │      │ - must-preserve contracts │
     └────────────────┘      └──────────────┬────────────┘
                                             ↓
                                 ┌────────────────────────┐
                                 │ Stage 3. Planning Lane │
                                 │ - P1/P2/P3 선택 가동   │
                                 └──────────────┬─────────┘
                                                ↓
                                 ┌────────────────────────┐
                                 │ Stage 4. Dev Lane      │
                                 │ - D1/D2/D3/D4 선택 가동│
                                 └──────────────┬─────────┘
                                                ↓
                                 ┌────────────────────────┐
                                 │ Stage 5. Reviewer      │
                                 │ - 코드/계약/회귀 검토  │
                                 └──────────────┬─────────┘
                                                ↓
                                 ┌────────────────────────┐
                                 │ Stage 6. QA            │
                                 │ - 기능/성능/보안/모바일 │
                                 └──────────────┬─────────┘
                                                ↓
                                 ┌────────────────────────┐
                                 │ Stage 7. Closeout      │
                                 │ - 증거 첨부, 요약      │
                                 └────────────────────────┘
```

---

## Stage 0. Intake

오케스트레이터는 먼저 요청을 아래 형식으로 정리한다.

### 필수 정리 항목

- **요청 요약**: 사용자가 실제로 원하는 변화 1문장
- **변경 종류**:
  - 버그 수정
  - UX 개선
  - 신규 기능
  - 알고리즘 조정
  - API/DB 변경
  - 문서/운영 개선
- **영향 도메인**:
  - API
  - DB
  - Algorithm
  - Map Provider
  - UI
  - State
  - i18n
  - Offline/PWA
  - Security
  - Performance
- **성공 기준 초안**
- **실패하면 안 되는 계약 후보**
- **방향 확정 상태**:
  - 이미 `Go / Conditional Go`인가
  - 아직 방향 판단이 필요한가

### 예시

```markdown
## Intake
- 요청: 검색 결과 카드에 "이탈 적음" 배지를 추가하고 정렬 설명도 보강
- 변경 종류: UX 개선 + 알고리즘 표현 노출
- 영향 도메인: UI, i18n, Algorithm, API
- 성공 기준:
  - 카드에 배지가 표시된다
  - 점수 의미가 기존 정렬과 모순되지 않는다
  - 모바일 카드 높이가 과도하게 늘어나지 않는다
- 잠정 불변조건:
  - 기존 detour 정렬 자체는 바꾸지 않는다
  - `/api/search` 응답 필드 제거 금지
```

---

## Stage 1. Triage

레퍼런스 브랜치의 하네스 철학을 가져오되, MidWayDer에 맞게 기준을 더 세분화한다.

### 분류표

| 수준 | 대표 조건 | 예시 |
|------|-----------|------|
| `SIMPLE` | 1~2파일, 한 도메인, API/DB/알고리즘 계약 영향 없음 | 문구 수정, 단일 테스트 보정, 단일 컴포넌트 스타일 수정 |
| `STANDARD` | 3~5파일, 한 팀 중심, 계약 영향은 작지만 검토 필요 | 검색 카드 UI 개선, 단일 API route 개선, store + component 수정 |
| `COMPLEX` | 3파일 이상이면서 여러 도메인 결합, 또는 핵심 계약 영향 | Detour 로직 변경, provider 전환, Prisma schema 변경, 오프라인/푸시/지도 통합 작업 |

### MidWayDer 전용 강제 `COMPLEX` 조건

아래 중 하나라도 해당하면 무조건 `COMPLEX`로 본다.

- `src/lib/detour/**` 변경
- `src/lib/map-provider/**`에서 공통 타입/팩토리 변경
- `prisma/schema.prisma` 또는 migration 변경
- `src/app/api/search/route.ts` 계약 변경
- 캐시/오프라인/PWA 동작 변경
- locale 키 구조 변경
- 모바일 결과 리스트와 지도 패널 상호작용 변경

### Triage 출력 형식

```markdown
## Triage
- 판정: COMPLEX
- 이유:
  - `src/lib/detour/**` 변경 예정
  - `/api/search` 응답 shape 영향 가능
  - 모바일 카드 레이아웃도 함께 바뀜
- 활성화 역할:
  - Scout
  - P1 / P2 / P3
  - D2 / D3 / D1
  - Reviewer
  - Q1 / Q2 / Q3
```

### 방향이 미확정이면 `/meeting` 우선

아래 중 하나면 바로 구현하지 말고 먼저 `/meeting`으로 보낸다.

- 사용자 가치가 분명하지 않음
- API / detour / provider 의미 변경 여부가 불분명함
- 모바일 UX 이득보다 복잡도 증가가 더 커 보임
- 검증 방법을 설명할 수 없음

---

## Bugfix Fast-Lane

신규 기능이 아니라 **기존 동작의 버그 수정**이라면, `Pimzino`식 버그 플로우를 경량으로 적용한다.

### 흐름

```text
Report
  ↓
Analyze
  ↓
Fix
  ↓
Verify
```

### 언제 쓰나

- 재현 가능한 버그가 있고
- 기능 의미 자체를 갈아엎지는 않으며
- 빠른 복구가 우선일 때

### MidWayDer 예시

- 모바일에서 검색 오버레이가 닫히지 않음
- `/api/autocomplete`가 빈 문자열에서 500 반환
- 저장 경로 다이얼로그가 특정 locale에서 깨짐

### Bugfix Fast-Lane에서도 생략하면 안 되는 것

- Scout 또는 최소 정찰
- must-preserve contracts
- Verify 단계의 테스트 증거

---

## Stage 2. Scout

Scout는 **읽기 전용 정찰 역할**이다.
Scout는 AGENTS.md의 정식 팀원이 아니라 하네스 운영 역할이며, 필요하면 별도 `.claude/agents/scout.md`로 구현한다.

### Scout의 책임

- 수정 대상 파일과 참조 파일 분리
- 기존 구현 패턴 식별
- 타입/상태/API 의존성 추적
- must-preserve contracts 식별
- 영향 범위와 회귀 위험 요약

### MidWayDer에서 반드시 찾아야 하는 것

#### API 작업일 때

- 해당 route가 참조하는 validation 파일
- 응답 타입 정의 위치
- 사용하는 provider/service 계층
- 테스트 파일 유무

#### Detour/알고리즘 작업일 때

- 공식과 점수 가중치 정의 위치
- 관련 상수 파일
- 정렬/필터링이 어디서 소비되는지
- README 또는 설명 문서 연동 여부

#### UI 작업일 때

- 관련 store
- locale key
- 모바일 spec / snapshot
- map overlay와 bottom sheet 충돌 가능성

### Scout 출력 템플릿

```markdown
## 코드베이스 정찰 보고
- 수정 대상 파일:
  - `src/...`: 이유
- 참조 파일:
  - `src/...`: 이유
- 기존 패턴:
  - validation은 `src/lib/validation/**` 경유
  - API route는 `NextResponse.json()` + 명시적 status 사용
- 의존성:
  - A가 바뀌면 B, C 테스트도 봐야 함
- must-preserve contracts:
  - `/api/search` 응답에 `detourDistance`, `detourDuration` 유지
  - `MapProvider` 인터페이스 메서드 시그니처 유지
  - 모바일에서 검색 버튼이 첫 화면 fold 위에 남아야 함
- 예상 영향 범위:
  - 검색 결과 정렬
  - 모바일 카드 스냅샷
  - locale 번역 키
```

---

## Stage 3. Planning Lane

`STANDARD` 이상에서는 Scout 결과를 받아 필요한 Planner 팀을 깨운다.

### 활성화 기준

| 역할 | 언제 깨우는가 | 산출물 |
|------|---------------|--------|
| P1 Product Planner | 사용자 가치/우선순위/완료 기준이 불명확할 때 | Acceptance criteria, scope |
| P2 UX Planner | 상태 전이, 폴백, 모바일 플로우가 엮일 때 | 상태표, 빈 상태, 오류 상태, fallback |
| P3 API Architect | 요청/응답/타입/DB/Provider 계약이 흔들릴 때 | Schema, contract, compatibility note |

### Planning Lane에서 반드시 다뤄야 하는 MidWayDer 주제

- 검색 실패/경로 없음/주소 실패 폴백
- 점수/배지/정렬 설명의 일관성
- 모바일 검색 플로우와 결과 패널 전환
- API quota와 성능 비용
- 기존 북마크/히스토리/캐시와의 상호작용

### Planning Lane 출력 템플릿

```markdown
## Planning Summary
### P1
- 사용자 가치:
- 제외 범위:
- 완료 기준:

### P2
- 상태:
  - idle
  - loading
  - partial-failure
  - no-result
- 모바일 핵심 플로우:
- 폴백:

### P3
- 요청 계약:
- 응답 계약:
- 하위 호환성:
- 테스트 포인트:
```

---

## Stage 4. Dev Lane

구현은 한 명이 다 하는 방식보다 **소유권이 분리된 lane**으로 움직이는 것이 안전하다.

### 역할별 소유권

| 역할 | 소유 영역 |
|------|-----------|
| D1 Backend Developer | `src/app/api/**`, `src/lib/validation/**`, `prisma/**` |
| D2 Algorithm Engineer | `src/lib/detour/**`, 알고리즘 상수/설명 |
| D3 Frontend Developer | `src/app/**`, `src/components/**`, `src/store/**`, `src/locales/**` |
| D4 Integration Developer | `src/lib/map-provider/**`, 외부 API 호출, retry, 에러 변환 |

### 병렬화 기준

- 서로 다른 파일군을 소유하면 병렬 가능
- 아래는 순차 권장
  - `P3 계약 정리` → `D1/D4 구현`
  - `D2 공식 변경` → `D3 UI 노출 방식 반영`
  - `D1 API 응답 변경` → `D3 소비 코드 반영`

### Dev Lane 필수 규칙

1. Scout의 must-preserve contracts를 절대 깨지 않는다.
2. `COMPLEX` 작업은 테스트 계획을 코드와 같이 업데이트한다.
3. user-facing text를 하드코딩하지 않는다.
4. UI 변경은 모바일 영향 메모를 남긴다.
5. Algorithm 변경은 "무엇이 왜 바뀌었는지"를 남긴다.
6. Implementer는 Reviewer를 겸하지 않는다.

### Implementer / Reviewer 분리 원칙

`correctless`에서 차용한 가장 중요한 원칙은,
구현자와 리뷰어를 같은 판단 주체로 취급하지 않는 것이다.

- 구현자:
  - 기능을 만든다
  - 테스트를 붙인다
  - 왜 이렇게 구현했는지 설명한다
- 리뷰어:
  - 구현 의도를 믿지 않고 결과를 본다
  - 계약 파손과 누락된 증거를 찾는다
- QA:
  - "잘 되나?"보다 "어떻게 깨지나?"도 본다

이 원칙 때문에 MidWayDer 하네스는 구현자의 자기승인 종료를 허용하지 않는다.

### Dev Lane 출력 템플릿

```markdown
## 구현 완료
- 수정 파일:
  - `src/...`
- 추가 파일:
  - `docs/...`
- 테스트:
  - `npx vitest run ...`
  - `npm run test:e2e:mobile:ui`
- 변경 요약:
  - 무엇을 바꿨는가
  - 왜 이 방식으로 바꿨는가
- 유지한 계약:
  - ...
- 남은 리스크:
  - ...
```

---

## Stage 5. Reviewer

리뷰어는 "코드 취향"을 말하는 역할이 아니다.
MidWayDer Reviewer의 핵심은 **회귀와 계약 파손을 잡는 것**이다.

### Reviewer가 먼저 보는 것

1. Scout가 지정한 must-preserve contracts가 유지됐는가
2. Planner/P3가 정한 acceptance criteria가 충족됐는가
3. 테스트 증거가 충분한가
4. 모바일/UI/API/성능 리스크가 설명 없이 넘어가지는 않았는가

### Reviewer 체크리스트

#### 공통

- 타입 드리프트 없는가
- import 경로/모듈 경계가 일관적인가
- 죽은 코드/임시 플래그가 남지 않았는가

#### API/DB

- 입력 검증 존재하는가
- 상태 코드와 에러 메시지가 일관적인가
- Prisma/PostGIS 변경이 성능 리스크를 키우지 않는가

#### Algorithm

- 점수 공식 변경 이유가 문서화됐는가
- 경계 조건 테스트가 있는가
- 추천 순서가 의도치 않게 바뀌지 않는가

#### UI/Mobile

- 375px 기준으로 깨지지 않는가
- 지도/결과 패널/오버레이 상호작용이 유지되는가
- locale 누락 없는가

### Reviewer 판정

- `approve`
- `request-changes`

### Reviewer 출력 템플릿

```markdown
## Review
- 판정: request-changes
- 핵심 이슈:
  - `/api/search` 응답 계약에 대한 테스트가 빠짐
  - 모바일 결과 카드 높이 증가로 fold 아래로 밀림
- 유지된 계약:
  - ...
- 추가 확인 요청:
  - ...
```

---

## Stage 6. QA

MidWayDer QA는 하나가 아니라 세 갈래다.

| 역할 | 초점 |
|------|------|
| Q1 Test Engineer | 기능/E2E/회귀 |
| Q2 Performance Tester | 응답시간, 쿼리 비용, 알고리즘 비용 |
| Q3 Security Tester | 입력 검증, 민감정보, 악성 입력, 권한/남용 |

### QA 등급

| 작업 수준 | QA 형태 |
|-----------|---------|
| `SIMPLE` | QA-lite |
| `STANDARD` | Q1 중심 + 필요 시 Q3 |
| `COMPLEX` | Q1 + Q2 + Q3 풀 가동 |

### QA-lite

- 최소 대상 테스트 1개 이상
- lint/type-check
- 관련 unit test 또는 smoke

### Full QA 권장 명령

#### 공통

```bash
npm run lint
npm run type-check
npm run test
```

#### API 중심 변경

```bash
npx vitest run src/app/api
npx vitest run src/lib/validation
```

#### 알고리즘 중심 변경

```bash
npx vitest run src/lib/detour
```

#### Provider 중심 변경

```bash
npx vitest run src/lib/map-provider
```

#### 모바일/UI 중심 변경

```bash
npm run test:e2e:smoke
npm run test:e2e:mobile:ui
npm run test:e2e:mobile:visual
```

### QA 필수 검증 관점

#### Q1

- 해피 패스
- 빈 결과/에러/partial failure
- 회귀 가능성이 높은 기존 시나리오

#### Q2

- 검색 응답시간 추정치
- provider 호출 수 증가 여부
- `detour` 계산 복잡도 악화 여부
- PostGIS 쿼리 변화

#### Q3

- Zod/validation 누락
- 민감정보 노출
- 외부 입력 sanitize
- rate limiting 또는 abuse surface

### QA 출력 템플릿

```markdown
## QA 검증
- 판정: pass / fail

### Q1 기능
- 결과:
- 회귀:

### Q2 성능
- 결과:
- 우려:

### Q3 보안
- 결과:
- 우려:

### 실행 증거
- `npm run type-check`
- `npx vitest run src/lib/detour`
- `npm run test:e2e:mobile:ui`
```

---

## Stage 7. Closeout

오케스트레이터는 마지막에 아래를 한 번에 정리한다.

- 무엇을 바꿨는가
- 왜 그렇게 바꿨는가
- 어떤 계약을 보존했는가
- 어떤 증거를 확인했는가
- 남은 리스크는 무엇인가

### Closeout 출력 형식

```markdown
## Final Closeout
- 판정: 완료
- 변경 요약:
- 유지된 계약:
- 검증:
- 남은 리스크:
- 후속 권장:
```

---

## 루프백 정책

| 구간 | 조건 | 동작 |
|------|------|------|
| Reviewer → Dev | `request-changes` | 구현자에게 수정 요청 후 재리뷰 |
| QA → Dev | `fail` | 테스트 실패 원인 수정 후 재검증 |
| Planner → Orchestrator | 범위 과대 | 스코프 축소 또는 회의 전환 |

최대 3회 이상 루프백이 반복되면, 오케스트레이터는 사용자에게 아래 둘 중 하나를 제안한다.

- 범위 축소
- `/meeting`으로 승격해 재설계

---

## MidWayDer 전용 금지 패턴

아래는 `/build`에서 특히 경계해야 하는 안티패턴이다.

1. Scout 없이 Detour/Provider를 바로 수정
2. `/api/search` 응답 shape를 조용히 바꿈
3. locale 파일 업데이트 없이 컴포넌트에 문구 하드코딩
4. 모바일 결과 패널 변경 후 E2E 증거 없이 종료
5. Prisma/schema 변경 후 migration 또는 성능 메모 없이 종료
6. "테스트는 나중에"를 이유로 핵심 회귀를 무증거 상태로 둠

---

## 결론

MidWayDer의 `/build` 하네스는 "모든 일을 느리게 만드는 절차"가 아니라,
**복잡한 변경일수록 먼저 보고, 나눠서 만들고, 증거로 닫게 만드는 구조**다.
