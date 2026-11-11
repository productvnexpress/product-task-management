/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { VdsButton } from './vds';
import { Check, Sparkles } from './vds/icons';
import { formatTaskDueDisplay } from '../utils/dateUtils';
import { formatEstimate } from '../utils/estimate';
import { isSamePersonName } from '../utils/memberPersonalization';
import type { NextSuggestion, SuggestTrigger } from '../services/suggestService';

export interface NextSuggestState {
  /** Đổi mỗi lần có gợi ý mới, dùng làm key hoạt họa. */
  id: number;
  trigger: SuggestTrigger;
  sourceTitle: string;
  items: NextSuggestion[];
  /** Tiêu đề các gợi ý đã thêm thành việc. */
  added: string[];
}

interface NextTaskSuggestionsProps {
  state: NextSuggestState | null;
  currentUserName?: string;
  onAdd: (item: NextSuggestion) => void;
  onDismiss: () => void;
  /** Tắt gợi ý tới hết hôm nay. */
  onTurnOffToday: () => void;
}

/** Tự ẩn sau ngần này nếu người dùng không tương tác. */
const AUTO_HIDE_MS = 90_000;

/**
 * Khung gợi ý việc tiếp theo sau khi thêm hoặc đóng một việc.
 * Chỉ đề xuất: người dùng bấm "Thêm" thì mới tạo việc.
 */
export const NextTaskSuggestions: React.FC<NextTaskSuggestionsProps> = ({ state, currentUserName, onAdd, onDismiss, onTurnOffToday }) => {
  useEffect(() => {
    if (!state) return;
    const timer = window.setTimeout(onDismiss, AUTO_HIDE_MS);
    return () => window.clearTimeout(timer);
  }, [state?.id, onDismiss]);

  return (
    <div className="fixed z-40 inset-x-4 bottom-[calc(148px+env(safe-area-inset-bottom))] md:inset-x-auto md:right-6 md:bottom-6 md:w-[380px] pointer-events-none">
      <AnimatePresence>
        {state && (
          <motion.section
            key={state.id}
            aria-label="Gợi ý việc tiếp theo"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-auto bg-surface border border-line rounded-vds-lg shadow-pop overflow-hidden"
          >
            <header className="flex items-start gap-2 px-4 pt-3 pb-2">
              <Sparkles className="w-4 h-4 mt-0.5 text-accent shrink-0" />
              <div className="min-w-0 flex-1">
                <h2 className="font-ui text-sm font-bold text-ink">Việc tiếp theo</h2>
                <p className="font-ui text-xs text-subdued truncate">
                  {state.trigger === 'completed' ? 'Sau khi xong' : 'Sau khi thêm'}: {state.sourceTitle}
                </p>
              </div>
              <VdsButton variant="ghost-subdued" size="sm" icon="Dismiss" aria-label="Đóng gợi ý" onClick={onDismiss} />
            </header>

            <ul className="divide-y divide-divider border-t border-divider">
              {state.items.map((item) => {
                const isAdded = state.added.includes(item.title);
                const isMine = currentUserName ? isSamePersonName(item.assignee, currentUserName) : false;
                const meta = [
                  isMine ? 'Tôi' : item.assignee,
                  formatTaskDueDisplay(item.dueDate),
                  `~${formatEstimate(item.estimateMinutes)}`,
                ].join(' · ');
                return (
                  <li key={item.title} className="flex items-start gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-title text-sm text-ink leading-snug break-words">{item.title}</p>
                      <p className="mt-1 font-ui text-xs text-ink-lighter">{meta}</p>
                      {item.reason && <p className="mt-1 font-ui text-xs text-subdued leading-snug">{item.reason}</p>}
                    </div>
                    {isAdded ? (
                      <span className="inline-flex items-center gap-1 h-8 font-ui text-xs font-semibold text-positive shrink-0">
                        <Check className="w-3.5 h-3.5" />
                        Đã thêm
                      </span>
                    ) : (
                      <VdsButton variant="contained-bordered" size="sm" className="shrink-0" onClick={() => onAdd(item)}>
                        Thêm
                      </VdsButton>
                    )}
                  </li>
                );
              })}
            </ul>

            <div className="flex items-center justify-between gap-3 px-4 py-2 border-t border-divider font-ui text-xs text-subdued">
              <span>Claude gợi ý từ dữ liệu dự án. Kiểm tra trước khi thêm.</span>
              <button
                type="button"
                onClick={onTurnOffToday}
                className="shrink-0 underline decoration-1 underline-offset-2 text-link hover:text-ink cursor-pointer"
              >
                Tắt hôm nay
              </button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
};
