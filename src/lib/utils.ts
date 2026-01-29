/**
 * 공통 유틸리티 함수
 *
 * 프로젝트 전반에 걸쳐 사용되는 헬퍼 함수들을 정의합니다.
 */

import { Coordinates } from '@/types/location';

// ========================
// 문자열 처리
// ========================

/**
 * Tailwind CSS 클래스명을 조건부로 결합
 *
 * @example
 * cn('bg-blue-500', isActive && 'text-white', 'p-4')
 * // => 'bg-blue-500 text-white p-4' (isActive가 true일 때)
 */
export function cn(...inputs: (string | boolean | undefined | null)[]): string {
  return inputs.filter(Boolean).join(' ');
}

/**
 * 문자열을 kebab-case로 변환
 *
 * @example
 * toKebabCase('Hello World') // => 'hello-world'
 * toKebabCase('getUserById') // => 'get-user-by-id'
 */
export function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

/**
 * 문자열을 Title Case로 변환
 *
 * @example
 * toTitleCase('hello world') // => 'Hello World'
 */
export function toTitleCase(str: string): string {
  return str
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// ========================
// 디바운싱 & 스로틀링
// ========================

/**
 * 디바운싱 함수
 *
 * 연속된 호출을 지연시키고, 마지막 호출만 실행합니다.
 * 주소 입력 자동완성 등에 사용됩니다.
 *
 * @param func - 실행할 함수
 * @param wait - 지연 시간 (밀리초)
 * @returns 디바운싱된 함수
 *
 * @example
 * const debouncedSearch = debounce((query: string) => {
 *   console.log('Searching:', query);
 * }, 300);
 *
 * debouncedSearch('a');    // 실행 안됨
 * debouncedSearch('ab');   // 실행 안됨
 * debouncedSearch('abc');  // 300ms 후 실행: 'Searching: abc'
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

/**
 * 스로틀링 함수
 *
 * 일정 시간 동안 한 번만 실행되도록 제한합니다.
 * 스크롤 이벤트 등에 사용됩니다.
 *
 * @param func - 실행할 함수
 * @param wait - 제한 시간 (밀리초)
 * @returns 스로틀링된 함수
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, wait);
    }
  };
}

// ========================
// 거리 & 시간 포맷팅
// ========================

/**
 * 미터를 사람이 읽기 쉬운 형식으로 변환
 *
 * @param meters - 거리 (미터)
 * @returns 포맷팅된 문자열
 *
 * @example
 * formatDistance(450)     // => '450m'
 * formatDistance(1234)    // => '1.2km'
 * formatDistance(12345)   // => '12.3km'
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

/**
 * 초를 사람이 읽기 쉬운 형식으로 변환
 *
 * @param seconds - 시간 (초)
 * @returns 포맷팅된 문자열
 *
 * @example
 * formatDuration(45)      // => '45초'
 * formatDuration(125)     // => '2분 5초'
 * formatDuration(3600)    // => '1시간'
 * formatDuration(3665)    // => '1시간 1분'
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts: string[] = [];

  if (hours > 0) {
    parts.push(`${hours}시간`);
  }
  if (mins > 0) {
    parts.push(`${mins}분`);
  }
  if (secs > 0 && hours === 0) {
    // 시간이 없을 때만 초 표시
    parts.push(`${secs}초`);
  }

  return parts.length > 0 ? parts.join(' ') : '0초';
}

/**
 * 이탈 거리/시간을 증감 표시로 포맷팅
 *
 * @param distance - 증가 거리 (미터)
 * @param duration - 증가 시간 (초)
 * @returns 포맷팅된 문자열
 *
 * @example
 * formatDetourInfo(450, 120)  // => '+450m / +2분'
 * formatDetourInfo(1200, 180) // => '+1.2km / +3분'
 */
export function formatDetourInfo(distance: number, duration: number): string {
  const distStr = distance >= 0 ? `+${formatDistance(distance)}` : formatDistance(distance);
  const durStr = duration >= 0 ? `+${formatDuration(duration)}` : formatDuration(duration);
  return `${distStr} / ${durStr}`;
}

// ========================
// URL & 쿼리 파라미터
// ========================

/**
 * URL 쿼리 파라미터에서 경로 정보 파싱
 *
 * 공유된 URL에서 경로 정보를 추출합니다.
 *
 * @param url - 파싱할 URL
 * @returns 파싱된 경로 정보 또는 null
 *
 * @example
 * const params = parseRouteParams(
 *   'https://example.com/?start=37.5663,126.9779&end=37.4979,127.0276&category=다이소'
 * );
 * // => { start: '37.5663,126.9779', end: '37.4979,127.0276', category: '다이소' }
 */
export function parseRouteParams(url: string): {
  start?: string;
  end?: string;
  category?: string;
} | null {
  try {
    const urlObj = new URL(url);
    const params = new URLSearchParams(urlObj.search);

    return {
      start: params.get('start') || undefined,
      end: params.get('end') || undefined,
      category: params.get('category') || undefined,
    };
  } catch {
    return null;
  }
}

/**
 * 경로 정보를 공유 가능한 URL로 변환
 *
 * @param baseUrl - 기본 URL
 * @param params - 경로 파라미터
 * @returns 공유 가능한 URL
 *
 * @example
 * const shareUrl = buildShareUrl('https://midwayder.com', {
 *   start: { lat: 37.5663, lng: 126.9779 },
 *   end: { lat: 37.4979, lng: 127.0276 },
 *   category: '다이소'
 * });
 * // => 'https://midwayder.com/?start=37.5663,126.9779&end=37.4979,127.0276&category=다이소'
 */
export function buildShareUrl(
  baseUrl: string,
  params: {
    start?: Coordinates;
    end?: Coordinates;
    category?: string;
  }
): string {
  const searchParams = new URLSearchParams();

  if (params.start) {
    searchParams.set('start', `${params.start.lat},${params.start.lng}`);
  }
  if (params.end) {
    searchParams.set('end', `${params.end.lat},${params.end.lng}`);
  }
  if (params.category) {
    searchParams.set('category', params.category);
  }

  return `${baseUrl}?${searchParams.toString()}`;
}

// ========================
// 좌표 변환 & 검증
// ========================

/**
 * 문자열 좌표를 Coordinates 객체로 변환
 *
 * @param coordStr - 좌표 문자열 (형식: "lat,lng")
 * @returns Coordinates 객체 또는 null
 *
 * @example
 * parseCoordinates('37.5663,126.9779')
 * // => { lat: 37.5663, lng: 126.9779 }
 */
export function parseCoordinates(coordStr: string): Coordinates | null {
  try {
    const [lat, lng] = coordStr.split(',').map(Number);
    if (isNaN(lat) || isNaN(lng)) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

/**
 * 좌표 유효성 검증
 *
 * @param coords - 검증할 좌표
 * @returns 유효 여부
 */
export function isValidCoordinates(coords: Coordinates): boolean {
  return (
    typeof coords.lat === 'number' &&
    typeof coords.lng === 'number' &&
    coords.lat >= -90 &&
    coords.lat <= 90 &&
    coords.lng >= -180 &&
    coords.lng <= 180
  );
}

/**
 * Haversine 공식을 사용한 두 좌표 간 거리 계산 (미터)
 *
 * 지구를 완전한 구로 가정하므로 오차가 있을 수 있습니다 (±0.3%).
 *
 * @param p1 - 첫 번째 좌표
 * @param p2 - 두 번째 좌표
 * @returns 거리 (미터)
 *
 * @example
 * const distance = haversineDistance(
 *   { lat: 37.5663, lng: 126.9779 },  // 서울시청
 *   { lat: 37.4979, lng: 127.0276 }   // 강남역
 * );
 * // => ~10500 (약 10.5km)
 */
export function haversineDistance(p1: Coordinates, p2: Coordinates): number {
  const R = 6371e3; // 지구 반지름 (미터)
  const φ1 = (p1.lat * Math.PI) / 180;
  const φ2 = (p2.lat * Math.PI) / 180;
  const Δφ = ((p2.lat - p1.lat) * Math.PI) / 180;
  const Δλ = ((p2.lng - p1.lng) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// ========================
// 날짜 & 시간
// ========================

/**
 * 상대 시간 포맷팅
 *
 * @param date - 포맷팅할 날짜
 * @returns 상대 시간 문자열
 *
 * @example
 * formatRelativeTime(new Date(Date.now() - 1000 * 60))     // => '1분 전'
 * formatRelativeTime(new Date(Date.now() - 1000 * 60 * 60)) // => '1시간 전'
 * formatRelativeTime(new Date(Date.now() - 1000 * 60 * 60 * 24)) // => '1일 전'
 */
export function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}일 전`;
  if (hours > 0) return `${hours}시간 전`;
  if (minutes > 0) return `${minutes}분 전`;
  return `${seconds}초 전`;
}

// ========================
// 배열 & 객체
// ========================

/**
 * 배열을 청크로 분할
 *
 * @param array - 분할할 배열
 * @param size - 청크 크기
 * @returns 청크 배열
 *
 * @example
 * chunk([1, 2, 3, 4, 5], 2)
 * // => [[1, 2], [3, 4], [5]]
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * 배열 중복 제거 (고유 값만)
 *
 * @param array - 중복 제거할 배열
 * @param key - 비교 키 (객체 배열인 경우)
 * @returns 중복 제거된 배열
 *
 * @example
 * unique([1, 2, 2, 3, 3, 4])
 * // => [1, 2, 3, 4]
 *
 * unique([{id: 1}, {id: 2}, {id: 1}], 'id')
 * // => [{id: 1}, {id: 2}]
 */
export function unique<T>(array: T[], key?: keyof T): T[] {
  if (!key) {
    return Array.from(new Set(array));
  }

  const seen = new Set();
  return array.filter(item => {
    const value = item[key];
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

// ========================
// 에러 처리
// ========================

/**
 * 에러 객체를 문자열 메시지로 변환
 *
 * @param error - 에러 객체
 * @returns 에러 메시지
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return '알 수 없는 오류가 발생했습니다.';
}

/**
 * 안전하게 JSON 파싱
 *
 * @param json - JSON 문자열
 * @param fallback - 파싱 실패 시 반환값
 * @returns 파싱된 객체 또는 fallback
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

// ========================
// 로컬 스토리지 (브라우저 전용)
// ========================

/**
 * 로컬 스토리지에 안전하게 저장
 *
 * @param key - 저장 키
 * @param value - 저장할 값
 */
export function setLocalStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
}

/**
 * 로컬 스토리지에서 안전하게 불러오기
 *
 * @param key - 저장 키
 * @param fallback - 불러오기 실패 시 반환값
 * @returns 저장된 값 또는 fallback
 */
export function getLocalStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const item = window.localStorage.getItem(key);
    return item ? (JSON.parse(item) as T) : fallback;
  } catch (error) {
    console.error('Failed to load from localStorage:', error);
    return fallback;
  }
}

// ========================
// 개발 환경 유틸리티
// ========================

/**
 * 현재 개발 환경인지 확인
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * 현재 프로덕션 환경인지 확인
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * 개발 환경에서만 콘솔 로그 출력
 *
 * @param args - 로그 인자
 */
export function devLog(...args: any[]): void {
  if (isDevelopment()) {
    console.log('[DEV]', ...args);
  }
}
