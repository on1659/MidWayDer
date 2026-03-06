/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OfflineBanner } from '../OfflineBanner';

// useOnlineStatus 모킹
vi.mock('@/hooks/useOnlineStatus', () => ({
  useOnlineStatus: vi.fn(),
}));

import { useOnlineStatus } from '@/hooks/useOnlineStatus';

const mockedUseOnlineStatus = vi.mocked(useOnlineStatus);

describe('OfflineBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('온라인 상태에서는 아무것도 렌더링하지 않아야 함', () => {
    mockedUseOnlineStatus.mockReturnValue(true);

    const { container } = render(<OfflineBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('오프라인 상태에서 배너를 표시해야 함', () => {
    mockedUseOnlineStatus.mockReturnValue(false);

    render(<OfflineBanner />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/오프라인 상태입니다/)).toBeInTheDocument();
    expect(screen.getByText(/일부 기능이 제한될 수 있습니다/)).toBeInTheDocument();
  });

  it('오프라인 배너에 올바른 ARIA 속성이 있어야 함', () => {
    mockedUseOnlineStatus.mockReturnValue(false);

    render(<OfflineBanner />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('aria-live', 'assertive');
  });

  it('WifiOff 아이콘이 오프라인 배너에 표시되어야 함', () => {
    mockedUseOnlineStatus.mockReturnValue(false);

    render(<OfflineBanner />);

    const icon = screen.getByRole('alert').querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('배너에 slide-down 애니메이션 클래스가 있어야 함', () => {
    mockedUseOnlineStatus.mockReturnValue(false);

    render(<OfflineBanner />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('animate-slide-down');
  });
});
