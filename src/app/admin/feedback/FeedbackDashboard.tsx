'use client';

import { useState, useEffect, useCallback } from 'react';
import { Star, Bug, Lightbulb, ThumbsUp, RefreshCw } from 'lucide-react';

interface Feedback {
  id: string;
  rating: number;
  category: 'bug' | 'suggestion' | 'praise';
  comment: string | null;
  userAgent: string | null;
  url: string | null;
  createdAt: string;
}

interface FeedbackStats {
  averageRating: number;
  totalCount: number;
}

const categoryConfig = {
  bug: { label: '버그', icon: Bug, color: 'bg-red-100 text-red-700' },
  suggestion: { label: '제안', icon: Lightbulb, color: 'bg-yellow-100 text-yellow-700' },
  praise: { label: '칭찬', icon: ThumbsUp, color: 'bg-green-100 text-green-700' },
};

export function FeedbackDashboard() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [stats, setStats] = useState<FeedbackStats>({ averageRating: 0, totalCount: 0 });
  const [category, setCategory] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFeedbacks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = category ? `/api/feedback?category=${category}` : '/api/feedback';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setFeedbacks(data.feedbacks || []);
      setStats(data.stats || { averageRating: 0, totalCount: 0 });
    } catch (err) {
      setError('피드백을 불러오는데 실패했습니다.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500 mb-1">평균 평점</div>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-bold">{stats.averageRating.toFixed(1)}</span>
            <Star className="w-6 h-6 text-yellow-400 fill-current" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500 mb-1">총 피드백</div>
          <div className="text-3xl font-bold">{stats.totalCount}</div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setCategory('')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            category === '' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          전체
        </button>
        {Object.entries(categoryConfig).map(([key, config]) => (
          <button
            key={key}
            onClick={() => setCategory(key)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              category === key ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            {config.label}
          </button>
        ))}
        <button
          onClick={fetchFeedbacks}
          className="ml-auto px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          새로고침
        </button>
      </div>

      {/* Feedback List */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">로딩 중...</div>
      ) : error ? (
        <div className="text-center py-12 text-red-500">{error}</div>
      ) : feedbacks.length === 0 ? (
        <div className="text-center py-12 text-gray-500">피드백이 없습니다.</div>
      ) : (
        <div className="space-y-4">
          {feedbacks.map((feedback) => {
            const config = categoryConfig[feedback.category];
            const Icon = config.icon;
            return (
              <div key={feedback.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-sm ${config.color} flex items-center gap-1`}>
                      <Icon className="w-4 h-4" />
                      {config.label}
                    </span>
                    {renderStars(feedback.rating)}
                  </div>
                  <span className="text-sm text-gray-400">{formatDate(feedback.createdAt)}</span>
                </div>
                {feedback.comment && (
                  <p className="text-gray-700 mb-3">{feedback.comment}</p>
                )}
                {feedback.url && (
                  <div className="text-xs text-gray-400 truncate">
                    출처: {feedback.url}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
