/**
 * ConfirmDialog - 확인 다이얼로그 컴포넌트
 */

'use client';

import { useEffect, useRef } from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = '확인',
  cancelText = '취소',
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onCancel();
        }
      };

      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
    >
      <div
        ref={dialogRef}
        className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          id="dialog-title"
          className="text-lg font-semibold text-gray-900 dark:text-white mb-2"
        >
          {title}
        </h3>
        <p className="text-gray-600 dark:text-gray-300 mb-6">{message}</p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
