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
 * Normalizes a person's full name:
 * - NFC unicode normalization (critical for Vietnamese text composed vs decomposed accents)
 * - Strip trailing phone numbers/IP phone: e.g. " - 4887", "(4597)", " [Designer]"
 * - Strip leading honorifics/salutations: e.g. "Anh ", "Chị ", "Ông ", "Bà ", "Em "
 * - Collapse extra whitespace and lowercase
 */
export function normalizePersonName(name?: string | null): string {
  if (!name) return '';
  return name
    .normalize('NFC')
    .replace(/\s*[-–(].*$/, '')
    .replace(/^(anh|chị|ông|bà|em)\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Checks if two person name strings refer to the same individual
 */
export function isSamePersonName(nameA?: string | null, nameB?: string | null): boolean {
  if (!nameA || !nameB) return false;
  const cleanA = normalizePersonName(nameA);
  const cleanB = normalizePersonName(nameB);
  if (!cleanA || !cleanB) return false;
  return cleanA === cleanB;
}

/**
 * Check if a task is assigned to the given member.
 * Strictly checks full name equality, member ID, username, or email to prevent false collisions
 * between individuals sharing identical first names (e.g. Tiêu Đình Trung vs Vũ Hữu Trung).
 */
export function isTaskForMember(task: TaskItem, member?: MemberItem | null): boolean {
  if (!member || !task) return false;
  const rawAssignee = (task.assignee || '').trim();
  if (!rawAssignee) return false;

  // 1. Direct ID / username / email match
  const rawLower = rawAssignee.toLowerCase();
  if (member.id && rawLower === member.id.toLowerCase()) return true;
  if (member.username && rawLower === member.username.toLowerCase()) return true;
  if (member.email && rawLower === member.email.toLowerCase()) return true;

  // 2. Strict normalized name match (handles NFC/NFD, prefixes like "Anh", suffixes like "- 4597")
  if (isSamePersonName(rawAssignee, member.name)) {
    return true;
  }

  return false;
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

  // 1. Check roles PM
  const isPM = project.roles?.pm?.some((n) => isSamePersonName(n, memName));
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
  const isDesigner = project.roles?.designer?.some((n) => isSamePersonName(n, memName));
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
  const isSEO = project.roles?.seo?.some((n) => isSamePersonName(n, memName));
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
  const isData = project.roles?.data?.some((n) => isSamePersonName(n, memName));
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
  const isLead = (project.leadName || '')
    .split(/[,&]/)
    .some((leadPart) => isSamePersonName(leadPart, memName));
  if (isLead) {
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
  const hasNotes = project.notes?.some((nt) => isSamePersonName(nt.author, memName));
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
