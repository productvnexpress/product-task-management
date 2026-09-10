/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TaskItem, TaskLogItem, TaskLogChange } from '../types';
import { formatDateWithEnDay } from './formatters';

/**
 * Format timestamp into readable date & time conforming to RULE.md section 2.3
 * Example: "Fri, 20 Nov 2026 • 14:30"
 */
export function formatLogTimestamp(isoString?: string, includeTime: boolean = true): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;
  return formatDateWithEnDay(date, includeTime);
}

/**
 * Creates initial log for newly created tasks
 */
export function createCreationLog(task: TaskItem, authorName?: string): TaskLogItem {
  return {
    id: `log-${Date.now()}-init`,
    timestamp: new Date().toISOString(),
    author: authorName || task.assignee || 'Hệ thống',
    action: 'Khởi tạo công việc mới',
    changes: [
      { field: 'Trạng thái', newValue: task.status },
      { field: 'Người phụ trách', newValue: task.assignee },
      { field: 'Hạn hoàn thành', newValue: formatDateWithEnDay(task.dueDate) },
      { field: 'Mức độ ưu tiên', newValue: task.priority },
    ],
    note: task.details ? `Ghi chú: ${task.details}` : 'Công việc mới được thêm vào hệ thống.',
  };
}

/**
 * Compares oldTask vs updatedTask, generates a TaskLogItem if changes exist,
 * and returns updated task with new log appended to logs array (newest first).
 */
export function recordTaskChanges(
  oldTask: TaskItem,
  updatedTask: TaskItem,
  authorName?: string,
  customNote?: string
): TaskItem {
  const changes: TaskLogChange[] = [];

  // Check Title
  if (oldTask.title !== updatedTask.title) {
    changes.push({
      field: 'Tên công việc',
      oldValue: oldTask.title,
      newValue: updatedTask.title,
    });
  }

  // Check Status
  if (oldTask.status !== updatedTask.status) {
    changes.push({
      field: 'Trạng thái',
      oldValue: oldTask.status,
      newValue: updatedTask.status,
    });
  }

  // Check Assignee
  if (oldTask.assignee !== updatedTask.assignee) {
    changes.push({
      field: 'Người phụ trách',
      oldValue: oldTask.assignee,
      newValue: updatedTask.assignee,
    });
  }

  // Check Due Date
  if (oldTask.dueDate !== updatedTask.dueDate) {
    changes.push({
      field: 'Hạn hoàn thành',
      oldValue: formatDateWithEnDay(oldTask.dueDate),
      newValue: formatDateWithEnDay(updatedTask.dueDate),
    });
  }

  // Check Priority
  if (oldTask.priority !== updatedTask.priority) {
    changes.push({
      field: 'Mức độ ưu tiên',
      oldValue: oldTask.priority,
      newValue: updatedTask.priority,
    });
  }

  // Check Project/Phase
  if (
    oldTask.projectId !== updatedTask.projectId ||
    oldTask.phaseId !== updatedTask.phaseId
  ) {
    changes.push({
      field: 'Dự án / Phase',
      oldValue: `${oldTask.projectName}${oldTask.phaseName ? ` (${oldTask.phaseName})` : ''}`,
      newValue: `${updatedTask.projectName}${updatedTask.phaseName ? ` (${updatedTask.phaseName})` : ''}`,
    });
  }

  // Check Work Link
  if ((oldTask.workLink || '') !== (updatedTask.workLink || '')) {
    changes.push({
      field: 'Link làm việc',
      oldValue: oldTask.workLink || 'Chưa có',
      newValue: updatedTask.workLink || 'Chưa có',
    });
  }

  // Check Result Link
  if ((oldTask.resultLink || '') !== (updatedTask.resultLink || '')) {
    changes.push({
      field: 'Link kết quả',
      oldValue: oldTask.resultLink || 'Chưa có',
      newValue: updatedTask.resultLink || 'Chưa có',
    });
  }

  // Check Blocker Reason
  if ((oldTask.blockerReason || '') !== (updatedTask.blockerReason || '')) {
    changes.push({
      field: 'Lý do bị nghẽn',
      oldValue: oldTask.blockerReason || 'Không có',
      newValue: updatedTask.blockerReason || 'Không có',
    });
  }

  // Check Details
  if ((oldTask.details || '') !== (updatedTask.details || '')) {
    changes.push({
      field: 'Mô tả chi tiết',
      oldValue: oldTask.details || '(Trống)',
      newValue: updatedTask.details || '(Trống)',
    });
  }

  // If no direct field changes and no customNote, return updatedTask as is
  if (changes.length === 0 && !customNote) {
    return updatedTask;
  }

  // Construct action text
  let actionTitle = 'Cập nhật công việc';
  if (oldTask.status !== updatedTask.status) {
    actionTitle = `Đổi trạng thái ➔ ${updatedTask.status}`;
  } else if (oldTask.assignee !== updatedTask.assignee) {
    actionTitle = `Đổi người phụ trách ➔ ${updatedTask.assignee}`;
  } else if (oldTask.dueDate !== updatedTask.dueDate) {
    actionTitle = `Gia hạn / Đổi thời hạn ➔ ${formatDateWithEnDay(updatedTask.dueDate)}`;
  } else if (changes.length > 0) {
    actionTitle = `Cập nhật ${changes.map((c) => c.field).join(', ')}`;
  } else if (customNote) {
    actionTitle = 'Ghi chú / Nhật ký tiến độ';
  }

  const actor = authorName || updatedTask.assignee || 'Hệ thống';

  const newLogItem: TaskLogItem = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    author: actor,
    action: actionTitle,
    changes,
    note: customNote || (updatedTask.status === 'Bị nghẽn' && updatedTask.blockerReason ? `Cảnh báo nghẽn: ${updatedTask.blockerReason}` : undefined),
  };

  const existingLogs = updatedTask.logs || [];

  return {
    ...updatedTask,
    logs: [newLogItem, ...existingLogs],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Manually add a log note (e.g., Progress comment)
 */
export function addManualLog(
  task: TaskItem,
  authorName: string,
  noteText: string,
  actionText = 'Thêm ghi chú tiến độ'
): TaskItem {
  if (!noteText.trim()) return task;

  const newLogItem: TaskLogItem = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    author: authorName.trim() || task.assignee || 'Hệ thống',
    action: actionText,
    changes: [],
    note: noteText.trim(),
  };

  const existingLogs = task.logs || [];

  return {
    ...task,
    logs: [newLogItem, ...existingLogs],
    updatedAt: new Date().toISOString(),
  };
}
