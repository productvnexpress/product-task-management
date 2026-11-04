/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  WorkingScheduleConfig,
  HolidayItem,
  CompensatoryWorkdayItem,
  MemberLeaveItem,
  LeaveSession,
  MemberItem,
  TaskItem,
  ProjectItem,
  PriorityLevel,
  TeamType,
  RecurringRuleConfig,
  RecurrenceFrequency,
  RecurrenceEndType,
} from '../types';
import { workingTimeService, formatWorkingDaysCount } from '../services/workingTimeService';
import { autoCacheService } from '../services/autoCacheService';
import { formatDateWithEnDay } from '../utils/formatters';
import { getTodayDateString } from '../utils/dateUtils';
import { getUserRole, getRoleDisplayInfo, UserRole } from '../utils/rbac';
import {
  recurringTaskService,
  formatFrequencyLabel,
  formatEndTypeLabel,
  calculateNextCycleDate,
} from '../services/recurringTaskService';
import {
  ChecklistTemplateItem,
  CHECKLIST_PHASES,
  getMasterChecklistTemplate,
  fetchMasterChecklistTemplateFromSupabase,
  saveMasterChecklistTemplate,
  resetMasterChecklistTemplate,
} from '../data/defaultProjectChecklist';
import {
  Clock,
  Calendar,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Calculator,
  UserCheck,
  Save,
  RotateCcw,
  Briefcase,
  Check,
  Sunrise,
  Sunset,
  CheckSquare,
  ArrowUp,
  ArrowDown,
  RotateCw,
  Play,
  Pause,
  Zap,
  ShieldCheck,
  Bell,
  ChevronLeft,
  ChevronRight,
  PanelLeft,
} from './vds/icons';
import { NotificationRulesTab } from './NotificationRulesTab';
import { notificationRuleService } from '../services/notificationRuleService';

interface SettingsManagerProps {
  members: MemberItem[];
  tasks?: TaskItem[];
  projects?: ProjectItem[];
  currentAuthUser?: MemberItem | null;
  onAddTask?: (task: any, author?: string) => void;
  onUpdateMember?: (member: MemberItem) => void;
  onSendNotification?: (notif: any) => void;
}

type SettingsTab = 'schedule' | 'holidays' | 'compensatory' | 'leaves' | 'calculator' | 'checklist' | 'recurring' | 'permissions' | 'notifications';

export const SettingsManager: React.FC<SettingsManagerProps> = ({
  members,
  tasks = [],
  projects = [],
  currentAuthUser,
  onAddTask,
  onUpdateMember,
  onSendNotification,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<SettingsTab>('schedule');
  const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('vne_settings_sidebar_collapsed') === '1';
    } catch {
      return false;
    }
  });

  const toggleSidebarCollapse = () => {
    setIsLeftSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('vne_settings_sidebar_collapsed', next ? '1' : '0');
      } catch {}
      return next;
    });
  };

  // Chỉ sử dụng nhân sự của bộ phận Product (Product Manager, UX/UI Designer, SEO, Data)
  const productMembers = useMemo(() => {
    return members.filter(
      (m) => m.team && ['Product Manager', 'UX/UI Designer', 'SEO', 'Data'].includes(m.team)
    );
  }, [members]);

  // 1. Schedule state
  const [schedule, setSchedule] = useState<WorkingScheduleConfig>(() =>
    workingTimeService.getSchedule()
  );
  const [scheduleSavedMsg, setScheduleSavedMsg] = useState(false);

  // 2. Holidays state
  const [holidays, setHolidays] = useState<HolidayItem[]>(() =>
    workingTimeService.getHolidays()
  );
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<HolidayItem | null>(null);
  const [holidayName, setHolidayName] = useState('');
  const [holidayStartDate, setHolidayStartDate] = useState('');
  const [holidayEndDate, setHolidayEndDate] = useState('');

  // 3. Compensatory state
  const [compensatoryList, setCompensatoryList] = useState<CompensatoryWorkdayItem[]>(() =>
    workingTimeService.getCompensatoryWorkdays()
  );
  const [isCompensatoryModalOpen, setIsCompensatoryModalOpen] = useState(false);
  const [editingCompensatory, setEditingCompensatory] = useState<CompensatoryWorkdayItem | null>(null);
  const [compName, setCompName] = useState('');
  const [compDate, setCompDate] = useState('');
  const [compNote, setCompNote] = useState('');

  // 4. Leaves state
  const [leaves, setLeaves] = useState<MemberLeaveItem[]>(() =>
    workingTimeService.getMemberLeaves()
  );
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [editingLeave, setEditingLeave] = useState<MemberLeaveItem | null>(null);
  const [leaveMemberName, setLeaveMemberName] = useState('');
  const [leaveStartDate, setLeaveStartDate] = useState('');
  const [leaveEndDate, setLeaveEndDate] = useState('');
  const [leaveSession, setLeaveSession] = useState<LeaveSession>('all_day');
  const [leaveReason, setLeaveReason] = useState('Nghỉ phép năm');
  const [leaveStatus, setLeaveStatus] = useState<'Đã duyệt' | 'Chờ duyệt'>('Đã duyệt');

  // 5. Calculator state (chỉ dùng Product members)
  const [calcMember, setCalcMember] = useState<string>(() => {
    const pMembers = members.filter(
      (m) => m.team && ['Product Manager', 'UX/UI Designer', 'SEO', 'Data'].includes(m.team)
    );
    return pMembers[0]?.name || members[0]?.name || '';
  });
  const [calcStartDate, setCalcStartDate] = useState<string>('2026-09-01');
  const [calcEndDate, setCalcEndDate] = useState<string>('2026-09-30');

  // 6. Checklist Master Template state
  const [checklistTemplate, setChecklistTemplate] = useState<ChecklistTemplateItem[]>(() =>
    getMasterChecklistTemplate()
  );
  const [checklistFilterPhase, setChecklistFilterPhase] = useState<number | 'all'>('all');
  const [isChecklistModalOpen, setIsChecklistModalOpen] = useState(false);
  const [editingChecklistItem, setEditingChecklistItem] = useState<ChecklistTemplateItem | null>(null);
  const [itemText, setItemText] = useState('');
  const [itemPhaseId, setItemPhaseId] = useState<number>(1);
  const [itemInsertPosition, setItemInsertPosition] = useState<'end' | 'start'>('end');
  const [deletingChecklistItem, setDeletingChecklistItem] = useState<ChecklistTemplateItem | null>(null);
  const [checklistToast, setChecklistToast] = useState<string | null>(null);

  // 7. Recurring Tasks state (Admin only)
  const isAdmin = getUserRole(currentAuthUser) === 'Admin';
  const [recurringRules, setRecurringRules] = useState<RecurringRuleConfig[]>(() =>
    recurringTaskService.getRules()
  );
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [editingRecurringRule, setEditingRecurringRule] = useState<RecurringRuleConfig | null>(null);
  const [recTitle, setRecTitle] = useState('');
  const [recProjectId, setRecProjectId] = useState(projects[0]?.id || '');
  const [recPhaseId, setRecPhaseId] = useState('');
  const [recAssignee, setRecAssignee] = useState(productMembers[0]?.name || members[0]?.name || '');
  const [recPriority, setRecPriority] = useState<PriorityLevel>('Bình thường');
  const [recFrequency, setRecFrequency] = useState<RecurrenceFrequency>('weekly');
  const [recEndType, setRecEndType] = useState<RecurrenceEndType>('never');
  const [recEndDate, setRecEndDate] = useState('');
  const [recNextRunDate, setRecNextRunDate] = useState('');
  const [recNextRunTime, setRecNextRunTime] = useState('08:00');
  const [deletingRecurringRule, setDeletingRecurringRule] = useState<RecurringRuleConfig | null>(null);
  const [recToast, setRecToast] = useState<string | null>(null);

  // 8. Phân quyền (Admin only)
  const [permToast, setPermToast] = useState<string | null>(null);
  const handleChangeMemberRole = (member: MemberItem, newRole: UserRole) => {
    if (!onUpdateMember) return;
    onUpdateMember({ ...member, role: newRole });
    setPermToast(`Đã cập nhật quyền của ${member.name} thành ${getRoleDisplayInfo(newRole).shortLabel}`);
    setTimeout(() => setPermToast(null), 2500);
  };

  const handleOpenAddRecurring = () => {
    setEditingRecurringRule(null);
    setRecTitle('');
    setRecProjectId(projects[0]?.id || '');
    setRecPhaseId('');
    setRecAssignee(productMembers[0]?.name || members[0]?.name || '');
    setRecPriority('Bình thường');
    setRecFrequency('weekly');
    setRecEndType('never');
    setRecEndDate('');
    const todayStr = getTodayDateString();
    setRecNextRunDate(calculateNextCycleDate(todayStr, 'weekly'));
    setRecNextRunTime('08:00');
    setIsRecurringModalOpen(true);
  };

  const handleOpenEditRecurring = (rule: RecurringRuleConfig) => {
    setEditingRecurringRule(rule);
    setRecTitle(rule.title);
    setRecProjectId(rule.projectId);
    setRecPhaseId(rule.phaseId || '');
    setRecAssignee(rule.assignee);
    setRecPriority(rule.priority);
    setRecFrequency(rule.frequency);
    setRecEndType(rule.endType);
    setRecEndDate(rule.endDate || '');
    setRecNextRunDate(rule.nextRunDate || '');
    setRecNextRunTime(rule.nextRunTime || '08:00');
    setIsRecurringModalOpen(true);
  };

  const handleSaveRecurringRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recTitle.trim()) return;

    const proj = projects.find((p) => p.id === recProjectId);
    const selectedMember = members.find((m) => m.name === recAssignee);
    const team: TeamType = selectedMember?.team || 'Product Manager';
    const todayStr = getTodayDateString();
    const nextRun = calculateNextCycleDate(todayStr, recFrequency);

    if (editingRecurringRule) {
      const updated: RecurringRuleConfig = {
        ...editingRecurringRule,
        title: recTitle.trim(),
        projectId: recProjectId,
        projectName: proj?.name || editingRecurringRule.projectName,
        phaseId: recPhaseId || undefined,
        team,
        assignee: recAssignee,
        priority: recPriority,
        frequency: recFrequency,
        endType: recEndType,
        endDate: recEndType === 'specific_date' && recEndDate ? recEndDate : undefined,
        nextRunDate: recNextRunDate || editingRecurringRule.nextRunDate,
        nextRunTime: recNextRunTime || editingRecurringRule.nextRunTime || '08:00',
      };
      recurringTaskService.saveRule(updated);
      setRecToast('Đã cập nhật quy tắc chu kỳ!');
    } else {
      const newRule: RecurringRuleConfig = {
        id: `rec-${Date.now()}`,
        title: recTitle.trim(),
        projectId: recProjectId,
        projectName: proj?.name || 'Chưa xác định (Others)',
        phaseId: recPhaseId || undefined,
        team,
        assignee: recAssignee,
        priority: recPriority,
        frequency: recFrequency,
        endType: recEndType,
        endDate: recEndType === 'specific_date' && recEndDate ? recEndDate : undefined,
        nextRunDate: recNextRunDate || nextRun,
        nextRunTime: recNextRunTime || '08:00',
        status: 'active',
        createdAt: new Date().toISOString(),
        createdBy: currentAuthUser?.name || 'Admin',
      };
      recurringTaskService.saveRule(newRule);
      setRecToast('Đã tạo quy tắc việc chu kỳ mới!');
    }

    setRecurringRules(recurringTaskService.getRules());
    setIsRecurringModalOpen(false);
    setTimeout(() => setRecToast(null), 3000);
  };

  const handleTogglePauseRecurring = (id: string) => {
    recurringTaskService.togglePauseRule(id);
    setRecurringRules(recurringTaskService.getRules());
    setRecToast('Đã chuyển đổi trạng thái quy tắc!');
    setTimeout(() => setRecToast(null), 3000);
  };

  const handleConfirmDeleteRecurring = () => {
    if (!deletingRecurringRule) return;
    recurringTaskService.deleteRule(deletingRecurringRule.id);
    setRecurringRules(recurringTaskService.getRules());
    setDeletingRecurringRule(null);
    setRecToast('Đã xoá quy tắc việc chu kỳ!');
    setTimeout(() => setRecToast(null), 3000);
  };

  const handleTriggerRunNow = (id: string) => {
    const success = recurringTaskService.triggerRunNow(id, (newTask) => {
      if (onAddTask) {
        onAddTask(newTask, `${currentAuthUser?.name || 'Admin'} (Kích hoạt thủ công)`);
      }
    });
    if (success) {
      setRecurringRules(recurringTaskService.getRules());
      setRecToast('Đã tạo ngay 1 task mới thành công!');
      setTimeout(() => setRecToast(null), 3000);
    }
  };

  // Tự động đồng bộ từ Supabase khi mở màn hình Thiết lập
  useEffect(() => {
    workingTimeService.initFromSupabase().then(() => {
      setSchedule(workingTimeService.getSchedule());
      setHolidays(workingTimeService.getHolidays());
      setCompensatoryList(workingTimeService.getCompensatoryWorkdays());
      setLeaves(workingTimeService.getMemberLeaves());
    });
    recurringTaskService.initFromSupabase().then((rules) => {
      setRecurringRules(rules);
    });
    fetchMasterChecklistTemplateFromSupabase().then((items) => {
      setChecklistTemplate(items);
    });
  }, []);

  // Handlers for Schedule
  const handleToggleDay = (dayNum: number) => {
    setSchedule((prev) => {
      const exists = prev.workDays.includes(dayNum);
      const nextDays = exists
        ? prev.workDays.filter((d) => d !== dayNum)
        : [...prev.workDays, dayNum].sort();
      return { ...prev, workDays: nextDays };
    });
  };

  const handleSaveSchedule = () => {
    workingTimeService.saveSchedule(schedule);
    setScheduleSavedMsg(true);
    setTimeout(() => setScheduleSavedMsg(false), 3000);
  };

  // Handlers for Holidays
  const handleOpenAddHoliday = () => {
    setEditingHoliday(null);
    setHolidayName('');
    setHolidayStartDate('');
    setHolidayEndDate('');
    setIsHolidayModalOpen(true);
  };

  const handleOpenEditHoliday = (hol: HolidayItem) => {
    setEditingHoliday(hol);
    setHolidayName(hol.name);
    setHolidayStartDate(hol.startDate);
    setHolidayEndDate(hol.endDate);
    setIsHolidayModalOpen(true);
  };

  const handleSaveHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayName.trim() || !holidayStartDate) return;

    const end = holidayEndDate || holidayStartDate;
    const startD = new Date(holidayStartDate);
    const endD = new Date(end);
    const daysCount = Math.max(1, Math.round((endD.getTime() - startD.getTime()) / (1000 * 3600 * 24)) + 1);

    if (editingHoliday) {
      const updated: HolidayItem = {
        ...editingHoliday,
        name: holidayName.trim(),
        startDate: holidayStartDate,
        endDate: end,
        daysCount,
      };
      workingTimeService.updateHoliday(updated);
    } else {
      workingTimeService.addHoliday({
        name: holidayName.trim(),
        startDate: holidayStartDate,
        endDate: end,
        daysCount,
        isRecurringYearly: false,
      });
    }

    setHolidays(workingTimeService.getHolidays());
    setIsHolidayModalOpen(false);
  };

  const handleDeleteHoliday = (id: string) => {
    if (confirm('Xoá ngày lễ này?')) {
      workingTimeService.deleteHoliday(id);
      setHolidays(workingTimeService.getHolidays());
    }
  };

  const handleResetHolidays = () => {
    if (confirm('Khôi phục danh mục ngày lễ chuẩn 2026?')) {
      const def = workingTimeService.resetHolidaysToDefault();
      setHolidays(def);
    }
  };

  // Handlers for Compensatory Workdays
  const handleOpenAddCompensatory = () => {
    setEditingCompensatory(null);
    setCompName('');
    setCompDate('');
    setCompNote('');
    setIsCompensatoryModalOpen(true);
  };

  const handleOpenEditCompensatory = (item: CompensatoryWorkdayItem) => {
    setEditingCompensatory(item);
    setCompName(item.name);
    setCompDate(item.date);
    setCompNote(item.note || '');
    setIsCompensatoryModalOpen(true);
  };

  const handleSaveCompensatory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!compName.trim() || !compDate) return;

    if (editingCompensatory) {
      const updated: CompensatoryWorkdayItem = {
        ...editingCompensatory,
        name: compName.trim(),
        date: compDate,
        note: compNote.trim() || undefined,
      };
      workingTimeService.updateCompensatoryWorkday(updated);
    } else {
      workingTimeService.addCompensatoryWorkday({
        name: compName.trim(),
        date: compDate,
        note: compNote.trim() || undefined,
      });
    }

    setCompensatoryList(workingTimeService.getCompensatoryWorkdays());
    setIsCompensatoryModalOpen(false);
  };

  const handleDeleteCompensatory = (id: string) => {
    if (confirm('Xoá ngày làm bù này?')) {
      workingTimeService.deleteCompensatoryWorkday(id);
      setCompensatoryList(workingTimeService.getCompensatoryWorkdays());
    }
  };

  // Handlers for Leaves
  const handleOpenAddLeave = () => {
    setEditingLeave(null);
    setLeaveMemberName(productMembers[0]?.name || members[0]?.name || '');
    setLeaveStartDate('');
    setLeaveEndDate('');
    setLeaveSession('all_day');
    setLeaveReason('Nghỉ phép năm');
    setLeaveStatus('Đã duyệt');
    setIsLeaveModalOpen(true);
  };

  const handleOpenEditLeave = (leave: MemberLeaveItem) => {
    setEditingLeave(leave);
    setLeaveMemberName(leave.memberName);
    setLeaveStartDate(leave.startDate);
    setLeaveEndDate(leave.endDate);
    setLeaveSession(leave.session || 'all_day');
    setLeaveReason(leave.reason);
    setLeaveStatus(leave.status);
    setIsLeaveModalOpen(true);
  };

  const handleSaveLeave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveMemberName || !leaveStartDate) return;

    const end = leaveEndDate || leaveStartDate;
    let days = workingTimeService.countWorkingDays(leaveStartDate, end);

    if (leaveSession === 'morning' || leaveSession === 'afternoon') {
      days = 0.5;
    }

    if (editingLeave) {
      const updated: MemberLeaveItem = {
        ...editingLeave,
        memberName: leaveMemberName,
        startDate: leaveStartDate,
        endDate: end,
        session: leaveSession,
        daysCount: Math.max(0.5, days),
        reason: leaveReason,
        status: leaveStatus,
      };
      workingTimeService.updateMemberLeave(updated);
    } else {
      workingTimeService.addMemberLeave({
        memberName: leaveMemberName,
        startDate: leaveStartDate,
        endDate: end,
        session: leaveSession,
        daysCount: Math.max(0.5, days),
        reason: leaveReason,
        status: leaveStatus,
      });
    }

    setLeaves(workingTimeService.getMemberLeaves());
    setIsLeaveModalOpen(false);
  };

  const handleDeleteLeave = (id: string) => {
    if (confirm('Xoá bản ghi nghỉ phép này?')) {
      workingTimeService.deleteMemberLeave(id);
      setLeaves(workingTimeService.getMemberLeaves());
    }
  };

  // Handlers for Checklist Template
  const handleOpenAddChecklistItem = (defaultPhaseId?: number) => {
    setEditingChecklistItem(null);
    setItemPhaseId(defaultPhaseId || (typeof checklistFilterPhase === 'number' ? checklistFilterPhase : 1));
    setItemText('');
    setItemInsertPosition('end');
    setIsChecklistModalOpen(true);
  };

  const handleOpenEditChecklistItem = (item: ChecklistTemplateItem) => {
    setEditingChecklistItem(item);
    setItemPhaseId(item.phaseId);
    setItemText(item.text);
    setIsChecklistModalOpen(true);
  };

  const handleSaveChecklistItem = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = itemText.trim();
    if (!trimmed) return;

    const phaseMeta = CHECKLIST_PHASES.find((p) => p.id === itemPhaseId);
    const phaseTitle = phaseMeta ? phaseMeta.title : `Giai đoạn ${itemPhaseId}`;

    let updated: ChecklistTemplateItem[];

    if (editingChecklistItem) {
      updated = checklistTemplate.map((it) => {
        if (it.id === editingChecklistItem.id) {
          return {
            ...it,
            phaseId: itemPhaseId,
            phaseTitle,
            text: trimmed,
          };
        }
        return it;
      });
      setChecklistToast('Đã cập nhật tiêu chuẩn!');
    } else {
      const newItem: ChecklistTemplateItem = {
        id: `chk-${itemPhaseId}-${Date.now()}`,
        phaseId: itemPhaseId,
        phaseTitle,
        text: trimmed,
      };

      if (itemInsertPosition === 'start') {
        const targetIndex = checklistTemplate.findIndex((it) => it.phaseId === itemPhaseId);
        if (targetIndex !== -1) {
          updated = [
            ...checklistTemplate.slice(0, targetIndex),
            newItem,
            ...checklistTemplate.slice(targetIndex),
          ];
        } else {
          updated = [...checklistTemplate, newItem];
        }
      } else {
        let lastIndex = -1;
        for (let i = checklistTemplate.length - 1; i >= 0; i--) {
          if (checklistTemplate[i].phaseId === itemPhaseId) {
            lastIndex = i;
            break;
          }
        }
        if (lastIndex !== -1) {
          updated = [
            ...checklistTemplate.slice(0, lastIndex + 1),
            newItem,
            ...checklistTemplate.slice(lastIndex + 1),
          ];
        } else {
          updated = [...checklistTemplate, newItem];
        }
      }
      setChecklistToast('Đã thêm tiêu chuẩn mới vào Checklist!');
    }

    setChecklistTemplate(updated);
    saveMasterChecklistTemplate(updated, currentAuthUser?.name);
    setIsChecklistModalOpen(false);
    setTimeout(() => setChecklistToast(null), 3000);
  };

  const handleConfirmDeleteChecklistItem = () => {
    if (!deletingChecklistItem) return;
    const updated = checklistTemplate.filter((it) => it.id !== deletingChecklistItem.id);
    setChecklistTemplate(updated);
    saveMasterChecklistTemplate(updated, currentAuthUser?.name);
    setDeletingChecklistItem(null);
    setChecklistToast('Đã xoá tiêu chuẩn khỏi Checklist!');
    setTimeout(() => setChecklistToast(null), 3000);
  };

  const handleMoveChecklistItem = (id: string, direction: 'up' | 'down') => {
    const item = checklistTemplate.find((it) => it.id === id);
    if (!item) return;

    const phaseItems = checklistTemplate.filter((it) => it.phaseId === item.phaseId);
    const indexInPhase = phaseItems.findIndex((it) => it.id === id);

    if (direction === 'up' && indexInPhase <= 0) return;
    if (direction === 'down' && indexInPhase >= phaseItems.length - 1) return;

    const swapTargetIndex = direction === 'up' ? indexInPhase - 1 : indexInPhase + 1;
    const targetItem = phaseItems[swapTargetIndex];

    const idx1 = checklistTemplate.findIndex((it) => it.id === item.id);
    const idx2 = checklistTemplate.findIndex((it) => it.id === targetItem.id);

    const updated = [...checklistTemplate];
    const temp = updated[idx1];
    updated[idx1] = updated[idx2];
    updated[idx2] = temp;

    setChecklistTemplate(updated);
    saveMasterChecklistTemplate(updated, currentAuthUser?.name);
    setChecklistToast('Đã thay đổi vị trí tiêu chuẩn!');
    setTimeout(() => setChecklistToast(null), 2000);
  };

  const handleResetChecklistDefaults = () => {
    if (confirm('Bạn có chắc chắn muốn khôi phục lại bộ 34 tiêu chuẩn chuẩn hóa ban đầu của Ban Sản phẩm không? Mọi chỉnh sửa tùy biến trước đó sẽ được đặt lại.')) {
      const restored = resetMasterChecklistTemplate(currentAuthUser?.name);
      setChecklistTemplate(restored);
      setChecklistToast('Đã khôi phục 34 tiêu chuẩn gốc!');
      setTimeout(() => setChecklistToast(null), 3000);
    }
  };

  // Calculation Results
  const calcResult = useMemo(() => {
    if (!calcStartDate || !calcEndDate) return null;
    const totalWorkingDays = workingTimeService.countWorkingDays(calcStartDate, calcEndDate, calcMember);
    const startD = new Date(calcStartDate);
    const endD = new Date(calcEndDate);
    const msPerDay = 1000 * 60 * 60 * 24;
    const totalCalendarDays = Math.max(0, Math.round((endD.getTime() - startD.getTime()) / msPerDay) + 1);

    const selectedMemberObj = members.find((m) => m.name === calcMember);
    const joinStats = selectedMemberObj?.joinDate
      ? workingTimeService.calculateDaysWorked(selectedMemberObj.joinDate, calcMember)
      : null;

    return {
      totalWorkingDays,
      formattedWorkingDays: formatWorkingDaysCount(totalWorkingDays),
      totalCalendarDays,
      joinStats,
      selectedMemberObj,
    };
  }, [calcStartDate, calcEndDate, calcMember, members, holidays, compensatoryList, leaves, schedule]);

  const DAYS_MAP = [
    { num: 1, label: 'Thứ Hai' },
    { num: 2, label: 'Thứ Ba' },
    { num: 3, label: 'Thứ Tư' },
    { num: 4, label: 'Thứ Năm' },
    { num: 5, label: 'Thứ Sáu' },
    { num: 6, label: 'Thứ Bảy' },
    { num: 0, label: 'Chủ Nhật' },
  ];

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6 animate-fade-in pb-16">
      {/* Header tinh gọn theo EDITOR.md */}
      <div className="bg-surface rounded-vds-lg border border-line p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-vds-lg bg-accent-solid text-on-color flex items-center justify-center font-bold ">
                {activeSubTab === 'checklist' ? (
                  <CheckSquare className="w-4 h-4" />
                ) : activeSubTab === 'recurring' ? (
                  <RotateCw className="w-4 h-4" />
                ) : activeSubTab === 'permissions' ? (
                  <ShieldCheck className="w-4 h-4" />
                ) : activeSubTab === 'notifications' ? (
                  <Bell className="w-4 h-4" />
                ) : (
                  <Clock className="w-4 h-4" />
                )}
              </div>
              <h1 className="font-title text-xl font-bold text-ink">
                {activeSubTab === 'checklist'
                  ? 'Quản trị Checklist'
                  : activeSubTab === 'recurring'
                  ? 'Việc chu kỳ'
                  : activeSubTab === 'permissions'
                  ? 'Phân quyền'
                  : activeSubTab === 'notifications'
                  ? 'Quản lý Thông báo'
                  : 'Thời gian làm việc'}
              </h1>
              <span className="bg-surface-support text-extreme border border-line text-xs font-ui font-bold px-2 py-0.5 rounded-vds-md">
                Admin
              </span>
            </div>
            <p className="text-xs font-ui text-ink-lighter">
              {activeSubTab === 'checklist'
                ? 'Cấu hình danh mục tiêu chuẩn Product Management (thêm, sửa, xoá, sắp xếp vị trí các tiêu chuẩn theo từng giai đoạn).'
                : activeSubTab === 'recurring'
                ? 'Quản lý các công việc lặp lại tự động tạo lúc 08:00 AM theo chu kỳ Hàng tuần, 2 Tuần hoặc Hàng tháng.'
                : activeSubTab === 'permissions'
                ? 'Gán nhóm quyền Admin / Manager / Executive cho từng tài khoản Ban Sản phẩm - Công nghệ.'
                : activeSubTab === 'notifications'
                ? 'Quản lý nội dung thông báo và sự kiện kích hoạt (trigger, mốc giờ, điều kiện) cho từng tình huống công việc.'
                : 'Lịch làm việc, ngày lễ, làm bù và nghỉ phép dùng tính ngày công nhân sự.'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-ui text-subdued bg-surface-200 px-2.5 py-1 rounded border border-line">
              {currentAuthUser?.name || 'Đặng Tiến Ngọc'} (Admin)
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-5 items-start relative">
        {/* Left Sidebar neo trung tâm (Pin Left Center): Tối ưu tối đa diện tích ở giữa */}
        <aside
          className={`w-full transition duration-200 bg-surface rounded-vds-xl border border-line p-2 space-y-1 md:sticky md:top-1/2 md:-translate-y-1/2 ${
            isLeftSidebarCollapsed ? 'md:w-[60px] md:shrink-0' : 'md:w-56 md:shrink-0'
          }`}
        >
          {/* Nút thu gọn / mở rộng Sidebar để nhường diện tích cho phần nội dung */}
          <div className="hidden md:flex items-center justify-between pb-1.5 mb-1 border-b border-divider px-1">
            {!isLeftSidebarCollapsed && (
              <span className="text-xs font-ui font-bold text-subdued">
                Mục thiết lập
              </span>
            )}
            <button
              type="button"
              onClick={toggleSidebarCollapse}
              className={`p-1.5 rounded-vds-lg text-subdued hover:text-accent hover:bg-surface-accent-faint transition-colors cursor-pointer ${
                isLeftSidebarCollapsed ? 'mx-auto' : 'ml-auto'
              }`}
              title={isLeftSidebarCollapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng (Thêm diện tích)'}
            >
              {isLeftSidebarCollapsed ? (
                <ChevronRight className="w-4 h-4 text-accent" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Tab 1: Lịch làm việc */}
          <button
            onClick={() => setActiveSubTab('schedule')}
            className={`w-full px-2.5 py-2 rounded-vds-lg text-xs font-ui font-bold flex items-center transition-colors cursor-pointer ${
              isLeftSidebarCollapsed ? 'justify-center' : 'justify-start gap-2.5'
            } ${
              activeSubTab === 'schedule'
                ? 'bg-surface-accent-faint text-accent border border-line'
                : 'text-ink-lighter hover:bg-surface-200 hover:text-ink border border-transparent'
            }`}
            title="Lịch làm việc"
          >
            <Clock className="w-4 h-4 shrink-0" />
            {!isLeftSidebarCollapsed && <span>Lịch làm việc</span>}
          </button>

          {/* Tab 2: Ngày lễ */}
          <button
            onClick={() => setActiveSubTab('holidays')}
            className={`w-full px-2.5 py-2 rounded-vds-lg text-xs font-ui font-bold flex items-center transition-colors cursor-pointer ${
              isLeftSidebarCollapsed ? 'justify-center' : 'justify-start gap-2.5'
            } ${
              activeSubTab === 'holidays'
                ? 'bg-surface-accent-faint text-accent border border-line'
                : 'text-ink-lighter hover:bg-surface-200 hover:text-ink border border-transparent'
            }`}
            title={`Ngày lễ (${holidays.length})`}
          >
            <Calendar className="w-4 h-4 shrink-0" />
            {!isLeftSidebarCollapsed && (
              <span className="flex-1 text-left flex items-center justify-between">
                <span>Ngày lễ</span>
                <span className="text-[10px] font-num text-subdued bg-surface-200 px-1.5 py-0.2 rounded-full">
                  {holidays.length}
                </span>
              </span>
            )}
          </button>

          {/* Tab 3: Làm bù */}
          <button
            onClick={() => setActiveSubTab('compensatory')}
            className={`w-full px-2.5 py-2 rounded-vds-lg text-xs font-ui font-bold flex items-center transition-colors cursor-pointer ${
              isLeftSidebarCollapsed ? 'justify-center' : 'justify-start gap-2.5'
            } ${
              activeSubTab === 'compensatory'
                ? 'bg-surface-accent-faint text-accent border border-line'
                : 'text-ink-lighter hover:bg-surface-200 hover:text-ink border border-transparent'
            }`}
            title={`Làm bù (${compensatoryList.length})`}
          >
            <Briefcase className="w-4 h-4 shrink-0 text-warning" />
            {!isLeftSidebarCollapsed && (
              <span className="flex-1 text-left flex items-center justify-between">
                <span>Làm bù</span>
                <span className="text-[10px] font-num text-subdued bg-surface-200 px-1.5 py-0.2 rounded-full">
                  {compensatoryList.length}
                </span>
              </span>
            )}
          </button>

          {/* Tab 4: Nghỉ phép */}
          <button
            onClick={() => setActiveSubTab('leaves')}
            className={`w-full px-2.5 py-2 rounded-vds-lg text-xs font-ui font-bold flex items-center transition-colors cursor-pointer ${
              isLeftSidebarCollapsed ? 'justify-center' : 'justify-start gap-2.5'
            } ${
              activeSubTab === 'leaves'
                ? 'bg-surface-accent-faint text-accent border border-line'
                : 'text-ink-lighter hover:bg-surface-200 hover:text-ink border border-transparent'
            }`}
            title={`Nghỉ phép (${leaves.length})`}
          >
            <UserCheck className="w-4 h-4 shrink-0" />
            {!isLeftSidebarCollapsed && (
              <span className="flex-1 text-left flex items-center justify-between">
                <span>Nghỉ phép</span>
                <span className="text-[10px] font-num text-subdued bg-surface-200 px-1.5 py-0.2 rounded-full">
                  {leaves.length}
                </span>
              </span>
            )}
          </button>

          {/* Tab 5: Tra cứu ngày công */}
          <button
            onClick={() => setActiveSubTab('calculator')}
            className={`w-full px-2.5 py-2 rounded-vds-lg text-xs font-ui font-bold flex items-center transition-colors cursor-pointer ${
              isLeftSidebarCollapsed ? 'justify-center' : 'justify-start gap-2.5'
            } ${
              activeSubTab === 'calculator'
                ? 'bg-surface-accent-faint text-accent border border-line'
                : 'text-ink-lighter hover:bg-surface-200 hover:text-ink border border-transparent'
            }`}
            title="Tra cứu ngày công"
          >
            <Calculator className="w-4 h-4 shrink-0" />
            {!isLeftSidebarCollapsed && <span>Tra cứu ngày công</span>}
          </button>

          {/* Tab 6: Checklist */}
          <button
            onClick={() => setActiveSubTab('checklist')}
            className={`w-full px-2.5 py-2 rounded-vds-lg text-xs font-ui font-bold flex items-center transition-colors cursor-pointer ${
              isLeftSidebarCollapsed ? 'justify-center' : 'justify-start gap-2.5'
            } ${
              activeSubTab === 'checklist'
                ? 'bg-surface-accent-faint text-accent border border-line'
                : 'text-ink-lighter hover:bg-surface-200 hover:text-ink border border-transparent'
            }`}
            title={`Checklist (${checklistTemplate.length})`}
          >
            <CheckSquare className="w-4 h-4 shrink-0" />
            {!isLeftSidebarCollapsed && (
              <span className="flex-1 text-left flex items-center justify-between">
                <span>Checklist</span>
                <span className="text-[10px] font-num text-subdued bg-surface-200 px-1.5 py-0.2 rounded-full">
                  {checklistTemplate.length}
                </span>
              </span>
            )}
          </button>

          {/* Tab 7: Việc chu kỳ */}
          {isAdmin && (
            <button
              onClick={() => setActiveSubTab('recurring')}
              className={`w-full px-2.5 py-2 rounded-vds-lg text-xs font-ui font-bold flex items-center transition-colors cursor-pointer ${
                isLeftSidebarCollapsed ? 'justify-center' : 'justify-start gap-2.5'
              } ${
                activeSubTab === 'recurring'
                  ? 'bg-surface-accent-faint text-accent border border-line'
                  : 'text-ink-lighter hover:bg-surface-200 hover:text-ink border border-transparent'
              }`}
              title={`Việc chu kỳ (${recurringRules.length})`}
            >
              <RotateCw className="w-4 h-4 shrink-0" />
              {!isLeftSidebarCollapsed && (
                <span className="flex-1 text-left flex items-center justify-between">
                  <span>Việc chu kỳ</span>
                  <span className="text-[10px] font-num text-subdued bg-surface-200 px-1.5 py-0.2 rounded-full">
                    {recurringRules.length}
                  </span>
                </span>
              )}
            </button>
          )}

          {isAdmin && (
            <>
              <div className="h-px bg-surface-200 my-1" />

              {/* Tab 8: Phân quyền */}
              <button
                onClick={() => setActiveSubTab('permissions')}
                className={`w-full px-2.5 py-2 rounded-vds-lg text-xs font-ui font-bold flex items-center transition-colors cursor-pointer ${
                  isLeftSidebarCollapsed ? 'justify-center' : 'justify-start gap-2.5'
                } ${
                  activeSubTab === 'permissions'
                    ? 'bg-surface-accent-faint text-accent border border-line'
                    : 'text-ink-lighter hover:bg-surface-200 hover:text-ink border border-transparent'
                }`}
                title="Phân quyền tài khoản"
              >
                <ShieldCheck className="w-4 h-4 shrink-0 text-extreme" />
                {!isLeftSidebarCollapsed && <span>Phân quyền</span>}
              </button>

              {/* Tab 9: Quản lý Thông báo */}
              <button
                onClick={() => setActiveSubTab('notifications')}
                className={`w-full px-2.5 py-2 rounded-vds-lg text-xs font-ui font-bold flex items-center transition-colors cursor-pointer ${
                  isLeftSidebarCollapsed ? 'justify-center' : 'justify-start gap-2.5'
                } ${
                  activeSubTab === 'notifications'
                    ? 'bg-surface-accent-faint text-accent border border-line'
                    : 'text-ink-lighter hover:bg-surface-200 hover:text-ink border border-transparent'
                }`}
                title="Quản lý Thông báo"
              >
                <Bell className="w-4 h-4 shrink-0 text-accent" />
                {!isLeftSidebarCollapsed && <span>Quản lý Thông báo</span>}
              </button>
            </>
          )}

          {!isLeftSidebarCollapsed && (
            <div className="mt-3 pt-2.5 border-t border-divider space-y-1.5">
              <button
                type="button"
                onClick={() => autoCacheService.clearCacheAndReload()}
                className="w-full px-2 py-1.5 rounded-vds-lg text-xs font-ui font-medium text-subdued hover:text-accent bg-surface-100 hover:bg-surface-accent-faint border border-line hover:border-line flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Xóa bộ nhớ đệm trình duyệt và tải lại phiên bản mới nhất"
              >
                <RotateCw className="w-3 h-3 shrink-0" />
                <span>Dọn cache & Làm mới</span>
              </button>
            </div>
          )}
        </aside>

        <div className="flex-1 min-w-0 space-y-6">
      {/* ========================================================================= */}
      {/* TAB 1: LỊCH LÀM VIỆC */}
      {/* ========================================================================= */}
      {activeSubTab === 'schedule' && (
        <div className="bg-surface rounded-vds-lg border border-line p-6 space-y-6">
          <div className="border-b border-divider pb-3">
            <h2 className="font-ui font-bold text-sm text-ink">
              Ngày và giờ làm việc
            </h2>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-ui font-bold text-ink-lighter">
              Ngày làm việc trong tuần:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
              {DAYS_MAP.map((d) => {
                const isChecked = schedule.workDays.includes(d.num);
                return (
                  <button
                    key={d.num}
                    type="button"
                    onClick={() => handleToggleDay(d.num)}
                    className={`p-3 rounded-vds-lg border text-center transition cursor-pointer flex flex-col items-center gap-1.5 ${
                      isChecked
                        ? 'bg-surface-accent-faint border-line text-accent '
                        : 'bg-surface-100 border-line text-subdued-lighter hover:bg-surface-200'
                    }`}
                  >
                    <span className="font-ui text-xs font-bold">{d.label}</span>
                    <span
                      className={`text-[10px] font-ui font-semibold px-2 py-0.5 rounded-vds-md ${
                        isChecked ? 'bg-surface-selected text-accent ring-1 ring-inset ring-line-accent-soft' : 'bg-surface-300 text-subdued'
                      }`}
                    >
                      {isChecked ? 'Làm việc' : 'Nghỉ'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2">
            <div className="space-y-1.5">
              <label className="block text-xs font-ui font-bold text-ink-lighter">
                Giờ bắt đầu:
              </label>
              <input
                type="time"
                value={schedule.startTime}
                onChange={(e) => setSchedule((s) => ({ ...s, startTime: e.target.value }))}
                className="w-full px-3 py-2 border border-line rounded-vds-lg text-xs font-num font-bold text-ink bg-surface focus:border-line-accent"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-ui font-bold text-ink-lighter">
                Giờ kết thúc:
              </label>
              <input
                type="time"
                value={schedule.endTime}
                onChange={(e) => setSchedule((s) => ({ ...s, endTime: e.target.value }))}
                className="w-full px-3 py-2 border border-line rounded-vds-lg text-xs font-num font-bold text-ink bg-surface focus:border-line-accent"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-ui font-bold text-ink-lighter">
                Nghỉ trưa từ:
              </label>
              <input
                type="time"
                value={schedule.lunchBreakStart}
                onChange={(e) => setSchedule((s) => ({ ...s, lunchBreakStart: e.target.value }))}
                className="w-full px-3 py-2 border border-line rounded-vds-lg text-xs font-num text-ink-lighter bg-surface focus:border-line-accent"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-ui font-bold text-ink-lighter">
                Đến:
              </label>
              <input
                type="time"
                value={schedule.lunchBreakEnd}
                onChange={(e) => setSchedule((s) => ({ ...s, lunchBreakEnd: e.target.value }))}
                className="w-full px-3 py-2 border border-line rounded-vds-lg text-xs font-num text-ink-lighter bg-surface focus:border-line-accent"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-divider">
            <div className="text-xs font-ui text-positive flex items-center gap-1.5">
              {scheduleSavedMsg && (
                <>
                  <CheckCircle2 className="w-4 h-4 text-positive" />
                  <span className="font-bold">Đã lưu thay đổi.</span>
                </>
              )}
            </div>

            <button
              onClick={handleSaveSchedule}
              className="px-5 py-2.5 rounded-vds-lg bg-accent-solid hover:bg-accent-solid-hover text-on-color font-ui text-xs font-bold flex items-center gap-2 transition cursor-pointer active:scale-98"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Lưu thay đổi</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: NGÀY LỄ */}
      {/* ========================================================================= */}
      {activeSubTab === 'holidays' && (
        <div className="bg-surface rounded-vds-lg border border-line p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-divider pb-3">
            <div>
              <h2 className="font-ui font-bold text-sm text-ink">
                Ngày lễ ({holidays.length})
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetHolidays}
                className="px-3 py-1.5 rounded-vds-lg border border-line text-xs font-ui text-ink-lighter hover:bg-surface-200 flex items-center gap-1.5 cursor-pointer"
                title="Khôi phục danh mục ngày lễ chuẩn 2026"
              >
                <RotateCcw className="w-3 h-3 text-subdued" />
                <span>Mặc định 2026</span>
              </button>

              <button
                onClick={handleOpenAddHoliday}
                className="px-3.5 py-1.5 rounded-vds-lg bg-accent-solid hover:bg-accent-solid-hover text-on-color text-xs font-ui font-bold flex items-center gap-1.5 cursor-pointer "
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm ngày lễ</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs font-ui text-left border border-line rounded-vds-lg overflow-hidden">
              <thead className="bg-surface-100 text-ink-lighter font-bold border-b border-line">
                <tr>
                  <th className="p-3">Tên ngày lễ</th>
                  <th className="p-3">Từ ngày</th>
                  <th className="p-3">Đến ngày</th>
                  <th className="p-3 text-center">Số ngày nghỉ</th>
                  <th className="p-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider">
                {holidays.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-xs text-subdued">
                      Chưa có ngày lễ.
                    </td>
                  </tr>
                ) : (
                  holidays.map((hol) => (
                    <tr key={hol.id} className="hover:bg-surface-100 transition-colors">
                      <td className="p-3 font-semibold text-ink">
                        {hol.name}
                      </td>
                      <td className="p-3 font-num text-ink-lighter">
                        {formatDateWithEnDay(hol.startDate)}
                      </td>
                      <td className="p-3 font-num text-ink-lighter">
                        {formatDateWithEnDay(hol.endDate)}
                      </td>
                      <td className="p-3 text-center">
                        <span className="font-num text-xs font-bold bg-surface-accent-faint text-accent border border-line px-2 py-0.5 rounded-full">
                          {hol.daysCount} ngày
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditHoliday(hol)}
                            className="p-1 hover:bg-surface-200 rounded text-subdued hover:text-ink"
                            title="Sửa"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteHoliday(hol.id)}
                            className="p-1 hover:bg-surface-negative rounded text-subdued hover:text-negative"
                            title="Xoá"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: LÀM BÙ (COMPENSATORY WORKDAYS) */}
      {/* ========================================================================= */}
      {activeSubTab === 'compensatory' && (
        <div className="bg-surface rounded-vds-lg border border-line p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-divider pb-3">
            <div>
              <h2 className="font-ui font-bold text-sm text-ink">
                Ngày làm bù ({compensatoryList.length})
              </h2>
              <p className="text-xs font-ui text-subdued mt-0.5">
                Ngày làm bù cuối tuần được tính là 1 ngày làm việc.
              </p>
            </div>

            <button
              onClick={handleOpenAddCompensatory}
              className="px-3.5 py-1.5 rounded-vds-lg bg-accent-solid hover:bg-accent-solid-hover text-on-color text-xs font-ui font-bold flex items-center gap-1.5 cursor-pointer "
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm ngày làm bù</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs font-ui text-left border border-line rounded-vds-lg overflow-hidden">
              <thead className="bg-surface-100 text-ink-lighter font-bold border-b border-line">
                <tr>
                  <th className="p-3">Lý do làm bù</th>
                  <th className="p-3">Ngày làm bù</th>
                  <th className="p-3">Ghi chú</th>
                  <th className="p-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider">
                {compensatoryList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-xs text-subdued">
                      Chưa có ngày làm bù.
                    </td>
                  </tr>
                ) : (
                  compensatoryList.map((comp) => (
                    <tr key={comp.id} className="hover:bg-surface-100 transition-colors">
                      <td className="p-3 font-semibold text-ink">
                        {comp.name}
                      </td>
                      <td className="p-3 font-num text-accent font-bold">
                        {formatDateWithEnDay(comp.date)}
                      </td>
                      <td className="p-3 text-ink-lighter">
                        {comp.note || '—'}
                      </td>
                      <td className="p-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditCompensatory(comp)}
                            className="p-1 hover:bg-surface-200 rounded text-subdued hover:text-ink"
                            title="Sửa"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCompensatory(comp.id)}
                            className="p-1 hover:bg-surface-negative rounded text-subdued hover:text-negative"
                            title="Xoá"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: NGHỈ PHÉP NHÂN SỰ (HỖ TRỢ NGHỈ NỬA BUỔI) */}
      {/* ========================================================================= */}
      {activeSubTab === 'leaves' && (
        <div className="bg-surface rounded-vds-lg border border-line p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-divider pb-3">
            <div>
              <h2 className="font-ui font-bold text-sm text-ink">
                Nghỉ phép ({leaves.length})
              </h2>
              <p className="text-xs font-ui text-subdued mt-0.5">
                Nghỉ cả ngày hoặc nửa buổi (sáng hoặc chiều = 0.5 ngày công).
              </p>
            </div>

            <button
              onClick={handleOpenAddLeave}
              className="px-3.5 py-1.5 rounded-vds-lg bg-accent-solid hover:bg-accent-solid-hover text-on-color text-xs font-ui font-bold flex items-center gap-1.5 cursor-pointer "
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm đơn nghỉ</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs font-ui text-left border border-line rounded-vds-lg overflow-hidden">
              <thead className="bg-surface-100 text-ink-lighter font-bold border-b border-line">
                <tr>
                  <th className="p-3">Nhân sự</th>
                  <th className="p-3">Thời gian</th>
                  <th className="p-3">Buổi nghỉ</th>
                  <th className="p-3 text-center">Số ngày trừ</th>
                  <th className="p-3">Lý do</th>
                  <th className="p-3 text-center">Trạng thái</th>
                  <th className="p-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider">
                {leaves.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-xs text-subdued">
                      Chưa có đơn nghỉ phép.
                    </td>
                  </tr>
                ) : (
                  leaves.map((leave) => {
                    const sessionLabel =
                      leave.session === 'morning'
                        ? 'Buổi sáng (0.5)'
                        : leave.session === 'afternoon'
                        ? 'Buổi chiều (0.5)'
                        : 'Cả ngày';

                    return (
                      <tr key={leave.id} className="hover:bg-surface-100 transition-colors">
                        <td className="p-3 font-semibold text-ink">
                          {leave.memberName}
                        </td>
                        <td className="p-3 font-num text-ink-lighter">
                          {leave.startDate === leave.endDate ? (
                            formatDateWithEnDay(leave.startDate)
                          ) : (
                            `${formatDateWithEnDay(leave.startDate)} ➔ ${formatDateWithEnDay(leave.endDate)}`
                          )}
                        </td>
                        <td className="p-3">
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-vds-md border ${
                              leave.session === 'morning'
                                ? 'bg-surface-warning text-warning border-line'
                                : leave.session === 'afternoon'
                                ? 'bg-surface-warning text-warning border-line'
                                : 'bg-surface-200 text-ink-lighter border-line'
                            }`}
                          >
                            {leave.session === 'morning' && <Sunrise className="w-3 h-3 text-warning" />}
                            {leave.session === 'afternoon' && <Sunset className="w-3 h-3 text-warning" />}
                            <span>{sessionLabel}</span>
                          </span>
                        </td>
                        <td className="p-3 text-center font-num font-bold text-accent">
                          {formatWorkingDaysCount(leave.daysCount)} ngày
                        </td>
                        <td className="p-3 text-ink-lighter">
                          {leave.reason}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`text-[10px] font-ui font-bold px-2 py-0.5 rounded-vds-md border ${
                              leave.status === 'Đã duyệt'
                                ? 'bg-surface-positive text-positive border-line'
                                : 'bg-surface-warning text-warning border-line'
                            }`}
                          >
                            {leave.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditLeave(leave)}
                              className="p-1 hover:bg-surface-200 rounded text-subdued hover:text-ink"
                              title="Sửa"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteLeave(leave.id)}
                              className="p-1 hover:bg-surface-negative rounded text-subdued hover:text-negative"
                              title="Xoá"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: TRA CỨU NGÀY CÔNG */}
      {/* ========================================================================= */}
      {activeSubTab === 'calculator' && (
        <div className="bg-surface rounded-vds-lg border border-line p-6 space-y-6">
          <div className="border-b border-divider pb-3">
            <h2 className="font-ui font-bold text-sm text-ink">
              Tra cứu ngày công
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-ui font-bold text-ink-lighter">
                Nhân sự:
              </label>
              <select
                value={calcMember}
                onChange={(e) => setCalcMember(e.target.value)}
                className="w-full px-3 py-2 border border-line rounded-vds-lg text-xs font-ui text-ink bg-surface focus:border-line-accent"
              >
                {productMembers.map((m) => (
                  <option key={m.id} value={m.name}>
                    {m.name} ({m.team})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-ui font-bold text-ink-lighter">
                Từ ngày:
              </label>
              <input
                type="date"
                value={calcStartDate}
                onChange={(e) => setCalcStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-line rounded-vds-lg text-xs font-num text-ink bg-surface focus:border-line-accent"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-ui font-bold text-ink-lighter">
                Đến ngày:
              </label>
              <input
                type="date"
                value={calcEndDate}
                onChange={(e) => setCalcEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-line rounded-vds-lg text-xs font-num text-ink bg-surface focus:border-line-accent"
              />
            </div>
          </div>

          {calcResult && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-vds-lg bg-surface-100 border border-line space-y-1">
                <span className="text-xs font-ui font-bold text-subdued block">
                  Số ngày làm việc
                </span>
                <p className="font-num text-2xl font-bold text-accent">
                  {calcResult.formattedWorkingDays}{' '}
                  <span className="text-xs font-ui font-normal text-subdued">ngày công</span>
                </p>
                <p className="text-xs font-ui text-subdued">
                  (Cộng làm bù, trừ ngày lễ và ngày nghỉ)
                </p>
              </div>

              <div className="p-4 rounded-vds-lg bg-surface-100 border border-line space-y-1">
                <span className="text-xs font-ui font-bold text-subdued block">
                  Ngày dương lịch
                </span>
                <p className="font-num text-2xl font-bold text-ink">
                  {calcResult.totalCalendarDays}{' '}
                  <span className="text-xs font-ui font-normal text-subdued">ngày</span>
                </p>
                <p className="text-xs font-ui text-subdued">
                  Từ {formatDateWithEnDay(calcStartDate)} đến {formatDateWithEnDay(calcEndDate)}
                </p>
              </div>

              {calcResult.joinStats && calcResult.joinStats.isValid && (
                <div className="p-4 rounded-vds-lg bg-surface-accent-faint border border-line space-y-1">
                  <span className="text-xs font-ui font-bold text-accent block">
                    Thâm niên công tác
                  </span>
                  <p className="font-num text-xl font-bold text-accent">
                    {calcResult.joinStats.formattedWorkingDays}{' '}
                    <span className="text-xs font-ui font-normal text-subdued">ngày làm việc</span>
                  </p>
                  <p className="text-xs font-ui text-ink-lighter">
                    Vào: <strong>{calcResult.joinStats.formattedDate}</strong> ({calcResult.joinStats.calendarDays.toLocaleString('vi-VN')} ngày)
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: QUẢN TRỊ CHECKLIST DỰ ÁN */}
      {/* ========================================================================= */}
      {activeSubTab === 'checklist' && (
        <div className="bg-surface rounded-vds-lg border border-line p-6 space-y-6">
          {/* Header Top Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-divider pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-ui font-bold text-sm text-ink">
                  Danh mục Tiêu chuẩn Checklist ({checklistTemplate.length} tiêu chuẩn)
                </h2>
                <span className="text-xs font-ui font-semibold px-2 py-0.5 rounded-vds-md bg-surface-accent-faint text-accent border border-line">
                  5 Giai đoạn
                </span>
              </div>
              <p className="text-xs text-subdued font-ui mt-0.5">
                Thêm, sửa, xoá và thay đổi vị trí các tiêu chuẩn để làm sườn mẫu chuẩn hóa triển khai dự án toàn bộ phận.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleResetChecklistDefaults}
                className="px-3 py-1.5 rounded-vds-lg border border-line text-xs font-ui text-ink-lighter hover:bg-surface-200 flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Khôi phục lại 34 tiêu chuẩn mẫu ban đầu của Ban Sản phẩm"
              >
                <RotateCcw className="w-3 h-3 text-subdued" />
                <span>Khôi phục 34 mục gốc</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenAddChecklistItem()}
                className="px-3.5 py-1.5 rounded-vds-lg bg-accent-solid hover:bg-accent-solid-hover text-on-color text-xs font-ui font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm tiêu chuẩn mới</span>
              </button>
            </div>
          </div>

          {/* Filter by Phase Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
            <button
              type="button"
              onClick={() => setChecklistFilterPhase('all')}
              className={`px-3 py-1.5 text-xs font-ui rounded-vds-lg font-semibold transition-colors cursor-pointer shrink-0 ${
                checklistFilterPhase === 'all'
                  ? 'bg-surface-selected text-accent ring-1 ring-inset ring-line-accent-soft'
                  : 'bg-surface-200 text-ink-lighter hover:bg-surface-300'
              }`}
            >
              Tất cả ({checklistTemplate.length})
            </button>
            {CHECKLIST_PHASES.map((p) => {
              const count = checklistTemplate.filter((it) => it.phaseId === p.id).length;
              const isSelected = checklistFilterPhase === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setChecklistFilterPhase(p.id)}
                  className={`px-3 py-1.5 text-xs font-ui rounded-vds-lg font-semibold transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-surface-selected text-accent ring-1 ring-inset ring-line-accent-soft'
                      : 'bg-surface-200 text-ink-lighter hover:bg-surface-300'
                  }`}
                >
                  <span>GĐ {p.id}: {p.shortTitle}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-num font-bold ${
                      isSelected ? 'bg-surface/20 text-on-color' : 'bg-surface-300 text-ink-lighter'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Grouped Phase Cards */}
          <div className="space-y-6">
            {CHECKLIST_PHASES.filter(
              (p) => checklistFilterPhase === 'all' || checklistFilterPhase === p.id
            ).map((phase) => {
              const phaseItems = checklistTemplate.filter((it) => it.phaseId === phase.id);
              return (
                <div
                  key={phase.id}
                  className="border border-line rounded-vds-lg overflow-hidden bg-surface "
                >
                  {/* Phase Group Header */}
                  <div className="px-4 py-3 bg-surface-100 border-b border-line flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-ui font-bold px-2.5 py-0.5 rounded-vds-md border ${phase.badgeColor}`}>
                        Giai đoạn {phase.id}
                      </span>
                      <h3 className="font-ui font-bold text-xs sm:text-sm text-ink">
                        {phase.title}
                      </h3>
                      <span className="text-xs font-ui text-subdued">
                        ({phaseItems.length} tiêu chuẩn)
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenAddChecklistItem(phase.id)}
                      className="px-2.5 py-1 rounded-vds-lg bg-surface border border-line hover:border-line-accent text-accent text-xs font-ui font-bold flex items-center gap-1 cursor-pointer transition-colors self-start sm:self-auto"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Thêm mục vào GĐ {phase.id}</span>
                    </button>
                  </div>

                  {/* Items List */}
                  {phaseItems.length === 0 ? (
                    <div className="p-6 text-center text-xs text-subdued italic">
                      Chưa có tiêu chuẩn nào trong giai đoạn này. Nhấn "Thêm mục vào GĐ {phase.id}" để bổ sung.
                    </div>
                  ) : (
                    <div className="divide-y divide-divider">
                      {phaseItems.map((item, idx) => {
                        const isFirst = idx === 0;
                        const isLast = idx === phaseItems.length - 1;
                        return (
                          <div
                            key={item.id}
                            className="p-3 sm:px-4 sm:py-3 hover:bg-surface-100 flex items-start justify-between gap-3 transition-colors group"
                          >
                            {/* Order & Text */}
                            <div className="flex items-start gap-2.5 min-w-0 flex-1">
                              <span className="font-num text-xs font-bold text-accent bg-surface-accent-faint px-2 py-0.5 rounded border border-line shrink-0 mt-0.5">
                                {phase.id}.{idx + 1}
                              </span>
                              <p className="font-ui text-xs text-ink leading-relaxed pt-0.5">
                                {item.text}
                              </p>
                            </div>

                            {/* Action Buttons: Move Up, Move Down, Edit, Delete */}
                            <div className="flex items-center gap-1 shrink-0 pt-0.5">
                              {/* Move Up */}
                              <button
                                type="button"
                                disabled={isFirst}
                                onClick={() => handleMoveChecklistItem(item.id, 'up')}
                                className={`p-1.5 rounded-vds-md border transition-colors ${
                                  isFirst
                                    ? 'text-icon-subdued border-transparent cursor-not-allowed'
                                    : 'text-ink-lighter hover:text-accent hover:bg-surface-accent-faint border-line hover:border-line cursor-pointer'
                                }`}
                                title={isFirst ? 'Đã ở vị trí đầu tiên' : 'Di chuyển lên'}
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>

                              {/* Move Down */}
                              <button
                                type="button"
                                disabled={isLast}
                                onClick={() => handleMoveChecklistItem(item.id, 'down')}
                                className={`p-1.5 rounded-vds-md border transition-colors ${
                                  isLast
                                    ? 'text-icon-subdued border-transparent cursor-not-allowed'
                                    : 'text-ink-lighter hover:text-accent hover:bg-surface-accent-faint border-line hover:border-line cursor-pointer'
                                }`}
                                title={isLast ? 'Đã ở vị trí cuối cùng' : 'Di chuyển xuống'}
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>

                              {/* Edit */}
                              <button
                                type="button"
                                onClick={() => handleOpenEditChecklistItem(item)}
                                className="p-1.5 rounded-vds-md border border-line hover:border-line-info text-ink-lighter hover:text-info hover:bg-surface-info transition-colors cursor-pointer"
                                title="Chỉnh sửa tiêu chuẩn"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete */}
                              <button
                                type="button"
                                onClick={() => setDeletingChecklistItem(item)}
                                className="p-1.5 rounded-vds-md border border-line hover:border-line text-ink-lighter hover:text-negative hover:bg-surface-negative transition-colors cursor-pointer"
                                title="Xoá tiêu chuẩn"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 7: QUẢN LÝ VIỆC CHU KỲ (ADMIN ONLY) */}
      {activeSubTab === 'recurring' && isAdmin && (
        <div className="bg-surface rounded-vds-lg border border-line overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-divider flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1 rounded bg-accent-solid/10 text-accent">
                  <RotateCw className="w-4 h-4" />
                </span>
                <h3 className="font-ui font-bold text-sm text-ink">
                  Danh sách Quy tắc Giao việc Chu kỳ
                </h3>
                <span className="text-xs font-semibold text-accent bg-surface-accent-faint border border-line px-2 py-0.5 rounded-full">
                  {recurringRules.length} quy tắc
                </span>
              </div>
              <p className="text-xs text-subdued font-ui mt-1">
                Tự động tạo task mới cho nhân sự vào lúc 08:00 AM các ngày theo chu kỳ lặp lại (Weekly, Biweekly, Monthly).
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenAddRecurring}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent-solid hover:bg-accent-solid text-on-color text-xs font-ui font-bold rounded-vds-lg transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Thêm việc chu kỳ
            </button>
          </div>

          {/* Table list of recurring rules */}
          {recurringRules.length === 0 ? (
            <div className="p-12 text-center text-subdued font-ui text-xs">
              <RotateCw className="w-8 h-8 text-icon-subdued mx-auto mb-2" />
              Chưa có quy tắc việc chu kỳ nào được thiết lập.
              <div className="mt-3">
                <button
                  type="button"
                  onClick={handleOpenAddRecurring}
                  className="px-3 py-1.5 bg-surface-200 hover:bg-surface-300 text-ink text-xs font-ui font-semibold rounded-vds-lg border border-line transition-colors cursor-pointer"
                >
                  + Tạo quy tắc đầu tiên
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-ui border-collapse">
                <thead>
                  <tr className="border-b border-divider bg-surface-100 text-subdued font-bold">
                    <th className="py-2.5 px-4">Tên công việc</th>
                    <th className="py-2.5 px-4">Dự án</th>
                    <th className="py-2.5 px-4">Phụ trách</th>
                    <th className="py-2.5 px-4">Chu kỳ</th>
                    <th className="py-2.5 px-4">Kết thúc</th>
                    <th className="py-2.5 px-4">Tạo lần tới</th>
                    <th className="py-2.5 px-4">Trạng thái</th>
                    <th className="py-2.5 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-divider">
                  {recurringRules.map((rule) => {
                    const isPaused = rule.status === 'paused';
                    return (
                      <tr
                        key={rule.id}
                        className={`hover:bg-surface-100 transition-colors ${
                          isPaused ? 'opacity-60 bg-surface-100' : ''
                        }`}
                      >
                        <td className="py-3 px-4 font-semibold text-ink max-w-[240px]">
                          <div className="flex items-center gap-2">
                            <span className="text-accent shrink-0">
                              <RotateCw className="w-3.5 h-3.5" />
                            </span>
                            <span className="truncate" title={rule.title}>
                              {rule.title}
                            </span>
                          </div>
                          {rule.priority === 'Khẩn cấp' && (
                            <span className="inline-block mt-0.5 text-[10px] font-bold text-negative bg-surface-negative px-1.5 py-0.2 rounded">
                              Khẩn cấp
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-ink-lighter max-w-[160px] truncate" title={rule.projectName}>
                          {rule.projectName}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-ink">{rule.assignee}</span>
                          <span className="block text-xs text-subdued">{rule.team}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-surface-positive text-positive border border-line">
                            {formatFrequencyLabel(rule.frequency)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-subdued">
                          {formatEndTypeLabel(rule)}
                        </td>
                        <td className="py-3 px-4 font-ui">
                          <span className="font-semibold text-ink">
                            {rule.nextRunDate}
                          </span>
                          <span className="block text-xs text-subdued">
                            {rule.nextRunTime || '08:00'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {isPaused ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-subdued bg-surface-200 px-2 py-0.5 rounded border border-line">
                              <Pause className="w-3 h-3 text-subdued" /> Tạm dừng
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-positive bg-surface-positive px-2 py-0.5 rounded border border-line">
                              <Play className="w-3 h-3 text-positive fill-current" /> Đang chạy
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Run now */}
                            <button
                              type="button"
                              onClick={() => handleTriggerRunNow(rule.id)}
                              className="p-1.5 rounded-vds-md border border-line hover:border-line-positive text-ink-lighter hover:text-positive hover:bg-surface-positive transition-colors cursor-pointer"
                              title="Tạo ngay 1 task cho hôm nay"
                            >
                              <Zap className="w-3.5 h-3.5" />
                            </button>

                            {/* Pause / Resume */}
                            <button
                              type="button"
                              onClick={() => handleTogglePauseRecurring(rule.id)}
                              className={`p-1.5 rounded-vds-md border transition-colors cursor-pointer ${
                                isPaused
                                  ? 'border-line text-positive hover:bg-surface-positive'
                                  : 'border-line text-ink-lighter hover:text-warning hover:bg-surface-warning'
                              }`}
                              title={isPaused ? 'Kích hoạt lại' : 'Tạm dừng quy tắc'}
                            >
                              {isPaused ? (
                                <Play className="w-3.5 h-3.5 fill-current" />
                              ) : (
                                <Pause className="w-3.5 h-3.5" />
                              )}
                            </button>

                            {/* Edit */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditRecurring(rule)}
                              className="p-1.5 rounded-vds-md border border-line hover:border-line-info text-ink-lighter hover:text-info hover:bg-surface-info transition-colors cursor-pointer"
                              title="Chỉnh sửa quy tắc"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={() => setDeletingRecurringRule(rule)}
                              className="p-1.5 rounded-vds-md border border-line hover:border-line text-ink-lighter hover:text-negative hover:bg-surface-negative transition-colors cursor-pointer"
                              title="Xoá quy tắc"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 8: PHÂN QUYỀN (ADMIN ONLY) */}
      {/* ========================================================================= */}
      {activeSubTab === 'permissions' && isAdmin && (
        <div className="bg-surface rounded-vds-lg border border-line overflow-hidden">
          <div className="p-4 border-b border-divider bg-surface-100">
            <h2 className="font-ui font-bold text-sm text-ink">
              Phân quyền tài khoản Ban Sản phẩm - Công nghệ ({productMembers.length})
            </h2>
            <p className="text-xs font-ui text-subdued mt-1">
              Admin: toàn quyền hệ thống · Manager: quản lý dự án/nhân sự mình phụ trách · Executive: chỉ sửa/xoá việc do mình tạo hoặc được giao.
            </p>
          </div>

          <div className="divide-y divide-divider">
            {productMembers.map((member) => {
              const currentRole = getUserRole(member);
              const roleInfo = getRoleDisplayInfo(currentRole);
              return (
                <div
                  key={member.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-surface-200 border border-line flex items-center justify-center text-xs font-ui font-bold text-ink-lighter shrink-0">
                      {(member.name || '?').trim().charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-ui font-bold text-ink truncate">{member.name}</p>
                      <p className="text-xs font-ui text-subdued truncate">
                        {member.username ? `@${member.username}` : member.email} · {member.title}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] font-ui font-bold px-2 py-0.5 rounded border ${roleInfo.badgeClass}`}>
                      {roleInfo.shortLabel}
                    </span>
                    <select
                      value={currentRole}
                      onChange={(e) => handleChangeMemberRole(member, e.target.value as UserRole)}
                      className="text-xs font-ui border border-line rounded-vds-lg px-2 py-1.5 text-ink focus:outline-none focus:ring-2 focus:ring-line-accent/30 cursor-pointer"
                    >
                      <option value="Admin">Admin (Quản trị)</option>
                      <option value="Manager">Manager (Quản lý)</option>
                      <option value="Executive">Executive (Chuyên viên)</option>
                    </select>
                  </div>
                </div>
              );
            })}
          </div>

          {permToast && (
            <div className="p-3 bg-surface-positive border-t border-line text-xs font-ui text-positive font-bold">
              {permToast}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 9: QUẢN LÝ CẤU HÌNH THÔNG BÁO (ADMIN ONLY) */}
      {/* ========================================================================= */}
      {activeSubTab === 'notifications' && isAdmin && (
        <NotificationRulesTab
          members={members}
          projects={projects}
          currentAuthUser={currentAuthUser}
          onTestNotification={(rule) => {
            if (onSendNotification) {
              const testNotif = {
                id: `notif-preview-${Date.now()}`,
                recipientName: currentAuthUser?.name || 'Đặng Tiến Ngọc',
                recipientId: currentAuthUser?.username || currentAuthUser?.id,
                actorName: currentAuthUser?.name || 'Hệ thống WMS',
                projectName: projects[0]?.name || 'Dự án VnExpress',
                projectId: projects[0]?.id,
                type: rule.triggerType === 'custom_event' ? 'admin_broadcast' : rule.triggerType,
                title: rule.titleTemplate
                  .replace('{projectName}', projects[0]?.name || 'Dự án VnExpress')
                  .replace('{taskTitle}', 'Kiểm thử cấu hình thông báo')
                  .replace('{actorName}', currentAuthUser?.name || 'Admin')
                  .replace('{phaseName}', 'Giai đoạn 1')
                  .replace('{dueDate}', 'Hôm nay'),
                content: rule.contentTemplate
                  .replace('{projectName}', projects[0]?.name || 'Dự án VnExpress')
                  .replace('{taskTitle}', 'Kiểm thử cấu hình thông báo')
                  .replace('{actorName}', currentAuthUser?.name || 'Admin')
                  .replace('{note}', 'Nội dung ghi chú mẫu')
                  .replace('{openCount}', '2')
                  .replace('{pmDisplay}', 'Đặng Tiến Ngọc'),
                isRead: false,
                createdAt: new Date().toISOString(),
              };
              onSendNotification(testNotif);
            }
          }}
        />
      )}
        </div>
      </div>

      {/* MODAL: THÊM / SỬA NGÀY LỄ */}
      {isHolidayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-fade-in">
          <div className="bg-surface rounded-vds-lg border border-line max-w-md w-full p-6 shadow-sheet space-y-4">
            <div className="flex items-center justify-between border-b border-divider pb-3">
              <h3 className="font-ui font-bold text-sm text-ink">
                {editingHoliday ? 'Sửa ngày lễ' : 'Thêm ngày lễ'}
              </h3>
              <button
                type="button"
                onClick={() => setIsHolidayModalOpen(false)}
                className="p-1 rounded text-subdued hover:text-ink hover:bg-surface-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveHoliday} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-ui font-bold text-ink-lighter">
                  Tên ngày lễ:
                </label>
                <input
                  type="text"
                  required
                  value={holidayName}
                  onChange={(e) => setHolidayName(e.target.value)}
                  placeholder="VD: Nghỉ lễ Quốc Khánh 2/9"
                  className="w-full px-3 py-2 border border-line rounded-vds-lg text-xs font-ui text-ink focus:border-line-accent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-ui font-bold text-ink-lighter">
                    Từ ngày:
                  </label>
                  <input
                    type="date"
                    required
                    value={holidayStartDate}
                    onChange={(e) => setHolidayStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-line rounded-vds-lg text-xs font-num text-ink focus:border-line-accent"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-ui font-bold text-ink-lighter">
                    Đến ngày:
                  </label>
                  <input
                    type="date"
                    value={holidayEndDate}
                    onChange={(e) => setHolidayEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-line rounded-vds-lg text-xs font-num text-ink focus:border-line-accent"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-divider">
                <button
                  type="button"
                  onClick={() => setIsHolidayModalOpen(false)}
                  className="px-4 py-2 rounded-vds-lg border border-line text-xs font-ui font-semibold text-ink-lighter hover:bg-surface-200"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-vds-lg bg-accent-solid hover:bg-accent-solid-hover text-on-color text-xs font-ui font-bold cursor-pointer"
                >
                  {editingHoliday ? 'Lưu thay đổi' : 'Thêm ngày lễ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: THÊM / SỬA NGÀY LÀM BÙ */}
      {isCompensatoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-fade-in">
          <div className="bg-surface rounded-vds-lg border border-line max-w-md w-full p-6 shadow-sheet space-y-4">
            <div className="flex items-center justify-between border-b border-divider pb-3">
              <h3 className="font-ui font-bold text-sm text-ink">
                {editingCompensatory ? 'Sửa ngày làm bù' : 'Thêm ngày làm bù'}
              </h3>
              <button
                type="button"
                onClick={() => setIsCompensatoryModalOpen(false)}
                className="p-1 rounded text-subdued hover:text-ink hover:bg-surface-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCompensatory} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-ui font-bold text-ink-lighter">
                  Lý do làm bù:
                </label>
                <input
                  type="text"
                  required
                  value={compName}
                  onChange={(e) => setCompName(e.target.value)}
                  placeholder="VD: Làm bù hoán đổi ngày 29/04"
                  className="w-full px-3 py-2 border border-line rounded-vds-lg text-xs font-ui text-ink focus:border-line-accent"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-ui font-bold text-ink-lighter">
                  Ngày làm bù (Thứ Bảy hoặc Chủ Nhật):
                </label>
                <input
                  type="date"
                  required
                  value={compDate}
                  onChange={(e) => setCompDate(e.target.value)}
                  className="w-full px-3 py-2 border border-line rounded-vds-lg text-xs font-num text-ink focus:border-line-accent"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-ui font-bold text-ink-lighter">
                  Ghi chú:
                </label>
                <input
                  type="text"
                  value={compNote}
                  onChange={(e) => setCompNote(e.target.value)}
                  placeholder="Ghi chú thêm (nếu có)"
                  className="w-full px-3 py-2 border border-line rounded-vds-lg text-xs font-ui text-ink focus:border-line-accent"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-divider">
                <button
                  type="button"
                  onClick={() => setIsCompensatoryModalOpen(false)}
                  className="px-4 py-2 rounded-vds-lg border border-line text-xs font-ui font-semibold text-ink-lighter hover:bg-surface-200"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-vds-lg bg-accent-solid hover:bg-accent-solid-hover text-on-color text-xs font-ui font-bold cursor-pointer"
                >
                  {editingCompensatory ? 'Lưu thay đổi' : 'Thêm ngày làm bù'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: THÊM / SỬA NGHỈ PHÉP (HỖ TRỢ NGHỈ BUỔI SÁNG / BUỔI CHIỀU) */}
      {isLeaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-fade-in">
          <div className="bg-surface rounded-vds-lg border border-line max-w-md w-full p-6 shadow-sheet space-y-4">
            <div className="flex items-center justify-between border-b border-divider pb-3">
              <h3 className="font-ui font-bold text-sm text-ink">
                {editingLeave ? 'Sửa đơn nghỉ' : 'Thêm đơn nghỉ'}
              </h3>
              <button
                type="button"
                onClick={() => setIsLeaveModalOpen(false)}
                className="p-1 rounded text-subdued hover:text-ink hover:bg-surface-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveLeave} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-ui font-bold text-ink-lighter">
                  Nhân sự:
                </label>
                <select
                  value={leaveMemberName}
                  onChange={(e) => setLeaveMemberName(e.target.value)}
                  className="w-full px-3 py-2 border border-line rounded-vds-lg text-xs font-ui text-ink focus:border-line-accent"
                >
                  {productMembers.map((m) => (
                    <option key={m.id} value={m.name}>
                      {m.name} ({m.team})
                    </option>
                  ))}
                </select>
              </div>

              {/* Lựa chọn Buổi nghỉ (Cả ngày / Buổi sáng / Buổi chiều) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-ui font-bold text-ink-lighter">
                  Buổi nghỉ:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setLeaveSession('all_day')}
                    className={`p-2 rounded-vds-lg border text-xs font-ui font-medium flex items-center justify-center gap-1 cursor-pointer transition ${
                      leaveSession === 'all_day'
                        ? 'bg-surface-selected text-accent border-line-accent-soft font-bold '
                        : 'bg-surface-100 text-ink-lighter border-line hover:bg-surface-200'
                    }`}
                  >
                    <span>Cả ngày</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLeaveSession('morning')}
                    className={`p-2 rounded-vds-lg border text-xs font-ui font-medium flex items-center justify-center gap-1 cursor-pointer transition ${
                      leaveSession === 'morning'
                        ? 'bg-surface-selected text-accent border-line-accent-soft font-bold '
                        : 'bg-surface-100 text-ink-lighter border-line hover:bg-surface-200'
                    }`}
                  >
                    <Sunrise className="w-3.5 h-3.5" />
                    <span>Sáng (0.5)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLeaveSession('afternoon')}
                    className={`p-2 rounded-vds-lg border text-xs font-ui font-medium flex items-center justify-center gap-1 cursor-pointer transition ${
                      leaveSession === 'afternoon'
                        ? 'bg-surface-selected text-accent border-line-accent-soft font-bold '
                        : 'bg-surface-100 text-ink-lighter border-line hover:bg-surface-200'
                    }`}
                  >
                    <Sunset className="w-3.5 h-3.5" />
                    <span>Chiều (0.5)</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-ui font-bold text-ink-lighter">
                    Từ ngày:
                  </label>
                  <input
                    type="date"
                    required
                    value={leaveStartDate}
                    onChange={(e) => {
                      setLeaveStartDate(e.target.value);
                      if (leaveSession !== 'all_day') {
                        setLeaveEndDate(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2 border border-line rounded-vds-lg text-xs font-num text-ink focus:border-line-accent"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-ui font-bold text-ink-lighter">
                    Đến ngày:
                  </label>
                  <input
                    type="date"
                    disabled={leaveSession !== 'all_day'}
                    value={leaveSession !== 'all_day' ? leaveStartDate : leaveEndDate}
                    onChange={(e) => setLeaveEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-line rounded-vds-lg text-xs font-num text-ink focus:border-line-accent disabled:bg-surface-200 disabled:text-subdued-lighter"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-ui font-bold text-ink-lighter">
                  Lý do:
                </label>
                <input
                  type="text"
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  placeholder="VD: Nghỉ phép năm, việc gia đình..."
                  className="w-full px-3 py-2 border border-line rounded-vds-lg text-xs font-ui text-ink focus:border-line-accent"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-ui font-bold text-ink-lighter">
                  Trạng thái:
                </label>
                <select
                  value={leaveStatus}
                  onChange={(e) => setLeaveStatus(e.target.value as any)}
                  className="w-full px-3 py-2 border border-line rounded-vds-lg text-xs font-ui text-ink focus:border-line-accent"
                >
                  <option value="Đã duyệt">Đã duyệt (Trừ vào ngày làm việc)</option>
                  <option value="Chờ duyệt">Chờ duyệt</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-divider">
                <button
                  type="button"
                  onClick={() => setIsLeaveModalOpen(false)}
                  className="px-4 py-2 rounded-vds-lg border border-line text-xs font-ui font-semibold text-ink-lighter hover:bg-surface-200"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-vds-lg bg-accent-solid hover:bg-accent-solid-hover text-on-color text-xs font-ui font-bold cursor-pointer"
                >
                  {editingLeave ? 'Lưu thay đổi' : 'Thêm đơn nghỉ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: THÊM / SỬA TIÊU CHUẨN CHECKLIST */}
      {isChecklistModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-fade-in">
          <div className="bg-surface rounded-vds-lg border border-line max-w-lg w-full p-6 shadow-sheet space-y-4">
            <div className="flex items-center justify-between border-b border-divider pb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-surface-accent-faint border border-line text-accent flex items-center justify-center font-bold">
                  <CheckSquare className="w-3.5 h-3.5" />
                </div>
                <h3 className="font-ui font-bold text-sm text-ink">
                  {editingChecklistItem ? 'Chỉnh sửa tiêu chuẩn Checklist' : 'Thêm tiêu chuẩn mới vào Checklist'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsChecklistModalOpen(false)}
                className="p-1 rounded text-subdued hover:text-ink hover:bg-surface-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveChecklistItem} className="space-y-4">
              {/* Chọn Giai đoạn */}
              <div className="space-y-1.5">
                <label className="block text-xs font-ui font-bold text-ink-lighter">
                  Thuộc giai đoạn: <span className="text-negative">*</span>
                </label>
                <select
                  value={itemPhaseId}
                  onChange={(e) => setItemPhaseId(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-line rounded-vds-lg text-xs font-ui text-ink bg-surface focus:border-line-accent"
                >
                  {CHECKLIST_PHASES.map((p) => (
                    <option key={p.id} value={p.id}>
                      Giai đoạn {p.id}: {p.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Vị trí chèn khi thêm mới */}
              {!editingChecklistItem && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-ui font-bold text-ink-lighter">
                    Vị trí trong giai đoạn:
                  </label>
                  <div className="flex items-center gap-4 pt-0.5">
                    <label className="inline-flex items-center gap-1.5 text-xs font-ui text-ink-lighter cursor-pointer">
                      <input
                        type="radio"
                        name="insertPosition"
                        value="end"
                        checked={itemInsertPosition === 'end'}
                        onChange={() => setItemInsertPosition('end')}
                        className="accent-accent"
                      />
                      <span>Thêm vào cuối giai đoạn</span>
                    </label>
                    <label className="inline-flex items-center gap-1.5 text-xs font-ui text-ink-lighter cursor-pointer">
                      <input
                        type="radio"
                        name="insertPosition"
                        value="start"
                        checked={itemInsertPosition === 'start'}
                        onChange={() => setItemInsertPosition('start')}
                        className="accent-accent"
                      />
                      <span>Thêm vào đầu giai đoạn</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Nội dung tiêu chuẩn */}
              <div className="space-y-1.5">
                <label className="block text-xs font-ui font-bold text-ink-lighter">
                  Nội dung tiêu chuẩn / câu hỏi kiểm tra: <span className="text-negative">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={itemText}
                  onChange={(e) => setItemText(e.target.value)}
                  placeholder="Nhập nội dung tiêu chuẩn rõ ràng, súc tích (VD: Đã có spec tracking chi tiết theo chuẩn ITM/ADP chưa?)..."
                  className="w-full px-3 py-2 border border-line rounded-vds-lg text-xs font-ui text-ink focus:border-line-accent"
                  autoFocus
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-divider">
                <button
                  type="button"
                  onClick={() => setIsChecklistModalOpen(false)}
                  className="px-4 py-2 rounded-vds-lg border border-line text-xs font-ui font-semibold text-ink-lighter hover:bg-surface-200 cursor-pointer"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-vds-lg bg-accent-solid hover:bg-accent-solid-hover text-on-color text-xs font-ui font-bold cursor-pointer"
                >
                  {editingChecklistItem ? 'Lưu cập nhật' : 'Thêm tiêu chuẩn'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: XÁC NHẬN XOÁ TIÊU CHUẨN */}
      {deletingChecklistItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-fade-in">
          <div className="bg-surface rounded-vds-lg border border-line max-w-md w-full p-6 shadow-sheet space-y-4">
            <div className="flex items-center gap-3 text-negative">
              <div className="w-10 h-10 rounded-full bg-surface-negative border border-line flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-negative" />
              </div>
              <div>
                <h3 className="font-ui font-bold text-sm text-ink">
                  Xác nhận xoá tiêu chuẩn
                </h3>
                <p className="text-xs text-subdued font-ui">
                  Tiêu chuẩn này sẽ bị gỡ bỏ khỏi Master Checklist mẫu.
                </p>
              </div>
            </div>

            <div className="p-3 bg-surface-100 rounded-vds-lg border border-line text-xs font-ui text-ink-lighter">
              {deletingChecklistItem.text}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-divider">
              <button
                type="button"
                onClick={() => setDeletingChecklistItem(null)}
                className="px-4 py-2 rounded-vds-lg border border-line text-xs font-ui font-semibold text-ink-lighter hover:bg-surface-200 cursor-pointer"
              >
                Huỷ
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteChecklistItem}
                className="px-4 py-2 rounded-vds-lg bg-negative-solid hover:bg-negative-solid text-on-color text-xs font-ui font-bold cursor-pointer"
              >
                Xoá tiêu chuẩn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING TOAST NOTIFICATION */}
      {checklistToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-surface-dark text-on-color px-4 py-2.5 rounded-vds-lg shadow-pop text-xs font-ui flex items-center gap-2 animate-fade-in border border-line-strong">
          <CheckCircle2 className="w-4 h-4 text-positive" />
          <span>{checklistToast}</span>
        </div>
      )}

      {/* MODAL: THÊM / SỬA QUY TẮC VIỆC CHU KỲ */}
      {isRecurringModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-fade-in">
          <div className="bg-surface rounded-vds-lg border border-line max-w-lg w-full p-6 shadow-sheet space-y-4">
            <div className="flex items-center justify-between border-b border-divider pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded bg-accent-solid/10 text-accent">
                  <RotateCw className="w-4 h-4" />
                </span>
                <h3 className="font-ui font-bold text-sm text-ink">
                  {editingRecurringRule ? 'Sửa quy tắc việc chu kỳ' : 'Thêm việc chu kỳ mới'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRecurringModalOpen(false)}
                className="p-1 rounded text-subdued hover:text-ink hover:bg-surface-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRecurringRule} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-ui font-bold text-ink-lighter">
                  Tiêu đề công việc:
                </label>
                <input
                  type="text"
                  required
                  value={recTitle}
                  onChange={(e) => setRecTitle(e.target.value)}
                  placeholder="Ví dụ: Báo cáo số liệu traffic tuần, Kiểm tra checklist SEO..."
                  className="w-full px-3 py-2 text-xs font-ui border border-line rounded-vds-lg focus:outline-none focus:border-line-accent"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-ui font-bold text-ink-lighter">
                    Dự án:
                  </label>
                  <select
                    value={recProjectId}
                    onChange={(e) => {
                      setRecProjectId(e.target.value);
                      setRecPhaseId('');
                    }}
                    className="w-full px-3 py-2 text-xs font-ui border border-line rounded-vds-lg bg-surface focus:outline-none focus:border-line-accent"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-ui font-bold text-ink-lighter">
                    Giai đoạn (tuỳ chọn):
                  </label>
                  <select
                    value={recPhaseId}
                    onChange={(e) => setRecPhaseId(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-ui border border-line rounded-vds-lg bg-surface focus:outline-none focus:border-line-accent"
                  >
                    <option value="">-- Không chỉ định --</option>
                    {projects
                      .find((p) => p.id === recProjectId)
                      ?.phases?.map((ph) => (
                        <option key={ph.id} value={ph.id}>
                          {ph.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-ui font-bold text-ink-lighter">
                    Nhân sự phụ trách:
                  </label>
                  <select
                    value={recAssignee}
                    onChange={(e) => setRecAssignee(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-ui border border-line rounded-vds-lg bg-surface focus:outline-none focus:border-line-accent"
                  >
                    {productMembers.map((m) => (
                      <option key={m.id} value={m.name}>
                        {m.name} ({m.team})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-ui font-bold text-ink-lighter">
                    Mức độ ưu tiên:
                  </label>
                  <div className="pt-2">
                    <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-ui font-medium text-ink">
                      <input
                        type="checkbox"
                        checked={recPriority === 'Khẩn cấp'}
                        onChange={(e) =>
                          setRecPriority(e.target.checked ? 'Khẩn cấp' : 'Bình thường')
                        }
                        className="w-4 h-4 rounded text-negative focus:ring-line-negative"
                      />
                      <span>🚨 Khẩn cấp</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-divider">
                <div className="space-y-1.5">
                  <label className="block text-xs font-ui font-bold text-ink-lighter">
                    Chu kỳ lặp (Repeat):
                  </label>
                  <select
                    value={recFrequency}
                    onChange={(e) => setRecFrequency(e.target.value as RecurrenceFrequency)}
                    className="w-full px-3 py-2 text-xs font-ui border border-line rounded-vds-lg bg-surface focus:outline-none focus:border-line-accent font-semibold text-accent"
                  >
                    <option value="weekly">Hàng tuần (Weekly)</option>
                    <option value="biweekly">2 tuần một lần (Biweekly)</option>
                    <option value="monthly">Hàng tháng (Monthly)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-ui font-bold text-ink-lighter">
                    Kết thúc lặp (End Repeat):
                  </label>
                  <select
                    value={recEndType}
                    onChange={(e) => setRecEndType(e.target.value as RecurrenceEndType)}
                    className="w-full px-3 py-2 text-xs font-ui border border-line rounded-vds-lg bg-surface focus:outline-none focus:border-line-accent"
                  >
                    <option value="never">Không bao giờ (Never)</option>
                    <option value="specific_date">Chọn ngày cụ thể</option>
                  </select>
                </div>
              </div>

              {recEndType === 'specific_date' && (
                <div className="space-y-1.5 p-3 bg-surface-100 rounded-vds-lg border border-line">
                  <label className="block text-xs font-ui font-bold text-ink-lighter">
                    Ngày kết thúc lặp:
                  </label>
                  <input
                    type="date"
                    required={recEndType === 'specific_date'}
                    value={recEndDate}
                    onChange={(e) => setRecEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-ui border border-line rounded-vds-lg bg-surface focus:outline-none focus:border-line-accent"
                  />
                </div>
              )}

              {/* Mốc thời gian chạy tiếp theo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-divider">
                <div className="space-y-1.5">
                  <label className="block text-xs font-ui font-bold text-ink-lighter">
                    Ngày chạy tiếp theo (Next Run Date):
                  </label>
                  <input
                    type="date"
                    required
                    value={recNextRunDate}
                    onChange={(e) => setRecNextRunDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-ui border border-line rounded-vds-lg bg-surface focus:outline-none focus:border-line-accent"
                  />
                  {recNextRunDate && (
                    <span className="block text-xs text-subdued font-ui">
                      {formatDateWithEnDay(recNextRunDate)}
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-ui font-bold text-ink-lighter">
                    Giờ chạy trong ngày:
                  </label>
                  <input
                    type="time"
                    required
                    value={recNextRunTime}
                    onChange={(e) => setRecNextRunTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-ui border border-line rounded-vds-lg bg-surface focus:outline-none focus:border-line-accent"
                  />
                </div>
              </div>

              <div className="text-xs text-subdued font-ui bg-surface-accent-faint p-2.5 rounded-vds-lg border border-line">
                ℹ️ Hệ thống sẽ tự động tạo task mới lúc <strong>{recNextRunTime || '08:00'}</strong> vào ngày chu kỳ tiếp theo với trạng thái <em>Chưa làm</em> và gửi thông báo cho nhân sự.
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-divider">
                <button
                  type="button"
                  onClick={() => setIsRecurringModalOpen(false)}
                  className="px-4 py-2 rounded-vds-lg border border-line text-xs font-ui font-semibold text-ink-lighter hover:bg-surface-200 cursor-pointer"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-vds-lg bg-accent-solid hover:bg-accent-solid text-on-color text-xs font-ui font-bold cursor-pointer"
                >
                  {editingRecurringRule ? 'Lưu thay đổi' : 'Tạo quy tắc'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN XOÁ QUY TẮC CHU KỲ (THAY THẾ CONFIRM NATIVE) */}
      {deletingRecurringRule && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs animate-fade-in font-ui">
          <div className="bg-surface rounded-vds-lg border border-line shadow-sheet w-full max-w-sm p-5 space-y-4">
            <div className="flex items-center gap-2 text-negative">
              <Trash2 className="w-5 h-5 shrink-0" />
              <h3 className="font-bold text-sm text-ink">Xoá Quy tắc Lặp chu kỳ?</h3>
            </div>

            <p className="text-xs text-ink-lighter leading-relaxed">
              Bạn có chắc chắn muốn xoá vĩnh viễn quy tắc việc chu kỳ <strong>"{deletingRecurringRule.title}"</strong> ({formatFrequencyLabel(deletingRecurringRule.frequency)})? Hệ thống sẽ ngừng tạo công việc mới theo quy tắc này.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-divider">
              <button
                type="button"
                onClick={() => setDeletingRecurringRule(null)}
                className="px-3 py-1.5 border border-line text-ink-lighter hover:text-ink rounded-vds-lg text-xs font-bold cursor-pointer"
              >
                Huỷ
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteRecurring}
                className="px-3.5 py-1.5 bg-negative-solid hover:bg-negative-solid text-on-color rounded-vds-lg text-xs font-bold cursor-pointer "
              >
                Xác nhận xoá
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING TOAST FOR RECURRING */}
      {recToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-surface-dark text-on-color px-4 py-2.5 rounded-vds-lg shadow-pop text-xs font-ui flex items-center gap-2 animate-fade-in border border-line-strong">
          <CheckCircle2 className="w-4 h-4 text-positive" />
          <span>{recToast}</span>
        </div>
      )}
    </div>
  );
};
