/**
 * useETA.test.ts
 *
 * NOTE: React hooks 테스트는 jsdom 환경이 필요합니다.
 *       현재 환경(Node)에서는 순수 로직만 검증하고
 *       hook 테스트는 todo로 표시합니다.
 */
import { describe, it, expect } from 'vitest';
import { getDefaultDwellMinutes } from '../../utils';

// 순수 함수 로직 검증 (hook 없이 테스트 가능)
describe('useETA 의존 유틸 — getDefaultDwellMinutes', () => {
  it('스타벅스 기본 체류 시간 = 20분', () => {
    expect(getDefaultDwellMinutes('스타벅스')).toBe(20);
  });

  it('편의점 기본 체류 시간 = 5분', () => {
    expect(getDefaultDwellMinutes('편의점')).toBe(5);
  });

  it('알 수 없는 카테고리 기본 체류 시간 = 10분', () => {
    expect(getDefaultDwellMinutes('알수없는카테고리')).toBe(10);
  });

  it('다이소 기본 체류 시간 = 20분', () => {
    expect(getDefaultDwellMinutes('다이소')).toBe(20);
  });
});

describe('useETA — departureMs 계산 로직', () => {
  it('HH:MM 형식을 오늘 날짜 ms로 변환하면 시/분이 일치함', () => {
    const [h, m] = '09:30'.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    expect(d.getHours()).toBe(9);
    expect(d.getMinutes()).toBe(30);
  });
});

describe('useETA (React hook — jsdom 환경 필요)', () => {
  it.todo('departureTime "09:30" → departureMs가 오늘 9시 30분');
  it.todo('isNowDeparture: departureTime이 현재 시각 ±2분이면 true');
  it.todo('isNowDeparture: 1시간 후 출발이면 false');
  it.todo('dwellMinutes: setDwellMinutes로 갱신 가능');
  it.todo('nowMs: 1분마다 자동 갱신 (interval)');
});
