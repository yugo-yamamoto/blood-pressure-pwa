const VERSION = '1.0.5';

self.addEventListener('install', e => self.skipWaiting());

self.addEventListener('activate', e => {
  // 旧バージョンのキャッシュをすべて削除
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // ナビゲーション（HTMLの読み込み）は常にネットワークから取得
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request, { cache: 'no-store' }));
  }
});
