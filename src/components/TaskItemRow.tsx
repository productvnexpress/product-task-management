/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { TaskItem, TaskStatus, MemberItem, ProjectItem } from '../types';
import {
  AlertTriangle,
  Calendar,
  Check,
  ChevronRight,
  User,
  Tag,
  Briefcase,
  Folder,
  Layers,
  Link,
  ExternalLink,
  CheckCircle2,
  Clock,
  Trash2,
  RotateCw,
} from 'lucide-react';
import { formatDateShort, formatDateWithEnDay, formatMemberNameOnly } from '../utils/formatters';
import { getTaskDueDateInfo, formatTaskDueDisplay } from '../utils/dateUtils';
import { canEditTask, canDeleteTask } from '../utils/rbac';

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
}

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
}) => {
  const userCanEdit = canEditTask(currentAuthUser, task, projects);
  const userCanDelete = canDeleteTask(currentAuthUser, task, projects);
  const isCompleted = task.status === 'Hoàn thành';
  const isBlocked = task.status === 'Bị nghẽn';

  // Status badge style for interactive selector
  const statusStyles: Record<TaskStatus, string> = {
    'Chưa làm': 'bg-[#f4f4f5] text-[#52525b] border-[#e4e4e7] hover:bg-[#e4e4e7]',
    'Đang làm': 'bg-[#f0f7ff] text-[#1e609c] border-[#cfe2fe] hover:bg-[#e0f0fe]',
    'Bị nghẽn': 'bg-[#fff1f2] text-[#be123c] border-[#fecdd3] hover:bg-[#ffe4e6]',
    'Hoàn thành': 'bg-[#f0fdf4] text-[#166534] border-[#bbf7d0] hover:bg-[#dcfce7]',
  };

  const dueInfo = getTaskDueDateInfo(task.dueDate, task.status);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
  const [isPermanentDelete, setIsPermanentDelete] = React.useState(false);

  return (
    <div
      className={`group bg-[#ffffff] border-b border-[#f0f0f0] last:border-b-0 hover:bg-[#fafafa] transition-all p-3.5 sm:p-4 flex flex-col gap-2 ${
        isCompleted ? 'opacity-65' : ''
      } ${isMyTask && !isCompleted ? 'border-l-4 border-l-[#963861] bg-[#fffbfd]' : ''}`}
    >
      {/* 1. TOP ROW: Checkbox + Title (Full width on Mobile) + Chevron on mobile */}
      <div className="flex items-start justify-between gap-2.5 sm:gap-3">
        {/* Left: Checkbox + Title + Recurring Badge */}
        <div className="flex items-start gap-2.5 sm:gap-3 flex-1 min-w-0">
          <motion.button
            whileHover={userCanEdit ? { scale: 1.15 } : undefined}
            whileTap={userCanEdit ? { scale: 0.85 } : undefined}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            disabled={!userCanEdit}
            onClick={(e) => {
              e.stopPropagation();
              if (userCanEdit) onToggleComplete(task.id);
            }}
            className={`w-5 h-5 rounded-full border shrink-0 mt-0.5 flex items-center justify-center transition-colors ${
              !userCanEdit ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
            } ${
              isCompleted
                ? 'bg-[#166534] border-[#166534] text-white shadow-2xs'
                : isBlocked
                ? 'border-[#be123c] bg-[#fff1f2] text-[#be123c]'
                : 'border-[#a1a1aa] hover:border-[#963861] text-transparent hover:text-[#963861]/40 bg-white'
            }`}
            title={
              !userCanEdit
                ? 'Chỉ người tạo việc hoặc Quản trị viên mới có quyền cập nhật tiến độ'
                : isCompleted
                ? 'Đánh dấu chưa xong'
                : 'Đánh dấu hoàn thành'
            }
          >
            <Check className="w-3.5 h-3.5 stroke-[3]" />
          </motion.button>

          <div
            onClick={() => onSelectTask(task)}
            className="flex-1 min-w-0 cursor-pointer"
          >
            <h3
              className={`font-title text-[14px] sm:text-[15px] font-semibold leading-normal break-words transition-colors ${
                isCompleted ? 'line-through text-[#a1a1aa]' : 'text-[#18181b] group-hover:text-[#963861]'
              }`}
            >
              <span>{task.title}</span>
              {task.isRecurring && (
                <span
                  className="inline-flex items-center gap-1 text-[11px] font-ui font-medium px-1.5 py-0.2 rounded-[4px] bg-[#fdf2f7] text-[#963861] border border-[#f3c2d4] shrink-0 ml-2 align-middle"
                  title="Công việc định kỳ tự động tạo lúc 08:00 AM"
                >
                  <RotateCw className="w-2.5 h-2.5" />
                  <span>Chu kỳ</span>
                </span>
              )}
            </h3>
          </div>
        </div>

        {/* Desktop-only: Status Dropdown & Action buttons */}
        <div className="hidden sm:flex shrink-0 items-center gap-1 sm:gap-1.5 pt-0.5">
          <select
            value={task.status}
            disabled={!userCanEdit}
            onChange={(e) => {
              e.stopPropagation();
              if (userCanEdit) onUpdateStatus(task.id, e.target.value as TaskStatus);
            }}
            onClick={(e) => e.stopPropagation()}
            className={`text-xs font-ui font-semibold rounded-[6px] px-2 py-1 border transition-colors focus:outline-hidden ${
              !userCanEdit ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'
            } ${statusStyles[task.status]}`}
            title={
              !userCanEdit
                ? 'Chỉ người tạo việc hoặc Quản trị viên mới có quyền đổi trạng thái'
                : 'Thao tác đổi trạng thái'
            }
          >
            <option value="Chưa làm">Chưa làm</option>
            <option value="Đang làm">Đang làm</option>
            <option value="Bị nghẽn">Bị nghẽn ⚠️</option>
            <option value="Hoàn thành">Hoàn thành ✓</option>
          </select>

          {userCanDelete && (
            <motion.button
              whileHover={{ scale: 1.12 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation();
                setIsPermanentDelete(false);
                setIsDeleteModalOpen(true);
              }}
              className="p-1 sm:p-1.5 text-[#a1a1aa] hover:text-[#dc2626] hover:bg-[#fef2f2] rounded-[6px] transition-colors cursor-pointer"
              title="Xóa công việc"
            >
              <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </motion.button>
          )}

          <motion.button
            whileHover={{ scale: 1.12 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onSelectTask(task)}
            className="p-1 sm:p-1.5 text-[#a1a1aa] hover:text-[#18181b] hover:bg-[#f4f4f5] rounded-[6px] transition-colors cursor-pointer"
            title="Xem chi tiết"
          >
            <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </motion.button>
        </div>

        {/* Mobile-only: Chevron arrow for details */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => onSelectTask(task)}
          className="sm:hidden p-1 text-[#a1a1aa] hover:text-[#18181b] shrink-0 mt-0.5 cursor-pointer"
          title="Xem chi tiết"
        >
          <ChevronRight className="w-4 h-4" />
        </motion.button>
      </div>

      {/* Blocker reason (if blocked) - indented under title */}
      {isBlocked && task.blockerReason && (
        <div className="pl-7.5 sm:pl-8 -mt-0.5">
          <div className="inline-flex items-start gap-1.5 bg-[#fff1f2] text-[#be123c] text-xs font-ui px-2.5 py-1 rounded-[5px] border border-[#fecdd3] max-w-full">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-[#be123c] mt-0.5" />
            <div className="leading-snug">
              <span className="font-bold mr-1">Lý do nghẽn:</span>
              <span className="break-words">{task.blockerReason}</span>
            </div>
          </div>
        </div>
      )}

      {/* 2. BOTTOM ROW: Metadata Bar + Mobile Status selector & Delete */}
      <div className="pl-7.5 sm:pl-8 flex flex-wrap items-center justify-between gap-x-2.5 gap-y-1.5 text-xs font-ui text-[#71717a] pt-0.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 min-w-0">
          {/* Mobile-only Status Dropdown */}
          <div className="sm:hidden shrink-0">
            <select
              value={task.status}
              disabled={!userCanEdit}
              onChange={(e) => {
                e.stopPropagation();
                if (userCanEdit) onUpdateStatus(task.id, e.target.value as TaskStatus);
              }}
              onClick={(e) => e.stopPropagation()}
              className={`text-[11px] font-ui font-semibold rounded-[5px] px-2 py-0.5 border transition-colors focus:outline-hidden ${
                !userCanEdit ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'
              } ${statusStyles[task.status]}`}
              title={
                !userCanEdit
                  ? 'Chỉ người tạo việc hoặc Quản trị viên mới có quyền đổi trạng thái'
                  : 'Thao tác đổi trạng thái'
              }
            >
              <option value="Chưa làm">Chưa làm</option>
              <option value="Đang làm">Đang làm</option>
              <option value="Bị nghẽn">Bị nghẽn ⚠️</option>
              <option value="Hoàn thành">Hoàn thành ✓</option>
            </select>
          </div>
        {/* Project Name */}
        {showProjectBadge && (
          <>
            {onOpenProjectDetail && task.projectId ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenProjectDetail(task.projectId);
                }}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-[#475569] bg-[#f1f5f9] hover:bg-[#e2e8f0] hover:text-[#0f172a] px-2 py-0.5 rounded-[4px] border border-[#e2e8f0] transition-colors cursor-pointer"
                title={`Bấm để xem chi tiết dự án ${task.projectName || 'Dự án'} (Right Sidebar)`}
              >
                <Folder className="w-3 h-3 text-[#64748b]" />
                <span className="truncate max-w-[200px]">{task.projectName || 'Dự án'}</span>
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#475569] bg-[#f1f5f9] px-2 py-0.5 rounded-[4px] border border-[#e2e8f0]">
                <Folder className="w-3 h-3 text-[#64748b]" />
                <span className="truncate max-w-[200px]">{task.projectName || 'Dự án'}</span>
              </span>
            )}
            {(task.workLink || task.resultLink || task.phaseName || task.assignee) && (
              <span className="text-[#d4d4d8]">•</span>
            )}
          </>
        )}

        {/* Work Link */}
        {task.workLink && (
          <>
            <a
              href={task.workLink.startsWith('http') ? task.workLink : `https://${task.workLink}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-[#2563eb] hover:text-[#1d4ed8] hover:underline text-[11px] inline-flex items-center gap-1 transition-colors"
              title={task.workLink}
            >
              <Link className="w-3 h-3" />
              <span>Link làm việc</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-60" />
            </a>
            {(task.resultLink || task.phaseName || task.assignee) && (
              <span className="text-[#d4d4d8]">•</span>
            )}
          </>
        )}

        {/* Result Link */}
        {task.resultLink && (
          <>
            <a
              href={task.resultLink.startsWith('http') ? task.resultLink : `https://${task.resultLink}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-[#166534] hover:text-[#14532d] hover:underline text-[11px] inline-flex items-center gap-1 transition-colors"
              title={task.resultLink}
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Link kết quả</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-60" />
            </a>
            <span className="text-[#d4d4d8]">•</span>
          </>
        )}

        {/* Giai đoạn (Chỉ để Giai đoạn 1, Giai đoạn 2 hoặc không có giai đoạn) */}
        {(() => {
          if (!task.phaseName) return null;
          const match = task.phaseName.trim().match(/^(Giai đoạn\s*\d+|Phase\s*\d+)/i);
          if (!match) return null;
          const phaseLabel = match[1].replace(/Phase/i, 'Giai đoạn');
          return (
            <>
              <span className="inline-flex items-center gap-1 text-[#52525b]" title={`Giai đoạn: ${task.phaseName}`}>
                <Layers className="w-3 h-3 text-[#71717a]" />
                <span>{phaseLabel}</span>
              </span>
              {task.assignee && <span className="text-[#d4d4d8]">•</span>}
            </>
          );
        })()}

        {/* Nhân sự (Chỉ hiển thị tên, không có IP Phone) */}
        {task.assignee && (
          <>
            {onFilterByAssignee ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onFilterByAssignee(task.assignee);
                }}
                className={`inline-flex items-center gap-1 cursor-pointer transition-colors hover:underline ${
                  isMyTask
                    ? 'text-[#963861] font-semibold hover:text-[#78264c]'
                    : 'text-[#52525b] hover:text-[#963861]'
                }`}
                title={`Bấm để lọc nhanh công việc của ${formatMemberNameOnly(task.assignee, members)}`}
              >
                <User className={`w-3 h-3 ${isMyTask ? 'text-[#963861]' : 'text-[#71717a]'}`} />
                <span className="truncate max-w-[160px]">{formatMemberNameOnly(task.assignee, members)}</span>
                {isMyTask && (
                  <span className="text-[10px] bg-[#963861]/10 text-[#963861] font-bold px-1.5 py-0.2 rounded-full">
                    Tôi
                  </span>
                )}
              </button>
            ) : (
              <span
                className={`inline-flex items-center gap-1 ${
                  isMyTask ? 'text-[#963861] font-semibold' : 'text-[#52525b]'
                }`}
                title={`Người phụ trách: ${formatMemberNameOnly(task.assignee, members)}${isMyTask ? ' (Bạn)' : ''}`}
              >
                <User className={`w-3 h-3 ${isMyTask ? 'text-[#963861]' : 'text-[#71717a]'}`} />
                <span className="truncate max-w-[160px]">{formatMemberNameOnly(task.assignee, members)}</span>
                {isMyTask && (
                  <span className="text-[10px] bg-[#963861]/10 text-[#963861] font-bold px-1.5 py-0.2 rounded-full">
                    Tôi
                  </span>
                )}
              </span>
            )}
            <span className="text-[#d4d4d8]">•</span>
          </>
        )}

        {/* Thời gian */}
        <span
          className={`inline-flex items-center gap-1 font-ui text-[11px] ${
            isCompleted
              ? 'text-[#71717a]'
              : dueInfo.status === 'overdue'
              ? 'text-[#be123c] font-bold'
              : dueInfo.status === 'due_today'
              ? 'text-[#c2410c] font-bold'
              : dueInfo.status === 'due_soon'
              ? 'text-[#a16207] font-medium'
              : 'text-[#71717a]'
          }`}
          title={`Hạn hoàn thành: ${formatDateWithEnDay(task.dueDate)}`}
        >
          {isCompleted ? (
            <Calendar className="w-3 h-3 text-[#71717a]" />
          ) : dueInfo.status === 'overdue' ? (
            <AlertTriangle className="w-3 h-3 text-[#be123c]" />
          ) : dueInfo.status === 'due_today' ? (
            <Clock className="w-3 h-3 text-[#c2410c]" />
          ) : (
            <Calendar className="w-3 h-3 text-[#71717a]" />
          )}
          <span>{formatTaskDueDisplay(task.dueDate)}</span>
        </span>

        {/* Mức độ ưu tiên */}
        {task.priority === 'Khẩn cấp' && (
          <>
            <span className="text-[#d4d4d8]">•</span>
            <span className="text-[11px] font-bold text-[#be123c] inline-flex items-center gap-1">
              🚨 Khẩn cấp
            </span>
          </>
        )}
        {task.priority === 'Ưu tiên cao' && (
          <>
            <span className="text-[#d4d4d8]">•</span>
            <span className="text-[11px] font-semibold text-[#b45309] inline-flex items-center gap-1">
              ⚡ Ưu tiên cao
            </span>
          </>
        )}
        </div>

        {/* Mobile-only Delete button */}
        {userCanDelete && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              setIsPermanentDelete(false);
              setIsDeleteModalOpen(true);
            }}
            className="sm:hidden p-1 text-[#a1a1aa] hover:text-[#dc2626] rounded-[4px] ml-auto shrink-0 transition-colors cursor-pointer"
            title="Xóa công việc"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </motion.button>
        )}
      </div>

      {/* Modal xác nhận xoá công việc kèm checkbox Xoá vĩnh viễn */}
      {isDeleteModalOpen && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs animate-fade-in text-left"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-white rounded-[12px] border border-[#e0e0e0] shadow-xl w-full max-w-sm p-5 space-y-4 font-ui">
            <div className="flex items-center gap-2 text-[#e11d48]">
              <Trash2 className="w-5 h-5 shrink-0" />
              <h3 className="font-bold text-sm text-[#202020]">Xác nhận xoá công việc</h3>
            </div>

            <p className="text-xs text-[#52525b] leading-relaxed">
              Bạn có chắc chắn muốn xoá công việc <strong>"{task.title}"</strong>?
            </p>

            <label className="flex items-start gap-2.5 p-2.5 rounded-[8px] bg-[#fff1f2]/60 border border-[#fecdd3] cursor-pointer hover:bg-[#fff1f2] transition-colors select-none">
              <input
                type="checkbox"
                checked={isPermanentDelete}
                onChange={(e) => setIsPermanentDelete(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-[#e11d48] border-[#f43f5e] focus:ring-[#e11d48] cursor-pointer"
              />
              <div className="text-xs">
                <span className="font-bold text-[#be123c] block">Xoá vĩnh viễn</span>
                <span className="text-[11px] text-[#71717a] block leading-tight">
                  Xoá thẳng khỏi hệ thống, không lưu vào Thùng rác
                </span>
              </div>
            </label>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#f0f0f0]">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-3 py-1.5 border border-[#d6d6d6] text-[#5f5f5f] hover:text-[#202020] rounded-[6px] text-xs font-bold cursor-pointer"
              >
                Huỷ
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteTask(task.id, isPermanentDelete);
                  setIsDeleteModalOpen(false);
                }}
                className="px-3.5 py-1.5 bg-[#e11d48] hover:bg-[#be123c] text-white rounded-[6px] text-xs font-bold cursor-pointer shadow-2xs"
              >
                {isPermanentDelete ? 'Xoá vĩnh viễn' : 'Xoá công việc'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
