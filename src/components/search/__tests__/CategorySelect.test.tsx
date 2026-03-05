// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CategorySelect from '../CategorySelect';
import '@testing-library/jest-dom';

// localStorage mock
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('CategorySelect', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
    localStorageMock.clear();
  });

  it('모든 기본 카테고리를 렌더링해야 함', () => {
    render(<CategorySelect selected="" onChange={mockOnChange} />);

    const defaultCategories = ['주유소', '카페', '편의점', '다이소', '올리브영', '스타벅스', '이디야', '휴게소'];
    defaultCategories.forEach(cat => {
      expect(screen.getByText(cat)).toBeInTheDocument();
    });
  });

  it('카테고리 선택 시 onChange 호출', () => {
    render(<CategorySelect selected="" onChange={mockOnChange} />);

    const 카페Button = screen.getByText('카페').closest('button');
    if (카페Button) {
      fireEvent.click(카페Button);
    }

    expect(mockOnChange).toHaveBeenCalledWith('카페');
  });

  it('선택된 카테고리에 스타일 적용', () => {
    render(<CategorySelect selected="카페" onChange={mockOnChange} />);

    const 카페Button = screen.getByText('카페').closest('button');
    expect(카페Button).toHaveStyle({ color: 'var(--bg-surface)' });
  });

  it('직접 입력 버튼 클릭 시 입력 모드 전환', () => {
    render(<CategorySelect selected="" onChange={mockOnChange} />);

    const 직접입력Button = screen.getByText('직접 입력').closest('button');
    if (직접입력Button) {
      fireEvent.click(직접입력Button);
    }

    expect(screen.getByPlaceholderText('카테고리 입력...')).toBeInTheDocument();
  });

  it('커스텀 카테고리 입력 후 Enter 시 onChange 호출', async () => {
    render(<CategorySelect selected="" onChange={mockOnChange} />);

    // 직접 입력 모드 전환
    const 직접입력Button = screen.getByText('직접 입력').closest('button');
    if (직접입력Button) {
      fireEvent.click(직접입력Button);
    }

    // 커스텀 카테고리 입력
    const input = screen.getByPlaceholderText('카테고리 입력...');
    fireEvent.change(input, { target: { value: '편의점' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith('편의점');
    });
  });

  it('커스텀 카테고리가 localStorage에 저장됨', async () => {
    render(<CategorySelect selected="" onChange={mockOnChange} />);

    // 직접 입력 모드 전환
    const 직접입력Button = screen.getByText('직접 입력').closest('button');
    if (직접입력Button) {
      fireEvent.click(직접입력Button);
    }

    // 커스텀 카테고리 입력
    const input = screen.getByPlaceholderText('카테고리 입력...');
    fireEvent.change(input, { target: { value: '약국' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      const stored = localStorageMock.getItem('midwayder_custom_categories');
      expect(stored).toBeTruthy();
      const categories = JSON.parse(stored || '[]');
      expect(categories).toContain('약국');
    });
  });

  it('Escape 키로 입력 모드 취소', () => {
    render(<CategorySelect selected="" onChange={mockOnChange} />);

    // 직접 입력 모드 전환
    const 직접입력Button = screen.getByText('직접 입력').closest('button');
    if (직접입력Button) {
      fireEvent.click(직접입력Button);
    }

    const input = screen.getByPlaceholderText('카테고리 입력...');
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(screen.getByText('직접 입력')).toBeInTheDocument();
    expect(mockOnChange).not.toHaveBeenCalled();
  });
});
