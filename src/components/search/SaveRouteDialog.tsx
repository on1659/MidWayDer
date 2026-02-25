/**
 * SaveRouteDialog - 경로 이름 입력 다이얼로그
 */

'use client';

import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';

interface SaveRouteDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  defaultName?: string;
}

export default function SaveRouteDialog({
  open,
  onClose,
  onSave,
  defaultName = '',
}: SaveRouteDialogProps) {
  const [name, setName] = useState(defaultName);

  useEffect(() => {
    if (open) {
      setName(defaultName);
    }
  }, [open, defaultName]);

  if (!open) return null;

  const handleSave = () => {
    if (!name.trim()) {
      alert('경로 이름을 입력해주세요');
      return;
    }
    onSave(name.trim());
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-black/30 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
        <div
          className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 animate-scale-in pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold" style={{ color: 'var(--text-strong)' }}>
              경로 저장
            </h3>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
            </button>
          </div>

          {/* Input */}
          <div className="mb-6">
            <label
              htmlFor="route-name-input"
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--text-secondary)' }}
            >
              이름
            </label>
            <input
              id="route-name-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') onClose();
              }}
              placeholder="예: 회사 → 집 퇴근길"
              className="w-full px-4 py-3 rounded-xl text-base border-2 transition-colors outline-none"
              style={{
                borderColor: 'var(--border-soft)',
                color: 'var(--text-strong)',
              }}
              autoFocus
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl font-semibold transition-colors"
              style={{
                background: 'var(--bg-surface-muted)',
                color: 'var(--text-secondary)',
              }}
            >
              취소
            </button>
            <button
              onClick={handleSave}
              className="flex-1 py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-transform active:scale-95"
              style={{ background: 'var(--accent)' }}
            >
              <Save className="w-4 h-4" />
              저장
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </>
  );
}
