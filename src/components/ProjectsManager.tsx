/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { ProjectItem, TaskItem, MemberItem, ProjectPhase, PhaseStatus, ProjectRoles, ProjectLinks, FilterState, FolderItem } from '../types';
import { getFlattenedFolderOptions, getFolderPath, inferProjectFolderId, getDescendantFolderIds, INITIAL_FOLDERS } from '../utils/folderUtils';
import { ProjectHistoryModal } from './ProjectHistoryModal';
import { ProjectCalendarView } from './ProjectCalendarView';
import { normalizeAndNumberPhases, formatPhaseName, cleanPhaseTitle } from '../utils/phaseUtils';
import { diffInDays, parseDateSafe } from '../utils/projectForecastUtils';
import { canCreateProject, canEditProject, canDeleteProject } from '../utils/rbac';
import { sortProjectsAlphabetically, normalizeProjectStatus } from '../utils/projectSortingUtils';
import { wmsDataService } from '../services/wmsDataService';
import {
  FolderKanban,
  Folder,
  FolderPlus,
  History,
  Plus,
  Calendar,
  User,
  CheckCircle2,
  Clock,
  Trash2,
  Edit2,
  X,
  Check,
  Layers,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Briefcase,
  Palette,
  Search,
  BarChart3,
  ListOrdered,
  PanelRight,
  ExternalLink,
  FileText,
  Target,
  Globe,
  MessageSquare,
  LayoutDashboard,
  TrendingUp,
  FlaskConical,
  Navigation,
  Compass,
  Zap,
  Flag,
  List,
  ArrowUp,
  Filter,
  Sparkles,
} from './vds/icons';
import { formatDateShort, formatDateWithEnDay, formatMemberWithPhone, formatProductMemberWithPhone, formatStakeholderMemberWithPhone } from '../utils/formatters';
import { calculateProjectForecast } from '../utils/projectForecastUtils';
import { getMemberProjectRelation } from '../utils/memberPersonalization';
import { ProjectDeadlineAlertBanner } from './ProjectDeadlineAlertBanner';

interface ProjectsManagerProps {
  projects: ProjectItem[];
  folders?: FolderItem[];
  tasks: TaskItem[];
  members: MemberItem[];
  filterState?: FilterState;
  onAddProject: (proj: Omit<ProjectItem, 'id'>) => void;
  onUpdateProject: (proj: ProjectItem) => void;
  onDeleteProject: (id: string) => void;
  onSelectProjectFilter: (projId: string) => void;
  activeProductMember?: MemberItem | null;
  currentAuthUser?: MemberItem | null;
  onOpenProjectDetail?: (projectId: string) => void;
  onOpenAddProject?: () => void;
  onOpenFolderManager?: () => void;
}

export const ProjectsManager: React.FC<ProjectsManagerProps> = ({
  projects,
  folders = INITIAL_FOLDERS,
  tasks,
  members,
  filterState,
  onAddProject,
  onUpdateProject,
  onDeleteProject,
  onSelectProjectFilter,
  activeProductMember,
  currentAuthUser,
  onOpenProjectDetail,
  onOpenAddProject,
  onOpenFolderManager,
}) => {
  const effectiveUser = currentAuthUser || activeProductMember;

  // Phase Quick Management Modal State
  const [selectedPhaseProject, setSelectedPhaseProject] = useState<ProjectItem | null>(null);
  const [expandedPhaseProjectId, setExpandedPhaseProjectId] = useState<string | null>(null);
  const [historyModalProject, setHistoryModalProject] = useState<ProjectItem | null>(null);

  // Quick phase form in Phase Management Modal
  const [newPhaseName, setNewPhaseName] = useState('');
  const [newPhaseDueDate, setNewPhaseDueDate] = useState('2026-10-30');
  const [newPhaseStatus, setNewPhaseStatus] = useState<PhaseStatus>('Đang triển khai');
  const [newPhaseDesc, setNewPhaseDesc] = useState('');
  const [editingPhaseId, setEditingPhaseId] = useState<string | null>(null);

  // Quick Project Navigator & Filter State
  const [quickSearch, setQuickSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'strategic' | ProjectItem['status']>('all');
  const [localFolderFilter, setLocalFolderFilter] = useState<string>('all');

  // Unified Workspace: Default to 'all' projects so everyone works on a single flat surface
  const [projectScope, setProjectScope] = useState<'all' | 'my_projects'>('all');

  // View Layout: Cards vs Calendar & Timeline
  const [viewLayout, setViewLayout] = useState<'cards' | 'calendar'>('cards');

  const targetMemberForProjects = activeProductMember || currentAuthUser;

  const myProjectsCount = useMemo(() => {
    if (!targetMemberForProjects) return 0;
    return projects.filter((p) => getMemberProjectRelation(p, targetMemberForProjects, tasks).isRelated).length;
  }, [projects, targetMemberForProjects, tasks]);

  const openProjectDrawer = (proj: ProjectItem) => {
    onOpenProjectDetail?.(proj.id);
  };

  const openAddModal = () => {
    onOpenAddProject?.();
  };

  const openEditModal = (proj: ProjectItem) => {
    openProjectDrawer(proj);
  };

  // Phase Quick Management Handlers
  const handleOpenPhaseModal = (proj: ProjectItem) => {
    setSelectedPhaseProject(proj);
    setNewPhaseName('');
    setNewPhaseDesc('');
    setNewPhaseDueDate(proj.targetDate);
    setNewPhaseStatus('Đang triển khai');
    setEditingPhaseId(null);
  };

  const handleOpenPhaseModalWithPhase = (proj: ProjectItem, ph: ProjectPhase) => {
    setSelectedPhaseProject(proj);
    setEditingPhaseId(ph.id);
    setNewPhaseName(cleanPhaseTitle(ph.name));
    setNewPhaseDueDate(ph.dueDate);
    setNewPhaseStatus(ph.status);
    setNewPhaseDesc(ph.description || '');
  };

  const handleAddPhaseToProject = () => {
    if (!selectedPhaseProject || !newPhaseName.trim()) return;

    const currentPhases = selectedPhaseProject.phases || [];

    if (editingPhaseId) {
      // Edit existing phase with chronological auto-sorting and auto-numbering
      const updatedPhases = normalizeAndNumberPhases(
        currentPhases.map((p) =>
          p.id === editingPhaseId
            ? {
                ...p,
                name: newPhaseName.trim(),
                dueDate: newPhaseDueDate,
                status: newPhaseStatus,
                description: newPhaseDesc.trim(),
              }
            : p
        )
      );
      const updatedProj = { ...selectedPhaseProject, phases: updatedPhases };
      onUpdateProject(updatedProj);
      setSelectedPhaseProject(updatedProj);
      setEditingPhaseId(null);
    } else {
      // Add new phase with chronological auto-sorting and auto-numbering
      const newP: ProjectPhase = {
        id: `phase-${Date.now()}`,
        name: newPhaseName.trim(),
        dueDate: newPhaseDueDate,
        status: newPhaseStatus,
        description: newPhaseDesc.trim(),
      };
      const updatedPhases = normalizeAndNumberPhases([...currentPhases, newP]);
      const updatedProj = { ...selectedPhaseProject, phases: updatedPhases };
      onUpdateProject(updatedProj);
      setSelectedPhaseProject(updatedProj);
    }

    setNewPhaseName('');
    setNewPhaseDesc('');
  };

  const handleDeletePhaseFromProject = (phaseId: string) => {
    if (!selectedPhaseProject) return;
    const updatedPhases = normalizeAndNumberPhases(
      (selectedPhaseProject.phases || []).filter((p) => p.id !== phaseId)
    );
    const updatedProj = { ...selectedPhaseProject, phases: updatedPhases };
    wmsDataService.deletePhase(phaseId).catch((err) => {
      console.error('[handleDeletePhaseFromProject] Lỗi khi xóa phase:', err);
    });
    onUpdateProject(updatedProj);
    setSelectedPhaseProject(updatedProj);
  };

  const handleQuickStatusChange = (phaseId: string, nextStatus: PhaseStatus) => {
    if (!selectedPhaseProject) return;
    const updatedPhases = (selectedPhaseProject.phases || []).map((p) =>
      p.id === phaseId ? { ...p, status: nextStatus } : p
    );
    const updatedProj = { ...selectedPhaseProject, phases: updatedPhases };
    onUpdateProject(updatedProj);
    setSelectedPhaseProject(updatedProj);
  };

  // Helper renderer for phase status badge conforming to DESIGN.md Section 2.6
  const renderPhaseStatusBadge = (s: PhaseStatus) => {
    switch (s) {
      case 'Đã hoàn thành':
        return (
          <span className="w-28 justify-center text-xs font-ui font-medium text-positive bg-surface-positive px-2 py-0.5 rounded-vds-md border border-line-positive inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-positive-solid" />
            <span>Đã hoàn thành</span>
          </span>
        );
      case 'Đang triển khai':
        return (
          <span className="w-28 justify-center text-xs font-ui font-medium text-info bg-surface-info px-2 py-0.5 rounded-vds-md border border-line-info inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-support-solid" />
            <span>Đang triển khai</span>
          </span>
        );
      case 'Bị nghẽn':
        return (
          <span className="w-28 justify-center text-xs font-ui font-medium text-negative bg-surface-negative px-2 py-0.5 rounded-vds-md border border-line-negative inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-negative-solid" />
            <span>Bị nghẽn</span>
          </span>
        );
      default:
        return (
          <span className="w-28 justify-center text-xs font-ui font-medium text-ink-lighter bg-surface-200 px-2 py-0.5 rounded-vds-md border border-line inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-icon" />
            <span>Chưa bắt đầu</span>
          </span>
        );
    }
  };

  // Status counts for Quick Navigator
  const strategicCount = projects.filter((p) => p.isStrategic).length;
  const notStartedCount = projects.filter((p) => normalizeProjectStatus(p.status) === 'Chưa triển khai').length;
  const inProgressCount = projects.filter((p) => normalizeProjectStatus(p.status) === 'Đang triển khai').length;
  const pausedCount = projects.filter((p) => normalizeProjectStatus(p.status) === 'Tạm dừng').length;
  const completedCount = projects.filter((p) => normalizeProjectStatus(p.status) === 'Hoàn thành').length;

  const filteredProjects = useMemo(() => {
    const result = projects.filter((p) => {
      // 0. Personalization filter for Product members
      if (targetMemberForProjects && projectScope === 'my_projects') {
        const rel = getMemberProjectRelation(p, targetMemberForProjects, tasks);
        if (!rel.isRelated) return false;
      }

      // 1. Sidebar Project Filter
      if (filterState?.projectId && filterState.projectId !== 'all' && p.id !== filterState.projectId) {
        return false;
      }

      // 1b. Sidebar or Local Folder Filter
      const activeFolderFilter = (filterState?.folderId && filterState.folderId !== 'all')
        ? filterState.folderId
        : localFolderFilter;
      if (activeFolderFilter && activeFolderFilter !== 'all') {
        const validFolderIds = getDescendantFolderIds(activeFolderFilter, folders);
        const projFolderId = p.folderId || inferProjectFolderId(p);
        if (!validFolderIds.includes(projFolderId)) {
          return false;
        }
      }

      // 2. Sidebar Team Filter
      if (filterState?.team && filterState.team !== 'Tất cả') {
        const teamVal = filterState.team;
        const projTasksHaveTeam = tasks.some(
          (t) => (t.projectId === p.id || t.projectName === p.name) && t.team === teamVal
        );
        const poMember = members.find((m) => m.name === p.productOwner);
        const poTeamMatches = poMember?.team === teamVal;
        const rolesHaveTeamMember = p.roles && (
          (p.roles.pm || []).some((mName) => members.find((m) => m.name === mName)?.team === teamVal) ||
          (p.roles.designer || []).some((mName) => members.find((m) => m.name === mName)?.team === teamVal) ||
          (p.roles.seo || []).some((mName) => members.find((m) => m.name === mName)?.team === teamVal) ||
          (p.roles.data || []).some((mName) => members.find((m) => m.name === mName)?.team === teamVal)
        );
        if (!projTasksHaveTeam && !poTeamMatches && !rolesHaveTeamMember) {
          return false;
        }
      }

      // 3. Sidebar Assignee Filter
      if (filterState?.assignee && filterState.assignee !== 'Tất cả') {
        const assigneeVal = filterState.assignee;
        const projTasksHaveAssignee = tasks.some(
          (t) => (t.projectId === p.id || t.projectName === p.name) && t.assignee === assigneeVal
        );
        const poMatches = p.productOwner === assigneeVal;
        const rolesHaveAssignee = p.roles && (
          p.roles.pm?.includes(assigneeVal) ||
          p.roles.designer?.includes(assigneeVal) ||
          p.roles.seo?.includes(assigneeVal) ||
          p.roles.data?.includes(assigneeVal)
        );
        if (!projTasksHaveAssignee && !poMatches && !rolesHaveAssignee) {
          return false;
        }
      }

      // 4. Sidebar Status Filter
      if (filterState?.status && filterState.status !== 'Tất cả') {
        const taskStatusVal = filterState.status;
        const projTasksHaveStatus = tasks.some(
          (t) => (t.projectId === p.id || t.projectName === p.name) && t.status === taskStatusVal
        );
        if (!projTasksHaveStatus && (p.status as string) !== (taskStatusVal as string)) {
          return false;
        }
      }

      // 5. Local status filter chip in ProjectsManager
      if (statusFilter === 'strategic') {
        if (!p.isStrategic) return false;
      } else if (statusFilter !== 'all') {
        if (normalizeProjectStatus(p.status) !== statusFilter) {
          return false;
        }
      }

      // 6. Search query (either from sidebar or local quick search)
      const q = (filterState?.searchQuery || quickSearch).trim().toLowerCase();
      if (q) {
        const matchName = (p.name || '').toLowerCase().includes(q);
        const matchCode = (p.code || '').toLowerCase().includes(q);
        const matchPO = (p.productOwner || '').toLowerCase().includes(q);
        const matchDesc = (p.description || '').toLowerCase().includes(q);
        const matchObj = (p.objective || '').toLowerCase().includes(q);
        const matchPM = p.roles?.pm && Array.isArray(p.roles.pm) && p.roles.pm.some((m) => (m || '').toLowerCase().includes(q));
        if (!matchName && !matchCode && !matchPO && !matchDesc && !matchObj && !matchPM) {
          return false;
        }
      }

      return true;
    });

    return sortProjectsAlphabetically(result);
  }, [projects, filterState, tasks, members, statusFilter, quickSearch, targetMemberForProjects, projectScope, localFolderFilter, folders]);

  const formatPoDisplay = (rawPoString?: string) => {
    if (!rawPoString) return '';
    return rawPoString
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((rawPo) => formatStakeholderMemberWithPhone(rawPo, members))
      .join(', ');
  };

  return (
    <div className={`space-y-4 animate-fade-in w-full ${viewLayout === 'calendar' ? 'max-w-full' : 'max-w-[800px]'} mx-auto`}>
      {/* Cảnh báo Giai đoạn & Deadline Dự án sắp đến hạn trước 3 ngày */}
      <ProjectDeadlineAlertBanner
        projects={projects}
        tasks={tasks}
        members={members}
        currentAuthUser={currentAuthUser || null}
        activeProductMember={activeProductMember}
        onOpenProjectDetail={(projId) => onOpenProjectDetail && onOpenProjectDetail(projId)}
        onFilterProjectTasks={(projId) => onSelectProjectFilter(projId)}
      />

      {/* PERSPECTIVE CONTROL BAR FOR PROJECTS */}
      <div className="bg-surface border border-line rounded-vds-lg p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-ui font-bold text-subdued flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-accent" />
            <span>Xem dự án:</span>
          </span>

          <button
            type="button"
            onClick={() => setProjectScope('all')}
            className={`px-3 py-1.5 rounded-vds-lg text-xs font-ui font-bold transition cursor-pointer ${
              projectScope === 'all'
                ? 'bg-surface-selected text-accent ring-1 ring-inset ring-line-accent-soft'
                : 'bg-surface-200 text-ink-lighter hover:bg-surface-300'
            }`}
          >
            🌐 Tất cả ({projects.length})
          </button>

          {targetMemberForProjects && (
            <button
              type="button"
              onClick={() => setProjectScope('my_projects')}
              className={`px-3 py-1.5 rounded-vds-lg text-xs font-ui font-bold transition cursor-pointer ${
                projectScope === 'my_projects'
                  ? 'bg-surface-selected text-accent ring-1 ring-inset ring-line-accent-soft'
                  : 'bg-surface-accent-faint text-accent hover:bg-surface-accent border border-line'
              }`}
            >
              {activeProductMember && currentAuthUser && activeProductMember.id !== currentAuthUser.id
                ? `👤 Dự án của ${activeProductMember.name.split(' ').slice(-1)[0]} (${myProjectsCount})`
                : `⭐ Dự án của tôi (${myProjectsCount})`}
            </button>
          )}

          {/* Folder Filter Dropdown */}
          <select
            value={localFolderFilter}
            onChange={(e) => setLocalFolderFilter(e.target.value)}
            className="h-8 px-2.5 rounded-vds-lg text-xs font-ui font-semibold bg-surface-100 border border-line text-ink cursor-pointer focus:outline-hidden focus:border-line-accent"
            title="Lọc dự án theo Thư mục (Folder)"
          >
            <option value="all">📁 Tất cả Thư mục</option>
            {getFlattenedFolderOptions(folders).map((opt) => (
              <option key={opt.id} value={opt.id}>
                📁 {opt.fullPath}
              </option>
            ))}
          </select>

          {onOpenFolderManager && (
            <button
              type="button"
              onClick={onOpenFolderManager}
              className="h-8 px-2.5 rounded-vds-lg text-xs font-ui font-semibold bg-surface hover:bg-surface-accent-faint text-accent border border-line flex items-center gap-1 cursor-pointer transition-colors"
              title="Quản lý cây Thư mục (VnExpress, Ngôi sao, English, Tia sáng...)"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Thư mục</span>
            </button>
          )}
        </div>

        {/* View Layout Switcher: Cards vs Calendar */}
        <div className="flex items-center gap-1 bg-surface-200 p-1 rounded-vds-lg border border-line">
          <button
            type="button"
            onClick={() => setViewLayout('cards')}
            className={`px-2.5 py-1 rounded-vds-lg text-xs font-ui font-bold flex items-center gap-1.5 transition cursor-pointer ${
              viewLayout === 'cards'
                ? 'bg-surface text-accent border border-line'
                : 'text-ink-lighter hover:text-ink'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>Thẻ dự án</span>
          </button>
          <button
            type="button"
            onClick={() => setViewLayout('calendar')}
            className={`px-2.5 py-1 rounded-vds-lg text-xs font-ui font-bold flex items-center gap-1.5 transition cursor-pointer ${
              viewLayout === 'calendar'
                ? 'bg-surface text-accent border border-line'
                : 'text-ink-lighter hover:text-ink'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Lịch & Timeline</span>
          </button>
        </div>

        {activeProductMember && (
          <div className="flex items-center gap-2 ml-auto text-xs font-ui">
            <span className="text-subdued">
              Góc nhìn: <strong className="text-ink">{activeProductMember.name}</strong>
            </span>
            <button
              type="button"
              onClick={() => {
                onSelectProjectFilter('all');
                setProjectScope('all');
              }}
              className="text-accent hover:underline font-bold"
            >
              Về Toàn ban
            </button>
          </div>
        )}
      </div>

      {viewLayout === 'calendar' ? (
        <ProjectCalendarView
          projects={filteredProjects}
          tasks={tasks}
          members={members}
          onOpenProjectDetail={onOpenProjectDetail}
          activeProductMember={activeProductMember}
        />
      ) : (
        <>
          {/* QUICK FILTER BAR */}
      <div className="bg-surface rounded-vds-md border border-line px-3 py-2 flex flex-wrap items-center justify-between gap-2.5 transition">
        {/* Left: Quick Search Input */}
        <div className="relative w-52 sm:w-64">
          <Search className="w-3.5 h-3.5 text-subdued absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm mã hoặc tên dự án..."
            value={quickSearch}
            onChange={(e) => setQuickSearch(e.target.value)}
            className="w-full h-8 pl-8 pr-6 text-xs font-body bg-surface-100 border border-line rounded-vds-md focus:outline-hidden focus:border-line-support text-ink placeholder-subdued-lighter transition"
          />
          {quickSearch && (
            <button
              type="button"
              onClick={() => setQuickSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-subdued hover:text-ink text-xs font-bold cursor-pointer"
            >
              ×
            </button>
          )}
        </div>

        {/* Center: Status Filter Chips */}
        <div className="flex items-center gap-1.5 text-xs font-ui overflow-x-auto">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`h-8 px-2.5 rounded-vds-md border transition-colors whitespace-nowrap cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-surface-200 text-ink border-line font-bold'
                : 'bg-surface text-ink-lighter border-line hover:bg-surface-100'
            }`}
          >
            Tất cả ({projects.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('strategic')}
            className={`h-8 px-2.5 rounded-vds-md border transition-colors whitespace-nowrap cursor-pointer ${
              statusFilter === 'strategic'
                ? 'bg-surface-selected text-accent border-line-accent-soft font-bold '
                : 'bg-surface-warning text-warning border-line hover:bg-surface-warning'
            }`}
          >
            ⭐ Chiến lược ({strategicCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('Chưa triển khai')}
            className={`h-8 px-2.5 rounded-vds-md border transition-colors whitespace-nowrap cursor-pointer ${
              statusFilter === 'Chưa triển khai'
                ? 'bg-icon-strong text-on-color border-line-strong font-bold'
                : 'bg-surface-200 text-ink-lighter border-line hover:bg-surface-300'
            }`}
          >
            Chưa triển khai ({notStartedCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('Đang triển khai')}
            className={`h-8 px-2.5 rounded-vds-md border transition-colors whitespace-nowrap cursor-pointer ${
              statusFilter === 'Đang triển khai'
                ? 'bg-surface-selected text-accent border-line-accent-soft font-bold'
                : 'bg-surface-support text-support border-line hover:bg-surface-support'
            }`}
          >
            Đang triển khai ({inProgressCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('Tạm dừng')}
            className={`h-8 px-2.5 rounded-vds-md border transition-colors whitespace-nowrap cursor-pointer ${
              statusFilter === 'Tạm dừng'
                ? 'bg-surface-selected text-accent border-line-accent-soft font-bold'
                : 'bg-surface-negative text-negative border-line hover:bg-surface-negative'
            }`}
          >
            Tạm dừng ({pausedCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('Hoàn thành')}
            className={`h-8 px-2.5 rounded-vds-md border transition-colors whitespace-nowrap cursor-pointer ${
              statusFilter === 'Hoàn thành'
                ? 'bg-surface-selected text-accent border-line-accent-soft font-bold'
                : 'bg-surface-positive text-positive border-line hover:bg-surface-positive'
            }`}
          >
            Hoàn thành ({completedCount})
          </button>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 gap-6">
        {filteredProjects.map((proj) => {
          const projTasks = tasks.filter((t) => t.projectId === proj.id || t.projectName === proj.name);
          const activeTasks = projTasks.filter((t) => t.status !== 'Hoàn thành');
          const completedTasks = projTasks.filter((t) => t.status === 'Hoàn thành');
          const blockedTasks = projTasks.filter((t) => t.status === 'Bị nghẽn');
          const projForecast = calculateProjectForecast(proj, projTasks);

          const hasRoles = proj.roles && (
            (proj.roles.pm && proj.roles.pm.length > 0) ||
            (proj.roles.designer && proj.roles.designer.length > 0) ||
            (proj.roles.seo && proj.roles.seo.length > 0) ||
            (proj.roles.data && proj.roles.data.length > 0)
          );

          const isPhaseExpanded = expandedPhaseProjectId === proj.id;
          const phaseList = proj.phases || [];
          const completedPhases = phaseList.filter((p) => p.status === 'Đã hoàn thành');
          const memberRelation = activeProductMember ? getMemberProjectRelation(proj, activeProductMember, tasks) : null;
          const projFolderPath = getFolderPath(proj.folderId || inferProjectFolderId(proj), folders);

          return (
            <div
              key={proj.id}
              id={`project-card-${proj.id}`}
              className={`bg-surface rounded-vds-lg sm:rounded-vds-md border p-4 sm:p-5 transition-colors flex flex-col justify-between space-y-3 sm:space-y-4 group ${
                memberRelation?.isRelated
                  ? 'border-line-accent/40 '
                  : 'border-line'
              }`}
            >
              <div className="space-y-3">
                {/* Header Row */}
                <div className="flex flex-col-reverse sm:flex-row items-start justify-between gap-2 sm:gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-[10px] font-ui font-bold text-accent bg-surface-accent-faint px-2 py-0.5 rounded-vds-md border border-line">
                      <Folder className="w-3 h-3 text-accent" />
                      <span>{projFolderPath || 'VnExpress'}</span>
                    </span>

                    <h3
                      onClick={() => openProjectDrawer(proj)}
                      className="font-ui text-base font-bold text-ink hover:text-accent cursor-pointer transition-colors leading-snug flex items-center gap-1.5"
                      title="Nhấp để xem thông tin chi tiết (Right Sidebar Drawer khổ lớn)"
                    >
                      {proj.isStrategic && (
                        <span className="text-warning text-base shrink-0" title="Dự án chiến lược - Toà soạn đặc biệt quan tâm">
                          ⭐
                        </span>
                      )}
                      <span>{proj.name}</span>
                      <PanelRight className="w-4 h-4 text-accent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </h3>

                    {/* History Log Button according to AGENTS.md Standard */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setHistoryModalProject(proj);
                      }}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-ui font-semibold text-subdued hover:text-accent bg-surface-100 hover:bg-surface-accent-faint rounded-vds-md border border-line hover:border-line transition-colors cursor-pointer"
                      title={`Xem lịch sử thay đổi dự án (${proj.history?.length || 0} bản ghi)`}
                    >
                      <History className="w-3 h-3 text-accent" />
                      <span>Lịch sử</span>
                      {proj.history && proj.history.length > 0 && (
                        <span className="font-num font-bold text-accent">({proj.history.length})</span>
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {proj.isStrategic && (
                      <span className="text-xs font-ui font-bold px-2 py-0.5 rounded-vds-md bg-surface-warning text-warning border border-line inline-flex items-center gap-1 ">
                        <Sparkles className="w-3 h-3 text-warning" />
                        <span>Chiến lược</span>
                      </span>
                    )}
                    <span
                      className={`text-xs font-ui font-bold px-2.5 py-1 rounded-vds-md border ${
                        normalizeProjectStatus(proj.status) === 'Đang triển khai'
                          ? 'bg-surface-support text-support border-line'
                          : normalizeProjectStatus(proj.status) === 'Chưa triển khai'
                          ? 'bg-surface-200 text-ink-lighter border-line'
                          : normalizeProjectStatus(proj.status) === 'Tạm dừng'
                          ? 'bg-surface-negative text-negative border-line'
                          : 'bg-surface-positive text-positive border-line'
                      }`}
                    >
                      {normalizeProjectStatus(proj.status)}
                    </span>
                  </div>
                </div>

                {/* Mobile: tóm tắt tiến độ; xem đầy đủ ở drawer Chi tiết */}
                {(() => {
                  if (phaseList.length === 0) return null;
                  const nextPhase = phaseList.find((p) => p.status !== 'Đã hoàn thành');
                  const pct = Math.round((completedPhases.length / phaseList.length) * 100);
                  return (
                    <div className="sm:hidden space-y-1.5">
                      <div className="flex items-center justify-between text-[12px] font-ui text-ink-lighter">
                        <span>
                          Giai đoạn <strong className="text-ink">{completedPhases.length}/{phaseList.length}</strong>
                        </span>
                        <span className="font-num text-subdued">{pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-surface-200 overflow-hidden">
                        <div className="h-full bg-accent-solid rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      {nextPhase && (
                        <p className="text-[12px] font-ui text-ink-lighter truncate">
                          Tiếp theo: <span className="text-ink font-medium">{nextPhase.name}</span>
                          {nextPhase.dueDate && <span className="text-subdued"> · {formatDateWithEnDay(nextPhase.dueDate)}</span>}
                        </p>
                      )}
                    </div>
                  );
                })()}

                {/* Mục tiêu dự án (thay thế phần mô tả theo yêu cầu) */}
                <div className="hidden sm:block space-y-1.5 text-xs font-ui">
                  <div className="text-xs text-positive bg-surface-positive px-2.5 py-2 rounded-vds-md border border-line flex items-start gap-1.5">
                    <Target className="w-3.5 h-3.5 shrink-0 mt-0.5 text-positive" />
                    <div className="flex-1 space-y-0.5">
                      <span className="font-bold block text-positive">Mục tiêu & KPI:</span>
                      <p className="text-ink leading-relaxed line-clamp-2 font-normal">
                        {proj.objective || proj.description || 'Chưa cập nhật mục tiêu dự án.'}
                      </p>
                    </div>
                  </div>
                  {proj.productOwner && (
                    <div className="text-xs text-ink-lighter flex items-center gap-1.5 px-0.5">
                      <User className="w-3 h-3 text-accent" />
                      <span><strong className="text-ink">Product Owner:</strong> {formatPoDisplay(proj.productOwner)}</span>
                    </div>
                  )}
                </div>

                {/* ROLE BREAKDOWN SECTION (Phân công theo 4 vai trò chuẩn theo AGENTS.md) */}
                <div className="hidden sm:block pt-2 border-t border-divider space-y-2">
                  <div className="text-xs font-ui font-bold text-ink-lighter flex items-center gap-1">
                    <User className="w-3 h-3" />
                    <span>Nhân sự phụ trách theo vai trò:</span>
                  </div>

                  {hasRoles ? (
                    <div className="grid grid-cols-2 gap-2 text-xs font-body">
                      {/* Product Manager */}
                      {proj.roles?.pm && proj.roles.pm.length > 0 && (
                        <div className="bg-surface-100 p-2 rounded-vds-md border border-divider flex flex-col gap-0.5">
                          <div className="flex items-center gap-1 text-xs font-bold text-accent">
                            <Briefcase className="w-3 h-3" />
                            <span>Product Manager:</span>
                          </div>
                          <div className="text-ink font-medium pl-4">
                            {proj.roles.pm.map((r) => formatProductMemberWithPhone(r, members)).join(', ')}
                          </div>
                        </div>
                      )}

                      {/* Designer */}
                      {proj.roles?.designer && proj.roles.designer.length > 0 && (
                        <div className="bg-surface-100 p-2 rounded-vds-md border border-divider flex flex-col gap-0.5">
                          <div className="flex items-center gap-1 text-xs font-bold text-warning">
                            <Palette className="w-3 h-3" />
                            <span>UX/UI Designer:</span>
                          </div>
                          <div className="text-ink font-medium pl-4">
                            {proj.roles.designer.map((r) => formatProductMemberWithPhone(r, members)).join(', ')}
                          </div>
                        </div>
                      )}

                      {/* SEO */}
                      {proj.roles?.seo && proj.roles.seo.length > 0 && (
                        <div className="bg-surface-100 p-2 rounded-vds-md border border-divider flex flex-col gap-0.5">
                          <div className="flex items-center gap-1 text-xs font-bold text-positive">
                            <Search className="w-3 h-3" />
                            <span>SEO Specialist:</span>
                          </div>
                          <div className="text-ink font-medium pl-4">
                            {proj.roles.seo.map((r) => formatProductMemberWithPhone(r, members)).join(', ')}
                          </div>
                        </div>
                      )}

                      {/* Data */}
                      {proj.roles?.data && proj.roles.data.length > 0 && (
                        <div className="bg-surface-100 p-2 rounded-vds-md border border-divider flex flex-col gap-0.5">
                          <div className="flex items-center gap-1 text-xs font-bold text-support">
                            <BarChart3 className="w-3 h-3" />
                            <span>Data Specialist:</span>
                          </div>
                          <div className="text-ink font-medium pl-4">
                            {proj.roles.data.map((r) => formatProductMemberWithPhone(r, members)).join(', ')}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-ink-lighter bg-surface-100 p-2 rounded-vds-md border border-divider">
                      <strong>Phụ trách chung:</strong>{' '}
                      {proj.leadName
                        ? proj.leadName
                            .split(',')
                            .map((name) => formatProductMemberWithPhone(name.trim(), members))
                            .join(', ')
                        : 'Chưa phân công'}
                    </div>
                  )}
                </div>

                {/* TIẾN TRÌNH GIAI ĐOẠN & MỐC RA MẮT (Trình bày dạng Timeline trực quan) */}
                <div className="hidden sm:block pt-3 border-t border-divider space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-accent" />
                      <span className="font-ui font-bold text-ink">
                        Timeline
                      </span>
                      {phaseList.length > 0 && (
                        <span className="font-ui text-xs text-ink-lighter bg-surface-200 px-1.5 py-0.5 rounded-vds-md border border-line">
                          {completedPhases.length}/{phaseList.length} xong
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => openProjectDrawer(proj)}
                      className="text-xs font-ui text-support hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Chi tiết</span>
                      <PanelRight className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Visual Stepper Timeline Box (Vertical Layout) */}
                  <div className="bg-surface-100 p-3.5 rounded-vds-md border border-line space-y-3">
                    <div className="relative pl-5 space-y-3.5 before:absolute before:left-[7px] before:top-2.5 before:bottom-2.5 before:w-[2px] before:bg-surface-300">
                      {/* Start Node */}
                      <div className="relative flex flex-col sm:flex-row sm:items-center gap-2 text-xs font-ui">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="absolute -left-[17px] w-3 h-3 rounded-full bg-accent-solid border-2 border-surface ring-1 ring-line shrink-0" />
                          <span className="font-normal text-ink-lighter">Bắt đầu:</span>
                        </div>
                        <div className="w-32 shrink-0 font-ui text-xs text-ink-lighter">
                          {formatDateShort(proj.startDate || '2026-09-01')}
                        </div>
                        <div className="w-24 shrink-0 font-ui text-xs text-subdued-lighter text-center">
                          —
                        </div>
                        <div className="w-32 shrink-0 flex items-center">
                          <span className="w-28 justify-center text-center text-xs font-ui font-medium text-subdued bg-surface px-2 py-0.5 rounded-vds-md border border-line inline-flex items-center">
                            Khởi động
                          </span>
                        </div>
                      </div>

                      {/* Phase Nodes */}
                      {phaseList.length === 0 ? (
                        <div className="text-xs text-subdued font-ui">Chưa thiết lập giai đoạn nào.</div>
                      ) : (
                        phaseList.map((ph, idx) => {
                          const isDone = ph.status === 'Đã hoàn thành';
                          const isBlocked = ph.status === 'Bị nghẽn';
                          const isInProg = ph.status === 'Đang triển khai';
                          const dotBg = isDone ? 'bg-positive-solid' : isBlocked ? 'bg-negative-solid' : isInProg ? 'bg-support-solid' : 'bg-icon-subdued';
                          const ringColor = isDone ? 'ring-line-positive/30' : isBlocked ? 'ring-line-negative/30' : isInProg ? 'ring-line-info/30' : 'ring-line';

                          const prevDateStr = idx === 0 ? (proj.startDate || '2026-09-01') : phaseList[idx - 1].dueDate;
                          const diff = diffInDays(parseDateSafe(prevDateStr), parseDateSafe(ph.dueDate));

                          return (
                            <div key={ph.id} className="relative flex flex-col sm:flex-row sm:items-center gap-2 text-xs font-ui group/phase">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <div className={`absolute -left-[18px] w-3.5 h-3.5 rounded-full ${dotBg} border-2 border-surface ring-2 ${ringColor} flex items-center justify-center text-on-color text-[10px] font-bold shrink-0`}>
                                  {isDone ? '✓' : isBlocked ? '!' : (idx + 1)}
                                </div>
                                <span className="text-ink truncate font-ui text-xs" title={ph.name}>
                                  <span className="font-normal text-ink-lighter">Giai đoạn {idx + 1}: </span>
                                  <span className="font-normal text-ink">{cleanPhaseTitle(ph.name)}</span>
                                </span>
                              </div>

                              <div className="w-32 shrink-0 font-ui text-xs text-ink-lighter">
                                {formatDateShort(ph.dueDate)}
                              </div>

                              <div className="w-24 shrink-0 font-ui text-xs text-ink-lighter text-center">
                                {diff >= 0 ? `${diff} ngày` : `${diff} ngày`}
                              </div>

                              <div className="w-32 shrink-0 flex items-center">
                                {renderPhaseStatusBadge(ph.status)}
                              </div>
                            </div>
                          );
                        })
                      )}

                      {/* Go-Live Target Node */}
                      <div className="relative flex flex-col sm:flex-row sm:items-center gap-2 text-xs font-ui pt-0.5">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="absolute -left-[18px] w-3.5 h-3.5 rounded-full bg-accent-solid text-on-color flex items-center justify-center text-[10px] font-bold border-2 border-surface ring-2 ring-line shrink-0">
                            ★
                          </div>
                          <span className="font-normal text-accent">Hoàn thành:</span>
                        </div>

                        <div className="w-32 shrink-0 font-ui font-bold text-xs text-ink">
                          {formatDateShort(proj.targetDate)}
                        </div>

                        {(() => {
                          const lastPhaseDate = phaseList.length > 0 ? phaseList[phaseList.length - 1].dueDate : (proj.startDate || '2026-09-01');
                          const diff = diffInDays(parseDateSafe(lastPhaseDate), parseDateSafe(proj.targetDate));
                          return (
                            <div className="w-24 shrink-0 font-ui text-xs text-ink-lighter text-center">
                              {diff >= 0 ? `${diff} ngày` : `${diff} ngày`}
                            </div>
                          );
                        })()}

                        <div className="w-32 shrink-0 flex items-center">
                          <span className="w-28 justify-center text-center text-xs font-ui font-bold text-accent bg-surface-accent-faint px-2 py-0.5 rounded-vds-md border border-line inline-flex items-center">
                            Hoàn thành
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* PHẦN 3: LIÊN KẾT DỰ ÁN (PROJECT LINKS CHUẨN AGENTS.MD) */}
                {(() => {
                  const techLink = proj.links?.orderTech || proj.linkOrderTech;
                  const chatLink = proj.links?.chat || proj.linkChat;
                  const dashLink = proj.links?.dashboard || proj.linkDashboard;
                  const reportLink = proj.links?.report || proj.linkReport;
                  const betaLink = proj.links?.beta || proj.linkBeta;
                  const prodLink = proj.links?.production || proj.linkProduction;
                  const cLinks = proj.links?.custom || proj.customLinks || [];

                  if (!techLink && !chatLink && !dashLink && !reportLink && !betaLink && !prodLink && cLinks.length === 0) {
                    return null;
                  }

                  return (
                    <div className="hidden sm:block pt-2.5 border-t border-divider space-y-1.5">
                      <div className="text-xs font-ui font-bold text-ink-lighter flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <ExternalLink className="w-3 h-3 text-accent" />
                          <span>Liên kết vận hành & nghiệm thu:</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {techLink && (
                          <a
                            href={techLink}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-vds-md bg-surface-100 border border-line hover:bg-surface-accent-faint hover:border-line-accent hover:text-accent text-ink-lighter text-xs font-medium transition-colors"
                            title="Yêu cầu kỹ thuật / Ticket Jira"
                          >
                            <FileText className="w-3 h-3 text-accent" />
                            <span>Tech</span>
                          </a>
                        )}
                        {chatLink && (
                          <a
                            href={chatLink}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-vds-md bg-surface-100 border border-line hover:bg-surface-accent-faint hover:border-line-positive hover:text-positive text-ink-lighter text-xs font-medium transition-colors"
                            title="Nhóm trao đổi trực tuyến"
                          >
                            <MessageSquare className="w-3 h-3 text-positive" />
                            <span>Chat</span>
                          </a>
                        )}
                        {dashLink && (
                          <a
                            href={dashLink}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-vds-md bg-surface-100 border border-line hover:bg-surface-accent-faint hover:border-line-warning hover:text-warning text-ink-lighter text-xs font-medium transition-colors"
                            title="Bảng theo dõi chỉ số đo lường hiệu quả"
                          >
                            <LayoutDashboard className="w-3 h-3 text-warning" />
                            <span>Dashboard</span>
                          </a>
                        )}
                        {reportLink && (
                          <a
                            href={reportLink}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-vds-md bg-surface-100 border border-line hover:bg-surface-accent-faint hover:border-line-support hover:text-support text-ink-lighter text-xs font-medium transition-colors"
                            title="Báo cáo tổng kết / nghiệm thu"
                          >
                            <TrendingUp className="w-3 h-3 text-support" />
                            <span>Report</span>
                          </a>
                        )}
                        {betaLink && (
                          <a
                            href={betaLink}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-vds-md bg-surface-100 border border-line hover:bg-surface-accent-faint hover:border-line-warning hover:text-warning text-ink-lighter text-xs font-medium transition-colors"
                            title="Môi trường thử nghiệm Beta"
                          >
                            <FlaskConical className="w-3 h-3 text-warning" />
                            <span>Beta</span>
                          </a>
                        )}
                        {prodLink && (
                          <a
                            href={prodLink}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-vds-md bg-surface-100 border border-line hover:bg-surface-accent-faint hover:border-line-positive hover:text-positive text-ink-lighter text-xs font-medium transition-colors"
                            title="Phiên bản chính thức trên VnExpress"
                          >
                            <Globe className="w-3 h-3 text-positive" />
                            <span>Prod</span>
                          </a>
                        )}
                        {cLinks.map((cl) => (
                          <a
                            key={cl.id}
                            href={cl.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-vds-md bg-surface-100 border border-line hover:bg-surface-accent-faint hover:border-line-support hover:text-support text-ink-lighter text-xs font-medium transition-colors"
                          >
                            <ExternalLink className="w-3 h-3 text-support" />
                            <span>{cl.title}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* PHẦN 4: GHI CHÚ ĐIỀU HÀNH & BIÊN BẢN HỌP CHUẨN AGENTS.MD */}
                {proj.notes && proj.notes.length > 0 && (
                  <div
                    onClick={() => openProjectDrawer(proj)}
                    className="hidden sm:block p-2.5 bg-surface-100 rounded-vds-md border border-line text-xs font-ui cursor-pointer hover:bg-surface-200 hover:border-line-accent/40 transition-colors"
                    title="Nhấp để xem toàn bộ danh sách ghi chú tại Right Sidebar Drawer"
                  >
                    <div className="flex items-center justify-between text-xs text-subdued mb-1">
                      <span className="font-bold flex items-center gap-1 text-ink">
                        <FileText className="w-3 h-3 text-accent" />
                        <span>Ghi chú điều hành gần nhất ({proj.notes.length}):</span>
                      </span>
                      <span className="font-num text-[10px] text-subdued">{proj.notes[proj.notes.length - 1].createdAt}</span>
                    </div>
                    <div className="text-ink-lighter text-xs line-clamp-1 italic">
                      <strong className="text-ink not-italic">{proj.notes[proj.notes.length - 1].author}:</strong> "{proj.notes[proj.notes.length - 1].content}"
                    </div>
                  </div>
                )}
              </div>

              {/* Task statistics breakdown & actions */}
              <div className="pt-3 sm:pt-4 border-t border-divider flex flex-wrap items-center justify-between gap-2.5 text-xs font-ui">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-ink-lighter">
                    <Clock className="w-3.5 h-3.5 text-accent" />
                    <span>Đang làm: <strong className="font-num text-ink">{activeTasks.length}</strong></span>
                  </div>

                  <div className="flex items-center gap-1 text-positive">
                    <CheckCircle2 className="w-3.5 h-3.5 text-positive" />
                    <span>Xong: <strong className="font-num">{completedTasks.length}</strong></span>
                  </div>

                  {blockedTasks.length > 0 && (
                    <span className="text-negative font-bold bg-surface-negative px-1.5 py-0.5 rounded-vds-md border border-line-negative">
                      {blockedTasks.length} nghẽn
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openProjectDrawer(proj)}
                    className="h-8 sm:h-auto px-2.5 py-1 bg-surface-accent-faint text-accent border border-line hover:bg-accent-solid hover:text-on-color rounded-vds-lg sm:rounded-vds-md transition-colors font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                    title="Xem thông tin chi tiết dự án"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Chi tiết</span>
                  </button>

                  <button
                    onClick={() => onSelectProjectFilter(proj.id)}
                    className="h-8 sm:h-auto px-3 py-1 bg-support-solid text-on-color rounded-vds-lg sm:rounded-vds-md hover:bg-support-solid transition-colors font-bold text-xs cursor-pointer"
                  >
                    Xem công việc
                  </button>

                  {canDeleteProject(effectiveUser, proj) && (
                    <button
                      onClick={() => {
                        if (confirm(`Bạn chắc chắn muốn xóa dự án "${proj.name}"?`)) {
                          onDeleteProject(proj.id);
                        }
                      }}
                      className="p-1.5 text-subdued hover:text-negative hover:bg-surface-negative rounded-vds-md cursor-pointer"
                      title="Xóa dự án"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  )}

      {/* QUICK PHASE MANAGEMENT MODAL */}
      {selectedPhaseProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in overflow-y-auto">
          <div className="bg-surface w-full max-w-xl rounded-vds-md border border-line overflow-hidden my-8 space-y-0">
            {/* Modal Header */}
            <div className="p-5 bg-surface-100 border-b border-line flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-accent" />
                <div>
                  <h3 className="font-ui text-base font-bold text-ink">
                    Quản lý Giai đoạn (Phases)
                  </h3>
                  <p className="text-xs text-ink-lighter">{selectedPhaseProject.name}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPhaseProject(null)}
                className="p-1 rounded-full text-subdued hover:text-ink cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs font-body max-h-[75vh] overflow-y-auto">
              {/* Existing Phases List */}
              <div className="space-y-3">
                <h4 className="font-ui font-bold text-ink text-sm">Danh sách Giai đoạn hiện tại:</h4>

                {(!selectedPhaseProject.phases || selectedPhaseProject.phases.length === 0) ? (
                  <div className="p-4 bg-surface-100 border border-dashed border-line rounded-vds-md text-center text-subdued">
                    Dự án này chưa được chia giai đoạn. Vui lòng thêm giai đoạn bên dưới.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedPhaseProject.phases.map((ph, idx) => (
                      <div key={ph.id} className="p-3 bg-surface rounded-vds-md border border-line space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 font-ui font-bold text-ink">
                            <span className="text-accent font-num">#{idx + 1}</span>
                            <span>{formatPhaseName(ph.name, idx)}</span>
                          </div>
                          {renderPhaseStatusBadge(ph.status)}
                        </div>

                        {ph.description && <p className="text-xs text-ink-lighter">{ph.description}</p>}

                        <div className="flex flex-wrap items-center justify-between pt-1 border-t border-divider gap-2">
                          <div className="text-xs font-ui text-subdued flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-accent" />
                            <span><strong>{formatDateShort(ph.dueDate)}</strong></span>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Quick status change buttons */}
                            <select
                              value={ph.status}
                              onChange={(e) => handleQuickStatusChange(ph.id, e.target.value as PhaseStatus)}
                              className="text-xs p-1 border border-line rounded-vds-md bg-surface-100"
                            >
                              <option value="Chưa bắt đầu">⚪ Chưa bắt đầu</option>
                              <option value="Đang triển khai">🔵 Đang triển khai</option>
                              <option value="Bị nghẽn">🔴 Bị nghẽn</option>
                              <option value="Đã hoàn thành">🟢 Đã hoàn thành</option>
                            </select>

                            <button
                              onClick={() => {
                                setEditingPhaseId(ph.id);
                                setNewPhaseName(cleanPhaseTitle(ph.name));
                                setNewPhaseDueDate(ph.dueDate);
                                setNewPhaseStatus(ph.status);
                                setNewPhaseDesc(ph.description || '');
                              }}
                              className="p-1 text-subdued hover:text-ink"
                              title="Sửa giai đoạn"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleDeletePhaseFromProject(ph.id)}
                              className="p-1 text-subdued hover:text-negative"
                              title="Xóa giai đoạn"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add / Edit Phase Form Block */}
              <div className="p-4 bg-surface-accent-faint border border-line rounded-vds-lg space-y-3">
                <div className="font-ui font-bold text-accent text-xs flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Plus className="w-4 h-4" />
                    <span>{editingPhaseId ? 'Cập nhật giai đoạn' : 'Thêm giai đoạn triển khai mới'}</span>
                  </div>
                  <span className="text-[10px] text-subdued italic font-normal">
                    * Tự động sinh tiền tố & tự xếp theo thời gian
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-bold text-ink-lighter">Nội dung giai đoạn:</label>
                      <input
                        type="text"
                        placeholder="VD: Khảo sát & PRD, Thiết kế..."
                        value={newPhaseName}
                        onChange={(e) => setNewPhaseName(e.target.value)}
                        className="w-full p-2 border border-line rounded-vds-lg text-xs bg-surface"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-ink-lighter">Thời hạn hoàn thành:</label>
                      <input
                        type="date"
                        value={newPhaseDueDate}
                        onChange={(e) => setNewPhaseDueDate(e.target.value)}
                        className="w-full p-2 border border-line rounded-vds-lg text-xs font-num bg-surface"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-bold text-ink-lighter">Trạng thái:</label>
                      <select
                        value={newPhaseStatus}
                        onChange={(e) => setNewPhaseStatus(e.target.value as PhaseStatus)}
                        className="w-full p-2 border border-line rounded-vds-lg text-xs bg-surface"
                      >
                        <option value="Chưa bắt đầu">⚪ Chưa bắt đầu</option>
                        <option value="Đang triển khai">🔵 Đang triển khai</option>
                        <option value="Bị nghẽn">🔴 Bị nghẽn</option>
                        <option value="Đã hoàn thành">🟢 Đã hoàn thành</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-ink-lighter">Mô tả tóm tắt:</label>
                      <input
                        type="text"
                        placeholder="Nội dung chính cần đạt..."
                        value={newPhaseDesc}
                        onChange={(e) => setNewPhaseDesc(e.target.value)}
                        className="w-full p-2 border border-line rounded-vds-lg text-xs bg-surface"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    {editingPhaseId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPhaseId(null);
                          setNewPhaseName('');
                          setNewPhaseDesc('');
                        }}
                        className="px-3 py-1.5 border border-line rounded-vds-lg bg-surface font-bold"
                      >
                        Hủy sửa
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleAddPhaseToProject}
                      className="px-4 py-1.5 bg-accent-solid hover:bg-accent-solid-hover text-on-color font-bold rounded-vds-lg flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{editingPhaseId ? 'Lưu thay đổi' : 'Xác nhận thêm Phase'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedPhaseProject(null)}
                  className="px-5 py-2 bg-surface-200 hover:bg-surface-300 text-ink-lighter border border-line font-bold rounded-vds-lg transition-colors cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* AUDIT HISTORY MODAL (Direct access from card History icon) */}
      {historyModalProject && (
        <ProjectHistoryModal
          project={historyModalProject}
          isOpen={true}
          onClose={() => setHistoryModalProject(null)}
          members={members}
          onAddManualLog={(newLog) => {
            const updated = {
              ...historyModalProject,
              history: [newLog, ...(historyModalProject.history || [])],
            };
            onUpdateProject(updated);
            setHistoryModalProject(updated);
          }}
        />
      )}
    </div>
  );
};
