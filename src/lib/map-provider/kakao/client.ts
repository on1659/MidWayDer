/**
 * Kakao Maps API 클라이언트
 *
 * Axios 인스턴스 + Retry 로직을 포함한 HTTP 클라이언트입니다.
 * - kakaoLocalClient: Kakao Local API (검색, 지오코딩)
 * - kakaoNaviClient: Kakao Mobility Navi API (경로 조회)
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

// ========================
// 상수
// ========================

/** Kakao Local API Base URL */
const KAKAO_LOCAL_BASE_URL = 'https://dapi.kakao.com';

/** Kakao Mobility Navi API Base URL */
const KAKAO_NAVI_BASE_URL = 'https://apis-navi.kakaomobility.com';

/** 최대 재시도 횟수 */
const MAX_RETRIES = 3;

/** 재시도 대기 시간 (밀리초) */
const RETRY_DELAY = 1000;

/** 요청 타임아웃 (밀리초) */
const REQUEST_TIMEOUT = 10000;

// ========================
// Retry 인터셉터 (공통)
// ========================

/**
 * 재시도 가능 여부 판단
 */
function shouldRetryRequest(error: AxiosError): boolean {
  if (!error.response) return true;
  if (error.response.status >= 500 && error.response.status < 600) return true;
  if (error.response.status === 429) return true;
  return false;
}

/**
 * Axios 인스턴스에 Retry 인터셉터를 추가합니다.
 */
function addRetryInterceptor(client: AxiosInstance, name: string): void {
  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const config = error.config as InternalAxiosRequestConfig & { retryCount?: number };
      if (!config) return Promise.reject(error);

      if (!config.retryCount) config.retryCount = 0;

      if (shouldRetryRequest(error) && config.retryCount < MAX_RETRIES) {
        config.retryCount += 1;
        const delay = RETRY_DELAY * config.retryCount;
        console.warn(`[${name}] Retry ${config.retryCount}/${MAX_RETRIES} after ${delay}ms - ${error.message}`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return client(config);
      }

      console.error(`[${name}] Request failed after ${config.retryCount} retries:`, {
        url: config.url,
        method: config.method,
        status: error.response?.status,
        message: error.message,
      });

      return Promise.reject(error);
    }
  );
}

// ========================
// Kakao Local API 클라이언트
// ========================

/**
 * Kakao Local API용 Axios 클라이언트
 * (검색, 지오코딩)
 */
export const kakaoLocalClient: AxiosInstance = axios.create({
  baseURL: KAKAO_LOCAL_BASE_URL,
  timeout: REQUEST_TIMEOUT,
});

// 런타임에 환경변수 읽기
kakaoLocalClient.interceptors.request.use((config) => {
  config.headers['Authorization'] = `KakaoAK ${process.env.KAKAO_REST_API_KEY || ''}`;
  return config;
});

addRetryInterceptor(kakaoLocalClient, 'Kakao Local');

// ========================
// Kakao Mobility Navi API 클라이언트
// ========================

/**
 * Kakao Mobility Navi API용 Axios 클라이언트
 * (경로 조회)
 */
export const kakaoNaviClient: AxiosInstance = axios.create({
  baseURL: KAKAO_NAVI_BASE_URL,
  timeout: REQUEST_TIMEOUT,
});

// 런타임에 환경변수 읽기
kakaoNaviClient.interceptors.request.use((config) => {
  config.headers['Authorization'] = `KakaoAK ${process.env.KAKAO_REST_API_KEY || ''}`;
  return config;
});

addRetryInterceptor(kakaoNaviClient, 'Kakao Navi');

// ========================
// 유틸리티 함수
// ========================

/**
 * API 에러 메시지 추출
 */
export function extractKakaoErrorMessage(error: any): string {
  if (error.response?.data?.message) return error.response.data.message;
  if (error.message) return error.message;
  return 'Unknown error';
}
