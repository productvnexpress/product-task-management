/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TaskItem, TaskStatus, ProjectItem, MemberItem, TeamType, PriorityLevel, TaskLogItem, FolderItem } from '../types';
import { formatLogTimestamp, addManualLog, deduplicateTaskLogs } from '../utils/taskLogUtils';
import { formatMemberWithPhone, formatMemberNameOnly, formatDateWithEnDay } from '../utils/formatters';
import { checkTitleQuality } from '../utils/titleQuality';
import { getProductMembers } from '../utils/memberPersonalization';
import { canEditTask, canDeleteTask, getUserRole } from '../utils/rbac';
import { EstimateSelect } from './tasks/EstimateField';
import { sortProjectsAlphabetically } from '../utils/projectSortingUtils';
import { getTodayDateString } from '../utils/dateUtils';
import { analyzeTaskDiscipline, getTaskCompletionDate } from '../utils/reportUtils';
import {
  INITIAL_FOLDERS,
  getFlattenedFolderOptions,
  getFolderPath,
  inferProjectFolderId,
  isDirectFolderTask,
} from '../utils/folderUtils';
import {
  X,
  Check,
  Calendar,
  User,
  Tag,
  AlertTriangle,
  Trash2,
  Briefcase,
  Folder,
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
  RotateCw,
  AtSign,
  Zap,
  Filter,
  Play,
  Pause,
  Edit2,
} from './vds/icons';
import { VdsButton } from './vds';
import { getTaskFriendlyUrl, copyUrlToClipboard } from '../utils/urlRouting';
import {
  recurringTaskService,
  formatFrequencyLabel,
  calculateNextCycleDate,
} from '../services/recurringTaskService';
import { RecurringRuleConfig, RecurrenceFrequency, RecurrenceEndType } from '../types';
import { MentionCommentInput } from './MentionCommentInput';
import { renderCommentWithMentions } from '../utils/mentionUtils';
import { isValidUrl, normalizeUrl } from '../utils/urlValidator';

interface TaskDetailDrawerProps {
  task: TaskItem | null;
  isOpen: boolean;
  onClose: () => void;
  folders?: FolderItem[];
  projects: ProjectItem[];
  members: MemberItem[];
  onSaveTask: (updatedTask: TaskItem, authorName?: string, customNote?: string) => void;
  onDeleteTask: (id: string, isPermanent?: boolean) => void;
  activeProductMember?: MemberItem | null;
  currentAuthUser?: MemberItem | null;
  onOpenProjectDetail?: (projectId: string) => void;
  onFilterByAssignee?: (assigneeName: string) => void;
}

const TEAMS: TeamType[] = ['Product Manager', 'UX/UI Designer', 'SEO', 'Data'];

export const TaskDetailDrawer: React.FC<TaskDetailDrawerProps> = ({
  task,
  isOpen,
  onClose,
  folders = INITIAL_FOLDERS,
  projects,
  members,
  onSaveTask,
  onDeleteTask,
  activeProductMember,
  currentAuthUser,
  onOpenProjectDetail,
  onFilterByAssignee,
}) => {
  const effectiveUser = currentAuthUser || activeProductMember;
  const isAdmin = getUserRole(effectiveUser) === 'Admin';
  const currentActorName = currentAuthUser?.name || activeProductMember?.name || (members[0]?.name || 'Hệ thống');
  const productMembers = useMemo(() => getProductMembers(members), [members]);
  const userCanEdit = task ? canEditTask(effectiveUser, task, projects) : true;
  const userCanDelete = task ? canDeleteTask(effectiveUser, task, projects) : true;
  const [activeDrawerTab, setActiveDrawerTab] = useState<'details' | 'history'>('details');

  // Danh sách các trao đổi / bình luận thực tế của task (đã lọc trùng)
  const commentLogs = useMemo(() => {
    if (!task?.logs) return [];
    const withNotes = task.logs.filter((l) => Boolean(l.note && l.note.trim().length > 0));
    return deduplicateTaskLogs(withNotes);
  }, [task?.logs]);

  const [isSendingComment, setIsSendingComment] = useState(false);

  const [title, setTitle] = useState(task?.title || '');
  const [status, setStatus] = useState<TaskStatus>(task?.status || 'Chưa làm');
  const [completedAt, setCompletedAt] = useState<string | undefined>(task?.completedAt);
  const [projectId, setProjectId] = useState(task?.projectId || '');
  const [phaseId, setPhaseId] = useState(task?.phaseId || '');
  const [phaseName, setPhaseName] = useState(task?.phaseName || '');
  const [team, setTeam] = useState<TeamType>(task?.team || 'Product Manager');
  const [assignee, setAssignee] = useState(task?.assignee || '');
  const [selectedProductOwners, setSelectedProductOwners] = useState<string[]>(task?.productOwners || []);
  const [poSearchQuery, setPoSearchQuery] = useState('');
  const [isPoDropdownOpen, setIsPoDropdownOpen] = useState(false);
  const [dueDate, setDueDate] = useState(task?.dueDate || '');
  const [estimateMinutes, setEstimateMinutes] = useState<number | undefined>(task?.estimateMinutes);
  const [priority, setPriority] = useState<PriorityLevel>(task?.priority || 'Bình thường');
  const [details, setDetails] = useState(task?.details || '');
  const [blockerReason, setBlockerReason] = useState(task?.blockerReason || '');
  const [workLink, setWorkLink] = useState(task?.workLink || '');
  const [resultLink, setResultLink] = useState(task?.resultLink || '');
  const [isSameAsWorkLink, setIsSameAsWorkLink] = useState(
    Boolean(task?.workLink && task?.resultLink && task.workLink.trim() === task.resultLink.trim())
  );
  const [validationError, setValidationError] = useState('');
  const [isDeleteTaskModalOpen, setIsDeleteTaskModalOpen] = useState(false);
  const [isPermanentDeleteTask, setIsPermanentDeleteTask] = useState(false);

  // States dành riêng cho Admin xử lý kỷ luật hoàn thành
  const [showAdminDateDialog, setShowAdminDateDialog] = useState(false);
  const [adminDateInput, setAdminDateInput] = useState('');
  const [adminTimeInput, setAdminTimeInput] = useState('17:30');
  const [adminNoteInput, setAdminNoteInput] = useState('');
  const [adminResultLinkInput, setAdminResultLinkInput] = useState('');
  const [adminSuccessMsg, setAdminSuccessMsg] = useState('');

  // Phân tích kỷ luật hoàn thành của task
  const currentDiscipline = useMemo(() => {
    if (!task) return null;
    return analyzeTaskDiscipline({
      ...task,
      status,
      completedAt,
      dueDate,
      resultLink,
      workLink,
    });
  }, [task, status, completedAt, dueDate, resultLink, workLink]);

  // Quy tắc lặp liên quan (nếu task là recurring task)
  const [associatedRecurringRule, setAssociatedRecurringRule] = useState<RecurringRuleConfig | null>(null);
  const [isEditingRuleModalOpen, setIsEditingRuleModalOpen] = useState(false);
  const [isDeletingRuleConfirmOpen, setIsDeletingRuleConfirmOpen] = useState(false);
  const [ruleModalFreq, setRuleModalFreq] = useState<RecurrenceFrequency>('weekly');
  const [ruleModalNextRunDate, setRuleModalNextRunDate] = useState('');
  const [ruleModalEndType, setRuleModalEndType] = useState<RecurrenceEndType>('never');
  const [ruleModalEndDate, setRuleModalEndDate] = useState('');

  const sortedProjects = useMemo(() => sortProjectsAlphabetically(projects), [projects]);
  const flattenedFolders = useMemo(() => getFlattenedFolderOptions(folders), [folders]);

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
      if (isDirectFolderTask(task)) {
        const fId = (task.folderId || task.projectId?.replace(/^folder:/, '') || 'folder-vne').trim();
        setProjectId(`folder:${fId}`);
      } else {
        setProjectId(task.projectId);
      }
      setPhaseId(task.phaseId || '');
      setPhaseName(task.phaseName || '');
      setTeam(task.team);
      setAssignee(task.assignee);
      setSelectedProductOwners(task.productOwners || []);
      setPoSearchQuery('');
      setIsPoDropdownOpen(false);
      setDueDate(task.dueDate);
      setEstimateMinutes(task.estimateMinutes);
      setPriority(task.priority);
      setDetails(task.details || '');
      setBlockerReason(task.blockerReason || '');
      setWorkLink(task.workLink || '');
      setResultLink(task.resultLink || '');
      setIsSameAsWorkLink(
        Boolean(task.workLink && task.resultLink && task.workLink.trim() === task.resultLink.trim())
      );
      setCompletedAt(task.completedAt);
      setShowAdminDateDialog(false);
      setAdminSuccessMsg('');
      setValidationError('');
      setCustomUpdateNote('');
      const defaultAuthor = currentAuthUser?.name || activeProductMember?.name || task.assignee || (members[0]?.name || 'Hệ thống');
      setEditorAuthor(defaultAuthor);
      setNewLogAuthor(defaultAuthor);

      // Load associated recurring rule
      if (task.recurringRuleId) {
        const foundRule = recurringTaskService.getRuleById(task.recurringRuleId);
        setAssociatedRecurringRule(foundRule || null);
        if (foundRule) {
          setRuleModalFreq(foundRule.frequency);
          setRuleModalNextRunDate(foundRule.nextRunDate);
          setRuleModalEndType(foundRule.endType);
          setRuleModalEndDate(foundRule.endDate || '');
        }
      } else {
        setAssociatedRecurringRule(null);
      }
    }
  }, [task, members, activeProductMember, currentAuthUser]);

  // Handler tạm dừng / tiếp tục quy tắc lặp từ Task Detail Drawer
  const handleTogglePauseRecurringRule = () => {
    if (!associatedRecurringRule) return;
    const updated = recurringTaskService.togglePauseRule(associatedRecurringRule.id);
    if (updated) {
      setAssociatedRecurringRule({ ...updated });
    }
  };

  // Handler mở modal sửa quy tắc lặp
  const handleOpenEditRecurringRule = () => {
    if (!associatedRecurringRule) return;
    setRuleModalFreq(associatedRecurringRule.frequency);
    setRuleModalNextRunDate(associatedRecurringRule.nextRunDate);
    setRuleModalEndType(associatedRecurringRule.endType);
    setRuleModalEndDate(associatedRecurringRule.endDate || '');
    setIsEditingRuleModalOpen(true);
  };

  // Handler lưu cập nhật quy tắc lặp
  const handleSaveRecurringRuleUpdates = (e: React.FormEvent) => {
    e.preventDefault();
    if (!associatedRecurringRule) return;
    const updated: RecurringRuleConfig = {
      ...associatedRecurringRule,
      frequency: ruleModalFreq,
      nextRunDate: ruleModalNextRunDate || associatedRecurringRule.nextRunDate,
      endType: ruleModalEndType,
      endDate: ruleModalEndType === 'specific_date' && ruleModalEndDate ? ruleModalEndDate : undefined,
    };
    recurringTaskService.saveRule(updated);
    setAssociatedRecurringRule(updated);
    setIsEditingRuleModalOpen(false);
  };

  // Handler xác nhận xoá vĩnh viễn quy tắc lặp
  const handleConfirmDeleteRecurringRule = () => {
    if (!associatedRecurringRule) return;
    recurringTaskService.deleteRule(associatedRecurringRule.id);
    setAssociatedRecurringRule(null);
    setIsDeletingRuleConfirmOpen(false);

    // Cập nhật task hiện tại không còn gắn quy tắc lặp
    if (task) {
      const updatedCurrentTask: TaskItem = {
        ...task,
        isRecurring: false,
        recurringRuleId: undefined,
        recurringFrequency: undefined,
      };
      onSaveTask(
        updatedCurrentTask,
        currentAuthUser?.name || 'Admin',
        'Đã huỷ quy tắc lặp chu kỳ gắn với công việc này'
      );
    }
  };

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
      (m.name || '').toLowerCase().includes(q) ||
      (formalName || '').toLowerCase().includes(q) ||
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

    // Validation for Result Link when status is 'Hoàn thành'
    if (status === 'Hoàn thành') {
      if (!finalResultLink) {
        setValidationError(
          isSameAsWorkLink
            ? '⚠️ Khi chọn trạng thái "Hoàn thành", vui lòng nhập Link làm việc (đang dùng chung làm Link hoàn thành).'
            : '⚠️ Khi chọn trạng thái "Hoàn thành", vui lòng bổ sung Link hoàn thành (Link Figma, PRD, Staging, Bài xuất bản...).'
        );
        return;
      }
      if (!isValidUrl(finalResultLink)) {
        setValidationError(
          '⚠️ Link hoàn thành không đúng định dạng URL (ví dụ: https://figma.com/..., vnexpress.net/...).'
        );
        return;
      }
    }

    // Validation for Work Link if provided
    if (finalWorkLink && !isValidUrl(finalWorkLink)) {
      setValidationError(
        '⚠️ Link làm việc không đúng định dạng URL (ví dụ: https://figma.com/..., vnexpress.net/...).'
      );
      return;
    }

    const isDirectFolder = projectId.startsWith('folder:');
    const rawFolderId = isDirectFolder ? projectId.replace('folder:', '') : undefined;
    const selectedProj = isDirectFolder ? undefined : projects.find((p) => p.id === projectId);
    const effectiveFolderId = isDirectFolder
      ? rawFolderId
      : (selectedProj ? (selectedProj.folderId || inferProjectFolderId(selectedProj)) : task.folderId);
    const effectiveFolderName = effectiveFolderId ? getFolderPath(effectiveFolderId, folders) : task.folderName;

    const updatedTask: TaskItem = {
      ...task,
      title: title.trim() || task.title,
      status,
      completedAt: status === 'Hoàn thành' ? (completedAt || task.completedAt || new Date().toISOString()) : undefined,
      projectId: isDirectFolder ? '' : projectId,
      projectName: isDirectFolder
        ? (effectiveFolderName || 'Tinh chỉnh chung')
        : (selectedProj ? selectedProj.name : task.projectName),
      folderId: effectiveFolderId,
      folderName: effectiveFolderName,
      phaseId: isDirectFolder ? undefined : (phaseId || undefined),
      phaseName: isDirectFolder ? undefined : (phaseName || undefined),
      team,
      assignee,
      productOwners: selectedProductOwners,
      dueDate,
      estimateMinutes,
      priority,
      details,
      blockerReason: status === 'Bị nghẽn' ? blockerReason : '',
      workLink: finalWorkLink ? normalizeUrl(finalWorkLink) : undefined,
      resultLink: finalResultLink ? normalizeUrl(finalResultLink) : undefined,
      progress: status === 'Hoàn thành' ? 100 : (task.status === 'Hoàn thành' ? 50 : task.progress),
      updatedAt: new Date().toISOString(),
    };

    const author = currentActorName;
    onSaveTask(updatedTask, author, customUpdateNote.trim() || undefined);
    onClose();
  };

  // Thao tác Admin: 1-click Xác nhận hoàn thành đúng hạn cho tất cả các task
  const handleAdminConfirmOnTime = () => {
    if (!task) return;
    const actor = currentActorName;
    const targetDate = (task.dueDate ? task.dueDate.slice(0, 10) : '') || getTodayDateString();
    const targetIso = new Date(`${targetDate}T17:30:00`).toISOString();

    const candidateLink = resultLink.trim() || task.resultLink || workLink.trim() || task.workLink || '';
    if (!candidateLink || !isValidUrl(candidateLink)) {
      setAdminDateInput(targetDate);
      setAdminTimeInput('17:30');
      setAdminResultLinkInput(candidateLink);
      setAdminNoteInput(`Admin ${actor} xác nhận hoàn thành đúng hạn (ngày ${formatDateWithEnDay(targetDate)}).`);
      setShowAdminDateDialog(true);
      return;
    }

    const finalLink = normalizeUrl(candidateLink);
    const note = `Admin ${actor} xác nhận hoàn thành đúng hạn (ngày ${formatDateWithEnDay(targetDate)}).`;

    const updated: TaskItem = {
      ...task,
      title: title.trim() || task.title,
      status: 'Hoàn thành',
      progress: 100,
      completedAt: targetIso,
      resultLink: finalLink,
      workLink: workLink || finalLink,
      updatedAt: new Date().toISOString(),
    };

    setStatus('Hoàn thành');
    setCompletedAt(targetIso);
    setResultLink(finalLink);
    if (!workLink) setWorkLink(finalLink);
    onSaveTask(updated, actor, note);
    setAdminSuccessMsg(`Đã chuyển sang Hoàn thành đúng hạn (ngày ${formatDateWithEnDay(task.dueDate)})`);
    setTimeout(() => setAdminSuccessMsg(''), 4000);
  };

  // Thao tác Admin: Lưu ngày hoàn thành tùy chỉnh
  const handleAdminSaveCustomDate = () => {
    if (!task || !adminDateInput) return;
    const actor = currentActorName;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(adminDateInput)) {
      setValidationError('Ngày hoàn thành không đúng định dạng YYYY-MM-DD.');
      return;
    }

    const candidateLink = adminResultLinkInput.trim() || resultLink.trim() || task.resultLink || workLink.trim() || task.workLink || '';
    if (!candidateLink || !isValidUrl(candidateLink)) {
      setValidationError('Vui lòng nhập Link kết quả hợp lệ để hoàn thành công việc.');
      return;
    }

    const finalLink = normalizeUrl(candidateLink);
    const timeVal = adminTimeInput || '17:30';
    const customIso = new Date(`${adminDateInput}T${timeVal}:00`).toISOString();
    const note = adminNoteInput.trim() || `Admin ${actor} điều chỉnh thời điểm hoàn thành về ngày ${formatDateWithEnDay(adminDateInput)}.`;

    const updated: TaskItem = {
      ...task,
      title: title.trim() || task.title,
      status: 'Hoàn thành',
      progress: 100,
      completedAt: customIso,
      resultLink: finalLink,
      workLink: workLink || finalLink,
      updatedAt: new Date().toISOString(),
    };

    setStatus('Hoàn thành');
    setCompletedAt(customIso);
    setResultLink(finalLink);
    if (!workLink) setWorkLink(finalLink);
    setShowAdminDateDialog(false);
    onSaveTask(updated, actor, note);
    setAdminSuccessMsg(`Đã điều chỉnh ngày hoàn thành: ${formatDateWithEnDay(adminDateInput)}`);
    setTimeout(() => setAdminSuccessMsg(''), 4000);
  };

  // Gửi bình luận nhanh trực tiếp trong Drawer
  const handleSendQuickComment = () => {
    if (!task || !customUpdateNote.trim()) return;
    const author = currentActorName;
    const commentText = customUpdateNote.trim();
    setIsSendingComment(true);

    try {
      onSaveTask(task, author, commentText);
      setCustomUpdateNote('');
    } catch (err) {
      console.error('Lỗi khi gửi bình luận:', err);
    } finally {
      setIsSendingComment(false);
    }
  };

  // Handle manual log addition in history tab
  const handleAddManualNote = () => {
    if (!newLogNote.trim() || !task) return;
    const author = currentActorName;
    const noteText = newLogNote.trim();
    onSaveTask(task, author, noteText);
    setNewLogNote('');
  };

  // Phím tắt theo mục 1.4: Ctrl/Cmd+S lưu, ESC đóng (đóng hộp thoại con trước)
  const handleSaveRef = useRef(handleSave);
  handleSaveRef.current = handleSave;
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (userCanEdit && activeDrawerTab === 'details') handleSaveRef.current();
        return;
      }
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      if (isDeletingRuleConfirmOpen) return setIsDeletingRuleConfirmOpen(false);
      if (isEditingRuleModalOpen) return setIsEditingRuleModalOpen(false);
      if (isDeleteTaskModalOpen) return setIsDeleteTaskModalOpen(false);
      if (showAdminDateDialog) return setShowAdminDateDialog(false);
      onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, userCanEdit, activeDrawerTab, isDeletingRuleConfirmOpen, isEditingRuleModalOpen, isDeleteTaskModalOpen, showAdminDateDialog, onClose]);

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

  const logList = useMemo(() => {
    return deduplicateTaskLogs(task?.logs || []);
  }, [task?.logs]);

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
            className="relative z-10 w-full max-w-xl bg-surface h-full shadow-sheet flex flex-col border-l border-line overflow-hidden"
          >
            {/* Drawer Header */}
        <div className="p-4 md:p-5 border-b border-line bg-surface-100 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-accent-solid" />
              <h2 className="font-title text-base font-bold text-ink">
                Chi tiết công việc
              </h2>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCopyLink}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-ui font-semibold rounded-vds-lg border transition-colors cursor-pointer ${
                  isCopied
                    ? 'bg-surface-positive text-positive border-line'
                    : 'bg-surface text-ink-lighter hover:text-ink hover:bg-surface-200 border-line'
                }`}
                title="Sao chép liên kết công việc để gửi đồng nghiệp"
              >
                {isCopied ? (
                  <Check className="w-3.5 h-3.5 text-positive" />
                ) : (
                  <Share2 className="w-3.5 h-3.5 text-subdued" />
                )}
                <span>{isCopied ? 'Đã chép link' : 'Sao chép link'}</span>
              </button>

              <button
                onClick={onClose}
                className="p-1.5 rounded-full text-subdued hover:text-ink hover:bg-surface-300 transition-colors"
                title="Đóng chi tiết (ESC)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Drawer Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-line pb-1 pt-1">
            <button
              type="button"
              onClick={() => setActiveDrawerTab('details')}
              className={`px-3.5 py-1.5 text-xs font-ui font-bold rounded-vds-lg flex items-center gap-1.5 transition-colors ${
                activeDrawerTab === 'details'
                  ? 'bg-surface-selected text-accent ring-1 ring-inset ring-line-accent-soft'
                  : 'bg-surface-200 text-ink-lighter hover:bg-surface-300'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Thông tin</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveDrawerTab('history')}
              className={`px-3.5 py-1.5 text-xs font-ui font-bold rounded-vds-lg flex items-center gap-1.5 transition-colors ${
                activeDrawerTab === 'history'
                  ? 'bg-surface-selected text-accent ring-1 ring-inset ring-line-accent-soft'
                  : 'bg-surface-200 text-ink-lighter hover:bg-surface-300'
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
              <div className="p-3 bg-surface-negative border border-line text-negative text-xs font-bold rounded-vds-lg flex items-center gap-2 animate-shake">
                <AlertTriangle className="w-4 h-4 shrink-0 text-negative" />
                <span>{validationError}</span>
              </div>
            )}

            {/* 1. Công việc (sử dụng font Merriweather Sans) */}
            <div className="space-y-1.5">
              <label className="font-ui text-xs font-bold text-ink-lighter">
                Công việc:
              </label>
              <textarea
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                rows={2}
                className="w-full font-title font-bold text-base p-3 border border-line focus:border-line-accent rounded-vds-lg text-ink leading-snug"
              />
              {(() => {
                const q = checkTitleQuality(title);
                if (!q.isVague) return null;
                return (
                  <div className="flex items-start gap-2 p-2.5 rounded-vds-lg bg-surface-warning border border-line text-[12px] font-ui text-warning">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-px text-warning" />
                    <span className="leading-snug">
                      <strong>{q.reason}</strong> {q.hint}
                    </span>
                  </div>
                );
              })()}
            </div>

            {/* 2. Trạng thái */}
            <div className="space-y-1.5">
              <label className="font-ui text-xs font-bold text-ink-lighter block">
                Trạng thái:
              </label>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as TaskStatus);
                  setValidationError('');
                }}
                className="w-full font-ui text-xs font-bold bg-surface border border-line px-3 py-2 rounded-vds-lg text-ink focus:border-line-accent"
              >
                <option value="Chưa làm">⚪ Chưa làm</option>
                <option value="Đang làm">🔵 Đang làm</option>
                <option value="Bị nghẽn">🔴 Bị nghẽn (Cần hỗ trợ)</option>
                <option value="Hoàn thành">🟢 Hoàn thành ✓</option>
              </select>
            </div>

            {/* Mô tả lý do bị nghẽn (Nếu Bị nghẽn) */}
            {status === 'Bị nghẽn' && (
              <div className="bg-surface-negative p-3.5 rounded-vds-lg border border-line space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-negative">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Mô tả lý do bị nghẽn:</span>
                </div>
                <textarea
                  value={blockerReason}
                  onChange={(e) => setBlockerReason(e.target.value)}
                  placeholder="Ví dụ: Chờ API backend, chờ duyệt thiết kế Figma..."
                  rows={2}
                  className="w-full text-xs font-body p-2 bg-surface border border-line rounded-vds-lg focus:outline-hidden text-ink"
                />
              </div>
            )}

            {/* Khối Kỷ luật hoàn thành & Đặc quyền Admin */}
            {isAdmin && currentDiscipline && (
              <div className="bg-surface-100 border border-line rounded-vds-lg p-3.5 space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-ui text-xs font-bold text-ink-lighter">
                      Kỷ luật hoàn thành:
                    </span>
                    {status === 'Hoàn thành' ? (
                      currentDiscipline.isOnTime ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-positive bg-surface-positive border border-line px-2 py-0.5 rounded-vds-md">
                          <CheckCircle2 className="w-3.5 h-3.5 text-positive" />
                          <span>Hoàn thành đúng hạn</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-warning bg-surface-warning border border-line px-2 py-0.5 rounded-vds-md">
                          <AlertTriangle className="w-3.5 h-3.5 text-warning" />
                          <span>Hoàn thành sau hạn (+{currentDiscipline.daysDiff} ngày)</span>
                        </span>
                      )
                    ) : currentDiscipline.discipline === 'currently_overdue' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-negative bg-surface-negative border border-line px-2 py-0.5 rounded-vds-md">
                        <AlertTriangle className="w-3.5 h-3.5 text-negative" />
                        <span>Đang quá hạn {currentDiscipline.daysDiff} ngày</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-ink-lighter bg-surface-200 border border-line px-2 py-0.5 rounded-vds-md">
                        <Clock className="w-3.5 h-3.5 text-subdued" />
                        <span>{status} (Hạn: {formatDateWithEnDay(dueDate)})</span>
                      </span>
                    )}
                  </div>

                  <span className="font-ui text-xs text-subdued">
                    {status === 'Hoàn thành' && (completedAt || task?.completedAt)
                      ? formatLogTimestamp(completedAt || task?.completedAt, true)
                      : (dueDate ? `Hạn: ${formatDateWithEnDay(dueDate)}` : 'Chưa có hạn')}
                  </span>
                </div>

                {adminSuccessMsg && (
                  <div className="p-2 bg-surface-positive border border-line text-positive text-xs font-bold rounded-vds-lg flex items-center gap-1.5 animate-fade-in">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>{adminSuccessMsg}</span>
                  </div>
                )}

                {/* Thao tác dành riêng cho Admin */}
                <div className="pt-2 border-t border-divider flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-subdued font-medium">
                    {status !== 'Hoàn thành'
                      ? 'Xác nhận nhân sự đã xong trước hạn:'
                      : 'Đặc quyền Admin:'}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {/* Nút 1-click: Chuyển sang Hoàn thành đúng hạn */}
                    {(status !== 'Hoàn thành' || !currentDiscipline.isOnTime) && (
                      <button
                        type="button"
                        onClick={handleAdminConfirmOnTime}
                        className="px-2.5 py-1 bg-positive-solid hover:bg-positive-solid text-on-color rounded-vds-md text-xs font-ui font-bold flex items-center gap-1 transition-colors cursor-pointer "
                        title="Xác nhận nhân sự hoàn thành đúng hạn (đặt ngày hoàn thành theo ngày hạn)"
                      >
                        <Zap className="w-3 h-3" />
                        <span>{status === 'Hoàn thành' ? 'Chuyển sang đúng hạn' : 'Hoàn thành đúng hạn'}</span>
                      </button>
                    )}

                    {/* Nút tuỳ chỉnh ngày hoàn thành */}
                    <button
                      type="button"
                      onClick={() => {
                        const defaultDate = currentDiscipline.completionDate || (task?.dueDate ? task.dueDate.slice(0, 10) : '') || getTodayDateString();
                        setAdminDateInput(defaultDate);
                        setAdminTimeInput('17:30');
                        setAdminResultLinkInput(resultLink || workLink || '');
                        setAdminNoteInput('');
                        setShowAdminDateDialog(true);
                      }}
                      className="px-2.5 py-1 bg-surface hover:bg-surface-100 text-ink-lighter border border-line rounded-vds-md text-xs font-ui font-medium flex items-center gap-1 transition-colors cursor-pointer"
                      title="Chọn ngày hoàn thành thực tế tùy chỉnh"
                    >
                      <Clock className="w-3 h-3 text-subdued" />
                      <span>Đổi ngày hoàn thành</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Link làm việc (Figma, Google, Notion,...) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-ui text-xs font-bold text-ink-lighter flex items-center gap-1.5">
                  <Link className="w-3.5 h-3.5 text-support" />
                  <span>Link làm việc (Figma, Google, Notion,...):</span>
                </label>
                {workLink && (
                  <a
                    href={workLink.startsWith('http') ? workLink : `https://${workLink}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-support hover:underline flex items-center gap-1"
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
                className="w-full text-xs font-body p-2.5 bg-surface border border-line rounded-vds-lg focus:outline-hidden text-ink"
              />
              <p className="text-xs font-ui text-accent font-medium">
                * Lưu ý: Đảm bảo các thành viên Product có thể truy cập link.
              </p>
            </div>

            {/* 4. Link kết quả (Figma, Beta, Production...) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="font-ui text-xs font-bold text-ink-lighter flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-positive" />
                  <span>Link hoàn thành (Figma, Beta, Staging...):</span>
                  {status === 'Hoàn thành' && <span className="text-negative font-bold text-sm">*</span>}
                </label>

                <div className="flex items-center gap-2.5">
                  {/* Tuỳ chọn Link hoàn thành và Link làm việc là một */}
                  <label className="inline-flex items-center gap-1.5 text-xs text-ink-lighter hover:text-ink cursor-pointer select-none font-medium bg-surface-100 hover:bg-surface-200 px-2 py-0.5 rounded border border-line transition-colors">
                    <input
                      type="checkbox"
                      checked={isSameAsWorkLink}
                      onChange={(e) => handleToggleSameLink(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-line text-positive focus:ring-0 focus:ring-offset-0 cursor-pointer accent-positive"
                    />
                    <span className="text-xs text-ink-lighter">Link hoàn thành và Link làm việc là một</span>
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
                      className="text-xs font-bold text-positive hover:underline flex items-center gap-1"
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
                    className="w-full text-xs font-body p-2.5 bg-surface-100 border border-line rounded-vds-lg text-ink-lighter italic cursor-not-allowed pr-38"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-positive bg-surface-positive px-2 py-0.5 rounded border border-line pointer-events-none select-none">
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
                  className={`w-full text-xs font-body p-2.5 bg-surface border rounded-vds-lg focus:outline-hidden text-ink ${
                    status === 'Hoàn thành' && !resultLink.trim()
                      ? 'border-line-negative'
                      : 'border-line'
                  }`}
                />
              )}
              <p className="text-xs font-ui text-accent font-medium">
                * Lưu ý: Đảm bảo các thành viên Product có thể truy cập link.
              </p>
            </div>

            {/* Grid for Dự án, Giai đoạn, Phụ trách, Hạn hoàn thành */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 5. Thư mục / Dự án */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-ui text-xs font-bold text-ink-lighter flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-accent" />
                    <span>Thư mục / Dự án:</span>
                  </label>
                  {selectedProject && onOpenProjectDetail && (
                    <button
                      type="button"
                      onClick={() => onOpenProjectDetail(selectedProject.id)}
                      className="text-xs font-bold text-accent hover:underline flex items-center gap-1 cursor-pointer"
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
                  className="w-full text-xs font-ui p-2.5 bg-surface border border-line rounded-vds-lg text-ink"
                >
                  {folders.length > 0 && (
                    <optgroup label="── 📁 Trực tiếp trong Thư mục (Tinh chỉnh nhỏ) ──">
                      {getFlattenedFolderOptions(folders).map((opt) => (
                        <option key={`folder:${opt.id}`} value={`folder:${opt.id}`}>
                          📁 {opt.fullPath} (Không thuộc dự án)
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="── 📋 Thuộc Dự án ──">
                    {sortedProjects.map((p) => {
                      const fPath = getFolderPath(p.folderId || inferProjectFolderId(p), folders);
                      return (
                        <option key={p.id} value={p.id}>
                          {fPath ? `[${fPath}] ` : ''}{p.name}
                        </option>
                      );
                    })}
                  </optgroup>
                </select>
              </div>

              {/* 6. Giai đoạn */}
              <div className="space-y-1.5">
                <label className="font-ui text-xs font-bold text-ink-lighter flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-accent" />
                  Giai đoạn:
                </label>
                <select
                  value={phaseId}
                  disabled={projectId.startsWith('folder:')}
                  onChange={(e) => {
                    const selectedPId = e.target.value;
                    setPhaseId(selectedPId);
                    const foundPh = availablePhases.find((ph) => ph.id === selectedPId);
                    setPhaseName(foundPh ? foundPh.name : '');
                  }}
                  className="w-full text-xs font-ui p-2.5 bg-surface border border-line rounded-vds-lg text-ink disabled:bg-surface-200 disabled:text-subdued"
                >
                  <option value="">
                    {projectId.startsWith('folder:') ? '-- Công việc trực tiếp trong Thư mục --' : '-- Toàn dự án (Chung) --'}
                  </option>
                  {availablePhases.map((ph) => (
                    <option key={ph.id} value={ph.id}>
                      {ph.name} ({ph.status})
                    </option>
                  ))}
                </select>
              </div>

              {/* 7. Phụ trách */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-ui text-xs font-bold text-ink-lighter flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-subdued" />
                    Phụ trách:
                  </label>
                  {onFilterByAssignee && assignee && (
                    <button
                      type="button"
                      onClick={() => {
                        onFilterByAssignee(assignee);
                        onClose();
                      }}
                      className="text-xs font-ui text-accent hover:underline cursor-pointer flex items-center gap-1"
                      title={`Lọc nhanh công việc của ${assignee}`}
                    >
                      <Filter className="w-3 h-3" />
                      <span>Lọc việc nhân sự này</span>
                    </button>
                  )}
                </div>
                <select
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                  className="w-full text-xs font-ui p-2.5 bg-surface border border-line rounded-vds-lg text-ink"
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
                <div className="flex items-center justify-between">
                  <label
                    onClick={() => {
                      try {
                        dateInputRef.current?.showPicker?.();
                      } catch (_) {
                        dateInputRef.current?.focus();
                      }
                    }}
                    className="font-ui text-xs font-bold text-ink-lighter flex items-center gap-1.5 cursor-pointer select-none"
                  >
                    <Calendar className="w-3.5 h-3.5 text-subdued" />
                    <span>Hạn hoàn thành:</span>
                  </label>
                  {!dueDate && (
                    <span className="text-xs font-ui font-semibold text-warning bg-surface-warning px-2 py-0.5 rounded-vds-md border border-line">
                      Chưa có hạn
                    </span>
                  )}
                </div>

                {!dueDate && (
                  <div className="bg-surface-warning border border-line p-2.5 rounded-vds-lg space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-warning">
                      <Clock className="w-3.5 h-3.5 text-warning" />
                      <span>Công việc này chưa có hạn hoàn thành. Vui lòng chọn hạn:</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setDueDate(getTodayDateString())}
                        className="text-xs font-ui px-2.5 py-1 rounded-vds-md bg-surface border border-line text-warning hover:bg-surface-warning font-semibold cursor-pointer transition-colors"
                      >
                        Hôm nay
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const d = new Date();
                          d.setDate(d.getDate() + 1);
                          setDueDate(getTodayDateString(d));
                        }}
                        className="text-xs font-ui px-2.5 py-1 rounded-vds-md bg-surface border border-line text-warning hover:bg-surface-warning font-semibold cursor-pointer transition-colors"
                      >
                        Ngày mai
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const d = new Date();
                          d.setDate(d.getDate() + 3);
                          setDueDate(getTodayDateString(d));
                        }}
                        className="text-xs font-ui px-2.5 py-1 rounded-vds-md bg-surface border border-line text-warning hover:bg-surface-warning font-semibold cursor-pointer transition-colors"
                      >
                        +3 ngày
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const d = new Date();
                          d.setDate(d.getDate() + 7);
                          setDueDate(getTodayDateString(d));
                        }}
                        className="text-xs font-ui px-2.5 py-1 rounded-vds-md bg-surface border border-line text-warning hover:bg-surface-warning font-semibold cursor-pointer transition-colors"
                      >
                        +1 tuần
                      </button>
                    </div>
                  </div>
                )}

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
                    className={`w-full text-xs font-ui p-2.5 border rounded-vds-lg text-ink cursor-pointer ${
                      !dueDate ? 'border-line bg-surface-100' : 'border-line bg-surface'
                    }`}
                  />
                  {dueDate ? (
                    <p className="text-xs text-subdued font-ui pt-0.5 select-none hover:text-ink">
                      Hiển thị chuẩn: <strong className="text-ink">{formatDateWithEnDay(dueDate)}</strong>
                    </p>
                  ) : (
                    <p className="text-xs text-warning font-ui pt-0.5 select-none">
                      * Bấm vào ô trên hoặc chọn nhanh các nút gợi ý để đặt hạn hoàn thành.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* 8.1 Ước lượng thời gian làm */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <label htmlFor="task-estimate" className="font-ui text-xs font-bold text-ink">
                Ước lượng thời gian:
              </label>
              <EstimateSelect id="task-estimate" value={estimateMinutes} onChange={setEstimateMinutes} />
              {!estimateMinutes && status !== 'Hoàn thành' && (
                <span className="text-xs font-ui text-warning">Chưa ước lượng</span>
              )}
            </div>

            {/* 9. Ưu tiên = Khẩn cấp (Checkbox) */}
            <div className="pt-1">
              <label className="inline-flex items-center gap-2 cursor-pointer font-ui text-xs font-bold text-ink">
                <input
                  type="checkbox"
                  checked={priority === 'Khẩn cấp'}
                  onChange={(e) => setPriority(e.target.checked ? 'Khẩn cấp' : 'Bình thường')}
                  className="w-4 h-4 text-accent rounded border-line focus:ring-line-accent cursor-pointer"
                />
                <span>Ưu tiên = Khẩn cấp (Cần ưu tiên thực hiện)</span>
              </label>
            </div>

            {/* 9.1 Quản lý Chu kỳ lặp lại (Chỉnh sửa / Tạm dừng / Xoá quy tắc) */}
            {task.isRecurring && (
              <div className="p-3 bg-surface-100 border border-line rounded-vds-lg space-y-2.5 text-xs font-ui animate-fade-in">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <RotateCw className="w-4 h-4 text-accent shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-accent">Công việc định kỳ</span>
                        <span className="text-[10px] bg-accent-solid text-on-color px-1.5 py-0.2 rounded font-bold">
                          {task.recurringFrequency ? formatFrequencyLabel(task.recurringFrequency) : 'Chu kỳ'}
                        </span>
                        {associatedRecurringRule?.status === 'paused' && (
                          <span className="text-[10px] bg-surface-200 text-subdued border border-line px-1.5 py-0.2 rounded font-medium">
                            Đang tạm dừng
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-ink-lighter mt-0.5 truncate">
                        Tự động tạo lúc {associatedRecurringRule?.nextRunTime || '08:00'} · Chu kỳ tới: {associatedRecurringRule?.nextRunDate || 'Chưa định'}
                      </p>
                    </div>
                  </div>

                  {/* Cụm nút thao tác quy tắc chu kỳ */}
                  {associatedRecurringRule && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={handleTogglePauseRecurringRule}
                        className={`p-1.5 rounded-vds-md border transition-colors cursor-pointer text-xs flex items-center gap-1 ${
                          associatedRecurringRule.status === 'paused'
                            ? 'border-line text-positive hover:bg-surface-positive'
                            : 'border-line text-ink-lighter hover:text-warning hover:bg-surface-warning'
                        }`}
                        title={associatedRecurringRule.status === 'paused' ? 'Tiếp tục chạy quy tắc' : 'Tạm dừng quy tắc'}
                      >
                        {associatedRecurringRule.status === 'paused' ? (
                          <>
                            <Play className="w-3 h-3 fill-current" />
                            <span className="text-[10px] font-semibold">Tiếp tục</span>
                          </>
                        ) : (
                          <>
                            <Pause className="w-3 h-3" />
                            <span className="text-[10px] font-semibold">Tạm dừng</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleOpenEditRecurringRule}
                        className="p-1.5 rounded-vds-md border border-line hover:border-line-info text-ink-lighter hover:text-info hover:bg-surface-info transition-colors cursor-pointer text-xs flex items-center gap-1"
                        title="Sửa chu kỳ hoặc ngày chạy"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span className="text-[10px] font-semibold">Sửa</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsDeletingRuleConfirmOpen(true)}
                        className="p-1.5 rounded-vds-md border border-line hover:border-line text-ink-lighter hover:text-negative hover:bg-surface-negative transition-colors cursor-pointer text-xs flex items-center gap-1"
                        title="Xoá bỏ quy tắc lặp"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span className="text-[10px] font-semibold">Xoá chu kỳ</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 10. Bình luận & Trao đổi */}
            <div className="p-4 bg-surface rounded-vds-lg border border-line space-y-3 ">
              <div className="flex items-center justify-between gap-2 border-b border-divider pb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-ink">
                  <MessageSquare className="w-4 h-4 text-accent" />
                  <span>Bình luận & Trao đổi</span>
                  {commentLogs.length > 0 && (
                    <span className="text-[10px] font-ui font-bold px-1.5 py-0.2 rounded-full bg-surface-accent-faint text-accent border border-line">
                      {commentLogs.length}
                    </span>
                  )}
                </div>

                <span className="text-[10px] font-ui font-semibold text-accent bg-surface-accent-faint px-2 py-0.5 rounded border border-line inline-flex items-center gap-1">
                  <AtSign className="w-3 h-3" />
                  <span>Gõ @ để tag nhân sự</span>
                </span>
              </div>

              {/* Ô nhập bình luận hỗ trợ @tag */}
              <div className="space-y-2">
                <MentionCommentInput
                  value={customUpdateNote}
                  onChange={setCustomUpdateNote}
                  onSubmit={handleSendQuickComment}
                  members={members}
                  placeholder="Nhập bình luận, trao đổi... Gõ @ để tag nhân sự (Ctrl+Enter để gửi)"
                  rows={2}
                />

                <div className="flex items-center justify-between gap-2 pt-0.5">
                  <div className="text-xs text-subdued flex items-center gap-1">
                    <User className="w-3 h-3 text-accent" />
                    <span>
                      Người gửi: <strong className="text-ink">{currentActorName}</strong>
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleSendQuickComment}
                    disabled={!customUpdateNote.trim() || isSendingComment}
                    className="px-3 py-1.5 bg-accent-solid hover:bg-accent-solid-hover text-on-color rounded-vds-lg text-xs font-ui font-bold flex items-center gap-1.5 disabled:opacity-50 transition-colors cursor-pointer"
                    title="Gửi bình luận ngay lập tức (Ctrl+Enter)"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Gửi bình luận</span>
                  </button>
                </div>
              </div>

              {/* Lịch sử trao đổi / bình luận */}
              <div className="space-y-2 pt-2 border-t border-divider">
                <div className="flex items-center justify-between text-xs font-ui font-bold text-subdued">
                  <span>Lịch sử trao đổi {commentLogs.length > 0 ? `(${commentLogs.length})` : ''}</span>
                  {commentLogs.length > 0 && (
                    <span className="text-[10px] font-normal text-subdued-lighter">Mới nhất trước</span>
                  )}
                </div>

                {commentLogs.length === 0 ? (
                  <div className="py-3 px-3 text-center bg-surface-100 rounded-vds-lg border border-dashed border-line text-xs text-subdued-lighter">
                    Chưa có trao đổi nào. Nhập nội dung phía trên và gõ @ để tag đồng nghiệp.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {commentLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-2.5 bg-surface-100 rounded-vds-lg border border-line space-y-1.5 text-xs hover:border-line transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-ink flex items-center gap-1.5 text-xs">
                            <span className="w-5 h-5 rounded-full bg-accent-solid text-on-color flex items-center justify-center text-[10px] font-bold shrink-0">
                              {log.author ? log.author.charAt(0).toUpperCase() : 'U'}
                            </span>
                            <span>{log.author}</span>
                          </span>

                          <span className="text-[10px] text-subdued-lighter font-ui flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5 text-subdued-lighter" />
                            <span>{formatLogTimestamp(log.timestamp)}</span>
                          </span>
                        </div>

                        <div className="text-ink-lighter font-body text-xs whitespace-pre-wrap leading-relaxed pl-6.5">
                          {renderCommentWithMentions(log.note || '', members)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Drawer Body - TAB 2: LOGS & HISTORY */}
        {activeDrawerTab === 'history' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm font-body bg-surface-100">
            {/* Cảnh báo kỷ luật & Xử lý Admin trên Tab Lịch sử */}
            {isAdmin && currentDiscipline && (status !== 'Hoàn thành' || !currentDiscipline.isOnTime) && (
              <div className="bg-surface-warning border border-line rounded-vds-lg p-3.5 space-y-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-warning">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-warning" />
                      <span>
                        {status === 'Hoàn thành'
                          ? `Ghi nhận: Hoàn thành sau hạn (+${currentDiscipline.daysDiff} ngày)`
                          : `Công việc ${currentDiscipline.discipline === 'currently_overdue' ? `đang quá hạn ${currentDiscipline.daysDiff} ngày` : 'chưa hoàn thành'}`}
                      </span>
                    </div>
                    <p className="text-xs text-warning">
                      {status === 'Hoàn thành' ? (
                        <>Thời điểm bấm: <strong className="text-warning">{formatLogTimestamp(completedAt || task?.completedAt, true)}</strong> (Hạn: {formatDateWithEnDay(dueDate)})</>
                      ) : (
                        <>Hạn công việc: <strong className="text-warning">{formatDateWithEnDay(dueDate)}</strong>. Admin có thể xác nhận đã hoàn thành từ trước.</>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={handleAdminConfirmOnTime}
                      className="px-2.5 py-1 bg-positive-solid hover:bg-positive-solid text-on-color rounded-vds-md text-xs font-ui font-bold flex items-center gap-1 transition-colors cursor-pointer "
                      title="Xác nhận nhân sự hoàn thành đúng hạn (đặt ngày hoàn thành theo ngày hạn)"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>{status === 'Hoàn thành' ? 'Xác nhận đúng hạn' : 'Hoàn thành đúng hạn'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const defaultDate = currentDiscipline.completionDate || (task?.dueDate ? task.dueDate.slice(0, 10) : '') || getTodayDateString();
                        setAdminDateInput(defaultDate);
                        setAdminTimeInput('17:30');
                        setAdminResultLinkInput(resultLink || workLink || '');
                        setAdminNoteInput('');
                        setShowAdminDateDialog(true);
                      }}
                      className="px-2 py-1 bg-surface hover:bg-surface-100 text-ink-lighter border border-line rounded-vds-md text-xs font-ui font-medium flex items-center gap-1 transition-colors cursor-pointer"
                      title="Điều chỉnh ngày hoàn thành cụ thể"
                    >
                      <Clock className="w-3 h-3 text-subdued" />
                      <span>Đổi ngày</span>
                    </button>
                  </div>
                </div>

                {adminSuccessMsg && (
                  <div className="p-2 bg-surface-positive border border-line text-positive text-xs font-bold rounded-vds-lg flex items-center gap-1.5 animate-fade-in">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>{adminSuccessMsg}</span>
                  </div>
                )}
              </div>
            )}

            {/* Quick Add Manual Progress Note Box */}
            <div className="bg-surface p-4 rounded-vds-lg border border-line space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-bold text-ink">
                  <MessageSquare className="w-4 h-4 text-accent" />
                  <span>Thêm bình luận / Trao đổi mới</span>
                </div>
                <span className="text-[10px] font-ui font-semibold text-accent bg-surface-accent-faint px-2 py-0.5 rounded border border-line inline-flex items-center gap-1">
                  <AtSign className="w-3 h-3" />
                  <span>Gõ @ để tag</span>
                </span>
              </div>

              <div className="space-y-2">
                <MentionCommentInput
                  value={newLogNote}
                  onChange={setNewLogNote}
                  onSubmit={handleAddManualNote}
                  members={members}
                  placeholder="Nhập nội dung trao đổi, tiến độ... Gõ @ để tag nhân sự (Ctrl+Enter để gửi)"
                  rows={2}
                />

                <div className="flex items-center justify-between gap-2 pt-0.5">
                  <span className="text-xs text-ink-lighter">
                    Người gửi: <strong className="text-ink">{currentActorName}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={handleAddManualNote}
                    disabled={!newLogNote.trim()}
                    className="px-3 py-1.5 bg-accent-solid hover:bg-accent-solid-hover text-on-color rounded-vds-lg text-xs font-ui font-bold flex items-center gap-1.5 disabled:opacity-50 transition-colors cursor-pointer "
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Gửi bình luận</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Timeline History Header */}
            <div className="flex items-center justify-between border-b border-line pb-2">
              <span className="text-xs font-bold text-ink-lighter">
                Nhật ký thay đổi chi tiết ({logList.length})
              </span>
              <span className="text-xs text-subdued">
                Lưu lại tự động: Ai thay? Khi nào? Thay nội dung gì?
              </span>
            </div>

            {/* Timeline Entries */}
            {logList.length === 0 ? (
              <div className="p-8 text-center bg-surface rounded-vds-lg border border-dashed border-line text-xs text-subdued space-y-1">
                <History className="w-8 h-8 text-icon-subdued mx-auto" />
                <p className="font-bold">Chưa có lịch sử thay đổi</p>
                <p>Các chỉnh sửa về trạng thái, thời hạn, người phụ trách sẽ tự động lưu lại tại đây.</p>
              </div>
            ) : (
              <div className="space-y-4 relative before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-[2px] before:bg-surface-300">
                {logList.map((log) => (
                  <div
                    key={log.id}
                    className="relative pl-8 space-y-1.5 group"
                  >
                    {/* Timeline Node Icon */}
                    <div className="absolute left-1.5 top-1 -translate-x-1/2 w-5 h-5 rounded-full bg-surface border-2 border-line-accent flex items-center justify-center z-10 ">
                      <Clock className="w-2.5 h-2.5 text-accent" />
                    </div>

                    {/* Log Card */}
                    <div className="bg-surface p-3.5 rounded-vds-lg border border-line space-y-2 hover:border-line transition-colors">
                      {/* Log Top Info */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-divider pb-2">
                        <div className="flex items-center gap-2">
                          {/* Author - Ai thay? */}
                          <span className="font-bold text-xs text-ink flex items-center gap-1">
                            <User className="w-3 h-3 text-accent" />
                            {formatMemberWithPhone(log.author, members)}
                          </span>

                          <span className="text-icon-subdued">•</span>

                          {/* Action Title */}
                          <span className="text-xs font-bold text-info bg-surface-info px-2 py-0.5 rounded-vds-md border border-line">
                            {log.action}
                          </span>
                        </div>

                        {/* Timestamp - Khi nào? */}
                        <span className="text-xs font-ui text-subdued flex items-center gap-1">
                          <Clock className="w-3 h-3 text-subdued-lighter" />
                          {formatLogTimestamp(log.timestamp)}
                        </span>
                      </div>

                      {/* Log Changes - Thay nội dung gì? */}
                      {log.changes && log.changes.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <span className="text-xs font-bold text-subdued block">
                            Chi tiết thay đổi:
                          </span>
                          <div className="space-y-1 text-xs">
                            {log.changes.map((c, idx) => (
                              <div
                                key={idx}
                                className="bg-surface-100 p-2 rounded-vds-md border border-divider flex flex-wrap items-center gap-2 text-xs"
                              >
                                <span className="font-bold text-ink-lighter min-w-[110px]">
                                  {c.field}:
                                </span>

                                {c.oldValue !== undefined && (
                                  <>
                                    <span className="line-through text-subdued-lighter bg-surface-200 px-1.5 py-0.5 rounded text-xs">
                                      {c.oldValue || '(Trống)'}
                                    </span>
                                    <ArrowRight className="w-3 h-3 text-subdued-lighter" />
                                  </>
                                )}

                                <span className="font-bold text-ink bg-surface-300 px-1.5 py-0.5 rounded text-xs">
                                  {c.newValue || '(Trống)'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Log Note / Comment */}
                      {log.note && (
                        <div className="bg-surface-accent-faint p-2.5 rounded-vds-lg border border-line text-xs text-accent mt-2 space-y-1">
                          <span className="font-bold block text-xs text-accent">
                            {log.action === 'Bình luận' ? 'Nội dung bình luận:' : 'Ghi chú / Bình luận:'}
                          </span>
                          <div className="whitespace-pre-wrap leading-relaxed text-ink-lighter">
                            {renderCommentWithMentions(log.note, members)}
                          </div>
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
        <div className="p-4 border-t border-line bg-surface-100 flex items-center justify-between">
          <div>
            {userCanDelete && (
              <VdsButton
                variant="negative-uncontained"
                size="sm"
                iconLeft="Delete"
                onClick={() => {
                  setIsPermanentDeleteTask(false);
                  setIsDeleteTaskModalOpen(true);
                }}
              >
                Xoá
              </VdsButton>
            )}
          </div>

          <div className="flex items-center gap-2">
            <VdsButton variant="ghost" size="sm" onClick={onClose}>
              Đóng
            </VdsButton>
            {activeDrawerTab === 'details' && (
              userCanEdit ? (
                <VdsButton variant="accent" size="sm" iconLeft="Checkmark" onClick={handleSave}>
                  Lưu thay đổi
                </VdsButton>
              ) : (
                <span className="text-xs text-subdued font-ui bg-surface-200 px-2.5 py-1.5 rounded-vds-lg border border-line">
                  🔒 Chế độ xem (Không có quyền sửa)
                </span>
              )
            )}
          </div>
        </div>

        {/* Modal Admin điều chỉnh ngày hoàn thành */}
        {showAdminDateDialog && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs animate-fade-in">
            <div className="bg-surface rounded-vds-lg border border-line shadow-sheet w-full max-w-sm p-5 space-y-4 font-ui">
              <div className="flex items-center justify-between border-b border-divider pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-accent" />
                  <h3 className="font-bold text-sm text-ink">Điều chỉnh thời điểm hoàn thành</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAdminDateDialog(false)}
                  className="p-1 text-subdued hover:text-ink rounded-vds-lg hover:bg-surface-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-ink-lighter block">
                    Ngày hoàn thành thực tế:
                  </label>
                  <input
                    type="date"
                    value={adminDateInput}
                    onChange={(e) => setAdminDateInput(e.target.value)}
                    className="w-full p-2 border border-line rounded-vds-lg text-xs font-ui"
                  />
                  {adminDateInput && (
                    <p className="text-xs text-subdued pt-0.5">
                      Hiển thị: <strong>{formatDateWithEnDay(adminDateInput)}</strong>
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-ink-lighter block">
                    Giờ hoàn thành:
                  </label>
                  <input
                    type="time"
                    value={adminTimeInput}
                    onChange={(e) => setAdminTimeInput(e.target.value)}
                    className="w-full p-2 border border-line rounded-vds-lg text-xs font-ui"
                  />
                </div>

                {/* Ô nhập Link kết quả */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-ink-lighter block">
                      Link kết quả hoàn thành:
                    </label>
                    {workLink && !adminResultLinkInput && (
                      <button
                        type="button"
                        onClick={() => setAdminResultLinkInput(workLink)}
                        className="text-xs text-accent hover:underline cursor-pointer"
                      >
                        Dùng link làm việc
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={adminResultLinkInput}
                    onChange={(e) => setAdminResultLinkInput(e.target.value)}
                    placeholder="https://figma.com/... hoặc vnexpress.net/..."
                    className="w-full p-2 border border-line rounded-vds-lg text-xs font-ui"
                  />
                  <p className="text-[10px] text-accent">
                    * Lưu ý: Đảm bảo các thành viên Product có thể truy cập link.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-ink-lighter block">
                    Ghi chú xác nhận của Admin:
                  </label>
                  <input
                    type="text"
                    value={adminNoteInput}
                    onChange={(e) => setAdminNoteInput(e.target.value)}
                    placeholder="Lý do xác nhận (ví dụ: Thành viên xong hôm trước nhưng quên bấm)"
                    className="w-full p-2 border border-line rounded-vds-lg text-xs font-ui"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-divider">
                <button
                  type="button"
                  onClick={() => setShowAdminDateDialog(false)}
                  className="px-3 py-1.5 border border-line text-ink-lighter hover:text-ink rounded-vds-lg text-xs font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleAdminSaveCustomDate}
                  className="px-3.5 py-1.5 bg-accent-solid hover:bg-accent-solid-hover text-on-color rounded-vds-lg text-xs font-bold cursor-pointer "
                >
                  Lưu & Cập nhật kỷ luật
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Chỉnh sửa Quy tắc Chu kỳ từ Task Drawer */}
        {isEditingRuleModalOpen && associatedRecurringRule && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs animate-fade-in">
            <div className="bg-surface rounded-vds-lg border border-line shadow-sheet w-full max-w-sm p-5 space-y-4 font-ui">
              <div className="flex items-center justify-between border-b border-divider pb-3">
                <div className="flex items-center gap-2">
                  <RotateCw className="w-4 h-4 text-accent" />
                  <h3 className="font-bold text-sm text-ink">Chỉnh sửa Quy tắc Chu kỳ</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingRuleModalOpen(false)}
                  className="p-1 text-subdued hover:text-ink rounded-vds-lg hover:bg-surface-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveRecurringRuleUpdates} className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-ink-lighter block">
                    Tần suất lặp lại:
                  </label>
                  <select
                    value={ruleModalFreq}
                    onChange={(e) => setRuleModalFreq(e.target.value as RecurrenceFrequency)}
                    className="w-full p-2 border border-line rounded-vds-lg text-xs font-ui bg-surface font-semibold text-accent"
                  >
                    <option value="weekly">Hàng tuần (Weekly)</option>
                    <option value="biweekly">2 tuần một lần (Biweekly)</option>
                    <option value="monthly">Hàng tháng (Monthly)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-ink-lighter block">
                    Ngày chạy chu kỳ tiếp theo:
                  </label>
                  <input
                    type="date"
                    required
                    value={ruleModalNextRunDate}
                    onChange={(e) => setRuleModalNextRunDate(e.target.value)}
                    className="w-full p-2 border border-line rounded-vds-lg text-xs font-ui"
                  />
                  {ruleModalNextRunDate && (
                    <p className="text-xs text-subdued pt-0.5">
                      Dự kiến tạo tiếp: <strong>{formatDateWithEnDay(ruleModalNextRunDate)}</strong> lúc {associatedRecurringRule.nextRunTime || '08:00'}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-ink-lighter block">
                    Kết thúc lặp:
                  </label>
                  <select
                    value={ruleModalEndType}
                    onChange={(e) => setRuleModalEndType(e.target.value as RecurrenceEndType)}
                    className="w-full p-2 border border-line rounded-vds-lg text-xs font-ui bg-surface"
                  >
                    <option value="never">Không bao giờ (Never)</option>
                    <option value="specific_date">Chọn ngày kết thúc</option>
                  </select>
                </div>

                {ruleModalEndType === 'specific_date' && (
                  <div className="space-y-1 p-2.5 bg-surface-100 rounded-vds-lg border border-line">
                    <label className="font-bold text-ink-lighter block">
                      Ngày kết thúc:
                    </label>
                    <input
                      type="date"
                      required
                      value={ruleModalEndDate}
                      onChange={(e) => setRuleModalEndDate(e.target.value)}
                      className="w-full p-2 border border-line rounded-vds-lg text-xs font-ui"
                    />
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-divider">
                  <button
                    type="button"
                    onClick={() => setIsEditingRuleModalOpen(false)}
                    className="px-3 py-1.5 border border-line text-ink-lighter hover:text-ink rounded-vds-lg text-xs font-bold cursor-pointer"
                  >
                    Huỷ
                  </button>
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 bg-accent-solid hover:bg-accent-solid-hover text-on-color rounded-vds-lg text-xs font-bold cursor-pointer "
                  >
                    Lưu thay đổi
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Xác nhận Xoá Quy tắc Chu kỳ từ Task Drawer */}
        {isDeletingRuleConfirmOpen && associatedRecurringRule && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs animate-fade-in">
            <div className="bg-surface rounded-vds-lg border border-line shadow-sheet w-full max-w-sm p-5 space-y-4 font-ui">
              <div className="flex items-center gap-2 text-negative">
                <Trash2 className="w-5 h-5 shrink-0" />
                <h3 className="font-bold text-sm text-ink">Xoá Quy tắc Lặp chu kỳ?</h3>
              </div>

              <p className="text-xs text-ink-lighter leading-relaxed">
                Hệ thống sẽ dừng hoàn toàn và xoá vĩnh viễn quy tắc lặp <strong>"{associatedRecurringRule.title}"</strong>. Không tự động tạo thêm công việc mới trong tương lai.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-divider">
                <button
                  type="button"
                  onClick={() => setIsDeletingRuleConfirmOpen(false)}
                  className="px-3 py-1.5 border border-line text-ink-lighter hover:text-ink rounded-vds-lg text-xs font-bold cursor-pointer"
                >
                  Huỷ
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteRecurringRule}
                  className="px-3.5 py-1.5 bg-negative-solid hover:bg-negative-solid text-on-color rounded-vds-lg text-xs font-bold cursor-pointer "
                >
                  Xác nhận xoá
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Xác nhận Xoá Task kèm tùy chọn Xoá vĩnh viễn */}
        {isDeleteTaskModalOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs animate-fade-in">
            <div className="bg-surface rounded-vds-lg border border-line shadow-sheet w-full max-w-sm p-5 space-y-4 font-ui">
              <div className="flex items-center gap-2 text-negative">
                <Trash2 className="w-5 h-5 shrink-0" />
                <h3 className="font-bold text-sm text-ink">Xác nhận xoá công việc</h3>
              </div>

              <p className="text-xs text-ink-lighter leading-relaxed">
                Bạn có chắc chắn muốn xoá công việc <strong>"{task.title}"</strong>?
              </p>

              <label className="flex items-start gap-2.5 p-2.5 rounded-vds-lg bg-surface-negative/60 border border-line cursor-pointer hover:bg-surface-negative transition-colors select-none">
                <input
                  type="checkbox"
                  checked={isPermanentDeleteTask}
                  onChange={(e) => setIsPermanentDeleteTask(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-negative border-line-negative focus:ring-line-negative cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-bold text-negative block">Xoá vĩnh viễn</span>
                  <span className="text-xs text-subdued block leading-tight">
                    Xoá thẳng khỏi hệ thống, không lưu vào Thùng rác
                  </span>
                </div>
              </label>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-divider">
                <button
                  type="button"
                  onClick={() => setIsDeleteTaskModalOpen(false)}
                  className="px-3 py-1.5 border border-line text-ink-lighter hover:text-ink rounded-vds-lg text-xs font-bold cursor-pointer"
                >
                  Huỷ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteTask(task.id, isPermanentDeleteTask);
                    setIsDeleteTaskModalOpen(false);
                    onClose();
                  }}
                  className="px-3.5 py-1.5 bg-negative-solid hover:bg-negative-solid text-on-color rounded-vds-lg text-xs font-bold cursor-pointer "
                >
                  {isPermanentDeleteTask ? 'Xoá vĩnh viễn' : 'Xoá công việc'}
                </button>
              </div>
            </div>
          </div>
        )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
