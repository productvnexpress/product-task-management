/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { MemberItem, ProjectItem, TaskItem, TaskStatus, PriorityLevel, TeamType } from '../../src/types.js';
import { stripDiacritics } from '../../src/utils/titleQuality.js';
import { getFolderPath, inferProjectFolderId } from '../../src/utils/folderUtils.js';
import { formatEstimate, isValidEstimate } from '../../src/utils/estimate.js';
import type { FolderRow, MemberRow, ProjectRow, TaskRow } from './store.js';

export const TASK_STATUSES = ['Chưa làm', 'Đang làm', 'Bị nghẽn', 'Hoàn thành'] as const;
export const OTHERS_PROJECT_ID = 'proj-others';

// ---------------------------------------------------------------------------
// Ngày giờ: mọi phép tính "hôm nay" theo giờ Việt Nam (GMT+7), không phụ thuộc máy chủ.
// ---------------------------------------------------------------------------

const DAY_MS = 86_400_000;
const EN_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const EN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const vnToday = (now: Date = new Date()): string =>
  new Date(now.getTime() + 7 * 3_600_000).toISOString().slice(0, 10);

const toUtc = (date: string) => Date.parse(`${date}T00:00:00Z`);

export const addDays = (date: string, days: number): string =>
  new Date(toUtc(date) + days * DAY_MS).toISOString().slice(0, 10);

/** Số ngày a - b. */
export const dayDiff = (a: string, b: string): number => Math.round((toUtc(a) - toUtc(b)) / DAY_MS);

export const weekday = (date: string): number => new Date(toUtc(date)).getUTCDay();

export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const time = toUtc(value);
  return !Number.isNaN(time) && new Date(time).toISOString().slice(0, 10) === value;
}

/** "Tue, 15 Sep 2026" theo quy chuẩn hiển thị ngày của WMS. */
export function formatDate(date: string): string {
  const d = new Date(toUtc(date));
  return `${EN_DAYS[d.getUTCDay()]}, ${String(d.getUTCDate()).padStart(2, '0')} ${EN_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** Hôm nay / Hôm qua / Ngày mai, ngoài ra hiện ngày chuẩn. */
export function dueLabel(due: string | null | undefined, today: string): string {
  if (!due) return 'Chưa có hạn';
  const diff = dayDiff(due.slice(0, 10), today);
  if (diff === 0) return 'Hôm nay';
  if (diff === -1) return 'Hôm qua';
  if (diff === 1) return 'Ngày mai';
  return formatDate(due.slice(0, 10));
}

// ---------------------------------------------------------------------------
// Tra cứu nhân sự, dự án bằng tên gõ tự do (không dấu, username, mã dự án).
// ---------------------------------------------------------------------------

export const fold = (value: string): string =>
  stripDiacritics((value || '').toLowerCase())
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const ME_WORDS = new Set(['me', 'toi', 'minh', 'i', 'myself', 'ban than']);

export type Resolved<T> = { ok: true; value: T } | { ok: false; error: string };

export const isProductMember = (m: MemberRow) => m.group_type === 'Product';

export const shortName = (m: MemberRow): string =>
  m.first_name && m.last_name ? `${m.first_name} ${m.last_name}` : m.name;

export function resolveMember(input: string | undefined, members: MemberRow[], actor: MemberRow): Resolved<MemberRow> {
  const key = fold((input || '').replace(/^@/, ''));
  if (!key || ME_WORDS.has(key)) return { ok: true, value: actor };

  const pick = (pool: MemberRow[]): MemberRow[] | null => {
    const tests: ((m: MemberRow) => boolean)[] = [
      (m) => fold(m.username || '') === key,
      (m) => fold(m.name) === key,
      (m) => fold(`${m.first_name || ''} ${m.last_name || ''}`) === key,
      (m) => fold(m.first_name || '') === key,
      (m) => {
        const words = fold(m.name).split(' ');
        return key.split(' ').every((token) => words.includes(token));
      },
    ];
    for (const test of tests) {
      const hits = pool.filter(test);
      if (hits.length) return hits;
    }
    return null;
  };

  const hits = pick(members.filter(isProductMember)) || pick(members.filter((m) => !isProductMember(m)));
  if (!hits) {
    return { ok: false, error: `Không tìm thấy nhân sự "${input}". Gọi list_members để xem danh sách.` };
  }
  if (hits.length > 1) {
    const options = hits.map((m) => `${m.name} (@${m.username})`).join(', ');
    return { ok: false, error: `"${input}" trùng nhiều người: ${options}. Dùng username để chọn đúng.` };
  }
  return { ok: true, value: hits[0] };
}

export function resolveProject(input: string | undefined, projects: ProjectRow[]): Resolved<ProjectRow> {
  const raw = (input || '').trim().replace(/^#/, '');
  if (!raw) {
    const others = projects.find((p) => p.id === OTHERS_PROJECT_ID || p.code === 'VNE-OTHERS');
    if (others) return { ok: true, value: others };
    return { ok: false, error: 'Chưa có dự án mặc định "Chưa xác định (Others)". Truyền tham số project.' };
  }

  const key = fold(raw);
  const codeKey = key.replace(/^vne-/, '');
  const tests: ((p: ProjectRow) => boolean)[] = [
    (p) => p.id === raw,
    (p) => fold(p.code).replace(/^vne-/, '') === codeKey,
    (p) => fold(p.name) === key,
    (p) => fold(p.name).split(' ').includes(key),
    (p) => fold(p.name).includes(key) || fold(p.code).includes(codeKey),
  ];
  for (const test of tests) {
    const hits = projects.filter(test);
    if (hits.length === 1) return { ok: true, value: hits[0] };
    if (hits.length > 1) {
      const options = hits.map((p) => `${p.name} (${p.code})`).join(', ');
      return { ok: false, error: `"${input}" khớp nhiều dự án: ${options}. Dùng mã dự án để chọn đúng.` };
    }
  }
  return { ok: false, error: `Không tìm thấy dự án "${input}". Gọi list_projects để xem danh sách.` };
}

/** Thư mục hiển thị của một dự án, đúng cách app gán cho task. */
export function projectFolder(project: ProjectRow, folders: FolderRow[]): { id: string; name: string } {
  const id = project.folder_id || inferProjectFolderId({ id: project.id, name: project.name, code: project.code });
  const mapped = folders.map((f) => ({ id: f.id, name: f.name, parentId: f.parent_id || undefined }));
  return { id, name: mapped.length ? getFolderPath(id, mapped) : getFolderPath(id) };
}

// ---------------------------------------------------------------------------
// Chuyển đổi dòng Supabase <-> kiểu của app, để dùng lại RBAC và bộ ghi nhật ký.
// ---------------------------------------------------------------------------

export function toMemberItem(m: MemberRow): MemberItem {
  return {
    id: m.id,
    name: m.name,
    firstName: m.first_name || undefined,
    lastName: m.last_name || undefined,
    username: m.username || undefined,
    group: (m.group_type as MemberItem['group']) || undefined,
    role: (m.role as MemberItem['role']) || undefined,
    team: m.team as TeamType,
    title: m.title || '',
    email: m.email || '',
    status: 'Sẵn sàng',
  };
}

export function toProjectItem(p: ProjectRow): ProjectItem {
  return {
    id: p.id,
    name: p.name,
    code: p.code,
    description: '',
    targetDate: p.target_date || '',
    leadName: p.lead_name || undefined,
    roles: p.roles || undefined,
    status: p.status as ProjectItem['status'],
    createdBy: p.created_by || undefined,
  };
}

export function toTaskItem(row: TaskRow): TaskItem {
  return {
    id: row.id,
    title: row.title,
    folderId: row.folder_id || undefined,
    folderName: row.folder_name || undefined,
    projectId: row.project_id || '',
    projectName: row.project_name || '',
    phaseId: row.phase_id || undefined,
    phaseName: row.phase_name || undefined,
    team: row.team as TeamType,
    assignee: row.assignee,
    status: row.status as TaskStatus,
    priority: row.priority as PriorityLevel,
    dueDate: row.due_date ? row.due_date.slice(0, 10) : undefined,
    estimateMinutes: isValidEstimate(Number(row.estimate_minutes)) ? Number(row.estimate_minutes) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    progress: row.progress !== null && row.progress !== undefined ? Number(row.progress) : 0,
    details: row.details || undefined,
    blockerReason: row.blocker_reason || undefined,
    workLink: row.work_link || undefined,
    resultLink: row.result_link || undefined,
    latestUpdateNote: row.latest_update_note || undefined,
    createdBy: row.created_by || undefined,
    completedAt: row.completed_at || undefined,
    logs: [],
  };
}

/** Các cột connector được phép ghi khi cập nhật. */
export function toEditableColumns(task: TaskItem): Partial<TaskRow> {
  return {
    title: task.title,
    project_id: task.projectId || null,
    project_name: task.projectName || null,
    folder_id: task.folderId || null,
    folder_name: task.folderName || null,
    phase_id: task.phaseId || null,
    phase_name: task.phaseName || null,
    team: task.team,
    assignee: task.assignee,
    status: task.status,
    priority: task.priority,
    due_date: task.dueDate || null,
    progress: task.progress ?? 0,
    details: task.details || null,
    blocker_reason: task.blockerReason || null,
    work_link: task.workLink || null,
    result_link: task.resultLink || null,
    latest_update_note: task.latestUpdateNote || null,
    completed_at: task.completedAt || null,
    estimate_minutes: task.estimateMinutes ?? null,
  };
}

/** Chỉ giữ các cột thực sự đổi giá trị: không ghi đè thay đổi của người khác trên cột không liên quan. */
export function diffColumns(before: Partial<TaskRow>, after: Partial<TaskRow>): Partial<TaskRow> {
  const patch: Record<string, unknown> = {};
  for (const key of Object.keys(after) as (keyof TaskRow)[]) {
    const a = before[key] ?? null;
    const b = after[key] ?? null;
    const same = key === 'progress' || key === 'estimate_minutes' ? Number(a) === Number(b) : a === b;
    if (!same) patch[key] = b;
  }
  return patch as Partial<TaskRow>;
}

// ---------------------------------------------------------------------------
// Trình bày kết quả cho Claude đọc: một dòng một việc, thông tin quan trọng lên đầu.
// ---------------------------------------------------------------------------

export function projectTag(row: TaskRow, projects: ProjectRow[]): string {
  const project = projects.find((p) => p.id === row.project_id);
  if (project) return `${project.name} [${project.code.replace(/^VNE-/, '')}]`;
  return row.folder_name || row.project_name || 'Chưa xác định';
}

export interface LineOptions {
  today: string;
  projects: ProjectRow[];
  showAssignee?: boolean;
}

export function taskLine(row: TaskRow, opts: LineOptions): string {
  const due = row.due_date ? row.due_date.slice(0, 10) : '';
  const open = row.status !== 'Hoàn thành';
  const late = open && due ? dayDiff(opts.today, due) : 0;
  const parts = [
    late > 1 ? `${dueLabel(due, opts.today)} (quá ${late} ngày)` : dueLabel(due, opts.today),
    row.status,
  ];
  if (row.priority === 'Khẩn cấp') parts.push('Khẩn cấp');
  const estimate = formatEstimate(Number(row.estimate_minutes));
  if (estimate) parts.push(`~${estimate}`);
  if (opts.showAssignee) parts.push(row.assignee);
  parts.push(projectTag(row, opts.projects));
  let line = `- ${row.title} — ${parts.join(' · ')} · id: ${row.id}`;
  if (row.status === 'Bị nghẽn' && row.blocker_reason) line += `\n  Nghẽn: ${row.blocker_reason}`;
  return line;
}

/** Sắp theo độ gấp: hạn sớm nhất → Khẩn cấp → Bị nghẽn > Đang làm > Chưa làm. */
export function byUrgency(a: TaskRow, b: TaskRow): number {
  const due = (r: TaskRow) => (r.due_date ? r.due_date.slice(0, 10) : '9999-12-31');
  if (due(a) !== due(b)) return due(a) < due(b) ? -1 : 1;
  const urgent = (r: TaskRow) => (r.priority === 'Khẩn cấp' ? 0 : 1);
  if (urgent(a) !== urgent(b)) return urgent(a) - urgent(b);
  const rank: Record<string, number> = { 'Bị nghẽn': 0, 'Đang làm': 1, 'Chưa làm': 2, 'Hoàn thành': 3 };
  return (rank[a.status] ?? 9) - (rank[b.status] ?? 9);
}

// ---------------------------------------------------------------------------
// Chống trùng theo nghĩa: hai tiêu đề gần giống nhau dù khác vài chữ.
// ---------------------------------------------------------------------------

const STOP_WORDS = new Set([
  'cho', 'cua', 'va', 'cac', 'nhung', 'tren', 'trong', 'voi', 'de', 'la', 'mot', 'theo', 'tai', 've', 'ban',
  'viec', 'task', 'phan', 'lai', 'tu', 'den', 'khi', 'thi', 'the', 'a', 'an', 'of', 'for', 'to',
]);

export function titleTokens(title: string): string[] {
  return [...new Set(fold(title).replace(/-/g, ' ').split(' ').filter((w) => w.length >= 2 && !STOP_WORDS.has(w)))];
}

/** Hai tiêu đề gần trùng: phần lớn từ khoá giống nhau (không tính từ đệm, không phân biệt dấu). */
export function isSimilarTitle(a: string, b: string): boolean {
  const ta = titleTokens(a);
  const tb = titleTokens(b);
  if (ta.length < 2 || tb.length < 2) return false;
  const shared = ta.filter((w) => tb.includes(w)).length;
  const union = new Set([...ta, ...tb]).size;
  const smaller = Math.min(ta.length, tb.length);
  return shared / union >= 0.6 || (smaller >= 3 && shared / smaller >= 0.8);
}

/** Số ngày từ lần cập nhật cuối tới hôm nay (giờ Việt Nam). */
export function daysSinceUpdate(row: TaskRow, today: string): number {
  const stamp = row.updated_at || row.created_at;
  if (!stamp) return 0;
  const day = vnToday(new Date(stamp));
  return Math.max(0, dayDiff(today, day));
}
