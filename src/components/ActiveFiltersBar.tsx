import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Filter, X, RotateCcw, Plus, ChevronRight, Check } from './vds/icons';
import { FilterState, ProjectItem, MemberItem, TaskStatus, TeamType, DueFilterType, FolderItem } from '../types';
import { getFolderPath, INITIAL_FOLDERS } from '../utils/folderUtils';
import { TaskPersonalScope } from './PersonalizationBanner';
import { isSamePersonName } from '../utils/memberPersonalization';
import { getUserRole } from '../utils/rbac';

interface ActiveFiltersBarProps {
  filterState: FilterState;
  projects: ProjectItem[];
  folders?: FolderItem[];
  members?: MemberItem[];
  taskPersonalScope?: TaskPersonalScope;
  activeProductMember?: MemberItem | null;
  currentAuthUser?: MemberItem | null;
  onClearProject: () => void;
  onClearFolder?: () => void;
  onClearAssignee: () => void;
  onClearTeam: () => void;
  onClearStatus: () => void;
  onClearDue: () => void;
  onClearSearch: () => void;
  onClearPersonalScope?: () => void;
  onClearAll: () => void;
  onSelectProject?: (projId: string) => void;
  onSelectFolder?: (folderId: string) => void;
  onSelectAssignee?: (assignee: string) => void;
  onSelectStatus?: (status: TaskStatus) => void;
  onSelectDue?: (due: DueFilterType) => void;
  onSelectTeam?: (team: TeamType) => void;
}

export const ActiveFiltersBar: React.FC<ActiveFiltersBarProps> = ({
  filterState,
  projects,
  folders = INITIAL_FOLDERS,
  members = [],
  taskPersonalScope,
  activeProductMember,
  currentAuthUser,
  onClearProject,
  onClearFolder,
  onClearAssignee,
  onClearTeam,
  onClearStatus,
  onClearDue,
  onClearSearch,
  onClearPersonalScope,
  onClearAll,
  onSelectProject,
  onSelectFolder,
  onSelectAssignee,
  onSelectStatus,
  onSelectDue,
  onSelectTeam,
}) => {
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [hoveredCategory, setHoveredCategory] = useState<'project' | 'status' | 'due' | 'team' | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsAddMenuOpen(false);
        setHoveredCategory(null);
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

  const activeFolder =
    filterState.folderId && filterState.folderId !== 'all'
      ? getFolderPath(filterState.folderId, folders) || filterState.folderId
      : null;

  // Xác định người dùng có đang xem danh sách của chính mình trong chế độ "Của tôi"
  const isViewingSelfTasks = Boolean(
    currentAuthUser &&
      taskPersonalScope === 'my_tasks' &&
      ((activeProductMember && activeProductMember.id === currentAuthUser.id) ||
        (!activeProductMember && filterState.assignee && isSamePersonName(filterState.assignee, currentAuthUser.name)))
  );

  const activeAssignee = useMemo(() => {
    // 1. Nếu có lọc theo assignee cụ thể
    if (filterState.assignee && filterState.assignee !== 'Tất cả') {
      // Nếu đang ở góc nhìn "Của tôi" và assignee là chính tài khoản đăng nhập -> không coi là filter bổ sung
      if (isViewingSelfTasks && currentAuthUser && isSamePersonName(filterState.assignee, currentAuthUser.name)) {
        return null;
      }
      return filterState.assignee;
    }
    // 2. Nếu đang chọn xem một đồng nghiệp khác (khác với tài khoản đang đăng nhập)
    if (activeProductMember && currentAuthUser && activeProductMember.id !== currentAuthUser.id) {
      return activeProductMember.name;
    }
    return null;
  }, [filterState.assignee, activeProductMember, currentAuthUser, isViewingSelfTasks]);

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

  // Chỉ coi "Dự án của tôi" là filter nếu tài khoản hiện tại không phải là Manager (vì với Manager đây là góc nhìn mặc định)
  const isMyProjectsScope =
    taskPersonalScope === 'my_projects_tasks' &&
    (!currentAuthUser || getUserRole(currentAuthUser) !== 'Manager');

  const hasAnyFilter = Boolean(
    activeProject ||
      activeFolder ||
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
    <div className="bg-surface-100 border-b border-line px-4 md:px-6 py-2 transition sticky top-[83px] z-10 select-none">
      <div className="max-w-[1040px] w-full mx-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-ui font-semibold text-subdued flex items-center gap-1 shrink-0 mr-1">
            <Filter className="w-3 h-3 text-subdued" />
            <span>Đang lọc:</span>
          </span>

          {/* Thư mục */}
          {activeFolder && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-vds-md bg-surface-accent-faint text-xs font-ui text-accent border border-line ">
              <span className="text-accent/70">Thư mục:</span>
              <span className="font-semibold text-accent">📁 {activeFolder}</span>
              <button
                type="button"
                onClick={onClearFolder}
                className="p-0.5 rounded-vds-md text-accent/70 hover:text-negative hover:bg-surface-negative cursor-pointer transition-colors ml-0.5"
                title="Bỏ lọc theo thư mục này"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {/* Dự án */}
          {activeProject && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-vds-md bg-surface text-xs font-ui text-ink-lighter border border-line ">
              <span className="text-subdued">Dự án:</span>
              <span className="font-semibold text-ink">{activeProject.replace('Dự án ', '')}</span>
              <button
                type="button"
                onClick={onClearProject}
                className="p-0.5 rounded-vds-md text-subdued-lighter hover:text-negative hover:bg-surface-negative cursor-pointer transition-colors ml-0.5"
                title="Bỏ lọc theo dự án này"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {/* Nhân sự */}
          {activeAssignee && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-vds-md bg-surface text-xs font-ui text-ink-lighter border border-line ">
              <span className="text-subdued">Nhân sự:</span>
              <span className="font-semibold text-ink">{activeAssignee}</span>
              <button
                type="button"
                onClick={onClearAssignee}
                className="p-0.5 rounded-vds-md text-subdued-lighter hover:text-negative hover:bg-surface-negative cursor-pointer transition-colors ml-0.5"
                title="Bỏ lọc theo nhân sự này"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {/* Nhóm */}
          {activeTeam && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-vds-md bg-surface text-xs font-ui text-ink-lighter border border-line ">
              <span className="text-subdued">Nhóm:</span>
              <span className="font-semibold text-ink">{activeTeam}</span>
              <button
                type="button"
                onClick={onClearTeam}
                className="p-0.5 rounded-vds-md text-subdued-lighter hover:text-negative hover:bg-surface-negative cursor-pointer transition-colors ml-0.5"
                title="Bỏ lọc theo nhóm này"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {/* Trạng thái */}
          {activeStatus && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-vds-md bg-surface text-xs font-ui text-ink-lighter border border-line ">
              <span className="text-subdued">Trạng thái:</span>
              <span className="font-semibold text-ink">{activeStatus}</span>
              <button
                type="button"
                onClick={onClearStatus}
                className="p-0.5 rounded-vds-md text-subdued-lighter hover:text-negative hover:bg-surface-negative cursor-pointer transition-colors ml-0.5"
                title="Bỏ lọc theo trạng thái này"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {/* Thời hạn */}
          {activeDueLabel && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-vds-md bg-surface text-xs font-ui text-ink-lighter border border-line ">
              <span className="text-subdued">Thời hạn:</span>
              <span className="font-semibold text-ink">{activeDueLabel}</span>
              <button
                type="button"
                onClick={onClearDue}
                className="p-0.5 rounded-vds-md text-subdued-lighter hover:text-negative hover:bg-surface-negative cursor-pointer transition-colors ml-0.5"
                title="Bỏ lọc theo thời hạn này"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {/* Tìm kiếm */}
          {activeSearch && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-vds-md bg-surface text-xs font-ui text-ink-lighter border border-line ">
              <span className="text-subdued">Từ khóa:</span>
              <span className="font-semibold text-ink">"{activeSearch}"</span>
              <button
                type="button"
                onClick={onClearSearch}
                className="p-0.5 rounded-vds-md text-subdued-lighter hover:text-negative hover:bg-surface-negative cursor-pointer transition-colors ml-0.5"
                title="Bỏ lọc tìm kiếm này"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {/* Dự án của tôi */}
          {isMyProjectsScope && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-vds-md bg-surface text-xs font-ui text-ink-lighter border border-line ">
              <span className="font-semibold text-ink">Dự án của tôi</span>
              <button
                type="button"
                onClick={onClearPersonalScope}
                className="p-0.5 rounded-vds-md text-subdued-lighter hover:text-negative hover:bg-surface-negative cursor-pointer transition-colors ml-0.5"
                title="Quay về tất cả công việc"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {/* Nút Thêm lọc nhanh với Submenu cấp 2 mở sang phải khi hover */}
          {(onSelectProject || onSelectStatus || onSelectDue || onSelectTeam) && (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => {
                  setIsAddMenuOpen(!isAddMenuOpen);
                  setHoveredCategory(null);
                }}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-vds-md bg-surface text-xs font-ui text-subdued hover:text-ink hover:border-line-regular border border-dashed border-line cursor-pointer transition-colors "
                title="Thêm điều kiện lọc"
              >
                <Plus className="w-3 h-3" />
                <span>Thêm lọc</span>
              </button>

              {/* Popover Menu Thêm lọc */}
              {isAddMenuOpen && (
                <div
                  className="absolute left-0 top-full mt-1 w-44 bg-surface rounded-vds-lg border border-line shadow-pop py-1 z-50 animate-fade-in font-ui text-xs"
                  onMouseLeave={() => setHoveredCategory(null)}
                >
                  {/* 1. Dự án */}
                  {onSelectProject && (
                    <div
                      className="relative"
                      onMouseEnter={() => setHoveredCategory('project')}
                    >
                      <button
                        type="button"
                        className={`w-full px-3 py-1.5 text-left flex items-center justify-between cursor-pointer transition-colors ${
                          hoveredCategory === 'project'
                            ? 'bg-surface-200 text-ink font-medium'
                            : 'text-ink-lighter hover:bg-surface-100'
                        }`}
                      >
                        <span>Dự án</span>
                        <ChevronRight className="w-3 h-3 text-subdued-lighter" />
                      </button>

                      {/* Submenu cấp 2 bên phải cho Dự án */}
                      {hoveredCategory === 'project' && (
                        <div
                          className="absolute left-full top-0 -ml-0.5 pl-1.5 z-50"
                          onMouseEnter={() => setHoveredCategory('project')}
                        >
                          <div className="w-60 max-h-72 overflow-y-auto bg-surface rounded-vds-lg border border-line shadow-sheet py-1">
                            {projects.map((p) => {
                              const isSelected = filterState.projectId === p.id;
                              return (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => {
                                    onSelectProject?.(p.id);
                                    setIsAddMenuOpen(false);
                                    setHoveredCategory(null);
                                  }}
                                  className={`w-full px-3 py-1.5 text-left text-xs truncate cursor-pointer flex items-center justify-between transition-colors ${
                                    isSelected
                                      ? 'bg-surface-accent-faint text-accent font-semibold'
                                      : 'text-ink-lighter hover:bg-surface-200 hover:text-ink'
                                  }`}
                                >
                                  <span className="truncate">{p.name.replace('Dự án ', '')}</span>
                                  {isSelected && <Check className="w-3.5 h-3.5 text-accent shrink-0 ml-1" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 2. Trạng thái */}
                  {onSelectStatus && (
                    <div
                      className="relative"
                      onMouseEnter={() => setHoveredCategory('status')}
                    >
                      <button
                        type="button"
                        className={`w-full px-3 py-1.5 text-left flex items-center justify-between cursor-pointer transition-colors ${
                          hoveredCategory === 'status'
                            ? 'bg-surface-200 text-ink font-medium'
                            : 'text-ink-lighter hover:bg-surface-100'
                        }`}
                      >
                        <span>Trạng thái</span>
                        <ChevronRight className="w-3 h-3 text-subdued-lighter" />
                      </button>

                      {/* Submenu cấp 2 bên phải cho Trạng thái */}
                      {hoveredCategory === 'status' && (
                        <div
                          className="absolute left-full top-0 -ml-0.5 pl-1.5 z-50"
                          onMouseEnter={() => setHoveredCategory('status')}
                        >
                          <div className="w-48 bg-surface rounded-vds-lg border border-line shadow-sheet py-1">
                            {statuses.map((st) => {
                              const isSelected = filterState.status === st;
                              return (
                                <button
                                  key={st}
                                  type="button"
                                  onClick={() => {
                                    onSelectStatus?.(st);
                                    setIsAddMenuOpen(false);
                                    setHoveredCategory(null);
                                  }}
                                  className={`w-full px-3 py-1.5 text-left text-xs cursor-pointer flex items-center justify-between transition-colors ${
                                    isSelected
                                      ? 'bg-surface-accent-faint text-accent font-semibold'
                                      : 'text-ink-lighter hover:bg-surface-200 hover:text-ink'
                                  }`}
                                >
                                  <span>{st}</span>
                                  {isSelected && <Check className="w-3.5 h-3.5 text-accent shrink-0" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 3. Thời hạn */}
                  {onSelectDue && (
                    <div
                      className="relative"
                      onMouseEnter={() => setHoveredCategory('due')}
                    >
                      <button
                        type="button"
                        className={`w-full px-3 py-1.5 text-left flex items-center justify-between cursor-pointer transition-colors ${
                          hoveredCategory === 'due'
                            ? 'bg-surface-200 text-ink font-medium'
                            : 'text-ink-lighter hover:bg-surface-100'
                        }`}
                      >
                        <span>Thời hạn</span>
                        <ChevronRight className="w-3 h-3 text-subdued-lighter" />
                      </button>

                      {/* Submenu cấp 2 bên phải cho Thời hạn */}
                      {hoveredCategory === 'due' && (
                        <div
                          className="absolute left-full top-0 -ml-0.5 pl-1.5 z-50"
                          onMouseEnter={() => setHoveredCategory('due')}
                        >
                          <div className="w-44 bg-surface rounded-vds-lg border border-line shadow-sheet py-1">
                            {dueOptions.map((opt) => {
                              const isSelected = filterState.dueFilter === opt.key;
                              return (
                                <button
                                  key={opt.key}
                                  type="button"
                                  onClick={() => {
                                    onSelectDue?.(opt.key);
                                    setIsAddMenuOpen(false);
                                    setHoveredCategory(null);
                                  }}
                                  className={`w-full px-3 py-1.5 text-left text-xs cursor-pointer flex items-center justify-between transition-colors ${
                                    isSelected
                                      ? 'bg-surface-accent-faint text-accent font-semibold'
                                      : 'text-ink-lighter hover:bg-surface-200 hover:text-ink'
                                  }`}
                                >
                                  <span>{opt.label}</span>
                                  {isSelected && <Check className="w-3.5 h-3.5 text-accent shrink-0" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 4. Nhóm */}
                  {onSelectTeam && (
                    <div
                      className="relative"
                      onMouseEnter={() => setHoveredCategory('team')}
                    >
                      <button
                        type="button"
                        className={`w-full px-3 py-1.5 text-left flex items-center justify-between cursor-pointer transition-colors ${
                          hoveredCategory === 'team'
                            ? 'bg-surface-200 text-ink font-medium'
                            : 'text-ink-lighter hover:bg-surface-100'
                        }`}
                      >
                        <span>Nhóm</span>
                        <ChevronRight className="w-3 h-3 text-subdued-lighter" />
                      </button>

                      {/* Submenu cấp 2 bên phải cho Nhóm */}
                      {hoveredCategory === 'team' && (
                        <div
                          className="absolute left-full top-0 -ml-0.5 pl-1.5 z-50"
                          onMouseEnter={() => setHoveredCategory('team')}
                        >
                          <div className="w-48 bg-surface rounded-vds-lg border border-line shadow-sheet py-1">
                            {teams.map((tm) => {
                              const isSelected = filterState.team === tm;
                              return (
                                <button
                                  key={tm}
                                  type="button"
                                  onClick={() => {
                                    onSelectTeam?.(tm);
                                    setIsAddMenuOpen(false);
                                    setHoveredCategory(null);
                                  }}
                                  className={`w-full px-3 py-1.5 text-left text-xs cursor-pointer flex items-center justify-between transition-colors ${
                                    isSelected
                                      ? 'bg-surface-accent-faint text-accent font-semibold'
                                      : 'text-ink-lighter hover:bg-surface-200 hover:text-ink'
                                  }`}
                                >
                                  <span>{tm}</span>
                                  {isSelected && <Check className="w-3.5 h-3.5 text-accent shrink-0" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Nút Xóa tất cả bộ lọc */}
        <button
          type="button"
          onClick={onClearAll}
          className="text-xs font-ui font-medium text-subdued hover:text-negative hover:bg-surface-negative/60 px-2.5 py-1 rounded-vds-md transition-colors cursor-pointer flex items-center gap-1 shrink-0"
          title="Đặt lại toàn bộ các điều kiện lọc về mặc định"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Xóa bộ lọc</span>
        </button>
      </div>
    </div>
  );
};

