/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  RecurringRuleConfig,
  RecurrenceFrequency,
  TaskItem,
  TaskLogItem,
  TrashItem,
} from '../types';
import { getTodayDateString, normalizeDateString } from '../utils/dateUtils';
import { formatDateWithEnDay } from '../utils/formatters';
import { supabase } from './supabaseClient';

const STORAGE_KEYS = {
  RULES: 'vne_recurring_rules_v1',
  LEGACY_RULES: 'wms_recurring_tasks_rules',
  DELETED_RULE_IDS: 'vne_deleted_recurring_rule_ids',
  ENGINE_LOCK: 'vne_recurring_engine_lock_timestamp',
};

const ENGINE_LOCK_TIMEOUT_MS = 15000; // 15 giây khoá đa tab

/**
 * Tính toán ngày chu kỳ tiếp theo dựa trên tần suất
 */
export function calculateNextCycleDate(baseDateStr: string, frequency: RecurrenceFrequency): string {
  const normDate = normalizeDateString(baseDateStr) || getTodayDateString();
  const [year, month, day] = normDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  if (frequency === 'weekly') {
    date.setDate(date.getDate() + 7);
  } else if (frequency === 'biweekly') {
    date.setDate(date.getDate() + 14);
  } else if (frequency === 'monthly') {
    const curDay = date.getDate();
    date.setMonth(date.getMonth() + 1);
    if (date.getDate() !== curDay) {
      date.setDate(0); // Lấy ngày cuối cùng của tháng đúng
    }
  }

  return getTodayDateString(date);
}

/**
 * Hiển thị nhãn tần suất ngắn gọn theo EDITOR.md
 */
export function formatFrequencyLabel(freq: RecurrenceFrequency): string {
  switch (freq) {
    case 'weekly':
      return 'Hàng tuần';
    case 'biweekly':
      return '2 tuần / lần';
    case 'monthly':
      return 'Hàng tháng';
    default:
      return 'Hàng tuần';
  }
}

/**
 * Hiển thị nhãn kết thúc theo EDITOR.md
 */
export function formatEndTypeLabel(rule: RecurringRuleConfig): string {
  if (rule.endType === 'never') {
    return 'Không bao giờ';
  }
  if (rule.endDate) {
    return formatDateWithEnDay(rule.endDate);
  }
  return 'Không xác định';
}

/**
 * Quản lý danh sách ID quy tắc đã bị xoá để tránh việc Supabase sync phục hồi lại
 */
function getDeletedRuleIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DELETED_RULE_IDS);
    if (!raw) return new Set<string>();
    const parsed = JSON.parse(raw);
    return new Set<string>(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set<string>();
  }
}

function addDeletedRuleId(id: string): void {
  try {
    const ids = getDeletedRuleIds();
    ids.add(id);
    localStorage.setItem(STORAGE_KEYS.DELETED_RULE_IDS, JSON.stringify(Array.from(ids)));
  } catch (e) {
    console.error('[recurringTaskService] Lỗi khi lưu deleted rule id:', e);
  }
}

/**
 * Khoá phân tán giữa các tab (Cross-tab mutual exclusion lock)
 */
function acquireCrossTabLock(): boolean {
  try {
    const now = Date.now();
    const currentLockStr = localStorage.getItem(STORAGE_KEYS.ENGINE_LOCK);
    if (currentLockStr) {
      const lockTimestamp = Number(currentLockStr);
      if (!isNaN(lockTimestamp) && now - lockTimestamp < ENGINE_LOCK_TIMEOUT_MS) {
        // Có tab khác đang xử lý engine trong vòng 15s qua
        return false;
      }
    }
    // Chiếm khoá
    localStorage.setItem(STORAGE_KEYS.ENGINE_LOCK, String(now));
    return true;
  } catch {
    return true;
  }
}

export const recurringTaskService = {
  /**
   * Khởi tạo và đồng bộ quy tắc lặp từ Supabase khi mở ứng dụng
   */
  async initFromSupabase(): Promise<RecurringRuleConfig[]> {
    try {
      const deletedIds = getDeletedRuleIds();
      const { data, error } = await supabase
        .from('recurring_rules')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const rules: RecurringRuleConfig[] = data
          .filter((r: any) => !deletedIds.has(r.id))
          .map((r: any) => ({
            id: r.id,
            title: r.title,
            projectId: r.project_id,
            projectName: r.project_name,
            phaseId: r.phase_id || undefined,
            phaseName: r.phase_name || undefined,
            team: r.team,
            assignee: r.assignee,
            priority: r.priority,
            details: r.details || undefined,
            frequency: r.frequency,
            endType: r.end_type,
            endDate: r.end_date || undefined,
            nextRunDate: r.next_run_date,
            nextRunTime: r.next_run_time || '08:00',
            lastGeneratedAt: r.last_generated_at || undefined,
            lastGeneratedTaskId: undefined,
            status: r.status,
            createdBy: r.created_by || undefined,
            createdAt: r.created_at,
          }));

        // Hợp nhất với các quy tắc local chưa kịp đồng bộ
        const localRules = this.getRules();
        const serverMap = new Map(rules.map((r) => [r.id, r]));
        localRules.forEach((lr) => {
          if (!serverMap.has(lr.id) && !deletedIds.has(lr.id)) {
            rules.push(lr);
          }
        });

        localStorage.setItem(STORAGE_KEYS.RULES, JSON.stringify(rules));
        return rules;
      }
    } catch (err) {
      console.warn('[recurringTaskService] initFromSupabase warning:', err);
    }
    return this.getRules();
  },

  /**
   * Lấy danh sách quy tắc lặp từ bộ nhớ (Hỗ trợ migrate từ key cũ)
   */
  getRules(): RecurringRuleConfig[] {
    try {
      let raw = localStorage.getItem(STORAGE_KEYS.RULES);
      if (!raw) {
        raw = localStorage.getItem(STORAGE_KEYS.LEGACY_RULES);
        if (raw) {
          localStorage.setItem(STORAGE_KEYS.RULES, raw);
        }
      }
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      const deletedIds = getDeletedRuleIds();
      return Array.isArray(parsed) ? parsed.filter((r) => !deletedIds.has(r.id)) : [];
    } catch (e) {
      console.error('Lỗi khi đọc recurring rules từ localStorage:', e);
      return [];
    }
  },

  /**
   * Lưu toàn bộ danh sách quy tắc vào bộ nhớ
   */
  saveRules(rules: RecurringRuleConfig[]): void {
    try {
      const deletedIds = getDeletedRuleIds();
      const sanitized = rules.filter((r) => !deletedIds.has(r.id));
      localStorage.setItem(STORAGE_KEYS.RULES, JSON.stringify(sanitized));
      this.syncToSupabase(sanitized).catch(() => {});
    } catch (e) {
      console.error('Lỗi khi ghi recurring rules vào localStorage:', e);
    }
  },

  /**
   * Tìm quy tắc theo ID
   */
  getRuleById(id: string): RecurringRuleConfig | undefined {
    return this.getRules().find((r) => r.id === id);
  },

  /**
   * Thêm mới hoặc cập nhật một quy tắc
   */
  saveRule(rule: RecurringRuleConfig): RecurringRuleConfig {
    const rules = this.getRules();
    const existingIndex = rules.findIndex((r) => r.id === rule.id);

    if (existingIndex >= 0) {
      rules[existingIndex] = { ...rule };
    } else {
      rules.unshift({ ...rule });
    }

    this.saveRules(rules);
    return rule;
  },

  /**
   * Xóa một quy tắc lặp (Ghi nhận tombstone để chống Supabase hồi sinh)
   */
  deleteRule(id: string): void {
    addDeletedRuleId(id);
    const rules = this.getRules().filter((r) => r.id !== id);
    try {
      localStorage.setItem(STORAGE_KEYS.RULES, JSON.stringify(rules));
    } catch {}
    supabase
      .from('recurring_rules')
      .delete()
      .eq('id', id)
      .then(({ error }) => {
        if (error) console.error('[recurringTaskService] Lỗi khi xoá rule trên Supabase:', error);
      });
  },

  /**
   * Đổi trạng thái giữa active và paused
   */
  togglePauseRule(id: string): RecurringRuleConfig | undefined {
    const rules = this.getRules();
    const target = rules.find((r) => r.id === id);
    if (!target) return undefined;

    if (target.status === 'active') {
      target.status = 'paused';
    } else if (target.status === 'paused') {
      target.status = 'active';
    }

    this.saveRules(rules);
    return target;
  },

  /**
   * Kiểm tra và tự động sinh task đến hạn lúc 8:00 AM
   * Cơ chế bảo vệ:
   * 1. Cross-tab lock: chỉ 1 tab thực thi mỗi phút.
   * 2. Idempotent Deterministic ID: task-rec-${rule.id}-${cycleDate}
   * 3. Triple Deduplication: kiểm tra cả tasks hiện tại, trash và lastGeneratedAt.
   * 4. Fast-forward NextCycle: nếu bị lỡ nhiều chu kỳ, đẩy thẳng tới chu kỳ tiếp theo trong tương lai mà không spam lặp lại.
   */
  checkAndExecuteDueRecurringTasks(
    onTaskGenerated: (newTask: TaskItem, rule: RecurringRuleConfig) => void,
    tasks: TaskItem[] = [],
    trash: TrashItem[] = [],
    now: Date = new Date()
  ): number {
    // 1. Kiểm tra khoá đa tab
    if (!acquireCrossTabLock()) {
      return 0;
    }

    const rules = this.getRules();
    let generatedCount = 0;
    let hasChanges = false;

    const todayStr = getTodayDateString(now);
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentMinutesOfDay = currentHour * 60 + currentMinute;

    rules.forEach((rule) => {
      if (rule.status !== 'active') return;

      const normNextRunDate = normalizeDateString(rule.nextRunDate);
      if (!normNextRunDate) return;

      // 1. Kiểm tra nếu đã quá ngày kết thúc
      if (rule.endType === 'specific_date' && rule.endDate) {
        const normEndDate = normalizeDateString(rule.endDate);
        if (normNextRunDate > normEndDate) {
          rule.status = 'completed';
          hasChanges = true;
          return;
        }
      }

      // 2. Kiểm tra mốc giờ chạy (Mặc định 08:00 AM)
      const [runHour, runMin] = (rule.nextRunTime || '08:00').split(':').map(Number);
      const targetMinutesOfDay = (runHour || 8) * 60 + (runMin || 0);

      // Nếu ngày chạy là hôm nay nhưng chưa tới giờ hẹn -> bỏ qua
      if (normNextRunDate === todayStr && currentMinutesOfDay < targetMinutesOfDay) {
        return;
      }

      // Nếu ngày chạy ở tương lai -> bỏ qua
      if (normNextRunDate > todayStr) {
        return;
      }

      // 3. ID tất định chống trùng lặp tuyệt đối
      const deterministicTaskId = `task-rec-${rule.id}-${normNextRunDate}`;

      // 4. Kiểm tra Triple Deduplication
      // A. Đã sinh cho ngày này theo lastGeneratedAt
      const alreadyGeneratedForDate = Boolean(
        rule.lastGeneratedAt && rule.lastGeneratedAt.slice(0, 10) === normNextRunDate
      );

      // B. Kiểm tra danh sách tasks hiện hành
      const taskAlreadyExists = tasks.some(
        (t) =>
          t.id === deterministicTaskId ||
          (t.recurringRuleId === rule.id && normalizeDateString(t.dueDate) === normNextRunDate)
      );

      // C. Kiểm tra thùng rác (nếu người dùng đã xoá task của chu kỳ này thì KHÔNG tự tạo lại)
      const taskInTrash = trash.some((tr) => {
        if (tr.originalId === deterministicTaskId) return true;
        const taskData = tr.data as TaskItem | undefined;
        return (
          taskData?.recurringRuleId === rule.id &&
          normalizeDateString(taskData?.dueDate) === normNextRunDate
        );
      });

      if (alreadyGeneratedForDate || taskAlreadyExists || taskInTrash) {
        // Chu kỳ này đã được xử lý hoặc người dùng đã xoá -> Fast-forward sang chu kỳ kế tiếp
        let nextCycle = calculateNextCycleDate(normNextRunDate, rule.frequency);
        // Fast-forward vượt qua các ngày cũ nếu quá khứ bị dồn ứ
        while (nextCycle <= todayStr) {
          nextCycle = calculateNextCycleDate(nextCycle, rule.frequency);
        }
        rule.nextRunDate = nextCycle;
        if (rule.endType === 'specific_date' && rule.endDate) {
          if (rule.nextRunDate > normalizeDateString(rule.endDate)) {
            rule.status = 'completed';
          }
        }
        hasChanges = true;
        return;
      }

      // 5. Tiến hành tạo task mới
      const nowIso = new Date().toISOString();
      const creatorName = rule.createdBy || 'Admin';

      const initialLog: TaskLogItem = {
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: nowIso,
        author: 'Hệ thống (Theo chu kỳ)',
        action: `Tạo tự động theo chu kỳ ${formatFrequencyLabel(rule.frequency)}`,
        changes: [
          { field: 'Tiêu đề', newValue: rule.title },
          { field: 'Dự án', newValue: rule.projectName },
          { field: 'Phụ trách', newValue: rule.assignee },
          { field: 'Hạn hoàn thành', newValue: normNextRunDate },
          { field: 'Chu kỳ', newValue: formatFrequencyLabel(rule.frequency) },
        ],
        note: `Công việc được tự động khởi tạo lúc ${rule.nextRunTime || '08:00'} theo chu kỳ ${formatFrequencyLabel(rule.frequency)}.`,
      };

      const newTask: TaskItem = {
        id: deterministicTaskId,
        title: rule.title,
        projectId: rule.projectId,
        projectName: rule.projectName,
        phaseId: rule.phaseId || undefined,
        phaseName: rule.phaseName || undefined,
        team: rule.team,
        assignee: rule.assignee,
        status: 'Chưa làm',
        progress: 0,
        priority: rule.priority,
        dueDate: normNextRunDate,
        createdAt: nowIso,
        updatedAt: nowIso,
        details: rule.details || '',
        subtasks: [],
        logs: [initialLog],
        createdBy: creatorName,
        recurringRuleId: rule.id,
        isRecurring: true,
        recurringFrequency: rule.frequency,
      };

      // 6. Cập nhật rule: đánh dấu đã sinh và tịnh tiến chu kỳ
      rule.lastGeneratedAt = nowIso;
      rule.lastGeneratedTaskId = deterministicTaskId;
      let nextCycle = calculateNextCycleDate(normNextRunDate, rule.frequency);
      while (nextCycle <= todayStr) {
        nextCycle = calculateNextCycleDate(nextCycle, rule.frequency);
      }
      rule.nextRunDate = nextCycle;

      if (rule.endType === 'specific_date' && rule.endDate) {
        if (rule.nextRunDate > normalizeDateString(rule.endDate)) {
          rule.status = 'completed';
        }
      }

      hasChanges = true;
      generatedCount++;

      onTaskGenerated(newTask, rule);
    });

    if (hasChanges) {
      this.saveRules(rules);
    }

    return generatedCount;
  },

  /**
   * Kích hoạt sinh task ngay lập tức (dành cho Admin test hoặc kích hoạt khẩn cấp)
   */
  triggerRunNow(
    ruleId: string,
    onTaskGenerated: (newTask: TaskItem, rule: RecurringRuleConfig) => void
  ): boolean {
    const rules = this.getRules();
    const rule = rules.find((r) => r.id === ruleId);
    if (!rule) return false;

    const todayStr = getTodayDateString();
    const deterministicTaskId = `task-rec-${rule.id}-${todayStr}-${Date.now().toString(36)}`;
    const nowIso = new Date().toISOString();
    const creatorName = rule.createdBy || 'Admin';

    const initialLog: TaskLogItem = {
      id: `log-${Date.now()}`,
      timestamp: nowIso,
      author: `${creatorName} (Kích hoạt thủ công)`,
      action: `Tạo thủ công theo chu kỳ ${formatFrequencyLabel(rule.frequency)}`,
      changes: [
        { field: 'Tiêu đề', newValue: rule.title },
        { field: 'Dự án', newValue: rule.projectName },
        { field: 'Phụ trách', newValue: rule.assignee },
        { field: 'Hạn hoàn thành', newValue: todayStr },
      ],
      note: 'Admin kích hoạt tạo ngay lập tức từ giao diện quản lý.',
    };

    const newTask: TaskItem = {
      id: deterministicTaskId,
      title: rule.title,
      projectId: rule.projectId,
      projectName: rule.projectName,
      phaseId: rule.phaseId || undefined,
      phaseName: rule.phaseName || undefined,
      team: rule.team,
      assignee: rule.assignee,
      status: 'Chưa làm',
      progress: 0,
      priority: rule.priority,
      dueDate: todayStr,
      createdAt: nowIso,
      updatedAt: nowIso,
      details: rule.details || '',
      subtasks: [],
      logs: [initialLog],
      createdBy: creatorName,
      recurringRuleId: rule.id,
      isRecurring: true,
      recurringFrequency: rule.frequency,
    };

    rule.lastGeneratedAt = nowIso;
    rule.lastGeneratedTaskId = deterministicTaskId;
    rule.nextRunDate = calculateNextCycleDate(todayStr, rule.frequency);

    if (rule.endType === 'specific_date' && rule.endDate) {
      if (rule.nextRunDate > normalizeDateString(rule.endDate)) {
        rule.status = 'completed';
      }
    }

    this.saveRules(rules);
    onTaskGenerated(newTask, rule);
    return true;
  },

  /**
   * Xử lý khi một task thuộc chu kỳ được đánh dấu Hoàn thành
   */
  onTaskCompleted(ruleId: string): void {
    if (!ruleId) return;
    const rules = this.getRules();
    const rule = rules.find((r) => r.id === ruleId);
    if (!rule || rule.status !== 'active') return;

    const todayStr = getTodayDateString();
    if (normalizeDateString(rule.nextRunDate) <= todayStr) {
      let nextCycle = calculateNextCycleDate(todayStr, rule.frequency);
      while (nextCycle <= todayStr) {
        nextCycle = calculateNextCycleDate(nextCycle, rule.frequency);
      }
      rule.nextRunDate = nextCycle;
      if (rule.endType === 'specific_date' && rule.endDate) {
        if (rule.nextRunDate > normalizeDateString(rule.endDate)) {
          rule.status = 'completed';
        }
      }
      this.saveRules(rules);
    }
  },

  /**
   * Đồng bộ lên Supabase nếu có bảng
   */
  async syncToSupabase(rules: RecurringRuleConfig[]): Promise<void> {
    try {
      const payload = rules.map((r) => ({
        id: r.id,
        title: r.title,
        project_id: r.projectId,
        project_name: r.projectName,
        phase_id: r.phaseId || null,
        phase_name: r.phaseName || null,
        team: r.team,
        assignee: r.assignee,
        priority: r.priority,
        details: r.details || null,
        frequency: r.frequency,
        end_type: r.endType,
        end_date: r.endDate || null,
        next_run_date: r.nextRunDate,
        next_run_time: r.nextRunTime || '08:00',
        last_generated_at: r.lastGeneratedAt || null,
        status: r.status,
        created_by: r.createdBy,
        updated_at: new Date().toISOString(),
      }));

      await supabase.from('recurring_rules').upsert(payload, { onConflict: 'id' });
    } catch {
      // Supabase table có thể chưa tạo, tiếp tục an toàn với localStorage
    }
  },
};
