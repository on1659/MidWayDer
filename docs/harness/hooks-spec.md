# MidWayDer Hook 사양

> 목적: MidWayDer에서 특히 자주 나는 실수를 자동으로 막거나 경고하기 위한 Guard 계층을 설계한다.

---

## 기본 철학

Hook는 "개발자를 귀찮게 하는 경고창"이 아니라,
**운영 품질을 자동으로 보조하는 마지막 안전장치**다.

MidWayDer는 레퍼런스 프로젝트와 달리 다음 리스크가 중요하다.

- API 입력 검증 누락
- 비밀값 노출
- provider contract drift
- detour regression
- Prisma/PostGIS 성능 리스크
- locale 누락
- 모바일 UI 회귀
- offline/cache 일관성 붕괴

따라서 Hook도 이 리스크에 맞춰 설계해야 한다.

---

## 결정 타입

Hook는 아래 세 가지 중 하나를 반환한다.

```json
{"decision":"allow"}
{"decision":"allow","reason":"warn message"}
{"decision":"block","reason":"block message"}
```

### 운영 원칙

- `block`: 지금 당장 막아야 하는 실수만
- `warn`: 사람이 판단하면 되는 영역
- `future`: 문서만 만들고 아직 운영하지 않음

---

## 운영 등급 요약

| Hook | 등급 | 기본 모드 | 이유 |
|------|------|----------|------|
| `env-secrets-guard` | block | 즉시 적용 | API 키 노출은 치명적 |
| `api-validation-guard` | block | 즉시 적용 | API route 입력 검증 누락은 곧 장애/보안 리스크 |
| `provider-contract-guard` | warn | 초기 적용 | map-provider drift는 중요하지만 자동 차단 오탐 가능 |
| `detour-regression-guard` | warn | 초기 적용 | 공식 변경은 중요하지만 문맥 판단이 필요 |
| `prisma-query-guard` | warn | 초기 적용 | 성능/인덱스 영향은 자동 판단이 어려움 |
| `i18n-guard` | warn | 초기 적용 | UI 문자열 변경 시 locale 누락 방지 |
| `mobile-ui-guard` | warn | 초기 적용 | 모바일 회귀를 일찍 띄워줌 |
| `offline-cache-guard` | warn | 초기 적용 | 오프라인 계층은 교차 영향이 큼 |
| `playwright-required-guard` | future | 미적용 | 아직 Playwright 증거를 전면 강제할 단계는 아님 |
| `performance-budget-guard` | future | 미적용 | 측정 기준과 운영 데이터 축적 필요 |
| `meeting-format-guard` | future | 미적용 | `/meeting` 형식이 안정된 뒤 고려 |

---

## Hook 입출력 형식

### 입력 예시

```json
{
  "tool_name": "Write",
  "tool_input": {
    "file_path": "/Users/radar/Work/MidWayDer/src/app/api/search/route.ts",
    "content": "..."
  }
}
```

### 출력 예시

```json
{"decision":"block","reason":"API route 변경이 감지됐지만 요청 검증 코드가 보이지 않습니다."}
```

---

## 1. `env-secrets-guard.sh`

### 목적

하드코딩된 비밀값, 잘못된 `NEXT_PUBLIC_*` 사용, 클라이언트 번들로 새는 민감정보를 막는다.

### 등급

- `block`

### 트리거

- 모든 파일 쓰기 후 검사

### 중점 체크

- `NAVER_*_SECRET`
- 실제 키 형태 문자열
- `NEXT_PUBLIC_` 접두사에 붙으면 안 되는 값
- server-only 값이 client 코드로 이동하는 패턴

### 대표 차단 조건

- `src/app/**`, `src/components/**`, `src/lib/map-provider/naver/client.ts` 등에 비밀값 직접 삽입
- `.env*`가 아닌 일반 파일에 실제 credential 문자열 삽입

### 차단 메시지 예시

```json
{
  "decision":"block",
  "reason":"민감정보 노출 패턴이 감지됐습니다. 비밀값은 .env 계열에서만 읽고, 클라이언트 코드로 전달하지 마세요."
}
```

---

## 2. `api-validation-guard.sh`

### 목적

`src/app/api/**/route.ts` 변경 시 입력 검증과 에러 처리 기본선을 강제한다.

### 등급

- `block`

### 트리거

- `src/app/api/**/route.ts`

### 중점 체크

- Zod 또는 `src/lib/validation/**` 사용
- `safeParse` 또는 동등한 검증 처리
- 실패 시 명시적 4xx 응답

### MidWayDer에서 특히 중요한 이유

현재 API route가 많다.

- `/api/search`
- `/api/directions`
- `/api/autocomplete`
- `/api/routes`
- `/api/bookmarks`
- `/api/reverse-geocode`
- `/api/optimize-route`

여기서 입력 검증이 빠지면, 검색/지도/저장/알림 전부가 흔들린다.

### 권장 검사 규칙

- validation import가 있는가
- body/query parsing 뒤 검증이 있는가
- 검증 실패 시 `400` 또는 적절한 상태코드가 있는가

### 예시 의사 코드

```bash
if file matches src/app/api/**/route.ts; then
  if not contains "zod" and not contains "@/lib/validation"; then
    block
  fi
  if not contains "safeParse" and not contains ".parse("; then
    block
  fi
fi
```

---

## 3. `provider-contract-guard.sh`

### 목적

`src/lib/map-provider/**` 수정 시 공통 인터페이스, factory, 테스트 연계를 놓치지 않도록 경고한다.

### 등급

- `warn`

### 트리거

- `src/lib/map-provider/**`

### 중점 체크

- `src/lib/map-provider/types.ts`
- `src/lib/map-provider/factory.ts`
- `src/lib/map-provider/__tests__/factory.test.ts`
- provider별 테스트

### 경고 조건

- 구현 파일만 바뀌고 공통 타입/팩토리/테스트 언급이 없을 때
- Kakao/Naver 한쪽만 바꾸고 계약 설명이 없을 때

### 경고 메시지 예시

```json
{
  "decision":"allow",
  "reason":"map-provider 변경이 감지됐습니다. 공통 타입(types.ts), factory, 양 provider 테스트 영향까지 확인하세요."
}
```

---

## 4. `detour-regression-guard.sh`

### 목적

Detour 핵심 로직 변경 시 회귀를 문서/테스트 없이 지나가지 않도록 경고한다.

### 등급

- `warn`

### 트리거

- `src/lib/detour/**`

### 중점 체크

- 관련 테스트 존재 여부
- 경계 조건 언급 여부
- 설명 문서 영향

### MidWayDer 특화 포인트

Detour 변경은 단순 코드 수정이 아니라 제품 의미 변화다.
특히 아래는 반드시 같이 봐야 한다.

- 샘플링 간격
- spatial filter 임계값
- proximity score 가중치
- 후반 경로 후보 제외 기준
- 정렬 공식

### 추천 후속 명령

```bash
npx vitest run src/lib/detour
```

---

## 5. `prisma-query-guard.sh`

### 목적

Prisma schema, migration, 공간 쿼리 변경 시 성능과 운영 리스크를 경고한다.

### 등급

- `warn`

### 트리거

- `prisma/**`
- `src/lib/db/**`
- PostGIS/Prisma 쿼리가 있는 API route

### 중점 체크

- migration 동반 여부
- 인덱스/쿼리 영향 메모 여부
- 검색 API와의 연계

### 경고 예시

```json
{
  "decision":"allow",
  "reason":"Prisma/PostGIS 관련 변경입니다. migration, 인덱스 영향, 검색 API 성능 메모를 함께 남기세요."
}
```

---

## 6. `i18n-guard.sh`

### 목적

사용자 노출 문자열 변경 시 `src/locales/ko.json`, `src/locales/en.json` 동기화를 유도한다.

### 등급

- `warn`

### 트리거

- `src/app/**`
- `src/components/**`

### 중점 체크

- 새 문구 하드코딩
- locale key 추가 필요
- 번역 파일 미반영

### MidWayDer 특화 포인트

이 프로젝트는 이미 다국어를 지원한다.
하네스 도입 후에도 "작은 UI 수정이라 locale 업데이트를 건너뛰는" 관행을 막아야 한다.

### 경고 메시지 예시

```json
{
  "decision":"allow",
  "reason":"사용자 노출 문자열 변경이 감지됐습니다. src/locales/ko.json, src/locales/en.json 반영 여부를 확인하세요."
}
```

---

## 7. `mobile-ui-guard.sh`

### 목적

UI/CSS 변경이 모바일 회귀로 이어질 가능성을 조기에 경고한다.

### 등급

- `warn`

### 트리거

- `src/components/**`
- `src/app/**`
- `src/app/globals.css`
- `src/app/theme.css`

### 중점 체크

- 큰 고정 너비
- 작은 터치 타겟
- 모바일 테스트 미언급
- 지도/패널/오버레이 충돌 가능성

### 추천 후속 명령

```bash
npm run test:e2e:mobile:ui
npm run test:e2e:mobile:visual
```

### 경고 메시지 예시

```json
{
  "decision":"allow",
  "reason":"모바일 UI 영향 가능성이 있습니다. 375px 기준 레이아웃과 mobile Playwright 시나리오를 확인하세요."
}
```

---

## 8. `offline-cache-guard.sh`

### 목적

캐시, 서비스워커, 동기화 스토어 변경 시 오프라인 동작 리스크를 경고한다.

### 등급

- `warn`

### 트리거

- `public/sw.js`
- `src/lib/cache/**`
- `src/store/cache-store.ts`
- `src/hooks/useSyncStatus.ts`

### 중점 체크

- TTL 의미 변화
- 캐시 무효화
- sync queue 영향
- offline fallback

### 권장 후속 확인

- 오프라인 관련 E2E 또는 smoke
- stale data 정책 점검

---

## 9. `playwright-required-guard.sh`

### 목적

고위험 UI 변경에서 Playwright 증거를 사실상 요구하는 미래 Guard.

### 등급

- `future`

### 나중에 켤 조건

- 모바일 E2E 운영이 팀에 정착
- 오탐이 적은 파일 패턴 정리 완료
- 스냅샷 업데이트 문화 정착

### 후보 트리거

- 검색 메인 화면
- 결과 카드
- 오버레이/패널
- 설정 화면

---

## 10. `performance-budget-guard.sh`

### 목적

검색/알고리즘/쿼리 비용이 일정 기준을 넘는 변경을 나중에 감지하기 위한 미래 Guard.

### 등급

- `future`

### 왜 지금은 미적용인가

- 아직 표준 benchmark 파이프라인이 확정되지 않았다.
- 로컬 환경 편차가 커 자동 block이 위험하다.

---

## 11. `meeting-format-guard.sh`

### 목적

`/meeting` 산출물이 역할별 필수 항목을 빠뜨리지 않았는지 검사하는 미래 Guard.

### 등급

- `future`

### 선행 조건

- 회의록 템플릿이 실제 운영에서 충분히 안정화될 것

---

## 적용 순서

### 1차 도입

- `env-secrets-guard`
- `api-validation-guard`

### 2차 도입

- `provider-contract-guard`
- `detour-regression-guard`
- `i18n-guard`
- `mobile-ui-guard`
- `prisma-query-guard`
- `offline-cache-guard`

### 3차 도입

- `playwright-required-guard`
- `performance-budget-guard`
- `meeting-format-guard`

---

## Hook와 역할의 연결

| Hook | 연결 역할 |
|------|-----------|
| `env-secrets-guard` | Q3, D1, D4 |
| `api-validation-guard` | P3, D1, Q3 |
| `provider-contract-guard` | P3, D4, Q1 |
| `detour-regression-guard` | P1, D2, Q2 |
| `prisma-query-guard` | P3, D1, Q2 |
| `i18n-guard` | P2, D3, Q1 |
| `mobile-ui-guard` | P2, D3, Q1 |
| `offline-cache-guard` | P2, D3, D4, Q1 |

---

## 핵심 원칙

1. Block는 적게 시작한다.
2. Warn는 구체적인 후속 행동을 알려줘야 한다.
3. Hook는 리뷰를 대체하지 않는다.
4. MidWayDer의 핵심 리스크에 맞는 Guard부터 켠다.

---

## 결론

MidWayDer Hook 체계는 "모든 변경을 자동 판정"하려는 시스템이 아니다.
핵심 사고를 줄이고, 리뷰어와 QA가 정말 중요한 것에 집중하게 해주는 보조 장치다.
