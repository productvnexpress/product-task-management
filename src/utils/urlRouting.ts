/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ActiveTab, TaskItem, ProjectItem } from '../types';

export interface ParsedRoute {
  tab: ActiveTab;
  taskId?: string;
  projectIdOrCode?: string;
  projectFilter?: string;
}

const TAB_PATH_MAP: Record<string, ActiveTab> = {
  tasks: 'tasks',
  'cong-viec': 'tasks',
  projects: 'projects',
  'du-an': 'projects',
  members: 'members',
  'nhan-su': 'members',
  settings: 'settings',
  'thiet-lap': 'settings',
  trash: 'trash',
  'thung-rac': 'trash',
};

/**
 * Phân tích đường dẫn hiện tại của trình duyệt (pathname, search, hash)
 * để xác định tab, công việc cần mở hoặc dự án cần mở.
 */
export function parseCurrentRoute(): ParsedRoute {
  if (typeof window === 'undefined') {
    return { tab: 'tasks' };
  }

  const pathname = window.location.pathname.replace(/^\/+|\/+$/g, '');
  const searchParams = new URLSearchParams(window.location.search);
  const hash = window.location.hash.replace(/^#\/?/, '');

  // 1. Phân tích từ pathname (ví dụ: "tasks/t-1" hoặc "projects/YKIEN")
  const pathSegments = pathname ? pathname.split('/') : [];
  let tab: ActiveTab = 'tasks';
  let taskId: string | undefined = undefined;
  let projectIdOrCode: string | undefined = undefined;
  let projectFilter: string | undefined = searchParams.get('project') || undefined;

  if (pathSegments.length > 0) {
    const rawTab = pathSegments[0].toLowerCase();
    if (TAB_PATH_MAP[rawTab]) {
      tab = TAB_PATH_MAP[rawTab];
      if (tab === 'tasks' && pathSegments[1]) {
        taskId = decodeURIComponent(pathSegments[1]);
      } else if (tab === 'projects' && pathSegments[1]) {
        projectIdOrCode = decodeURIComponent(pathSegments[1]);
      }
    }
  }

  // 2. Kiểm tra từ searchParams dự phòng (?tab=...&task=...&project=...)
  const queryTab = searchParams.get('tab');
  if (queryTab && TAB_PATH_MAP[queryTab.toLowerCase()]) {
    tab = TAB_PATH_MAP[queryTab.toLowerCase()];
  }
  if (!taskId && searchParams.get('task')) {
    taskId = searchParams.get('task')!;
    tab = 'tasks';
  }
  if (!projectIdOrCode && searchParams.get('project_detail')) {
    projectIdOrCode = searchParams.get('project_detail')!;
  }

  // 3. Kiểm tra từ hash dự phòng (ví dụ #tasks/t-1)
  if (hash) {
    const hashSegments = hash.split('/');
    const rawHashTab = hashSegments[0].toLowerCase();
    if (TAB_PATH_MAP[rawHashTab]) {
      tab = TAB_PATH_MAP[rawHashTab];
      if (tab === 'tasks' && hashSegments[1]) {
        taskId = decodeURIComponent(hashSegments[1]);
      } else if (tab === 'projects' && hashSegments[1]) {
        projectIdOrCode = decodeURIComponent(hashSegments[1]);
      }
    }
  }

  return {
    tab,
    taskId,
    projectIdOrCode,
    projectFilter,
  };
}

/**
 * Cập nhật đường dẫn Friendly URL trên thanh địa chỉ trình duyệt mà không reload trang.
 */
export function updateBrowserUrl(options: {
  tab: ActiveTab;
  task?: TaskItem | null;
  project?: ProjectItem | null;
  projectFilter?: string | null;
  replace?: boolean;
}): void {
  if (typeof window === 'undefined') return;

  let newPath = `/${options.tab}`;

  if (options.task) {
    newPath = `/tasks/${encodeURIComponent(options.task.id)}`;
  } else if (options.project) {
    const identifier = options.project.code || options.project.id;
    newPath = `/projects/${encodeURIComponent(identifier)}`;
  } else if (options.tab === 'tasks' && options.projectFilter && options.projectFilter !== 'Tất cả') {
    newPath = `/tasks?project=${encodeURIComponent(options.projectFilter)}`;
  }

  const currentFull = window.location.pathname + window.location.search;
  if (currentFull === newPath) return;

  try {
    if (options.replace) {
      window.history.replaceState({ path: newPath }, '', newPath);
    } else {
      window.history.pushState({ path: newPath }, '', newPath);
    }
  } catch (e) {
    console.warn('[urlRouting] Không thể cập nhật URL history:', e);
  }
}

/**
 * Tạo Full URL thân thiện cho một công việc để chia sẻ
 */
export function getTaskFriendlyUrl(task: TaskItem): string {
  if (typeof window === 'undefined') return `/tasks/${task.id}`;
  return `${window.location.origin}/tasks/${encodeURIComponent(task.id)}`;
}

/**
 * Tạo Full URL thân thiện cho một dự án để chia sẻ
 */
export function getProjectFriendlyUrl(project: ProjectItem): string {
  const identifier = project.code || project.id;
  if (typeof window === 'undefined') return `/projects/${identifier}`;
  return `${window.location.origin}/projects/${encodeURIComponent(identifier)}`;
}

/**
 * Tiện ích sao chép văn bản / liên kết vào bộ nhớ tạm Clipboard
 */
export async function copyUrlToClipboard(url: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(url);
      return true;
    }
    const textArea = document.createElement('textarea');
    textArea.value = url;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('[urlRouting] Lỗi sao chép liên kết:', err);
    return false;
  }
}
