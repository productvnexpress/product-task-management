/**
 * @license
 * VnExpress WMS Chrome Extension - Background Service Worker
 * Copyright (c) 2026 Ban Sản phẩm - Công nghệ VnExpress
 */

const SUPABASE_URL = 'https://hyhtykhfnyrrvydizwta.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5aHR5a2hmbnlycnZ5ZGl6d3RhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3Mzk5ODYsImV4cCI6MjEwNDMxNTk4Nn0.58KeAN-L1zkMD-gW-RJDe9akhMQgW8s5xeQbPJdZNcA';
const DEFAULT_APP_URL = 'https://product-task-management-qr39.vercel.app';
const ALARM_NAME = 'wms_check_notifications_alarm';
const CHECK_INTERVAL_MINUTES = 1;

// Lấy địa chỉ máy chủ thực tế (tự động chuyển sang Vercel nếu đang lưu localhost)
async function getEffectiveAppUrl() {
  try {
    const storage = await chrome.storage.local.get(['wms_app_url']);
    let url = storage.wms_app_url;
    if (!url || url.includes('localhost:5173')) {
      url = DEFAULT_APP_URL;
      await chrome.storage.local.set({ wms_app_url: DEFAULT_APP_URL });
    }
    return url.replace(/\/$/, '');
  } catch {
    return DEFAULT_APP_URL;
  }
}

// 1. Khởi tạo Extension & Đăng ký Alarm định kỳ
chrome.runtime.onInstalled.addListener(() => {
  console.log('[WMS Extension] Extension đã được cài đặt thành công.');

  // Tự động thiết lập URL Vercel mặc định
  getEffectiveAppUrl();

  // Thiết lập alarm định kỳ 1 phút để đánh thức Service Worker
  chrome.alarms.create(ALARM_NAME, {
    periodInMinutes: CHECK_INTERVAL_MINUTES,
  });

  // Chạy kiểm tra ngay lần đầu
  checkNotifications();
});

// 2. Lắng nghe Alarm định kỳ mỗi phút
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    checkNotifications();
    checkDaily1630Reminder();
  }
});

// 3. Hàm chính: Kiểm tra thông báo mới từ Supabase
async function checkNotifications() {
  try {
    const storage = await chrome.storage.local.get([
      'wms_user',
      'wms_notified_ids',
      'wms_app_url',
    ]);
    const user = storage.wms_user;

    // Nếu người dùng chưa chọn tài khoản
    if (!user || !user.name) {
      chrome.action.setBadgeText({ text: '!' });
      chrome.action.setBadgeBackgroundColor({ color: '#ea580c' });
      return;
    }

    const notifiedIds = new Set(storage.wms_notified_ids || []);

    // Gọi trực tiếp Supabase REST API
    const endpoint = `${SUPABASE_URL}/rest/v1/notifications?recipient_name=eq.${encodeURIComponent(
      user.name
    )}&order=created_at.desc&limit=25`;

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn('[WMS Extension] Supabase API trả về lỗi:', response.status);
      return;
    }

    const notifications = await response.json();

    // 1. Tính số lượng chưa đọc để cập nhật Badge
    const unreadList = notifications.filter((n) => !n.is_read);
    const unreadCount = unreadList.length;

    if (unreadCount > 0) {
      chrome.action.setBadgeText({ text: String(unreadCount) });
      chrome.action.setBadgeBackgroundColor({ color: '#963861' }); // Màu mận VnExpress
    } else {
      chrome.action.setBadgeText({ text: '' });
    }

    // 2. Lưu bộ nhớ đệm danh sách để popup hiển thị nhanh
    await chrome.storage.local.set({
      wms_notifications_cache: notifications,
      wms_unread_count: unreadCount,
      wms_last_checked: new Date().toISOString(),
    });

    // 3. Quét thông báo chưa bắn vào hệ điều hành & tab trình duyệt
    let newNotified = false;
    for (const notif of notifications) {
      // Chỉ bắn các thông báo chưa đọc và chưa từng bắn qua Chrome Notification
      if (!notif.is_read && !notifiedIds.has(notif.id)) {
        dispatchSystemNotification(notif);
        broadcastInPageToast(notif);
        notifiedIds.add(notif.id);
        newNotified = true;
      }
    }

    if (newNotified) {
      // Giới hạn lưu tối đa 500 ID để tránh tràn storage
      const trimmedIds = Array.from(notifiedIds).slice(-500);
      await chrome.storage.local.set({ wms_notified_ids: trimmedIds });
    }
  } catch (err) {
    console.error('[WMS Extension] Lỗi khi kiểm tra thông báo:', err);
  }
}

// 4. Bắn popup thông báo của hệ điều hành (macOS / Windows)
function dispatchSystemNotification(notif) {
  const notifId = `wms-notif-${notif.id}`;
  const title = notif.title || 'VnExpress WMS - Công việc';
  const message = notif.content || notif.message || 'Bạn có thông báo mới từ hệ thống';
  const context = notif.project_name
    ? `${notif.project_name.replace(/^Dự án\s+/i, '')} • ${notif.actor_name || 'Hệ thống'}`
    : 'Hệ thống Quản lý Công việc WMS';

  chrome.notifications.create(notifId, {
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icons/icon-128.png'),
    title: title,
    message: message,
    contextMessage: context,
    priority: 2,
    requireInteraction: true, // Lưu lại trên Notification Center đến khi click
  });
}

// 5. Xử lý khi người dùng click vào thông báo trên màn hình
chrome.notifications.onClicked.addListener(async (notifId) => {
  const realId = notifId.replace(/^wms-notif-/, '');
  const appUrl = await getEffectiveAppUrl();
  const storage = await chrome.storage.local.get(['wms_notifications_cache']);
  const list = storage.wms_notifications_cache || [];
  const found = list.find((n) => String(n.id) === realId);

  let targetUrl = `${appUrl}/tasks`;
  if (found) {
    const taskId = found.task_id || found.taskId || (found.entity_type === 'task' ? found.entity_id : null);
    if (taskId) {
      targetUrl = `${appUrl}/tasks/${taskId}`;
    }
  }

  // Đánh dấu đã đọc trên Supabase
  if (realId && !realId.startsWith('test-') && !realId.startsWith('1630-')) {
    fetch(`${SUPABASE_URL}/rest/v1/notifications?id=eq.${realId}`, {
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ is_read: true }),
    }).catch(console.warn);
  }

  // Xóa notification khỏi trung tâm thông báo
  chrome.notifications.clear(notifId);

  // Mở hoặc focus vào tab WMS
  openOrFocusAppTab(targetUrl);
});

// 6. Tự động kiểm tra và nhắc nhở đóng task lúc 16:30 hàng ngày
async function checkDaily1630Reminder() {
  const now = new Date();
  const day = now.getDay();
  // Bỏ qua Thứ 7 (6) và Chủ Nhật (0)
  if (day === 0 || day === 6) return;

  const hours = now.getHours();
  const minutes = now.getMinutes();

  // Khung giờ 16:30 - 16:35
  if (hours === 16 && minutes >= 30 && minutes <= 35) {
    const todayStr = now.toISOString().slice(0, 10);
    const reminderKey = `wms_daily_1630_sent_${todayStr}`;
    const storage = await chrome.storage.local.get([reminderKey, 'wms_user']);

    if (!storage[reminderKey] && storage.wms_user) {
      const appUrl = await getEffectiveAppUrl();
      const reminderNotif = {
        id: `1630-${todayStr}`,
        title: 'Đóng task trong ngày (16:30)',
        content: 'Rà soát và hoàn thành hoặc dời hạn các task đến hạn hôm nay trước khi kết thúc ca làm việc.',
        project_name: 'Ban Sản phẩm - Công nghệ VnExpress',
        targetUrl: `${appUrl}/tasks`,
      };

      chrome.notifications.create(`1630-${todayStr}`, {
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icons/icon-128.png'),
        title: reminderNotif.title,
        message: reminderNotif.content,
        contextMessage: reminderNotif.project_name,
        priority: 2,
        requireInteraction: true,
      });

      broadcastInPageToast(reminderNotif);

      await chrome.storage.local.set({ [reminderKey]: true });
    }
  }
}

// 7. Bắn Toast Notification trực tiếp lên trang web người dùng đang lướt (Facebook, VnExpress, Google...)
async function broadcastInPageToast(notif) {
  try {
    const appUrl = await getEffectiveAppUrl();
    const taskId = notif.task_id || notif.taskId || (notif.entity_type === 'task' ? notif.entity_id : null);
    const targetUrl = notif.targetUrl || (taskId ? `${appUrl}/tasks/${taskId}` : `${appUrl}/tasks`);
    const payload = { ...notif, appUrl, targetUrl };

    // Tìm tất cả các tab đang active trên các cửa sổ trình duyệt
    chrome.tabs.query({ active: true }, (tabs) => {
      if (!tabs || tabs.length === 0) return;
      tabs.forEach((tab) => {
        if (!tab.id || !tab.url) return;
        // Bỏ qua các trang nội bộ của Chrome
        if (
          tab.url.startsWith('chrome://') ||
          tab.url.startsWith('chrome-extension://') ||
          tab.url.startsWith('edge://') ||
          tab.url.startsWith('about:')
        ) {
          return;
        }

        // Gửi tới Content Script trên tab
        chrome.tabs.sendMessage(tab.id, {
          action: 'SHOW_INPAGE_TOAST',
          notification: payload,
        }).catch(() => {});
      });
    });
  } catch (err) {
    console.warn('[WMS Background] Lỗi broadcast toast:', err);
  }
}

// 8. Helper mở hoặc focus tab WMS
function openOrFocusAppTab(url) {
  chrome.tabs.query({}, (tabs) => {
    const cleanUrl = url.replace(/\/$/, '');
    // Nhận diện tab WMS theo domain Vercel hoặc localhost
    const existingTab = tabs.find(
      (t) =>
        t.url &&
        (t.url.includes('product-task-management-qr39.vercel.app') ||
          t.url.includes('product-task-management') ||
          t.url.includes('localhost:5173'))
    );

    if (existingTab && existingTab.id) {
      chrome.tabs.update(existingTab.id, { url: cleanUrl, active: true });
      if (existingTab.windowId) {
        chrome.windows.update(existingTab.windowId, { focused: true });
      }
    } else {
      chrome.tabs.create({ url: cleanUrl });
    }
  });
}

// 9. Lắng nghe tin nhắn từ Popup UI hoặc Content Script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'TRIGGER_CHECK') {
    checkNotifications().then(() => sendResponse({ success: true }));
    return true;
  }

  // Nhận yêu cầu mở trang WMS từ Toast Popup trên website
  if (request.action === 'OPEN_WMS_TAB') {
    getEffectiveAppUrl().then((appUrl) => {
      const targetUrl = request.url || `${appUrl}/tasks`;
      if (
        request.notificationId &&
        !String(request.notificationId).startsWith('test-') &&
        !String(request.notificationId).startsWith('1630-')
      ) {
        fetch(`${SUPABASE_URL}/rest/v1/notifications?id=eq.${request.notificationId}`, {
          method: 'PATCH',
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({ is_read: true }),
        }).catch(console.warn);
      }
      openOrFocusAppTab(targetUrl);
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === 'TEST_NOTIFICATION') {
    getEffectiveAppUrl().then((appUrl) => {
      const testNotif = {
        id: `test-${Date.now()}`,
        title: 'Kiểm tra chuông WMS thành công! 🔔',
        content: 'Popup thông báo hoạt động trực tiếp trên mọi website bạn đang xem (Facebook, VnExpress, Google...)',
        project_name: 'Ban Sản phẩm - Công nghệ VnExpress',
        actor_name: 'Hệ thống WMS',
        targetUrl: `${appUrl}/tasks`,
      };

      // 1. Gửi OS notification
      chrome.notifications.create(
        testNotif.id,
        {
          type: 'basic',
          iconUrl: chrome.runtime.getURL('icons/icon-128.png'),
          title: testNotif.title,
          message: testNotif.content,
          contextMessage: testNotif.project_name,
          priority: 2,
        },
        () => {
          if (chrome.runtime.lastError) {
            // Không crash nếu macOS chặn
          }
        }
      );

      // 2. Bắn ngay In-page toast lên tab hiện tại
      broadcastInPageToast(testNotif);

      sendResponse({ success: true });
    });
    return true;
  }

  // Tự động nhận diện tài khoản đồng bộ từ Web App
  if (request.action === 'SYNC_LOGGED_IN_USER' && request.username) {
    handleSyncUser(request.username).then((user) => {
      sendResponse({ success: true, user });
    });
    return true;
  }
});

// Hàm hỗ trợ đồng bộ nhân sự từ Supabase dựa trên username từ Web App
async function handleSyncUser(username) {
  try {
    const norm = String(username).trim().toLowerCase();
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/members?select=id,name,username,team,email&order=name.asc`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );
    if (!res.ok) return null;
    const members = await res.json();

    const matched = members.find((m) => {
      const u = (m.username || '').toLowerCase();
      const emailPrefix = (m.email || '').split('@')[0].toLowerCase();
      return u === norm || emailPrefix === norm;
    });

    if (matched && matched.name) {
      const userObj = {
        id: matched.id,
        name: matched.name,
        username: matched.username || norm,
        team: matched.team || 'Ban Sản phẩm - Công nghệ',
      };
      await chrome.storage.local.set({ wms_user: userObj });
      checkNotifications();
      return userObj;
    }
  } catch (e) {
    console.warn('[WMS Background] Lỗi sync user:', e);
  }
  return null;
}
