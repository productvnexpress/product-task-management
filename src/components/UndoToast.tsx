/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { VdsAlertToast } from './vds';

export interface UndoToastState {
  id: number;
  message: string;
  onUndo?: () => void;
}

interface UndoToastProps {
  toast: UndoToastState | null;
  onDismiss: () => void;
}

/** Thông báo ngắn sau thao tác nhanh, kèm nút Hoàn tác (tự ẩn sau 5 giây) */
export const UndoToast: React.FC<UndoToastProps> = ({ toast, onDismiss }) => {
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(onDismiss, 5000);
    return () => window.clearTimeout(t);
  }, [toast, onDismiss]);

  // "Dời sang Ngày mai: Tiêu đề việc" → tiêu đề toast là kết quả, nội dung là tên việc
  const sep = toast?.message.indexOf(': ') ?? -1;
  const title = toast ? (sep > 0 ? toast.message.slice(0, sep) : toast.message) : '';
  const detail = toast && sep > 0 ? toast.message.slice(sep + 2) : '';

  return (
    <div className="fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] md:bottom-6 z-[70] flex justify-center pointer-events-none px-4">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            aria-live="polite"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-auto w-full max-w-[520px] shadow-pop rounded-vds-md"
          >
            <VdsAlertToast
              title={title}
              action={
                toast.onUndo
                  ? {
                      label: 'Hoàn tác',
                      onClick: () => {
                        toast.onUndo?.();
                        onDismiss();
                      },
                    }
                  : undefined
              }
              onDismiss={toast.onUndo ? undefined : onDismiss}
            >
              {detail && <span className="line-clamp-1">{detail}</span>}
            </VdsAlertToast>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
