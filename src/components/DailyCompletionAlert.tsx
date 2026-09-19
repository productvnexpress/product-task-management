/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { MemberItem, TaskItem, ProjectItem } from '../types';
import {
  getDailyDueTaskStats,
  DueTaskMemberStatus,
} from '../utils/dailyAccountability';
import { isSamePersonName } from '../utils/memberPersonalization';
import { workingTimeService } from '../services/workingTimeService';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
} from 'lucide-react';

interface DailyCompletionAlertProps {
  members: MemberItem[];
  tasks: TaskItem[];
  projects: ProjectItem[];
  currentAuthUser?: MemberItem | null;
  activeProductMember?: MemberItem | null;
  onSelectAssignee: (assigneeName: string) => void;
  selectedAssignee?: string;
}

/**
 * Trả về tên hiển thị dạng "Tên Họ" để dễ dàng nhận biết khi có nhân sự trùng tên (ví dụ: Trung Tiêu, Trung Vũ)
 */
function getMemberDisplayName(member: MemberItem): string {
  const firstName = member.firstName || member.name.trim().split(/\s+/).slice(-1)[0];
  const lastName = member.lastName || member.name.trim().split(/\s+/)[0];
  if (firstName && lastName && firstName.toLowerCase() !== lastName.toLowerCase()) {
    return `${firstName} ${lastName}`;
  }
  return firstName || member.name;
}

export const DailyCompletionAlert: React.FC<DailyCompletionAlertProps> = ({
  members,
  tasks,
  projects,
  currentAuthUser,
  activeProductMember,
  onSelectAssignee,
  selectedAssignee,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Không hiển thị cảnh báo vào ngày nghỉ (cuối tuần không làm bù) hoặc ngày lễ
  const isWorkingDay = workingTimeService.isWorkingDay(new Date());
  if (!isWorkingDay) {
    return null;
  }

  const stats = getDailyDueTaskStats(
    members,
    tasks,
    projects,
    currentAuthUser,
    activeProductMember
  );

  // --- TRƯỜNG HỢP 1: EXECUTIVE (Cá nhân) ---
  if (stats.roleScope === 'Executive') {
    const execMember = stats.targetMembers[0];
    if (!execMember) return null;

    if (execMember.isOnLeaveToday) {
      return (
        <div className="bg-[#fdf4f8] border border-[#f3c2d4] rounded-[10px] px-3.5 py-2.5 shadow-2xs transition-all flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[#963861]/15 text-[#963861] flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <span className="font-title text-xs font-semibold text-[#963861]">
              Kế hoạch hôm nay: Bạn đang trong lịch nghỉ phép
            </span>
          </div>
        </div>
      );
    }

    if (execMember.hasTaskDueToday) {
      return (
        <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-[10px] px-3.5 py-2.5 shadow-2xs transition-all flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[#22c55e]/15 text-[#15803d] flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <span className="font-title text-xs font-semibold text-[#166534]">
              Kế hoạch hôm nay: Bạn có {execMember.tasksDueTodayCount} task đến hạn
            </span>
          </div>
          <button
            type="button"
            onClick={() => onSelectAssignee(execMember.member.name)}
            className="px-2.5 py-1 rounded-[6px] text-xs font-ui font-semibold bg-white border border-[#bbf7d0] text-[#15803d] hover:bg-[#dcfce7] transition-all cursor-pointer"
          >
            Xem việc hôm nay
          </button>
        </div>
      );
    }

    // Executive chưa có task đến hạn hôm nay
    return (
      <div className="bg-[#fffbeb] border border-[#fde68a] rounded-[10px] px-3.5 py-2.5 shadow-2xs transition-all flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[#f59e0b]/20 text-[#b45309] flex items-center justify-center shrink-0">
            <Clock className="w-3.5 h-3.5 text-[#d97706]" />
          </div>
          <h4 className="font-title text-xs font-semibold text-[#92400e]">
            Cảnh báo: Bạn chưa có task đến hạn hôm nay
          </h4>
        </div>

        <button
          type="button"
          onClick={() => onSelectAssignee(execMember.member.name)}
          className="px-2.5 py-1 rounded-[6px] text-xs font-ui font-semibold bg-[#ea580c] text-white hover:bg-[#c2410c] shadow-2xs cursor-pointer transition-all shrink-0"
        >
          Xem việc của tôi ({execMember.activeTasksCount})
        </button>
      </div>
    );
  }

  // --- TRƯỜNG HỢP 2 & 3: MANAGER HOẶC ADMIN ---
  const isManager = stats.roleScope === 'Manager';

  // Nếu 100% nhân sự trong phạm vi đã có task đến hạn
  if (stats.missingMembers.length === 0) {
    return (
      <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-[10px] px-3.5 py-2.5 shadow-2xs transition-all flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[#22c55e]/15 text-[#15803d] flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <h4 className="font-title text-xs font-semibold text-[#166534]">
            {isManager
              ? 'Tất cả nhân sự trong dự án đã có task đến hạn hôm nay'
              : 'Tất cả nhân sự đã có task đến hạn hôm nay'}
          </h4>
        </div>
      </div>
    );
  }

  // Sắp xếp danh sách nhân sự chưa có task theo ABC tiếng Việt của Tên gọi (firstName), nếu trùng tên thì xét tiếp theo Họ (lastName)
  const sortedMissingMembers = [...stats.missingMembers].sort((a, b) => {
    const firstA = a.member.firstName || a.member.name.trim().split(/\s+/).slice(-1)[0];
    const firstB = b.member.firstName || b.member.name.trim().split(/\s+/).slice(-1)[0];
    const cmpFirst = firstA.localeCompare(firstB, 'vi');
    if (cmpFirst !== 0) return cmpFirst;
    const lastA = a.member.lastName || a.member.name.trim().split(/\s+/)[0];
    const lastB = b.member.lastName || b.member.name.trim().split(/\s+/)[0];
    return lastA.localeCompare(lastB, 'vi');
  });

  return (
    <div className="h-full flex flex-col bg-[#fffdfa] border border-[#f59e0b]/40 rounded-[10px] shadow-2xs overflow-hidden transition-all">
      {/* Header Banner - Ngắn gọn, súc tích */}
      <div
        className="px-3.5 py-2.5 bg-[#fffbeb] flex items-center justify-between gap-2 cursor-pointer select-none min-h-[44px] border-b border-[#fef08a]"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-full bg-[#f59e0b]/20 text-[#b45309] flex items-center justify-center shrink-0">
            <AlertTriangle className="w-3.5 h-3.5 text-[#d97706]" />
          </div>
          <h4 className="font-title text-[13px] font-semibold text-[#92400e] truncate">
            Cảnh báo: {stats.missingMembers.length} nhân sự chưa có task đến hạn hôm nay
          </h4>
        </div>

        {/* Nút thu gọn / mở rộng */}
        <button
          type="button"
          className="p-1 text-[#b45309] hover:bg-[#fef3c7] rounded-[4px] transition-colors shrink-0 cursor-pointer"
          title={isExpanded ? 'Thu gọn' : 'Mở rộng'}
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Body: Liệt kê tên ngắn gọn dạng Tên Họ sắp xếp ABC */}
      {isExpanded && (
        <div className="flex-1 px-3.5 py-2.5 bg-white flex flex-col justify-start">
          {/* Danh sách tên Tên Họ sắp xếp ABC */}
          <div className="text-xs font-ui leading-relaxed">
            <div className="text-[#78350f] font-semibold mb-1">
              Nhân sự cần nhập task đến hạn hôm nay:
            </div>
            <div className="flex flex-wrap items-center gap-y-1">
              {sortedMissingMembers.map((item, idx) => {
                const displayName = getMemberDisplayName(item.member);
                const isSelected = Boolean(selectedAssignee && isSamePersonName(selectedAssignee, item.member.name));
                return (
                  <span key={item.member.id} className="inline-flex items-center">
                    <button
                      type="button"
                      onClick={() => onSelectAssignee(isSelected ? 'Tất cả' : item.member.name)}
                      className={`font-medium transition-colors cursor-pointer rounded hover:underline ${
                        isSelected
                          ? 'bg-[#92400e] text-white font-semibold px-1.5 py-0.5 shadow-2xs'
                          : 'text-[#92400e] hover:text-[#78350f]'
                      }`}
                      title={`${item.member.name} (${item.member.team || item.role}) - ${item.activeTasksCount} việc đang phụ trách`}
                    >
                      {displayName}
                    </button>
                    {idx < sortedMissingMembers.length - 1 && (
                      <span className="text-[#b45309] select-none mr-1.5">,</span>
                    )}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
