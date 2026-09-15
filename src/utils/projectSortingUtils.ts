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
export function isOthersProject(project: ProjectItem | string): boolean {
  if (!project) return false;
  if (typeof project === 'string') {
    return project === OTHERS_PROJECT_ID || (project || '').toLowerCase() === 'khác';
  }
  const name = (project.name || '').toLowerCase();
  return (
    project.id === OTHERS_PROJECT_ID ||
    project.code === 'VNE-OTHERS' ||
    name.includes('chưa xác định') ||
    name.includes('others')
  );
}

/**
 * Clean project name by stripping prefix "Dự án "
 */
export function cleanProjectName(name?: string): string {
  return (name || '').replace(/^Dự án\s+/i, '').trim();
}

/**
 * Generates a clean, unique uppercase project code based on the project name.
 * e.g. "Xe" -> "VNE-XE"
 * e.g. "Bất động sản" -> "VNE-BDS"
 */
export function generateProjectCode(name: string, existingCodes: string[] = []): string {
  const clean = cleanProjectName(name);
  if (!clean) {
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `VNE-PRJ-${rand}`;
  }

  // Remove accents / diacritics
  const ascii = clean
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
    .trim();

  const words = ascii.split(/\s+/).filter(Boolean);
  let baseSlug = '';

  if (words.length === 1) {
    baseSlug = words[0].slice(0, 10);
  } else if (words.length === 2) {
    baseSlug = `${words[0].slice(0, 5)}${words[1].slice(0, 5)}`;
  } else if (words.length <= 4) {
    const totalLen = words.reduce((acc, w) => acc + w.length, 0);
    if (totalLen <= 10) {
      baseSlug = words.join('');
    } else {
      baseSlug = words.map((w) => w[0]).join('');
    }
  } else {
    baseSlug = words.map((w) => w[0]).join('').slice(0, 8);
  }

  if (!baseSlug) {
    baseSlug = `PRJ-${Date.now().toString().slice(-4)}`;
  }

  const baseCode = `VNE-${baseSlug}`;
  const existingSet = new Set(
    existingCodes.map((c) => (c || '').trim().toUpperCase())
  );

  if (!existingSet.has(baseCode)) {
    return baseCode;
  }

  let counter = 2;
  while (existingSet.has(`${baseCode}-${counter}`)) {
    counter++;
  }
  return `${baseCode}-${counter}`;
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
      const nameLower = (assigneeName || '').toLowerCase();
      const inRoles = p.roles && (
        p.roles.pm?.some((n) => (n || '').toLowerCase().includes(nameLower)) ||
        p.roles.designer?.some((n) => (n || '').toLowerCase().includes(nameLower)) ||
        p.roles.seo?.some((n) => (n || '').toLowerCase().includes(nameLower)) ||
        p.roles.data?.some((n) => (n || '').toLowerCase().includes(nameLower))
      );
      const inLead = (p.leadName || '').toLowerCase().includes(nameLower);
      const inTasks = tasks.some(
        (t) => (t.projectId === p.id || t.projectName === p.name) && (t.assignee || '').toLowerCase().includes(nameLower)
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
