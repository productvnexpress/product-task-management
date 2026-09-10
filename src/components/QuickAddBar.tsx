/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ProjectItem, MemberItem, TeamType, PriorityLevel, TaskItem } from '../types';
import { Plus, CornerDownLeft, Calendar, User, Briefcase, Layers } from 'lucide-react';
import { formatDateWithEnDay } from '../utils/formatters';
import { getProductMembers } from '../utils/memberPersonalization';
import { getTodayDateString } from '../utils/dateUtils';
import { getTaskCreationProjectGroups, isOthersProject } from '../utils/projectSortingUtils';

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
  }) => void;
  defaultProjectId?: string;
  defaultAssignee?: string;
}

export const QuickAddBar: React.FC<QuickAddBarProps> = ({
  projects,
  tasks = [],
  members,
  onAddTask,
  defaultProjectId,
  defaultAssignee,
}) => {
  const productMembers = getProductMembers(members);
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState(defaultAssignee || productMembers[0]?.name || 'Hệ thống');

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

  const [isUrgent, setIsUrgent] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

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

    onAddTask({
      title: title.trim(),
      projectId,
      projectName: projName,
      phaseId: foundPhase ? foundPhase.id : undefined,
      phaseName: foundPhase ? foundPhase.name : undefined,
      team,
      assignee,
      dueDate: dueDate || getTodayDateString(),
      priority: isUrgent ? 'Khẩn cấp' : 'Bình thường',
    });

    setTitle('');
    setDueDate(getTodayDateString());
    setIsUrgent(false);
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
            </div>

            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="text-[#7f7f7f] hover:text-[#202020] px-2 py-1 cursor-pointer"
            >
              Thu gọn
            </button>
          </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </div>
  );
};
