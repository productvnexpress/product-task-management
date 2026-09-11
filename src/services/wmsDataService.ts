/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from './supabaseClient';
import {
  TaskItem,
  TaskLogItem,
  ProjectItem,
  ProjectPhase,
  ProjectNoteItem,
  ProjectHistoryLog,
  MemberItem,
  TrashItem,
  NotificationItem,
} from '../types';
import { normalizeProjectStatus } from '../utils/projectSortingUtils';

export const wmsDataService = {
  // ==========================================
  // 1. NHÂN SỰ (MEMBERS)
  // ==========================================
  async fetchMembers(): Promise<MemberItem[]> {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.error('Lỗi khi tải members từ Supabase:', error);
      throw error;
    }

    const mapped = (data || []).map((m: any) => ({
      id: m.id,
      name: m.name,
      salutation: m.salutation || undefined,
      lastName: m.last_name || undefined,
      firstName: m.first_name || undefined,
      username: m.username || undefined,
      region: m.region || 'Hà Nội',
      department: m.department,
      group: m.group_type,
      team: m.team,
      title: m.title,
      ipPhone: m.ip_phone || undefined,
      email: m.email,
      gmail: m.gmail || undefined,
      joinDate: m.join_date || undefined,
      status: m.status || 'Sẵn sàng',
    }));

    // Sắp xếp ưu tiên: Ban Sản phẩm - Công nghệ (Product) lên đầu, tiếp theo là ID số tăng dần
    return mapped.sort((a: any, b: any) => {
      const aIsProd = a.group === 'Product' || (a.department && a.department.toLowerCase().includes('sản phẩm')) ? 0 : 1;
      const bIsProd = b.group === 'Product' || (b.department && b.department.toLowerCase().includes('sản phẩm')) ? 0 : 1;
      if (aIsProd !== bIsProd) return aIsProd - bIsProd;

      const aNum = parseInt((a.id || '').replace(/\D/g, ''), 10) || 0;
      const bNum = parseInt((b.id || '').replace(/\D/g, ''), 10) || 0;
      return aNum - bNum;
    });
  },

  async saveMember(member: MemberItem): Promise<void> {
    const { error } = await supabase.from('members').upsert({
      id: member.id,
      name: member.name,
      salutation: member.salutation || null,
      last_name: member.lastName || null,
      first_name: member.firstName || null,
      username: member.username || member.id,
      region: member.region || 'Hà Nội',
      department: member.department || 'Sản phẩm - Công nghệ',
      group_type: member.group || 'Product',
      team: member.team,
      title: member.title,
      ip_phone: member.ipPhone || null,
      email: member.email,
      gmail: member.gmail || null,
      join_date: member.joinDate ? member.joinDate.slice(0, 10) : null,
      status: member.status || 'Sẵn sàng',
    }, { onConflict: 'id' });

    if (error) throw error;
  },

  async deleteMember(memberId: string, trashItem: TrashItem): Promise<void> {
    // Lưu vào thùng rác trước
    await this.moveToTrash(trashItem);
    const { error } = await supabase.from('members').delete().eq('id', memberId);
    if (error) throw error;
  },

  // ==========================================
  // 2. DỰ ÁN (PROJECTS, PHASES, NOTES, LOGS)
  // ==========================================
  async fetchProjects(): Promise<ProjectItem[]> {
    const { data: projects, error: projErr } = await supabase
      .from('projects')
      .select(`
        *,
        phases:project_phases(*),
        notes:project_notes(*),
        history:project_logs(*)
      `)
      .order('code', { ascending: true });

    if (projErr) {
      console.error('Lỗi khi tải projects từ Supabase:', projErr);
      throw projErr;
    }

    return (projects || []).map((p: any) => {
      // Sắp xếp phases theo sort_order hoặc due_date
      const sortedPhases: ProjectPhase[] = (p.phases || [])
        .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
        .map((ph: any) => ({
          id: ph.id,
          name: ph.name,
          dueDate: ph.due_date,
          status: ph.status,
          description: ph.description || '',
        }));

      // Notes
      const sortedNotes: ProjectNoteItem[] = (p.notes || [])
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .map((n: any) => ({
          id: n.id,
          author: n.author,
          content: n.content,
          createdAt: n.created_at,
        }));

      // History Logs
      const sortedLogs: ProjectHistoryLog[] = (p.history || [])
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .map((h: any) => ({
          id: h.id,
          timestamp: h.created_at,
          author: h.author,
          action: h.action,
          changes: h.changes || [],
          note: h.note || undefined,
        }));

      return {
        id: p.id,
        name: p.name,
        code: p.code,
        description: p.description || '',
        objective: p.objective || undefined,
        productOwner: p.product_owner || undefined,
        startDate: p.start_date || undefined,
        targetDate: p.target_date,
        status: normalizeProjectStatus(p.status),
        createdAt: p.created_at || undefined,
        isStrategic: Boolean(p.is_strategic),
        leadName: p.lead_name || undefined,
        roles: p.roles || { pm: [], designer: [], seo: [], data: [] },
        linkOrderTech: p.link_order_tech || undefined,
        linkChat: p.link_chat || undefined,
        linkDashboard: p.link_dashboard || undefined,
        linkReport: p.link_report || undefined,
        linkBeta: p.link_beta || undefined,
        linkProduction: p.link_production || undefined,
        customLinks: p.custom_links || [],
        checklist: (() => {
          if (!p.checklist) return undefined;
          try {
            const parsed = typeof p.checklist === 'string' ? JSON.parse(p.checklist) : p.checklist;
            return Array.isArray(parsed) && parsed.length > 0 ? parsed : undefined;
          } catch {
            return undefined;
          }
        })(),
        links: {
          orderTech: p.link_order_tech || undefined,
          chat: p.link_chat || undefined,
          dashboard: p.link_dashboard || undefined,
          report: p.link_report || undefined,
          beta: p.link_beta || undefined,
          production: p.link_production || undefined,
          custom: p.custom_links || [],
        },
        createdBy: p.created_by || undefined,
        phases: sortedPhases,
        notes: sortedNotes,
        history: sortedLogs,
      };
    });
  },

  async saveProject(project: ProjectItem, newLog?: ProjectHistoryLog): Promise<void> {
    // 1. Lưu thông tin dự án
    const projectPayload: any = {
      id: project.id,
      name: project.name,
      code: project.code,
      description: project.description || null,
      objective: project.objective || null,
      product_owner: project.productOwner || null,
      lead_name: project.leadName || null,
      start_date: project.startDate ? project.startDate.slice(0, 10) : null,
      target_date: project.targetDate ? project.targetDate.slice(0, 10) : '2026-12-31',
      status: normalizeProjectStatus(project.status),
      is_strategic: Boolean(project.isStrategic),
      roles: project.roles || { pm: [], designer: [], seo: [], data: [] },
      link_order_tech: project.linkOrderTech || null,
      link_chat: project.linkChat || null,
      link_dashboard: project.linkDashboard || null,
      link_report: project.linkReport || null,
      link_beta: project.linkBeta || null,
      link_production: project.linkProduction || null,
      custom_links: project.customLinks || [],
      checklist: project.checklist || [],
      created_by: project.createdBy || null,
      updated_at: new Date().toISOString(),
    };

    let { error: projErr } = await supabase.from('projects').upsert(projectPayload, { onConflict: 'id' });
    if (projErr && (projErr.message?.toLowerCase().includes('checklist') || (projErr as any).code === '42703')) {
      console.warn('Cột checklist chưa có trong bảng projects. Đang lưu không kèm cột checklist.');
      delete projectPayload.checklist;
      const retry = await supabase.from('projects').upsert(projectPayload, { onConflict: 'id' });
      projErr = retry.error;
    }
    if (projErr) throw projErr;

    // 2. Lưu các phases nếu có
    if (project.phases && project.phases.length > 0) {
      const phaseRows = project.phases.map((ph, idx) => ({
        id: ph.id,
        project_id: project.id,
        name: ph.name,
        due_date: ph.dueDate ? ph.dueDate.slice(0, 10) : null,
        status: ph.status,
        description: ph.description || null,
        sort_order: idx + 1,
      }));
      const { error: phErr } = await supabase.from('project_phases').upsert(phaseRows, { onConflict: 'id' });
      if (phErr) console.error('Lỗi khi lưu phases:', phErr);
    }

    // 3. Lưu log nếu có
    if (newLog) {
      const { error: logErr } = await supabase.from('project_logs').insert({
        id: newLog.id || `plog-${Date.now()}`,
        project_id: project.id,
        author: newLog.author,
        action: newLog.action,
        changes: newLog.changes || [],
        note: newLog.note || null,
        created_at: newLog.timestamp || new Date().toISOString(),
      });
      if (logErr) console.error('Lỗi khi lưu project log:', logErr);
    }
  },

  async addProjectNote(projectId: string, note: ProjectNoteItem): Promise<void> {
    const { error } = await supabase.from('project_notes').insert({
      id: note.id || `note-${Date.now()}`,
      project_id: projectId,
      author: note.author,
      content: note.content,
      created_at: note.createdAt || new Date().toISOString(),
    });
    if (error) throw error;
  },

  async deleteProject(projectId: string, trashItem: TrashItem): Promise<void> {
    await this.moveToTrash(trashItem);
    const { error } = await supabase.from('projects').delete().eq('id', projectId);
    if (error) throw error;
  },

  // ==========================================
  // 3. CÔNG VIỆC (TASKS & AUDIT LOGS)
  // ==========================================
  async fetchTasks(): Promise<TaskItem[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*, logs:task_logs(*)')
      .order('due_date', { ascending: true });

    if (error) {
      console.error('Lỗi khi tải tasks từ Supabase:', error);
      throw error;
    }

    return (data || []).map((t: any) => {
      const sortedLogs: TaskLogItem[] = (t.logs || [])
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .map((l: any) => ({
          id: l.id,
          timestamp: l.created_at,
          author: l.author,
          action: l.action,
          changes: l.changes || [],
          note: l.note || undefined,
        }));

      return {
        id: t.id,
        title: t.title,
        projectId: t.project_id,
        projectName: t.project_name,
        phaseId: t.phase_id || undefined,
        phaseName: t.phase_name || undefined,
        team: t.team,
        assignee: t.assignee,
        productOwners: t.product_owners || [],
        status: t.status,
        priority: t.priority,
        dueDate: t.due_date,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
        progress: t.progress !== null ? Number(t.progress) : 0,
        details: t.details || undefined,
        blockerReason: t.blocker_reason || undefined,
        workLink: t.work_link || undefined,
        resultLink: t.result_link || undefined,
        latestUpdateNote: t.latest_update_note || undefined,
        createdBy: t.created_by || undefined,
        logs: sortedLogs,
      };
    });
  },

  async saveTask(task: TaskItem, newLog?: TaskLogItem): Promise<void> {
    // 1. Lưu task
    const { error: taskErr } = await supabase.from('tasks').upsert({
      id: task.id,
      title: task.title,
      project_id: task.projectId,
      project_name: task.projectName,
      phase_id: task.phaseId || null,
      phase_name: task.phaseName || null,
      team: task.team,
      assignee: task.assignee,
      product_owners: task.productOwners || [],
      status: task.status,
      priority: task.priority,
      due_date: task.dueDate ? task.dueDate.slice(0, 10) : '2026-12-31',
      progress: task.progress !== undefined ? task.progress : (task.status === 'Hoàn thành' ? 100 : 0),
      details: task.details || null,
      blocker_reason: task.blockerReason || null,
      work_link: task.workLink || null,
      result_link: task.resultLink || null,
      latest_update_note: task.latestUpdateNote || null,
      created_by: task.createdBy || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

    if (taskErr) throw taskErr;

    // 2. Lưu log thay đổi nếu có
    if (newLog) {
      const { error: logErr } = await supabase.from('task_logs').insert({
        id: newLog.id || `log-${Date.now()}`,
        task_id: task.id,
        author: newLog.author,
        action: newLog.action,
        changes: newLog.changes || [],
        note: newLog.note || null,
        created_at: newLog.timestamp || new Date().toISOString(),
      });
      if (logErr) console.error('Lỗi khi lưu task log:', logErr);
    }
  },

  async deleteTask(taskId: string, trashItem: TrashItem): Promise<void> {
    await this.moveToTrash(trashItem);
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) throw error;
  },

  // ==========================================
  // 4. THÙNG RÁC (TRASH & RESTORE)
  // ==========================================
  async fetchTrash(): Promise<TrashItem[]> {
    const { data, error } = await supabase
      .from('trash')
      .select('*')
      .order('deleted_at', { ascending: false });

    if (error) {
      console.error('Lỗi khi tải thùng rác từ Supabase:', error);
      throw error;
    }

    return (data || []).map((t: any) => ({
      id: t.id,
      originalId: t.original_id,
      type: t.type,
      title: t.title,
      subtitle: t.subtitle || undefined,
      deletedAt: t.deleted_at,
      deletedBy: t.deleted_by,
      data: t.data,
    }));
  },

  async moveToTrash(trashItem: TrashItem): Promise<void> {
    const { error } = await supabase.from('trash').upsert({
      id: trashItem.id,
      original_id: trashItem.originalId,
      type: trashItem.type,
      title: trashItem.title,
      subtitle: trashItem.subtitle || null,
      data: trashItem.data,
      deleted_by: trashItem.deletedBy || 'Admin',
      deleted_at: trashItem.deletedAt || new Date().toISOString(),
    }, { onConflict: 'id' });

    if (error) throw error;
  },

  async restoreFromTrash(item: TrashItem): Promise<void> {
    // 1. Khôi phục thực thể
    if (item.type === 'task') {
      await this.saveTask(item.data as TaskItem);
    } else if (item.type === 'project') {
      await this.saveProject(item.data as ProjectItem);
    } else if (item.type === 'member') {
      await this.saveMember(item.data as MemberItem);
    }

    // 2. Xóa khỏi thùng rác
    const { error } = await supabase.from('trash').delete().eq('id', item.id);
    if (error) throw error;
  },

  async deleteTrashPermanently(id: string): Promise<void> {
    const { error } = await supabase.from('trash').delete().eq('id', id);
    if (error) throw error;
  },

  async emptyTrash(): Promise<void> {
    const { error } = await supabase.from('trash').delete().neq('id', '___all___');
    if (error) throw error;
  },

  // ==========================================
  // 5. TÀI KHOẢN & MẬT KHẨU
  // ==========================================
  async getStoredPassword(username: string): Promise<string | null> {
    const normalized = username.trim().toLowerCase();
    const { data, error } = await supabase
      .from('member_credentials')
      .select('password_hash')
      .eq('username', normalized)
      .single();

    if (error || !data) return null;
    return data.password_hash;
  },

  async updatePassword(username: string, newPassword: string): Promise<void> {
    const normalized = username.trim().toLowerCase();
    const { error } = await supabase.from('member_credentials').upsert({
      username: normalized,
      password_hash: newPassword,
      is_default_password: false,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'username' });

    if (error) throw error;
  },

  // ==========================================
  // 6. THÔNG BÁO CÁ NHÂN (NOTIFICATIONS)
  // ==========================================
  async fetchNotifications(recipientName?: string): Promise<NotificationItem[]> {
    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(60);

      if (recipientName) {
        query = query.eq('recipient_name', recipientName);
      }

      const { data, error } = await query;
      if (error) {
        console.warn('Lỗi tải notifications từ Supabase (bảng có thể chưa tạo):', error.message);
        return [];
      }

      return (data || []).map((n: any) => ({
        id: n.id,
        recipientName: n.recipient_name,
        recipientId: n.recipient_id || undefined,
        actorName: n.actor_name,
        projectId: n.project_id || undefined,
        projectName: n.project_name,
        taskId: n.task_id || undefined,
        taskTitle: n.task_title || undefined,
        type: n.type,
        title: n.title,
        content: n.content,
        isRead: Boolean(n.is_read),
        createdAt: n.created_at,
      }));
    } catch (e) {
      console.warn('Exception khi fetchNotifications:', e);
      return [];
    }
  },

  async saveNotification(item: NotificationItem): Promise<void> {
    try {
      const { error } = await supabase.from('notifications').insert({
        id: item.id,
        recipient_name: item.recipientName,
        recipient_id: item.recipientId || null,
        actor_name: item.actorName,
        project_id: item.projectId || null,
        project_name: item.projectName,
        task_id: item.taskId || null,
        task_title: item.taskTitle || null,
        type: item.type,
        title: item.title,
        content: item.content,
        is_read: Boolean(item.isRead),
        created_at: item.createdAt,
      });
      if (error) {
        console.warn('Lỗi lưu notification lên Supabase:', error.message);
      }
    } catch (e) {
      console.warn('Exception khi saveNotification:', e);
    }
  },

  async markNotificationAsRead(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);
      if (error) {
        console.warn('Lỗi đánh dấu đã đọc notification:', error.message);
      }
    } catch (e) {
      console.warn('Exception khi markNotificationAsRead:', e);
    }
  },

  async markAllNotificationsAsRead(recipientName: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('recipient_name', recipientName);
      if (error) {
        console.warn('Lỗi đánh dấu tất cả notification đã đọc:', error.message);
      }
    } catch (e) {
      console.warn('Exception khi markAllNotificationsAsRead:', e);
    }
  },

  // ==========================================
  // 7. REALTIME SUBSCRIPTIONS
  // ==========================================
  subscribeToChanges(callbacks: {
    onTasksChange?: () => void;
    onProjectsChange?: () => void;
    onTrashChange?: () => void;
    onNotificationsChange?: () => void;
  }) {
    const channel = supabase
      .channel('wms-db-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        callbacks.onTasksChange?.();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_logs' }, () => {
        callbacks.onTasksChange?.();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
        callbacks.onProjectsChange?.();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_phases' }, () => {
        callbacks.onProjectsChange?.();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_logs' }, () => {
        callbacks.onProjectsChange?.();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trash' }, () => {
        callbacks.onTrashChange?.();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
        callbacks.onNotificationsChange?.();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
