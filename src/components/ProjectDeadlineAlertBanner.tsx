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
} from 'lucide-react';

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
    overdueCount > 0 ? 'border-[#fecaca]' : todayCount > 0 ? 'border-[#fde68a]' : 'border-[#e0e0e0]';
  const headerBgColor =
    overdueCount > 0 ? 'bg-[#fff5f5]' : todayCount > 0 ? 'bg-[#fffdf5]' : 'bg-[#fafafa]';

  return (
    <div className={`rounded-[12px] border ${headerBorderColor} shadow-2xs overflow-hidden transition-all duration-200 bg-white`}>
      {/* Banner Header: Ngắn gọn, súc tích chuẩn EDITOR.md */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className={`px-4 py-2.5 ${headerBgColor} flex items-center justify-between cursor-pointer select-none border-b border-[#f0f0f0]`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
              overdueCount > 0
                ? 'bg-[#fee2e2] text-[#dc2626] animate-pulse'
                : todayCount > 0
                ? 'bg-[#fef3c7] text-[#d97706]'
                : 'bg-[#fef9c3] text-[#ca8a04]'
            }`}
          >
            {overdueCount > 0 ? (
              <AlertTriangle className="w-3.5 h-3.5" />
            ) : (
              <Clock className="w-3.5 h-3.5" />
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <h4 className="font-title text-sm font-bold text-[#202020]">
              Cảnh báo tiến độ: {alerts.length} mốc dự án
            </h4>

            {/* Badges count breakdown - Ngắn gọn */}
            <div className="flex items-center gap-1.5 text-[11px] font-ui">
              {overdueCount > 0 && (
                <span className="px-2 py-0.2 rounded-full bg-[#fef2f2] text-[#dc2626] border border-[#fecaca] font-bold">
                  {overdueCount} quá hạn
                </span>
              )}
              {todayCount > 0 && (
                <span className="px-2 py-0.2 rounded-full bg-[#fffbeb] text-[#d97706] border border-[#fde68a] font-bold">
                  {todayCount} hôm nay
                </span>
              )}
              {soonCount > 0 && (
                <span className="px-2 py-0.2 rounded-full bg-[#fefce8] text-[#ca8a04] border border-[#fef08a] font-bold">
                  {soonCount} sắp đến hạn
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          aria-label={isExpanded ? 'Thu gọn cảnh báo' : 'Mở rộng cảnh báo'}
          className="p-1 rounded-md text-[#707070] hover:text-[#202020] hover:bg-black/5 transition-colors cursor-pointer shrink-0 ml-2"
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Alert Items List: Bố cục 2 tầng chuẩn mực, không xô lệch */}
      {isExpanded && (
        <div className="divide-y divide-[#f0f0f0] max-h-[380px] overflow-y-auto">
          {alerts.map((item) => {
            const isOverdue = item.urgency === 'overdue';
            const isToday = item.urgency === 'today';

            const badgeClasses = isOverdue
              ? 'bg-[#fef2f2] text-[#dc2626] border-[#fecaca]'
              : isToday
              ? 'bg-[#fffbeb] text-[#d97706] border-[#fde68a]'
              : 'bg-[#fefce8] text-[#ca8a04] border-[#fef08a]';

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
                className="p-3.5 sm:p-4 hover:bg-[#fafafa] transition-colors flex flex-col gap-1.5"
              >
                {/* TẦNG 1: Badge tình trạng + Tiêu đề mốc + Nút tác vụ (Căn hàng ngang hoàn hảo) */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    {/* Urgency Badge */}
                    <span
                      className={`text-[11px] font-ui px-2 py-0.5 rounded-full border shrink-0 font-bold mt-0.5 ${badgeClasses}`}
                    >
                      {badgeLabel}
                    </span>

                    {/* Milestone Title + Code */}
                    <div className="min-w-0 flex-1 flex items-baseline gap-2 flex-wrap">
                      <span className="font-title text-[14px] font-bold text-[#202020] leading-snug">
                        {cleanTitle}
                      </span>

                      <span className="text-[11px] font-num px-1.5 py-0.2 rounded bg-[#f4f4f5] text-[#52525b] border border-[#e4e4e7] shrink-0">
                        {item.projectCode}
                      </span>
                    </div>
                  </div>

                  {/* Right Action Buttons */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {onFilterProjectTasks && (
                      <button
                        type="button"
                        onClick={() => onFilterProjectTasks(item.projectId)}
                        className="px-2.5 py-1 text-xs font-ui rounded-[6px] text-[#52525b] hover:text-[#18181b] hover:bg-[#f4f4f5] border border-[#d4d4d8] flex items-center gap-1 cursor-pointer transition-colors"
                        title="Lọc danh sách công việc của dự án này"
                      >
                        <Filter className="w-3.5 h-3.5 text-[#71717a]" />
                        <span>Xem việc</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onOpenProjectDetail(item.projectId)}
                      className="px-2.5 py-1 text-xs font-ui rounded-[6px] bg-[#fcf0f5] text-[#963861] hover:bg-[#fae1ed] border border-[#f3c2d4] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Mở chi tiết dự án"
                    >
                      <span>Chi tiết</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* TẦNG 2: Dải Metadata phẳng, thụt lề pl-8 thẳng hàng với tiêu đề, phân tách bằng dấu chấm • */}
                <div className="pl-8 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-ui text-[#71717a]">
                  {/* Tên Dự án (chỉ hiện khi mục là Giai đoạn) */}
                  {item.type === 'phase' && (
                    <>
                      <button
                        type="button"
                        onClick={() => onOpenProjectDetail(item.projectId)}
                        className="inline-flex items-center gap-1 text-[#52525b] hover:text-[#963861] hover:underline cursor-pointer font-normal"
                        title="Xem thông tin dự án"
                      >
                        <Folder className="w-3 h-3 text-[#963861]" />
                        <span>{item.projectName}</span>
                      </button>
                      <span className="text-[#d4d4d8]">•</span>
                    </>
                  )}

                  {/* Phân loại mốc */}
                  <span className="inline-flex items-center gap-1 text-[#52525b]">
                    {item.type === 'phase' ? (
                      <>
                        <Layers className="w-3 h-3 text-[#71717a]" />
                        <span>Giai đoạn</span>
                      </>
                    ) : (
                      <>
                        <Flag className="w-3 h-3 text-[#1d508d]" />
                        <span className="text-[#1d508d] font-semibold">Deadline dự án</span>
                      </>
                    )}
                  </span>

                  <span className="text-[#d4d4d8]">•</span>

                  {/* Hạn chót */}
                  <span
                    className={`inline-flex items-center gap-1 ${
                      isOverdue
                        ? 'text-[#be123c] font-bold'
                        : isToday
                        ? 'text-[#c2410c] font-bold'
                        : 'text-[#52525b]'
                    }`}
                    title={`Hạn: ${formatDateWithEnDay(item.dueDate)}`}
                  >
                    <Clock className="w-3 h-3" />
                    <span>Hạn chót: {dueDisplay || formatDateWithEnDay(item.dueDate)}</span>
                  </span>

                  <span className="text-[#d4d4d8]">•</span>

                  {/* PM phụ trách */}
                  <span className="text-[#52525b]">
                    PM: <span className="text-[#202020] font-medium">{pmText}</span>
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
