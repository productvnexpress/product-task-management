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
  ProjectChecklistItem,
  RecurrenceFrequency,
  RecurrenceEndType,
  RecurringRuleConfig,
} from '../types';
import { Plus, CornerDownLeft, Calendar, User, Briefcase, Layers, ListChecks, RotateCw } from 'lucide-react';
import { formatDateWithEnDay } from '../utils/formatters';
import { getProductMembers } from '../utils/memberPersonalization';
import { getTodayDateString } from '../utils/dateUtils';
import { getTaskCreationProjectGroups, isOthersProject } from '../utils/projectSortingUtils';
import { ProjectChecklistModal } from './ProjectChecklistModal';
import { calculateChecklistStats } from '../data/defaultProjectChecklist';
import { getUserRole } from '../utils/rbac';
import { recurringTaskService, calculateNextCycleDate } from '../services/recurringTaskService';

interface QuickAddBarProps {
  projects: ProjectItem[];
  tasks?: TaskItem[];
  members: MemberItem[];
  onAddTask: (task: {
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
  onUpdateProjectChecklist?: (projectId: string, updatedChecklist: ProjectChecklistItem[]) => void;
  currentUser?: MemberItem | null;
}

export const QuickAddBar: React.FC<QuickAddBarProps> = ({
  projects,
  tasks = [],
  members,
  onAddTask,
  defaultProjectId,
  defaultAssignee,
  onUpdateProjectChecklist,
  currentUser,
}) => {
  const productMembers = getProductMembers(members);
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState(defaultAssignee || productMembers[0]?.name || 'Hệ thống');
  const [isChecklistModalOpen, setIsChecklistModalOpen] = useState(false);

  // Calculate project groups: Group 1 (Participated projects by latest task), Group 2 (Other projects A-Z), Others (Special)
  const projectGroups = useMemo(() => {
    return getTaskCreationProjectGroups(projects, assignee, members, tasks);
  }, [projects, assignee, members, tasks]);

  // Default projectId selection
  const initialProjectId = useMemo(() => {
    if (defaultProjectId && projects.some((p) => p.id === defaultProjectId)) {
      return defaultProjectId;
    }
    return (
      projectGroups.myProjects[0]?.id ||
      projectGroups.otherProjects[0]?.id ||
      projectGroups.unspecifiedProject?.id ||
      projects[0]?.id ||
      'proj-others'
    );
  }, [defaultProjectId, projects, projectGroups]);

  const [projectId, setProjectId] = useState<string>(initialProjectId);
  const [phaseId, setPhaseId] = useState<string>('');

  // Date calculation: default is today, minimum is 7 days ago
  const minDueDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return getTodayDateString(d);
  }, []);

  const [dueDate, setDueDate] = useState<string>(() => getTodayDateString());
  const dateInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = getUserRole(currentUser) === 'Admin';
  const [isUrgent, setIsUrgent] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Recurring task states (Admin only)
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState<RecurrenceFrequency>('weekly');
  const [recurringEndType, setRecurringEndType] = useState<RecurrenceEndType>('never');
  const [recurringEndDate, setRecurringEndDate] = useState<string>('');

  useEffect(() => {
    if (defaultAssignee) {
      setAssignee(defaultAssignee);
    }
  }, [defaultAssignee]);

  useEffect(() => {
    if (defaultProjectId && projects.some((p) => p.id === defaultProjectId)) {
      setProjectId(defaultProjectId);
    }
  }, [defaultProjectId, projects]);

  // Sync projectId if current one becomes invalid
  useEffect(() => {
    if (!projectId || !projects.some((p) => p.id === projectId)) {
      const fallbackId =
        projectGroups.myProjects[0]?.id ||
        projectGroups.otherProjects[0]?.id ||
        projectGroups.unspecifiedProject?.id ||
        projects[0]?.id;
      if (fallbackId) setProjectId(fallbackId);
    }
  }, [projects, projectGroups, projectId]);

  const selectedProj = projects.find((p) => p.id === projectId);
  const availablePhases = selectedProj?.phases || [];

  const checklistStats = useMemo(() => {
    if (!selectedProj || isOthersProject(selectedProj.id)) return null;
    return calculateChecklistStats(selectedProj.checklist);
  }, [selectedProj]);

  const handleProjectSelect = (pId: string) => {
    setProjectId(pId);
    const p = projects.find((item) => item.id === pId);
    if (p && p.phases && p.phases.length > 0) {
      setPhaseId(p.phases[0].id);
    } else {
      setPhaseId('');
    }
  };

  const handleTriggerDatePicker = () => {
    try {
      dateInputRef.current?.showPicker?.();
    } catch (_) {
      dateInputRef.current?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const projName = selectedProj ? selectedProj.name : 'Chưa xác định (Others)';
    const foundPhase = availablePhases.find((ph) => ph.id === phaseId);
    const selectedMember = members.find((m) => m.name === assignee);
    const team: TeamType = selectedMember?.team || 'Product Manager';
    const initialDueDate = dueDate || getTodayDateString();

    let recurringRuleId: string | undefined = undefined;

    // Lưu quy tắc lặp nếu là Admin và bật tính năng chu kỳ
    if (isRecurring && isAdmin) {
      recurringRuleId = `rec-${Date.now()}`;
      const nextRun = calculateNextCycleDate(initialDueDate, recurringFrequency);

      const newRule: RecurringRuleConfig = {
        id: recurringRuleId,
        title: title.trim(),
        projectId,
        projectName: projName,
        phaseId: foundPhase ? foundPhase.id : undefined,
        phaseName: foundPhase ? foundPhase.name : undefined,
        team,
        assignee,
        priority: isUrgent ? 'Khẩn cấp' : 'Bình thường',
        frequency: recurringFrequency,
        endType: recurringEndType,
        endDate: recurringEndType === 'specific_date' && recurringEndDate ? recurringEndDate : undefined,
        nextRunDate: nextRun,
        nextRunTime: '08:00',
        status: 'active',
        createdAt: new Date().toISOString(),
        createdBy: currentUser?.name || 'Admin',
      };

      recurringTaskService.saveRule(newRule);
    }

    onAddTask({
      title: title.trim(),
      projectId,
      projectName: projName,
      phaseId: foundPhase ? foundPhase.id : undefined,
      phaseName: foundPhase ? foundPhase.name : undefined,
      team,
      assignee,
      dueDate: initialDueDate,
      priority: isUrgent ? 'Khẩn cấp' : 'Bình thường',
      recurringRuleId,
      isRecurring: Boolean(isRecurring && isAdmin),
      recurringFrequency: isRecurring && isAdmin ? recurringFrequency : undefined,
    });

    setTitle('');
    setDueDate(getTodayDateString());
    setIsUrgent(false);
    setIsRecurring(false);
    setRecurringEndType('never');
    setRecurringEndDate('');
    setIsExpanded(false);
  };

  return (
    <div className="bg-[#ffffff] border border-[#d6d6d6] focus-within:border-[#b13460] rounded-[10px] transition-all p-4 shadow-2xs">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full border border-[#a8a8a8] flex items-center justify-center text-[#7f7f7f] shrink-0">
            <Plus className="w-4 h-4" />
          </div>
          <input
            id="quick-add-input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onFocus={() => setIsExpanded(true)}
            placeholder="Thêm công việc mới... (Nhập tên công việc & nhấn Enter)"
            className="w-full text-sm font-body text-[#202020] placeholder-[#7f7f7f] focus:outline-hidden bg-transparent"
          />
          {title.trim() && (
            <motion.button
              type="submit"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.95 }}
              className="h-[32px] px-4 rounded-[6px] bg-[#b13460] text-white text-xs font-ui font-bold flex items-center gap-1.5 shrink-0 hover:bg-[#8f274c] transition-colors shadow-2xs cursor-pointer"
            >
              <span>Thêm</span>
              <CornerDownLeft className="w-3.5 h-3.5" />
            </motion.button>
          )}
        </div>

        {/* Options Row when expanded */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#f0f0f0] text-xs font-ui">
                <div className="flex flex-wrap items-center gap-2">
              {/* Project selector with 2 groups + Others at bottom */}
              <div className="flex items-center gap-1.5 bg-[#f9f9f9] px-2.5 py-1.5 rounded-[6px] border border-[#e0e0e0]">
                <Briefcase className="w-3.5 h-3.5 text-[#b13460] shrink-0" />
                <select
                  value={projectId}
                  onChange={(e) => handleProjectSelect(e.target.value)}
                  className="bg-transparent text-[#202020] text-xs font-ui focus:outline-hidden cursor-pointer max-w-[210px] truncate"
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
                  <optgroup label={projectGroups.myProjects.length > 0 ? "── Dự án khác ──" : "── Danh sách dự án ──"}>
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

              {/* Checklist quick button */}
              {selectedProj && !isOthersProject(selectedProj.id) && (
                <button
                  type="button"
                  onClick={() => setIsChecklistModalOpen(true)}
                  className="flex items-center gap-1.5 bg-[#fcf0f5] hover:bg-[#fae6ef] text-[#b13460] px-2.5 py-1.5 rounded-[6px] border border-[#f3c2d4] text-xs font-ui font-semibold transition-colors cursor-pointer shadow-2xs"
                  title="Xem nhanh Checklist dự án & chọn tiêu chuẩn để tạo task"
                >
                  <ListChecks className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Checklist</span>
                  {checklistStats && (
                    <span className="text-[10px] font-bold bg-[#b13460] text-white px-1.5 py-0.2 rounded-full">
                      {checklistStats.completed}/{checklistStats.total - checklistStats.skipped}
                    </span>
                  )}
                </button>
              )}

              {/* Phase selector if available */}
              {availablePhases.length > 0 && (
                <div className="flex items-center gap-1.5 bg-[#f9f9f9] px-2.5 py-1.5 rounded-[6px] border border-[#e0e0e0]">
                  <Layers className="w-3.5 h-3.5 text-[#7f7f7f] shrink-0" />
                  <select
                    value={phaseId}
                    onChange={(e) => setPhaseId(e.target.value)}
                    className="bg-transparent text-[#202020] text-xs font-ui focus:outline-hidden cursor-pointer max-w-[160px] truncate"
                  >
                    <option value="">-- Toàn dự án --</option>
                    {availablePhases.map((ph) => (
                      <option key={ph.id} value={ph.id}>
                        {ph.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Assignee selector */}
              <div className="flex items-center gap-1.5 bg-[#f9f9f9] px-2.5 py-1.5 rounded-[6px] border border-[#e0e0e0]">
                <User className="w-3.5 h-3.5 text-[#7f7f7f] shrink-0" />
                <select
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                  className="bg-transparent text-[#202020] text-xs font-ui focus:outline-hidden cursor-pointer"
                >
                  {productMembers.map((m) => (
                    <option key={m.id} value={m.name}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Due date with full date label preview & click anywhere to open date picker */}
              <div
                onClick={handleTriggerDatePicker}
                className="flex items-center gap-1.5 bg-[#f9f9f9] px-2.5 py-1.5 rounded-[6px] border border-[#e0e0e0] cursor-pointer hover:bg-[#f4f4f5] transition-colors"
                title="Bấm để chọn hạn hoàn thành"
              >
                <Calendar className="w-3.5 h-3.5 text-[#7f7f7f] shrink-0 pointer-events-none" />
                <input
                  ref={dateInputRef}
                  type="date"
                  min={minDueDate}
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  onClick={(e) => {
                    e.stopPropagation();
                    try {
                      (e.target as any).showPicker?.();
                    } catch (_) {}
                  }}
                  className="bg-transparent text-[#202020] text-xs font-ui focus:outline-hidden cursor-pointer"
                />
                {dueDate && (
                  <span
                    onClick={handleTriggerDatePicker}
                    className="text-[#52525b] text-xs font-ui font-medium cursor-pointer shrink-0 select-none hover:text-[#202020]"
                  >
                    ({formatDateWithEnDay(dueDate)})
                  </span>
                )}
              </div>

              {/* Priority Checkbox */}
              <label className="flex items-center gap-1.5 bg-[#f9f9f9] px-2.5 py-1.5 rounded-[6px] border border-[#e0e0e0] cursor-pointer text-xs font-ui text-[#202020] select-none hover:bg-[#f4f4f5]">
                <input
                  type="checkbox"
                  checked={isUrgent}
                  onChange={(e) => setIsUrgent(e.target.checked)}
                  className="w-3.5 h-3.5 text-[#b13460] rounded border-[#d6d6d6] focus:ring-[#b13460] cursor-pointer"
                />
                <span className={isUrgent ? 'font-bold text-[#be123c]' : 'text-[#52525b]'}>
                  🚨 Khẩn cấp
                </span>
              </label>

              {/* Recurring Checkbox (Admin Only) */}
              {isAdmin && (
                <label className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] border cursor-pointer text-xs font-ui select-none transition-colors ${
                  isRecurring
                    ? 'bg-[#fdf2f7] border-[#f3c2d4] text-[#963861] font-bold shadow-2xs'
                    : 'bg-[#f9f9f9] border-[#e0e0e0] text-[#52525b] hover:bg-[#f4f4f5]'
                }`}>
                  <input
                    type="checkbox"
                    checked={isRecurring}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                    className="w-3.5 h-3.5 text-[#963861] rounded border-[#d6d6d6] focus:ring-[#963861] cursor-pointer"
                  />
                  <RotateCw className={`w-3.5 h-3.5 ${isRecurring ? 'text-[#963861]' : 'text-[#7f7f7f]'}`} />
                  <span>Lặp lại chu kỳ</span>
                  <span className="text-[10px] bg-[#963861] text-white px-1 py-0.2 rounded font-ui font-bold ml-0.5">
                    Admin
                  </span>
                </label>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="text-[#7f7f7f] hover:text-[#202020] px-2 py-1 cursor-pointer"
            >
              Thu gọn
            </button>
          </div>

          {/* Recurring Options Bar (Admin Only) */}
          {isAdmin && isRecurring && (
            <div className="w-full mt-2.5 bg-[#fffbfd] border border-[#f3c2d4] rounded-[8px] p-2.5 flex flex-wrap items-center justify-between gap-3 text-xs font-ui animate-fade-in">
              <div className="flex flex-wrap items-center gap-4">
                {/* Frequency selector: Weekly, Biweekly, Monthly */}
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-[#963861]">Chu kỳ:</span>
                  <select
                    value={recurringFrequency}
                    onChange={(e) => setRecurringFrequency(e.target.value as RecurrenceFrequency)}
                    className="bg-white border border-[#d6d6d6] text-[#202020] text-xs font-ui rounded-[4px] px-2 py-1 focus:outline-hidden cursor-pointer"
                  >
                    <option value="weekly">Hàng tuần (Weekly)</option>
                    <option value="biweekly">2 tuần một lần (Biweekly)</option>
                    <option value="monthly">Hàng tháng (Monthly)</option>
                  </select>
                </div>

                {/* End condition: Never or Specific date */}
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#963861]">Kết thúc:</span>
                  <div className="flex items-center gap-3 bg-white border border-[#d6d6d6] rounded-[4px] px-2.5 py-1">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="recurring_end_type"
                        checked={recurringEndType === 'never'}
                        onChange={() => setRecurringEndType('never')}
                        className="text-[#963861] focus:ring-[#963861] cursor-pointer"
                      />
                      <span>Không bao giờ (Never)</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="recurring_end_type"
                        checked={recurringEndType === 'specific_date'}
                        onChange={() => setRecurringEndType('specific_date')}
                        className="text-[#963861] focus:ring-[#963861] cursor-pointer"
                      />
                      <span>Chọn ngày cụ thể</span>
                    </label>
                  </div>

                  {recurringEndType === 'specific_date' && (
                    <input
                      type="date"
                      min={dueDate || getTodayDateString()}
                      value={recurringEndDate}
                      onChange={(e) => setRecurringEndDate(e.target.value)}
                      className="bg-white border border-[#d6d6d6] text-[#202020] text-xs font-ui rounded-[4px] px-2 py-1 focus:outline-hidden cursor-pointer"
                    />
                  )}
                </div>
              </div>

              <span className="text-[11px] text-[#7f7f7f] italic">
                ⏰ Tự động tạo task lúc 08:00 AM mỗi chu kỳ
              </span>
            </div>
          )}
            </motion.div>
          )}
        </AnimatePresence>
      </form>

      {/* Project Checklist Modal */}
      {selectedProj && !isOthersProject(selectedProj.id) && isChecklistModalOpen && (
        <ProjectChecklistModal
          isOpen={isChecklistModalOpen}
          onClose={() => setIsChecklistModalOpen(false)}
          project={selectedProj}
          currentUser={currentUser}
          onSelectAsTaskTitle={(chosenTitle, chosenPhaseId) => {
            setTitle(chosenTitle);
            if (chosenPhaseId && selectedProj.phases && selectedProj.phases.length > 0) {
              const matchedPhase = selectedProj.phases.find(
                (p, idx) => idx + 1 === chosenPhaseId || p.id === String(chosenPhaseId) || p.name.toLowerCase().includes(`giai đoạn ${chosenPhaseId}`) || p.name.toLowerCase().includes(`gđ ${chosenPhaseId}`)
              );
              if (matchedPhase) {
                setPhaseId(matchedPhase.id);
              }
            }
            setIsExpanded(true);
          }}
          onUpdateProjectChecklist={onUpdateProjectChecklist}
        />
      )}
    </div>
  );
};
