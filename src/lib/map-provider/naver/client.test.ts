import { describe, it, expect } from 'vitest';
import { extractErrorMessage, getErrorMessageByStatus } from './client';

describe('Naver Client Utilities', () => {
  describe('extractErrorMessage', () => {
    it('should extract message from response.data.errorMessage', () => {
      const error = {
        response: {
          data: {
            errorMessage: 'API Error Message',
          },
        },
      };
      expect(extractErrorMessage(error)).toBe('API Error Message');
    });

    it('should extract message from response.data.message', () => {
      const error = {
        response: {
          data: {
            message: 'Generic Error Message',
          },
        },
      };
      expect(extractErrorMessage(error)).toBe('Generic Error Message');
    });

    it('should extract message from error.message', () => {
      const error = {
        message: 'Network Error',
      };
      expect(extractErrorMessage(error)).toBe('Network Error');
    });

    it('should return default message for unknown error', () => {
      expect(extractErrorMessage(null)).toBe('Unknown error');
      expect(extractErrorMessage(undefined)).toBe('Unknown error');
      expect(extractErrorMessage('string error')).toBe('Unknown error');
    });

    it('should handle nested error objects', () => {
      const error = {
        response: {
          data: {
            errorMessage: 'Naver API Limit Exceeded',
            code: 429,
          },
          status: 429,
        },
      };
      expect(extractErrorMessage(error)).toBe('Naver API Limit Exceeded');
    });
  });

  describe('getErrorMessageByStatus', () => {
    it('should return correct message for 400', () => {
      expect(getErrorMessageByStatus(400)).toBe('잘못된 요청입니다. 입력값을 확인해주세요.');
    });

    it('should return correct message for 401', () => {
      expect(getErrorMessageByStatus(401)).toBe('API 인증에 실패했습니다. API 키를 확인해주세요.');
    });

    it('should return correct message for 403', () => {
      expect(getErrorMessageByStatus(403)).toBe('API 접근 권한이 없습니다.');
    });

    it('should return correct message for 404', () => {
      expect(getErrorMessageByStatus(404)).toBe('요청한 리소스를 찾을 수 없습니다.');
    });

    it('should return correct message for 429', () => {
      expect(getErrorMessageByStatus(429)).toBe('API 호출 한도를 초과했습니다. 잠시 후 다시 시도해주세요.');
    });

    it('should return correct message for 500', () => {
      expect(getErrorMessageByStatus(500)).toBe('Naver API 서버 오류가 발생했습니다.');
    });

    it('should return correct message for 503', () => {
      expect(getErrorMessageByStatus(503)).toBe('Naver API 서비스를 사용할 수 없습니다. 잠시 후 다시 시도해주세요.');
    });

    it('should return generic message for unknown status', () => {
      expect(getErrorMessageByStatus(418)).toBe('API 요청 실패 (HTTP 418)');
      expect(getErrorMessageByStatus(999)).toBe('API 요청 실패 (HTTP 999)');
    });
  });
});
