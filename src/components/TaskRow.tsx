/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { TaskItem, TaskStatus, MemberItem } from '../types';
import { formatDateWithEnDay, formatPercentage, formatMemberNameOnly } from '../utils/formatters';
import { MessageSquare, AlertTriangle, Check, Trash2, Edit2, Layers, Link, ExternalLink, CheckCircle2 } from './vds/icons';

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
        return 'bg-surface-200 text-ink-lighter border-line';
      case 'Đang làm':
        return 'bg-surface-support text-support border-line-support';
      case 'Bị nghẽn':
        return 'bg-surface-negative text-negative border-line-negative';
      case 'Hoàn thành':
        return 'bg-surface-positive text-positive border-line-positive';
    }
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'Khẩn cấp':
        return 'text-negative bg-surface-negative border-line-negative font-bold';
      case 'Ưu tiên cao':
        return 'text-warning bg-surface-warning border-line-warning';
      default:
        return 'text-ink-lighter bg-surface-200 border-line';
    }
  };

  const getTeamColor = (team: string) => {
    switch (team) {
      case 'Product Manager':
        return 'text-accent bg-surface-negative border-line';
      case 'UX/UI Designer':
        return 'text-support bg-surface-support border-line';
      case 'SEO':
        return 'text-positive bg-surface-positive border-line';
      case 'Data':
        return 'text-warning bg-surface-warning border-line';
      default:
        return 'text-ink-lighter bg-surface-200 border-line';
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
    <div className={`border-b border-divider hover:bg-surface-100 transition-colors ${
      task.status === 'Bị nghẽn' ? 'bg-surface-100' : 'bg-surface'
    }`}>
      <div className="px-4 py-3 sm:px-6">
        {/* Main Row Grid */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Left Block: Team, Title, Priority, Assignee */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-x-2 gap-y-1 flex-wrap mb-1.5 text-xs font-ui text-subdued">
              {/* Phase (Chỉ để Giai đoạn 1, Giai đoạn 2 hoặc không có giai đoạn) */}
              {(() => {
                if (!task.phaseName) return null;
                const match = task.phaseName.trim().match(/^(Giai đoạn\s*\d+|Phase\s*\d+)/i);
                if (!match) return null;
                const phaseLabel = match[1].replace(/Phase/i, 'Giai đoạn');
                return (
                  <>
                    <span className="flex items-center gap-1 text-ink-lighter" title={`Giai đoạn: ${task.phaseName}`}>
                      <Layers className="w-3 h-3 text-subdued-lighter" />
                      <span>{phaseLabel}</span>
                    </span>
                    <span className="text-icon-subdued">•</span>
                  </>
                );
              })()}

              {/* Assignee */}
              <span className="text-ink-lighter">
                Phụ trách: <strong className="text-ink font-normal">{formatMemberNameOnly(task.assignee, members)}</strong>
              </span>

              <span className="text-icon-subdued">•</span>

              {/* Due date */}
              <span className="font-num text-subdued">
                Hạn: {formatDateWithEnDay(task.dueDate)}
              </span>

              {/* Priority - ONLY 'Khẩn cấp' highlighted */}
              {task.priority === 'Khẩn cấp' && (
                <>
                  <span className="text-icon-subdued">•</span>
                  <span className="text-xs font-bold text-negative flex items-center gap-1">
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
                  className="w-full px-2 py-1 border border-line-info rounded-vds-md font-body text-sm text-ink bg-surface focus:outline-none"
                />
                <button
                  onClick={handleTitleSubmit}
                  className="p-1 rounded-vds-md bg-positive-solid text-on-color hover:opacity-90"
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
                  className="font-body text-[15px] font-normal text-ink leading-snug cursor-pointer hover:text-accent transition-colors"
                >
                  {task.title}
                </h3>
                <button
                  onClick={() => setIsEditingTitle(true)}
                  className="opacity-0 group-hover:opacity-100 text-subdued-lighter hover:text-ink transition-opacity p-0.5"
                  title="Sửa tên việc"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Blocker Alert Inline if Status is 'Bị nghẽn' */}
            {task.status === 'Bị nghẽn' && (
              <div className="mt-1.5 flex items-start gap-1.5 text-xs text-negative font-body bg-surface-negative/60 p-1.5 rounded-vds-md border border-line-negative/30">
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
                    className="px-2 py-0.5 rounded-vds-md bg-surface-200 text-support border border-line text-xs font-bold flex items-center gap-1 hover:underline"
                    title={task.workLink}
                  >
                    <Link className="w-3 h-3 text-support" />
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
                    className="px-2 py-0.5 rounded-vds-md bg-surface-positive text-positive border border-line text-xs font-bold flex items-center gap-1 hover:underline"
                    title={task.resultLink}
                  >
                    <CheckCircle2 className="w-3 h-3 text-positive" />
                    <span>Link kết quả</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
            )}

            {/* Latest update note */}

            {/* Latest update note */}
            {task.latestUpdateNote && task.status !== 'Bị nghẽn' && (
              <div className="mt-1 flex items-center gap-1.5 text-xs text-ink-lighter font-body">
                <span className="text-subdued-lighter">↳ Cập nhật gần nhất:</span>
                <span className="text-ink-lighter">{task.latestUpdateNote}</span>
              </div>
            )}
          </div>

          {/* Right Block: Rapid Progress Updating Controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
            {/* 1-Click Status Dropdown / Pill */}
            <div className="relative">
              <button
                onClick={() => setIsStatusMenuOpen(!isStatusMenuOpen)}
                className={`h-[32px] px-2.5 rounded-vds-lg border font-ui text-xs font-bold transition flex items-center gap-1.5 state-layer-std ${getStatusBadgeStyle(
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
                  <div className="absolute right-0 mt-1 w-44 bg-surface border border-line-regular rounded-vds-md py-1 z-50">
                    <div className="px-2.5 py-1 text-xs font-ui text-subdued border-b border-divider">
                      Chuyển trạng thái:
                    </div>
                    {statuses.map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          onUpdateStatus(task.id, s);
                          setIsStatusMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 text-xs font-ui transition-colors hover:bg-surface-200 flex items-center justify-between ${
                          task.status === s ? 'font-bold text-accent' : 'text-ink'
                        }`}
                      >
                        <span>{s}</span>
                        {task.status === s && <Check className="w-3.5 h-3.5 text-accent" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Quick 1-Click Progress Step Buttons: [0%] [25%] [50%] [75%] [100%] */}
            <div className="flex items-center gap-1 bg-surface-200 p-1 rounded-vds-lg border border-line">
              {[0, 25, 50, 75, 100].map((step) => {
                const isActive = task.progress === step;
                return (
                  <button
                    key={step}
                    onClick={() => onUpdateProgress(task.id, step)}
                    title={`Cập nhật ngay ${step}%`}
                    className={`h-[24px] px-1.5 rounded-vds-md font-num text-xs transition-colors state-layer-std ${
                      isActive
                        ? 'bg-surface-accent-faint text-accent border border-line font-bold '
                        : 'text-ink-lighter hover:text-ink hover:bg-surface-300'
                    }`}
                  >
                    {step}%
                  </button>
                );
              })}
            </div>

            {/* Current progress indicator with bar */}
            <div className="w-16 hidden sm:block">
              <div className="text-xs font-num text-right text-ink-lighter mb-0.5">
                {formatPercentage(task.progress, 0)}
              </div>
              <div className="h-1.5 bg-surface-300 rounded-vds-sm overflow-hidden">
                <div
                  className={`h-full transition ${
                    task.progress === 100 ? 'bg-positive-solid' : 'bg-support-solid'
                  }`}
                  style={{ width: `${task.progress}%` }}
                />
              </div>
            </div>

            {/* Action buttons: Quick Log modal and Delete */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => onOpenLogModal(task)}
                className="h-[32px] px-2 rounded-vds-lg bg-surface-100 border border-line text-ink-lighter hover:text-ink hover:border-line-regular font-ui text-xs flex items-center gap-1 transition-colors state-layer-std"
                title="Ghi chú cập nhật / Nhật ký tiến độ"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span className="hidden sm:inline font-num text-xs">
                  ({task.logs.length})
                </span>
              </button>

              <button
                onClick={() => onDeleteTask(task.id)}
                className="h-[32px] w-[32px] rounded-vds-lg border border-transparent text-subdued-lighter hover:text-negative hover:bg-surface-negative flex items-center justify-center transition-colors"
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
