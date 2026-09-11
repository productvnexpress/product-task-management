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
} from 'lucide-react';
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
        className="bg-white w-full max-w-3xl rounded-[12px] shadow-2xl border border-[#d0d0d0] flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-[#e5e5e5] bg-[#fafafa] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#fcf0f5] border border-[#f3c2d4] text-[#b13460] flex items-center justify-center font-bold shrink-0">
              <ListChecks className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-title text-base font-bold text-[#202020]">
                  Checklist dự án: {project.name.replace(/^Dự án\s+/i, '')}
                </h3>
                <span className="text-[10px] font-num font-bold px-1.5 py-0.5 rounded bg-[#f0f0f0] text-[#505050] border border-[#d8d8d8]">
                  {project.code}
                </span>
              </div>
              <p className="text-xs text-[#707070] font-ui mt-0.5">
                Bấm "Dùng mục này" để điền tiêu đề công việc hoặc đánh dấu tiến độ tuân thủ
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#707070] hover:text-[#202020] hover:bg-[#e8e8e8] rounded-[6px] transition-colors cursor-pointer"
            title="Đóng cửa sổ"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Subheader: Tiến độ & Bộ lọc */}
        <div className="px-5 py-3 border-b border-[#e8e8e8] bg-white space-y-3">
          {/* Hàng tiến độ tuân thủ */}
          <div className="flex items-center justify-between text-xs font-ui">
            <span className="text-[#505050] font-medium">Tiến độ tuân thủ tiêu chuẩn:</span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#b13460]">{stats.percent}%</span>
              <span className="text-[11px] text-[#707070]">
                ({stats.completed}/{stats.total - stats.skipped} hoàn thành
                {stats.skipped > 0 ? `, ${stats.skipped} bỏ qua` : ''})
              </span>
            </div>
          </div>

          {/* Thanh tiến độ đa màu */}
          <div className="h-1.5 w-full bg-[#f0f0f0] rounded-full overflow-hidden flex">
            <div
              className="h-full bg-[#24a148] transition-all duration-300"
              style={{ width: `${(stats.completed / Math.max(1, stats.total)) * 100}%` }}
              title={`Hoàn thành: ${stats.completed}`}
            />
            <div
              className="h-full bg-[#a0a0a0] transition-all duration-300"
              style={{ width: `${(stats.skipped / Math.max(1, stats.total)) * 100}%` }}
              title={`Bỏ qua: ${stats.skipped}`}
            />
          </div>

          {/* Tabs Giai đoạn */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-ui scrollbar-none">
            <button
              type="button"
              onClick={() => handleSelectPhaseTab('all')}
              className={`px-2.5 py-1 rounded-[6px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                activePhaseTab === 'all'
                  ? 'bg-[#b13460] text-white shadow-2xs'
                  : 'bg-[#f4f4f4] text-[#505050] hover:bg-[#eaeaea]'
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
                  className={`px-2.5 py-1 rounded-[6px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    activePhaseTab === p.id
                      ? 'bg-[#b13460] text-white shadow-2xs'
                      : 'bg-[#f4f4f4] text-[#505050] hover:bg-[#eaeaea]'
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
              <Search className="w-3.5 h-3.5 text-[#808080] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="Tìm tiêu chuẩn (SEO, Tracking, Figma...)"
                className="w-full pl-8 pr-7 py-1 text-xs font-ui bg-[#f9f9f9] border border-[#d8d8d8] rounded-[6px] focus:outline-hidden focus:border-[#b13460] focus:bg-white text-[#202020] placeholder-[#888888] transition-colors"
              />
              {searchKeyword && (
                <button
                  type="button"
                  onClick={() => setSearchKeyword('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#888] hover:text-[#202020] cursor-pointer"
                  title="Xóa tìm kiếm"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs font-ui">
              {/* Lọc trạng thái */}
              <div className="flex items-center gap-1 bg-[#f5f5f5] p-0.5 rounded-[6px] border border-[#e0e0e0]">
                <button
                  type="button"
                  onClick={() => setFilterStatus('all')}
                  className={`px-2 py-0.5 rounded-[4px] font-medium transition-colors cursor-pointer ${
                    filterStatus === 'all'
                      ? 'bg-white text-[#202020] font-semibold shadow-2xs'
                      : 'text-[#666666] hover:text-[#202020]'
                  }`}
                >
                  Tất cả
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('pending')}
                  className={`px-2 py-0.5 rounded-[4px] font-medium transition-colors cursor-pointer ${
                    filterStatus === 'pending'
                      ? 'bg-white text-[#8f6b00] font-semibold shadow-2xs'
                      : 'text-[#666666] hover:text-[#202020]'
                  }`}
                >
                  Chưa xong
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('completed')}
                  className={`px-2 py-0.5 rounded-[4px] font-medium transition-colors cursor-pointer ${
                    filterStatus === 'completed'
                      ? 'bg-white text-[#24a148] font-semibold shadow-2xs'
                      : 'text-[#666666] hover:text-[#202020]'
                  }`}
                >
                  Đã xong
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('skipped')}
                  className={`px-2 py-0.5 rounded-[4px] font-medium transition-colors cursor-pointer ${
                    filterStatus === 'skipped'
                      ? 'bg-white text-[#505050] font-semibold shadow-2xs'
                      : 'text-[#666666] hover:text-[#202020]'
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
                  className="flex items-center gap-1 px-2 py-1 text-[#606060] hover:text-[#202020] hover:bg-[#f0f0f0] rounded-[6px] transition-colors cursor-pointer border border-[#e0e0e0] bg-white"
                  title={areAllExpanded ? 'Thu gọn tất cả giai đoạn' : 'Mở rộng tất cả giai đoạn'}
                >
                  <ChevronsUpDown className="w-3 h-3 text-[#808080]" />
                  <span className="text-[11px] font-medium">{areAllExpanded ? 'Thu gọn hết' : 'Mở rộng hết'}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Modal Body: Danh sách phân nhóm theo Giai đoạn */}
        <div className="p-4 overflow-y-auto flex-1 bg-[#fcfcfc] space-y-3.5">
          {totalMatchingItems === 0 ? (
            <div className="py-12 text-center text-xs text-[#808080] font-ui bg-white rounded-[10px] border border-[#e8e8e8] p-6 space-y-2">
              <p className="font-semibold text-[#505050]">Không tìm thấy tiêu chuẩn nào phù hợp.</p>
              {searchKeyword && (
                <button
                  type="button"
                  onClick={() => setSearchKeyword('')}
                  className="text-[#b13460] font-semibold hover:underline cursor-pointer"
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
                  className="bg-white rounded-[10px] border border-[#e2e2e2] overflow-hidden shadow-2xs transition-all"
                >
                  {/* Header Giai đoạn */}
                  <div
                    onClick={() => togglePhaseExpand(phase.id)}
                    className="flex items-center justify-between px-3.5 py-2.5 bg-[#fafafa] hover:bg-[#f4f4f4] cursor-pointer transition-colors border-b border-[#ececec] select-none"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="font-title text-xs font-bold text-[#202020]">
                        {phase.title}
                      </span>
                      <span
                        className={`text-[10px] font-ui font-semibold px-2 py-0.5 rounded-[4px] border ${phase.badgeColor}`}
                      >
                        {phaseCompleted}/{allItemsInPhase.length} hoàn thành
                        {phaseSkipped > 0 ? ` • ${phaseSkipped} bỏ qua` : ''}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[#707070] text-[11px] font-ui">
                      <span className="hidden sm:inline">{isExpanded ? 'Thu gọn' : 'Mở rộng'}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5 text-[#707070]" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-[#707070]" />
                      )}
                    </div>
                  </div>

                  {/* Danh sách tiêu chuẩn trong Giai đoạn */}
                  {isExpanded && (
                    <div className="divide-y divide-[#f2f2f2] bg-white">
                      {phaseMatchingItems.length === 0 ? (
                        <div className="p-3 text-center text-xs text-[#808080] italic font-ui">
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
                                  ? 'bg-[#f8fdf9]'
                                  : isSkipped
                                  ? 'bg-[#fcfcfc] opacity-65'
                                  : 'hover:bg-[#fafafa]'
                              }`}
                            >
                              {/* Complete Checkbox */}
                              <button
                                type="button"
                                onClick={() => handleToggleComplete(item.id)}
                                title={isCompleted ? 'Hủy hoàn thành' : 'Đánh dấu hoàn thành'}
                                className={`mt-0.5 w-4 h-4 rounded-[4px] border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                                  isCompleted
                                    ? 'bg-[#24a148] border-[#24a148] text-white'
                                    : 'border-[#b5b5b5] bg-white hover:border-[#24a148]'
                                }`}
                              >
                                {isCompleted && <Check className="w-3 h-3 stroke-[3]" />}
                              </button>

                              {/* Hierarchical Number Badge (1.1, 1.2...) */}
                              <span className="text-[11px] font-num font-semibold text-[#808080] bg-[#f2f2f2] px-1.5 py-0.5 rounded-[4px] shrink-0 mt-0.5 select-none">
                                {hierarchicalNumber}
                              </span>

                              {/* Text Content & Status Badges */}
                              <div className="flex-1 min-w-0 pr-1">
                                <div className="flex items-center gap-1.5 mb-1">
                                  {isCompleted && (
                                    <span className="text-[10px] font-ui font-semibold text-[#24a148] bg-[#e2f6e9] px-1.5 py-0.2 rounded">
                                      Đã xong
                                    </span>
                                  )}
                                  {isSkipped && (
                                    <span className="text-[10px] font-ui font-semibold text-[#606060] bg-[#f0f0f0] px-1.5 py-0.2 rounded">
                                      Bỏ qua
                                    </span>
                                  )}
                                </div>
                                <p
                                  className={`text-xs font-ui leading-relaxed ${
                                    isCompleted
                                      ? 'text-[#1e5a2b] font-medium'
                                      : isSkipped
                                      ? 'line-through text-[#808080]'
                                      : 'text-[#202020]'
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
                                  className={`p-1.5 rounded-[4px] text-xs font-ui transition-colors cursor-pointer ${
                                    isSkipped
                                      ? 'bg-[#505050] text-white hover:bg-[#303030]'
                                      : 'text-[#808080] hover:text-[#da1e28] hover:bg-[#fff0f1]'
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
                                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-[6px] bg-[#fcf0f5] hover:bg-[#fae6ef] text-[#b13460] font-ui text-xs font-semibold border border-[#f3c2d4] transition-colors cursor-pointer shadow-2xs"
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
        <div className="px-5 py-3 border-t border-[#e5e5e5] bg-[#fafafa] flex items-center justify-between text-xs font-ui">
          <span className="text-[#707070]">
            Bấm ESC hoặc nút Đóng để quay lại
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white hover:bg-[#f0f0f0] text-[#404040] rounded-[6px] border border-[#d0d0d0] font-semibold transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
