/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ProjectItem,
  MemberItem,
  TeamType,
  PriorityLevel,
  TaskItem,
  RecurrenceFrequency,
} from '../types';
import {
  X,
  Plus,
  Calendar,
  User,
  Briefcase,
  Layers,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  Check,
} from 'lucide-react';
import { formatDateWithEnDay } from '../utils/formatters';
import { getProductMembers } from '../utils/memberPersonalization';
import { getTodayDateString } from '../utils/dateUtils';
import { getTaskCreationProjectGroups } from '../utils/projectSortingUtils';

export interface MobileQuickAddDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  projects: ProjectItem[];
  tasks?: TaskItem[];
  members: MemberItem[];
  onAddTask: (task: {
    id?: string;
    title: string;
    projectId: string;
    projectName: string;
    phaseId?: string;
    phaseName?: string;
    team: TeamType;
    assignee: string;
    dueDate: string;
    priority: PriorityLevel;
    details?: string;
    recurringRuleId?: string;
    isRecurring?: boolean;
    recurringFrequency?: RecurrenceFrequency;
  }) => void;
  defaultProjectId?: string;
  defaultAssignee?: string;
  currentUser?: MemberItem | null;
}

export const MobileQuickAddDrawer: React.FC<MobileQuickAddDrawerProps> = ({
  isOpen,
  onClose,
  projects,
  tasks = [],
  members,
  onAddTask,
  defaultProjectId,
  defaultAssignee,
  currentUser,
}) => {
  const productMembers = useMemo(() => getProductMembers(members), [members]);
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState(
    defaultAssignee || currentUser?.name || productMembers[0]?.name || 'Hệ thống'
  );

  // Tính các mảng ngày nhanh
  const todayStr = useMemo(() => getTodayDateString(), []);
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return getTodayDateString(d);
  }, []);

  const [dueDate, setDueDate] = useState<string>(todayStr);
  const [isUrgent, setIsUrgent] = useState(false);
  const [projectId, setProjectId] = useState<string>('');
  const [phaseId, setPhaseId] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);
  const customDateInputRef = useRef<HTMLInputElement>(null);

  // Group dự án thông minh
  const projectGroups = useMemo(() => {
    return getTaskCreationProjectGroups(projects, assignee, members, tasks);
  }, [projects, assignee, members, tasks]);

  // Khởi tạo/cập nhật dự án mặc định khi mở drawer
  useEffect(() => {
    if (isOpen) {
      if (defaultProjectId && projects.some((p) => p.id === defaultProjectId)) {
        setProjectId(defaultProjectId);
      } else {
        const fallback =
          projectGroups.myProjects[0]?.id ||
          projectGroups.otherProjects[0]?.id ||
          projectGroups.unspecifiedProject?.id ||
          projects[0]?.id ||
          'proj-others';
        setProjectId(fallback);
      }

      if (defaultAssignee) {
        setAssignee(defaultAssignee);
      } else if (currentUser?.name) {
        setAssignee(currentUser.name);
      }

      setDueDate(todayStr);
      setIsUrgent(false);
      setErrorMsg('');

      // Auto-focus input
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [isOpen, defaultProjectId, defaultAssignee, currentUser, projects, projectGroups, todayStr]);

  const selectedProj = useMemo(
    () => projects.find((p) => p.id === projectId),
    [projects, projectId]
  );
  const availablePhases = selectedProj?.phases || [];

  const handleProjectSelect = (pId: string) => {
    setProjectId(pId);
    const p = projects.find((item) => item.id === pId);
    if (p && p.phases && p.phases.length > 0) {
      setPhaseId(p.phases[0].id);
    } else {
      setPhaseId('');
    }
  };

  const handleQuickDateSelect = (dateVal: string) => {
    setDueDate(dateVal);
  };

  const handleOpenNativeDatePicker = () => {
    try {
      customDateInputRef.current?.showPicker?.();
    } catch (_) {
      customDateInputRef.current?.focus();
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Vui lòng nhập tên công việc');
      inputRef.current?.focus();
      return;
    }

    const projName = selectedProj ? selectedProj.name : 'Chưa xác định (Others)';
    const foundPhase = availablePhases.find((ph) => ph.id === phaseId);
    const selectedMember = members.find((m) => m.name === assignee);
    const team: TeamType = selectedMember?.team || 'Product Manager';
    const finalDueDate = dueDate || todayStr;

    onAddTask({
      title: title.trim(),
      projectId,
      projectName: projName,
      phaseId: foundPhase ? foundPhase.id : undefined,
      phaseName: foundPhase ? foundPhase.name : undefined,
      team,
      assignee,
      dueDate: finalDueDate,
      priority: isUrgent ? 'Khẩn cấp' : 'Bình thường',
    });

    setTitle('');
    onClose();
  };

  if (!isOpen) return null;

  const isTodayActive = dueDate === todayStr;
  const isTomorrowActive = dueDate === tomorrowStr;
  const isCustomActive = !isTodayActive && !isTomorrowActive;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex flex-col justify-end md:hidden">
        {/* Backdrop Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/50 backdrop-blur-xs"
        />

        {/* Bottom Sheet Drawer Panel */}
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="relative z-10 w-full bg-white rounded-t-[20px] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border-t border-[#e2e8f0]"
        >
          {/* Grab Handle */}
          <div className="w-full flex items-center justify-center pt-2.5 pb-1">
            <div className="w-10 h-1 bg-[#d4d4d8] rounded-full" />
          </div>

          {/* Header */}
          <div className="px-5 py-3 border-b border-[#f1f5f9] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#963861] text-white flex items-center justify-center shadow-xs">
                <Plus className="w-4 h-4 stroke-[3]" />
              </div>
              <h2 className="font-title text-base font-bold text-[#18181b]">
                Thêm việc nhanh
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-[#71717a] hover:text-[#18181b] hover:bg-[#f4f4f5] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
            {/* Error banner */}
            {errorMsg && (
              <div className="p-2.5 bg-[#fff0f1] border border-[#fbd3d6] text-[#da1e28] text-xs font-bold rounded-[8px] flex items-center gap-2 animate-shake">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* 1. Tiêu đề công việc - Auto-focused, bàn phím tối ưu */}
            <div className="space-y-1.5">
              <label className="font-ui text-xs font-bold text-[#52525b] flex items-center justify-between">
                <span>Tên công việc <span className="text-[#dc2626]">*</span></span>
                <span className="text-[11px] font-normal text-[#a1a1aa]">Bắt buộc</span>
              </label>
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder="Nhập tên việc cần làm..."
                  className="w-full px-3.5 py-3 rounded-[10px] border border-[#d4d4d8] focus:border-[#963861] focus:ring-2 focus:ring-[#963861]/15 text-sm font-title font-medium text-[#18181b] placeholder-[#a1a1aa] bg-white transition-all outline-hidden shadow-2xs"
                  enterKeyHint="done"
                />
              </div>
            </div>

            {/* 2. Hạn hoàn thành - Quick Chips 1-tap: Hôm nay, Ngày mai, Khác */}
            <div className="space-y-1.5">
              <label className="font-ui text-xs font-bold text-[#52525b] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#963861]" />
                <span>Hạn hoàn thành:</span>
                <span className="text-[11px] font-semibold text-[#963861]">
                  ({formatDateWithEnDay(dueDate)})
                </span>
              </label>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickDateSelect(todayStr)}
                  className={`h-10 px-2 rounded-[8px] border text-xs font-ui font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    isTodayActive
                      ? 'bg-[#963861] text-white border-[#963861] shadow-2xs'
                      : 'bg-[#fafafa] text-[#52525b] border-[#e4e4e7] hover:bg-[#f4f4f5]'
                  }`}
                >
                  {isTodayActive && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  <span>Hôm nay</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDateSelect(tomorrowStr)}
                  className={`h-10 px-2 rounded-[8px] border text-xs font-ui font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    isTomorrowActive
                      ? 'bg-[#963861] text-white border-[#963861] shadow-2xs'
                      : 'bg-[#fafafa] text-[#52525b] border-[#e4e4e7] hover:bg-[#f4f4f5]'
                  }`}
                >
                  {isTomorrowActive && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  <span>Ngày mai</span>
                </button>

                <div
                  onClick={handleOpenNativeDatePicker}
                  className={`relative h-10 px-2 rounded-[8px] border text-xs font-ui font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                    isCustomActive
                      ? 'bg-[#963861] text-white border-[#963861] shadow-2xs'
                      : 'bg-[#fafafa] text-[#52525b] border-[#e4e4e7] hover:bg-[#f4f4f5]'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">
                    {isCustomActive ? dueDate.slice(5) : 'Ngày khác'}
                  </span>
                  <input
                    ref={customDateInputRef}
                    type="date"
                    value={dueDate}
                    onChange={(e) => {
                      if (e.target.value) setDueDate(e.target.value);
                    }}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer pointer-events-auto"
                  />
                </div>
              </div>
            </div>

            {/* 3. Dự án & Giai đoạn */}
            <div className="space-y-1.5">
              <label className="font-ui text-xs font-bold text-[#52525b] flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-[#963861]" />
                <span>Dự án:</span>
              </label>
              <div className="relative">
                <select
                  value={projectId}
                  onChange={(e) => handleProjectSelect(e.target.value)}
                  className="w-full h-11 px-3 rounded-[8px] border border-[#d4d4d8] bg-[#f9f9f9] text-xs font-ui font-semibold text-[#18181b] focus:border-[#963861] focus:bg-white focus:outline-hidden transition-all"
                >
                  {projectGroups.myProjects.length > 0 && (
                    <optgroup label="── Dự án tham gia ──">
                      {projectGroups.myProjects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name.replace(/^Dự án\s+/i, '')}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup
                    label={
                      projectGroups.myProjects.length > 0
                        ? '── Dự án khác ──'
                        : '── Danh sách dự án ──'
                    }
                  >
                    {projectGroups.otherProjects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name.replace(/^Dự án\s+/i, '')}
                      </option>
                    ))}
                  </optgroup>
                  {projectGroups.unspecifiedProject && (
                    <optgroup label="── Khác ──">
                      <option value={projectGroups.unspecifiedProject.id}>
                        {projectGroups.unspecifiedProject.name.replace(/^Dự án\s+/i, '')}
                      </option>
                    </optgroup>
                  )}
                </select>
              </div>

              {/* Giai đoạn (nếu dự án có giai đoạn) */}
              {availablePhases.length > 0 && (
                <div className="pt-1">
                  <div className="flex items-center gap-1.5 bg-[#f9f9f9] px-3 py-2 rounded-[8px] border border-[#e4e4e7]">
                    <Layers className="w-3.5 h-3.5 text-[#71717a] shrink-0" />
                    <select
                      value={phaseId}
                      onChange={(e) => setPhaseId(e.target.value)}
                      className="w-full bg-transparent text-[#18181b] text-xs font-ui focus:outline-hidden cursor-pointer"
                    >
                      <option value="">-- Toàn dự án --</option>
                      {availablePhases.map((ph) => (
                        <option key={ph.id} value={ph.id}>
                          {ph.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* 4. Người phụ trách & Mức độ khẩn cấp (Hàng ngang 2 cột) */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              {/* Assignee */}
              <div className="space-y-1.5">
                <label className="font-ui text-xs font-bold text-[#52525b] flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#71717a]" />
                  <span>Phụ trách:</span>
                </label>
                <select
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                  className="w-full h-10 px-2.5 rounded-[8px] border border-[#d4d4d8] bg-[#f9f9f9] text-xs font-ui text-[#18181b] focus:border-[#963861] focus:bg-white focus:outline-hidden"
                >
                  {productMembers.map((m) => (
                    <option key={m.id} value={m.name}>
                      {m.name} {m.name === currentUser?.name ? '(Tôi)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority Checkbox 1-tap Toggle */}
              <div className="space-y-1.5">
                <label className="font-ui text-xs font-bold text-[#52525b]">
                  Mức độ:
                </label>
                <label
                  className={`h-10 px-2.5 rounded-[8px] border flex items-center gap-2 cursor-pointer transition-all select-none ${
                    isUrgent
                      ? 'bg-[#fff1f2] border-[#fecdd3] text-[#be123c]'
                      : 'bg-[#f9f9f9] border-[#d4d4d8] text-[#52525b]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isUrgent}
                    onChange={(e) => setIsUrgent(e.target.checked)}
                    className="w-4 h-4 text-[#963861] rounded border-[#d4d4d8] focus:ring-[#963861] cursor-pointer"
                  />
                  <span className="text-xs font-ui font-bold">
                    {isUrgent ? '🚨 Khẩn cấp' : 'Bình thường'}
                  </span>
                </label>
              </div>
            </div>

            {/* 5. Nút Thêm công việc - Primary Bottom Action */}
            <div className="pt-2 pb-2">
              <button
                type="submit"
                className="w-full h-12 rounded-[10px] bg-[#963861] hover:bg-[#80284f] active:scale-[0.98] text-white font-ui font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <span>Tạo công việc ngay</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
