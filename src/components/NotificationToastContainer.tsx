/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X, ExternalLink } from 'lucide-react';

interface ToastItem {
  id: string;
  title: string;
  body?: string;
  taskId?: string;
}

interface NotificationToastContainerProps {
  onOpenTask?: (taskId: string) => void;
}

export const NotificationToastContainer: React.FC<NotificationToastContainerProps> = ({
  onOpenTask,
}) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handleToastEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ title: string; body?: string; taskId?: string }>;
      if (!customEvent.detail) return;

      const newToast: ToastItem = {
        id: 'toast-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        title: customEvent.detail.title,
        body: customEvent.detail.body,
        taskId: customEvent.detail.taskId,
      };

      setToasts((prev) => {
        const isDuplicate = prev.some(
          (t) => t.title === customEvent.detail.title && t.body === customEvent.detail.body
        );
        if (isDuplicate) return prev;
        return [newToast, ...prev.slice(0, 3)];
      });

      // Tự động đóng sau 5 giây
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
      }, 5000);
    };

    window.addEventListener('wms-notification-toast', handleToastEvent);
    return () => window.removeEventListener('wms-notification-toast', handleToastEvent);
  }, []);

  const handleClose = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleClickToast = (toast: ToastItem) => {
    if (toast.taskId && onOpenTask) {
      onOpenTask(toast.taskId);
    }
    handleClose(toast.id);
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-16 right-5 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="pointer-events-auto bg-white border border-[#963861]/30 rounded-[10px] shadow-xl p-3.5 flex items-start gap-3 relative overflow-hidden group hover:border-[#963861] transition-all cursor-pointer"
            onClick={() => handleClickToast(toast)}
          >
            {/* Thanh viền accent bên trái màu mận VnExpress */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#963861]" />

            {/* Icon Bell */}
            <div className="w-8 h-8 rounded-full bg-[#fdf2f7] text-[#963861] border border-[#f4c2d7] flex items-center justify-center shrink-0 mt-0.5">
              <Bell className="w-4 h-4 animate-bounce" />
            </div>

            {/* Nội dung Toast */}
            <div className="flex-1 min-w-0 pr-4">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-ui font-bold px-1.5 py-0.2 rounded bg-[#963861]/10 text-[#963861] uppercase tracking-wider">
                  Thông báo
                </span>
                <span className="text-[10px] text-[#94a3b8] font-ui">Vừa xong</span>
              </div>
              <h5 className="font-title text-xs font-bold text-[#1e293b] mt-0.5 truncate">
                {toast.title}
              </h5>
              {toast.body && (
                <p className="text-[11px] font-ui text-[#475569] mt-0.5 line-clamp-2 leading-relaxed">
                  {toast.body}
                </p>
              )}
              {toast.taskId && (
                <div className="mt-1 flex items-center gap-1 text-[10px] font-ui font-semibold text-[#1d508d]">
                  <span>Xem chi tiết công việc</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </div>
              )}
            </div>

            {/* Nút đóng X */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClose(toast.id);
              }}
              className="absolute top-2.5 right-2 text-[#94a3b8] hover:text-[#0f172a] hover:bg-[#f1f5f9] p-1 rounded transition-colors cursor-pointer"
              title="Đóng thông báo"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
