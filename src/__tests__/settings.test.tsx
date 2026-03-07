/**
 * Settings Page Tests
 */

// @vitest-environment jsdom

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SettingsPage from '@/app/settings/page';
import { CacheSettings } from '@/components/settings/CacheSettings';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import * as searchCache from '@/lib/cache/search-cache';

// Mock search-cache
vi.mock('@/lib/cache/search-cache', () => ({
  db: {
    searches: {
      count: vi.fn(),
      clear: vi.fn(),
      orderBy: vi.fn(() => ({
        last: vi.fn()
      }))
    }
  }
}));

describe('SettingsPage', () => {
  test('설정 페이지가 정상 렌더링된다', () => {
    render(<SettingsPage />);
    expect(screen.getByText('설정')).toBeInTheDocument();
  });

  test('홈으로 돌아가기 링크가 있다', () => {
    render(<SettingsPage />);
    const backButton = screen.getByLabelText('홈으로 돌아가기');
    expect(backButton).toBeInTheDocument();
  });
});

describe('CacheSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (searchCache.db.searches.count as ReturnType<typeof vi.fn>).mockResolvedValue(10);
    (searchCache.db.searches.orderBy as ReturnType<typeof vi.fn>).mockReturnValue({
      last: vi.fn().mockResolvedValue({ timestamp: Date.now() })
    });
  });

  test('캐시 통계가 표시된다', async () => {
    render(<CacheSettings />);

    await waitFor(() => {
      expect(screen.getByText(/캐시된 검색:/)).toBeInTheDocument();
      expect(screen.getByText(/10개/)).toBeInTheDocument();
    });
  });

  test('캐시 삭제 버튼이 있다', async () => {
    render(<CacheSettings />);

    await waitFor(() => {
      const deleteButton = screen.getByText('캐시 삭제');
      expect(deleteButton).toBeInTheDocument();
    });
  });

  test('캐시 삭제 버튼 클릭 시 확인 다이얼로그가 표시된다', async () => {
    render(<CacheSettings />);

    await waitFor(() => {
      expect(screen.getByText('캐시 삭제')).toBeInTheDocument();
    });

    const deleteButton = screen.getByText('캐시 삭제');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText(/정말로 캐시를 삭제하시겠습니까?/)).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});

describe('ConfirmDialog', () => {
  test('isOpen이 false면 렌더링되지 않는다', () => {
    render(
      <ConfirmDialog
        isOpen={false}
        title="테스트"
        message="테스트 메시지"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );

    expect(screen.queryByText('테스트')).not.toBeInTheDocument();
  });

  test('isOpen이 true면 렌더링된다', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="테스트"
        message="테스트 메시지"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );

    expect(screen.getByText('테스트')).toBeInTheDocument();
    expect(screen.getByText('테스트 메시지')).toBeInTheDocument();
  });

  test('확인 버튼 클릭 시 onConfirm이 호출된다', () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        isOpen={true}
        title="테스트"
        message="테스트 메시지"
        onConfirm={onConfirm}
        onCancel={() => {}}
      />
    );

    fireEvent.click(screen.getByText('확인'));
    expect(onConfirm).toHaveBeenCalled();
  });

  test('취소 버튼 클릭 시 onCancel이 호출된다', () => {
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        isOpen={true}
        title="테스트"
        message="테스트 메시지"
        onConfirm={() => {}}
        onCancel={onCancel}
      />
    );

    fireEvent.click(screen.getByText('취소'));
    expect(onCancel).toHaveBeenCalled();
  });
});
