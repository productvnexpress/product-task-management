/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MemberItem, TaskItem, ProjectItem, TrashItem } from '../types';

/**
 * 3 Nhóm quyền chuẩn hóa của hệ thống:
 * 1. Executive: a1234, b2, c2, d25 (Chuyên viên UX/UI, SEO, Data - chỉ sửa, xoá cái mình tạo, chỉ khôi phục cái mình xoá)
 * 2. Manager: a1234, b12345, c2, d25 (Quản lý sản phẩm PM - chỉ sửa, xoá cái mình tạo, chỉ khôi phục cái mình xoá)
 * 3. Admin: a1234, b12345, c12345, d245 (Quản trị viên toàn quyền - dành riêng cho tài khoản Đặng Tiến Ngọc `tienngoc`)
 */
export type UserRole = 'Admin' | 'Manager' | 'Executive';

/**
 * Xác định nhóm quyền của tài khoản người dùng
 */
export const getUserRole = (user: MemberItem | null | undefined): UserRole => {
  if (!user) return 'Executive';

  const username = (user.username || '').trim().toLowerCase();
  const email = (user.email || '').trim().toLowerCase();
  const name = (user.name || '').trim().toLowerCase();

  // 1. Admin: Đặng Tiến Ngọc (tienngoc)
  if (
    username === 'tienngoc' ||
    email === 'tienngoc@vnexpress.net' ||
    name.includes('tiến ngọc') ||
    name.includes('tien ngoc')
  ) {
    return 'Admin';
  }

  // 2. Manager: Nguyễn Trung Hiếu (nguyenhieu), Trần Huy Anh (huyanh)
  if (
    username === 'nguyenhieu' ||
    username === 'huyanh' ||
    email === 'nguyenhieu@vnexpress.net' ||
    email === 'huyanh@vnexpress.net' ||
    name.includes('trung hiếu') ||
    name.includes('trung hieu') ||
    name.includes('huy anh')
  ) {
    return 'Manager';
  }

  // 3. Executive: Toàn bộ nhân sự Product còn lại (UX/UI Designer, SEO, Data...)
  return 'Executive';
};

/**
 * Lấy nhãn hiển thị và màu sắc nhận diện của vai trò
 */
export const getRoleDisplayInfo = (role: UserRole) => {
  switch (role) {
    case 'Admin':
      return {
        role,
        label: 'Admin (Quản trị)',
        shortLabel: 'Admin',
        badgeClass: 'bg-[#fff1f2] text-[#be123c] border-[#fecdd3]',
        dotColor: 'bg-[#be123c]',
      };
    case 'Manager':
      return {
        role,
        label: 'Manager (Quản lý)',
        shortLabel: 'Manager',
        badgeClass: 'bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe]',
        dotColor: 'bg-[#1d4ed8]',
      };
    case 'Executive':
    default:
      return {
        role,
        label: 'Executive (Chuyên viên)',
        shortLabel: 'Executive',
        badgeClass: 'bg-[#f0fdf4] text-[#15803d] border-[#bbf7d0]',
        dotColor: 'bg-[#15803d]',
      };
  }
};

/**
 * Kiểm tra xem người dùng có phải là người tạo công việc không
 * Hỗ trợ fallback kiểm tra người phụ trách (assignee) nếu công việc chưa có createdBy
 */
export const isTaskCreator = (task: TaskItem, user: MemberItem | null | undefined): boolean => {
  if (!user) return false;
  const userName = (user.name || '').trim().toLowerCase();
  const userUsername = (user.username || '').trim().toLowerCase();

  // 1. Kiểm tra trường createdBy trực tiếp
  if (task.createdBy) {
    const cb = (task.createdBy || '').trim().toLowerCase();
    if (cb === userName || (userUsername && cb === userUsername)) {
      return true;
    }
  }

  // 2. Kiểm tra log khởi tạo (Log đầu tiên)
  if (task.logs && task.logs.length > 0) {
    const creationLog = task.logs.find(
      (l) =>
        l.action?.toLowerCase().includes('tạo') ||
        l.action?.toLowerCase().includes('khởi tạo') ||
        l.action?.toLowerCase().includes('create')
    );
    if (creationLog && creationLog.author) {
      const auth = (creationLog.author || '').trim().toLowerCase();
      if (auth === userName || (userUsername && auth === userUsername)) {
        return true;
      }
    }
  }

  // 3. Fallback: Nếu công việc được giao trực tiếp cho người dùng
  if (task.assignee) {
    const asg = (task.assignee || '').trim().toLowerCase();
    if (asg === userName || (userUsername && asg === userUsername)) {
      return true;
    }
  }

  return false;
};

/**
 * Kiểm tra xem người dùng có phải là người tạo dự án không
 */
export const isProjectCreator = (project: ProjectItem, user: MemberItem | null | undefined): boolean => {
  if (!user) return false;
  const userName = (user.name || '').trim().toLowerCase();
  const userUsername = (user.username || '').trim().toLowerCase();

  // 1. Kiểm tra trường createdBy trực tiếp
  if (project.createdBy) {
    const cb = (project.createdBy || '').trim().toLowerCase();
    if (cb === userName || (userUsername && cb === userUsername)) {
      return true;
    }
  }

  // 2. Lead phụ trách dự án
  if (project.leadName) {
    const lead = (project.leadName || '').toLowerCase();
    if (lead.includes(userName) || (userUsername && lead.includes(userUsername))) {
      return true;
    }
  }

  // 3. Phân vai PM của dự án
  if (project.roles?.pm && Array.isArray(project.roles.pm) && project.roles.pm.some((p) => (p || '').toLowerCase().includes(userName))) {
    return true;
  }

  return false;
};

/**
 * Kiểm tra người dùng có phải là người đã xoá mục trong thùng rác không
 */
export const isTrashItemDeleter = (item: TrashItem, user: MemberItem | null | undefined): boolean => {
  if (!user) return false;
  const userName = (user.name || '').trim().toLowerCase();
  const userUsername = (user.username || '').trim().toLowerCase();
  const deletedBy = (item.deletedBy || '').trim().toLowerCase();

  return deletedBy === userName || (!!userUsername && deletedBy === userUsername);
};

// ==========================================
// A. QUYỀN TRÊN CÔNG VIỆC (TASKS - a1234)
// ==========================================

export const canCreateTask = (_user: MemberItem | null | undefined): boolean => {
  // a1: Cả 3 nhóm (Executive, Manager, Admin) đều có quyền tạo công việc
  return true;
};

export const canViewTask = (_user: MemberItem | null | undefined): boolean => {
  // a2: Mặt phẳng chung - tất cả đều có quyền xem
  return true;
};

/**
 * Kiểm tra quyền chỉnh sửa công việc:
 * - Admin: Toàn quyền chỉnh sửa mọi công việc
 * - Manager: Có quyền chỉnh sửa việc của các nhân sự trong dự án mà mình phụ trách;
 *            không được phép chỉnh sửa dự án không phụ trách (trừ việc do mình tạo).
 * - Executive: Chỉ sửa công việc do chính mình tạo / được giao.
 */
export const canEditTask = (
  user: MemberItem | null | undefined,
  task: TaskItem,
  projects?: ProjectItem[]
): boolean => {
  if (!user) return false;
  const role = getUserRole(user);
  if (role === 'Admin') return true;

  if (role === 'Manager') {
    if (projects && projects.length > 0 && task.projectId) {
      const targetProj = projects.find((p) => p.id === task.projectId);
      if (targetProj) {
        if (isProjectCreator(targetProj, user)) {
          return true; // Phụ trách dự án này: được sửa việc của mọi nhân sự trong dự án
        }
        // Không phụ trách dự án này: chỉ được sửa nếu là việc do chính mình tạo
        return isTaskCreator(task, user);
      }
    }
    return isTaskCreator(task, user);
  }

  // Executive: Chỉ sửa công việc do mình tạo/được giao
  return isTaskCreator(task, user);
};

/**
 * Kiểm tra quyền xóa công việc
 */
export const canDeleteTask = (
  user: MemberItem | null | undefined,
  task: TaskItem,
  projects?: ProjectItem[]
): boolean => {
  if (!user) return false;
  const role = getUserRole(user);
  if (role === 'Admin') return true;

  if (role === 'Manager') {
    if (projects && projects.length > 0 && task.projectId) {
      const targetProj = projects.find((p) => p.id === task.projectId);
      if (targetProj) {
        if (isProjectCreator(targetProj, user)) {
          return true;
        }
        return isTaskCreator(task, user);
      }
    }
    return isTaskCreator(task, user);
  }

  return isTaskCreator(task, user);
};

// ==========================================
// B. QUYỀN TRÊN DỰ ÁN (PROJECTS - b)
// ==========================================

export const canCreateProject = (user: MemberItem | null | undefined): boolean => {
  if (!user) return false;
  const role = getUserRole(user);
  // b1: Admin và Manager có quyền tạo dự án; Executive không có quyền tạo (b2)
  return role === 'Admin' || role === 'Manager';
};

export const canViewProject = (_user: MemberItem | null | undefined): boolean => {
  // b2: Mặt phẳng chung - tất cả đều có quyền xem dự án
  return true;
};

export const canEditProject = (user: MemberItem | null | undefined, project: ProjectItem): boolean => {
  if (!user) return false;
  const role = getUserRole(user);
  if (role === 'Admin') return true;
  if (role === 'Manager') {
    // b3: Manager chỉ sửa dự án mình tạo
    return isProjectCreator(project, user);
  }
  // Executive: b2 (chỉ xem, không sửa)
  return false;
};

export const canDeleteProject = (user: MemberItem | null | undefined, project: ProjectItem): boolean => {
  if (!user) return false;
  const role = getUserRole(user);
  if (role === 'Admin') return true;
  if (role === 'Manager') {
    // b4: Manager chỉ xoá dự án mình tạo
    return isProjectCreator(project, user);
  }
  // Executive: b2 (chỉ xem, không xoá)
  return false;
};

/**
 * Kiểm tra xem người dùng có phải là nhân sự UX/UI Designer không
 */
export const isUserDesigner = (user: MemberItem | null | undefined): boolean => {
  if (!user) return false;
  const team = (user.team || '').toLowerCase();
  const title = (user.title || '').toLowerCase();
  const group = (user.group || '').toLowerCase();
  const dept = (user.department || '').toLowerCase();
  return (
    team.includes('designer') ||
    team.includes('ux/ui') ||
    title.includes('designer') ||
    title.includes('thiết kế') ||
    group.includes('designer') ||
    dept.includes('designer')
  );
};

/**
 * Kiểm tra quyền chỉnh sửa liên kết trong Dự án (Section 3: Liên kết):
 * - Admin: Toàn quyền
 * - Manager phụ trách dự án: Có quyền
 * - UX/UI Designer: Có quyền chỉnh sửa thông tin các link trong Dự án để hỗ trợ cho PM
 */
export const canEditProjectLinks = (
  user: MemberItem | null | undefined,
  project?: ProjectItem | null
): boolean => {
  if (!user) return false;
  const role = getUserRole(user);
  if (role === 'Admin') return true;

  // Manager phụ trách dự án
  if (role === 'Manager' && project && isProjectCreator(project, user)) {
    return true;
  }

  // Nhân sự UX/UI Designer:
  // 1. Thuộc nhóm/chức danh UX/UI Designer
  if (isUserDesigner(user)) return true;

  // 2. Hoặc được phân công làm Designer trong dự án này
  if (project?.roles?.designer && Array.isArray(project.roles.designer)) {
    const userName = (user.name || '').trim().toLowerCase();
    if (project.roles.designer.some((d) => (d || '').toLowerCase().includes(userName))) {
      return true;
    }
  }

  return false;
};

// ==========================================
// C. QUYỀN TRÊN NHÂN SỰ (MEMBERS - c)
// ==========================================

export const canCreateMember = (user: MemberItem | null | undefined): boolean => {
  if (!user) return false;
  // c1: Chỉ Admin mới có quyền tạo nhân sự
  return getUserRole(user) === 'Admin';
};

export const canViewMember = (_user: MemberItem | null | undefined): boolean => {
  // c2: Mặt phẳng chung - tất cả đều có quyền xem nhân sự
  return true;
};

export const canEditMember = (user: MemberItem | null | undefined, _member?: MemberItem): boolean => {
  if (!user) return false;
  // c3: Chỉ Admin mới có quyền sửa thông tin nhân sự
  return getUserRole(user) === 'Admin';
};

export const canDeleteMember = (user: MemberItem | null | undefined, _member?: MemberItem): boolean => {
  if (!user) return false;
  // c4: Chỉ Admin mới có quyền xoá nhân sự
  return getUserRole(user) === 'Admin';
};

// ==========================================
// D. QUYỀN TRÊN THÙNG RÁC (TRASH - d)
// ==========================================

export const canViewTrash = (_user: MemberItem | null | undefined): boolean => {
  // d2: Mặt phẳng chung - tất cả đều xem được thùng rác
  return true;
};

export const canRestoreTrashItem = (user: MemberItem | null | undefined, item: TrashItem): boolean => {
  if (!user) return false;
  const role = getUserRole(user);
  if (role === 'Admin') return true;
  // d5: Manager & Executive chỉ khôi phục mục do chính mình đã xoá
  return isTrashItemDeleter(item, user);
};

export const canPermanentDeleteTrash = (user: MemberItem | null | undefined): boolean => {
  if (!user) return false;
  // d4: Chỉ Admin mới có quyền xoá vĩnh viễn
  return getUserRole(user) === 'Admin';
};

export const canEmptyTrash = (user: MemberItem | null | undefined): boolean => {
  if (!user) return false;
  // d4: Chỉ Admin mới có quyền dọn sạch toàn bộ thùng rác
  return getUserRole(user) === 'Admin';
};
