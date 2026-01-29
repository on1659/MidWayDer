/**
 * 위치 관련 타입 정의
 *
 * 좌표, 경로, 장소 등 지리 정보 관련 타입들을 정의합니다.
 */

/**
 * 기본 좌표 (위도/경도)
 * SRID 4326 (WGS84) 기준
 */
export interface Coordinates {
  /** 위도 (Latitude): -90 ~ 90 */
  lat: number;
  /** 경도 (Longitude): -180 ~ 180 */
  lng: number;
}

/**
 * 경로 포인트 (Naver Directions API 응답)
 *
 * 경로상의 한 지점을 나타내며, 누적 거리/시간 정보를 포함합니다.
 */
export interface RoutePoint extends Coordinates {
  /** 시작점으로부터의 누적 거리 (미터) */
  distance?: number;
  /** 시작점으로부터의 누적 시간 (초) */
  duration?: number;
}

/**
 * 경로 정보
 *
 * A→B 이동 경로의 전체 정보를 담습니다.
 */
export interface Route {
  /** 출발지 좌표 */
  start: Coordinates;
  /** 도착지 좌표 */
  end: Coordinates;
  /** 전체 이동 거리 (미터) */
  distance: number;
  /** 전체 소요 시간 (초) */
  duration: number;
  /** 경로 포인트 배열 (Polyline) */
  path: RoutePoint[];
  /** 인코딩된 Polyline 문자열 (선택사항) */
  polyline?: string;
}

/**
 * 장소 정보
 *
 * 다이소, 스타벅스 등 검색 대상 매장 정보입니다.
 */
export interface Place {
  /** 고유 ID (cuid) */
  id: string;
  /** 매장명 (예: "다이소 강남점") */
  name: string;
  /** 카테고리 (예: "다이소", "스타벅스") */
  category: string;
  /** 지번 주소 */
  address: string;
  /** 도로명 주소 (선택사항) */
  roadAddress?: string;
  /** 좌표 (위도/경도) */
  coordinates: Coordinates;
  /** 전화번호 (선택사항) */
  phone?: string;
  /** 영업 시간 정보 (선택사항) */
  businessHours?: string;
}

/**
 * 주소 정보 (Reverse Geocoding 결과)
 */
export interface AddressInfo {
  /** 전체 주소 */
  fullAddress: string;
  /** 도로명 주소 */
  roadAddress?: string;
  /** 지번 주소 */
  jibunAddress?: string;
  /** 우편번호 */
  zipCode?: string;
  /** 시/도 */
  sido?: string;
  /** 시/군/구 */
  sigungu?: string;
  /** 읍/면/동 */
  dong?: string;
}

/**
 * 경로 섹션 정보 (Naver Directions API)
 *
 * 경로를 여러 구간으로 나눈 정보입니다.
 */
export interface RouteSection {
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
 * 바운딩 박스 (지도 영역)
 */
export interface BoundingBox {
  /** 남서쪽 좌표 (left-bottom) */
  southwest: Coordinates;
  /** 북동쪽 좌표 (right-top) */
  northeast: Coordinates;
}
