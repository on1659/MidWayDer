# PA Daily Smoke — 매일 전수 검사 체크리스트

**목적**: 매일 아침/배포 전 30분 내에 "서비스가 제대로 동작하는가"를 실사용 관점으로 확인.
**주체**: 기획/개발/QA 누구나. 순서대로 따라하기만 하면 됨.
**실패 시**: 해당 블록 섹션의 "Fail 시" 지침대로 → 대응 후 재실행.

---

## 사전 준비 (2분)

**환경**:
- [ ] `npm run dev` 실행 중 (http://localhost:3000)
- [ ] Chrome DevTools 모바일 에뮬: **iPhone 12 Pro (390×844)**
- [ ] 또는 실기기 (권장: iOS Safari + Android Chrome 각 1회/주)
- [ ] DB 연결 확인: `curl localhost:3000/api/health` → `{"db":"ok"}`
- [ ] .env 로드 확인: `KAKAO_REST_API_KEY` 존재

**초기화 (선택)**:
- localStorage / sessionStorage 비우기 → 신규 사용자 흐름 재현

---

## Block 1. 기본 검색 골든 경로 (3분)

**Golden Route Set** — 매일 동일하게 돌려야 회귀 감지 가능:

| # | 출발 → 도착 | 카테고리 | 성격 |
|---|-------------|---------|------|
| G1 | 서울시청 → 강남역 | 다이소 | 도심 중거리 (12km) |
| G2 | 홍대입구 → 서울역 | 스타벅스 | 단거리 밀집 상권 (4km) |
| G3 | 판교역 → 강남역 | 올리브영 | 고속화도로 혼합 (15km) |

**Steps (G1 기준, G2/G3도 동일 반복)**:
1. 검색창에 "서울시청" 입력 → 자동완성 선택
2. 도착지 "강남역" 입력 → 선택
3. 카테고리 "다이소" 선택 → 검색

**PASS 조건**:
- [ ] 3초 이내 결과 10개 로드
- [ ] 1등 결과가 지도 경로선 **근처에** 보임 (육안 확인)
- [ ] 1등 이탈시간 `+N분`이 **2위 이상과 차이 있음** (최소값이어야)
- [ ] 결과 카드마다 주소 / 영업상태 / +분 / +km 표시
- [ ] 콘솔 에러 0건, 네트워크 4xx/5xx 0건

**Fail 시**:
- 3초 초과 → Q2 Performance 별도 측정 → `src/lib/detour/*` 또는 `/api/search/route.ts`
- 1등이 육안으로 이상 → `src/lib/detour/calculator.ts` 점수 공식 확인
- 결과 0건 → `src/lib/detour/spatial-filter.ts` PostGIS 필터 점검

---

## Block 2. 결과 카드 기본 상호작용 (3분)

**Steps (G1 결과 기준)**:
1. 1등 카드 **탭** → 지도 마커 highlight + 카메라 이동 확인
2. 카드 우측 **⭐ 즐겨찾기** 탭 → 채워짐 → 다시 탭 → 빈 별
3. 카드 **스와이프 ← (좌)** → "복사됨" 토스트
4. 카드 **스와이프 → (우)** → 네비 앱 선택 시트
5. **📞 전화** 버튼 (있는 카드) → tel: 링크 인식
6. **간략/자세히** 토글 → 카드 높이 44px ↔ 190px 전환

**PASS 조건**:
- [ ] 탭 → 지도 반응 **500ms 이내**
- [ ] 스와이프 **80px threshold** 넘어야만 액션 발동 (짧은 탭은 무시)
- [ ] 즐겨찾기 새로고침 후에도 유지 (localStorage 확인)

**Fail 시**:
- 동기화 안 됨 → [ResultList.tsx](src/components/search/ResultList.tsx) + [KakaoWaypointMarker.tsx](src/components/map/KakaoWaypointMarker.tsx) hoveredId props
- 스와이프 오작동 → `swipeInfoRef` / `swipeVisual` state 조사

---

## Block 3. 모바일 레이아웃 & 다크모드 (3분, 심화는 pa-mobile-visual.md)

> **이 블록은 빠른 샘플 체크**. 겹침/표기/뷰포트 체계 전수는 [`pa-mobile-visual.md`](./pa-mobile-visual.md) 참조 — 5 뷰포트(XS/S/M/L/Dark-M), 층간 간섭 헌팅, 긴 콘텐츠 스트레스, safe-area, touch target, a11y까지.

**Steps (390×844)**:
1. 초기 화면에서 **검색창 탭** → 키보드 올라옴 가정
2. 결과 로드 상태에서 **아래로 스크롤** → 끝까지 내려가는가
3. **상단 필터 바** sticky — 스크롤해도 고정
4. **하단 Sticky Mini Bar** — 스크롤 내리면 베스트픽 미니바 등장
5. OS 다크모드 **토글** (⌘+Shift+D in Chrome Rendering)
6. 라이트모드 → 다크모드 전환 시 **깨진 색 없음**

**PASS 조건**:
- [ ] 어떤 스크롤 위치에서도 카드 내용 잘림 없음
- [ ] 100dvh 적용 확인 (`position: fixed` 요소가 iOS에서 안 잘림)
- [ ] 다크모드에서도 영업중/종료 색상, 뱃지 가독성 OK
- [ ] 다크 전환 시 **깜빡임/잔상** 없음

**Fail 시**:
- 스크롤 불가 → `overflow: hidden` 오남용 확인 (특히 body/html)
- iOS 가림 → 100vh 회귀 (Hook가 막아야 함, 우회됐다면 긴급)
- 다크 색 깨짐 → [src/app/theme.css](src/app/theme.css) tokens

---

## Block 4. 필터 & 정렬 동작 (3분)

**Steps (G1 결과 유지)**:
1. **🎛** 필터 칩 토글 펼침
2. **영업 중만** 체크 → 영업 종료 카드 사라짐
3. **+5분 이내** 체크 → 이탈시간 큰 카드 사라짐, "M/N개" 요약 바 표시
4. 필터 요약 바 **전체 해제** → 원래 10개 복원
5. **⚡빠른경유 프리셋** 탭 → 영업중+5분 자동 활성화
6. 정렬: **거리순 / 시간순 / 점수순 / 마감임박순** 각각 1회씩
7. 페이지 새로고침 → 마지막 선택 정렬이 **복원**되는가

**PASS 조건**:
- [ ] 각 필터 반응 **200ms 이내**
- [ ] 영업 상태 **현재 시각 기준 정확** (새벽/주말 시나리오 별도 검증)
- [ ] 정렬 기준 뱃지 강조 (km/분/점수)
- [ ] 정렬 기억 localStorage `sort-by`에 저장

**Fail 시**:
- 영업 상태 틀림 → [src/lib/business-hours.ts](src/lib/business-hours.ts)
- 정렬 안 먹음 → [FilterChips.tsx](src/components/search/result-list/FilterChips.tsx)
- 복원 안 됨 → page.tsx mount useEffect

---

## Block 5. 개인화 & 저장 (3분)

**Steps**:
1. G1 실행 후 몇 개 카드 탭 → ClickLog 누적
2. **⭐ 즐겨찾기** 저장 → SearchOverlay 하단에 나타남
3. 검색창 다시 열기 → **최근 검색 5개**, **저장된 장소 가로 스크롤** 보임
4. 최근 검색 **▶ 즉시 실행** 버튼 → 바로 검색됨
5. 저장된 장소 **카드 탭** → 해당 카테고리 자동 선택
6. **🔥 인기** 뱃지 — 최근 1시간 2명 이상 ClickLog 있는 장소에 표시 (조건 없으면 생략)
7. **🔄 카테고리 변경** → 800ms 후 자동 재검색 + 토스트

**PASS 조건**:
- [ ] 최근 검색은 **중복 제거** + **최근 5개**만
- [ ] 즐겨찾기 삭제 시 목록에서 사라짐
- [ ] 인기 뱃지 계산이 rage-spam 막힘 (같은 세션 연타는 1회 취급)

**Fail 시**:
- 복원 오류 → [src/lib/place-favorites.ts](src/lib/place-favorites.ts), [search-history-store.ts](src/store/search-history-store.ts)
- 인기도 이상 → [src/app/api/popularity/route.ts](src/app/api/popularity/route.ts)

---

## Block 6. 지도 상호작용 (3분)

**Steps**:
1. G1 결과에서 **지도 마커 호버 (데스크톱) / 탭 (모바일)** → 미니 팝업
2. 팝업 상태에서 **카드 리스트 자동 스크롤** → 해당 카드 화면 중앙
3. 지도를 **핀치/드래그** → 상단에 "🔄 이 지역 재검색" 버튼 등장
4. 재검색 → 결과 갱신
5. 결과 카드 탭 → 지도 마커 하이라이트 반대 방향도 작동
6. **다중 경유지** MultiStopSelector → 2개 이상 경유지 추가 가능

**PASS 조건**:
- [ ] 호버 팝업 300ms 딜레이 후 자동 닫힘 (짧은 지나감은 무시)
- [ ] 핀 클릭 팝업은 사용자가 닫을 때까지 유지
- [ ] `hoveredWaypointId` 양방향 동기화

**Fail 시**:
- 지도 안 뜸 → Kakao SDK 로드 실패 → 네트워크 / 키 확인
- 마커 위치 이상 → 좌표 lat/lng 순서 역전 체크

---

## Block 7. 에러 & 엣지 케이스 (3분)

**Steps**:
1. **결과 0건 유도**: 매우 외진 경로 (예: 파주 장단면 → 연천) + 희귀 카테고리 → 빈 상태 화면
2. 빈 상태에서 **"🔍 반경 2km로 확장"** CTA 탭 → 재검색
3. **로딩 중 "⏹ 취소"** 버튼 → 진행 중 요청 중단
4. **오프라인** 시뮬레이션 (Network throttle Offline) → 마지막 세션 캐시 복원 토스트 ("🕐 이전 검색 결과를 복원했어요")
5. **네트워크 Slow 3G** → 로딩 단계 3단계 인디케이터 표시
6. **잘못된 주소** ("ㅁㄴㅇㄹ") → autocomplete 빈 결과 안내

**PASS 조건**:
- [ ] 취소 후 재시도 정상 동작
- [ ] 오프라인 복원 메시지 한 번만 표시 (재복원 무한루프 없음)
- [ ] 빈 상태에 **관련 카테고리 제안** 또는 **반경 확장** CTA 중 하나 노출

**Fail 시**:
- 복원 루프 → [src/lib/cache/session-results.ts](src/lib/cache/session-results.ts) TTL_MS 확인
- 취소 안 됨 → search-store `cancelSearch` action

---

## Block 8. 네비 연동 & 공유 (2분)

**Steps**:
1. 결과 카드 **🚀 바로 출발** 또는 스와이프 네비 → 카카오/네이버/티맵 선택 시트
2. 이전에 선택한 앱이 있다면 **자동 실행 + "변경" 버튼** 노출
3. **웹 공유** Share2 버튼 → navigator.share 지원 디바이스는 네이티브 시트, 아니면 클립보드 복사
4. **즐겨찾기 → 이 경로 저장** → 경로 공유 URL 생성

**PASS 조건**:
- [ ] URL 형식: `/?origin=...&destination=...&category=...`
- [ ] 공유 URL 다른 브라우저에서 열면 동일 검색 재현

**Fail 시**:
- deep link 실패 → 각 앱 scheme 확인 (kakaomap://, nmap://, tmap://)

---

## Block 9. 세션 복원 & 뒤로가기 (3분)

**Steps**:
1. G1 검색 완료 상태에서 **새 탭에서 동일 URL 열기** → 쿼리 파라미터로 재현
2. 브라우저 **뒤로가기** → 초기 상태로
3. **앞으로 가기** → 결과 상태 복원
4. **새로고침** (F5) → 세션 캐시 복원 (30분 TTL 내면)
5. 15분 후 새로고침 → 여전히 복원됨
6. 다음 날 새로고침 → TTL 초과로 초기화

**PASS 조건**:
- [ ] 30분 TTL 정확
- [ ] URL 파라미터 Single Source of Truth 역할

**Fail 시**:
- URL 파라미터 파싱 오류 → page.tsx searchParams 처리
- 복원 안 됨 → session-results.ts `loadSessionResults`

---

## 완료 체크 (1분)

- [ ] Block 1~9 모두 PASS
- [ ] 실패 블록 발견 시 **이슈 티켓 생성** (영향 범위, 재현 스텝, 스크린샷)
- [ ] `.bkit/state/pa-smoke-{YYYYMMDD}.json`에 결과 기록 (선택)

**전체 Verdict**:
- 9/9 PASS → `PA Daily = pass`, 배포 가능
- 1건 fail → 해당 기능 영역 close, 나머지 진행 가능 (Q-Evidence 하락)
- 2건 이상 fail → **배포 중단** → Report 단계로 복귀

---

## 관련 문서
- `.claude/rules/qa-gates.md` — PA와 엔지니어링 Q축 통합 판정
- `.claude/rules/pa-feature-matrix.md` — 기능별 상세 체크리스트 (Tier 3)
