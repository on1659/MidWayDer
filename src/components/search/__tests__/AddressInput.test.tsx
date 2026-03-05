// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import AddressInput from '../AddressInput';
import '@testing-library/jest-dom';

// fetch mock
global.fetch = vi.fn() as Mock;

describe('AddressInput', () => {
  const mockOnChange = vi.fn();
  const mockOnSelect = vi.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
    mockOnSelect.mockClear();
    (global.fetch as Mock).mockClear();
  });

  it('입력 필드가 렌더링되어야 함', () => {
    render(
      <AddressInput
        label="출발지"
        value=""
        onChange={mockOnChange}
        placeholder="출발지를 입력하세요"
      />
    );

    expect(screen.getByPlaceholderText('출발지를 입력하세요')).toBeInTheDocument();
    expect(screen.getByLabelText('출발지')).toBeInTheDocument();
  });

  it('값 변경 시 onChange 호출', () => {
    render(
      <AddressInput
        label="출발지"
        value=""
        onChange={mockOnChange}
      />
    );

    const input = screen.getByLabelText('출발지');
    fireEvent.change(input, { target: { value: '서울역' } });

    expect(mockOnChange).toHaveBeenCalledWith('서울역');
  });

  it('자동완성 결과 표시', async () => {
    const mockResults = [
      { name: '서울역', address: '서울 중구 봉래동2가 122-20', lat: 37.5547, lng: 126.9707, category: '교통' },
      { name: '서울역공항철도', address: '서울 중구 봉래동2가 122-25', lat: 37.5533, lng: 126.9693, category: '교통' },
    ];
    (global.fetch as Mock).mockResolvedValueOnce({
      json: async () => ({ results: mockResults }),
    });

    render(
      <AddressInput
        label="출발지"
        value=""
        onChange={mockOnChange}
      />
    );

    const input = screen.getByLabelText('출발지');
    fireEvent.change(input, { target: { value: '서울역' } });

    await waitFor(
      async () => {
        expect(screen.getByText('서울역')).toBeInTheDocument();
        expect(screen.getByText('서울역공항철도')).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  });

  it('결과 선택 시 onSelect 호출', async () => {
    const mockResults = [
      { name: '서울역', address: '서울 중구 봉래동2가 122-20', lat: 37.5547, lng: 126.9707, category: '교통' },
    ];
    (global.fetch as Mock).mockResolvedValueOnce({
      json: async () => ({ results: mockResults }),
    });
    render(
      <AddressInput
        label="출발지"
        value=""
        onChange={mockOnChange}
        onSelect={mockOnSelect}
      />
    );
    const input = screen.getByLabelText('출발지');
    fireEvent.change(input, { target: { value: '서울역' } });
    await waitFor(() => {
      expect(screen.getByText('서울역')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('서울역'));
    expect(mockOnSelect).toHaveBeenCalledWith({
      address: '서울역',
      coordinates: { lat: 37.5547, lng: 126.9707 },
    });
  });

  it('키보드 네비게이션 (ArrowDown, Enter)', async () => {
    const mockResults = [
      { name: '서울역', address: '서울 중구 봉래동2가 122-20', lat: 37.5547, lng: 126.9707, category: '교통' },
      { name: '서울역공항철도', address: '서울 중구 봉래동2가 122-25', lat: 37.5533, lng: 126.9693, category: '교통' },
    ];
    (global.fetch as Mock).mockResolvedValueOnce({
      json: async () => ({ results: mockResults }),
    });
    render(
      <AddressInput
        label="출발지"
        value=""
        onChange={mockOnChange}
        onSelect={mockOnSelect}
      />
    );
    const input = screen.getByLabelText('출발지');
    fireEvent.change(input, { target: { value: '서울역' } });
    await waitFor(() => {
      expect(screen.getByText('서울역')).toBeInTheDocument();
    });
    // ArrowDown으로 이동
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(mockOnSelect).toHaveBeenCalledWith({
      address: '서울역',
      coordinates: { lat: 37.5547, lng: 126.9707 },
    });
  });

  it('Escape 키로 자동완성 닫기', async () => {
    const mockResults = [
      { name: '서울역', address: '서울 중구 봉래동2가 122-20', lat: 37.5547, lng: 126.9707, category: '교통' },
    ];
    (global.fetch as Mock).mockResolvedValueOnce({
      json: async () => ({ results: mockResults }),
    });
    render(
      <AddressInput
        label="출발지"
        value=""
        onChange={mockOnChange}
      />
    );
    const input = screen.getByLabelText('출발지');
    fireEvent.change(input, { target: { value: '서울역' } });
    await waitFor(() => {
      expect(screen.getByText('서울역')).toBeInTheDocument();
    });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByText('서울역')).not.toBeInTheDocument();
  });

  it('clear 버튼 클릭 시 입력값 초기화', () => {
    render(
      <AddressInput
        label="출발지"
        value="서울역"
        onChange={mockOnChange}
      />
    );
    const clearButton = screen.getByRole('button');
    fireEvent.click(clearButton);
    expect(mockOnChange).toHaveBeenCalledWith('');
  });

  it('testId가 적용됨', () => {
    render(
      <AddressInput
        label="출발지"
        value=""
        onChange={mockOnChange}
        testId="start-input"
      />
    );
    expect(screen.getByTestId('start-input')).toBeInTheDocument();
  });
});
