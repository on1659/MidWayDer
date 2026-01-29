/**
 * Naver Maps API 클라이언트
 *
 * Axios 인스턴스 + Retry 로직을 포함한 HTTP 클라이언트입니다.
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

// ========================
// 상수
// ========================

/** Naver Cloud Platform API Base URL */
const NAVER_API_BASE_URL = 'https://naveropenapi.apigw.ntruss.com';

/** 최대 재시도 횟수 */
const MAX_RETRIES = 3;

/** 재시도 대기 시간 (밀리초) */
const RETRY_DELAY = 1000; // 1초

/** 요청 타임아웃 (밀리초) */
const REQUEST_TIMEOUT = 10000; // 10초

// ========================
// Axios 인스턴스
// ========================

/**
 * Naver Maps API용 Axios 클라이언트
 *
 * - 환경 변수에서 API 키 로드
 * - 자동 Retry 로직 적용
 * - 타임아웃 설정
 */
export const naverMapsClient: AxiosInstance = axios.create({
  baseURL: NAVER_API_BASE_URL,
  timeout: REQUEST_TIMEOUT,
});

// 런타임에 환경변수를 읽도록 인터셉터 사용
naverMapsClient.interceptors.request.use((config) => {
  config.headers['X-NCP-APIGW-API-KEY-ID'] = process.env.NAVER_MAPS_CLIENT_ID || '';
  config.headers['X-NCP-APIGW-API-KEY'] = process.env.NAVER_MAPS_CLIENT_SECRET || '';
  return config;
});

// ========================
// Retry 인터셉터
// ========================

/**
 * 재시도 가능 여부 판단
 *
 * 다음 경우에만 재시도:
 * - 네트워크 오류 (response가 없는 경우)
 * - 5xx 서버 에러
 *
 * 재시도 안함:
 * - 4xx 클라이언트 에러 (잘못된 요청, 인증 실패 등)
 * - 타임아웃 에러 (이미 최대 시간 대기했으므로)
 */
function shouldRetryRequest(error: AxiosError): boolean {
  // 응답이 없는 경우 (네트워크 오류)
  if (!error.response) {
    return true;
  }

  // 5xx 서버 에러
  if (error.response.status >= 500 && error.response.status < 600) {
    return true;
  }

  // 429 Too Many Requests (Rate Limit)
  if (error.response.status === 429) {
    return true;
  }

  return false;
}

/**
 * Response 인터셉터: 실패 시 자동 재시도
 */
naverMapsClient.interceptors.response.use(
  // 성공 응답은 그대로 반환
  (response) => response,

  // 에러 발생 시 재시도 로직
  async (error: AxiosError) => {
    const config = error.config as InternalAxiosRequestConfig & { retryCount?: number };

    // config가 없으면 재시도 불가
    if (!config) {
      return Promise.reject(error);
    }

    // Retry 카운터 초기화
    if (!config.retryCount) {
      config.retryCount = 0;
    }

    // 재시도 가능 여부 확인
    const canRetry = shouldRetryRequest(error);

    if (canRetry && config.retryCount < MAX_RETRIES) {
      config.retryCount += 1;

      // 지수 백오프 (1초, 2초, 3초)
      const delay = RETRY_DELAY * config.retryCount;

      console.warn(
        `[Naver API] Retry ${config.retryCount}/${MAX_RETRIES} after ${delay}ms - ${error.message}`
      );

      await new Promise((resolve) => setTimeout(resolve, delay));

      // 재시도
      return naverMapsClient(config);
    }

    // 재시도 불가 또는 최대 재시도 횟수 초과
    console.error(`[Naver API] Request failed after ${config.retryCount} retries:`, {
      url: config.url,
      method: config.method,
      status: error.response?.status,
      message: error.message,
    });

    return Promise.reject(error);
  }
);

// ========================
// Request 인터셉터 (디버깅용)
// ========================


// ========================
// 유틸리티 함수
// ========================

/**
 * API 에러 메시지 추출
 */
export function extractErrorMessage(error: any): string {
  if (error.response?.data?.errorMessage) {
    return error.response.data.errorMessage;
  }

  if (error.response?.data?.message) {
    return error.response.data.message;
  }

  if (error.message) {
    return error.message;
  }

  return 'Unknown error';
}

/**
 * HTTP 상태 코드별 에러 메시지
 */
export function getErrorMessageByStatus(status: number): string {
  switch (status) {
    case 400:
      return '잘못된 요청입니다. 입력값을 확인해주세요.';
    case 401:
      return 'API 인증에 실패했습니다. API 키를 확인해주세요.';
    case 403:
      return 'API 접근 권한이 없습니다.';
    case 404:
      return '요청한 리소스를 찾을 수 없습니다.';
    case 429:
      return 'API 호출 한도를 초과했습니다. 잠시 후 다시 시도해주세요.';
    case 500:
      return 'Naver API 서버 오류가 발생했습니다.';
    case 503:
      return 'Naver API 서비스를 사용할 수 없습니다. 잠시 후 다시 시도해주세요.';
    default:
      return `API 요청 실패 (HTTP ${status})`;
  }
}
