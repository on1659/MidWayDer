const CACHE_NAME = 'midwayder-v0.67.0';
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

// ============================================
// v0.58.0: 백그라운드 동기화
// ============================================

const SYNC_TAG = 'sync-search-queue';
const SYNC_DB_NAME = 'MidWayDerSyncQueue';
const SYNC_DB_VERSION = 1;

// 백그라운드 동기화 이벤트
self.addEventListener('sync', (event) => {
  if (event.tag === SYNC_TAG) {
    console.log('[SW] Background sync triggered:', event.tag);
    event.waitUntil(processSyncQueue());
  }
});

// 메시지 이벤트 (클라이언트에서 동기화 요청)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'TRIGGER_SYNC') {
    console.log('[SW] Manual sync triggered');
    event.waitUntil(processSyncQueue());
  }
});

// 동기화 큐 처리
async function processSyncQueue() {
  console.log('[SW] Processing sync queue...');
  
  try {
    const db = await openSyncDB();
    const pendingItems = await getPendingItems(db);
    
    console.log(`[SW] Found ${pendingItems.length} pending items`);
    
    for (const item of pendingItems) {
      await processSyncItem(db, item);
    }
    
    // 클라이언트에 완료 알림
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETED',
        pendingCount: pendingItems.length
      });
    });
    
    console.log('[SW] Sync queue processing completed');
  } catch (error) {
    console.error('[SW] Sync queue processing failed:', error);
  }
}

// 개별 아이템 처리
async function processSyncItem(db, item) {
  const { id, payload, retryCount, maxRetries } = item;
  
  // 상태를 'syncing'으로 변경
  await updateItemStatus(db, id, 'syncing');
  
  try {
    const response = await fetch(payload.endpoint, {
      method: payload.method,
      headers: {
        'Content-Type': 'application/json',
        ...payload.headers
      },
      body: payload.body ? JSON.stringify(payload.body) : undefined
    });
    
    if (response.ok) {
      await updateItemStatus(db, id, 'completed');
      console.log(`[SW] Item ${id} synced successfully`);
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    console.error(`[SW] Item ${id} sync failed:`, error);
    
    if (retryCount + 1 >= maxRetries) {
      await updateItemStatus(db, id, 'failed', error.message);
    } else {
      await updateItemRetryCount(db, id, retryCount + 1);
    }
  }
}

// IndexedDB 헬퍼 함수들
function openSyncDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(SYNC_DB_NAME, SYNC_DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('syncQueue')) {
        db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

function getPendingItems(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['syncQueue'], 'readonly');
    const store = transaction.objectStore('syncQueue');
    const request = store.getAll();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const all = request.result;
      const pending = all.filter(item => item.status === 'pending');
      resolve(pending);
    };
  });
}

function updateItemStatus(db, id, status, error = null) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['syncQueue'], 'readwrite');
    const store = transaction.objectStore('syncQueue');
    const request = store.get(id);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const item = request.result;
      if (item) {
        item.status = status;
        if (status === 'completed') {
          item.completedAt = Date.now();
        }
        if (error) {
          item.lastError = error;
        }
        store.put(item);
      }
      resolve();
    };
  });
}

function updateItemRetryCount(db, id, retryCount) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['syncQueue'], 'readwrite');
    const store = transaction.objectStore('syncQueue');
    const request = store.get(id);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const item = request.result;
      if (item) {
        item.retryCount = retryCount;
        item.status = 'pending';
        store.put(item);
      }
      resolve();
    };
  });
}

// ============================================
// v0.59.0: 푸시 알림
// ============================================

// 푸시 이벤트 수신
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');

  let data = { title: 'MidWayDer', body: '새로운 알림이 있습니다.' };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (_e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
    },
    actions: [
      { action: 'open', title: '열기' },
      { action: 'close', title: '닫기' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// 알림 클릭 이벤트
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');

  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // 이미 열린 창이 있으면 포커스
      for (const client of clients) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // 없으면 새 창 열기
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});
