/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Filter, X, RotateCcw } from 'lucide-react';
import { FilterState, ProjectItem, MemberItem } from '../types';
import { TaskPersonalScope } from './PersonalizationBanner';

interface ActiveFiltersBarProps {
  filterState: FilterState;
  projects: ProjectItem[];
  taskPersonalScope?: TaskPersonalScope;
  activeProductMember?: MemberItem | null;
  onClearProject: () => void;
  onClearAssignee: () => void;
  onClearTeam: () => void;
  onClearStatus: () => void;
  onClearDue: () => void;
  onClearSearch: () => void;
  onClearPersonalScope?: () => void;
  onClearAll: () => void;
}

export const ActiveFiltersBar: React.FC<ActiveFiltersBarProps> = ({
  filterState,
  projects,
  taskPersonalScope,
  activeProductMember,
  onClearProject,
  onClearAssignee,
  onClearTeam,
  onClearStatus,
  onClearDue,
  onClearSearch,
  onClearPersonalScope,
  onClearAll,
}) => {
  const activeProject =
    filterState.projectId && filterState.projectId !== 'all'
      ? projects.find((p) => p.id === filterState.projectId)?.name || filterState.projectId
      : null;

  const activeAssignee =
    filterState.assignee && filterState.assignee !== 'Tất cả'
      ? filterState.assignee
      : activeProductMember
      ? activeProductMember.name
      : null;

  const activeTeam = filterState.team && filterState.team !== 'Tất cả' ? filterState.team : null;
  const activeStatus = filterState.status && filterState.status !== 'Tất cả' ? filterState.status : null;

  const activeDueLabel =
    filterState.dueFilter === 'today'
      ? 'Hôm nay'
      : filterState.dueFilter === 'overdue'
      ? 'Quá hạn'
      : filterState.dueFilter === 'soon'
      ? 'Sắp đến hạn'
      : null;

  const activeSearch = filterState.searchQuery?.trim() ? filterState.searchQuery.trim() : null;
  const isMyProjectsScope = taskPersonalScope === 'my_projects_tasks';

  const hasAnyFilter = Boolean(
    activeProject ||
      activeAssignee ||
      activeTeam ||
      activeStatus ||
      activeDueLabel ||
      activeSearch ||
      isMyProjectsScope
  );

  if (!hasAnyFilter) {
    return null;
  }

  return (
    <div className="bg-[#fafafa] border-b border-[#e5e7eb] px-4 md:px-6 py-2 transition-all">
      <div className="max-w-[800px] w-full mx-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-ui font-semibold text-[#64748b] flex items-center gap-1 shrink-0 mr-1">
            <Filter className="w-3 h-3 text-[#64748b]" />
            <span>Đang lọc:</span>
          </span>

          {/* Dự án */}
          {activeProject && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-white text-[11px] font-ui text-[#334155] border border-[#cbd5e1] shadow-2xs">
              <span className="text-[#64748b]">Dự án:</span>
              <span className="font-semibold text-[#1e293b]">{activeProject.replace('Dự án ', '')}</span>
              <button
                type="button"
                onClick={onClearProject}
                className="text-[#94a3b8] hover:text-[#dc2626] ml-0.5 cursor-pointer"
                title="Bỏ lọc theo dự án này"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {/* Nhân sự */}
          {activeAssignee && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-white text-[11px] font-ui text-[#334155] border border-[#cbd5e1] shadow-2xs">
              <span className="text-[#64748b]">Nhân sự:</span>
              <span className="font-semibold text-[#1e293b]">{activeAssignee}</span>
              <button
                type="button"
                onClick={onClearAssignee}
                className="text-[#94a3b8] hover:text-[#dc2626] ml-0.5 cursor-pointer"
                title="Bỏ lọc theo nhân sự này"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {/* Nhóm */}
          {activeTeam && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-white text-[11px] font-ui text-[#334155] border border-[#cbd5e1] shadow-2xs">
              <span className="text-[#64748b]">Nhóm:</span>
              <span className="font-semibold text-[#1e293b]">{activeTeam}</span>
              <button
                type="button"
                onClick={onClearTeam}
                className="text-[#94a3b8] hover:text-[#dc2626] ml-0.5 cursor-pointer"
                title="Bỏ lọc theo nhóm này"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {/* Trạng thái */}
          {activeStatus && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-white text-[11px] font-ui text-[#334155] border border-[#cbd5e1] shadow-2xs">
              <span className="text-[#64748b]">Trạng thái:</span>
              <span className="font-semibold text-[#1e293b]">{activeStatus}</span>
              <button
                type="button"
                onClick={onClearStatus}
                className="text-[#94a3b8] hover:text-[#dc2626] ml-0.5 cursor-pointer"
                title="Bỏ lọc theo trạng thái này"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {/* Thời hạn */}
          {activeDueLabel && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-white text-[11px] font-ui text-[#334155] border border-[#cbd5e1] shadow-2xs">
              <span className="text-[#64748b]">Thời hạn:</span>
              <span className="font-semibold text-[#1e293b]">{activeDueLabel}</span>
              <button
                type="button"
                onClick={onClearDue}
                className="text-[#94a3b8] hover:text-[#dc2626] ml-0.5 cursor-pointer"
                title="Bỏ lọc theo thời hạn này"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {/* Tìm kiếm */}
          {activeSearch && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-white text-[11px] font-ui text-[#334155] border border-[#cbd5e1] shadow-2xs">
              <span className="text-[#64748b]">Từ khóa:</span>
              <span className="font-semibold text-[#1e293b]">"{activeSearch}"</span>
              <button
                type="button"
                onClick={onClearSearch}
                className="text-[#94a3b8] hover:text-[#dc2626] ml-0.5 cursor-pointer"
                title="Bỏ lọc tìm kiếm này"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {/* Dự án của tôi */}
          {isMyProjectsScope && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-white text-[11px] font-ui text-[#334155] border border-[#cbd5e1] shadow-2xs">
              <span className="font-semibold text-[#1e293b]">Dự án của tôi</span>
              <button
                type="button"
                onClick={onClearPersonalScope}
                className="text-[#94a3b8] hover:text-[#dc2626] ml-0.5 cursor-pointer"
                title="Quay về tất cả công việc"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>

        {/* Nút Xóa tất cả bộ lọc */}
        <button
          type="button"
          onClick={onClearAll}
          className="text-[11px] font-ui font-medium text-[#64748b] hover:text-[#dc2626] transition-colors cursor-pointer flex items-center gap-1 shrink-0 hover:underline"
          title="Đặt lại toàn bộ các điều kiện lọc về mặc định"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Xóa bộ lọc</span>
        </button>
      </div>
    </div>
  );
};
