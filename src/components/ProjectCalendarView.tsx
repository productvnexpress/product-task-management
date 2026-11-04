/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { ProjectItem, MemberItem, TaskItem } from '../types';
import {
  getProjectDateBounds,
  generateTimeScale,
  calculateTimelinePosition,
  formatPmShortName,
} from '../utils/projectTimelineUtils';
import { getTodayDateString } from '../utils/dateUtils';
import { formatDateShort } from '../utils/formatters';
import {
  Users,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
} from './vds/icons';

interface ProjectCalendarViewProps {
  projects: ProjectItem[];
  tasks: TaskItem[];
  members: MemberItem[];
  onOpenProjectDetail?: (projectId: string) => void;
  activeProductMember?: MemberItem | null;
}

type CalendarViewMode = 'month' | 'week';

export const ProjectCalendarView: React.FC<ProjectCalendarViewProps> = ({
  projects,
  members,
  onOpenProjectDetail,
}) => {
  // 1. Chế độ xem: Chỉ giữ Tháng và Tuần
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');

  // 2. Mốc thời gian điều hướng
  const [refDate, setRefDate] = useState<Date>(() => new Date());

  // 3. Lọc theo nhân sự
  const [selectedMemberFilter, setSelectedMemberFilter] = useState<string>('all');

  // 4. Lọc theo trạng thái
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // 5. Trạng thái phóng to toàn màn hình
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Thoát fullscreen bằng phím ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Khóa cuộn trang khi bật toàn màn hình
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  // Cột thang đo thời gian và mốc biên ngày
  const timeScale = useMemo(() => {
    return generateTimeScale(viewMode, refDate);
  }, [viewMode, refDate]);

  // Lọc danh sách dự án hiển thị
  const displayedProjects = useMemo(() => {
    return projects.filter((p) => {
      // 1. Lọc nhân sự
      if (selectedMemberFilter !== 'all') {
        const pms = p.roles?.pm || [];
        const des = p.roles?.designer || [];
        const seos = p.roles?.seo || [];
        const datas = p.roles?.data || [];
        const lead = p.leadName || '';
        const allNames = [...pms, ...des, ...seos, ...datas, lead].join(' ');
        if (!allNames.toLowerCase().includes(selectedMemberFilter.toLowerCase())) {
          return false;
        }
      }

      // 2. Lọc trạng thái
      if (statusFilter !== 'all') {
        if (p.status !== statusFilter) return false;
      }

      return true;
    });
  }, [projects, selectedMemberFilter, statusFilter]);

  // Điều hướng thời gian
  const handlePrev = () => {
    const d = new Date(refDate);
    if (viewMode === 'month') {
      d.setMonth(d.getMonth() - 1);
    } else {
      d.setDate(d.getDate() - 7);
    }
    setRefDate(d);
  };

  const handleNext = () => {
    const d = new Date(refDate);
    if (viewMode === 'month') {
      d.setMonth(d.getMonth() + 1);
    } else {
      d.setDate(d.getDate() + 7);
    }
    setRefDate(d);
  };

  const handleToday = () => {
    setRefDate(new Date());
  };

  // Màu pastel nhẹ nhàng theo trạng thái dự án
  const getProjectBarStyle = (status: ProjectItem['status']) => {
    switch (status) {
      case 'Đang triển khai':
        return {
          classes: 'bg-surface-info text-support border border-line border-l-[3px] border-l-line-info hover:bg-surface-info',
          label: 'Đang triển khai',
        };
      case 'Hoàn thành':
        return {
          classes: 'bg-surface-positive text-positive border border-line border-l-[3px] border-l-line-positive hover:bg-surface-positive',
          label: 'Hoàn thành',
        };
      case 'Chưa triển khai':
        return {
          classes: 'bg-surface-100 text-ink-lighter border border-line border-l-[3px] border-l-line-regular hover:bg-surface-200',
          label: 'Chưa triển khai',
        };
      case 'Tạm dừng':
        return {
          classes: 'bg-surface-negative text-negative border border-line border-l-[3px] border-l-line-negative hover:bg-surface-negative',
          label: 'Tạm dừng',
        };
      default:
        return {
          classes: 'bg-surface-info text-support border border-line border-l-[3px] border-l-line-info hover:bg-surface-info',
          label: 'Đang triển khai',
        };
    }
  };

  // Tọa độ vạch "Hôm nay"
  const todayStr = getTodayDateString();
  const todayPos = useMemo(() => {
    return calculateTimelinePosition(
      todayStr,
      todayStr,
      timeScale.minDate,
      timeScale.maxDate
    );
  }, [todayStr, timeScale.minDate, timeScale.maxDate]);

  // Danh sách nhân sự bộ phận Product phục vụ bộ lọc
  const productMembers = useMemo(() => {
    return members.filter(
      (m) => m.team && ['Product Manager', 'UX/UI Designer', 'SEO', 'Data'].includes(m.team)
    );
  }, [members]);

  return (
    <div
      className={
        isFullscreen
          ? 'fixed inset-0 z-50 bg-surface-100 p-4 sm:p-6 overflow-y-auto flex flex-col space-y-3'
          : 'space-y-3 animate-fade-in w-full'
      }
    >
      {/* 1. Thanh điều khiển: Chế độ xem & Bộ lọc */}
      <div className="bg-surface border border-line rounded-vds-lg p-2.5 flex flex-wrap items-center justify-between gap-2.5">
        {/* Nhóm trái: Chế độ xem (Tháng / Tuần) */}
        <div className="flex items-center gap-1 bg-surface-200 p-1 rounded-vds-lg border border-line">
          <button
            type="button"
            onClick={() => setViewMode('month')}
            className={`px-3 py-1 rounded-vds-lg text-xs font-ui font-bold transition cursor-pointer ${
              viewMode === 'month'
                ? 'bg-surface text-accent border border-line'
                : 'text-ink-lighter hover:text-ink'
            }`}
          >
            Tháng
          </button>
          <button
            type="button"
            onClick={() => setViewMode('week')}
            className={`px-3 py-1 rounded-vds-lg text-xs font-ui font-bold transition cursor-pointer ${
              viewMode === 'week'
                ? 'bg-surface text-accent border border-line'
                : 'text-ink-lighter hover:text-ink'
            }`}
          >
            Tuần
          </button>
        </div>

        {/* Nhóm giữa: Điều hướng mốc thời gian */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handlePrev}
            className="p-1.5 rounded-vds-lg border border-line hover:bg-surface-200 text-ink-lighter hover:text-ink transition-colors cursor-pointer"
            title="Trước"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="text-xs font-ui font-bold text-ink px-2 whitespace-nowrap min-w-[130px] text-center">
            {timeScale.windowLabel}
          </span>

          <button
            type="button"
            onClick={handleNext}
            className="p-1.5 rounded-vds-lg border border-line hover:bg-surface-200 text-ink-lighter hover:text-ink transition-colors cursor-pointer"
            title="Sau"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleToday}
            className="px-2.5 py-1 text-xs font-ui font-bold rounded-vds-lg border border-line hover:bg-surface-200 text-ink-lighter hover:text-ink transition-colors cursor-pointer ml-1"
          >
            Hôm nay
          </button>
        </div>

        {/* Nhóm phải: Lọc nhân sự & Phóng to */}
        <div className="flex items-center gap-2 flex-wrap ml-auto">
          {/* Lọc theo nhân sự */}
          <div className="flex items-center gap-1 bg-surface-100 border border-line rounded-vds-lg px-2 py-1 text-xs font-ui">
            <Users className="w-3.5 h-3.5 text-subdued" />
            <select
              value={selectedMemberFilter}
              onChange={(e) => setSelectedMemberFilter(e.target.value)}
              className="bg-transparent text-xs font-body text-ink focus:outline-hidden cursor-pointer"
            >
              <option value="all">Tất cả nhân sự</option>
              {productMembers.map((m) => (
                <option key={m.id} value={m.name}>
                  {m.name} ({m.team === 'Product Manager' ? 'PM' : m.team})
                </option>
              ))}
            </select>
          </div>

          {/* Nút Phóng to / Thu nhỏ (Fullscreen) */}
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="px-2.5 py-1.5 rounded-vds-lg border border-line bg-surface hover:bg-surface-200 text-ink-lighter hover:text-ink transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-ui font-bold"
            title={isFullscreen ? 'Thu nhỏ (ESC)' : 'Toàn màn hình'}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-accent" />
                <span>Thu nhỏ</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Phóng to</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Chú thích Ý nghĩa Màu sắc Pastel */}
      <div className="bg-surface border border-line rounded-vds-lg px-3.5 py-2 flex items-center gap-4 text-xs font-ui text-ink-lighter flex-wrap">
        <span className="text-xs font-bold text-subdued">
          Trạng thái:
        </span>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-xs bg-surface-info border border-line border-l-[3px] border-l-line-info" />
          <span className="text-ink">Đang triển khai</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-xs bg-surface-positive border border-line border-l-[3px] border-l-line-positive" />
          <span className="text-ink">Hoàn thành</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-xs bg-surface-100 border border-line border-l-[3px] border-l-line-regular" />
          <span className="text-ink">Chưa triển khai</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-xs bg-surface-negative border border-line border-l-[3px] border-l-line-negative" />
          <span className="text-ink">Tạm dừng</span>
        </div>
      </div>

      {/* 3. Khung Biểu đồ Gantt Timeline (Tháng / Tuần) */}
      <div
        className={`bg-surface border border-line rounded-vds-lg overflow-hidden flex flex-col ${
          isFullscreen ? 'flex-1 min-h-[550px]' : ''
        }`}
      >
        <div className="flex overflow-x-auto min-h-[450px] flex-1">
          {/* Cột trái: Định danh Dự án & Cột PM phụ trách thẳng hàng (w-72, PM w-20) */}
          <div className="w-72 shrink-0 border-r border-line bg-surface-100 z-10 sticky left-0 ">
            {/* Tiêu đề cột trái */}
            <div className="h-12 border-b border-line px-3 flex items-center text-xs font-ui font-bold text-subdued">
              <div className="flex-1 min-w-0">Dự án ({displayedProjects.length})</div>
              <div className="w-20 shrink-0 text-left pl-2 border-l border-line">PM</div>
            </div>

            {/* Các hàng dự án */}
            <div className="divide-y divide-divider">
              {displayedProjects.map((p) => {
                const rawPm = p.roles?.pm?.[0] || p.leadName?.split(/[,&]/)[0] || '';
                const pmShort = formatPmShortName(rawPm);

                return (
                  <div
                    key={p.id}
                    onClick={() => onOpenProjectDetail?.(p.id)}
                    className="h-14 px-3 flex items-center hover:bg-surface-200 transition-colors cursor-pointer group"
                    title="Xem chi tiết dự án"
                  >
                    {/* Cột 1: Tên & Mã dự án */}
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-ui font-bold text-xs text-ink truncate group-hover:text-accent">
                          {p.name.replace(/^Dự án\s+/i, '')}
                        </span>
                        {p.isStrategic && (
                          <span className="text-warning text-xs shrink-0" title="Chiến lược">
                            ⭐
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-num text-subdued block truncate">
                        {p.code}
                      </span>
                    </div>

                    {/* Cột 2: PM phụ trách (Thẳng hàng, rút gọn tên) */}
                    <div className="w-20 shrink-0 text-left pl-2 border-l border-divider">
                      <span
                        className="text-xs font-ui font-semibold text-ink-lighter truncate block"
                        title={rawPm || undefined}
                      >
                        {pmShort}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Khung phải: Thang đo Thời gian & Thanh Gantt Dự án */}
          <div className="flex-1 min-w-[700px] relative bg-surface flex flex-col">
            {/* Hàng tiêu đề cột thời gian */}
            <div className="h-12 border-b border-line flex sticky top-0 bg-surface-100 z-5">
              {timeScale.columns.map((col) => (
                <div
                  key={col.id}
                  className={`flex-1 border-r border-line px-2 flex flex-col justify-center text-center select-none ${
                    col.isToday ? 'bg-surface-warning' : ''
                  }`}
                >
                  <span
                    className={`text-xs font-ui font-bold truncate ${
                      col.isToday ? 'text-warning' : 'text-ink'
                    }`}
                  >
                    {col.label}
                  </span>
                  {col.subLabel && (
                    <span className="text-[10px] font-num text-subdued-lighter truncate">
                      {col.subLabel}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Hàng chứa thanh Gantt */}
            <div className="divide-y divide-divider relative flex-1">
              {/* Vạch chỉ báo thời gian Hôm nay */}
              {todayPos.isVisible && (
                <div
                  style={{ left: `${todayPos.leftPercent}%` }}
                  className="absolute top-0 bottom-0 w-0.5 bg-negative-solid z-10 pointer-events-none"
                  title={`Hôm nay (${todayStr})`}
                >
                  <span className="absolute -top-2 -translate-x-1/2 bg-negative-solid text-on-color text-[10px] font-ui font-bold px-1 rounded">
                    Hôm nay
                  </span>
                </div>
              )}

              {/* Các thanh dự án pastel nhẹ nhàng (Bỏ các chấm mốc phase) */}
              {displayedProjects.map((p) => {
                const bounds = getProjectDateBounds(p);
                const pos = calculateTimelinePosition(
                  bounds.startDate,
                  bounds.endDate,
                  timeScale.minDate,
                  timeScale.maxDate
                );

                const barStyle = getProjectBarStyle(p.status);

                return (
                  <div
                    key={p.id}
                    className="h-14 relative flex items-center px-1 hover:bg-surface-100/60 transition-colors"
                  >
                    {/* Vạch chia cột nền */}
                    <div className="absolute inset-0 flex pointer-events-none">
                      {timeScale.columns.map((col) => (
                        <div
                          key={col.id}
                          className={`flex-1 border-r border-divider ${
                            col.isToday ? 'bg-surface-warning/20' : ''
                          }`}
                        />
                      ))}
                    </div>

                    {/* Thanh Gantt dự án pastel */}
                    {pos.isVisible && (
                      <div
                        onClick={() => onOpenProjectDetail?.(p.id)}
                        style={{
                          left: `${pos.leftPercent}%`,
                          width: `${pos.widthPercent}%`,
                        }}
                        className={`absolute h-7 rounded-vds-md transition hover:brightness-95 cursor-pointer z-5 flex items-center px-2.5 ${barStyle.classes}`}
                        title={`${p.name}\nTrạng thái: ${p.status}\nThời hạn: ${formatDateShort(bounds.startDate)} ➔ ${formatDateShort(bounds.endDate)}`}
                      >
                        <div className="flex items-center gap-1.5 truncate text-xs font-ui font-semibold">
                          <span className="truncate">{p.name.replace(/^Dự án\s+/i, '')}</span>
                          {p.isStrategic && (
                            <span className="text-[10px] shrink-0" title="Chiến lược">
                              ⭐
                            </span>
                          )}
                          <span className="text-[10px] opacity-75 font-num hidden md:inline shrink-0">
                            ({formatDateShort(bounds.endDate)})
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
