/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { workingTimeService } from '../services/workingTimeService';
import { getTodayDateString, getDaysDifference } from '../utils/dateUtils';
import { formatDateWithEnDay } from '../utils/formatters';
import { Sparkles, Calendar } from 'lucide-react';

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
    <div className="bg-gradient-to-r from-[#ffe4e6] via-[#fce7f3] to-[#fef3c7] border border-[#f43f5e]/40 rounded-[10px] px-3.5 py-2 shadow-2xs flex items-center justify-between gap-3 text-xs font-ui animate-fade-in">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-[#f43f5e] to-[#f59e0b] text-white flex items-center justify-center shrink-0 shadow-2xs">
          <Sparkles className="w-3 h-3 fill-white text-white" />
        </div>
        <div className="truncate">
          <span className="font-title font-bold text-[#be123c] mr-1.5">
            Nghỉ lễ sắp tới:
          </span>
          <span className="text-[#881337] font-medium">
            {holidaysFormatted.join(' • ')}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#be123c]/12 text-[#be123c] border border-[#be123c]/25 uppercase tracking-wider flex items-center gap-1">
          <Calendar className="w-2.5 h-2.5" />
          <span>Nghỉ lễ</span>
        </span>
      </div>
    </div>
  );
};
