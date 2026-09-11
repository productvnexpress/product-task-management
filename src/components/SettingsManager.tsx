/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  WorkingScheduleConfig,
  HolidayItem,
  CompensatoryWorkdayItem,
  MemberLeaveItem,
  LeaveSession,
  MemberItem,
  TaskItem,
  ProjectItem,
} from '../types';
import { workingTimeService, formatWorkingDaysCount } from '../services/workingTimeService';
import { formatDateWithEnDay } from '../utils/formatters';
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
} from 'lucide-react';

interface SettingsManagerProps {
  members: MemberItem[];
  tasks?: TaskItem[];
  projects?: ProjectItem[];
  currentAuthUser?: MemberItem | null;
}

type SettingsTab = 'schedule' | 'holidays' | 'compensatory' | 'leaves' | 'calculator';

export const SettingsManager: React.FC<SettingsManagerProps> = ({
  members,
  currentAuthUser,
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
                <Clock className="w-4 h-4" />
              </div>
              <h1 className="font-title text-xl font-bold text-[#202020]">
                Thời gian làm việc
              </h1>
              <span className="bg-[#ede9fe] text-[#6d28d9] border border-[#ddd6fe] text-[11px] font-ui font-bold px-2 py-0.5 rounded-[4px]">
                Admin
              </span>
            </div>
            <p className="text-xs font-ui text-[#5f5f5f]">
              Lịch làm việc, ngày lễ, làm bù và nghỉ phép dùng tính ngày công nhân sự.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-ui text-[#71717a] bg-[#f4f4f5] px-2.5 py-1 rounded border border-[#e4e4e7]">
              {currentAuthUser?.name || 'Đặng Tiến Ngọc'} (Admin)
            </span>
          </div>
        </div>

        {/* Navigation Tabs - Biên tập ngắn gọn theo EDITOR.md */}
        <div className="flex items-center gap-1 border-b border-[#f0f0f0] pt-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveSubTab('schedule')}
            className={`px-4 py-2.5 text-xs font-ui font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeSubTab === 'schedule'
                ? 'border-[#963861] text-[#963861]'
                : 'border-transparent text-[#71717a] hover:text-[#202020]'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Lịch làm việc</span>
          </button>

          <button
            onClick={() => setActiveSubTab('holidays')}
            className={`px-4 py-2.5 text-xs font-ui font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeSubTab === 'holidays'
                ? 'border-[#963861] text-[#963861]'
                : 'border-transparent text-[#71717a] hover:text-[#202020]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Ngày lễ ({holidays.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('compensatory')}
            className={`px-4 py-2.5 text-xs font-ui font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeSubTab === 'compensatory'
                ? 'border-[#963861] text-[#963861]'
                : 'border-transparent text-[#71717a] hover:text-[#202020]'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5 text-[#b26b00]" />
            <span>Làm bù ({compensatoryList.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('leaves')}
            className={`px-4 py-2.5 text-xs font-ui font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeSubTab === 'leaves'
                ? 'border-[#963861] text-[#963861]'
                : 'border-transparent text-[#71717a] hover:text-[#202020]'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Nghỉ phép ({leaves.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('calculator')}
            className={`px-4 py-2.5 text-xs font-ui font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeSubTab === 'calculator'
                ? 'border-[#963861] text-[#963861]'
                : 'border-transparent text-[#71717a] hover:text-[#202020]'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>Tra cứu ngày công</span>
          </button>
        </div>
      </div>

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
    </div>
  );
};
