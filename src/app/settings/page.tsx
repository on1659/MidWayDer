/**
 * Settings Page - 설정 페이지
 */

import { CacheSettings } from '@/components/settings/CacheSettings';
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
          <CacheSettings />

          {/* Future Settings Sections */}
          {/* <NotificationSettings /> */}
          {/* <PrivacySettings /> */}
        </div>
      </div>
    </div>
  );
}
