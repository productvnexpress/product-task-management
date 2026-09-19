/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MemberItem, NotificationItem, TaskItem } from '../types';
import { getTodayDateString, normalizeDateString } from './dateUtils';
import { isSamePersonName } from './memberPersonalization';
import { workingTimeService } from '../services/workingTimeService';

/**
 * Kiểm tra và phát thông báo nhắc đóng task hàng ngày vào lúc 16:30 cho từng account
 * - Điều kiện: Ngày làm việc (loại trừ Thứ 7, CN và ngày lễ theo workingTimeService)
 * - Mốc giờ: Từ 16:30 trở đi (hoặc preview param ?closeTaskAlert=1)
 * - Nhân sự đang nghỉ phép được miễn trừ
 * - Chống trùng lặp: Lưu mã ngày vào localStorage, mỗi nhân sự chỉ nhận tối đa 1 thông báo/ngày
 * - Biên tập chuẩn EDITOR.md: Ngắn gọn, súc tích, facts first, thể chủ động, cắt bỏ từ rườm rà
 */
export function checkAndDispatchDailyCloseTaskNotifications(
  tasks: TaskItem[],
  allMembers: MemberItem[],
  onDispatchNotification: (notif: NotificationItem) => void,
  refDate: Date = new Date()
): number {
  // 1. Kiểm tra ngày làm việc (không gửi vào cuối tuần / ngày lễ)
  if (!workingTimeService.isWorkingDay(refDate)) {
    return 0;
  }

  // 2. Kiểm tra khung giờ 16:30
  const hours = refDate.getHours();
  const minutes = refDate.getMinutes();
  const timeInMinutes = hours * 60 + minutes;

  // 16:30 tương đương 16 * 60 + 30 = 990 phút
  const isAfter1630 = timeInMinutes >= 990;

  // Hỗ trợ preview / test qua URL param
  const isPreviewParam = (() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('closeTaskAlert') === '1' || urlParams.get('preview1630') === '1';
    } catch {
      return false;
    }
  })();

  if (!isAfter1630 && !isPreviewParam) {
    return 0;
  }

  const todayStr = getTodayDateString(refDate);
  const storageKey = `vne_daily_close_task_notif_${todayStr}`;

  let sentMemberKeys: string[] = [];
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) sentMemberKeys = JSON.parse(raw);
  } catch {
    sentMemberKeys = [];
  }

  const sentSet = new Set(sentMemberKeys);
  let dispatchedCount = 0;

  // 3. Quét từng account trong hệ thống
  allMembers.forEach((member) => {
    if (!member.name || !member.name.trim()) return;

    // Miễn trừ nếu nhân sự đang nghỉ phép hôm nay
    if (workingTimeService.isMemberOnLeaveToday(member.name, todayStr)) {
      return;
    }

    const memberKey = (member.username || member.name).trim().toLowerCase();
    if (sentSet.has(memberKey)) {
      return;
    }

    // Kiểm tra các task đến hạn hôm nay hoặc quá hạn của nhân sự chưa hoàn thành
    const openTasks = tasks.filter((t) => {
      if (!isSamePersonName(t.assignee, member.name)) return false;
      if (t.status === 'Hoàn thành') return false;
      const due = normalizeDateString(t.dueDate);
      return due === todayStr || due < todayStr;
    });

    const openCount = openTasks.length;

    // Biên tập nội dung chuẩn EDITOR.md: Facts first, ngắn gọn, súc tích, thể chủ động
    const title = 'Đóng task trong ngày (16:30)';
    const content =
      openCount > 0
        ? `Còn ${openCount} việc đến hạn hôm nay chưa đóng. Hoàn thành hoặc dời hạn trước khi kết thúc ca làm việc.`
        : 'Rà soát và đóng toàn bộ công việc đến hạn hôm nay trước khi kết thúc ca làm việc.';

    const notif: NotificationItem = {
      id: `notif-daily-close-${todayStr}-${member.id || Math.random().toString(36).substring(2, 7)}`,
      recipientName: member.name,
      recipientId: member.username || member.id,
      actorName: 'Hệ thống WMS',
      projectName: 'Công việc',
      type: 'daily_close_reminder',
      title,
      content,
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    onDispatchNotification(notif);
    sentSet.add(memberKey);
    dispatchedCount++;
  });

  if (dispatchedCount > 0) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(Array.from(sentSet)));
    } catch (e) {
      console.warn('[DailyCloseTaskAlerts] Lỗi lưu cache localStorage:', e);
    }
  }

  return dispatchedCount;
}
