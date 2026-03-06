'use client';

import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

// Sentry 타입 정의 (설치되지 않은 환경 지원)
interface SentryInterface {
  captureException: (error: Error, options?: { contexts?: { react?: { componentStack?: string } } }) => void;
}

interface WindowWithSentry extends Window {
  Sentry?: SentryInterface;
}

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * React Error Boundary 컴포넌트
 * 컴포넌트 트리에서 에러를 포착하고 사용자 친화적 에러 UI 표시
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[ErrorBoundary] Error caught:', error, errorInfo);
    }
    
    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
    
    // Send to Sentry (if available)
    if (typeof window !== 'undefined' && (window as WindowWithSentry).Sentry) {
      (window as WindowWithSentry).Sentry!.captureException(error, { 
        contexts: { 
          react: { 
            componentStack: errorInfo.componentStack ?? undefined
          } 
        } 
      });
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[200px] p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            문제가 발생했어요
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 max-w-md">
            예상치 못한 오류가 발생했습니다. 잠시 후 다시 시도해주세요.
          </p>
          <div className="flex gap-3">
            <button
              onClick={this.handleRetry}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              다시 시도
            </button>
            <button
              onClick={this.handleGoHome}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors dark:text-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700"
            >
              <Home className="w-4 h-4" />
              홈으로
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-order component for easy wrapping
 * @example
 * const SafeComponent = withErrorBoundary(MyComponent, <Fallback />);
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: React.ReactNode,
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
) {
  return function WithErrorBoundaryWrapper(props: P) {
    return (
      <ErrorBoundary fallback={fallback} onError={onError}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}
