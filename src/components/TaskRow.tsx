/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { TaskItem, TaskStatus, MemberItem } from '../types';
import { formatDateWithEnDay, formatPercentage, formatMemberNameOnly } from '../utils/formatters';
import { MessageSquare, AlertTriangle, Check, Trash2, Edit2, Layers, Link, ExternalLink, CheckCircle2 } from 'lucide-react';

interface TaskRowProps {
  task: TaskItem;
  members?: MemberItem[];
  onUpdateStatus: (taskId: string, newStatus: TaskStatus) => void;
  onUpdateProgress: (taskId: string, newProgress: number) => void;
  onOpenLogModal: (task: TaskItem) => void;
  onDeleteTask: (taskId: string) => void;
  onSaveInlineTitle: (taskId: string, newTitle: string) => void;
}

export const TaskRow: React.FC<TaskRowProps> = ({
  task,
  members,
  onUpdateStatus,
  onUpdateProgress,
  onOpenLogModal,
  onDeleteTask,
  onSaveInlineTitle,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(task.title);
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);

  // Status visual styles strictly conforming to DESIGN.md section 2.6
  const getStatusBadgeStyle = (status: TaskStatus) => {
    switch (status) {
      case 'Chưa làm':
        return 'bg-[#f3f3f3] text-[#5f5f5f] border-[#d6d6d6]';
      case 'Đang làm':
        return 'bg-[#eaf0f8] text-[#365983] border-[#466fa1]';
      case 'Bị nghẽn':
        return 'bg-[#f8d4d6] text-[#da1e28] border-[#da1e28]';
      case 'Hoàn thành':
        return 'bg-[#d5eddc] text-[#24a148] border-[#24a148]';
    }
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'Khẩn cấp':
        return 'text-[#da1e28] bg-[#f8d4d6] border-[#da1e28] font-bold';
      case 'Ưu tiên cao':
        return 'text-[#ee853b] bg-[#fce8da] border-[#ee853b]';
      default:
        return 'text-[#5f5f5f] bg-[#f3f3f3] border-[#d6d6d6]';
    }
  };

  const getTeamColor = (team: string) => {
    switch (team) {
      case 'Product Manager':
        return 'text-[#b13460] bg-[#fce6eb] border-[rgba(177,52,96,0.2)]';
      case 'UX/UI Designer':
        return 'text-[#365983] bg-[#eaf0f8] border-[rgba(70,111,161,0.2)]';
      case 'SEO':
        return 'text-[#24a148] bg-[#d5eddc] border-[rgba(36,161,72,0.2)]';
      case 'Data':
        return 'text-[#7e4f16] bg-[#fdf3e7] border-[rgba(126,79,22,0.2)]';
      default:
        return 'text-[#5f5f5f] bg-[#f3f3f3] border-[#d6d6d6]';
    }
  };

  const handleTitleSubmit = () => {
    if (titleDraft.trim() && titleDraft !== task.title) {
      onSaveInlineTitle(task.id, titleDraft.trim());
    }
    setIsEditingTitle(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSubmit();
    } else if (e.key === 'Escape') {
      setTitleDraft(task.title);
      setIsEditingTitle(false);
    }
  };

  const statuses: TaskStatus[] = [
    'Chưa làm',
    'Đang làm',
    'Bị nghẽn',
    'Hoàn thành',
  ];

  return (
    <div className={`border-b border-[rgba(0,0,0,0.06)] hover:bg-[#fafafa] transition-colors ${
      task.status === 'Bị nghẽn' ? 'bg-[#fffafb]' : 'bg-[#ffffff]'
    }`}>
      <div className="px-4 py-3 sm:px-6">
        {/* Main Row Grid */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Left Block: Team, Title, Priority, Assignee */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-x-2 gap-y-1 flex-wrap mb-1.5 text-xs font-ui text-[#71717a]">
              {/* Phase (Chỉ để Giai đoạn 1, Giai đoạn 2 hoặc không có giai đoạn) */}
              {(() => {
                if (!task.phaseName) return null;
                const match = task.phaseName.trim().match(/^(Giai đoạn\s*\d+|Phase\s*\d+)/i);
                if (!match) return null;
                const phaseLabel = match[1].replace(/Phase/i, 'Giai đoạn');
                return (
                  <>
                    <span className="flex items-center gap-1 text-[#52525b]" title={`Giai đoạn: ${task.phaseName}`}>
                      <Layers className="w-3 h-3 text-[#a1a1aa]" />
                      <span>{phaseLabel}</span>
                    </span>
                    <span className="text-[#d4d4d8]">•</span>
                  </>
                );
              })()}

              {/* Assignee */}
              <span className="text-[#52525b]">
                Phụ trách: <strong className="text-[#18181b] font-normal">{formatMemberNameOnly(task.assignee, members)}</strong>
              </span>

              <span className="text-[#d4d4d8]">•</span>

              {/* Due date */}
              <span className="font-num text-[#71717a]">
                Hạn: {formatDateWithEnDay(task.dueDate)}
              </span>

              {/* Priority - ONLY 'Khẩn cấp' highlighted */}
              {task.priority === 'Khẩn cấp' && (
                <>
                  <span className="text-[#d4d4d8]">•</span>
                  <span className="text-[11px] font-bold text-[#be123c] flex items-center gap-1">
                    🚨 Khẩn cấp
                  </span>
                </>
              )}
            </div>

            {/* Task Title (Editable) */}
            {isEditingTitle ? (
              <div className="flex items-center gap-2 my-1">
                <input
                  type="text"
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={handleTitleSubmit}
                  autoFocus
                  className="w-full px-2 py-1 border border-[#0590de] rounded-[4px] font-body text-sm text-[#202020] bg-[#ffffff] focus:outline-none"
                />
                <button
                  onClick={handleTitleSubmit}
                  className="p-1 rounded-[4px] bg-[#24a148] text-white hover:opacity-90"
                  title="Lưu"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="group flex items-baseline gap-2">
                <h3
                  onClick={() => setIsEditingTitle(true)}
                  title="Nhấp để chỉnh sửa tên công việc"
                  className="font-body text-[15px] font-normal text-[#202020] leading-snug cursor-pointer hover:text-[#b13460] transition-colors"
                >
                  {task.title}
                </h3>
                <button
                  onClick={() => setIsEditingTitle(true)}
                  className="opacity-0 group-hover:opacity-100 text-[#9f9f9f] hover:text-[#202020] transition-opacity p-0.5"
                  title="Sửa tên việc"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Blocker Alert Inline if Status is 'Bị nghẽn' */}
            {task.status === 'Bị nghẽn' && (
              <div className="mt-1.5 flex items-start gap-1.5 text-xs text-[#da1e28] font-body bg-[#f8d4d6]/60 p-1.5 rounded-[4px] border border-[#da1e28]/30">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>
                  <strong>Trở ngại:</strong> {task.blockerReason || task.latestUpdateNote || 'Đang vướng mắc kỹ thuật hoặc phụ thuộc bên ngoài.'}
                </span>
              </div>
            )}

            {/* Work Link and Result Link badges */}
            {(task.workLink || task.resultLink) && (
              <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                {task.workLink && (
                  <a
                    href={task.workLink.startsWith('http') ? task.workLink : `https://${task.workLink}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="px-2 py-0.5 rounded-[4px] bg-[#f0f4f9] text-[#1d508d] border border-[#adc6e5] text-[11px] font-bold flex items-center gap-1 hover:underline"
                    title={task.workLink}
                  >
                    <Link className="w-3 h-3 text-[#1d508d]" />
                    <span>Link làm việc</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
                {task.resultLink && (
                  <a
                    href={task.resultLink.startsWith('http') ? task.resultLink : `https://${task.resultLink}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="px-2 py-0.5 rounded-[4px] bg-[#f0fdf4] text-[#15803d] border border-[#bbf7d0] text-[11px] font-bold flex items-center gap-1 hover:underline"
                    title={task.resultLink}
                  >
                    <CheckCircle2 className="w-3 h-3 text-[#15803d]" />
                    <span>Link kết quả</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
            )}

            {/* Latest update note */}

            {/* Latest update note */}
            {task.latestUpdateNote && task.status !== 'Bị nghẽn' && (
              <div className="mt-1 flex items-center gap-1.5 text-xs text-[#5f5f5f] font-body">
                <span className="text-[#9f9f9f]">↳ Cập nhật gần nhất:</span>
                <span className="text-[#5f5f5f]">{task.latestUpdateNote}</span>
              </div>
            )}
          </div>

          {/* Right Block: Rapid Progress Updating Controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
            {/* 1-Click Status Dropdown / Pill */}
            <div className="relative">
              <button
                onClick={() => setIsStatusMenuOpen(!isStatusMenuOpen)}
                className={`h-[32px] px-2.5 rounded-[8px] border font-ui text-xs font-bold transition-all flex items-center gap-1.5 state-layer-std ${getStatusBadgeStyle(
                  task.status
                )}`}
                title="Bấm để đổi trạng thái"
              >
                <span>{task.status}</span>
                <span className="text-[10px]">▼</span>
              </button>

              {isStatusMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsStatusMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-1 w-44 bg-[#ffffff] border border-[#9f9f9f] rounded-[4px] py-1 z-50">
                    <div className="px-2.5 py-1 text-[11px] font-ui text-[#7f7f7f] border-b border-[rgba(0,0,0,0.06)]">
                      Chuyển trạng thái:
                    </div>
                    {statuses.map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          onUpdateStatus(task.id, s);
                          setIsStatusMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 text-xs font-ui transition-colors hover:bg-[#f3f3f3] flex items-center justify-between ${
                          task.status === s ? 'font-bold text-[#b13460]' : 'text-[#202020]'
                        }`}
                      >
                        <span>{s}</span>
                        {task.status === s && <Check className="w-3.5 h-3.5 text-[#b13460]" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Quick 1-Click Progress Step Buttons: [0%] [25%] [50%] [75%] [100%] */}
            <div className="flex items-center gap-1 bg-[#f3f3f3] p-1 rounded-[6px] border border-[#d6d6d6]">
              {[0, 25, 50, 75, 100].map((step) => {
                const isActive = task.progress === step;
                return (
                  <button
                    key={step}
                    onClick={() => onUpdateProgress(task.id, step)}
                    title={`Cập nhật ngay ${step}%`}
                    className={`h-[24px] px-1.5 rounded-[4px] font-num text-[11px] transition-colors state-layer-std ${
                      isActive
                        ? 'bg-[#fdf2f7] text-[#913257] border border-[#f4c2d7] font-bold shadow-2xs'
                        : 'text-[#5f5f5f] hover:text-[#202020] hover:bg-[#e8e8e8]'
                    }`}
                  >
                    {step}%
                  </button>
                );
              })}
            </div>

            {/* Current progress indicator with bar */}
            <div className="w-16 hidden sm:block">
              <div className="text-[11px] font-num text-right text-[#5f5f5f] mb-0.5">
                {formatPercentage(task.progress, 0)}
              </div>
              <div className="h-1.5 bg-[#ececec] rounded-[2px] overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    task.progress === 100 ? 'bg-[#24a148]' : 'bg-[#466fa1]'
                  }`}
                  style={{ width: `${task.progress}%` }}
                />
              </div>
            </div>

            {/* Action buttons: Quick Log modal and Delete */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => onOpenLogModal(task)}
                className="h-[32px] px-2 rounded-[8px] bg-[#fafafa] border border-[#d6d6d6] text-[#5f5f5f] hover:text-[#202020] hover:border-[#9f9f9f] font-ui text-xs flex items-center gap-1 transition-colors state-layer-std"
                title="Ghi chú cập nhật / Nhật ký tiến độ"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span className="hidden sm:inline font-num text-[11px]">
                  ({task.logs.length})
                </span>
              </button>

              <button
                onClick={() => onDeleteTask(task.id)}
                className="h-[32px] w-[32px] rounded-[8px] border border-transparent text-[#9f9f9f] hover:text-[#da1e28] hover:bg-[#f8d4d6] flex items-center justify-center transition-colors"
                title="Xóa công việc"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
