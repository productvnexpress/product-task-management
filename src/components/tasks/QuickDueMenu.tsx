/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, CalendarPlus, Sun, Sunrise } from '../vds/icons';
import { addDaysToToday, getNextMonday } from '../../utils/taskViewUtils';
import { formatDateWithEnDay } from '../../utils/formatters';
import { normalizeDateString } from '../../utils/dateUtils';

interface QuickDueMenuProps {
  anchor: HTMLElement;
  currentDue?: string;
  onSelect: (date: string) => void;
  onClose: () => void;
}

/**
 * Menu đổi hạn nhanh 1 chạm: Hôm nay / Ngày mai / Thứ 2 tới / Chọn ngày.
 * Hiển thị dạng popover cạnh nút trên desktop, sheet đáy màn hình trên mobile.
 */
export const QuickDueMenu: React.FC<QuickDueMenuProps> = ({ anchor, currentDue, onSelect, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  const current = normalizeDateString(currentDue);

  const options = [
    { label: 'Hôm nay', date: addDaysToToday(0), icon: Sun },
    { label: 'Ngày mai', date: addDaysToToday(1), icon: Sunrise },
    { label: 'Thứ 2 tới', date: getNextMonday(), icon: CalendarPlus },
  ];

  useLayoutEffect(() => {
    if (isMobile) return;
    const rect = anchor.getBoundingClientRect();
    const width = 232;
    const height = 200;
    const top = rect.bottom + height + 8 > window.innerHeight ? rect.top - height - 6 : rect.bottom + 6;
    const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);
    setPos({ top, left });
  }, [anchor, isMobile]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const onDown = (e: PointerEvent) => {
      if (menuRef.current?.contains(e.target as Node) || anchor.contains(e.target as Node)) return;
      onClose();
    };
    const onScroll = () => !isMobile && onClose();
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [anchor, onClose, isMobile]);

  const pick = (date: string) => {
    if (date && date !== current) onSelect(date);
    onClose();
  };

  const list = (
    <div role="menu" aria-label="Đổi hạn hoàn thành" className="py-1">
      {options.map((o) => {
        const Icon = o.icon;
        const isCurrent = o.date === current;
        return (
          <button
            key={o.label}
            role="menuitem"
            type="button"
            onClick={() => pick(o.date)}
            className={`w-full h-11 sm:h-9 px-3 flex items-center gap-2.5 text-left text-[14px] sm:text-[13px] font-ui cursor-pointer ${
              isCurrent ? 'bg-surface-accent-faint text-accent font-semibold' : 'text-ink hover:bg-surface-200'
            }`}
          >
            <Icon className="w-4 h-4 text-subdued" />
            <span className="flex-1">{o.label}</span>
            <span className="text-[12px] text-subdued-lighter">{formatDateWithEnDay(o.date).replace(/ \d{4}$/, '')}</span>
          </button>
        );
      })}
      <div className="my-1 border-t border-divider" />
      <label className="relative w-full h-11 sm:h-9 px-3 flex items-center gap-2.5 text-[14px] sm:text-[13px] font-ui text-ink hover:bg-surface-200 cursor-pointer">
        <CalendarDays className="w-4 h-4 text-subdued" />
        <span className="flex-1">Chọn ngày…</span>
        {current && <span className="text-[12px] text-subdued-lighter">{formatDateWithEnDay(current).replace(/ \d{4}$/, '')}</span>}
        <input
          ref={dateRef}
          type="date"
          defaultValue={current}
          onChange={(e) => e.target.value && pick(e.target.value)}
          onClick={(e) => {
            try {
              (e.target as HTMLInputElement).showPicker?.();
            } catch {}
          }}
          className="absolute inset-0 opacity-0 cursor-pointer"
          aria-label="Chọn ngày hạn"
        />
      </label>
    </div>
  );

  if (isMobile) {
    return createPortal(
      <div className="fixed inset-0 z-[65] flex flex-col justify-end">
        <div className="absolute inset-0 bg-black/40 animate-fade-in" onClick={onClose} />
        <div
          ref={menuRef}
          className="relative bg-surface rounded-t-vds-xl pb-safe shadow-sheet animate-fade-in"
        >
          <div className="flex justify-center pt-2.5 pb-1">
            <div className="w-10 h-1 rounded-full bg-surface-300" />
          </div>
          <p className="px-4 pt-1 pb-2 text-[12px] font-ui font-bold text-subdued-lighter">Đổi hạn</p>
          {list}
          <div className="h-2" />
        </div>
      </div>,
      document.body
    );
  }

  if (!pos) return null;
  return createPortal(
    <div
      ref={menuRef}
      style={{ top: pos.top, left: pos.left, width: 232 }}
      className="fixed z-[65] bg-surface rounded-vds-lg border border-line shadow-pop animate-fade-in"
    >
      {list}
    </div>,
    document.body
  );
};
