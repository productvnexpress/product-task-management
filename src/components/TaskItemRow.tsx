/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useTransform, animate, PanInfo } from 'motion/react';
import { TaskItem, TaskStatus, MemberItem, ProjectItem } from '../types';
import {
  AlertTriangle,
  Calendar,
  Check,
  ChevronRight,
  User,
  Folder,
  Layers,
  Link,
  CheckCircle2,
  Clock,
  Trash2,
  RotateCw,
  Sunrise,
  BellRing,
} from './vds/icons';
import { formatDateWithEnDay, formatMemberNameOnly } from '../utils/formatters';
import { getTaskDueDateInfo, formatTaskDueDisplay } from '../utils/dateUtils';
import { ESTIMATE_OPTIONS, formatEstimate } from '../utils/estimate';
import { canEditTask, canDeleteTask } from '../utils/rbac';
import { QuickDueMenu } from './tasks/QuickDueMenu';
import { addDaysToToday } from '../utils/taskViewUtils';

interface TaskItemRowProps {
  task: TaskItem;
  members?: MemberItem[];
  projects?: ProjectItem[];
  currentAuthUser?: MemberItem | null;
  onToggleComplete: (id: string) => void;
  onSelectTask: (task: TaskItem) => void;
  onUpdateStatus: (id: string, newStatus: TaskStatus) => void;
  onDeleteTask: (id: string, isPermanent?: boolean) => void;
  showProjectBadge?: boolean;
  isMyTask?: boolean;
  onOpenProjectDetail?: (projectId: string) => void;
  onFilterByAssignee?: (assigneeName: string) => void;
  onUpdateDueDate?: (id: string, newDueDate: string) => void;
}

const STATUS_STYLES: Record<TaskStatus, string> = {
  'Chưa làm': 'bg-surface-200 text-ink-lighter border-line hover:bg-surface-300',
  'Đang làm': 'bg-surface-info text-info border-line hover:bg-surface-info',
  'Bị nghẽn': 'bg-surface-negative text-negative border-line hover:bg-surface-negative',
  'Hoàn thành': 'bg-surface-positive text-positive border-line hover:bg-surface-positive',
};

const STATUS_TEXT: Record<TaskStatus, string> = {
  'Chưa làm': 'text-ink-lighter',
  'Đang làm': 'text-info',
  'Bị nghẽn': 'text-negative',
  'Hoàn thành': 'text-positive',
};

const STATUS_DOT: Record<TaskStatus, string> = {
  'Chưa làm': 'bg-icon-subdued',
  'Đang làm': 'bg-support-solid',
  'Bị nghẽn': 'bg-negative-solid',
  'Hoàn thành': 'bg-positive-solid',
};

const SWIPE_THRESHOLD = 88;

const isTouchDevice = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(hover: none) and (pointer: coarse)').matches;

export const TaskItemRow: React.FC<TaskItemRowProps> = ({
  task,
  members,
  projects,
  currentAuthUser,
  onToggleComplete,
  onSelectTask,
  onUpdateStatus,
  onDeleteTask,
  showProjectBadge = false,
  isMyTask = false,
  onOpenProjectDetail,
  onFilterByAssignee,
  onUpdateDueDate,
}) => {
  const userCanEdit = canEditTask(currentAuthUser, task, projects);
  const userCanDelete = canDeleteTask(currentAuthUser, task, projects);
  const isCompleted = task.status === 'Hoàn thành';
  const isBlocked = task.status === 'Bị nghẽn';
  const dueInfo = getTaskDueDateInfo(task.dueDate, task.status);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isPermanentDelete, setIsPermanentDelete] = useState(false);
  const [dueMenuAnchor, setDueMenuAnchor] = useState<HTMLElement | null>(null);

  // Vuốt trên mobile: phải = hoàn thành, trái = dời sang ngày mai
  const canSwipe = userCanEdit && !isCompleted && isTouchDevice();
  const x = useMotionValue(0);
  const dragMoved = useRef(false);
  const completeOpacity = useTransform(x, [0, 40, SWIPE_THRESHOLD], [0, 0.6, 1]);
  const postponeOpacity = useTransform(x, [-SWIPE_THRESHOLD, -40, 0], [1, 0.6, 0]);
  const iconScaleRight = useTransform(x, [0, SWIPE_THRESHOLD], [0.6, 1]);
  const iconScaleLeft = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0.6]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const dx = info.offset.x;
    if (dx > SWIPE_THRESHOLD) {
      navigator.vibrate?.(12);
      onToggleComplete(task.id);
    } else if (dx < -SWIPE_THRESHOLD && onUpdateDueDate) {
      navigator.vibrate?.(12);
      onUpdateDueDate(task.id, addDaysToToday(1));
    }
    animate(x, 0, { type: 'spring', stiffness: 500, damping: 40 });
    window.setTimeout(() => (dragMoved.current = false), 0);
  };

  const canChangeDue = userCanEdit && !isCompleted && Boolean(onUpdateDueDate);
  const assigneeLabel = task.assignee ? formatMemberNameOnly(task.assignee, members) : '';
  const phaseLabel = (() => {
    if (!task.phaseName) return '';
    const match = task.phaseName.trim().match(/^(Giai đoạn\s*\d+|Phase\s*\d+)/i);
    return match ? match[1].replace(/Phase/i, 'Giai đoạn') : '';
  })();

  const dueTone = isCompleted
    ? 'text-subdued-lighter'
    : !task.dueDate
    ? 'text-warning'
    : dueInfo.status === 'overdue'
    ? 'text-negative font-semibold'
    : dueInfo.status === 'due_today'
    ? 'text-warning font-semibold'
    : dueInfo.status === 'due_soon'
    ? 'text-warning'
    : 'text-subdued';

  const DueIcon = !isCompleted && dueInfo.status === 'overdue' ? AlertTriangle : !isCompleted && dueInfo.status === 'due_today' ? Clock : Calendar;
  // Việc đã xong không cần hiện ước lượng trên hàng: giữ danh sách gọn.
  const estimateLabel = isCompleted
    ? ''
    : ESTIMATE_OPTIONS.find((o) => o.minutes === task.estimateMinutes)?.short || formatEstimate(task.estimateMinutes);
  const currentYear = String(new Date().getFullYear());
  const dueText = task.dueDate
    ? formatTaskDueDisplay(task.dueDate).replace(new RegExp(` ${currentYear}$`), '')
    : canChangeDue
    ? 'Chọn hạn'
    : 'Chưa có hạn';

  const dueButton = (
  <button
    type="button"
    disabled={!canChangeDue}
    onPointerDown={(e) => e.stopPropagation()}
    onClick={(e) => {
      e.stopPropagation();
      setDueMenuAnchor(e.currentTarget);
    }}
    className={`inline-flex items-center gap-1 rounded-vds-md -mx-1 px-1 py-0.5 ${dueTone} ${
      canChangeDue ? 'cursor-pointer hover:bg-surface-200' : ''
    } ${!task.dueDate && canChangeDue ? 'bg-surface-warning border border-line' : ''}`}
    title={task.dueDate ? `Hạn: ${formatDateWithEnDay(task.dueDate)}${canChangeDue ? ' — bấm để đổi' : ''}` : 'Chưa có hạn'}
    aria-haspopup={canChangeDue ? 'menu' : undefined}
  >
    <DueIcon className="w-3 h-3" />
    {dueText}
  </button>
  );

  const renderStatusSelect = (compact: boolean) => (
    <select
      value={task.status}
      disabled={!userCanEdit}
      onChange={(e) => {
        e.stopPropagation();
        if (userCanEdit) onUpdateStatus(task.id, e.target.value as TaskStatus);
      }}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      aria-label="Trạng thái"
      className={
        compact
          ? `h-6 appearance-none bg-transparent border-0 p-0 pr-0.5 text-[12px] font-ui font-semibold focus:outline-hidden ${
              STATUS_TEXT[task.status]
            } ${!userCanEdit ? 'cursor-not-allowed' : 'cursor-pointer underline decoration-dotted underline-offset-4'}`
          : `h-7 text-[12px] font-ui font-semibold rounded-vds-lg pl-2 pr-1 border transition-colors focus:outline-hidden ${
              !userCanEdit ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'
            } ${STATUS_STYLES[task.status]}`
      }
      title={!userCanEdit ? 'Bạn không có quyền đổi trạng thái việc này' : 'Đổi trạng thái'}
    >
      <option value="Chưa làm">Chưa làm</option>
      <option value="Đang làm">Đang làm</option>
      <option value="Bị nghẽn">Bị nghẽn</option>
      <option value="Hoàn thành">Hoàn thành</option>
    </select>
  );

  return (
    <div className="relative overflow-hidden border-b border-divider last:border-b-0">
      {canSwipe && (
        <>
          <motion.div
            aria-hidden
            style={{ opacity: completeOpacity }}
            className="absolute inset-0 bg-positive-solid flex items-center pl-5 text-on-color"
          >
            <motion.span style={{ scale: iconScaleRight }} className="flex items-center gap-2 text-[13px] font-ui font-bold">
              <Check className="w-5 h-5 stroke-[3]" /> Hoàn thành
            </motion.span>
          </motion.div>
          <motion.div
            aria-hidden
            style={{ opacity: postponeOpacity }}
            className="absolute inset-0 bg-warning-solid flex items-center justify-end pr-5 text-on-color"
          >
            <motion.span style={{ scale: iconScaleLeft }} className="flex items-center gap-2 text-[13px] font-ui font-bold">
              Dời sang mai <Sunrise className="w-5 h-5" />
            </motion.span>
          </motion.div>
        </>
      )}

      <motion.div
        drag={canSwipe ? 'x' : false}
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.55}
        dragMomentum={false}
        onDragStart={() => (dragMoved.current = true)}
        onDragEnd={handleDragEnd}
        style={{ x, touchAction: 'pan-y' }}
        className={`group relative bg-surface hover:bg-surface-100 transition-colors pl-2 pr-3 sm:pr-4 py-2.5 sm:py-3 flex flex-col gap-1.5 ${
          isCompleted ? 'opacity-65' : ''
        } ${isMyTask && !isCompleted ? 'border-l-[3px] border-l-line-accent bg-surface-100' : 'border-l-[3px] border-l-transparent'}`}
      >
        {/* Tầng 1: Checkbox + Tiêu đề + Trạng thái/Thao tác */}
        <div className="flex items-start gap-1.5 sm:gap-2">
          <button
            type="button"
            disabled={!userCanEdit}
            onClick={(e) => {
              e.stopPropagation();
              if (userCanEdit) onToggleComplete(task.id);
            }}
            className={`group/check shrink-0 w-9 h-9 -my-1.5 flex items-center justify-center rounded-full ${
              userCanEdit ? 'cursor-pointer' : 'cursor-not-allowed'
            }`}
            aria-label={isCompleted ? 'Đánh dấu chưa xong' : 'Đánh dấu hoàn thành'}
            title={
              !userCanEdit
                ? 'Chỉ người tạo việc, người phụ trách hoặc PM dự án được cập nhật'
                : isCompleted
                ? 'Đánh dấu chưa xong'
                : 'Đánh dấu hoàn thành'
            }
          >
            <motion.span
              whileHover={userCanEdit ? { scale: 1.12 } : undefined}
              whileTap={userCanEdit ? { scale: 0.85 } : undefined}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              className={`w-[20px] h-[20px] rounded-full border-[1.5px] flex items-center justify-center transition-colors ${
                isCompleted
                  ? 'bg-surface-selected border-line-accent-soft text-accent'
                  : isBlocked
                  ? 'border-line-negative bg-surface-negative text-transparent'
                  : task.priority === 'Khẩn cấp'
                  ? 'border-line-negative bg-surface text-transparent group-hover/check:text-negative/50'
                  : 'border-line-regular bg-surface text-transparent group-hover/check:border-line-accent group-hover/check:text-accent/50'
              } ${!userCanEdit ? 'opacity-60' : ''}`}
            >
              <Check className="w-3 h-3 stroke-[3.5]" />
            </motion.span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (dragMoved.current) return;
              onSelectTask(task);
            }}
            className="flex-1 min-w-0 text-left cursor-pointer pt-px"
          >
            <span
              className={`font-title text-[14px] sm:text-[15px] font-semibold leading-snug break-words ${
                isCompleted ? 'line-through text-subdued-lighter' : 'text-ink group-hover:text-accent'
              }`}
            >
              {task.title}
            </span>
            {task.isRecurring && (
              <span
                className="inline-flex items-center gap-1 text-[10px] font-ui font-semibold px-1.5 py-px rounded-vds-md bg-surface-accent-faint text-accent border border-line ml-1.5 align-[2px]"
                title="Việc định kỳ tự tạo lúc 08:00"
              >
                <RotateCw className="w-2.5 h-2.5" />
                Chu kỳ
              </span>
            )}
          </button>

          <div className="shrink-0 flex items-center gap-0.5 sm:gap-1">
            <span className="hidden sm:inline-flex">{renderStatusSelect(false)}</span>

            {userCanDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPermanentDelete(false);
                  setIsDeleteModalOpen(true);
                }}
                className="hover-reveal hidden sm:inline-flex w-7 h-7 items-center justify-center text-subdued-lighter hover:text-negative hover:bg-surface-negative rounded-vds-lg transition-[opacity,color,background-color] cursor-pointer"
                aria-label="Xoá công việc"
                title="Xoá công việc"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={() => onSelectTask(task)}
              className="hidden sm:inline-flex w-7 h-7 items-center justify-center text-subdued-lighter hover:text-ink hover:bg-surface-200 rounded-vds-lg transition-colors cursor-pointer"
              aria-label="Xem chi tiết"
              title="Xem chi tiết"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Lý do nghẽn */}
        {isBlocked && task.blockerReason && (
          <div className="pl-[42px] sm:pl-[44px]">
            <div className="inline-flex items-start gap-1.5 bg-surface-negative text-negative text-[12px] font-ui px-2 py-1 rounded-vds-lg border border-line max-w-full">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
              <span className="break-words leading-snug">
                <span className="font-bold">Nghẽn: </span>
                {task.blockerReason}
              </span>
            </div>
          </div>
        )}

        {/* Tầng 2: Siêu dữ liệu — trái: dự án & liên kết; phải: giai đoạn • nhân sự • hạn • mức độ */}
        {/* Mobile: 1 hàng phẳng theo mức quan trọng */}
        <div className="sm:hidden pl-[42px] flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] font-ui text-subdued">
          <span className="inline-flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[task.status]}`} />
            {renderStatusSelect(true)}
          </span>
          {dueButton}
          {estimateLabel && <span title="Ước lượng thời gian làm">~{estimateLabel}</span>}
          {task.priority === 'Khẩn cấp' && (
            <span className="inline-flex items-center gap-0.5 font-semibold text-negative">
              <BellRing className="w-3 h-3" />
              Gấp
            </span>
          )}
          {task.priority === 'Ưu tiên cao' && <span className="font-semibold text-warning">Ưu tiên cao</span>}
          {task.assignee && !isMyTask && (
            <span className="inline-flex items-center gap-1 text-ink-lighter max-w-[140px]">
              <User className="w-3 h-3 shrink-0" />
              <span className="truncate">{assigneeLabel}</span>
            </span>
          )}
          {(showProjectBadge || (!task.projectId && (task.folderName || task.projectName))) && (
            <span className="inline-flex items-center gap-1 max-w-[150px]">
              <Folder className="w-3 h-3 shrink-0" />
              <span className="truncate">{(task.projectName || task.folderName || '').replace(/^Dự án\s+/i, '')}</span>
            </span>
          )}
          {(task.resultLink || task.workLink) && (
            <a
              href={(() => {
                const l = (task.resultLink || task.workLink)!;
                return l.startsWith('http') ? l : `https://${l}`;
              })()}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              className={`inline-flex items-center gap-1 ${task.resultLink ? 'text-positive' : 'text-info'}`}
            >
              {task.resultLink ? <CheckCircle2 className="w-3 h-3" /> : <Link className="w-3 h-3" />}
              {task.resultLink ? 'Kết quả' : 'Link'}
            </a>
          )}
        </div>

        <div className="hidden sm:flex pl-[44px] flex-wrap items-center gap-x-3 gap-y-1 text-[12px] font-ui text-subdued">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 min-w-0">
            {(showProjectBadge || (!task.projectId && (task.folderName || task.projectName))) &&
              (onOpenProjectDetail && task.projectId ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenProjectDetail(task.projectId);
                  }}
                  className="inline-flex items-center gap-1 text-ink-lighter hover:text-support cursor-pointer max-w-[220px]"
                  title={`Mở thông tin dự án ${task.projectName}`}
                >
                  <Folder className="w-3 h-3 shrink-0" />
                  <span className="truncate">{(task.projectName || 'Dự án').replace(/^Dự án\s+/i, '')}</span>
                </button>
              ) : (
                <span className="inline-flex items-center gap-1 text-accent max-w-[220px]" title="Việc nằm trực tiếp trong thư mục">
                  <Folder className="w-3 h-3 shrink-0" />
                  <span className="truncate">{task.folderName || task.projectName || 'Thư mục'}</span>
                </span>
              ))}

            {task.workLink && (
              <a
                href={task.workLink.startsWith('http') ? task.workLink : `https://${task.workLink}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-info hover:underline"
                title={task.workLink}
              >
                <Link className="w-3 h-3" />
                Link làm việc
              </a>
            )}
            {task.resultLink && (
              <a
                href={task.resultLink.startsWith('http') ? task.resultLink : `https://${task.resultLink}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-positive hover:underline"
                title={task.resultLink}
              >
                <CheckCircle2 className="w-3 h-3" />
                Kết quả
              </a>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 ml-auto">
            {phaseLabel && (
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1" title={task.phaseName}>
                  <Layers className="w-3 h-3" />
                  {phaseLabel}
                </span>
                <span className="text-icon-subdued">•</span>
              </span>
            )}

            {task.assignee && (
              <>
                <button
                  type="button"
                  disabled={!onFilterByAssignee}
                  onClick={(e) => {
                    e.stopPropagation();
                    onFilterByAssignee?.(task.assignee);
                  }}
                  className={`inline-flex items-center gap-1 ${onFilterByAssignee ? 'cursor-pointer hover:underline' : ''} ${
                    isMyTask ? 'text-accent font-semibold' : 'text-ink-lighter hover:text-accent'
                  }`}
                  title={onFilterByAssignee ? `Lọc việc của ${assigneeLabel}` : assigneeLabel}
                >
                  <User className="w-3 h-3" />
                  <span className="truncate max-w-[150px]">{assigneeLabel}</span>
                  {isMyTask && (
                    <span className="text-[10px] bg-accent-solid/10 text-accent font-bold px-1.5 py-px rounded-full">Tôi</span>
                  )}
                </button>
                <span className="text-icon-subdued">•</span>
              </>
            )}

            {dueButton}

            {estimateLabel && (
              <>
                <span className="text-icon-subdued">•</span>
                <span title="Ước lượng thời gian làm">~{estimateLabel}</span>
              </>
            )}

            {task.priority === 'Khẩn cấp' && (
              <>
                <span className="text-icon-subdued">•</span>
                <span className="inline-flex items-center gap-0.5 font-semibold text-negative">
                  <BellRing className="w-3 h-3" />
                  Khẩn cấp
                </span>
              </>
            )}
            {task.priority === 'Ưu tiên cao' && (
              <>
                <span className="text-icon-subdued">•</span>
                <span className="font-semibold text-warning">Ưu tiên cao</span>
              </>
            )}
          </div>
        </div>
      </motion.div>

      {dueMenuAnchor && onUpdateDueDate && (
        <QuickDueMenu
          anchor={dueMenuAnchor}
          currentDue={task.dueDate}
          onSelect={(date) => onUpdateDueDate(task.id, date)}
          onClose={() => setDueMenuAnchor(null)}
        />
      )}

      {/* Xác nhận xoá kèm tuỳ chọn xoá vĩnh viễn */}
      {isDeleteModalOpen && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs animate-fade-in text-left"
          onClick={(e) => {
            e.stopPropagation();
            if (e.target === e.currentTarget) setIsDeleteModalOpen(false);
          }}
        >
          <div className="bg-surface rounded-vds-lg border border-line shadow-sheet w-full max-w-sm p-5 space-y-4 font-ui">
            <div className="flex items-center gap-2 text-negative">
              <Trash2 className="w-5 h-5 shrink-0" />
              <h3 className="font-bold text-sm text-ink">Xoá công việc?</h3>
            </div>
            <p className="text-[13px] text-ink-lighter leading-relaxed">
              <strong>"{task.title}"</strong> sẽ chuyển vào Thùng rác.
            </p>
            <label className="flex items-start gap-2.5 p-2.5 rounded-vds-lg bg-surface-negative/60 border border-line cursor-pointer hover:bg-surface-negative transition-colors select-none">
              <input
                type="checkbox"
                checked={isPermanentDelete}
                onChange={(e) => setIsPermanentDelete(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-negative border-line-negative focus:ring-line-negative cursor-pointer"
              />
              <span className="text-xs">
                <span className="font-bold text-negative block">Xoá vĩnh viễn</span>
                <span className="text-xs text-subdued block leading-tight">Không lưu vào Thùng rác</span>
              </span>
            </label>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-divider">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="h-9 px-3 border border-line text-ink-lighter hover:text-ink rounded-vds-lg text-xs font-bold cursor-pointer"
              >
                Huỷ
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => {
                  onDeleteTask(task.id, isPermanentDelete);
                  setIsDeleteModalOpen(false);
                }}
                className="h-9 px-3.5 bg-negative-solid hover:bg-negative-solid text-on-color rounded-vds-lg text-xs font-bold cursor-pointer "
              >
                {isPermanentDelete ? 'Xoá vĩnh viễn' : 'Xoá'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
