# Phase 3: 파일 구조 및 의존성

## 디렉토리 구조

```
MidWayDer/
├── src/
│   ├── lib/
│   │   ├── naver-maps/          # ✨ NEW (Phase 3)
│   │   │   ├── index.ts         # 통합 모듈 (89줄)
│   │   │   ├── types.ts         # Naver API 타입 (266줄)
│   │   │   ├── client.ts        # Axios + Retry (205줄)
│   │   │   ├── directions.ts    # Directions API (262줄)
│   │   │   ├── search.ts        # Local Search API (327줄)
│   │   │   └── geocoding.ts     # Reverse Geocoding API (331줄)
│   │   ├── detour/              # (Phase 2 - 기존)
│   │   │   ├── calculator.ts
│   │   │   ├── polyline-sampler.ts
│   │   │   ├── proximity-scorer.ts
│   │   │   └── spatial-filter.ts
│   │   ├── db/
│   │   │   └── prisma.ts
│   │   └── utils.ts             # haversineDistance 포함
│   └── types/
│       ├── location.ts          # Coordinates, Route, Place
│       ├── detour.ts            # DetourResult
│       └── api.ts               # API Request/Response
├── docs/
│   ├── phase3-naver-maps-api.md        # ✨ NEW
│   └── phase3-file-structure.md        # ✨ NEW (this file)
├── test-naver-api.ts            # ✨ NEW
├── PHASE3_COMPLETE.md           # ✨ NEW
└── .env.local                   # API 키 설정 필요
```

## 의존성 그래프

```
┌─────────────────────────────────────────────────────────┐
│                   Phase 3: Naver Maps API               │
└─────────────────────────────────────────────────────────┘

                    ┌─────────────────┐
                    │   index.ts      │  (통합 export)
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
      ┌───────▼──────┐ ┌────▼─────┐ ┌─────▼────────┐
      │ directions.ts│ │search.ts │ │ geocoding.ts │
      └───────┬──────┘ └────┬─────┘ └─────┬────────┘
              │              │              │
              └──────────────┼──────────────┘
                             │
                    ┌────────▼────────┐
                    │   client.ts     │  (Axios + Retry)
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │   types.ts      │  (Naver API 타입)
                    └─────────────────┘

              ┌─────────────────────┐
              │  External Imports   │
              └─────────────────────┘
                       │
          ┌────────────┼────────────┐
          │            │            │
    ┌─────▼─────┐ ┌───▼────┐ ┌────▼──────┐
    │   axios   │ │ @types │ │src/types/ │
    └───────────┘ │ /node  │ │location.ts│
                  └────────┘ │detour.ts  │
                             │api.ts     │
                             └───────────┘
                                   │
                          ┌────────▼────────┐
                          │  src/lib/       │
                          │  utils.ts       │
                          │ (haversine...)  │
                          └─────────────────┘
```

## 모듈별 의존성

### 1. types.ts
```typescript
// 외부 의존성: 없음
// 순수 타입 정의 파일
```

### 2. client.ts
```typescript
import axios from 'axios';                    // npm package
import { InternalAxiosRequestConfig } from 'axios';

// 환경 변수 필요:
// - NAVER_MAPS_CLIENT_ID
// - NAVER_MAPS_CLIENT_SECRET
```

### 3. directions.ts
```typescript
import { naverMapsClient } from './client';          // 내부
import { NaverDirectionsResponse } from './types';   // 내부
import { Route, Coordinates, RoutePoint } from '@/types/location';  // 프로젝트
import { AxiosError } from 'axios';                  // npm
```

### 4. search.ts
```typescript
import { naverMapsClient } from './client';             // 내부
import { NaverLocalSearchResponse } from './types';     // 내부
import { Place, Coordinates } from '@/types/location';  // 프로젝트
import { haversineDistance } from '@/lib/utils';        // 프로젝트
import { AxiosError } from 'axios';                     // npm
```

### 5. geocoding.ts
```typescript
import { naverMapsClient } from './client';                  // 내부
import { NaverReverseGeocodeResponse } from './types';       // 내부
import { Coordinates, AddressInfo } from '@/types/location'; // 프로젝트
import { AxiosError } from 'axios';                          // npm
```

### 6. index.ts
```typescript
// 모든 내부 모듈을 re-export
export * from './types';
export * from './client';
export * from './directions';
export * from './search';
export * from './geocoding';
```

## 타입 흐름

### Naver API → 우리 타입 변환

```
┌──────────────────────────────────────────────────────────┐
│                  Naver API 응답 타입                     │
├──────────────────────────────────────────────────────────┤
│ NaverDirectionsResponse  (types.ts)                      │
│ NaverLocalSearchResponse (types.ts)                      │
│ NaverReverseGeocodeResponse (types.ts)                   │
└───────────────────────┬──────────────────────────────────┘
                        │
                        │ 변환 함수
                        │
┌───────────────────────▼──────────────────────────────────┐
│                  우리 앱 타입                            │
├──────────────────────────────────────────────────────────┤
│ Route      (types/location.ts)                           │
│ Place      (types/location.ts)                           │
│ AddressInfo (types/location.ts)                          │
└──────────────────────────────────────────────────────────┘
```

### 변환 예시

#### Directions API
```typescript
// Naver API 응답
NaverRoute {
  summary: {
    distance: 12345,        // 미터
    duration: 1234567,      // 밀리초
  },
  path: [[lng, lat], ...]   // [경도, 위도]
}

// ↓ 변환 (convertNaverRouteToRoute)

// 우리 Route 타입
Route {
  distance: 12345,          // 미터
  duration: 1234,           // 초 (밀리초 / 1000)
  path: [{ lat, lng }, ...] // RoutePoint[]
}
```

#### Local Search API
```typescript
// Naver API 응답
NaverLocalSearchItem {
  title: "<b>다이소</b> 강남점",    // HTML 태그 포함
  mapx: "1270000000",                // KATECH 경도
  mapy: "375665000",                 // KATECH 위도
}

// ↓ 변환 (convertNaverItemToPlace)

// 우리 Place 타입
Place {
  name: "다이소 강남점",             // HTML 제거
  coordinates: {
    lng: 127.0000,                   // WGS84 경도
    lat: 37.5665,                    // WGS84 위도
  }
}
```

#### Reverse Geocoding API
```typescript
// Naver API 응답
NaverReverseGeocodeResult {
  region: {
    area1: { name: "서울특별시" },
    area2: { name: "중구" },
    area3: { name: "세종로" },
  },
  land: {
    addition0: { value: "세종대로" },
    number1: "110",
  }
}

// ↓ 변환 (formatAddress)

// 문자열 주소
"서울특별시 중구 세종대로 110"
```

## 좌표계 변환

### KATECH → WGS84

```typescript
// Input: Naver Local Search API 응답
{
  "mapx": "1270000000",  // 127.0000000 * 10,000,000
  "mapy": "375665000"    // 37.5665000 * 10,000,000
}

// Conversion Function
function katechToWgs84(x: string, y: string): Coordinates {
  const lng = parseInt(x) / 10000000;
  const lat = parseInt(y) / 10000000;
  return { lat, lng };
}

// Output: WGS84 좌표
{
  "lat": 37.5665,
  "lng": 127.0000
}
```

## API 호출 흐름

### 경로 조회 (Directions)

```
1. getRoute(start, end, option)
   ↓
2. validateCoordinates(start), validateCoordinates(end)
   ↓
3. naverMapsClient.get('/map-direction/v1/driving', params)
   ↓ (Retry 로직)
4. response.data.route[option][0]
   ↓
5. convertNaverRouteToRoute(naverRoute, start, end)
   ↓
6. return Route
```

### 매장 검색 (Search)

```
1. searchPlaces(query, options)
   ↓
2. naverMapsClient.get('/map-place/v1/search', params)
   ↓ (Retry 로직)
3. response.data.items[]
   ↓
4. items.map(item => convertNaverItemToPlace(item, query))
   ↓
5. filterPlacesByRadius(places, center, radius)  (선택사항)
   ↓
6. return Place[]
```

### 주소 변환 (Geocoding)

```
1. reverseGeocode(coords, options)
   ↓
2. validateCoordinates(coords)
   ↓
3. naverMapsClient.get('/map-reversegeocode/v2/gc', params)
   ↓ (Retry 로직)
4. response.data.results[0]
   ↓
5. formatAddress(result)
   ↓
6. return string (주소)
```

## 에러 처리 흐름

```
API 호출
  ↓
┌─────────────────┐
│ Try Block       │
├─────────────────┤
│ 1. 입력 검증    │ → ValidationError
│ 2. API 호출     │ → AxiosError
│ 3. 응답 검증    │ → ApiError
│ 4. 데이터 변환  │
└────────┬────────┘
         │
┌────────▼────────┐
│ Catch Block     │
├─────────────────┤
│ • CustomError?  │ → 그대로 throw
│ • AxiosError?   │ → HTTP 에러로 변환
│ • 기타 에러     │ → UNKNOWN_ERROR
└────────┬────────┘
         │
┌────────▼────────┐
│ Caller          │
├─────────────────┤
│ try {           │
│   const result  │
│ } catch (e) {   │
│   if (e instanceof CustomError)
│     handle...   │
│ }               │
└─────────────────┘
```

## 환경 설정

### 필수 환경 변수

```bash
# .env.local
NAVER_MAPS_CLIENT_ID=your-client-id-here
NAVER_MAPS_CLIENT_SECRET=your-client-secret-here
```

### 타입스크립트 설정

```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### package.json 의존성

```json
{
  "dependencies": {
    "axios": "^1.6.0",
    "typescript": "^5.3.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0"
  }
}
```

## 사용 예제

### 단일 import

```typescript
import { getRoute } from '@/lib/naver-maps';
import { searchPlaces } from '@/lib/naver-maps';
import { reverseGeocode } from '@/lib/naver-maps';
```

### 통합 import

```typescript
import {
  getRoute,
  searchPlaces,
  reverseGeocode,
  DirectionsApiError,
  SearchApiError,
  GeocodingApiError,
} from '@/lib/naver-maps';
```

### 타입 import

```typescript
import type {
  RouteOption,
  SearchOptions,
  GeocodingOptions,
  NaverDirectionsResponse,
} from '@/lib/naver-maps';
```

## 파일 크기

| 파일 | 라인 수 | 주요 내용 |
|------|---------|----------|
| types.ts | 266 | Naver API 타입 정의 |
| search.ts | 327 | Local Search API |
| geocoding.ts | 331 | Reverse Geocoding API |
| directions.ts | 262 | Directions 5 API |
| client.ts | 205 | Axios + Retry 로직 |
| index.ts | 89 | Export 통합 |
| **합계** | **1,480** | - |

## 코드 품질

### TypeScript Strict Mode

- ✅ 모든 타입 명시
- ✅ `any` 타입 최소화 (에러 처리 제외)
- ✅ Null 안정성 확보

### 에러 처리

- ✅ 커스텀 에러 클래스 사용
- ✅ 에러 코드 및 상세 정보 포함
- ✅ Try-Catch 블록 적절히 사용

### 문서화

- ✅ JSDoc 주석 작성
- ✅ 사용 예제 포함
- ✅ 타입 설명 추가

### 테스트 가능성

- ✅ 모듈화된 함수 구조
- ✅ 의존성 주입 가능
- ✅ 테스트 스크립트 제공

## 다음 단계

Phase 4에서 이 모듈을 사용:

```typescript
// Phase 4: 경유지 추천 알고리즘
import { getRoute, searchPlaces } from '@/lib/naver-maps';

async function findWaypoints(start, end, category) {
  // 1. A→B 원본 경로 조회
  const originalRoute = await getRoute(start, end);

  // 2. 카테고리별 매장 검색
  const places = await searchPlaces(category);

  // 3. 1차 공간 필터링 (Phase 4)
  // 4. 2차 실제 경로 검증 (Phase 4)
  // 5. 3차 점수 계산 (Phase 4)

  return recommendedWaypoints;
}
```
