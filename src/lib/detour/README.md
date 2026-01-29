# Detour Cost 계산 라이브러리

MidWayDer 프로젝트의 핵심 알고리즘인 Detour Cost 계산 시스템입니다.

## 개요

A→B 경로에서 C를 경유할 때 증가하는 거리/시간을 계산하고, 최적의 경유지를 추천합니다.

### 핵심 공식
```
Detour Cost = (A→C 거리 + C→B 거리) - (A→B 원본 거리)
```

## 빠른 시작

```typescript
import { calculateDetourCosts } from '@/lib/detour';
import { getRoute } from '@/lib/naver-maps/directions';

// 1. 원본 경로 조회
const originalRoute = await getRoute(
  { lat: 37.5663, lng: 126.9779 }, // 출발지
  { lat: 37.4979, lng: 127.0276 }  // 도착지
);

// 2. Detour Cost 계산
const { results } = await calculateDetourCosts(originalRoute, '다이소');

// 3. 결과 사용
const bestPlace = results[0];
console.log(`추천: ${bestPlace.place.name}`);
console.log(`이탈: +${bestPlace.detourCost.distance}m`);
```

## 모듈 구조

```
src/lib/detour/
├── index.ts                # 통합 export 인덱스
├── polyline-sampler.ts     # 경로 샘플링
├── spatial-filter.ts       # PostGIS 공간 필터링
├── proximity-scorer.ts     # 벡터 근접도 점수
└── calculator.ts           # Detour Cost 메인 로직
```

### 1. polyline-sampler.ts (90줄)

**경로 샘플링 유틸리티**

```typescript
import { samplePolyline, getOptimalSampleInterval } from './polyline-sampler';

// 500m 간격으로 샘플링
const sampled = samplePolyline(route.path, 500);

// 경로 거리에 따라 자동 간격 결정
const interval = getOptimalSampleInterval(route.distance);
```

### 2. spatial-filter.ts (92줄)

**PostGIS 공간 필터링**

```typescript
import { filterPlacesByRoute } from './spatial-filter';

// 경로 1km 이내 매장 검색
const candidates = await filterPlacesByRoute(route, '다이소', 1000);
```

### 3. proximity-scorer.ts (103줄)

**벡터 근접도 점수 계산**

```typescript
import { calculateProximityScore, filterByProximity } from './proximity-scorer';

// 개별 매장 점수 계산
const score = calculateProximityScore(place, sampledPoints, route);

// 상위 20개 필터링
const topCandidates = filterByProximity(candidates, sampledPoints, route, 20);
```

### 4. calculator.ts (244줄)

**메인 계산 로직**

```typescript
import { calculateDetourCosts, calculateSingleDetourCost } from './calculator';

// 전체 프로세스 실행
const { results, totalCandidates, apiCallsUsed } = await calculateDetourCosts(
  originalRoute,
  '다이소',
  {
    bufferDistance: 1000,      // 1km 버퍼
    maxDetourDistance: 5000,   // 5km 최대 이탈
    sampleInterval: 500,       // 500m 샘플링
  }
);
```

## API 참조

### `calculateDetourCosts()`

**전체 Detour Cost 계산 및 경유지 추천**

```typescript
async function calculateDetourCosts(
  originalRoute: Route,
  category: string,
  options?: Partial<SpatialFilterOptions>
): Promise<{
  results: DetourResult[];
  totalCandidates: number;
  apiCallsUsed: number;
}>
```

**파라미터**:
- `originalRoute`: A→B 원본 경로
- `category`: 검색 카테고리 (예: "다이소")
- `options`: 필터링 옵션 (선택)
  - `bufferDistance`: 경로 주변 버퍼 거리 (미터, 기본 1000)
  - `maxDetourDistance`: 최대 허용 이탈 거리 (미터, 기본 5000)
  - `sampleInterval`: 샘플링 간격 (미터, 기본 500)

**반환값**:
- `results`: 상위 10개 DetourResult 배열
- `totalCandidates`: 전체 후보 매장 수
- `apiCallsUsed`: 사용된 API 호출 횟수

---

### `samplePolyline()`

**경로를 일정 간격으로 샘플링**

```typescript
function samplePolyline(
  path: RoutePoint[],
  intervalMeters?: number
): RoutePoint[]
```

**파라미터**:
- `path`: 원본 경로 포인트 배열
- `intervalMeters`: 샘플링 간격 (미터, 기본 500)

**반환값**: 샘플링된 RoutePoint 배열

---

### `filterPlacesByRoute()`

**PostGIS 공간 필터링으로 경로 주변 매장 검색**

```typescript
async function filterPlacesByRoute(
  route: Route,
  category: string,
  bufferDistance?: number
): Promise<Place[]>
```

**파라미터**:
- `route`: 검색 대상 경로
- `category`: 매장 카테고리
- `bufferDistance`: 버퍼 거리 (미터, 기본 1000)

**반환값**: 필터링된 Place 배열 (최대 100개)

---

### `filterByProximity()`

**근접도 점수로 상위 N개 필터링**

```typescript
function filterByProximity(
  places: Place[],
  sampledPoints: RoutePoint[],
  route: Route,
  topN?: number
): Array<{ place: Place; proximityScore: number }>
```

**파라미터**:
- `places`: 필터링 대상 매장 목록
- `sampledPoints`: 샘플링된 경로 포인트
- `route`: 원본 경로 정보
- `topN`: 상위 N개 선택 (기본 20)

**반환값**: 점수순 상위 N개 배열

## 성능 지표

| 항목 | 값 |
|------|-----|
| 전체 처리 시간 | < 3초 |
| API 호출 횟수 | < 50회 |
| PostGIS 쿼리 시간 | < 200ms |
| 샘플링 감소율 | 95% (1000→20) |
| 공간 필터링 감소율 | 99.5% (10,000→50) |
| 근접도 필터링 감소율 | 60% (50→20) |
| 최종 감소율 | 99.9% (10,000→10) |

## 알고리즘 흐름

```
1. Polyline 샘플링 (500m 간격)
   1000개 포인트 → 20개 샘플
   ↓
2. PostGIS 공간 필터링 (1km 버퍼)
   10,000개 매장 → 50개 후보
   ↓
3. 벡터 근접도 필터링
   50개 후보 → 20개 선택
   ↓
4. Naver Directions API 호출 (A→C, C→B)
   20개 × 2 = 40회 API 호출
   ↓
5. Detour Cost 계산
   거리/시간 증가 계산
   ↓
6. 최종 점수 계산 및 정렬
   상위 10개 반환
```

## 점수 계산 방식

### Cost Score (이탈 비용 점수, 0-100, 낮을수록 좋음)

```typescript
const costScore = Math.min(
  100,
  (detourDistance / maxDetourDistance) * 60 +  // 거리 60%
  (detourDuration / 600) * 40                  // 시간 40%
);
```

### Final Score (최종 점수, 0-100, 높을수록 좋음)

```typescript
const finalScore =
  (100 - costScore) * 0.7 +      // 이탈 비용 70%
  proximityScore * 0.3;          // 경로 근접도 30%
```

## 의존성

### 내부 모듈
- `@/types/location`: Coordinates, Route, RoutePoint, Place
- `@/types/detour`: DetourResult, SpatialFilterOptions
- `@/lib/utils`: haversineDistance
- `@/lib/db/prisma`: Prisma 클라이언트
- `@/lib/naver-maps/directions`: getRoute

### 외부 패키지
- `@prisma/client`: PostGIS 쿼리 실행

## 제한사항

1. **Haversine 거리 오차**: ±5% (실제 도로 거리와 차이)
2. **PostGIS 인덱스 필수**: 공간 인덱스 없으면 성능 저하
3. **API 호출 제한**: 무료 쿼터 1,000회/일 (41회/요청 = 24회/일)
4. **경로 후반부 제외**: 진행률 80% 이후 매장은 자동 제외

## 예시 코드

더 많은 예시는 `docs/detour-algorithm-example.ts` 참조

```typescript
// 커스텀 옵션 사용
const { results } = await calculateDetourCosts(route, '스타벅스', {
  bufferDistance: 1500,
  maxDetourDistance: 3000,
  sampleInterval: 300,
});

// 개별 함수 사용
const sampled = samplePolyline(route.path, 500);
const candidates = await filterPlacesByRoute(route, '다이소', 1000);
const topCandidates = filterByProximity(candidates, sampled, route, 20);
```

## 문서

- **완료 보고서**: `docs/PHASE4_COMPLETION_REPORT.md`
- **알고리즘 흐름도**: `docs/detour-algorithm-flow.md`
- **사용 예시**: `docs/detour-algorithm-example.ts`

## 라이선스

MidWayDer 프로젝트의 일부입니다.

---

**Version**: 1.0.0
**Last Updated**: 2026-01-29
**Author**: Algorithm Engineer (Detour Cost 전문가)
