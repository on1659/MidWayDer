/**
 * Kakao Maps JavaScript SDK 타입 정의
 *
 * 클라이언트 측에서 사용되는 Kakao Maps SDK의 기본 타입을 정의합니다.
 */

declare namespace kakao {
  namespace maps {
    class Map {
      constructor(container: HTMLElement, options: MapOptions);
      setCenter(latlng: LatLng): void;
      setLevel(level: number): void;
      setBounds(bounds: LatLngBounds, paddingTop?: number, paddingRight?: number, paddingBottom?: number, paddingLeft?: number): void;
      getCenter(): LatLng;
      getLevel(): number;
      addControl(control: ZoomControl | MapTypeControl, position: ControlPosition): void;
      removeControl(control: ZoomControl | MapTypeControl): void;
    }

    class LatLng {
      constructor(lat: number, lng: number);
      getLat(): number;
      getLng(): number;
    }

    class LatLngBounds {
      constructor(sw?: LatLng, ne?: LatLng);
      extend(latlng: LatLng): void;
      getSouthWest(): LatLng;
      getNorthEast(): LatLng;
    }

    class Polyline {
      constructor(options: PolylineOptions);
      setMap(map: Map | null): void;
      setPath(path: LatLng[]): void;
    }

    class Marker {
      constructor(options: MarkerOptions);
      setMap(map: Map | null): void;
      setPosition(latlng: LatLng): void;
      getPosition(): LatLng;
    }

    class InfoWindow {
      constructor(options: InfoWindowOptions);
      open(map: Map, marker: Marker): void;
      close(): void;
    }

    class CustomOverlay {
      constructor(options: CustomOverlayOptions);
      setMap(map: Map | null): void;
      setPosition(latlng: LatLng): void;
    }

    class Size {
      constructor(width: number, height: number);
    }

    class Point {
      constructor(x: number, y: number);
    }

    namespace event {
      function addListener(
        target: unknown,
        type: string,
        handler: () => void
      ): void;
      function removeListener(
        target: unknown,
        type: string,
        handler: () => void
      ): void;
    }

    namespace services {
      class Geocoder {
        constructor();
        addressSearch(
          address: string,
          callback: (result: GeocoderResult[], status: Status) => void
        ): void;
        coord2Address(
          lng: number,
          lat: number,
          callback: (result: GeocoderResult[], status: Status) => void
        ): void;
      }

      enum Status {
        OK = 'OK',
        ZERO_RESULT = 'ZERO_RESULT',
        ERROR = 'ERROR',
      }

      interface GeocoderResult {
        address: Address;
        road_address: RoadAddress | null;
        address_name: string;
        x: string;
        y: string;
      }

      interface Address {
        address_name: string;
        region_1depth_name: string;
        region_2depth_name: string;
        region_3depth_name: string;
      }

      interface RoadAddress {
        address_name: string;
        region_1depth_name: string;
        region_2depth_name: string;
        region_3depth_name: string;
        road_name: string;
        building_name: string;
      }
    }

    enum ControlPosition {
      TOP = 0,
      TOPLEFT = 1,
      TOPRIGHT = 2,
      LEFT = 3,
      RIGHT = 4,
      BOTTOMLEFT = 5,
      BOTTOM = 6,
      BOTTOMRIGHT = 7,
    }

    class ZoomControl {
      constructor(options?: ZoomControlOptions);
    }

    class MapTypeControl {
      constructor(options?: MapTypeControlOptions);
    }

    interface MapOptions {
      center?: LatLng;
      level?: number;
      mapTypeId?: MapTypeId;
      draggable?: boolean;
      scrollwheel?: boolean;
      disableDoubleClick?: boolean;
      disableDoubleClickZoom?: boolean;
      projectionId?: string;
    }

    interface PolylineOptions {
      map?: Map;
      path?: LatLng[];
      strokeWeight?: number;
      strokeColor?: string;
      strokeOpacity?: number;
      strokeStyle?: string;
      endArrow?: boolean;
    }

    interface MarkerOptions {
      map?: Map;
      position: LatLng;
      image?: MarkerImage;
      title?: string;
      draggable?: boolean;
      clickable?: boolean;
      zIndex?: number;
      opacity?: number;
      altitude?: number;
      range?: number;
    }

    interface MarkerImage {
      src: string;
      size: Size;
      options?: MarkerImageOptions;
    }

    interface MarkerImageOptions {
      offset?: Point;
      alt?: string;
      coords?: string;
      shape?: string;
    }

    interface InfoWindowOptions {
      content?: string | HTMLElement;
      removable?: boolean;
      zIndex?: number;
      altitude?: number;
      range?: number;
      position?: LatLng;
    }

    interface CustomOverlayOptions {
      clickable?: boolean;
      content?: string | HTMLElement;
      map?: Map;
      position?: LatLng;
      xAnchor?: number;
      yAnchor?: number;
      zIndex?: number;
    }

    interface ZoomControlOptions {
      position?: ControlPosition;
    }

    interface MapTypeControlOptions {
      position?: ControlPosition;
      mapTypeIds?: MapTypeId[];
    }

    enum MapTypeId {
      ROADMAP = 'ROADMAP',
      SKYVIEW = 'SKYVIEW',
      HYBRID = 'HYBRID',
    }

    function load(callback: () => void): void;
  }
}

interface Window {
  kakao?: typeof kakao;
}
