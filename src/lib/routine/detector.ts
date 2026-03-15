/**
 * Routine Detector - 시간대/요일 기반 루틴 자동 감지
 * 
 * 사용 사례:
 * - 평일 아침 7-9시: 출근 경로 자동 활성화
 * - 평일 저녁 5-7시: 퇴근 경로 자동 활성화
 * - 주말 낮 10-18시: 주말 나들이 경로
 */

export type RoutineType = 'morning-commute' | 'evening-commute' | 'weekend-trip' | null;

/**
 * 현재 시간대/요일 기반으로 루틴 타입 감지
 * @param date - 테스트용 날짜 (기본값: 현재 시간)
 */
export function detectRoutine(date?: Date): RoutineType {
  const now = date ?? new Date();
  const hour = now.getHours();
  const day = now.getDay(); // 0=일, 1=월, ..., 6=토
  
  // 평일 (월~금)
  if (day >= 1 && day <= 5) {
    if (hour >= 7 && hour <= 9) return 'morning-commute';
    if (hour >= 17 && hour <= 19) return 'evening-commute';
  }
  
  // 주말 (토~일)
  if (day === 0 || day === 6) {
    if (hour >= 10 && hour <= 18) return 'weekend-trip';
  }
  
  return null;
}

/**
 * 루틴 타입 → 한글 라벨 변환
 */
export function getRoutineLabel(type: RoutineType): string {
  const labels: Record<NonNullable<RoutineType>, string> = {
    'morning-commute': '출근 경로',
    'evening-commute': '퇴근 경로',
    'weekend-trip': '주말 나들이',
  };
  return type ? labels[type] : '';
}

/**
 * 루틴 프롬프트를 표시해야 하는지 판단
 * 
 * 규칙:
 * - 같은 루틴에 대해 4시간에 한 번만 프롬프트
 * - 사용자가 거부하면 그날은 다시 안 물어봄
 */
export function shouldShowRoutinePrompt(type: RoutineType, lastPromptTime: number | null): boolean {
  if (!type) return false;
  if (!lastPromptTime) return true;
  
  // 4시간 = 14,400,000ms
  const fourHours = 4 * 60 * 60 * 1000;
  return Date.now() - lastPromptTime > fourHours;
}

/**
 * 루틴 프롬프트 타임스탬프 저장
 */
export function markRoutinePromptShown(type: RoutineType): void {
  if (!type) return;
  const key = `routine-prompt-${type}`;
  localStorage.setItem(key, Date.now().toString());
}

/**
 * 루틴 프롬프트 마지막 표시 시간 조회
 */
export function getLastPromptTime(type: RoutineType): number | null {
  if (!type) return null;
  const key = `routine-prompt-${type}`;
  const stored = localStorage.getItem(key);
  return stored ? parseInt(stored, 10) : null;
}
