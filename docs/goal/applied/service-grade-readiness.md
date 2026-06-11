# Goal: 현재 작업 트리가 ship-ready 검증 게이트를 전부 통과하는 service-grade 상태에 도달한다

> Slug: `service-grade-readiness`
> Created: 2026-06-11
> Route 후보: qa (게이트 실패 시 build로 전환하는 qa→build→qa 루프)

---

## Goal Contract

- **Goal:** 미커밋 모바일 UX 변경(14파일, +767/-45)을 포함한 현재 작업 트리가 `docs/release/ship-ready-spec-2026-05-06.md`의 Verification Gates를 전부 통과해, 사람이 커밋/배포 판단만 하면 되는 service-grade 상태가 된다.
- **Source:** 사용자 요청 `/goal docs/goal/service-grade-readiness.md` + `docs/release/ship-ready-spec-2026-05-06.md`
- **Route:** qa (검증) — 게이트 실패 발견 시 해당 실패만 bounded build slice로 수정 후 재검증
- **Acceptance Criteria:** (2026-06-11 달성)
  - [x] `npm run type-check` 통과 (exit 0)
  - [x] `npm run lint` 통과 (exit 0, 에러 0 — 시작 시점 7에러)
  - [x] `npm test` (vitest) 전체 통과 (788/788, 93파일 — 시작 시점 1실패)
  - [x] `npm run build` 성공 (exit 0)
  - [x] mobile-ui E2E 13/13 통과 (시작 시점 1실패 — 재검색 캐시 no-op 버그 수정)
  - [x] mobile-visual E2E 6/6 통과 — 스냅샷 4장 갱신. 사유: 커밋 5fd5c78 이후 미커밋 모바일 UX 개편(검색 진입부/카테고리 행/시트 헤더 재설계)의 의도된 시각 변경. before는 git HEAD 스냅샷으로 대조 가능.
  - [x] offline E2E 4/4 통과
  - [x] release-readiness E2E 8/8 통과
  - [x] `npm run test:prod` 미실행 — 사유: 배포된 Railway prod 대상 스모크라 이번 미배포 작업 트리의 검증 수단이 아니며, 실행 시 라이브 Kakao API 쿼터를 소비. 배포 직후 실행 권장.
- **Must-Preserve Contracts:**
  - Detour 점수 의미/정렬 (이탈비용 70% + 근접도 30%)
  - `map-provider` 추상화 (IDirectionsProvider/ISearchProvider/IGeocodingProvider)
  - API request/response shape + Zod validation
  - 모바일 지도 ↔ 결과 패널 플로우 (MobileHomeShell/SearchOverlay/MapContainer 미커밋 변경 보존)
  - 캐시 TTL 상수 (DEFAULT_TTL/LEGACY_TTL/TTL_MS)
  - locale 키 ko/en 대칭
- **Evidence Plan:**
  - 각 게이트 명령의 exit code + 실패 시 로그 발췌
  - `.bkit/state/last-check.json` 타임스탬프 갱신
  - 수정 발생 시 해당 영역 PA Feature Matrix 항목 명시
- **Stop Conditions:**
  - 사용자 승인 필요한 파괴적 작업 (스냅샷 대량 삭제, 의존성 메이저 업그레이드 등)
  - 요구사항 충돌 / secret 노출 가능성
  - 같은 게이트 실패 3회 반복
  - acceptance criteria 검증 불가 (예: Playwright 브라우저 미설치로 설치 승인 필요)
- **Human Review Handoff:** 모든 게이트 green 도달 시 **커밋하지 않고 멈춘다**. 사람이 검토할 것: (1) 미커밋 변경 diff 전체, (2) 스냅샷 갱신분 before/after, (3) 커밋/배포 여부.

---

## Scope

### In Scope
- 검증 게이트 실행 및 실패의 **원인 수정** (기존 의도 보존 범위 내)
- 의도된 UI 변경에 따른 Playwright 스냅샷 갱신 (사유 기록 시)
- 테스트 자체의 버그 수정 (구현이 옳고 테스트가 낡은 경우)

### Out of Scope
- 새 기능 추가
- ship-ready spec의 Core UX/A11y/PWA 항목 신규 구현 (게이트 통과에 필요한 경우 제외)
- 네이티브 스토어 제출 준비
- 커밋/푸시/배포 (Human Review 이후 사용자가 결정)

---

## 정찰 노트 (읽기 전용 조사 결과)

- 검증 게이트 원본: `docs/release/ship-ready-spec-2026-05-06.md` §Verification Gates
- 현재 미커밋: 14 소스 파일 (+767/-45) — MobileHomeShell, MapContainer, SearchOverlay, useMapState, naver-maps.d.ts, mobile-ui.spec.ts 등 모바일 UX 작업
- playwright projects: `chromium-desktop`, `mobile-chrome` (Pixel 7)
- e2e 스펙 13개 존재, 게이트 대상은 mobile-ui / mobile-visual / offline / release-readiness
- 영향 범위 추정: COMPLEX (전체 앱 검증 + risk-zone 수정 가능성)
- 알려진 리스크: 미커밋 변경이 검증 없이 쌓여 있음 (`docs/progress/2026-06-11.md` 증거 — 커밋 0, 미커밋 18)

---

## Goal Loop 실행용 프롬프트

> `/goal`이 매 slice마다 self-contained 프롬프트로 사용한다.

```markdown
Goal Loop로 진행해줘.

Goal:
- 현재 작업 트리가 ship-ready spec(docs/release/ship-ready-spec-2026-05-06.md)의 Verification Gates를 전부 통과하는 service-grade 상태에 도달한다.

Done when:
- type-check / lint / vitest / build 가 모두 exit 0
- mobile-ui, mobile-visual, offline, release-readiness e2e가 mobile-chrome 기준 통과
- test:prod는 실행 가능 여부 판단 후 실행 또는 사유 기록
- 모든 증거가 closeout에 남는다

Constraints:
- MidWayDer의 AGENTS.md와 docs/harness/goal-loop.md를 따른다.
- 한 번에 하나의 bounded slice만 진행한다.
- Must-Preserve: detour 점수 의미, map-provider 추상화, API shape+validation, 모바일 플로우, 캐시 TTL, locale 대칭.
- destructive action은 사용자 승인 없이 수행하지 않는다.
- 게이트 green 도달 시 커밋하지 않고 Human Review로 넘긴다.

Preferred evidence:
- 각 명령 exit code + 실패 로그 발췌, .bkit/state/last-check.json

Stop markers:
- 완료되면 GOAL_LOOP_DONE
- 막히면 GOAL_LOOP_BLOCKED
- 사람 검토로 넘길 준비가 되면 GOAL_LOOP_HUMAN_REVIEW
```
