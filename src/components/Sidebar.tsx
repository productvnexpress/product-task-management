/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { ActiveTab, ProjectItem, MemberItem, TeamType, TaskStatus, DueFilterType, FolderItem } from '../types';
import { getMemberProjectRelation } from '../utils/memberPersonalization';
import {
  sortProjectsAlphabetically,
  isOthersProject,
  normalizeProjectStatus,
} from '../utils/projectSortingUtils';
import { INITIAL_FOLDERS, inferProjectFolderId } from '../utils/folderUtils';
import {
  CheckSquare,
  FolderKanban,
  Users,
  Search,
  Filter,
  Plus,
  AlertTriangle,
  Folder,
  FolderOpen,
  FolderPlus,
  Layers,
  ChevronRight,
  ChevronDown,
  Briefcase,
  Clock,
  Calendar,
  X,
  UserCheck,
  Trash2,
  Settings,
  BarChart3,
  TrendingUp,
  Lock,
  CalendarDays
} from './vds/icons';
import { canCreateProject, canCreateMember, getUserRole } from '../utils/rbac';
import { canViewTeamPerformance } from '../utils/teamPerformance';
import { VdsButton, VdsLogo } from './vds';

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  folders?: FolderItem[];
  selectedFolderId?: string;
  onSelectFolder?: (folderId: string) => void;
  taskCountsByFolder?: Record<string, number>;
  onOpenFolderManager?: () => void;
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
  customDueDate?: string;
  onSelectCustomDate?: (date: string) => void;
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
  onLogoClick?: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
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
  folders = INITIAL_FOLDERS,
  selectedFolderId = 'all',
  onSelectFolder,
  taskCountsByFolder = {},
  onOpenFolderManager,
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
  customDueDate,
  onSelectCustomDate,
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
  onLogoClick,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const currentMember = activeProductMember || (selectedAssignee !== 'Tất cả' ? members?.find((m) => m.name === selectedAssignee) : null);
  const userRole = getUserRole(currentAuthUser || activeProductMember);
  const isAdmin = userRole === 'Admin';
  const canManageFolders = userRole === 'Admin' || userRole === 'Manager';
  const [showAllProjectsInSidebar, setShowAllProjectsInSidebar] = useState(false);

  // State đóng/mở cây thư mục trong Sidebar (mặc định mở VnExpress)
  const [expandedFolderIds, setExpandedFolderIds] = useState<Record<string, boolean>>({
    'folder-vne': true,
  });

  const toggleExpandFolder = (folderId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedFolderIds((prev) => ({ ...prev, [folderId]: !prev[folderId] }));
  };

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

  const rootFolders = useMemo(() => {
    return folders
      .filter((f) => !f.parentId)
      .sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99) || a.name.localeCompare(b.name, 'vi'));
  }, [folders]);

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
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Spacer giữ chỗ cố định 320px (w-80) trên Desktop để Left Sidebar được pin fixed tuyệt đối */}
      <div className="hidden md:block w-80 shrink-0 select-none" aria-hidden="true" />

      {/* Sidebar Aside element: fixed pinned at top-0 left-0 h-screen on both mobile drawer & desktop */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 md:z-30 h-screen w-80 bg-surface border-r border-line flex flex-col shrink-0 select-none shadow-sheet md:shadow-none transition-transform duration-300 ease-in-out ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand & App Title Header */}
        <div className="p-6 border-b border-divider space-y-3">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                onLogoClick?.();
                onCloseMobile?.();
              }}
              className="flex items-center gap-2.5 text-left group cursor-pointer transition-opacity hover:opacity-90 focus:outline-none"
              title="Về công việc mặc định"
            >
              <div className="flex flex-col gap-1">
                <VdsLogo className="h-[22px] w-[118px]" />
                <h1 className="font-title text-sm font-bold text-ink-lighter group-hover:text-accent leading-snug transition-colors">
                  Công việc · Ban Sản phẩm
                </h1>
              </div>
            </button>

            {/* Close button for Mobile Drawer */}
            <button
              type="button"
              onClick={onCloseMobile}
              className="p-1.5 rounded-full text-subdued hover:text-ink hover:bg-surface-200 md:hidden cursor-pointer"
              title="Đóng thanh bên"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

        {/* Primary CTA tailored to active tab with RBAC */}
        {activeTab === 'projects' && canCreateProject(currentAuthUser) ? (
          <VdsButton variant="accent" iconLeft="Add" fullWidth onClick={onOpenAddProject || onOpenQuickAdd}>
            Tạo dự án mới
          </VdsButton>
        ) : activeTab === 'members' && canCreateMember(currentAuthUser) ? (
          <VdsButton variant="accent" iconLeft="Add" fullWidth onClick={onOpenAddMember || onOpenQuickAdd}>
            Tạo nhân sự mới
          </VdsButton>
        ) : (
          <VdsButton variant="accent" iconLeft="Add" fullWidth onClick={onOpenQuickAdd}>
            Tạo việc mới
          </VdsButton>
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
              <Briefcase className="w-3.5 h-3.5 text-accent" />
              <span className="text-xs font-ui font-bold text-subdued-lighter group-hover:text-ink transition-colors">
                Work Space
              </span>
            </button>
            <button
              type="button"
              onClick={handleToggleWorkspace}
              className="px-1.5 py-0.5 rounded-vds-md hover:bg-surface-200 text-subdued hover:text-ink transition-colors cursor-pointer flex items-center gap-1 text-xs font-ui"
              title={isWorkspaceExpanded ? 'Thu gọn (chỉ hiển thị Công việc & Dự án)' : 'Mở rộng hiển thị tất cả các mục'}
            >
              <span className="text-[10px] text-subdued-lighter">{isWorkspaceExpanded ? 'Thu gọn' : 'Mở rộng'}</span>
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
              className={`w-full px-3 py-2.5 rounded-vds-lg text-xs font-ui font-bold flex items-center justify-between transition-colors cursor-pointer ${
                activeTab === 'tasks'
                  ? 'bg-surface-accent-faint text-accent border border-line'
                  : 'text-ink-lighter hover:bg-surface-200 hover:text-ink'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <CheckSquare className="w-4 h-4 text-accent" />
                <span>Công việc</span>
              </div>
              <span className="font-num text-xs bg-surface px-2 py-0.5 rounded-full border border-line text-ink-lighter">
                {totalActiveTasks}
              </span>
            </button>

            {/* Always show Dự án */}
            <button
              onClick={() => onTabChange('projects')}
              className={`w-full px-3 py-2.5 rounded-vds-lg text-xs font-ui font-bold flex items-center justify-between transition-colors cursor-pointer ${
                activeTab === 'projects'
                  ? 'bg-surface-info text-support border border-line'
                  : 'text-ink-lighter hover:bg-surface-200 hover:text-ink'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FolderKanban className="w-4 h-4 text-support" />
                <span>Dự án</span>
              </div>
              <span className="font-num text-xs bg-surface px-2 py-0.5 rounded-full border border-line text-ink-lighter">
                {projects.length}
              </span>
            </button>

            {/* Always show Báo cáo, ngay sau Dự án — kể cả khi Work Space đang thu gọn */}
            <button
              onClick={() => onTabChange('reports')}
              className={`w-full px-3 py-2.5 rounded-vds-lg text-xs font-ui font-bold flex items-center justify-between transition-colors cursor-pointer ${
                activeTab === 'reports'
                  ? 'bg-surface-accent-faint text-accent border border-line'
                  : 'text-ink-lighter hover:bg-surface-200 hover:text-ink'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <BarChart3 className="w-4 h-4 text-accent" />
                <span>Báo cáo</span>
              </div>
            </button>

            {/* Hiệu quả team: chỉ tài khoản tienngoc */}
            {canViewTeamPerformance(currentAuthUser) && (
              <button
                onClick={() => onTabChange('performance')}
                className={`w-full px-3 py-2.5 rounded-vds-lg text-xs font-ui font-bold flex items-center justify-between transition-colors cursor-pointer ${
                  activeTab === 'performance'
                    ? 'bg-surface-accent-faint text-accent border border-line'
                    : 'text-ink-lighter hover:bg-surface-200 hover:text-ink'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <TrendingUp className="w-4 h-4 text-accent" />
                  <span>Hiệu quả team</span>
                </div>
                <Lock className="w-3.5 h-3.5 text-icon-subdued" aria-label="Riêng tư" />
              </button>
            )}

            {/* When expanded: show Nhân sự, Thùng rác */}
            {isWorkspaceExpanded ? (
              <>
                <button
                  onClick={() => onTabChange('members')}
                  className={`w-full px-3 py-2.5 rounded-vds-lg text-xs font-ui font-bold flex items-center justify-between transition-colors cursor-pointer ${
                    activeTab === 'members'
                      ? 'bg-surface-positive text-positive border border-line'
                      : 'text-ink-lighter hover:bg-surface-200 hover:text-ink'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Users className="w-4 h-4 text-positive" />
                    <span>Nhân sự</span>
                  </div>
                  <span className="font-num text-xs bg-surface px-2 py-0.5 rounded-full border border-line text-ink-lighter">
                    {members ? members.length : 12}
                  </span>
                </button>

                <button
                  onClick={() => onTabChange('trash')}
                  className={`w-full px-3 py-2.5 rounded-vds-lg text-xs font-ui font-bold flex items-center justify-between transition-colors cursor-pointer ${
                    activeTab === 'trash'
                      ? 'bg-surface-negative text-negative border border-line'
                      : 'text-ink-lighter hover:bg-surface-200 hover:text-ink'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Trash2 className="w-4 h-4 text-negative" />
                    <span>Thùng rác</span>
                  </div>
                  {trashCount > 0 && (
                    <span className="font-num text-xs bg-surface px-2 py-0.5 rounded-full border border-line text-negative font-bold">
                      {trashCount}
                    </span>
                  )}
                </button>

                {isAdmin && (
                  <button
                    onClick={() => onTabChange('settings')}
                    className={`w-full px-3 py-2.5 rounded-vds-lg text-xs font-ui font-bold flex items-center justify-between transition-colors cursor-pointer ${
                      activeTab === 'settings'
                        ? 'bg-surface-support text-extreme border border-line'
                        : 'text-ink-lighter hover:bg-surface-200 hover:text-ink'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Settings className="w-4 h-4 text-extreme" />
                      <span>Thiết lập</span>
                    </div>
                    <span className="text-[10px] bg-surface-support text-extreme px-1.5 py-0.5 rounded font-ui font-bold">
                      Admin
                    </span>
                  </button>
                )}
              </>
            ) : (
              // If collapsed, but user is currently on members, trash or settings, show active tab indicator
              (activeTab === 'members' || activeTab === 'trash' || activeTab === 'settings') && (
                <div className="pt-0.5">
                  {activeTab === 'members' && (
                    <button
                      onClick={() => onTabChange('members')}
                      className="w-full px-3 py-2.5 rounded-vds-lg text-xs font-ui font-bold flex items-center justify-between bg-surface-positive text-positive border border-line"
                    >
                      <div className="flex items-center gap-2.5">
                        <Users className="w-4 h-4 text-positive" />
                        <span>Nhân sự</span>
                      </div>
                      <span className="font-num text-xs bg-surface px-2 py-0.5 rounded-full border border-line text-positive">
                        {members ? members.length : 12}
                      </span>
                    </button>
                  )}
                  {activeTab === 'trash' && (
                    <button
                      onClick={() => onTabChange('trash')}
                      className="w-full px-3 py-2.5 rounded-vds-lg text-xs font-ui font-bold flex items-center justify-between bg-surface-negative text-negative border border-line"
                    >
                      <div className="flex items-center gap-2.5">
                        <Trash2 className="w-4 h-4 text-negative" />
                        <span>Thùng rác</span>
                      </div>
                      {trashCount > 0 && (
                        <span className="font-num text-xs bg-surface px-2 py-0.5 rounded-full border border-line text-negative font-bold">
                          {trashCount}
                        </span>
                      )}
                    </button>
                  )}
                  {activeTab === 'settings' && (
                    <button
                      onClick={() => onTabChange('settings')}
                      className="w-full px-3 py-2.5 rounded-vds-lg text-xs font-ui font-bold flex items-center justify-between bg-surface-support text-extreme border border-line"
                    >
                      <div className="flex items-center gap-2.5">
                        <Settings className="w-4 h-4 text-extreme" />
                        <span>Thiết lập</span>
                      </div>
                      <span className="text-[10px] bg-surface-support text-extreme px-1.5 py-0.5 rounded font-ui font-bold">
                        Admin
                      </span>
                    </button>
                  )}
                </div>
              )
            )}
          </div>
        </div>

        {/* SECTION 2: FILTERS (Always available) */}
        <div className="pt-2 border-t border-divider space-y-5">
          {/* Search Box in Sidebar */}
          <div className="space-y-1.5">
            <p className="px-3 text-xs font-ui font-bold text-subdued-lighter">
              Tìm kiếm
            </p>
            <div className="relative px-1">
              <Search className="w-3.5 h-3.5 text-subdued absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Tìm việc, nhân sự..."
                className="w-full pl-8 pr-7 py-1.5 text-xs font-body bg-surface-100 border border-line focus:border-line-accent focus:bg-surface rounded-vds-lg text-ink placeholder-subdued-lighter focus:outline-hidden"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-subdued hover:text-ink p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Due Date Filter */}
          {onSelectDueFilter && (
            <div className="space-y-1.5">
              <p className="px-3 text-xs font-ui font-bold text-subdued-lighter">
                Thời hạn
              </p>
              <div className="space-y-0.5">
                <button
                  onClick={() => {
                    onSelectDueFilter('all');
                  }}
                  className={`w-full px-3 py-1.5 rounded-vds-lg text-xs font-ui font-bold text-left flex items-center justify-between transition-colors ${
                    selectedDueFilter === 'all'
                      ? 'bg-surface-200 text-ink border border-line'
                      : 'text-ink-lighter hover:bg-surface-100 hover:text-ink'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-ink-lighter" />
                    <span>Tất cả thời hạn</span>
                  </span>
                </button>

                <button
                  onClick={() => {
                    onSelectDueFilter('today');
                  }}
                  className={`w-full px-3 py-1.5 rounded-vds-lg text-xs font-ui font-bold text-left flex items-center justify-between transition-colors ${
                    selectedDueFilter === 'today'
                      ? 'bg-surface-warning text-warning border border-line'
                      : 'text-warning hover:bg-surface-warning/70'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-warning" />
                    <span>Hạn hôm nay</span>
                  </span>
                  {todayCount > 0 && (
                    <span className="text-[10px] bg-surface-warning text-warning px-1.5 py-0.2 rounded-full font-bold font-num">
                      {todayCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => {
                    onSelectDueFilter('overdue');
                  }}
                  className={`w-full px-3 py-1.5 rounded-vds-lg text-xs font-ui font-bold text-left flex items-center justify-between transition-colors ${
                    selectedDueFilter === 'overdue'
                      ? 'bg-surface-negative text-negative border border-line'
                      : 'text-negative hover:bg-surface-negative/70'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-negative" />
                    <span>Quá hạn</span>
                  </span>
                  {overdueCount > 0 && (
                    <span className="text-[10px] bg-surface-negative text-negative px-1.5 py-0.2 rounded-full font-bold font-num">
                      {overdueCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => {
                    onSelectDueFilter('soon');
                  }}
                  className={`w-full px-3 py-1.5 rounded-vds-lg text-xs font-ui font-bold text-left flex items-center justify-between transition-colors ${
                    selectedDueFilter === 'soon'
                      ? 'bg-surface-warning text-warning border border-line'
                      : 'text-warning hover:bg-surface-warning/70'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-warning" />
                    <span>Sắp đến hạn (3 ngày)</span>
                  </span>
                </button>

                {onSelectCustomDate && (
                  <div
                    className={`w-full px-3 py-1.5 rounded-vds-lg text-xs font-ui font-bold flex items-center justify-between gap-1.5 transition-colors ${
                      selectedDueFilter === 'custom'
                        ? 'bg-surface-info text-info border border-line'
                        : 'text-ink-lighter hover:bg-surface-100 hover:text-ink'
                    }`}
                  >
                    <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
                      <CalendarDays className="w-3.5 h-3.5 text-info" />
                      <span>Theo ngày</span>
                    </label>
                    <input
                      type="date"
                      value={customDueDate || ''}
                      onChange={(e) => {
                        if (e.target.value) onSelectCustomDate(e.target.value);
                      }}
                      className="min-w-0 flex-1 bg-surface border border-line rounded px-1.5 py-0.5 text-xs font-ui text-ink cursor-pointer"
                    />
                    {selectedDueFilter === 'custom' && (
                      <button
                        type="button"
                        onClick={() => onSelectDueFilter && onSelectDueFilter('all')}
                        className="text-info hover:text-support text-[10px] shrink-0"
                        title="Bỏ lọc theo ngày"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Folder & Project Tree Selector Filter */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-3">
              <span className="text-xs font-ui font-bold text-subdued-lighter">
                Thư mục & Dự án
              </span>
              <div className="flex items-center gap-2">
                {canManageFolders && onOpenFolderManager && (
                  <button
                    type="button"
                    onClick={onOpenFolderManager}
                    className="text-[10px] font-ui font-bold text-ink-lighter hover:text-accent flex items-center gap-0.5 cursor-pointer"
                    title="Quản lý cây thư mục"
                  >
                    <FolderPlus className="w-3 h-3" />
                    <span>Thư mục</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowAllProjectsInSidebar(!showAllProjectsInSidebar)}
                  className="text-[10px] font-ui font-bold text-accent hover:underline cursor-pointer normal-case"
                >
                  {showAllProjectsInSidebar ? 'Đang chạy' : `Tất cả (${baseProjects.length})`}
                </button>
              </div>
            </div>

            <div className="space-y-0.5">
              {/* Nút Tất cả thư mục & dự án */}
              <button
                type="button"
                onClick={() => {
                  onSelectFolder?.('all');
                  onSelectProject('all');
                }}
                className={`w-full px-3 py-1.5 rounded-vds-lg text-xs font-ui text-left flex items-center justify-between transition-colors cursor-pointer ${
                  (!selectedFolderId || selectedFolderId === 'all') && selectedProjectId === 'all'
                    ? 'bg-surface-200 text-ink border border-line font-bold'
                    : 'text-ink-lighter hover:bg-surface-100 hover:text-ink'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-subdued" />
                  <span>Tất cả thư mục & dự án</span>
                </span>
                <span
                  className={`font-num text-[10px] px-1.5 py-0.2 rounded-full ${
                    (!selectedFolderId || selectedFolderId === 'all') && selectedProjectId === 'all'
                      ? 'bg-surface-300 text-ink-lighter'
                      : 'bg-surface-200 text-subdued'
                  }`}
                >
                  {totalActiveTasks}
                </span>
              </button>

              {/* Danh sách Cây Thư mục Cấp 1 (VnExpress, Ngôi sao, English, Tia sáng...) */}
              {rootFolders.map((root) => {
                const subFolders = folders
                  .filter((f) => f.parentId === root.id)
                  .sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99) || a.name.localeCompare(b.name, 'vi'));
                const directRootProjects = displayedProjects.filter(
                  (p) => (p.folderId || inferProjectFolderId(p)) === root.id
                );
                const isRootSelected = selectedFolderId === root.id && selectedProjectId === 'all';
                const hasChildSelected =
                  subFolders.some((sf) => sf.id === selectedFolderId) ||
                  displayedProjects.some(
                    (p) =>
                      p.id === selectedProjectId &&
                      ((p.folderId || inferProjectFolderId(p)) === root.id ||
                        subFolders.some((sf) => sf.id === (p.folderId || inferProjectFolderId(p))))
                  );
                const isRootExpanded = Boolean(expandedFolderIds[root.id] || isRootSelected || hasChildSelected);
                const rootTaskCount = taskCountsByFolder[root.id] || 0;
                const hasExpandableContent = subFolders.length > 0 || directRootProjects.length > 0;

                return (
                  <div key={root.id} className="space-y-0.5">
                    {/* Hàng Thư mục gốc (Root Folder) */}
                    <div
                      className={`w-full px-2 py-1.5 rounded-vds-lg text-xs font-ui flex items-center justify-between transition-colors ${
                        isRootSelected
                          ? 'bg-surface-accent-faint text-accent border border-line font-bold'
                          : 'text-ink-lighter hover:bg-surface-100 hover:text-ink'
                      }`}
                    >
                      <div className="flex items-center gap-1 min-w-0 flex-1">
                        {hasExpandableContent ? (
                          <button
                            type="button"
                            onClick={(e) => toggleExpandFolder(root.id, e)}
                            className="p-0.5 rounded hover:bg-black/5 text-subdued shrink-0 cursor-pointer"
                            title={isRootExpanded ? 'Thu gọn thư mục' : 'Mở rộng thư mục'}
                          >
                            {isRootExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5" />
                            )}
                          </button>
                        ) : (
                          <span className="w-4 shrink-0" />
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            const nextFolder = isRootSelected ? 'all' : root.id;
                            onSelectFolder?.(nextFolder);
                            onSelectProject('all');
                            if (!isRootExpanded && nextFolder !== 'all') {
                              setExpandedFolderIds((prev) => ({ ...prev, [root.id]: true }));
                            }
                          }}
                          className="flex items-center gap-1.5 min-w-0 flex-1 text-left cursor-pointer"
                        >
                          {isRootExpanded ? (
                            <FolderOpen className="w-3.5 h-3.5 text-accent shrink-0" />
                          ) : (
                            <Folder className="w-3.5 h-3.5 text-accent shrink-0" />
                          )}
                          <span className="truncate font-semibold">{root.name}</span>
                        </button>
                      </div>

                      {rootTaskCount > 0 && (
                        <span
                          className={`font-num text-[10px] px-1.5 py-0.2 rounded-full shrink-0 ${
                            isRootSelected ? 'bg-surface-accent text-accent' : 'bg-surface-200 text-subdued'
                          }`}
                        >
                          {rootTaskCount}
                        </span>
                      )}
                    </div>

                    {/* Nội dung bên trong Root Folder: Sub-folders & Projects */}
                    {isRootExpanded && hasExpandableContent && (
                      <div className="pl-3.5 ml-3 border-l border-line space-y-0.5">
                        {/* 1. Các Sub-folders (Thể thao, Thế giới, ...) */}
                        {subFolders.map((sub) => {
                          const subProjects = displayedProjects.filter(
                            (p) => (p.folderId || inferProjectFolderId(p)) === sub.id
                          );
                          const isSubSelected = selectedFolderId === sub.id && selectedProjectId === 'all';
                          const hasSubProjSelected = subProjects.some((p) => p.id === selectedProjectId);
                          const isSubExpanded = Boolean(
                            expandedFolderIds[sub.id] !== undefined
                              ? expandedFolderIds[sub.id]
                              : isSubSelected || hasSubProjSelected || subProjects.length > 0
                          );
                          const subTaskCount = taskCountsByFolder[sub.id] || 0;

                          return (
                            <div key={sub.id} className="space-y-0.5">
                              <div
                                className={`w-full px-2 py-1 rounded-vds-lg text-xs font-ui flex items-center justify-between transition-colors ${
                                  isSubSelected
                                    ? 'bg-surface-accent-faint text-accent border border-line font-bold'
                                    : 'text-ink-lighter hover:bg-surface-100 hover:text-ink'
                                }`}
                              >
                                <div className="flex items-center gap-1 min-w-0 flex-1">
                                  {subProjects.length > 0 ? (
                                    <button
                                      type="button"
                                      onClick={(e) => toggleExpandFolder(sub.id, e)}
                                      className="p-0.5 rounded hover:bg-black/5 text-subdued-lighter shrink-0 cursor-pointer"
                                    >
                                      {isSubExpanded ? (
                                        <ChevronDown className="w-3 h-3" />
                                      ) : (
                                        <ChevronRight className="w-3 h-3" />
                                      )}
                                    </button>
                                  ) : (
                                    <span className="w-3.5 shrink-0 text-center text-icon-subdued text-[10px]">•</span>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => {
                                      const nextFolder = isSubSelected ? 'all' : sub.id;
                                      onSelectFolder?.(nextFolder);
                                      onSelectProject('all');
                                    }}
                                    className="flex items-center gap-1.5 min-w-0 flex-1 text-left cursor-pointer"
                                  >
                                    <Folder className="w-3 h-3 text-subdued shrink-0" />
                                    <span className="truncate">{sub.name}</span>
                                  </button>
                                </div>

                                {subTaskCount > 0 && (
                                  <span
                                    className={`font-num text-[10px] px-1.5 py-0.2 rounded-full shrink-0 ${
                                      isSubSelected ? 'bg-surface-accent text-accent' : 'bg-surface-200 text-subdued'
                                    }`}
                                  >
                                    {subTaskCount}
                                  </span>
                                )}
                              </div>

                              {/* Các Dự án nằm trong Sub-folder */}
                              {isSubExpanded && subProjects.length > 0 && (
                                <div className="pl-3.5 ml-2.5 border-l border-divider space-y-0.5">
                                  {subProjects.map((p) => {
                                    const isSel = selectedProjectId === p.id;
                                    const count = taskCountsByProject[p.id] || 0;
                                    return (
                                      <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => {
                                          onSelectFolder?.(sub.id);
                                          onSelectProject(isSel ? 'all' : p.id);
                                        }}
                                        className={`w-full px-2.5 py-1 rounded-vds-lg text-xs font-ui text-left flex items-center justify-between transition-colors cursor-pointer ${
                                          isSel
                                            ? 'bg-surface-info text-support border border-line font-bold'
                                            : 'text-ink-lighter hover:bg-surface-100 hover:text-ink'
                                        }`}
                                      >
                                        <div className="flex items-center gap-1.5 min-w-0 pr-1.5">
                                          <FolderKanban className="w-3 h-3 text-support shrink-0" />
                                          <span className="truncate" title={p.name}>
                                            {p.name.replace(/^Dự án\s+/i, '')}
                                          </span>
                                          {p.isStrategic && (
                                            <span className="text-warning text-[10px] leading-none shrink-0" title="Dự án chiến lược">
                                              ⭐
                                            </span>
                                          )}
                                        </div>
                                        {count > 0 && (
                                          <span
                                            className={`font-num text-[10px] px-1.5 py-0.2 rounded-full shrink-0 ${
                                              isSel ? 'bg-surface-info text-support' : 'bg-surface-200 text-subdued'
                                            }`}
                                          >
                                            {count}
                                          </span>
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* 2. Các Dự án nằm trực tiếp trong Root Folder */}
                        {directRootProjects.map((p) => {
                          const isSel = selectedProjectId === p.id;
                          const count = taskCountsByProject[p.id] || 0;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                onSelectFolder?.(root.id);
                                onSelectProject(isSel ? 'all' : p.id);
                              }}
                              className={`w-full px-2.5 py-1 rounded-vds-lg text-xs font-ui text-left flex items-center justify-between transition-colors cursor-pointer ${
                                isSel
                                  ? 'bg-surface-info text-support border border-line font-bold'
                                  : 'text-ink-lighter hover:bg-surface-100 hover:text-ink'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 min-w-0 pr-1.5">
                                <FolderKanban className="w-3 h-3 text-support shrink-0" />
                                <span className="truncate" title={p.name}>
                                  {p.name.replace(/^Dự án\s+/i, '')}
                                </span>
                                {p.isStrategic && (
                                  <span className="text-warning text-[10px] leading-none shrink-0" title="Dự án chiến lược">
                                    ⭐
                                  </span>
                                )}
                              </div>
                              {count > 0 && (
                                <span
                                  className={`font-num text-[10px] px-1.5 py-0.2 rounded-full shrink-0 ${
                                    isSel ? 'bg-surface-info text-support' : 'bg-surface-200 text-subdued'
                                  }`}
                                >
                                  {count}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
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
                className="text-xs font-ui font-bold text-subdued-lighter hover:text-ink transition-colors cursor-pointer text-left"
                title={isTeamExpanded ? 'Thu gọn Lọc theo Nhóm' : 'Mở rộng Lọc theo Nhóm'}
              >
                Lọc theo Nhóm
              </button>
              <button
                type="button"
                onClick={handleToggleTeam}
                className="px-1.5 py-0.5 rounded-vds-md hover:bg-surface-200 text-subdued hover:text-ink transition-colors cursor-pointer flex items-center gap-1 text-xs font-ui"
                title={isTeamExpanded ? 'Thu gọn' : 'Mở rộng'}
              >
                <span className="text-[10px] text-subdued-lighter">{isTeamExpanded ? 'Thu gọn' : 'Mở rộng'}</span>
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
                      className={`w-full px-3 py-1.5 rounded-vds-lg text-xs font-ui text-left flex items-center justify-between transition-colors cursor-pointer ${
                        isSel
                          ? 'bg-surface-info text-support border border-line font-bold'
                          : 'text-ink-lighter hover:bg-surface-100 hover:text-ink'
                      }`}
                    >
                      <span>{t === 'Tất cả' ? 'Tất cả các nhóm' : t}</span>
                    </button>
                  );
                })
              ) : (
                <button
                  onClick={handleToggleTeam}
                  className={`w-full px-3 py-1.5 rounded-vds-lg text-xs font-ui text-left flex items-center justify-between transition-colors cursor-pointer ${
                    selectedTeam !== 'Tất cả'
                      ? 'bg-surface-info text-support border border-line font-bold'
                      : 'text-ink-lighter hover:bg-surface-100 hover:text-ink'
                  }`}
                  title="Nhấp để mở rộng danh sách nhóm"
                >
                  <span>{selectedTeam === 'Tất cả' ? 'Tất cả các nhóm' : selectedTeam}</span>
                  <ChevronRight className="w-3 h-3 text-subdued-lighter" />
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
                className="text-xs font-ui font-bold text-subdued-lighter hover:text-ink transition-colors cursor-pointer text-left"
                title={isStatusExpanded ? 'Thu gọn Lọc theo Trạng thái' : 'Mở rộng Lọc theo Trạng thái'}
              >
                Lọc theo Trạng thái
              </button>
              <button
                type="button"
                onClick={handleToggleStatus}
                className="px-1.5 py-0.5 rounded-vds-md hover:bg-surface-200 text-subdued hover:text-ink transition-colors cursor-pointer flex items-center gap-1 text-xs font-ui"
                title={isStatusExpanded ? 'Thu gọn' : 'Mở rộng'}
              >
                <span className="text-[10px] text-subdued-lighter">{isStatusExpanded ? 'Thu gọn' : 'Mở rộng'}</span>
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
                      className={`w-full px-3 py-1.5 rounded-vds-lg text-xs font-ui text-left flex items-center justify-between transition-colors cursor-pointer ${
                        isSel
                          ? 'bg-surface-200 text-ink border border-line font-bold'
                          : st === 'Bị nghẽn' && blockedCount > 0
                          ? 'text-negative font-bold hover:bg-surface-negative'
                          : 'text-ink-lighter hover:bg-surface-100 hover:text-ink'
                      }`}
                    >
                      <span>{st === 'Tất cả' ? 'Tất cả trạng thái' : st}</span>
                      {st === 'Bị nghẽn' && blockedCount > 0 && (
                        <span className="text-[10px] bg-surface-negative text-negative px-1.5 py-0.2 rounded-full font-bold">
                          {blockedCount}
                        </span>
                      )}
                    </button>
                  );
                })
              ) : (
                <button
                  onClick={handleToggleStatus}
                  className={`w-full px-3 py-1.5 rounded-vds-lg text-xs font-ui text-left flex items-center justify-between transition-colors cursor-pointer ${
                    selectedStatus !== 'Tất cả'
                      ? 'bg-surface-200 text-ink border border-line font-bold'
                      : 'text-ink-lighter hover:bg-surface-100 hover:text-ink'
                  }`}
                  title="Nhấp để mở rộng danh sách trạng thái"
                >
                  <div className="flex items-center gap-1.5">
                    <span>{selectedStatus === 'Tất cả' ? 'Tất cả trạng thái' : selectedStatus}</span>
                    {selectedStatus === 'Bị nghẽn' && blockedCount > 0 && (
                      <span className="text-[10px] bg-surface-negative text-negative px-1.5 py-0.2 rounded-full font-bold">
                        {blockedCount}
                      </span>
                    )}
                  </div>
                  <ChevronRight className="w-3 h-3 text-subdued-lighter" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

    </aside>
    </>
  );
};
