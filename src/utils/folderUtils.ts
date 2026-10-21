/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FolderItem, ProjectItem, TaskItem } from '../types';

export const FOLDERS_STORAGE_KEY = 'vne_wms_folders_v1';

/**
 * Danh mục Thư mục (Folders) mặc định theo cấu trúc Sản phẩm & Chuyên mục VnExpress:
 * - VnExpress
 *   + Thể thao
 *   + Thế giới
 *   + Thời sự
 *   + Kinh doanh
 *   + Khoa học - Công nghệ
 *   + Du lịch
 *   + Xe
 *   + Ý kiến
 *   + Sự kiện & Giải thưởng
 *   + Hệ thống & Nội bộ
 * - Ngôi sao
 * - English
 * - Tia sáng
 */
export const INITIAL_FOLDERS: FolderItem[] = [
  // Root Folders (Cấp 1)
  {
    id: 'folder-vne',
    name: 'VnExpress',
    code: 'VNE',
    sortOrder: 1,
  },
  {
    id: 'folder-ngoisao',
    name: 'Ngôi sao',
    code: 'NGOISAO',
    sortOrder: 2,
  },
  {
    id: 'folder-english',
    name: 'English',
    code: 'EN',
    sortOrder: 3,
  },
  {
    id: 'folder-tiasang',
    name: 'Tia sáng',
    code: 'TIASANG',
    sortOrder: 4,
  },

  // Sub-folders của VnExpress (Cấp 2)
  {
    id: 'folder-vne-thethao',
    name: 'Thể thao',
    parentId: 'folder-vne',
    code: 'VNE-THETHAO',
    sortOrder: 11,
  },
  {
    id: 'folder-vne-thegioi',
    name: 'Thế giới',
    parentId: 'folder-vne',
    code: 'VNE-THEGIOI',
    sortOrder: 12,
  },
  {
    id: 'folder-vne-thoisu',
    name: 'Thời sự',
    parentId: 'folder-vne',
    code: 'VNE-THOISU',
    sortOrder: 13,
  },
  {
    id: 'folder-vne-kinhdoanh',
    name: 'Kinh doanh',
    parentId: 'folder-vne',
    code: 'VNE-KINHDOANH',
    sortOrder: 14,
  },
  {
    id: 'folder-vne-khoahoc',
    name: 'Khoa học - Công nghệ',
    parentId: 'folder-vne',
    code: 'VNE-KHOAHOC',
    sortOrder: 15,
  },
  {
    id: 'folder-vne-dulich',
    name: 'Du lịch',
    parentId: 'folder-vne',
    code: 'VNE-DULICH',
    sortOrder: 16,
  },
  {
    id: 'folder-vne-xe',
    name: 'Xe',
    parentId: 'folder-vne',
    code: 'VNE-XE',
    sortOrder: 17,
  },
  {
    id: 'folder-vne-ykien',
    name: 'Ý kiến',
    parentId: 'folder-vne',
    code: 'VNE-YKIEN',
    sortOrder: 18,
  },
  {
    id: 'folder-vne-sukien',
    name: 'Sự kiện & Giải thưởng',
    parentId: 'folder-vne',
    code: 'VNE-SUKIEN',
    sortOrder: 19,
  },
  {
    id: 'folder-vne-hethong',
    name: 'Hệ thống & Nội bộ',
    parentId: 'folder-vne',
    code: 'VNE-HETHONG',
    sortOrder: 20,
  },
];

/**
 * Tự động suy luận Folder mặc định cho các dự án chưa gán folderId
 */
export function inferProjectFolderId(project: Partial<ProjectItem>): string {
  if (project.folderId) return project.folderId;

  const id = (project.id || '').toLowerCase();
  const name = (project.name || '').toLowerCase();
  const code = (project.code || '').toLowerCase();

  if (id === 'proj-thegioi' || name.includes('thế giới')) return 'folder-vne-thegioi';
  if (id === 'proj-asean' || name.includes('asean') || name.includes('thể thao') || name.includes('bóng đá') || name.includes('marathon')) {
    return 'folder-vne-thethao';
  }
  if (id === 'proj-ykien' || id === 'proj-askvne' || name.includes('ý kiến') || name.includes('askvne')) {
    return 'folder-vne-ykien';
  }
  if (id === 'proj-dulich' || id === 'proj-vnego' || name.includes('du lịch') || name.includes('vnego')) {
    return 'folder-vne-dulich';
  }
  if (id === 'proj-carawards' || name.includes('car awards') || name.includes('ô tô')) {
    return 'folder-vne-xe';
  }
  if (
    id === 'proj-skkh' ||
    id === 'proj-techawards' ||
    id === 'proj-ai4vn' ||
    name.includes('khoa học') ||
    name.includes('tech awards') ||
    name.includes('ai4vn')
  ) {
    return 'folder-vne-khoahoc';
  }
  if (id === 'proj-spamvote' || id === 'proj-icontent' || name.includes('icontent') || name.includes('spam vote')) {
    return 'folder-vne-sukien';
  }
  if (id === 'proj-overseas' || name.includes('overseas') || name.includes('english') || code.includes('en-')) {
    return 'folder-english';
  }
  if (name.includes('ngôi sao') || code.includes('ngoisao')) {
    return 'folder-ngoisao';
  }
  if (name.includes('tia sáng') || code.includes('tiasang')) {
    return 'folder-tiasang';
  }
  if (
    id === 'proj-wms' ||
    id === 'proj-kpi' ||
    id === 'proj-newsletter' ||
    id === 'proj-personalization' ||
    name.includes('wms') ||
    name.includes('kpi') ||
    name.includes('newsletter') ||
    name.includes('cá nhân hoá')
  ) {
    return 'folder-vne-hethong';
  }

  return 'folder-vne';
}

/**
 * Chuẩn hóa danh sách dự án luôn có folderId hợp lệ
 */
export function ensureProjectsHaveFolder(projects: ProjectItem[], folders: FolderItem[] = INITIAL_FOLDERS): ProjectItem[] {
  const validIds = new Set(folders.map((f) => f.id));
  return projects.map((p) => {
    const resolvedId = p.folderId && validIds.has(p.folderId) ? p.folderId : inferProjectFolderId(p);
    return {
      ...p,
      folderId: resolvedId,
    };
  });
}

/**
 * Trả về tên đường dẫn đầy đủ của Folder (ví dụ: "VnExpress › Thể thao" hoặc "Ngôi sao")
 */
export function getFolderPath(folderId: string | undefined, folders: FolderItem[] = INITIAL_FOLDERS): string {
  if (!folderId) return 'VnExpress';
  const cleanId = folderId.replace(/^folder:/, '');
  const folder = folders.find((f) => f.id === cleanId);
  if (!folder) return 'VnExpress';
  if (folder.parentId) {
    const parent = folders.find((f) => f.id === folder.parentId);
    if (parent) {
      return `${parent.name} › ${folder.name}`;
    }
  }
  return folder.name;
}

/**
 * Lấy danh sách ID của folder và toàn bộ các folder con bên trong nó
 */
export function getDescendantFolderIds(folderId: string, folders: FolderItem[] = INITIAL_FOLDERS): string[] {
  const cleanId = folderId.replace(/^folder:/, '');
  const result = new Set<string>([cleanId]);
  let added = true;
  while (added) {
    added = false;
    for (const f of folders) {
      if (f.parentId && result.has(f.parentId) && !result.has(f.id)) {
        result.add(f.id);
        added = true;
      }
    }
  }
  return Array.from(result);
}

/**
 * Kiểm tra xem công việc có phải là Task nằm trực tiếp trong Folder (không qua dự án) hay không
 */
export function isDirectFolderTask(task: Partial<TaskItem>): boolean {
  if (!task.projectId || task.projectId.trim() === '' || task.projectId.startsWith('folder:')) {
    return true;
  }
  return false;
}

/**
 * Lấy folderId thực tế của một công việc (từ folderId trực tiếp hoặc suy ra từ dự án của task)
 */
export function getTaskEffectiveFolderId(
  task: Partial<TaskItem>,
  projects: ProjectItem[],
  folders: FolderItem[] = INITIAL_FOLDERS
): string {
  if (task.projectId && task.projectId.startsWith('folder:')) {
    return task.projectId.replace(/^folder:/, '');
  }
  if (isDirectFolderTask(task) && task.folderId) {
    return task.folderId.replace(/^folder:/, '');
  }
  if (task.projectId) {
    const proj = projects.find((p) => p.id === task.projectId || p.name === task.projectName);
    if (proj) {
      return proj.folderId || inferProjectFolderId(proj);
    }
  }
  if (task.folderId) {
    return task.folderId.replace(/^folder:/, '');
  }
  return 'folder-vne';
}

/**
 * Kiểm tra công việc có thuộc Folder đang lọc (bao gồm cả các sub-folder và các dự án nằm trong folder đó)
 */
export function isTaskMatchingFolderFilter(
  task: TaskItem,
  selectedFolderId: string | undefined,
  projects: ProjectItem[],
  folders: FolderItem[] = INITIAL_FOLDERS
): boolean {
  if (!selectedFolderId || selectedFolderId === 'all') return true;
  const targetFolderIds = new Set(getDescendantFolderIds(selectedFolderId, folders));
  const taskFolderId = getTaskEffectiveFolderId(task, projects, folders);
  return targetFolderIds.has(taskFolderId);
}

/**
 * Sắp xếp danh sách Folder theo cấu trúc cây phẳng để hiển thị trong select / dropdown
 */
export function getFlattenedFolderOptions(
  folders: FolderItem[] = INITIAL_FOLDERS
): Array<{ id: string; name: string; folder: FolderItem; depth: number; fullPath: string }> {
  const roots = folders
    .filter((f) => !f.parentId)
    .sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99) || a.name.localeCompare(b.name, 'vi'));

  const result: Array<{ id: string; name: string; folder: FolderItem; depth: number; fullPath: string }> = [];

  for (const root of roots) {
    result.push({
      id: root.id,
      name: root.name,
      folder: root,
      depth: 0,
      fullPath: root.name,
    });
    const children = folders
      .filter((f) => f.parentId === root.id)
      .sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99) || a.name.localeCompare(b.name, 'vi'));
    for (const child of children) {
      result.push({
        id: child.id,
        name: child.name,
        folder: child,
        depth: 1,
        fullPath: `${root.name} › ${child.name}`,
      });
    }
  }

  return result;
}

export function loadFoldersFromStorage(): FolderItem[] {
  try {
    const raw = localStorage.getItem(FOLDERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Đảm bảo các folder mặc định luôn tồn tại
        const existingIds = new Set(parsed.map((f: FolderItem) => f.id));
        const merged = [...parsed];
        for (const def of INITIAL_FOLDERS) {
          if (!existingIds.has(def.id)) {
            merged.push(def);
          }
        }
        return merged;
      }
    }
  } catch (e) {
    console.warn('[folderUtils] Lỗi đọc folders từ localStorage:', e);
  }
  return INITIAL_FOLDERS;
}

export function saveFoldersToStorage(folders: FolderItem[]): void {
  try {
    localStorage.setItem(FOLDERS_STORAGE_KEY, JSON.stringify(folders));
  } catch (e) {
    console.warn('[folderUtils] Lỗi lưu folders vào localStorage:', e);
  }
}
