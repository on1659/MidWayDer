import 'dotenv/config';
import { getDirectionsProvider, getGeocodingProvider } from '@/lib/map-provider';
import type { Coordinates } from '@/types/location';

const START_ADDR = '구의역';
const END_ADDR = '명지대학교 인문캠퍼스';

const SEOUL_STATION: Coordinates = { lat: 37.5563, lng: 126.9723 };
const SEOUL_STATION_RADIUS_M = 1500; // 1.5km 내 통과 여부

function haversineDistance(a: Coordinates, b: Coordinates): number {
  const R = 6371000; // meters
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function routePassesNear(routePath: Coordinates[], center: Coordinates, radiusM: number) {
  let minDist = Infinity;
  for (const p of routePath) {
    const d = haversineDistance(p, center);
    if (d < minDist) minDist = d;
  }
  return { passes: minDist <= radiusM, minDist };
}

async function main() {
  const geocoder = getGeocodingProvider();
  const directions = getDirectionsProvider();

  console.log('[Debug] Provider:', process.env.MAP_PROVIDER || 'kakao');

  const start = await geocoder.geocodeAddress(START_ADDR);
  const end = await geocoder.geocodeAddress(END_ADDR);

  console.log('[Debug] Start:', START_ADDR, start);
  console.log('[Debug] End:', END_ADDR, end);

  const shortest = await directions.getRoute(start, end, 'shortest');
  const fastest = await directions.getRoute(start, end, 'fastest');

  const shortestCheck = routePassesNear(shortest.path, SEOUL_STATION, SEOUL_STATION_RADIUS_M);
  const fastestCheck = routePassesNear(fastest.path, SEOUL_STATION, SEOUL_STATION_RADIUS_M);

  console.log('\n[Shortest] distance(m):', shortest.distance, 'duration(s):', shortest.duration, 'points:', shortest.path.length);
  console.log('[Shortest] passes Seoul Station:', shortestCheck.passes, 'minDist(m):', Math.round(shortestCheck.minDist));

  console.log('\n[Fastest] distance(m):', fastest.distance, 'duration(s):', fastest.duration, 'points:', fastest.path.length);
  console.log('[Fastest] passes Seoul Station:', fastestCheck.passes, 'minDist(m):', Math.round(fastestCheck.minDist));
}

main().catch((err) => {
  console.error('Debug failed:', err);
  process.exit(1);
});
