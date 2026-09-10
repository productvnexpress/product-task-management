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
  if (!dateStr1 || !dateStr2) return 0;
  const d1 = new Date(dateStr1);
  const d2 = new Date(dateStr2);
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
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
 * Filter tasks by due date status
 */
export function isTaskDueToday(task: TaskItem, refDate: Date = new Date()): boolean {
  if (task.status === 'Hoàn thành') return false;
  const todayStr = getTodayDateString(refDate);
  return task.dueDate === todayStr;
}

export function isTaskOverdue(task: TaskItem, refDate: Date = new Date()): boolean {
  if (task.status === 'Hoàn thành') return false;
  const todayStr = getTodayDateString(refDate);
  return task.dueDate < todayStr;
}

export function isTaskDueSoon(task: TaskItem, refDate: Date = new Date()): boolean {
  if (task.status === 'Hoàn thành') return false;
  const todayStr = getTodayDateString(refDate);
  const diff = getDaysDifference(task.dueDate, todayStr);
  return diff > 0 && diff <= 3;
}
