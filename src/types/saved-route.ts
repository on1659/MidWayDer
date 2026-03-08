// Saved Route Types

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface SavedRoute {
  id: string;
  sessionId: string;
  name: string;
  startAddress: string;
  endAddress: string;
  startCoords: Coordinates;
  endCoords: Coordinates;
  category?: string | null;
  routeHash: string;
  createdAt: Date;
  updatedAt: Date;
  lastUsedAt?: Date | null;
}

export interface SaveRouteInput {
  name: string;
  startAddress: string;
  endAddress: string;
  startCoords: Coordinates;
  endCoords: Coordinates;
  category?: string;
}

export interface UpdateRouteInput {
  name: string;
}
