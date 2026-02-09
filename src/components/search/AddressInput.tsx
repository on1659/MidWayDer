/**
 * AddressInput - 주소 입력 컴포넌트 (리디자인)
 *
 * 모바일 퍼스트, 큰 터치 타겟, 깔끔한 디자인
 */

'use client';

import { useState, useEffect, useRef, type ReactNode } from 'react';
import { MapPin } from 'lucide-react';

interface AddressInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  icon?: ReactNode;
}

export default function AddressInput({
  label,
  value,
  onChange,
  placeholder = '주소를 입력하세요',
  icon,
}: AddressInputProps) {
  const [localValue, setLocalValue] = useState(value);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => onChange(newValue), 300);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</label>
      <div className="relative">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2">
          {icon || <MapPin className="w-4 h-4 text-gray-400" />}
        </div>
        <input
          type="text"
          value={localValue}
          onChange={handleChange}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-[15px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 focus:bg-white transition-all"
        />
      </div>
    </div>
  );
}
