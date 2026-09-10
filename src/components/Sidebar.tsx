/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { ActiveTab, ProjectItem, MemberItem, TeamType, TaskStatus, DueFilterType } from '../types';
import { getMemberProjectRelation } from '../utils/memberPersonalization';
import {
  sortProjectsAlphabetically,
  isOthersProject,
  normalizeProjectStatus,
} from '../utils/projectSortingUtils';
import {
  CheckSquare,
  FolderKanban,
  Users,
  Search,
  Filter,
  Plus,
  AlertTriangle,
  Folder,
  Layers,
  ChevronRight,
  ChevronDown,
  Briefcase,
  Clock,
  Calendar,
  X,
  UserCheck,
  Trash2
} from 'lucide-react';
import { canCreateProject, canCreateMember } from '../utils/rbac';

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  projects: ProjectItem[];
  members?: MemberItem[];
  activeProductMember?: MemberItem | null;
  currentAuthUser?: MemberItem | null;
  selectedProjectId: string;
  onSelectProject: (projId: string) => void;
  selectedTeam: 'Tất cả' | TeamType;
  onSelectTeam: (team: 'Tất cả' | TeamType) => void;
  selectedStatus: 'Tất cả' | TaskStatus;
  onSelectStatus: (status: 'Tất cả' | TaskStatus) => void;
  selectedAssignee?: string;
  onSelectAssignee?: (assignee: string) => void;
  selectedDueFilter?: DueFilterType;
  onSelectDueFilter?: (dueFilter: DueFilterType) => void;
  todayCount?: number;
  overdueCount?: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  taskCountsByProject: Record<string, number>;
  totalActiveTasks: number;
  trashCount?: number;
  blockedCount: number;
  onOpenQuickAdd: () => void;
  onOpenAddProject?: () => void;
  onOpenAddMember?: () => void;
  onResetData?: () => void;
}

const TEAMS: ('Tất cả' | TeamType)[] = [
  'Tất cả',
  'Product Manager',
  'UX/UI Designer',
  'SEO',
  'Data',
];

const STATUSES: ('Tất cả' | TaskStatus)[] = [
  'Tất cả',
  'Chưa làm',
  'Đang làm',
  'Bị nghẽn',
  'Hoàn thành',
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  projects,
  members,
  activeProductMember,
  currentAuthUser,
  selectedProjectId,
  onSelectProject,
  selectedTeam,
  onSelectTeam,
  selectedStatus,
  onSelectStatus,
  selectedAssignee = 'Tất cả',
  onSelectAssignee,
  selectedDueFilter = 'all',
  onSelectDueFilter,
  todayCount = 0,
  overdueCount = 0,
  searchQuery,
  onSearchChange,
  taskCountsByProject,
  totalActiveTasks,
  trashCount = 0,
  blockedCount,
  onOpenQuickAdd,
  onOpenAddProject,
  onOpenAddMember,
  onResetData,
}) => {
  const currentMember = activeProductMember || (selectedAssignee !== 'Tất cả' ? members?.find((m) => m.name === selectedAssignee) : null);
  const [showAllProjectsInSidebar, setShowAllProjectsInSidebar] = useState(false);

  useEffect(() => {
    setShowAllProjectsInSidebar(false);
  }, [currentMember?.id, selectedAssignee]);

  const memberRelatedProjects = useMemo(() => {
    if (!currentMember) return projects;
    const othersProj = projects.find(isOthersProject);
    const related = projects.filter((p) => {
      if (isOthersProject(p)) return false;
      const rel = getMemberProjectRelation(p, currentMember);
      return rel.isRelated;
    });
    return othersProj ? [...related, othersProj] : related;
  }, [projects, currentMember]);

  const baseProjects = currentMember ? memberRelatedProjects : projects;

  const inProgressProjects = useMemo(() => {
    return baseProjects.filter(
      (p) =>
        normalizeProjectStatus(p.status) === 'Đang triển khai' ||
        normalizeProjectStatus(p.status) === 'Chưa triển khai'
    );
  }, [baseProjects]);

  const displayedProjects = useMemo(() => {
    let list: ProjectItem[] = [];
    if (showAllProjectsInSidebar) {
      list = baseProjects;
    } else {
      const active = baseProjects.filter(
        (p) =>
          normalizeProjectStatus(p.status) === 'Đang triển khai' ||
          normalizeProjectStatus(p.status) === 'Chưa triển khai'
      );
      if (selectedProjectId !== 'all' && !active.some((p) => p.id === selectedProjectId)) {
        const selProj = baseProjects.find((p) => p.id === selectedProjectId);
        if (selProj) active.push(selProj);
      }
      list = active;
    }
    return sortProjectsAlphabetically(list);
  }, [baseProjects, showAllProjectsInSidebar, selectedProjectId]);

  // User activity persistence for collapse/expand
  const userKey = activeProductMember?.id || 'default_user';

  const loadUserPrefs = (): { workspace: boolean; team: boolean; status: boolean } => {
    try {
      const raw = localStorage.getItem(`vne_sidebar_activity_${userKey}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          workspace: typeof parsed.workspaceExpanded === 'boolean' ? parsed.workspaceExpanded : false,
          team: typeof parsed.teamExpanded === 'boolean' ? parsed.teamExpanded : false,
          status: typeof parsed.statusExpanded === 'boolean' ? parsed.statusExpanded : false,
        };
      }
    } catch (e) {}
    // Mặc định: collapse (hiển thị Công việc và Dự án)
    return { workspace: false, team: false, status: false };
  };

  const [isWorkspaceExpanded, setIsWorkspaceExpanded] = useState<boolean>(() => loadUserPrefs().workspace);
  const [isTeamExpanded, setIsTeamExpanded] = useState<boolean>(() => loadUserPrefs().team);
  const [isStatusExpanded, setIsStatusExpanded] = useState<boolean>(() => loadUserPrefs().status);

  // Reload when active user changes
  useEffect(() => {
    const prefs = loadUserPrefs();
    setIsWorkspaceExpanded(prefs.workspace);
    setIsTeamExpanded(prefs.team);
    setIsStatusExpanded(prefs.status);
  }, [userKey]);

  const saveUserPrefs = (workspace: boolean, team: boolean, status: boolean) => {
    try {
      localStorage.setItem(
        `vne_sidebar_activity_${userKey}`,
        JSON.stringify({
          workspaceExpanded: workspace,
          teamExpanded: team,
          statusExpanded: status,
        })
      );
    } catch (e) {}
  };

  const handleToggleWorkspace = () => {
    const next = !isWorkspaceExpanded;
    setIsWorkspaceExpanded(next);
    saveUserPrefs(next, isTeamExpanded, isStatusExpanded);
  };

  const handleToggleTeam = () => {
    const next = !isTeamExpanded;
    setIsTeamExpanded(next);
    saveUserPrefs(isWorkspaceExpanded, next, isStatusExpanded);
  };

  const handleToggleStatus = () => {
    const next = !isStatusExpanded;
    setIsStatusExpanded(next);
    saveUserPrefs(isWorkspaceExpanded, isTeamExpanded, next);
  };

  return (
    <aside className="w-80 bg-[#ffffff] border-r border-[#e0e0e0] flex flex-col h-screen sticky top-0 shrink-0 select-none shadow-xs">
      {/* Brand & App Title Header */}
      <div className="p-6 border-b border-[#f0f0f0] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[8px] bg-[#963861] text-white flex items-center justify-center font-ui font-bold text-lg shadow-xs">
              ✓
            </div>
            <div>
              <span className="font-ui font-extrabold text-[11px] tracking-wider uppercase text-[#913257] block">
                VnExpress Product
              </span>
              <h1 className="font-title text-base font-bold text-[#202020] leading-snug">
                Công việc
              </h1>
            </div>
          </div>
        </div>

        {/* Primary CTA tailored to active tab with RBAC */}
        {activeTab === 'projects' && canCreateProject(currentAuthUser) ? (
          <button
            onClick={onOpenAddProject || onOpenQuickAdd}
            className="w-full h-10 rounded-[8px] bg-[#b13460] hover:bg-[#8f274c] text-white font-ui text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo dự án mới</span>
          </button>
        ) : activeTab === 'members' && canCreateMember(currentAuthUser) ? (
          <button
            onClick={onOpenAddMember || onOpenQuickAdd}
            className="w-full h-10 rounded-[8px] bg-[#24a148] hover:bg-[#1d8239] text-white font-ui text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo nhân sự mới</span>
          </button>
        ) : (
          <button
            onClick={onOpenQuickAdd}
            className="w-full h-10 rounded-[8px] bg-[#963861] hover:bg-[#832e52] text-white font-ui text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo việc mới</span>
          </button>
        )}
      </div>

      {/* Scrollable Navigation & Filter Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin">
        {/* SECTION 1: WORK SPACE (Collapsible Group) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-2 py-1">
            <button
              type="button"
              onClick={handleToggleWorkspace}
              className="flex items-center gap-1.5 text-left group cursor-pointer"
              title={isWorkspaceExpanded ? 'Thu gọn Work Space' : 'Mở rộng Work Space'}
            >
              <Briefcase className="w-3.5 h-3.5 text-[#963861]" />
              <span className="text-[11px] font-ui font-extrabold uppercase tracking-wider text-[#9f9f9f] group-hover:text-[#202020] transition-colors">
                Work Space
              </span>
            </button>
            <button
              type="button"
              onClick={handleToggleWorkspace}
              className="px-1.5 py-0.5 rounded-[4px] hover:bg-[#f0f0f0] text-[#71717a] hover:text-[#202020] transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-ui"
              title={isWorkspaceExpanded ? 'Thu gọn (chỉ hiển thị Công việc & Dự án)' : 'Mở rộng hiển thị tất cả các mục'}
            >
              <span className="text-[10px] text-[#9f9f9f]">{isWorkspaceExpanded ? 'Thu gọn' : 'Mở rộng'}</span>
              {isWorkspaceExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          <div className="space-y-1">
            {/* Always show Công việc */}
            <button
              onClick={() => onTabChange('tasks')}
              className={`w-full px-3 py-2.5 rounded-[8px] text-xs font-ui font-bold flex items-center justify-between transition-colors cursor-pointer ${
                activeTab === 'tasks'
                  ? 'bg-[#fdf2f7] text-[#913257] border border-[#f4c2d7]'
                  : 'text-[#5f5f5f] hover:bg-[#f5f5f5] hover:text-[#202020]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <CheckSquare className="w-4 h-4 text-[#963861]" />
                <span>Công việc</span>
              </div>
              <span className="font-num text-[11px] bg-white px-2 py-0.5 rounded-full border border-[#e0e0e0] text-[#5f5f5f]">
                {totalActiveTasks}
              </span>
            </button>

            {/* Always show Dự án */}
            <button
              onClick={() => onTabChange('projects')}
              className={`w-full px-3 py-2.5 rounded-[8px] text-xs font-ui font-bold flex items-center justify-between transition-colors cursor-pointer ${
                activeTab === 'projects'
                  ? 'bg-[#edf5fd] text-[#1e609c] border border-[#cfe2fe]'
                  : 'text-[#5f5f5f] hover:bg-[#f5f5f5] hover:text-[#202020]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FolderKanban className="w-4 h-4 text-[#3b629b]" />
                <span>Dự án</span>
              </div>
              <span className="font-num text-[11px] bg-white px-2 py-0.5 rounded-full border border-[#e0e0e0] text-[#5f5f5f]">
                {projects.length}
              </span>
            </button>

            {/* When expanded: show Nhân sự, Thùng rác */}
            {isWorkspaceExpanded ? (
              <>
                <button
                  onClick={() => onTabChange('members')}
                  className={`w-full px-3 py-2.5 rounded-[8px] text-xs font-ui font-bold flex items-center justify-between transition-colors cursor-pointer ${
                    activeTab === 'members'
                      ? 'bg-[#f0fdf4] text-[#166534] border border-[#bbf7d0]'
                      : 'text-[#5f5f5f] hover:bg-[#f5f5f5] hover:text-[#202020]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Users className="w-4 h-4 text-[#166534]" />
                    <span>Nhân sự</span>
                  </div>
                  <span className="font-num text-[11px] bg-white px-2 py-0.5 rounded-full border border-[#e0e0e0] text-[#5f5f5f]">
                    {members ? members.length : 12}
                  </span>
                </button>

                <button
                  onClick={() => onTabChange('trash')}
                  className={`w-full px-3 py-2.5 rounded-[8px] text-xs font-ui font-bold flex items-center justify-between transition-colors cursor-pointer ${
                    activeTab === 'trash'
                      ? 'bg-[#fff1f2] text-[#be123c] border border-[#fecdd3]'
                      : 'text-[#5f5f5f] hover:bg-[#f5f5f5] hover:text-[#202020]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Trash2 className="w-4 h-4 text-[#be123c]" />
                    <span>Thùng rác</span>
                  </div>
                  {trashCount > 0 && (
                    <span className="font-num text-[11px] bg-white px-2 py-0.5 rounded-full border border-[#fecdd3] text-[#be123c] font-bold">
                      {trashCount}
                    </span>
                  )}
                </button>
              </>
            ) : (
              // If collapsed, but user is currently on members or trash, show active tab indicator
              (activeTab === 'members' || activeTab === 'trash') && (
                <div className="pt-0.5">
                  {activeTab === 'members' && (
                    <button
                      onClick={() => onTabChange('members')}
                      className="w-full px-3 py-2.5 rounded-[8px] text-xs font-ui font-bold flex items-center justify-between bg-[#f0fdf4] text-[#166534] border border-[#bbf7d0]"
                    >
                      <div className="flex items-center gap-2.5">
                        <Users className="w-4 h-4 text-[#166534]" />
                        <span>Nhân sự</span>
                      </div>
                      <span className="font-num text-[11px] bg-white px-2 py-0.5 rounded-full border border-[#bbf7d0] text-[#166534]">
                        {members ? members.length : 12}
                      </span>
                    </button>
                  )}
                  {activeTab === 'trash' && (
                    <button
                      onClick={() => onTabChange('trash')}
                      className="w-full px-3 py-2.5 rounded-[8px] text-xs font-ui font-bold flex items-center justify-between bg-[#fff1f2] text-[#be123c] border border-[#fecdd3]"
                    >
                      <div className="flex items-center gap-2.5">
                        <Trash2 className="w-4 h-4 text-[#be123c]" />
                        <span>Thùng rác</span>
                      </div>
                      {trashCount > 0 && (
                        <span className="font-num text-[11px] bg-white px-2 py-0.5 rounded-full border border-[#fecdd3] text-[#be123c] font-bold">
                          {trashCount}
                        </span>
                      )}
                    </button>
                  )}
                </div>
              )
            )}
          </div>
        </div>

        {/* SECTION 2: FILTERS (Always available) */}
        <div className="pt-2 border-t border-[#f0f0f0] space-y-5">
          {/* Search Box in Sidebar */}
          <div className="space-y-1.5">
            <p className="px-3 text-[11px] font-ui font-extrabold uppercase tracking-wider text-[#9f9f9f]">
              Tìm kiếm
            </p>
            <div className="relative px-1">
              <Search className="w-3.5 h-3.5 text-[#7f7f7f] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Tìm việc, nhân sự..."
                className="w-full pl-8 pr-7 py-1.5 text-xs font-body bg-[#fafafa] border border-[#d6d6d6] focus:border-[#b13460] focus:bg-white rounded-[6px] text-[#202020] placeholder-[#9f9f9f] focus:outline-hidden"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7f7f7f] hover:text-[#202020] p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Due Date Filter */}
          {onSelectDueFilter && (
            <div className="space-y-1.5">
              <p className="px-3 text-[11px] font-ui font-extrabold uppercase tracking-wider text-[#9f9f9f]">
                Thời hạn
              </p>
              <div className="space-y-0.5">
                <button
                  onClick={() => {
                    onSelectDueFilter('all');
                  }}
                  className={`w-full px-3 py-1.5 rounded-[6px] text-xs font-ui font-bold text-left flex items-center justify-between transition-colors ${
                    selectedDueFilter === 'all'
                      ? 'bg-[#f1f5f9] text-[#1e293b] border border-[#cbd5e1]'
                      : 'text-[#5f5f5f] hover:bg-[#f8fafc] hover:text-[#202020]'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#475569]" />
                    <span>Tất cả thời hạn</span>
                  </span>
                </button>

                <button
                  onClick={() => {
                    onSelectDueFilter('today');
                  }}
                  className={`w-full px-3 py-1.5 rounded-[6px] text-xs font-ui font-bold text-left flex items-center justify-between transition-colors ${
                    selectedDueFilter === 'today'
                      ? 'bg-[#fff7ed] text-[#c2410c] border border-[#ffedd5]'
                      : 'text-[#c2410c] hover:bg-[#fff7ed]/70'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#ea580c]" />
                    <span>Hạn hôm nay</span>
                  </span>
                  {todayCount > 0 && (
                    <span className="text-[10px] bg-[#fed7aa] text-[#9a3412] px-1.5 py-0.2 rounded-full font-bold font-num">
                      {todayCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => {
                    onSelectDueFilter('overdue');
                  }}
                  className={`w-full px-3 py-1.5 rounded-[6px] text-xs font-ui font-bold text-left flex items-center justify-between transition-colors ${
                    selectedDueFilter === 'overdue'
                      ? 'bg-[#fef2f2] text-[#b91c1c] border border-[#fecaca]'
                      : 'text-[#dc2626] hover:bg-[#fef2f2]/70'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#dc2626]" />
                    <span>Quá hạn</span>
                  </span>
                  {overdueCount > 0 && (
                    <span className="text-[10px] bg-[#fecaca] text-[#991b1b] px-1.5 py-0.2 rounded-full font-bold font-num">
                      {overdueCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => {
                    onSelectDueFilter('soon');
                  }}
                  className={`w-full px-3 py-1.5 rounded-[6px] text-xs font-ui font-bold text-left flex items-center justify-between transition-colors ${
                    selectedDueFilter === 'soon'
                      ? 'bg-[#fefce8] text-[#a16207] border border-[#fef08a]'
                      : 'text-[#a16207] hover:bg-[#fefce8]/70'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#ca8a04]" />
                    <span>Sắp đến hạn (3 ngày)</span>
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Project Selector Filter */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-3">
              <p className="text-[11px] font-ui font-extrabold uppercase tracking-wider text-[#9f9f9f] flex items-center justify-between w-full">
                <span>
                  {showAllProjectsInSidebar ? 'Toàn bộ dự án' : 'Đang triển khai'}
                </span>
                <button
                  type="button"
                  onClick={() => setShowAllProjectsInSidebar(!showAllProjectsInSidebar)}
                  className="text-[10px] font-ui font-bold text-[#963861] hover:underline cursor-pointer normal-case"
                >
                  {showAllProjectsInSidebar ? 'Chỉ đang triển khai' : `Tất cả (${baseProjects.length})`}
                </button>
              </p>
            </div>

            <div className="space-y-0.5">
              <button
                onClick={() => {
                  onSelectProject('all');
                }}
                className={`w-full px-3 py-1.5 rounded-[6px] text-xs font-ui text-left flex items-center justify-between transition-colors ${
                  selectedProjectId === 'all'
                    ? 'bg-[#f1f5f9] text-[#1e293b] border border-[#cbd5e1] font-bold'
                    : 'text-[#5f5f5f] hover:bg-[#f8fafc] hover:text-[#202020]'
                }`}
              >
                <span>Tất cả dự án {showAllProjectsInSidebar ? `(${baseProjects.length})` : `(${inProgressProjects.length})`}</span>
                <span
                  className={`font-num text-[10px] px-1.5 py-0.2 rounded-full ${
                    selectedProjectId === 'all'
                      ? 'bg-[#e2e8f0] text-[#334155]'
                      : 'bg-[#f0f0f0] text-[#7f7f7f]'
                  }`}
                >
                  {totalActiveTasks}
                </span>
              </button>

              {displayedProjects.map((p) => {
                const isSel = selectedProjectId === p.id;
                const count = taskCountsByProject[p.id] || 0;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      onSelectProject(p.id);
                    }}
                    className={`w-full px-3 py-1.5 rounded-[6px] text-xs font-ui text-left flex items-center justify-between transition-colors ${
                      isSel
                        ? 'bg-[#fdf2f7] text-[#913257] border border-[#f4c2d7] font-bold'
                        : 'text-[#5f5f5f] hover:bg-[#f8fafc] hover:text-[#202020]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0 pr-2">
                      <span className="truncate" title={p.name}>
                        {p.name.replace(/^Dự án\s+/i, '')}
                      </span>
                      {p.isStrategic && (
                        <span className="text-[#d97706] text-[11px] leading-none shrink-0" title="Dự án chiến lược">
                          ⭐
                        </span>
                      )}
                    </div>
                    <span
                      className={`font-num text-[10px] px-1.5 py-0.2 rounded-full shrink-0 ${
                        isSel ? 'bg-[#fbe5ef] text-[#913257]' : 'bg-[#f0f0f0] text-[#7f7f7f]'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Team Filter (Collapsible) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-2 py-1">
              <button
                type="button"
                onClick={handleToggleTeam}
                className="text-[11px] font-ui font-extrabold uppercase tracking-wider text-[#9f9f9f] hover:text-[#202020] transition-colors cursor-pointer text-left"
                title={isTeamExpanded ? 'Thu gọn Lọc theo Nhóm' : 'Mở rộng Lọc theo Nhóm'}
              >
                Lọc theo Nhóm
              </button>
              <button
                type="button"
                onClick={handleToggleTeam}
                className="px-1.5 py-0.5 rounded-[4px] hover:bg-[#f0f0f0] text-[#71717a] hover:text-[#202020] transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-ui"
                title={isTeamExpanded ? 'Thu gọn' : 'Mở rộng'}
              >
                <span className="text-[10px] text-[#9f9f9f]">{isTeamExpanded ? 'Thu gọn' : 'Mở rộng'}</span>
                {isTeamExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            <div className="space-y-0.5">
              {isTeamExpanded ? (
                TEAMS.map((t) => {
                  const isSel = selectedTeam === t;
                  return (
                    <button
                      key={t}
                      onClick={() => onSelectTeam(t)}
                      className={`w-full px-3 py-1.5 rounded-[6px] text-xs font-ui text-left flex items-center justify-between transition-colors cursor-pointer ${
                        isSel
                          ? 'bg-[#edf5fd] text-[#1e609c] border border-[#cfe2fe] font-bold'
                          : 'text-[#5f5f5f] hover:bg-[#f8fafc] hover:text-[#202020]'
                      }`}
                    >
                      <span>{t === 'Tất cả' ? 'Tất cả các nhóm' : t}</span>
                    </button>
                  );
                })
              ) : (
                <button
                  onClick={handleToggleTeam}
                  className={`w-full px-3 py-1.5 rounded-[6px] text-xs font-ui text-left flex items-center justify-between transition-colors cursor-pointer ${
                    selectedTeam !== 'Tất cả'
                      ? 'bg-[#edf5fd] text-[#1e609c] border border-[#cfe2fe] font-bold'
                      : 'text-[#5f5f5f] hover:bg-[#f8fafc] hover:text-[#202020]'
                  }`}
                  title="Nhấp để mở rộng danh sách nhóm"
                >
                  <span>{selectedTeam === 'Tất cả' ? 'Tất cả các nhóm' : selectedTeam}</span>
                  <ChevronRight className="w-3 h-3 text-[#9f9f9f]" />
                </button>
              )}
            </div>
          </div>

          {/* Status Filter (Collapsible) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-2 py-1">
              <button
                type="button"
                onClick={handleToggleStatus}
                className="text-[11px] font-ui font-extrabold uppercase tracking-wider text-[#9f9f9f] hover:text-[#202020] transition-colors cursor-pointer text-left"
                title={isStatusExpanded ? 'Thu gọn Lọc theo Trạng thái' : 'Mở rộng Lọc theo Trạng thái'}
              >
                Lọc theo Trạng thái
              </button>
              <button
                type="button"
                onClick={handleToggleStatus}
                className="px-1.5 py-0.5 rounded-[4px] hover:bg-[#f0f0f0] text-[#71717a] hover:text-[#202020] transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-ui"
                title={isStatusExpanded ? 'Thu gọn' : 'Mở rộng'}
              >
                <span className="text-[10px] text-[#9f9f9f]">{isStatusExpanded ? 'Thu gọn' : 'Mở rộng'}</span>
                {isStatusExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            <div className="space-y-0.5">
              {isStatusExpanded ? (
                STATUSES.map((st) => {
                  const isSel = selectedStatus === st;
                  return (
                    <button
                      key={st}
                      onClick={() => onSelectStatus(st)}
                      className={`w-full px-3 py-1.5 rounded-[6px] text-xs font-ui text-left flex items-center justify-between transition-colors cursor-pointer ${
                        isSel
                          ? 'bg-[#f1f5f9] text-[#1e293b] border border-[#cbd5e1] font-bold'
                          : st === 'Bị nghẽn' && blockedCount > 0
                          ? 'text-[#be123c] font-bold hover:bg-[#fff1f2]'
                          : 'text-[#5f5f5f] hover:bg-[#f8fafc] hover:text-[#202020]'
                      }`}
                    >
                      <span>{st === 'Tất cả' ? 'Tất cả trạng thái' : st}</span>
                      {st === 'Bị nghẽn' && blockedCount > 0 && (
                        <span className="text-[10px] bg-[#ffe4e6] text-[#be123c] px-1.5 py-0.2 rounded-full font-bold">
                          {blockedCount}
                        </span>
                      )}
                    </button>
                  );
                })
              ) : (
                <button
                  onClick={handleToggleStatus}
                  className={`w-full px-3 py-1.5 rounded-[6px] text-xs font-ui text-left flex items-center justify-between transition-colors cursor-pointer ${
                    selectedStatus !== 'Tất cả'
                      ? 'bg-[#f1f5f9] text-[#1e293b] border border-[#cbd5e1] font-bold'
                      : 'text-[#5f5f5f] hover:bg-[#f8fafc] hover:text-[#202020]'
                  }`}
                  title="Nhấp để mở rộng danh sách trạng thái"
                >
                  <div className="flex items-center gap-1.5">
                    <span>{selectedStatus === 'Tất cả' ? 'Tất cả trạng thái' : selectedStatus}</span>
                    {selectedStatus === 'Bị nghẽn' && blockedCount > 0 && (
                      <span className="text-[10px] bg-[#ffe4e6] text-[#be123c] px-1.5 py-0.2 rounded-full font-bold">
                        {blockedCount}
                      </span>
                    )}
                  </div>
                  <ChevronRight className="w-3 h-3 text-[#9f9f9f]" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

    </aside>
  );
};
