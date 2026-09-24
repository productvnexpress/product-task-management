/**
 * @license
 * VnExpress WMS Chrome Extension - In-Page Toast Notification (Content Script)
 * Copyright (c) 2026 Ban Sản phẩm - Công nghệ VnExpress
 */

(() => {
  // Tránh inject lặp lại
  if (window.__VNE_WMS_TOAST_INITIALIZED__) return;
  window.__VNE_WMS_TOAST_INITIALIZED__ = true;

  const HOST_ID = 'vne-wms-toast-host';
  let hostEl = null;
  let shadowRoot = null;

  function initHost() {
    hostEl = document.getElementById(HOST_ID);
    if (!hostEl) {
      hostEl = document.createElement('div');
      hostEl.id = HOST_ID;
      hostEl.style.cssText =
        'all: initial; position: fixed; bottom: 0; right: 0; width: 0; height: 0; overflow: visible; z-index: 2147483647; pointer-events: none; border: none; margin: 0; padding: 0;';
      const container = document.body || document.documentElement;
      if (container) {
        container.appendChild(hostEl);
      }
    } else if (!hostEl.isConnected) {
      const container = document.body || document.documentElement;
      if (container) {
        container.appendChild(hostEl);
      }
    }

    if (hostEl.shadowRoot) {
      shadowRoot = hostEl.shadowRoot;
      return;
    }

    shadowRoot = hostEl.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = `
      :host {
        all: initial;
      }
      .wms-toast-wrap {
        position: fixed;
        bottom: 24px;
        right: 24px;
        display: flex;
        flex-direction: column-reverse;
        gap: 12px;
        pointer-events: none;
        z-index: 2147483647;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      }
      .wms-toast-card {
        pointer-events: auto;
        width: 360px;
        max-width: calc(100vw - 40px);
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-left: 4px solid #963861;
        border-radius: 12px;
        box-shadow: 0 16px 36px -4px rgba(15, 23, 42, 0.22), 0 6px 14px -2px rgba(15, 23, 42, 0.08);
        overflow: hidden;
        position: relative;
        animation: wmsSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        transition: transform 0.2s ease, opacity 0.25s ease;
        box-sizing: border-box;
      }
      .wms-toast-card.closing {
        opacity: 0;
        transform: translateY(12px) scale(0.96);
      }
      @keyframes wmsSlideUp {
        from {
          opacity: 0;
          transform: translateY(24px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      .wms-toast-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 14px 6px 14px;
        background: #ffffff;
      }
      .wms-toast-brand {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .wms-brand-logo {
        width: 20px;
        height: 20px;
        border-radius: 4px;
        background: #963861;
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: -0.5px;
      }
      .wms-brand-title {
        font-size: 11px;
        font-weight: 700;
        color: #963861;
        text-transform: uppercase;
        letter-spacing: 0.3px;
      }
      .wms-toast-close {
        background: transparent;
        border: none;
        color: #94a3b8;
        font-size: 16px;
        line-height: 1;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        transition: color 0.15s, background 0.15s;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .wms-toast-close:hover {
        color: #0f172a;
        background: #f1f5f9;
      }
      .wms-toast-body {
        padding: 4px 14px 10px 14px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .wms-toast-title {
        font-size: 13px;
        font-weight: 700;
        color: #0f172a;
        line-height: 1.35;
        margin: 0;
      }
      .wms-toast-content {
        font-size: 12px;
        color: #475569;
        line-height: 1.45;
        margin: 0;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .wms-toast-footer {
        padding: 8px 14px 10px 14px;
        border-top: 1px solid #f1f5f9;
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: #fafafa;
      }
      .wms-toast-meta {
        font-size: 11px;
        color: #64748b;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 210px;
      }
      .wms-toast-action-btn {
        background: #963861;
        color: #ffffff;
        border: none;
        padding: 5px 10px;
        border-radius: 6px;
        font-size: 11.5px;
        font-weight: 600;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        transition: background 0.15s;
        text-decoration: none;
      }
      .wms-toast-action-btn:hover {
        background: #7b2a4e;
      }
      .wms-toast-progress {
        position: absolute;
        bottom: 0;
        left: 0;
        height: 2.5px;
        background: #963861;
        width: 100%;
        transition: width 0.1s linear;
      }
    `;

    shadowRoot.appendChild(style);

    const wrap = document.createElement('div');
    wrap.className = 'wms-toast-wrap';
    shadowRoot.appendChild(wrap);
  }

  function playInPageChime() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const now = ctx.currentTime;

      // Note 1 (E5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.3);

      // Note 2 (A5)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.1);
      gain2.gain.setValueAtTime(0.25, now + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.1);
      osc2.stop(now + 0.6);
    } catch (_) {}
  }

  function showInPageToast(notif) {
    initHost();
    if (!shadowRoot) return;
    let wrap = shadowRoot.querySelector('.wms-toast-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'wms-toast-wrap';
      shadowRoot.appendChild(wrap);
    }

    // Giới hạn tối đa 3 toasts cùng lúc
    while (wrap.children.length >= 3) {
      wrap.firstElementChild.remove();
    }

    const title = notif.title || 'VnExpress WMS - Thông báo công việc';
    const message = notif.content || notif.message || '';
    const projName = notif.project_name ? notif.project_name.replace(/^Dự án\s+/i, '') : 'WMS Ban SP-CN';
    const actorName = notif.actor_name || '';
    const metaText = actorName ? `${projName} • ${actorName}` : projName;

    const baseUrl = (notif.baseUrl || notif.appUrl || 'https://product-task-management-qr39.vercel.app').replace(/\/$/, '');
    const taskId = notif.task_id || notif.taskId || (notif.entity_type === 'task' ? notif.entity_id : null);
    const targetUrl = notif.targetUrl || (taskId ? `${baseUrl}/tasks/${taskId}` : `${baseUrl}/tasks`);

    const card = document.createElement('div');
    card.className = 'wms-toast-card';

    card.innerHTML = `
      <div class="wms-toast-header">
        <div class="wms-toast-brand">
          <div class="wms-brand-logo">W</div>
          <span class="wms-brand-title">VnExpress WMS</span>
        </div>
        <button class="wms-toast-close" title="Đóng">✕</button>
      </div>
      <div class="wms-toast-body">
        <h4 class="wms-toast-title"></h4>
        <p class="wms-toast-content"></p>
      </div>
      <div class="wms-toast-footer">
        <span class="wms-toast-meta"></span>
        <button class="wms-toast-action-btn">Xem việc →</button>
      </div>
      <div class="wms-toast-progress"></div>
    `;

    // Gán dữ liệu văn bản an toàn chống XSS
    card.querySelector('.wms-toast-title').textContent = title;
    card.querySelector('.wms-toast-content').textContent = message;
    card.querySelector('.wms-toast-meta').textContent = metaText;

    const btnClose = card.querySelector('.wms-toast-close');
    const btnAction = card.querySelector('.wms-toast-action-btn');
    const progressBar = card.querySelector('.wms-toast-progress');

    let isClosed = false;
    let timerDuration = 180000; // 3 phút (180 giây) - người dùng có thể chủ động bấm đóng bất kỳ lúc nào
    let startTime = Date.now();
    let remainingTime = timerDuration;
    let timerId = null;
    let progressAnimId = null;
    let isPaused = false;

    function closeToast() {
      if (isClosed) return;
      isClosed = true;
      cancelAnimationFrame(progressAnimId);
      clearTimeout(timerId);
      card.classList.add('closing');
      setTimeout(() => {
        card.remove();
      }, 250);
    }

    btnClose.addEventListener('click', (e) => {
      e.stopPropagation();
      closeToast();
    });

    // Bấm vào nút Xem việc hoặc card: Mở tab WMS
    const handleOpenWMS = () => {
      closeToast();
      chrome.runtime.sendMessage({
        action: 'OPEN_WMS_TAB',
        url: targetUrl,
        notificationId: notif.id,
      });
    };

    btnAction.addEventListener('click', (e) => {
      e.stopPropagation();
      handleOpenWMS();
    });

    card.addEventListener('click', () => {
      handleOpenWMS();
    });

    // Tạm dừng timer khi rê chuột vào toast
    card.addEventListener('mouseenter', () => {
      isPaused = true;
      clearTimeout(timerId);
      remainingTime -= Date.now() - startTime;
    });

    card.addEventListener('mouseleave', () => {
      isPaused = false;
      startTime = Date.now();
      if (remainingTime > 0) {
        timerId = setTimeout(closeToast, remainingTime);
      } else {
        closeToast();
      }
    });

    // Thanh tiến trình chạy mượt
    function updateProgress() {
      if (!isPaused && remainingTime > 0) {
        const elapsed = (Date.now() - startTime) + (timerDuration - remainingTime);
        const pct = Math.max(0, 100 - (elapsed / timerDuration) * 100);
        progressBar.style.width = `${pct}%`;
      }
      if (!isClosed) {
        progressAnimId = requestAnimationFrame(updateProgress);
      }
    }

    timerId = setTimeout(closeToast, timerDuration);
    progressAnimId = requestAnimationFrame(updateProgress);

    wrap.appendChild(card);
    playInPageChime();
  }

  // Lắng nghe lệnh từ Extension (Background hoặc Popup)
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'SHOW_INPAGE_TOAST' && request.notification) {
      showInPageToast(request.notification);
      sendResponse({ success: true });
      return true;
    }
  });
})();
