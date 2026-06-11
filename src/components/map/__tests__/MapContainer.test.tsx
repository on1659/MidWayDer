// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MapContainer, { attachNaverMapInteractionEvents } from '../MapContainer';

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
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

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

  it('maps Naver click and idle events into shared map callbacks', () => {
    const listeners: Record<string, Array<{ handler: (event?: unknown) => void; remove: ReturnType<typeof vi.fn> }>> = {};
    const addListener = vi.fn((_target: unknown, eventName: string, handler: (event?: unknown) => void) => {
      const listener = { handler, remove: vi.fn() };
      listeners[eventName] = [...(listeners[eventName] || []), listener];
      return listener;
    });
    const removeListener = vi.fn();
    vi.stubGlobal('naver', { maps: { Event: { addListener, removeListener } } });

    const map = {
      getCenter: () => ({ lat: () => 37.5663, lng: () => 126.9779 }),
    } as unknown as naver.maps.Map;
    const onMapClick = vi.fn();
    const onMapIdle = vi.fn();

    const cleanup = attachNaverMapInteractionEvents({ map, onMapClick, onMapIdle });

    listeners.click[0].handler({ coord: { lat: () => 37.5, lng: () => 127.0 } });
    listeners.idle[0].handler();

    expect(onMapClick).toHaveBeenCalledWith({ lat: 37.5, lng: 127.0 });
    expect(onMapIdle).toHaveBeenCalledWith({ lat: 37.5663, lng: 126.9779 });

    cleanup();

    expect(listeners.click[0].remove).toHaveBeenCalledTimes(1);
    expect(listeners.idle[0].remove).toHaveBeenCalledTimes(1);
    expect(removeListener).not.toHaveBeenCalled();
  });

  it('maps Naver drag and zoom events into mobile re-search interaction state', () => {
    vi.useFakeTimers();
    const listeners: Record<string, Array<{ handler: (event?: unknown) => void; remove: ReturnType<typeof vi.fn> }>> = {};
    const addListener = vi.fn((_target: unknown, eventName: string, handler: (event?: unknown) => void) => {
      const listener = { handler, remove: vi.fn() };
      listeners[eventName] = [...(listeners[eventName] || []), listener];
      return listener;
    });
    vi.stubGlobal('naver', { maps: { Event: { addListener, removeListener: vi.fn() } } });

    const map = {
      getCenter: () => ({ lat: () => 37.5663, lng: () => 126.9779 }),
    } as unknown as naver.maps.Map;
    const onMapInteraction = vi.fn();
    const onResetInteraction = vi.fn();

    const cleanup = attachNaverMapInteractionEvents({ map, onMapInteraction, onResetInteraction });

    listeners.dragstart[0].handler();
    listeners.dragend[0].handler();
    listeners.zoom_changed[0].handler();

    expect(onMapInteraction).toHaveBeenCalledTimes(2);
    expect(onResetInteraction).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1000);
    expect(onResetInteraction).toHaveBeenCalledTimes(2);

    cleanup();
  });
});
