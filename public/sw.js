/**
 * Service Worker for VnExpress WMS Web Push Notifications
 */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Xử lý khi người dùng bấm vào thông báo Web Push
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const urlToOpen = data.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Nếu đã có tab WMS đang mở, focus vào tab đó và gửi message mở task
      for (const client of windowClients) {
        if ('focus' in client) {
          client.focus();
          if (data.taskId) {
            client.postMessage({
              type: 'WMS_OPEN_TASK',
              taskId: data.taskId,
              notificationId: data.notificationId,
            });
          }
          return;
        }
      }
      // Nếu chưa có tab nào, mở tab mới
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

// Xử lý sự kiện push từ background server nếu được đăng ký Web Push protocol
self.addEventListener('push', (event) => {
  let payload = {
    title: 'WMS - Ban Sản phẩm VnExpress',
    body: 'Bạn có thông báo mới trong hệ thống.',
    icon: '/icon.png',
    badge: '/icon.png',
    data: {},
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      payload = { ...payload, ...parsed };
    } catch (e) {
      payload.body = event.data.text();
    }
  }

  const options = {
    body: payload.body,
    icon: payload.icon || '/icon.png',
    badge: payload.badge || '/icon.png',
    tag: payload.tag || 'wms-general-notification',
    renotify: true,
    data: payload.data || {},
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, options)
  );
});
