const CACHE_NAME = 'midwayder-v0.30.0';
const OFFLINE_URL = '/offline.html';

// 캐시할 정적 자산
const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

// Install 이벤트: 정적 자산 캐싱
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate 이벤트: 이전 캐시 정리
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => {
          console.log('[SW] Deleting old cache:', key);
          return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch 이벤트: 네트워크 우선, 실패 시 캐시
self.addEventListener('fetch', (event) => {
  // API 요청은 캐시하지 않음
  if (event.request.url.includes('/api/')) {
    return;
  }

  // 지도 타일 요청은 네트워크만 사용
  if (event.request.url.includes('navermaps') || event.request.url.includes('pstatic.net')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 성공 시 캐시 업데이트
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // 네트워크 실패 시 캐시에서 검색
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }

          // HTML 요청은 오프라인 페이지로
          if (event.request.headers.get('accept').includes('text/html')) {
            return caches.match(OFFLINE_URL);
          }

          // 기타 요청은 404 반환
          return new Response('Not found', { status: 404 });
        });
      })
  );
});
