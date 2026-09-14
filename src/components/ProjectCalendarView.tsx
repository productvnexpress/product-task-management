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
} from 'lucide-react';

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
          classes: 'bg-[#eff6ff] text-[#1e40af] border border-[#bfdbfe] border-l-[3px] border-l-[#2563eb] hover:bg-[#dbeafe]',
          label: 'Đang triển khai',
        };
      case 'Hoàn thành':
        return {
          classes: 'bg-[#f0fdf4] text-[#166534] border border-[#bbf7d0] border-l-[3px] border-l-[#16a34a] hover:bg-[#dcfce7]',
          label: 'Hoàn thành',
        };
      case 'Chưa triển khai':
        return {
          classes: 'bg-[#f8fafc] text-[#475569] border border-[#e2e8f0] border-l-[3px] border-l-[#94a3b8] hover:bg-[#f1f5f9]',
          label: 'Chưa triển khai',
        };
      case 'Tạm dừng':
        return {
          classes: 'bg-[#fff1f2] text-[#9f1239] border border-[#fecdd3] border-l-[3px] border-l-[#e11d48] hover:bg-[#ffe4e6]',
          label: 'Tạm dừng',
        };
      default:
        return {
          classes: 'bg-[#eff6ff] text-[#1e40af] border border-[#bfdbfe] border-l-[3px] border-l-[#2563eb] hover:bg-[#dbeafe]',
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
          ? 'fixed inset-0 z-50 bg-[#f8fafc] p-4 sm:p-6 overflow-y-auto flex flex-col space-y-3'
          : 'space-y-3 animate-fade-in w-full'
      }
    >
      {/* 1. Thanh điều khiển: Chế độ xem & Bộ lọc */}
      <div className="bg-white border border-[#e0e0e0] rounded-[10px] p-2.5 shadow-2xs flex flex-wrap items-center justify-between gap-2.5">
        {/* Nhóm trái: Chế độ xem (Tháng / Tuần) */}
        <div className="flex items-center gap-1 bg-[#f5f5f5] p-1 rounded-[8px] border border-[#e0e0e0]">
          <button
            type="button"
            onClick={() => setViewMode('month')}
            className={`px-3 py-1 rounded-[6px] text-xs font-ui font-bold transition-all cursor-pointer ${
              viewMode === 'month'
                ? 'bg-white text-[#963861] shadow-2xs border border-[#e0e0e0]'
                : 'text-[#5f5f5f] hover:text-[#202020]'
            }`}
          >
            Tháng
          </button>
          <button
            type="button"
            onClick={() => setViewMode('week')}
            className={`px-3 py-1 rounded-[6px] text-xs font-ui font-bold transition-all cursor-pointer ${
              viewMode === 'week'
                ? 'bg-white text-[#963861] shadow-2xs border border-[#e0e0e0]'
                : 'text-[#5f5f5f] hover:text-[#202020]'
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
            className="p-1.5 rounded-[6px] border border-[#d6d6d6] hover:bg-[#f5f5f5] text-[#5f5f5f] hover:text-[#202020] transition-colors cursor-pointer"
            title="Trước"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="text-xs font-ui font-bold text-[#202020] px-2 whitespace-nowrap min-w-[130px] text-center">
            {timeScale.windowLabel}
          </span>

          <button
            type="button"
            onClick={handleNext}
            className="p-1.5 rounded-[6px] border border-[#d6d6d6] hover:bg-[#f5f5f5] text-[#5f5f5f] hover:text-[#202020] transition-colors cursor-pointer"
            title="Sau"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleToday}
            className="px-2.5 py-1 text-xs font-ui font-bold rounded-[6px] border border-[#d6d6d6] hover:bg-[#f5f5f5] text-[#5f5f5f] hover:text-[#202020] transition-colors cursor-pointer ml-1"
          >
            Hôm nay
          </button>
        </div>

        {/* Nhóm phải: Lọc nhân sự & Phóng to */}
        <div className="flex items-center gap-2 flex-wrap ml-auto">
          {/* Lọc theo nhân sự */}
          <div className="flex items-center gap-1 bg-[#fafafa] border border-[#d6d6d6] rounded-[6px] px-2 py-1 text-xs font-ui">
            <Users className="w-3.5 h-3.5 text-[#7f7f7f]" />
            <select
              value={selectedMemberFilter}
              onChange={(e) => setSelectedMemberFilter(e.target.value)}
              className="bg-transparent text-xs font-body text-[#202020] focus:outline-hidden cursor-pointer"
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
            className="px-2.5 py-1.5 rounded-[6px] border border-[#d6d6d6] bg-white hover:bg-[#f5f5f5] text-[#5f5f5f] hover:text-[#202020] transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-ui font-bold"
            title={isFullscreen ? 'Thu nhỏ (ESC)' : 'Toàn màn hình'}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-[#963861]" />
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
      <div className="bg-white border border-[#e8e8e8] rounded-[8px] px-3.5 py-2 shadow-2xs flex items-center gap-4 text-xs font-ui text-[#5f5f5f] flex-wrap">
        <span className="text-[11px] font-bold text-[#7f7f7f] uppercase tracking-wider">
          Trạng thái:
        </span>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-xs bg-[#eff6ff] border border-[#bfdbfe] border-l-[3px] border-l-[#2563eb]" />
          <span className="text-[#202020]">Đang triển khai</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-xs bg-[#f0fdf4] border border-[#bbf7d0] border-l-[3px] border-l-[#16a34a]" />
          <span className="text-[#202020]">Hoàn thành</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-xs bg-[#f8fafc] border border-[#e2e8f0] border-l-[3px] border-l-[#94a3b8]" />
          <span className="text-[#202020]">Chưa triển khai</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-xs bg-[#fff1f2] border border-[#fecdd3] border-l-[3px] border-l-[#e11d48]" />
          <span className="text-[#202020]">Tạm dừng</span>
        </div>
      </div>

      {/* 3. Khung Biểu đồ Gantt Timeline (Tháng / Tuần) */}
      <div
        className={`bg-white border border-[#e0e0e0] rounded-[12px] shadow-2xs overflow-hidden flex flex-col ${
          isFullscreen ? 'flex-1 min-h-[550px]' : ''
        }`}
      >
        <div className="flex overflow-x-auto min-h-[450px] flex-1">
          {/* Cột trái: Định danh Dự án & Cột PM phụ trách thẳng hàng (w-72, PM w-20) */}
          <div className="w-72 shrink-0 border-r border-[#e0e0e0] bg-[#fafafa] z-10 sticky left-0 shadow-xs">
            {/* Tiêu đề cột trái */}
            <div className="h-12 border-b border-[#e0e0e0] px-3 flex items-center text-xs font-ui font-extrabold uppercase tracking-wider text-[#7f7f7f]">
              <div className="flex-1 min-w-0">Dự án ({displayedProjects.length})</div>
              <div className="w-20 shrink-0 text-left pl-2 border-l border-[#e0e0e0]">PM</div>
            </div>

            {/* Các hàng dự án */}
            <div className="divide-y divide-[#f0f0f0]">
              {displayedProjects.map((p) => {
                const rawPm = p.roles?.pm?.[0] || p.leadName?.split(/[,&]/)[0] || '';
                const pmShort = formatPmShortName(rawPm);

                return (
                  <div
                    key={p.id}
                    onClick={() => onOpenProjectDetail?.(p.id)}
                    className="h-14 px-3 flex items-center hover:bg-[#f0f4f8] transition-colors cursor-pointer group"
                    title="Xem chi tiết dự án"
                  >
                    {/* Cột 1: Tên & Mã dự án */}
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-ui font-bold text-xs text-[#202020] truncate group-hover:text-[#963861]">
                          {p.name.replace(/^Dự án\s+/i, '')}
                        </span>
                        {p.isStrategic && (
                          <span className="text-[#d97706] text-xs shrink-0" title="Chiến lược">
                            ⭐
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-num text-[#7f7f7f] block truncate">
                        {p.code}
                      </span>
                    </div>

                    {/* Cột 2: PM phụ trách (Thẳng hàng, rút gọn tên) */}
                    <div className="w-20 shrink-0 text-left pl-2 border-l border-[#f0f0f0]">
                      <span
                        className="text-xs font-ui font-semibold text-[#475569] truncate block"
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
          <div className="flex-1 min-w-[700px] relative bg-white flex flex-col">
            {/* Hàng tiêu đề cột thời gian */}
            <div className="h-12 border-b border-[#e0e0e0] flex sticky top-0 bg-[#fafafa] z-5">
              {timeScale.columns.map((col) => (
                <div
                  key={col.id}
                  className={`flex-1 border-r border-[#e8e8e8] px-2 flex flex-col justify-center text-center select-none ${
                    col.isToday ? 'bg-[#fff7ed]' : ''
                  }`}
                >
                  <span
                    className={`text-xs font-ui font-bold truncate ${
                      col.isToday ? 'text-[#c2410c]' : 'text-[#202020]'
                    }`}
                  >
                    {col.label}
                  </span>
                  {col.subLabel && (
                    <span className="text-[10px] font-num text-[#9f9f9f] truncate">
                      {col.subLabel}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Hàng chứa thanh Gantt */}
            <div className="divide-y divide-[#f0f0f0] relative flex-1">
              {/* Vạch chỉ báo thời gian Hôm nay */}
              {todayPos.isVisible && (
                <div
                  style={{ left: `${todayPos.leftPercent}%` }}
                  className="absolute top-0 bottom-0 w-0.5 bg-[#dc2626] z-10 pointer-events-none"
                  title={`Hôm nay (${todayStr})`}
                >
                  <span className="absolute -top-2 -translate-x-1/2 bg-[#dc2626] text-white text-[9px] font-ui font-bold px-1 rounded">
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
                    className="h-14 relative flex items-center px-1 hover:bg-[#fafafa]/60 transition-colors"
                  >
                    {/* Vạch chia cột nền */}
                    <div className="absolute inset-0 flex pointer-events-none">
                      {timeScale.columns.map((col) => (
                        <div
                          key={col.id}
                          className={`flex-1 border-r border-[#f0f0f0] ${
                            col.isToday ? 'bg-[#fff7ed]/20' : ''
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
                        className={`absolute h-7 rounded-[4px] shadow-2xs transition-all hover:brightness-95 cursor-pointer z-5 flex items-center px-2.5 ${barStyle.classes}`}
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
