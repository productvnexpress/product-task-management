/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  RecurringRuleConfig,
  RecurrenceFrequency,
  TaskItem,
  TaskLogItem,
} from '../types';
import { getTodayDateString, normalizeDateString, getDaysDifference } from '../utils/dateUtils';
import { formatDateWithEnDay } from '../utils/formatters';
import { supabase } from './supabaseClient';

const STORAGE_KEYS = {
  RULES: 'wms_recurring_tasks_rules',
};

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
    // Thêm 1 tháng, xử lý an toàn mốc ngày cuối tháng
    const curDay = date.getDate();
    date.setMonth(date.getMonth() + 1);
    // Nếu tháng mới có ít ngày hơn và bị tràn sang tháng sau
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

export const recurringTaskService = {
  /**
   * Khởi tạo và đồng bộ quy tắc lặp từ Supabase khi mở ứng dụng
   */
  async initFromSupabase(): Promise<RecurringRuleConfig[]> {
    try {
      const { data, error } = await supabase
        .from('recurring_rules')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        if (data.length > 0) {
          const rules: RecurringRuleConfig[] = data.map((r: any) => ({
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
          localStorage.setItem(STORAGE_KEYS.RULES, JSON.stringify(rules));
          return rules;
        } else {
          // Bảng trên DB chưa có quy tắc nào, kiểm tra đồng bộ quy tắc local lên nếu có
          const localRules = this.getRules();
          if (localRules.length > 0) {
            this.syncToSupabase(localRules).catch(() => {});
          }
          return localRules;
        }
      }
    } catch (err) {
      console.warn('[recurringTaskService] initFromSupabase error:', err);
    }
    return this.getRules();
  },

  /**
   * Lấy danh sách quy tắc lặp từ bộ nhớ
   */
  getRules(): RecurringRuleConfig[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.RULES);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
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
      localStorage.setItem(STORAGE_KEYS.RULES, JSON.stringify(rules));
      // Tùy chọn: đồng bộ bất đồng bộ lên Supabase nếu có bảng
      this.syncToSupabase(rules).catch((err) => {
        // Im lặng bỏ qua nếu Supabase chưa cấu hình bảng recurring_rules
      });
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
   * Xóa một quy tắc lặp
   */
  deleteRule(id: string): void {
    const rules = this.getRules().filter((r) => r.id !== id);
    this.saveRules(rules);
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
   * Hàm này được gọi khi khởi động ứng dụng và mỗi phút một lần
   */
  checkAndExecuteDueRecurringTasks(
    onTaskGenerated: (newTask: TaskItem, rule: RecurringRuleConfig) => void,
    now: Date = new Date()
  ): number {
    const rules = this.getRules();
    let generatedCount = 0;
    let hasChanges = false;

    // Giờ và ngày hiện tại
    const todayStr = getTodayDateString(now);
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // Chuyển thời gian hiện tại thành phút trong ngày để so sánh
    const currentMinutesOfDay = currentHour * 60 + currentMinute;

    rules.forEach((rule) => {
      // Chỉ xử lý các quy tắc đang hoạt động
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

      // 2. Kiểm tra mốc giờ chạy (Mặc định 8:00 AM = 8 * 60 = 480 phút)
      const [runHour, runMin] = (rule.nextRunTime || '08:00').split(':').map(Number);
      const targetMinutesOfDay = (runHour || 8) * 60 + (runMin || 0);

      // Nếu ngày chạy là hôm nay nhưng chưa tới 8:00 AM -> chưa sinh
      if (normNextRunDate === todayStr && currentMinutesOfDay < targetMinutesOfDay) {
        return;
      }

      // Nếu ngày chạy ở tương lai -> chưa đến lúc sinh
      if (normNextRunDate > todayStr) {
        return;
      }

      // 3. Đã đến hoặc qua thời điểm 8:00 AM của ngày chạy:
      // Kiểm tra xem đã sinh task cho chu kỳ này chưa (chống sinh trùng lặp)
      if (rule.lastGeneratedAt) {
        const lastGenDate = rule.lastGeneratedAt.slice(0, 10);
        if (lastGenDate === normNextRunDate) {
          // Đã sinh cho ngày này rồi, đẩy sang chu kỳ tiếp theo
          rule.nextRunDate = calculateNextCycleDate(normNextRunDate, rule.frequency);
          hasChanges = true;
          return;
        }
      }

      // 4. Tạo task mới theo quy tắc
      const newTaskId = `task-rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const nowIso = new Date().toISOString();
      const creatorName = rule.createdBy || 'Admin';

      const initialLog: TaskLogItem = {
        id: `log-${Date.now()}`,
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
        note: `Công việc được tự động khởi tạo vào 8:00 AM theo chu kỳ ${formatFrequencyLabel(rule.frequency)}.`,
      };

      const newTask: TaskItem = {
        id: newTaskId,
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

      // 5. Cập nhật trạng thái quy tắc
      rule.lastGeneratedAt = nowIso;
      rule.lastGeneratedTaskId = newTaskId;
      rule.nextRunDate = calculateNextCycleDate(normNextRunDate, rule.frequency);

      // Kiểm tra nếu chu kỳ mới vượt quá ngày kết thúc
      if (rule.endType === 'specific_date' && rule.endDate) {
        if (rule.nextRunDate > normalizeDateString(rule.endDate)) {
          rule.status = 'completed';
        }
      }

      hasChanges = true;
      generatedCount++;

      // Phát sự kiện tạo task cho ứng dụng
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
    const newTaskId = `task-rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
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
      id: newTaskId,
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
    rule.lastGeneratedTaskId = newTaskId;
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

    // Đảm bảo nextRunDate ở mốc tiếp theo nếu ngày hiện tại đã vượt qua nextRunDate
    const todayStr = getTodayDateString();
    if (normalizeDateString(rule.nextRunDate) <= todayStr) {
      rule.nextRunDate = calculateNextCycleDate(todayStr, rule.frequency);
      if (rule.endType === 'specific_date' && rule.endDate) {
        if (rule.nextRunDate > normalizeDateString(rule.endDate)) {
          rule.status = 'completed';
        }
      }
      this.saveRules(rules);
    }
  },

  /**
   * Đồng bộ lên Supabase nếu có
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
