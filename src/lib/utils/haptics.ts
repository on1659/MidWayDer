/**
 * 햅틱 피드백 유틸리티
 * Navigator.vibrate() API 사용
 */

export const haptic = {
  /** 가벼운 진동 (버튼 탭) */
  light: () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10);
    }
  },

  /** 중간 진동 (중요 액션) */
  medium: () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(20);
    }
  },

  /** 강한 진동 (성공/완료) */
  heavy: () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(30);
    }
  },

  /** 성공 패턴 (짧-짧) */
  success: () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([10, 50, 10]);
    }
  },

  /** 에러 패턴 (긴 진동) */
  error: () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(50);
    }
  },
};
