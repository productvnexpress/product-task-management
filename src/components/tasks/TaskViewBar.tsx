/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { VdsButton, VdsChip, VdsTabs } from '../vds';
import { TaskGroupMode } from '../../utils/taskViewUtils';

export type QuickView = 'all' | 'overdue' | 'today' | 'soon' | 'blocked';

interface TaskViewBarProps {
  activeView: QuickView | 'custom';
  counts: Record<QuickView, number>;
  customLabel?: string;
  onSelectView: (view: QuickView) => void;
  onClearCustom?: () => void;
}

// Chip theo VDS Selection Item Chip: trung tính, chọn = đỏ đô. Màu trạng thái chỉ ở con số.
const VIEWS: { id: QuickView; label: string; countTone: string }[] = [
  { id: 'all', label: 'Tất cả', countTone: '' },
  { id: 'overdue', label: 'Quá hạn', countTone: 'text-negative' },
  { id: 'today', label: 'Hôm nay', countTone: 'text-warning' },
  { id: 'soon', label: '3 ngày tới', countTone: 'text-warning' },
  { id: 'blocked', label: 'Bị nghẽn', countTone: 'text-negative' },
];

export const TaskViewBar: React.FC<TaskViewBarProps> = ({
  activeView,
  counts,
  customLabel,
  onSelectView,
  onClearCustom,
}) => {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div
        role="radiogroup"
        aria-label="Lọc nhanh công việc"
        className="flex items-center gap-2 overflow-x-auto scrollbar-none -mx-4 px-4 md:mx-0 md:px-0 flex-1 min-w-0 py-1"
      >
        {VIEWS.map((v) => {
          const isOn = activeView === v.id;
          const count = counts[v.id];
          // Ẩn chip rỗng (trừ "Tất cả") để giảm nhiễu, nhưng vẫn hiện nếu đang chọn
          if (v.id !== 'all' && count === 0 && !isOn) return null;
          return (
            <VdsChip
              key={v.id}
              mode="radio"
              size="sm"
              selected={isOn}
              onClick={() => onSelectView(isOn && v.id !== 'all' ? 'all' : v.id)}
            >
              {v.label}
              <span className={`font-num ${isOn ? '' : v.countTone}`}>{count}</span>
            </VdsChip>
          );
        })}

        {activeView === 'custom' && customLabel && (
          <span className="shrink-0 inline-flex items-center">
            <VdsChip mode="radio" size="sm" selected icon="Calendar" onClick={onClearCustom} aria-label={`${customLabel}, bấm để bỏ lọc`}>
              {customLabel}
            </VdsChip>
            <VdsButton variant="uncontained" size="sm" icon="Dismiss" aria-label="Bỏ lọc theo ngày" onClick={onClearCustom} />
          </span>
        )}
      </div>
    </div>
  );
};

/** Chuyển cách nhóm danh sách (VDS Tabs): Theo hạn / Theo dự án */
export const GroupModeTabs: React.FC<{ value: TaskGroupMode; onChange: (mode: TaskGroupMode) => void }> = ({ value, onChange }) => {
  return (
    <VdsTabs
      aria-label="Cách nhóm công việc"
      className="shrink-0"
      value={value}
      onChange={onChange}
      items={[
        { id: 'due', label: 'Theo hạn' },
        { id: 'project', label: 'Theo dự án' },
      ]}
    />
  );
};
