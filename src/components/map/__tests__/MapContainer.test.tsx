import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MapContainer } from '../MapContainer';
import { getMapProvider } from '@/lib/map-provider';

// Types
import type { Coordinates, Route, DetourResult } from '@/types';

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
  detourRoute: null as Route | null,
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

  it('calls onMapInteraction when map is interacted', () => {
    const onMapInteraction = vi.fn();
    render(<MapContainer {...defaultProps} onMapInteraction={onMapInteraction} />);

    expect(onMapInteraction).toHaveBeenCalled();
  });

  it('calls onResetInteraction when map interaction ends', () => {
    const onResetInteraction = vi.fn();
    render(<MapContainer {...defaultProps} onResetInteraction={onResetInteraction} />);

    expect(onResetInteraction).toHaveBeenCalled();
  });

  it('calls onMapIdle when map becomes idle', () => {
    const onMapIdle = vi.fn();
    render(<MapContainer {...defaultProps} onMapIdle={onMapIdle} />);

    expect(onMapIdle).toHaveBeenCalledWith(true);
  });

});
