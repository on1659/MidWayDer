/**
 * Smart Category - 시간대 기반 카테고리 스마트 제안
 *
 * 현재 시각에 맞는 카테고리를 2-3개 추천합니다.
 * CategorySelect의 query 값과 일치하는 category 필드를 반환합니다.
 */

export interface CategoryHint {
  /** CategorySelect categories 배열의 query 값과 일치 */
  category: string;
  emoji: string;
  label: string;
  reason: string;
}

/**
 * 현재 시각 기반으로 카테고리 힌트 2개를 반환합니다.
 *
 * @returns 시간대에 맞는 카테고리 힌트 배열 (2개), 해당 없으면 빈 배열
 */
export function getTimeBasedCategoryHints(): CategoryHint[] {
  const hour = new Date().getHours();

  // 이른 아침 (6-9시): 출근 전 모닝 커피
  if (hour >= 6 && hour < 10) {
    return [
      { category: '스타벅스', emoji: '☕', label: '스타벅스', reason: '출근 전 모닝 커피' },
      { category: '카페', emoji: '🏠', label: '동네 카페', reason: '단골 카페 들르기' },
    ];
  }

  // 오전 (10-12시): 오전 중 심부름
  if (hour >= 10 && hour < 12) {
    return [
      { category: '다이소', emoji: '🛒', label: '다이소', reason: '오전에 생필품 픽업' },
      { category: '올리브영', emoji: '💄', label: '올리브영', reason: '오전 여유롭게 쇼핑' },
    ];
  }

  // 점심 (12-14시): 점심 후 간식
  if (hour >= 12 && hour < 14) {
    return [
      { category: 'CU', emoji: '🍱', label: '편의점', reason: '점심 후 간식 · 음료' },
      { category: '카페', emoji: '☕', label: '카페', reason: '점심 후 커피 한 잔' },
    ];
  }

  // 오후 (14-17시): 오후 커피 타임
  if (hour >= 14 && hour < 17) {
    return [
      { category: '스타벅스', emoji: '⭐', label: '스타벅스', reason: '오후 커피 브레이크' },
      { category: '이디야', emoji: '🏠', label: '이디야', reason: '가성비 오후 커피' },
    ];
  }

  // 퇴근 (17-20시): 퇴근길 장보기
  if (hour >= 17 && hour < 20) {
    return [
      { category: '다이소', emoji: '🛍️', label: '다이소', reason: '퇴근길 생필품 쇼핑' },
      { category: 'CU', emoji: '🏪', label: '편의점', reason: '퇴근 후 간단한 장보기' },
    ];
  }

  // 저녁 (20-24시): 야식 · 편의점
  if (hour >= 20) {
    return [
      { category: 'CU', emoji: '🌙', label: '편의점', reason: '야식 · 야간 편의점' },
      { category: '주유소', emoji: '⛽', label: '주유소', reason: '저녁 주유 타이밍' },
    ];
  }

  return [];
}

/**
 * 현재 시각에 맞는 인사말을 반환합니다.
 */
export function getTimeGreeting(): string {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 10) return '좋은 아침이에요 🌅';
  if (hour >= 10 && hour < 12) return '오전이 지나가고 있어요 ☀️';
  if (hour >= 12 && hour < 14) return '점심 시간이에요 🍱';
  if (hour >= 14 && hour < 18) return '오후가 한창이에요 ☕';
  if (hour >= 18 && hour < 21) return '퇴근 시간이에요 🌇';
  return '저녁이 깊어가네요 🌙';
}
