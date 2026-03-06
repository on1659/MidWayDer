'use client';

import { useState } from 'react';
import { MessageSquare, X, Star, Loader2 } from 'lucide-react';

export function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState<number>(0);
  const [category, setCategory] = useState<string>('');
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!rating || !category) {
      setError('평점과 카테고리를 선택해주세요.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, category, comment }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit feedback');
      }

      setSubmitted(true);
      setTimeout(() => {
        setIsOpen(false);
        setSubmitted(false);
        setRating(0);
        setCategory('');
        setComment('');
      }, 2000);
    } catch (err) {
      console.error('Feedback submission failed:', err);
      setError('피드백 제출에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 bg-blue-500 text-white p-4 rounded-full shadow-lg hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300"
        aria-label="피드백 보내기"
      >
        <MessageSquare className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-96 p-6 max-h-[90vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">피드백 보내기</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          aria-label="닫기"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {submitted ? (
        <div className="text-center py-8">
          <div className="text-5xl mb-4">✅</div>
          <p className="text-gray-600 dark:text-gray-300">감사합니다! 피드백을 보냈습니다.</p>
        </div>
      ) : (
        <>
          {/* 평점 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              평점
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className="focus:outline-none focus:ring-2 focus:ring-yellow-300 rounded"
                  aria-label={`${star}점`}
                >
                  <Star
                    className={`w-8 h-8 transition-colors ${
                      star <= rating
                        ? 'text-yellow-400 fill-current'
                        : 'text-gray-300 dark:text-gray-600'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* 카테고리 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              카테고리
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'bug', label: '🐛 버그' },
                { value: 'suggestion', label: '💡 제안' },
                { value: 'praise', label: '👏 칭찬' },
              ].map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    category === cat.value
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* 코멘트 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              코멘트 (선택)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full border rounded p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              rows={3}
              placeholder="자세한 내용을 적어주세요..."
              maxLength={1000}
            />
            <p className="text-xs text-gray-500 mt-1">{comment.length}/1000</p>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="mb-4 p-2 bg-red-100 text-red-700 rounded text-sm">{error}</div>
          )}

          {/* 제출 버튼 */}
          <button
            onClick={handleSubmit}
            disabled={!rating || !category || isSubmitting}
            className="w-full bg-blue-500 text-white py-2 rounded font-medium disabled:bg-gray-300 dark:disabled:bg-gray-600 hover:bg-blue-600 transition-colors flex items-center justify-center"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                제출 중...
              </>
            ) : (
              '보내기'
            )}
          </button>
        </>
      )}
    </div>
  );
}
