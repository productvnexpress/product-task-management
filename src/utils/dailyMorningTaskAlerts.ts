/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MemberItem, NotificationItem, TaskItem } from '../types';
import { getTodayDateString, normalizeDateString } from './dateUtils';
import { isSamePersonName, getProductMembers } from './memberPersonalization';
import { workingTimeService } from '../services/workingTimeService';

/**
 * Kiểm tra và phát thông báo nhắc nhở lập kế hoạch task vào lúc 08:30 sáng các ngày làm việc
 * - Điều kiện: Ngày làm việc (loại trừ Thứ 7, CN và ngày nghỉ lễ theo workingTimeService)
 * - Mốc giờ: Từ 08:30 trở đi (hoặc preview param ?morningTaskAlert=1 hoặc ?preview0830=1)
 * - Đối tượng: Toàn bộ nhân sự thuộc bộ phận Product (PM, Designer, SEO, Data)
 * - Miễn trừ: Nhân sự đang nghỉ phép hôm nay được miễn trừ hoàn toàn
 * - Tiêu chí nhắc: Chỉ nhắc nhân sự CHƯA CÓ task nào đến hạn hôm nay (tasksDueToday.length === 0)
 * - Chống trùng lặp: Lưu mã ngày vào localStorage, mỗi nhân sự chỉ nhận tối đa 1 thông báo/ngày
 * - Biên tập chuẩn EDITOR.md: Facts first, ngắn gọn, súc tích, thể chủ động, cắt bỏ từ rườm rà
 */
export function checkAndDispatchDailyMorningTaskNotifications(
  tasks: TaskItem[],
  allMembers: MemberItem[],
  onDispatchNotification: (notif: NotificationItem) => void,
  refDate: Date = new Date()
): number {
  // 1. Kiểm tra ngày làm việc (không gửi vào cuối tuần / ngày nghỉ lễ)
  if (!workingTimeService.isWorkingDay(refDate)) {
    return 0;
  }

  // 2. Kiểm tra khung giờ 08:30
  const hours = refDate.getHours();
  const minutes = refDate.getMinutes();
  const timeInMinutes = hours * 60 + minutes;

  // 08:30 tương đương 8 * 60 + 30 = 510 phút
  const isAfter0830 = timeInMinutes >= 510;

  // Hỗ trợ preview / test qua URL param
  const isPreviewParam = (() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('morningTaskAlert') === '1' || urlParams.get('preview0830') === '1';
    } catch {
      return false;
    }
  })();

  if (!isAfter0830 && !isPreviewParam) {
    return 0;
  }

  const todayStr = getTodayDateString(refDate);
  const storageKey = `vne_daily_morning_task_notif_${todayStr}`;

  let sentMemberKeys: string[] = [];
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) sentMemberKeys = JSON.parse(raw);
  } catch {
    sentMemberKeys = [];
  }

  const sentSet = new Set(sentMemberKeys);
  let dispatchedCount = 0;

  // 3. Chỉ xét các nhân sự thuộc bộ phận Product
  const productMembers = getProductMembers(allMembers);
  const leavesToday = workingTimeService.getLeavesForDate(todayStr);

  productMembers.forEach((member) => {
    if (!member.name || !member.name.trim()) return;

    // Miễn trừ nếu nhân sự đang nghỉ phép hôm nay
    if (leavesToday.some((l) => isSamePersonName(l.memberName, member.name))) {
      return;
    }

    const memberKey = (member.username || member.name).trim().toLowerCase();
    if (sentSet.has(memberKey)) {
      return;
    }

    // Kiểm tra nhân sự đã có task đến hạn hôm nay chưa
    const memberTasks = tasks.filter((t) => isSamePersonName(t.assignee, member.name));
    const tasksDueToday = memberTasks.filter((t) => {
      const due = normalizeDateString(t.dueDate);
      return due === todayStr;
    });

    // Nếu đã có ít nhất 1 task đến hạn hôm nay -> không cần nhắc
    if (tasksDueToday.length > 0) {
      return;
    }

    // Biên tập nội dung chuẩn EDITOR.md: Facts first, ngắn gọn, súc tích, thể chủ động
    const title = 'Nhắc việc trong ngày (08:30)';
    const content = 'Bạn chưa có task đến hạn hôm nay. Vui lòng tạo việc hoặc cập nhật hạn hoàn thành.';

    const safeKey = (member.username || member.name).toLowerCase().replace(/[\s\/\\]+/g, '_');
    const notif: NotificationItem = {
      id: `notif-daily-morning-${todayStr}-${safeKey}`,
      recipientName: member.name,
      recipientId: member.username || member.id,
      actorName: 'Hệ thống WMS',
      projectName: 'Công việc',
      type: 'daily_task_reminder',
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
      console.warn('[DailyMorningTaskAlerts] Lỗi lưu cache localStorage:', e);
    }
  }

  return dispatchedCount;
}
