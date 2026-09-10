/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MemberItem, ProjectItem, TaskItem } from '../types';
import { isTaskDueToday, isTaskOverdue } from './dateUtils';

/**
 * Checks if a member belongs to the Product group (Ban Sản phẩm công nghệ)
 */
export function isProductMember(member?: MemberItem | null): boolean {
  if (!member) return false;
  if (member.group === 'Product') return true;
  if (member.team === 'Stakeholder') return false;
  if (member.department?.toLowerCase().includes('sản phẩm')) return true;
  return member.team === 'Product Manager' ||
    member.team === 'UX/UI Designer' ||
    member.team === 'SEO' ||
    member.team === 'Data';
}

/**
 * Filter out only Product members (12 official + any added)
 */
export function getProductMembers(members: MemberItem[]): MemberItem[] {
  return (members || []).filter(isProductMember);
}

/**
 * Check if a task is assigned to the given member
 */
export function isTaskForMember(task: TaskItem, member?: MemberItem | null): boolean {
  if (!member || !task) return false;
  const rawAssignee = (task.assignee || '').trim().toLowerCase();
  const memName = (member.name || '').trim().toLowerCase();
  if (!rawAssignee || !memName) return false;

  return (
    rawAssignee === memName ||
    rawAssignee.includes(memName) ||
    memName.includes(rawAssignee)
  );
}

export interface MemberProjectRelation {
  isRelated: boolean;
  roleLabel: string;
  roleBadgeColor: string;
  assignedTasksCount: number;
}

/**
 * Check if a project involves the member and return their primary role in this project
 */
export function getMemberProjectRelation(
  project: ProjectItem,
  member?: MemberItem | null,
  tasks?: TaskItem[]
): MemberProjectRelation {
  if (!member || !project) {
    return { isRelated: false, roleLabel: '', roleBadgeColor: '', assignedTasksCount: 0 };
  }

  const memName = member.name.trim();
  const memNameLower = memName.toLowerCase();

  // 1. Check roles PM
  const isPM = project.roles?.pm?.some(
    (n) => n.trim().toLowerCase() === memNameLower || n.toLowerCase().includes(memNameLower)
  );
  if (isPM) {
    const tasksCount = (tasks || []).filter(
      (t) => (t.projectId === project.id || t.projectName === project.name) && isTaskForMember(t, member)
    ).length;
    return {
      isRelated: true,
      roleLabel: 'Product Manager',
      roleBadgeColor: 'bg-[#fcf0f5] text-[#b13460] border-[#f3c2d4]',
      assignedTasksCount: tasksCount,
    };
  }

  // 2. Check roles Designer
  const isDesigner = project.roles?.designer?.some(
    (n) => n.trim().toLowerCase() === memNameLower || n.toLowerCase().includes(memNameLower)
  );
  if (isDesigner) {
    const tasksCount = (tasks || []).filter(
      (t) => (t.projectId === project.id || t.projectName === project.name) && isTaskForMember(t, member)
    ).length;
    return {
      isRelated: true,
      roleLabel: 'UX/UI Designer',
      roleBadgeColor: 'bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe]',
      assignedTasksCount: tasksCount,
    };
  }

  // 3. Check roles SEO
  const isSEO = project.roles?.seo?.some(
    (n) => n.trim().toLowerCase() === memNameLower || n.toLowerCase().includes(memNameLower)
  );
  if (isSEO) {
    const tasksCount = (tasks || []).filter(
      (t) => (t.projectId === project.id || t.projectName === project.name) && isTaskForMember(t, member)
    ).length;
    return {
      isRelated: true,
      roleLabel: 'SEO Specialist',
      roleBadgeColor: 'bg-[#faf5ff] text-[#7e22ce] border-[#e9d5ff]',
      assignedTasksCount: tasksCount,
    };
  }

  // 4. Check roles Data
  const isData = project.roles?.data?.some(
    (n) => n.trim().toLowerCase() === memNameLower || n.toLowerCase().includes(memNameLower)
  );
  if (isData) {
    const tasksCount = (tasks || []).filter(
      (t) => (t.projectId === project.id || t.projectName === project.name) && isTaskForMember(t, member)
    ).length;
    return {
      isRelated: true,
      roleLabel: 'Data Specialist',
      roleBadgeColor: 'bg-[#f0fdfa] text-[#0f766e] border-[#99f6e4]',
      assignedTasksCount: tasksCount,
    };
  }

  // 5. Check leadName
  if (project.leadName && project.leadName.toLowerCase().includes(memNameLower)) {
    const tasksCount = (tasks || []).filter(
      (t) => (t.projectId === project.id || t.projectName === project.name) && isTaskForMember(t, member)
    ).length;
    return {
      isRelated: true,
      roleLabel: 'Phụ trách chính',
      roleBadgeColor: 'bg-[#fdf2f8] text-[#be185d] border-[#fbcfe8]',
      assignedTasksCount: tasksCount,
    };
  }

  // 6. Check if member has assigned tasks in this project
  const memberTasksInProj = (tasks || []).filter(
    (t) => (t.projectId === project.id || t.projectName === project.name) && isTaskForMember(t, member)
  );
  if (memberTasksInProj.length > 0) {
    return {
      isRelated: true,
      roleLabel: `${memberTasksInProj.length} việc được giao`,
      roleBadgeColor: 'bg-[#f0fdf4] text-[#15803d] border-[#bbf7d0]',
      assignedTasksCount: memberTasksInProj.length,
    };
  }

  // 7. Check notes author
  const hasNotes = project.notes?.some((nt) => nt.author?.toLowerCase().includes(memNameLower));
  if (hasNotes) {
    return {
      isRelated: true,
      roleLabel: 'Tham gia trao đổi',
      roleBadgeColor: 'bg-[#f8fafc] text-[#475569] border-[#e2e8f0]',
      assignedTasksCount: 0,
    };
  }

  return { isRelated: false, roleLabel: '', roleBadgeColor: '', assignedTasksCount: 0 };
}

/**
 * Calculate personalized summary statistics for a given member
 */
export function getMemberPersonalStats(
  member: MemberItem,
  tasks: TaskItem[],
  projects: ProjectItem[]
) {
  const memberTasks = tasks.filter((t) => isTaskForMember(t, member));
  const activeTasks = memberTasks.filter((t) => t.status !== 'Hoàn thành');
  const completedTasks = memberTasks.filter((t) => t.status === 'Hoàn thành');
  const blockedTasks = memberTasks.filter((t) => t.status === 'Bị nghẽn');
  const todayTasks = activeTasks.filter((t) => isTaskDueToday(t));
  const overdueTasks = activeTasks.filter((t) => isTaskOverdue(t));

  const memberProjects = projects.filter(
    (p) => getMemberProjectRelation(p, member, tasks).isRelated
  );

  return {
    totalTasks: memberTasks.length,
    activeTasks: activeTasks.length,
    completedTasks: completedTasks.length,
    blockedTasks: blockedTasks.length,
    todayTasks: todayTasks.length,
    overdueTasks: overdueTasks.length,
    relatedProjectsCount: memberProjects.length,
  };
}

/**
 * Check if a task belongs to any project that the member is involved with
 */
export function isTaskInMemberProjects(
  task: TaskItem,
  member?: MemberItem | null,
  projects: ProjectItem[] = []
): boolean {
  if (!member || !task) return false;
  // If task is directly assigned to member
  if (isTaskForMember(task, member)) return true;

  // Otherwise check if task's project is related to member
  const relatedProj = projects.find(
    (p) => p.id === task.projectId || p.name === task.projectName
  );
  if (!relatedProj) return false;
  return getMemberProjectRelation(relatedProj, member).isRelated;
}
