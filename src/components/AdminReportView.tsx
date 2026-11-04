/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { TaskItem, ProjectItem, MemberItem, TeamType } from '../types';
import {
  TimePeriod,
  generateDepartmentReport,
  TaskDisciplineResult,
  analyzeTaskDiscipline,
  MemberProjectFocusItem,
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
} from './vds/icons';

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

  // 3. Drill-down discipline filter & project focus filter
  const [selectedDisciplineFilter, setSelectedDisciplineFilter] = useState<string>('all');
  const [drilldownProjectFilter, setDrilldownProjectFilter] = useState<string>('all');

  // Bộ chọn nhân sự cho lớp "Trọng tâm dự án" (đồng bộ mặc định với nhân sự đang chọn trên Topbar)
  const [focusMemberName, setFocusMemberName] = useState<string>(selectedAssignee);
  useEffect(() => {
    setFocusMemberName(selectedAssignee);
    setDrilldownProjectFilter('all');
  }, [selectedAssignee]);

  // Danh sách nhân sự Product phục vụ chọn nhanh
  const productMembersList = useMemo(
    () =>
      members.filter(
        (m) => m.team && ['Product Manager', 'UX/UI Designer', 'SEO', 'Data'].includes(m.team)
      ),
    [members]
  );

  // Báo cáo tổng hợp cấp Ban (không khóa cứng assignee) để lớp Trọng tâm dự án có thể tra cứu bất kỳ Nhân sự A nào trong kỳ
  const departmentWideSummary = useMemo(() => {
    return generateDepartmentReport(tasks, projects, members, period, {
      projectId: selectedProjectId,
      team: selectedTeam,
      assignee: 'Tất cả',
      customStart: period === 'custom' ? customStart : undefined,
      customEnd: period === 'custom' ? customEnd : undefined,
    });
  }, [tasks, projects, members, period, selectedProjectId, selectedTeam, customStart, customEnd]);

  const focusedMemberStats = useMemo(() => {
    if (!focusMemberName || focusMemberName === 'Tất cả') return null;
    return (
      departmentWideSummary.executiveStats.find((ex) =>
        isSamePersonName(ex.member.name, focusMemberName)
      ) || null
    );
  }, [departmentWideSummary.executiveStats, focusMemberName]);

  // Bảng màu phân loại lấy từ token màu chuyên mục VDS (tự đổi theo light/dark)
  const PROJECT_FOCUS_COLORS = [
    'var(--vds-component-news-general-fill)',
    'var(--vds-component-news-business-fill)',
    'var(--vds-component-news-health-fill)',
    'var(--vds-component-news-education-fill)',
    'var(--vds-text-extreme-regular)',
    'var(--vds-component-news-sports-fill)',
    'var(--vds-component-news-travel-fill)',
    'var(--vds-component-news-vehicles-fill)',
  ];

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
    let baseList = summary.tasksAnalyzed;
    if (
      focusMemberName !== 'Tất cả' &&
      !isSamePersonName(focusMemberName, selectedAssignee)
    ) {
      baseList = departmentWideSummary.tasksAnalyzed.filter((r) =>
        isSamePersonName(r.task.assignee, focusMemberName)
      );
    }

    if (drilldownProjectFilter !== 'all') {
      baseList = baseList.filter(
        (r) =>
          r.task.projectId === drilldownProjectFilter ||
          r.task.projectName === drilldownProjectFilter
      );
    }

    if (selectedDisciplineFilter === 'all') {
      return baseList;
    }
    if (selectedDisciplineFilter === 'on_time') {
      return baseList.filter((r) => r.isCompleted && r.isOnTime);
    }
    if (selectedDisciplineFilter === 'late') {
      return baseList.filter((r) => r.isCompleted && !r.isOnTime);
    }
    if (selectedDisciplineFilter === 'currently_overdue') {
      return baseList.filter(
        (r) => !r.isCompleted && r.discipline === 'currently_overdue'
      );
    }
    if (selectedDisciplineFilter === 'in_progress') {
      return baseList.filter(
        (r) => !r.isCompleted && r.discipline !== 'currently_overdue'
      );
    }
    return baseList.filter(
      (r) => r.discipline === selectedDisciplineFilter
    );
  }, [
    summary.tasksAnalyzed,
    departmentWideSummary.tasksAnalyzed,
    selectedDisciplineFilter,
    drilldownProjectFilter,
    focusMemberName,
    selectedAssignee,
  ]);

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
    <div className="flex-1 space-y-4 sm:space-y-6">
      {/* 1. Kỳ báo cáo & bộ lọc (tiêu đề trang đã có ở Header) */}
      <div className="bg-surface rounded-vds-lg border border-line p-4 sm:p-5 ">
        <p className="text-[12px] font-ui text-subdued">{summary.periodLabel}</p>

        {/* 2. Control Bar (Time Presets & Cross Filters) */}
        <div className="mt-3 flex flex-col gap-3">
          {/* Time Presets: cuộn ngang trên mobile */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
            <span className="shrink-0 text-xs font-ui font-bold text-subdued-lighter mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-subdued" />
              Thời gian:
            </span>
            {timePresets.map((tp) => {
              const isSelected = period === tp.id;
              return (
                <button
                  key={tp.id}
                  onClick={() => setPeriod(tp.id)}
                  className={`shrink-0 h-8 sm:h-auto px-2.5 py-1 rounded-vds-lg text-xs font-ui transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-surface-selected text-accent font-bold ring-1 ring-inset ring-line-accent-soft'
                      : 'bg-surface-200 text-ink-lighter hover:bg-surface-300 hover:text-ink'
                  }`}
                >
                  {tp.label}
                </button>
              );
            })}
          </div>

          {/* Custom Date Inputs if selected */}
          {period === 'custom' && (
            <div className="flex items-center gap-2 bg-surface-accent-faint p-2.5 rounded-vds-lg border border-line text-xs font-ui">
              <span className="font-bold text-accent">Từ ngày:</span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="bg-surface border border-line rounded px-2 py-1 text-xs"
              />
              <span className="font-bold text-accent">Đến ngày:</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="bg-surface border border-line rounded px-2 py-1 text-xs"
              />
            </div>
          )}

          {/* Dự án / Nhóm / Nhân sự dùng chung với bộ lọc Sidebar & bộ chọn nhân sự trên topbar
              (cạnh chuông thông báo) — chỉ hiển thị tóm tắt, chỉnh sửa ở nơi gốc để tránh trùng UI */}
          {(selectedProjectId !== 'all' || selectedTeam !== 'Tất cả' || selectedAssignee !== 'Tất cả') && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-xs font-ui text-subdued-lighter shrink-0">Đang áp dụng:</span>
              {selectedProjectId !== 'all' && (
                <span className="inline-flex items-center gap-1 text-xs font-ui font-bold bg-surface-info text-support px-2 py-0.5 rounded-full border border-line">
                  <Briefcase className="w-3 h-3" />
                  {projects.find((p) => p.id === selectedProjectId)?.name.replace(/^Dự án\s+/i, '') || 'Dự án'}
                </span>
              )}
              {selectedTeam !== 'Tất cả' && (
                <span className="inline-flex items-center gap-1 text-xs font-ui font-bold bg-surface-200 text-ink-lighter px-2 py-0.5 rounded-full border border-line">
                  <Layers className="w-3 h-3" />
                  {selectedTeam}
                </span>
              )}
              {selectedAssignee !== 'Tất cả' && (
                <span className="inline-flex items-center gap-1 text-xs font-ui font-bold bg-surface-accent-faint text-accent px-2 py-0.5 rounded-full border border-line">
                  <Users className="w-3 h-3" />
                  {selectedAssignee}
                </span>
              )}
              <span className="text-[10px] font-ui text-subdued-lighter">
                (chỉnh Dự án/Nhóm tại Sidebar, Nhân sự tại bộ chọn cạnh chuông thông báo)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 3. Executive Summary KPI Cards (5 Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* KPI 1: Tổng công việc */}
        <div className="bg-surface rounded-vds-lg border border-line p-4 ">
          <p className="text-xs font-ui font-bold text-subdued">
            Tổng công việc
          </p>
          <div className="flex items-baseline gap-2 mt-1.5">
            <span className="text-2xl font-title font-bold text-ink">
              {summary.totalTasks}
            </span>
            <span className="text-xs font-ui text-ink-lighter">việc</span>
          </div>
          <div className="mt-2 text-xs font-ui text-subdued flex items-center justify-between border-t border-divider pt-1.5">
            <span>Xong: <strong className="text-positive">{summary.completedCount}</strong></span>
            <span>Đang làm: <strong>{summary.inProgressCount}</strong></span>
            <span>Nghẽn: <strong className="text-warning">{summary.blockedCount}</strong></span>
          </div>
        </div>

        {/* KPI 2: Hoàn thành = (Đúng hạn + Hoàn thành sau hạn) / Tổng công việc */}
        <div className="bg-surface rounded-vds-lg border border-line p-4 ">
          <p className="text-xs font-ui font-bold text-subdued">
            Hoàn thành
          </p>
          <div className="flex items-baseline gap-2 mt-1.5">
            <span
              className={`text-2xl font-title font-bold ${
                (summary.totalTasks > 0 ? (summary.completedCount / summary.totalTasks) * 100 : 0) >= 85
                  ? 'text-positive'
                  : (summary.totalTasks > 0 ? (summary.completedCount / summary.totalTasks) * 100 : 0) >= 70
                  ? 'text-warning'
                  : 'text-negative'
              }`}
            >
              {summary.totalTasks > 0
                ? Math.round((summary.completedCount / summary.totalTasks) * 100)
                : 0}%
            </span>
            <span className="text-xs font-ui font-bold text-ink-lighter">
              ({summary.completedCount})
            </span>
          </div>
          <div className="mt-2 w-full bg-surface-200 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full ${
                (summary.totalTasks > 0 ? (summary.completedCount / summary.totalTasks) * 100 : 0) >= 85
                  ? 'bg-positive-solid'
                  : (summary.totalTasks > 0 ? (summary.completedCount / summary.totalTasks) * 100 : 0) >= 70
                  ? 'bg-warning-solid'
                  : 'bg-negative-solid'
              }`}
              style={{
                width: `${
                  summary.totalTasks > 0
                    ? Math.min(100, Math.round((summary.completedCount / summary.totalTasks) * 100))
                    : 0
                }%`,
              }}
            />
          </div>
        </div>

        {/* KPI 3: Đúng hạn = Đúng hạn / Tổng công việc */}
        <div className="bg-surface rounded-vds-lg border border-line p-4 ">
          <p className="text-xs font-ui font-bold text-subdued">
            Đúng hạn
          </p>
          <div className="flex items-baseline gap-2 mt-1.5">
            <span
              className={`text-2xl font-title font-bold ${
                (summary.totalTasks > 0 ? (summary.completedOnTimeCount / summary.totalTasks) * 100 : 0) >= 85
                  ? 'text-positive'
                  : (summary.totalTasks > 0 ? (summary.completedOnTimeCount / summary.totalTasks) * 100 : 0) >= 70
                  ? 'text-warning'
                  : 'text-negative'
              }`}
            >
              {summary.totalTasks > 0
                ? Math.round((summary.completedOnTimeCount / summary.totalTasks) * 100)
                : 0}%
            </span>
            <span className="text-xs font-ui font-bold text-ink-lighter">
              ({summary.completedOnTimeCount})
            </span>
          </div>
          <div className="mt-2 w-full bg-surface-200 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full ${
                (summary.totalTasks > 0 ? (summary.completedOnTimeCount / summary.totalTasks) * 100 : 0) >= 85
                  ? 'bg-positive-solid'
                  : (summary.totalTasks > 0 ? (summary.completedOnTimeCount / summary.totalTasks) * 100 : 0) >= 70
                  ? 'bg-warning-solid'
                  : 'bg-negative-solid'
              }`}
              style={{
                width: `${
                  summary.totalTasks > 0
                    ? Math.min(100, Math.round((summary.completedOnTimeCount / summary.totalTasks) * 100))
                    : 0
                }%`,
              }}
            />
          </div>
        </div>

        {/* KPI 4: Hoàn thành sau hạn = Hoàn thành sau hạn / Tổng công việc */}
        <div className="bg-surface rounded-vds-lg border border-line p-4 ">
          <p className="text-xs font-ui font-bold text-subdued">
            Hoàn thành sau hạn
          </p>
          <div className="flex items-baseline gap-2 mt-1.5">
            <span className="text-2xl font-title font-bold text-info">
              {summary.totalTasks > 0
                ? Math.round((summary.completedLateCount / summary.totalTasks) * 100)
                : 0}%
            </span>
            <span className="text-xs font-ui font-bold text-info">
              ({summary.completedLateCount})
            </span>
          </div>
          <p className="mt-2 text-xs font-ui text-subdued border-t border-divider pt-1.5 truncate" title={`${summary.lateConfirmationCount} sau 1 ngày • ${summary.completedLateCount - summary.lateConfirmationCount} trễ ≥ 2 ngày`}>
            {summary.lateConfirmationCount} sau 1 ngày • {summary.completedLateCount - summary.lateConfirmationCount} trễ ≥ 2 ngày
          </p>
        </div>

        {/* KPI 5: Đang quá hạn (Giữ nguyên) */}
        <div className="bg-surface rounded-vds-lg border border-line p-4 ">
          <p className="text-xs font-ui font-bold text-subdued flex items-center justify-between">
            <span>Đang quá hạn</span>
            {summary.currentlyOverdueCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-negative-solid animate-pulse" />
            )}
          </p>
          <div className="flex items-baseline gap-2 mt-1.5">
            <span
              className={`text-2xl font-title font-bold ${
                summary.currentlyOverdueCount > 0 ? 'text-negative' : 'text-positive'
              }`}
            >
              {summary.currentlyOverdueCount}
            </span>
            <span className="text-xs font-ui text-ink-lighter">việc</span>
          </div>
          <p className="mt-2 text-xs font-ui text-subdued border-t border-divider pt-1.5 truncate">
            {summary.currentlyOverdueCount > 0 ? 'Chưa hoàn thành' : '0 việc quá hạn'}
          </p>
        </div>
      </div>

      {/* 4. Discipline Breakdown Visual Bar */}
      <div className="bg-surface rounded-vds-lg border border-line p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-title font-bold text-ink">
            Phân bổ ({summary.totalTasks} việc)
          </h2>
          <span className="text-xs font-ui text-subdued">
            Chọn nhóm để lọc danh sách bên dưới
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-3.5 w-full bg-surface-200 rounded-full overflow-hidden flex shadow-inner">
          {summary.totalTasks > 0 ? (
            <>
              {summary.completedOnTimeCount > 0 && (
                <div
                  style={{
                    width: `${(summary.completedOnTimeCount / summary.totalTasks) * 100}%`,
                  }}
                  className="bg-positive-solid h-full transition"
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
                  className="bg-support-solid h-full transition"
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
                  className="bg-negative-solid h-full transition"
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
                  className="bg-icon-subdued h-full transition"
                  title={`Đang thực hiện: ${
                    summary.inProgressCount + summary.blockedCount
                  } việc (${Math.round(
                    ((summary.inProgressCount + summary.blockedCount) / summary.totalTasks) * 100
                  )}%)`}
                />
              )}
            </>
          ) : (
            <div className="w-full bg-surface-300 h-full" />
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
            className={`p-2.5 rounded-vds-lg border text-left transition cursor-pointer ${
              selectedDisciplineFilter === 'on_time'
                ? 'bg-surface-positive border-line-positive '
                : 'bg-surface-100 border-line hover:bg-surface'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-positive-solid" />
              <span className="font-bold text-positive">Đúng hạn</span>
            </div>
            <p className="text-sm font-bold text-ink mt-1">
              {summary.completedOnTimeCount} việc
            </p>
            <p className="text-[10px] text-positive mt-0.5 truncate">
              {summary.totalTasks > 0 ? Math.round((summary.completedOnTimeCount / summary.totalTasks) * 100) : 0}% tổng việc
            </p>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedDisciplineFilter('late');
              setSubTab('task_details');
            }}
            className={`p-2.5 rounded-vds-lg border text-left transition cursor-pointer ${
              selectedDisciplineFilter === 'late'
                ? 'bg-surface-info border-line '
                : 'bg-surface-100 border-line hover:bg-surface'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-support-solid" />
              <span className="font-bold text-info">Hoàn thành sau hạn</span>
            </div>
            <p className="text-sm font-bold text-ink mt-1">
              {summary.completedLateCount} việc
            </p>
            <p className="text-[10px] text-support mt-0.5 truncate" title={`${summary.lateConfirmationCount} sau 1 ngày • ${summary.completedLateCount - summary.lateConfirmationCount} trễ ≥ 2 ngày`}>
              {summary.lateConfirmationCount} sau 1 ngày • {summary.completedLateCount - summary.lateConfirmationCount} trễ ≥ 2 ngày
            </p>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedDisciplineFilter('currently_overdue');
              setSubTab('task_details');
            }}
            className={`p-2.5 rounded-vds-lg border text-left transition cursor-pointer ${
              selectedDisciplineFilter === 'currently_overdue'
                ? 'bg-surface-negative border-line '
                : 'bg-surface-100 border-line hover:bg-surface'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-negative-solid" />
              <span className="font-bold text-negative">Đang quá hạn</span>
            </div>
            <p className="text-sm font-bold text-ink mt-1">
              {summary.currentlyOverdueCount} việc
            </p>
            <p className="text-[10px] text-negative mt-0.5 truncate">
              Chưa xong và quá hạn
            </p>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedDisciplineFilter('in_progress');
              setSubTab('task_details');
            }}
            className={`p-2.5 rounded-vds-lg border text-left transition cursor-pointer ${
              selectedDisciplineFilter === 'in_progress'
                ? 'bg-surface-200 border-line-regular '
                : 'bg-surface-100 border-line hover:bg-surface'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-icon" />
              <span className="font-bold text-ink-lighter">Đang thực hiện</span>
            </div>
            <p className="text-sm font-bold text-ink mt-1">
              {summary.inProgressCount + summary.blockedCount} việc
            </p>
            <p className="text-[10px] text-subdued mt-0.5 truncate" title={`${summary.inProgressCount} đang làm • ${summary.blockedCount} bị nghẽn`}>
              {summary.inProgressCount} đang làm • {summary.blockedCount} nghẽn
            </p>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedDisciplineFilter('all');
              setDrilldownProjectFilter('all');
              setSubTab('task_details');
            }}
            className={`p-2.5 rounded-vds-lg border text-left transition cursor-pointer ${
              selectedDisciplineFilter === 'all' && drilldownProjectFilter === 'all'
                ? 'bg-surface-100 border-line '
                : 'bg-surface-100 border-line hover:bg-surface'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-surface-dark" />
              <span className="font-bold text-ink">Tất cả việc</span>
            </div>
            <p className="text-sm font-bold text-ink mt-1">
              {summary.totalTasks} việc
            </p>
            <p className="text-[10px] text-subdued mt-0.5 truncate">
              Tổng 4 nhóm = {summary.completedOnTimeCount + summary.completedLateCount + summary.currentlyOverdueCount + (summary.inProgressCount + summary.blockedCount)}
            </p>
          </button>
        </div>
      </div>

      {/* 4B. Lớp Thống kê Trọng tâm Dự án của Nhân sự trong Kỳ đã chọn */}
      <div className="bg-surface rounded-vds-lg border border-line p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-divider pb-3.5">
          <div>
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-accent" />
              <h2 className="text-sm font-title font-bold text-ink">
                {focusMemberName !== 'Tất cả'
                  ? `Trọng tâm dự án — ${focusMemberName}`
                  : 'Trọng tâm dự án theo nhân sự'}
              </h2>
              {focusedMemberStats && (
                <span className="text-xs font-ui font-bold bg-surface-accent-faint text-accent px-2 py-0.5 rounded-full border border-line">
                  {focusedMemberStats.projectFocus.length} dự án • {focusedMemberStats.totalTasks} việc
                </span>
              )}
            </div>
            <p className="text-xs font-body text-subdued mt-0.5">
              Thống kê tỷ trọng công việc theo dự án của nhân sự trong kỳ ({summary.periodLabel}).
            </p>
          </div>

          {/* Bộ chọn nhân sự trực tiếp */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-ui font-bold text-ink-lighter flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-accent" />
              <span>Nhân sự:</span>
            </span>
            <select
              value={focusMemberName}
              onChange={(e) => {
                setFocusMemberName(e.target.value);
                setDrilldownProjectFilter('all');
              }}
              className="h-8 px-2.5 rounded-vds-lg text-xs font-ui font-bold bg-surface-100 border border-line text-ink cursor-pointer focus:outline-hidden focus:border-line-accent"
            >
              <option value="Tất cả">👥 Tất cả nhân sự Product ({productMembersList.length})</option>
              {productMembersList.map((m) => (
                <option key={m.id} value={m.name}>
                  👤 {m.name} ({m.team})
                </option>
              ))}
            </select>
          </div>
        </div>

        {focusMemberName !== 'Tất cả' ? (
          focusedMemberStats && focusedMemberStats.projectFocus.length > 0 ? (
            <div className="space-y-4">
              {/* Thanh Tỷ trọng Dự án (Stacked Progress Bar) */}
              <div className="space-y-1.5">
                <div className="h-3.5 w-full bg-surface-200 rounded-full overflow-hidden flex shadow-inner">
                  {focusedMemberStats.projectFocus.map((pf, idx) => {
                    const color = PROJECT_FOCUS_COLORS[idx % PROJECT_FOCUS_COLORS.length];
                    const widthPct =
                      focusedMemberStats.totalTasks > 0
                        ? (pf.totalTasks / focusedMemberStats.totalTasks) * 100
                        : 0;
                    return (
                      <div
                        key={pf.projectId}
                        style={{ width: `${widthPct}%`, backgroundColor: color }}
                        className="h-full transition first:rounded-l-full last:rounded-r-full"
                        title={`${pf.projectName.replace(/^Dự án\s+/i, '')}: ${pf.totalTasks} việc (${pf.sharePercent}%)`}
                      />
                    );
                  })}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-ui text-ink-lighter">
                  {focusedMemberStats.projectFocus.map((pf, idx) => {
                    const color = PROJECT_FOCUS_COLORS[idx % PROJECT_FOCUS_COLORS.length];
                    return (
                      <span key={pf.projectId} className="inline-flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <strong className="text-ink">
                          {pf.projectName.replace(/^Dự án\s+/i, '')}:
                        </strong>
                        <span>
                          {pf.totalTasks} việc ({pf.sharePercent}%)
                        </span>
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Danh sách Thẻ Dự án tập trung (Sắp xếp từ cao xuống thấp) */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {focusedMemberStats.projectFocus.map((pf, idx) => {
                  const color = PROJECT_FOCUS_COLORS[idx % PROJECT_FOCUS_COLORS.length];
                  const isFiltered = drilldownProjectFilter === pf.projectId;
                  return (
                    <div
                      key={pf.projectId}
                      className={`p-3.5 rounded-vds-lg border transition flex flex-col justify-between gap-2.5 ${
                        isFiltered
                          ? 'bg-surface-accent-faint/60 border-line-accent '
                          : 'bg-surface-100 border-line hover:bg-surface hover:border-line'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className="w-5 h-5 rounded-full text-[10px] font-ui font-extrabold text-on-color flex items-center justify-center shrink-0"
                              style={{ backgroundColor: color }}
                            >
                              #{idx + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                if (onSelectProject && projects.some((p) => p.id === pf.projectId)) {
                                  onSelectProject(pf.projectId);
                                }
                              }}
                              className="font-title text-xs font-bold text-ink hover:text-accent truncate text-left cursor-pointer"
                              title={pf.projectName}
                            >
                              {pf.projectName.replace(/^Dự án\s+/i, '')}
                            </button>
                            {pf.isStrategic && (
                              <span className="text-[10px] bg-surface-warning text-warning px-1.5 py-0.2 rounded font-ui font-bold shrink-0">
                                Chiến lược
                              </span>
                            )}
                          </div>
                          <span
                            className="text-sm font-title font-bold shrink-0"
                            style={{ color }}
                          >
                            {pf.sharePercent}%
                          </span>
                        </div>

                        <div className="mt-2 w-full bg-surface-300 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition"
                            style={{ width: `${pf.sharePercent}%`, backgroundColor: color }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs font-ui text-ink-lighter pt-1 border-t border-divider">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-ink">{pf.totalTasks} việc:</span>
                          {pf.onTimeTasks > 0 && (
                            <span className="text-positive font-semibold">
                              {pf.onTimeTasks} đúng hạn
                            </span>
                          )}
                          {pf.lateTasks > 0 && (
                            <span className="text-info font-semibold">
                              {pf.lateTasks} sau hạn
                            </span>
                          )}
                          {pf.inProgressTasks + pf.blockedTasks > 0 && (
                            <span className="text-ink-lighter">
                              {pf.inProgressTasks + pf.blockedTasks} đang làm
                            </span>
                          )}
                          {pf.overdueTasks > 0 && (
                            <span className="text-negative font-bold">
                              {pf.overdueTasks} quá hạn
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setDrilldownProjectFilter(
                              drilldownProjectFilter === pf.projectId ? 'all' : pf.projectId
                            );
                            setSelectedDisciplineFilter('all');
                            setSubTab('task_details');
                          }}
                          className="text-xs font-ui font-bold text-accent hover:underline shrink-0 cursor-pointer ml-2"
                        >
                          {isFiltered ? 'Bỏ lọc' : 'Xem việc →'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-xs font-ui text-subdued-lighter bg-surface-100 rounded-vds-lg border border-dashed border-line">
              {focusMemberName} chưa có công việc phát sinh trong kỳ ({summary.periodLabel}).
            </div>
          )
        ) : (
          /* Chế độ xem Toàn ban: Ma trận phân bổ dự án của tất cả nhân sự trong kỳ */
          <div className="divide-y divide-divider border border-line rounded-vds-lg overflow-hidden">
            {departmentWideSummary.executiveStats.filter((ex) => ex.totalTasks > 0).length > 0 ? (
              departmentWideSummary.executiveStats
                .filter((ex) => ex.totalTasks > 0)
                .sort((a, b) => b.totalTasks - a.totalTasks)
                .map((ex) => (
                  <div
                    key={ex.member.id}
                    className="p-3 bg-surface hover:bg-surface-100 transition-colors flex flex-col md:flex-row md:items-center gap-3"
                  >
                    <div className="md:w-52 shrink-0 flex items-center justify-between md:block">
                      <button
                        type="button"
                        onClick={() => setFocusMemberName(ex.member.name)}
                        className="font-ui text-xs font-bold text-ink hover:text-accent text-left cursor-pointer"
                        title="Bấm để xem chi tiết trọng tâm dự án của nhân sự này"
                      >
                        {ex.member.name}
                      </button>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] font-ui text-subdued bg-surface-200 px-1.5 py-0.2 rounded">
                          {ex.member.team}
                        </span>
                        <span className="text-xs font-ui font-bold text-accent">
                          {ex.totalTasks} việc
                        </span>
                      </div>
                    </div>

                    <div className="flex-1 space-y-1.5">
                      <div className="h-2.5 w-full bg-surface-200 rounded-full overflow-hidden flex">
                        {ex.projectFocus.map((pf, idx) => {
                          const color = PROJECT_FOCUS_COLORS[idx % PROJECT_FOCUS_COLORS.length];
                          const widthPct =
                            ex.totalTasks > 0 ? (pf.totalTasks / ex.totalTasks) * 100 : 0;
                          return (
                            <div
                              key={pf.projectId}
                              style={{ width: `${widthPct}%`, backgroundColor: color }}
                              className="h-full"
                              title={`${pf.projectName.replace(/^Dự án\s+/i, '')}: ${pf.totalTasks} việc (${pf.sharePercent}%)`}
                            />
                          );
                        })}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {ex.projectFocus.map((pf, idx) => {
                          const color = PROJECT_FOCUS_COLORS[idx % PROJECT_FOCUS_COLORS.length];
                          return (
                            <button
                              key={pf.projectId}
                              type="button"
                              onClick={() => {
                                setFocusMemberName(ex.member.name);
                                setDrilldownProjectFilter(pf.projectId);
                                setSubTab('task_details');
                              }}
                              className="inline-flex items-center gap-1 text-xs font-ui bg-surface-100 hover:bg-surface-200 border border-line px-2 py-0.5 rounded-vds-md text-ink-lighter cursor-pointer transition-colors"
                            >
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: color }}
                              />
                              <span className="font-semibold text-ink">
                                {pf.projectName.replace(/^Dự án\s+/i, '')}
                              </span>
                              <span className="text-subdued">
                                {pf.totalTasks} ({pf.sharePercent}%)
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))
            ) : (
              <div className="py-6 text-center text-xs font-ui text-subdued-lighter bg-surface-100">
                Không có công việc phát sinh trong kỳ ({summary.periodLabel}).
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5. Sub-tabs Navigation */}
      <div className="border-b border-line flex items-center gap-2">
        <button
          onClick={() => setSubTab('calendar')}
          className={`pb-3 px-3 text-xs font-ui font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            subTab === 'calendar'
              ? 'border-line-accent text-accent'
              : 'border-transparent text-ink-lighter hover:text-ink'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Lịch ({calendarMonthTaskCount})</span>
        </button>

        <button
          onClick={() => setSubTab('executive_performance')}
          className={`pb-3 px-3 text-xs font-ui font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            subTab === 'executive_performance'
              ? 'border-line-accent text-accent'
              : 'border-transparent text-ink-lighter hover:text-ink'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Nhân sự ({displayedExecutiveStats.length})</span>
        </button>

        <button
          onClick={() => setSubTab('overview')}
          className={`pb-3 px-3 text-xs font-ui font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            subTab === 'overview'
              ? 'border-line-accent text-accent'
              : 'border-transparent text-ink-lighter hover:text-ink'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>Dự án ({displayedProjectStats.length})</span>
        </button>

        <button
          onClick={() => setSubTab('pm_leadership')}
          className={`pb-3 px-3 text-xs font-ui font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            subTab === 'pm_leadership'
              ? 'border-line-accent text-accent'
              : 'border-transparent text-ink-lighter hover:text-ink'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Quản lý ({displayedPmStats.length})</span>
        </button>

        <button
          onClick={() => setSubTab('task_details')}
          className={`pb-3 px-3 text-xs font-ui font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            subTab === 'task_details'
              ? 'border-line-accent text-accent'
              : 'border-transparent text-ink-lighter hover:text-ink'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Công việc ({filteredDrilldownTasks.length})</span>
        </button>
      </div>

      {/* 6. Sub-tab Content Panels */}

      {/* PANEL 1: SỨC KHỎE DỰ ÁN */}
      {subTab === 'overview' && (
        <div className="bg-surface rounded-vds-lg border border-line overflow-hidden ">
          <div className="p-4 border-b border-divider flex items-center justify-between">
            <div>
              <h3 className="text-sm font-title font-bold text-ink">
                Dự án
              </h3>
              <p className="text-xs font-body text-subdued">
                Tỷ lệ đúng hạn và điểm nghẽn theo từng dự án.
              </p>
            </div>
            <span className="text-xs font-ui text-ink-lighter">
              {displayedProjectStats.length} dự án
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-body divide-y divide-divider">
              <thead className="bg-surface-100 text-subdued font-ui text-xs font-bold">
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
              <tbody className="divide-y divide-divider text-ink">
                {displayedProjectStats.map((p) => (
                  <tr key={p.project.id} className="hover:bg-surface-100 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (onSelectProject) onSelectProject(p.project.id);
                          }}
                          className="font-ui font-bold text-ink hover:text-accent text-left cursor-pointer"
                        >
                          {p.project.name.replace(/^Dự án\s+/i, '')}
                        </button>
                        {p.project.isStrategic && (
                          <span className="text-[10px] bg-surface-warning text-warning px-1.5 py-0.2 rounded font-ui font-bold">
                            Chiến lược
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-num text-subdued-lighter block">
                        {p.project.code}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-ui text-xs text-ink-lighter">
                      {p.leadPmNames}
                    </td>
                    <td className="py-3 px-3 text-center font-bold">
                      {p.totalTasks}
                    </td>
                    <td className="py-3 px-3 text-center text-positive font-bold">
                      {p.onTimeTasks}
                    </td>
                    <td className="py-3 px-3 text-center text-info">
                      {p.lateTasks}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {p.overdueTasks > 0 ? (
                        <span className="text-negative font-bold bg-surface-negative px-2 py-0.5 rounded-full">
                          {p.overdueTasks}
                        </span>
                      ) : (
                        <span className="text-subdued-lighter">0</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {p.blockedTasks > 0 ? (
                        <span className="text-warning font-bold bg-surface-warning px-2 py-0.5 rounded-full">
                          {p.blockedTasks}
                        </span>
                      ) : (
                        <span className="text-subdued-lighter">0</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="inline-flex items-center gap-1.5 font-bold">
                        <span
                          className={
                            p.onTimeRate >= 80
                              ? 'text-positive'
                              : p.onTimeRate >= 60
                              ? 'text-warning'
                              : 'text-negative'
                          }
                        >
                          {p.onTimeRate}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-vds-lg text-xs font-ui font-bold border ${
                          p.health === 'Tốt'
                            ? 'bg-surface-positive text-positive border-line'
                            : p.health === 'Cảnh báo'
                            ? 'bg-surface-warning text-warning border-line'
                            : 'bg-surface-negative text-negative border-line'
                        }`}
                      >
                        {p.health}
                      </span>
                    </td>
                  </tr>
                ))}
                {displayedProjectStats.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-xs font-ui text-subdued-lighter">
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
        <div className="bg-surface rounded-vds-lg border border-line overflow-hidden ">
          <div className="p-4 border-b border-divider flex items-center justify-between">
            <div>
              <h3 className="text-sm font-title font-bold text-ink">
                Quản lý
              </h3>
              <p className="text-xs font-body text-subdued">
                Năng lực kiểm soát tiến độ và tháo gỡ điểm nghẽn dự án.
              </p>
            </div>
            <span className="text-xs font-ui text-ink-lighter">
              {displayedPmStats.length} PM
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-body divide-y divide-divider">
              <thead className="bg-surface-100 text-subdued font-ui text-xs font-bold">
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
              <tbody className="divide-y divide-divider text-ink">
                {displayedPmStats.map((pmStat) => (
                  <tr key={pmStat.pm.id} className="hover:bg-surface-100 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-ui font-bold text-ink">
                        {pmStat.pm.name}
                      </div>
                      <span className="text-xs text-subdued block">
                        {pmStat.pm.title}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {pmStat.projectNames.length > 0 ? (
                          pmStat.projectNames.map((pName) => (
                            <span
                              key={pName}
                              className="text-xs bg-surface-200 text-ink px-2 py-0.5 rounded-vds-md font-ui"
                            >
                              {pName.replace(/^Dự án\s+/i, '')}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-subdued-lighter italic">
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
                            ? 'text-positive'
                            : pmStat.teamOnTimeRate >= 70
                            ? 'text-warning'
                            : 'text-negative'
                        }`}
                      >
                        {pmStat.teamOnTimeRate}%
                      </span>
                      <span className="text-[10px] text-subdued block font-num">
                        ({pmStat.teamOnTimeTasks}/{pmStat.completedTeamTasks})
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      {pmStat.teamBlockedTasks > 0 ? (
                        <span className="text-warning font-bold bg-surface-warning px-2 py-0.5 rounded-full">
                          {pmStat.teamBlockedTasks}
                        </span>
                      ) : (
                        <span className="text-positive">0</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {pmStat.delayedPhasesCount > 0 ? (
                        <span className="text-negative font-bold bg-surface-negative px-2 py-0.5 rounded-full">
                          {pmStat.delayedPhasesCount}
                        </span>
                      ) : (
                        <span className="text-subdued">0</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-vds-lg text-xs font-ui font-bold border ${
                          pmStat.leadershipRating === 'Xuất sắc'
                            ? 'bg-surface-positive text-positive border-line'
                            : pmStat.leadershipRating === 'Ổn định'
                            ? 'bg-surface-info text-info border-line'
                            : 'bg-surface-negative text-negative border-line'
                        }`}
                      >
                        {pmStat.leadershipRating}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs font-body text-ink-lighter">
                      {pmStat.ratingReason}
                    </td>
                  </tr>
                ))}
                {displayedPmStats.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-xs font-ui text-subdued-lighter">
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
        <div className="bg-surface rounded-vds-lg border border-line overflow-hidden ">
          <div className="p-4 border-b border-divider flex items-center justify-between">
            <div>
              <h3 className="text-sm font-title font-bold text-ink">
                Nhân sự
              </h3>
              <p className="text-xs font-body text-subdued">
                Tiến độ hoàn thành, nợ quá hạn và link kết quả nghiệm thu.
              </p>
            </div>
            <span className="text-xs font-ui text-ink-lighter">
              {displayedExecutiveStats.length} nhân sự
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-body divide-y divide-divider">
              <thead className="bg-surface-100 text-subdued font-ui text-xs font-bold">
                <tr>
                  <th className="py-3 px-4">Nhân sự</th>
                  <th className="py-3 px-3">Nhóm</th>
                  <th className="py-3 px-3">Dự án tập trung</th>
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
              <tbody className="divide-y divide-divider text-ink">
                {displayedExecutiveStats.map((ex) => (
                  <tr key={ex.member.id} className="hover:bg-surface-100 transition-colors">
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => setFocusMemberName(ex.member.name)}
                        className="font-ui font-bold text-ink hover:text-accent text-left cursor-pointer"
                      >
                        {ex.member.name}
                      </button>
                      <span className="text-xs text-subdued block">
                        {ex.member.title}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-xs bg-surface-200 text-ink-lighter px-2 py-0.5 rounded font-ui font-medium">
                        {ex.member.team}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {ex.projectFocus.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {ex.projectFocus.map((pf) => (
                            <span
                              key={pf.projectId}
                              className="text-xs bg-surface-100 border border-line text-ink-lighter px-2 py-0.5 rounded-vds-md font-ui"
                            >
                              {pf.projectName.replace(/^Dự án\s+/i, '')}:{' '}
                              <strong className="text-accent">{pf.totalTasks}</strong> ({pf.sharePercent}%)
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-subdued-lighter italic">Chưa có việc</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center font-bold">
                      {ex.totalTasks}
                    </td>
                    <td className="py-3 px-3 text-center text-positive font-bold">
                      {ex.completedOnTime}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {ex.completedLate > 0 ? (
                        <span className="text-info font-bold bg-surface-info px-2 py-0.5 rounded-full">
                          {ex.completedLate}
                        </span>
                      ) : (
                        <span className="text-subdued-lighter">0</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {ex.currentlyOverdueCount > 0 ? (
                        <span className="text-negative font-bold bg-surface-negative px-2 py-0.5 rounded-full">
                          {ex.currentlyOverdueCount}
                        </span>
                      ) : (
                        <span className="text-positive">0</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="font-num font-bold text-ink">
                        {ex.completedTasks > 0
                          ? `${Math.round((ex.hasResultLinkCount / ex.completedTasks) * 100)}%`
                          : '—'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`font-bold ${
                          ex.onTimeRate >= 85
                            ? 'text-positive'
                            : ex.onTimeRate >= 70
                            ? 'text-warning'
                            : 'text-negative'
                        }`}
                      >
                        {ex.onTimeRate}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-vds-lg text-xs font-ui font-bold border ${
                          ex.efficiencyRating === 'Xuất sắc'
                            ? 'bg-surface-positive text-positive border-line'
                            : ex.efficiencyRating === 'Tốt'
                            ? 'bg-surface-info text-info border-line'
                            : 'bg-surface-negative text-negative border-line'
                        }`}
                      >
                        {ex.efficiencyRating}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs font-body text-ink-lighter">
                      {ex.ratingReason}
                    </td>
                  </tr>
                ))}
                {displayedExecutiveStats.length === 0 && (
                  <tr>
                    <td colSpan={11} className="py-8 text-center text-xs font-ui text-subdued-lighter">
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
        <div className="bg-surface rounded-vds-lg border border-line overflow-hidden ">
          <div className="p-4 border-b border-divider flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-title font-bold text-ink">
                Công việc ({filteredDrilldownTasks.length})
              </h3>
              <p className="text-xs font-body text-subdued">
                Đối soát giữa ngày hạn đăng ký và ngày hoàn thành thực tế.
              </p>
            </div>

            {/* Quick Filter discipline badge inside drill-down */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-ui text-subdued">Lọc:</span>
              <button
                type="button"
                onClick={() => setSelectedDisciplineFilter('all')}
                className={`px-2 py-0.5 rounded text-xs font-ui cursor-pointer ${
                  selectedDisciplineFilter === 'all'
                    ? 'bg-surface-selected text-accent ring-1 ring-inset ring-line-accent-soft font-bold'
                    : 'bg-surface-200 text-ink-lighter'
                }`}
              >
                Tất cả ({summary.totalTasks})
              </button>
              <button
                type="button"
                onClick={() => setSelectedDisciplineFilter('on_time')}
                className={`px-2 py-0.5 rounded text-xs font-ui cursor-pointer ${
                  selectedDisciplineFilter === 'on_time'
                    ? 'bg-surface-selected text-accent font-bold ring-1 ring-inset ring-line-accent-soft'
                    : 'bg-surface-positive text-positive'
                }`}
              >
                Đúng hạn ({summary.completedOnTimeCount})
              </button>
              <button
                type="button"
                onClick={() => setSelectedDisciplineFilter('late')}
                className={`px-2 py-0.5 rounded text-xs font-ui cursor-pointer ${
                  selectedDisciplineFilter === 'late'
                    ? 'bg-surface-selected text-accent font-bold ring-1 ring-inset ring-line-accent-soft'
                    : 'bg-surface-info text-info'
                }`}
              >
                Hoàn thành sau hạn ({summary.completedLateCount})
              </button>
              <button
                type="button"
                onClick={() => setSelectedDisciplineFilter('currently_overdue')}
                className={`px-2 py-0.5 rounded text-xs font-ui cursor-pointer ${
                  selectedDisciplineFilter === 'currently_overdue'
                    ? 'bg-surface-selected text-accent font-bold ring-1 ring-inset ring-line-accent-soft'
                    : 'bg-surface-negative text-negative'
                }`}
              >
                Quá hạn ({summary.currentlyOverdueCount})
              </button>
              <button
                type="button"
                onClick={() => setSelectedDisciplineFilter('in_progress')}
                className={`px-2 py-0.5 rounded text-xs font-ui cursor-pointer ${
                  selectedDisciplineFilter === 'in_progress'
                    ? 'bg-icon-strong text-on-color font-bold'
                    : 'bg-surface-200 text-ink-lighter'
                }`}
              >
                Đang thực hiện ({summary.inProgressCount + summary.blockedCount})
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-body divide-y divide-divider">
              <thead className="bg-surface-100 text-subdued font-ui text-xs font-bold">
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
              <tbody className="divide-y divide-divider text-ink">
                {filteredDrilldownTasks.length > 0 ? (
                  filteredDrilldownTasks.map((res) => (
                    <tr key={res.task.id} className="hover:bg-surface-100 transition-colors">
                      <td className="py-3 px-4">
                        <div
                          onClick={() => {
                            if (onOpenTaskDetail) onOpenTaskDetail(res.task);
                          }}
                          className="font-title font-bold text-ink hover:text-accent cursor-pointer line-clamp-2"
                        >
                          {res.task.title}
                        </div>
                        {res.task.phaseName && (
                          <span className="text-xs text-subdued block">
                            {res.task.phaseName}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-ui text-xs text-ink-lighter">
                        {res.task.projectName.replace(/^Dự án\s+/i, '')}
                      </td>
                      <td className="py-3 px-3 font-ui text-xs font-bold text-ink">
                        {res.task.assignee}
                      </td>
                      <td className="py-3 px-3 font-ui text-xs">
                        {formatDateWithEnDay(res.task.dueDate)}
                      </td>
                      <td className="py-3 px-3 font-ui text-xs">
                        {res.completionDate ? (
                          formatDateWithEnDay(res.completionDate)
                        ) : (
                          <span className="text-subdued-lighter italic">Chưa hoàn thành</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-vds-lg text-xs font-ui font-bold border ${res.badgeClass}`}
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
                            className="inline-flex items-center gap-1 text-positive font-ui text-xs font-bold hover:underline"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Link KQ</span>
                          </a>
                        ) : res.task.workLink ? (
                          <a
                            href={res.task.workLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-info font-ui text-xs font-bold hover:underline"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Link việc</span>
                          </a>
                        ) : (
                          <span className="text-subdued-lighter text-xs">Chưa có</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => {
                            if (onOpenTaskDetail) onOpenTaskDetail(res.task);
                          }}
                          className="px-2 py-1 rounded hover:bg-surface-200 text-subdued hover:text-ink text-xs font-ui cursor-pointer"
                        >
                          Mở xem
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-xs font-ui text-subdued-lighter">
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
        <div className="bg-surface rounded-vds-lg border border-line overflow-hidden ">
          <div className="p-4 border-b border-divider flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-title font-bold text-ink">
                Lịch{isAssigneeFiltered ? ` — ${selectedAssignee}` : ''}
              </h3>
              <p className="text-xs font-body text-subdued">
                Hạn công việc theo từng ngày trong tháng. Bấm vào ngày để mở trang Công việc lọc theo ngày đó.
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={goPrevMonth}
                className="p-1.5 rounded-vds-lg border border-line text-ink-lighter hover:bg-surface-200 hover:text-ink cursor-pointer transition-colors"
                title="Tháng trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-ui font-bold text-ink w-28 text-center">
                Tháng {calendarMonth.getMonth() + 1}/{calendarMonth.getFullYear()}
              </span>
              <button
                onClick={goNextMonth}
                className="p-1.5 rounded-vds-lg border border-line text-ink-lighter hover:bg-surface-200 hover:text-ink cursor-pointer transition-colors"
                title="Tháng sau"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={goCurrentMonth}
                className="ml-1 px-2.5 py-1.5 rounded-vds-lg text-xs font-ui font-bold bg-surface-accent-faint text-accent border border-line hover:bg-surface-accent cursor-pointer transition-colors"
              >
                Hôm nay
              </button>
            </div>
          </div>

          {/* Weekday header */}
          <div className="grid grid-cols-7 border-b border-divider bg-surface-100">
            {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((wd) => (
              <div
                key={wd}
                className="py-2 text-center text-xs font-ui font-bold text-subdued"
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
                  className={`min-h-[92px] p-1.5 border-b border-r border-divider text-left flex flex-col gap-1 transition-colors cursor-pointer ${
                    cell.inMonth ? 'bg-surface hover:bg-surface-100' : 'bg-surface-100 hover:bg-surface-200'
                  }`}
                >
                  <span
                    className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-ui font-bold shrink-0 ${
                      isToday
                        ? 'bg-surface-selected text-accent ring-1 ring-inset ring-line-accent-soft'
                        : cell.inMonth
                        ? 'text-ink'
                        : 'text-icon-subdued'
                    }`}
                  >
                    {cell.dayNum}
                  </span>

                  {counts && counts.total > 0 && (
                    <div className="flex items-center gap-0.5 flex-wrap">
                      {counts.overdue > 0 && (
                        <span className="text-[10px] font-ui font-bold text-on-color bg-negative-solid rounded px-1 leading-4">
                          {counts.overdue} quá hạn
                        </span>
                      )}
                      {counts.late > 0 && (
                        <span className="text-[10px] font-ui font-bold text-on-color bg-support-solid rounded px-1 leading-4">
                          {counts.late} sau hạn
                        </span>
                      )}
                      {counts.blocked > 0 && (
                        <span className="text-[10px] font-ui font-bold text-on-color bg-warning-solid rounded px-1 leading-4">
                          {counts.blocked} nghẽn
                        </span>
                      )}
                      {counts.inProgress > 0 && (
                        <span className="text-[10px] font-ui font-bold text-ink-lighter bg-surface-200 rounded px-1 leading-4">
                          {counts.inProgress} đang làm
                        </span>
                      )}
                      {counts.onTime > 0 && (
                        <span className="text-[10px] font-ui font-bold text-positive bg-surface-positive rounded px-1 leading-4">
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
          <div className="flex items-center gap-3 flex-wrap px-4 py-2.5 border-t border-divider bg-surface-100 text-[10px] font-ui text-ink-lighter">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-positive-solid" /> Đúng hạn
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-support-solid" /> Hoàn thành sau hạn
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-negative-solid" /> Đang quá hạn
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-warning-solid" /> Đang nghẽn
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-icon-strong" /> Đang làm / chưa làm
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
