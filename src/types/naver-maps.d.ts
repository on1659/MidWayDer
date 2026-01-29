/**
 * Naver Maps JavaScript SDK 타입 정의
 *
 * 클라이언트 측에서 사용되는 Naver Maps SDK의 기본 타입을 정의합니다.
 */

declare namespace naver {
  namespace maps {
    class Map {
      constructor(element: HTMLElement, options: MapOptions);
      setCenter(latlng: LatLng): void;
      setZoom(zoom: number): void;
      fitBounds(bounds: LatLngBounds, margin?: Margin): void;
    }

    class LatLng {
      constructor(lat: number, lng: number);
    }

    class LatLngBounds {
      constructor(sw: LatLng, ne: LatLng);
    }

    class Polyline {
      constructor(options: PolylineOptions);
      setMap(map: Map | null): void;
    }

    class Marker {
      constructor(options: MarkerOptions);
      setMap(map: Map | null): void;
      setPosition(latlng: LatLng): void;
    }

    class InfoWindow {
      constructor(options: InfoWindowOptions);
      open(map: Map, marker: Marker): void;
      close(): void;
    }

    class Size {
      constructor(width: number, height: number);
    }

    class Point {
      constructor(x: number, y: number);
    }

    namespace Event {
      function addListener(
        target: unknown,
        event: string,
        handler: () => void
      ): void;
    }

    enum Position {
      TOP_LEFT = 1,
      TOP_CENTER = 2,
      TOP_RIGHT = 3,
      LEFT_CENTER = 4,
      CENTER = 5,
      RIGHT_CENTER = 6,
      BOTTOM_LEFT = 7,
      BOTTOM_CENTER = 8,
      BOTTOM_RIGHT = 9,
    }

    interface MapOptions {
      center?: LatLng;
      zoom?: number;
      zoomControl?: boolean;
      zoomControlOptions?: {
        position?: Position;
      };
      mapTypeControl?: boolean;
      mapTypeControlOptions?: {
        position?: Position;
      };
    }

    interface PolylineOptions {
      map?: Map;
      path: LatLng[];
      strokeColor?: string;
      strokeWeight?: number;
      strokeOpacity?: number;
    }

    interface MarkerOptions {
      map?: Map;
      position: LatLng;
      title?: string;
      icon?: MarkerIcon;
      zIndex?: number;
    }

    interface MarkerIcon {
      content?: string;
      size?: Size;
      anchor?: Point;
    }

    interface InfoWindowOptions {
      content: string;
    }

    interface Margin {
      top?: number;
      right?: number;
      bottom?: number;
      left?: number;
    }
  }
}

interface Window {
  naver?: typeof naver;
}
