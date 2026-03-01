import { describe, it, expect } from 'vitest';
import { getGPSErrorMessage, getAPIErrorMessage, ERROR_MESSAGES } from '../error-messages';

describe('getGPSErrorMessage', () => {
  it('PERMISSION_DENIED → GPS_DENIED 메시지', () => {
    const err = { code: 1, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3, message: '' } as GeolocationPositionError;
    expect(getGPSErrorMessage(err)).toBe(ERROR_MESSAGES.GPS_DENIED);
  });

  it('POSITION_UNAVAILABLE → GPS_UNAVAILABLE 메시지', () => {
    const err = { code: 2, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3, message: '' } as GeolocationPositionError;
    expect(getGPSErrorMessage(err)).toBe(ERROR_MESSAGES.GPS_UNAVAILABLE);
  });

  it('TIMEOUT → GPS_TIMEOUT 메시지', () => {
    const err = { code: 3, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3, message: '' } as GeolocationPositionError;
    expect(getGPSErrorMessage(err)).toBe(ERROR_MESSAGES.GPS_TIMEOUT);
  });
});

describe('getAPIErrorMessage', () => {
  it('status 401 → API_KEY_INVALID 메시지', () => {
    expect(getAPIErrorMessage(401)).toBe(ERROR_MESSAGES.API_KEY_INVALID);
  });

  it('status 404 → ROUTE_NOT_FOUND 메시지', () => {
    expect(getAPIErrorMessage(404)).toBe(ERROR_MESSAGES.ROUTE_NOT_FOUND);
  });

  it('status 500+ → API_ERROR 메시지', () => {
    expect(getAPIErrorMessage(500)).toBe(ERROR_MESSAGES.API_ERROR);
    expect(getAPIErrorMessage(503)).toBe(ERROR_MESSAGES.API_ERROR);
  });

  it('status 없음 → NETWORK_ERROR 메시지', () => {
    expect(getAPIErrorMessage(undefined)).toBe(ERROR_MESSAGES.NETWORK_ERROR);
  });
});
