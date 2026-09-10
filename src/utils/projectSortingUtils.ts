/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProjectItem, TaskItem, MemberItem, ProjectStatus } from '../types';
import { getMemberProjectRelation } from './memberPersonalization';

export const OTHERS_PROJECT_ID = 'proj-others';
export const OTHERS_PROJECT_NAME = 'Chưa xác định (Others)';

/**
 * Normalizes project status to one of 4 standard statuses:
 * 'Chưa triển khai' | 'Đang triển khai' | 'Tạm dừng' | 'Hoàn thành'
 * Converts legacy or alternative 'Đã hoàn thành' to 'Hoàn thành'.
 */
export function normalizeProjectStatus(status?: string): ProjectStatus {
  if (!status) return 'Chưa triển khai';
  if (status === 'Đã hoàn thành' || status === 'Hoàn thành') return 'Hoàn thành';
  if (status === 'Đang triển khai') return 'Đang triển khai';
  if (status === 'Tạm dừng') return 'Tạm dừng';
  if (status === 'Chưa triển khai') return 'Chưa triển khai';
  return 'Chưa triển khai';
}

/**
 * Checks if a project is the special "Chưa xác định (Others)" project
 */
export function isOthersProject(project?: ProjectItem | null): boolean {
  if (!project) return false;
  return (
    project.id === OTHERS_PROJECT_ID ||
    project.code === 'VNE-OTHERS' ||
    project.name.toLowerCase().includes('chưa xác định') ||
    project.name.toLowerCase().includes('others')
  );
}

/**
 * Clean project name by stripping prefix "Dự án "
 */
export function cleanProjectName(name: string): string {
  return name.replace(/^Dự án\s+/i, '').trim();
}

/**
 * Sorts a list of projects alphabetically by Vietnamese collator,
 * keeping the "Chưa xác định (Others)" project strictly at the very end.
 */
export function sortProjectsAlphabetically(projects: ProjectItem[]): ProjectItem[] {
  const regulars = projects.filter((p) => !isOthersProject(p));
  const others = projects.filter(isOthersProject);

  regulars.sort((a, b) => {
    const nameA = cleanProjectName(a.name);
    const nameB = cleanProjectName(b.name);
    return nameA.localeCompare(nameB, 'vi', { sensitivity: 'base' });
  });

  return [...regulars, ...others];
}

/**
 * For Task Creation: splits projects into 2 groups:
 * Group 1: Projects that the member participates in, sorted by latest created task descending
 * Group 2: All other projects, sorted alphabetically A-Z
 * Others Project ("Chưa xác định (Others)"): Always at the very end.
 */
export function getTaskCreationProjectGroups(
  projects: ProjectItem[],
  assigneeName?: string,
  members: MemberItem[] = [],
  tasks: TaskItem[] = []
): {
  myProjects: ProjectItem[];
  otherProjects: ProjectItem[];
  unspecifiedProject: ProjectItem | null;
} {
  const selectedMember = members.find((m) => m.name === assigneeName);

  // Helper to find latest task creation timestamp for a project
  const getLatestTaskTime = (projId: string, projName: string): number => {
    let maxTime = 0;
    for (const t of tasks) {
      if (t.projectId === projId || t.projectName === projName) {
        const time = new Date(t.createdAt || t.updatedAt || 0).getTime();
        if (time > maxTime) maxTime = time;
      }
    }
    return maxTime;
  };

  const unspecified = projects.find((p) => isOthersProject(p)) || null;
  const regularProjects = projects.filter((p) => !isOthersProject(p));

  const myProjects: ProjectItem[] = [];
  const otherProjects: ProjectItem[] = [];

  for (const p of regularProjects) {
    let isParticipating = false;
    if (selectedMember) {
      const relation = getMemberProjectRelation(p, selectedMember, tasks);
      isParticipating = relation.isRelated;
    } else if (assigneeName) {
      const nameLower = assigneeName.toLowerCase();
      const inRoles = p.roles && (
        p.roles.pm?.some((n) => n.toLowerCase().includes(nameLower)) ||
        p.roles.designer?.some((n) => n.toLowerCase().includes(nameLower)) ||
        p.roles.seo?.some((n) => n.toLowerCase().includes(nameLower)) ||
        p.roles.data?.some((n) => n.toLowerCase().includes(nameLower))
      );
      const inLead = p.leadName?.toLowerCase().includes(nameLower);
      const inTasks = tasks.some(
        (t) => (t.projectId === p.id || t.projectName === p.name) && t.assignee?.toLowerCase().includes(nameLower)
      );
      isParticipating = Boolean(inRoles || inLead || inTasks);
    }

    if (isParticipating) {
      myProjects.push(p);
    } else {
      otherProjects.push(p);
    }
  }

  // Sort Group 1: By latest created task timestamp descending, tie-break by name A-Z
  myProjects.sort((a, b) => {
    const timeA = getLatestTaskTime(a.id, a.name);
    const timeB = getLatestTaskTime(b.id, b.name);
    if (timeB !== timeA) return timeB - timeA;
    const nameA = cleanProjectName(a.name);
    const nameB = cleanProjectName(b.name);
    return nameA.localeCompare(nameB, 'vi', { sensitivity: 'base' });
  });

  // Sort Group 2: Alphabetically A-Z
  otherProjects.sort((a, b) => {
    const nameA = cleanProjectName(a.name);
    const nameB = cleanProjectName(b.name);
    return nameA.localeCompare(nameB, 'vi', { sensitivity: 'base' });
  });

  return {
    myProjects,
    otherProjects,
    unspecifiedProject: unspecified,
  };
}
