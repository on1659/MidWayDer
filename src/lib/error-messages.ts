/**
 * Error Messages - 사용자 친화적 에러 메시지
 */

export const ERROR_MESSAGES = {
  // GPS 관련
  GPS_DENIED: '위치 권한이 거부되었습니다. 브라우저 설정에서 위치 정보 허용으로 변경해주세요.',
  GPS_UNAVAILABLE: '위치 정보를 사용할 수 없습니다. GPS가 켜져 있는지 확인하거나, 주소를 직접 입력해주세요.',
  GPS_TIMEOUT: '위치 확인 시간이 초과되었습니다. 다시 시도해주세요.',
  
  // 네트워크 관련
  NETWORK_ERROR: '인터넷 연결을 확인해주세요',
  TIMEOUT: '요청 시간이 초과되었어요. 다시 시도해주세요',
  
  // API 관련
  ROUTE_NOT_FOUND: '경로를 찾을 수 없어요. 출발지와 도착지를 확인해주세요',
  NO_PLACES_FOUND: '주변에 매장이 없어요. 다른 카테고리를 선택해보세요',
  API_ERROR: '일시적인 오류가 발생했어요. 잠시 후 다시 시도해주세요',
  API_KEY_INVALID: '서비스에 문제가 발생했어요. 관리자에게 문의해주세요',
  
  // 입력 관련
  INVALID_ADDRESS: '주소 형식이 올바르지 않아요',
  SAME_LOCATION: '출발지와 도착지가 같아요. 다른 위치를 선택해주세요',
  
  // 일반
  UNKNOWN_ERROR: '알 수 없는 오류가 발생했어요. 다시 시도해주세요',
} as const;

export type ErrorMessageKey = keyof typeof ERROR_MESSAGES;

/**
 * GeolocationPositionError 코드를 사용자 친화적 메시지로 변환
 */
export function getGPSErrorMessage(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return ERROR_MESSAGES.GPS_DENIED;
    case error.POSITION_UNAVAILABLE:
      return ERROR_MESSAGES.GPS_UNAVAILABLE;
    case error.TIMEOUT:
      return ERROR_MESSAGES.GPS_TIMEOUT;
    default:
      return ERROR_MESSAGES.GPS_UNAVAILABLE;
  }
}

/**
 * API 에러 응답을 사용자 친화적 메시지로 변환
 */
export function getAPIErrorMessage(status?: number, message?: string): string {
  // 특정 메시지 패턴 매칭
  if (message?.includes('route') || message?.includes('경로')) {
    return ERROR_MESSAGES.ROUTE_NOT_FOUND;
  }
  if (message?.includes('place') || message?.includes('매장')) {
    return ERROR_MESSAGES.NO_PLACES_FOUND;
  }
  if (message?.includes('key') || message?.includes('token')) {
    return ERROR_MESSAGES.API_KEY_INVALID;
  }
  
  // HTTP 상태 코드 기반
  if (status === 401 || status === 403) {
    return ERROR_MESSAGES.API_KEY_INVALID;
  }
  if (status === 404) {
    return ERROR_MESSAGES.ROUTE_NOT_FOUND;
  }
  if (status === 408 || status === 504) {
    return ERROR_MESSAGES.TIMEOUT;
  }
  if (status && status >= 500) {
    return ERROR_MESSAGES.API_ERROR;
  }
  
  // 네트워크 에러
  if (!status) {
    return ERROR_MESSAGES.NETWORK_ERROR;
  }
  
  return ERROR_MESSAGES.UNKNOWN_ERROR;
}
