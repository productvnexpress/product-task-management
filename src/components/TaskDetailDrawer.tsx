/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TaskItem, TaskStatus, ProjectItem, MemberItem, TeamType, PriorityLevel } from '../types';
import { formatLogTimestamp, addManualLog } from '../utils/taskLogUtils';
import { formatMemberWithPhone, formatMemberNameOnly, formatDateWithEnDay } from '../utils/formatters';
import { getProductMembers } from '../utils/memberPersonalization';
import { canEditTask, canDeleteTask } from '../utils/rbac';
import { sortProjectsAlphabetically } from '../utils/projectSortingUtils';
import { getTodayDateString } from '../utils/dateUtils';
import {
  X,
  Check,
  Calendar,
  User,
  Tag,
  AlertTriangle,
  Trash2,
  Briefcase,
  Layers,
  Link,
  ExternalLink,
  CheckCircle2,
  History,
  Clock,
  ArrowRight,
  MessageSquare,
  Send,
  UserCheck,
  Edit3,
  Share2,
} from 'lucide-react';
import { getTaskFriendlyUrl, copyUrlToClipboard } from '../utils/urlRouting';

interface TaskDetailDrawerProps {
  task: TaskItem | null;
  isOpen: boolean;
  onClose: () => void;
  projects: ProjectItem[];
  members: MemberItem[];
  onSaveTask: (updatedTask: TaskItem, authorName?: string, customNote?: string) => void;
  onDeleteTask: (id: string) => void;
  activeProductMember?: MemberItem | null;
  currentAuthUser?: MemberItem | null;
  onOpenProjectDetail?: (projectId: string) => void;
}

const TEAMS: TeamType[] = ['Product Manager', 'UX/UI Designer', 'SEO', 'Data'];

export const TaskDetailDrawer: React.FC<TaskDetailDrawerProps> = ({
  task,
  isOpen,
  onClose,
  projects,
  members,
  onSaveTask,
  onDeleteTask,
  activeProductMember,
  currentAuthUser,
  onOpenProjectDetail,
}) => {
  const effectiveUser = currentAuthUser || activeProductMember;
  const userCanEdit = task ? canEditTask(effectiveUser, task) : true;
  const userCanDelete = task ? canDeleteTask(effectiveUser, task) : true;
  const [activeDrawerTab, setActiveDrawerTab] = useState<'details' | 'history'>('details');

  const [title, setTitle] = useState(task?.title || '');
  const [status, setStatus] = useState<TaskStatus>(task?.status || 'Chưa làm');
  const [projectId, setProjectId] = useState(task?.projectId || '');
  const [phaseId, setPhaseId] = useState(task?.phaseId || '');
  const [phaseName, setPhaseName] = useState(task?.phaseName || '');
  const [team, setTeam] = useState<TeamType>(task?.team || 'Product Manager');
  const [assignee, setAssignee] = useState(task?.assignee || '');
  const [selectedProductOwners, setSelectedProductOwners] = useState<string[]>(task?.productOwners || []);
  const [poSearchQuery, setPoSearchQuery] = useState('');
  const [isPoDropdownOpen, setIsPoDropdownOpen] = useState(false);
  const [dueDate, setDueDate] = useState(task?.dueDate || '');
  const [priority, setPriority] = useState<PriorityLevel>(task?.priority || 'Bình thường');
  const [details, setDetails] = useState(task?.details || '');
  const [blockerReason, setBlockerReason] = useState(task?.blockerReason || '');
  const [workLink, setWorkLink] = useState(task?.workLink || '');
  const [resultLink, setResultLink] = useState(task?.resultLink || '');
  const [isSameAsWorkLink, setIsSameAsWorkLink] = useState(
    Boolean(task?.workLink && task?.resultLink && task.workLink.trim() === task.resultLink.trim())
  );
  const [validationError, setValidationError] = useState('');

  const sortedProjects = useMemo(() => sortProjectsAlphabetically(projects), [projects]);

  const minDueDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return getTodayDateString(d);
  }, []);

  const dateInputRef = useRef<HTMLInputElement>(null);

  // Author and update note state
  const [editorAuthor, setEditorAuthor] = useState('');
  const [customUpdateNote, setCustomUpdateNote] = useState('');

  // Manual history log note state
  const [newLogAuthor, setNewLogAuthor] = useState('');
  const [newLogNote, setNewLogNote] = useState('');

  // Sync state when task prop changes
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setStatus(task.status);
      setProjectId(task.projectId);
      setPhaseId(task.phaseId || '');
      setPhaseName(task.phaseName || '');
      setTeam(task.team);
      setAssignee(task.assignee);
      setSelectedProductOwners(task.productOwners || []);
      setPoSearchQuery('');
      setIsPoDropdownOpen(false);
      setDueDate(task.dueDate);
      setPriority(task.priority);
      setDetails(task.details || '');
      setBlockerReason(task.blockerReason || '');
      setWorkLink(task.workLink || '');
      setResultLink(task.resultLink || '');
      setIsSameAsWorkLink(
        Boolean(task.workLink && task.resultLink && task.workLink.trim() === task.resultLink.trim())
      );
      setValidationError('');
      setCustomUpdateNote('');
      const defaultAuthor = currentAuthUser?.name || activeProductMember?.name || task.assignee || (members[0]?.name || 'Hệ thống');
      setEditorAuthor(defaultAuthor);
      setNewLogAuthor(defaultAuthor);
    }
  }, [task, members, activeProductMember, currentAuthUser]);

  const handleToggleSameLink = (checked: boolean) => {
    setIsSameAsWorkLink(checked);
    if (checked) {
      setResultLink(workLink);
    }
    if (validationError) setValidationError('');
  };

  const handleWorkLinkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setWorkLink(val);
    if (isSameAsWorkLink) {
      setResultLink(val);
    }
    if (validationError) setValidationError('');
  };

  // Get current project's phases
  const selectedProject = projects.find((p) => p.id === projectId);
  const availablePhases = selectedProject?.phases || [];

  // Filter Stakeholder members for Product Owner suggestions
  const stakeholderMembers = members.filter(
    (m) => m.group === 'Stakeholder' || m.team === 'Stakeholder'
  );
  const candidateMembers = stakeholderMembers.length > 0 ? stakeholderMembers : members;

  const getFormattedPoName = (rawPo: string) => {
    return formatMemberWithPhone(rawPo, members);
  };

  const availableStakeholders = candidateMembers.filter((m) => {
    const formalName = formatMemberWithPhone(m);
    const isSelected =
      selectedProductOwners.includes(m.name) ||
      selectedProductOwners.includes(formalName) ||
      selectedProductOwners.some((s) => s.includes(m.name));
    if (isSelected) return false;

    const q = poSearchQuery.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      formalName.toLowerCase().includes(q) ||
      (m.salutation || '').toLowerCase().includes(q) ||
      (m.department || '').toLowerCase().includes(q) ||
      (m.title || '').toLowerCase().includes(q) ||
      (m.ipPhone || '').includes(q)
    );
  });

  // Handle project change
  const handleProjectChange = (newProjId: string) => {
    setProjectId(newProjId);
    const newProj = projects.find((p) => p.id === newProjId);
    if (newProj && newProj.phases && newProj.phases.length > 0) {
      setPhaseId(newProj.phases[0].id);
      setPhaseName(newProj.phases[0].name);
    } else {
      setPhaseId('');
      setPhaseName('');
    }
  };

  // Save changes with change tracking
  const handleSave = () => {
    setValidationError('');

    const finalWorkLink = workLink.trim();
    const finalResultLink = isSameAsWorkLink ? finalWorkLink : resultLink.trim();

    // Validation for Work Link when status is 'Đang làm'
    if (status === 'Đang làm' && !finalWorkLink) {
      setValidationError('⚠️ Khi công việc ở trạng thái "Đang làm", vui lòng bổ sung Link làm việc (Figma, PRD, Ticket...).');
      return;
    }

    // Validation for Result Link when status is 'Hoàn thành'
    if (status === 'Hoàn thành' && !finalResultLink) {
      setValidationError(
        isSameAsWorkLink
          ? '⚠️ Khi chọn trạng thái "Hoàn thành", vui lòng nhập Link làm việc (đang dùng chung làm Link hoàn thành).'
          : '⚠️ Khi chọn trạng thái "Hoàn thành", vui lòng bổ sung Link hoàn thành (Link Figma, PRD, Staging, Bài xuất bản...).'
      );
      return;
    }

    const selectedProj = projects.find((p) => p.id === projectId);
    const updatedTask: TaskItem = {
      ...task,
      title: title.trim() || task.title,
      status,
      projectId,
      projectName: selectedProj ? selectedProj.name : task.projectName,
      phaseId: phaseId || undefined,
      phaseName: phaseName || undefined,
      team,
      assignee,
      productOwners: selectedProductOwners,
      dueDate,
      priority,
      details,
      blockerReason: status === 'Bị nghẽn' ? blockerReason : '',
      workLink: finalWorkLink || undefined,
      resultLink: finalResultLink || undefined,
      updatedAt: new Date().toISOString(),
    };

    const author = currentAuthUser?.name || activeProductMember?.name || (members[0]?.name || 'Hệ thống');
    onSaveTask(updatedTask, author, customUpdateNote.trim() || undefined);
    onClose();
  };

  // Handle manual log addition in history tab
  const handleAddManualNote = () => {
    if (!newLogNote.trim()) return;
    const author = currentAuthUser?.name || activeProductMember?.name || (members[0]?.name || 'Hệ thống');
    const updatedWithLog = addManualLog(task, author, newLogNote.trim());
    onSaveTask(updatedWithLog, author);
    setNewLogNote('');
  };

  const [isCopied, setIsCopied] = useState(false);

  const handleCopyLink = async () => {
    if (!task) return;
    const url = getTaskFriendlyUrl(task);
    const success = await copyUrlToClipboard(url);
    if (success) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const logList = task?.logs || [];

  return (
    <AnimatePresence>
      {isOpen && task && (
        <div className="fixed inset-0 z-50 flex justify-end overflow-hidden">
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={onClose}
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300, mass: 0.8 }}
            className="relative z-10 w-full max-w-xl bg-white h-full shadow-2xl flex flex-col border-l border-[#d6d6d6] overflow-hidden"
          >
            {/* Drawer Header */}
        <div className="p-4 md:p-5 border-b border-[#e6e6e6] bg-[#fafafa] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-[#b13460]" />
              <h2 className="font-title text-base font-bold text-[#202020]">
                Chi tiết công việc
              </h2>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCopyLink}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-ui font-semibold rounded-[6px] border transition-colors cursor-pointer shadow-2xs ${
                  isCopied
                    ? 'bg-[#e2f6e9] text-[#24a148] border-[#b8e8c4]'
                    : 'bg-white text-[#505050] hover:text-[#202020] hover:bg-[#f0f0f0] border-[#d0d0d0]'
                }`}
                title="Sao chép liên kết công việc để gửi đồng nghiệp"
              >
                {isCopied ? (
                  <Check className="w-3.5 h-3.5 text-[#24a148]" />
                ) : (
                  <Share2 className="w-3.5 h-3.5 text-[#7f7f7f]" />
                )}
                <span>{isCopied ? 'Đã chép link' : 'Sao chép link'}</span>
              </button>

              <button
                onClick={onClose}
                className="p-1.5 rounded-full text-[#7f7f7f] hover:text-[#202020] hover:bg-[#ececec] transition-colors"
                title="Đóng chi tiết (ESC)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Drawer Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-[#e0e0e0] pb-1 pt-1">
            <button
              type="button"
              onClick={() => setActiveDrawerTab('details')}
              className={`px-3.5 py-1.5 text-xs font-ui font-bold rounded-[6px] flex items-center gap-1.5 transition-colors ${
                activeDrawerTab === 'details'
                  ? 'bg-[#b13460] text-white'
                  : 'bg-[#f4f4f5] text-[#52525b] hover:bg-[#e4e4e7]'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Thông tin</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveDrawerTab('history')}
              className={`px-3.5 py-1.5 text-xs font-ui font-bold rounded-[6px] flex items-center gap-1.5 transition-colors ${
                activeDrawerTab === 'history'
                  ? 'bg-[#b13460] text-white'
                  : 'bg-[#f4f4f5] text-[#52525b] hover:bg-[#e4e4e7]'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Lịch sử ({logList.length})</span>
            </button>
          </div>
        </div>

        {/* Drawer Body - TAB 1: DETAILS */}
        {activeDrawerTab === 'details' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-5 text-sm font-body">
            {/* Validation Error Alert */}
            {validationError && (
              <div className="p-3 bg-[#fff0f1] border border-[#fbd3d6] text-[#da1e28] text-xs font-bold rounded-[8px] flex items-center gap-2 animate-shake">
                <AlertTriangle className="w-4 h-4 shrink-0 text-[#da1e28]" />
                <span>{validationError}</span>
              </div>
            )}

            {/* 1. Trạng thái */}
            <div className="space-y-1.5">
              <label className="font-ui text-xs font-bold text-[#5f5f5f] block">
                Trạng thái:
              </label>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as TaskStatus);
                  setValidationError('');
                }}
                className="w-full font-ui text-xs font-bold bg-white border border-[#d6d6d6] px-3 py-2 rounded-[6px] text-[#202020] focus:border-[#b13460]"
              >
                <option value="Chưa làm">⚪ Chưa làm</option>
                <option value="Đang làm">🔵 Đang làm</option>
                <option value="Bị nghẽn">🔴 Bị nghẽn (Cần hỗ trợ)</option>
                <option value="Hoàn thành">🟢 Hoàn thành ✓</option>
              </select>
            </div>

            {/* Mô tả lý do bị nghẽn (Nếu Bị nghẽn) */}
            {status === 'Bị nghẽn' && (
              <div className="bg-[#fff0f1] p-3.5 rounded-[8px] border border-[#fbd3d6] space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-[#da1e28]">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Mô tả lý do bị nghẽn:</span>
                </div>
                <textarea
                  value={blockerReason}
                  onChange={(e) => setBlockerReason(e.target.value)}
                  placeholder="Ví dụ: Chờ API backend, chờ duyệt thiết kế Figma..."
                  rows={2}
                  className="w-full text-xs font-body p-2 bg-white border border-[#fbd3d6] rounded-[6px] focus:outline-hidden text-[#202020]"
                />
              </div>
            )}

            {/* 2. Link làm việc (Figma, Google, Notion,...) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-ui text-xs font-bold text-[#5f5f5f] flex items-center gap-1.5">
                  <Link className="w-3.5 h-3.5 text-[#1d508d]" />
                  <span>Link làm việc (Figma, Google, Notion,...):</span>
                  {status === 'Đang làm' && <span className="text-[#da1e28] font-bold text-sm">*</span>}
                </label>
                {workLink && (
                  <a
                    href={workLink.startsWith('http') ? workLink : `https://${workLink}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-bold text-[#1d508d] hover:underline flex items-center gap-1"
                  >
                    <span>Mở link</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <input
                type="text"
                value={workLink}
                onChange={handleWorkLinkChange}
                placeholder="https://figma.com/... hoặc https://docs.google.com/..."
                className={`w-full text-xs font-body p-2.5 bg-white border rounded-[6px] focus:outline-hidden text-[#202020] ${
                  status === 'Đang làm' && !workLink.trim()
                    ? 'border-[#da1e28]'
                    : 'border-[#d6d6d6]'
                }`}
              />
            </div>

            {/* 3. Link kết quả (Figma, Beta, Production...) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="font-ui text-xs font-bold text-[#5f5f5f] flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#15803d]" />
                  <span>Link hoàn thành (Figma, Beta, Staging...):</span>
                  {status === 'Hoàn thành' && <span className="text-[#da1e28] font-bold text-sm">*</span>}
                </label>

                <div className="flex items-center gap-2.5">
                  {/* Tuỳ chọn Link hoàn thành và Link làm việc là một */}
                  <label className="inline-flex items-center gap-1.5 text-xs text-[#555] hover:text-[#202020] cursor-pointer select-none font-medium bg-[#f8fafc] hover:bg-[#f1f5f9] px-2 py-0.5 rounded border border-[#e2e8f0] transition-colors">
                    <input
                      type="checkbox"
                      checked={isSameAsWorkLink}
                      onChange={(e) => handleToggleSameLink(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-[#cbd5e1] text-[#15803d] focus:ring-0 focus:ring-offset-0 cursor-pointer accent-[#15803d]"
                    />
                    <span className="text-[11px] text-[#334155]">Link hoàn thành và Link làm việc là một</span>
                  </label>

                  {(isSameAsWorkLink ? workLink : resultLink) && (
                    <a
                      href={
                        (isSameAsWorkLink ? workLink : resultLink).startsWith('http')
                          ? (isSameAsWorkLink ? workLink : resultLink)
                          : `https://${isSameAsWorkLink ? workLink : resultLink}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-bold text-[#15803d] hover:underline flex items-center gap-1"
                    >
                      <span>Mở kết quả</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>

              {isSameAsWorkLink ? (
                <div className="relative">
                  <input
                    type="text"
                    disabled
                    value={workLink ? workLink : ''}
                    placeholder="Chưa có Link làm việc (vui lòng nhập vào ô Link làm việc ở trên)"
                    className="w-full text-xs font-body p-2.5 bg-[#f8fafc] border border-[#cbd5e1] rounded-[6px] text-[#475569] italic cursor-not-allowed pr-38"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#15803d] bg-[#f0fdf4] px-2 py-0.5 rounded border border-[#bbf7d0] pointer-events-none select-none">
                    Đồng bộ từ Link làm việc
                  </span>
                </div>
              ) : (
                <input
                  type="text"
                  value={resultLink}
                  onChange={(e) => {
                    setResultLink(e.target.value);
                    if (validationError) setValidationError('');
                  }}
                  placeholder="https://vnexpress.net/... hoặc https://beta.vne..."
                  className={`w-full text-xs font-body p-2.5 bg-white border rounded-[6px] focus:outline-hidden text-[#202020] ${
                    status === 'Hoàn thành' && !resultLink.trim()
                      ? 'border-[#da1e28]'
                      : 'border-[#d6d6d6]'
                  }`}
                />
              )}
            </div>

            {/* 4. Công việc (sử dụng font Merriweather Sans) */}
            <div className="space-y-1.5">
              <label className="font-ui text-xs font-bold text-[#5f5f5f]">
                Công việc:
              </label>
              <textarea
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                rows={2}
                className="w-full font-title font-bold text-base p-3 border border-[#d6d6d6] focus:border-[#b13460] rounded-[8px] text-[#202020] leading-snug"
              />
            </div>

            {/* Grid for Dự án, Giai đoạn, Phụ trách, Hạn hoàn thành */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 5. Dự án */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-ui text-xs font-bold text-[#5f5f5f] flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-[#b13460]" />
                    <span>Dự án:</span>
                  </label>
                  {selectedProject && onOpenProjectDetail && (
                    <button
                      type="button"
                      onClick={() => onOpenProjectDetail(selectedProject.id)}
                      className="text-[11px] font-bold text-[#b13460] hover:underline flex items-center gap-1 cursor-pointer"
                      title="Bấm để xem chi tiết dự án này trong Right Sidebar"
                    >
                      <span>Xem chi tiết</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <select
                  value={projectId}
                  onChange={(e) => handleProjectChange(e.target.value)}
                  className="w-full text-xs font-ui p-2.5 bg-white border border-[#d6d6d6] rounded-[6px] text-[#202020]"
                >
                  {sortedProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 6. Giai đoạn */}
              <div className="space-y-1.5">
                <label className="font-ui text-xs font-bold text-[#5f5f5f] flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#b13460]" />
                  Giai đoạn:
                </label>
                <select
                  value={phaseId}
                  onChange={(e) => {
                    const selectedPId = e.target.value;
                    setPhaseId(selectedPId);
                    const foundPh = availablePhases.find((ph) => ph.id === selectedPId);
                    setPhaseName(foundPh ? foundPh.name : '');
                  }}
                  className="w-full text-xs font-ui p-2.5 bg-white border border-[#d6d6d6] rounded-[6px] text-[#202020]"
                >
                  <option value="">-- Toàn dự án (Chung) --</option>
                  {availablePhases.map((ph) => (
                    <option key={ph.id} value={ph.id}>
                      {ph.name} ({ph.status})
                    </option>
                  ))}
                </select>
              </div>

              {/* 7. Phụ trách */}
              <div className="space-y-1.5">
                <label className="font-ui text-xs font-bold text-[#5f5f5f] flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#7f7f7f]" />
                  Phụ trách:
                </label>
                <select
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                  className="w-full text-xs font-ui p-2.5 bg-white border border-[#d6d6d6] rounded-[6px] text-[#202020]"
                >
                  {getProductMembers(members).map((m) => (
                    <option key={m.id} value={m.name}>
                      {formatMemberNameOnly(m, members)}
                    </option>
                  ))}
                </select>
              </div>

              {/* 8. Hạn hoàn thành */}
              <div className="space-y-1.5">
                <label
                  onClick={() => {
                    try {
                      dateInputRef.current?.showPicker?.();
                    } catch (_) {
                      dateInputRef.current?.focus();
                    }
                  }}
                  className="font-ui text-xs font-bold text-[#5f5f5f] flex items-center gap-1.5 cursor-pointer select-none"
                >
                  <Calendar className="w-3.5 h-3.5 text-[#7f7f7f]" />
                  <span>Hạn hoàn thành:</span>
                </label>
                <div
                  onClick={() => {
                    try {
                      dateInputRef.current?.showPicker?.();
                    } catch (_) {
                      dateInputRef.current?.focus();
                    }
                  }}
                  className="cursor-pointer"
                >
                  <input
                    ref={dateInputRef}
                    type="date"
                    min={minDueDate}
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    onClick={(e) => {
                      try {
                        (e.target as any).showPicker?.();
                      } catch (_) {}
                    }}
                    className="w-full text-xs font-ui p-2.5 border border-[#d6d6d6] rounded-[6px] text-[#202020] cursor-pointer"
                  />
                  {dueDate && (
                    <p className="text-[11px] text-[#71717a] font-ui pt-0.5 select-none hover:text-[#202020]">
                      Hiển thị chuẩn: <strong className="text-[#202020]">{formatDateWithEnDay(dueDate)}</strong>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* 9. Ưu tiên = Khẩn cấp (Checkbox) */}
            <div className="pt-1">
              <label className="inline-flex items-center gap-2 cursor-pointer font-ui text-xs font-bold text-[#202020]">
                <input
                  type="checkbox"
                  checked={priority === 'Khẩn cấp'}
                  onChange={(e) => setPriority(e.target.checked ? 'Khẩn cấp' : 'Bình thường')}
                  className="w-4 h-4 text-[#b13460] rounded border-[#d6d6d6] focus:ring-[#b13460] cursor-pointer"
                />
                <span>Ưu tiên = Khẩn cấp (Cần ưu tiên thực hiện)</span>
              </label>
            </div>

            {/* 10. Ghi chú */}
            <div className="p-4 bg-[#f8fafc] rounded-[8px] border border-[#e2e8f0] space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#334155]">
                <Edit3 className="w-4 h-4 text-[#b13460]" />
                <span>Ghi chú:</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#64748b]">Người cập nhật:</label>
                  <div className="w-full text-xs font-ui p-2 bg-[#f1f5f9] border border-[#cbd5e1] rounded-[6px] text-[#0f172a] font-medium">
                    {currentAuthUser?.name || activeProductMember?.name || (members[0]?.name || 'Hệ thống')}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#64748b]">Nội dung:</label>
                  <input
                    type="text"
                    value={customUpdateNote}
                    onChange={(e) => setCustomUpdateNote(e.target.value)}
                    placeholder="Nhập nội dung ghi chú cập nhật..."
                    className="w-full text-xs font-body p-2 bg-white border border-[#cbd5e1] rounded-[6px] text-[#0f172a]"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Drawer Body - TAB 2: LOGS & HISTORY */}
        {activeDrawerTab === 'history' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm font-body bg-[#fafafa]">
            {/* Quick Add Manual Progress Note Box */}
            <div className="bg-white p-4 rounded-[8px] border border-[#e0e0e0] shadow-2xs space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#202020]">
                <MessageSquare className="w-4 h-4 text-[#b13460]" />
                <span>Thêm nhật ký tiến độ / Ghi chú mới</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1 md:col-span-1">
                  <label className="text-[11px] font-bold text-[#5f5f5f]">Người ghi nhật ký:</label>
                  <div className="w-full text-xs font-ui p-2 bg-[#f1f5f9] border border-[#d6d6d6] rounded-[6px] text-[#202020] font-medium">
                    {currentAuthUser?.name || activeProductMember?.name || (members[0]?.name || 'Hệ thống')}
                  </div>
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-[11px] font-bold text-[#5f5f5f]">Nội dung cập nhật / Ghi chú:</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newLogNote}
                      onChange={(e) => setNewLogNote(e.target.value)}
                      placeholder="Nhập tiến độ công việc hôm nay..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddManualNote();
                      }}
                      className="flex-1 text-xs font-body p-2 bg-white border border-[#d6d6d6] rounded-[6px] text-[#202020]"
                    />
                    <button
                      type="button"
                      onClick={handleAddManualNote}
                      disabled={!newLogNote.trim()}
                      className="px-3 py-2 bg-[#b13460] hover:bg-[#8f274c] text-white rounded-[6px] text-xs font-bold flex items-center gap-1 disabled:opacity-50 transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Gửi</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline History Header */}
            <div className="flex items-center justify-between border-b border-[#e0e0e0] pb-2">
              <span className="text-xs font-bold text-[#5f5f5f] uppercase tracking-wider">
                Nhật ký thay đổi chi tiết ({logList.length})
              </span>
              <span className="text-[11px] text-[#7f7f7f]">
                Lưu lại tự động: Ai thay? Khi nào? Thay nội dung gì?
              </span>
            </div>

            {/* Timeline Entries */}
            {logList.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-[8px] border border-dashed border-[#d6d6d6] text-xs text-[#7f7f7f] space-y-1">
                <History className="w-8 h-8 text-[#d6d6d6] mx-auto" />
                <p className="font-bold">Chưa có lịch sử thay đổi</p>
                <p>Các chỉnh sửa về trạng thái, thời hạn, người phụ trách sẽ tự động lưu lại tại đây.</p>
              </div>
            ) : (
              <div className="space-y-4 relative before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-[2px] before:bg-[#e2e8f0]">
                {logList.map((log) => (
                  <div
                    key={log.id}
                    className="relative pl-8 space-y-1.5 group"
                  >
                    {/* Timeline Node Icon */}
                    <div className="absolute left-1.5 top-1 -translate-x-1/2 w-5 h-5 rounded-full bg-white border-2 border-[#b13460] flex items-center justify-center z-10 shadow-2xs">
                      <Clock className="w-2.5 h-2.5 text-[#b13460]" />
                    </div>

                    {/* Log Card */}
                    <div className="bg-white p-3.5 rounded-[8px] border border-[#e2e8f0] shadow-2xs space-y-2 hover:border-[#cbd5e1] transition-colors">
                      {/* Log Top Info */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f1f5f9] pb-2">
                        <div className="flex items-center gap-2">
                          {/* Author - Ai thay? */}
                          <span className="font-bold text-xs text-[#0f172a] flex items-center gap-1">
                            <User className="w-3 h-3 text-[#b13460]" />
                            {formatMemberWithPhone(log.author, members)}
                          </span>

                          <span className="text-[#cbd5e1]">•</span>

                          {/* Action Title */}
                          <span className="text-[11px] font-bold text-[#3b82f6] bg-[#eff6ff] px-2 py-0.5 rounded-[4px] border border-[#bfdbfe]">
                            {log.action}
                          </span>
                        </div>

                        {/* Timestamp - Khi nào? */}
                        <span className="text-[11px] font-ui text-[#64748b] flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#94a3b8]" />
                          {formatLogTimestamp(log.timestamp)}
                        </span>
                      </div>

                      {/* Log Changes - Thay nội dung gì? */}
                      {log.changes && log.changes.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[11px] font-bold text-[#64748b] block">
                            Chi tiết thay đổi:
                          </span>
                          <div className="space-y-1 text-xs">
                            {log.changes.map((c, idx) => (
                              <div
                                key={idx}
                                className="bg-[#f8fafc] p-2 rounded-[5px] border border-[#f1f5f9] flex flex-wrap items-center gap-2 text-xs"
                              >
                                <span className="font-bold text-[#334155] min-w-[110px]">
                                  {c.field}:
                                </span>

                                {c.oldValue !== undefined && (
                                  <>
                                    <span className="line-through text-[#94a3b8] bg-[#f1f5f9] px-1.5 py-0.5 rounded text-[11px]">
                                      {c.oldValue || '(Trống)'}
                                    </span>
                                    <ArrowRight className="w-3 h-3 text-[#94a3b8]" />
                                  </>
                                )}

                                <span className="font-bold text-[#0f172a] bg-[#e2e8f0] px-1.5 py-0.5 rounded text-[11px]">
                                  {c.newValue || '(Trống)'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Log Note / Comment */}
                      {log.note && (
                        <div className="bg-[#fcf0f5] p-2.5 rounded-[6px] border border-[#fbd3e1] text-xs text-[#832e52] mt-2 space-y-0.5">
                          <span className="font-bold block text-[11px]">Ghi chú đính kèm:</span>
                          <p className="whitespace-pre-wrap">{log.note}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Drawer Footer */}
        <div className="p-4 border-t border-[#e6e6e6] bg-[#fafafa] flex items-center justify-between">
          <div>
            {userCanDelete && (
              <button
                onClick={() => {
                  if (confirm('Bạn chắc chắn muốn xóa công việc này?')) {
                    onDeleteTask(task.id);
                    onClose();
                  }
                }}
                className="text-xs font-ui font-bold text-[#da1e28] hover:bg-[#fff0f1] px-3 py-2 rounded-[6px] transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Xoá</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-[#d6d6d6] bg-white text-[#202020] text-xs font-ui font-bold rounded-[6px] hover:bg-[#ececec] cursor-pointer"
            >
              Đóng
            </button>
            {activeDrawerTab === 'details' && (
              userCanEdit ? (
                <button
                  onClick={handleSave}
                  className="px-5 py-2 bg-[#b13460] text-white text-xs font-ui font-bold rounded-[6px] hover:bg-[#8f274c] transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Lưu thay đổi</span>
                </button>
              ) : (
                <span className="text-xs text-[#71717a] font-ui bg-[#f4f4f5] px-2.5 py-1.5 rounded-[6px] border border-[#e4e4e7]">
                  🔒 Chế độ xem (Không có quyền sửa)
                </span>
              )
            )}
          </div>
        </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
