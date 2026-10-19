/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  NotificationRuleConfig,
  NotificationTriggerType,
  NotificationRecipientRole,
} from '../types';
import { supabase } from './supabaseClient';

const STORAGE_KEYS = {
  RULES: 'vne_notification_rules_v1',
};

/**
 * Danh sách quy tắc thông báo chuẩn mặc định của WMS
 * Bao quát toàn bộ các trigger hệ thống:
 * 1. Giao việc mới (task_assigned)
 * 2. Tạo công việc mới (task_created)
 * 3. Hoàn thành công việc (task_completed)
 * 4. Báo nghẽn công việc (task_blocked)
 * 5. Cập nhật tiến độ / trạng thái (task_updated)
 * 6. Bình luận & nhắc tên (task_comment)
 * 7. Nhắc việc đầu ngày lúc 08:30 (daily_task_reminder)
 * 8. Nhắc đóng task cuối ca lúc 16:30 (daily_close_reminder)
 * 9. Cảnh báo hạn chót giai đoạn trước 3 ngày (phase_due_soon)
 * 10. Cảnh báo hạn chót dự án trước 3 ngày (project_due_soon)
 */
export const DEFAULT_NOTIFICATION_RULES: NotificationRuleConfig[] = [
  {
    id: 'rule-task-assigned',
    name: 'Giao việc mới cho nhân sự',
    description: 'Bắn thông báo trực tiếp khi một nhân sự được giao hoặc chuyển giao công việc.',
    enabled: true,
    triggerType: 'task_assigned',
    recipientRole: 'assignee',
    titleTemplate: 'Bạn được giao việc trong {projectName}',
    contentTemplate: '{actorName} đã giao cho bạn: "{taskTitle}"',
    isSystemDefault: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rule-task-completed',
    name: 'Công việc hoàn thành',
    description: 'Thông báo cho PM và người tạo task khi nhân sự đánh dấu hoàn thành công việc kèm link kết quả.',
    enabled: true,
    triggerType: 'task_completed',
    recipientRole: 'project_pms',
    titleTemplate: 'Hoàn thành việc trong {projectName}',
    contentTemplate: '{actorName} đã hoàn thành công việc "{taskTitle}"',
    isSystemDefault: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rule-task-blocked',
    name: 'Báo nghẽn công việc (🚨 Khẩn cấp)',
    description: 'Cảnh báo nổi bật cho PM phụ trách khi công việc bị vướng mắc hoặc nghẽn tiến độ.',
    enabled: true,
    triggerType: 'task_blocked',
    recipientRole: 'project_pms',
    titleTemplate: '🚨 Bị nghẽn trong {projectName}',
    contentTemplate: '{actorName} báo nghẽn: "{taskTitle}" {note}',
    isSystemDefault: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rule-daily-morning',
    name: 'Nhắc lập kế hoạch công việc đầu ngày (08:30)',
    description: 'Tự động kiểm tra lúc 08:30 các ngày làm việc, nhắc nhân sự chưa có task đến hạn hôm nay.',
    enabled: true,
    triggerType: 'daily_task_reminder',
    triggerConditions: {
      scheduledTime: '08:30',
    },
    recipientRole: 'product_all',
    titleTemplate: 'Nhắc việc trong ngày (08:30)',
    contentTemplate: 'Bạn chưa có task đến hạn hôm nay. Vui lòng tạo việc hoặc cập nhật hạn hoàn thành.',
    isSystemDefault: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rule-daily-close',
    name: 'Nhắc kiểm tra & đóng task cuối ca (16:30)',
    description: 'Tự động kiểm tra lúc 16:30 các ngày làm việc, nhắc nhân sự còn việc dở dang đến hạn hoặc quá hạn.',
    enabled: true,
    triggerType: 'daily_close_reminder',
    triggerConditions: {
      scheduledTime: '16:30',
    },
    recipientRole: 'product_all',
    titleTemplate: 'Đóng task trong ngày (16:30)',
    contentTemplate: 'Còn việc đến hạn hôm nay chưa đóng. Hoàn thành hoặc dời hạn trước khi kết thúc ca làm việc.',
    isSystemDefault: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rule-phase-deadline',
    name: 'Cảnh báo hạn chót giai đoạn trước 3 ngày',
    description: 'Kiểm tra giai đoạn dự án sắp đến hạn (<= 3 ngày) hoặc đã quá hạn để gửi cảnh báo nghiệm thu.',
    enabled: true,
    triggerType: 'phase_due_soon',
    triggerConditions: {
      daysBefore: 3,
    },
    recipientRole: 'project_members',
    titleTemplate: 'Giai đoạn "{phaseName}" sắp đến hạn ({dueDate})',
    contentTemplate: 'Dự án: {projectName}. PM: {pmDisplay}. Vui lòng kiểm tra tiến độ nghiệm thu.',
    isSystemDefault: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rule-project-deadline',
    name: 'Cảnh báo hạn chót toàn dự án trước 3 ngày',
    description: 'Kiểm tra ngày mục tiêu của dự án sắp đến hạn (<= 3 ngày) hoặc đã quá hạn.',
    enabled: true,
    triggerType: 'project_due_soon',
    triggerConditions: {
      daysBefore: 3,
    },
    recipientRole: 'project_members',
    titleTemplate: 'Deadline dự án "{projectName}" sắp đến hạn ({dueDate})',
    contentTemplate: 'Dự án: {projectName}. PM: {pmDisplay}. Cần kiểm tra tổng thể tiến độ.',
    isSystemDefault: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rule-task-comment',
    name: 'Bình luận & Trao đổi công việc',
    description: 'Gửi thông báo khi có thảo luận mới, đặc biệt gắn tag @nhân_sự trong công việc.',
    enabled: true,
    triggerType: 'task_comment',
    recipientRole: 'assignee',
    titleTemplate: 'Trao đổi trong {projectName}',
    contentTemplate: '{actorName} đã bình luận: "{note}"',
    isSystemDefault: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rule-task-created',
    name: 'Công việc mới được tạo trong dự án',
    description: 'Thông báo cho PM khi có thành viên tạo thêm công việc mới trong dự án mình phụ trách.',
    enabled: true,
    triggerType: 'task_created',
    recipientRole: 'project_pms',
    titleTemplate: 'Task mới trong {projectName}',
    contentTemplate: '{actorName} đã tạo công việc "{taskTitle}"',
    isSystemDefault: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rule-task-updated',
    name: 'Thay đổi trạng thái sang Đang làm',
    description: 'Báo cho PM khi nhân sự bắt đầu thực hiện công việc.',
    enabled: true,
    triggerType: 'task_updated',
    recipientRole: 'project_pms',
    titleTemplate: 'Bắt đầu làm việc trong {projectName}',
    contentTemplate: '{actorName} đã chuyển sang Đang làm: "{taskTitle}"',
    isSystemDefault: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rule-task-deadline-selected',
    name: 'Chọn hạn hoàn thành',
    description: 'Thông báo cho người giao việc khi người nhận chọn hạn hoàn thành cho công việc.',
    enabled: true,
    triggerType: 'task_deadline_selected',
    recipientRole: 'task_creator',
    titleTemplate: 'Đã chọn hạn: {taskTitle}',
    contentTemplate: '{actorName} đã chọn hạn hoàn thành: {dueDate}',
    isSystemDefault: true,
    updatedAt: new Date().toISOString(),
  },
];

export const TRIGGER_TYPE_OPTIONS: {
  value: NotificationTriggerType;
  label: string;
  category: 'task' | 'daily' | 'deadline' | 'custom';
  description: string;
}[] = [
  {
    value: 'task_assigned',
    label: 'Khi được giao việc mới',
    category: 'task',
    description: 'Kích hoạt ngay khi có công việc mới được phân công hoặc đổi người phụ trách',
  },
  {
    value: 'task_completed',
    label: 'Khi công việc hoàn thành',
    category: 'task',
    description: 'Kích hoạt khi người phụ trách bấm hoàn thành công việc và nộp link kết quả',
  },
  {
    value: 'task_blocked',
    label: 'Khi công việc bị nghẽn',
    category: 'task',
    description: 'Kích hoạt khi công việc chuyển sang trạng thái "Bị nghẽn"',
  },
  {
    value: 'task_created',
    label: 'Khi tạo việc mới trong dự án',
    category: 'task',
    description: 'Kích hoạt khi bất kỳ ai tạo thêm task mới thuộc dự án',
  },
  {
    value: 'task_updated',
    label: 'Khi công việc chuyển sang Đang làm',
    category: 'task',
    description: 'Kích hoạt khi nhân sự bắt đầu thực hiện task',
  },
  {
    value: 'task_deadline_selected',
    label: 'Khi chọn hạn hoàn thành',
    category: 'task',
    description: 'Kích hoạt khi nhân sự nhận việc chọn hạn hoàn thành cho công việc',
  },
  {
    value: 'task_comment',
    label: 'Khi có bình luận hoặc nhắc tên @',
    category: 'task',
    description: 'Kích hoạt khi có phản hồi mới trong task',
  },
  {
    value: 'daily_task_reminder',
    label: 'Nhắc việc đầu ngày (Lịch cố định)',
    category: 'daily',
    description: 'Chạy định kỳ vào giờ cấu hình (mặc định 08:30 sáng các ngày làm việc)',
  },
  {
    value: 'daily_close_reminder',
    label: 'Nhắc đóng task cuối ngày (Lịch cố định)',
    category: 'daily',
    description: 'Chạy định kỳ vào giờ cấu hình (mặc định 16:30 chiều các ngày làm việc)',
  },
  {
    value: 'phase_due_soon',
    label: 'Cảnh báo hạn chót giai đoạn',
    category: 'deadline',
    description: 'Kích hoạt khi giai đoạn dự án còn <= N ngày hoặc bị quá hạn',
  },
  {
    value: 'project_due_soon',
    label: 'Cảnh báo hạn chót toàn dự án',
    category: 'deadline',
    description: 'Kích hoạt khi deadline tổng của dự án còn <= N ngày hoặc bị quá hạn',
  },
  {
    value: 'custom_event',
    label: 'Sự kiện tuỳ chỉnh khác',
    category: 'custom',
    description: 'Kích hoạt theo cấu hình điều kiện cụ thể',
  },
];

export const RECIPIENT_ROLE_OPTIONS: {
  value: NotificationRecipientRole;
  label: string;
  description: string;
}[] = [
  {
    value: 'assignee',
    label: 'Người được giao việc (Assignee)',
    description: 'Gửi cho nhân sự trực tiếp thực hiện công việc',
  },
  {
    value: 'project_pms',
    label: 'Product Managers của dự án (PMs)',
    description: 'Gửi cho các PM chịu trách nhiệm dự án',
  },
  {
    value: 'project_members',
    label: 'Toàn bộ nhân sự tham gia dự án',
    description: 'Gồm PM, Designer, SEO, Data, Lead và người có task trong dự án',
  },
  {
    value: 'task_creator',
    label: 'Người tạo việc (Creator)',
    description: 'Gửi cho người đã giao hoặc tạo công việc',
  },
  {
    value: 'product_all',
    label: 'Toàn bộ Ban Sản phẩm - Công nghệ',
    description: 'Gửi cho mọi nhân sự thuộc Product Manager, Designer, SEO, Data',
  },
  {
    value: 'admin_only',
    label: 'Chỉ Quản trị viên (Admin)',
    description: 'Chỉ gửi cho tài khoản có quyền Admin',
  },
  {
    value: 'specific_members',
    label: 'Chỉ định nhân sự cụ thể',
    description: 'Tự chọn danh sách nhân sự nhận thông báo',
  },
];

class NotificationRuleService {
  private cache: NotificationRuleConfig[] | null = null;

  public getRules(): NotificationRuleConfig[] {
    if (this.cache) return this.cache;

    try {
      const raw = localStorage.getItem(STORAGE_KEYS.RULES);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.cache = parsed;
          return parsed;
        }
      }
    } catch (e) {
      console.warn('[NotificationRuleService] Lỗi đọc rules từ localStorage:', e);
    }

    // Khởi tạo mặc định nếu chưa có
    this.cache = [...DEFAULT_NOTIFICATION_RULES];
    this.saveRules(this.cache);
    return this.cache;
  }

  public saveRules(rules: NotificationRuleConfig[]): void {
    this.cache = rules;
    try {
      localStorage.setItem(STORAGE_KEYS.RULES, JSON.stringify(rules));
    } catch (e) {
      console.warn('[NotificationRuleService] Lỗi lưu rules vào localStorage:', e);
    }

    // Đồng bộ Supabase nền nếu có kết nối
    try {
      supabase
        .from('system_settings')
        .upsert(
          {
            key: 'notification_rules',
            value: rules,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'key' }
        )
        .then(({ error }) => {
          if (error) {
            // Không làm gián đoạn UI nếu bảng chưa tạo
            console.debug('Supabase notification_rules sync notice:', error.message);
          }
        })
        .catch(() => {});
    } catch {}
  }

  public addRule(rule: Omit<NotificationRuleConfig, 'id' | 'updatedAt'>, author?: string): NotificationRuleConfig {
    const rules = this.getRules();
    const newRule: NotificationRuleConfig = {
      ...rule,
      id: `rule-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      updatedAt: new Date().toISOString(),
      updatedBy: author || 'Admin',
    };
    const updated = [newRule, ...rules];
    this.saveRules(updated);
    return newRule;
  }

  public updateRule(rule: NotificationRuleConfig, author?: string): void {
    const rules = this.getRules();
    const updated = rules.map((r) =>
      r.id === rule.id
        ? {
            ...rule,
            updatedAt: new Date().toISOString(),
            updatedBy: author || r.updatedBy,
          }
        : r
    );
    this.saveRules(updated);
  }

  public toggleRule(id: string, enabled: boolean): void {
    const rules = this.getRules();
    const updated = rules.map((r) => (r.id === id ? { ...r, enabled, updatedAt: new Date().toISOString() } : r));
    this.saveRules(updated);
  }

  public deleteRule(id: string): void {
    const rules = this.getRules();
    const updated = rules.filter((r) => r.id !== id);
    this.saveRules(updated);
  }

  public resetToDefaults(author?: string): NotificationRuleConfig[] {
    const defaults = DEFAULT_NOTIFICATION_RULES.map((r) => ({
      ...r,
      updatedAt: new Date().toISOString(),
      updatedBy: author || 'Admin',
    }));
    this.saveRules(defaults);
    return defaults;
  }

  /**
   * Tìm quy tắc kích hoạt phù hợp cho một triggerType
   */
  public getActiveRuleForTrigger(triggerType: NotificationTriggerType): NotificationRuleConfig | undefined {
    const rules = this.getRules();
    return rules.find((r) => r.enabled && r.triggerType === triggerType);
  }

  /**
   * Thay thế biến trong mẫu văn bản ({taskTitle}, {projectName}, ...)
   */
  public interpolate(template: string, vars: Record<string, string | number | undefined>): string {
    return template.replace(/\{(\w+)\}/g, (_, key) => {
      const val = vars[key];
      return val !== undefined && val !== null ? String(val) : '';
    });
  }
}

export const notificationRuleService = new NotificationRuleService();
