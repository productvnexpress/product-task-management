/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NotificationItem } from '../types';

export type WebPushPermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

export interface WebPushOptions {
  body?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  taskId?: string;
  onClick?: () => void;
}

export interface WebPushResult {
  success: boolean;
  permission: WebPushPermissionState;
  reason?: string;
}

const STORAGE_KEY_WEB_PUSH_ENABLED = 'vne_web_push_enabled';

let swRegistration: ServiceWorkerRegistration | null = null;
let cachedIconUrl: string | null = null;

/**
 * Tạo icon PNG chuẩn Base64 bằng HTML5 Canvas để tương thích 100% với macOS/Windows/Linux/Mobile
 * (Không dùng SVG trực tiếp vì macOS Notification Center sẽ từ chối hiển thị)
 */
export function getNotificationIconUrl(): string {
  if (cachedIconUrl) return cachedIconUrl;
  if (typeof document === 'undefined') return '/icon.png';

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '/icon.png';

    // Nền màu mận thương hiệu VnExpress #963861
    ctx.fillStyle = '#963861';
    ctx.beginPath();
    ctx.roundRect(0, 0, 128, 128, 26);
    ctx.fill();

    // Chữ WMS trắng sắc nét ở giữa
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('WMS', 64, 68);

    cachedIconUrl = canvas.toDataURL('image/png');
    return cachedIconUrl;
  } catch {
    return '/icon.png';
  }
}

/**
 * Phát âm thanh thông báo dịu nhẹ qua Web Audio API (không cần tải file audio bên ngoài)
 */
export function playNotificationSound(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Nốt 1: D5 (587.33 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.12, now + 0.03);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.22);

    // Nốt 2: A5 (880 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.1);
    gain2.gain.setValueAtTime(0, now + 0.1);
    gain2.gain.linearRampToValueAtTime(0.15, now + 0.13);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.4);
  } catch (e) {
    // Không làm phiền nếu trình duyệt chặn audio policy
  }
}

/**
 * Phát sự kiện Custom Event để hiển thị In-App Toast ngay trên giao diện
 */
export function dispatchInAppToast(title: string, body?: string, taskId?: string): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('wms-notification-toast', {
      detail: { title, body, taskId },
    })
  );
}

/**
 * Kiểm tra xem trình duyệt có hỗ trợ Web Notification API hay không
 */
export function isWebPushSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Lấy trạng thái cấp quyền hiện tại của trình duyệt
 */
export function getWebPushPermission(): WebPushPermissionState {
  if (!isWebPushSupported()) return 'unsupported';
  return Notification.permission as WebPushPermissionState;
}

/**
 * Kiểm tra xem người dùng có đang bật nhận thông báo trình duyệt trong cài đặt WMS không
 */
export function isWebPushEnabledByUser(): boolean {
  if (!isWebPushSupported()) return false;
  if (Notification.permission !== 'granted') return false;
  const stored = localStorage.getItem(STORAGE_KEY_WEB_PUSH_ENABLED);
  return stored !== 'false';
}

/**
 * Lưu tùy chọn bật/tắt Web Push của người dùng
 */
export function setWebPushEnabledByUser(enabled: boolean): void {
  localStorage.setItem(STORAGE_KEY_WEB_PUSH_ENABLED, enabled ? 'true' : 'false');
}

/**
 * Đăng ký Service Worker cho ứng dụng
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    swRegistration = registration;
    return registration;
  } catch (error) {
    console.warn('[WebPush] Service Worker registration failed:', error);
    return null;
  }
}

/**
 * Yêu cầu cấp quyền thông báo đẩy trên trình duyệt từ người dùng
 */
export async function requestWebPushPermission(): Promise<WebPushPermissionState> {
  if (!isWebPushSupported()) return 'unsupported';

  try {
    const result = await Notification.requestPermission();
    if (result === 'granted') {
      setWebPushEnabledByUser(true);
      await registerServiceWorker();
    }
    return result as WebPushPermissionState;
  } catch (error) {
    console.warn('[WebPush] Lỗi khi yêu cầu quyền thông báo:', error);
    return Notification.permission as WebPushPermissionState;
  }
}

/**
 * Hiển thị thông báo trình duyệt Web Push
 */
export async function showWebPushNotification(
  title: string,
  options?: WebPushOptions
): Promise<WebPushResult> {
  if (!isWebPushSupported()) {
    return { success: false, permission: 'unsupported', reason: 'Trình duyệt không hỗ trợ Web Notification' };
  }

  const currentPerm = Notification.permission as WebPushPermissionState;
  if (currentPerm === 'denied') {
    return { success: false, permission: 'denied', reason: 'Trình duyệt đang chặn thông báo' };
  }

  if (currentPerm === 'default') {
    const requested = await requestWebPushPermission();
    if (requested !== 'granted') {
      return { success: false, permission: requested, reason: 'Chưa cấp quyền thông báo' };
    }
  }

  if (!isWebPushEnabledByUser()) {
    return { success: false, permission: 'granted', reason: 'Thông báo Web Push đang bị tạm tắt trong cài đặt' };
  }

  // 1. Phát chuông thông báo
  playNotificationSound();

  // 2. Kích hoạt In-App Toast thông báo nổi trên màn hình
  dispatchInAppToast(title, options?.body, options?.taskId);

  // 3. Chuẩn bị icon PNG chất lượng cao
  const iconUrl = getNotificationIconUrl();
  let shown = false;
  let lastError: string | undefined;

  // 4. Ưu tiên tạo trực tiếp qua API new Notification() (chạy ngay lập tức trên máy tính bàn)
  try {
    const notification = new Notification(title, {
      body: options?.body || '',
      tag: options?.tag || 'wms-notif-' + Date.now(),
      icon: iconUrl,
      badge: iconUrl,
      silent: false,
    });

    notification.onclick = (event) => {
      event.preventDefault();
      window.focus();
      if (options?.onClick) {
        options.onClick();
      }
      notification.close();
    };

    shown = true;
  } catch (directErr: any) {
    lastError = directErr?.message || String(directErr);
    console.warn('[WebPush] new Notification() error, thử qua Service Worker:', directErr);
  }

  // 5. Nếu new Notification không chạy (ví dụ Chrome trên Android yêu cầu Service Worker), thử qua SW
  if (!shown && 'serviceWorker' in navigator) {
    try {
      let reg = swRegistration;
      if (!reg) {
        reg = await navigator.serviceWorker.ready;
      }
      if (reg && 'showNotification' in reg) {
        await reg.showNotification(title, {
          body: options?.body || '',
          tag: options?.tag || 'wms-notif-' + Date.now(),
          icon: iconUrl,
          badge: iconUrl,
          data: {
            url: window.location.href,
            taskId: options?.taskId,
            ...options?.data,
          },
        });
        shown = true;
      }
    } catch (swErr: any) {
      lastError = swErr?.message || String(swErr);
      console.warn('[WebPush] ServiceWorker showNotification error:', swErr);
    }
  }

  return {
    success: shown,
    permission: 'granted',
    reason: shown ? undefined : (lastError || 'Không thể hiển thị thông báo native'),
  };
}

/**
 * Bắn thông báo trình duyệt tương ứng từ bản ghi NotificationItem
 */
export async function dispatchNotificationWebPush(
  notif: NotificationItem,
  onClick?: () => void
): Promise<WebPushResult> {
  return showWebPushNotification(notif.title, {
    body: notif.content,
    taskId: notif.taskId,
    tag: `task-${notif.taskId || notif.id}`,
    onClick,
  });
}

/**
 * Bắn thông báo thử nghiệm để người dùng kiểm tra ngay trên màn hình
 */
export async function sendTestWebPushNotification(): Promise<WebPushResult> {
  const perm = getWebPushPermission();
  if (perm !== 'granted') {
    const newPerm = await requestWebPushPermission();
    if (newPerm !== 'granted') {
      return {
        success: false,
        permission: newPerm,
        reason: 'Bạn chưa cấp quyền nhận thông báo trên trình duyệt.',
      };
    }
  }

  return showWebPushNotification('🔔 WMS VnExpress - Thông báo thử nghiệm', {
    body: 'Tính năng Web Push Notifications đã hoạt động! Bạn sẽ nhận được thông báo khi có việc mới hoặc cập nhật dự án.',
    tag: 'wms-test-notification',
  });
}

/**
 * Khởi tạo listener nhận message từ Service Worker khi người dùng click thông báo
 */
export function initWebPushListener(onOpenTask?: (taskId: string) => void): () => void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return () => {};
  }

  // Tự động đăng ký Service Worker khi app tải
  registerServiceWorker().catch(() => {});

  const handleMessage = (event: MessageEvent) => {
    if (event.data?.type === 'WMS_OPEN_TASK' && event.data.taskId && onOpenTask) {
      onOpenTask(event.data.taskId);
    }
  };

  navigator.serviceWorker.addEventListener('message', handleMessage);

  return () => {
    navigator.serviceWorker.removeEventListener('message', handleMessage);
  };
}

export interface ClientPlatform {
  os: 'macOS' | 'Windows' | 'iOS' | 'Android' | 'Linux' | 'Other';
  browser: 'Chrome' | 'Safari' | 'Edge' | 'Firefox' | 'CocCoc' | 'Brave' | 'Other';
  osLabel: string;
  browserLabel: string;
  isMobile: boolean;
}

/**
 * Tự động nhận diện chính xác Hệ điều hành và Trình duyệt người dùng đang sử dụng
 */
export function detectClientPlatform(): ClientPlatform {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      os: 'Other',
      browser: 'Other',
      osLabel: 'Thiết bị',
      browserLabel: 'Trình duyệt',
      isMobile: false,
    };
  }

  const ua = navigator.userAgent || '';
  const platformStr = (navigator as any).userAgentData?.platform || navigator.platform || '';

  // 1. Nhận diện Hệ điều hành (OS)
  let os: ClientPlatform['os'] = 'Other';
  let osLabel = 'Thiết bị';
  let isMobile = false;

  if (/iPhone|iPad|iPod/i.test(ua)) {
    os = 'iOS';
    osLabel = 'iOS';
    isMobile = true;
  } else if (/Android/i.test(ua)) {
    os = 'Android';
    osLabel = 'Android';
    isMobile = true;
  } else if (/Mac|Macintosh/i.test(ua) || /Mac/i.test(platformStr)) {
    os = 'macOS';
    osLabel = 'macOS (Mac)';
  } else if (/Win/i.test(ua) || /Win/i.test(platformStr)) {
    os = 'Windows';
    osLabel = 'Windows';
  } else if (/Linux/i.test(ua)) {
    os = 'Linux';
    osLabel = 'Linux';
  }

  // 2. Nhận diện Trình duyệt (Browser)
  let browser: ClientPlatform['browser'] = 'Other';
  let browserLabel = 'Trình duyệt';

  if (/CocCoc/i.test(ua)) {
    browser = 'CocCoc';
    browserLabel = 'Cốc Cốc';
  } else if (/Edg/i.test(ua)) {
    browser = 'Edge';
    browserLabel = 'Microsoft Edge';
  } else if (/Firefox|FxiOS/i.test(ua)) {
    browser = 'Firefox';
    browserLabel = 'Mozilla Firefox';
  } else if (/Chrome|CriOS/i.test(ua)) {
    browser = 'Chrome';
    browserLabel = 'Google Chrome';
  } else if (/Safari/i.test(ua) && !/Chrome|CriOS|Android/i.test(ua)) {
    browser = 'Safari';
    browserLabel = 'Apple Safari';
  }

  return {
    os,
    browser,
    osLabel,
    browserLabel,
    isMobile,
  };
}

export interface PersonalizedGuide {
  title: string;
  badge: string;
  summary: string;
  steps: string[];
  osTip?: string;
  actionText?: string;
}

/**
 * Tạo nội dung hướng dẫn được cá nhân hóa 100% theo từng OS & Trình duyệt
 */
export function getPersonalizedNotificationGuide(
  platform: ClientPlatform,
  permission: WebPushPermissionState
): PersonalizedGuide {
  const { os, browser, osLabel, browserLabel } = platform;

  // TRƯỜNG HỢP 1: BỊ CHẶN (DENIED)
  if (permission === 'denied') {
    let steps: string[] = [];
    let osTip: string | undefined;

    if (browser === 'Chrome' || browser === 'CocCoc') {
      steps = [
        'Bấm vào biểu tượng Cài đặt trang web ⚙️ (hoặc ổ khóa 🔒) ở góc trái thanh địa chỉ URL.',
        'Tại dòng "Thông báo" (Notifications) ➔ đổi từ "Chặn" sang "Cho phép" (Allow).',
        'Tải lại trang web (Cmd+R hoặc F5) để áp dụng.',
      ];
    } else if (browser === 'Safari') {
      steps = [
        'Mở menu Safari trên thanh đầu màn hình Mac > chọn Cài đặt (Settings...).',
        'Chuyển sang tab Trang web (Websites) > chọn Thông báo (Notifications) ở cột bên trái.',
        'Tìm trang web này trong danh sách và đổi quyền thành "Cho phép" (Allow).',
      ];
    } else if (browser === 'Edge') {
      steps = [
        'Bấm vào biểu tượng ổ khóa 🔒 (hoặc Cài đặt trang web) bên trái thanh địa chỉ.',
        'Tại mục "Thông báo" ➔ chuyển sang "Cho phép".',
        'Tải lại trang web để cập nhật quyền.',
      ];
    } else if (browser === 'Firefox') {
      steps = [
        'Bấm biểu tượng ổ khóa 🔒 bên trái thanh địa chỉ.',
        'Nhấn dấu ✕ cạnh "Bị chặn" trong phần Quyền thông báo.',
        'Tải lại trang và bấm "Cho phép" khi trình duyệt hỏi.',
      ];
    } else {
      steps = [
        'Nhấn vào biểu tượng bảo mật / ổ khóa 🔒 bên trái thanh địa chỉ URL.',
        'Chuyển quyền Thông báo thành "Cho phép" (Allow).',
        'Tải lại trang để áp dụng.',
      ];
    }

    if (os === 'macOS') {
      osTip = `Lưu ý trên Mac: Sau khi bật trên trình duyệt, hãy đảm bảo Cài đặt hệ thống Mac > Thông báo > ${browserLabel} đã được bật "Cho phép thông báo" và tắt chế độ Không làm phiền (Focus / Do Not Disturb).`;
    } else if (os === 'Windows') {
      osTip = `Lưu ý trên Windows: Đảm bảo Windows Settings > System > Notifications đang bật và tắt chế độ Focus Assist.`;
    }

    return {
      title: `${browserLabel} đang chặn thông báo`,
      badge: 'Bị chặn',
      summary: `Mở khóa thông báo trên ${browserLabel} (${osLabel}) theo ${steps.length} bước:`,
      steps,
      osTip,
      actionText: 'Cách mở khóa',
    };
  }

  // TRƯỜNG HỢP 2: CHƯA BẬT (DEFAULT)
  if (permission === 'default') {
    let steps: string[] = [];
    let osTip: string | undefined;

    if (browser === 'Safari') {
      steps = [
        'Bấm nút "Bật thông báo ngay" bên dưới.',
        'Khi Safari xuất hiện hộp thoại xác nhận, bấm "Cho phép" (Allow).',
      ];
    } else if (browser === 'Chrome' || browser === 'CocCoc' || browser === 'Edge') {
      steps = [
        'Bấm nút "Bật thông báo ngay" bên dưới.',
        'Chọn "Cho phép" (Allow) trên bảng hỏi nhỏ ở góc trái thanh địa chỉ.',
      ];
    } else {
      steps = [
        'Bấm nút "Bật thông báo ngay" bên dưới.',
        'Chọn "Cho phép" (Allow) khi trình duyệt hiển thị yêu cầu.',
      ];
    }

    if (os === 'macOS') {
      osTip = `Mẹo trên Mac: Hãy đảm bảo Cài đặt hệ thống Mac > Thông báo > ${browserLabel} đang bật để nhận banner trượt ra ở góc màn hình.`;
    }

    return {
      title: `Nhận thông báo công việc trên ${browserLabel}`,
      badge: 'Chưa bật',
      summary: `Bật nhận thông báo tức thì trên ${browserLabel} (${osLabel}) khi bạn được giao việc mới hoặc task bị nghẽn.`,
      steps,
      osTip,
      actionText: 'Bật ngay',
    };
  }

  // TRƯỜNG HỢP 3: ĐÃ CẤP QUYỀN (GRANTED)
  return {
    title: `Đã bật thông báo trên ${browserLabel}`,
    badge: 'Đã bật',
    summary: `Hệ thống sẽ gửi thông báo đẩy đến ${browserLabel} (${osLabel}) khi bạn được giao việc mới, task hoàn thành hoặc bị nghẽn.`,
    steps: [],
    osTip:
      os === 'macOS'
        ? `Mẹo trên Mac: Nếu không thấy banner trượt ra ở góc phải, hãy kiểm tra Cài đặt hệ thống Mac > Thông báo > ${browserLabel} và tắt chế độ Không làm phiền (Focus). Bạn cũng có thể bấm vào ngày giờ ở góc trên bên phải Mac để xem Trung tâm thông báo.`
        : undefined,
    actionText: 'Đã sẵn sàng',
  };
}

