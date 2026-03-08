/**
 * CustomCategorySettings - 커스텀 카테고리 관리 UI (v0.61.0)
 *
 * 사용자 정의 카테고리를 추가/편집/삭제할 수 있는 설정 컴포넌트
 */

'use client';

import { useEffect, useState } from 'react';
import { useCustomCategoryStore, type CustomCategory } from '@/store/custom-category-store';
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react';

// 프리셋 아이콘 (emoji)
const ICON_PRESETS = ['🏪', '🍔', '☕', '🛒', '⛽', '🏦', '🏥', '🎨', '🏋️', '💇', '🧁', '🍕', '🍜', '🎁'];

interface CategoryFormData {
  name: string;
  icon: string;
  color: string;
  keywords: string;
}

const DEFAULT_FORM: CategoryFormData = {
  name: '',
  icon: '🏪',
  color: '#3B82F6',
  keywords: '',
};

export function CustomCategorySettings() {
  const { categories, addCategory, updateCategory, deleteCategory, loadFromStorage } = useCustomCategoryStore();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CategoryFormData>(DEFAULT_FORM);

  // 초기 로드
  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  const handleAdd = () => {
    if (!form.name.trim()) return;

    addCategory({
      name: form.name.trim(),
      icon: form.icon,
      color: form.color,
      keywords: form.keywords.split(',').map((k) => k.trim()).filter(Boolean),
    });

    setForm(DEFAULT_FORM);
    setIsAdding(false);
  };

  const handleUpdate = () => {
    if (!editingId || !form.name.trim()) return;

    updateCategory(editingId, {
      name: form.name.trim(),
      icon: form.icon,
      color: form.color,
      keywords: form.keywords.split(',').map((k) => k.trim()).filter(Boolean),
    });

    setEditingId(null);
    setForm(DEFAULT_FORM);
  };

  const startEdit = (category: CustomCategory) => {
    setEditingId(category.id);
    setForm({
      name: category.name,
      icon: category.icon,
      color: category.color,
      keywords: category.keywords.join(', '),
    });
    setIsAdding(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsAdding(false);
    setForm(DEFAULT_FORM);
  };

  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          커스텀 카테고리
        </h2>
        {!isAdding && !editingId && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: 'var(--accent)',
              color: 'white',
            }}
          >
            <Plus className="w-4 h-4" />
            추가
          </button>
        )}
      </div>

      {/* 기존 카테고리 목록 */}
      <div className="space-y-2 mb-4">
        {categories.length === 0 && !isAdding && (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            추가한 카테고리가 없습니다
          </p>
        )}

        {categories.map((category) => (
          <div
            key={category.id}
            className="flex items-center justify-between p-3 rounded-xl"
            style={{ background: 'var(--bg-surface-muted)' }}
          >
            {editingId === category.id ? (
              // 편집 모드
              <div className="flex-1 space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="카테고리명"
                    className="flex-1 px-3 py-1.5 rounded-lg text-sm"
                    style={{
                      background: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)',
                    }}
                  />
                  <button
                    onClick={handleUpdate}
                    className="p-1.5 rounded-lg"
                    style={{ background: 'var(--accent)', color: 'white' }}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="p-1.5 rounded-lg"
                    style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)' }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <select
                    value={form.icon}
                    onChange={(e) => setForm({ ...form, icon: e.target.value })}
                    className="px-2 py-1 rounded-lg text-sm"
                    style={{
                      background: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {ICON_PRESETS.map((icon) => (
                      <option key={icon} value={icon}>{icon}</option>
                    ))}
                  </select>
                  <input
                    type="color"
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    className="w-8 h-8 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={form.keywords}
                    onChange={(e) => setForm({ ...form, keywords: e.target.value })}
                    placeholder="키워드 (쉼표로 구분)"
                    className="flex-1 min-w-[150px] px-2 py-1 rounded-lg text-xs"
                    style={{
                      background: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)',
                    }}
                  />
                </div>
              </div>
            ) : (
              // 표시 모드
              <>
                <div className="flex items-center gap-3">
                  <span
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-lg"
                    style={{ background: category.color + '20' }}
                  >
                    {category.icon}
                  </span>
                  <div>
                    <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                      {category.name}
                    </p>
                    {category.keywords.length > 0 && (
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {category.keywords.join(', ')}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => startEdit(category)}
                    className="p-2 rounded-lg hover:opacity-80 transition-opacity"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteCategory(category.id)}
                    className="p-2 rounded-lg hover:opacity-80 transition-opacity"
                    style={{ color: '#EF4444' }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* 추가 폼 */}
      {isAdding && (
        <div
          className="p-3 rounded-xl space-y-2"
          style={{ background: 'var(--bg-surface-muted)' }}
        >
          <div className="flex gap-2">
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="카테고리명"
              className="flex-1 px-3 py-1.5 rounded-lg text-sm"
              style={{
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
              }}
              autoFocus
            />
            <button
              onClick={handleAdd}
              disabled={!form.name.trim()}
              className="p-1.5 rounded-lg disabled:opacity-50"
              style={{ background: 'var(--accent)', color: 'white' }}
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={cancelEdit}
              className="p-1.5 rounded-lg"
              style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-2 flex-wrap">
            <select
              value={form.icon}
              onChange={(e) => setForm({ ...form, icon: e.target.value })}
              className="px-2 py-1 rounded-lg text-sm"
              style={{
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)',
              }}
            >
              {ICON_PRESETS.map((icon) => (
                <option key={icon} value={icon}>{icon}</option>
              ))}
            </select>
            <input
              type="color"
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
              className="w-8 h-8 rounded cursor-pointer"
            />
            <input
              type="text"
              value={form.keywords}
              onChange={(e) => setForm({ ...form, keywords: e.target.value })}
              placeholder="키워드 (쉼표로 구분)"
              className="flex-1 min-w-[150px] px-2 py-1 rounded-lg text-xs"
              style={{
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
