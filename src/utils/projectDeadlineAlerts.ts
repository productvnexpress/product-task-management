/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProjectItem, TaskItem, MemberItem, NotificationItem } from '../types';
import { getDaysDifference, getTodayDateString, normalizeDateString } from './dateUtils';
import { formatDateWithEnDay } from './formatters';
import { getProjectPMs, isSamePersonName } from './memberPersonalization';

export interface ProjectDeadlineAlertItem {
  id: string;
  type: 'phase' | 'project';
  projectId: string;
  projectName: string;
  projectCode: string;
  phaseId?: string;
  phaseName?: string;
  dueDate: string;
  diffDays: number;
  urgency: 'overdue' | 'today' | 'soon';
  status: string;
  pmNames: string[];
  allMemberNames: string[];
}

/**
 * Lấy danh sách họ tên tất cả nhân sự liên quan trong dự án
 * (Gồm PM, Designer, SEO, Data, Lead, PO, Creator và nhân sự có task trong dự án)
 */
export function getProjectAllMembers(
  proj: ProjectItem | undefined | null,
  allMembers: MemberItem[] = [],
  tasks: TaskItem[] = []
): string[] {
  if (!proj) return [];
  const memberSet = new Set<string>();

  // 1. PMs
  getProjectPMs(proj, allMembers).forEach((name) => {
    if (name && name.trim()) memberSet.add(name.trim());
  });

  // 2. Roles: Designer, SEO, Data
  proj.roles?.designer?.forEach((name) => name && name.trim() && memberSet.add(name.trim()));
  proj.roles?.seo?.forEach((name) => name && name.trim() && memberSet.add(name.trim()));
  proj.roles?.data?.forEach((name) => name && name.trim() && memberSet.add(name.trim()));

  // 3. Product Owner & Lead
  if (proj.productOwner?.trim()) memberSet.add(proj.productOwner.trim());
  if (proj.leadName?.trim()) {
    proj.leadName.split(/[,&]/).forEach((n) => n && n.trim() && memberSet.add(n.trim()));
  }
  if (proj.createdBy?.trim()) memberSet.add(proj.createdBy.trim());

  // 4. Nhân sự đang có công việc trong dự án
  tasks.forEach((t) => {
    if ((t.projectId === proj.id || t.projectName === proj.name) && t.assignee?.trim()) {
      memberSet.add(t.assignee.trim());
    }
  });

  return Array.from(memberSet);
}

/**
 * Lọc và tổng hợp các Giai đoạn hoặc Deadline dự án sắp đến hạn trong vòng 3 ngày hoặc đã quá hạn
 */
/**
 * Kiểm tra xem giai đoạn đã hoàn thành hay chưa (hỗ trợ cả 'Đã hoàn thành', 'Hoàn thành', 'completed', 'done')
 */
export function isPhaseCompleted(status?: string | null): boolean {
  if (!status) return false;
  const s = status.trim().toLowerCase();
  return s === 'đã hoàn thành' || s === 'hoàn thành' || s === 'completed' || s === 'done';
}

/**
 * Kiểm tra xem dự án đã hoàn thành hay chưa
 */
export function isProjectCompleted(status?: string | null): boolean {
  if (!status) return false;
  const s = status.trim().toLowerCase();
  return s === 'đã hoàn thành' || s === 'hoàn thành' || s === 'completed' || s === 'done';
}

/**
 * Lọc và trích xuất danh sách các cảnh báo hạn chót giai đoạn và hạn chót dự án
 * Điều kiện: Chưa hoàn thành, có hạn chót, và trong vòng 3 ngày tới (diffDays <= 3) bao gồm cả quá hạn (diffDays < 0).
 */
export function getProjectDeadlineAlerts(
  projects: ProjectItem[] = [],
  tasks: TaskItem[] = [],
  allMembers: MemberItem[] = [],
  currentMember?: MemberItem | null,
  isAdmin: boolean = false
): ProjectDeadlineAlertItem[] {
  const todayStr = getTodayDateString();
  const alerts: ProjectDeadlineAlertItem[] = [];

  projects.forEach((proj) => {
    // Bỏ qua dự án đã Hoàn thành
    if (isProjectCompleted(proj.status)) return;

    const pmNames = getProjectPMs(proj, allMembers);
    const allMemberNames = getProjectAllMembers(proj, allMembers, tasks);

    // 1. Kiểm tra Deadline tổng của Dự án (targetDate)
    if (proj.targetDate) {
      const normTargetDate = normalizeDateString(proj.targetDate);
      if (normTargetDate) {
        const diffDays = getDaysDifference(normTargetDate, todayStr);
        // Cảnh báo khi trong vòng 3 ngày tới hoặc đã quá hạn
        if (diffDays <= 3) {
          alerts.push({
            id: `deadline-proj-${proj.id}`,
            type: 'project',
            projectId: proj.id,
            projectName: proj.name,
            projectCode: proj.code || 'PRJ',
            dueDate: normTargetDate,
            diffDays,
            urgency: diffDays < 0 ? 'overdue' : diffDays === 0 ? 'today' : 'soon',
            status: proj.status,
            pmNames,
            allMemberNames,
          });
        }
      }
    }

    // 2. Kiểm tra Hạn chót từng Giai đoạn của Dự án (phase.dueDate)
    if (proj.phases && Array.isArray(proj.phases) && proj.phases.length > 0) {
      proj.phases.forEach((phase) => {
        // Bỏ qua giai đoạn đã hoàn thành ('Đã hoàn thành', 'Hoàn thành', v.v.)
        if (isPhaseCompleted(phase.status)) return;
        if (!phase.dueDate) return;

        const normPhaseDueDate = normalizeDateString(phase.dueDate);
        if (!normPhaseDueDate) return;

        const diffDays = getDaysDifference(normPhaseDueDate, todayStr);
        // Cảnh báo khi trong vòng 3 ngày tới hoặc đã quá hạn
        if (diffDays <= 3) {
          alerts.push({
            id: `deadline-phase-${proj.id}-${phase.id}`,
            type: 'phase',
            projectId: proj.id,
            projectName: proj.name,
            projectCode: proj.code || 'PRJ',
            phaseId: phase.id,
            phaseName: phase.name,
            dueDate: normPhaseDueDate,
            diffDays,
            urgency: diffDays < 0 ? 'overdue' : diffDays === 0 ? 'today' : 'soon',
            status: phase.status,
            pmNames,
            allMemberNames,
          });
        }
      });
    }
  });

  // Phân quyền hiển thị: Admin thấy tất cả; PM và thành viên chỉ thấy dự án mình tham gia
  const filteredAlerts = alerts.filter((item) => {
    if (isAdmin) return true;
    if (!currentMember) return false;
    return item.allMemberNames.some((mName) => isSamePersonName(mName, currentMember.name));
  });

  // Sắp xếp: Quá hạn trước (quá hạn lâu nhất lên đầu), sau đó đến hôm nay, rồi đến sắp đến hạn
  return filteredAlerts.sort((a, b) => {
    if (a.diffDays !== b.diffDays) {
      return a.diffDays - b.diffDays;
    }
    return a.projectName.localeCompare(b.projectName);
  });
}

/**
 * Tự động kiểm tra và bắn thông báo định kỳ (Notification Drawer + Web Push)
 * cho PM và các nhân sự trong dự án khi giai đoạn hoặc dự án đến hạn trước 3 ngày.
 * Tích hợp cơ chế chống spam (tối đa 1 thông báo/ngày cho cùng 1 mốc và người nhận).
 */
export function checkAndDispatchProjectDeadlineNotifications(
  projects: ProjectItem[],
  tasks: TaskItem[],
  allMembers: MemberItem[],
  existingNotifications: NotificationItem[],
  onDispatchNotification: (notif: NotificationItem) => void
): number {
  const todayStr = getTodayDateString();
  const storageKey = `vne_deadline_notif_sent_${todayStr}`;

  // Đọc danh sách ID mốc đã gửi trong ngày hôm nay từ localStorage
  let sentIdsToday: string[] = [];
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) sentIdsToday = JSON.parse(raw);
  } catch (e) {
    sentIdsToday = [];
  }

  const sentIdSet = new Set(sentIdsToday);

  // Lấy tất cả cảnh báo hệ thống (bỏ qua filter để quét cho mọi nhân sự)
  const allAlerts = getProjectDeadlineAlerts(projects, tasks, allMembers, null, true);
  let dispatchedCount = 0;

  allAlerts.forEach((alert) => {
    const pmDisplay = alert.pmNames.length > 0 ? alert.pmNames.join(', ') : 'Chưa phân công';

    // Bắn thông báo cho từng nhân sự tham gia dự án
    alert.allMemberNames.forEach((recipientName) => {
      const recipientMember = allMembers.find((m) => isSamePersonName(m.name, recipientName));
      const notifKey = `${alert.id}:${recipientName.trim().toLowerCase()}`;

      // 1. Kiểm tra đã gửi hôm nay chưa (chống spam)
      if (sentIdSet.has(notifKey)) return;

      // 2. Kiểm tra thêm trong existingNotifications nếu đã có thông báo tương đương hôm nay
      const hasDuplicateInState = existingNotifications.some((n) => {
        if (!isSamePersonName(n.recipientName, recipientName)) return false;
        if (n.projectId !== alert.projectId) return false;
        if (alert.type === 'phase' && n.phaseId !== alert.phaseId) return false;
        const nDate = n.createdAt?.slice(0, 10);
        return nDate === todayStr;
      });

      if (hasDuplicateInState) return;

      // 3. Soạn nội dung thông báo chuẩn EDITOR.md (Facts first, súc tích)
      let title = '';
      let content = '';
      const dateFormatted = formatDateWithEnDay(alert.dueDate);

      if (alert.type === 'phase') {
        const phaseTitle = alert.phaseName || 'Giai đoạn';
        if (alert.diffDays < 0) {
          title = `Giai đoạn "${phaseTitle}" quá hạn ${Math.abs(alert.diffDays)} ngày (${dateFormatted})`;
        } else if (alert.diffDays === 0) {
          title = `Giai đoạn "${phaseTitle}" đến hạn hôm nay (${dateFormatted})`;
        } else {
          title = `Giai đoạn "${phaseTitle}" đến hạn trong ${alert.diffDays} ngày (${dateFormatted})`;
        }
        content = `Dự án: ${alert.projectName} [${alert.projectCode}]. PM phụ trách: ${pmDisplay}. Vui lòng kiểm tra tiến độ nghiệm thu.`;
      } else {
        if (alert.diffDays < 0) {
          title = `Deadline dự án "${alert.projectName}" quá hạn ${Math.abs(alert.diffDays)} ngày (${dateFormatted})`;
        } else if (alert.diffDays === 0) {
          title = `Deadline dự án "${alert.projectName}" đến hạn hôm nay (${dateFormatted})`;
        } else {
          title = `Deadline dự án "${alert.projectName}" đến hạn trong ${alert.diffDays} ngày (${dateFormatted})`;
        }
        content = `Dự án [${alert.projectCode}] cần hoàn thành mục tiêu. PM phụ trách: ${pmDisplay}.`;
      }

      const notif: NotificationItem = {
        id: `notif-deadline-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        recipientName,
        recipientId: recipientMember?.username || recipientMember?.id,
        actorName: 'Hệ thống Quản trị (Cảnh báo Hạn chót)',
        projectId: alert.projectId,
        projectName: alert.projectName,
        phaseId: alert.phaseId,
        phaseName: alert.phaseName,
        type: alert.type === 'phase' ? 'phase_due_soon' : 'project_due_soon',
        title,
        content,
        isRead: false,
        createdAt: new Date().toISOString(),
      };

      onDispatchNotification(notif);
      sentIdSet.add(notifKey);
      dispatchedCount++;
    });
  });

  // Lưu lại các key đã gửi hôm nay vào localStorage
  try {
    localStorage.setItem(storageKey, JSON.stringify(Array.from(sentIdSet)));
  } catch (e) {}

  return dispatchedCount;
}
