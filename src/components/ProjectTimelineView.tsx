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
} from 'lucide-react';

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
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#15803d] bg-[#f0fdf4] px-2 py-0.5 rounded-full border border-[#bbf7d0]">
            <CheckCircle2 className="w-3 h-3 text-[#15803d]" />
            <span>Đã hoàn thành</span>
          </span>
        );
      case 'Đang triển khai':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1d508d] bg-[#eef4fb] px-2 py-0.5 rounded-full border border-[#c2d7f0]">
            <span className="w-2 h-2 rounded-full bg-[#1d508d] animate-pulse"></span>
            <span>Đang triển khai</span>
          </span>
        );
      case 'Bị nghẽn':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#da1e28] bg-[#fff0f1] px-2 py-0.5 rounded-full border border-[#ffd0d3]">
            <AlertTriangle className="w-3 h-3 text-[#da1e28]" />
            <span>Bị nghẽn</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#5f5f5f] bg-[#f5f5f5] px-2 py-0.5 rounded-full border border-[#d6d6d6]">
            <CircleDot className="w-3 h-3 text-[#7f7f7f]" />
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
      <div className="flex items-center justify-between pb-2 border-b border-[#e6e6e6]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#202020] uppercase tracking-wide">
            Dòng thời gian triển khai ({phases.length} giai đoạn)
          </span>
        </div>
        {isEditing && onAddPhaseClick && (
          <button
            type="button"
            onClick={onAddPhaseClick}
            className="px-2.5 py-1 bg-[#b13460] hover:bg-[#8f274c] text-white text-[11px] font-bold rounded-[5px] transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm giai đoạn</span>
          </button>
        )}
      </div>

      {/* Concise Vertical Timeline */}
      <div className="relative pl-6 space-y-3.5 before:absolute before:left-2.5 before:top-2.5 before:bottom-2.5 before:w-[2px] before:bg-[#e2e8f0]">
        
        {/* Node 0: Kickoff */}
        <div className="relative flex items-center justify-between gap-3 bg-[#f8fafc] p-2.5 rounded-[6px] border border-[#e2e8f0] text-xs">
          <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white border-2 border-[#1d508d] flex items-center justify-center z-10">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1d508d]" />
          </div>
          <div className="flex items-center gap-2 font-semibold text-[#0f172a]">
            <span>🚀 Khởi động Dự án</span>
          </div>
          <span className="font-num text-[#1d508d] font-bold text-[11px] bg-white px-2 py-0.5 rounded border border-[#cbd5e1]">
            {formatDateShort(project.startDate || '2026-09-01')}
          </span>
        </div>

        {/* Nodes 1..N: Project Phases */}
        {phases.length === 0 ? (
          <div className="p-3 text-center bg-[#fafafa] rounded-[6px] border border-dashed border-[#d6d6d6] text-xs text-[#7f7f7f]">
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
                  className={`absolute -left-6 top-3.5 -translate-y-1/2 w-5 h-5 rounded-full bg-white border-2 flex items-center justify-center z-10 ${
                    ph.status === 'Đã hoàn thành'
                      ? 'border-[#24a148] text-[#24a148]'
                      : ph.status === 'Bị nghẽn'
                      ? 'border-[#da1e28] text-[#da1e28]'
                      : ph.status === 'Đang triển khai'
                      ? 'border-[#1d508d] text-[#1d508d]'
                      : 'border-[#94a3b8] text-[#94a3b8]'
                  }`}
                >
                  {ph.status === 'Đã hoàn thành' ? (
                    <Check className="w-3 h-3" />
                  ) : ph.status === 'Bị nghẽn' ? (
                    <AlertTriangle className="w-3 h-3" />
                  ) : (
                    <span className="text-[9px] font-bold">{idx + 1}</span>
                  )}
                </div>

                {/* Phase Card */}
                <div
                  className={`p-3 rounded-[8px] border space-y-2 transition-all shadow-2xs ${
                    ph.status === 'Bị nghẽn'
                      ? 'bg-[#fffbfb] border-[#ffd0d3]'
                      : ph.status === 'Đang triển khai'
                      ? 'bg-[#fcfdfd] border-[#c2d7f0]'
                      : 'bg-white border-[#e2e8f0]'
                  }`}
                >
                  {editingPhaseId === ph.id ? (
                    /* INLINE EDIT FORM FOR THIS PHASE */
                    <div className="space-y-2.5 bg-white p-2.5 rounded-[6px] border border-[#1d508d] animate-fade-in shadow-xs">
                      <div className="flex items-center justify-between border-b border-[#f0f0f0] pb-1.5">
                        <span className="font-ui text-xs font-bold text-[#1d508d] flex items-center gap-1">
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Chỉnh sửa giai đoạn {idx + 1}</span>
                        </span>
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="p-1 text-[#7f7f7f] hover:text-[#202020] rounded hover:bg-[#f0f0f0]"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-semibold text-[#505050]">Nội dung giai đoạn:</label>
                            <span className="text-[10px] font-bold text-[#1d508d] bg-[#eef4fb] px-1.5 py-0.2 rounded border border-[#c2d7f0]">
                              Giai đoạn {idx + 1} (Tự động)
                            </span>
                          </div>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="VD: Khảo sát & PRD, Thiết kế UI/UX..."
                            className="w-full px-2 py-1.5 border border-[#d0d0d0] rounded text-xs text-[#202020] focus:border-[#1d508d]"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[11px] font-semibold text-[#505050]">Hạn hoàn thành (sắp xếp tự động):</label>
                          <input
                            type="date"
                            value={editDueDate}
                            onChange={(e) => setEditDueDate(e.target.value)}
                            className="w-full px-2 py-1.5 border border-[#d0d0d0] rounded text-xs font-num text-[#202020]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="space-y-0.5">
                          <label className="text-[11px] font-semibold text-[#505050]">Trạng thái:</label>
                          <select
                            value={editStatus}
                            onChange={(e) => setEditStatus(e.target.value as PhaseStatus)}
                            className="w-full px-2 py-1.5 border border-[#d0d0d0] rounded text-xs bg-white text-[#202020]"
                          >
                            <option value="Chưa bắt đầu">⚪ Chưa bắt đầu</option>
                            <option value="Đang triển khai">🔵 Đang triển khai</option>
                            <option value="Bị nghẽn">🔴 Bị nghẽn</option>
                            <option value="Đã hoàn thành">🟢 Đã hoàn thành</option>
                          </select>
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[11px] font-semibold text-[#505050]">Mô tả tóm tắt:</label>
                          <input
                            type="text"
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            placeholder="Nội dung chính hoặc tiêu chí nghiệm thu..."
                            className="w-full px-2 py-1.5 border border-[#d0d0d0] rounded text-xs text-[#202020]"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="px-2.5 py-1 text-xs font-semibold text-[#5f5f5f] hover:bg-[#f0f0f0] rounded cursor-pointer"
                        >
                          Hủy
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSavePhase(ph.id)}
                          disabled={!editName.trim()}
                          className="px-3 py-1 bg-[#1d508d] hover:bg-[#153e6f] text-white text-xs font-semibold rounded flex items-center gap-1 disabled:opacity-50 cursor-pointer shadow-2xs"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>Lưu giai đoạn</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* VIEW MODE FOR THIS PHASE WITH EDIT & DELETE BUTTONS */
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-title text-xs font-bold text-[#0f172a]">
                          {formatPhaseName(ph.name, idx)}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {isEditing && onUpdatePhaseStatus ? (
                            <select
                              value={ph.status}
                              onChange={(e) => onUpdatePhaseStatus(ph.id, e.target.value as PhaseStatus)}
                              className="text-[11px] font-ui font-bold px-2 py-0.5 border border-[#cbd5e1] rounded bg-white text-[#0f172a]"
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
                            className="px-2 py-0.5 rounded text-[11px] font-ui font-semibold text-[#1d508d] bg-[#eef4fb] border border-[#c2d7f0] hover:bg-[#1d508d] hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
                            title="Chỉnh sửa thông tin giai đoạn này"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Sửa</span>
                          </button>

                          {/* Delete Phase Button */}
                          {onDeletePhase && (
                            <button
                              type="button"
                              onClick={() => onDeletePhase(ph.id)}
                              className="p-1 text-[#7f7f7f] hover:text-[#da1e28] hover:bg-[#fff0f1] rounded transition-colors cursor-pointer"
                              title="Xóa giai đoạn này"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {ph.description && (
                        <p className="text-[11px] text-[#475569] leading-snug">
                          {ph.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] pt-1 border-t border-[#f1f5f9]">
                        <div className="flex items-center gap-2">
                          <span className="font-ui text-[#5f5f5f] flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#b13460]" />
                            <span><strong className="text-[#202020]">{formatDateShort(ph.dueDate)}</strong></span>
                          </span>

                          {ph.status !== 'Đã hoàn thành' && (
                            <span
                              className={`font-num font-bold px-1.5 py-0.2 rounded text-[10px] ${
                                daysLeft < 0
                                  ? 'bg-[#fee2e2] text-[#b91c1c]'
                                  : daysLeft <= 3
                                  ? 'bg-[#fef3c7] text-[#b45309]'
                                  : 'bg-[#f1f5f9] text-[#475569]'
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
                          <span className="font-num text-[#475569] bg-[#f8fafc] px-2 py-0.2 rounded border border-[#e2e8f0]">
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
          <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#b13460] border-2 border-white text-white flex items-center justify-center z-10 shadow-2xs">
            <Flag className="w-3 h-3 fill-white" />
          </div>

          <div className="bg-[#fcf0f5] p-2.5 rounded-[8px] border border-[#f3c2d4] flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-[#b13460] text-white">
                <Rocket className="w-3.5 h-3.5" />
              </span>
              <div>
                <h5 className="font-title text-xs font-bold text-[#b13460]">
                  Mốc Ra mắt Chính thức (Go-Live)
                </h5>
                <span className="text-[11px] font-num font-semibold text-[#5f5f5f]">
                  {daysToTarget >= 0
                    ? `Còn ${daysToTarget} ngày đến hạn chót`
                    : `Đã quá hạn ${Math.abs(daysToTarget)} ngày`}
                </span>
              </div>
            </div>

            <span className="font-num text-xs font-bold text-white bg-[#b13460] px-2.5 py-1 rounded-[5px]">
              🏁 {formatDateShort(project.targetDate)}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};
