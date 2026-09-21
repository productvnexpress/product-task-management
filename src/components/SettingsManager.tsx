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
} from 'lucide-react';

interface SettingsManagerProps {
  members: MemberItem[];
  tasks?: TaskItem[];
  projects?: ProjectItem[];
  currentAuthUser?: MemberItem | null;
  onAddTask?: (task: any, author?: string) => void;
  onUpdateMember?: (member: MemberItem) => void;
}

type SettingsTab = 'schedule' | 'holidays' | 'compensatory' | 'leaves' | 'calculator' | 'checklist' | 'recurring' | 'permissions';

export const SettingsManager: React.FC<SettingsManagerProps> = ({
  members,
  projects = [],
  currentAuthUser,
  onAddTask,
  onUpdateMember,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<SettingsTab>('schedule');

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
        nextRunDate: nextRun,
        nextRunTime: '08:00',
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

  const handleDeleteRecurring = (id: string) => {
    if (confirm('Bạn chắc chắn muốn xoá quy tắc việc chu kỳ này?')) {
      recurringTaskService.deleteRule(id);
      setRecurringRules(recurringTaskService.getRules());
      setRecToast('Đã xoá quy tắc việc chu kỳ!');
      setTimeout(() => setRecToast(null), 3000);
    }
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
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6 animate-fade-in pb-16">
      {/* Header tinh gọn theo EDITOR.md */}
      <div className="bg-white rounded-[12px] border border-[#e0e0e0] p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-[6px] bg-[#963861] text-white flex items-center justify-center font-bold shadow-2xs">
                {activeSubTab === 'checklist' ? (
                  <CheckSquare className="w-4 h-4" />
                ) : activeSubTab === 'recurring' ? (
                  <RotateCw className="w-4 h-4" />
                ) : activeSubTab === 'permissions' ? (
                  <ShieldCheck className="w-4 h-4" />
                ) : (
                  <Clock className="w-4 h-4" />
                )}
              </div>
              <h1 className="font-title text-xl font-bold text-[#202020]">
                {activeSubTab === 'checklist'
                  ? 'Quản trị Checklist'
                  : activeSubTab === 'recurring'
                  ? 'Việc chu kỳ'
                  : activeSubTab === 'permissions'
                  ? 'Phân quyền'
                  : 'Thời gian làm việc'}
              </h1>
              <span className="bg-[#ede9fe] text-[#6d28d9] border border-[#ddd6fe] text-[11px] font-ui font-bold px-2 py-0.5 rounded-[4px]">
                Admin
              </span>
            </div>
            <p className="text-xs font-ui text-[#5f5f5f]">
              {activeSubTab === 'checklist'
                ? 'Cấu hình danh mục tiêu chuẩn Product Management (thêm, sửa, xoá, sắp xếp vị trí các tiêu chuẩn theo từng giai đoạn).'
                : activeSubTab === 'recurring'
                ? 'Quản lý các công việc lặp lại tự động tạo lúc 08:00 AM theo chu kỳ Hàng tuần, 2 Tuần hoặc Hàng tháng.'
                : activeSubTab === 'permissions'
                ? 'Gán nhóm quyền Admin / Manager / Executive cho từng tài khoản Ban Sản phẩm - Công nghệ.'
                : 'Lịch làm việc, ngày lễ, làm bù và nghỉ phép dùng tính ngày công nhân sự.'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-ui text-[#71717a] bg-[#f4f4f5] px-2.5 py-1 rounded border border-[#e4e4e7]">
              {currentAuthUser?.name || 'Đặng Tiến Ngọc'} (Admin)
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-5 items-start">
        {/* Menu dọc - thay thế menu ngang cũ để tránh tràn ngang khi có nhiều tab */}
        <aside className="w-full md:w-56 md:shrink-0 bg-white rounded-[12px] border border-[#e0e0e0] shadow-2xs p-2 space-y-1 md:sticky md:top-4">
          <button
            onClick={() => setActiveSubTab('schedule')}
            className={`w-full px-3 py-2.5 rounded-[8px] text-xs font-ui font-bold flex items-center gap-2 transition-colors cursor-pointer ${
              activeSubTab === 'schedule'
                ? 'bg-[#fdf2f7] text-[#963861] border border-[#f4c2d7]'
                : 'text-[#5f5f5f] hover:bg-[#f5f5f5] hover:text-[#202020] border border-transparent'
            }`}
          >
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span>Lịch làm việc</span>
          </button>

          <button
            onClick={() => setActiveSubTab('holidays')}
            className={`w-full px-3 py-2.5 rounded-[8px] text-xs font-ui font-bold flex items-center gap-2 transition-colors cursor-pointer ${
              activeSubTab === 'holidays'
                ? 'bg-[#fdf2f7] text-[#963861] border border-[#f4c2d7]'
                : 'text-[#5f5f5f] hover:bg-[#f5f5f5] hover:text-[#202020] border border-transparent'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            <span>Ngày lễ ({holidays.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('compensatory')}
            className={`w-full px-3 py-2.5 rounded-[8px] text-xs font-ui font-bold flex items-center gap-2 transition-colors cursor-pointer ${
              activeSubTab === 'compensatory'
                ? 'bg-[#fdf2f7] text-[#963861] border border-[#f4c2d7]'
                : 'text-[#5f5f5f] hover:bg-[#f5f5f5] hover:text-[#202020] border border-transparent'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5 shrink-0 text-[#b26b00]" />
            <span>Làm bù ({compensatoryList.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('leaves')}
            className={`w-full px-3 py-2.5 rounded-[8px] text-xs font-ui font-bold flex items-center gap-2 transition-colors cursor-pointer ${
              activeSubTab === 'leaves'
                ? 'bg-[#fdf2f7] text-[#963861] border border-[#f4c2d7]'
                : 'text-[#5f5f5f] hover:bg-[#f5f5f5] hover:text-[#202020] border border-transparent'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 shrink-0" />
            <span>Nghỉ phép ({leaves.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('calculator')}
            className={`w-full px-3 py-2.5 rounded-[8px] text-xs font-ui font-bold flex items-center gap-2 transition-colors cursor-pointer ${
              activeSubTab === 'calculator'
                ? 'bg-[#fdf2f7] text-[#963861] border border-[#f4c2d7]'
                : 'text-[#5f5f5f] hover:bg-[#f5f5f5] hover:text-[#202020] border border-transparent'
            }`}
          >
            <Calculator className="w-3.5 h-3.5 shrink-0" />
            <span>Tra cứu ngày công</span>
          </button>

          <button
            onClick={() => setActiveSubTab('checklist')}
            className={`w-full px-3 py-2.5 rounded-[8px] text-xs font-ui font-bold flex items-center gap-2 transition-colors cursor-pointer ${
              activeSubTab === 'checklist'
                ? 'bg-[#fdf2f7] text-[#963861] border border-[#f4c2d7]'
                : 'text-[#5f5f5f] hover:bg-[#f5f5f5] hover:text-[#202020] border border-transparent'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5 shrink-0" />
            <span>Checklist ({checklistTemplate.length})</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => setActiveSubTab('recurring')}
              className={`w-full px-3 py-2.5 rounded-[8px] text-xs font-ui font-bold flex items-center gap-2 transition-colors cursor-pointer ${
                activeSubTab === 'recurring'
                  ? 'bg-[#fdf2f7] text-[#963861] border border-[#f4c2d7]'
                  : 'text-[#5f5f5f] hover:bg-[#f5f5f5] hover:text-[#202020] border border-transparent'
              }`}
            >
              <RotateCw className="w-3.5 h-3.5 shrink-0" />
              <span>Việc chu kỳ ({recurringRules.length})</span>
            </button>
          )}

          {isAdmin && (
            <>
              <div className="h-px bg-[#f0f0f0] my-1" />
              <button
                onClick={() => setActiveSubTab('permissions')}
                className={`w-full px-3 py-2.5 rounded-[8px] text-xs font-ui font-bold flex items-center gap-2 transition-colors cursor-pointer ${
                  activeSubTab === 'permissions'
                    ? 'bg-[#fdf2f7] text-[#963861] border border-[#f4c2d7]'
                    : 'text-[#5f5f5f] hover:bg-[#f5f5f5] hover:text-[#202020] border border-transparent'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>Phân quyền</span>
              </button>
            </>
          )}

          <div className="mt-4 pt-3 border-t border-[#f0f0f0] space-y-2">
            <div className="text-[11px] text-[#7f7f7f] leading-snug">
              Hệ thống tự động xóa bộ nhớ đệm mỗi 6 giờ và cập nhật phiên bản mới.
            </div>
            <button
              type="button"
              onClick={() => autoCacheService.clearCacheAndReload()}
              className="w-full px-2.5 py-1.5 rounded-[6px] text-xs font-ui font-medium text-[#7f7f7f] hover:text-[#963861] bg-[#f9f9f9] hover:bg-[#fdf2f7] border border-[#e0e0e0] hover:border-[#f4c2d7] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              title="Xóa bộ nhớ đệm trình duyệt và tải lại phiên bản mới nhất"
            >
              <RotateCw className="w-3.5 h-3.5 shrink-0" />
              <span>Dọn cache và làm mới</span>
            </button>
          </div>
        </aside>

        <div className="flex-1 min-w-0 space-y-6">
      {/* ========================================================================= */}
      {/* TAB 1: LỊCH LÀM VIỆC */}
      {/* ========================================================================= */}
      {activeSubTab === 'schedule' && (
        <div className="bg-white rounded-[12px] border border-[#e0e0e0] p-6 shadow-2xs space-y-6">
          <div className="border-b border-[#f0f0f0] pb-3">
            <h2 className="font-ui font-bold text-sm text-[#202020]">
              Ngày và giờ làm việc
            </h2>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-ui font-bold text-[#3f3f46]">
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
                    className={`p-3 rounded-[8px] border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                      isChecked
                        ? 'bg-[#fdf2f7] border-[#f4c2d7] text-[#913257] shadow-2xs'
                        : 'bg-[#fafafa] border-[#e4e4e7] text-[#a1a1aa] hover:bg-[#f4f4f5]'
                    }`}
                  >
                    <span className="font-ui text-xs font-bold">{d.label}</span>
                    <span
                      className={`text-[10px] font-ui font-semibold px-2 py-0.5 rounded-[4px] ${
                        isChecked ? 'bg-[#963861] text-white' : 'bg-[#e4e4e7] text-[#71717a]'
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
              <label className="block text-xs font-ui font-bold text-[#3f3f46]">
                Giờ bắt đầu:
              </label>
              <input
                type="time"
                value={schedule.startTime}
                onChange={(e) => setSchedule((s) => ({ ...s, startTime: e.target.value }))}
                className="w-full px-3 py-2 border border-[#d4d4d8] rounded-[6px] text-xs font-num font-bold text-[#202020] bg-white focus:border-[#963861]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-ui font-bold text-[#3f3f46]">
                Giờ kết thúc:
              </label>
              <input
                type="time"
                value={schedule.endTime}
                onChange={(e) => setSchedule((s) => ({ ...s, endTime: e.target.value }))}
                className="w-full px-3 py-2 border border-[#d4d4d8] rounded-[6px] text-xs font-num font-bold text-[#202020] bg-white focus:border-[#963861]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-ui font-bold text-[#3f3f46]">
                Nghỉ trưa từ:
              </label>
              <input
                type="time"
                value={schedule.lunchBreakStart}
                onChange={(e) => setSchedule((s) => ({ ...s, lunchBreakStart: e.target.value }))}
                className="w-full px-3 py-2 border border-[#d4d4d8] rounded-[6px] text-xs font-num text-[#52525b] bg-white focus:border-[#963861]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-ui font-bold text-[#3f3f46]">
                Đến:
              </label>
              <input
                type="time"
                value={schedule.lunchBreakEnd}
                onChange={(e) => setSchedule((s) => ({ ...s, lunchBreakEnd: e.target.value }))}
                className="w-full px-3 py-2 border border-[#d4d4d8] rounded-[6px] text-xs font-num text-[#52525b] bg-white focus:border-[#963861]"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-[#f0f0f0]">
            <div className="text-xs font-ui text-[#15803d] flex items-center gap-1.5">
              {scheduleSavedMsg && (
                <>
                  <CheckCircle2 className="w-4 h-4 text-[#16a34a]" />
                  <span className="font-bold">Đã lưu thay đổi.</span>
                </>
              )}
            </div>

            <button
              onClick={handleSaveSchedule}
              className="px-5 py-2.5 rounded-[8px] bg-[#963861] hover:bg-[#832e52] text-white font-ui text-xs font-bold flex items-center gap-2 transition-all shadow-xs cursor-pointer active:scale-98"
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
        <div className="bg-white rounded-[12px] border border-[#e0e0e0] p-6 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#f0f0f0] pb-3">
            <div>
              <h2 className="font-ui font-bold text-sm text-[#202020]">
                Ngày lễ ({holidays.length})
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetHolidays}
                className="px-3 py-1.5 rounded-[6px] border border-[#d4d4d8] text-xs font-ui text-[#52525b] hover:bg-[#f4f4f5] flex items-center gap-1.5 cursor-pointer"
                title="Khôi phục danh mục ngày lễ chuẩn 2026"
              >
                <RotateCcw className="w-3 h-3 text-[#71717a]" />
                <span>Mặc định 2026</span>
              </button>

              <button
                onClick={handleOpenAddHoliday}
                className="px-3.5 py-1.5 rounded-[6px] bg-[#963861] hover:bg-[#832e52] text-white text-xs font-ui font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm ngày lễ</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs font-ui text-left border border-[#e4e4e7] rounded-[8px] overflow-hidden">
              <thead className="bg-[#f8fafc] text-[#475569] font-bold border-b border-[#e4e4e7]">
                <tr>
                  <th className="p-3">Tên ngày lễ</th>
                  <th className="p-3">Từ ngày</th>
                  <th className="p-3">Đến ngày</th>
                  <th className="p-3 text-center">Số ngày nghỉ</th>
                  <th className="p-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f0f0]">
                {holidays.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-xs text-[#71717a]">
                      Chưa có ngày lễ.
                    </td>
                  </tr>
                ) : (
                  holidays.map((hol) => (
                    <tr key={hol.id} className="hover:bg-[#fafafa] transition-colors">
                      <td className="p-3 font-semibold text-[#202020]">
                        {hol.name}
                      </td>
                      <td className="p-3 font-num text-[#52525b]">
                        {formatDateWithEnDay(hol.startDate)}
                      </td>
                      <td className="p-3 font-num text-[#52525b]">
                        {formatDateWithEnDay(hol.endDate)}
                      </td>
                      <td className="p-3 text-center">
                        <span className="font-num text-[11px] font-bold bg-[#fdf2f7] text-[#963861] border border-[#f4c2d7] px-2 py-0.5 rounded-full">
                          {hol.daysCount} ngày
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditHoliday(hol)}
                            className="p-1 hover:bg-[#f0f0f0] rounded text-[#71717a] hover:text-[#202020]"
                            title="Sửa"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteHoliday(hol.id)}
                            className="p-1 hover:bg-[#fee2e2] rounded text-[#71717a] hover:text-[#dc2626]"
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
        <div className="bg-white rounded-[12px] border border-[#e0e0e0] p-6 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#f0f0f0] pb-3">
            <div>
              <h2 className="font-ui font-bold text-sm text-[#202020]">
                Ngày làm bù ({compensatoryList.length})
              </h2>
              <p className="text-xs font-ui text-[#71717a] mt-0.5">
                Ngày làm bù cuối tuần được tính là 1 ngày làm việc.
              </p>
            </div>

            <button
              onClick={handleOpenAddCompensatory}
              className="px-3.5 py-1.5 rounded-[6px] bg-[#963861] hover:bg-[#832e52] text-white text-xs font-ui font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm ngày làm bù</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs font-ui text-left border border-[#e4e4e7] rounded-[8px] overflow-hidden">
              <thead className="bg-[#f8fafc] text-[#475569] font-bold border-b border-[#e4e4e7]">
                <tr>
                  <th className="p-3">Lý do làm bù</th>
                  <th className="p-3">Ngày làm bù</th>
                  <th className="p-3">Ghi chú</th>
                  <th className="p-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f0f0]">
                {compensatoryList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-xs text-[#71717a]">
                      Chưa có ngày làm bù.
                    </td>
                  </tr>
                ) : (
                  compensatoryList.map((comp) => (
                    <tr key={comp.id} className="hover:bg-[#fafafa] transition-colors">
                      <td className="p-3 font-semibold text-[#202020]">
                        {comp.name}
                      </td>
                      <td className="p-3 font-num text-[#963861] font-bold">
                        {formatDateWithEnDay(comp.date)}
                      </td>
                      <td className="p-3 text-[#52525b]">
                        {comp.note || '—'}
                      </td>
                      <td className="p-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditCompensatory(comp)}
                            className="p-1 hover:bg-[#f0f0f0] rounded text-[#71717a] hover:text-[#202020]"
                            title="Sửa"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCompensatory(comp.id)}
                            className="p-1 hover:bg-[#fee2e2] rounded text-[#71717a] hover:text-[#dc2626]"
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
        <div className="bg-white rounded-[12px] border border-[#e0e0e0] p-6 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#f0f0f0] pb-3">
            <div>
              <h2 className="font-ui font-bold text-sm text-[#202020]">
                Nghỉ phép ({leaves.length})
              </h2>
              <p className="text-xs font-ui text-[#71717a] mt-0.5">
                Nghỉ cả ngày hoặc nửa buổi (sáng hoặc chiều = 0.5 ngày công).
              </p>
            </div>

            <button
              onClick={handleOpenAddLeave}
              className="px-3.5 py-1.5 rounded-[6px] bg-[#963861] hover:bg-[#832e52] text-white text-xs font-ui font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm đơn nghỉ</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs font-ui text-left border border-[#e4e4e7] rounded-[8px] overflow-hidden">
              <thead className="bg-[#f8fafc] text-[#475569] font-bold border-b border-[#e4e4e7]">
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
              <tbody className="divide-y divide-[#f0f0f0]">
                {leaves.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-xs text-[#71717a]">
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
                      <tr key={leave.id} className="hover:bg-[#fafafa] transition-colors">
                        <td className="p-3 font-semibold text-[#202020]">
                          {leave.memberName}
                        </td>
                        <td className="p-3 font-num text-[#52525b]">
                          {leave.startDate === leave.endDate ? (
                            formatDateWithEnDay(leave.startDate)
                          ) : (
                            `${formatDateWithEnDay(leave.startDate)} ➔ ${formatDateWithEnDay(leave.endDate)}`
                          )}
                        </td>
                        <td className="p-3">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-[4px] border ${
                              leave.session === 'morning'
                                ? 'bg-[#fefce8] text-[#854d0e] border-[#fef08a]'
                                : leave.session === 'afternoon'
                                ? 'bg-[#fff7ed] text-[#9a3412] border-[#fed7aa]'
                                : 'bg-[#f4f4f5] text-[#52525b] border-[#e4e4e7]'
                            }`}
                          >
                            {leave.session === 'morning' && <Sunrise className="w-3 h-3 text-[#ca8a04]" />}
                            {leave.session === 'afternoon' && <Sunset className="w-3 h-3 text-[#ea580c]" />}
                            <span>{sessionLabel}</span>
                          </span>
                        </td>
                        <td className="p-3 text-center font-num font-bold text-[#963861]">
                          {formatWorkingDaysCount(leave.daysCount)} ngày
                        </td>
                        <td className="p-3 text-[#52525b]">
                          {leave.reason}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`text-[10px] font-ui font-bold px-2 py-0.5 rounded-[4px] border ${
                              leave.status === 'Đã duyệt'
                                ? 'bg-[#f0fdf4] text-[#166534] border-[#bbf7d0]'
                                : 'bg-[#fffbeb] text-[#b45309] border-[#fde68a]'
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
                              className="p-1 hover:bg-[#f0f0f0] rounded text-[#71717a] hover:text-[#202020]"
                              title="Sửa"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteLeave(leave.id)}
                              className="p-1 hover:bg-[#fee2e2] rounded text-[#71717a] hover:text-[#dc2626]"
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
        <div className="bg-white rounded-[12px] border border-[#e0e0e0] p-6 shadow-2xs space-y-6">
          <div className="border-b border-[#f0f0f0] pb-3">
            <h2 className="font-ui font-bold text-sm text-[#202020]">
              Tra cứu ngày công
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-ui font-bold text-[#3f3f46]">
                Nhân sự:
              </label>
              <select
                value={calcMember}
                onChange={(e) => setCalcMember(e.target.value)}
                className="w-full px-3 py-2 border border-[#d4d4d8] rounded-[6px] text-xs font-ui text-[#202020] bg-white focus:border-[#963861]"
              >
                {productMembers.map((m) => (
                  <option key={m.id} value={m.name}>
                    {m.name} ({m.team})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-ui font-bold text-[#3f3f46]">
                Từ ngày:
              </label>
              <input
                type="date"
                value={calcStartDate}
                onChange={(e) => setCalcStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-[#d4d4d8] rounded-[6px] text-xs font-num text-[#202020] bg-white focus:border-[#963861]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-ui font-bold text-[#3f3f46]">
                Đến ngày:
              </label>
              <input
                type="date"
                value={calcEndDate}
                onChange={(e) => setCalcEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-[#d4d4d8] rounded-[6px] text-xs font-num text-[#202020] bg-white focus:border-[#963861]"
              />
            </div>
          </div>

          {calcResult && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-[8px] bg-[#f8fafc] border border-[#e2e8f0] space-y-1">
                <span className="text-[11px] font-ui font-bold text-[#64748b] uppercase tracking-wider block">
                  Số ngày làm việc
                </span>
                <p className="font-num text-2xl font-bold text-[#963861]">
                  {calcResult.formattedWorkingDays}{' '}
                  <span className="text-xs font-ui font-normal text-[#71717a]">ngày công</span>
                </p>
                <p className="text-[11px] font-ui text-[#71717a]">
                  (Cộng làm bù, trừ ngày lễ và ngày nghỉ)
                </p>
              </div>

              <div className="p-4 rounded-[8px] bg-[#f8fafc] border border-[#e2e8f0] space-y-1">
                <span className="text-[11px] font-ui font-bold text-[#64748b] uppercase tracking-wider block">
                  Ngày dương lịch
                </span>
                <p className="font-num text-2xl font-bold text-[#202020]">
                  {calcResult.totalCalendarDays}{' '}
                  <span className="text-xs font-ui font-normal text-[#71717a]">ngày</span>
                </p>
                <p className="text-[11px] font-ui text-[#71717a]">
                  Từ {formatDateWithEnDay(calcStartDate)} đến {formatDateWithEnDay(calcEndDate)}
                </p>
              </div>

              {calcResult.joinStats && calcResult.joinStats.isValid && (
                <div className="p-4 rounded-[8px] bg-[#fdf2f7] border border-[#f4c2d7] space-y-1">
                  <span className="text-[11px] font-ui font-bold text-[#963861] uppercase tracking-wider block">
                    Thâm niên công tác
                  </span>
                  <p className="font-num text-xl font-bold text-[#963861]">
                    {calcResult.joinStats.formattedWorkingDays}{' '}
                    <span className="text-xs font-ui font-normal text-[#71717a]">ngày làm việc</span>
                  </p>
                  <p className="text-[11px] font-ui text-[#52525b]">
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
        <div className="bg-white rounded-[12px] border border-[#e0e0e0] p-6 shadow-2xs space-y-6">
          {/* Header Top Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#f0f0f0] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-ui font-bold text-sm text-[#202020]">
                  Danh mục Tiêu chuẩn Checklist ({checklistTemplate.length} tiêu chuẩn)
                </h2>
                <span className="text-[11px] font-ui font-semibold px-2 py-0.5 rounded-[4px] bg-[#fcf0f5] text-[#b13460] border border-[#f3c2d4]">
                  5 Giai đoạn
                </span>
              </div>
              <p className="text-xs text-[#71717a] font-ui mt-0.5">
                Thêm, sửa, xoá và thay đổi vị trí các tiêu chuẩn để làm sườn mẫu chuẩn hóa triển khai dự án toàn bộ phận.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleResetChecklistDefaults}
                className="px-3 py-1.5 rounded-[6px] border border-[#d4d4d8] text-xs font-ui text-[#52525b] hover:bg-[#f4f4f5] flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Khôi phục lại 34 tiêu chuẩn mẫu ban đầu của Ban Sản phẩm"
              >
                <RotateCcw className="w-3 h-3 text-[#71717a]" />
                <span>Khôi phục 34 mục gốc</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenAddChecklistItem()}
                className="px-3.5 py-1.5 rounded-[6px] bg-[#963861] hover:bg-[#832e52] text-white text-xs font-ui font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
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
              className={`px-3 py-1.5 text-xs font-ui rounded-[6px] font-semibold transition-colors cursor-pointer shrink-0 ${
                checklistFilterPhase === 'all'
                  ? 'bg-[#963861] text-white'
                  : 'bg-[#f4f4f5] text-[#52525b] hover:bg-[#e4e4e7]'
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
                  className={`px-3 py-1.5 text-xs font-ui rounded-[6px] font-semibold transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#963861] text-white'
                      : 'bg-[#f4f4f5] text-[#52525b] hover:bg-[#e4e4e7]'
                  }`}
                >
                  <span>GĐ {p.id}: {p.shortTitle}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-num font-bold ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-[#e4e4e7] text-[#52525b]'
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
                  className="border border-[#e4e4e7] rounded-[10px] overflow-hidden bg-white shadow-2xs"
                >
                  {/* Phase Group Header */}
                  <div className="px-4 py-3 bg-[#fafafa] border-b border-[#e4e4e7] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-ui font-bold px-2.5 py-0.5 rounded-[4px] border ${phase.badgeColor}`}>
                        Giai đoạn {phase.id}
                      </span>
                      <h3 className="font-ui font-bold text-xs sm:text-sm text-[#202020]">
                        {phase.title}
                      </h3>
                      <span className="text-xs font-ui text-[#71717a]">
                        ({phaseItems.length} tiêu chuẩn)
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenAddChecklistItem(phase.id)}
                      className="px-2.5 py-1 rounded-[6px] bg-white border border-[#d4d4d8] hover:border-[#963861] text-[#963861] text-xs font-ui font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs self-start sm:self-auto"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Thêm mục vào GĐ {phase.id}</span>
                    </button>
                  </div>

                  {/* Items List */}
                  {phaseItems.length === 0 ? (
                    <div className="p-6 text-center text-xs text-[#71717a] italic">
                      Chưa có tiêu chuẩn nào trong giai đoạn này. Nhấn "Thêm mục vào GĐ {phase.id}" để bổ sung.
                    </div>
                  ) : (
                    <div className="divide-y divide-[#f0f0f0]">
                      {phaseItems.map((item, idx) => {
                        const isFirst = idx === 0;
                        const isLast = idx === phaseItems.length - 1;
                        return (
                          <div
                            key={item.id}
                            className="p-3 sm:px-4 sm:py-3 hover:bg-[#fafafa] flex items-start justify-between gap-3 transition-colors group"
                          >
                            {/* Order & Text */}
                            <div className="flex items-start gap-2.5 min-w-0 flex-1">
                              <span className="font-num text-xs font-bold text-[#963861] bg-[#fcf0f5] px-2 py-0.5 rounded border border-[#f3c2d4] shrink-0 mt-0.5">
                                {phase.id}.{idx + 1}
                              </span>
                              <p className="font-ui text-xs text-[#202020] leading-relaxed pt-0.5">
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
                                className={`p-1.5 rounded-[4px] border transition-colors ${
                                  isFirst
                                    ? 'text-[#d4d4d8] border-transparent cursor-not-allowed'
                                    : 'text-[#52525b] hover:text-[#963861] hover:bg-[#fcf0f5] border-[#e4e4e7] hover:border-[#f3c2d4] cursor-pointer'
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
                                className={`p-1.5 rounded-[4px] border transition-colors ${
                                  isLast
                                    ? 'text-[#d4d4d8] border-transparent cursor-not-allowed'
                                    : 'text-[#52525b] hover:text-[#963861] hover:bg-[#fcf0f5] border-[#e4e4e7] hover:border-[#f3c2d4] cursor-pointer'
                                }`}
                                title={isLast ? 'Đã ở vị trí cuối cùng' : 'Di chuyển xuống'}
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>

                              {/* Edit */}
                              <button
                                type="button"
                                onClick={() => handleOpenEditChecklistItem(item)}
                                className="p-1.5 rounded-[4px] border border-[#e4e4e7] hover:border-[#3b82f6] text-[#52525b] hover:text-[#2563eb] hover:bg-[#eff6ff] transition-colors cursor-pointer"
                                title="Chỉnh sửa tiêu chuẩn"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete */}
                              <button
                                type="button"
                                onClick={() => setDeletingChecklistItem(item)}
                                className="p-1.5 rounded-[4px] border border-[#e4e4e7] hover:border-[#fda4af] text-[#52525b] hover:text-[#e11d48] hover:bg-[#fff1f2] transition-colors cursor-pointer"
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
        <div className="bg-white rounded-[12px] border border-[#e0e0e0] shadow-2xs overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-[#f0f0f0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#fafafa]">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1 rounded bg-[#963861]/10 text-[#963861]">
                  <RotateCw className="w-4 h-4" />
                </span>
                <h3 className="font-ui font-bold text-sm text-[#202020]">
                  Danh sách Quy tắc Giao việc Chu kỳ
                </h3>
                <span className="text-[11px] font-semibold text-[#963861] bg-[#fcf0f5] border border-[#f3c2d4] px-2 py-0.5 rounded-full">
                  {recurringRules.length} quy tắc
                </span>
              </div>
              <p className="text-xs text-[#71717a] font-ui mt-1">
                Tự động tạo task mới cho nhân sự vào lúc 08:00 AM các ngày theo chu kỳ lặp lại (Weekly, Biweekly, Monthly).
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenAddRecurring}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#963861] hover:bg-[#b13460] text-white text-xs font-ui font-bold rounded-[6px] shadow-2xs transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Thêm việc chu kỳ
            </button>
          </div>

          {/* Table list of recurring rules */}
          {recurringRules.length === 0 ? (
            <div className="p-12 text-center text-[#71717a] font-ui text-xs">
              <RotateCw className="w-8 h-8 text-[#d4d4d8] mx-auto mb-2" />
              Chưa có quy tắc việc chu kỳ nào được thiết lập.
              <div className="mt-3">
                <button
                  type="button"
                  onClick={handleOpenAddRecurring}
                  className="px-3 py-1.5 bg-[#f4f4f5] hover:bg-[#e4e4e7] text-[#202020] text-xs font-ui font-semibold rounded-[6px] border border-[#d4d4d8] transition-colors cursor-pointer"
                >
                  + Tạo quy tắc đầu tiên
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-ui border-collapse">
                <thead>
                  <tr className="border-b border-[#f0f0f0] bg-[#fafafa] text-[#71717a] font-bold">
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
                <tbody className="divide-y divide-[#f0f0f0]">
                  {recurringRules.map((rule) => {
                    const isPaused = rule.status === 'paused';
                    return (
                      <tr
                        key={rule.id}
                        className={`hover:bg-[#fafafa] transition-colors ${
                          isPaused ? 'opacity-60 bg-[#fbfbfb]' : ''
                        }`}
                      >
                        <td className="py-3 px-4 font-semibold text-[#202020] max-w-[240px]">
                          <div className="flex items-center gap-2">
                            <span className="text-[#963861] shrink-0">
                              <RotateCw className="w-3.5 h-3.5" />
                            </span>
                            <span className="truncate" title={rule.title}>
                              {rule.title}
                            </span>
                          </div>
                          {rule.priority === 'Khẩn cấp' && (
                            <span className="inline-block mt-0.5 text-[10px] font-bold text-[#ef4444] bg-[#fee2e2] px-1.5 py-0.2 rounded">
                              Khẩn cấp
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-[#52525b] max-w-[160px] truncate" title={rule.projectName}>
                          {rule.projectName}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-[#202020]">{rule.assignee}</span>
                          <span className="block text-[11px] text-[#71717a]">{rule.team}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-[#f0fdf4] text-[#16a34a] border border-[#bbf7d0]">
                            {formatFrequencyLabel(rule.frequency)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[#71717a]">
                          {formatEndTypeLabel(rule)}
                        </td>
                        <td className="py-3 px-4 font-ui">
                          <span className="font-semibold text-[#202020]">
                            {rule.nextRunDate}
                          </span>
                          <span className="block text-[11px] text-[#71717a]">
                            {rule.nextRunTime || '08:00'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {isPaused ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#71717a] bg-[#f4f4f5] px-2 py-0.5 rounded border border-[#e4e4e7]">
                              <Pause className="w-3 h-3 text-[#71717a]" /> Tạm dừng
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#16a34a] bg-[#ecfdf5] px-2 py-0.5 rounded border border-[#a7f3d0]">
                              <Play className="w-3 h-3 text-[#16a34a] fill-current" /> Đang chạy
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Run now */}
                            <button
                              type="button"
                              onClick={() => handleTriggerRunNow(rule.id)}
                              className="p-1.5 rounded-[4px] border border-[#e4e4e7] hover:border-[#16a34a] text-[#52525b] hover:text-[#16a34a] hover:bg-[#f0fdf4] transition-colors cursor-pointer"
                              title="Tạo ngay 1 task cho hôm nay"
                            >
                              <Zap className="w-3.5 h-3.5" />
                            </button>

                            {/* Pause / Resume */}
                            <button
                              type="button"
                              onClick={() => handleTogglePauseRecurring(rule.id)}
                              className={`p-1.5 rounded-[4px] border transition-colors cursor-pointer ${
                                isPaused
                                  ? 'border-[#bbf7d0] text-[#16a34a] hover:bg-[#f0fdf4]'
                                  : 'border-[#e4e4e7] text-[#52525b] hover:text-[#d97706] hover:bg-[#fffbeb]'
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
                              className="p-1.5 rounded-[4px] border border-[#e4e4e7] hover:border-[#3b82f6] text-[#52525b] hover:text-[#2563eb] hover:bg-[#eff6ff] transition-colors cursor-pointer"
                              title="Chỉnh sửa quy tắc"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={() => handleDeleteRecurring(rule.id)}
                              className="p-1.5 rounded-[4px] border border-[#e4e4e7] hover:border-[#fda4af] text-[#52525b] hover:text-[#e11d48] hover:bg-[#fff1f2] transition-colors cursor-pointer"
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
        <div className="bg-white rounded-[12px] border border-[#e0e0e0] shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-[#f0f0f0] bg-[#fafafa]">
            <h2 className="font-ui font-bold text-sm text-[#202020]">
              Phân quyền tài khoản Ban Sản phẩm - Công nghệ ({productMembers.length})
            </h2>
            <p className="text-[11px] font-ui text-[#71717a] mt-1">
              Admin: toàn quyền hệ thống · Manager: quản lý dự án/nhân sự mình phụ trách · Executive: chỉ sửa/xoá việc do mình tạo hoặc được giao.
            </p>
          </div>

          <div className="divide-y divide-[#f0f0f0]">
            {productMembers.map((member) => {
              const currentRole = getUserRole(member);
              const roleInfo = getRoleDisplayInfo(currentRole);
              return (
                <div
                  key={member.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-[#f4f4f5] border border-[#e4e4e7] flex items-center justify-center text-xs font-ui font-bold text-[#52525b] shrink-0">
                      {(member.name || '?').trim().charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-ui font-bold text-[#202020] truncate">{member.name}</p>
                      <p className="text-[11px] font-ui text-[#71717a] truncate">
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
                      className="text-xs font-ui border border-[#e4e4e7] rounded-[6px] px-2 py-1.5 text-[#202020] focus:outline-none focus:ring-2 focus:ring-[#963861]/30 cursor-pointer"
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
            <div className="p-3 bg-[#f0fdf4] border-t border-[#bbf7d0] text-xs font-ui text-[#15803d] font-bold">
              {permToast}
            </div>
          )}
        </div>
      )}
        </div>
      </div>

      {/* MODAL: THÊM / SỬA NGÀY LỄ */}
      {isHolidayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-fade-in">
          <div className="bg-white rounded-[12px] border border-[#e0e0e0] max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#f0f0f0] pb-3">
              <h3 className="font-ui font-bold text-sm text-[#202020]">
                {editingHoliday ? 'Sửa ngày lễ' : 'Thêm ngày lễ'}
              </h3>
              <button
                type="button"
                onClick={() => setIsHolidayModalOpen(false)}
                className="p-1 rounded text-[#71717a] hover:text-[#202020] hover:bg-[#f0f0f0]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveHoliday} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-ui font-bold text-[#3f3f46]">
                  Tên ngày lễ:
                </label>
                <input
                  type="text"
                  required
                  value={holidayName}
                  onChange={(e) => setHolidayName(e.target.value)}
                  placeholder="VD: Nghỉ lễ Quốc Khánh 2/9"
                  className="w-full px-3 py-2 border border-[#d4d4d8] rounded-[6px] text-xs font-ui text-[#202020] focus:border-[#963861]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-ui font-bold text-[#3f3f46]">
                    Từ ngày:
                  </label>
                  <input
                    type="date"
                    required
                    value={holidayStartDate}
                    onChange={(e) => setHolidayStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-[#d4d4d8] rounded-[6px] text-xs font-num text-[#202020] focus:border-[#963861]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-ui font-bold text-[#3f3f46]">
                    Đến ngày:
                  </label>
                  <input
                    type="date"
                    value={holidayEndDate}
                    onChange={(e) => setHolidayEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-[#d4d4d8] rounded-[6px] text-xs font-num text-[#202020] focus:border-[#963861]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#f0f0f0]">
                <button
                  type="button"
                  onClick={() => setIsHolidayModalOpen(false)}
                  className="px-4 py-2 rounded-[6px] border border-[#d4d4d8] text-xs font-ui font-semibold text-[#52525b] hover:bg-[#f4f4f5]"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-[6px] bg-[#963861] hover:bg-[#832e52] text-white text-xs font-ui font-bold shadow-xs cursor-pointer"
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
          <div className="bg-white rounded-[12px] border border-[#e0e0e0] max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#f0f0f0] pb-3">
              <h3 className="font-ui font-bold text-sm text-[#202020]">
                {editingCompensatory ? 'Sửa ngày làm bù' : 'Thêm ngày làm bù'}
              </h3>
              <button
                type="button"
                onClick={() => setIsCompensatoryModalOpen(false)}
                className="p-1 rounded text-[#71717a] hover:text-[#202020] hover:bg-[#f0f0f0]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCompensatory} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-ui font-bold text-[#3f3f46]">
                  Lý do làm bù:
                </label>
                <input
                  type="text"
                  required
                  value={compName}
                  onChange={(e) => setCompName(e.target.value)}
                  placeholder="VD: Làm bù hoán đổi ngày 29/04"
                  className="w-full px-3 py-2 border border-[#d4d4d8] rounded-[6px] text-xs font-ui text-[#202020] focus:border-[#963861]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-ui font-bold text-[#3f3f46]">
                  Ngày làm bù (Thứ Bảy hoặc Chủ Nhật):
                </label>
                <input
                  type="date"
                  required
                  value={compDate}
                  onChange={(e) => setCompDate(e.target.value)}
                  className="w-full px-3 py-2 border border-[#d4d4d8] rounded-[6px] text-xs font-num text-[#202020] focus:border-[#963861]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-ui font-bold text-[#3f3f46]">
                  Ghi chú:
                </label>
                <input
                  type="text"
                  value={compNote}
                  onChange={(e) => setCompNote(e.target.value)}
                  placeholder="Ghi chú thêm (nếu có)"
                  className="w-full px-3 py-2 border border-[#d4d4d8] rounded-[6px] text-xs font-ui text-[#202020] focus:border-[#963861]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#f0f0f0]">
                <button
                  type="button"
                  onClick={() => setIsCompensatoryModalOpen(false)}
                  className="px-4 py-2 rounded-[6px] border border-[#d4d4d8] text-xs font-ui font-semibold text-[#52525b] hover:bg-[#f4f4f5]"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-[6px] bg-[#963861] hover:bg-[#832e52] text-white text-xs font-ui font-bold shadow-xs cursor-pointer"
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
          <div className="bg-white rounded-[12px] border border-[#e0e0e0] max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#f0f0f0] pb-3">
              <h3 className="font-ui font-bold text-sm text-[#202020]">
                {editingLeave ? 'Sửa đơn nghỉ' : 'Thêm đơn nghỉ'}
              </h3>
              <button
                type="button"
                onClick={() => setIsLeaveModalOpen(false)}
                className="p-1 rounded text-[#71717a] hover:text-[#202020] hover:bg-[#f0f0f0]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveLeave} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-ui font-bold text-[#3f3f46]">
                  Nhân sự:
                </label>
                <select
                  value={leaveMemberName}
                  onChange={(e) => setLeaveMemberName(e.target.value)}
                  className="w-full px-3 py-2 border border-[#d4d4d8] rounded-[6px] text-xs font-ui text-[#202020] focus:border-[#963861]"
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
                <label className="block text-xs font-ui font-bold text-[#3f3f46]">
                  Buổi nghỉ:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setLeaveSession('all_day')}
                    className={`p-2 rounded-[6px] border text-xs font-ui font-medium flex items-center justify-center gap-1 cursor-pointer transition-all ${
                      leaveSession === 'all_day'
                        ? 'bg-[#963861] text-white border-[#963861] font-bold shadow-xs'
                        : 'bg-[#fafafa] text-[#52525b] border-[#d4d4d8] hover:bg-[#f4f4f5]'
                    }`}
                  >
                    <span>Cả ngày</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLeaveSession('morning')}
                    className={`p-2 rounded-[6px] border text-xs font-ui font-medium flex items-center justify-center gap-1 cursor-pointer transition-all ${
                      leaveSession === 'morning'
                        ? 'bg-[#963861] text-white border-[#963861] font-bold shadow-xs'
                        : 'bg-[#fafafa] text-[#52525b] border-[#d4d4d8] hover:bg-[#f4f4f5]'
                    }`}
                  >
                    <Sunrise className="w-3.5 h-3.5" />
                    <span>Sáng (0.5)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLeaveSession('afternoon')}
                    className={`p-2 rounded-[6px] border text-xs font-ui font-medium flex items-center justify-center gap-1 cursor-pointer transition-all ${
                      leaveSession === 'afternoon'
                        ? 'bg-[#963861] text-white border-[#963861] font-bold shadow-xs'
                        : 'bg-[#fafafa] text-[#52525b] border-[#d4d4d8] hover:bg-[#f4f4f5]'
                    }`}
                  >
                    <Sunset className="w-3.5 h-3.5" />
                    <span>Chiều (0.5)</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-ui font-bold text-[#3f3f46]">
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
                    className="w-full px-3 py-2 border border-[#d4d4d8] rounded-[6px] text-xs font-num text-[#202020] focus:border-[#963861]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-ui font-bold text-[#3f3f46]">
                    Đến ngày:
                  </label>
                  <input
                    type="date"
                    disabled={leaveSession !== 'all_day'}
                    value={leaveSession !== 'all_day' ? leaveStartDate : leaveEndDate}
                    onChange={(e) => setLeaveEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-[#d4d4d8] rounded-[6px] text-xs font-num text-[#202020] focus:border-[#963861] disabled:bg-[#f4f4f5] disabled:text-[#a1a1aa]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-ui font-bold text-[#3f3f46]">
                  Lý do:
                </label>
                <input
                  type="text"
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  placeholder="VD: Nghỉ phép năm, việc gia đình..."
                  className="w-full px-3 py-2 border border-[#d4d4d8] rounded-[6px] text-xs font-ui text-[#202020] focus:border-[#963861]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-ui font-bold text-[#3f3f46]">
                  Trạng thái:
                </label>
                <select
                  value={leaveStatus}
                  onChange={(e) => setLeaveStatus(e.target.value as any)}
                  className="w-full px-3 py-2 border border-[#d4d4d8] rounded-[6px] text-xs font-ui text-[#202020] focus:border-[#963861]"
                >
                  <option value="Đã duyệt">Đã duyệt (Trừ vào ngày làm việc)</option>
                  <option value="Chờ duyệt">Chờ duyệt</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#f0f0f0]">
                <button
                  type="button"
                  onClick={() => setIsLeaveModalOpen(false)}
                  className="px-4 py-2 rounded-[6px] border border-[#d4d4d8] text-xs font-ui font-semibold text-[#52525b] hover:bg-[#f4f4f5]"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-[6px] bg-[#963861] hover:bg-[#832e52] text-white text-xs font-ui font-bold shadow-xs cursor-pointer"
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
          <div className="bg-white rounded-[12px] border border-[#e0e0e0] max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#f0f0f0] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#fcf0f5] border border-[#f3c2d4] text-[#963861] flex items-center justify-center font-bold">
                  <CheckSquare className="w-3.5 h-3.5" />
                </div>
                <h3 className="font-ui font-bold text-sm text-[#202020]">
                  {editingChecklistItem ? 'Chỉnh sửa tiêu chuẩn Checklist' : 'Thêm tiêu chuẩn mới vào Checklist'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsChecklistModalOpen(false)}
                className="p-1 rounded text-[#71717a] hover:text-[#202020] hover:bg-[#f0f0f0]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveChecklistItem} className="space-y-4">
              {/* Chọn Giai đoạn */}
              <div className="space-y-1.5">
                <label className="block text-xs font-ui font-bold text-[#3f3f46]">
                  Thuộc giai đoạn: <span className="text-[#e11d48]">*</span>
                </label>
                <select
                  value={itemPhaseId}
                  onChange={(e) => setItemPhaseId(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-[#d4d4d8] rounded-[6px] text-xs font-ui text-[#202020] bg-white focus:border-[#963861]"
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
                  <label className="block text-xs font-ui font-bold text-[#3f3f46]">
                    Vị trí trong giai đoạn:
                  </label>
                  <div className="flex items-center gap-4 pt-0.5">
                    <label className="inline-flex items-center gap-1.5 text-xs font-ui text-[#52525b] cursor-pointer">
                      <input
                        type="radio"
                        name="insertPosition"
                        value="end"
                        checked={itemInsertPosition === 'end'}
                        onChange={() => setItemInsertPosition('end')}
                        className="accent-[#963861]"
                      />
                      <span>Thêm vào cuối giai đoạn</span>
                    </label>
                    <label className="inline-flex items-center gap-1.5 text-xs font-ui text-[#52525b] cursor-pointer">
                      <input
                        type="radio"
                        name="insertPosition"
                        value="start"
                        checked={itemInsertPosition === 'start'}
                        onChange={() => setItemInsertPosition('start')}
                        className="accent-[#963861]"
                      />
                      <span>Thêm vào đầu giai đoạn</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Nội dung tiêu chuẩn */}
              <div className="space-y-1.5">
                <label className="block text-xs font-ui font-bold text-[#3f3f46]">
                  Nội dung tiêu chuẩn / câu hỏi kiểm tra: <span className="text-[#e11d48]">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={itemText}
                  onChange={(e) => setItemText(e.target.value)}
                  placeholder="Nhập nội dung tiêu chuẩn rõ ràng, súc tích (VD: Đã có spec tracking chi tiết theo chuẩn ITM/ADP chưa?)..."
                  className="w-full px-3 py-2 border border-[#d4d4d8] rounded-[6px] text-xs font-ui text-[#202020] focus:border-[#963861]"
                  autoFocus
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#f0f0f0]">
                <button
                  type="button"
                  onClick={() => setIsChecklistModalOpen(false)}
                  className="px-4 py-2 rounded-[6px] border border-[#d4d4d8] text-xs font-ui font-semibold text-[#52525b] hover:bg-[#f4f4f5] cursor-pointer"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-[6px] bg-[#963861] hover:bg-[#832e52] text-white text-xs font-ui font-bold shadow-xs cursor-pointer"
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
          <div className="bg-white rounded-[12px] border border-[#e0e0e0] max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-[#e11d48]">
              <div className="w-10 h-10 rounded-full bg-[#fff1f2] border border-[#fda4af] flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-[#e11d48]" />
              </div>
              <div>
                <h3 className="font-ui font-bold text-sm text-[#202020]">
                  Xác nhận xoá tiêu chuẩn
                </h3>
                <p className="text-xs text-[#71717a] font-ui">
                  Tiêu chuẩn này sẽ bị gỡ bỏ khỏi Master Checklist mẫu.
                </p>
              </div>
            </div>

            <div className="p-3 bg-[#fafafa] rounded-[8px] border border-[#e4e4e7] text-xs font-ui text-[#3f3f46]">
              {deletingChecklistItem.text}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#f0f0f0]">
              <button
                type="button"
                onClick={() => setDeletingChecklistItem(null)}
                className="px-4 py-2 rounded-[6px] border border-[#d4d4d8] text-xs font-ui font-semibold text-[#52525b] hover:bg-[#f4f4f5] cursor-pointer"
              >
                Huỷ
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteChecklistItem}
                className="px-4 py-2 rounded-[6px] bg-[#e11d48] hover:bg-[#be123c] text-white text-xs font-ui font-bold shadow-xs cursor-pointer"
              >
                Xoá tiêu chuẩn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING TOAST NOTIFICATION */}
      {checklistToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#202020] text-white px-4 py-2.5 rounded-[8px] shadow-lg text-xs font-ui flex items-center gap-2 animate-fade-in border border-[#404040]">
          <CheckCircle2 className="w-4 h-4 text-[#4ade80]" />
          <span>{checklistToast}</span>
        </div>
      )}

      {/* MODAL: THÊM / SỬA QUY TẮC VIỆC CHU KỲ */}
      {isRecurringModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-fade-in">
          <div className="bg-white rounded-[12px] border border-[#e0e0e0] max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#f0f0f0] pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded bg-[#963861]/10 text-[#963861]">
                  <RotateCw className="w-4 h-4" />
                </span>
                <h3 className="font-ui font-bold text-sm text-[#202020]">
                  {editingRecurringRule ? 'Sửa quy tắc việc chu kỳ' : 'Thêm việc chu kỳ mới'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRecurringModalOpen(false)}
                className="p-1 rounded text-[#71717a] hover:text-[#202020] hover:bg-[#f0f0f0] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRecurringRule} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-ui font-bold text-[#3f3f46]">
                  Tiêu đề công việc:
                </label>
                <input
                  type="text"
                  required
                  value={recTitle}
                  onChange={(e) => setRecTitle(e.target.value)}
                  placeholder="Ví dụ: Báo cáo số liệu traffic tuần, Kiểm tra checklist SEO..."
                  className="w-full px-3 py-2 text-xs font-ui border border-[#d4d4d8] rounded-[6px] focus:outline-none focus:border-[#963861]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-ui font-bold text-[#3f3f46]">
                    Dự án:
                  </label>
                  <select
                    value={recProjectId}
                    onChange={(e) => {
                      setRecProjectId(e.target.value);
                      setRecPhaseId('');
                    }}
                    className="w-full px-3 py-2 text-xs font-ui border border-[#d4d4d8] rounded-[6px] bg-white focus:outline-none focus:border-[#963861]"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-ui font-bold text-[#3f3f46]">
                    Giai đoạn (tuỳ chọn):
                  </label>
                  <select
                    value={recPhaseId}
                    onChange={(e) => setRecPhaseId(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-ui border border-[#d4d4d8] rounded-[6px] bg-white focus:outline-none focus:border-[#963861]"
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
                  <label className="block text-xs font-ui font-bold text-[#3f3f46]">
                    Nhân sự phụ trách:
                  </label>
                  <select
                    value={recAssignee}
                    onChange={(e) => setRecAssignee(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-ui border border-[#d4d4d8] rounded-[6px] bg-white focus:outline-none focus:border-[#963861]"
                  >
                    {productMembers.map((m) => (
                      <option key={m.id} value={m.name}>
                        {m.name} ({m.team})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-ui font-bold text-[#3f3f46]">
                    Mức độ ưu tiên:
                  </label>
                  <div className="pt-2">
                    <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-ui font-medium text-[#202020]">
                      <input
                        type="checkbox"
                        checked={recPriority === 'Khẩn cấp'}
                        onChange={(e) =>
                          setRecPriority(e.target.checked ? 'Khẩn cấp' : 'Bình thường')
                        }
                        className="w-4 h-4 rounded text-[#ef4444] focus:ring-[#ef4444]"
                      />
                      <span>🚨 Khẩn cấp</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-[#f0f0f0]">
                <div className="space-y-1.5">
                  <label className="block text-xs font-ui font-bold text-[#3f3f46]">
                    Chu kỳ lặp (Repeat):
                  </label>
                  <select
                    value={recFrequency}
                    onChange={(e) => setRecFrequency(e.target.value as RecurrenceFrequency)}
                    className="w-full px-3 py-2 text-xs font-ui border border-[#d4d4d8] rounded-[6px] bg-white focus:outline-none focus:border-[#963861] font-semibold text-[#963861]"
                  >
                    <option value="weekly">Hàng tuần (Weekly)</option>
                    <option value="biweekly">2 tuần một lần (Biweekly)</option>
                    <option value="monthly">Hàng tháng (Monthly)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-ui font-bold text-[#3f3f46]">
                    Kết thúc lặp (End Repeat):
                  </label>
                  <select
                    value={recEndType}
                    onChange={(e) => setRecEndType(e.target.value as RecurrenceEndType)}
                    className="w-full px-3 py-2 text-xs font-ui border border-[#d4d4d8] rounded-[6px] bg-white focus:outline-none focus:border-[#963861]"
                  >
                    <option value="never">Không bao giờ (Never)</option>
                    <option value="specific_date">Chọn ngày cụ thể</option>
                  </select>
                </div>
              </div>

              {recEndType === 'specific_date' && (
                <div className="space-y-1.5 p-3 bg-[#fafafa] rounded-[6px] border border-[#e4e4e7]">
                  <label className="block text-xs font-ui font-bold text-[#3f3f46]">
                    Ngày kết thúc lặp:
                  </label>
                  <input
                    type="date"
                    required={recEndType === 'specific_date'}
                    value={recEndDate}
                    onChange={(e) => setRecEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-ui border border-[#d4d4d8] rounded-[6px] bg-white focus:outline-none focus:border-[#963861]"
                  />
                </div>
              )}

              <div className="text-[11px] text-[#71717a] font-ui bg-[#fcf0f5] p-2.5 rounded-[6px] border border-[#f3c2d4]">
                ℹ️ Hệ thống sẽ tự động tạo task mới lúc <strong>08:00 AM</strong> vào ngày chu kỳ tiếp theo với trạng thái <em>Chưa làm</em> và gửi thông báo cho nhân sự.
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#f0f0f0]">
                <button
                  type="button"
                  onClick={() => setIsRecurringModalOpen(false)}
                  className="px-4 py-2 rounded-[6px] border border-[#d4d4d8] text-xs font-ui font-semibold text-[#52525b] hover:bg-[#f4f4f5] cursor-pointer"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-[6px] bg-[#963861] hover:bg-[#b13460] text-white text-xs font-ui font-bold shadow-xs cursor-pointer"
                >
                  {editingRecurringRule ? 'Lưu thay đổi' : 'Tạo quy tắc'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FLOATING TOAST FOR RECURRING */}
      {recToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#202020] text-white px-4 py-2.5 rounded-[8px] shadow-lg text-xs font-ui flex items-center gap-2 animate-fade-in border border-[#404040]">
          <CheckCircle2 className="w-4 h-4 text-[#4ade80]" />
          <span>{recToast}</span>
        </div>
      )}
    </div>
  );
};
