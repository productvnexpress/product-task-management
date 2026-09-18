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
import { getUserRole } from '../utils/rbac';
import {
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronUp,
  Folder,
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

  const currentUser = activeProductMember || currentAuthUser;
  const role = getUserRole(currentUser);
  const isAdmin = role === 'Admin';

  const alerts = useMemo(
    () => getProjectDeadlineAlerts(projects, tasks, members, currentUser, isAdmin),
    [projects, tasks, members, currentUser, isAdmin]
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
      {/* Banner Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className={`px-4 py-3 ${headerBgColor} flex items-center justify-between cursor-pointer select-none`}
      >
        <div className="flex items-center gap-2.5 flex-wrap">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
              overdueCount > 0
                ? 'bg-[#fee2e2] text-[#dc2626] animate-pulse'
                : todayCount > 0
                ? 'bg-[#fef3c7] text-[#d97706]'
                : 'bg-[#fef9c3] text-[#ca8a04]'
            }`}
          >
            {overdueCount > 0 ? (
              <AlertTriangle className="w-4 h-4" />
            ) : (
              <Clock className="w-4 h-4" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-title text-sm font-bold text-[#202020]">
                {isAdmin
                  ? `Cảnh báo: ${alerts.length} mốc giai đoạn & dự án cần lưu ý (Trước 3 ngày)`
                  : `Cảnh báo: ${alerts.length} mốc giai đoạn & dự án của bạn cần lưu ý (Trước 3 ngày)`}
              </h4>

              {/* Badges count breakdown */}
              <div className="flex items-center gap-1.5 text-[11px] font-ui">
                {overdueCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-[#fef2f2] text-[#dc2626] border border-[#fecaca] font-bold">
                    {overdueCount} quá hạn
                  </span>
                )}
                {todayCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-[#fffbeb] text-[#d97706] border border-[#fde68a] font-bold">
                    {todayCount} hôm nay
                  </span>
                )}
                {soonCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-[#fefce8] text-[#ca8a04] border border-[#fef08a] font-bold">
                    {soonCount} sắp đến hạn
                  </span>
                )}
              </div>
            </div>
            <p className="text-xs text-[#707070] font-ui mt-0.5">
              Tự động cảnh báo trước 3 ngày cho PM phụ trách và nhân sự dự án để đảm bảo tiến độ
            </p>
          </div>
        </div>

        <button
          type="button"
          aria-label={isExpanded ? 'Thu gọn cảnh báo' : 'Mở rộng cảnh báo'}
          className="p-1 rounded-md text-[#707070] hover:text-[#202020] hover:bg-black/5 transition-colors cursor-pointer"
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Expanded Alert Items List */}
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

            const pmText = item.pmNames.length > 0 ? item.pmNames.join(', ') : 'Chưa phân công';

            return (
              <div
                key={item.id}
                className="p-3 sm:px-4 hover:bg-[#fafafa] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
              >
                {/* Left info column */}
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <span
                    className={`text-[11px] font-ui px-2 py-0.5 rounded-full border shrink-0 font-bold ${badgeClasses}`}
                  >
                    {badgeLabel}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-title text-sm font-bold text-[#202020]">
                        {item.type === 'phase' ? (
                          <>
                            Giai đoạn: <span className="text-[#b13460] font-semibold">{item.phaseName}</span>
                          </>
                        ) : (
                          <>
                            Deadline dự án: <span className="text-[#1d508d] font-semibold">{item.projectName}</span>
                          </>
                        )}
                      </span>

                      <span className="text-[11px] font-num px-1.5 py-0.2 rounded bg-[#f0f0f0] text-[#505050] border border-[#d8d8d8]">
                        {item.projectCode}
                      </span>
                    </div>

                    {/* Meta line */}
                    <div className="flex items-center gap-3 text-xs text-[#606060] font-ui mt-0.5 flex-wrap">
                      {item.type === 'phase' && (
                        <span className="flex items-center gap-1 text-[#404040]">
                          <Folder className="w-3.5 h-3.5 text-[#963861]" />
                          {item.projectName}
                        </span>
                      )}

                      <span>
                        Hạn chót: <strong className="text-[#202020] font-semibold">{formatDateWithEnDay(item.dueDate)}</strong>
                      </span>

                      <span>
                        PM phụ trách: <span className="text-[#404040]">{pmText}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right action buttons */}
                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center pl-8 sm:pl-0">
                  {onFilterProjectTasks && (
                    <button
                      type="button"
                      onClick={() => onFilterProjectTasks(item.projectId)}
                      className="px-2.5 py-1 text-xs font-ui rounded-md text-[#505050] hover:text-[#202020] hover:bg-[#eaeaea] border border-[#d8d8d8] flex items-center gap-1 cursor-pointer transition-colors"
                      title="Lọc danh sách công việc của dự án này"
                    >
                      <Filter className="w-3.5 h-3.5" />
                      <span>Xem việc</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onOpenProjectDetail(item.projectId)}
                    className="px-2.5 py-1 text-xs font-ui rounded-md bg-[#fcf0f5] text-[#b13460] hover:bg-[#fae1ed] border border-[#f3c2d4] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                    title="Mở chi tiết dự án"
                  >
                    <span>Chi tiết dự án</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
