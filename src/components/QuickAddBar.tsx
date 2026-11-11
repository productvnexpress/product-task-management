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
  FolderItem,
} from '../types';
import { Plus, CornerDownLeft, Calendar, User, Briefcase, Layers, ListChecks, RotateCw, Folder } from './vds/icons';
import { formatDateWithEnDay } from '../utils/formatters';
import { getProductMembers, isSamePersonName } from '../utils/memberPersonalization';
import { getTodayDateString } from '../utils/dateUtils';
import { getTaskCreationProjectGroups, isOthersProject } from '../utils/projectSortingUtils';
import {
  INITIAL_FOLDERS,
  getFlattenedFolderOptions,
  getFolderPath,
  inferProjectFolderId,
} from '../utils/folderUtils';
import { ProjectChecklistModal } from './ProjectChecklistModal';
import { calculateChecklistStats } from '../data/defaultProjectChecklist';
import { getUserRole } from '../utils/rbac';
import { recurringTaskService, calculateNextCycleDate } from '../services/recurringTaskService';
import { SmartTitleInput } from './smart/SmartTitleInput';
import { QuickAddParseResult } from '../utils/quickAddParser';
import { TitleQualityResult, checkTitleQuality } from '../utils/titleQuality';
import { ESTIMATE_REQUIRED } from '../utils/estimate';
import { EstimateSelect } from './tasks/EstimateField';

interface QuickAddBarProps {
  folders?: FolderItem[];
  projects: ProjectItem[];
  tasks?: TaskItem[];
  members: MemberItem[];
  onAddTask: (task: {
    id?: string;
    title: string;
    folderId?: string;
    folderName?: string;
    projectId: string;
    projectName: string;
    phaseId?: string;
    phaseName?: string;
    team: TeamType;
    assignee: string;
    dueDate?: string;
    estimateMinutes?: number;
    priority: PriorityLevel;
    details?: string;
    recurringRuleId?: string;
    isRecurring?: boolean;
    recurringFrequency?: RecurrenceFrequency;
  }) => void;
  defaultFolderId?: string;
  defaultProjectId?: string;
  defaultAssignee?: string;
  onUpdateProjectChecklist?: (projectId: string, updatedChecklist: ProjectChecklistItem[]) => void;
  currentUser?: MemberItem | null;
}

export const QuickAddBar: React.FC<QuickAddBarProps> = ({
  folders = INITIAL_FOLDERS,
  projects,
  tasks = [],
  members,
  onAddTask,
  defaultFolderId,
  defaultProjectId,
  defaultAssignee,
  onUpdateProjectChecklist,
  currentUser,
}) => {
  const productMembers = useMemo(() => getProductMembers(members), [members]);
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState(defaultAssignee || productMembers[0]?.name || 'Hệ thống');
  const [isChecklistModalOpen, setIsChecklistModalOpen] = useState(false);

  // Calculate project groups: Group 1 (Participated projects by latest task), Group 2 (Other projects A-Z), Others (Special)
  const projectGroups = useMemo(() => {
    return getTaskCreationProjectGroups(projects, assignee, members, tasks);
  }, [projects, assignee, members, tasks]);

  const flattenedFolders = useMemo(() => getFlattenedFolderOptions(folders), [folders]);

  // Default projectId or folderId selection
  const initialProjectId = useMemo(() => {
    if (defaultProjectId && (defaultProjectId.startsWith('folder:') || projects.some((p) => p.id === defaultProjectId))) {
      return defaultProjectId;
    }
    if (defaultFolderId && defaultFolderId !== 'all') {
      return `folder:${defaultFolderId}`;
    }
    return (
      projectGroups.myProjects[0]?.id ||
      projectGroups.otherProjects[0]?.id ||
      projectGroups.unspecifiedProject?.id ||
      projects[0]?.id ||
      'folder:folder-vne'
    );
  }, [defaultFolderId, defaultProjectId, projects, projectGroups]);

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

  // Cú pháp gõ nhanh (@người #dự án mai !) & kiểm tra tiêu đề chung chung
  const [parsed, setParsed] = useState<QuickAddParseResult | null>(null);
  const [manualOverride, setManualOverride] = useState<{ assignee?: boolean; project?: boolean; date?: boolean }>({});
  const [quality, setQuality] = useState<TitleQualityResult | null>(null);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const effAssignee = (!manualOverride.assignee && parsed?.assignee?.name) || assignee;
  const effProjectId = (!manualOverride.project && parsed?.project?.id) || projectId;
  const effDueDate = !manualOverride.date && parsed?.dueDate ? parsed.dueDate : dueDate;
  const effUrgent = Boolean(parsed?.isUrgent) || isUrgent;
  const [estimate, setEstimate] = useState<number | undefined>(undefined);
  const [estimateMissing, setEstimateMissing] = useState(false);
  const [estimateManual, setEstimateManual] = useState(false);
  // Token ~2h trong tiêu đề thắng ô chọn; người dùng tự đổi ô chọn thì ô chọn thắng.
  const effEstimate = estimateManual ? estimate : parsed?.estimateMinutes ?? estimate;
  const isAssigningToOther = Boolean(
    currentUser?.name && effAssignee && !isSamePersonName(effAssignee, currentUser.name)
  );

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
    if (defaultProjectId && (defaultProjectId.startsWith('folder:') || projects.some((p) => p.id === defaultProjectId))) {
      setProjectId(defaultProjectId);
    } else if (defaultFolderId && defaultFolderId !== 'all') {
      setProjectId(`folder:${defaultFolderId}`);
    }
  }, [defaultFolderId, defaultProjectId, projects]);

  // Sync projectId if current one becomes invalid
  useEffect(() => {
    const isValidFolder = projectId.startsWith('folder:') && folders.some((f) => f.id === projectId.replace(/^folder:/, ''));
    const isValidProj = projects.some((p) => p.id === projectId);
    if (!projectId || (!isValidFolder && !isValidProj)) {
      const fallbackId =
        projectGroups.myProjects[0]?.id ||
        projectGroups.otherProjects[0]?.id ||
        projectGroups.unspecifiedProject?.id ||
        projects[0]?.id ||
        'folder:folder-vne';
      if (fallbackId) setProjectId(fallbackId);
    }
  }, [projects, folders, projectGroups, projectId]);

  const isDirectFolder = effProjectId.startsWith('folder:');
  const selectedProj = isDirectFolder ? undefined : projects.find((p) => p.id === effProjectId);
  const availablePhases = selectedProj?.phases || [];

  const checklistStats = useMemo(() => {
    if (!selectedProj || isOthersProject(selectedProj.id)) return null;
    return calculateChecklistStats(selectedProj.checklist);
  }, [selectedProj]);

  const handleProjectSelect = (pId: string) => {
    setProjectId(pId);
    if (pId.startsWith('folder:')) {
      setPhaseId('');
      return;
    }
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

  const submitTask = (skipQualityCheck = false) => {
    const finalTitle = (parsed?.title ?? title).trim();
    if (!finalTitle) return;

    if (!skipQualityCheck) {
      const q = checkTitleQuality(finalTitle);
      if (q.isVague) {
        setQuality(q);
        setIsExpanded(true);
        return;
      }
    }

    // Việc tự đăng ký phải có ước lượng thời gian. Việc giao cho người khác: người nhận bổ sung sau.
    if (ESTIMATE_REQUIRED && !effEstimate && !isAssigningToOther) {
      setEstimateMissing(true);
      setIsExpanded(true);
      return;
    }

    const resolvedFolderId = isDirectFolder
      ? effProjectId.replace(/^folder:/, '')
      : selectedProj?.folderId || inferProjectFolderId(selectedProj || {});
    const resolvedFolderPath = getFolderPath(resolvedFolderId, folders);

    const projName = isDirectFolder
      ? resolvedFolderPath
      : selectedProj
      ? selectedProj.name
      : 'Chưa xác định (Others)';
    const foundPhase = isDirectFolder ? undefined : availablePhases.find((ph) => ph.id === phaseId);
    const selectedMember = members.find((m) => m.name === effAssignee);
    const team: TeamType = selectedMember?.team || 'Product Manager';
    const initialDueDate = isAssigningToOther && !effDueDate ? '' : (effDueDate || getTodayDateString());
    const priority: PriorityLevel = effUrgent ? 'Khẩn cấp' : 'Bình thường';

    let recurringRuleId: string | undefined = undefined;

    // Lưu quy tắc lặp nếu là Admin và bật tính năng chu kỳ
    const nowIso = new Date().toISOString();
    if (isRecurring && isAdmin) {
      recurringRuleId = `rec-${Date.now()}`;
      const nextRun = calculateNextCycleDate(initialDueDate || getTodayDateString(), recurringFrequency);

      const newRule: RecurringRuleConfig = {
        id: recurringRuleId,
        title: finalTitle,
        projectId: isDirectFolder ? `folder:${resolvedFolderId}` : effProjectId,
        projectName: projName,
        phaseId: foundPhase ? foundPhase.id : undefined,
        phaseName: foundPhase ? foundPhase.name : undefined,
        team,
        assignee: effAssignee,
        priority,
        frequency: recurringFrequency,
        endType: recurringEndType,
        endDate: recurringEndType === 'specific_date' && recurringEndDate ? recurringEndDate : undefined,
        nextRunDate: nextRun,
        nextRunTime: '08:00',
        lastGeneratedAt: nowIso,
        status: 'active',
        createdAt: nowIso,
        createdBy: currentUser?.name || 'Admin',
      };

      recurringTaskService.saveRule(newRule);
    }

    onAddTask({
      id: recurringRuleId ? `task-rec-${recurringRuleId}-${initialDueDate}` : undefined,
      title: finalTitle,
      folderId: resolvedFolderId,
      folderName: resolvedFolderPath,
      projectId: isDirectFolder ? '' : effProjectId,
      projectName: projName,
      phaseId: foundPhase ? foundPhase.id : undefined,
      phaseName: foundPhase ? foundPhase.name : undefined,
      team,
      assignee: effAssignee,
      dueDate: initialDueDate,
      estimateMinutes: effEstimate,
      priority,
      recurringRuleId,
      isRecurring: Boolean(isRecurring && isAdmin),
      recurringFrequency: isRecurring && isAdmin ? recurringFrequency : undefined,
    });

    // Giữ nguyên dự án & người phụ trách để thêm việc liên tiếp nhanh hơn
    setTitle('');
    setQuality(null);
    setManualOverride({});
    setDueDate(getTodayDateString());
    setIsUrgent(false);
    setEstimate(undefined);
    setEstimateManual(false);
    setEstimateMissing(false);
    setIsRecurring(false);
    setRecurringEndType('never');
    setRecurringEndDate('');
    setJustAdded(finalTitle);
    window.setTimeout(() => setJustAdded((cur) => (cur === finalTitle ? null : cur)), 2600);
    titleInputRef.current?.focus();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Cảnh báo đã hiện mà vẫn nhấn Enter -> người dùng chủ động giữ tiêu đề
    submitTask(Boolean(quality?.isVague));
  };

  return (
    <>
      {/* 2. Desktop Quick Add Form Box (Giữ nguyên trải nghiệm trên Desktop >= md) */}
      <div className="hidden md:block bg-surface border border-line focus-within:border-line-accent rounded-vds-lg transition p-4 ">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full border border-line-regular flex items-center justify-center text-subdued shrink-0">
              <Plus className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <SmartTitleInput
                id="quick-add-input"
                inputRef={titleInputRef}
                value={title}
                onChange={(v) => {
                  setTitle(v);
                  if (quality) setQuality(null);
                }}
                members={productMembers}
                projects={projects}
                onParsedChange={setParsed}
                onFocus={() => setIsExpanded(true)}
                quality={quality}
                onConfirmVague={() => submitTask(true)}
                placeholder="Thêm việc… (gõ @tên #dự án mai ~2h ! rồi Enter)"
                inputClassName="w-full text-sm font-body text-ink placeholder-subdued focus:outline-hidden focus-visible:shadow-none! bg-transparent py-0.5"
              />
              {estimateMissing && !effEstimate && (
                <p role="alert" className="mt-1.5 text-xs font-ui text-warning">
                  Chọn ước lượng thời gian làm, hoặc gõ ~2h trong tiêu đề, rồi nhấn Enter.
                </p>
              )}
              <AnimatePresence>
                {justAdded && (
                  <motion.p
                    initial={{ opacity: 0, y: -2 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="mt-1.5 text-xs font-ui text-positive truncate"
                  >
                    ✓ Đã thêm “{justAdded}”
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
            {title.trim() && (
              <motion.button
                type="submit"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.95 }}
                className="h-[32px] px-4 rounded-vds-lg bg-accent-solid text-on-color text-xs font-ui font-bold flex items-center gap-1.5 shrink-0 hover:bg-accent-solid-hover transition-colors cursor-pointer"
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
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-divider text-xs font-ui">
                <div className="flex flex-wrap items-center gap-2">
              {/* Folder / Project selector */}
              <div className="flex items-center gap-1.5 bg-surface-100 px-2.5 py-1.5 rounded-vds-lg border border-line">
                {isDirectFolder ? (
                  <Folder className="w-3.5 h-3.5 text-accent shrink-0" />
                ) : (
                  <Briefcase className="w-3.5 h-3.5 text-accent shrink-0" />
                )}
                <select
                  value={effProjectId}
                  onChange={(e) => {
                    setManualOverride((o) => ({ ...o, project: true }));
                    handleProjectSelect(e.target.value);
                  }}
                  className="bg-transparent text-ink text-xs font-ui focus:outline-hidden cursor-pointer max-w-[240px] truncate"
                  title="Chọn Thư mục (trực tiếp cho task tinh chỉnh nhỏ) hoặc Dự án"
                >
                  <optgroup label="── 📁 Trực tiếp trong Thư mục (Tinh chỉnh nhỏ) ──">
                    {flattenedFolders.map((item) => (
                      <option key={`folder:${item.folder.id}`} value={`folder:${item.folder.id}`}>
                        {item.depth > 0 ? `  ↳ 📂 ${item.fullPath}` : `📁 ${item.fullPath}`} (Trực tiếp)
                      </option>
                    ))}
                  </optgroup>

                  {projectGroups.myProjects.length > 0 && (
                    <optgroup label="── 🚀 Dự án tham gia ──">
                      {projectGroups.myProjects.map((p) => {
                        const fPath = getFolderPath(p.folderId || inferProjectFolderId(p), folders);
                        return (
                          <option key={p.id} value={p.id}>
                            [{fPath}] {p.name.replace(/^Dự án\s+/i, '')}
                          </option>
                        );
                      })}
                    </optgroup>
                  )}
                  <optgroup label={projectGroups.myProjects.length > 0 ? "── Dự án khác ──" : "── Danh sách dự án ──"}>
                    {projectGroups.otherProjects.map((p) => {
                      const fPath = getFolderPath(p.folderId || inferProjectFolderId(p), folders);
                      return (
                        <option key={p.id} value={p.id}>
                          [{fPath}] {p.name.replace(/^Dự án\s+/i, '')}
                        </option>
                      );
                    })}
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

              {/* Checklist quick button (Tạm thời ẩn với người dùng, vẫn giữ trong phần Thiết lập) */}
              {/* {selectedProj && !isOthersProject(selectedProj.id) && ( ... )} */}

              {/* Phase selector if available */}
              {availablePhases.length > 0 && (
                <div className="flex items-center gap-1.5 bg-surface-100 px-2.5 py-1.5 rounded-vds-lg border border-line">
                  <Layers className="w-3.5 h-3.5 text-subdued shrink-0" />
                  <select
                    value={phaseId}
                    onChange={(e) => setPhaseId(e.target.value)}
                    className="bg-transparent text-ink text-xs font-ui focus:outline-hidden cursor-pointer max-w-[160px] truncate"
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
              <div className="flex items-center gap-1.5 bg-surface-100 px-2.5 py-1.5 rounded-vds-lg border border-line">
                <User className="w-3.5 h-3.5 text-subdued shrink-0" />
                <select
                  value={effAssignee}
                  onChange={(e) => {
                    const newAssignee = e.target.value;
                    setManualOverride((o) => ({ ...o, assignee: true }));
                    setAssignee(newAssignee);
                    if (currentUser?.name && isSamePersonName(newAssignee, currentUser.name) && !dueDate) {
                      setDueDate(getTodayDateString());
                    }
                  }}
                  className="bg-transparent text-ink text-xs font-ui focus:outline-hidden cursor-pointer"
                >
                  {productMembers.map((m) => (
                    <option key={m.id} value={m.name}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Due date with full date label preview & optional deadline for others */}
              <div className="flex items-center gap-1.5">
                <div
                  onClick={handleTriggerDatePicker}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-vds-lg border cursor-pointer transition-colors ${
                    !effDueDate
                      ? 'bg-surface-warning border-line text-warning'
                      : 'bg-surface-100 border-line text-ink hover:bg-surface-200'
                  }`}
                  title={effDueDate ? 'Bấm để chọn hạn hoàn thành' : 'Chưa đặt hạn (người nhận sẽ tự chọn)'}
                >
                  <Calendar className={`w-3.5 h-3.5 shrink-0 pointer-events-none ${!effDueDate ? 'text-warning' : 'text-subdued'}`} />
                  <input
                    ref={dateInputRef}
                    type="date"
                    min={minDueDate}
                    value={effDueDate}
                    onChange={(e) => {
                      setManualOverride((o) => ({ ...o, date: true }));
                      setDueDate(e.target.value);
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      try {
                        (e.target as any).showPicker?.();
                      } catch (_) {}
                    }}
                    className={`bg-transparent text-xs font-ui focus:outline-hidden cursor-pointer ${
                      !effDueDate ? 'w-0 opacity-0 pointer-events-none' : 'text-ink'
                    }`}
                  />
                  {effDueDate ? (
                    <span
                      onClick={handleTriggerDatePicker}
                      className="text-ink-lighter text-xs font-ui font-medium cursor-pointer shrink-0 select-none hover:text-ink"
                    >
                      ({formatDateWithEnDay(effDueDate)})
                    </span>
                  ) : (
                    <span className="text-xs font-ui font-medium select-none text-warning">
                      Chưa đặt hạn (B chọn)
                    </span>
                  )}
                </div>

                {/* Nút tuỳ chọn: Để người nhận chọn hạn (Chỉ hiện khi giao việc cho người khác) */}
                {isAssigningToOther && (
                  <button
                    type="button"
                    onClick={() => {
                      setManualOverride((o) => ({ ...o, date: true }));
                      if (effDueDate) {
                        setDueDate('');
                      } else {
                        setDueDate(getTodayDateString());
                      }
                    }}
                    className={`text-xs font-ui px-2 py-1.5 rounded-vds-lg border transition-colors cursor-pointer shrink-0 ${
                      !effDueDate
                        ? 'bg-surface-selected text-accent border-line-accent-soft font-bold '
                        : 'bg-surface-100 text-ink-lighter border-line hover:bg-surface-200'
                    }`}
                    title={effDueDate ? 'Bỏ chọn deadline để người nhận tự chọn' : 'Đặt lại hạn hoàn thành'}
                  >
                    {!effDueDate ? '✓ Để B chọn hạn' : 'Để người nhận chọn hạn'}
                  </button>
                )}
              </div>

              {/* Ước lượng thời gian làm */}
              <EstimateSelect
                value={effEstimate}
                invalid={estimateMissing && !effEstimate}
                onChange={(minutes) => {
                  setEstimate(minutes);
                  setEstimateManual(true);
                  if (minutes) setEstimateMissing(false);
                }}
              />

              {/* Priority Checkbox */}
              <label className="flex items-center gap-1.5 bg-surface-100 px-2.5 py-1.5 rounded-vds-lg border border-line cursor-pointer text-xs font-ui text-ink select-none hover:bg-surface-200">
                <input
                  type="checkbox"
                  checked={effUrgent}
                  onChange={(e) => setIsUrgent(e.target.checked)}
                  className="w-3.5 h-3.5 text-accent rounded border-line focus:ring-line-accent cursor-pointer"
                />
                <span className={effUrgent ? 'font-bold text-negative' : 'text-ink-lighter'}>
                  🚨 Khẩn cấp
                </span>
              </label>

              {/* Recurring Checkbox (Admin Only) */}
              {isAdmin && (
                <label className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-vds-lg border cursor-pointer text-xs font-ui select-none transition-colors ${
                  isRecurring
                    ? 'bg-surface-accent-faint border-line text-accent font-bold '
                    : 'bg-surface-100 border-line text-ink-lighter hover:bg-surface-200'
                }`}>
                  <input
                    type="checkbox"
                    checked={isRecurring}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                    className="w-3.5 h-3.5 text-accent rounded border-line focus:ring-line-accent cursor-pointer"
                  />
                  <RotateCw className={`w-3.5 h-3.5 ${isRecurring ? 'text-accent' : 'text-subdued'}`} />
                  <span>Lặp lại chu kỳ</span>
                  <span className="text-[10px] bg-accent-solid text-on-color px-1 py-0.2 rounded font-ui font-bold ml-0.5">
                    Admin
                  </span>
                </label>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="text-subdued hover:text-ink px-2 py-1 cursor-pointer"
            >
              Thu gọn
            </button>
          </div>

          {/* Recurring Options Bar (Admin Only) */}
          {isAdmin && isRecurring && (
            <div className="w-full mt-2.5 bg-surface-100 border border-line rounded-vds-lg p-2.5 flex flex-wrap items-center justify-between gap-3 text-xs font-ui animate-fade-in">
              <div className="flex flex-wrap items-center gap-4">
                {/* Frequency selector: Weekly, Biweekly, Monthly */}
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-accent">Chu kỳ:</span>
                  <select
                    value={recurringFrequency}
                    onChange={(e) => setRecurringFrequency(e.target.value as RecurrenceFrequency)}
                    className="bg-surface border border-line text-ink text-xs font-ui rounded-vds-md px-2 py-1 focus:outline-hidden cursor-pointer"
                  >
                    <option value="weekly">Hàng tuần (Weekly)</option>
                    <option value="biweekly">2 tuần một lần (Biweekly)</option>
                    <option value="monthly">Hàng tháng (Monthly)</option>
                  </select>
                </div>

                {/* End condition: Never or Specific date */}
                <div className="flex items-center gap-2">
                  <span className="font-bold text-accent">Kết thúc:</span>
                  <div className="flex items-center gap-3 bg-surface border border-line rounded-vds-md px-2.5 py-1">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="recurring_end_type"
                        checked={recurringEndType === 'never'}
                        onChange={() => setRecurringEndType('never')}
                        className="text-accent focus:ring-line-accent cursor-pointer"
                      />
                      <span>Không bao giờ (Never)</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="recurring_end_type"
                        checked={recurringEndType === 'specific_date'}
                        onChange={() => setRecurringEndType('specific_date')}
                        className="text-accent focus:ring-line-accent cursor-pointer"
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
                      className="bg-surface border border-line text-ink text-xs font-ui rounded-vds-md px-2 py-1 focus:outline-hidden cursor-pointer"
                    />
                  )}
                </div>
              </div>

              <span className="text-xs text-subdued italic">
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

    </>
  );
};
