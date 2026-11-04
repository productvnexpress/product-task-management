/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { TaskItem, TaskStatus } from '../types';
import { formatDateWithEnDay, formatPercentage } from '../utils/formatters';
import { AlertCircle, Check, MessageSquare, ChevronRight, ChevronLeft, Layers, Link, ExternalLink, CheckCircle2 } from './vds/icons';

interface KanbanBoardProps {
  tasks: TaskItem[];
  onUpdateStatus: (taskId: string, newStatus: TaskStatus) => void;
  onUpdateProgress: (taskId: string, newProgress: number) => void;
  onOpenLogModal: (task: TaskItem) => void;
}

const COLUMNS: { status: TaskStatus; title: string; color: string; border: string }[] = [
  { status: 'Chưa làm', title: 'Chưa làm', color: 'text-ink-lighter', border: 'border-line-regular' },
  { status: 'Đang làm', title: 'Đang làm', color: 'text-support', border: 'border-line-support' },
  { status: 'Bị nghẽn', title: 'Bị nghẽn', color: 'text-negative', border: 'border-line-negative' },
  { status: 'Hoàn thành', title: 'Hoàn thành', color: 'text-positive', border: 'border-line-positive' },
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tasks,
  onUpdateStatus,
  onUpdateProgress,
  onOpenLogModal,
}) => {
  const getNextStatus = (current: TaskStatus): TaskStatus | null => {
    switch (current) {
      case 'Chưa làm': return 'Đang làm';
      case 'Đang làm': return 'Hoàn thành';
      case 'Bị nghẽn': return 'Đang làm';
      case 'Hoàn thành': return null;
    }
  };

  const getPrevStatus = (current: TaskStatus): TaskStatus | null => {
    switch (current) {
      case 'Chưa làm': return null;
      case 'Đang làm': return 'Chưa làm';
      case 'Bị nghẽn': return 'Đang làm';
      case 'Hoàn thành': return 'Đang làm';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 p-4 sm:p-6 bg-surface-100">
      {COLUMNS.map((col) => {
        const columnTasks = tasks.filter((t) => t.status === col.status);

        return (
          <div
            key={col.status}
            className="bg-surface border border-line rounded-vds-md flex flex-col min-h-[500px]"
          >
            {/* Column Header */}
            <div className="px-3 py-2.5 border-b border-line bg-surface-200 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${
                  col.status === 'Hoàn thành' ? 'bg-positive-solid' :
                  col.status === 'Bị nghẽn' ? 'bg-negative-solid' :
                  col.status === 'Đang làm' ? 'bg-support-solid' : 'bg-icon-subdued'
                }`} />
                <span className={`font-ui text-xs font-bold ${col.color}`}>
                  {col.title}
                </span>
              </div>
              <span className="font-num text-xs px-2 py-0.5 rounded-vds-md bg-surface border border-line text-ink-lighter">
                {columnTasks.length}
              </span>
            </div>

            {/* Task Cards */}
            <div className="p-2 space-y-2 flex-1 overflow-y-auto max-h-[calc(100vh-280px)]">
              {columnTasks.length === 0 ? (
                <div className="text-center py-8 text-xs font-body text-subdued-lighter">
                  Không có công việc
                </div>
              ) : (
                columnTasks.map((task) => {
                  const next = getNextStatus(task.status);
                  const prev = getPrevStatus(task.status);

                  return (
                    <div
                      key={task.id}
                      className={`p-3 bg-surface border rounded-vds-md transition hover:border-line-regular ${
                        task.status === 'Bị nghẽn'
                          ? 'border-line-negative/40 bg-surface-100'
                          : 'border-line'
                      }`}
                    >
                      {/* Priority tag: ONLY highlight Khẩn cấp in red without heavy box */}
                      <div className="flex items-center justify-between gap-1 mb-1.5 flex-wrap">
                        {task.priority === 'Khẩn cấp' ? (
                          <span className="font-ui text-[10px] font-bold text-negative flex items-center gap-1">
                            🚨 Khẩn cấp
                          </span>
                        ) : (
                          <span className="font-ui text-[10px] text-subdued flex items-center gap-1">
                            {task.priority}
                          </span>
                        )}
                      </div>

                      {/* Phase Tag if present */}
                      {task.phaseName && (
                        <div className="mb-1.5">
                          <span className="font-ui text-[10px] text-ink-lighter inline-flex items-center gap-1">
                            <Layers className="w-2.5 h-2.5 text-subdued" />
                            <span className="truncate max-w-[170px]">{task.phaseName}</span>
                          </span>
                        </div>
                      )}

                      {/* Title */}
                      <h4 className="font-body text-xs text-ink font-normal leading-snug mb-2">
                        {task.title}
                      </h4>

                      {/* Blocker alert if blocked */}
                      {task.status === 'Bị nghẽn' && (
                        <div className="mb-2 p-1.5 bg-surface-negative border border-line-negative rounded-vds-sm text-xs font-body text-negative flex items-start gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                          <span>{task.blockerReason || task.latestUpdateNote || 'Đang vướng mắc.'}</span>
                        </div>
                      )}

                      {/* Link Badges */}
                      {(task.workLink || task.resultLink) && (
                        <div className="mb-2 flex items-center gap-2 flex-wrap text-[10px]">
                          {task.workLink && (
                            <a
                              href={task.workLink.startsWith('http') ? task.workLink : `https://${task.workLink}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-ui font-medium text-info hover:text-info inline-flex items-center gap-1 hover:underline transition-colors"
                              title={task.workLink}
                            >
                              <Link className="w-2.5 h-2.5 text-info" />
                              <span>Link làm việc</span>
                              <ExternalLink className="w-2 h-2" />
                            </a>
                          )}
                          {task.workLink && task.resultLink && <span className="text-icon-subdued">•</span>}
                          {task.resultLink && (
                            <a
                              href={task.resultLink.startsWith('http') ? task.resultLink : `https://${task.resultLink}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-ui font-medium text-positive hover:text-positive inline-flex items-center gap-1 hover:underline transition-colors"
                              title={task.resultLink}
                            >
                              <CheckCircle2 className="w-2.5 h-2.5 text-positive" />
                              <span>Link kết quả</span>
                              <ExternalLink className="w-2 h-2" />
                            </a>
                          )}
                        </div>
                      )}

                      {/* Progress Bar & Quick Step Switcher */}
                      <div className="mb-2">
                        <div className="flex items-center justify-between text-[10px] font-num text-subdued mb-1">
                          <span>Tiến độ</span>
                          <span className="font-bold text-ink">
                            {formatPercentage(task.progress, 0)}
                          </span>
                        </div>
                        <div className="h-1.5 bg-surface-300 rounded-vds-sm overflow-hidden mb-1.5">
                          <div
                            className={`h-full ${
                              task.progress === 100 ? 'bg-positive-solid' : 'bg-support-solid'
                            }`}
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>

                        {/* 1-click % buttons */}
                        <div className="flex items-center justify-between gap-0.5">
                          {[0, 25, 50, 75, 100].map((step) => (
                            <button
                              key={step}
                              onClick={() => onUpdateProgress(task.id, step)}
                              className={`flex-1 py-0.5 text-[10px] font-num rounded-vds-sm transition-colors ${
                                task.progress === step
                                  ? 'bg-surface-accent-faint text-accent border border-line font-bold '
                                  : 'bg-surface-200 text-ink-lighter hover:bg-surface-300'
                              }`}
                            >
                              {step}%
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Metadata: Assignee, Due date */}
                      <div className="pt-2 border-t border-divider flex items-center justify-between text-xs font-body text-ink-lighter">
                        <span className="truncate max-w-[100px]">{task.assignee}</span>
                        <span className="font-num text-[10px] text-subdued">
                          {formatDateWithEnDay(task.dueDate)}
                        </span>
                      </div>

                      {/* Quick Move / Action bar */}
                      <div className="mt-2 pt-1.5 flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1">
                          {prev && (
                            <button
                              onClick={() => onUpdateStatus(task.id, prev)}
                              className="h-[24px] px-1.5 rounded-vds-md bg-surface-200 border border-line text-[10px] font-ui text-ink-lighter hover:text-ink flex items-center"
                              title={`Lùi về: ${prev}`}
                            >
                              <ChevronLeft className="w-3 h-3" />
                            </button>
                          )}
                          {next && (
                            <button
                              onClick={() => onUpdateStatus(task.id, next)}
                              className="h-[24px] px-1.5 rounded-vds-md bg-support-solid text-on-color text-[10px] font-ui font-bold flex items-center gap-0.5"
                              title={`Chuyển sang: ${next}`}
                            >
                              <span>{next}</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        <button
                          onClick={() => onOpenLogModal(task)}
                          className="h-[24px] px-2 rounded-vds-md bg-surface-100 border border-line text-[10px] font-ui text-ink-lighter hover:text-ink flex items-center gap-1"
                          title="Xem hoặc thêm ghi chú"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span className="font-num">{task.logs.length}</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
