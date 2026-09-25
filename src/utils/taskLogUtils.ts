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

  // Check Completed At (Thời điểm hoàn thành)
  const oldCompDate = oldTask.completedAt ? formatLogTimestamp(oldTask.completedAt, true) : '';
  const newCompDate = updatedTask.completedAt ? formatLogTimestamp(updatedTask.completedAt, true) : '';
  if (
    updatedTask.status === 'Hoàn thành' &&
    Boolean(updatedTask.completedAt) &&
    oldCompDate !== newCompDate &&
    oldTask.completedAt !== updatedTask.completedAt
  ) {
    changes.push({
      field: 'Thời điểm hoàn thành',
      oldValue: oldCompDate || 'Chưa ghi nhận',
      newValue: newCompDate || 'Chưa ghi nhận',
    });
  }

  // Lọc bỏ mọi thay đổi giả mạo nếu oldValue === newValue
  const validChanges = changes.filter((c) => {
    if (c.oldValue !== undefined && c.newValue !== undefined) {
      return c.oldValue.trim() !== c.newValue.trim();
    }
    return true;
  });

  // If no direct field changes and no customNote, return updatedTask as is
  if (validChanges.length === 0 && !customNote) {
    return {
      ...updatedTask,
      logs: deduplicateTaskLogs(updatedTask.logs || []),
    };
  }

  // Construct action text
  let actionTitle = 'Cập nhật công việc';
  if (oldTask.status !== updatedTask.status) {
    actionTitle = `Đổi trạng thái ➔ ${updatedTask.status}`;
  } else if (
    updatedTask.status === 'Hoàn thành' &&
    oldCompDate !== newCompDate &&
    Boolean(updatedTask.completedAt)
  ) {
    actionTitle = 'Điều chỉnh thời điểm hoàn thành';
  } else if (oldTask.assignee !== updatedTask.assignee) {
    actionTitle = `Đổi người phụ trách ➔ ${updatedTask.assignee}`;
  } else if (oldTask.dueDate !== updatedTask.dueDate) {
    actionTitle = `Gia hạn / Đổi thời hạn ➔ ${formatDateWithEnDay(updatedTask.dueDate)}`;
  } else if (validChanges.length > 0) {
    actionTitle = `Cập nhật ${validChanges.map((c) => c.field).join(', ')}`;
  } else if (customNote) {
    actionTitle = 'Bình luận';
  }

  const actor = authorName || updatedTask.assignee || 'Hệ thống';

  const newLogItem: TaskLogItem = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    author: actor,
    action: actionTitle,
    changes: validChanges,
    note: customNote || (updatedTask.status === 'Bị nghẽn' && updatedTask.blockerReason ? `Cảnh báo nghẽn: ${updatedTask.blockerReason}` : undefined),
  };

  const existingLogs = deduplicateTaskLogs(updatedTask.logs || []);

  // Tránh tạo bản ghi trùng lặp nếu log đầu tiên đã có cùng người tạo, hành động và nội dung
  if (
    existingLogs.length > 0 &&
    existingLogs[0].author === actor &&
    existingLogs[0].action === actionTitle &&
    (existingLogs[0].note || '').trim() === (newLogItem.note || '').trim() &&
    JSON.stringify(existingLogs[0].changes || []) === JSON.stringify(validChanges)
  ) {
    return {
      ...updatedTask,
      logs: existingLogs,
    };
  }

  return {
    ...updatedTask,
    logs: [newLogItem, ...existingLogs],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Lọc bỏ triệt để các bản ghi nhật ký trùng lặp (Audit Log & Trao đổi/Bình luận)
 * Xử lý cả log có ghi chú và log kiểm toán (audit change logs) không có ghi chú.
 */
export function deduplicateTaskLogs(logs: TaskLogItem[]): TaskLogItem[] {
  if (!logs || logs.length === 0) return [];
  const result: TaskLogItem[] = [];

  logs.forEach((log) => {
    if (!log) return;

    const isDuplicate = result.some((prev) => {
      // 1. Trùng ID chính xác
      if (prev.id && log.id && prev.id === log.id) return true;

      // 2. So sánh người thao tác
      if (prev.author !== log.author) return false;

      // 3. So sánh hành động
      if (prev.action !== log.action) return false;

      // 4. So sánh thời điểm: cùng thời điểm hoặc cách nhau dưới 3 phút
      const tPrev = new Date(prev.timestamp).getTime();
      const tCurr = new Date(log.timestamp).getTime();
      const timeDiff = Math.abs(tPrev - tCurr);
      if (isNaN(tPrev) || isNaN(tCurr) || timeDiff > 180000) return false;

      // 5. So sánh ghi chú / bình luận
      const notePrev = (prev.note || '').trim();
      const noteCurr = (log.note || '').trim();
      if (notePrev !== noteCurr) return false;

      // 6. So sánh chi tiết thay đổi (changes)
      const sanitizeChanges = (changes: TaskLogChange[] = []) =>
        changes
          .filter((c) => c && c.field)
          .map((c) => `${c.field}:${(c.oldValue || '').trim()}->${(c.newValue || '').trim()}`)
          .sort()
          .join('|');

      const changesPrev = sanitizeChanges(prev.changes);
      const changesCurr = sanitizeChanges(log.changes);

      return changesPrev === changesCurr;
    });

    if (!isDuplicate) {
      result.push(log);
    }
  });

  return result;
}

/**
 * Manually add a log note (e.g., Progress comment)
 */
export function addManualLog(
  task: TaskItem,
  authorName: string,
  noteText: string,
  actionText = 'Bình luận'
): TaskItem {
  if (!noteText.trim()) return task;

  const actor = authorName.trim() || task.assignee || 'Hệ thống';
  const existingLogs = deduplicateTaskLogs(task.logs || []);

  // Tránh duplicate comment nếu vừa gửi cùng nội dung trong vòng 1 phút
  if (
    existingLogs.length > 0 &&
    existingLogs[0].author === actor &&
    (existingLogs[0].note || '').trim() === noteText.trim() &&
    Math.abs(new Date(existingLogs[0].timestamp).getTime() - Date.now()) < 60000
  ) {
    return {
      ...task,
      logs: existingLogs,
    };
  }

  const newLogItem: TaskLogItem = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    author: actor,
    action: actionText,
    changes: [],
    note: noteText.trim(),
  };

  return {
    ...task,
    logs: [newLogItem, ...existingLogs],
    updatedAt: new Date().toISOString(),
  };
}
