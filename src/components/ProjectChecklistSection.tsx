/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  CheckSquare,
  Check,
  Ban,
  ChevronDown,
  ChevronUp,
  PlusCircle,
  HelpCircle,
} from './vds/icons';
import { ProjectChecklistItem, ProjectChecklistStatus, MemberItem } from '../types';
import {
  CHECKLIST_PHASES,
  calculateChecklistStats,
  normalizeProjectChecklist,
} from '../data/defaultProjectChecklist';

interface ProjectChecklistSectionProps {
  checklist?: ProjectChecklistItem[];
  onUpdateChecklist: (updated: ProjectChecklistItem[]) => void;
  canEdit?: boolean;
  currentUser?: MemberItem | null;
  onCreateTaskFromItem?: (itemText: string, phaseName?: string) => void;
}

export const ProjectChecklistSection: React.FC<ProjectChecklistSectionProps> = ({
  checklist,
  onUpdateChecklist,
  canEdit = true,
  currentUser,
  onCreateTaskFromItem,
}) => {
  const normalizedList = normalizeProjectChecklist(checklist);
  const stats = calculateChecklistStats(normalizedList);

  // Mặc định mở rộng tất cả các giai đoạn
  const [expandedPhases, setExpandedPhases] = useState<Record<number, boolean>>({
    1: true,
    2: true,
    3: true,
    4: true,
    5: true,
  });

  // Bộ lọc trạng thái: 'all' | 'pending' | 'completed' | 'skipped'
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed' | 'skipped'>('all');

  const togglePhaseExpand = (phaseId: number) => {
    setExpandedPhases((prev) => ({
      ...prev,
      [phaseId]: !prev[phaseId],
    }));
  };

  const handleToggleComplete = (itemId: string) => {
    if (!canEdit) return;
    const authorName = currentUser?.name || 'Thành viên Product';
    const now = new Date().toISOString();

    const updated = normalizedList.map((item) => {
      if (item.id === itemId) {
        const nextStatus: ProjectChecklistStatus = item.status === 'completed' ? 'pending' : 'completed';
        return {
          ...item,
          status: nextStatus,
          completedAt: nextStatus === 'completed' ? now : undefined,
          completedBy: nextStatus === 'completed' ? authorName : undefined,
        };
      }
      return item;
    });

    onUpdateChecklist(updated);
  };

  const handleToggleSkip = (itemId: string) => {
    if (!canEdit) return;
    const authorName = currentUser?.name || 'Thành viên Product';
    const now = new Date().toISOString();

    const updated = normalizedList.map((item) => {
      if (item.id === itemId) {
        const nextStatus: ProjectChecklistStatus = item.status === 'skipped' ? 'pending' : 'skipped';
        return {
          ...item,
          status: nextStatus,
          completedAt: nextStatus === 'skipped' ? now : undefined,
          completedBy: nextStatus === 'skipped' ? authorName : undefined,
        };
      }
      return item;
    });

    onUpdateChecklist(updated);
  };

  const filteredList = normalizedList.filter((item) => {
    if (filterStatus === 'all') return true;
    return item.status === filterStatus;
  });

  return (
    <div className="bg-surface-100 p-4 rounded-vds-lg border border-line space-y-4 ">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-full bg-surface-accent-faint border border-line text-accent flex items-center justify-center font-bold">
            <CheckSquare className="w-3.5 h-3.5" />
          </div>
          <h3 className="font-title text-sm font-bold text-accent">
            5: Checklist
          </h3>
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1 bg-surface p-0.5 rounded-vds-lg border border-line shrink-0 text-xs font-ui">
          <button
            type="button"
            onClick={() => setFilterStatus('all')}
            className={`px-2 py-1 rounded-vds-md font-semibold transition-colors cursor-pointer ${
              filterStatus === 'all'
                ? 'bg-surface-selected text-accent ring-1 ring-inset ring-line-accent-soft'
                : 'text-ink-lighter hover:text-ink'
            }`}
          >
            Tất cả ({stats.total})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('pending')}
            className={`px-2 py-1 rounded-vds-md font-semibold transition-colors cursor-pointer ${
              filterStatus === 'pending'
                ? 'bg-surface-selected text-accent ring-1 ring-inset ring-line-accent-soft'
                : 'text-ink-lighter hover:text-ink'
            }`}
          >
            Chưa xong ({stats.pending})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('completed')}
            className={`px-2 py-1 rounded-vds-md font-semibold transition-colors cursor-pointer ${
              filterStatus === 'completed'
                ? 'bg-surface-selected text-accent ring-1 ring-inset ring-line-accent-soft'
                : 'text-ink-lighter hover:text-ink'
            }`}
          >
            Đã xong ({stats.completed})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('skipped')}
            className={`px-2 py-1 rounded-vds-md font-semibold transition-colors cursor-pointer ${
              filterStatus === 'skipped'
                ? 'bg-icon-strong text-on-color'
                : 'text-ink-lighter hover:text-ink'
            }`}
          >
            Bỏ qua ({stats.skipped})
          </button>
        </div>
      </div>

      {/* Progress Bar & Metric Cards */}
      <div className="bg-surface p-3.5 rounded-vds-lg border border-line space-y-2.5">
        <div className="flex items-center justify-between text-xs font-ui">
          <span className="font-semibold text-ink">Tiến độ tuân thủ tiêu chuẩn:</span>
          <div className="flex items-center gap-2">
            <span className="font-bold text-accent">{stats.percent}%</span>
            <span className="text-xs text-ink-lighter">
              ({stats.completed}/{stats.total - stats.skipped} hoàn thành
              {stats.skipped > 0 ? `, ${stats.skipped} loại bỏ` : ''})
            </span>
          </div>
        </div>

        {/* Multi-segment Progress Bar */}
        <div className="h-2 w-full bg-surface-300 rounded-full overflow-hidden flex">
          <div
            className="h-full bg-positive-solid transition duration-300"
            style={{ width: `${(stats.completed / Math.max(1, stats.total)) * 100}%` }}
            title={`Hoàn thành: ${stats.completed}`}
          />
          <div
            className="h-full bg-icon-subdued transition duration-300"
            style={{ width: `${(stats.skipped / Math.max(1, stats.total)) * 100}%` }}
            title={`Bỏ qua: ${stats.skipped}`}
          />
        </div>
      </div>

      {/* Checklist Phases List */}
      <div className="space-y-3">
        {CHECKLIST_PHASES.map((phase) => {
          const phaseItems = filteredList.filter((item) => item.phaseId === phase.id);
          const allPhaseItems = normalizedList.filter((item) => item.phaseId === phase.id);
          const phaseCompleted = allPhaseItems.filter((i) => i.status === 'completed').length;
          const phaseSkipped = allPhaseItems.filter((i) => i.status === 'skipped').length;
          const isExpanded = expandedPhases[phase.id] ?? true;

          // Nếu đang lọc mà giai đoạn không có item nào thì ẩn
          if (phaseItems.length === 0 && filterStatus !== 'all') {
            return null;
          }

          return (
            <div
              key={phase.id}
              className="bg-surface rounded-vds-lg border border-line overflow-hidden "
            >
              {/* Phase Header */}
              <div
                onClick={() => togglePhaseExpand(phase.id)}
                className="flex items-center justify-between p-3 bg-surface-100 hover:bg-surface-200 cursor-pointer transition-colors border-b border-divider select-none"
              >
                <div className="flex items-center gap-2.5">
                  <span className="font-title text-xs font-bold text-ink">
                    {phase.title}
                  </span>
                  <span
                    className={`text-[10px] font-ui font-semibold px-2 py-0.5 rounded-vds-md border ${phase.badgeColor}`}
                  >
                    {phaseCompleted}/{phase.itemCount} hoàn thành
                    {phaseSkipped > 0 ? ` (${phaseSkipped} bỏ qua)` : ''}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-ink-lighter">
                  <span className="text-xs font-ui hidden sm:inline">
                    {isExpanded ? 'Thu gọn' : 'Mở rộng'}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </div>
              </div>

              {/* Items List */}
              {isExpanded && (
                <div className="divide-y divide-divider">
                  {phaseItems.length === 0 ? (
                    <div className="p-3 text-center text-xs text-subdued italic font-ui">
                      Không có mục nào trong giai đoạn này khớp bộ lọc hiện tại.
                    </div>
                  ) : (
                    phaseItems.map((item, idx) => {
                      const isCompleted = item.status === 'completed';
                      const isSkipped = item.status === 'skipped';

                      return (
                        <div
                          key={item.id}
                          className={`p-2.5 px-3 flex items-start gap-2.5 transition-colors group ${
                            isCompleted
                              ? 'bg-surface-100'
                              : isSkipped
                              ? 'bg-surface-100 opacity-65'
                              : 'bg-surface hover:bg-surface-100'
                          }`}
                        >
                          {/* Complete Checkbox */}
                          <button
                            type="button"
                            onClick={() => handleToggleComplete(item.id)}
                            disabled={!canEdit}
                            title={
                              isCompleted
                                ? 'Bấm để hủy hoàn thành'
                                : 'Đánh dấu đã hoàn thành'
                            }
                            className={`mt-0.5 w-4 h-4 rounded-vds-md border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                              isCompleted
                                ? 'bg-positive-solid border-line-positive text-on-color'
                                : 'border-line-regular bg-surface hover:border-line-positive'
                            }`}
                          >
                            {isCompleted && <Check className="w-3 h-3 stroke-[3]" />}
                          </button>

                          {/* Index & Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-xs font-ui font-semibold text-subdued shrink-0">
                                {idx + 1}.
                              </span>
                              <span
                                className={`text-xs font-ui leading-relaxed ${
                                  isCompleted
                                    ? 'text-positive font-medium'
                                    : isSkipped
                                    ? 'line-through text-subdued'
                                    : 'text-ink'
                                }`}
                              >
                                {item.text}
                              </span>
                            </div>

                            {/* Metadata audit */}
                            {(item.completedAt || item.completedBy) && (
                              <div className="mt-1 text-[10px] text-subdued font-ui flex items-center gap-1.5">
                                <span className={isCompleted ? 'text-positive' : 'text-ink-lighter'}>
                                  ● {isCompleted ? 'Đã hoàn thành' : 'Đã bỏ qua'}
                                </span>
                                {item.completedBy && <span>bởi {item.completedBy}</span>}
                              </div>
                            )}
                          </div>

                          {/* Actions: Skip & Quick Task Create */}
                          <div className="flex items-center gap-1 shrink-0">
                            {/* Nút Bỏ qua / Gạch ngang */}
                            <button
                              type="button"
                              onClick={() => handleToggleSkip(item.id)}
                              disabled={!canEdit}
                              title={
                                isSkipped
                                  ? 'Khôi phục lại tiêu chuẩn này'
                                  : 'Không áp dụng cho dự án này (Gạch ngang loại bỏ)'
                              }
                              className={`p-1 rounded-vds-md text-xs font-ui transition-colors cursor-pointer flex items-center gap-1 ${
                                isSkipped
                                  ? 'bg-icon-strong text-on-color hover:bg-surface-dark'
                                  : 'text-subdued hover:text-negative hover:bg-surface-negative'
                              }`}
                            >
                              <Ban className="w-3.5 h-3.5" />
                              <span className="text-[10px] hidden md:inline">
                                {isSkipped ? 'Bỏ gạch' : 'Loại bỏ'}
                              </span>
                            </button>

                            {/* Nút Tạo công việc từ mục này */}
                            {onCreateTaskFromItem && !isCompleted && !isSkipped && (
                              <button
                                type="button"
                                onClick={() => onCreateTaskFromItem(item.text, phase.shortTitle)}
                                title="Tạo công việc thực hiện mục này"
                                className="p-1 rounded-vds-md text-accent hover:bg-surface-accent-faint transition-colors cursor-pointer flex items-center gap-1"
                              >
                                <PlusCircle className="w-3.5 h-3.5" />
                                <span className="text-[10px] hidden md:inline font-semibold">
                                  Tạo task
                                </span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
