/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TaskStatus, TaskItem } from '../types';
import { formatDateWithEnDay } from './formatters';

export type DueDateStatus = 'overdue' | 'due_today' | 'due_soon' | 'normal' | 'completed';

export interface DueDateInfo {
  status: DueDateStatus;
  daysDiff: number;
  label: string;
}

/**
 * Normalizes any date string or Date object to YYYY-MM-DD format
 */
export function normalizeDateString(dateVal?: string | Date | null): string {
  if (!dateVal) return '';
  if (dateVal instanceof Date) {
    return getTodayDateString(dateVal);
  }
  const str = String(dateVal).trim();
  // Extract YYYY-MM-DD from ISO strings (e.g. 2026-09-11T00:00:00.000Z or 2026-09-11 00:00:00)
  const match = str.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return getTodayDateString(d);
  }
  return str;
}

/**
 * Returns YYYY-MM-DD string for today or input date
 */
export function getTodayDateString(refDate: Date = new Date()): string {
  const year = refDate.getFullYear();
  const month = String(refDate.getMonth() + 1).padStart(2, '0');
  const day = String(refDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculates day difference (dateStr1 - dateStr2)
 */
export function getDaysDifference(dateStr1: string, dateStr2: string): number {
  const d1Str = normalizeDateString(dateStr1);
  const d2Str = normalizeDateString(dateStr2);
  if (!d1Str || !d2Str) return 0;
  const d1 = new Date(d1Str + 'T00:00:00');
  const d2 = new Date(d2Str + 'T00:00:00');
  const diffTime = d1.getTime() - d2.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Calculates the due status info for a task relative to reference date (default today)
 */
export function getTaskDueDateInfo(dueDateStr: string, status: TaskStatus, refDate: Date = new Date()): DueDateInfo {
  if (status === 'Hoàn thành') {
    return { status: 'completed', daysDiff: 0, label: 'Đã hoàn thành' };
  }

  const todayStr = getTodayDateString(refDate);
  const daysDiff = getDaysDifference(dueDateStr, todayStr);

  if (daysDiff < 0) {
    const overdueDays = Math.abs(daysDiff);
    return {
      status: 'overdue',
      daysDiff,
      label: `Quá hạn ${overdueDays} ngày`,
    };
  } else if (daysDiff === 0) {
    return {
      status: 'due_today',
      daysDiff,
      label: 'Cần xong hôm nay',
    };
  } else if (daysDiff <= 3) {
    return {
      status: 'due_soon',
      daysDiff,
      label: `Sắp đến hạn (Còn ${daysDiff} ngày)`,
    };
  } else {
    return {
      status: 'normal',
      daysDiff,
      label: `Hạn ${formatDateWithEnDay(dueDateStr)}`,
    };
  }
}

/**
 * Định dạng hiển thị hạn công việc trong danh sách (TaskItemRow):
 * - "Hôm nay" (nếu đến hạn hôm nay)
 * - "Hôm qua" (nếu quá hạn 1 ngày)
 * - "Ngày mai" (nếu đến hạn ngày mai)
 * - Nằm ngoài 3 thời gian này: hiển thị chuẩn "Tue, 15 Sep 2026" (formatDateWithEnDay)
 */
export function formatTaskDueDisplay(dueDateStr?: string | null, refDate: Date = new Date()): string {
  if (!dueDateStr) return '';
  const todayStr = getTodayDateString(refDate);
  const daysDiff = getDaysDifference(dueDateStr, todayStr);

  if (daysDiff === 0) return 'Hôm nay';
  if (daysDiff === -1) return 'Hôm qua';
  if (daysDiff === 1) return 'Ngày mai';

  return formatDateWithEnDay(dueDateStr);
}

/**
 * Filter tasks by due date status
 */
export function isTaskDueToday(task: TaskItem, refDate: Date = new Date()): boolean {
  if (task.status === 'Hoàn thành') return false;
  const todayStr = getTodayDateString(refDate);
  const taskDate = normalizeDateString(task.dueDate);
  return taskDate !== '' && taskDate === todayStr;
}

export function isTaskOverdue(task: TaskItem, refDate: Date = new Date()): boolean {
  if (task.status === 'Hoàn thành') return false;
  const todayStr = getTodayDateString(refDate);
  const taskDate = normalizeDateString(task.dueDate);
  return taskDate !== '' && taskDate < todayStr;
}

export function isTaskDueSoon(task: TaskItem, refDate: Date = new Date()): boolean {
  if (task.status === 'Hoàn thành') return false;
  const todayStr = getTodayDateString(refDate);
  const diff = getDaysDifference(task.dueDate, todayStr);
  return diff > 0 && diff <= 3;
}
