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

const STORAGE_KEY_WEB_PUSH_ENABLED = 'vne_web_push_enabled';

let swRegistration: ServiceWorkerRegistration | null = null;

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
): Promise<boolean> {
  if (!isWebPushSupported()) return false;
  if (Notification.permission !== 'granted') return false;
  if (!isWebPushEnabledByUser()) return false;

  const defaultIcon = '/favicon.svg';
  const notifOptions: NotificationOptions = {
    body: options?.body || '',
    icon: options?.icon || defaultIcon,
    badge: options?.badge || defaultIcon,
    tag: options?.tag || 'wms-notification-' + Date.now(),
    data: {
      url: window.location.href,
      taskId: options?.taskId,
      ...options?.data,
    },
  };

  try {
    // 1. Ưu tiên sử dụng ServiceWorkerRegistration nếu có
    if (!swRegistration && 'serviceWorker' in navigator) {
      swRegistration = await navigator.serviceWorker.getRegistration();
    }

    if (swRegistration && 'showNotification' in swRegistration) {
      await swRegistration.showNotification(title, notifOptions);
      return true;
    }

    // 2. Fallback sử dụng new Notification() trực tiếp
    const notification = new Notification(title, notifOptions);
    notification.onclick = (event) => {
      event.preventDefault();
      window.focus();
      if (options?.onClick) {
        options.onClick();
      }
      notification.close();
    };

    return true;
  } catch (error) {
    console.warn('[WebPush] Không thể hiển thị thông báo:', error);
    return false;
  }
}

/**
 * Bắn thông báo trình duyệt tương ứng từ bản ghi NotificationItem
 */
export async function dispatchNotificationWebPush(
  notif: NotificationItem,
  onClick?: () => void
): Promise<boolean> {
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
export async function sendTestWebPushNotification(): Promise<boolean> {
  const perm = getWebPushPermission();
  if (perm !== 'granted') {
    const newPerm = await requestWebPushPermission();
    if (newPerm !== 'granted') return false;
  }

  return showWebPushNotification('🔔 WMS VnExpress - Thông báo thử nghiệm', {
    body: 'Tuyệt vời! Tính năng Web Push Notifications đã hoạt động hoàn hảo trên trình duyệt của bạn.',
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
