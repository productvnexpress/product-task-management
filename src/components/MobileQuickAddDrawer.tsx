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
  FolderItem,
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
} from './vds/icons';
import { VdsButton } from './vds';
import { formatDateWithEnDay } from '../utils/formatters';
import { getProductMembers, isSamePersonName } from '../utils/memberPersonalization';
import { getTodayDateString } from '../utils/dateUtils';
import { getTaskCreationProjectGroups } from '../utils/projectSortingUtils';
import {
  INITIAL_FOLDERS,
  getFlattenedFolderOptions,
  getFolderPath,
  inferProjectFolderId,
} from '../utils/folderUtils';
import { SmartTitleInput } from './smart/SmartTitleInput';
import { QuickAddParseResult } from '../utils/quickAddParser';
import { TitleQualityResult, checkTitleQuality } from '../utils/titleQuality';

export interface MobileQuickAddDrawerProps {
  isOpen: boolean;
  onClose: () => void;
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
    priority: PriorityLevel;
    details?: string;
    recurringRuleId?: string;
    isRecurring?: boolean;
    recurringFrequency?: RecurrenceFrequency;
  }) => void;
  defaultFolderId?: string;
  defaultProjectId?: string;
  defaultAssignee?: string;
  currentUser?: MemberItem | null;
}

export const MobileQuickAddDrawer: React.FC<MobileQuickAddDrawerProps> = ({
  isOpen,
  onClose,
  folders = INITIAL_FOLDERS,
  projects,
  tasks = [],
  members,
  onAddTask,
  defaultFolderId,
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

  // Gõ nhanh @người #dự án mai ! + kiểm tra tiêu đề chung chung
  const [parsed, setParsed] = useState<QuickAddParseResult | null>(null);
  const [manualOverride, setManualOverride] = useState<{ assignee?: boolean; project?: boolean; date?: boolean }>({});
  const [quality, setQuality] = useState<TitleQualityResult | null>(null);
  const [addedCount, setAddedCount] = useState(0);
  const [lastAdded, setLastAdded] = useState<string | null>(null);

  const effAssignee = (!manualOverride.assignee && parsed?.assignee?.name) || assignee;
  const effProjectId = (!manualOverride.project && parsed?.project?.id) || projectId;
  const effDueDate = !manualOverride.date && parsed?.dueDate ? parsed.dueDate : dueDate;
  const effUrgent = Boolean(parsed?.isUrgent) || isUrgent;

  // Group dự án thông minh
  const projectGroups = useMemo(() => {
    return getTaskCreationProjectGroups(projects, assignee, members, tasks);
  }, [projects, assignee, members, tasks]);

  const flattenedFolders = useMemo(() => getFlattenedFolderOptions(folders), [folders]);

  // Khởi tạo/cập nhật dự án hoặc folder mặc định khi mở drawer
  const wasOpenRef = useRef(false);
  useEffect(() => {
    const justOpened = isOpen && !wasOpenRef.current;
    wasOpenRef.current = isOpen;
    if (justOpened) {
      if (defaultProjectId && (defaultProjectId.startsWith('folder:') || projects.some((p) => p.id === defaultProjectId))) {
        setProjectId(defaultProjectId);
      } else if (defaultFolderId && defaultFolderId !== 'all') {
        setProjectId(`folder:${defaultFolderId}`);
      } else {
        const fallback =
          projectGroups.myProjects[0]?.id ||
          projectGroups.otherProjects[0]?.id ||
          projectGroups.unspecifiedProject?.id ||
          projects[0]?.id ||
          'folder:folder-vne';
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
      setTitle('');
      setQuality(null);
      setManualOverride({});
      setAddedCount(0);
      setLastAdded(null);

      // Auto-focus input
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [isOpen, defaultFolderId, defaultProjectId, defaultAssignee, currentUser, projects, projectGroups, todayStr]);

  const isDirectFolder = effProjectId.startsWith('folder:');
  const selectedProj = useMemo(
    () => (isDirectFolder ? undefined : projects.find((p) => p.id === effProjectId)),
    [projects, effProjectId, isDirectFolder]
  );
  const availablePhases = selectedProj?.phases || [];

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

  const handleQuickDateSelect = (dateVal: string) => {
    setManualOverride((o) => ({ ...o, date: true }));
    setDueDate(dateVal);
  };

  const handleOpenNativeDatePicker = () => {
    try {
      customDateInputRef.current?.showPicker?.();
    } catch (_) {
      customDateInputRef.current?.focus();
    }
  };

  const isAssigningToOther = Boolean(
    currentUser?.name && effAssignee && !isSamePersonName(effAssignee, currentUser.name)
  );

  const handleSubmit = (opts?: { keepOpen?: boolean }) => {
    const finalTitle = (parsed?.title ?? title).trim();
    if (!finalTitle) {
      setErrorMsg('Nhập tên công việc');
      inputRef.current?.focus();
      return;
    }
    // Lần đầu gặp tiêu đề chung chung: cảnh báo. Lần tiếp theo: tôn trọng lựa chọn của người dùng.
    if (!quality?.isVague) {
      const q = checkTitleQuality(finalTitle);
      if (q.isVague) {
        setQuality(q);
        inputRef.current?.focus();
        return;
      }
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
    const finalDueDate = isAssigningToOther && !effDueDate ? '' : (effDueDate || todayStr);

    onAddTask({
      title: finalTitle,
      folderId: resolvedFolderId,
      folderName: resolvedFolderPath,
      projectId: isDirectFolder ? '' : effProjectId,
      projectName: projName,
      phaseId: foundPhase ? foundPhase.id : undefined,
      phaseName: foundPhase ? foundPhase.name : undefined,
      team,
      assignee: effAssignee,
      dueDate: finalDueDate,
      priority: effUrgent ? 'Khẩn cấp' : 'Bình thường',
    });

    navigator.vibrate?.(10);
    setTitle('');
    setQuality(null);
    setManualOverride({});
    setIsUrgent(false);
    if (opts?.keepOpen) {
      setAddedCount((n) => n + 1);
      setLastAdded(finalTitle);
      inputRef.current?.focus();
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  const isTodayActive = effDueDate === todayStr;
  const isTomorrowActive = effDueDate === tomorrowStr;
  const isCustomActive = Boolean(effDueDate && !isTodayActive && !isTomorrowActive);

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
          className="relative z-10 w-full bg-surface rounded-t-vds-xl shadow-sheet flex flex-col max-h-[90vh] overflow-hidden border-t border-line"
        >
          {/* Grab Handle */}
          <div className="w-full flex items-center justify-center pt-2.5 pb-1">
            <div className="w-10 h-1 bg-surface-300 rounded-full" />
          </div>

          {/* Header */}
          <div className="px-5 py-3 border-b border-divider flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-accent-solid text-on-color flex items-center justify-center ">
                <Plus className="w-4 h-4 stroke-[3]" />
              </div>
              <h2 className="font-title text-base font-bold text-ink">
                Thêm việc nhanh
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-subdued hover:text-ink hover:bg-surface-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            className="p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] space-y-4 overflow-y-auto"
          >
            {/* Error banner */}
            {errorMsg && (
              <div className="p-2.5 bg-surface-negative border border-line text-negative text-xs font-bold rounded-vds-lg flex items-center gap-2 animate-shake">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* 1. Tiêu đề công việc */}
            <div className="space-y-1.5">
              <SmartTitleInput
                inputRef={inputRef}
                value={title}
                onChange={(v) => {
                  setTitle(v);
                  if (errorMsg) setErrorMsg('');
                  if (quality) setQuality(null);
                }}
                members={productMembers}
                projects={projects}
                onParsedChange={setParsed}
                onSubmit={() => handleSubmit({ keepOpen: true })}
                quality={quality}
                onConfirmVague={() => handleSubmit({ keepOpen: true })}
                placeholder="Cần làm gì? VD: Chốt layout trang Xe mai"
                enterKeyHint="next"
                inputClassName="w-full px-3.5 py-3 rounded-vds-lg border border-line focus:border-line-accent focus:ring-2 focus:ring-line-accent/15 text-[16px] font-title font-medium text-ink placeholder-subdued-lighter bg-surface transition-colors outline-hidden"
              />
              {lastAdded && (
                <p className="text-[12px] font-ui text-positive truncate animate-fade-in">
                  ✓ Đã thêm {addedCount} việc · gần nhất: “{lastAdded}”
                </p>
              )}
            </div>

            {/* 2. Hạn hoàn thành - Quick Chips 1-tap: Hôm nay, Ngày mai, Khác */}
            <div className="space-y-1.5">
              <label className="font-ui text-xs font-bold text-ink-lighter flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-accent" />
                  <span>Hạn hoàn thành:</span>
                </div>
                <span className="text-xs font-semibold text-accent">
                  {effDueDate ? formatDateWithEnDay(effDueDate) : 'Người nhận tự chọn hạn'}
                </span>
              </label>

              <div className={`grid ${isAssigningToOther ? 'grid-cols-2' : 'grid-cols-3'} gap-2`}>
                <button
                  type="button"
                  onClick={() => handleQuickDateSelect(todayStr)}
                  className={`h-10 px-2 rounded-vds-lg border text-xs font-ui font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    isTodayActive
                      ? 'bg-surface-selected text-accent border-line-accent-soft '
                      : 'bg-surface-100 text-ink-lighter border-line hover:bg-surface-200'
                  }`}
                >
                  {isTodayActive && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  <span>Hôm nay</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDateSelect(tomorrowStr)}
                  className={`h-10 px-2 rounded-vds-lg border text-xs font-ui font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    isTomorrowActive
                      ? 'bg-surface-selected text-accent border-line-accent-soft '
                      : 'bg-surface-100 text-ink-lighter border-line hover:bg-surface-200'
                  }`}
                >
                  {isTomorrowActive && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  <span>Ngày mai</span>
                </button>

                <div
                  onClick={handleOpenNativeDatePicker}
                  className={`relative h-10 px-2 rounded-vds-lg border text-xs font-ui font-semibold flex items-center justify-center gap-1 transition cursor-pointer ${
                    isCustomActive
                      ? 'bg-surface-selected text-accent border-line-accent-soft '
                      : 'bg-surface-100 text-ink-lighter border-line hover:bg-surface-200'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">
                    {isCustomActive ? effDueDate.slice(8, 10) + '/' + effDueDate.slice(5, 7) : 'Ngày khác'}
                  </span>
                  <input
                    ref={customDateInputRef}
                    type="date"
                    value={effDueDate}
                    onChange={(e) => {
                      if (e.target.value) handleQuickDateSelect(e.target.value);
                    }}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer pointer-events-auto"
                  />
                </div>

                {/* Tuỳ chọn bỏ chọn hạn khi giao cho người khác */}
                {isAssigningToOther && (
                  <button
                    type="button"
                    onClick={() => handleQuickDateSelect('')}
                    className={`h-10 px-2 rounded-vds-lg border text-xs font-ui font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      !effDueDate
                        ? 'bg-surface-selected text-accent border-line-accent-soft '
                        : 'bg-surface-100 text-ink-lighter border-line hover:bg-surface-200'
                    }`}
                  >
                    {!effDueDate && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    <span>Để người nhận chọn</span>
                  </button>
                )}
              </div>
            </div>

            {/* 3. Thư mục / Dự án & Giai đoạn */}
            <div className="space-y-1.5">
              <label className="font-ui text-xs font-bold text-ink-lighter flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-accent" />
                <span>Thư mục / Dự án:</span>
              </label>
              <div className="relative">
                <select
                  value={effProjectId}
                  onChange={(e) => {
                    setManualOverride((o) => ({ ...o, project: true }));
                    handleProjectSelect(e.target.value);
                  }}
                  className="w-full h-11 px-3 rounded-vds-lg border border-line bg-surface-100 text-xs font-ui font-semibold text-ink focus:border-line-accent focus:bg-surface focus:outline-hidden transition"
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
                  <optgroup
                    label={
                      projectGroups.myProjects.length > 0
                        ? '── Dự án khác ──'
                        : '── Danh sách dự án ──'
                    }
                  >
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

              {/* Giai đoạn (nếu dự án có giai đoạn) */}
              {availablePhases.length > 0 && (
                <div className="pt-1">
                  <div className="flex items-center gap-1.5 bg-surface-100 px-3 py-2 rounded-vds-lg border border-line">
                    <Layers className="w-3.5 h-3.5 text-subdued shrink-0" />
                    <select
                      value={phaseId}
                      onChange={(e) => setPhaseId(e.target.value)}
                      className="w-full bg-transparent text-ink text-xs font-ui focus:outline-hidden cursor-pointer"
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
                <label className="font-ui text-xs font-bold text-ink-lighter flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-subdued" />
                  <span>Phụ trách:</span>
                </label>
                <select
                  value={effAssignee}
                  onChange={(e) => {
                    setManualOverride((o) => ({ ...o, assignee: true }));
                    setAssignee(e.target.value);
                  }}
                  className="w-full h-10 px-2.5 rounded-vds-lg border border-line bg-surface-100 text-xs font-ui text-ink focus:border-line-accent focus:bg-surface focus:outline-hidden"
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
                <label className="font-ui text-xs font-bold text-ink-lighter">
                  Mức độ:
                </label>
                <label
                  className={`h-10 px-2.5 rounded-vds-lg border flex items-center gap-2 cursor-pointer transition select-none ${
                    effUrgent
                      ? 'bg-surface-negative border-line text-negative'
                      : 'bg-surface-100 border-line text-ink-lighter'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={effUrgent}
                    onChange={(e) => setIsUrgent(e.target.checked)}
                    className="w-4 h-4 text-accent rounded border-line focus:ring-line-accent cursor-pointer"
                  />
                  <span className="text-xs font-ui font-bold">
                    {effUrgent ? '🚨 Khẩn cấp' : 'Bình thường'}
                  </span>
                </label>
              </div>
            </div>

            {/* 5. Nút Thêm công việc - Primary Bottom Action */}
            <div className="pt-2 pb-2">
              <VdsButton type="submit" variant="accent" size="lg" fullWidth iconRight="ArrowRight">
                {addedCount > 0 ? 'Thêm & đóng' : 'Thêm việc'}
              </VdsButton>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
