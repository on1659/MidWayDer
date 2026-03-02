'use client';

import { useState, useCallback } from 'react';

/**
 * 스크린 리더용 aria-live 알림 훅
 * 검색 결과, 에러, 로딩 상태 등을 음성으로 안내
 */
export function useA11yAnnounce() {
  const [message, setMessage] = useState('');

  const announce = useCallback((msg: string, delay = 100) => {
    // 약간의 지연을 두어 DOM 업데이트 후 알림
    setTimeout(() => setMessage(msg), delay);
    // 1초 후 메시지 초기화 (중복 알림 방지)
    setTimeout(() => setMessage(''), 1000);
  }, []);

  const announceResults = useCallback((count: number, category: string) => {
    announce(`${category} 검색 결과 ${count}개를 찾았습니다.`);
  }, [announce]);

  const announceError = useCallback((errorMsg: string) => {
    announce(`오류가 발생했습니다: ${errorMsg}`);
  }, [announce]);

  const announceLoading = useCallback(() => {
    announce('검색 중입니다.');
  }, [announce]);

  return {
    message,
    announce,
    announceResults,
    announceError,
    announceLoading,
  };
}
