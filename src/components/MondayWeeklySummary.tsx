/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { MemberItem, TaskItem, ProjectItem } from '../types';
import { generateDepartmentReport, getTimePeriodDateRange } from '../utils/reportUtils';
import { getUserRole } from '../utils/rbac';
import {
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  Layers,
  User,
  X,
} from 'lucide-react';

interface MondayWeeklySummaryProps {
  members: MemberItem[];
  tasks: TaskItem[];
  projects: ProjectItem[];
  currentAuthUser?: MemberItem | null;
  activeProductMember?: MemberItem | null;
  onSelectTask?: (task: TaskItem) => void;
  isOpenDefault?: boolean;
}

/**
 * Lấy mã định danh tuần dạng YYYY-Www để lưu trạng thái ẩn trong kỳ tuần đó
 */
function getWeekIdentifier(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export const MondayWeeklySummary: React.FC<MondayWeeklySummaryProps> = ({
  members,
  tasks,
  projects,
  currentAuthUser,
  activeProductMember,
  onSelectTask,
  isOpenDefault,
}) => {
  const today = new Date();
  const isMonday = today.getDay() === 1;
  const currentHour = today.getHours();

  // Khung giờ hiển thị: Mặc định hiển thị từ 00:00 - 09:00 sáng Thứ Hai
  const isMondayMorningWindow = isMonday && currentHour >= 0 && currentHour < 9;

  // Hỗ trợ URL param khi cần kiểm thử / dev preview (?monday=1 hoặc ?previewMonday=1)
  const isPreviewParam = (() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('monday') === '1' || urlParams.get('previewMonday') === '1';
    } catch {
      return false;
    }
  })();

  const weekKey = getWeekIdentifier(today);
  const storageKey = `vne_monday_summary_dismissed_${weekKey}`;

  // Kiểm tra xem người dùng đã chủ động bấm đóng trong tuần này chưa
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(storageKey) === 'true';
    } catch {
      return false;
    }
  });

  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  // Điều kiện hiển thị: Trong khung giờ 00:00 - 09:00 Thứ Hai (hoặc preview param) VÀ chưa bị đóng
  const shouldShow = (isMondayMorningWindow || isPreviewParam || isOpenDefault) && !isDismissed;

  // Lọc theo cá nhân hay toàn bộ phận (dành cho Admin / Manager)
  const currentActor = currentAuthUser || activeProductMember || members[0];
  const role = getUserRole(currentActor);
  const canViewOverall = role === 'Admin' || role === 'Manager';

  const [scope, setScope] = useState<'personal' | 'department'>('personal');

  // Thẻ được chọn để xem chi tiết task bên dưới (nếu click vào 1 KPI)
  const [selectedKpi, setSelectedKpi] = useState<string | null>(null);

  // Khoảng thời gian tuần trước
  const range = useMemo(() => getTimePeriodDateRange('last_week', undefined, undefined, today), [today]);

  // Tính toán số liệu báo cáo tuần trước
  const summary = useMemo(() => {
    const assigneeFilter = scope === 'personal' && currentActor?.name ? currentActor.name : undefined;
    return generateDepartmentReport(
      tasks,
      projects,
      members,
      'last_week',
      { assignee: assigneeFilter },
      today
    );
  }, [tasks, projects, members, scope, currentActor?.name, today]);

  // Danh sách công việc theo từng KPI được chọn để drill-down
  const detailTasks = useMemo(() => {
    if (!selectedKpi) return [];
    if (selectedKpi === 'total') return summary.analyzedTasks.map((a) => a.task);
    if (selectedKpi === 'completed') {
      return summary.analyzedTasks.filter((a) => a.isCompleted).map((a) => a.task);
    }
    if (selectedKpi === 'ontime') {
      return summary.analyzedTasks.filter((a) => a.isCompleted && a.isOnTime).map((a) => a.task);
    }
    if (selectedKpi === 'late_confirm' || selectedKpi === 'late') {
      return summary.analyzedTasks.filter((a) => a.isCompleted && !a.isOnTime).map((a) => a.task);
    }
    if (selectedKpi === 'overdue') {
      return summary.analyzedTasks.filter((a) => !a.isCompleted && a.discipline === 'currently_overdue').map((a) => a.task);
    }
    return [];
  }, [selectedKpi, summary.analyzedTasks]);

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      localStorage.setItem(storageKey, 'true');
    } catch {}
  };

  // Ngoài khung giờ hoặc sau khi đóng: Ẩn hoàn toàn, không hiển thị nút bấm
  if (!shouldShow) {
    return null;
  }

  return (
    <div className="bg-white rounded-[12px] border border-[#e0e0e0] shadow-2xs overflow-hidden transition-all">
      {/* Header Bar */}
      <div className="px-4 py-2.5 bg-[#fafafa] border-b border-[#e0e0e0] flex items-center justify-between gap-3 select-none">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-full bg-[#1d508d]/10 text-[#1d508d] flex items-center justify-center shrink-0">
            <BarChart3 className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-center gap-2 truncate">
            <h3 className="font-title text-sm font-bold text-[#202020] truncate">
              Kết quả công việc tuần trước
            </h3>
            <span className="text-[11px] font-ui text-[#5f5f5f] hidden sm:inline">
              ({range.label})
            </span>
            {isMonday && (
              <span className="text-[10px] font-ui font-bold bg-[#1d508d]/10 text-[#1d508d] px-2 py-0.5 rounded-full border border-[#1d508d]/20 shrink-0">
                Sáng thứ Hai
              </span>
            )}
          </div>
        </div>

        {/* Phía bên phải: Chuyển phạm vi (nếu có quyền), Thu gọn, Đóng */}
        <div className="flex items-center gap-2 shrink-0">
          {canViewOverall && (
            <div className="inline-flex items-center p-0.5 bg-[#f0f0f0] rounded-[6px] text-xs font-ui font-semibold">
              <button
                type="button"
                onClick={() => setScope('personal')}
                className={`px-2.5 py-1 rounded-[4px] transition-all cursor-pointer ${
                  scope === 'personal'
                    ? 'bg-white text-[#202020] shadow-2xs font-bold'
                    : 'text-[#7f7f7f] hover:text-[#202020]'
                }`}
              >
                Việc của tôi
              </button>
              <button
                type="button"
                onClick={() => setScope('department')}
                className={`px-2.5 py-1 rounded-[4px] transition-all cursor-pointer ${
                  scope === 'department'
                    ? 'bg-white text-[#202020] shadow-2xs font-bold'
                    : 'text-[#7f7f7f] hover:text-[#202020]'
                }`}
              >
                Toàn bộ phận
              </button>
            </div>
          )}

          {/* Nút Thu gọn / Mở rộng */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-[#5f5f5f] hover:text-[#202020] hover:bg-[#f0f0f0] rounded-[6px] transition-colors cursor-pointer"
            title={isExpanded ? 'Thu gọn' : 'Mở rộng'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {/* Nút Đóng */}
          <button
            type="button"
            onClick={handleDismiss}
            className="p-1.5 text-[#7f7f7f] hover:text-[#dc2626] hover:bg-[#fef2f2] rounded-[6px] transition-colors cursor-pointer"
            title="Đóng box thống kê tuần này"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body: 5 Thẻ KPI theo chuẩn Ảnh 2 */}
      {isExpanded && (
        <div className="p-4 bg-white space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {/* KPI 1: Tổng công việc */}
            <div
              onClick={() => setSelectedKpi(selectedKpi === 'total' ? null : 'total')}
              className={`bg-white rounded-[10px] border p-4 shadow-2xs transition-all cursor-pointer hover:border-[#b0b0b0] ${
                selectedKpi === 'total' ? 'border-[#1d508d] ring-1 ring-[#1d508d]' : 'border-[#e0e0e0]'
              }`}
            >
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
                <span>
                  Xong: <strong className="text-[#166534]">{summary.completedCount}</strong>
                </span>
                <span>
                  Đang làm: <strong>{summary.inProgressCount}</strong>
                </span>
                <span>
                  Nghẽn: <strong className="text-[#c2410c]">{summary.blockedCount}</strong>
                </span>
              </div>
            </div>

            {/* KPI 2: Hoàn thành = (Đúng hạn + Hoàn thành sau hạn) / Tổng công việc */}
            <div
              onClick={() => setSelectedKpi(selectedKpi === 'completed' ? null : 'completed')}
              className={`bg-white rounded-[10px] border p-4 shadow-2xs transition-all cursor-pointer hover:border-[#b0b0b0] ${
                selectedKpi === 'completed' ? 'border-[#166534] ring-1 ring-[#166534]' : 'border-[#e0e0e0]'
              }`}
            >
              <p className="text-[11px] font-ui font-extrabold uppercase tracking-wider text-[#7f7f7f]">
                Hoàn thành
              </p>
              <div className="flex items-baseline gap-2 mt-1.5">
                <span
                  className={`text-2xl font-title font-bold ${
                    (summary.totalTasks > 0 ? (summary.completedCount / summary.totalTasks) * 100 : 0) >= 85
                      ? 'text-[#166534]'
                      : (summary.totalTasks > 0 ? (summary.completedCount / summary.totalTasks) * 100 : 0) >= 70
                      ? 'text-[#ea580c]'
                      : 'text-[#dc2626]'
                  }`}
                >
                  {summary.totalTasks > 0
                    ? Math.round((summary.completedCount / summary.totalTasks) * 100)
                    : 0}%
                </span>
                <span className="text-xs font-ui font-bold text-[#5f5f5f]">
                  ({summary.completedCount})
                </span>
              </div>
              <div className="mt-2 w-full bg-[#f0f0f0] h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    (summary.totalTasks > 0 ? (summary.completedCount / summary.totalTasks) * 100 : 0) >= 85
                      ? 'bg-[#166534]'
                      : (summary.totalTasks > 0 ? (summary.completedCount / summary.totalTasks) * 100 : 0) >= 70
                      ? 'bg-[#ea580c]'
                      : 'bg-[#dc2626]'
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
            <div
              onClick={() => setSelectedKpi(selectedKpi === 'ontime' ? null : 'ontime')}
              className={`bg-white rounded-[10px] border p-4 shadow-2xs transition-all cursor-pointer hover:border-[#b0b0b0] ${
                selectedKpi === 'ontime' ? 'border-[#166534] ring-1 ring-[#166534]' : 'border-[#e0e0e0]'
              }`}
            >
              <p className="text-[11px] font-ui font-extrabold uppercase tracking-wider text-[#7f7f7f] flex items-center justify-between">
                <span>Đúng hạn</span>
                <span className="text-[10px] text-[#7f7f7f]">Mục tiêu ≥85%</span>
              </p>
              <div className="flex items-baseline gap-2 mt-1.5">
                <span
                  className={`text-2xl font-title font-bold ${
                    (summary.totalTasks > 0 ? (summary.completedOnTimeCount / summary.totalTasks) * 100 : 0) >= 85
                      ? 'text-[#166534]'
                      : (summary.totalTasks > 0 ? (summary.completedOnTimeCount / summary.totalTasks) * 100 : 0) >= 70
                      ? 'text-[#ea580c]'
                      : 'text-[#dc2626]'
                  }`}
                >
                  {summary.totalTasks > 0
                    ? Math.round((summary.completedOnTimeCount / summary.totalTasks) * 100)
                    : 0}%
                </span>
                <span className="text-xs font-ui font-bold text-[#5f5f5f]">
                  ({summary.completedOnTimeCount})
                </span>
              </div>
              <div className="mt-2 w-full bg-[#f0f0f0] h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    (summary.totalTasks > 0 ? (summary.completedOnTimeCount / summary.totalTasks) * 100 : 0) >= 85
                      ? 'bg-[#166534]'
                      : (summary.totalTasks > 0 ? (summary.completedOnTimeCount / summary.totalTasks) * 100 : 0) >= 70
                      ? 'bg-[#ea580c]'
                      : 'bg-[#dc2626]'
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
            <div
              onClick={() => setSelectedKpi(selectedKpi === 'late' ? null : 'late')}
              className={`bg-white rounded-[10px] border p-4 shadow-2xs transition-all cursor-pointer hover:border-[#b0b0b0] ${
                selectedKpi === 'late' ? 'border-[#1d4ed8] ring-1 ring-[#1d4ed8]' : 'border-[#e0e0e0]'
              }`}
            >
              <p className="text-[11px] font-ui font-extrabold uppercase tracking-wider text-[#7f7f7f]">
                Hoàn thành sau hạn
              </p>
              <div className="flex items-baseline gap-2 mt-1.5">
                <span className="text-2xl font-title font-bold text-[#1d4ed8]">
                  {summary.totalTasks > 0
                    ? Math.round((summary.completedLateCount / summary.totalTasks) * 100)
                    : 0}%
                </span>
                <span className="text-xs font-ui font-bold text-[#1d4ed8]">
                  ({summary.completedLateCount})
                </span>
              </div>
              <p className="mt-2 text-[11px] font-ui text-[#7f7f7f] border-t border-[#f0f0f0] pt-1.5 truncate" title={`${summary.lateConfirmationCount} sau 1 ngày • ${summary.completedLateCount - summary.lateConfirmationCount} trễ ≥ 2 ngày`}>
                {summary.lateConfirmationCount} sau 1 ngày • {summary.completedLateCount - summary.lateConfirmationCount} trễ ≥ 2 ngày
              </p>
            </div>

            {/* KPI 5: Đang quá hạn (Giữ nguyên) */}
            <div
              onClick={() => setSelectedKpi(selectedKpi === 'overdue' ? null : 'overdue')}
              className={`bg-white rounded-[10px] border p-4 shadow-2xs transition-all cursor-pointer hover:border-[#b0b0b0] ${
                selectedKpi === 'overdue' ? 'border-[#dc2626] ring-1 ring-[#dc2626]' : 'border-[#e0e0e0]'
              }`}
            >
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
          </div>

          {/* Drill-down list nếu click vào 1 KPI */}
          {selectedKpi && detailTasks.length > 0 && (
            <div className="mt-3 p-3 bg-[#fafafa] rounded-[8px] border border-[#e0e0e0] space-y-2 animate-fade-in">
              <div className="flex items-center justify-between text-xs font-ui">
                <span className="font-bold text-[#202020]">
                  Danh sách công việc (
                  {selectedKpi === 'total'
                    ? 'Tổng công việc'
                    : selectedKpi === 'completed'
                    ? 'Hoàn thành'
                    : selectedKpi === 'ontime'
                    ? 'Đúng hạn'
                    : selectedKpi === 'late' || selectedKpi === 'late_confirm'
                    ? 'Hoàn thành sau hạn'
                    : 'Đang quá hạn'}
                  : {detailTasks.length} việc)
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedKpi(null)}
                  className="text-[#7f7f7f] hover:text-[#202020] text-[11px] cursor-pointer"
                >
                  Đóng danh sách
                </button>
              </div>

              <div className="divide-y divide-[#ebebeb] max-h-48 overflow-y-auto">
                {detailTasks.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => onSelectTask?.(t)}
                    className="py-1.5 flex items-center justify-between gap-2 hover:bg-white px-2 rounded cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-semibold text-[#202020] truncate">
                        {t.title}
                      </span>
                      <span className="text-[11px] text-[#7f7f7f] truncate">
                        • {t.projectName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 text-[11px] text-[#5f5f5f]">
                      <span>{t.assignee}</span>
                      <span className="font-medium text-[#202020]">{t.dueDate}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
