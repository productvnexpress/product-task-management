/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { ProjectItem, PhaseStatus, TaskItem, ProjectPhase } from '../types';
import { diffInDays, parseDateSafe } from '../utils/projectForecastUtils';
import { formatDateShort } from '../utils/formatters';
import { cleanPhaseTitle, formatPhaseName, sortPhasesByDate } from '../utils/phaseUtils';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Flag,
  Check,
  CircleDot,
  Plus,
  Rocket,
  Edit2,
  Trash2,
  Save,
  X,
} from './vds/icons';

interface ProjectTimelineViewProps {
  project: ProjectItem;
  tasks: TaskItem[];
  isEditing?: boolean;
  onUpdatePhaseStatus?: (phaseId: string, status: PhaseStatus) => void;
  onUpdatePhase?: (phaseId: string, updatedFields: Partial<ProjectPhase>) => void;
  onDeletePhase?: (phaseId: string) => void;
  onAddPhaseClick?: () => void;
}

export const ProjectTimelineView: React.FC<ProjectTimelineViewProps> = ({
  project,
  tasks,
  isEditing = false,
  onUpdatePhaseStatus,
  onUpdatePhase,
  onDeletePhase,
  onAddPhaseClick,
}) => {
  const projTasks = tasks.filter((t) => t.projectId === project.id || t.projectName === project.name);
  
  // Requirement 2: Sắp xếp các giai đoạn theo thời gian từ gần đến xa
  const phases = useMemo(() => {
    return sortPhasesByDate(project.phases || []);
  }, [project.phases]);
  const today = new Date();

  // Active editing phase state
  const [editingPhaseId, setEditingPhaseId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editStatus, setEditStatus] = useState<PhaseStatus>('Chưa bắt đầu');
  const [editDescription, setEditDescription] = useState('');

  // Requirement 1: Không cần nhập text Giai đoạn 1, 2 - lấy tên thuần
  const handleStartEdit = (ph: ProjectPhase) => {
    setEditingPhaseId(ph.id);
    setEditName(cleanPhaseTitle(ph.name));
    setEditDueDate(ph.dueDate);
    setEditStatus(ph.status);
    setEditDescription(ph.description || '');
  };

  const handleCancelEdit = () => {
    setEditingPhaseId(null);
    setEditName('');
    setEditDueDate('');
    setEditDescription('');
  };

  const handleSavePhase = (phaseId: string) => {
    if (!editName.trim() || !onUpdatePhase) return;
    onUpdatePhase(phaseId, {
      name: cleanPhaseTitle(editName.trim()),
      dueDate: editDueDate,
      status: editStatus,
      description: editDescription.trim() || undefined,
    });
    setEditingPhaseId(null);
  };

  // Helper for phase status badge
  const getPhaseStatusBadge = (status: PhaseStatus) => {
    switch (status) {
      case 'Đã hoàn thành':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-positive bg-surface-positive px-2 py-0.5 rounded-full border border-line">
            <CheckCircle2 className="w-3 h-3 text-positive" />
            <span>Đã hoàn thành</span>
          </span>
        );
      case 'Đang triển khai':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-support bg-surface-support px-2 py-0.5 rounded-full border border-line">
            <span className="w-2 h-2 rounded-full bg-support-solid animate-pulse"></span>
            <span>Đang triển khai</span>
          </span>
        );
      case 'Bị nghẽn':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-negative bg-surface-negative px-2 py-0.5 rounded-full border border-line">
            <AlertTriangle className="w-3 h-3 text-negative" />
            <span>Bị nghẽn</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-ink-lighter bg-surface-200 px-2 py-0.5 rounded-full border border-line">
            <CircleDot className="w-3 h-3 text-subdued" />
            <span>Chưa bắt đầu</span>
          </span>
        );
    }
  };

  // Target date countdown
  const targetDateObj = parseDateSafe(project.targetDate);
  const daysToTarget = diffInDays(today, targetDateObj);

  return (
    <div className="space-y-4 font-body">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-2 border-b border-line">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-ink">
            Dòng thời gian triển khai ({phases.length} giai đoạn)
          </span>
        </div>
        {isEditing && onAddPhaseClick && (
          <button
            type="button"
            onClick={onAddPhaseClick}
            className="px-2.5 py-1 bg-accent-solid hover:bg-accent-solid-hover text-on-color text-xs font-bold rounded-vds-md transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm giai đoạn</span>
          </button>
        )}
      </div>

      {/* Concise Vertical Timeline */}
      <div className="relative pl-6 space-y-3.5 before:absolute before:left-2.5 before:top-2.5 before:bottom-2.5 before:w-[2px] before:bg-surface-300">
        
        {/* Node 0: Kickoff */}
        <div className="relative flex items-center justify-between gap-3 bg-surface-100 p-2.5 rounded-vds-lg border border-line text-xs">
          <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-surface border-2 border-line-support flex items-center justify-center z-10">
            <span className="w-1.5 h-1.5 rounded-full bg-support-solid" />
          </div>
          <div className="flex items-center gap-2 font-semibold text-ink">
            <span>🚀 Khởi động Dự án</span>
          </div>
          <span className="font-ui text-support font-bold text-xs bg-surface px-2 py-0.5 rounded border border-line">
            {formatDateShort(project.startDate || '2026-09-01')}
          </span>
        </div>

        {/* Nodes 1..N: Project Phases */}
        {phases.length === 0 ? (
          <div className="p-3 text-center bg-surface-100 rounded-vds-lg border border-dashed border-line text-xs text-subdued">
            Chưa có giai đoạn nào được ghi nhận.
          </div>
        ) : (
          phases.map((ph, idx) => {
            const phDate = parseDateSafe(ph.dueDate);
            const daysLeft = diffInDays(today, phDate);
            const phaseTasks = projTasks.filter((t) => t.phaseId === ph.id || t.phaseName === ph.name);
            const doneTasks = phaseTasks.filter((t) => t.status === 'Hoàn thành').length;

            return (
              <div key={ph.id} className="relative group">
                {/* Timeline Circle Node */}
                <div
                  className={`absolute -left-6 top-3.5 -translate-y-1/2 w-5 h-5 rounded-full bg-surface border-2 flex items-center justify-center z-10 ${
                    ph.status === 'Đã hoàn thành'
                      ? 'border-line-positive text-positive'
                      : ph.status === 'Bị nghẽn'
                      ? 'border-line-negative text-negative'
                      : ph.status === 'Đang triển khai'
                      ? 'border-line-support text-support'
                      : 'border-line-regular text-subdued-lighter'
                  }`}
                >
                  {ph.status === 'Đã hoàn thành' ? (
                    <Check className="w-3 h-3" />
                  ) : ph.status === 'Bị nghẽn' ? (
                    <AlertTriangle className="w-3 h-3" />
                  ) : (
                    <span className="text-[10px] font-bold">{idx + 1}</span>
                  )}
                </div>

                {/* Phase Card */}
                <div
                  className={`p-3 rounded-vds-lg border space-y-2 transition ${
                    ph.status === 'Bị nghẽn'
                      ? 'bg-surface-100 border-line'
                      : ph.status === 'Đang triển khai'
                      ? 'bg-surface-100 border-line'
                      : 'bg-surface border-line'
                  }`}
                >
                  {editingPhaseId === ph.id ? (
                    /* INLINE EDIT FORM FOR THIS PHASE */
                    <div className="space-y-2.5 bg-surface p-2.5 rounded-vds-lg border border-line-support animate-fade-in ">
                      <div className="flex items-center justify-between border-b border-divider pb-1.5">
                        <span className="font-ui text-xs font-bold text-support flex items-center gap-1">
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Chỉnh sửa giai đoạn {idx + 1}</span>
                        </span>
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="p-1 text-subdued hover:text-ink rounded hover:bg-surface-200"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-ink-lighter">Nội dung giai đoạn:</label>
                            <span className="text-[10px] font-bold text-support bg-surface-support px-1.5 py-0.2 rounded border border-line">
                              Giai đoạn {idx + 1} (Tự động)
                            </span>
                          </div>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="VD: Khảo sát & PRD, Thiết kế UI/UX..."
                            className="w-full px-2 py-1.5 border border-line rounded text-xs text-ink focus:border-line-support"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-xs font-semibold text-ink-lighter">Hạn hoàn thành (sắp xếp tự động):</label>
                          <input
                            type="date"
                            value={editDueDate}
                            onChange={(e) => setEditDueDate(e.target.value)}
                            className="w-full px-2 py-1.5 border border-line rounded text-xs font-num text-ink"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="space-y-0.5">
                          <label className="text-xs font-semibold text-ink-lighter">Trạng thái:</label>
                          <select
                            value={editStatus}
                            onChange={(e) => setEditStatus(e.target.value as PhaseStatus)}
                            className="w-full px-2 py-1.5 border border-line rounded text-xs bg-surface text-ink"
                          >
                            <option value="Chưa bắt đầu">⚪ Chưa bắt đầu</option>
                            <option value="Đang triển khai">🔵 Đang triển khai</option>
                            <option value="Bị nghẽn">🔴 Bị nghẽn</option>
                            <option value="Đã hoàn thành">🟢 Đã hoàn thành</option>
                          </select>
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-xs font-semibold text-ink-lighter">Mô tả tóm tắt:</label>
                          <input
                            type="text"
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            placeholder="Nội dung chính hoặc tiêu chí nghiệm thu..."
                            className="w-full px-2 py-1.5 border border-line rounded text-xs text-ink"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        {onDeletePhase && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Bạn có chắc muốn xóa giai đoạn "${ph.name}"?`)) {
                                onDeletePhase(ph.id);
                                handleCancelEdit();
                              }
                            }}
                            className="px-2 py-1 text-xs font-semibold text-negative hover:bg-surface-negative rounded flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Xóa giai đoạn</span>
                          </button>
                        )}
                        <div className="flex items-center gap-2 ml-auto">
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="px-2.5 py-1 text-xs font-semibold text-ink-lighter hover:bg-surface-200 rounded cursor-pointer"
                          >
                            Hủy
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSavePhase(ph.id)}
                            disabled={!editName.trim()}
                            className="px-3 py-1 bg-support-solid hover:bg-support-solid text-on-color text-xs font-semibold rounded flex items-center gap-1 disabled:opacity-50 cursor-pointer "
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>Lưu giai đoạn</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* VIEW MODE FOR THIS PHASE WITH EDIT & DELETE BUTTONS */
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-title text-xs font-bold text-ink">
                          {formatPhaseName(ph.name, idx)}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {isEditing && onUpdatePhaseStatus ? (
                            <select
                              value={ph.status}
                              onChange={(e) => onUpdatePhaseStatus(ph.id, e.target.value as PhaseStatus)}
                              className="text-xs font-ui font-bold px-2 py-0.5 border border-line rounded bg-surface text-ink"
                            >
                              <option value="Chưa bắt đầu">⚪ Chưa bắt đầu</option>
                              <option value="Đang triển khai">🔵 Đang triển khai</option>
                              <option value="Bị nghẽn">🔴 Bị nghẽn</option>
                              <option value="Đã hoàn thành">🟢 Đã hoàn thành</option>
                            </select>
                          ) : (
                            getPhaseStatusBadge(ph.status)
                          )}

                          {/* Edit Phase Button */}
                          <button
                            type="button"
                            onClick={() => handleStartEdit(ph)}
                            className="px-2 py-0.5 rounded text-xs font-ui font-semibold text-support bg-surface-support border border-line hover:bg-support-solid hover:text-on-color transition-colors flex items-center gap-1 cursor-pointer"
                            title="Chỉnh sửa thông tin giai đoạn này"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Sửa</span>
                          </button>

                          {/* Delete Phase Button */}
                          {onDeletePhase && (
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Bạn có chắc muốn xóa giai đoạn "${ph.name}"?`)) {
                                  onDeletePhase(ph.id);
                                }
                              }}
                              className="p-1 text-subdued hover:text-negative hover:bg-surface-negative rounded transition-colors cursor-pointer"
                              title="Xóa giai đoạn này"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {ph.description && (
                        <p className="text-xs text-ink-lighter leading-snug">
                          {ph.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1 border-t border-divider">
                        <div className="flex items-center gap-2">
                          <span className="font-ui text-ink-lighter flex items-center gap-1">
                            <Clock className="w-3 h-3 text-accent" />
                            <span><strong className="text-ink">{formatDateShort(ph.dueDate)}</strong></span>
                          </span>

                          {ph.status !== 'Đã hoàn thành' && (
                            <span
                              className={`font-num font-bold px-1.5 py-0.2 rounded text-[10px] ${
                                daysLeft < 0
                                  ? 'bg-surface-negative text-negative'
                                  : daysLeft <= 3
                                  ? 'bg-surface-warning text-warning'
                                  : 'bg-surface-200 text-ink-lighter'
                              }`}
                            >
                              {daysLeft < 0
                                ? `Quá hạn ${Math.abs(daysLeft)} ngày`
                                : daysLeft === 0
                                ? 'Hôm nay'
                                : `Còn ${daysLeft} ngày`}
                            </span>
                          )}
                        </div>

                        {phaseTasks.length > 0 && (
                          <span className="font-num text-ink-lighter bg-surface-100 px-2 py-0.2 rounded border border-line">
                            {doneTasks}/{phaseTasks.length} task
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Final Node: Go-Live Milestone */}
        <div className="relative group pt-1">
          <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-accent-solid border-2 border-surface text-on-color flex items-center justify-center z-10 ">
            <Flag className="w-3 h-3 fill-white" />
          </div>

          <div className="bg-surface-accent-faint p-2.5 rounded-vds-lg border border-line flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-accent-solid text-on-color">
                <Rocket className="w-3.5 h-3.5" />
              </span>
              <div>
                <h5 className="font-title text-xs font-bold text-accent">
                  Mốc Hoàn thành Dự án
                </h5>
                <span className="text-xs font-num font-semibold text-ink-lighter">
                  {daysToTarget >= 0
                    ? `Còn ${daysToTarget} ngày đến hạn chót`
                    : `Đã quá hạn ${Math.abs(daysToTarget)} ngày`}
                </span>
              </div>
            </div>

            <span className="font-num text-xs font-bold text-on-color bg-accent-solid px-2.5 py-1 rounded-vds-md">
              🏁 {formatDateShort(project.targetDate)}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};
