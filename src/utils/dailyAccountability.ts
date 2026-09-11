/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MemberItem, TaskItem } from '../types';
import { getUserRole } from './rbac';
import { isTaskForMember } from './memberPersonalization';
import { getTodayDateString } from './dateUtils';
import { formatDateWithEnDay } from './formatters';

export interface MemberAccountabilityStatus {
  member: MemberItem;
  role: 'Manager' | 'Executive';
  completedTasksCount: number;
  completedTasks: TaskItem[];
  activeTasksCount: number;
  activeTasks: TaskItem[];
  hasCompletedToday: boolean;
}

export interface DailyAccountabilityResult {
  dateStr: string;
  totalApplicable: number;
  missingMembers: MemberAccountabilityStatus[];
  compliantMembers: MemberAccountabilityStatus[];
  allStatuses: MemberAccountabilityStatus[];
  isCurrentUserMissing: boolean;
  currentUserStatus?: MemberAccountabilityStatus;
}

/**
 * Kiểm tra xem một công việc có được hoàn thành trong ngày mục tiêu (mặc định hôm nay) không
 */
export function isTaskCompletedOnDate(task: TaskItem, targetDateStr: string = getTodayDateString()): boolean {
  if (task.status !== 'Hoàn thành') return false;

  // 1. Kiểm tra trường completedAt chuẩn
  if (task.completedAt) {
    return task.completedAt.startsWith(targetDateStr);
  }

  // 2. Kiểm tra nhật ký thay đổi trạng thái sang 'Hoàn thành' trong ngày
  if (task.logs && task.logs.length > 0) {
    const hasLogToday = task.logs.some((log) => {
      const isCompleteAction =
        log.action?.toLowerCase().includes('hoàn thành') ||
        log.changes?.some(
          (c) => c.field?.toLowerCase().includes('trạng thái') && c.newValue === 'Hoàn thành'
        );
      return (
        isCompleteAction &&
        (log.timestamp.startsWith(targetDateStr) || log.timestamp.includes(targetDateStr))
      );
    });
    if (hasLogToday) return true;
  }

  // 3. Fallback: updatedAt trong ngày
  if (task.updatedAt && task.updatedAt.startsWith(targetDateStr)) {
    return true;
  }

  // 4. Fallback: dueDate trong ngày
  if (task.dueDate === targetDateStr) {
    return true;
  }

  return false;
}

/**
 * Tính toán thống kê hoàn thành công việc trong ngày của toàn bộ nhân sự cấp Manager & Executive
 */
export function getDailyAccountabilityStats(
  members: MemberItem[],
  tasks: TaskItem[],
  targetDateStr: string = getTodayDateString(),
  currentAuthUser?: MemberItem | null
): DailyAccountabilityResult {
  // Lọc danh sách nhân sự áp dụng: Cấp Manager và Executive thuộc Ban Sản phẩm
  const applicableMembers = members.filter((m) => {
    const role = getUserRole(m);
    const isProductTeam =
      m.team && ['Product Manager', 'UX/UI Designer', 'SEO', 'Data'].includes(m.team);
    return isProductTeam && (role === 'Manager' || role === 'Executive');
  });

  const allStatuses: MemberAccountabilityStatus[] = applicableMembers.map((member) => {
    const role = getUserRole(member) as 'Manager' | 'Executive';

    // Toàn bộ công việc thuộc nhân sự này
    const memberTasks = tasks.filter((t) => isTaskForMember(t, member));

    // Công việc hoàn thành trong ngày hôm nay
    const completedTasks = memberTasks.filter((t) => isTaskCompletedOnDate(t, targetDateStr));

    // Công việc đang làm / chưa xong
    const activeTasks = memberTasks.filter((t) => t.status !== 'Hoàn thành');

    const hasCompletedToday = completedTasks.length > 0;

    return {
      member,
      role,
      completedTasksCount: completedTasks.length,
      completedTasks,
      activeTasksCount: activeTasks.length,
      activeTasks,
      hasCompletedToday,
    };
  });

  // Phân loại: Chưa hoàn thành task ngày vs Đã hoàn thành
  const missingMembers = allStatuses
    .filter((s) => !s.hasCompletedToday)
    .sort((a, b) => {
      // Ưu tiên Manager lên trước, sau đó theo số việc đang làm giảm dần
      if (a.role !== b.role) {
        return a.role === 'Manager' ? -1 : 1;
      }
      return b.activeTasksCount - a.activeTasksCount;
    });

  const compliantMembers = allStatuses.filter((s) => s.hasCompletedToday);

  // Kiểm tra tài khoản đang đăng nhập
  const currentUserStatus = currentAuthUser
    ? allStatuses.find((s) => s.member.id === currentAuthUser.id || s.member.name === currentAuthUser.name)
    : undefined;

  const isCurrentUserMissing = currentUserStatus ? !currentUserStatus.hasCompletedToday : false;

  return {
    dateStr: targetDateStr,
    totalApplicable: applicableMembers.length,
    missingMembers,
    compliantMembers,
    allStatuses,
    isCurrentUserMissing,
    currentUserStatus,
  };
}

/**
 * Tạo nội dung văn bản đôn đốc hoàn thành task trong ngày để gửi qua nhóm chat / email
 */
export function formatDailyUrgeReport(
  stats: DailyAccountabilityResult,
  targetDate: Date = new Date()
): string {
  const dateFormatted = formatDateWithEnDay(targetDate);
  let report = `📢 CẢNH BÁO TIẾN ĐỘ HOÀN THÀNH CÔNG VIỆC TRONG NGÀY (${dateFormatted})\n`;
  report += `==========================================================\n`;
  report += `📌 Quy chuẩn: 100% nhân sự cấp Manager & Executive cần có ít nhất 1 task hoàn thành mỗi ngày.\n`;
  report += `📊 Tỷ lệ tuân thủ: ${stats.compliantMembers.length}/${stats.totalApplicable} nhân sự (${Math.round(
    (stats.compliantMembers.length / (stats.totalApplicable || 1)) * 100
  )}%)\n\n`;

  if (stats.missingMembers.length > 0) {
    report += `🚨 DANH SÁCH NHÂN SỰ CHƯA CÓ TASK HOÀN THÀNH HÔM NAY (${stats.missingMembers.length} người):\n`;
    stats.missingMembers.forEach((item, index) => {
      report += `${index + 1}. [${item.role}] ${item.member.name} (${item.member.team || 'Sản phẩm'})\n`;
      report += `   👉 Đang phụ trách: ${item.activeTasksCount} việc chưa xong`;
      if (item.activeTasks.length > 0) {
        const topTask = item.activeTasks[0];
        report += ` (Ví dụ: [${topTask.projectName}] ${topTask.title})`;
      }
      report += `\n`;
    });
    report += `\nĐề nghị các nhân sự trên khẩn trương rà soát và cập nhật kết quả các đầu việc đang thực hiện!\n`;
  } else {
    report += `🎉 XUẤT SẮC: 100% nhân sự Manager & Executive đã có công việc hoàn thành trong ngày hôm nay!\n`;
  }

  report += `==========================================================\n`;
  return report;
}
