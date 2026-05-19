# MidWayDer Harness Rule

모든 코딩 요청에 대해 MidWayDer 하네스 기준을 적용한다.

**관련 문서**
- [`workflow.md`](./workflow.md) — 파이프라인 상태 전이 / 루프 카운터 / 트랙 간 연결
- [`qa-gates.md`](./qa-gates.md) — PA + Q축 통합 판정
- [`design-system.md`](./design-system.md) — 토큰 규약
- [`../meeting-team-profiles.md`](../meeting-team-profiles.md) — `/meeting` 트랙 팀 프로필 (PD/UI/UX/Backend/Frontend/QA)
- 원본 참고: `docs/harness/external/lamdicebot/.claude/` — lamdicebot 하네스 원본 (이더 트리아지 + Codex 병렬 정찰 패턴)

## 1. 모든 요청은 먼저 Orchestrator를 지난다

명시적 command가 없더라도, 일반적인 코딩 요청은 먼저 Orchestrator 관점에서 분류해라.

- 구현/수정 중심이면 `build`
- 설계/검토 중심이면 `meeting`
- 코드 리뷰 중심이면 `review`
- 검증/테스트 중심이면 `qa`

명시적 command가 있으면 route lock으로 간주한다.

## 2. Triage 먼저

요청을 받으면 먼저 `SIMPLE / STANDARD / COMPLEX`로 분류해라.

| 수준 | 기준 |
|------|------|
| SIMPLE | 1~2 파일, 단일 도메인, 계약 영향 없음 |
| STANDARD | 3~5 파일, 한 팀 중심, 검토 필요 |
| COMPLEX | 여러 도메인 결합, 핵심 계약 영향, 또는 강제 COMPLEX 조건 |

### 강제 COMPLEX

- `src/lib/detour/**`
- `src/lib/map-provider/**` 공통 타입/팩토리
- `src/app/api/search/route.ts`
- `prisma/schema.prisma` 또는 migration
- 오프라인/캐시/PWA
- locale 구조
- 모바일 결과 패널 + 지도 상호작용

### 재트리아지 규칙

- **"확인"과 "수정"은 별개 단계다.** 조사 중 수정 필요성이 생기면, 바로 고치지 말고 트리아지부터 다시 수행해라.
- 사용자가 조사만 요청한 경우("확인해봐", "분석해봐"), 수정이 필요하다는 판단이 나오면 보고 후 사용자 승인을 받아라.
- SIMPLE로 시작했어도 진행 중 영향 범위가 3파일+ 또는 강제 COMPLEX 영역에 닿으면 즉시 상향 재판정.
- Scout가 보고한 영향이 최초 트리아지 수준을 넘어서면 SPEC 작성 전에 재판정.
- 자세한 상태 전이는 [`workflow.md`](./workflow.md) §1 재트리아지 전이표 참조.

## 3. Scout 없이 큰 수정 금지

`STANDARD / COMPLEX` 작업은 Scout 정찰 없이 바로 패치하지 마라.

## 4. Direction First

방향이 확정되지 않은 큰 변경은 바로 구현하지 마라.
먼저 `docs/harness/decision-framework.md` 기준으로 아래를 판단해라.

- Mission Fit
- User Flow Fit
- Contract Safety
- Evidence and Measurability
- Complexity vs Value

판정이 애매하면 `meeting`으로 라우팅해라.

## 5. Must-Preserve Contracts

Scout가 아래를 보고하면 절대 깨뜨리지 마라.

- API request / response shape
- provider 공통 인터페이스
- detour 점수 의미
- 주요 store shape
- locale key 체계
- 모바일 핵심 플로우

## 6. Evidence Before Approval

리뷰 종료 전에 가능한 증거를 붙여라.

- `npm run type-check`
- `npm run test`
- 관련 Vitest
- 필요 시 Playwright / mobile E2E

## 7. Start Simple, Then Split

- 같은 파일을 여러 역할이 동시에 편집하지 마라.
- 순차 의존이 강하면 단일 세션 또는 좁은 파이프라인으로 처리해라.
- 소유권이 분리될 때만 멀티 역할을 병렬화해라.

## 8. Implementer와 Reviewer 분리

구현자와 리뷰어는 같은 판단 주체가 아니다.
구현자는 만들고, 리뷰어는 깨지는 지점을 찾고, QA는 증거를 확인한다.

## 9. 신규 기능과 버그 수정 분리

버그 수정은 `Report → Analyze → Fix → Verify` fast-lane를 사용해도 된다.
단, Verify와 계약 확인은 생략하지 마라.

## 10. Hook 강제 경계 (block 규칙)

다음은 PostToolUse hook가 실제로 차단한다. 우회하려면 의도를 명시하고 같은 세션에서 동반 수정해라.

- **트리아지 미선언 (PreToolUse)**: 현재 turn 응답에 `SIMPLE` / `STANDARD` / `COMPLEX` / `트리아지` 중 어느 것도 없으면 Edit/Write 자체가 block. 수정 전 응답 어딘가에 한 줄 선언 필수. 형식 권장: `[트리아지: SIMPLE] 한 줄 사유`. 분류 기준은 §2.

- **detour 회귀**: `src/lib/detour/calculator.ts`에서 `calculateFinalScore` 함수 또는 가중치(`0.7`/`0.3`)가 사라지면 block. `constants.ts`에서 `COST_DISTANCE_WEIGHT / COST_DURATION_WEIGHT / MAX_PROXIMITY_DISTANCE / ROUTE_CUTOFF_RATIO` 누락 시 block.
- **provider 계약 일탈**: `src/lib/map-provider/{kakao,naver}/**/*.ts` 구현 파일이 `../types`를 import하지 않거나 `IDirectionsProvider / ISearchProvider / IGeocodingProvider` 중 어느 것도 참조하지 않으면 block.
- **i18n 키 비대칭**: `src/locales/ko.json`과 `src/locales/en.json` 중 한쪽에만 존재하는 key가 있으면 block. 동시 반영 필수.
- **secret 노출**: `NEXT_PUBLIC_*`에 server-only 값(SECRET/PRIVATE/DATABASE_URL) 바인딩 시 block. 일반 파일에 credential 문자열 포함 시 block.
- **API validation 누락**: `src/app/api/**/route.ts`에서 request body/params를 읽는데 `safeParse / parse / lib/validation` 참조가 없으면 block.
- **Prisma unsafe raw**: `src/app/api/**/route.ts`, `src/lib/db/**`, `prisma/**` 에서 `$queryRawUnsafe` / `$executeRawUnsafe` 사용 시 block. SQL Injection 위험. tagged template 또는 쿼리 빌더 사용.
- **캐시 TTL 회귀**: `src/lib/cache/search-cache.ts`에서 `DEFAULT_TTL` / `LEGACY_TTL` 상수가 사라지면 block. `session-results.ts`에서 `TTL_MS` 누락 시 block.
- **100vh 회귀**: `src/app/globals.css`, `theme.css`, 기타 `src/app/*.css`에서 `100vh` 사용 시 block. iOS Safari 주소창 가림 버그 때문에 `100dvh` (dynamic viewport) 강제.
- **색 하드코딩**: `src/**/*.{ts,tsx,css}` 에서 다음 리터럴 감지 시 block.
  - `#3274[fF]9` (blue accent), `#6366[fF]1` (indigo), `#8[bB]5[cC][fF]6` (violet), `#06[bB]6[dD]4` (teal), `#10[bB]981` (emerald), `#[fF]43[fF]5[eE]` (rose), `#64748[bB]` (slate) — 7개 테마의 `500` hex
  - `rgba\(50,\s*116,\s*249` 등 accent rgb 튜플
  - 예외: `src/app/theme.css` 토큰 선언부, `src/lib/theme-colors.ts` SSR 폴백 상수, `<meta name="theme-color">`, `AppearanceSettings.tsx` 스와치 시각화 리터럴
  - 자세한 원칙: [`design-system.md`](./design-system.md) §1

## 11. Closeout 증거 게이트

Stop hook는 risk-zone(`src/lib/detour/`, `src/lib/map-provider/`, `src/app/api/`, `prisma/schema`, `src/lib/validation/`)에 uncommitted 변경이 있으면 `npm run type-check && npm run test` 실행을 상기시킨다.

**실제 증거 추적**: Bash에서 `npm run type-check`, `npm run test`, `vitest`, `playwright test`가 exit 0으로 끝나면 [`.bkit/state/last-check.json`](../../.bkit/state/last-check.json)에 timestamp가 기록된다. 게이트는 이 타임스탬프와 risk-zone 파일 mtime을 비교해:

- 최신 변경 이후 type-check/test가 모두 통과 → `✅ closeout 가능`
- 하나라도 미실행/오래됨 → `⚠️ 미실행 증거` 목록을 알림

블로킹은 아니지만 증거 없이 closeout 금지.

## 12. Bash deny 목록

`.claude/settings.json`의 `permissions.deny`는 다음을 차단한다: `rm -rf /`, `rm -rf ~`, `sudo rm -rf *`, `git push --force origin main|master`, `git reset --hard origin/main|master`, `git branch -D main|master`, `prisma migrate reset`. 반드시 필요하면 수동 실행 후 기록해라.
