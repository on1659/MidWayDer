export interface Bookmark {
  id: string;
  placeId: string;
  sessionId: string;
  memo?: string | null;
  createdAt: Date;
  place?: {
    id: string;
    name: string;
    category: string;
    address: string;
    lat: number;
    lng: number;
  };
}

export interface BookmarkWithPlace extends Bookmark {
  place: NonNullable<Bookmark['place']>;
}

export interface BookmarkApiResponse {
  bookmark?: Bookmark;
  bookmarks?: Bookmark[];
  isBookmarked?: boolean;
  error?: string;
  success?: boolean;
}
