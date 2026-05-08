# Naver Map Mobile Route UX Reference - 2026-05-08

## 목적

MidWayDer 모바일 검색/경유지 UX를 네이버지도식 경로 탐색 흐름에 맞추기 위한 관찰 문서다. 이 문서는 구현 전 기준선이며, 색상 복제가 아니라 화면 구조, 상태 전환, 정보 밀도, 조작 흐름을 맞추는 데 사용한다.

## 관찰 출처

사용자가 제공한 네이버지도 iOS 모바일 화면 4장:

1. 검색 홈에서 장소/주소 검색 입력 중인 화면
2. 장소 상세 화면에서 `출발`/`도착` 액션을 제공하는 화면
3. 경로 설정 화면에서 출발지만 입력되고 도착지는 비어 있는 화면
4. 출발지/도착지가 모두 입력된 뒤 대중교통 경로 결과가 열린 화면

## 핵심 결론

네이버지도 모바일 UX는 `검색 → 장소 상세 → 경로 설정 → 경로 결과`가 분리되어 있지만, 상단 입력 카드와 교통수단 탭을 계속 유지해서 사용자가 현재 맥락을 잃지 않게 한다.

MidWayDer도 홈에서 모든 기능을 한 번에 보여주기보다, 다음 4개 상태를 명확히 나눠야 한다.

- `idle`: 검색 전 홈/지도 상태
- `placeSelected`: 장소 상세 또는 최근 장소 선택 상태
- `routeEditing`: 출발지/도착지/경유 목적 입력 상태
- `results`: 경유지 추천 결과 상태

## 1. 검색 홈 화면

### 네이버 동작

- 상단에 둥근 검색 pill 하나가 있다.
- placeholder는 `장소, 버스, 지하철, 주소 검색`처럼 넓은 검색 의도를 담는다.
- 오른쪽에는 음성 검색 아이콘이 있다.
- 검색 pill 아래에 바로가기 row가 있다.
  - 집
  - 회사
  - 저장 장소
- 그 아래에 낮은 높이의 탭/칩 row가 있다.
  - 최근검색
  - 예약
  - 장소
  - 버스
  - 경로
- 최근 검색 리스트는 카드가 아니라 단순 row다.
  - 왼쪽 아이콘
  - 장소명/주소
  - 오른쪽 날짜와 삭제 버튼
- 키보드가 올라온 상태에서도 검색 pill과 최근 리스트의 관계가 유지된다.

### MidWayDer 적용 기준

- 홈 첫 화면은 거대한 설명 카드보다 `지도 위 floating search pill`이 우선이다.
- 최근 검색/저장 장소/추천 카테고리는 큰 카드가 아니라 row 또는 낮은 pill이어야 한다.
- 검색 전 CTA는 너무 무겁게 보이면 안 된다. 사용자가 입력을 시작하기 전까지는 기능을 숨기는 편이 낫다.
- 검색 pill 터치 시 `routeEditing` 오버레이로 진입한다.

## 2. 장소 상세 화면

### 네이버 동작

- 장소를 선택하면 지도 위에 마커가 찍힌다.
- 하단에는 장소 상세 시트가 열린다.
- 장소명, 카테고리, 거리, 지역 정보가 상단에 나온다.
- 주요 액션은 세 개다.
  - 출발
  - 도착
  - 공유
- `도착` 버튼이 가장 강한 파란색 primary action이다.
- 상세 사진/거리뷰는 액션 아래에 배치된다.

### MidWayDer 적용 기준

- 경유지 후보 또는 최근 장소를 선택했을 때 상세 시트는 선택 의사결정만 돕는다.
- 장소 상세에서 필요한 primary action은 `경유지로 선택`, 또는 출발/도착 맥락에 따라 `출발지로 설정`/`도착지로 설정`이다.
- 상세 정보는 액션보다 위계를 낮춰야 한다.
- 장소 상세가 검색/경로 설정 입력을 가리면 안 된다.

## 3. 경로 설정 화면

### 네이버 동작

- 상단에 2줄 route input card가 있다.
- 첫 줄은 출발지, 둘째 줄은 도착지다.
- 출발지는 초록 점, 도착지는 빨간 점으로 표시한다.
- 왼쪽에는 출발/도착 순서를 바꾸는 swap 아이콘이 있다.
- 오른쪽에는 삭제, 현재 위치, 더보기 같은 작은 보조 액션만 둔다.
- 카드 바로 아래에 교통수단 segmented tab이 있다.
  - 대중교통
  - 자동차
  - 도보
  - 자전거
- 선택된 탭은 파란색, 비활성 탭은 연회색이다.
- 도착지가 비어 있으면 최근 장소/즐겨찾기 row가 이어진다.
- 최근 장소 row를 누르면 도착지로 이어 붙일 수 있고, 필요한 경우 하단 스낵바로 `이어서 보기` 액션을 제공한다.

### MidWayDer 적용 기준

- 검색 오버레이 상단은 설명 제목이 아니라 compact route card여야 한다.
- `출발지 입력`, `도착지 입력`, `들를 곳 종류`가 한 화면에 위계 없이 섞이면 안 된다.
- 출발지/도착지 카드 아래에 바로 교통수단 탭을 둔다.
- 경유지 카테고리는 교통수단 탭 아래의 낮은 chip rail로 둔다.
- 최근 검색은 큰 card가 아니라 row list로 둔다.
- 도착지 또는 카테고리 조건이 부족한 동안 하단 CTA는 disabled 상태여야 한다.

## 4. 경로 결과 화면

### 네이버 동작

- 출발지/도착지 카드는 결과 화면에서도 유지된다.
- 선택된 교통수단 탭 안에 전체 예상 시간이 표시된다.
  - 예: 대중교통 `1시간 1분`
- 결과 상단에는 필터 칩이 있다.
  - 전체
  - 버스
  - 지하철
  - 버스+지하철
- 출발 시간과 정렬 조건을 한 줄로 보여준다.
  - 오늘 22:05 출발
  - 최적 경로순, 계단 포함
- 결과 카드는 정보 위계가 명확하다.
  - 총 소요시간
  - 도착/출발 예상 시간
  - 요금
  - 이동 타임라인 바
  - 주요 노선/정류장/잔여 좌석
  - 안내 시작 CTA
- 결과 리스트는 스크롤 가능한 하단 시트처럼 동작한다.

### MidWayDer 적용 기준

- 결과 화면에서도 출발지/도착지 맥락을 유지해야 한다.
- MidWayDer 결과 카드의 1순위 정보는 다음 순서다.
  1. 경유지 이름
  2. 경유 비용/우회 시간
  3. 카테고리/거리/영업 정보
  4. 길찾기 또는 상세 액션
- 지도는 배경 맥락이고, 모바일 조작의 중심은 하단 시트다.
- 결과 시트는 화면 전체를 덮지 말고 지도 맥락을 남긴다.
- 필터/정렬은 결과가 있을 때만 보여준다.

## 5. 상태 전환 모델

```text
idle
  └─ search pill tap
      → routeEditing

routeEditing
  ├─ origin selected
  │   → routeEditing(originFilled)
  ├─ destination selected
  │   → routeEditing(destinationFilled)
  ├─ category selected + origin/destination valid
  │   → canSearch = true
  └─ search CTA or keyboard search
      → resultsLoading

resultsLoading
  ├─ success
  │   → results
  └─ error
      → routeEditing(errorInline)

results
  ├─ result card tap
  │   → placeSelected
  ├─ input edit
  │   → routeEditing
  └─ clear/reset
      → idle

placeSelected
  ├─ choose as waypoint
  │   → results(selectedWaypoint)
  └─ close
      → results
```

## 6. 화면별 컴포넌트 계약

### MobileHomeShell

- 지도 위 search pill만 강하게 보인다.
- 카테고리/최근 검색은 낮은 밀도로 노출한다.
- 검색 전부터 결과 CTA나 복잡한 설명 카드를 노출하지 않는다.

### SearchOverlay

- 최상단은 네이버식 route input card다.
- 두 줄 입력 구조를 유지한다.
- 교통수단 탭은 route card 바로 아래에 붙인다.
- 경유지 종류 chip rail은 그 아래에 둔다.
- CTA는 safe-area bottom에 고정한다.
- 모바일 키보드 `검색` 키와 하단 CTA는 같은 search handler를 호출한다.

### ResultSheet

- 결과 개수와 정렬/필터를 상단에 둔다.
- 카드 정보 밀도는 높이되, 큰 장식 요소는 제거한다.
- 각 카드의 primary action은 작고 명확해야 한다.
- sheet 높이는 기본적으로 지도 맥락을 남기는 범위로 제한한다.

### PlaceDetail

- 결과 선택 후에만 열린다.
- 장소명과 핵심 메타, 선택 CTA 중심이다.
- 사진/부가 정보는 아래쪽에 둔다.

## 7. 네이버식 시각 규칙

- 상단 search pill 높이: 약 48~56px
- route input card 높이: 약 90~110px
- 교통수단 탭 높이: 약 48~52px
- category chip 높이: 약 36~40px
- sticky CTA 높이: 약 48~56px
- 큰 제목보다 입력/결과 상태 자체가 화면 제목 역할을 한다.
- 색상은 흰색 surface, 파란 selected state, 연회색 inactive state, 초록/빨강 origin/destination dot 조합이 기본이다.
- 보조 액션은 텍스트 버튼보다 작은 아이콘 버튼이 자연스럽다.

## 8. MidWayDer 현재 UX와의 갭

- 현재 경로 설정/경유지 찾기/카테고리 선택이 한 화면에 동시에 보이며 상태 구분이 약하다.
- 상단 입력부가 네이버식 route card보다 커 보이고 앱 자체 header처럼 보인다.
- 경유지 종류 chip과 최근 검색 리스트의 위계가 섞여 있다.
- 결과 진입 전 CTA가 화면 하단 native CTA처럼 느껴지지 않는다.
- 결과 화면에서 `지도 맥락 + 하단 시트` 패턴보다 오버레이 요소가 많아 보일 수 있다.
- 사용자 입장에서는 UX가 바뀌었다는 체감이 약하다. 따라서 다음 수정은 색/문구가 아니라 화면 상태 구조를 갈아야 한다.

## 9. 구현 우선순위

1. `SearchOverlay`를 네이버식 route input card + transport tabs + category chips + recent rows 구조로 재정렬한다.
2. `MobileHomeShell`의 검색 진입부를 compact floating search pill 중심으로 줄인다.
3. 최근 검색/추천 카테고리를 큰 카드에서 row/chip 밀도로 낮춘다.
4. `ResultSheet`를 결과 중심 하단 시트로 정리하고 지도 맥락을 남긴다.
5. `PlaceDetail`은 결과 선택 후 의사결정 시트로 축소한다.
6. 모바일 E2E와 screenshot verification으로 375px/iPhone viewport에서 실제 높이와 clipping을 확인한다.

## 10. 완료 판정 기준

다음 조건을 만족해야 `네이버식 모바일 경로 UX 반영`으로 본다.

- 첫 viewport에서 큰 설명 카드가 아니라 search pill이 가장 먼저 보인다.
- route editing 화면에서 출발/도착 2줄 카드가 90~110px 수준으로 보인다.
- 교통수단 탭이 route card 바로 아래에 있고 높이가 48~52px 수준이다.
- 경유지 종류는 낮은 chip rail로 보이며 텍스트가 튀어나오지 않는다.
- 최근 검색은 row list로 보인다.
- 하단 CTA는 safe-area bottom에 붙어 있고 조건 부족 시 disabled다.
- 결과 화면은 하단 시트 중심이며 지도 맥락이 남는다.
- 모바일 키보드 `검색` 키로도 검색이 실행된다.
- 배포 후 iPhone viewport screenshot에서 이전 UX와 명확한 before/after 차이가 보인다.
