# MidWayDer Playwright MCP 연동안

> 목적: 현재 저장소에 이미 있는 Playwright 자산을 하네스 QA 단계와 연결해, 모바일/데스크톱 UI 회귀를 더 빨리 잡도록 한다.

---

## 현재 저장소 기준 확인 사항

2026-04-13 기준으로 MidWayDer에는 아래가 이미 있다.

- `playwright.config.ts`
- `tests/e2e/**`
- `package.json`의 E2E 명령
- `.qa-config.json`

확인된 현재 프로젝트 설정 포인트:

- 기본 URL: `http://127.0.0.1:3000`
- webServer: `npm run dev`
- 프로젝트:
  - `chromium-desktop`
  - `mobile-chrome`

이미 존재하는 명령:

```bash
npm run test:e2e
npm run test:e2e:smoke
npm run test:e2e:mobile
npm run test:e2e:mobile:ui
npm run test:e2e:mobile:visual
```

즉, MidWayDer는 "브라우저 QA 자산이 없는 상태"가 아니다.
문제는 이것이 아직 **하네스의 정식 QA 단계**로 묶여 있지 않다는 점이다.

---

## 왜 MCP까지 연결해야 하는가

기존 Playwright 명령만으로도 자동 테스트는 된다.
하지만 MCP를 연결하면 QA 단계에서 아래가 가능해진다.

- 브라우저를 직접 열고 흐름 탐색
- 특정 뷰포트에서 추가 스크린샷 확보
- 실패 지점을 눈으로 확인
- `mobile-visual` 스냅샷과 별도로 탐색적 QA 수행

정리하면:

- **기존 Playwright** = 회귀 테스트 자산
- **Playwright MCP** = 하네스 QA의 탐색/증거 수집 도구

둘은 대체재가 아니라 보완재다.

---

## 추천 연결 구조

```text
Q1 /build QA
  ├─ 1차: 명령 기반 자동 테스트
  │   ├─ npm run test:e2e:smoke
  │   ├─ npm run test:e2e:mobile:ui
  │   └─ npm run test:e2e:mobile:visual
  │
  └─ 2차: Playwright MCP 탐색 테스트
      ├─ 특정 뷰포트 이동
      ├─ 화면 캡처
      ├─ 클릭/입력/상태 확인
      └─ QA 보고서 첨부
```

---

## `.claude/mcp.json` 권장안

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

### 브라우저 엔진 권장 설치

```bash
npx playwright install chromium webkit
```

현재 config는 Chromium 중심이지만,
하네스 관점에서는 `webkit`까지 깔아 두는 것이 좋다.
왜냐하면 MidWayDer는 모바일 브라우저 UI가 중요하고, iOS 계열 회귀를 보기 위해 WebKit 관점이 유용하기 때문이다.

---

## 권장 뷰포트 세트

현재 Playwright config에는 `Desktop Chrome`, `Pixel 7`이 있다.
하네스 문서에서는 QA 관점으로 아래 뷰포트를 권장한다.

| 이름 | 해상도 | 목적 |
|------|--------|------|
| `mobile-fold` | 375 x 667 | 최소 모바일 레이아웃 확인 |
| `mobile-main` | Pixel 7 기본 | 현재 설정과 일치 |
| `mobile-large` | 430 x 932 | 큰 모바일에서 카드/패널 밀도 확인 |
| `tablet` | 768 x 1024 | 향후 태블릿 대응 확인 |
| `desktop` | 1440 x 900 이상 | 일반 데스크톱 |

초기 운영에서는 아래만 필수로 본다.

- `mobile-fold`
- `mobile-main`
- `desktop`

---

## MidWayDer에서 Playwright로 가장 먼저 봐야 하는 플로우

### 1. 홈 → 검색 오버레이 → 결과 리스트

핵심 이유:

- 사용자의 1차 진입 플로우
- 모바일에서 가장 깨지기 쉬운 구간

검증 포인트:

- 입력 필드 접근 가능
- 키보드/포커스 시 레이아웃 붕괴 없음
- 결과 진입 후 CTA가 살아 있음

### 2. 결과 카드 + 필터 + 정렬

핵심 이유:

- 점수/배지/카드 높이 회귀가 자주 생길 수 있음

검증 포인트:

- 카드 잘림 없음
- filter chip overflow 없음
- 배지/점수 설명이 fold 아래로 밀리지 않음

### 3. 지도 + 결과 패널 동시 사용

핵심 이유:

- MidWayDer의 차별점은 지도와 경로 맥락에 있음

검증 포인트:

- 패널이 지도를 완전히 가리지 않는가
- 마커와 카드 상호작용이 살아 있는가
- 모바일에서 지도 영역이 너무 작아지지 않는가

### 4. 저장/북마크/공유 흐름

검증 포인트:

- 다이얼로그가 모바일 화면을 벗어나지 않는가
- 버튼 크기가 충분한가
- toast/feedback가 화면 밖으로 밀리지 않는가

### 5. 설정/캐시/오프라인 흐름

검증 포인트:

- 캐시 상태 패널 표시
- 설정 토글 동작
- 오프라인 배너/피드백

---

## QA Stage에 넣을 기본 명령 세트

### UI 변경이 있을 때

```bash
npm run test:e2e:smoke
npm run test:e2e:mobile:ui
```

### 모바일 시각 회귀가 우려될 때

```bash
npm run test:e2e:mobile:visual
```

### 대규모 UI 변경일 때

```bash
npm run test:e2e
```

### 탐색적 재현/확인이 필요할 때

- Playwright MCP로 직접 페이지 이동/클릭/스크린샷

---

## Q1용 기본 MCP 시나리오

### 시나리오 A. 모바일 검색 진입

1. 홈 진입
2. 모바일 뷰포트 설정
3. 출발지/도착지 입력 UI 확인
4. 검색 오버레이 표시 확인
5. 스크린샷 저장

### 시나리오 B. 결과 리스트 가시성

1. 검색 실행 또는 테스트 데이터 상태 진입
2. 결과 카드 노출 확인
3. 필터/정렬 영역 확인
4. fold 위 핵심 정보 확인
5. 스크린샷 저장

### 시나리오 C. 지도/패널 상호작용

1. 결과가 있는 화면 진입
2. 지도와 리스트를 번갈아 조작
3. 패널/지도 가림 여부 확인
4. 스크린샷 저장

### 시나리오 D. 설정/오프라인

1. 설정 페이지 진입
2. 캐시 관련 컴포넌트 표시 확인
3. 배너/토글/상태 텍스트 확인
4. 스크린샷 저장

---

## Playwright MCP와 기존 테스트의 역할 분담

| 수단 | 역할 |
|------|------|
| `npm run test:e2e:smoke` | 기본 생존 확인 |
| `npm run test:e2e:mobile:ui` | 모바일 상호작용 회귀 확인 |
| `npm run test:e2e:mobile:visual` | 모바일 시각 회귀 확인 |
| Playwright MCP | 탐색적 확인, 추가 증거 수집, 실패 지점 육안 검토 |

---

## QA 보고 형식 권장안

```markdown
## 모바일 UI 검증
- 자동 테스트:
  - `npm run test:e2e:mobile:ui` 통과/실패
  - `npm run test:e2e:mobile:visual` 통과/실패

### MCP 탐색 결과
- 뷰포트:
  - 375x667
  - Pixel 7
- 확인 페이지:
  - `/`
  - 검색 결과 화면
  - `/settings`
- 발견 사항:
  - 없음 / 이슈 상세

### 첨부 증거
- 모바일 홈 스크린샷
- 결과 리스트 스크린샷
- 설정 화면 스크린샷
```

---

## 점진 도입 권장안

### 1단계

- 기존 Playwright 명령을 `/build` QA 템플릿에 포함

### 2단계

- `.claude/mcp.json` 추가
- Q1이 필요 시 MCP로 스크린샷 확보

### 3단계

- UI 고위험 변경에서 MCP 탐색을 기본 권장

### 4단계

- 충분히 안정되면 `playwright-required-guard` 검토

---

## 주의점

1. MCP는 기존 테스트를 대체하지 않는다.
2. 스냅샷 실패만으로 무조건 기능 버그라 단정하지 않는다.
3. 외부 지도/API 의존성이 있는 화면은 mock 또는 안정된 시나리오를 우선 고려한다.
4. 초기에는 "필수"보다 "권장 + 증거 첨부"로 시작한다.

---

## 결론

MidWayDer는 이미 Playwright 기반을 갖고 있다.
하네스에서 필요한 것은 새 테스트 러너가 아니라, **기존 자동 테스트와 MCP 탐색을 하나의 QA 증거 체계로 묶는 것**이다.
