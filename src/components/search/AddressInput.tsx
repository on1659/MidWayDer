/**
 * AddressInput - 주소 입력 컴포넌트
 *
 * 출발지/도착지 주소를 입력받는 컴포넌트입니다.
 * 300ms 디바운스를 적용하여 불필요한 업데이트를 방지합니다.
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { MapPin } from 'lucide-react';

interface AddressInputProps {
  /** 라벨 텍스트 */
  label: string;
  /** 현재 값 */
  value: string;
  /** 값 변경 콜백 (300ms 디바운스) */
  onChange: (value: string) => void;
  /** 플레이스홀더 */
  placeholder?: string;
}

export default function AddressInput({
  label,
  value,
  onChange,
  placeholder = '주소를 입력하세요',
}: AddressInputProps) {
  const [localValue, setLocalValue] = useState(value);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);

    // 이전 타이머 취소
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // 300ms 디바운스
    debounceTimer.current = setTimeout(() => {
      onChange(newValue);
    }, 300);
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={localValue}
          onChange={handleChange}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
    </div>
  );
}
