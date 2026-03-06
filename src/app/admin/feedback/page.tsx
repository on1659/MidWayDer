import { Metadata } from 'next';
import { FeedbackDashboard } from './FeedbackDashboard';

export const metadata: Metadata = {
  title: '피드백 관리자 | MidWayDer',
  robots: 'noindex, nofollow',
};

export default function AdminFeedbackPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">📊 피드백 대시보드</h1>
        <FeedbackDashboard />
      </div>
    </div>
  );
}
