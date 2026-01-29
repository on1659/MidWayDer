/**
 * API Request/Response 타입 정의
 *
 * Next.js API Routes의 요청/응답 구조를 정의합니다.
 */

import { Coordinates, Route, Place } from './location';
import { DetourResult } from './detour';

// ========================
// POST /api/search (경유지 검색)
// ========================

/**
 * 경유지 검색 요청
 *
 * 출발지, 도착지, 카테고리를 입력받아 최적 경유지를 검색합니다.
 */
export interface SearchWaypointsRequest {
  /** 출발지 (주소 또는 좌표 중 하나 필수) */
  start: {
    /** 출발지 주소 (예: "서울특별시 중구 세종대로 110") */
    address?: string;
    /** 출발지 좌표 */
    coordinates?: Coordinates;
  };

  /** 도착지 (주소 또는 좌표 중 하나 필수) */
  end: {
    /** 도착지 주소 */
    address?: string;
    /** 도착지 좌표 */
    coordinates?: Coordinates;
  };

  /** 검색 카테고리 (예: "다이소", "스타벅스", "이디야", "CU") */
  category: string;

  /** 검색 옵션 (선택사항) */
  options?: {
    /** 최대 결과 수 (기본 10개) */
    maxResults?: number;
    /** 경로 주변 버퍼 거리 (미터, 기본 1000m) */
    bufferDistance?: number;
    /** 최대 허용 이탈 거리 (미터, 기본 5000m) */
    maxDetourDistance?: number;
  };
}

/**
 * 경유지 검색 응답 (성공)
 */
export interface SearchWaypointsResponse {
  /** 성공 여부 */
  success: true;

  /** 검색 결과 데이터 */
  data: {
    /** A→B 원본 경로 정보 */
    originalRoute: Route;

    /** 추천 경유지 리스트 (finalScore 내림차순 정렬) */
    results: DetourResult[];

    /** 1차 공간 필터링 후보 수 */
    totalCandidates: number;

    /** 사용된 Naver API 호출 수 */
    apiCallsUsed: number;

    /** 검색 소요 시간 (밀리초) */
    duration?: number;
  };
}

/**
 * 경유지 검색 응답 (실패)
 */
export interface SearchWaypointsErrorResponse {
  /** 성공 여부 */
  success: false;

  /** 에러 정보 */
  error: {
    /** 에러 코드 */
    code: string;
    /** 에러 메시지 */
    message: string;
    /** 상세 정보 (선택사항) */
    details?: any;
  };
}

// ========================
// POST /api/directions (경로 조회)
// ========================

/**
 * 경로 조회 요청
 */
export interface DirectionsRequest {
  /** 출발지 좌표 */
  start: Coordinates;

  /** 도착지 좌표 */
  end: Coordinates;

  /** 경유지 목록 (선택사항) */
  waypoints?: Coordinates[];

  /** 경로 옵션 (선택사항) */
  option?: 'trafast' | 'tracomfort' | 'traoptimal';
}

/**
 * 경로 조회 응답
 */
export interface DirectionsResponse {
  success: boolean;
  data?: Route;
  error?: {
    code: string;
    message: string;
  };
}

// ========================
// GET /api/reverse-geocode (주소 변환)
// ========================

/**
 * Reverse Geocoding 요청 (Query Parameter)
 */
export interface ReverseGeocodeQuery {
  /** 위도 */
  lat: string;
  /** 경도 */
  lng: string;
}

/**
 * Reverse Geocoding 응답
 */
export interface ReverseGeocodeResponse {
  success: boolean;
  data?: {
    /** 전체 주소 */
    address: string;
    /** 도로명 주소 */
    roadAddress?: string;
    /** 지번 주소 */
    jibunAddress?: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

// ========================
// POST /api/seed-places (매장 데이터 크롤링)
// ========================

/**
 * 매장 데이터 시드 요청
 */
export interface SeedPlacesRequest {
  /** 크롤링할 카테고리 목록 (예: ["다이소", "스타벅스"]) */
  categories: string[];

  /** 크롤링할 도시 목록 (예: ["서울", "부산", "대구"]) */
  cities: string[];

  /** 기존 데이터 삭제 여부 (기본 false) */
  clearExisting?: boolean;
}

/**
 * 매장 데이터 시드 응답
 */
export interface SeedPlacesResponse {
  success: boolean;
  data?: {
    /** 생성된 매장 수 */
    placesCreated: number;
    /** 카테고리별 매장 수 */
    breakdown: Record<string, number>;
    /** 소요 시간 (밀리초) */
    duration: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

// ========================
// 공통 에러 코드
// ========================

/**
 * API 에러 코드
 */
export enum ApiErrorCode {
  // 입력 검증 에러
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_COORDINATES = 'INVALID_COORDINATES',
  INVALID_CATEGORY = 'INVALID_CATEGORY',

  // Naver API 에러
  NAVER_API_ERROR = 'NAVER_API_ERROR',
  NAVER_API_TIMEOUT = 'NAVER_API_TIMEOUT',
  NAVER_API_RATE_LIMIT = 'NAVER_API_RATE_LIMIT',
  NO_ROUTE_FOUND = 'NO_ROUTE_FOUND',

  // 데이터베이스 에러
  DATABASE_ERROR = 'DATABASE_ERROR',
  NO_PLACES_FOUND = 'NO_PLACES_FOUND',

  // 기타
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * API 에러 메시지 (한국어)
 */
export const ApiErrorMessage: Record<ApiErrorCode, string> = {
  [ApiErrorCode.VALIDATION_ERROR]: '입력 데이터 검증에 실패했습니다.',
  [ApiErrorCode.MISSING_REQUIRED_FIELD]: '필수 입력 항목이 누락되었습니다.',
  [ApiErrorCode.INVALID_COORDINATES]: '유효하지 않은 좌표입니다.',
  [ApiErrorCode.INVALID_CATEGORY]: '지원하지 않는 카테고리입니다.',

  [ApiErrorCode.NAVER_API_ERROR]: 'Naver Maps API 호출에 실패했습니다.',
  [ApiErrorCode.NAVER_API_TIMEOUT]: 'Naver Maps API 요청 시간이 초과되었습니다.',
  [ApiErrorCode.NAVER_API_RATE_LIMIT]: 'API 호출 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
  [ApiErrorCode.NO_ROUTE_FOUND]: '경로를 찾을 수 없습니다. 출발지와 도착지를 확인해주세요.',

  [ApiErrorCode.DATABASE_ERROR]: '데이터베이스 오류가 발생했습니다.',
  [ApiErrorCode.NO_PLACES_FOUND]: '검색 결과가 없습니다. 검색 조건을 변경해주세요.',

  [ApiErrorCode.INTERNAL_ERROR]: '서버 내부 오류가 발생했습니다.',
  [ApiErrorCode.UNKNOWN_ERROR]: '알 수 없는 오류가 발생했습니다.',
};

// ========================
// 지원 카테고리
// ========================

/**
 * 지원하는 매장 카테고리
 */
export const SupportedCategories = [
  '다이소',
  '스타벅스',
  '이디야',
  'CU',
  'GS25',
  '세븐일레븐',
  '이마트24',
] as const;

export type SupportedCategory = typeof SupportedCategories[number];

/**
 * 카테고리 메타데이터
 */
export interface CategoryMetadata {
  /** 표시 이름 */
  label: string;
  /** 아이콘 이름 (Lucide React) */
  icon: string;
  /** 색상 (Tailwind) */
  color: string;
  /** 설명 */
  description: string;
}

/**
 * 카테고리별 메타데이터
 */
export const CategoryMetadataMap: Record<string, CategoryMetadata> = {
  '다이소': {
    label: '다이소',
    icon: 'Store',
    color: 'blue',
    description: '생활용품, 문구, 주방용품',
  },
  '스타벅스': {
    label: '스타벅스',
    icon: 'Coffee',
    color: 'green',
    description: '커피 전문점',
  },
  '이디야': {
    label: '이디야',
    icon: 'Coffee',
    color: 'yellow',
    description: '커피 전문점',
  },
  'CU': {
    label: 'CU',
    icon: 'ShoppingBag',
    color: 'purple',
    description: '편의점',
  },
  'GS25': {
    label: 'GS25',
    icon: 'ShoppingBag',
    color: 'blue',
    description: '편의점',
  },
  '세븐일레븐': {
    label: '세븐일레븐',
    icon: 'ShoppingBag',
    color: 'orange',
    description: '편의점',
  },
  '이마트24': {
    label: '이마트24',
    icon: 'ShoppingBag',
    color: 'yellow',
    description: '편의점',
  },
};
