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
} from './vds/icons';

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
  // Mobile: thu gọn mặc định để danh sách việc lên đầu màn hình; ghi nhớ lựa chọn trong ngày
  const expandKey = `wms_daily_alert_expanded_${new Date().toDateString()}`;
  const [isExpanded, setIsExpandedState] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(expandKey);
      if (saved !== null) return saved === '1';
    } catch {}
    return typeof window === 'undefined' || window.innerWidth >= 768;
  });
  const setIsExpanded = (v: boolean) => {
    setIsExpandedState(v);
    try {
      localStorage.setItem(expandKey, v ? '1' : '0');
    } catch {}
  };

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

    if (execMember.isOnLeaveToday || execMember.hasTaskDueToday) {
      return null;
    }

    // Executive chưa có task đến hạn hôm nay
    return (
      <div className="bg-surface-warning border border-line rounded-vds-lg px-3.5 py-2.5 transition flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-warning-solid/20 text-warning flex items-center justify-center shrink-0">
            <Clock className="w-3.5 h-3.5 text-warning" />
          </div>
          <h4 className="font-title text-xs font-semibold text-warning">
            Cảnh báo: Bạn chưa có task đến hạn hôm nay
          </h4>
        </div>

        <button
          type="button"
          onClick={() => onSelectAssignee(execMember.member.name)}
          className="px-2.5 py-1 rounded-vds-lg text-xs font-ui font-semibold bg-warning-solid text-on-color hover:bg-warning-solid cursor-pointer transition shrink-0"
        >
          Xem việc của tôi ({execMember.activeTasksCount})
        </button>
      </div>
    );
  }

  // --- TRƯỜNG HỢP 2 & 3: MANAGER HOẶC ADMIN ---
  // Nếu 100% nhân sự trong phạm vi đã có task đến hạn -> không hiển thị banner
  if (stats.missingMembers.length === 0) {
    return null;
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
    <div className="h-full flex flex-col bg-surface-100 border border-line-warning/40 rounded-vds-lg overflow-hidden transition">
      {/* Header Banner - Ngắn gọn, súc tích */}
      <div
        className="px-3.5 py-2.5 bg-surface-warning flex items-center justify-between gap-2 cursor-pointer select-none min-h-[44px] border-b border-line"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-full bg-warning-solid/20 text-warning flex items-center justify-center shrink-0">
            <AlertTriangle className="w-3.5 h-3.5 text-warning" />
          </div>
          <h4 className="font-title text-[13px] font-semibold text-warning truncate">
            Cảnh báo: {stats.missingMembers.length} nhân sự chưa có task đến hạn hôm nay
          </h4>
        </div>

        {/* Nút thu gọn / mở rộng */}
        <button
          type="button"
          className="p-1 text-warning hover:bg-surface-warning rounded-vds-md transition-colors shrink-0 cursor-pointer"
          title={isExpanded ? 'Thu gọn' : 'Mở rộng'}
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Body: Liệt kê tên ngắn gọn dạng Tên Họ sắp xếp ABC */}
      {isExpanded && (
        <div className="flex-1 px-3.5 py-2.5 bg-surface flex flex-col justify-start">
          {/* Danh sách tên Tên Họ sắp xếp ABC */}
          <div className="text-xs font-ui leading-relaxed">
            <div className="text-warning font-semibold mb-1">
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
                          ? 'bg-surface-selected text-accent font-semibold px-1.5 py-0.5 ring-1 ring-inset ring-line-accent-soft'
                          : 'text-warning hover:text-warning'
                      }`}
                      title={`${item.member.name} (${item.member.team || item.role}) - ${item.activeTasksCount} việc đang phụ trách`}
                    >
                      {displayName}
                    </button>
                    {idx < sortedMissingMembers.length - 1 && (
                      <span className="text-warning select-none mr-1.5">,</span>
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
