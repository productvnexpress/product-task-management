/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  NotificationRuleConfig,
  NotificationTriggerType,
  NotificationRecipientRole,
  MemberItem,
  ProjectItem,
} from '../types';
import {
  notificationRuleService,
  TRIGGER_TYPE_OPTIONS,
  RECIPIENT_ROLE_OPTIONS,
} from '../services/notificationRuleService';
import {
  Bell,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  RotateCcw,
  Clock,
  Sparkles,
  Filter,
  Check,
  X,
  AlertTriangle,
  Play,
  ToggleLeft,
  ToggleRight,
} from './vds/icons';

interface NotificationRulesTabProps {
  members: MemberItem[];
  projects: ProjectItem[];
  currentAuthUser?: MemberItem | null;
  onTestNotification?: (rule: NotificationRuleConfig) => void;
}

export const NotificationRulesTab: React.FC<NotificationRulesTabProps> = ({
  members,
  projects,
  currentAuthUser,
  onTestNotification,
}) => {
  const [rules, setRules] = useState<NotificationRuleConfig[]>(() =>
    notificationRuleService.getRules()
  );
  const [filterTrigger, setFilterTrigger] = useState<string>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal State: Thêm / Sửa
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<NotificationRuleConfig | null>(null);

  // Form Fields
  const [ruleName, setRuleName] = useState('');
  const [ruleDescription, setRuleDescription] = useState('');
  const [triggerType, setTriggerType] = useState<NotificationTriggerType>('task_assigned');
  const [recipientRole, setRecipientRole] = useState<NotificationRecipientRole>('assignee');
  const [specificRecipients, setSpecificRecipients] = useState<string[]>([]);
  const [titleTemplate, setTitleTemplate] = useState('');
  const [contentTemplate, setContentTemplate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('08:30');
  const [daysBefore, setDaysBefore] = useState<number>(3);
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'Khẩn cấp'>('all');
  const [projectFilter, setProjectFilter] = useState<'all' | string>('all');

  // Modal Xoá
  const [deletingRule, setDeletingRule] = useState<NotificationRuleConfig | null>(null);

  // Hiển thị toast tự tắt
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Mở modal Thêm
  const handleOpenAdd = () => {
    setEditingRule(null);
    setRuleName('');
    setRuleDescription('');
    setTriggerType('task_assigned');
    setRecipientRole('assignee');
    setSpecificRecipients([]);
    setTitleTemplate('Bạn được giao việc trong {projectName}');
    setContentTemplate('{actorName} đã giao cho bạn: "{taskTitle}"');
    setScheduledTime('08:30');
    setDaysBefore(3);
    setPriorityFilter('all');
    setProjectFilter('all');
    setIsModalOpen(true);
  };

  // Mở modal Sửa
  const handleOpenEdit = (rule: NotificationRuleConfig) => {
    setEditingRule(rule);
    setRuleName(rule.name);
    setRuleDescription(rule.description || '');
    setTriggerType(rule.triggerType);
    setRecipientRole(rule.recipientRole);
    setSpecificRecipients(rule.specificRecipients || []);
    setTitleTemplate(rule.titleTemplate);
    setContentTemplate(rule.contentTemplate);
    setScheduledTime(rule.triggerConditions?.scheduledTime || '08:30');
    setDaysBefore(rule.triggerConditions?.daysBefore ?? 3);
    setPriorityFilter(rule.triggerConditions?.priorityFilter || 'all');
    setProjectFilter(
      Array.isArray(rule.triggerConditions?.projectFilter)
        ? rule.triggerConditions.projectFilter[0] || 'all'
        : rule.triggerConditions?.projectFilter || 'all'
    );
    setIsModalOpen(true);
  };

  // Khi người dùng thay đổi triggerType ở modal Thêm mới, tự gợi ý template mẫu phù hợp
  const handleTriggerTypeChange = (newTrigger: NotificationTriggerType) => {
    setTriggerType(newTrigger);
    if (!editingRule) {
      switch (newTrigger) {
        case 'task_assigned':
          setRecipientRole('assignee');
          setTitleTemplate('Bạn được giao việc trong {projectName}');
          setContentTemplate('{actorName} đã giao cho bạn: "{taskTitle}"');
          break;
        case 'task_completed':
          setRecipientRole('project_pms');
          setTitleTemplate('Hoàn thành việc trong {projectName}');
          setContentTemplate('{actorName} đã hoàn thành công việc "{taskTitle}"');
          break;
        case 'task_blocked':
          setRecipientRole('project_pms');
          setTitleTemplate('🚨 Bị nghẽn trong {projectName}');
          setContentTemplate('{actorName} báo nghẽn: "{taskTitle}" {note}');
          break;
        case 'daily_task_reminder':
          setRecipientRole('product_all');
          setScheduledTime('08:30');
          setTitleTemplate('Nhắc việc trong ngày (08:30)');
          setContentTemplate('Bạn chưa có task đến hạn hôm nay. Vui lòng tạo việc hoặc cập nhật hạn hoàn thành.');
          break;
        case 'daily_close_reminder':
          setRecipientRole('product_all');
          setScheduledTime('16:30');
          setTitleTemplate('Đóng task trong ngày (16:30)');
          setContentTemplate('Còn {openCount} việc đến hạn hôm nay chưa đóng. Hoàn thành hoặc dời hạn trước khi kết thúc ca làm việc.');
          break;
        case 'phase_due_soon':
          setRecipientRole('project_members');
          setDaysBefore(3);
          setTitleTemplate('Giai đoạn "{phaseName}" sắp đến hạn ({dueDate})');
          setContentTemplate('Dự án: {projectName}. PM phụ trách: {pmDisplay}. Vui lòng kiểm tra tiến độ nghiệm thu.');
          break;
        case 'project_due_soon':
          setRecipientRole('project_members');
          setDaysBefore(3);
          setTitleTemplate('Deadline dự án "{projectName}" sắp đến hạn ({dueDate})');
          setContentTemplate('Dự án: {projectName}. PM phụ trách: {pmDisplay}. Cần kiểm tra tổng thể tiến độ.');
          break;
        case 'task_comment':
          setRecipientRole('assignee');
          setTitleTemplate('Trao đổi trong {projectName}');
          setContentTemplate('{actorName} đã bình luận: "{note}"');
          break;
        default:
          break;
      }
    }
  };

  // Lưu quy tắc
  const handleSaveRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName.trim() || !titleTemplate.trim() || !contentTemplate.trim()) return;

    const conditions: NotificationRuleConfig['triggerConditions'] = {};
    if (triggerType === 'daily_task_reminder' || triggerType === 'daily_close_reminder') {
      conditions.scheduledTime = scheduledTime;
    }
    if (triggerType === 'phase_due_soon' || triggerType === 'project_due_soon') {
      conditions.daysBefore = Number(daysBefore);
    }
    if (priorityFilter !== 'all') {
      conditions.priorityFilter = priorityFilter;
    }
    if (projectFilter !== 'all') {
      conditions.projectFilter = [projectFilter];
    }

    if (editingRule) {
      const updated: NotificationRuleConfig = {
        ...editingRule,
        name: ruleName.trim(),
        description: ruleDescription.trim() || undefined,
        triggerType,
        recipientRole,
        specificRecipients: recipientRole === 'specific_members' ? specificRecipients : undefined,
        titleTemplate: titleTemplate.trim(),
        contentTemplate: contentTemplate.trim(),
        triggerConditions: Object.keys(conditions).length > 0 ? conditions : undefined,
      };
      notificationRuleService.updateRule(updated, currentAuthUser?.name);
      showToast('Đã cập nhật quy tắc thông báo!');
    } else {
      notificationRuleService.addRule(
        {
          name: ruleName.trim(),
          description: ruleDescription.trim() || undefined,
          enabled: true,
          triggerType,
          recipientRole,
          specificRecipients: recipientRole === 'specific_members' ? specificRecipients : undefined,
          titleTemplate: titleTemplate.trim(),
          contentTemplate: contentTemplate.trim(),
          triggerConditions: Object.keys(conditions).length > 0 ? conditions : undefined,
        },
        currentAuthUser?.name
      );
      showToast('Đã thêm quy tắc thông báo mới!');
    }

    setRules(notificationRuleService.getRules());
    setIsModalOpen(false);
  };

  // Bật / Tắt nhanh
  const handleToggleRule = (id: string, currentEnabled: boolean) => {
    const next = !currentEnabled;
    notificationRuleService.toggleRule(id, next);
    setRules(notificationRuleService.getRules());
    showToast(next ? 'Đã bật quy tắc thông báo' : 'Đã tắt quy tắc thông báo');
  };

  // Xác nhận xoá
  const handleConfirmDelete = () => {
    if (!deletingRule) return;
    notificationRuleService.deleteRule(deletingRule.id);
    setRules(notificationRuleService.getRules());
    setDeletingRule(null);
    showToast('Đã xoá quy tắc thông báo');
  };

  // Khôi phục mặc định
  const handleResetDefaults = () => {
    if (confirm('Khôi phục danh sách quy tắc thông báo chuẩn mặc định của Ban Sản phẩm - Công nghệ?')) {
      const def = notificationRuleService.resetToDefaults(currentAuthUser?.name);
      setRules(def);
      showToast('Đã khôi phục các quy tắc thông báo mặc định');
    }
  };

  // Thử nghiệm gửi preview
  const handleTestDispatch = (rule: NotificationRuleConfig) => {
    if (onTestNotification) {
      onTestNotification(rule);
      showToast(`Đã gửi thông báo kiểm tra cho quy tắc "${rule.name}"`);
    } else {
      showToast(`Mẫu thông báo: ${rule.titleTemplate}`);
    }
  };

  // Lọc hiển thị
  const filteredRules = rules.filter((r) => {
    if (filterTrigger === 'all') return true;
    if (filterTrigger === 'task') {
      return ['task_assigned', 'task_created', 'task_completed', 'task_blocked', 'task_updated', 'task_comment'].includes(r.triggerType);
    }
    if (filterTrigger === 'daily') {
      return ['daily_task_reminder', 'daily_close_reminder'].includes(r.triggerType);
    }
    if (filterTrigger === 'deadline') {
      return ['phase_due_soon', 'project_due_soon'].includes(r.triggerType);
    }
    return r.triggerType === filterTrigger;
  });

  return (
    <div className="bg-surface rounded-vds-lg border border-line overflow-hidden">
      {/* Header Panel */}
      <div className="p-4 sm:p-5 border-b border-divider bg-surface-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-vds-lg bg-accent-solid/10 text-accent">
              <Bell className="w-4 h-4" />
            </span>
            <h2 className="font-ui font-bold text-sm sm:text-base text-ink">
              Quản lý Cấu hình Thông báo Hệ thống
            </h2>
            <span className="text-xs font-semibold text-accent bg-surface-accent-faint border border-line px-2 py-0.5 rounded-full">
              {rules.length} quy tắc
            </span>
          </div>
          <p className="text-xs text-subdued font-ui mt-1 leading-relaxed">
            Kiểm soát chi tiết: <strong>Nội dung thông báo là gì</strong> và <strong>Gửi khi nào (Trigger & Điều kiện kích hoạt)</strong> cho từng tình huống công việc.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3 py-1.5 rounded-vds-lg border border-line text-xs font-ui text-ink-lighter hover:bg-surface-200 flex items-center gap-1.5 cursor-pointer transition-colors"
            title="Khôi phục danh sách quy tắc chuẩn mặc định"
          >
            <RotateCcw className="w-3.5 h-3.5 text-subdued" />
            <span>Mặc định</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-3.5 py-1.5 rounded-vds-lg bg-accent-solid hover:bg-accent-solid text-on-color text-xs font-ui font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm quy tắc mới</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Header Action */}
      <div className="px-5 py-3 border-b border-divider bg-surface flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <span className="text-xs font-ui font-semibold text-subdued flex items-center gap-1 shrink-0 mr-1">
            <Filter className="w-3.5 h-3.5" /> Lọc:
          </span>
          {[
            { key: 'all', label: `Tất cả (${rules.length})` },
            {
              key: 'task',
              label: `Công việc (${
                rules.filter((r) =>
                  [
                    'task_assigned',
                    'task_created',
                    'task_completed',
                    'task_blocked',
                    'task_updated',
                    'task_comment',
                  ].includes(r.triggerType)
                ).length
              })`,
            },
            {
              key: 'daily',
              label: `Lịch nhắc cố định (${
                rules.filter((r) =>
                  ['daily_task_reminder', 'daily_close_reminder'].includes(r.triggerType)
                ).length
              })`,
            },
            {
              key: 'deadline',
              label: `Cảnh báo Deadline (${
                rules.filter((r) =>
                  ['phase_due_soon', 'project_due_soon'].includes(r.triggerType)
                ).length
              })`,
            },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilterTrigger(tab.key)}
              className={`px-3 py-1.5 text-xs font-ui rounded-vds-lg transition-colors cursor-pointer shrink-0 ${
                filterTrigger === tab.key
                  ? 'bg-surface-selected text-accent font-bold ring-1 ring-inset ring-line-accent-soft'
                  : 'bg-surface-200 text-ink-lighter hover:bg-surface-300 font-medium'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="text-xs font-ui text-subdued shrink-0">
          Hiển thị <strong>{filteredRules.length}</strong> / {rules.length} quy tắc
        </div>
      </div>

      {/* Rules List: Bố cục 2 Tầng Cân bằng, Thoáng & Nhẹ nhàng (No Heavy Box Stacking) */}
      <div className="divide-y divide-divider">
        {filteredRules.map((rule) => {
          const triggerMeta = TRIGGER_TYPE_OPTIONS.find((t) => t.value === rule.triggerType);
          const recipientMeta = RECIPIENT_ROLE_OPTIONS.find((r) => r.value === rule.recipientRole);

          return (
            <div
              key={rule.id}
              className={`p-4 sm:p-5 hover:bg-surface-100/80 transition-colors space-y-3 ${
                !rule.enabled ? 'opacity-60 bg-surface-100/40' : ''
              }`}
            >
              {/* TẦNG 1: Tên quy tắc + Trigger Badge + Bật/Tắt & Thao tác */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                {/* Bên trái: Toggle Switch + Tên quy tắc + Tag Trigger */}
                <div className="flex items-start gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => handleToggleRule(rule.id, rule.enabled)}
                    className="cursor-pointer text-subdued hover:text-accent shrink-0 mt-0.5"
                    title={rule.enabled ? 'Nhấp để tạm tắt quy tắc' : 'Nhấp để bật quy tắc'}
                  >
                    {rule.enabled ? (
                      <ToggleRight className="w-6 h-6 text-positive" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-subdued-lighter" />
                    )}
                  </button>

                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-ui font-bold text-sm text-ink leading-snug">
                        {rule.name}
                      </h3>

                      {rule.isSystemDefault && (
                        <span className="text-[10px] font-semibold text-extreme bg-surface-support px-1.5 py-0.5 rounded border border-line">
                          Chuẩn
                        </span>
                      )}

                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-vds-md text-xs font-semibold bg-surface-positive text-positive border border-line">
                        ⚡ {triggerMeta?.label || rule.triggerType}
                      </span>
                    </div>

                    {rule.description && (
                      <p className="text-xs text-subdued font-ui leading-relaxed">
                        {rule.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Bên phải: Nút thao tác Xem trước, Sửa, Xoá */}
                <div className="flex items-center gap-1.5 self-end sm:self-start shrink-0 pt-0.5">
                  <button
                    type="button"
                    onClick={() => handleTestDispatch(rule)}
                    className="px-2.5 py-1 text-xs font-semibold text-info hover:bg-surface-info rounded-vds-lg border border-line cursor-pointer transition-colors flex items-center gap-1"
                    title="Bắn thử nghiệm thông báo mẫu"
                  >
                    <Play className="w-3 h-3" />
                    <span>Thử nghiệm</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenEdit(rule)}
                    className="p-1.5 text-ink-lighter hover:text-ink hover:bg-surface-200 rounded-vds-lg border border-line cursor-pointer transition-colors"
                    title="Chỉnh sửa quy tắc"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeletingRule(rule)}
                    className="p-1.5 text-negative hover:bg-surface-negative rounded-vds-lg border border-line cursor-pointer transition-colors"
                    title="Xoá quy tắc"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* TẦNG 2: 2 Khối Thông tin Dàn trải Cân bằng (Trái: Nội dung thông báo | Phải: Điều kiện & Đối tượng nhận) */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pl-9">
                {/* Cột 1 (7/12): NỘI DUNG THÔNG BÁO LÀ GÌ? */}
                <div className="md:col-span-7 p-3 rounded-vds-lg bg-surface-100 border border-line space-y-1.5 text-xs font-ui">
                  <div className="flex items-center justify-between gap-2 border-b border-line/80 pb-1.5">
                    <span className="text-xs font-bold text-subdued flex items-center gap-1">
                      <Bell className="w-3 h-3 text-accent" /> Mẫu tiêu đề
                    </span>
                    <span className="font-semibold text-ink truncate" title={rule.titleTemplate}>
                      {rule.titleTemplate}
                    </span>
                  </div>

                  <div className="space-y-1 pt-0.5">
                    <span className="text-xs font-bold text-subdued block">
                      Chi tiết nội dung:
                    </span>
                    <p className="text-ink-lighter leading-relaxed break-words">
                      {rule.contentTemplate}
                    </p>
                  </div>
                </div>

                {/* Cột 2 (5/12): GỬI KHI NÀO? & ĐỐI TƯỢNG NHẬN */}
                <div className="md:col-span-5 p-3 rounded-vds-lg bg-surface-100 border border-line space-y-2 text-xs font-ui">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-subdued block">
                      Đối tượng nhận:
                    </span>
                    <div className="font-semibold text-ink flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent-solid"></span>
                      <span>{recipientMeta?.label || rule.recipientRole}</span>
                    </div>
                    {rule.recipientRole === 'specific_members' &&
                      rule.specificRecipients &&
                      rule.specificRecipients.length > 0 && (
                        <p className="text-xs text-subdued truncate pl-3">
                          {rule.specificRecipients.join(', ')}
                        </p>
                      )}
                  </div>

                  {rule.triggerConditions && (
                    <div className="pt-1.5 border-t border-divider space-y-1">
                      <span className="text-xs font-bold text-subdued block">
                        Điều kiện kích hoạt:
                      </span>
                      <div className="space-y-0.5 text-xs text-ink-lighter">
                        {rule.triggerConditions.scheduledTime && (
                          <div className="flex items-center gap-1 text-warning font-medium">
                            <Clock className="w-3 h-3 shrink-0" />
                            <span>Vào lúc {rule.triggerConditions.scheduledTime} (các ngày làm việc)</span>
                          </div>
                        )}
                        {rule.triggerConditions.daysBefore !== undefined && (
                          <div className="text-info font-medium">
                            📅 Trước hạn {rule.triggerConditions.daysBefore} ngày & khi quá hạn
                          </div>
                        )}
                        {rule.triggerConditions.priorityFilter === 'Khẩn cấp' && (
                          <div className="text-negative font-bold">
                            🚨 Chỉ khi ưu tiên Khẩn cấp
                          </div>
                        )}
                        {rule.triggerConditions.projectFilter &&
                          rule.triggerConditions.projectFilter !== 'all' && (
                            <div className="text-subdued truncate">
                              🎯 Lọc theo dự án chỉ định
                            </div>
                          )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL: THÊM / SỬA QUY TẮC THÔNG BÁO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-fade-in font-ui">
          <div className="bg-surface rounded-vds-lg border border-line max-w-xl w-full p-5 sm:p-6 shadow-sheet space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-divider pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-vds-lg bg-accent-solid/10 text-accent">
                  <Bell className="w-4 h-4" />
                </span>
                <h3 className="font-ui font-bold text-sm sm:text-base text-ink">
                  {editingRule ? 'Chỉnh sửa quy tắc thông báo' : 'Thêm quy tắc thông báo mới'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded text-subdued hover:text-ink hover:bg-surface-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRule} className="space-y-4">
              {/* Tên quy tắc & Mô tả */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-ink-lighter">
                  Tên quy tắc thông báo: <span className="text-negative">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  placeholder="Ví dụ: Nhắc việc đầu ca sáng, Cảnh báo task khẩn cấp..."
                  className="w-full px-3 py-2 text-xs border border-line rounded-vds-lg focus:outline-none focus:border-line-accent"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-ink-lighter">
                  Mục đích / Ghi chú ngữ cảnh:
                </label>
                <input
                  type="text"
                  value={ruleDescription}
                  onChange={(e) => setRuleDescription(e.target.value)}
                  placeholder="Mô tả ngắn gọn khi nào cần áp dụng quy tắc này..."
                  className="w-full px-3 py-2 text-xs border border-line rounded-vds-lg focus:outline-none focus:border-line-accent"
                />
              </div>

              {/* Phần 2: GỬI KHI NÀO? (TRIGGER & ĐIỀU KIỆN) */}
              <div className="p-3.5 bg-surface-100 rounded-vds-lg border border-line space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-accent">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>2. GỬI KHI NÀO? (TRIGGER & ĐIỀU KIỆN KÍCH HOẠT)</span>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-ink-lighter">
                    Sự kiện kích hoạt (Trigger): <span className="text-negative">*</span>
                  </label>
                  <select
                    value={triggerType}
                    onChange={(e) => handleTriggerTypeChange(e.target.value as NotificationTriggerType)}
                    className="w-full px-3 py-2 text-xs border border-line rounded-vds-lg bg-surface focus:outline-none focus:border-line-accent"
                  >
                    {TRIGGER_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label} — ({opt.description})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Điều kiện theo giờ nếu là daily */}
                {(triggerType === 'daily_task_reminder' || triggerType === 'daily_close_reminder') && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-divider">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-ink-lighter">
                        Khung giờ quét hàng ngày:
                      </label>
                      <input
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-line rounded-vds-lg bg-surface focus:outline-none focus:border-line-accent"
                      />
                    </div>
                    <div className="text-xs text-subdued flex items-center">
                      ℹ️ Tự động quét vào ngày làm việc (trừ T7, CN và ngày nghỉ lễ đã cấu hình).
                    </div>
                  </div>
                )}

                {/* Điều kiện số ngày nếu là deadline */}
                {(triggerType === 'phase_due_soon' || triggerType === 'project_due_soon') && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-divider">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-ink-lighter">
                        Cảnh báo trước hạn (số ngày):
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={30}
                        value={daysBefore}
                        onChange={(e) => setDaysBefore(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs border border-line rounded-vds-lg bg-surface focus:outline-none focus:border-line-accent"
                      />
                    </div>
                    <div className="text-xs text-subdued flex items-center">
                      ℹ️ Gửi cảnh báo khi còn ≤ {daysBefore} ngày tới hoặc mốc đã bị quá hạn.
                    </div>
                  </div>
                )}

                {/* Bộ lọc bổ sung */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-divider">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-ink-lighter">
                      Mức ưu tiên:
                    </label>
                    <select
                      value={priorityFilter}
                      onChange={(e) => setPriorityFilter(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs border border-line rounded-vds-lg bg-surface focus:outline-none focus:border-line-accent"
                    >
                      <option value="all">Tất cả các mức ưu tiên</option>
                      <option value="Khẩn cấp">🚨 Chỉ gửi khi Khẩn cấp</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-ink-lighter">
                      Dự án áp dụng:
                    </label>
                    <select
                      value={projectFilter}
                      onChange={(e) => setProjectFilter(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-line rounded-vds-lg bg-surface focus:outline-none focus:border-line-accent"
                    >
                      <option value="all">Tất cả các dự án</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Đối tượng nhận */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-ink-lighter">
                  Đối tượng nhận thông báo: <span className="text-negative">*</span>
                </label>
                <select
                  value={recipientRole}
                  onChange={(e) => setRecipientRole(e.target.value as NotificationRecipientRole)}
                  className="w-full px-3 py-2 text-xs border border-line rounded-vds-lg bg-surface focus:outline-none focus:border-line-accent"
                >
                  {RECIPIENT_ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label} — ({opt.description})
                    </option>
                  ))}
                </select>
              </div>

              {/* Nếu chọn specific_members -> Cho chọn thành viên */}
              {recipientRole === 'specific_members' && (
                <div className="space-y-1.5 p-3 bg-surface-100 rounded-vds-lg border border-line">
                  <label className="block text-xs font-bold text-ink-lighter">
                    Chọn nhân sự nhận:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto">
                    {members.map((m) => {
                      const isChecked = specificRecipients.includes(m.name);
                      return (
                        <label key={m.id} className="flex items-center gap-1.5 text-xs text-ink cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSpecificRecipients([...specificRecipients, m.name]);
                              } else {
                                setSpecificRecipients(specificRecipients.filter((name) => name !== m.name));
                              }
                            }}
                            className="accent-accent"
                          />
                          <span className="truncate">{m.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Phần 1: NỘI DUNG THÔNG BÁO LÀ GÌ? */}
              <div className="p-3.5 bg-surface-100 rounded-vds-lg border border-line space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-accent">
                  <Bell className="w-3.5 h-3.5" />
                  <span>1. NỘI DUNG THÔNG BÁO LÀ GÌ? (TEMPLATES & BIẾN ĐỘNG)</span>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-ink-lighter">
                    Tiêu đề thông báo: <span className="text-negative">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={titleTemplate}
                    onChange={(e) => setTitleTemplate(e.target.value)}
                    placeholder="Ví dụ: Bạn được giao việc trong {projectName}"
                    className="w-full px-3 py-2 text-xs border border-line rounded-vds-lg focus:outline-none focus:border-line-accent"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-ink-lighter">
                    Chi tiết nội dung thông báo: <span className="text-negative">*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={contentTemplate}
                    onChange={(e) => setContentTemplate(e.target.value)}
                    placeholder="Ví dụ: {actorName} đã giao cho bạn: &quot;{taskTitle}&quot;"
                    className="w-full px-3 py-2 text-xs border border-line rounded-vds-lg focus:outline-none focus:border-line-accent"
                  />
                </div>

                <div className="p-2.5 bg-surface-200 rounded-vds-lg text-xs text-ink-lighter space-y-1">
                  <div className="font-bold text-ink">💡 Các biến động tự chèn vào nội dung:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      '{taskTitle}',
                      '{projectName}',
                      '{phaseName}',
                      '{actorName}',
                      '{dueDate}',
                      '{pmDisplay}',
                      '{note}',
                      '{openCount}',
                    ].map((variable) => (
                      <button
                        key={variable}
                        type="button"
                        onClick={() => setContentTemplate((prev) => prev + ` ${variable}`)}
                        className="px-1.5 py-0.5 bg-surface border border-line rounded text-[10px] font-mono hover:bg-surface-support hover:border-line hover:text-extreme cursor-pointer"
                        title="Bấm để chèn vào nội dung"
                      >
                        {variable}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-divider">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-vds-lg border border-line text-xs font-semibold text-ink-lighter hover:bg-surface-200 cursor-pointer"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-vds-lg bg-accent-solid hover:bg-accent-solid text-on-color text-xs font-bold cursor-pointer"
                >
                  {editingRule ? 'Lưu thay đổi' : 'Tạo quy tắc'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: XÁC NHẬN XOÁ */}
      {deletingRule && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/40 animate-fade-in font-ui">
          <div className="bg-surface rounded-vds-lg border border-line shadow-sheet w-full max-w-sm p-5 space-y-4">
            <div className="flex items-center gap-2 text-negative">
              <Trash2 className="w-5 h-5 shrink-0" />
              <h3 className="font-bold text-sm text-ink">Xoá quy tắc thông báo?</h3>
            </div>

            <p className="text-xs text-ink-lighter leading-relaxed">
              Bạn có chắc chắn muốn xoá quy tắc <strong>"{deletingRule.name}"</strong>? Hệ thống sẽ không kích hoạt thông báo cho tình huống này nữa.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-divider">
              <button
                type="button"
                onClick={() => setDeletingRule(null)}
                className="px-3 py-1.5 border border-line text-ink-lighter hover:text-ink rounded-vds-lg text-xs font-bold cursor-pointer"
              >
                Huỷ
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-3.5 py-1.5 bg-negative-solid hover:bg-negative-solid text-on-color rounded-vds-lg text-xs font-bold cursor-pointer "
              >
                Xác nhận xoá
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-surface-dark text-on-color px-4 py-2.5 rounded-vds-lg shadow-pop text-xs font-ui flex items-center gap-2 animate-fade-in border border-line-strong">
          <CheckCircle2 className="w-4 h-4 text-positive" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
