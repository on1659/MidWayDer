# MidWayDer - Claude 컨텍스트 문서

## 프로젝트 개요

**서비스명**: MidWayDer (미드웨이더)
**슬로건**: "가는 길 중간(Mid)에 필요한 곳(Way)을 더하다(Der/Add)"

### 핵심 미션
사용자가 A에서 B로 이동하는 주 경로(Main Route)를 최대한 유지하면서, 경로상에서 **이탈 거리(Detour)와 추가 소요 시간이 가장 적은 최적의 경유지**(예: 다이소, 스타벅스 등)를 추천한다.

### 핵심 차별점
- ❌ 단순 직선거리 기반 검색
- ✅ **실제 주행 거리 및 시간 증가분 기반** 이탈 비용(Detour Cost) 산출
- ✅ "가장 가까운" 매장이 아닌 **"가장 가기 편한"** 매장 우선순위

---

## 팀 페르소나

### [기획자 (Planner)]
**역할**: 사용자 경험 최적화, 비즈니스 로직 설계

**중점 사항**:
- 실제 주행 거리/시간 기반 이탈 비용 산출 로직 설계
- "가장 가기 편한" 매장 우선순위 UX 기획
- 검색 결과 없는 경우의 폴백(Fallback) 전략

**담당 영역**:
- API 데이터 구조 정의 (Request/Response)
- 사용자 시나리오 기반 기능 명세
- 예외 상황 폴백 전략 (경로 없음, API 실패 등)

---

### [프로그래머 (Developer)]
**역할**: 고성능 공간 쿼리 구현, API 연동

**중점 사항**:
- Next.js(App Router), TypeScript 기반 타입 안전성 확보
- PostGIS 공간 쿼리 최적화 (ST_DWithin, GIST 인덱스)
- Naver 지도 API Polyline 데이터 섹션별 인덱싱
- 벡터 계산(Point-to-Line Distance) 로직 활용 경로 근접도 필터링

**담당 영역**:
- 타입 정의 (`/src/types/`)
- Naver Maps API 래퍼 (`/src/lib/naver-maps/`)
- Detour Cost 계산 알고리즘 (`/src/lib/detour/`)
- PostGIS 공간 쿼리 (`/src/lib/detour/spatial-filter.ts`)
- 성능 최적화 (API 호출 최소화, 샘플링 전략)

---

### [QA (Tester)]
**역할**: 예외 케이스 검증, 데이터 정확도 확인

**중점 사항**:
- 주행 방향의 반대편 매장 (중앙분리대 존재 시)
- 유턴 필요 구간, 일방통행 제약
- 진입로가 까다로운 매장 (고가도로, 지하차도 등)
- 검색 결과가 없는 경우의 폴백 전략
- API 호출 제한 최적화 (일일 무료 쿼터 관리)

**담당 영역**:
- 실제 도로 상황 기반 테스트 케이스 설계
- 데이터 오차 범위 검증 (거리 ±5%, 시간 ±10%)
- API 실패 시나리오 (타임아웃, 경로 없음, Rate Limit)
- 성능 벤치마크 (응답 시간 < 3초, PostGIS 쿼리 < 200ms)

---

## 기술 스택

### Frontend
- **Next.js 14+** (App Router): React 서버 컴포넌트, API Routes
- **TypeScript**: 타입 안전성 확보
- **Tailwind CSS**: 유틸리티 기반 스타일링
- **Zustand**: 경량 상태 관리 (경로, 검색 결과)
- **Lucide React**: 아이콘 라이브러리

### Backend / Database
- **Next.js API Routes**: 서버리스 API 엔드포인트
- **Prisma ORM**: 타입 안전한 데이터베이스 쿼리
- **PostgreSQL 14+**: 관계형 데이터베이스
- **PostGIS 3.3.2**: 공간 데이터 확장 (ST_DWithin, ST_Distance, GIST 인덱스)
- **Railway**: PostgreSQL + PostGIS 호스팅 (월 $5부터)

### Maps API
- **Naver Maps Enterprise SDK**:
  - **Directions 5 API**: 경로 조회 (A→B, A→C, C→B)
  - **Local Search API**: 매장 검색 (다이소, 스타벅스 등)
  - **Reverse Geocoding API**: 주소 ↔ 좌표 변환
- **무료 쿼터**: Directions 1,000회/일, Local Search 25,000회/일

---

## 핵심 로직: Detour Cost 계산 알고리즘

### 1. 핵심 공식

```
Detour Cost = (A→C 이동 거리 + C→B 이동 거리) - (A→B 기존 경로 거리)
```

**목표**: 위 공식에서 **증가분이 최소**가 되는 경유지 C를 찾는다.

### 2. 전체 프로세스 흐름

```
1. 사용자 입력 (출발지 A, 도착지 B, 카테고리)
   ↓
2. Naver Directions API로 A→B 원본 경로 조회
   - 거리: 12,500m
   - 시간: 1,200s (20분)
   - 경로 포인트(path): 500개 (위도/경도 배열)
   ↓
3. Polyline 샘플링 (500m 간격)
   - 500개 포인트 → 25개 대표 포인트로 축소
   - 목적: API 호출 최소화, 벡터 계산 효율화
   ↓
4. PostGIS 공간 필터링 (1차)
   - ST_DWithin: 경로 주변 1km 내 매장 필터링
   - 전국 다이소 1,000개 → 경로 근처 50개로 축소
   ↓
5. 벡터 기반 근접도 계산 (2차)
   - 각 매장과 샘플 포인트들 간 최소 거리 계산
   - 경로 후반부(80% 이후) 매장 제외
   - 근접도 점수 (0-100): 50개 → 상위 20개 선정
   ↓
6. Naver Directions API 병렬 호출 (3차 정밀)
   - 상위 20개 후보만 API 호출
   - 각 후보마다: A→C, C→B 실제 경로 조회 (총 40회)
   - 실제 도로 거리/시간 기반 Detour Cost 계산
   ↓
7. 최종 점수 계산 및 정렬
   - 최종 점수 = (100 - 이탈비용 점수) × 0.7 + 근접도 점수 × 0.3
   - 이탈비용 70%, 근접도 30% 가중치
   - 상위 10개 결과 반환
```

### 3. 성능 최적화 전략

| 단계 | 전략 | 입력 → 출력 | 비고 |
|------|------|------------|------|
| **1차 필터링** | PostGIS ST_DWithin (1km 버퍼) | 1,000개 → 50개 | GIST 공간 인덱스 활용 |
| **2차 필터링** | 벡터 근접도 점수 (API 호출 전) | 50개 → 20개 | Haversine 거리 계산 |
| **3차 정밀 계산** | Naver Directions API (실제 도로) | 20개 정밀 분석 | API 호출 1 + 40 = 41회 |
| **최종 반환** | 최종 점수 정렬 | 20개 → 상위 10개 | 사용자에게 표시 |

**API 비용 절감**: 1,000개 전체 호출 시 2,001회 → 실제 41회 (약 98% 절감)

### 4. 핵심 알고리즘 예시

#### Haversine 거리 계산 (Polyline 샘플링용)
```typescript
function haversineDistance(p1: Coordinates, p2: Coordinates): number {
  const R = 6371e3; // 지구 반지름 (m)
  const φ1 = p1.lat * Math.PI / 180;
  const φ2 = p2.lat * Math.PI / 180;
  const Δφ = (p2.lat - p1.lat) * Math.PI / 180;
  const Δλ = (p2.lng - p1.lng) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // 미터 단위
}
```

#### PostGIS 공간 쿼리
```sql
SELECT id, name, category, address,
       ST_Y(coordinates::geometry) as lat,
       ST_X(coordinates::geometry) as lng
FROM "Place"
WHERE category = '다이소'
  AND ST_DWithin(
    coordinates::geography,
    ST_GeomFromText('LINESTRING(126.9779 37.5663, 127.0276 37.4979)', 4326)::geography,
    1000  -- 1km 버퍼
  )
LIMIT 100;
```

#### 동적 샘플링 간격 조정
```typescript
function getOptimalSampleInterval(routeDistance: number): number {
  if (routeDistance < 5000) return 200;      // 5km 미만: 200m
  if (routeDistance < 20000) return 500;     // 20km 미만: 500m
  if (routeDistance < 50000) return 1000;    // 50km 미만: 1km
  return 2000;                               // 50km 이상: 2km
}
```

---

## 예외 처리 가이드

### 1. 실제 도로 상황 예외 케이스

| 예외 상황 | 문제점 | 해결 방안 |
|----------|--------|----------|
| **중앙분리대** | 직선거리는 가깝지만 유턴 필요 | Directions API가 유턴 경로 자동 반영 |
| **일방통행** | A→C 가능하지만 C→B 진입 불가 | API 404 에러 → 해당 매장 제외 |
| **고가도로/지하차도** | 직선거리는 가깝지만 진입로 멀음 | 실제 도로 거리로 자동 계산 |
| **API 타임아웃** | 네트워크 오류, 서버 과부하 | Retry 3회 → 실패 시 해당 매장 제외 |
| **경로 없음** | 섬, 접근 제한 구역 | Directions API 404 → 제외 |

### 2. 데이터 정확도 한계

| 항목 | 예상 오차 | 원인 |
|------|----------|------|
| **거리 정확도** | ±5% | Naver Directions API 기준 |
| **시간 정확도** | ±10% | 신호대기 시간 미포함 |
| **매장 위치** | ±10m | Naver Local Search API 기준 |

### 3. UI 안내 문구 (필수 표시)
```
⚠️ 안내사항
- 추가 시간에는 신호대기 및 주차 시간이 포함되지 않습니다.
- 실시간 교통 상황에 따라 실제 소요 시간이 달라질 수 있습니다.
- 매장 영업 시간 및 위치 정보는 변경될 수 있으니, 방문 전 확인하시기 바랍니다.
```

---

## 성능 최적화 목표

### 벤치마크 목표치

| 지표 | 목표치 | 측정 방법 |
|------|--------|----------|
| **API 응답 시간** | < 3초 | POST /api/search (서울시청→강남역) |
| **PostGIS 쿼리** | < 200ms | ST_DWithin 1km 버퍼 검색 |
| **Naver API 호출** | < 50회/검색 | 벡터 필터링 후 상위 20개만 |
| **프론트엔드 렌더링** | < 1초 | 10개 결과 + 지도 표시 |
| **DB 인덱스 효율** | < 100ms | GIST 인덱스 공간 쿼리 |

### API 호출 최적화

**예시: 서울시청 → 강남역, 다이소 검색**
- **전체 다이소 매장**: 전국 약 1,000개
- **1차 PostGIS 필터링**: 경로 주변 1km → 50개
- **2차 벡터 필터링**: 근접도 상위 → 20개
- **3차 Directions API**: 20개 × 2회 = 40회
- **총 API 호출**: 1회(원본 경로) + 40회 = **41회**
- **예상 비용**: 41회 × 5원 = **205원/검색**

---

## 주요 파일 구조

### 핵심 비즈니스 로직 (Critical Files)
```
src/lib/detour/
├── calculator.ts          # Detour Cost 계산 메인 로직 [최우선]
├── spatial-filter.ts      # PostGIS 공간 쿼리 (ST_DWithin)
├── polyline-sampler.ts    # Polyline 500m 샘플링
└── proximity-scorer.ts    # 벡터 기반 근접도 점수
```

### Naver Maps API 래퍼
```
src/lib/naver-maps/
├── client.ts              # Axios 클라이언트 (Retry 로직)
├── types.ts               # Naver API 타입 정의
├── directions.ts          # Directions 5 API 래퍼
├── search.ts              # Local Search API 래퍼
└── geocoding.ts           # Reverse Geocoding 래퍼
```

### 타입 정의
```
src/types/
├── location.ts            # Coordinates, Route, Place
├── detour.ts              # DetourResult, SpatialFilterOptions
└── api.ts                 # API Request/Response
```

---

## 개발 가이드라인

### 코드 작성 원칙
1. **타입 안전성**: 모든 함수에 명시적 타입 정의
2. **에러 핸들링**: try-catch + 명확한 에러 메시지
3. **성능 우선**: API 호출 최소화, 공간 쿼리 최적화
4. **테스트 가능성**: 순수 함수 분리, 의존성 주입

### 네이밍 컨벤션
- **파일명**: kebab-case (예: `polyline-sampler.ts`)
- **컴포넌트**: PascalCase (예: `NaverMap.tsx`)
- **함수/변수**: camelCase (예: `calculateDetourCosts`)
- **타입/인터페이스**: PascalCase (예: `DetourResult`)
- **상수**: UPPER_SNAKE_CASE (예: `MAX_API_CALLS`)

### Git 커밋 메시지
```
feat: Detour Cost 계산 알고리즘 구현
fix: PostGIS 공간 쿼리 인덱스 누락 수정
perf: Polyline 샘플링 간격 동적 조정으로 성능 개선
docs: CLAUDE.md에 예외 처리 가이드 추가
test: Haversine 거리 계산 단위 테스트 추가
```

---

## 참고 자료

### Naver Cloud Platform API 문서
- [Directions 5 API](https://api.ncloud-docs.com/docs/ai-naver-mapsdirections-driving)
- [Local Search API](https://api.ncloud-docs.com/docs/ai-naver-mapslocalsearch)
- [Reverse Geocoding API](https://api.ncloud-docs.com/docs/ai-naver-mapsreversegeocoding)

### PostGIS 공간 함수
- [ST_DWithin](https://postgis.net/docs/ST_DWithin.html): 거리 내 검색
- [ST_Distance](https://postgis.net/docs/ST_Distance.html): 거리 계산
- [GIST 인덱스](https://postgis.net/workshops/postgis-intro/indexing.html): 공간 인덱스

### 관련 기술 문서
- [Next.js 14 App Router](https://nextjs.org/docs/app)
- [Prisma + PostgreSQL](https://www.prisma.io/docs/concepts/database-connectors/postgresql)
- [Zustand State Management](https://docs.pmnd.rs/zustand/getting-started/introduction)

---

## 마무리

이 문서는 MidWayDer 프로젝트의 **AI 컨텍스트 문서**로, Claude가 프로젝트를 이해하고 작업할 때 참조하는 핵심 가이드입니다.

**3인 전문가 팀** (기획자, 프로그래머, QA)의 역할을 명확히 하고, **Detour Cost 계산 알고리즘**의 원리와 **성능 최적화 전략**을 상세히 설명했습니다.

앞으로의 구현 과정에서 이 문서를 기준으로 **타입 안전성**, **성능 최적화**, **예외 처리**를 철저히 지켜주세요.

---

**버전**: 1.0.0
**최종 수정**: 2026-01-29
**작성자**: Claude Sonnet 4.5 (MidWayDer 팀)
