/**
 * 공유 URL 생성 및 Web Share API 유틸리티
 */

import { logger } from '@/lib/logger';

export interface ShareParams {
  start: string;
  end: string;
  category: string;
  waypointId?: string;
}

export function generateShareUrl(params: ShareParams): string {
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  const url = new URL('/share', base);
  url.searchParams.set('from', params.start);
  url.searchParams.set('to', params.end);
  url.searchParams.set('category', params.category);
  if (params.waypointId) {
    url.searchParams.set('waypoint', params.waypointId);
  }
  return url.toString();
}

export async function shareUrl(params: {
  url: string;
  title: string;
  text: string;
}): Promise<boolean> {
  // Web Share API 지원 확인
  if (navigator.share) {
    try {
      await navigator.share({
        title: params.title,
        text: params.text,
        url: params.url,
      });
      return true;
    } catch (err) {
      // 사용자가 공유 취소한 경우 무시
      if ((err as Error).name === 'AbortError') {
        return false;
      }
      logger.error('Share failed:', err);
      return false;
    }
  }

  // Fallback: 클립보드 복사
  try {
    await navigator.clipboard.writeText(params.url);
    return true;
  } catch (err) {
    logger.error('Clipboard write failed:', err);
    return false;
  }
}
