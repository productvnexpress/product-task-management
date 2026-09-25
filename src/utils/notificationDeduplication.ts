/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NotificationItem } from '../types';

/**
 * Kiểm tra xem 2 thông báo có phải là bản sao (duplicate) của nhau hay không
 */
export function isDuplicateNotification(a: NotificationItem, b: NotificationItem): boolean {
  if (!a || !b) return false;

  // 1. Trùng ID định danh
  if (a.id && b.id && a.id === b.id) return true;

  const recipA = (a.recipientName || '').trim().toLowerCase();
  const recipB = (b.recipientName || '').trim().toLowerCase();
  if (recipA !== recipB) return false;

  const titleA = (a.title || '').trim();
  const titleB = (b.title || '').trim();
  const contentA = (a.content || '').trim();
  const contentB = (b.content || '').trim();

  // 2. Cùng người nhận, cùng tiêu đề và cùng nội dung
  if (titleA === titleB && contentA === contentB) {
    // Nếu có ngày tạo, kiểm tra khoảng cách thời gian
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();
    if (!isNaN(timeA) && !isNaN(timeB)) {
      // Trong vòng 1 giờ mà trùng cả title và content -> Coi là duplicate
      if (Math.abs(timeA - timeB) < 60 * 60 * 1000) {
        return true;
      }
    }

    // Các thông báo định kỳ hàng ngày (nhắc việc 08:30, đóng task 16:30, hạn dự án): cùng ngày là duplicate
    const dateA = a.createdAt?.slice(0, 10);
    const dateB = b.createdAt?.slice(0, 10);
    if (dateA && dateB && dateA === dateB) {
      if (
        a.type === 'daily_task_reminder' ||
        a.type === 'daily_close_reminder' ||
        a.type === 'phase_due_soon' ||
        a.type === 'project_due_soon'
      ) {
        return true;
      }
    }
  }

  // 3. Thông báo bình luận trao đổi cùng một task với cùng nội dung
  if (
    a.type === 'task_comment' &&
    b.type === 'task_comment' &&
    a.taskId &&
    a.taskId === b.taskId &&
    contentA === contentB
  ) {
    return true;
  }

  return false;
}

/**
 * Lọc bỏ hoàn toàn các thông báo trùng lặp khỏi danh sách, giữ lại bản ghi mới nhất
 */
export function deduplicateNotifications(items: NotificationItem[]): NotificationItem[] {
  if (!items || items.length === 0) return [];

  const result: NotificationItem[] = [];
  const seenIds = new Set<string>();

  for (const item of items) {
    if (!item) continue;

    // Chặn trùng lặp ID tức thì
    if (item.id && seenIds.has(item.id)) {
      continue;
    }

    // Chặn trùng lặp nội dung theo logic nghiệp vụ
    const isDup = result.some((existing) => isDuplicateNotification(existing, item));
    if (!isDup) {
      if (item.id) seenIds.add(item.id);
      result.push(item);
    }
  }

  return result;
}
