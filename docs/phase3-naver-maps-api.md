# Phase 3: Naver Maps API 연동 구현

## 개요

Naver Maps Enterprise SDK의 3개 API를 연동한 통합 모듈입니다.

### 구현된 API

1. **Directions 5 API**: A→B 경로 조회 (실제 도로 기반)
2. **Local Search API**: 카테고리별 매장 검색 (다이소, 스타벅스 등)
3. **Reverse Geocoding API**: 좌표 → 주소 변환

## 파일 구조

```
src/lib/naver-maps/
├── index.ts          # 통합 모듈 (export all)
├── types.ts          # Naver API 응답 타입 정의
├── client.ts         # Axios 인스턴스 + Retry 로직
├── directions.ts     # Directions 5 API 래퍼
├── search.ts         # Local Search API 래퍼
└── geocoding.ts      # Reverse Geocoding API 래퍼
```

## 주요 기능

### 1. Directions API (`directions.ts`)

#### 기본 경로 조회

```typescript
import { getRoute } from '@/lib/naver-maps';

const route = await getRoute(
  { lat: 37.5663, lng: 126.9779 }, // 서울시청
  { lat: 37.4979, lng: 127.0276 }  // 강남역
);

console.log(`거리: ${route.distance}m`);
console.log(`시간: ${route.duration}초`);
console.log(`경로 포인트: ${route.path.length}개`);
```

#### 경로 옵션 지정

```typescript
// 최적 경로 (기본)
const optimal = await getRoute(start, end, 'traoptimal');

// 빠른 경로 (속도 우선)
const fast = await getRoute(start, end, 'trafast');

// 편한 경로 (회전 최소)
const comfort = await getRoute(start, end, 'tracomfort');
```

#### 여러 경로 옵션 동시 조회

```typescript
import { getMultipleRoutes } from '@/lib/naver-maps';

const routes = await getMultipleRoutes(start, end);
// { traoptimal: Route, trafast: Route, tracomfort: Route }
```

#### 주요 타입

```typescript
interface Route {
  start: Coordinates;
  end: Coordinates;
  distance: number;      // 미터
  duration: number;      // 초
  path: RoutePoint[];    // 경로 포인트 배열
}

interface RoutePoint extends Coordinates {
  distance?: number;     // 시작점으로부터 누적 거리
  duration?: number;     // 시작점으로부터 누적 시간
}
```

### 2. Local Search API (`search.ts`)

#### 기본 매장 검색

```typescript
import { searchPlaces } from '@/lib/naver-maps';

const places = await searchPlaces('다이소');
console.log(`${places.length}개 매장 검색`);
```

#### 옵션을 사용한 검색

```typescript
const places = await searchPlaces('스타벅스', {
  maxResults: 50,              // 최대 50개
  center: { lat: 37.5663, lng: 126.9779 },
  radius: 5000,                // 중심으로부터 5km 이내
});
```

#### 지역별 검색

```typescript
import { searchPlacesByRegion } from '@/lib/naver-maps';

const places = await searchPlacesByRegion('다이소', '서울');
// "다이소 서울"로 검색
```

#### 여러 카테고리 동시 검색

```typescript
import { searchMultipleCategories } from '@/lib/naver-maps';

const results = await searchMultipleCategories(['다이소', '스타벅스', 'CU']);
// { '다이소': Place[], '스타벅스': Place[], 'CU': Place[] }
```

#### 중복 제거 및 정렬

```typescript
import { deduplicatePlaces, sortPlacesByDistance } from '@/lib/naver-maps';

// 중복 제거 (같은 이름 + 주소)
const unique = deduplicatePlaces(places);

// 거리순 정렬
const sorted = sortPlacesByDistance(places, myLocation);
```

#### 주요 타입

```typescript
interface Place {
  id: string;
  name: string;
  category: string;
  address: string;
  roadAddress?: string;
  coordinates: Coordinates;
  phone?: string;
}

interface SearchOptions {
  maxResults?: number;   // 최대 결과 수 (기본 100)
  sort?: 'random' | 'comment';
  center?: Coordinates;  // 필터링용 중심점
  radius?: number;       // 필터링용 반경 (미터)
}
```

### 3. Reverse Geocoding API (`geocoding.ts`)

#### 기본 주소 변환

```typescript
import { reverseGeocode } from '@/lib/naver-maps';

const address = await reverseGeocode({ lat: 37.5663, lng: 126.9779 });
console.log(address); // "서울특별시 중구 세종대로 110"
```

#### 상세 주소 정보 조회

```typescript
import { reverseGeocodeDetailed } from '@/lib/naver-maps';

const addressInfo = await reverseGeocodeDetailed(coords);
console.log(addressInfo.roadAddress);   // 도로명 주소
console.log(addressInfo.jibunAddress);  // 지번 주소
console.log(addressInfo.sido);          // 시/도
console.log(addressInfo.sigungu);       // 시/군/구
console.log(addressInfo.dong);          // 읍/면/동
```

#### 배치 변환

```typescript
import { reverseGeocodeBatch } from '@/lib/naver-maps';

const addresses = await reverseGeocodeBatch([
  { lat: 37.5663, lng: 126.9779 },
  { lat: 37.4979, lng: 127.0276 },
]);
// ["서울특별시 중구 세종대로 110", "서울특별시 강남구 ..."]
```

#### 주소 간단히 표시

```typescript
import { getShortAddress } from '@/lib/naver-maps';

const short = getShortAddress("서울특별시 중구 세종대로 110");
console.log(short); // "서울특별시 중구"
```

#### 주요 타입

```typescript
interface AddressInfo {
  fullAddress: string;      // 전체 주소
  roadAddress?: string;     // 도로명 주소
  jibunAddress?: string;    // 지번 주소
  zipCode?: string;         // 우편번호
  sido?: string;            // 시/도
  sigungu?: string;         // 시/군/구
  dong?: string;            // 읍/면/동
}

interface GeocodingOptions {
  orders?: 'roadaddr' | 'addr' | 'roadaddr,addr';
  output?: 'json' | 'xml';
}
```

## 에러 처리

### 커스텀 에러 클래스

각 API는 커스텀 에러 클래스를 제공합니다.

```typescript
// Directions API
import { DirectionsApiError } from '@/lib/naver-maps';

try {
  const route = await getRoute(start, end);
} catch (error) {
  if (error instanceof DirectionsApiError) {
    console.error(`에러 코드: ${error.code}`);
    console.error(`메시지: ${error.message}`);
    console.error(`상세: ${error.details}`);
  }
}

// Search API
import { SearchApiError } from '@/lib/naver-maps';

// Geocoding API
import { GeocodingApiError } from '@/lib/naver-maps';
```

### 에러 코드

| 코드 | 설명 |
|------|------|
| `INVALID_COORDINATES` | 유효하지 않은 좌표 |
| `INVALID_LATITUDE` | 위도 범위 오류 (-90 ~ 90) |
| `INVALID_LONGITUDE` | 경도 범위 오류 (-180 ~ 180) |
| `NO_ROUTE_FOUND` | 경로를 찾을 수 없음 |
| `NO_ADDRESS_FOUND` | 주소를 찾을 수 없음 |
| `EMPTY_QUERY` | 빈 검색어 |
| `HTTP_ERROR` | HTTP 상태 코드 에러 (4xx, 5xx) |
| `NETWORK_ERROR` | 네트워크 오류 |
| `API_ERROR` | Naver API 응답 에러 |
| `UNKNOWN_ERROR` | 알 수 없는 에러 |

## Retry 로직

`client.ts`에서 자동 재시도 로직을 구현했습니다.

### 재시도 조건

- 네트워크 오류 (응답 없음)
- 5xx 서버 에러
- 429 Too Many Requests (Rate Limit)

### 재시도 설정

```typescript
const MAX_RETRIES = 3;        // 최대 3회
const RETRY_DELAY = 1000;     // 초기 1초
const REQUEST_TIMEOUT = 10000; // 10초 타임아웃
```

### 지수 백오프

```
1차 재시도: 1초 대기
2차 재시도: 2초 대기
3차 재시도: 3초 대기
```

### 재시도 안함

- 4xx 클라이언트 에러 (잘못된 요청)
- 타임아웃 에러 (이미 최대 시간 대기)

## 좌표 변환

### KATECH → WGS84

Naver Local Search API는 KATECH 좌표계를 사용하므로 WGS84로 변환이 필요합니다.

```typescript
// Naver API 응답 (KATECH)
{
  "mapx": "1270000000",  // 경도 * 10,000,000
  "mapy": "375665000"    // 위도 * 10,000,000
}

// 변환 후 (WGS84)
{
  "lng": 127.0000,
  "lat": 37.5665
}
```

변환 공식:

```typescript
function katechToWgs84(x: string, y: string): Coordinates {
  const lng = parseInt(x) / 10000000;
  const lat = parseInt(y) / 10000000;
  return { lat, lng };
}
```

## 환경 변수 설정

`.env.local` 파일에 다음 환경 변수를 추가하세요.

```bash
# Naver Cloud Platform API 키
NAVER_MAPS_CLIENT_ID=your-client-id
NAVER_MAPS_CLIENT_SECRET=your-client-secret
```

### 개발 환경

```bash
# .env.local (Git에서 제외)
NAVER_MAPS_CLIENT_ID=xxx
NAVER_MAPS_CLIENT_SECRET=yyy
```

### 프로덕션 환경

Vercel, Netlify 등 배포 플랫폼의 환경 변수 설정에서 추가하세요.

## 테스트

### 수동 테스트

```bash
# 환경 변수 설정
export NAVER_MAPS_CLIENT_ID="your-client-id"
export NAVER_MAPS_CLIENT_SECRET="your-client-secret"

# 테스트 스크립트 실행
npx tsx test-naver-api.ts
```

### 단위 테스트 (TODO)

```bash
# Jest 테스트 실행
npm run test:naver-api
```

## 다음 단계 (Phase 4)

Phase 3 완료 후 다음 단계:

1. **경유지 추천 알고리즘** (`src/lib/waypoint-finder/`)
   - 1차 공간 필터링 (Turf.js buffer)
   - 2차 실제 경로 검증 (Naver Directions API)
   - 3차 점수 계산 및 정렬

2. **API Routes** (`src/app/api/`)
   - `POST /api/search`: 경유지 검색
   - `POST /api/directions`: 경로 조회
   - `GET /api/reverse-geocode`: 주소 변환

3. **데이터베이스 연동**
   - Prisma Client 사용
   - Place 모델 CRUD 작업

## 참고 자료

- [Naver Cloud Platform - Directions 5 API](https://api.ncloud-docs.com/docs/ai-naver-mapsdirections-driving)
- [Naver Developers - Local Search API](https://developers.naver.com/docs/serviceapi/search/local/local.md)
- [Naver Cloud Platform - Reverse Geocoding API](https://api.ncloud-docs.com/docs/ai-naver-mapsreversegeocoding-gc)

## 주의사항

### API 호출 한도

Naver Cloud Platform의 API 호출 한도를 확인하세요:
- 무료 플랜: 일일 25,000회
- 유료 플랜: 요금제별 상이

### 좌표 정밀도

- WGS84 좌표계 사용 (위도/경도)
- 소수점 6자리 권장 (약 0.1m 정밀도)

### KATECH 변환 정확도

Local Search API의 KATECH → WGS84 변환은 근사치입니다.
정확한 좌표가 필요한 경우 Geocoding API를 추가로 호출하세요.

### Rate Limiting

- 짧은 시간 내 대량 요청 시 429 에러 발생 가능
- Retry 로직으로 자동 재시도되지만, 배치 작업 시 주의 필요

### 보안

- 환경 변수는 절대 Git에 커밋하지 마세요
- `.env.local` 파일은 `.gitignore`에 포함되어야 합니다
- 클라이언트 사이드에서 API 키를 직접 사용하지 마세요
