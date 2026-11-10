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

export interface TaskQuery {
  /** Chỉ lấy việc chưa hoàn thành. */
  openOnly?: boolean;
  statuses?: string[];
  assignee?: string;
  projectId?: string;
  dueFrom?: string;
  dueTo?: string;
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
}

const MEMBER_COLUMNS = 'id,name,first_name,last_name,username,email,group_type,role,team,title';
const PROJECT_COLUMNS = 'id,name,code,status,folder_id,lead_name,roles,target_date,created_by,is_strategic';

export class SupabaseStore implements WmsStore {
  private readonly db: SupabaseClient;

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
    const { error } = await this.db.from('tasks').insert(row);
    if (error) throw error;
  }

  async updateTask(id: string, patch: Partial<TaskRow>): Promise<void> {
    const { error } = await this.db.from('tasks').update(patch).eq('id', id);
    if (error) throw error;
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
}
