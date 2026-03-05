/**
 * Error Fallback - 에러 발생 시 표시되는 UI
 */

'use client';

import { AlertCircle, Wifi, MapPin, Clock, AlertTriangle } from 'lucide-react';

interface ErrorFallbackProps {
  /** 에러 메시지 */
  error: string;
  /** 재시도 핸들러 (선택적) */
  onRetry?: () => void;
  /** 컴팩트 모드 (작은 공간에 표시) */
  compact?: boolean;
}

const ERROR_CONFIG: Record<string, {
  icon: typeof AlertCircle;
  title: string;
  description: string;
  action?: string;
  color: string;
}> = {
  'NETWORK_ERROR': {
    icon: Wifi,
    title: '인터넷 연결을 확인해주세요',
    description: '네트워크 연결이 불안정합니다',
    action: '다시 시도',
    color: 'orange',
  },
  'NO_RESULTS': {
    icon: MapPin,
    title: '검색 결과가 없어요',
    description: '다른 카테고리나 위치를 시도해보세요',
    action: '검색 조건 변경',
    color: 'blue',
  },
  'ROUTE_NOT_FOUND': {
    icon: MapPin,
    title: '경로를 찾을 수 없어요',
    description: '출발지와 도착지를 확인해주세요',
    action: '경로 다시 설정',
    color: 'yellow',
  },
  'API_LIMIT_EXCEEDED': {
    icon: Clock,
    title: '잠시 후 다시 시도해주세요',
    description: '일일 검색 한도에 도달했습니다',
    action: null,
    color: 'gray',
  },
  'SAME_LOCATION': {
    icon: AlertTriangle,
    title: '출발지와 도착지가 같아요',
    description: '다른 위치를 선택해주세요',
    action: '경로 변경',
    color: 'yellow',
  },
  'TOO_CLOSE': {
    icon: AlertTriangle,
    title: '출발지와 도착지가 너무 가까워요',
    description: '50m 이상 떨어진 위치를 선택해주세요',
    action: '경로 변경',
    color: 'yellow',
  },
  'TOO_FAR': {
    icon: AlertTriangle,
    title: '경로가 너무 멀어요',
    description: '500km 이내 경로만 검색할 수 있어요',
    action: '경로 변경',
    color: 'yellow',
  },
};

const COLOR_STYLES: Record<string, { bg: string; border: string; icon: string; text: string; button: string }> = {
  orange: {
    bg: 'bg-orange-50 dark:bg-orange-950/20',
    border: 'border-orange-200 dark:border-orange-800',
    icon: 'text-orange-500',
    text: 'text-orange-700 dark:text-orange-400',
    button: 'text-orange-600 dark:text-orange-500 hover:text-orange-700',
  },
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-950/20',
    border: 'border-blue-200 dark:border-blue-800',
    icon: 'text-blue-500',
    text: 'text-blue-700 dark:text-blue-400',
    button: 'text-blue-600 dark:text-blue-500 hover:text-blue-700',
  },
  yellow: {
    bg: 'bg-yellow-50 dark:bg-yellow-950/20',
    border: 'border-yellow-200 dark:border-yellow-800',
    icon: 'text-yellow-600',
    text: 'text-yellow-800 dark:text-yellow-400',
    button: 'text-yellow-700 dark:text-yellow-500 hover:text-yellow-800',
  },
  gray: {
    bg: 'bg-gray-50 dark:bg-gray-950/20',
    border: 'border-gray-200 dark:border-gray-800',
    icon: 'text-gray-500',
    text: 'text-gray-700 dark:text-gray-400',
    button: 'text-gray-600 dark:text-gray-500',
  },
  red: {
    bg: 'bg-red-50 dark:bg-red-950/20',
    border: 'border-red-200 dark:border-red-800',
    icon: 'text-red-500',
    text: 'text-red-700 dark:text-red-400',
    button: 'text-red-600 dark:text-red-500 hover:text-red-700',
  },
};

export default function ErrorFallback({ error, onRetry, compact = false }: ErrorFallbackProps) {
  const config = ERROR_CONFIG[error] || {
    icon: AlertCircle,
    title: '오류가 발생했어요',
    description: error,
    action: '다시 시도',
    color: 'red',
  };

  const Icon = config.icon;
  const styles = COLOR_STYLES[config.color] || COLOR_STYLES.red;

  if (compact) {
    return (
      <div className={`flex items-center gap-2 p-3 ${styles.bg} ${styles.border} border rounded-lg text-sm`}>
        <Icon size={16} className={`${styles.icon} flex-shrink-0`} />
        <div className="flex-1">
          <p className={`${styles.text} font-medium`}>{config.title}</p>
          {config.description && (
            <p className={`${styles.text} text-xs mt-0.5 opacity-80`}>{config.description}</p>
          )}
        </div>
        {config.action && onRetry && (
          <button
            onClick={onRetry}
            className={`${styles.button} font-medium hover:underline flex-shrink-0 text-sm`}
          >
            {config.action}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] p-8 text-center">
      <Icon size={48} className={`${styles.icon} mb-4`} />
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
        {config.title}
      </h3>
      <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
        {config.description}
      </p>
      {config.action && onRetry && (
        <button
          onClick={onRetry}
          className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
        >
          {config.action}
        </button>
      )}
    </div>
  );
}

