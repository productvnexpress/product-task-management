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
} from './vds/icons';

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
    if (selectedKpi === 'total') return summary.tasksAnalyzed.map((a) => a.task);
    if (selectedKpi === 'completed') {
      return summary.tasksAnalyzed.filter((a) => a.isCompleted).map((a) => a.task);
    }
    if (selectedKpi === 'ontime') {
      return summary.tasksAnalyzed.filter((a) => a.isCompleted && a.isOnTime).map((a) => a.task);
    }
    if (selectedKpi === 'late_confirm' || selectedKpi === 'late') {
      return summary.tasksAnalyzed.filter((a) => a.isCompleted && !a.isOnTime).map((a) => a.task);
    }
    if (selectedKpi === 'overdue') {
      return summary.tasksAnalyzed.filter((a) => !a.isCompleted && a.discipline === 'currently_overdue').map((a) => a.task);
    }
    return [];
  }, [selectedKpi, summary.tasksAnalyzed]);

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
    <div className="bg-surface rounded-vds-lg border border-line overflow-hidden transition">
      {/* Header Bar */}
      <div className="px-4 py-2.5 bg-surface-100 border-b border-line flex items-center justify-between gap-3 select-none">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-full bg-support-solid/10 text-support flex items-center justify-center shrink-0">
            <BarChart3 className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-center gap-2 truncate">
            <h3 className="font-title text-sm font-bold text-ink truncate">
              Kết quả công việc tuần trước
            </h3>
            <span className="text-xs font-ui text-ink-lighter hidden sm:inline">
              ({range.label})
            </span>
            {isMonday && (
              <span className="text-[10px] font-ui font-bold bg-support-solid/10 text-support px-2 py-0.5 rounded-full border border-line-support/20 shrink-0">
                Sáng thứ Hai
              </span>
            )}
          </div>
        </div>

        {/* Phía bên phải: Chuyển phạm vi (nếu có quyền), Thu gọn, Đóng */}
        <div className="flex items-center gap-2 shrink-0">
          {canViewOverall && (
            <div className="inline-flex items-center p-0.5 bg-surface-200 rounded-vds-lg text-xs font-ui font-semibold">
              <button
                type="button"
                onClick={() => setScope('personal')}
                className={`px-2.5 py-1 rounded-vds-md transition cursor-pointer ${
                  scope === 'personal'
                    ? 'bg-surface text-ink font-bold'
                    : 'text-subdued hover:text-ink'
                }`}
              >
                Việc của tôi
              </button>
              <button
                type="button"
                onClick={() => setScope('department')}
                className={`px-2.5 py-1 rounded-vds-md transition cursor-pointer ${
                  scope === 'department'
                    ? 'bg-surface text-ink font-bold'
                    : 'text-subdued hover:text-ink'
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
            className="p-1.5 text-ink-lighter hover:text-ink hover:bg-surface-200 rounded-vds-lg transition-colors cursor-pointer"
            title={isExpanded ? 'Thu gọn' : 'Mở rộng'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {/* Nút Đóng */}
          <button
            type="button"
            onClick={handleDismiss}
            className="p-1.5 text-subdued hover:text-negative hover:bg-surface-negative rounded-vds-lg transition-colors cursor-pointer"
            title="Đóng box thống kê tuần này"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body: 5 Thẻ KPI theo chuẩn Ảnh 2 */}
      {isExpanded && (
        <div className="p-4 bg-surface space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {/* KPI 1: Tổng công việc */}
            <div
              onClick={() => setSelectedKpi(selectedKpi === 'total' ? null : 'total')}
              className={`bg-surface rounded-vds-lg border p-4 transition cursor-pointer hover:border-line-regular ${
                selectedKpi === 'total' ? 'border-line-support ring-1 ring-line-support' : 'border-line'
              }`}
            >
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
                <span>
                  Xong: <strong className="text-positive">{summary.completedCount}</strong>
                </span>
                <span>
                  Đang làm: <strong>{summary.inProgressCount}</strong>
                </span>
                <span>
                  Nghẽn: <strong className="text-warning">{summary.blockedCount}</strong>
                </span>
              </div>
            </div>

            {/* KPI 2: Hoàn thành = (Đúng hạn + Hoàn thành sau hạn) / Tổng công việc */}
            <div
              onClick={() => setSelectedKpi(selectedKpi === 'completed' ? null : 'completed')}
              className={`bg-surface rounded-vds-lg border p-4 transition cursor-pointer hover:border-line-regular ${
                selectedKpi === 'completed' ? 'border-line-positive ring-1 ring-line-positive' : 'border-line'
              }`}
            >
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
                  className={`h-full transition duration-500 ${
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
            <div
              onClick={() => setSelectedKpi(selectedKpi === 'ontime' ? null : 'ontime')}
              className={`bg-surface rounded-vds-lg border p-4 transition cursor-pointer hover:border-line-regular ${
                selectedKpi === 'ontime' ? 'border-line-positive ring-1 ring-line-positive' : 'border-line'
              }`}
            >
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
                  className={`h-full transition duration-500 ${
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
            <div
              onClick={() => setSelectedKpi(selectedKpi === 'late' ? null : 'late')}
              className={`bg-surface rounded-vds-lg border p-4 transition cursor-pointer hover:border-line-regular ${
                selectedKpi === 'late' ? 'border-line-info ring-1 ring-line-info' : 'border-line'
              }`}
            >
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
            <div
              onClick={() => setSelectedKpi(selectedKpi === 'overdue' ? null : 'overdue')}
              className={`bg-surface rounded-vds-lg border p-4 transition cursor-pointer hover:border-line-regular ${
                selectedKpi === 'overdue' ? 'border-line-negative ring-1 ring-line-negative' : 'border-line'
              }`}
            >
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

          {/* Drill-down list nếu click vào 1 KPI */}
          {selectedKpi && detailTasks.length > 0 && (
            <div className="mt-3 p-3 bg-surface-100 rounded-vds-lg border border-line space-y-2 animate-fade-in">
              <div className="flex items-center justify-between text-xs font-ui">
                <span className="font-bold text-ink">
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
                  className="text-subdued hover:text-ink text-xs cursor-pointer"
                >
                  Đóng danh sách
                </button>
              </div>

              <div className="divide-y divide-divider max-h-48 overflow-y-auto">
                {detailTasks.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => onSelectTask?.(t)}
                    className="py-1.5 flex items-center justify-between gap-2 hover:bg-surface px-2 rounded cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-semibold text-ink truncate">
                        {t.title}
                      </span>
                      <span className="text-xs text-subdued truncate">
                        • {t.projectName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 text-xs text-ink-lighter">
                      <span>{t.assignee}</span>
                      <span className="font-medium text-ink">{t.dueDate}</span>
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
