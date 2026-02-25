/**
 * Category Icons - 카테고리별 이모지 매핑
 */

export const CATEGORY_ICONS: Record<string, string> = {
  '다이소': '🛒',
  '스타벅스': '☕',
  '이디야': '☕',
  '탐앤탐스': '☕',
  '커피빈': '☕',
  '빽다방': '☕',
  '메가커피': '☕',
  '할리스': '☕',
  'CU': '🏪',
  'GS25': '🏪',
  '세븐일레븐': '🏪',
  '이마트24': '🏪',
  '주유소': '⛽',
  '휴게소': '🚻',
  '맥도날드': '🍔',
  '버거킹': '🍔',
  '롯데리아': '🍔',
  'KFC': '🍗',
  '놀이터': '🎡',
  '공원': '🌳',
  '병원': '🏥',
  '약국': '💊',
  '은행': '🏦',
  '우체국': '📮',
};

/**
 * 카테고리에 해당하는 이모지 아이콘 반환
 * @param category - 카테고리 이름
 * @returns 이모지 문자열
 */
export const getCategoryIcon = (category: string): string => {
  return CATEGORY_ICONS[category] || '📍';
};
