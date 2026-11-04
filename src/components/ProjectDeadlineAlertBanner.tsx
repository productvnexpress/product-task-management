/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { ProjectItem, TaskItem, MemberItem } from '../types';
import {
  ProjectDeadlineAlertItem,
  getProjectDeadlineAlerts,
} from '../utils/projectDeadlineAlerts';
import { formatDateWithEnDay } from '../utils/formatters';
import { formatTaskDueDisplay } from '../utils/dateUtils';
import {
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronUp,
  Folder,
  Layers,
  Flag,
  ArrowRight,
  Filter,
} from './vds/icons';

interface ProjectDeadlineAlertBannerProps {
  projects: ProjectItem[];
  tasks: TaskItem[];
  members: MemberItem[];
  currentAuthUser: MemberItem | null;
  activeProductMember?: MemberItem | null;
  onOpenProjectDetail: (projectId: string) => void;
  onFilterProjectTasks?: (projectId: string) => void;
}

export const ProjectDeadlineAlertBanner: React.FC<ProjectDeadlineAlertBannerProps> = ({
  projects,
  tasks,
  members,
  currentAuthUser,
  activeProductMember,
  onOpenProjectDetail,
  onFilterProjectTasks,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Nhân sự tác nghiệp hiệu lực: Ưu tiên activeProductMember (tài khoản đang chọn trong thanh perspective), fallback về currentAuthUser
  const effectiveMember = activeProductMember || currentAuthUser;

  // Lọc cảnh báo trực tiếp theo account (chỉ lấy các dự án mà nhân sự này phụ trách hoặc trực tiếp tham gia)
  const alerts = useMemo(
    () => getProjectDeadlineAlerts(projects, tasks, members, effectiveMember, false),
    [projects, tasks, members, effectiveMember]
  );

  if (alerts.length === 0) return null;

  const overdueCount = alerts.filter((a) => a.urgency === 'overdue').length;
  const todayCount = alerts.filter((a) => a.urgency === 'today').length;
  const soonCount = alerts.filter((a) => a.urgency === 'soon').length;

  const headerBorderColor =
    overdueCount > 0 ? 'border-line' : todayCount > 0 ? 'border-line' : 'border-line';
  const headerBgColor =
    overdueCount > 0 ? 'bg-surface-negative' : todayCount > 0 ? 'bg-surface-warning' : 'bg-surface-100';

  return (
    <div className={`rounded-vds-lg border ${headerBorderColor} overflow-hidden transition duration-200 bg-surface`}>
      {/* Banner Header: Ngắn gọn, súc tích chuẩn EDITOR.md */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className={`px-4 py-2.5 ${headerBgColor} flex items-center justify-between cursor-pointer select-none border-b border-divider`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
              overdueCount > 0
                ? 'bg-surface-negative text-negative animate-pulse'
                : todayCount > 0
                ? 'bg-surface-warning text-warning'
                : 'bg-surface-warning text-warning'
            }`}
          >
            {overdueCount > 0 ? (
              <AlertTriangle className="w-3.5 h-3.5" />
            ) : (
              <Clock className="w-3.5 h-3.5" />
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <h4 className="font-title text-sm font-bold text-ink">
              Cảnh báo tiến độ: {alerts.length} mốc dự án
            </h4>

            {/* Badges count breakdown - Ngắn gọn */}
            <div className="flex items-center gap-1.5 text-xs font-ui">
              {overdueCount > 0 && (
                <span className="px-2 py-0.2 rounded-full bg-surface-negative text-negative border border-line font-bold">
                  {overdueCount} quá hạn
                </span>
              )}
              {todayCount > 0 && (
                <span className="px-2 py-0.2 rounded-full bg-surface-warning text-warning border border-line font-bold">
                  {todayCount} hôm nay
                </span>
              )}
              {soonCount > 0 && (
                <span className="px-2 py-0.2 rounded-full bg-surface-warning text-warning border border-line font-bold">
                  {soonCount} sắp đến hạn
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          aria-label={isExpanded ? 'Thu gọn cảnh báo' : 'Mở rộng cảnh báo'}
          className="p-1 rounded-md text-ink-lighter hover:text-ink hover:bg-black/5 transition-colors cursor-pointer shrink-0 ml-2"
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Alert Items List: Bố cục 2 tầng chuẩn mực, không xô lệch */}
      {isExpanded && (
        <div className="divide-y divide-divider max-h-[380px] overflow-y-auto">
          {alerts.map((item) => {
            const isOverdue = item.urgency === 'overdue';
            const isToday = item.urgency === 'today';

            const badgeClasses = isOverdue
              ? 'bg-surface-negative text-negative border-line'
              : isToday
              ? 'bg-surface-warning text-warning border-line'
              : 'bg-surface-warning text-warning border-line';

            const badgeLabel = isOverdue
              ? `Quá hạn ${Math.abs(item.diffDays)} ngày`
              : isToday
              ? 'Hôm nay'
              : `Còn ${item.diffDays} ngày`;

            // Làm sạch tiêu đề hiển thị (cắt bỏ từ lặp 'Giai đoạn X:' nếu đã có trong phaseName)
            const cleanTitle = item.type === 'phase'
              ? (item.phaseName || 'Giai đoạn').trim()
              : (item.projectName || 'Dự án').trim();

            const pmText = item.pmNames.length > 0 ? item.pmNames.join(', ') : 'Chưa phân công';
            const dueDisplay = formatTaskDueDisplay(item.dueDate);

            return (
              <div
                key={item.id}
                className="p-3.5 sm:p-4 hover:bg-surface-100 transition-colors flex flex-col gap-1.5"
              >
                {/* TẦNG 1: Badge tình trạng + Tiêu đề mốc + Nút tác vụ (Căn hàng ngang hoàn hảo) */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3">
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    {/* Urgency Badge */}
                    <span
                      className={`text-xs font-ui px-2 py-0.5 rounded-full border shrink-0 font-bold mt-0.5 ${badgeClasses}`}
                    >
                      {badgeLabel}
                    </span>

                    {/* Milestone Title + Code */}
                    <div className="min-w-0 flex-1 flex items-baseline gap-2 flex-wrap">
                      <span className="font-title text-[14px] font-bold text-ink leading-snug">
                        {cleanTitle}
                      </span>

                      <span className="text-xs font-num px-1.5 py-0.2 rounded bg-surface-200 text-ink-lighter border border-line shrink-0">
                        {item.projectCode}
                      </span>
                    </div>
                  </div>

                  {/* Right Action Buttons (mobile: xuống dòng dưới tiêu đề) */}
                  <div className="flex items-center gap-1.5 shrink-0 order-3 sm:order-none">
                    {onFilterProjectTasks && (
                      <button
                        type="button"
                        onClick={() => onFilterProjectTasks(item.projectId)}
                        className="h-8 sm:h-auto px-2.5 py-1 text-xs font-ui rounded-vds-lg text-ink-lighter hover:text-ink hover:bg-surface-200 border border-line flex items-center gap-1 cursor-pointer transition-colors"
                        title="Lọc danh sách công việc của dự án này"
                      >
                        <Filter className="w-3.5 h-3.5 text-subdued" />
                        <span>Xem việc</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onOpenProjectDetail(item.projectId)}
                      className="h-8 sm:h-auto px-2.5 py-1 text-xs font-ui rounded-vds-lg bg-surface-accent-faint text-accent hover:bg-surface-accent border border-line font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Mở chi tiết dự án"
                    >
                      <span>Chi tiết</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* TẦNG 2: Dải Metadata phẳng, thụt lề pl-8 thẳng hàng với tiêu đề, phân tách bằng dấu chấm • */}
                <div className="sm:pl-8 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-ui text-subdued">
                  {/* Tên Dự án (chỉ hiện khi mục là Giai đoạn) */}
                  {item.type === 'phase' && (
                    <>
                      <button
                        type="button"
                        onClick={() => onOpenProjectDetail(item.projectId)}
                        className="inline-flex items-center gap-1 text-ink-lighter hover:text-accent hover:underline cursor-pointer font-normal"
                        title="Xem thông tin dự án"
                      >
                        <Folder className="w-3 h-3 text-accent" />
                        <span>{item.projectName}</span>
                      </button>
                      <span className="text-icon-subdued">•</span>
                    </>
                  )}

                  {/* Phân loại mốc */}
                  <span className="inline-flex items-center gap-1 text-ink-lighter">
                    {item.type === 'phase' ? (
                      <>
                        <Layers className="w-3 h-3 text-subdued" />
                        <span>Giai đoạn</span>
                      </>
                    ) : (
                      <>
                        <Flag className="w-3 h-3 text-support" />
                        <span className="text-support font-semibold">Deadline dự án</span>
                      </>
                    )}
                  </span>

                  <span className="text-icon-subdued">•</span>

                  {/* Hạn chót */}
                  <span
                    className={`inline-flex items-center gap-1 ${
                      isOverdue
                        ? 'text-negative font-bold'
                        : isToday
                        ? 'text-warning font-bold'
                        : 'text-ink-lighter'
                    }`}
                    title={`Hạn: ${formatDateWithEnDay(item.dueDate)}`}
                  >
                    <Clock className="w-3 h-3" />
                    <span>Hạn chót: {dueDisplay || formatDateWithEnDay(item.dueDate)}</span>
                  </span>

                  <span className="text-icon-subdued">•</span>

                  {/* PM phụ trách */}
                  <span className="text-ink-lighter">
                    PM: <span className="text-ink font-medium">{pmText}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
