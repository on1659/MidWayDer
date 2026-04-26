# MidWayDer QA Gates

**판정 주체는 PA (Product Acceptance)**. 엔지니어링 축(Q1/Q2/Q3/Q-Evidence)은 회귀 방지용 증거일 뿐 판정의 1차 기준이 아니다.

## 원칙

1. **PA가 먼저, 엔지니어링이 나중**. PA fail이면 Q들이 다 pass여도 closeout 금지.
2. **실사용 시나리오가 진실**. 유닛 테스트 100% 통과 = 제품 정상이 아님.
3. PA는 **눈으로 보고 손으로 만져서** 확인. "vitest pass"로 대체 금지.
4. 엔지니어링 Q는 **회귀 방지 레이어** — 자동으로 굴러가게 만들고, PA에 집중한다.

## 판정 계층

```
[ PA Primary ]  ← 제품이 실제로 잘 동작하는가
  ├─ Daily Smoke    (매일 30분, 전수 핵심 흐름)
  ├─ Feature Matrix (기능 수정 시 해당 영역 전수)
  └─ Mobile Visual  (겹침/표기/뷰포트 심화 검증)

[ Engineering Secondary ]  ← 회귀/구조/증거가 남았는가
  ├─ Q1 Functional   (vitest, regression)
  ├─ Q2 Performance  (CLAUDE.md 벤치마크)
  ├─ Q3 Security     (OWASP, hook block 0)
  └─ Q-Evidence      (typecheck/test 타임스탬프)
```

---

## PA (Primary) — 실제 제품 동작

### PA-Daily — 매일 전수 검사
**문서**: [`.claude/rules/pa-daily-smoke.md`](./pa-daily-smoke.md)

**PASS 조건**:
- 9개 블록(기본 검색, 카드 상호작용, 모바일/다크모드, 필터/정렬, 개인화, 지도, 에러/엣지, 네비연동, 세션복원) 모두 PASS
- 실패 1건: 해당 영역 closeout 금지 (다른 영역은 진행 가능)
- 실패 2건 이상: 배포 중단

**Golden Route Set** (매일 동일 반복):
- G1: 서울시청 → 강남역 / 다이소
- G2: 홍대입구 → 서울역 / 스타벅스
- G3: 판교역 → 강남역 / 올리브영

### PA-Visual — 겹침 / 표기 / 뷰포트
**문서**: [`.claude/rules/pa-mobile-visual.md`](./pa-mobile-visual.md)

**언제 돌리나**:
- **기능 수정** 시: 해당 컴포넌트 스냅샷 + 수동 겹침 헌팅 §3.2
- **릴리스 전**: 5 뷰포트(XS/S/M/L/Dark-M) 전체 visual diff + 실기기 스위핑
- **UI 대규모 변경 시**: 스냅샷 전체 갱신 + PR에 before/after 첨부

**PASS 조건**:
- Playwright visual diff 해당 시나리오 전부 pass (maxDiffPixelRatio ≤ 0.01)
- 수동 겹침 헌팅 체크리스트(§3.2) 🔴 항목 100% 통과
- 긴 콘텐츠 스트레스(§3.3) 카드 깨짐 없음
- 다크모드 대비 WCAG AA 4.5:1 이상 (축 색상 조합)

### PA-Matrix — 수정 영역 전수 검사
**문서**: [`.claude/rules/pa-feature-matrix.md`](./pa-feature-matrix.md)

**언제 돌리나**: 기능 파일 수정 시 해당 영역(A~J) 섹션만

**영역**:
- A. 경로/주소 입력
- B. Detour 알고리즘 (필수: 점수 공식, 공간 필터, 샘플링)
- C. 검색 API & 캐싱
- D. 결과 카드 UI
- E. 필터 & 정렬
- F. 결과 리스트 기능
- G. 개인화 & 저장
- H. 지도 상호작용
- I. 오프라인 & 에러
- J. 기타 UX (음성/Share/시간)

**PASS 조건**: 해당 영역 🟢 happy path 100% + 🔴 회귀 위험 100% + 🟡 엣지는 가능한 한

---

## Engineering (Secondary) — 회귀/증거 레이어

### Q1 Functional — 유닛/통합 테스트 회귀 없음
- Vitest suite 실패 `0` 건
- 새로 깨진 기존 테스트 `0` 건
- UI 변경 시 snapshot 재검토

### Q2 Performance — 벤치마크 임계치 (CLAUDE.md 근거)
- `/api/search` p95 `< 3s`
- PostGIS `ST_DWithin` `< 200ms`
- Directions 호출 `≤ 50회/검색`
- 결과 렌더링 `< 1s`

### Q3 Security — OWASP/구조
- Hook block 0 (우회 시 근거 명시)
- `safeParse` 또는 `lib/validation` 참조
- error.message/stack 노출 0
- `NEXT_PUBLIC_*` 민감 값 바인딩 0

### Q-Evidence — 증거 자동 추적
- `.bkit/state/last-check.json`: typecheck + test + (UI 시) e2e 현재 SHA 기준 최신
- evidence-gate.sh (Stop hook)가 자동 체크

---

## 변경 → 필수 검사 매핑

| 변경 범위 | PA-Daily | PA-Matrix 영역 | Q1 | Q2 | Q3 | Q-Evidence |
|-----------|:--------:|:---------------|:--:|:--:|:--:|:---------:|
| `src/lib/detour/**` | ✅ Block1 | B | ✅ | ✅ | — | ✅ |
| `src/lib/map-provider/**` | ✅ Block1,6 | H | ✅ | ✅ | — | ✅ |
| `src/app/api/**/route.ts` | ✅ 관련 Block | C + 해당 영역 | ✅ | ✅ | ✅ | ✅ |
| `prisma/schema` / migration | ✅ Block1,7 | B,C,G | ✅ | ✅ | ✅ | ✅ |
| `src/components/search/result-list/**` | ✅ Block2,4 | D,E,F + **Visual §3.2 카드** | ✅ | — | — | ✅ |
| `src/components/search/*` (그 외) | ✅ Block2,6 | 해당 영역 + **Visual 시나리오** | ✅ | — | — | ✅ |
| `src/app/globals.css`, theme.css | ✅ Block3 | **Visual 전체 5 뷰포트** | — | — | — | ✅ |
| `src/lib/cache/**` | ✅ Block9 | C | ✅ | ✅ | — | ✅ |
| `src/locales/**` | — | — | — | — | — | type-check |
| `docs/**` 만 | — | — | — | — | — | — |

---

## QA Verdict 결정 플로우

```
1. 변경 범위 파악 → 위 매핑 표로 필수 검사 결정
2. PA-Matrix 해당 영역 실행 (10~30분)
3. PA-Daily 관련 블록 재실행 (영향 지점 2~3블록)
4. 엔지니어링 Q축은 hook + evidence-gate가 자동 처리
5. 전체 Verdict:
   - PA 전부 pass → closeout 가능
   - PA 1건 fail: 영역 제한 + Report 복귀
   - PA 2건+ fail OR Q3 fail: 배포 중단
6. closeout 본문에 아래 표 포함
```

## Closeout 양식

```markdown
## PA + QA Closeout
### PA (Primary)
| 계층 | Verdict | 증거 |
|------|---------|------|
| PA-Daily | pass | Block 1~9 모두 pass (2026-04-21 09:30 실행) |
| PA-Matrix D,E | pass | 38/38 항목 통과 |

### Engineering (Secondary)
| Q축 | Verdict | 증거 |
|-----|---------|------|
| Q1 | pass | vitest 142/142 |
| Q2 | pass | /api/search p95 2.1s, PostGIS 180ms |
| Q3 | pass | Hook block 0, safeParse 적용 확인 |
| Q-Evidence | pass | typecheck/test SHA fd3c9a1 기준 최신 |

### 전체 Verdict: **PASS** — closeout 가능
```

---

## 관련 문서
- [`pa-daily-smoke.md`](./pa-daily-smoke.md) — 매일 30분 전수 검사
- [`design-system.md`](./design-system.md) — 2026 토큰 기반 디자인 규약 (색/타이포/간격/모션)
- [`pa-feature-matrix.md`](./pa-feature-matrix.md) — 개발 항목별 체크리스트
- [`harness.md`](./harness.md) — Hook 강제 경계 (§10~12)
- `CLAUDE.md` — Q2 벤치마크 원본
