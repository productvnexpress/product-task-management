/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TaskItem, ProjectItem, MemberItem, TeamType } from '../types';
import { getTodayDateString, normalizeDateString, getDaysDifference } from './dateUtils';
import { isSamePersonName } from './memberPersonalization';
import { formatDateWithEnDay } from './formatters';

export type TimePeriod =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'custom';

export type DisciplineType =
  | 'on_time_early'       // Hoàn thành trước hạn
  | 'on_time_same_day'    // Hoàn thành đúng ngày hạn
  | 'late_next_day'       // Bấm hoàn thành vào ngày hôm sau (muộn 1 ngày)
  | 'late_after_days'     // Hoàn thành trễ từ 2 ngày trở lên
  | 'currently_overdue'   // Đang trễ hạn chưa hoàn thành
  | 'in_progress'         // Đang làm trong hạn
  | 'blocked';            // Đang bị nghẽn

export interface TaskDisciplineResult {
  task: TaskItem;
  discipline: DisciplineType;
  disciplineLabel: string;
  badgeClass: string;
  completionDate?: string;
  daysDiff: number; // completionDate - dueDate (hoặc today - dueDate nếu chưa hoàn thành)
  isCompleted: boolean;
  isOnTime: boolean;
  isLateConfirmation: boolean; // Bấm hôm sau
}

export interface ExecutiveMemberStats {
  member: MemberItem;
  role: 'PM' | 'Executive';
  totalTasks: number;
  completedTasks: number;
  completedOnTime: number;
  completedLate: number;
  lateConfirmationCount: number; // Hôm sau mới bấm
  currentlyOverdueCount: number;
  blockedCount: number;
  inProgressCount: number;
  onTimeRate: number; // %
  lateConfirmationRate: number; // %
  hasResultLinkCount: number; // Có link sản phẩm
  efficiencyRating: 'Xuất sắc' | 'Tốt' | 'Cần cải thiện';
  ratingReason: string;
  tasks: TaskItem[];
}

export interface PMLeadershipStats {
  pm: MemberItem;
  managedProjects: ProjectItem[];
  totalTeamTasks: number;
  completedTeamTasks: number;
  teamOnTimeTasks: number;
  teamOnTimeRate: number; // %
  teamOverdueTasks: number;
  teamBlockedTasks: number;
  delayedPhasesCount: number;
  personalTasksCount: number;
  leadershipRating: 'Xuất sắc' | 'Ổn định' | 'Cần hỗ trợ';
  ratingReason: string;
  projectNames: string[];
}

export interface ProjectReportStats {
  project: ProjectItem;
  totalTasks: number;
  completedTasks: number;
  onTimeTasks: number;
  lateTasks: number;
  lateConfirmationTasks: number;
  overdueTasks: number;
  blockedTasks: number;
  onTimeRate: number;
  health: 'Tốt' | 'Cảnh báo' | 'Nguy cơ trễ';
  leadPmNames: string;
  tasks: TaskItem[];
}

export interface DepartmentReportSummary {
  periodLabel: string;
  startDate: string;
  endDate: string;
  totalTasks: number;
  completedCount: number;
  completedOnTimeCount: number;
  completedLateCount: number;
  lateConfirmationCount: number; // Để hôm sau mới bấm
  currentlyOverdueCount: number;
  blockedCount: number;
  inProgressCount: number;
  overallOnTimeRate: number; // %
  overallLateConfirmationRate: number; // %
  tasksWithResultLinkRate: number; // %
  executiveStats: ExecutiveMemberStats[];
  pmStats: PMLeadershipStats[];
  projectStats: ProjectReportStats[];
  tasksAnalyzed: TaskDisciplineResult[];
}

/**
 * Tính toán mốc ngày bắt đầu và kết thúc theo chuẩn lịch
 */
export function getTimePeriodDateRange(
  period: TimePeriod,
  customStart?: string,
  customEnd?: string,
  refDate: Date = new Date()
): { startDate: string; endDate: string; label: string } {
  const todayStr = getTodayDateString(refDate);

  if (period === 'today') {
    return {
      startDate: todayStr,
      endDate: todayStr,
      label: `Hôm nay (${formatDateWithEnDay(todayStr)})`,
    };
  }

  if (period === 'yesterday') {
    const yDate = new Date(refDate);
    yDate.setDate(yDate.getDate() - 1);
    const yStr = getTodayDateString(yDate);
    return {
      startDate: yStr,
      endDate: yStr,
      label: `Hôm qua (${formatDateWithEnDay(yStr)})`,
    };
  }

  if (period === 'this_week') {
    const d = new Date(refDate);
    const day = d.getDay(); // 0 = CN, 1 = T2
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(d);
    monday.setDate(d.getDate() + diffToMonday);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const mStr = getTodayDateString(monday);
    const sStr = getTodayDateString(sunday);
    return {
      startDate: mStr,
      endDate: sStr,
      label: `Tuần này (${formatDateWithEnDay(mStr)} – ${formatDateWithEnDay(sStr)})`,
    };
  }

  if (period === 'last_week') {
    const d = new Date(refDate);
    const day = d.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const prevMonday = new Date(d);
    prevMonday.setDate(d.getDate() + diffToMonday - 7);

    const prevSunday = new Date(prevMonday);
    prevSunday.setDate(prevMonday.getDate() + 6);

    const mStr = getTodayDateString(prevMonday);
    const sStr = getTodayDateString(prevSunday);
    return {
      startDate: mStr,
      endDate: sStr,
      label: `Tuần trước (${formatDateWithEnDay(mStr)} – ${formatDateWithEnDay(sStr)})`,
    };
  }

  if (period === 'this_month') {
    const year = refDate.getFullYear();
    const month = refDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const fStr = getTodayDateString(firstDay);
    const lStr = getTodayDateString(lastDay);
    return {
      startDate: fStr,
      endDate: lStr,
      label: `Tháng ${month + 1}/${year} (${formatDateWithEnDay(fStr)} – ${formatDateWithEnDay(lStr)})`,
    };
  }

  if (period === 'last_month') {
    const year = refDate.getFullYear();
    const month = refDate.getMonth();
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);

    const fStr = getTodayDateString(firstDay);
    const lStr = getTodayDateString(lastDay);
    const prevMonthNum = firstDay.getMonth() + 1;
    const prevYearNum = firstDay.getFullYear();
    return {
      startDate: fStr,
      endDate: lStr,
      label: `Tháng trước (${prevMonthNum}/${prevYearNum})`,
    };
  }

  // Custom
  const s = customStart || todayStr;
  const e = customEnd || todayStr;
  return {
    startDate: s <= e ? s : e,
    endDate: s <= e ? e : s,
    label: `Khoảng ngày (${formatDateWithEnDay(s)} – ${formatDateWithEnDay(e)})`,
  };
}

/**
 * Chuyển đổi chuỗi ngày định dạng tiếng Anh ("Tue, 22 Sep 2026 • 01:00" hoặc "22 Sep 2026") sang ISO YYYY-MM-DD
 */
export function parseFormattedEnDate(str?: string): string | undefined {
  if (!str || typeof str !== 'string') return undefined;
  const isoMatch = str.match(/\b\d{4}-\d{2}-\d{2}\b/);
  if (isoMatch) return isoMatch[0];

  const monthMap: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
  };

  const match = str.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})/i);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = monthMap[match[2].toLowerCase()];
    const year = match[3];
    return `${year}-${month}-${day}`;
  }

  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return normalizeDateString(d.toISOString());
  }

  return undefined;
}

/**
 * Trích xuất ngày hoàn thành thực tế của công việc
 */
export function getTaskCompletionDate(task: TaskItem): string | undefined {
  if (task.completedAt) {
    return normalizeDateString(task.completedAt);
  }

  // Tìm trong audit logs
  if (task.logs && task.logs.length > 0) {
    // 1. Ưu tiên tìm log điều chỉnh thời điểm hoàn thành của Admin gần nhất
    const adjustLog = task.logs.find(
      (l) =>
        l.changes?.some((c) => c.field === 'Thời điểm hoàn thành') ||
        l.action?.includes('Điều chỉnh thời điểm hoàn thành') ||
        l.action?.includes('Xác nhận hoàn thành đúng hạn')
    );
    if (adjustLog) {
      const change = adjustLog.changes?.find((c) => c.field === 'Thời điểm hoàn thành');
      if (change && change.newValue) {
        const parsed = parseFormattedEnDate(change.newValue);
        if (parsed) return parsed;
      }
      if (adjustLog.timestamp) {
        return normalizeDateString(adjustLog.timestamp);
      }
    }

    // 2. Tìm log hoàn thành thông thường
    const completionLog = task.logs.find(
      (l) =>
        l.changes?.some(
          (c) => c.field === 'Trạng thái' && c.newValue === 'Hoàn thành'
        ) || l.action?.toLowerCase().includes('hoàn thành')
    );
    if (completionLog && completionLog.timestamp) {
      return normalizeDateString(completionLog.timestamp);
    }
  }

  // Nếu trạng thái đã là Hoàn thành, fallback updatedAt
  if (task.status === 'Hoàn thành' && task.updatedAt) {
    return normalizeDateString(task.updatedAt);
  }

  return undefined;
}

/**
 * Phân tích kỷ luật hoàn thành cho từng task
 */
export function analyzeTaskDiscipline(
  task: TaskItem,
  refDate: Date = new Date()
): TaskDisciplineResult {
  const todayStr = getTodayDateString(refDate);
  const isCompleted = task.status === 'Hoàn thành';
  const taskDueDate = normalizeDateString(task.dueDate);

  if (isCompleted) {
    const completionDate = getTaskCompletionDate(task) || todayStr;
    const daysDiff = getDaysDifference(completionDate, taskDueDate);

    if (daysDiff < 0) {
      return {
        task,
        discipline: 'on_time_early',
        disciplineLabel: 'Hoàn thành trước hạn',
        badgeClass: 'bg-[#f0fdf4] text-[#166534] border-[#bbf7d0]',
        completionDate,
        daysDiff,
        isCompleted: true,
        isOnTime: true,
        isLateConfirmation: false,
      };
    }

    if (daysDiff === 0) {
      return {
        task,
        discipline: 'on_time_same_day',
        disciplineLabel: 'Hoàn thành đúng ngày hạn',
        badgeClass: 'bg-[#f0fdf4] text-[#15803d] border-[#bbf7d0]',
        completionDate,
        daysDiff,
        isCompleted: true,
        isOnTime: true,
        isLateConfirmation: false,
      };
    }

    if (daysDiff === 1) {
      return {
        task,
        discipline: 'late_next_day',
        disciplineLabel: 'Hoàn thành sau hạn (+1 ngày)',
        badgeClass: 'bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe]',
        completionDate,
        daysDiff,
        isCompleted: true,
        isOnTime: false,
        isLateConfirmation: true,
      };
    }

    // daysDiff > 1
    return {
      task,
      discipline: 'late_after_days',
      disciplineLabel: `Hoàn thành trễ ${daysDiff} ngày`,
      badgeClass: 'bg-[#fff1f2] text-[#be123c] border-[#fecdd3]',
      completionDate,
      daysDiff,
      isCompleted: true,
      isOnTime: false,
      isLateConfirmation: false,
    };
  }

  // Task chưa hoàn thành
  const overdueDiff = getDaysDifference(todayStr, taskDueDate);
  if (overdueDiff > 0) {
    return {
      task,
      discipline: 'currently_overdue',
      disciplineLabel: `Đang quá hạn ${overdueDiff} ngày`,
      badgeClass: 'bg-[#fef2f2] text-[#dc2626] border-[#fecaca]',
      daysDiff: overdueDiff,
      isCompleted: false,
      isOnTime: false,
      isLateConfirmation: false,
    };
  }

  if (task.status === 'Bị nghẽn') {
    return {
      task,
      discipline: 'blocked',
      disciplineLabel: 'Đang bị nghẽn',
      badgeClass: 'bg-[#fff7ed] text-[#c2410c] border-[#ffedd5]',
      daysDiff: overdueDiff,
      isCompleted: false,
      isOnTime: false,
      isLateConfirmation: false,
    };
  }

  return {
    task,
    discipline: 'in_progress',
    disciplineLabel: 'Đang làm trong hạn',
    badgeClass: 'bg-[#f8fafc] text-[#475569] border-[#e2e8f0]',
    daysDiff: overdueDiff,
    isCompleted: false,
    isOnTime: true,
    isLateConfirmation: false,
  };
}

/**
 * Kiểm tra xem công việc có thuộc kỳ báo cáo hay không
 * Tiêu chí: Hạn hoàn thành nằm trong kỳ, HOẶC ngày hoàn thành thực tế nằm trong kỳ
 */
export function isTaskInPeriod(
  task: TaskItem,
  startDate: string,
  endDate: string
): boolean {
  const taskDue = normalizeDateString(task.dueDate);
  const completionDate = getTaskCompletionDate(task);

  const dueInRange = taskDue >= startDate && taskDue <= endDate;
  const compInRange = completionDate ? completionDate >= startDate && completionDate <= endDate : false;

  return dueInRange || compInRange;
}

/**
 * Tính toán toàn bộ Báo cáo Tổng quan cho Admin
 */
export function generateDepartmentReport(
  allTasks: TaskItem[],
  allProjects: ProjectItem[],
  allMembers: MemberItem[],
  period: TimePeriod,
  filterOptions?: {
    projectId?: string;
    team?: string;
    assignee?: string;
    customStart?: string;
    customEnd?: string;
  },
  refDate: Date = new Date()
): DepartmentReportSummary {
  const { startDate, endDate, label } = getTimePeriodDateRange(
    period,
    filterOptions?.customStart,
    filterOptions?.customEnd,
    refDate
  );

  // 1. Lọc danh sách công việc theo thời gian
  let targetTasks = allTasks.filter((t) => isTaskInPeriod(t, startDate, endDate));

  // 2. Lọc theo Dự án nếu có
  if (filterOptions?.projectId && filterOptions.projectId !== 'all') {
    targetTasks = targetTasks.filter((t) => t.projectId === filterOptions.projectId);
  }

  // 3. Lọc theo Nhóm chuyên môn nếu có
  if (filterOptions?.team && filterOptions.team !== 'Tất cả') {
    targetTasks = targetTasks.filter((t) => t.team === filterOptions.team);
  }

  // 4. Lọc theo Nhân sự nếu có
  if (filterOptions?.assignee && filterOptions.assignee !== 'Tất cả') {
    targetTasks = targetTasks.filter((t) => isSamePersonName(t.assignee, filterOptions.assignee!));
  }

  // 5. Phân tích kỷ luật từng task
  const analyzedTasks = targetTasks.map((t) => analyzeTaskDiscipline(t, refDate));

  let completedCount = 0;
  let completedOnTimeCount = 0;
  let completedLateCount = 0;
  let lateConfirmationCount = 0;
  let currentlyOverdueCount = 0;
  let blockedCount = 0;
  let inProgressCount = 0;
  let hasResultLinkCount = 0;

  analyzedTasks.forEach((res) => {
    if (res.isCompleted) {
      completedCount++;
      if (res.isOnTime) {
        completedOnTimeCount++;
      } else {
        completedLateCount++;
      }
      if (res.isLateConfirmation) {
        lateConfirmationCount++;
      }
      if (res.task.resultLink || res.task.workLink) {
        hasResultLinkCount++;
      }
    } else {
      if (res.discipline === 'currently_overdue') {
        currentlyOverdueCount++;
      } else if (res.discipline === 'blocked') {
        blockedCount++;
      } else {
        inProgressCount++;
      }
    }
  });

  const totalTasks = analyzedTasks.length;
  const overallOnTimeRate =
    completedCount > 0 ? Math.round((completedOnTimeCount / completedCount) * 100) : 100;
  const overallLateConfirmationRate =
    completedCount > 0 ? Math.round((lateConfirmationCount / completedCount) * 100) : 0;
  const tasksWithResultLinkRate =
    completedCount > 0 ? Math.round((hasResultLinkCount / completedCount) * 100) : 0;

  // 6. Tính toán thống kê theo từng nhân sự
  // Chỉ xét các nhân sự thuộc bộ phận Product (Product Manager, UX/UI Designer, SEO, Data)
  const productMembers = allMembers.filter(
    (m) => m.team && ['Product Manager', 'UX/UI Designer', 'SEO', 'Data'].includes(m.team)
  );

  const memberMap = new Map<string, TaskDisciplineResult[]>();
  analyzedTasks.forEach((res) => {
    const assignee = res.task.assignee;
    if (!memberMap.has(assignee)) {
      memberMap.set(assignee, []);
    }
    memberMap.get(assignee)!.push(res);
  });

  const executiveStats: ExecutiveMemberStats[] = productMembers.map((member) => {
    // Tìm các task tương ứng với nhân sự
    const memberTasksRes = analyzedTasks.filter((res) =>
      isSamePersonName(res.task.assignee, member.name)
    );

    const mTotal = memberTasksRes.length;
    let mComp = 0;
    let mOnTime = 0;
    let mLate = 0;
    let mLateConfirm = 0;
    let mOverdue = 0;
    let mBlocked = 0;
    let mInProgress = 0;
    let mResultLink = 0;

    memberTasksRes.forEach((r) => {
      if (r.isCompleted) {
        mComp++;
        if (r.isOnTime) mOnTime++;
        else mLate++;
        if (r.isLateConfirmation) mLateConfirm++;
        if (r.task.resultLink || r.task.workLink) mResultLink++;
      } else {
        if (r.discipline === 'currently_overdue') mOverdue++;
        else if (r.discipline === 'blocked') mBlocked++;
        else mInProgress++;
      }
    });

    const mOnTimeRate = mComp > 0 ? Math.round((mOnTime / mComp) * 100) : (mTotal === 0 ? 100 : 0);
    const mLateConfirmRate = mComp > 0 ? Math.round((mLateConfirm / mComp) * 100) : 0;

    // Đánh giá xếp loại hiệu quả
    let efficiencyRating: 'Xuất sắc' | 'Tốt' | 'Cần cải thiện' = 'Tốt';
    let ratingReason = '';

    if (mTotal === 0) {
      efficiencyRating = 'Tốt';
      ratingReason = 'Không có việc trong kỳ';
    } else if (mOverdue >= 2 || (mComp > 0 && mOnTimeRate < 70)) {
      efficiencyRating = 'Cần cải thiện';
      ratingReason = mOverdue >= 2 ? `${mOverdue} việc quá hạn chưa xong` : `Tỷ lệ đúng hạn ${mOnTimeRate}%`;
    } else if (mLateConfirm >= 3) {
      efficiencyRating = 'Cần cải thiện';
      ratingReason = `${mLateConfirm} việc hoàn thành sau hạn`;
    } else if (mOnTimeRate >= 85 && mOverdue === 0 && mComp > 0) {
      efficiencyRating = 'Xuất sắc';
      ratingReason = `Đúng hạn ${mOnTimeRate}%, không có việc quá hạn`;
    } else {
      efficiencyRating = 'Tốt';
      ratingReason = `Đúng hạn ${mOnTimeRate}%`;
    }

    return {
      member,
      role: member.team === 'Product Manager' ? 'PM' : 'Executive',
      totalTasks: mTotal,
      completedTasks: mComp,
      completedOnTime: mOnTime,
      completedLate: mLate,
      lateConfirmationCount: mLateConfirm,
      currentlyOverdueCount: mOverdue,
      blockedCount: mBlocked,
      inProgressCount: mInProgress,
      onTimeRate: mOnTimeRate,
      lateConfirmationRate: mLateConfirmRate,
      hasResultLinkCount: mResultLink,
      efficiencyRating,
      ratingReason,
      tasks: memberTasksRes.map((r) => r.task),
    };
  });

  // Sắp xếp Executive: Cần cải thiện lên trên để Trưởng ban can thiệp, hoặc Xuất sắc trước
  executiveStats.sort((a, b) => {
    // Ưu tiên nhân sự có task
    if (a.totalTasks === 0 && b.totalTasks > 0) return 1;
    if (a.totalTasks > 0 && b.totalTasks === 0) return -1;
    // Xếp theo số task quá hạn giảm dần
    if (b.currentlyOverdueCount !== a.currentlyOverdueCount) {
      return b.currentlyOverdueCount - a.currentlyOverdueCount;
    }
    // Sau đó xếp theo tỷ lệ đúng hạn
    return b.onTimeRate - a.onTimeRate;
  });

  // 7. Tính toán Đánh giá PM Leadership
  // PM được đánh giá qua Sức khỏe của toàn bộ các dự án do họ phụ trách
  const pmMembers = productMembers.filter((m) => m.team === 'Product Manager');

  const pmStats: PMLeadershipStats[] = pmMembers.map((pm) => {
    // Tìm các dự án PM phụ trách
    const managedProjects = allProjects.filter((p) => {
      const inPmRole = (p.roles?.pm || []).some((name) => isSamePersonName(name, pm.name));
      const inLead = (p.leadName || '').split(/[,&]/).some((name) => isSamePersonName(name, pm.name));
      return inPmRole || inLead;
    });

    const projectIds = managedProjects.map((p) => p.id);
    // Lấy toàn bộ task của team trong các dự án của PM trong kỳ
    const projectTasksRes = analyzedTasks.filter((res) => projectIds.includes(res.task.projectId));

    let teamComp = 0;
    let teamOnTime = 0;
    let teamOverdue = 0;
    let teamBlocked = 0;

    projectTasksRes.forEach((r) => {
      if (r.isCompleted) {
        teamComp++;
        if (r.isOnTime) teamOnTime++;
      } else {
        if (r.discipline === 'currently_overdue') teamOverdue++;
        if (r.discipline === 'blocked') teamBlocked++;
      }
    });

    const teamOnTimeRate =
      teamComp > 0 ? Math.round((teamOnTime / teamComp) * 100) : (projectTasksRes.length === 0 ? 100 : 0);

    // Đếm các phase của dự án bị chậm
    let delayedPhasesCount = 0;
    const todayYmd = getTodayDateString(refDate);
    managedProjects.forEach((p) => {
      (p.phases || []).forEach((ph) => {
        if (ph.status !== 'Đã hoàn thành' && ph.dueDate < todayYmd) {
          delayedPhasesCount++;
        }
      });
    });

    // PM personal tasks
    const personalTasks = analyzedTasks.filter((r) => isSamePersonName(r.task.assignee, pm.name));

    // Đánh giá năng lực điều phối PM
    let leadershipRating: 'Xuất sắc' | 'Ổn định' | 'Cần hỗ trợ' = 'Ổn định';
    let ratingReason = '';

    if (managedProjects.length === 0) {
      leadershipRating = 'Ổn định';
      ratingReason = 'Chưa phụ trách dự án';
    } else if (teamBlocked >= 3 || teamOverdue >= 3 || delayedPhasesCount >= 2) {
      leadershipRating = 'Cần hỗ trợ';
      ratingReason = `${teamBlocked} việc nghẽn, ${teamOverdue} việc trễ hạn`;
    } else if (teamOnTimeRate >= 85 && teamBlocked === 0 && teamOverdue === 0 && projectTasksRes.length > 0) {
      leadershipRating = 'Xuất sắc';
      ratingReason = `Team đúng hạn ${teamOnTimeRate}%, 0 việc nghẽn`;
    } else {
      leadershipRating = 'Ổn định';
      ratingReason = `Team đúng hạn ${teamOnTimeRate}%`;
    }

    return {
      pm,
      managedProjects,
      totalTeamTasks: projectTasksRes.length,
      completedTeamTasks: teamComp,
      teamOnTimeTasks: teamOnTime,
      teamOnTimeRate,
      teamOverdueTasks: teamOverdue,
      teamBlockedTasks: teamBlocked,
      delayedPhasesCount,
      personalTasksCount: personalTasks.length,
      leadershipRating,
      ratingReason,
      projectNames: managedProjects.map((p) => p.name),
    };
  });

  // 8. Tính toán thống kê theo từng Dự án
  const projectStats: ProjectReportStats[] = allProjects.map((project) => {
    const projTasksRes = analyzedTasks.filter((res) => res.task.projectId === project.id);

    let pComp = 0;
    let pOnTime = 0;
    let pLate = 0;
    let pLateConfirm = 0;
    let pOverdue = 0;
    let pBlocked = 0;

    projTasksRes.forEach((r) => {
      if (r.isCompleted) {
        pComp++;
        if (r.isOnTime) pOnTime++;
        else pLate++;
        if (r.isLateConfirmation) pLateConfirm++;
      } else {
        if (r.discipline === 'currently_overdue') pOverdue++;
        else if (r.discipline === 'blocked') pBlocked++;
      }
    });

    const pOnTimeRate = pComp > 0 ? Math.round((pOnTime / pComp) * 100) : (projTasksRes.length === 0 ? 100 : 0);

    let health: 'Tốt' | 'Cảnh báo' | 'Nguy cơ trễ' = 'Tốt';
    if (pBlocked >= 2 || pOverdue >= 3 || (pComp > 0 && pOnTimeRate < 60)) {
      health = 'Nguy cơ trễ';
    } else if (pBlocked === 1 || pOverdue >= 1 || (pComp > 0 && pOnTimeRate < 80)) {
      health = 'Cảnh báo';
    } else {
      health = 'Tốt';
    }

    const leadPmNames = (project.roles?.pm && project.roles.pm.length > 0)
      ? project.roles.pm.join(', ')
      : project.leadName || 'Chưa phân công';

    return {
      project,
      totalTasks: projTasksRes.length,
      completedTasks: pComp,
      onTimeTasks: pOnTime,
      lateTasks: pLate,
      lateConfirmationTasks: pLateConfirm,
      overdueTasks: pOverdue,
      blockedTasks: pBlocked,
      onTimeRate: pOnTimeRate,
      health,
      leadPmNames,
      tasks: projTasksRes.map((r) => r.task),
    };
  });

  // Sắp xếp Dự án: Dự án có nguy cơ / cảnh báo lên trước
  projectStats.sort((a, b) => {
    const order = { 'Nguy cơ trễ': 3, 'Cảnh báo': 2, 'Tốt': 1 };
    if (order[b.health] !== order[a.health]) {
      return order[b.health] - order[a.health];
    }
    return b.totalTasks - a.totalTasks;
  });

  return {
    periodLabel: label,
    startDate,
    endDate,
    totalTasks,
    completedCount,
    completedOnTimeCount,
    completedLateCount,
    lateConfirmationCount,
    currentlyOverdueCount,
    blockedCount,
    inProgressCount,
    overallOnTimeRate,
    overallLateConfirmationRate,
    tasksWithResultLinkRate,
    executiveStats,
    pmStats,
    projectStats,
    tasksAnalyzed: analyzedTasks,
  };
}

/**
 * Tạo tóm tắt báo cáo điều hành dạng Text chuẩn văn phong VnExpress (Facts first)
 */
export function generateExecutiveBrief(summary: DepartmentReportSummary): string {
  const lines: string[] = [];

  lines.push(`📊 TÓM TẮT ĐIỀU HÀNH BAN SẢN PHẨM - ${summary.periodLabel.toUpperCase()}`);
  lines.push(`--------------------------------------------------`);
  lines.push(`1. CHỈ SỐ HOÀN THÀNH & KỶ LUẬT:`);
  lines.push(`- Tổng số công việc phát sinh: ${summary.totalTasks} việc`);
  lines.push(`- Đã hoàn thành: ${summary.completedCount} việc (Tỷ lệ đúng hạn: ${summary.overallOnTimeRate}%)`);
  lines.push(`  + Hoàn thành đúng ngày/trước hạn: ${summary.completedOnTimeCount} việc`);
  lines.push(`  + Để hôm sau mới bấm hoàn thành: ${summary.lateConfirmationCount} việc (${summary.overallLateConfirmationRate}%)`);
  lines.push(`  + Hoàn thành quá hạn >= 2 ngày: ${summary.completedLateCount - summary.lateConfirmationCount} việc`);
  lines.push(`- Đang quá hạn tồn đọng: ${summary.currentlyOverdueCount} việc`);
  lines.push(`- Đang bị nghẽn (Blockers): ${summary.blockedCount} việc`);
  lines.push(`- Tỷ lệ có link kết quả nghiệm thu: ${summary.tasksWithResultLinkRate}%`);
  lines.push(``);

  lines.push(`2. ĐÁNH GIÁ ĐIỀU PHỐI CÁC PRODUCT MANAGERS (PM):`);
  summary.pmStats.forEach((p) => {
    lines.push(`- PM ${p.pm.name}: [${p.leadershipRating}] - ${p.ratingReason}`);
    lines.push(`  + Dự án phụ trách: ${p.projectNames.join(', ') || 'Chưa gán'}`);
    lines.push(`  + Tỷ lệ đúng hạn team: ${p.teamOnTimeRate}% (${p.teamOnTimeTasks}/${p.completedTeamTasks} việc) | Nghẽn: ${p.teamBlockedTasks}`);
  });
  lines.push(``);

  lines.push(`3. NHÂN SỰ CẦN LƯU Ý & ĐÔN ĐỐC (EXECUTIVE):`);
  const needsAttention = summary.executiveStats.filter(
    (e) => e.efficiencyRating === 'Cần cải thiện' && e.totalTasks > 0
  );
  if (needsAttention.length === 0) {
    lines.push(`- Toàn bộ chuyên viên duy trì tiến độ tốt, không có nhân sự vi phạm kỷ luật.`);
  } else {
    needsAttention.forEach((e) => {
      lines.push(
        `- ${e.member.name} (${e.member.team}): ${e.ratingReason} (Nợ quá hạn: ${e.currentlyOverdueCount}, Bấm trễ hôm sau: ${e.lateConfirmationCount})`
      );
    });
  }
  lines.push(``);

  const atRiskProjects = summary.projectStats.filter(
    (p) => p.health !== 'Tốt' && p.totalTasks > 0
  );
  if (atRiskProjects.length > 0) {
    lines.push(`4. DỰ ÁN CẦN CAN THIỆP GẤP:`);
    atRiskProjects.forEach((p) => {
      lines.push(
        `- Dự án "${p.project.name}": [${p.health}] - PM: ${p.leadPmNames} | Nghẽn: ${p.blockedTasks}, Quá hạn: ${p.overdueTasks}`
      );
    });
  }

  lines.push(`--------------------------------------------------`);
  lines.push(`Xuất từ Hệ thống WMS Ban Sản phẩm - Công nghệ VnExpress.`);

  return lines.join('\n');
}
