# 경유지 검색 알고리즘 문서

이 문서는 MidWayDer의 `/api/search` 경유지 검색 알고리즘을 설명합니다.

## 개요
- 목적: 출발지 A → 도착지 B 경로를 유지한 채, 경로 근처에서 최적의 경유지 C를 추천
- 핵심 원칙: **원본 경로는 고정**, 경유지의 “이탈 → 복귀” 비용만 계산
- API 호출 최소화: 원본 경로 조회 1회(최단/최단시간 병렬) + 필요 시 카카오 장소 검색

## 전체 플로우
1. 요청 파싱 & Zod 검증
2. 주소 → 좌표 변환(필요 시)
3. A→B 원본 경로 조회(최단거리 + 최단시간 병렬)
4. 후보군 1차 공간 필터링(PostGIS + 캐시)
5. 후보군 2차 근접도 필터링(경로 샘플링 기반)
6. Detour Cost 계산(직선거리 기반)
7. 최종 점수 계산 & 상위 결과 반환
8. 최단/최단시간 결과 병합 + 중복 제거

---

## 1) 입력 검증 (Zod)
- `searchRequestSchema`로 body를 검증
- 실패 시 `VALIDATION_ERROR` 반환

## 2) 주소 → 좌표 변환
- 요청에 좌표가 없으면 지오코딩 수행
- 실패 시 `INVALID_COORDINATES` 반환

## 3) 원본 경로 조회
- `directionsProvider.getRoute()`를 병렬로 2회 호출
  - `shortest` (최단거리)
  - `fastest` (최단시간)
- 둘 다 실패하면 `NO_ROUTE_FOUND` 반환

## 4) 후보군 1차 필터링 (Spatial Filter)
`filterPlacesByRoute(route, category, bufferDistance)`

### Phase 1: DB 조회 (PostGIS + Haversine)
- 경로의 바운딩 박스 + bufferDistance로 DB 후보 필터
- 각 후보에 대해 경로 polyline과의 최소 거리 계산
- 조건 만족하는 후보를 MAX 100개까지 수집

### Phase 2: Kakao Local Search 보충
- DB 결과가 `MIN_DB_RESULTS(10)` 미만이면 카카오 검색으로 보강
- 경로 길이에 따라 샘플 포인트 3~5개 추출
- 각 샘플 포인트 + 도착지 주변(1km) 검색

### Phase 3: 중복 제거
- 50m 이내 중복은 하나로 병합

### Phase 4: DB 캐싱
- 카카오 결과는 `place` 테이블에 upsert
- 실패해도 검색 결과 반환에는 영향 없음

## 5) 후보군 2차 필터링 (Proximity Score)
`filterByProximity()`

- 경로 polyline을 일정 간격으로 샘플링
  - 10km 이하: 500m
  - 10–50km: 1km
  - 50km 이상: 2km
- 각 후보에 대해 경로 샘플 포인트와의 최소 거리 계산
- 거리 기반 점수(0~100) + 경로 진행률 가중치
  - 95% 이후(도착 직전)는 제외
  - 30–70%는 소폭 가산, 80–95%는 소폭 감산
- 상위 N개(기본 20개)만 유지

## 6) Detour Cost 계산 (경로 고정)
`calculateDetourCosts()`

- 경유지 위치에서 경로 위 가장 가까운 포인트 찾기
- “경로 → 경유지 → 경로” 왕복 거리만 계산
- 시간은 직선거리 기반 추정
  - 도시 평균 속도 20km/h 기준

### 비용 정규화
```
costScore = (detourDistance / maxDetourDistance)*60
          + (detourDuration / 600)*40

finalScore = (100 - costScore) * 0.7
           + proximityScore * 0.3
```

- `maxDetourDistance` 기본 5000m 초과는 제외
- 최종 점수 내림차순 정렬 후 상위 10개 반환

## 7) 최종 병합 & 중복 제거
- 최단/최단시간 결과를 병합
- `place.id` 기준 중복 제거
- 더 높은 `finalScore` 결과를 유지

---

## 옵션 파라미터
- `bufferDistance` : 경로 주변 버퍼 거리 (기본 500m)
- `maxDetourDistance` : 최대 허용 이탈 거리 (기본 5000m)
- `maxResults` : 최종 반환 개수 (기본 10개)

---

## 참고 파일
- `src/app/api/search/route.ts`
- `src/lib/detour/calculator.ts`
- `src/lib/detour/spatial-filter.ts`
- `src/lib/detour/proximity-scorer.ts`
- `src/lib/detour/polyline-sampler.ts`
