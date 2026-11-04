/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { workingTimeService } from '../services/workingTimeService';
import { getTodayDateString, getDaysDifference } from '../utils/dateUtils';
import { formatDateWithEnDay } from '../utils/formatters';
import { Sparkles, Calendar } from './vds/icons';

interface UpcomingHolidayBannerProps {
  customDays?: number;
}

/**
 * Banner độc lập hiển thị thông báo ngày nghỉ lễ sắp tới trong vòng 5 ngày.
 * Định dạng chuẩn: "Nghỉ lễ sắp tới: Thu, 24 Sep 2026 (Văn hoá Việt Nam) - 1 ngày"
 */
export const UpcomingHolidayBanner: React.FC<UpcomingHolidayBannerProps> = ({ customDays = 5 }) => {
  const todayStr = getTodayDateString();

  const upcomingHolidays = useMemo(() => {
    return workingTimeService.getUpcomingHolidays(customDays, todayStr);
  }, [customDays, todayStr]);

  if (upcomingHolidays.length === 0) {
    return null;
  }

  // Tạo chuỗi định dạng cho từng ngày lễ: Thu, 24 Sep 2026 (Văn hoá Việt Nam) - 1 ngày
  const holidaysFormatted = upcomingHolidays.map((h) => {
    const daysCount =
      h.daysCount && h.daysCount > 0
        ? h.daysCount
        : Math.max(1, getDaysDifference(h.endDate, h.startDate) + 1);

    const dateStr =
      h.startDate === h.endDate
        ? formatDateWithEnDay(h.startDate)
        : `${formatDateWithEnDay(h.startDate)} - ${formatDateWithEnDay(h.endDate)}`;

    return `${dateStr} (${h.name}) - ${daysCount} ngày`;
  });

  return (
    <div className="bg-gradient-to-r from-surface-negative via-surface-accent to-surface-warning border border-line-negative/40 rounded-vds-lg px-3.5 py-2 flex items-center justify-between gap-3 text-xs font-ui animate-fade-in">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-negative-solid to-warning-solid text-on-color flex items-center justify-center shrink-0 ">
          <Sparkles className="w-3 h-3 fill-white text-on-color" />
        </div>
        <div className="truncate">
          <span className="font-title font-bold text-negative mr-1.5">
            Nghỉ lễ sắp tới:
          </span>
          <span className="text-accent font-medium">
            {holidaysFormatted.join(' • ')}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-negative-solid/12 text-negative border border-line-negative/25 flex items-center gap-1">
          <Calendar className="w-2.5 h-2.5" />
          <span>Nghỉ lễ</span>
        </span>
      </div>
    </div>
  );
};
