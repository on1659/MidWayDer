import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateShareUrl, shareUrl } from '../share';

describe('generateShareUrl', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { location: { origin: 'https://midwayder.up.railway.app' } });
  });

  it('기본 공유 URL 생성', () => {
    const url = generateShareUrl({ start: '서울시청', end: '강남역', category: '다이소' });
    expect(url).toContain('from=%EC%84%9C%EC%9A%B8%EC%8B%9C%EC%B2%AD');
    expect(url).toContain('category=%EB%8B%A4%EC%9D%B4%EC%86%8C');
  });

  it('waypointId 포함 시 URL에 반영', () => {
    const url = generateShareUrl({
      start: '서울역',
      end: '부산역',
      category: '카페',
      waypointId: 'wp-123',
    });
    expect(url).toContain('waypoint=wp-123');
  });

  it('waypointId 없으면 waypoint 파라미터 제외', () => {
    const url = generateShareUrl({ start: 'A', end: 'B', category: 'C' });
    expect(url).not.toContain('waypoint=');
  });
});

describe('shareUrl', () => {
  it('navigator.share 없을 때 클립보드 복사 시도', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', {
      clipboard: { writeText },
    });
    const result = await shareUrl({ url: 'https://example.com', title: '제목', text: '내용' });
    expect(writeText).toHaveBeenCalledWith('https://example.com');
    expect(result).toBe(true);
  });
});
