/**
 * Settings Page - 설정 페이지
 */

import { CacheSettings } from '@/components/settings/CacheSettings';
import { SyncSettings } from '@/components/settings/SyncSettings';
import { NotificationSettings } from '@/components/settings/NotificationSettings';
import { CustomCategorySettings } from '@/components/settings/CustomCategorySettings';
import { AppearanceSettings } from '@/components/settings/AppearanceSettings';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto p-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/"
            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="홈으로 돌아가기"
          >
            <ArrowLeft className="w-6 h-6 text-gray-700 dark:text-gray-300" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            설정
          </h1>
        </div>

        {/* Settings Content */}
        <div className="space-y-6">
          <AppearanceSettings />
          <CustomCategorySettings />
          <NotificationSettings />
          <SyncSettings />
          <CacheSettings />
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">앱 정보</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Link href="/privacy" className="rounded-xl px-4 py-3 text-sm font-semibold ring-1 ring-gray-200 transition-colors hover:bg-gray-50 dark:text-gray-200 dark:ring-gray-700 dark:hover:bg-gray-700">
                개인정보 처리방침
              </Link>
              <Link href="/support" className="rounded-xl px-4 py-3 text-sm font-semibold ring-1 ring-gray-200 transition-colors hover:bg-gray-50 dark:text-gray-200 dark:ring-gray-700 dark:hover:bg-gray-700">
                지원 및 문의
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
