/**
 * Business Hours Utility
 * 영업시간 파싱 및 현재 영업 상태 판별
 */

interface BusinessHoursStatus {
  isOpen: boolean;
  label: string;
  emoji: string;
  color: string;
}

/**
 * 영업시간 문자열을 파싱하여 현재 영업 중인지 판별
 * 
 * @param businessHours - "09:00~22:00" 또는 "영업시간 09:00~22:00" 형식
 * @returns 영업 상태 정보
 * 
 * @example
 * getBusinessStatus("09:00~22:00") // { isOpen: true, label: "영업 중", emoji: "🟢", color: "#10b981" }
 * getBusinessStatus("영업종료") // { isOpen: false, label: "영업 종료", emoji: "🔴", color: "#ef4444" }
 */
export function getBusinessStatus(businessHours: string | undefined): BusinessHoursStatus {
  if (!businessHours) {
    return {
      isOpen: false,
      label: '정보 없음',
      emoji: '⚪',
      color: '#9ca3af',
    };
  }

  // "영업종료", "휴무" 등 명시적 상태
  const closedKeywords = ['영업종료', '휴무', '휴점', '폐점', '준비중'];
  if (closedKeywords.some(keyword => businessHours.includes(keyword))) {
    return {
      isOpen: false,
      label: '영업 종료',
      emoji: '🔴',
      color: '#ef4444',
    };
  }

  // 24시간 영업
  if (businessHours.includes('24시간') || businessHours.includes('24hours')) {
    return {
      isOpen: true,
      label: '24시간 영업',
      emoji: '🟢',
      color: '#10b981',
    };
  }

  // 시간 범위 추출 (예: "09:00~22:00", "오전 9시 ~ 오후 10시")
  const timeRangeRegex = /(\d{1,2}):?(\d{2})?\s*[~-]\s*(\d{1,2}):?(\d{2})?/;
  const match = businessHours.match(timeRangeRegex);

  if (!match) {
    // 파싱 실패 시 정보 없음으로 처리
    return {
      isOpen: false,
      label: '정보 없음',
      emoji: '⚪',
      color: '#9ca3af',
    };
  }

  // 현재 시각 (서울 시간)
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour * 60 + currentMinute;

  // 시작 시간
  const startHour = parseInt(match[1], 10);
  const startMinute = match[2] ? parseInt(match[2], 10) : 0;
  const startTime = startHour * 60 + startMinute;

  // 종료 시간
  const endHour = parseInt(match[3], 10);
  const endMinute = match[4] ? parseInt(match[4], 10) : 0;
  let endTime = endHour * 60 + endMinute;

  // 자정 넘어가는 경우 (예: 22:00 ~ 02:00)
  if (endTime < startTime) {
    endTime += 24 * 60;
    // 현재 시각이 자정 이전이면 하루 더하기
    if (currentTime < startTime) {
      const adjustedCurrentTime = currentTime + 24 * 60;
      const isOpen = adjustedCurrentTime >= startTime && adjustedCurrentTime < endTime;
      return {
        isOpen,
        label: isOpen ? '영업 중' : '영업 종료',
        emoji: isOpen ? '🟢' : '🔴',
        color: isOpen ? '#10b981' : '#ef4444',
      };
    }
  }

  // 정상 범위 비교
  const isOpen = currentTime >= startTime && currentTime < endTime;

  return {
    isOpen,
    label: isOpen ? '영업 중' : '영업 종료',
    emoji: isOpen ? '🟢' : '🔴',
    color: isOpen ? '#10b981' : '#ef4444',
  };
}

/**
 * 영업 종료까지 남은 분 수 반환 (영업 중일 때만)
 * @returns 양수=남은 분, null=파싱 불가/24시간/이미 마감
 */
export function getMinutesUntilClose(businessHours: string | undefined): number | null {
  if (!businessHours) return null;
  if (businessHours.includes('24시간') || businessHours.includes('24hours')) return null;
  const closedKeywords = ['영업종료', '휴무', '휴점', '폐점', '준비중'];
  if (closedKeywords.some((k) => businessHours.includes(k))) return null;

  const timeRangeRegex = /(\d{1,2}):?(\d{2})?\s*[~-]\s*(\d{1,2}):?(\d{2})?/;
  const match = businessHours.match(timeRangeRegex);
  if (!match) return null;

  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  const startHour = parseInt(match[1], 10);
  const startMinute = match[2] ? parseInt(match[2], 10) : 0;
  const startTime = startHour * 60 + startMinute;

  const endHour = parseInt(match[3], 10);
  const endMinute = match[4] ? parseInt(match[4], 10) : 0;
  let endTime = endHour * 60 + endMinute;

  if (endTime < startTime) endTime += 24 * 60;

  const adjustedCurrent = currentTime < startTime ? currentTime + 24 * 60 : currentTime;
  const isOpen = adjustedCurrent >= startTime && adjustedCurrent < endTime;
  if (!isOpen) return null;

  return endTime - adjustedCurrent;
}

/**
 * 영업 시작까지 남은 분 수 반환 (영업 종료 상태일 때만)
 * @returns 양수=남은 분, null=파싱 불가/24시간/현재 영업 중
 */
export function getMinutesUntilOpen(businessHours: string | undefined): number | null {
  if (!businessHours) return null;
  if (businessHours.includes('24시간') || businessHours.includes('24hours')) return null;
  const closedKeywords = ['영업종료', '휴무', '휴점', '폐점', '준비중'];
  if (closedKeywords.some((k) => businessHours.includes(k))) return null;

  const timeRangeRegex = /(\d{1,2}):?(\d{2})?\s*[~-]\s*(\d{1,2}):?(\d{2})?/;
  const match = businessHours.match(timeRangeRegex);
  if (!match) return null;

  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  const startHour = parseInt(match[1], 10);
  const startMinute = match[2] ? parseInt(match[2], 10) : 0;
  const startTime = startHour * 60 + startMinute;

  const endHour = parseInt(match[3], 10);
  const endMinute = match[4] ? parseInt(match[4], 10) : 0;
  let endTime = endHour * 60 + endMinute;

  if (endTime < startTime) endTime += 24 * 60;

  const adjustedCurrent = currentTime < startTime ? currentTime + 24 * 60 : currentTime;
  const isOpen = adjustedCurrent >= startTime && adjustedCurrent < endTime;
  if (isOpen) return null;

  // 오늘 아직 오픈 전: startTime - currentTime
  if (currentTime < startTime) return startTime - currentTime;
  // 오늘 이미 마감: 다음날 오픈까지
  return startTime + 24 * 60 - currentTime;
}

/**
 * 영업시간 문자열을 사람이 읽기 쉬운 형식으로 포맷
 * 
 * @param businessHours - "09:00~22:00" 또는 복잡한 형식
 * @returns 정제된 영업시간 문자열
 * 
 * @example
 * formatBusinessHours("영업시간 09:00~22:00") // "09:00 ~ 22:00"
 * formatBusinessHours("24시간 운영") // "24시간 영업"
 */
export function formatBusinessHours(businessHours: string | undefined): string {
  if (!businessHours) return '정보 없음';

  // "영업시간" 등 불필요한 접두사 제거
  let formatted = businessHours
    .replace(/^영업시간\s*/i, '')
    .replace(/^운영시간\s*/i, '')
    .trim();

  // 24시간 영업
  if (formatted.includes('24시간') || formatted.includes('24hours')) {
    return '24시간 영업';
  }

  // 시간 범위 정규화 (~ 기호 통일)
  formatted = formatted.replace(/\s*[-~]\s*/g, ' ~ ');

  return formatted;
}

/**
 * 영업시간 문자열에서 시작/종료 분(분 단위) 반환 — 타임라인 시각화용
 *
 * @returns { startMin, endMin, is24h } | null
 *   - startMin: 0~1439 (자정=0, 09:00=540)
 *   - endMin: 0~1439+1440 (자정 넘어갈 경우 +1440)
 *   - is24h: 24시간 영업 여부
 */
export function getBusinessHoursRange(businessHours: string | undefined): {
  startMin: number;
  endMin: number;
  is24h: boolean;
} | null {
  if (!businessHours) return null;

  if (businessHours.includes('24시간') || businessHours.includes('24hours')) {
    return { startMin: 0, endMin: 24 * 60, is24h: true };
  }

  const closedKeywords = ['영업종료', '휴무', '휴점', '폐점', '준비중'];
  if (closedKeywords.some((k) => businessHours.includes(k))) return null;

  const timeRangeRegex = /(\d{1,2}):?(\d{2})?\s*[~-]\s*(\d{1,2}):?(\d{2})?/;
  const match = businessHours.match(timeRangeRegex);
  if (!match) return null;

  const startMin = parseInt(match[1], 10) * 60 + (match[2] ? parseInt(match[2], 10) : 0);
  const rawEndMin = parseInt(match[3], 10) * 60 + (match[4] ? parseInt(match[4], 10) : 0);
  const endMin = rawEndMin < startMin ? rawEndMin + 24 * 60 : rawEndMin;

  return { startMin, endMin, is24h: false };
}

/**
 * 영업시간 상세 정보 파싱 (요일별)
 * 
 * @param businessHours - 복합 영업시간 문자열
 * @returns 요일별 영업시간 객체
 * 
 * @example
 * parseDetailedBusinessHours("월-금 09:00~18:00 / 토 10:00~15:00 / 일 휴무")
 * // { weekday: "09:00 ~ 18:00", saturday: "10:00 ~ 15:00", sunday: "휴무" }
 */
export function parseDetailedBusinessHours(businessHours: string | undefined): Record<string, string> {
  if (!businessHours) return {};

  const result: Record<string, string> = {};

  // 패턴: "월-금 09:00~18:00"
  const weekdayMatch = businessHours.match(/(월[-~]금|평일)\s*(\d{1,2}:\d{2}\s*[~-]\s*\d{1,2}:\d{2})/);
  if (weekdayMatch) {
    result.weekday = formatBusinessHours(weekdayMatch[2]);
  }

  // 패턴: "토 10:00~15:00"
  const saturdayMatch = businessHours.match(/토(요일)?\s*(\d{1,2}:\d{2}\s*[~-]\s*\d{1,2}:\d{2}|휴무)/);
  if (saturdayMatch) {
    result.saturday = formatBusinessHours(saturdayMatch[2]);
  }

  // 패턴: "일 휴무"
  const sundayMatch = businessHours.match(/일(요일)?\s*(\d{1,2}:\d{2}\s*[~-]\s*\d{1,2}:\d{2}|휴무)/);
  if (sundayMatch) {
    result.sunday = formatBusinessHours(sundayMatch[2]);
  }

  return result;
}
