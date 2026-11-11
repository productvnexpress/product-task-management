/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Clock } from '../vds/icons';
import { ESTIMATE_OPTIONS, formatEstimate } from '../../utils/estimate';

interface EstimateSelectProps {
  value?: number;
  onChange: (minutes: number | undefined) => void;
  /** Tô cảnh báo khi bắt buộc mà chưa chọn. */
  invalid?: boolean;
  id?: string;
  className?: string;
}

/** Ô chọn ước lượng dạng gọn cho thanh thêm việc và drawer chi tiết (desktop). */
export const EstimateSelect: React.FC<EstimateSelectProps> = ({ value, onChange, invalid, id, className = '' }) => {
  // Giá trị gõ tay (~45p) không nằm trong danh sách: thêm một lựa chọn riêng để không mất dữ liệu.
  const custom = value && !ESTIMATE_OPTIONS.some((o) => o.minutes === value) ? value : undefined;
  return (
    <div
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-vds-lg border transition-colors ${
        invalid ? 'bg-surface-warning border-line text-warning' : 'bg-surface-100 border-line text-ink'
      } ${className}`}
    >
      <Clock className={`w-3.5 h-3.5 shrink-0 ${invalid ? 'text-warning' : 'text-subdued'}`} />
      <select
        id={id}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
        aria-label="Ước lượng thời gian làm"
        title="Ước lượng thời gian làm"
        className="bg-transparent text-xs font-ui focus:outline-hidden cursor-pointer"
      >
        <option value="">Ước lượng…</option>
        {custom && <option value={custom}>{formatEstimate(custom)}</option>}
        {ESTIMATE_OPTIONS.map((o) => (
          <option key={o.minutes} value={o.minutes}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
};

/** Hàng chip chọn ước lượng 1 chạm cho mobile. */
export const EstimateChips: React.FC<Pick<EstimateSelectProps, 'value' | 'onChange'>> = ({ value, onChange }) => (
  <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Ước lượng thời gian làm">
    {ESTIMATE_OPTIONS.map((o) => {
      const active = value === o.minutes;
      return (
        <button
          key={o.minutes}
          type="button"
          role="radio"
          aria-checked={active}
          onClick={() => onChange(active ? undefined : o.minutes)}
          className={`h-10 px-2 rounded-vds-lg border text-xs font-ui font-semibold flex items-center justify-center transition-colors cursor-pointer ${
            active
              ? 'bg-surface-selected text-accent border-line-accent-soft'
              : 'bg-surface-100 text-ink-lighter border-line hover:bg-surface-200'
          }`}
        >
          {o.label}
        </button>
      );
    })}
  </div>
);
