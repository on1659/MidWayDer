export interface RecommendationScore {
  category: string;
  frequencyScore: number;  // 0-40 points
  recencyScore: number;    // 0-30 points
  timeScore: number;       // 0-30 points
  totalScore: number;      // 0-100 points
}

export interface TimeSlot {
  name: string;
  startHour: number;
  endHour: number;
  categories: string[];
}

export const TIME_SLOTS: TimeSlot[] = [
  {
    name: 'morning',
    startHour: 6,
    endHour: 11,
    categories: ['스타벅스', '이디야', '커피빈', '베이커리', '빵집']
  },
  {
    name: 'lunch',
    startHour: 11,
    endHour: 14,
    categories: ['CU', '세븐일레븐', 'GS25', '패스트푸드', '편의점']
  },
  {
    name: 'dinner',
    startHour: 17,
    endHour: 20,
    categories: ['마트', '이마트', '홈플러스', '롯데마트', '식료품']
  },
  {
    name: 'night',
    startHour: 20,
    endHour: 24,
    categories: ['약국', 'CU', '세븐일레븐', 'GS25', '편의점']
  }
];

export interface RecommendationOptions {
  currentTime?: number; // hour (0-23)
  currentDay?: number;  // day of week (0-6)
  maxResults?: number;
}
