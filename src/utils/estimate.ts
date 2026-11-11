/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Ước lượng thời gian làm một công việc (phút).
 * Dùng chung cho app và connector Claude (`api/`), nên không import module nào khác.
 */

export interface EstimateOption {
  minutes: number;
  label: string;
  /** Nhãn ngắn cho chip và hàng công việc. */
  short: string;
}

export const ESTIMATE_OPTIONS: EstimateOption[] = [
  { minutes: 30, label: '30 phút', short: '30p' },
  { minutes: 60, label: '1 giờ', short: '1h' },
  { minutes: 120, label: '2 giờ', short: '2h' },
  { minutes: 240, label: 'Nửa ngày', short: '½ ngày' },
  { minutes: 480, label: '1 ngày', short: '1 ngày' },
  { minutes: 960, label: 'Hơn 1 ngày', short: '>1 ngày' },
];

/** Bắt buộc chọn ước lượng khi tạo việc trên app. Đổi thành false để chỉ khuyến khích. */
export const ESTIMATE_REQUIRED = true;

/** Một ngày làm việc: 08:00–17:30, nghỉ trưa 1,5 giờ. */
export const WORKDAY_MINUTES = 480;

/** Dưới ngưỡng này, tổng việc đăng ký trong ngày bị coi là tải nhẹ. */
export const LIGHT_DAY_MINUTES = 360;

export const MIN_ESTIMATE_MINUTES = 5;
export const MAX_ESTIMATE_MINUTES = 4800;

export function isValidEstimate(minutes: unknown): minutes is number {
  return (
    typeof minutes === 'number' &&
    Number.isFinite(minutes) &&
    minutes >= MIN_ESTIMATE_MINUTES &&
    minutes <= MAX_ESTIMATE_MINUTES
  );
}

const trimNumber = (value: number): string => String(Math.round(value * 10) / 10).replace('.', ',');

/** "2 giờ", "Nửa ngày", "45 phút", "1,5 ngày". Trả chuỗi rỗng khi chưa có ước lượng. */
export function formatEstimate(minutes?: number | null): string {
  if (!isValidEstimate(minutes)) return '';
  const option = ESTIMATE_OPTIONS.find((o) => o.minutes === minutes);
  if (option) return option.label;
  if (minutes < 60) return `${Math.round(minutes)} phút`;
  if (minutes < WORKDAY_MINUTES) return `${trimNumber(minutes / 60)} giờ`;
  return `${trimNumber(minutes / WORKDAY_MINUTES)} ngày`;
}

/** Tổng thời gian dạng gọn cho báo cáo: "6,5 giờ", "45 phút", "0 giờ". */
export function formatDuration(minutes: number): string {
  if (!minutes) return '0 giờ';
  if (minutes < 60) return `${Math.round(minutes)} phút`;
  return `${trimNumber(minutes / 60)} giờ`;
}

const UNIT_MINUTES: Record<string, number> = {
  p: 1, ph: 1, phut: 1, m: 1, min: 1,
  h: 60, g: 60, gio: 60,
  d: WORKDAY_MINUTES, n: WORKDAY_MINUTES, ngay: WORKDAY_MINUTES,
};

const stripMarks = (value: string): string =>
  value.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');

/**
 * Đọc token gõ nhanh: "~30p", "~2h", "~1,5h", "~1d", "~0.5ngay".
 * Trả undefined nếu không phải token ước lượng.
 */
export function parseEstimateToken(raw: string): number | undefined {
  const match = stripMarks(raw.trim().toLowerCase()).match(/^~(\d+(?:[.,]\d+)?)([a-z]+)$/);
  if (!match) return undefined;
  const unit = UNIT_MINUTES[match[2]];
  if (!unit) return undefined;
  const minutes = Math.round(Number(match[1].replace(',', '.')) * unit);
  return isValidEstimate(minutes) ? minutes : undefined;
}
