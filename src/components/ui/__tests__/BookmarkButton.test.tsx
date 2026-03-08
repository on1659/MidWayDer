// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BookmarkButton } from '../BookmarkButton';
import '@testing-library/jest-dom';

// Mock bookmark store
const mockAddBookmark = vi.fn();
const mockRemoveBookmark = vi.fn();
const mockIsBookmarked = vi.fn();

vi.mock('@/store/bookmark-store', () => ({
  useBookmarkStore: () => ({
    addBookmark: mockAddBookmark,
    removeBookmark: mockRemoveBookmark,
    isBookmarked: mockIsBookmarked,
  }),
}));

describe('BookmarkButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render unbookmarked state', () => {
    mockIsBookmarked.mockReturnValue(false);

    render(<BookmarkButton placeId="place-1" />);

    const button = screen.getByRole('button', { name: /즐겨찾기 추가/i });
    expect(button).toBeInTheDocument();
  });

  it('should render bookmarked state', () => {
    mockIsBookmarked.mockReturnValue(true);

    render(<BookmarkButton placeId="place-1" />);

    const button = screen.getByRole('button', { name: /즐겨찾기 해제/i });
    expect(button).toBeInTheDocument();
  });

  it('should call addBookmark when clicking unbookmarked button', async () => {
    mockIsBookmarked.mockReturnValue(false);
    mockAddBookmark.mockResolvedValue(undefined);

    render(<BookmarkButton placeId="place-1" />);

    const button = screen.getByRole('button', { name: /즐겨찾기 추가/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockAddBookmark).toHaveBeenCalled();
    });
  });

  it('should call removeBookmark when clicking bookmarked button', async () => {
    mockIsBookmarked.mockReturnValue(true);
    mockRemoveBookmark.mockResolvedValue(undefined);

    render(<BookmarkButton placeId="place-1" />);

    const button = screen.getByRole('button', { name: /즐겨찾기 해제/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockRemoveBookmark).toHaveBeenCalledWith('place-1');
    });
  });

  it('should stop event propagation', async () => {
    mockIsBookmarked.mockReturnValue(false);
    mockAddBookmark.mockResolvedValue(undefined);

    const parentClickHandler = vi.fn();

    render(
      <div onClick={parentClickHandler}>
        <BookmarkButton placeId="place-1" />
      </div>
    );

    const button = screen.getByRole('button', { name: /즐겨찾기 추가/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(parentClickHandler).not.toHaveBeenCalled();
    });
  });

  it('should render small size when specified', () => {
    mockIsBookmarked.mockReturnValue(false);

    render(<BookmarkButton placeId="place-1" size="sm" />);

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });
});
