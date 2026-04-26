# PA Feature Matrix — 개발 항목별 기능 체크리스트

**목적**: 특정 기능을 수정/추가할 때 돌리는 **해당 영역 전수 검사**. 일일 스모크(pa-daily-smoke.md)가 넓고 얕다면, 이건 좁고 깊다.

**사용법**:
1. 수정한 파일 찾기 → 어느 섹션 소속인지 확인
2. 해당 섹션의 체크리스트 전부 돌리기
3. Fail 항목을 closeout에 명시

**범례**:
- 🟢 happy path
- 🟡 엣지 케이스
- 🔴 회귀 위험 (과거 깨진 적 있음)
- ⚙️ 자동화 테스트 존재

---

## 영역 A. 경로/주소 입력

### A1. 출발지/도착지 입력 (AddressInput)
**구현**: [src/components/search/AddressInput.tsx](src/components/search/AddressInput.tsx)
**테스트**: `src/components/search/__tests__/AddressInput.test.tsx`

- [ ] 🟢 텍스트 입력 → Kakao autocomplete 리스트
- [ ] 🟢 자동완성 선택 → input 값 채워짐 + 좌표 저장
- [ ] 🟢 GPS 버튼 (📍) → 현재 위치 "내 위치" 라벨
- [ ] 🟡 GPS 권한 거부 → 안내 메시지 + fallback 텍스트 입력
- [ ] 🟡 네트워크 끊김 → autocomplete 실패 graceful
- [ ] 🔴 동일 주소를 출발/도착 양쪽 입력 → 경고 또는 방지
- [ ] ⚙️ `src/app/api/autocomplete/route.ts` validation 통과

### A2. 현재 위치 → 출발지 원탭
- [ ] 🟢 SearchOverlay 열면 상단 GPS CTA 노출
- [ ] 🟡 권한 거부 상태 → 버튼 비활성화 + 안내

### A3. 다중 경유지 (MultiStopSelector)
**구현**: [src/components/search/MultiStopSelector.tsx](src/components/search/MultiStopSelector.tsx)

- [ ] 🟢 + 버튼으로 경유지 2~3개 추가
- [ ] 🟢 추가 경유지 드래그 순서 변경
- [ ] 🟡 경유지 중 한 곳 좌표 실패 → 해당 구간만 스킵
- [ ] 🔴 경유지 10개 넘으면 경고/제한

---

## 영역 B. Detour 알고리즘

### B1. 점수 계산 (calculateFinalScore)
**구현**: [src/lib/detour/calculator.ts](src/lib/detour/calculator.ts)
**테스트**: ⚙️ `src/lib/detour/__tests__/calculator.test.ts`

- [ ] 🟢 이탈비용 낮을수록 점수 높음
- [ ] 🟢 근접도 높을수록 점수 높음
- [ ] 🔴 이탈비용 70% + 근접도 30% 가중치 유지 (Hook 강제)
- [ ] 🟡 detourCost=0 (경로 위 정확한 매장) → costScore=100 만점
- [ ] 🟡 proximityScore=0 (경로 후반부) → 제외

### B2. 공간 필터링 (spatial-filter)
**구현**: [src/lib/detour/spatial-filter.ts](src/lib/detour/spatial-filter.ts)
**테스트**: ⚙️ `src/lib/detour/__tests__/spatial-filter.test.ts`

- [ ] 🟢 PostGIS ST_DWithin 1km 버퍼 정상 (EXPLAIN ANALYZE index used)
- [ ] 🟢 중복 매장 DEDUP_DISTANCE_M(50m) 내 필터
- [ ] 🟡 DB 결과 MIN_DB_RESULTS(10) 미달 시 Kakao API 보충
- [ ] 🔴 MAX_SPATIAL_RESULTS(100) 초과 금지

### B3. Polyline 샘플링
**구현**: [src/lib/detour/polyline-sampler.ts](src/lib/detour/polyline-sampler.ts)
**테스트**: ⚙️ `src/lib/detour/__tests__/polyline-sampler.test.ts`

- [ ] 🟢 5km 미만 → 200m 간격
- [ ] 🟢 20km 미만 → 500m
- [ ] 🟢 50km 이상 → 2km
- [ ] 🔴 MIN_POLYLINE_CHECK_POINTS(100) 보장

### B4. 근접도 점수
**구현**: [src/lib/detour/proximity-scorer.ts](src/lib/detour/proximity-scorer.ts)
**테스트**: ⚙️ `src/lib/detour/__tests__/proximity-scorer.test.ts`

- [ ] 🟢 경로 중반(30~70%) POSITION_WEIGHT_MID_BONUS(1.05) 적용
- [ ] 🟢 경로 후반(80~95%) PENALTY(0.95)
- [ ] 🟢 ROUTE_CUTOFF_RATIO(0.95) 초과 시 proximityScore=0

---

## 영역 C. 검색 API & 캐싱

### C1. /api/search 엔드포인트
**구현**: [src/app/api/search/route.ts](src/app/api/search/route.ts)
**테스트**: ⚙️ `src/app/api/search/__tests__/route.test.ts`

- [ ] 🟢 POST body validation (Zod) 통과 → 200
- [ ] 🟢 잘못된 body → 400 + 일반화된 메시지
- [ ] 🟢 좌표 범위 벗어남 → 400
- [ ] 🔴 에러 응답에 stack trace 없음 (Hook 강제)
- [ ] 🟡 Directions API 5xx → retry 3회 후 503 반환
- [ ] 🟡 타임아웃 (10s) → 504
- [ ] ⚙️ 성능: p95 <3s (Q2)

### C2. 검색 캐싱
**구현**: [src/lib/cache/search-cache.ts](src/lib/cache/search-cache.ts), [cache-strategy.ts](src/lib/cache/cache-strategy.ts)

- [ ] 🟢 동일 쿼리 1회차 → DB miss → 결과 저장
- [ ] 🟢 동일 쿼리 2회차 → cache hit (SearchStatus `isCached=true`)
- [ ] 🔴 DEFAULT_TTL=7일, LEGACY_TTL=7일 유지 (Hook 강제)
- [ ] 🟡 TTL 경과 → stale 표시 + 백그라운드 갱신

### C3. 세션 결과 복원
**구현**: [src/lib/cache/session-results.ts](src/lib/cache/session-results.ts)

- [ ] 🟢 검색 후 새로고침 → 복원 + 토스트
- [ ] 🔴 TTL_MS=30분 유지
- [ ] 🟡 30분 초과 → 자동 초기화

---

## 영역 D. 결과 카드 UI

### D1. 카드 정보 표시 (ResultCard)
**구현**: [src/components/search/result-list/ResultCard.tsx](src/components/search/result-list/ResultCard.tsx)

- [ ] 🟢 이름/주소/+분/+km 모두 표시
- [ ] 🟢 영업 상태 뱃지 (중/종료/24h)
- [ ] 🟢 카테고리 아이콘
- [ ] 🟡 phone 없는 매장 → 전화 버튼 숨김
- [ ] 🔴 nameFilter 하이라이팅 (yellow mark) 유지

### D2. 컴팩트 카드 토글
- [ ] 🟢 ≡/☰ 토글 → 카드 높이 44px ↔ 190px
- [ ] 🟢 설정 localStorage 기억
- [ ] 🟡 컴팩트 모드에서 확장 아코디언 → 주소/ETA/네비 인라인

### D3. 카드 액션 (CardActions)
**구현**: [src/components/search/result-list/CardActions.tsx](src/components/search/result-list/CardActions.tsx)

- [ ] 🟢 ⭐ 즐겨찾기 토글 + localStorage 저장
- [ ] 🟢 Copy 버튼 → 클립보드 복사 토스트
- [ ] 🟢 ⋯ 오버플로 메뉴 → Phone/Share/Visit/Pin/Memo 펼침
- [ ] 🟡 Memo 편집 인라인 → yellow sticky note 저장
- [ ] 🟡 Pin 고정 → 정렬 상단 고정 + 뱃지

### D4. 카드 뱃지 (CardBadges)
**구현**: [src/components/search/result-list/CardBadges.tsx](src/components/search/result-list/CardBadges.tsx)

- [ ] 🟢 베스트 픽 🥇 (1등)
- [ ] 🟢 도보 가능 🚶 (<0.3km)
- [ ] 🟢 🔥 인기 (최근 1시간 2명 이상 ClickLog)
- [ ] 🟢 📍 가장 가까움 (GPS 기준)
- [ ] 🟡 마감 임박 (30분 이내 closing) amber
- [ ] 🟡 오픈 임박 (30분 이내 open) blue

### D5. 점수 분해 토글 (CardScoreDetail)
**구현**: [src/components/search/result-list/CardScoreDetail.tsx](src/components/search/result-list/CardScoreDetail.tsx)

- [ ] 🟢 📊 버튼 탭 → 이탈비용 70% + 근접도 30% 게이지 바
- [ ] 🟢 베스트픽 배너 탭 → 해당 카드 점수 분해 자동 오픈

---

## 영역 E. 필터 & 정렬

### E1. 필터 칩 (FilterChips)
**구현**: [src/components/search/result-list/FilterChips.tsx](src/components/search/result-list/FilterChips.tsx)

- [ ] 🟢 영업 중만 체크 → 종료 카드 제거
- [ ] 🟢 +N분 이내 (5/10/15) → 이탈 초과 제거
- [ ] 🟢 📏 +Nkm 이내 (1/2km)
- [ ] 🟢 📍 경로 근접 (proximityScore ≥ 70)
- [ ] 🟢 미방문만 보기
- [ ] 🟡 결과 변경 시 필터 자동 리셋
- [ ] 🔴 필터 숫자 미리보기 "(N개)" 정확성

### E2. 정렬 (SortFilter)
**구현**: [src/components/search/SortFilter.tsx](src/components/search/SortFilter.tsx)

- [ ] 🟢 거리순 → km 오름차순 + km 배지 강조
- [ ] 🟢 시간순 → 이탈분 오름차순 + 분 배지 강조
- [ ] 🟢 점수순 → 최종 점수 내림차순 + 점수 버튼 강조
- [ ] 🟢 마감 임박순 → getBusinessStatus 기반 (24h→-1, 영업중→mins, 영업종료→8888)
- [ ] 🔴 localStorage `sort-by` 복원

### E3. 필터 프리셋
- [ ] 🟢 ⚡빠른경유 → 영업중 + 5분이내
- [ ] 🟢 🔥지금당장 → 영업중 + 5분 + 근접 + 1km
- [ ] 🟡 개별 칩 클릭 시 preset 해제

### E4. 활성 필터 요약 바
- [ ] 🟢 필터 활성 시 "N/M개" 요약 표시
- [ ] 🟢 개별 ✕ 해제 + 전체 해제 작동

---

## 영역 F. 결과 리스트 기능

### F1. 결과 카드 스와이프
- [ ] 🟢 좌 80px → 복사
- [ ] 🟢 우 80px → 네비
- [ ] 🔴 짧은 탭(<80px)은 스와이프 무효 (카드 선택 유지)
- [ ] 🟡 첫 카드 스와이프 힌트 애니메이션 (최초 1회, localStorage flag)

### F2. 결과 내 검색
- [ ] 🟢 결과 5개 이상 시 검색 input 표시
- [ ] 🟢 이름/주소에 검색어 포함 카드만 표시
- [ ] 🟢 매치 텍스트 `<mark>` 하이라이팅 (yellow)
- [ ] 🟢 XIcon 초기화

### F3. 더보기 / 접기
- [ ] 🟢 visibleCount=10 시작 → "더 보기 N개"
- [ ] 🟢 접기 버튼 → 10개로 롤백
- [ ] 🔴 maxResults=20 상한

### F4. 헤더 섹션 접기/펼치기
- [ ] 🟢 ▲/▼ 버튼 → 차트/출발시각/프리셋 토글
- [ ] 🟢 localStorage 기억

### F5. 상위 3개 비교 패널 (ComparePanel)
**구현**: [src/components/search/ComparePanel.tsx](src/components/search/ComparePanel.tsx)

- [ ] 🟢 ⚖️ 버튼 → 그리드 펼침
- [ ] 🟢 이름/분/km/점수/영업상태 표시
- [ ] 🟢 선택 시 highlight

---

## 영역 G. 개인화 & 저장

### G1. 즐겨찾기 (FavoritesList)
**구현**: [src/components/search/FavoritesList.tsx](src/components/search/FavoritesList.tsx), `src/lib/place-favorites.ts`

- [ ] 🟢 경로 단위 즐겨찾기 (SaveRouteDialog)
- [ ] 🟢 개별 장소 즐겨찾기 (⭐ 카드 토글)
- [ ] 🟢 SearchOverlay에 가로 스크롤 섹션 표시

### G2. 최근 검색
- [ ] 🟢 중복 제거 + 최근 5개 유지
- [ ] 🟢 ▶ 즉시 실행 버튼 → 바로 검색
- [ ] 🔴 localStorage 스키마 변경 시 마이그레이션

### G3. 방문 인증 + 포인트
**구현**: [src/app/api/verify-visit/route.ts](src/app/api/verify-visit/route.ts), `src/lib/visit-tracking.ts`

- [ ] 🟢 방문 토글 → opacity:0.65 + "✓ 방문" 뱃지
- [ ] 🟢 방문 날짜 상대 표시 (오늘/어제/N일 전)
- [ ] 🟡 GPS 검증 → 매장 100m 이내여야 방문 인정

### G4. 실시간 인기도 뱃지
**구현**: [src/app/api/popularity/route.ts](src/app/api/popularity/route.ts)

- [ ] 🟢 최근 1시간 ClickLog 2명 이상 → "🔥 N명 관심" 뱃지
- [ ] 🔴 같은 세션 연타 1회 취급 (spam 방지)

### G5. RoutineBanner (출퇴근 자동 제안)
**구현**: [src/components/search/RoutineBanner.tsx](src/components/search/RoutineBanner.tsx), `src/lib/routine/detector.ts`

- [ ] 🟢 시간대 + 요일 + 과거 검색 패턴 매칭
- [ ] 🟢 집/회사 인라인 설정 가능
- [ ] 🟡 설정 없으면 배너 숨김

### G6. 네비 앱 마지막 선택 기억
- [ ] 🟢 첫 실행은 시트 → 선택 저장
- [ ] 🟢 2회차부터 바로 실행 + "변경" 버튼

---

## 영역 H. 지도 상호작용

### H1. Kakao/Naver Map Provider
**구현**: [src/lib/map-provider/](src/lib/map-provider/)

- [ ] 🟢 Kakao primary 정상 로드
- [ ] 🟢 Naver fallback switch (환경변수 토글)
- [ ] 🔴 factory.ts의 IDirectionsProvider 계약 준수 (Hook 강제)

### H2. 마커 호버 동기화
- [ ] 🟢 마커 hover → InfoWindow 등장 + 해당 카드 highlight
- [ ] 🟢 카드 탭 → 마커 highlight + 카메라 이동
- [ ] 🟡 호버 300ms 딜레이 후 자동 닫힘
- [ ] 🔴 클릭 팝업은 수동 닫을 때까지 유지

### H3. 지도 영역 재검색
- [ ] 🟢 지도 드래그/줌 → `mapPanned=true` → 재검색 버튼 등장
- [ ] 🟢 재검색 → 결과 갱신 + 버튼 사라짐

### H4. 경로 그리기
- [ ] 🟢 출발→도착 폴리라인 표시
- [ ] 🟢 선택된 경유지 반영 경로 재렌더
- [ ] 🟡 경로 없음 에러 → 안내 메시지

---

## 영역 I. 오프라인 & 에러

### I1. 오프라인 복원
- [ ] 🟢 오프라인 시 세션 캐시 복원 토스트
- [ ] 🔴 복원 루프 없음 (한 번만 표시)

### I2. 로딩 단계 인디케이터
- [ ] 🟢 3단계 (경로 조회 → 매장 탐색 → 정밀 계산)
- [ ] 🟢 3초+ 로딩 시 "⏹ 취소" 버튼

### I3. 결과 0건 상태 (EmptyState)
**구현**: [src/components/search/result-list/EmptyState.tsx](src/components/search/result-list/EmptyState.tsx)

- [ ] 🟢 "🔍 반경 2km 확장" CTA
- [ ] 🟢 인기 카테고리 제안 (/api/stats 기반)
- [ ] 🟡 API 실패 시 기본 카테고리 폴백

### I4. 네트워크 에러 UX
- [ ] 🟢 일반화된 에러 메시지 ("잠시 후 다시 시도해주세요")
- [ ] 🔴 stack trace / 내부 경로 노출 없음

---

## 영역 J. 기타 UX

### J1. 음성 검색
- [ ] 🟢 🎤 버튼 탭 → 녹음 시작
- [ ] 🟢 결과 텍스트 → 검색창 자동 입력
- [ ] 🟡 권한 거부 → 안내

### J2. Web Share
- [ ] 🟢 navigator.share 지원 시 네이티브 시트
- [ ] 🟢 폴백: 클립보드 복사 + 포맷 "📍이름\n🏠주소\n⏱이탈\n🗺URL"

### J3. 시간 관련 UX
- [ ] 🟢 출발 예정 시각 설정 (time input + +30분/+1시간/+2시간)
- [ ] 🟢 체류 시간 5/10/15/20/30분 pill
- [ ] 🟢 ETA 라벨 "경유지 N:MM / 목적지 N:MM 도착 예상 (+N분 체류)"

### J4. 텍스트 내보내기
- [ ] 🟢 📋 버튼 → 전체 결과 "N. 이름 +Xmin +Ykm [영업상태]" 클립보드

### J5. 스크롤 위치 기억 (planned)
- [ ] 🟡 지도↔리스트 전환 시 스크롤 위치 유지

---

## 완료 시 Verdict 기록

섹션별 PASS 개수 / 총 개수를 closeout에 표기:

```markdown
## PA Feature Matrix Verdict
| 영역 | Pass/Total | 주요 Fail |
|------|-----------|-----------|
| B. Detour | 12/13 | B4: late penalty 경계값 |
| E. 필터/정렬 | 11/11 | - |
| ... |
```

## 관련 문서
- `.claude/rules/pa-daily-smoke.md` — Tier 1+2 일일 전수 검사
- `.claude/rules/qa-gates.md` — PA + 엔지니어링 Q축 통합 판정
