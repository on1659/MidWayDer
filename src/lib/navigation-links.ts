/**
 * Navigation App Deep Links
 * 
 * 경유지 주소를 각 네비게이션 앱으로 전달하는 딥링크 생성
 */

/**
 * 카카오내비 딥링크
 * @see https://apis.map.kakao.com/web/guide/#routewithapp
 */
export function getKakaoNaviLink(lat: number, lng: number, name: string): string {
  const params = new URLSearchParams({
    ep: `${lat},${lng}`,
    epname: name,
  });
  return `kakaonavi://navigate?${params.toString()}`;
}

/**
 * 카카오내비 딥링크 (경유지 포함)
 * @param start 출발지 좌표
 * @param waypoint 경유지 좌표 + 이름
 * @param end 도착지 좌표
 */
export function getKakaoNaviLinkWithWaypoint(
  start: { lat: number; lng: number },
  waypoint: { lat: number; lng: number; name: string },
  end: { lat: number; lng: number; name?: string }
): string {
  const params = new URLSearchParams({
    sp: `${start.lat},${start.lng}`,
    ep: `${end.lat},${end.lng}`,
    ...(end.name && { epname: end.name }),
    wp: `${waypoint.lat},${waypoint.lng}`,
    wpname: waypoint.name,
  });
  return `kakaonavi://navigate?${params.toString()}`;
}

/**
 * 네이버지도 딥링크
 * @see https://guide.ncloud-docs.com/docs/navermaps-android-v3-url
 */
export function getNaverMapLink(lat: number, lng: number, name: string): string {
  const params = new URLSearchParams({
    lat: lat.toString(),
    lng: lng.toString(),
    name,
    appname: 'com.midwayder',
  });
  return `nmap://place?${params.toString()}`;
}

/**
 * 티맵 딥링크
 * @see https://tmapapi.sktelecom.com/main.html
 */
export function getTmapLink(lat: number, lng: number, name: string): string {
  const params = new URLSearchParams({
    goalname: name,
    goalx: lng.toString(),
    goaly: lat.toString(),
  });
  return `tmap://route?${params.toString()}`;
}

// ────────────────────────────────────────────────────────────
// 선호 네비 앱 기억 (localStorage)
// ────────────────────────────────────────────────────────────

const PREFERRED_NAV_APP_KEY = 'midwayder_preferred_nav_app';

export type NavApp = 'kakao' | 'naver' | 'tmap';

export function getPreferredNavApp(): NavApp | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(PREFERRED_NAV_APP_KEY);
  if (stored === 'kakao' || stored === 'naver' || stored === 'tmap') {
    return stored;
  }
  return null;
}

export function setPreferredNavApp(app: NavApp): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PREFERRED_NAV_APP_KEY, app);
}

// ────────────────────────────────────────────────────────────

/**
 * 앱 스토어 링크 (앱 미설치 시)
 */
export const APP_STORE_LINKS = {
  kakao: {
    ios: 'https://apps.apple.com/kr/app/id417698849',
    android: 'https://play.google.com/store/apps/details?id=com.locnall.KimGiSa',
  },
  naver: {
    ios: 'https://apps.apple.com/kr/app/id311867728',
    android: 'https://play.google.com/store/apps/details?id=com.nhn.android.nmap',
  },
  tmap: {
    ios: 'https://apps.apple.com/kr/app/id431589174',
    android: 'https://play.google.com/store/apps/details?id=com.skt.tmap.ku',
  },
};

/**
 * 네비 앱 열기 (앱 미설치 시 스토어 이동)
 */
export async function openNavigationApp(
  app: 'kakao' | 'naver' | 'tmap',
  lat: number,
  lng: number,
  name: string
): Promise<void> {
  const links = {
    kakao: getKakaoNaviLink(lat, lng, name),
    naver: getNaverMapLink(lat, lng, name),
    tmap: getTmapLink(lat, lng, name),
  };

  const deepLink = links[app];

  // iOS/Android 감지
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isAndroid = /Android/i.test(navigator.userAgent);

  // 딥링크 시도
  const linkOpened = window.open(deepLink, '_self');

  // 앱이 열리지 않으면 스토어로 이동 (2초 후)
  if (!linkOpened || linkOpened.closed || typeof linkOpened.closed === 'undefined') {
    setTimeout(() => {
      const storeLink = isIOS
        ? APP_STORE_LINKS[app].ios
        : isAndroid
        ? APP_STORE_LINKS[app].android
        : APP_STORE_LINKS[app].android; // 기본 Android 스토어

      window.open(storeLink, '_blank');
    }, 2000);
  }
}
