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
import { deduplicateNotifications } from '../utils/notificationDeduplication';

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
      role: m.role || undefined,
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
      role: member.role || null,
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
    const cleanDbDate = (val?: string | null): string | null => {
      if (!val || typeof val !== 'string' || !val.trim()) return null;
      const s = val.trim().slice(0, 10);
      return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
    };

    let candidateCode = (project.code && project.code.trim())
      ? project.code.trim().toUpperCase()
      : `VNE-${Date.now().toString().slice(-4)}`;

    // 1. Lưu thông tin dự án
    const projectPayload: any = {
      id: project.id,
      name: project.name ? project.name.trim() : 'Dự án mới',
      code: candidateCode,
      description: project.description || null,
      objective: project.objective || null,
      product_owner: project.productOwner || null,
      lead_name: project.leadName || null,
      start_date: cleanDbDate(project.startDate),
      target_date: cleanDbDate(project.targetDate) || '2026-12-31',
      status: normalizeProjectStatus(project.status),
      is_strategic: Boolean(project.isStrategic),
      roles: project.roles || { pm: [], designer: [], seo: [], data: [] },
      link_order_tech: project.linkOrderTech || project.links?.orderTech || null,
      link_chat: project.linkChat || project.links?.chat || null,
      link_dashboard: project.linkDashboard || project.links?.dashboard || null,
      link_report: project.linkReport || project.links?.report || null,
      link_beta: project.linkBeta || project.links?.beta || null,
      link_production: project.linkProduction || project.links?.production || null,
      custom_links: project.customLinks || project.links?.custom || [],
      checklist: project.checklist || [],
      created_by: project.createdBy || null,
      updated_at: new Date().toISOString(),
    };

    let { error: projErr } = await supabase.from('projects').upsert(projectPayload, { onConflict: 'id' });

    // Tự động xử lý trùng mã dự án (Unique constraint "projects_code_key" - Error 23505)
    if (projErr && ((projErr as any).code === '23505' || projErr.message?.toLowerCase().includes('projects_code_key') || projErr.message?.toLowerCase().includes('code'))) {
      const fallbackCode = `${candidateCode.slice(0, 10)}-${Date.now().toString().slice(-4)}`;
      console.warn(`[saveProject] Mã dự án ${candidateCode} đã tồn tại trong Supabase. Đang thử lại với mã duy nhất: ${fallbackCode}`);
      projectPayload.code = fallbackCode;
      project.code = fallbackCode;
      const retryCode = await supabase.from('projects').upsert(projectPayload, { onConflict: 'id' });
      projErr = retryCode.error;
    }

    // Tự động thử lại bằng cách lược bỏ các cột chưa có trong DDL của Supabase nếu gặp lỗi 42703 (undefined_column)
    if (projErr && ((projErr as any).code === '42703' || projErr.message?.toLowerCase().includes('column'))) {
      console.warn('[saveProject] Phát hiện cột chưa hỗ trợ trong bối cảnh Supabase. Đang tiến hành retry lược bỏ bớt các cột mới:', projErr.message);
      const optionalCols = ['checklist', 'roles', 'custom_links', 'link_order_tech', 'link_chat', 'link_dashboard', 'link_report', 'link_beta', 'link_production', 'is_strategic', 'created_by'];
      
      for (const col of optionalCols) {
        if (projErr.message?.toLowerCase().includes(col) || (projErr as any).code === '42703') {
          delete projectPayload[col];
        }
      }

      const retry = await supabase.from('projects').upsert(projectPayload, { onConflict: 'id' });
      projErr = retry.error;
    }

    if (projErr) {
      console.error('[saveProject] Lỗi nghiêm trọng khi lưu dự án vào Supabase:', projErr);
      throw projErr;
    }

    console.log(`[saveProject] ✅ Đã lưu dự án "${project.name}" (${project.id}) [Mã: ${projectPayload.code}] vào Supabase thành công!`);


    // 2. Đồng bộ các phases: Dọn dẹp phases đã bị xóa và upsert phases hiện tại
    const currentPhaseIds = (project.phases || []).map((p) => p.id).filter(Boolean);

    try {
      const { data: existingDbPhases } = await supabase
        .from('project_phases')
        .select('id')
        .eq('project_id', project.id);

      if (existingDbPhases && existingDbPhases.length > 0) {
        const currentSet = new Set(currentPhaseIds);
        const toDeleteIds = existingDbPhases
          .map((p) => p.id)
          .filter((id) => !currentSet.has(id));

        if (toDeleteIds.length > 0) {
          const { error: delErr } = await supabase
            .from('project_phases')
            .delete()
            .in('id', toDeleteIds);
          if (delErr) {
            console.error('[saveProject] Lỗi khi xóa phase cũ khỏi Supabase:', delErr);
          } else {
            console.log(`[saveProject] ✅ Đã xóa ${toDeleteIds.length} phase không còn thuộc dự án ${project.id}`);
          }
        }
      }
    } catch (cleanPhaseErr) {
      console.error('[saveProject] Ngoại lệ khi kiểm tra và xóa phase cũ:', cleanPhaseErr);
    }

    if (project.phases && project.phases.length > 0) {
      const phaseRows = project.phases.map((ph, idx) => ({
        id: ph.id || `phase-${Date.now()}-${idx}`,
        project_id: project.id,
        name: ph.name,
        due_date: ph.dueDate ? ph.dueDate.slice(0, 10) : null,
        status: ph.status || 'Chưa bắt đầu',
        description: ph.description || null,
        sort_order: idx + 1,
      }));
      const { error: phErr } = await supabase.from('project_phases').upsert(phaseRows, { onConflict: 'id' });
      if (phErr) console.error('[saveProject] Lỗi khi lưu phases:', phErr);
    }

    // 3. Lưu ghi chú (notes) nếu có
    if (project.notes && project.notes.length > 0) {
      const noteRows = project.notes.map((n, idx) => ({
        id: n.id || `note-${Date.now()}-${idx}`,
        project_id: project.id,
        author: n.author,
        content: n.content,
        created_at: n.createdAt || new Date().toISOString(),
      }));
      const { error: noteErr } = await supabase.from('project_notes').upsert(noteRows, { onConflict: 'id' });
      if (noteErr) console.error('[saveProject] Lỗi khi lưu project notes:', noteErr);
    }

    // 4. Lưu lịch sử thay đổi (logs)
    const logsToSave: ProjectHistoryLog[] = newLog
      ? [newLog]
      : (project.history && project.history.length > 0 ? project.history : []);

    if (logsToSave.length > 0) {
      const logRows = logsToSave.map((l, idx) => ({
        id: l.id || `plog-${Date.now()}-${idx}`,
        project_id: project.id,
        author: l.author,
        action: l.action,
        changes: l.changes || [],
        note: l.note || null,
        created_at: l.timestamp || new Date().toISOString(),
      }));
      const { error: logErr } = await supabase.from('project_logs').upsert(logRows, { onConflict: 'id' });
      if (logErr) console.error('[saveProject] Lỗi khi lưu project logs:', logErr);
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

  async deletePhase(phaseId: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('project_phases').delete().eq('id', phaseId);
      if (error) {
        console.error('[deletePhase] Lỗi khi xóa phase khỏi Supabase:', error);
        return false;
      }
      console.log(`[deletePhase] ✅ Đã xóa phase ${phaseId} khỏi Supabase thành công.`);
      return true;
    } catch (err) {
      console.error('[deletePhase] Ngoại lệ khi xóa phase:', err);
      return false;
    }
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
        isRecurring: Boolean(t.is_recurring),
        recurringRuleId: t.recurring_rule_id || undefined,
        recurringFrequency: t.recurring_frequency || undefined,
        logs: sortedLogs,
      };
    });
  },

  async saveTask(task: TaskItem, newLog?: TaskLogItem): Promise<void> {
    // 1. Lưu task
    const taskPayload: any = {
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
      is_recurring: Boolean(task.isRecurring),
      recurring_rule_id: task.recurringRuleId || null,
      recurring_frequency: task.recurringFrequency || null,
      updated_at: new Date().toISOString(),
    };

    let { error: taskErr } = await supabase.from('tasks').upsert(taskPayload, { onConflict: 'id' });
    if (taskErr && (taskErr.message?.toLowerCase().includes('recurring') || (taskErr as any).code === '42703')) {
      delete taskPayload.is_recurring;
      delete taskPayload.recurring_rule_id;
      delete taskPayload.recurring_frequency;
      const retry = await supabase.from('tasks').upsert(taskPayload, { onConflict: 'id' });
      taskErr = retry.error;
    }
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
        .limit(100);

      if (recipientName) {
        query = query.eq('recipient_name', recipientName);
      }

      const { data, error } = await query;
      if (error) {
        console.warn('Lỗi tải notifications từ Supabase (bảng có thể chưa tạo):', error.message);
        try {
          const local = localStorage.getItem('vne_notifications_v1');
          return local ? JSON.parse(local) : [];
        } catch {
          return [];
        }
      }

      const items: NotificationItem[] = (data || []).map((n: any) => ({
        id: n.id,
        recipientName: n.recipient_name || n.recipient_id || '',
        recipientId: n.recipient_id || undefined,
        actorName: n.actor_name || n.actor_id || '',
        projectId: n.project_id || undefined,
        projectName: n.project_name || '',
        taskId: n.task_id || (n.entity_type === 'task' ? n.entity_id : undefined),
        taskTitle: n.task_title || undefined,
        type: n.type,
        title: n.title,
        content: n.content || n.message || '',
        isRead: Boolean(n.is_read),
        createdAt: n.created_at,
      }));

      // Đồng bộ vào localStorage để dự phòng ngoại tuyến
      const dedupedItems = deduplicateNotifications(items);
      if (dedupedItems.length > 0) {
        try {
          localStorage.setItem('vne_notifications_v1', JSON.stringify(dedupedItems));
        } catch (e) {}
      }

      return dedupedItems;
    } catch (e) {
      console.warn('Exception khi fetchNotifications:', e);
      try {
        const local = localStorage.getItem('vne_notifications_v1');
        return local ? deduplicateNotifications(JSON.parse(local)) : [];
      } catch {
        return [];
      }
    }
  },

  async saveNotification(item: NotificationItem): Promise<void> {
    // 1. Luôn lưu dự phòng vào localStorage trước (loại trừ bản ghi trùng lặp)
    try {
      const local = localStorage.getItem('vne_notifications_v1');
      const list: NotificationItem[] = local ? JSON.parse(local) : [];
      const updated = deduplicateNotifications([item, ...list]).slice(0, 100);
      localStorage.setItem('vne_notifications_v1', JSON.stringify(updated));
    } catch (e) {
      console.warn('Không thể lưu notification vào localStorage:', e);
    }

    // 2. Lưu lên Supabase nếu bảng tồn tại (upsert để chống duplicate ID)
    try {
      const payload: any = {
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
      };

      const { error } = await supabase.from('notifications').upsert(payload, { onConflict: 'id' });
      if (error) {
        console.warn('Lỗi lưu notification lên Supabase:', error.message);
        // Dự phòng tương thích nếu bảng cũ dùng cột message / recipient_id
        if (error.message?.toLowerCase().includes('content') || error.message?.toLowerCase().includes('recipient_name')) {
          const fallbackPayload: any = {
            id: item.id,
            recipient_id: item.recipientId || item.recipientName,
            actor_name: item.actorName,
            type: item.type,
            title: item.title,
            message: item.content,
            entity_type: item.taskId ? 'task' : 'project',
            entity_id: item.taskId || item.projectId || null,
            project_id: item.projectId || null,
            is_read: Boolean(item.isRead),
            created_at: item.createdAt,
          };
          await supabase.from('notifications').upsert(fallbackPayload, { onConflict: 'id' });
        }
      }
    } catch (e) {
      console.warn('Exception khi saveNotification:', e);
    }
  },

  async markNotificationAsRead(id: string): Promise<void> {
    // 1. Cập nhật localStorage
    try {
      const local = localStorage.getItem('vne_notifications_v1');
      if (local) {
        const list: NotificationItem[] = JSON.parse(local);
        const updated = list.map((n) => (n.id === id ? { ...n, isRead: true } : n));
        localStorage.setItem('vne_notifications_v1', JSON.stringify(updated));
      }
    } catch (e) {}

    // 2. Cập nhật Supabase
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
    // 1. Cập nhật localStorage
    try {
      const local = localStorage.getItem('vne_notifications_v1');
      if (local) {
        const list: NotificationItem[] = JSON.parse(local);
        const updated = list.map((n) => ({ ...n, isRead: true }));
        localStorage.setItem('vne_notifications_v1', JSON.stringify(updated));
      }
    } catch (e) {}

    // 2. Cập nhật Supabase
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
  // 7. CẤU HÌNH HỆ THỐNG (SYSTEM SETTINGS)
  // ==========================================
  async getSystemSetting<T = any>(key: string, defaultValue?: T): Promise<T | undefined> {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', key)
        .maybeSingle();

      if (!error && data && data.value !== undefined) {
        return data.value as T;
      }
    } catch (e) {
      console.warn(`[wmsDataService] getSystemSetting(${key}) error:`, e);
    }
    return defaultValue;
  },

  async setSystemSetting(key: string, value: any, updatedBy?: string): Promise<void> {
    try {
      const { error } = await supabase.from('system_settings').upsert({
        key,
        value,
        updated_at: new Date().toISOString(),
        updated_by: updatedBy || null,
      }, { onConflict: 'key' });
      if (error) throw error;
    } catch (e) {
      console.warn(`[wmsDataService] setSystemSetting(${key}) error:`, e);
    }
  },

  // ==========================================
  // 8. REALTIME SUBSCRIPTIONS
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
