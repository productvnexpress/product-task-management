/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Dịch vụ Tự động Làm mới Bộ nhớ đệm & Kiểm tra Phiên bản (AutoCacheService)
 * - Tự động xóa CacheStorage & dọn dẹp cache sau mỗi 6 giờ.
 * - Tự động phát hiện khi có bản build/release mới trên server và làm mới thiết bị.
 * - Hỗ trợ thao tác xóa cache thủ công lập tức.
 */

const CACHE_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 giờ
const CHECK_INTERVAL_MS = 15 * 60 * 1000; // Kiểm tra mỗi 15 phút
const STORAGE_KEY_LAST_CLEAR = 'vne_last_cache_clear_timestamp';
const STORAGE_KEY_SCRIPT_HASH = 'vne_app_script_hash';

// Các key dữ liệu quan trọng tuyệt đối KHÔNG được xóa khi clear cache
const ESSENTIAL_STORAGE_KEYS = new Set([
  'vne_auth_session',
  'vne_active_product_member_id',
  'vne_last_actor_name',
  'vne_wms_saved_passwords',
  'vne_working_schedule_v1',
  'vne_holidays_v1',
  'vne_compensatory_v1',
  'vne_leaves_v1',
  'vne_projects_v9',
  'vne_tasks_v9',
  'vne_members_v11',
  'vne_trash_v1',
  'vne_notifications_v1',
  'vne_checklist_template_v1',
  'vne_recurring_rules_v1',
  'vne_web_push_dismissed',
  'vne_task_filter_state_v1',
  STORAGE_KEY_LAST_CLEAR,
  STORAGE_KEY_SCRIPT_HASH,
]);

class AutoCacheService {
  private checkTimer: number | null = null;
  private isInitialized = false;

  /**
   * Khởi tạo dịch vụ kiểm tra bộ nhớ đệm và phiên bản
   */
  init() {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;

    // 1. Kiểm tra ngay khi khởi động
    this.checkCacheAndRelease();

    // 2. Định kỳ kiểm tra mỗi 15 phút
    this.checkTimer = window.setInterval(() => {
      this.checkCacheAndRelease();
    }, CHECK_INTERVAL_MS);

    // 3. Kiểm tra khi người dùng quay lại tab (visibilitychange)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.checkCacheAndRelease();
      }
    });

    console.log('[AutoCache] Dịch vụ tự động làm mới bộ nhớ đệm (chu kỳ 6h) đã kích hoạt.');
  }

  /**
   * Kiểm tra điều kiện 6 giờ và kiểm tra bản release mới
   */
  async checkCacheAndRelease() {
    const lastClearStr = localStorage.getItem(STORAGE_KEY_LAST_CLEAR);
    const lastClearTime = lastClearStr ? parseInt(lastClearStr, 10) : 0;
    const now = Date.now();
    const elapsed = now - lastClearTime;

    // 1. Kiểm tra nếu đã đủ hoặc vượt quá 6 giờ
    if (!lastClearTime || elapsed >= CACHE_INTERVAL_MS) {
      console.log(`[AutoCache] Đã qua ${Math.round(elapsed / 3600000)}h kể từ lần dọn cache trước. Thực hiện dọn dẹp...`);
      await this.clearBrowserCaches();
      localStorage.setItem(STORAGE_KEY_LAST_CLEAR, now.toString());
    }

    // 2. Kiểm tra xem server có bản build mới không
    await this.checkForNewRelease();
  }

  /**
   * Xóa toàn bộ CacheStorage của trình duyệt và dọn dẹp các cache rác cũ trong localStorage
   */
  async clearBrowserCaches(): Promise<void> {
    try {
      // 1. Xóa CacheStorage API
      if (typeof window !== 'undefined' && 'caches' in window) {
        const cacheKeys = await window.caches.keys();
        await Promise.all(cacheKeys.map((key) => window.caches.delete(key)));
        console.log(`[AutoCache] Đã xóa ${cacheKeys.length} cache stores.`);
      }

      // 2. Dọn các key localStorage phiên bản cũ (vne_members_v10, vne_members_v9,...)
      if (typeof window !== 'undefined' && window.localStorage) {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && !ESSENTIAL_STORAGE_KEYS.has(key)) {
            // Xóa các key tạm hoặc các phiên bản cũ đã deprecated
            if (
              key.startsWith('vne_members_v') ||
              key.startsWith('vne_projects_v') ||
              key.startsWith('vne_tasks_v') ||
              key.startsWith('vne_temp_')
            ) {
              keysToRemove.push(key);
            }
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      }
    } catch (err) {
      console.error('[AutoCache] Lỗi khi dọn dẹp cache:', err);
    }
  }

  /**
   * Tải ngầm index.html với tham số chống cache để kiểm tra script hash mới nhất từ server
   */
  async checkForNewRelease(): Promise<boolean> {
    try {
      if (typeof window === 'undefined') return false;

      // Không kiểm tra trong môi trường localhost dev server của Vite
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return false;
      }

      const res = await fetch(`/?_t=${Date.now()}`, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      });

      if (!res.ok) return false;

      const html = await res.text();

      // Tìm đường dẫn file script chính dạng: /assets/index-xxxxxxxx.js
      const match = html.match(/src="(\/assets\/index-[^"]+\.js)"/);
      if (!match || !match[1]) return false;

      const remoteScriptSrc = match[1];

      // Tìm script bundle đang chạy trong DOM hiện tại
      const currentScriptEl = document.querySelector('script[src*="/assets/index-"]');
      const currentScriptSrc = currentScriptEl ? currentScriptEl.getAttribute('src') : null;

      if (!currentScriptSrc) {
        // Lưu script hash hiện tại nếu chưa có
        localStorage.setItem(STORAGE_KEY_SCRIPT_HASH, remoteScriptSrc);
        return false;
      }

      // So sánh: nếu script trên server khác script đang chạy -> ĐÃ CÓ BẢN MỚI
      if (remoteScriptSrc !== currentScriptSrc) {
        console.warn(`[AutoCache] Phát hiện bản release mới trên server!\nHiện tại: ${currentScriptSrc}\nMới nhất: ${remoteScriptSrc}`);

        // Dọn dẹp cache ngay lập tức
        await this.clearBrowserCaches();
        localStorage.setItem(STORAGE_KEY_SCRIPT_HASH, remoteScriptSrc);
        localStorage.setItem(STORAGE_KEY_LAST_CLEAR, Date.now().toString());

        // Nếu tab đang ẩn hoặc vừa mở lại, tự động tải lại phiên bản mới nhất
        if (document.visibilityState === 'hidden') {
          window.location.reload();
          return true;
        }

        // Bắn CustomEvent để UI có thể hiển thị banner cập nhật nếu cần
        window.dispatchEvent(
          new CustomEvent('vne_new_release_available', {
            detail: {
              current: currentScriptSrc,
              latest: remoteScriptSrc,
            },
          })
        );

        return true;
      }

      return false;
    } catch (err) {
      // Bỏ qua lỗi kết nối mạng ngầm
      return false;
    }
  }

  /**
   * Thao tác thủ công: Xóa toàn bộ bộ nhớ đệm và tải lại trang ngay lập tức
   */
  async clearCacheAndReload() {
    console.log('[AutoCache] Thực hiện xóa bộ nhớ đệm và tải lại trang...');
    await this.clearBrowserCaches();
    localStorage.setItem(STORAGE_KEY_LAST_CLEAR, Date.now().toString());

    // Cập nhật Service Worker nếu có
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.update();
        }
      } catch (e) {
        // ignore
      }
    }

    // Tải lại trang không dùng cache
    window.location.reload();
  }
}

export const autoCacheService = new AutoCacheService();
