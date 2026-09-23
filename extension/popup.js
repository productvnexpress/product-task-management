/**
 * @license
 * VnExpress WMS Chrome Extension - Popup Controller
 * Copyright (c) 2026 Ban Sản phẩm - Công nghệ VnExpress
 */

const SUPABASE_URL = 'https://hyhtykhfnyrrvydizwta.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5aHR5a2hmbnlycnZ5ZGl6d3RhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3Mzk5ODYsImV4cCI6MjEwNDMxNTk4Nn0.58KeAN-L1zkMD-gW-RJDe9akhMQgW8s5xeQbPJdZNcA';
const DEFAULT_APP_URL = 'https://product-task-management-qr39.vercel.app';
const DEFAULT_PASSWORD = '@26022001!';

// Danh sách nhân sự mặc định của Ban Sản phẩm - Công nghệ
let membersList = [
  { name: 'Đặng Tiến Ngọc', team: 'Ban Giám đốc', username: 'dangtienngoc' },
  { name: 'Trần Huy Anh', team: 'Product Manager', username: 'huyanh' },
  { name: 'Tiêu Anh Trung', team: 'Product Manager', username: 'anhtrung' },
  { name: 'Vũ Tuấn Trung', team: 'Product Manager', username: 'tuantrung' },
  { name: 'Ngô Quang Vinh', team: 'Data', username: 'quangvinh' },
  { name: 'Nguyễn Trung Hiếu', team: 'SEO', username: 'nguyenhieu' },
  { name: 'Vũ Hồng Sơn', team: 'UX/UI Designer', username: 'hongson' },
  { name: 'Trần Quốc Tùng', team: 'UX/UI Designer', username: 'quoctung' },
  { name: 'Lê Thu Trang', team: 'UX/UI Designer', username: 'thutrang' },
  { name: 'Nguyễn Hoàng Nam', team: 'UX/UI Designer', username: 'hoangnam' },
  { name: 'Nguyễn Văn Đạt', team: 'UX/UI Designer', username: 'vandat' },
  { name: 'Đỗ Thị Minh Thoa', team: 'UX/UI Designer', username: 'minhthoa' },
  { name: 'Hà Thị Bích Ngọc', team: 'UX/UI Designer', username: 'bichngoc' }
];

document.addEventListener('DOMContentLoaded', async () => {
  // Views
  const loginView = document.getElementById('loginView');
  const mainView = document.getElementById('mainView');

  // Login View Elements
  const formLogin = document.getElementById('formLogin');
  const loginUserSelect = document.getElementById('loginUserSelect');
  const inputLoginPassword = document.getElementById('inputLoginPassword');
  const loginError = document.getElementById('loginError');
  const btnSubmitLogin = document.getElementById('btnSubmitLogin');
  const btnQuickLoginWeb = document.getElementById('btnQuickLoginWeb');

  // Main View Elements
  const userAvatar = document.getElementById('userAvatar');
  const userNameDisplay = document.getElementById('userNameDisplay');
  const userTeamDisplay = document.getElementById('userTeamDisplay');
  const btnLogout = document.getElementById('btnLogout');
  const btnOpenWMS = document.getElementById('btnOpenWMS');
  const btnTestNotif = document.getElementById('btnTestNotif');
  const testFeedback = document.getElementById('testFeedback');
  const btnRefresh = document.getElementById('btnRefresh');
  const notifList = document.getElementById('notifList');
  const notifCount = document.getElementById('notifCount');

  // Settings
  const toggleSettings = document.getElementById('toggleSettings');
  const settingsDrawer = document.getElementById('settingsDrawer');
  const inputAppUrl = document.getElementById('inputAppUrl');
  const btnSaveAppUrl = document.getElementById('btnSaveAppUrl');

  // 1. Nạp danh sách thành viên vào form Đăng nhập
  await initMembersDropdown();

  // 2. Kiểm tra phiên đăng nhập đã lưu
  const storage = await chrome.storage.local.get([
    'wms_user',
    'wms_app_url',
    'wms_notifications_cache',
  ]);

  let effectiveAppUrl = storage.wms_app_url;
  if (!effectiveAppUrl || effectiveAppUrl.includes('localhost:5173')) {
    effectiveAppUrl = DEFAULT_APP_URL;
    await chrome.storage.local.set({ wms_app_url: DEFAULT_APP_URL });
  }
  inputAppUrl.value = effectiveAppUrl;

  // Điều phối hiển thị theo trạng thái đăng nhập
  if (storage.wms_user && storage.wms_user.name) {
    showMainDashboard(storage.wms_user);
    if (storage.wms_notifications_cache && storage.wms_notifications_cache.length > 0) {
      renderNotifications(storage.wms_notifications_cache);
    } else {
      refreshNotifications();
    }
  } else {
    showLoginForm();
  }

  // 3. Xử lý Đăng nhập
  formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.style.display = 'none';

    const selectedName = loginUserSelect.value;
    const password = inputLoginPassword.value.trim();

    if (!selectedName) {
      showError('Vui lòng chọn tài khoản của bạn.');
      return;
    }
    if (!password) {
      showError('Vui lòng nhập mật khẩu.');
      return;
    }

    const member = membersList.find((m) => m.name === selectedName);
    const username = member?.username || selectedName.toLowerCase().replace(/\s+/g, '');

    btnSubmitLogin.disabled = true;
    btnSubmitLogin.innerHTML = '<span>Đang xác thực...</span>';

    try {
      // Kiểm tra mật khẩu trong Supabase member_credentials
      let isValid = false;
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/member_credentials?username=eq.${encodeURIComponent(username)}&select=password_hash`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
        }
      );

      if (res.ok) {
        const creds = await res.json();
        if (creds && creds.length > 0 && creds[0].password_hash) {
          isValid = password === creds[0].password_hash;
        } else {
          // Chưa đổi mật khẩu: dùng mật khẩu mặc định
          isValid = password === DEFAULT_PASSWORD;
        }
      } else {
        isValid = password === DEFAULT_PASSWORD;
      }

      if (!isValid) {
        showError('Mật khẩu không chính xác. Mật khẩu mặc định là @26022001!');
        btnSubmitLogin.disabled = false;
        btnSubmitLogin.innerHTML = '<span>Đăng nhập</span>';
        return;
      }

      // Đăng nhập thành công: Lưu vào storage
      const userObj = {
        name: member?.name || selectedName,
        username: username,
        team: member?.team || 'Ban Sản phẩm - Công nghệ',
      };

      await chrome.storage.local.set({ wms_user: userObj });

      // Đánh thức service worker kiểm tra ngay
      chrome.runtime.sendMessage({ action: 'TRIGGER_CHECK' });

      showMainDashboard(userObj);
      refreshNotifications();
    } catch (err) {
      console.warn('Lỗi đăng nhập:', err);
      // Fallback kiểm tra mật khẩu mặc định
      if (password === DEFAULT_PASSWORD) {
        const userObj = {
          name: member?.name || selectedName,
          username: username,
          team: member?.team || 'Ban Sản phẩm - Công nghệ',
        };
        await chrome.storage.local.set({ wms_user: userObj });
        chrome.runtime.sendMessage({ action: 'TRIGGER_CHECK' });
        showMainDashboard(userObj);
        refreshNotifications();
      } else {
        showError('Không thể kết nối máy chủ. Mật khẩu mặc định là @26022001!');
      }
    } finally {
      btnSubmitLogin.disabled = false;
      btnSubmitLogin.innerHTML = '<span>Đăng nhập</span>';
    }
  });

  // 4. Xử lý Đăng xuất
  btnLogout.addEventListener('click', async () => {
    await chrome.storage.local.remove(['wms_user', 'wms_notifications_cache']);
    chrome.action.setBadgeText({ text: '!' });
    chrome.action.setBadgeBackgroundColor({ color: '#ea580c' });
    showLoginForm();
  });

  // 5. Nút Mở Web WMS để đăng nhập nhanh
  btnQuickLoginWeb.addEventListener('click', async () => {
    const s = await chrome.storage.local.get(['wms_app_url']);
    const targetUrl = s.wms_app_url || DEFAULT_APP_URL;
    chrome.tabs.create({ url: targetUrl });
  });

  // 6. Lắng nghe thay đổi storage (Tự động cập nhật nếu web app sync tài khoản)
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.wms_user) {
      if (changes.wms_user.newValue) {
        showMainDashboard(changes.wms_user.newValue);
        refreshNotifications();
      } else {
        showLoginForm();
      }
    }
  });

  // 7. Nút Mở WMS
  btnOpenWMS.addEventListener('click', async () => {
    const s = await chrome.storage.local.get(['wms_app_url']);
    const targetUrl = (s.wms_app_url || DEFAULT_APP_URL).replace(/\/$/, '') + '/tasks';
    chrome.runtime.sendMessage({ action: 'OPEN_WMS_TAB', url: targetUrl });
  });

  // 8. Nút Test thông báo & âm thanh chuông
  btnTestNotif.addEventListener('click', () => {
    const originalHtml = btnTestNotif.innerHTML;
    btnTestNotif.innerHTML = '<span>🔔 Đang phát...</span>';
    btnTestNotif.disabled = true;

    // Phát chuông bằng Web Audio API
    playChimeSound();

    // Tạo thông báo Desktop
    try {
      chrome.notifications.create(
        `test-${Date.now()}`,
        {
          type: 'basic',
          iconUrl: chrome.runtime.getURL('icons/icon-128.png'),
          title: 'Kiểm tra chuông WMS thành công! 🔔',
          message: 'Extension đang hoạt động bình thường và sẵn sàng nhận thông báo.',
          contextMessage: 'Ban Sản phẩm - Công nghệ VnExpress',
          priority: 2,
        },
        (id) => {
          if (chrome.runtime.lastError) {
            console.warn('[Popup] Notification error:', chrome.runtime.lastError);
          }
        }
      );
    } catch (_) {}

    // Gửi thêm cho background
    try {
      chrome.runtime.sendMessage({ action: 'TEST_NOTIFICATION' }).catch(() => {});
    } catch (_) {}

    if (testFeedback) {
      testFeedback.style.display = 'block';
    }

    btnTestNotif.innerHTML = '<span style="color: #166534;">✓ Đã phát chuông!</span>';
    setTimeout(() => {
      btnTestNotif.innerHTML = originalHtml;
      btnTestNotif.disabled = false;
    }, 2500);
  });

  // 9. Nút Làm mới
  btnRefresh.addEventListener('click', () => {
    refreshNotifications();
  });

  // 10. Đổi URL WMS
  toggleSettings.addEventListener('click', (e) => {
    e.preventDefault();
    settingsDrawer.classList.toggle('open');
  });

  btnSaveAppUrl.addEventListener('click', async () => {
    let url = inputAppUrl.value.trim();
    if (!url) url = DEFAULT_APP_URL;
    await chrome.storage.local.set({ wms_app_url: url });
    settingsDrawer.classList.remove('open');
    alert('Đã lưu địa chỉ máy chủ WMS thành công!');
  });

  // --- Helper Functions ---

  function showLoginForm() {
    loginView.style.display = 'flex';
    mainView.style.display = 'none';
    inputLoginPassword.value = '';
    loginError.style.display = 'none';
  }

  function showMainDashboard(user) {
    loginView.style.display = 'none';
    mainView.style.display = 'flex';

    userNameDisplay.textContent = user.name || 'Thành viên WMS';
    userTeamDisplay.textContent = user.team || 'Ban Sản phẩm - Công nghệ';

    // Initials cho avatar
    const nameParts = (user.name || 'W').trim().split(/\s+/);
    const initial =
      nameParts.length >= 2
        ? `${nameParts[nameParts.length - 2][0]}${nameParts[nameParts.length - 1][0]}`
        : nameParts[0].slice(0, 2);
    userAvatar.textContent = initial.toUpperCase();
  }

  function showError(msg) {
    loginError.textContent = msg;
    loginError.style.display = 'block';
  }

  async function initMembersDropdown() {
    loginUserSelect.innerHTML = '<option value="">-- Chọn thành viên nhận việc --</option>';

    // Tạo option từ membersList mặc định
    membersList.forEach((m) => {
      const opt = document.createElement('option');
      opt.value = m.name;
      opt.textContent = `${m.name} (${m.team})`;
      loginUserSelect.appendChild(opt);
    });

    // Cập nhật thêm từ Supabase nếu có
    fetch(`${SUPABASE_URL}/rest/v1/members?select=id,name,username,team,email&order=name.asc`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (data && data.length > 0) {
          membersList = data;
          const currentVal = loginUserSelect.value;
          loginUserSelect.innerHTML = '<option value="">-- Chọn thành viên nhận việc --</option>';
          data.forEach((m) => {
            if (!m.name) return;
            const opt = document.createElement('option');
            opt.value = m.name;
            opt.textContent = m.team ? `${m.name} (${m.team})` : m.name;
            loginUserSelect.appendChild(opt);
          });
          if (currentVal) loginUserSelect.value = currentVal;
        }
      })
      .catch(() => {});
  }

  async function refreshNotifications() {
    const s = await chrome.storage.local.get(['wms_user']);
    const user = s.wms_user;

    if (!user || !user.name) {
      showLoginForm();
      return;
    }

    notifList.innerHTML = '<div class="empty-state">Đang tải thông báo mới nhất...</div>';

    try {
      const endpoint = `${SUPABASE_URL}/rest/v1/notifications?recipient_name=eq.${encodeURIComponent(
        user.name
      )}&order=created_at.desc&limit=25`;

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      });

      if (!response.ok) {
        throw new Error('Supabase response error: ' + response.status);
      }

      const list = await response.json();
      await chrome.storage.local.set({ wms_notifications_cache: list });
      renderNotifications(list);
    } catch (err) {
      console.warn('[Popup] Lỗi tải notifications:', err);
      notifList.innerHTML = '<div class="empty-state">Không thể kết nối máy chủ Supabase</div>';
    }
  }

  function renderNotifications(items) {
    if (!items || items.length === 0) {
      notifList.innerHTML = '<div class="empty-state">Chưa có thông báo nào</div>';
      notifCount.textContent = '0';
      return;
    }

    notifCount.textContent = String(items.length);
    notifList.innerHTML = '';

    items.slice(0, 15).forEach((n) => {
      const itemEl = document.createElement('div');
      itemEl.className = `notif-item ${!n.is_read ? 'unread' : ''}`;

      const titleRow = document.createElement('div');
      titleRow.className = 'notif-title-row';

      const titleEl = document.createElement('span');
      titleEl.className = 'notif-title';
      titleEl.textContent = n.title || 'Thông báo công việc';

      titleRow.appendChild(titleEl);

      if (!n.is_read) {
        const dot = document.createElement('span');
        dot.className = 'unread-dot';
        titleRow.appendChild(dot);
      }

      const contentEl = document.createElement('div');
      contentEl.className = 'notif-content';
      contentEl.textContent = n.content || n.message || '';

      const metaEl = document.createElement('div');
      metaEl.className = 'notif-meta';
      const projName = n.project_name ? n.project_name.replace(/^Dự án\s+/i, '') : 'WMS';
      const actorName = n.actor_name || '';
      metaEl.innerHTML = `<span>${projName}${actorName ? ' • ' + actorName : ''}</span><span>${formatTime(n.created_at)}</span>`;

      itemEl.appendChild(titleRow);
      itemEl.appendChild(contentEl);
      itemEl.appendChild(metaEl);

      // Khi click vào item: đánh dấu đã đọc và mở web app
      itemEl.addEventListener('click', async () => {
        if (!n.is_read) {
          fetch(`${SUPABASE_URL}/rest/v1/notifications?id=eq.${n.id}`, {
            method: 'PATCH',
            headers: {
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ is_read: true }),
          }).catch(console.warn);

          n.is_read = true;
          itemEl.classList.remove('unread');
          const d = itemEl.querySelector('.unread-dot');
          if (d) d.remove();
        }

        const s = await chrome.storage.local.get(['wms_app_url']);
        const baseUrl = (s.wms_app_url || DEFAULT_APP_URL).replace(/\/$/, '');
        const taskId = n.task_id || n.taskId || (n.entity_type === 'task' ? n.entity_id : null);
        const targetUrl = taskId ? `${baseUrl}/tasks/${taskId}` : `${baseUrl}/tasks`;
        chrome.runtime.sendMessage({ action: 'OPEN_WMS_TAB', url: targetUrl, notificationId: n.id });
      });

      notifList.appendChild(itemEl);
    });
  }

  function formatTime(isoStr) {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();

      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');

      if (isToday) {
        return `Hôm nay ${hours}:${mins}`;
      }
      return `${d.getDate()}/${d.getMonth() + 1} ${hours}:${mins}`;
    } catch {
      return '';
    }
  }

  function playChimeSound() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const now = ctx.currentTime;

      // Note 1 (E5 - 659 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0.25, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      // Note 2 (A5 - 880 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.12);
      gain2.gain.setValueAtTime(0.35, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.7);
    } catch (err) {
      console.warn('[Popup] Web Audio error:', err);
    }
  }
});
