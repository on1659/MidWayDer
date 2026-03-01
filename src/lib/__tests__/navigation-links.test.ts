import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getKakaoNaviLink,
  getNaverMapLink,
  getTmapLink,
  getKakaoNaviLinkWithWaypoint,
  getPreferredNavApp,
  setPreferredNavApp,
} from '../navigation-links';

describe('getKakaoNaviLink', () => {
  it('kakaonavi:// 딥링크 생성', () => {
    const url = getKakaoNaviLink(37.566, 126.978, '서울시청');
    expect(url).toMatch(/^kakaonavi:\/\/navigate/);
    expect(url).toContain('epname=');
  });
});

describe('getNaverMapLink', () => {
  it('nmap:// 딥링크 생성', () => {
    const url = getNaverMapLink(37.498, 127.028, '강남역');
    expect(url).toMatch(/^nmap:\/\/place/);
    expect(url).toContain('lat=37.498');
  });
});

describe('getTmapLink', () => {
  it('tmap:// 딥링크 생성', () => {
    const url = getTmapLink(37.5, 127.0, '경유지');
    expect(url).toMatch(/^tmap:\/\/route/);
    expect(url).toContain('goalname=');
  });
});

describe('getKakaoNaviLinkWithWaypoint', () => {
  it('경유지 포함 딥링크 생성', () => {
    const url = getKakaoNaviLinkWithWaypoint(
      { lat: 37.566, lng: 126.978 },
      { lat: 37.5, lng: 127.0, name: '다이소' },
      { lat: 37.498, lng: 127.028 }
    );
    expect(url).toContain('wp=');
    expect(url).toContain('wpname=');
  });
});

describe('preferredNavApp localStorage', () => {
  let store: Record<string, string> = {};
  const mockStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  };

  beforeEach(() => {
    store = {};
    vi.stubGlobal('window', { localStorage: mockStorage });
    vi.stubGlobal('localStorage', mockStorage);
  });

  it('초기에는 null 반환', () => {
    expect(getPreferredNavApp()).toBeNull();
  });

  it('setPreferredNavApp → getPreferredNavApp으로 조회 가능', () => {
    setPreferredNavApp('kakao');
    expect(getPreferredNavApp()).toBe('kakao');
  });
});
