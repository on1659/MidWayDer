/**
 * Naver Maps API 응답 타입 정의
 *
 * Naver Maps Enterprise SDK의 3개 API 응답 구조를 정의합니다:
 * - Directions 5 API: 경로 조회
 * - Local Search API: 장소 검색
 * - Reverse Geocoding API: 좌표 → 주소 변환
 */

// ========================
// Directions 5 API
// ========================

/**
 * Naver Directions 5 API 응답
 *
 * @see https://api.ncloud-docs.com/docs/ai-naver-mapsdirections-driving
 */
export interface NaverDirectionsResponse {
  /** 응답 코드 (0: 성공) */
  code: number;
  /** 응답 메시지 */
  message: string;
  /** 응답 시각 (ISO 8601) */
  currentDateTime: string;
  /** 경로 정보 (옵션별) */
  route: {
    /** 최적 경로 (추천) */
    traoptimal?: NaverRoute[];
    /** 빠른 경로 (속도 우선) */
    trafast?: NaverRoute[];
    /** 편한 경로 (회전 최소) */
    tracomfort?: NaverRoute[];
  };
}

/**
 * Naver 경로 정보
 */
export interface NaverRoute {
  /** 경로 요약 정보 */
  summary: {
    /** 출발지 */
    start: {
      /** 출발지 좌표 [경도, 위도] */
      location: [number, number];
    };
    /** 도착지 */
    goal: {
      /** 도착지 좌표 [경도, 위도] */
      location: [number, number];
    };
    /** 전체 이동 거리 (미터) */
    distance: number;
    /** 전체 소요 시간 (밀리초) */
    duration: number;
    /** 통행료 (원) */
    tollFare?: number;
    /** 택시 요금 (원) */
    taxiFare?: number;
    /** 유류비 (원) */
    fuelPrice?: number;
  };
  /** 경로 좌표 배열 (Polyline) */
  path: Array<[number, number]>; // [경도, 위도]
  /** 경로 구간 정보 (선택사항) */
  section?: NaverRouteSection[];
  /** 경로 안내 정보 (선택사항) */
  guide?: NaverRouteGuide[];
}

/**
 * 경로 구간 정보
 */
export interface NaverRouteSection {
  /** 시작 포인트 인덱스 */
  pointIndex: number;
  /** 포인트 개수 */
  pointCount: number;
  /** 구간 거리 (미터) */
  distance: number;
  /** 구간 이름 (도로명) */
  name: string;
  /** 혼잡도 (0: 원활, 1: 서행, 2: 지체, 3: 정체) */
  congestion: number;
  /** 평균 속도 (km/h) */
  speed: number;
}

/**
 * 경로 안내 정보
 */
export interface NaverRouteGuide {
  /** 안내 유형 (0: 직진, 1: 우회전, 2: 좌회전 등) */
  type: number;
  /** 안내 포인트 인덱스 */
  pointIndex: number;
  /** 안내 거리 (미터) */
  distance: number;
  /** 안내 시간 (초) */
  duration: number;
  /** 안내 텍스트 */
  instructions: string;
}

// ========================
// Local Search API
// ========================

/**
 * Naver Local Search API 응답
 *
 * @see https://developers.naver.com/docs/serviceapi/search/local/local.md
 */
export interface NaverLocalSearchResponse {
  /** 마지막 업데이트 날짜 */
  lastBuildDate: string;
  /** 총 검색 결과 수 */
  total: number;
  /** 시작 인덱스 (1부터) */
  start: number;
  /** 표시 개수 */
  display: number;
  /** 검색 결과 리스트 */
  items: NaverLocalSearchItem[];
}

/**
 * 장소 검색 결과 아이템
 */
export interface NaverLocalSearchItem {
  /** 장소명 (HTML 태그 포함 가능, 예: "<b>다이소</b> 강남점") */
  title: string;
  /** 카테고리 (예: "생활,서비스 > 생활용품") */
  category: string;
  /** 전화번호 */
  telephone: string;
  /** 지번 주소 */
  address: string;
  /** 도로명 주소 */
  roadAddress: string;
  /** 경도 (KATECH 좌표계, 정수형 문자열) */
  mapx: string;
  /** 위도 (KATECH 좌표계, 정수형 문자열) */
  mapy: string;
  /** 장소 링크 (네이버 플레이스 URL) */
  link?: string;
  /** 설명 */
  description?: string;
}

// ========================
// Reverse Geocoding API
// ========================

/**
 * Naver Reverse Geocoding API 응답
 *
 * @see https://api.ncloud-docs.com/docs/ai-naver-mapsreversegeocoding-gc
 */
export interface NaverReverseGeocodeResponse {
  /** 상태 정보 */
  status: {
    /** 상태 코드 (0: 성공) */
    code: number;
    /** 상태 이름 */
    name: string;
    /** 메시지 */
    message: string;
  };
  /** 검색 결과 배열 */
  results: NaverReverseGeocodeResult[];
}

/**
 * Reverse Geocoding 결과
 */
export interface NaverReverseGeocodeResult {
  /** 행정구역 정보 */
  region: {
    /** 시/도 */
    area1: {
      /** 시/도 이름 (예: "서울특별시") */
      name: string;
      /** 좌표 */
      coords: { center: { x: string; y: string } };
    };
    /** 시/군/구 */
    area2: {
      /** 시/군/구 이름 (예: "중구") */
      name: string;
      /** 좌표 */
      coords: { center: { x: string; y: string } };
    };
    /** 읍/면/동 */
    area3: {
      /** 읍/면/동 이름 (예: "세종로") */
      name: string;
      /** 좌표 */
      coords: { center: { x: string; y: string } };
    };
    /** 리 (선택사항) */
    area4?: {
      /** 리 이름 */
      name: string;
      /** 좌표 */
      coords: { center: { x: string; y: string } };
    };
  };
  /** 토지 정보 */
  land: {
    /** 지번 유형 (1: 지번, 2: 산) */
    type: string;
    /** 토지 이름 */
    name: string;
    /** 본번 */
    number1: string;
    /** 부번 */
    number2: string;
    /** 추가 정보 (도로명 주소) */
    addition0: {
      /** 도로명 주소 유형 */
      type: string;
      /** 도로명 */
      value: string;
    };
    /** 건물 번호 (선택사항) */
    addition1?: {
      type: string;
      value: string;
    };
    /** 건물 이름 (선택사항) */
    addition2?: {
      type: string;
      value: string;
    };
    /** 참고 항목 (선택사항) */
    addition3?: {
      type: string;
      value: string;
    };
    /** 공동주택 여부 (선택사항) */
    addition4?: {
      type: string;
      value: string;
    };
  };
  /** 좌표 */
  coords?: {
    center: { x: string; y: string };
  };
}

// ========================
// 공통 타입
// ========================

/**
 * Naver API 에러 응답
 */
export interface NaverApiErrorResponse {
  /** 에러 코드 */
  errorCode: string;
  /** 에러 메시지 */
  errorMessage: string;
}
