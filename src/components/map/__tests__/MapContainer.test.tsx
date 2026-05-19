// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MapContainer from '../MapContainer';

// Types
import type { Coordinates, Route } from '@/types/location';
import type { DetourResult } from '@/types/detour';

// Mock map provider
vi.mock('@/lib/map-provider', () => ({
  getMapProvider: vi.fn(() => ({
    getRoute: vi.fn(),
    isReady: vi.fn().mockReturnValue(true),
  })),
}));

const defaultProps = {
  center: { lat: 37.5663, lng: 126.9779 } as Coordinates,
  zoom: 15,
  originalRoute: null as Route | null,
  detourRoute: null as { toWaypoint: Route; fromWaypoint: Route } | null,
  waypoints: [] as DetourResult[],
  selectedWaypointId: null as string | null,
  hoveredWaypointId: null as string | null,
  defaultProvider: 'kakao' as 'kakao' | 'naver',
  onWaypointSelect: vi.fn(),
  onMapInteraction: vi.fn(),
  onResetInteraction: vi.fn(),
  onMapIdle: vi.fn(),
};

describe('MapContainer', () => {
  it('renders map container', () => {
    render(<MapContainer {...defaultProps} />);

    expect(screen.getByRole('application')).toBeInTheDocument();
  });

  it('keeps provider selection out of the default map chrome', () => {
    render(<MapContainer {...defaultProps} />);

    expect(screen.queryByText('카카오')).not.toBeInTheDocument();
    expect(screen.queryByText('네이버')).not.toBeInTheDocument();
  });

  it('accepts all props without errors', () => {
    const customProps = {
      ...defaultProps,
      center: { lat: 37.5, lng: 127.0 } as Coordinates,
      zoom: 12,
      onMapClick: vi.fn(),
      clickedCoords: { lat: 37.5, lng: 127.0 } as Coordinates,
    };

    const { container } = render(<MapContainer {...customProps} />);
    expect(container).toBeTruthy();
  });
});
