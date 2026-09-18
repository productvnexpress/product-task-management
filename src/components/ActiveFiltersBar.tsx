import React, { useState, useRef, useEffect } from 'react';
import { Filter, X, RotateCcw, Plus, ChevronRight, Check } from 'lucide-react';
import { FilterState, ProjectItem, MemberItem, TaskStatus, TeamType, DueFilterType } from '../types';
import { TaskPersonalScope } from './PersonalizationBanner';

interface ActiveFiltersBarProps {
  filterState: FilterState;
  projects: ProjectItem[];
  members?: MemberItem[];
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
  onSelectProject?: (projId: string) => void;
  onSelectAssignee?: (assignee: string) => void;
  onSelectStatus?: (status: TaskStatus) => void;
  onSelectDue?: (due: DueFilterType) => void;
  onSelectTeam?: (team: TeamType) => void;
}

export const ActiveFiltersBar: React.FC<ActiveFiltersBarProps> = ({
  filterState,
  projects,
  members = [],
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
  onSelectProject,
  onSelectAssignee,
  onSelectStatus,
  onSelectDue,
  onSelectTeam,
}) => {
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'project' | 'status' | 'due' | 'team' | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsAddMenuOpen(false);
        setActiveCategory(null);
      }
    };
    if (isAddMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isAddMenuOpen]);

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

  const statuses: TaskStatus[] = ['Chưa làm', 'Đang làm', 'Bị nghẽn', 'Hoàn thành'];
  const dueOptions: { key: DueFilterType; label: string }[] = [
    { key: 'today', label: 'Hôm nay' },
    { key: 'overdue', label: 'Quá hạn' },
    { key: 'soon', label: 'Sắp đến hạn' },
  ];
  const teams: TeamType[] = ['Product Manager', 'UX/UI Designer', 'SEO', 'Data'];

  return (
    <div className="bg-[#fafafa] border-b border-[#e5e7eb] px-4 md:px-6 py-2 transition-all sticky top-[83px] z-10 shadow-2xs select-none">
      <div className="max-w-[1040px] w-full mx-auto flex flex-wrap items-center justify-between gap-2">
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
                className="p-0.5 rounded-[3px] text-[#94a3b8] hover:text-[#dc2626] hover:bg-[#fee2e2] cursor-pointer transition-colors ml-0.5"
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
                className="p-0.5 rounded-[3px] text-[#94a3b8] hover:text-[#dc2626] hover:bg-[#fee2e2] cursor-pointer transition-colors ml-0.5"
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
                className="p-0.5 rounded-[3px] text-[#94a3b8] hover:text-[#dc2626] hover:bg-[#fee2e2] cursor-pointer transition-colors ml-0.5"
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
                className="p-0.5 rounded-[3px] text-[#94a3b8] hover:text-[#dc2626] hover:bg-[#fee2e2] cursor-pointer transition-colors ml-0.5"
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
                className="p-0.5 rounded-[3px] text-[#94a3b8] hover:text-[#dc2626] hover:bg-[#fee2e2] cursor-pointer transition-colors ml-0.5"
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
                className="p-0.5 rounded-[3px] text-[#94a3b8] hover:text-[#dc2626] hover:bg-[#fee2e2] cursor-pointer transition-colors ml-0.5"
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
                className="p-0.5 rounded-[3px] text-[#94a3b8] hover:text-[#dc2626] hover:bg-[#fee2e2] cursor-pointer transition-colors ml-0.5"
                title="Quay về tất cả công việc"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {/* Nút Thêm lọc nhanh */}
          {(onSelectProject || onSelectStatus || onSelectDue || onSelectTeam) && (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => {
                  setIsAddMenuOpen(!isAddMenuOpen);
                  setActiveCategory(null);
                }}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-white text-[11px] font-ui text-[#64748b] hover:text-[#1e293b] hover:border-[#94a3b8] border border-dashed border-[#cbd5e1] cursor-pointer transition-colors shadow-2xs"
                title="Thêm điều kiện lọc"
              >
                <Plus className="w-3 h-3" />
                <span>Thêm lọc</span>
              </button>

              {/* Popover Menu Thêm lọc */}
              {isAddMenuOpen && (
                <div className="absolute left-0 top-full mt-1 w-44 bg-white rounded-[8px] border border-[#e2e8f0] shadow-lg py-1 z-50 animate-fade-in font-ui text-xs">
                  {!activeCategory ? (
                    <div className="space-y-0.5">
                      {onSelectProject && !activeProject && (
                        <button
                          type="button"
                          onClick={() => setActiveCategory('project')}
                          className="w-full px-3 py-1.5 text-left text-[#334155] hover:bg-[#f1f5f9] flex items-center justify-between cursor-pointer"
                        >
                          <span>Dự án</span>
                          <ChevronRight className="w-3 h-3 text-[#94a3b8]" />
                        </button>
                      )}
                      {onSelectStatus && !activeStatus && (
                        <button
                          type="button"
                          onClick={() => setActiveCategory('status')}
                          className="w-full px-3 py-1.5 text-left text-[#334155] hover:bg-[#f1f5f9] flex items-center justify-between cursor-pointer"
                        >
                          <span>Trạng thái</span>
                          <ChevronRight className="w-3 h-3 text-[#94a3b8]" />
                        </button>
                      )}
                      {onSelectDue && !activeDueLabel && (
                        <button
                          type="button"
                          onClick={() => setActiveCategory('due')}
                          className="w-full px-3 py-1.5 text-left text-[#334155] hover:bg-[#f1f5f9] flex items-center justify-between cursor-pointer"
                        >
                          <span>Thời hạn</span>
                          <ChevronRight className="w-3 h-3 text-[#94a3b8]" />
                        </button>
                      )}
                      {onSelectTeam && !activeTeam && (
                        <button
                          type="button"
                          onClick={() => setActiveCategory('team')}
                          className="w-full px-3 py-1.5 text-left text-[#334155] hover:bg-[#f1f5f9] flex items-center justify-between cursor-pointer"
                        >
                          <span>Nhóm</span>
                          <ChevronRight className="w-3 h-3 text-[#94a3b8]" />
                        </button>
                      )}
                    </div>
                  ) : activeCategory === 'project' ? (
                    <div className="max-h-60 overflow-y-auto space-y-0.5">
                      <button
                        type="button"
                        onClick={() => setActiveCategory(null)}
                        className="w-full px-3 py-1 text-left text-[10px] text-[#64748b] hover:text-[#1e293b] font-semibold border-b border-[#f1f5f9] cursor-pointer"
                      >
                        ← Quay lại
                      </button>
                      {projects.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            onSelectProject?.(p.id);
                            setIsAddMenuOpen(false);
                            setActiveCategory(null);
                          }}
                          className="w-full px-3 py-1.5 text-left text-[#334155] hover:bg-[#f1f5f9] truncate cursor-pointer block"
                        >
                          {p.name.replace('Dự án ', '')}
                        </button>
                      ))}
                    </div>
                  ) : activeCategory === 'status' ? (
                    <div className="space-y-0.5">
                      <button
                        type="button"
                        onClick={() => setActiveCategory(null)}
                        className="w-full px-3 py-1 text-left text-[10px] text-[#64748b] hover:text-[#1e293b] font-semibold border-b border-[#f1f5f9] cursor-pointer"
                      >
                        ← Quay lại
                      </button>
                      {statuses.map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => {
                            onSelectStatus?.(st);
                            setIsAddMenuOpen(false);
                            setActiveCategory(null);
                          }}
                          className="w-full px-3 py-1.5 text-left text-[#334155] hover:bg-[#f1f5f9] cursor-pointer block"
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  ) : activeCategory === 'due' ? (
                    <div className="space-y-0.5">
                      <button
                        type="button"
                        onClick={() => setActiveCategory(null)}
                        className="w-full px-3 py-1 text-left text-[10px] text-[#64748b] hover:text-[#1e293b] font-semibold border-b border-[#f1f5f9] cursor-pointer"
                      >
                        ← Quay lại
                      </button>
                      {dueOptions.map((opt) => (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => {
                            onSelectDue?.(opt.key);
                            setIsAddMenuOpen(false);
                            setActiveCategory(null);
                          }}
                          className="w-full px-3 py-1.5 text-left text-[#334155] hover:bg-[#f1f5f9] cursor-pointer block"
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  ) : activeCategory === 'team' ? (
                    <div className="space-y-0.5">
                      <button
                        type="button"
                        onClick={() => setActiveCategory(null)}
                        className="w-full px-3 py-1 text-left text-[10px] text-[#64748b] hover:text-[#1e293b] font-semibold border-b border-[#f1f5f9] cursor-pointer"
                      >
                        ← Quay lại
                      </button>
                      {teams.map((tm) => (
                        <button
                          key={tm}
                          type="button"
                          onClick={() => {
                            onSelectTeam?.(tm);
                            setIsAddMenuOpen(false);
                            setActiveCategory(null);
                          }}
                          className="w-full px-3 py-1.5 text-left text-[#334155] hover:bg-[#f1f5f9] cursor-pointer block"
                        >
                          {tm}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Nút Xóa tất cả bộ lọc */}
        <button
          type="button"
          onClick={onClearAll}
          className="text-[11px] font-ui font-medium text-[#64748b] hover:text-[#dc2626] hover:bg-[#fee2e2]/60 px-2.5 py-1 rounded-[4px] transition-colors cursor-pointer flex items-center gap-1 shrink-0"
          title="Đặt lại toàn bộ các điều kiện lọc về mặc định"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Xóa bộ lọc</span>
        </button>
      </div>
    </div>
  );
};

