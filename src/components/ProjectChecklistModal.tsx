/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  ListChecks,
  Check,
  Ban,
  ArrowRightCircle,
  ChevronDown,
  ChevronUp,
  Search,
  ChevronsUpDown,
} from './vds/icons';
import { ProjectItem, ProjectChecklistItem, ProjectChecklistStatus, MemberItem } from '../types';
import {
  CHECKLIST_PHASES,
  calculateChecklistStats,
  normalizeProjectChecklist,
} from '../data/defaultProjectChecklist';

interface ProjectChecklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectItem;
  onSelectAsTaskTitle?: (title: string, phaseId?: number) => void;
  onUpdateProjectChecklist?: (projectId: string, updatedChecklist: ProjectChecklistItem[]) => void;
  currentUser?: MemberItem | null;
}

export const ProjectChecklistModal: React.FC<ProjectChecklistModalProps> = ({
  isOpen,
  onClose,
  project,
  onSelectAsTaskTitle,
  onUpdateProjectChecklist,
  currentUser,
}) => {
  // Hooks luôn được gọi ở đầu component
  const [activePhaseTab, setActivePhaseTab] = useState<number | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed' | 'skipped'>('all');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [expandedPhases, setExpandedPhases] = useState<Record<number, boolean>>({
    1: true,
    2: true,
    3: true,
    4: true,
    5: true,
  });

  const [templateVersion, setTemplateVersion] = useState(0);

  useEffect(() => {
    const handleTemplateUpdate = () => {
      setTemplateVersion((v) => v + 1);
    };
    window.addEventListener('wms_checklist_template_updated', handleTemplateUpdate);
    return () => window.removeEventListener('wms_checklist_template_updated', handleTemplateUpdate);
  }, []);

  const currentChecklist = useMemo(() => {
    return normalizeProjectChecklist(project?.checklist);
  }, [project?.checklist, templateVersion]);

  const stats = useMemo(() => calculateChecklistStats(currentChecklist), [currentChecklist]);

  // Kiểm tra điều kiện render sau khi đã gọi đầy đủ hooks
  if (!isOpen || !project) return null;

  const togglePhaseExpand = (phaseId: number) => {
    setExpandedPhases((prev) => ({
      ...prev,
      [phaseId]: !prev[phaseId],
    }));
  };

  const areAllExpanded = CHECKLIST_PHASES.every((p) => expandedPhases[p.id] !== false);

  const toggleAllPhases = () => {
    const nextState = !areAllExpanded;
    setExpandedPhases({
      1: nextState,
      2: nextState,
      3: nextState,
      4: nextState,
      5: nextState,
    });
  };

  const handleSelectPhaseTab = (tab: number | 'all') => {
    setActivePhaseTab(tab);
    if (tab !== 'all') {
      // Khi chọn xem riêng một giai đoạn, tự động mở rộng giai đoạn đó
      setExpandedPhases((prev) => ({ ...prev, [tab]: true }));
    }
  };

  const handleToggleComplete = (itemId: string) => {
    if (!onUpdateProjectChecklist) return;
    const authorName = currentUser?.name || 'Thành viên Product';
    const now = new Date().toISOString();

    const updated = currentChecklist.map((item) => {
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

    onUpdateProjectChecklist(project.id, updated);
  };

  const handleToggleSkip = (itemId: string) => {
    if (!onUpdateProjectChecklist) return;
    const authorName = currentUser?.name || 'Thành viên Product';
    const now = new Date().toISOString();

    const updated = currentChecklist.map((item) => {
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

    onUpdateProjectChecklist(project.id, updated);
  };

  // Lọc giai đoạn hiển thị
  const phasesToDisplay = activePhaseTab === 'all'
    ? CHECKLIST_PHASES
    : CHECKLIST_PHASES.filter((p) => p.id === activePhaseTab);

  // Tổng số mục khớp tìm kiếm và bộ lọc
  const totalMatchingItems = currentChecklist.filter((item) => {
    if (activePhaseTab !== 'all' && item.phaseId !== activePhaseTab) return false;
    if (filterStatus !== 'all' && item.status !== filterStatus) return false;
    if (searchKeyword.trim() && !item.text.toLowerCase().includes(searchKeyword.trim().toLowerCase())) return false;
    return true;
  }).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-surface w-full max-w-3xl rounded-vds-lg shadow-sheet border border-line flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-line bg-surface-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-surface-accent-faint border border-line text-accent flex items-center justify-center font-bold shrink-0">
              <ListChecks className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-title text-base font-bold text-ink">
                  Checklist dự án: {project.name.replace(/^Dự án\s+/i, '')}
                </h3>
                <span className="text-[10px] font-num font-bold px-1.5 py-0.5 rounded bg-surface-200 text-ink-lighter border border-line">
                  {project.code}
                </span>
              </div>
              <p className="text-xs text-ink-lighter font-ui mt-0.5">
                Bấm "Dùng mục này" để điền tiêu đề công việc hoặc đánh dấu tiến độ tuân thủ
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-ink-lighter hover:text-ink hover:bg-surface-300 rounded-vds-lg transition-colors cursor-pointer"
            title="Đóng cửa sổ"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Subheader: Tiến độ & Bộ lọc */}
        <div className="px-5 py-3 border-b border-line bg-surface space-y-3">
          {/* Hàng tiến độ tuân thủ */}
          <div className="flex items-center justify-between text-xs font-ui">
            <span className="text-ink-lighter font-medium">Tiến độ tuân thủ tiêu chuẩn:</span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-accent">{stats.percent}%</span>
              <span className="text-xs text-ink-lighter">
                ({stats.completed}/{stats.total - stats.skipped} hoàn thành
                {stats.skipped > 0 ? `, ${stats.skipped} bỏ qua` : ''})
              </span>
            </div>
          </div>

          {/* Thanh tiến độ đa màu */}
          <div className="h-1.5 w-full bg-surface-200 rounded-full overflow-hidden flex">
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

          {/* Tabs Giai đoạn */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-ui scrollbar-none">
            <button
              type="button"
              onClick={() => handleSelectPhaseTab('all')}
              className={`px-2.5 py-1 rounded-vds-lg font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                activePhaseTab === 'all'
                  ? 'bg-surface-selected text-accent ring-1 ring-inset ring-line-accent-soft'
                  : 'bg-surface-200 text-ink-lighter hover:bg-surface-300'
              }`}
            >
              Tất cả ({currentChecklist.length})
            </button>
            {CHECKLIST_PHASES.map((p) => {
              const allPhaseItems = currentChecklist.filter((i) => i.phaseId === p.id);
              const countInPhase = allPhaseItems.filter((i) => i.status === 'completed').length;
              const totalInPhase = allPhaseItems.length || p.itemCount;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectPhaseTab(p.id)}
                  className={`px-2.5 py-1 rounded-vds-lg font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    activePhaseTab === p.id
                      ? 'bg-surface-selected text-accent ring-1 ring-inset ring-line-accent-soft'
                      : 'bg-surface-200 text-ink-lighter hover:bg-surface-300'
                  }`}
                >
                  {p.shortTitle} ({countInPhase}/{totalInPhase})
                </button>
              );
            })}
          </div>

          {/* Thanh tiện ích: Ô tìm kiếm + Lọc trạng thái + Thu gọn/Mở rộng */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            {/* Search Box */}
            <div className="relative flex-1 min-w-[200px] max-w-[320px]">
              <Search className="w-3.5 h-3.5 text-subdued absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="Tìm tiêu chuẩn (SEO, Tracking, Figma...)"
                className="w-full pl-8 pr-7 py-1 text-xs font-ui bg-surface-100 border border-line rounded-vds-lg focus:outline-hidden focus:border-line-accent focus:bg-surface text-ink placeholder-subdued transition-colors"
              />
              {searchKeyword && (
                <button
                  type="button"
                  onClick={() => setSearchKeyword('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-subdued hover:text-ink cursor-pointer"
                  title="Xóa tìm kiếm"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs font-ui">
              {/* Lọc trạng thái */}
              <div className="flex items-center gap-1 bg-surface-200 p-0.5 rounded-vds-lg border border-line">
                <button
                  type="button"
                  onClick={() => setFilterStatus('all')}
                  className={`px-2 py-0.5 rounded-vds-md font-medium transition-colors cursor-pointer ${
                    filterStatus === 'all'
                      ? 'bg-surface text-ink font-semibold '
                      : 'text-ink-lighter hover:text-ink'
                  }`}
                >
                  Tất cả
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('pending')}
                  className={`px-2 py-0.5 rounded-vds-md font-medium transition-colors cursor-pointer ${
                    filterStatus === 'pending'
                      ? 'bg-surface text-warning font-semibold '
                      : 'text-ink-lighter hover:text-ink'
                  }`}
                >
                  Chưa xong
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('completed')}
                  className={`px-2 py-0.5 rounded-vds-md font-medium transition-colors cursor-pointer ${
                    filterStatus === 'completed'
                      ? 'bg-surface text-positive font-semibold '
                      : 'text-ink-lighter hover:text-ink'
                  }`}
                >
                  Đã xong
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('skipped')}
                  className={`px-2 py-0.5 rounded-vds-md font-medium transition-colors cursor-pointer ${
                    filterStatus === 'skipped'
                      ? 'bg-surface text-ink-lighter font-semibold '
                      : 'text-ink-lighter hover:text-ink'
                  }`}
                >
                  Bỏ qua
                </button>
              </div>

              {/* Nút Thu gọn/Mở rộng tất cả khi ở tab "Tất cả" */}
              {activePhaseTab === 'all' && (
                <button
                  type="button"
                  onClick={toggleAllPhases}
                  className="flex items-center gap-1 px-2 py-1 text-ink-lighter hover:text-ink hover:bg-surface-200 rounded-vds-lg transition-colors cursor-pointer border border-line bg-surface"
                  title={areAllExpanded ? 'Thu gọn tất cả giai đoạn' : 'Mở rộng tất cả giai đoạn'}
                >
                  <ChevronsUpDown className="w-3 h-3 text-subdued" />
                  <span className="text-xs font-medium">{areAllExpanded ? 'Thu gọn hết' : 'Mở rộng hết'}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Modal Body: Danh sách phân nhóm theo Giai đoạn */}
        <div className="p-4 overflow-y-auto flex-1 bg-surface-100 space-y-3.5">
          {totalMatchingItems === 0 ? (
            <div className="py-12 text-center text-xs text-subdued font-ui bg-surface rounded-vds-lg border border-line p-6 space-y-2">
              <p className="font-semibold text-ink-lighter">Không tìm thấy tiêu chuẩn nào phù hợp.</p>
              {searchKeyword && (
                <button
                  type="button"
                  onClick={() => setSearchKeyword('')}
                  className="text-accent font-semibold hover:underline cursor-pointer"
                >
                  Xóa bộ lọc tìm kiếm
                </button>
              )}
            </div>
          ) : (
            phasesToDisplay.map((phase) => {
              // Lấy tất cả items của phase này
              const allItemsInPhase = currentChecklist.filter((i) => i.phaseId === phase.id);

              // Lọc theo search và status
              const phaseMatchingItems = allItemsInPhase.filter((item) => {
                if (filterStatus !== 'all' && item.status !== filterStatus) return false;
                if (
                  searchKeyword.trim() &&
                  !item.text.toLowerCase().includes(searchKeyword.trim().toLowerCase())
                ) {
                  return false;
                }
                return true;
              });

              // Nếu đang có bộ lọc và giai đoạn này không có item nào khớp thì ẩn
              if (phaseMatchingItems.length === 0 && (filterStatus !== 'all' || searchKeyword.trim())) {
                return null;
              }

              const phaseCompleted = allItemsInPhase.filter((i) => i.status === 'completed').length;
              const phaseSkipped = allItemsInPhase.filter((i) => i.status === 'skipped').length;
              const isExpanded = expandedPhases[phase.id] ?? true;

              return (
                <div
                  key={phase.id}
                  className="bg-surface rounded-vds-lg border border-line overflow-hidden transition"
                >
                  {/* Header Giai đoạn */}
                  <div
                    onClick={() => togglePhaseExpand(phase.id)}
                    className="flex items-center justify-between px-3.5 py-2.5 bg-surface-100 hover:bg-surface-200 cursor-pointer transition-colors border-b border-divider select-none"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="font-title text-xs font-bold text-ink">
                        {phase.title}
                      </span>
                      <span
                        className={`text-[10px] font-ui font-semibold px-2 py-0.5 rounded-vds-md border ${phase.badgeColor}`}
                      >
                        {phaseCompleted}/{allItemsInPhase.length} hoàn thành
                        {phaseSkipped > 0 ? ` • ${phaseSkipped} bỏ qua` : ''}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-ink-lighter text-xs font-ui">
                      <span className="hidden sm:inline">{isExpanded ? 'Thu gọn' : 'Mở rộng'}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5 text-ink-lighter" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-ink-lighter" />
                      )}
                    </div>
                  </div>

                  {/* Danh sách tiêu chuẩn trong Giai đoạn */}
                  {isExpanded && (
                    <div className="divide-y divide-divider bg-surface">
                      {phaseMatchingItems.length === 0 ? (
                        <div className="p-3 text-center text-xs text-subdued italic font-ui">
                          Không có mục nào trong giai đoạn này khớp với bộ lọc.
                        </div>
                      ) : (
                        phaseMatchingItems.map((item) => {
                          const isCompleted = item.status === 'completed';
                          const isSkipped = item.status === 'skipped';

                          // Tính số thứ tự trong phase (1.1, 1.2, ...)
                          const itemIndexInPhase = allItemsInPhase.findIndex((i) => i.id === item.id);
                          const hierarchicalNumber = `${phase.id}.${itemIndexInPhase >= 0 ? itemIndexInPhase + 1 : 1}`;

                          return (
                            <div
                              key={item.id}
                              className={`p-3 flex items-start gap-2.5 transition-colors group ${
                                isCompleted
                                  ? 'bg-surface-100'
                                  : isSkipped
                                  ? 'bg-surface-100 opacity-65'
                                  : 'hover:bg-surface-100'
                              }`}
                            >
                              {/* Complete Checkbox */}
                              <button
                                type="button"
                                onClick={() => handleToggleComplete(item.id)}
                                title={isCompleted ? 'Hủy hoàn thành' : 'Đánh dấu hoàn thành'}
                                className={`mt-0.5 w-4 h-4 rounded-vds-md border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                                  isCompleted
                                    ? 'bg-positive-solid border-line-positive text-on-color'
                                    : 'border-line-regular bg-surface hover:border-line-positive'
                                }`}
                              >
                                {isCompleted && <Check className="w-3 h-3 stroke-[3]" />}
                              </button>

                              {/* Hierarchical Number Badge (1.1, 1.2...) */}
                              <span className="text-xs font-num font-semibold text-subdued bg-surface-200 px-1.5 py-0.5 rounded-vds-md shrink-0 mt-0.5 select-none">
                                {hierarchicalNumber}
                              </span>

                              {/* Text Content & Status Badges */}
                              <div className="flex-1 min-w-0 pr-1">
                                <div className="flex items-center gap-1.5 mb-1">
                                  {isCompleted && (
                                    <span className="text-[10px] font-ui font-semibold text-positive bg-surface-positive px-1.5 py-0.2 rounded">
                                      Đã xong
                                    </span>
                                  )}
                                  {isSkipped && (
                                    <span className="text-[10px] font-ui font-semibold text-ink-lighter bg-surface-200 px-1.5 py-0.2 rounded">
                                      Bỏ qua
                                    </span>
                                  )}
                                </div>
                                <p
                                  className={`text-xs font-ui leading-relaxed ${
                                    isCompleted
                                      ? 'text-positive font-medium'
                                      : isSkipped
                                      ? 'line-through text-subdued'
                                      : 'text-ink'
                                  }`}
                                >
                                  {item.text}
                                </p>
                              </div>

                              {/* Action buttons */}
                              <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                                {/* Skip button */}
                                <button
                                  type="button"
                                  onClick={() => handleToggleSkip(item.id)}
                                  title={isSkipped ? 'Bỏ gạch ngang (áp dụng lại)' : 'Bỏ qua (không áp dụng)'}
                                  className={`p-1.5 rounded-vds-md text-xs font-ui transition-colors cursor-pointer ${
                                    isSkipped
                                      ? 'bg-icon-strong text-on-color hover:bg-surface-dark'
                                      : 'text-subdued hover:text-negative hover:bg-surface-negative'
                                  }`}
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                </button>

                                {/* Use as task title button */}
                                {onSelectAsTaskTitle && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onSelectAsTaskTitle(item.text, item.phaseId);
                                      onClose();
                                    }}
                                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-vds-lg bg-surface-accent-faint hover:bg-surface-accent text-accent font-ui text-xs font-semibold border border-line transition-colors cursor-pointer "
                                    title="Điền mục này làm tiêu đề công việc"
                                  >
                                    <span>Dùng mục này</span>
                                    <ArrowRightCircle className="w-3.5 h-3.5" />
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
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-line bg-surface-100 flex items-center justify-between text-xs font-ui">
          <span className="text-ink-lighter">
            Bấm ESC hoặc nút Đóng để quay lại
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-surface hover:bg-surface-200 text-ink-lighter rounded-vds-lg border border-line font-semibold transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
