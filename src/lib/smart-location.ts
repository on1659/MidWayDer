/**
 * Smart Location Saving
 * 
 * Auto-detect "Home" and "Work" from GPS usage patterns
 */

export interface SavedLocation {
  id: string;
  label: 'home' | 'work' | 'custom';
  customLabel?: string;
  address: string;
  coordinates: { lat: number; lng: number };
  visitCount: number;
  lastVisited: number;
  averageTimeOfDay?: number; // 평균 방문 시간 (0-23)
  createdAt: number;
}

interface LocationVisit {
  address: string;
  coordinates: { lat: number; lng: number };
  timestamp: number;
}

const STORAGE_KEY = 'midwayder_saved_locations';
const VISITS_KEY = 'midwayder_location_visits';
const MAX_VISITS = 100; // 최대 저장 방문 기록

/**
 * 방문 기록 추가 (출발지 설정 시 자동 호출)
 */
export function recordLocationVisit(address: string, coordinates: { lat: number; lng: number }): void {
  try {
    const visits = getLocationVisits();
    visits.push({
      address,
      coordinates,
      timestamp: Date.now(),
    });

    // 최대 100개만 유지 (오래된 것 삭제)
    if (visits.length > MAX_VISITS) {
      visits.shift();
    }

    localStorage.setItem(VISITS_KEY, JSON.stringify(visits));

    // 자동 감지 트리거 (5회 이상 방문 시)
    if (visits.length >= 5) {
      autoDetectLocations();
    }
  } catch {
    // localStorage 실패 시 무시
  }
}

/**
 * 방문 기록 조회
 */
function getLocationVisits(): LocationVisit[] {
  try {
    const raw = localStorage.getItem(VISITS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * 두 좌표 간 거리 계산 (미터)
 */
function getDistance(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000; // 지구 반지름 (미터)
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;

  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));

  return R * c;
}

/**
 * 유사한 위치 그룹화 (반경 100m 이내)
 */
function clusterLocations(visits: LocationVisit[]): Array<{
  coordinates: { lat: number; lng: number };
  address: string;
  count: number;
  times: number[];
}> {
  const clusters: Array<{
    coordinates: { lat: number; lng: number };
    address: string;
    count: number;
    times: number[];
  }> = [];

  for (const visit of visits) {
    const hour = new Date(visit.timestamp).getHours();
    let found = false;

    for (const cluster of clusters) {
      if (getDistance(cluster.coordinates, visit.coordinates) < 100) {
        cluster.count++;
        cluster.times.push(hour);
        found = true;
        break;
      }
    }

    if (!found) {
      clusters.push({
        coordinates: visit.coordinates,
        address: visit.address,
        count: 1,
        times: [hour],
      });
    }
  }

  return clusters.sort((a, b) => b.count - a.count);
}

/**
 * 자동 감지: 집/회사 판단
 */
function autoDetectLocations(): void {
  const visits = getLocationVisits();
  if (visits.length < 5) return;

  const clusters = clusterLocations(visits);
  if (clusters.length === 0) return;

  const saved = getSavedLocations();

  // 상위 2개 클러스터 분석
  for (let i = 0; i < Math.min(2, clusters.length); i++) {
    const cluster = clusters[i];
    if (cluster.count < 3) continue; // 최소 3회 방문

    const avgHour = cluster.times.reduce((sum, h) => sum + h, 0) / cluster.times.length;

    let label: 'home' | 'work' | null = null;
    if (avgHour >= 6 && avgHour < 10) {
      label = 'home'; // 아침 출발 → 집
    } else if (avgHour >= 17 && avgHour < 21) {
      label = 'work'; // 저녁 출발 → 회사
    }

    if (!label) continue;

    // 이미 저장된 집/회사가 있으면 스킵
    if (saved.some((s) => s.label === label)) continue;

    // 저장
    const newLocation: SavedLocation = {
      id: `${label}_${Date.now()}`,
      label,
      address: cluster.address,
      coordinates: cluster.coordinates,
      visitCount: cluster.count,
      lastVisited: Date.now(),
      averageTimeOfDay: avgHour,
      createdAt: Date.now(),
    };

    addSavedLocation(newLocation);
  }
}

/**
 * 저장된 위치 조회
 */
export function getSavedLocations(): SavedLocation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * 저장된 위치 추가
 */
export function addSavedLocation(location: Omit<SavedLocation, 'id' | 'createdAt'>): void {
  try {
    const saved = getSavedLocations();
    const newLocation: SavedLocation = {
      ...location,
      id: `${location.label}_${Date.now()}`,
      createdAt: Date.now(),
    };
    saved.push(newLocation);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  } catch {
    // ignore
  }
}

/**
 * 저장된 위치 삭제
 */
export function removeSavedLocation(id: string): void {
  try {
    const saved = getSavedLocations().filter((loc) => loc.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  } catch {
    // ignore
  }
}

/**
 * 저장된 위치 업데이트
 */
export function updateSavedLocation(id: string, updates: Partial<SavedLocation>): void {
  try {
    const saved = getSavedLocations();
    const index = saved.findIndex((loc) => loc.id === id);
    if (index === -1) return;

    saved[index] = { ...saved[index], ...updates };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  } catch {
    // ignore
  }
}

/**
 * 특정 라벨의 위치 조회
 */
export function getSavedLocationByLabel(label: 'home' | 'work'): SavedLocation | null {
  const saved = getSavedLocations();
  return saved.find((loc) => loc.label === label) || null;
}
