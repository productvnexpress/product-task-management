/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/** Dòng dữ liệu đúng tên cột trên Supabase (snake_case). */
export interface MemberRow {
  id: string;
  name: string;
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
  email?: string | null;
  group_type?: string | null;
  role?: string | null;
  team: string;
  title?: string | null;
}

export interface ProjectRow {
  id: string;
  name: string;
  code: string;
  status: string;
  folder_id?: string | null;
  lead_name?: string | null;
  roles?: { pm?: string[]; designer?: string[]; seo?: string[]; data?: string[] } | null;
  target_date?: string | null;
  created_by?: string | null;
  is_strategic?: boolean | null;
}

export interface FolderRow {
  id: string;
  name: string;
  parent_id?: string | null;
}

export interface TaskRow {
  id: string;
  title: string;
  project_id: string | null;
  project_name: string | null;
  folder_id?: string | null;
  folder_name?: string | null;
  phase_id?: string | null;
  phase_name?: string | null;
  team: string;
  assignee: string;
  product_owners?: string[] | null;
  status: string;
  priority: string;
  due_date: string | null;
  progress: number | null;
  details?: string | null;
  blocker_reason?: string | null;
  work_link?: string | null;
  result_link?: string | null;
  latest_update_note?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
  is_recurring?: boolean | null;
  recurring_rule_id?: string | null;
  recurring_frequency?: string | null;
  /** Ước lượng thời gian làm (phút). Cột tuỳ chọn: xem docs/sql/2026-11-claude-assist.sql */
  estimate_minutes?: number | null;
}

export interface TaskLogRow {
  id: string;
  task_id: string;
  author: string;
  action: string;
  changes: { field: string; oldValue?: string; newValue?: string }[];
  note: string | null;
  created_at: string;
}

export interface NotificationRow {
  id: string;
  recipient_name: string;
  recipient_id: string | null;
  actor_name: string;
  project_id: string | null;
  project_name: string;
  task_id: string | null;
  task_title: string | null;
  type: string;
  title: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface LeaveRow {
  member_name: string;
  start_date: string;
  end_date: string;
  session?: string | null;
  status?: string | null;
}

/** Dòng trong bảng `trash`: đúng cấu trúc app dùng để khôi phục. */
export interface TrashRow {
  id: string;
  original_id: string;
  type: 'task';
  title: string;
  subtitle: string | null;
  data: unknown;
  deleted_by: string;
  deleted_at: string;
}

export interface PhaseRow {
  id: string;
  name: string;
  due_date: string | null;
  status: string | null;
  sort_order?: number | null;
}

export interface ChecklistRow {
  phaseId?: number;
  phaseTitle?: string;
  text: string;
  status?: string;
}

/** Chi tiết dự án phục vụ gợi ý việc tiếp theo. */
export interface ProjectDetail extends ProjectRow {
  description?: string | null;
  kpi?: string | null;
  phases: PhaseRow[];
  checklist: ChecklistRow[];
}

export interface TaskQuery {
  /** Chỉ lấy việc chưa hoàn thành. */
  openOnly?: boolean;
  statuses?: string[];
  assignee?: string;
  projectId?: string;
  dueFrom?: string;
  dueTo?: string;
  createdBy?: string;
  limit?: number;
}

/** Lớp truy cập dữ liệu. Tách interface để kiểm thử bằng bộ nhớ, không chạm dữ liệu thật. */
export interface WmsStore {
  members(): Promise<MemberRow[]>;
  projects(): Promise<ProjectRow[]>;
  folders(): Promise<FolderRow[]>;
  tasks(query: TaskQuery): Promise<TaskRow[]>;
  task(id: string): Promise<TaskRow | null>;
  taskLogs(taskId: string, limit: number): Promise<TaskLogRow[]>;
  insertTask(row: TaskRow): Promise<void>;
  updateTask(id: string, patch: Partial<TaskRow>): Promise<void>;
  addLog(row: TaskLogRow): Promise<void>;
  addNotification(row: NotificationRow): Promise<void>;
  leavesOn(date: string): Promise<LeaveRow[]>;
  /** Chuyển việc vào Thùng rác (xoá mềm), khôi phục được trong app. */
  trashTask(row: TaskRow, trash: TrashRow): Promise<void>;
  /** Toàn bộ nhật ký của một việc, cũ trước mới sau. */
  allTaskLogs(taskId: string): Promise<TaskLogRow[]>;
  projectDetail(id: string): Promise<ProjectDetail | null>;
}

const MEMBER_COLUMNS = 'id,name,first_name,last_name,username,email,group_type,role,team,title';
const PROJECT_COLUMNS = 'id,name,code,status,folder_id,lead_name,roles,target_date,created_by,is_strategic';

const OPTIONAL_TASK_COLUMNS = ['completed_at', 'estimate_minutes'] as const;

const isMissingColumn = (error: { code?: string; message?: string }, column: string): boolean =>
  (error.code === 'PGRST204' || error.code === '42703') && (error.message || '').includes(column);

export class SupabaseStore implements WmsStore {
  private readonly db: SupabaseClient;
  /** Cột tuỳ chọn mà cơ sở dữ liệu chưa có: phát hiện khi ghi lỗi rồi bỏ qua ở các lần sau. */
  private readonly missingColumns = new Set<string>();

  constructor(url: string, serviceKey: string) {
    this.db = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  async members(): Promise<MemberRow[]> {
    const { data, error } = await this.db.from('members').select(MEMBER_COLUMNS).order('id');
    if (error) throw error;
    return (data || []) as MemberRow[];
  }

  async projects(): Promise<ProjectRow[]> {
    const { data, error } = await this.db.from('projects').select(PROJECT_COLUMNS).order('code');
    if (error) throw error;
    return (data || []) as ProjectRow[];
  }

  async folders(): Promise<FolderRow[]> {
    const { data, error } = await this.db.from('folders').select('id,name,parent_id');
    // Bảng folders có thể chưa tồn tại ở môi trường cũ: coi như không có thư mục.
    if (error) return [];
    return (data || []) as FolderRow[];
  }

  async tasks(query: TaskQuery): Promise<TaskRow[]> {
    let q = this.db.from('tasks').select('*');
    if (query.openOnly) q = q.neq('status', 'Hoàn thành');
    if (query.statuses?.length) q = q.in('status', query.statuses);
    if (query.assignee) q = q.eq('assignee', query.assignee);
    if (query.projectId) q = q.eq('project_id', query.projectId);
    if (query.dueFrom) q = q.gte('due_date', query.dueFrom);
    if (query.dueTo) q = q.lte('due_date', query.dueTo);
    if (query.createdBy) q = q.eq('created_by', query.createdBy);
    const { data, error } = await q
      .order('due_date', { ascending: !!query.openOnly, nullsFirst: false })
      .limit(query.limit ?? 1000);
    if (error) throw error;
    return (data || []) as TaskRow[];
  }

  async task(id: string): Promise<TaskRow | null> {
    const { data, error } = await this.db.from('tasks').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return (data as TaskRow) || null;
  }

  async taskLogs(taskId: string, limit: number): Promise<TaskLogRow[]> {
    const { data, error } = await this.db
      .from('task_logs')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data || []) as TaskLogRow[];
  }

  async insertTask(row: TaskRow): Promise<void> {
    await this.writeTask(row, (payload) => this.db.from('tasks').insert(payload));
  }

  async updateTask(id: string, patch: Partial<TaskRow>): Promise<void> {
    await this.writeTask(patch, (payload) => this.db.from('tasks').update(payload).eq('id', id));
  }

  /**
   * Cột tuỳ chọn của bảng `tasks`: production có thể chưa có (`completed_at`, `estimate_minutes`).
   * Thiếu cột nào thì bỏ cột đó và ghi phần còn lại, giống cách app xử lý.
   * Ngày hoàn thành khi thiếu `completed_at` suy ra từ nhật ký công việc (`getTaskCompletionDate`).
   */
  private async writeTask(
    payload: Partial<TaskRow>,
    run: (payload: Partial<TaskRow>) => PromiseLike<{ error: { code?: string; message?: string } | null }>
  ): Promise<void> {
    const send: Record<string, unknown> = { ...payload };
    for (const column of this.missingColumns) delete send[column];
    for (let attempt = 0; attempt <= OPTIONAL_TASK_COLUMNS.length; attempt += 1) {
      if (!Object.keys(send).length) return;
      const { error } = await run(send as Partial<TaskRow>);
      if (!error) return;
      const missing = OPTIONAL_TASK_COLUMNS.find((column) => column in send && isMissingColumn(error, column));
      if (!missing) throw error;
      this.missingColumns.add(missing);
      delete send[missing];
    }
  }

  async addLog(row: TaskLogRow): Promise<void> {
    const { error } = await this.db.from('task_logs').insert(row);
    if (error) throw error;
  }

  async addNotification(row: NotificationRow): Promise<void> {
    // Thông báo là phần phụ: lỗi ở đây không được làm hỏng thao tác chính.
    const { error } = await this.db.from('notifications').insert(row);
    if (error) console.warn('[wms-mcp] Không lưu được thông báo:', error.message);
  }

  async leavesOn(date: string): Promise<LeaveRow[]> {
    const { data, error } = await this.db
      .from('member_leaves')
      .select('member_name,start_date,end_date,session,status')
      .lte('start_date', date)
      .gte('end_date', date);
    if (error) return [];
    return ((data || []) as LeaveRow[]).filter((l) => !l.status || l.status === 'Đã duyệt');
  }

  async trashTask(row: TaskRow, trash: TrashRow): Promise<void> {
    // Lưu vào Thùng rác trước: nếu bước xoá lỗi thì việc vẫn còn nguyên, không mất dữ liệu.
    const { error: trashErr } = await this.db.from('trash').upsert(trash, { onConflict: 'id' });
    if (trashErr) throw trashErr;
    const { error } = await this.db.from('tasks').delete().eq('id', row.id);
    if (error) throw error;
  }

  async allTaskLogs(taskId: string): Promise<TaskLogRow[]> {
    const { data, error } = await this.db
      .from('task_logs')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true })
      .limit(500);
    if (error) throw error;
    return (data || []) as TaskLogRow[];
  }

  async projectDetail(id: string): Promise<ProjectDetail | null> {
    const { data, error } = await this.db.from('projects').select('*').eq('id', id).maybeSingle();
    if (error || !data) return null;
    const { data: phases } = await this.db
      .from('project_phases')
      .select('id,name,due_date,status,sort_order')
      .eq('project_id', id)
      .order('sort_order', { ascending: true });
    let checklist: ChecklistRow[] = [];
    try {
      const raw = typeof data.checklist === 'string' ? JSON.parse(data.checklist) : data.checklist;
      if (Array.isArray(raw)) checklist = raw as ChecklistRow[];
    } catch {
      checklist = [];
    }
    return { ...(data as ProjectDetail), phases: (phases || []) as PhaseRow[], checklist };
  }
}
