/**
 * Kakao Maps API 응답 타입 정의
 *
 * Kakao Mobility (Directions) 및 Kakao Local (Search, Geocoding) API 응답 구조입니다.
 */

// ========================
// Kakao Mobility - Directions API
// ========================

/**
 * Kakao Directions API 응답
 *
 * @see https://developers.kakaomobility.com/docs/navi-api/directions/
 */
export interface KakaoDirectionsResponse {
  /** 경로 목록 */
  routes: KakaoRoute[];
}

/** Kakao 경로 정보 */
export interface KakaoRoute {
  /** 결과 코드 (0: 성공) */
  result_code: number;
  /** 결과 메시지 */
  result_msg: string;
  /** 경로 요약 */
  summary: KakaoRouteSummary;
  /** 구간 목록 */
  sections: KakaoRouteSection[];
}

/** 경로 요약 정보 */
export interface KakaoRouteSummary {
  /** 출발지 */
  origin: { name: string; x: number; y: number };
  /** 도착지 */
  destination: { name: string; x: number; y: number };
  /** 전체 거리 (미터) */
  distance: number;
  /** 전체 소요 시간 (초) */
  duration: number;
}

/** 경로 구간 정보 */
export interface KakaoRouteSection {
  /** 구간 거리 (미터) */
  distance: number;
  /** 구간 소요 시간 (초) */
  duration: number;
  /** 도로 목록 */
  roads: KakaoRoad[];
}

/** 도로 정보 */
export interface KakaoRoad {
  /** 도로명 */
  name: string;
  /** 거리 (미터) */
  distance: number;
  /** 소요 시간 (초) */
  duration: number;
  /**
   * 좌표 배열 (flat array)
   * [lng1, lat1, lng2, lat2, ...]
   */
  vertexes: number[];
}

// ========================
// Kakao Local - Search API
// ========================

/**
 * Kakao 키워드 검색 응답
 *
 * @see https://developers.kakao.com/docs/latest/ko/local/dev-guide#search-by-keyword
 */
export interface KakaoLocalSearchResponse {
  /** 메타 정보 */
  meta: {
    /** 전체 결과 수 */
    total_count: number;
    /** 노출 가능한 결과 수 (최대 45) */
    pageable_count: number;
    /** 마지막 페이지 여부 */
    is_end: boolean;
  };
  /** 검색 결과 */
  documents: KakaoLocalDocument[];
}

/** 장소 검색 결과 아이템 */
export interface KakaoLocalDocument {
  /** 장소 ID */
  id: string;
  /** 장소명 */
  place_name: string;
  /** 카테고리 이름 */
  category_name: string;
  /** 카테고리 그룹 코드 */
  category_group_code: string;
  /** 전화번호 */
  phone: string;
  /** 지번 주소 */
  address_name: string;
  /** 도로명 주소 */
  road_address_name: string;
  /** 경도 (longitude) */
  x: string;
  /** 위도 (latitude) */
  y: string;
  /** 장소 상세 URL */
  place_url: string;
  /** 중심 좌표로부터의 거리 (미터) */
  distance: string;
}

// ========================
// Kakao Local - Geocoding API
// ========================

/**
 * Kakao 주소 검색 응답 (Forward Geocoding)
 *
 * @see https://developers.kakao.com/docs/latest/ko/local/dev-guide#address-coord
 */
export interface KakaoAddressSearchResponse {
  /** 메타 정보 */
  meta: {
    total_count: number;
    pageable_count: number;
    is_end: boolean;
  };
  /** 결과 */
  documents: KakaoAddressDocument[];
}

/** 주소 검색 결과 아이템 */
export interface KakaoAddressDocument {
  /** 전체 주소 */
  address_name: string;
  /** 주소 타입 (REGION, ROAD, REGION_ADDR, ROAD_ADDR) */
  address_type: string;
  /** 경도 */
  x: string;
  /** 위도 */
  y: string;
  /** 지번 주소 상세 */
  address?: {
    address_name: string;
    region_1depth_name: string;
    region_2depth_name: string;
    region_3depth_name: string;
  };
  /** 도로명 주소 상세 */
  road_address?: {
    address_name: string;
    region_1depth_name: string;
    region_2depth_name: string;
    road_name: string;
    main_building_no: string;
    sub_building_no: string;
  };
}

/**
 * Kakao 좌표 → 주소 변환 응답 (Reverse Geocoding)
 *
 * @see https://developers.kakao.com/docs/latest/ko/local/dev-guide#coord-to-address
 */
export interface KakaoCoord2AddressResponse {
  /** 메타 정보 */
  meta: {
    total_count: number;
  };
  /** 결과 */
  documents: KakaoCoord2AddressDocument[];
}

/** 좌표 → 주소 결과 아이템 */
export interface KakaoCoord2AddressDocument {
  /** 지번 주소 */
  address: {
    address_name: string;
    region_1depth_name: string;
    region_2depth_name: string;
    region_3depth_name: string;
    mountain_yn: string;
    main_address_no: string;
    sub_address_no: string;
  } | null;
  /** 도로명 주소 */
  road_address: {
    address_name: string;
    region_1depth_name: string;
    region_2depth_name: string;
    road_name: string;
    main_building_no: string;
    sub_building_no: string;
    building_name: string;
  } | null;
}
