self.addEventListener('install', (e) => {
  self.skipWaiting(); // 強制跳過等待
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => caches.delete(key)) // 清空所有快取
      );
    }).then(() => {
      return self.clients.claim(); // 強制接管所有客戶端
    }).then(() => {
      // 這裡通知所有打開的視窗（包含安裝版 App）：快取已清空，請立刻重新整理！
      return self.clients.matchAll().then((clients) => {
        clients.forEach((client) => client.navigate(client.url));
      });
    })
  );
});

// 全面回歸網路
self.addEventListener('fetch', (e) => {
  e.respondWith(fetch(e.request));
});
