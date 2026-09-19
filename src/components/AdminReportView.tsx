/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { TaskItem, ProjectItem, MemberItem, TeamType } from '../types';
import {
  TimePeriod,
  generateDepartmentReport,
  TaskDisciplineResult,
  analyzeTaskDiscipline,
} from '../utils/reportUtils';
import { formatDateWithEnDay } from '../utils/formatters';
import { normalizeDateString, getTodayDateString } from '../utils/dateUtils';
import { isSamePersonName } from '../utils/memberPersonalization';
import {
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Briefcase,
  Users,
  ExternalLink,
  Award,
  Calendar,
  Layers,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface AdminReportViewProps {
  tasks: TaskItem[];
  projects: ProjectItem[];
  members: MemberItem[];
  activeProductMember?: MemberItem | null;
  selectedProjectId: string;
  selectedTeam: 'Tất cả' | TeamType;
  onOpenTaskDetail?: (task: TaskItem) => void;
  onSelectProject?: (projectId: string) => void;
  onOpenDateInTasks?: (dateStr: string) => void;
}

type ReportSubTab = 'overview' | 'pm_leadership' | 'executive_performance' | 'task_details' | 'calendar';

export const AdminReportView: React.FC<AdminReportViewProps> = ({
  tasks,
  projects,
  members,
  activeProductMember,
  selectedProjectId,
  selectedTeam,
  onOpenTaskDetail,
  onSelectProject,
  onOpenDateInTasks,
}) => {
  // 1. Bộ lọc Thời gian — riêng cho Báo cáo (Sidebar không có khái niệm kỳ báo cáo)
  const [period, setPeriod] = useState<TimePeriod>('this_week');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');

  // Dự án / Nhóm / Nhân sự dùng chung với Sidebar và bộ chọn nhân sự trên topbar
  // (cạnh chuông thông báo) — mặc định focus vào chính người đang đăng nhập.
  const selectedAssignee = activeProductMember?.name || 'Tất cả';

  // 2. Navigation sub-tab — mặc định mở ngay vào Lịch
  const [subTab, setSubTab] = useState<ReportSubTab>('calendar');

  // 3. Drill-down discipline filter
  const [selectedDisciplineFilter, setSelectedDisciplineFilter] = useState<string>('all');

  // 4. Calendar view state (tháng đang xem)
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => new Date());

  // Calculate report summary using reportUtils
  const summary = useMemo(() => {
    return generateDepartmentReport(
      tasks,
      projects,
      members,
      period,
      {
        projectId: selectedProjectId,
        team: selectedTeam,
        assignee: selectedAssignee,
        customStart: period === 'custom' ? customStart : undefined,
        customEnd: period === 'custom' ? customEnd : undefined,
      }
    );
  }, [
    tasks,
    projects,
    members,
    period,
    selectedProjectId,
    selectedTeam,
    selectedAssignee,
    customStart,
    customEnd,
  ]);

  // Filtered tasks for Drill-down list
  const filteredDrilldownTasks = useMemo(() => {
    if (selectedDisciplineFilter === 'all') {
      return summary.tasksAnalyzed;
    }
    if (selectedDisciplineFilter === 'on_time') {
      return summary.tasksAnalyzed.filter((r) => r.isCompleted && r.isOnTime);
    }
    if (selectedDisciplineFilter === 'late') {
      return summary.tasksAnalyzed.filter((r) => r.isCompleted && !r.isOnTime);
    }
    if (selectedDisciplineFilter === 'currently_overdue') {
      return summary.tasksAnalyzed.filter(
        (r) => !r.isCompleted && r.discipline === 'currently_overdue'
      );
    }
    if (selectedDisciplineFilter === 'in_progress') {
      return summary.tasksAnalyzed.filter(
        (r) => !r.isCompleted && r.discipline !== 'currently_overdue'
      );
    }
    return summary.tasksAnalyzed.filter(
      (r) => r.discipline === selectedDisciplineFilter
    );
  }, [summary.tasksAnalyzed, selectedDisciplineFilter]);

  // Preset time buttons
  const timePresets: { id: TimePeriod; label: string }[] = [
    { id: 'today', label: 'Hôm nay' },
    { id: 'yesterday', label: 'Hôm qua' },
    { id: 'this_week', label: 'Tuần này' },
    { id: 'last_week', label: 'Tuần trước' },
    { id: 'this_month', label: 'Tháng này' },
    { id: 'last_month', label: 'Tháng trước' },
    { id: 'custom', label: 'Tùy chọn ngày' },
  ];

  // Khi đã chọn một nhân sự cụ thể, các bảng Dự án / Quản lý / Nhân sự chỉ hiển thị
  // những dòng liên quan đến người đó thay vì toàn bộ danh sách
  const isAssigneeFiltered = selectedAssignee !== 'Tất cả';

  const displayedProjectStats = useMemo(() => {
    if (!isAssigneeFiltered) return summary.projectStats;
    return summary.projectStats.filter((p) => p.totalTasks > 0);
  }, [summary.projectStats, isAssigneeFiltered]);

  const displayedPmStats = useMemo(() => {
    if (!isAssigneeFiltered) return summary.pmStats;
    return summary.pmStats.filter((p) => isSamePersonName(p.pm.name, selectedAssignee));
  }, [summary.pmStats, isAssigneeFiltered, selectedAssignee]);

  const displayedExecutiveStats = useMemo(() => {
    if (!isAssigneeFiltered) return summary.executiveStats;
    return summary.executiveStats.filter((e) => isSamePersonName(e.member.name, selectedAssignee));
  }, [summary.executiveStats, isAssigneeFiltered, selectedAssignee]);

  // 5. Dữ liệu cho Lịch theo tháng — độc lập với bộ lọc Thời gian (period),
  // nhưng vẫn tôn trọng bộ lọc Dự án / Nhóm / Nhân sự phía trên
  const calendarFilteredTasks = useMemo(() => {
    let list = tasks;
    if (selectedProjectId !== 'all') {
      list = list.filter((t) => t.projectId === selectedProjectId);
    }
    if (selectedTeam !== 'Tất cả') {
      list = list.filter((t) => t.team === selectedTeam);
    }
    if (selectedAssignee !== 'Tất cả') {
      list = list.filter((t) => isSamePersonName(t.assignee, selectedAssignee));
    }
    return list;
  }, [tasks, selectedProjectId, selectedTeam, selectedAssignee]);

  const tasksByDueDate = useMemo(() => {
    const map = new Map<string, TaskItem[]>();
    calendarFilteredTasks.forEach((t) => {
      const d = normalizeDateString(t.dueDate);
      if (!d) return;
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(t);
    });
    return map;
  }, [calendarFilteredTasks]);

  const todayStr = getTodayDateString();

  // Đếm số việc theo từng trạng thái kỷ luật (đúng hạn / sau hạn / quá hạn / nghẽn / đang làm)
  // cho mỗi ngày, để tô màu ô lịch — dùng chung logic phân tích với các bảng phía trên
  const calendarDayCounts = useMemo(() => {
    const map = new Map<
      string,
      { onTime: number; late: number; overdue: number; blocked: number; inProgress: number; total: number }
    >();
    tasksByDueDate.forEach((list, dateStr) => {
      let onTime = 0;
      let late = 0;
      let overdue = 0;
      let blocked = 0;
      let inProgress = 0;
      list.forEach((t) => {
        const res = analyzeTaskDiscipline(t);
        if (res.discipline === 'on_time_early' || res.discipline === 'on_time_same_day') onTime++;
        else if (res.discipline === 'late_next_day' || res.discipline === 'late_after_days') late++;
        else if (res.discipline === 'currently_overdue') overdue++;
        else if (res.discipline === 'blocked') blocked++;
        else inProgress++;
      });
      map.set(dateStr, { onTime, late, overdue, blocked, inProgress, total: list.length });
    });
    return map;
  }, [tasksByDueDate]);

  const calendarCells = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = (firstDay.getDay() + 6) % 7; // Tuần bắt đầu từ Thứ 2

    const cells: { dateStr: string; dayNum: number; inMonth: boolean }[] = [];
    for (let i = startOffset; i > 0; i--) {
      const d = new Date(year, month, 1 - i);
      cells.push({ dateStr: getTodayDateString(d), dayNum: d.getDate(), inMonth: false });
    }
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const d = new Date(year, month, day);
      cells.push({ dateStr: getTodayDateString(d), dayNum: day, inMonth: true });
    }
    while (cells.length % 7 !== 0) {
      const last = new Date(cells[cells.length - 1].dateStr + 'T00:00:00');
      last.setDate(last.getDate() + 1);
      cells.push({ dateStr: getTodayDateString(last), dayNum: last.getDate(), inMonth: false });
    }
    return cells;
  }, [calendarMonth]);

  const calendarMonthTaskCount = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    let count = 0;
    tasksByDueDate.forEach((list, dateStr) => {
      if (dateStr.startsWith(prefix)) count += list.length;
    });
    return count;
  }, [tasksByDueDate, calendarMonth]);

  const goPrevMonth = () =>
    setCalendarMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const goNextMonth = () =>
    setCalendarMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  const goCurrentMonth = () => setCalendarMonth(new Date());

  const handleSelectCalendarDay = (dateStr: string) => {
    if (onOpenDateInTasks) onOpenDateInTasks(dateStr);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#fafafa] p-6 space-y-6 scrollbar-thin">
      {/* 1. Header */}
      <div className="bg-white rounded-[12px] border border-[#e0e0e0] p-5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-ui text-[#7f7f7f]">
                {summary.periodLabel}
              </span>
            </div>
            <h1 className="text-xl font-title font-bold text-[#202020] mt-1">
              Báo cáo
            </h1>
            <p className="text-xs font-body text-[#5f5f5f] mt-0.5">
              Theo dõi tỷ lệ hoàn thành, trễ hạn và sức khỏe dự án.
            </p>
          </div>
        </div>

        {/* 2. Control Bar (Time Presets & Cross Filters) */}
        <div className="mt-5 pt-4 border-t border-[#f0f0f0] flex flex-col gap-3">
          {/* Time Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-ui font-extrabold uppercase tracking-wider text-[#9f9f9f] mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#7f7f7f]" />
              Thời gian:
            </span>
            {timePresets.map((tp) => {
              const isSelected = period === tp.id;
              return (
                <button
                  key={tp.id}
                  onClick={() => setPeriod(tp.id)}
                  className={`px-2.5 py-1 rounded-[6px] text-xs font-ui transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#963861] text-white font-bold shadow-2xs'
                      : 'bg-[#f5f5f5] text-[#5f5f5f] hover:bg-[#e9e9e9] hover:text-[#202020]'
                  }`}
                >
                  {tp.label}
                </button>
              );
            })}
          </div>

          {/* Custom Date Inputs if selected */}
          {period === 'custom' && (
            <div className="flex items-center gap-2 bg-[#fdf2f7] p-2.5 rounded-[8px] border border-[#f4c2d7] text-xs font-ui">
              <span className="font-bold text-[#963861]">Từ ngày:</span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="bg-white border border-[#d6d6d6] rounded px-2 py-1 text-xs"
              />
              <span className="font-bold text-[#963861]">Đến ngày:</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="bg-white border border-[#d6d6d6] rounded px-2 py-1 text-xs"
              />
            </div>
          )}

          {/* Dự án / Nhóm / Nhân sự dùng chung với bộ lọc Sidebar & bộ chọn nhân sự trên topbar
              (cạnh chuông thông báo) — chỉ hiển thị tóm tắt, chỉnh sửa ở nơi gốc để tránh trùng UI */}
          {(selectedProjectId !== 'all' || selectedTeam !== 'Tất cả' || selectedAssignee !== 'Tất cả') && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] font-ui text-[#9f9f9f] shrink-0">Đang áp dụng:</span>
              {selectedProjectId !== 'all' && (
                <span className="inline-flex items-center gap-1 text-[11px] font-ui font-bold bg-[#edf5fd] text-[#1e609c] px-2 py-0.5 rounded-full border border-[#cfe2fe]">
                  <Briefcase className="w-3 h-3" />
                  {projects.find((p) => p.id === selectedProjectId)?.name.replace(/^Dự án\s+/i, '') || 'Dự án'}
                </span>
              )}
              {selectedTeam !== 'Tất cả' && (
                <span className="inline-flex items-center gap-1 text-[11px] font-ui font-bold bg-[#f1f5f9] text-[#334155] px-2 py-0.5 rounded-full border border-[#cbd5e1]">
                  <Layers className="w-3 h-3" />
                  {selectedTeam}
                </span>
              )}
              {selectedAssignee !== 'Tất cả' && (
                <span className="inline-flex items-center gap-1 text-[11px] font-ui font-bold bg-[#fdf2f7] text-[#963861] px-2 py-0.5 rounded-full border border-[#f4c2d7]">
                  <Users className="w-3 h-3" />
                  {selectedAssignee}
                </span>
              )}
              <span className="text-[10px] font-ui text-[#b0b0b0]">
                (chỉnh Dự án/Nhóm tại Sidebar, Nhân sự tại bộ chọn cạnh chuông thông báo)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 3. Executive Summary KPI Cards (5 Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* KPI 1: Tổng công việc */}
        <div className="bg-white rounded-[10px] border border-[#e0e0e0] p-4 shadow-2xs">
          <p className="text-[11px] font-ui font-extrabold uppercase tracking-wider text-[#7f7f7f]">
            Tổng công việc
          </p>
          <div className="flex items-baseline gap-2 mt-1.5">
            <span className="text-2xl font-title font-bold text-[#202020]">
              {summary.totalTasks}
            </span>
            <span className="text-xs font-ui text-[#5f5f5f]">việc</span>
          </div>
          <div className="mt-2 text-[11px] font-ui text-[#7f7f7f] flex items-center justify-between border-t border-[#f0f0f0] pt-1.5">
            <span>Xong: <strong className="text-[#166534]">{summary.completedCount}</strong></span>
            <span>Đang làm: <strong>{summary.inProgressCount}</strong></span>
            <span>Nghẽn: <strong className="text-[#c2410c]">{summary.blockedCount}</strong></span>
          </div>
        </div>

        {/* KPI 2: Tỷ lệ hoàn thành đúng hạn */}
        <div className="bg-white rounded-[10px] border border-[#e0e0e0] p-4 shadow-2xs">
          <p className="text-[11px] font-ui font-extrabold uppercase tracking-wider text-[#7f7f7f] flex items-center justify-between">
            <span>Đúng hạn</span>
            <span className="text-[10px] text-[#7f7f7f]">Mục tiêu ≥85%</span>
          </p>
          <div className="flex items-baseline gap-2 mt-1.5">
            <span
              className={`text-2xl font-title font-bold ${
                summary.overallOnTimeRate >= 85
                  ? 'text-[#166534]'
                  : summary.overallOnTimeRate >= 70
                  ? 'text-[#ea580c]'
                  : 'text-[#dc2626]'
              }`}
            >
              {summary.overallOnTimeRate}%
            </span>
            <span className="text-xs font-ui text-[#5f5f5f]">
              ({summary.completedOnTimeCount}/{summary.completedCount})
            </span>
          </div>
          <div className="mt-2 w-full bg-[#f0f0f0] h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full ${
                summary.overallOnTimeRate >= 85
                  ? 'bg-[#166534]'
                  : summary.overallOnTimeRate >= 70
                  ? 'bg-[#ea580c]'
                  : 'bg-[#dc2626]'
              }`}
              style={{ width: `${Math.min(100, summary.overallOnTimeRate)}%` }}
            />
          </div>
        </div>

        {/* KPI 3: Hoàn thành sau hạn */}
        <div className="bg-white rounded-[10px] border border-[#e0e0e0] p-4 shadow-2xs">
          <p className="text-[11px] font-ui font-extrabold uppercase tracking-wider text-[#7f7f7f]">
            Hoàn thành sau hạn
          </p>
          <div className="flex items-baseline gap-2 mt-1.5">
            <span className="text-2xl font-title font-bold text-[#1d4ed8]">
              {summary.completedLateCount}
            </span>
            <span className="text-xs font-ui text-[#1d4ed8]">
              việc ({summary.completedCount > 0 ? Math.round((summary.completedLateCount / summary.completedCount) * 100) : 0}%)
            </span>
          </div>
          <p className="mt-2 text-[11px] font-ui text-[#7f7f7f] border-t border-[#f0f0f0] pt-1.5 truncate" title={`${summary.lateConfirmationCount} việc sau 1 ngày • ${summary.completedLateCount - summary.lateConfirmationCount} việc trễ ≥ 2 ngày`}>
            {summary.lateConfirmationCount} sau 1 ngày • {summary.completedLateCount - summary.lateConfirmationCount} trễ ≥ 2 ngày
          </p>
        </div>

        {/* KPI 4: Đang quá hạn */}
        <div className="bg-white rounded-[10px] border border-[#e0e0e0] p-4 shadow-2xs">
          <p className="text-[11px] font-ui font-extrabold uppercase tracking-wider text-[#7f7f7f] flex items-center justify-between">
            <span>Đang quá hạn</span>
            {summary.currentlyOverdueCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-[#dc2626] animate-pulse" />
            )}
          </p>
          <div className="flex items-baseline gap-2 mt-1.5">
            <span
              className={`text-2xl font-title font-bold ${
                summary.currentlyOverdueCount > 0 ? 'text-[#dc2626]' : 'text-[#166534]'
              }`}
            >
              {summary.currentlyOverdueCount}
            </span>
            <span className="text-xs font-ui text-[#5f5f5f]">việc</span>
          </div>
          <p className="mt-2 text-[11px] font-ui text-[#7f7f7f] border-t border-[#f0f0f0] pt-1.5 truncate">
            {summary.currentlyOverdueCount > 0 ? 'Chưa hoàn thành' : '0 việc quá hạn'}
          </p>
        </div>

        {/* KPI 5: Điểm nghẽn */}
        <div className="bg-white rounded-[10px] border border-[#e0e0e0] p-4 shadow-2xs">
          <p className="text-[11px] font-ui font-extrabold uppercase tracking-wider text-[#7f7f7f]">
            Điểm nghẽn
          </p>
          <div className="flex items-baseline gap-2 mt-1.5">
            <span
              className={`text-2xl font-title font-bold ${
                summary.blockedCount > 0 ? 'text-[#ea580c]' : 'text-[#166534]'
              }`}
            >
              {summary.blockedCount}
            </span>
            <span className="text-xs font-ui text-[#5f5f5f]">việc</span>
          </div>
          <p className="mt-2 text-[11px] font-ui text-[#7f7f7f] border-t border-[#f0f0f0] pt-1.5 truncate">
            {summary.blockedCount > 0 ? 'Đang bị nghẽn' : '0 việc nghẽn'}
          </p>
        </div>
      </div>

      {/* 4. Discipline Breakdown Visual Bar */}
      <div className="bg-white rounded-[12px] border border-[#e0e0e0] p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-title font-bold text-[#202020]">
            Phân bổ ({summary.totalTasks} việc)
          </h2>
          <span className="text-xs font-ui text-[#7f7f7f]">
            Chọn nhóm để lọc danh sách bên dưới
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-3.5 w-full bg-[#f0f0f0] rounded-full overflow-hidden flex shadow-inner">
          {summary.totalTasks > 0 ? (
            <>
              {summary.completedOnTimeCount > 0 && (
                <div
                  style={{
                    width: `${(summary.completedOnTimeCount / summary.totalTasks) * 100}%`,
                  }}
                  className="bg-[#22c55e] h-full transition-all"
                  title={`Đúng hạn: ${summary.completedOnTimeCount} việc (${Math.round(
                    (summary.completedOnTimeCount / summary.totalTasks) * 100
                  )}%)`}
                />
              )}
              {summary.completedLateCount > 0 && (
                <div
                  style={{
                    width: `${(summary.completedLateCount / summary.totalTasks) * 100}%`,
                  }}
                  className="bg-[#3b82f6] h-full transition-all"
                  title={`Hoàn thành sau hạn: ${summary.completedLateCount} việc (${Math.round(
                    (summary.completedLateCount / summary.totalTasks) * 100
                  )}%)`}
                />
              )}
              {summary.currentlyOverdueCount > 0 && (
                <div
                  style={{
                    width: `${(summary.currentlyOverdueCount / summary.totalTasks) * 100}%`,
                  }}
                  className="bg-[#b91c1c] h-full transition-all"
                  title={`Đang quá hạn: ${summary.currentlyOverdueCount} việc (${Math.round(
                    (summary.currentlyOverdueCount / summary.totalTasks) * 100
                  )}%)`}
                />
              )}
              {summary.inProgressCount + summary.blockedCount > 0 && (
                <div
                  style={{
                    width: `${
                      ((summary.inProgressCount + summary.blockedCount) /
                        summary.totalTasks) *
                      100
                    }%`,
                  }}
                  className="bg-[#94a3b8] h-full transition-all"
                  title={`Đang thực hiện: ${
                    summary.inProgressCount + summary.blockedCount
                  } việc (${Math.round(
                    ((summary.inProgressCount + summary.blockedCount) / summary.totalTasks) * 100
                  )}%)`}
                />
              )}
            </>
          ) : (
            <div className="w-full bg-[#e0e0e0] h-full" />
          )}
        </div>

        {/* Legend buttons to filter drill-down */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 pt-1 text-xs font-ui">
          <button
            type="button"
            onClick={() => {
              setSelectedDisciplineFilter('on_time');
              setSubTab('task_details');
            }}
            className={`p-2.5 rounded-[8px] border text-left transition-all cursor-pointer ${
              selectedDisciplineFilter === 'on_time'
                ? 'bg-[#f0fdf4] border-[#86efac] shadow-2xs'
                : 'bg-[#fafafa] border-[#e0e0e0] hover:bg-white'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e]" />
              <span className="font-bold text-[#166534]">Đúng hạn</span>
            </div>
            <p className="text-sm font-bold text-[#202020] mt-1">
              {summary.completedOnTimeCount} việc
            </p>
            <p className="text-[10px] text-[#52796f] mt-0.5 truncate">
              {summary.totalTasks > 0 ? Math.round((summary.completedOnTimeCount / summary.totalTasks) * 100) : 0}% tổng việc
            </p>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedDisciplineFilter('late');
              setSubTab('task_details');
            }}
            className={`p-2.5 rounded-[8px] border text-left transition-all cursor-pointer ${
              selectedDisciplineFilter === 'late'
                ? 'bg-[#eff6ff] border-[#93c5fd] shadow-2xs'
                : 'bg-[#fafafa] border-[#e0e0e0] hover:bg-white'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]" />
              <span className="font-bold text-[#1d4ed8]">Hoàn thành sau hạn</span>
            </div>
            <p className="text-sm font-bold text-[#202020] mt-1">
              {summary.completedLateCount} việc
            </p>
            <p className="text-[10px] text-[#4b6b94] mt-0.5 truncate" title={`${summary.lateConfirmationCount} sau 1 ngày • ${summary.completedLateCount - summary.lateConfirmationCount} trễ ≥ 2 ngày`}>
              {summary.lateConfirmationCount} sau 1 ngày • {summary.completedLateCount - summary.lateConfirmationCount} trễ ≥ 2 ngày
            </p>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedDisciplineFilter('currently_overdue');
              setSubTab('task_details');
            }}
            className={`p-2.5 rounded-[8px] border text-left transition-all cursor-pointer ${
              selectedDisciplineFilter === 'currently_overdue'
                ? 'bg-[#fef2f2] border-[#fca5a5] shadow-2xs'
                : 'bg-[#fafafa] border-[#e0e0e0] hover:bg-white'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#b91c1c]" />
              <span className="font-bold text-[#dc2626]">Đang quá hạn</span>
            </div>
            <p className="text-sm font-bold text-[#202020] mt-1">
              {summary.currentlyOverdueCount} việc
            </p>
            <p className="text-[10px] text-[#991b1b] mt-0.5 truncate">
              Chưa xong và quá hạn
            </p>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedDisciplineFilter('in_progress');
              setSubTab('task_details');
            }}
            className={`p-2.5 rounded-[8px] border text-left transition-all cursor-pointer ${
              selectedDisciplineFilter === 'in_progress'
                ? 'bg-[#f1f5f9] border-[#94a3b8] shadow-2xs'
                : 'bg-[#fafafa] border-[#e0e0e0] hover:bg-white'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#64748b]" />
              <span className="font-bold text-[#475569]">Đang thực hiện</span>
            </div>
            <p className="text-sm font-bold text-[#202020] mt-1">
              {summary.inProgressCount + summary.blockedCount} việc
            </p>
            <p className="text-[10px] text-[#64748b] mt-0.5 truncate" title={`${summary.inProgressCount} đang làm • ${summary.blockedCount} bị nghẽn`}>
              {summary.inProgressCount} đang làm • {summary.blockedCount} nghẽn
            </p>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedDisciplineFilter('all');
              setSubTab('task_details');
            }}
            className={`p-2.5 rounded-[8px] border text-left transition-all cursor-pointer ${
              selectedDisciplineFilter === 'all'
                ? 'bg-[#f8fafc] border-[#cbd5e1] shadow-2xs'
                : 'bg-[#fafafa] border-[#e0e0e0] hover:bg-white'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1e293b]" />
              <span className="font-bold text-[#1e293b]">Tất cả việc</span>
            </div>
            <p className="text-sm font-bold text-[#202020] mt-1">
              {summary.totalTasks} việc
            </p>
            <p className="text-[10px] text-[#64748b] mt-0.5 truncate">
              Tổng 4 nhóm = {summary.completedOnTimeCount + summary.completedLateCount + summary.currentlyOverdueCount + (summary.inProgressCount + summary.blockedCount)}
            </p>
          </button>
        </div>
      </div>

      {/* 5. Sub-tabs Navigation */}
      <div className="border-b border-[#e0e0e0] flex items-center gap-2">
        <button
          onClick={() => setSubTab('calendar')}
          className={`pb-3 px-3 text-xs font-ui font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            subTab === 'calendar'
              ? 'border-[#963861] text-[#963861]'
              : 'border-transparent text-[#5f5f5f] hover:text-[#202020]'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Lịch ({calendarMonthTaskCount})</span>
        </button>

        <button
          onClick={() => setSubTab('executive_performance')}
          className={`pb-3 px-3 text-xs font-ui font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            subTab === 'executive_performance'
              ? 'border-[#963861] text-[#963861]'
              : 'border-transparent text-[#5f5f5f] hover:text-[#202020]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Nhân sự ({displayedExecutiveStats.length})</span>
        </button>

        <button
          onClick={() => setSubTab('overview')}
          className={`pb-3 px-3 text-xs font-ui font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            subTab === 'overview'
              ? 'border-[#963861] text-[#963861]'
              : 'border-transparent text-[#5f5f5f] hover:text-[#202020]'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>Dự án ({displayedProjectStats.length})</span>
        </button>

        <button
          onClick={() => setSubTab('pm_leadership')}
          className={`pb-3 px-3 text-xs font-ui font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            subTab === 'pm_leadership'
              ? 'border-[#963861] text-[#963861]'
              : 'border-transparent text-[#5f5f5f] hover:text-[#202020]'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Quản lý ({displayedPmStats.length})</span>
        </button>

        <button
          onClick={() => setSubTab('task_details')}
          className={`pb-3 px-3 text-xs font-ui font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            subTab === 'task_details'
              ? 'border-[#963861] text-[#963861]'
              : 'border-transparent text-[#5f5f5f] hover:text-[#202020]'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Công việc ({filteredDrilldownTasks.length})</span>
        </button>
      </div>

      {/* 6. Sub-tab Content Panels */}

      {/* PANEL 1: SỨC KHỎE DỰ ÁN */}
      {subTab === 'overview' && (
        <div className="bg-white rounded-[12px] border border-[#e0e0e0] overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-[#f0f0f0] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-title font-bold text-[#202020]">
                Dự án
              </h3>
              <p className="text-xs font-body text-[#7f7f7f]">
                Tỷ lệ đúng hạn và điểm nghẽn theo từng dự án.
              </p>
            </div>
            <span className="text-xs font-ui text-[#5f5f5f]">
              {displayedProjectStats.length} dự án
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-body divide-y divide-[#f0f0f0]">
              <thead className="bg-[#fafafa] text-[#7f7f7f] font-ui text-[11px] font-extrabold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Dự án</th>
                  <th className="py-3 px-3">PM phụ trách</th>
                  <th className="py-3 px-3 text-center">Tổng việc</th>
                  <th className="py-3 px-3 text-center">Đúng hạn</th>
                  <th className="py-3 px-3 text-center">Sau hạn</th>
                  <th className="py-3 px-3 text-center">Quá hạn</th>
                  <th className="py-3 px-3 text-center">Nghẽn</th>
                  <th className="py-3 px-3 text-center">Tỷ lệ đúng hạn</th>
                  <th className="py-3 px-4 text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f0f0] text-[#202020]">
                {displayedProjectStats.map((p) => (
                  <tr key={p.project.id} className="hover:bg-[#fcfcfc] transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (onSelectProject) onSelectProject(p.project.id);
                          }}
                          className="font-ui font-bold text-[#202020] hover:text-[#963861] text-left cursor-pointer"
                        >
                          {p.project.name.replace(/^Dự án\s+/i, '')}
                        </button>
                        {p.project.isStrategic && (
                          <span className="text-[10px] bg-[#fef3c7] text-[#92400e] px-1.5 py-0.2 rounded font-ui font-bold">
                            Chiến lược
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-num text-[#9f9f9f] block">
                        {p.project.code}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-ui text-xs text-[#5f5f5f]">
                      {p.leadPmNames}
                    </td>
                    <td className="py-3 px-3 text-center font-bold">
                      {p.totalTasks}
                    </td>
                    <td className="py-3 px-3 text-center text-[#166534] font-bold">
                      {p.onTimeTasks}
                    </td>
                    <td className="py-3 px-3 text-center text-[#1d4ed8]">
                      {p.lateTasks}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {p.overdueTasks > 0 ? (
                        <span className="text-[#dc2626] font-bold bg-[#fef2f2] px-2 py-0.5 rounded-full">
                          {p.overdueTasks}
                        </span>
                      ) : (
                        <span className="text-[#9f9f9f]">0</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {p.blockedTasks > 0 ? (
                        <span className="text-[#ea580c] font-bold bg-[#fff7ed] px-2 py-0.5 rounded-full">
                          {p.blockedTasks}
                        </span>
                      ) : (
                        <span className="text-[#9f9f9f]">0</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="inline-flex items-center gap-1.5 font-bold">
                        <span
                          className={
                            p.onTimeRate >= 80
                              ? 'text-[#166534]'
                              : p.onTimeRate >= 60
                              ? 'text-[#ea580c]'
                              : 'text-[#dc2626]'
                          }
                        >
                          {p.onTimeRate}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-[6px] text-xs font-ui font-bold border ${
                          p.health === 'Tốt'
                            ? 'bg-[#f0fdf4] text-[#166534] border-[#bbf7d0]'
                            : p.health === 'Cảnh báo'
                            ? 'bg-[#fff7ed] text-[#c2410c] border-[#fed7aa]'
                            : 'bg-[#fef2f2] text-[#dc2626] border-[#fecaca]'
                        }`}
                      >
                        {p.health}
                      </span>
                    </td>
                  </tr>
                ))}
                {displayedProjectStats.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-xs font-ui text-[#9f9f9f]">
                      {isAssigneeFiltered
                        ? `${selectedAssignee} không có công việc thuộc dự án nào trong kỳ này.`
                        : 'Không có dự án nào trong kỳ này.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PANEL 2: ĐÁNH GIÁ QUẢN LÝ SẢN PHẨM (PM) */}
      {subTab === 'pm_leadership' && (
        <div className="bg-white rounded-[12px] border border-[#e0e0e0] overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-[#f0f0f0] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-title font-bold text-[#202020]">
                Quản lý
              </h3>
              <p className="text-xs font-body text-[#7f7f7f]">
                Năng lực kiểm soát tiến độ và tháo gỡ điểm nghẽn dự án.
              </p>
            </div>
            <span className="text-xs font-ui text-[#5f5f5f]">
              {displayedPmStats.length} PM
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-body divide-y divide-[#f0f0f0]">
              <thead className="bg-[#fafafa] text-[#7f7f7f] font-ui text-[11px] font-extrabold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Product Manager</th>
                  <th className="py-3 px-3">Dự án phụ trách</th>
                  <th className="py-3 px-3 text-center">Việc Team</th>
                  <th className="py-3 px-3 text-center">Team đúng hạn</th>
                  <th className="py-3 px-3 text-center">Nghẽn</th>
                  <th className="py-3 px-3 text-center">Phase chậm</th>
                  <th className="py-3 px-4 text-center">Đánh giá</th>
                  <th className="py-3 px-4">Ghi chú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f0f0] text-[#202020]">
                {displayedPmStats.map((pmStat) => (
                  <tr key={pmStat.pm.id} className="hover:bg-[#fcfcfc] transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-ui font-bold text-[#202020]">
                        {pmStat.pm.name}
                      </div>
                      <span className="text-[11px] text-[#7f7f7f] block">
                        {pmStat.pm.title}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {pmStat.projectNames.length > 0 ? (
                          pmStat.projectNames.map((pName) => (
                            <span
                              key={pName}
                              className="text-[11px] bg-[#f0f0f0] text-[#333] px-2 py-0.5 rounded-[4px] font-ui"
                            >
                              {pName.replace(/^Dự án\s+/i, '')}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-[#9f9f9f] italic">
                            Chưa gán dự án
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center font-bold">
                      {pmStat.totalTeamTasks}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`font-bold ${
                          pmStat.teamOnTimeRate >= 85
                            ? 'text-[#166534]'
                            : pmStat.teamOnTimeRate >= 70
                            ? 'text-[#ea580c]'
                            : 'text-[#dc2626]'
                        }`}
                      >
                        {pmStat.teamOnTimeRate}%
                      </span>
                      <span className="text-[10px] text-[#7f7f7f] block font-num">
                        ({pmStat.teamOnTimeTasks}/{pmStat.completedTeamTasks})
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      {pmStat.teamBlockedTasks > 0 ? (
                        <span className="text-[#ea580c] font-bold bg-[#fff7ed] px-2 py-0.5 rounded-full">
                          {pmStat.teamBlockedTasks}
                        </span>
                      ) : (
                        <span className="text-[#166534]">0</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {pmStat.delayedPhasesCount > 0 ? (
                        <span className="text-[#dc2626] font-bold bg-[#fef2f2] px-2 py-0.5 rounded-full">
                          {pmStat.delayedPhasesCount}
                        </span>
                      ) : (
                        <span className="text-[#7f7f7f]">0</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-[6px] text-xs font-ui font-bold border ${
                          pmStat.leadershipRating === 'Xuất sắc'
                            ? 'bg-[#f0fdf4] text-[#166534] border-[#bbf7d0]'
                            : pmStat.leadershipRating === 'Ổn định'
                            ? 'bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe]'
                            : 'bg-[#fff1f2] text-[#be123c] border-[#fecdd3]'
                        }`}
                      >
                        {pmStat.leadershipRating}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs font-body text-[#5f5f5f]">
                      {pmStat.ratingReason}
                    </td>
                  </tr>
                ))}
                {displayedPmStats.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-xs font-ui text-[#9f9f9f]">
                      {isAssigneeFiltered
                        ? `${selectedAssignee} không phải Product Manager phụ trách dự án nào.`
                        : 'Chưa có PM nào trong kỳ này.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PANEL 3: ĐÁNH GIÁ CHUYÊN VIÊN */}
      {subTab === 'executive_performance' && (
        <div className="bg-white rounded-[12px] border border-[#e0e0e0] overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-[#f0f0f0] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-title font-bold text-[#202020]">
                Nhân sự
              </h3>
              <p className="text-xs font-body text-[#7f7f7f]">
                Tiến độ hoàn thành, nợ quá hạn và link kết quả nghiệm thu.
              </p>
            </div>
            <span className="text-xs font-ui text-[#5f5f5f]">
              {displayedExecutiveStats.length} nhân sự
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-body divide-y divide-[#f0f0f0]">
              <thead className="bg-[#fafafa] text-[#7f7f7f] font-ui text-[11px] font-extrabold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Nhân sự</th>
                  <th className="py-3 px-3">Nhóm</th>
                  <th className="py-3 px-3 text-center">Tổng việc</th>
                  <th className="py-3 px-3 text-center">Đúng hạn</th>
                  <th className="py-3 px-3 text-center">Sau hạn</th>
                  <th className="py-3 px-3 text-center">Quá hạn</th>
                  <th className="py-3 px-3 text-center">Link KQ</th>
                  <th className="py-3 px-3 text-center">Tỷ lệ đúng hạn</th>
                  <th className="py-3 px-4 text-center">Xếp loại</th>
                  <th className="py-3 px-4">Ghi chú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f0f0] text-[#202020]">
                {displayedExecutiveStats.map((ex) => (
                  <tr key={ex.member.id} className="hover:bg-[#fcfcfc] transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-ui font-bold text-[#202020]">
                        {ex.member.name}
                      </div>
                      <span className="text-[11px] text-[#7f7f7f] block">
                        {ex.member.title}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-[11px] bg-[#f0f0f0] text-[#555] px-2 py-0.5 rounded font-ui font-medium">
                        {ex.member.team}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-bold">
                      {ex.totalTasks}
                    </td>
                    <td className="py-3 px-3 text-center text-[#166534] font-bold">
                      {ex.completedOnTime}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {ex.completedLate > 0 ? (
                        <span className="text-[#1d4ed8] font-bold bg-[#eff6ff] px-2 py-0.5 rounded-full">
                          {ex.completedLate}
                        </span>
                      ) : (
                        <span className="text-[#9f9f9f]">0</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {ex.currentlyOverdueCount > 0 ? (
                        <span className="text-[#dc2626] font-bold bg-[#fef2f2] px-2 py-0.5 rounded-full">
                          {ex.currentlyOverdueCount}
                        </span>
                      ) : (
                        <span className="text-[#166534]">0</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="font-num font-bold text-[#202020]">
                        {ex.completedTasks > 0
                          ? `${Math.round((ex.hasResultLinkCount / ex.completedTasks) * 100)}%`
                          : '—'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`font-bold ${
                          ex.onTimeRate >= 85
                            ? 'text-[#166534]'
                            : ex.onTimeRate >= 70
                            ? 'text-[#ea580c]'
                            : 'text-[#dc2626]'
                        }`}
                      >
                        {ex.onTimeRate}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-[6px] text-xs font-ui font-bold border ${
                          ex.efficiencyRating === 'Xuất sắc'
                            ? 'bg-[#f0fdf4] text-[#166534] border-[#bbf7d0]'
                            : ex.efficiencyRating === 'Tốt'
                            ? 'bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe]'
                            : 'bg-[#fff1f2] text-[#be123c] border-[#fecdd3]'
                        }`}
                      >
                        {ex.efficiencyRating}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs font-body text-[#5f5f5f]">
                      {ex.ratingReason}
                    </td>
                  </tr>
                ))}
                {displayedExecutiveStats.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-xs font-ui text-[#9f9f9f]">
                      Không tìm thấy nhân sự phù hợp.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PANEL 4: CHI TIẾT CÔNG VIỆC (DRILL-DOWN) */}
      {subTab === 'task_details' && (
        <div className="bg-white rounded-[12px] border border-[#e0e0e0] overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-[#f0f0f0] flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-title font-bold text-[#202020]">
                Công việc ({filteredDrilldownTasks.length})
              </h3>
              <p className="text-xs font-body text-[#7f7f7f]">
                Đối soát giữa ngày hạn đăng ký và ngày hoàn thành thực tế.
              </p>
            </div>

            {/* Quick Filter discipline badge inside drill-down */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-ui text-[#7f7f7f]">Lọc:</span>
              <button
                type="button"
                onClick={() => setSelectedDisciplineFilter('all')}
                className={`px-2 py-0.5 rounded text-[11px] font-ui cursor-pointer ${
                  selectedDisciplineFilter === 'all'
                    ? 'bg-[#202020] text-white font-bold'
                    : 'bg-[#f0f0f0] text-[#555]'
                }`}
              >
                Tất cả ({summary.totalTasks})
              </button>
              <button
                type="button"
                onClick={() => setSelectedDisciplineFilter('on_time')}
                className={`px-2 py-0.5 rounded text-[11px] font-ui cursor-pointer ${
                  selectedDisciplineFilter === 'on_time'
                    ? 'bg-[#166534] text-white font-bold'
                    : 'bg-[#f0fdf4] text-[#166534]'
                }`}
              >
                Đúng hạn ({summary.completedOnTimeCount})
              </button>
              <button
                type="button"
                onClick={() => setSelectedDisciplineFilter('late')}
                className={`px-2 py-0.5 rounded text-[11px] font-ui cursor-pointer ${
                  selectedDisciplineFilter === 'late'
                    ? 'bg-[#1d4ed8] text-white font-bold'
                    : 'bg-[#eff6ff] text-[#1d4ed8]'
                }`}
              >
                Hoàn thành sau hạn ({summary.completedLateCount})
              </button>
              <button
                type="button"
                onClick={() => setSelectedDisciplineFilter('currently_overdue')}
                className={`px-2 py-0.5 rounded text-[11px] font-ui cursor-pointer ${
                  selectedDisciplineFilter === 'currently_overdue'
                    ? 'bg-[#dc2626] text-white font-bold'
                    : 'bg-[#fef2f2] text-[#dc2626]'
                }`}
              >
                Quá hạn ({summary.currentlyOverdueCount})
              </button>
              <button
                type="button"
                onClick={() => setSelectedDisciplineFilter('in_progress')}
                className={`px-2 py-0.5 rounded text-[11px] font-ui cursor-pointer ${
                  selectedDisciplineFilter === 'in_progress'
                    ? 'bg-[#475569] text-white font-bold'
                    : 'bg-[#f1f5f9] text-[#475569]'
                }`}
              >
                Đang thực hiện ({summary.inProgressCount + summary.blockedCount})
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-body divide-y divide-[#f0f0f0]">
              <thead className="bg-[#fafafa] text-[#7f7f7f] font-ui text-[11px] font-extrabold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Công việc</th>
                  <th className="py-3 px-3">Dự án</th>
                  <th className="py-3 px-3">Phụ trách</th>
                  <th className="py-3 px-3">Hạn</th>
                  <th className="py-3 px-3">Ngày xong</th>
                  <th className="py-3 px-4">Tình trạng</th>
                  <th className="py-3 px-3">Link KQ</th>
                  <th className="py-3 px-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f0f0] text-[#202020]">
                {filteredDrilldownTasks.length > 0 ? (
                  filteredDrilldownTasks.map((res) => (
                    <tr key={res.task.id} className="hover:bg-[#fcfcfc] transition-colors">
                      <td className="py-3 px-4">
                        <div
                          onClick={() => {
                            if (onOpenTaskDetail) onOpenTaskDetail(res.task);
                          }}
                          className="font-title font-bold text-[#202020] hover:text-[#963861] cursor-pointer line-clamp-2"
                        >
                          {res.task.title}
                        </div>
                        {res.task.phaseName && (
                          <span className="text-[11px] text-[#7f7f7f] block">
                            {res.task.phaseName}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-ui text-xs text-[#5f5f5f]">
                        {res.task.projectName.replace(/^Dự án\s+/i, '')}
                      </td>
                      <td className="py-3 px-3 font-ui text-xs font-bold text-[#202020]">
                        {res.task.assignee}
                      </td>
                      <td className="py-3 px-3 font-ui text-xs">
                        {formatDateWithEnDay(res.task.dueDate)}
                      </td>
                      <td className="py-3 px-3 font-ui text-xs">
                        {res.completionDate ? (
                          formatDateWithEnDay(res.completionDate)
                        ) : (
                          <span className="text-[#9f9f9f] italic">Chưa hoàn thành</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-[6px] text-xs font-ui font-bold border ${res.badgeClass}`}
                        >
                          {res.disciplineLabel}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {res.task.resultLink ? (
                          <a
                            href={res.task.resultLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[#166534] font-ui text-xs font-bold hover:underline"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Link KQ</span>
                          </a>
                        ) : res.task.workLink ? (
                          <a
                            href={res.task.workLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[#1d4ed8] font-ui text-xs font-bold hover:underline"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Link việc</span>
                          </a>
                        ) : (
                          <span className="text-[#9f9f9f] text-[11px]">Chưa có</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => {
                            if (onOpenTaskDetail) onOpenTaskDetail(res.task);
                          }}
                          className="px-2 py-1 rounded hover:bg-[#f0f0f0] text-[#7f7f7f] hover:text-[#202020] text-xs font-ui cursor-pointer"
                        >
                          Mở xem
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-xs font-ui text-[#9f9f9f]">
                      Không có công việc nào thỏa mãn điều kiện lọc.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PANEL 5: LỊCH THEO THÁNG */}
      {subTab === 'calendar' && (
        <div className="bg-white rounded-[12px] border border-[#e0e0e0] overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-[#f0f0f0] flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-title font-bold text-[#202020]">
                Lịch{isAssigneeFiltered ? ` — ${selectedAssignee}` : ''}
              </h3>
              <p className="text-xs font-body text-[#7f7f7f]">
                Hạn công việc theo từng ngày trong tháng. Bấm vào ngày để mở trang Công việc lọc theo ngày đó.
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={goPrevMonth}
                className="p-1.5 rounded-[6px] border border-[#e0e0e0] text-[#5f5f5f] hover:bg-[#f5f5f5] hover:text-[#202020] cursor-pointer transition-colors"
                title="Tháng trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-ui font-bold text-[#202020] w-28 text-center">
                Tháng {calendarMonth.getMonth() + 1}/{calendarMonth.getFullYear()}
              </span>
              <button
                onClick={goNextMonth}
                className="p-1.5 rounded-[6px] border border-[#e0e0e0] text-[#5f5f5f] hover:bg-[#f5f5f5] hover:text-[#202020] cursor-pointer transition-colors"
                title="Tháng sau"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={goCurrentMonth}
                className="ml-1 px-2.5 py-1.5 rounded-[6px] text-xs font-ui font-bold bg-[#fdf2f7] text-[#963861] border border-[#f4c2d7] hover:bg-[#fae6ee] cursor-pointer transition-colors"
              >
                Hôm nay
              </button>
            </div>
          </div>

          {/* Weekday header */}
          <div className="grid grid-cols-7 border-b border-[#f0f0f0] bg-[#fafafa]">
            {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((wd) => (
              <div
                key={wd}
                className="py-2 text-center text-[11px] font-ui font-extrabold uppercase tracking-wider text-[#7f7f7f]"
              >
                {wd}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7">
            {calendarCells.map((cell) => {
              const counts = calendarDayCounts.get(cell.dateStr);
              const isToday = cell.dateStr === todayStr;

              return (
                <button
                  key={cell.dateStr}
                  onClick={() => handleSelectCalendarDay(cell.dateStr)}
                  title="Bấm để mở trang Công việc lọc theo ngày này"
                  className={`min-h-[92px] p-1.5 border-b border-r border-[#f0f0f0] text-left flex flex-col gap-1 transition-colors cursor-pointer ${
                    cell.inMonth ? 'bg-white hover:bg-[#fafafa]' : 'bg-[#fafafa] hover:bg-[#f5f5f5]'
                  }`}
                >
                  <span
                    className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-ui font-bold shrink-0 ${
                      isToday
                        ? 'bg-[#963861] text-white'
                        : cell.inMonth
                        ? 'text-[#202020]'
                        : 'text-[#c0c0c0]'
                    }`}
                  >
                    {cell.dayNum}
                  </span>

                  {counts && counts.total > 0 && (
                    <div className="flex items-center gap-0.5 flex-wrap">
                      {counts.overdue > 0 && (
                        <span className="text-[9px] font-ui font-bold text-white bg-[#dc2626] rounded px-1 leading-4">
                          {counts.overdue} quá hạn
                        </span>
                      )}
                      {counts.late > 0 && (
                        <span className="text-[9px] font-ui font-bold text-white bg-[#1d4ed8] rounded px-1 leading-4">
                          {counts.late} sau hạn
                        </span>
                      )}
                      {counts.blocked > 0 && (
                        <span className="text-[9px] font-ui font-bold text-white bg-[#ea580c] rounded px-1 leading-4">
                          {counts.blocked} nghẽn
                        </span>
                      )}
                      {counts.inProgress > 0 && (
                        <span className="text-[9px] font-ui font-bold text-[#475569] bg-[#f1f5f9] rounded px-1 leading-4">
                          {counts.inProgress} đang làm
                        </span>
                      )}
                      {counts.onTime > 0 && (
                        <span className="text-[9px] font-ui font-bold text-[#166534] bg-[#f0fdf4] rounded px-1 leading-4">
                          {counts.onTime} đúng hạn
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 flex-wrap px-4 py-2.5 border-t border-[#f0f0f0] bg-[#fafafa] text-[10px] font-ui text-[#5f5f5f]">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#166534]" /> Đúng hạn
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#1d4ed8]" /> Hoàn thành sau hạn
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#dc2626]" /> Đang quá hạn
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#ea580c]" /> Đang nghẽn
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#475569]" /> Đang làm / chưa làm
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
