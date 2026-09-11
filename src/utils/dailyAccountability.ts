/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MemberItem, TaskItem, ProjectItem } from '../types';
import { getUserRole, UserRole } from './rbac';
import { isTaskForMember, isSamePersonName } from './memberPersonalization';
import { getTodayDateString, normalizeDateString } from './dateUtils';
import { formatDateWithEnDay } from './formatters';

export interface DueTaskMemberStatus {
  member: MemberItem;
  role: UserRole;
  tasksDueTodayCount: number;
  tasksDueToday: TaskItem[];
  activeTasksCount: number;
  activeTasks: TaskItem[];
  hasTaskDueToday: boolean;
  projectsInvolvedNames?: string[];
}

export interface DailyDueTaskStatsResult {
  roleScope: 'Admin' | 'Manager' | 'Executive';
  scopeTitle: string;
  scopeSubtitle: string;
  dateStr: string;
  targetMembers: DueTaskMemberStatus[];
  missingMembers: DueTaskMemberStatus[];
  compliantMembers: DueTaskMemberStatus[];
  isCurrentUserMissing: boolean;
  currentUserStatus?: DueTaskMemberStatus;
}

/**
 * Lấy danh sách toàn bộ nhân sự được khai báo trong các dự án mà một Manager phụ trách.
 * QUY CHUẨN: Chỉ tính nhân sự được khai báo chính thức trong roles (pm, designer, seo, data)
 * hoặc leadName của dự án. Nhân sự ngoài dự án chỉ hỗ trợ một vài task sẽ KHÔNG tính vào dự án.
 */
export function getMembersInManagerProjects(
  manager: MemberItem,
  members: MemberItem[],
  projects: ProjectItem[]
): { members: MemberItem[]; projectMap: Map<string, string[]> } {
  // 1. Tìm các dự án do Manager này phụ trách (PM hoặc Lead)
  const managerProjects = projects.filter((p) => {
    const isPm = (p.roles?.pm || []).some((n) => isSamePersonName(n, manager.name));
    const isLead = (p.leadName || '')
      .split(/[,&]/)
      .some((namePart) => isSamePersonName(namePart, manager.name));
    return isPm || isLead;
  });

  // 2. Thu thập nhân sự được khai báo trong dự án theo member.id
  const memberProjectSets = new Map<string, Set<string>>();

  const addProjectForMember = (memberId: string, projName: string) => {
    if (!memberProjectSets.has(memberId)) {
      memberProjectSets.set(memberId, new Set());
    }
    memberProjectSets.get(memberId)!.add(projName);
  };

  managerProjects.forEach((p) => {
    const declaredNames = [
      ...(p.roles?.pm || []),
      ...(p.roles?.designer || []),
      ...(p.roles?.seo || []),
      ...(p.roles?.data || []),
      ...(p.leadName ? p.leadName.split(/[,&]/) : []),
    ];

    declaredNames.forEach((name) => {
      const matchMember = members.find((m) => isSamePersonName(m.name, name));
      if (matchMember) {
        addProjectForMember(matchMember.id, p.name);
      }
    });
  });

  // 3. Lọc danh sách MemberItem có tham gia chính thức trong các dự án này
  const projectMembers = members.filter((m) => memberProjectSets.has(m.id));

  // Fallback: nếu chưa cấu hình dự án cụ thể nào, lấy toàn bộ nhân sự Product
  const finalMembers =
    projectMembers.length > 0
      ? projectMembers
      : members.filter(
          (m) => m.team && ['Product Manager', 'UX/UI Designer', 'SEO', 'Data'].includes(m.team)
        );

  const projectMapFormatted = new Map<string, string[]>();
  finalMembers.forEach((m) => {
    const projs = memberProjectSets.get(m.id);
    projectMapFormatted.set(m.id, projs ? Array.from(projs) : []);
  });

  return { members: finalMembers, projectMap: projectMapFormatted };
}

/**
 * Alias cho getMembersInManagerProjects để tương thích ngược
 */
export function getDesignersInManagerProjects(
  manager: MemberItem,
  members: MemberItem[],
  projects: ProjectItem[],
  _tasks?: TaskItem[]
): { designers: MemberItem[]; projectMap: Map<string, string[]> } {
  const { members: projMembers, projectMap } = getMembersInManagerProjects(manager, members, projects);
  return { designers: projMembers, projectMap };
}

/**
 * Tính toán thống kê nhân sự chưa có task đến hạn hôm nay theo phân quyền RBAC:
 * - Admin: Hiển thị tổng thể toàn bộ phận
 * - Manager: Hiển thị toàn bộ nhân sự được khai báo trong các dự án phụ trách
 * - Executive: Hiển thị với từng cá nhân
 */
export function getDailyDueTaskStats(
  members: MemberItem[],
  tasks: TaskItem[],
  projects: ProjectItem[],
  currentAuthUser?: MemberItem | null,
  activeProductMember?: MemberItem | null,
  targetDateStr: string = getTodayDateString()
): DailyDueTaskStatsResult {
  // Xác định góc nhìn vai trò: ưu tiên activeProductMember nếu có, ngược lại lấy currentAuthUser
  const viewingUser = activeProductMember || currentAuthUser;
  const roleScope = getUserRole(viewingUser);

  let targetMembersList: { member: MemberItem; projectNames?: string[] }[] = [];
  let scopeTitle = '';
  let scopeSubtitle = '';

  if (roleScope === 'Admin') {
    // 1. ADMIN: Tổng thể toàn bộ phận (Product Manager, Designer, SEO, Data)
    const allProductMembers = members.filter((m) =>
      m.team && ['Product Manager', 'UX/UI Designer', 'SEO', 'Data'].includes(m.team)
    );
    targetMembersList = allProductMembers.map((m) => ({ member: m }));
    scopeTitle = 'Toàn bộ phận Sản phẩm';
    scopeSubtitle = 'Phạm vi Quản trị (Admin): Theo dõi tất cả nhân sự trong Ban';
  } else if (roleScope === 'Manager') {
    // 2. MANAGER: Toàn bộ nhân sự được khai báo trong các dự án phụ trách
    const managerUser = viewingUser || currentAuthUser;
    if (managerUser) {
      const { members: projMembers, projectMap } = getMembersInManagerProjects(managerUser, members, projects);
      targetMembersList = projMembers.map((m) => ({
        member: m,
        projectNames: projectMap.get(m.id) || [],
      }));
      scopeTitle = `Nhân sự trong dự án của ${managerUser.name}`;
      scopeSubtitle = 'Phạm vi Quản lý (Manager): Theo dõi nhân sự trong các dự án phụ trách';
    } else {
      const allProductMembers = members.filter((m) =>
        m.team && ['Product Manager', 'UX/UI Designer', 'SEO', 'Data'].includes(m.team)
      );
      targetMembersList = allProductMembers.map((m) => ({ member: m }));
      scopeTitle = 'Nhân sự dự án';
      scopeSubtitle = 'Phạm vi Quản lý (Manager)';
    }
  } else {
    // 3. EXECUTIVE: Hiển thị với từng cá nhân
    const execUser = viewingUser || currentAuthUser;
    if (execUser) {
      targetMembersList = [{ member: execUser }];
      scopeTitle = `Cá nhân: ${execUser.name}`;
      scopeSubtitle = 'Phạm vi Chuyên viên (Executive): Kế hoạch công việc cá nhân trong ngày';
    } else {
      targetMembersList = [];
      scopeTitle = 'Cá nhân';
      scopeSubtitle = 'Phạm vi Chuyên viên (Executive)';
    }
  }

  // Phân tích trạng thái task đến hạn hôm nay cho từng nhân sự trong danh sách mục tiêu
  const targetDateNorm = normalizeDateString(targetDateStr);
  const targetMembers: DueTaskMemberStatus[] = targetMembersList.map(({ member, projectNames }) => {
    const role = getUserRole(member);
    const memberTasks = tasks.filter((t) => isTaskForMember(t, member));

    // Task đến hạn ngày hôm nay (chuẩn hóa định dạng ngày để tránh lệch do timestamp hoặc múi giờ)
    const tasksDueToday = memberTasks.filter((t) => {
      const taskDateNorm = normalizeDateString(t.dueDate);
      return taskDateNorm !== '' && taskDateNorm === targetDateNorm;
    });

    // Task đang thực hiện
    const activeTasks = memberTasks.filter((t) => t.status !== 'Hoàn thành');

    const hasTaskDueToday = tasksDueToday.length > 0;

    return {
      member,
      role,
      tasksDueTodayCount: tasksDueToday.length,
      tasksDueToday,
      activeTasksCount: activeTasks.length,
      activeTasks,
      hasTaskDueToday,
      projectsInvolvedNames: projectNames,
    };
  });

  // Nhân sự chưa có task đến hạn hôm nay
  const missingMembers = targetMembers.filter((s) => !s.hasTaskDueToday);

  // Nhân sự đã có task đến hạn hôm nay
  const compliantMembers = targetMembers.filter((s) => s.hasTaskDueToday);

  // Kiểm tra riêng tài khoản hiện tại
  const currentUserStatus = currentAuthUser
    ? targetMembers.find(
        (s) => s.member.id === currentAuthUser.id || isSamePersonName(s.member.name, currentAuthUser.name)
      )
    : undefined;

  const isCurrentUserMissing = currentUserStatus ? !currentUserStatus.hasTaskDueToday : false;

  return {
    roleScope,
    scopeTitle,
    scopeSubtitle,
    dateStr: targetDateStr,
    targetMembers,
    missingMembers,
    compliantMembers,
    isCurrentUserMissing,
    currentUserStatus,
  };
}

/**
 * Tạo nội dung văn bản đôn đốc nhân sự chưa có task đến hạn hôm nay
 */
export function formatDailyDueUrgeReport(
  stats: DailyDueTaskStatsResult,
  targetDate: Date = new Date()
): string {
  const dateFormatted = formatDateWithEnDay(targetDate);
  let report = `📢 BÁO CÁO ĐÔN ĐỐC CÔNG VIỆC ĐẾN HẠN HÔM NAY (${dateFormatted})\n`;
  report += `==========================================================\n`;
  report += `🎯 Phạm vi: ${stats.scopeTitle} (${stats.scopeSubtitle})\n`;
  report += `📊 Tình trạng: ${stats.compliantMembers.length}/${stats.targetMembers.length} nhân sự đã có task đến hạn hôm nay\n\n`;

  if (stats.missingMembers.length > 0) {
    report += `⚠️ DANH SÁCH NHÂN SỰ CHƯA CÓ TASK ĐẾN HẠN HÔM NAY (${stats.missingMembers.length} người):\n`;
    stats.missingMembers.forEach((item, index) => {
      report += `${index + 1}. [${item.member.team || item.role}] ${item.member.name}\n`;
      if (item.projectsInvolvedNames && item.projectsInvolvedNames.length > 0) {
        report += `   📁 Dự án tham gia: ${item.projectsInvolvedNames.join(', ')}\n`;
      }
      report += `   👉 Đang có: ${item.activeTasksCount} việc đang phụ trách trong hệ thống\n`;
    });
    report += `\nĐề nghị các nhân sự rà soát và cập nhật kế hoạch / hạn chót các đầu việc cho ngày hôm nay!\n`;
  } else {
    report += `🎉 100% nhân sự trong phạm vi đã có task đến hạn ngày hôm nay!\n`;
  }

  report += `==========================================================\n`;
  return report;
}
