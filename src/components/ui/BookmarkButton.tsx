'use client';

import { useCallback, useMemo } from 'react';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { useBookmarkStore } from '@/store/bookmark-store';

interface Props {
  placeId: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function BookmarkButton({ placeId, size = 'md', className = '' }: Props) {
  const { addBookmark, removeBookmark, isBookmarked } = useBookmarkStore();
  const bookmarked = isBookmarked(placeId);

  const handleClick = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();

      try {
        if (bookmarked) {
          await removeBookmark(placeId);
        } else {
          await addBookmark(placeId);
        }
      } catch (error) {
        console.error('Bookmark action failed:', error);
      }
    },
    [bookmarked, placeId, addBookmark, removeBookmark]
  );

  const { iconSize, Icon, color } = useMemo(
    () => ({
      iconSize: size === 'sm' ? 16 : 20,
      Icon: bookmarked ? BookmarkCheck : Bookmark,
      color: bookmarked ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400',
    }),
    [size, bookmarked]
  );

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${color} ${className}`}
      aria-label={bookmarked ? '즐겨찾기 해제' : '즐겨찾기 추가'}
      title={bookmarked ? '즐겨찾기 해제' : '즐겨찾기 추가'}
    >
      <Icon size={iconSize} />
    </button>
  );
}
