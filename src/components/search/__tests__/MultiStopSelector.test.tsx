// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MultiStopSelector from '../MultiStopSelector';

describe('MultiStopSelector - 단일 선택 UX', () => {
  const mockWaypoints = [
    { id: '1', name: '홍대입구역', address: '서울 마포구', coordinates: { lat: 37.5567, lng: 126.9237 }, detourDistance: 500, detourDuration: 180 },
    { id: '2', name: '이태원역', address: '서울 용산구', coordinates: { lat: 37.5345, lng: 126.9945 }, detourDistance: 800, detourDuration: 240 },
    { id: '3', name: '강남역', address: '서울 강남구', coordinates: { lat: 37.4979, lng: 127.0276 }, detourDistance: 1200, detourDuration: 300 },
  ];

  const defaultProps = {
    start: { lat: 37.5, lng: 127.0 },
    end: { lat: 37.6, lng: 127.1 },
    waypoints: mockWaypoints,
  };

  it('렌더링되어야 함', () => {
    render(<MultiStopSelector {...defaultProps} />);
    expect(screen.getByText('멀티 경유지')).toBeInTheDocument();
  });

  it('첫 번째 선택 후 나머지가 비활성화되어야 함', () => {
    render(<MultiStopSelector {...defaultProps} />);

    const checkboxes = screen.getAllByRole('checkbox');
    const firstCheckbox = checkboxes[0];
    const secondCheckbox = checkboxes[1];

    // 첫 번째 선택
    fireEvent.click(firstCheckbox);
    expect(firstCheckbox).toBeChecked();

    // 두 번째는 비활성화
    expect(secondCheckbox).toBeDisabled();
  });

  it('선택된 항목 안내 문구가 표시되어야 함', () => {
    render(<MultiStopSelector {...defaultProps} />);

    const firstCheckbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(firstCheckbox);

    expect(screen.getByText(/선택됨/)).toBeInTheDocument();
    expect(screen.getByText(/하나만 선택하면 더 효율적인 경로를 얻을 수 있습니다/)).toBeInTheDocument();
  });

  it('"완료" 버튼이 표시되어야 함', () => {
    render(<MultiStopSelector {...defaultProps} />);

    const firstCheckbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(firstCheckbox);

    expect(screen.getByText('완료')).toBeInTheDocument();
  });

  it('"다른 경유지 추가하기" 버튼이 표시되어야 함', () => {
    render(<MultiStopSelector {...defaultProps} />);

    const firstCheckbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(firstCheckbox);

    expect(screen.getByText('다른 경유지 추가하기')).toBeInTheDocument();
  });

  it('"다른 경유지 추가하기" 버튼 클릭 시 다중 선택 모드 진입', () => {
    render(<MultiStopSelector {...defaultProps} />);

    const checkboxes = screen.getAllByRole('checkbox');
    const firstCheckbox = checkboxes[0];
    const secondCheckbox = checkboxes[1];

    // 첫 번째 선택
    fireEvent.click(firstCheckbox);

    // "다른 경유지 추가하기" 버튼 클릭
    const addButton = screen.getByText('다른 경유지 추가하기');
    fireEvent.click(addButton);

    // 두 번째 체크박스 활성화 확인
    expect(secondCheckbox).not.toBeDisabled();

    // 다중 선택 모드 진입 확인 (선택됨 (1) 표시)
    expect(screen.getByText(/선택됨 \(1\)/)).toBeInTheDocument();
  });

  it('다중 선택 모드에서 두 번째 선택 가능', () => {
    render(<MultiStopSelector {...defaultProps} />);

    const checkboxes = screen.getAllByRole('checkbox');
    const firstCheckbox = checkboxes[0];
    const secondCheckbox = checkboxes[1];

    // 첫 번째 선택
    fireEvent.click(firstCheckbox);

    // 다중 선택 모드 진입
    const addButton = screen.getByText('다른 경유지 추가하기');
    fireEvent.click(addButton);

    // 두 번째 선택
    fireEvent.click(secondCheckbox);
    expect(secondCheckbox).toBeChecked();

    // "경로 최적화" 버튼 표시 확인
    expect(screen.getByText('경로 최적화')).toBeInTheDocument();
  });

  it('선택 해제 시 단일 선택 모드로 복귀하지 않음 (allowMultiSelect 유지)', () => {
    render(<MultiStopSelector {...defaultProps} />);

    const checkboxes = screen.getAllByRole('checkbox');
    const firstCheckbox = checkboxes[0];
    const secondCheckbox = checkboxes[1];

    // 첫 번째 선택
    fireEvent.click(firstCheckbox);

    // 다중 선택 모드 진입
    const addButton = screen.getByText('다른 경유지 추가하기');
    fireEvent.click(addButton);

    // 두 번째 선택
    fireEvent.click(secondCheckbox);

    // 첫 번째 선택 해제
    fireEvent.click(firstCheckbox);
    expect(firstCheckbox).not.toBeChecked();

    // 여전히 다중 선택 모드 (두 번째는 여전히 활성화)
    expect(secondCheckbox).not.toBeDisabled();
  });

  it('선택 초기화 시 단일 선택 모드로 복귀', () => {
    render(<MultiStopSelector {...defaultProps} />);

    const checkboxes = screen.getAllByRole('checkbox');
    const firstCheckbox = checkboxes[0];
    const secondCheckbox = checkboxes[1];

    // 첫 번째 선택
    fireEvent.click(firstCheckbox);

    // 다중 선택 모드 진입
    const addButton = screen.getByText('다른 경유지 추가하기');
    fireEvent.click(addButton);

    // 두 번째 선택
    fireEvent.click(secondCheckbox);

    // "선택 초기화" 버튼 클릭
    const clearButton = screen.getByText('선택 초기화');
    fireEvent.click(clearButton);

    // 모든 체크박스 선택 해제
    expect(firstCheckbox).not.toBeChecked();
    expect(secondCheckbox).not.toBeChecked();

    // 단일 선택 모드로 복귀 (두 번째는 다시 비활성화)
    fireEvent.click(firstCheckbox);
    expect(secondCheckbox).toBeDisabled();
  });

  it('onOptimize 콜백이 "완료" 버튼 클릭 시 호출됨', () => {
    const onOptimize = vi.fn();
    render(<MultiStopSelector {...defaultProps} onOptimize={onOptimize} />);

    const firstCheckbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(firstCheckbox);

    const completeButton = screen.getByText('완료');
    fireEvent.click(completeButton);

    expect(onOptimize).toHaveBeenCalledWith(['1']);
  });
});
