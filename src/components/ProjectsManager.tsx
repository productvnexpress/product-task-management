/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { ProjectItem, TaskItem, MemberItem, ProjectPhase, PhaseStatus, ProjectRoles, ProjectLinks, FilterState } from '../types';
import { ProjectHistoryModal } from './ProjectHistoryModal';
import { normalizeAndNumberPhases, formatPhaseName, cleanPhaseTitle } from '../utils/phaseUtils';
import { canCreateProject, canEditProject, canDeleteProject } from '../utils/rbac';
import { sortProjectsAlphabetically } from '../utils/projectSortingUtils';
import {
  FolderKanban,
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
} from 'lucide-react';
import { formatDateShort, formatMemberWithPhone, formatProductMemberWithPhone, formatStakeholderMemberWithPhone } from '../utils/formatters';
import { calculateProjectForecast } from '../utils/projectForecastUtils';
import { getMemberProjectRelation } from '../utils/memberPersonalization';

interface ProjectsManagerProps {
  projects: ProjectItem[];
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
}

export const ProjectsManager: React.FC<ProjectsManagerProps> = ({
  projects,
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

  // Unified Workspace: Default to 'all' projects so everyone works on a single flat surface
  const [projectScope, setProjectScope] = useState<'all' | 'my_projects'>('all');

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
          <span className="w-28 justify-center text-[11px] font-ui font-medium text-[#24a148] bg-[#d5eddc] px-2 py-0.5 rounded-[4px] border border-[#24a148] inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#24a148]" />
            <span>Đã hoàn thành</span>
          </span>
        );
      case 'Đang triển khai':
        return (
          <span className="w-28 justify-center text-[11px] font-ui font-medium text-[#0590de] bg-[#d0eaf9] px-2 py-0.5 rounded-[4px] border border-[#0590de] inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0590de]" />
            <span>Đang triển khai</span>
          </span>
        );
      case 'Bị nghẽn':
        return (
          <span className="w-28 justify-center text-[11px] font-ui font-medium text-[#da1e28] bg-[#f8d4d6] px-2 py-0.5 rounded-[4px] border border-[#da1e28] inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#da1e28]" />
            <span>Bị nghẽn</span>
          </span>
        );
      default:
        return (
          <span className="w-28 justify-center text-[11px] font-ui font-medium text-[#5f5f5f] bg-[#f3f3f3] px-2 py-0.5 rounded-[4px] border border-[#d6d6d6] inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#7f7f7f]" />
            <span>Chưa bắt đầu</span>
          </span>
        );
    }
  };

  // Status counts for Quick Navigator
  const strategicCount = projects.filter((p) => p.isStrategic).length;
  const notStartedCount = projects.filter((p) => p.status === 'Chưa triển khai').length;
  const inProgressCount = projects.filter((p) => p.status === 'Đang triển khai').length;
  const pausedCount = projects.filter((p) => p.status === 'Tạm dừng').length;
  const completedCount = projects.filter((p) => p.status === 'Hoàn thành' || (p.status as string) === 'Đã hoàn thành').length;

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
        if (p.status !== statusFilter && !(statusFilter === 'Hoàn thành' && (p.status as string) === 'Đã hoàn thành')) {
          return false;
        }
      }

      // 6. Search query (either from sidebar or local quick search)
      const q = (filterState?.searchQuery || quickSearch).trim().toLowerCase();
      if (q) {
        const matchName = p.name.toLowerCase().includes(q);
        const matchCode = p.code.toLowerCase().includes(q);
        const matchPO = (p.productOwner || '').toLowerCase().includes(q);
        const matchDesc = (p.description || '').toLowerCase().includes(q);
        const matchObj = (p.objective || '').toLowerCase().includes(q);
        const matchPM = p.roles?.pm && p.roles.pm.some((m) => m.toLowerCase().includes(q));
        if (!matchName && !matchCode && !matchPO && !matchDesc && !matchObj && !matchPM) {
          return false;
        }
      }

      return true;
    });

    return sortProjectsAlphabetically(result);
  }, [projects, filterState, tasks, members, statusFilter, quickSearch, targetMemberForProjects, projectScope]);

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
    <div className="space-y-4 animate-fade-in w-full max-w-[800px] mx-auto">
      {/* PERSPECTIVE CONTROL BAR FOR PROJECTS */}
      <div className="bg-white border border-[#e2e8f0] rounded-[10px] p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-ui font-bold text-[#64748b] flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-[#963861]" />
            <span>Xem dự án:</span>
          </span>

          <button
            type="button"
            onClick={() => setProjectScope('all')}
            className={`px-3 py-1.5 rounded-[6px] text-xs font-ui font-bold transition-all cursor-pointer ${
              projectScope === 'all'
                ? 'bg-[#1e293b] text-white shadow-2xs'
                : 'bg-[#f1f5f9] text-[#475569] hover:bg-[#e2e8f0]'
            }`}
          >
            🌐 Tất cả ({projects.length})
          </button>

          {targetMemberForProjects && (
            <button
              type="button"
              onClick={() => setProjectScope('my_projects')}
              className={`px-3 py-1.5 rounded-[6px] text-xs font-ui font-bold transition-all cursor-pointer ${
                projectScope === 'my_projects'
                  ? 'bg-[#963861] text-white shadow-2xs'
                  : 'bg-[#fcf0f5] text-[#963861] hover:bg-[#fae6ee] border border-[#f3c2d4]'
              }`}
            >
              {activeProductMember && currentAuthUser && activeProductMember.id !== currentAuthUser.id
                ? `👤 Dự án của ${activeProductMember.name.split(' ').slice(-1)[0]} (${myProjectsCount})`
                : `⭐ Dự án của tôi (${myProjectsCount})`}
            </button>
          )}
        </div>

        {activeProductMember && (
          <div className="flex items-center gap-2 ml-auto text-xs font-ui">
            <span className="text-[#64748b]">
              Góc nhìn: <strong className="text-[#1e293b]">{activeProductMember.name}</strong>
            </span>
            <button
              type="button"
              onClick={() => {
                onSelectProjectFilter('all');
                setProjectScope('all');
              }}
              className="text-[#963861] hover:underline font-bold"
            >
              Về Toàn ban
            </button>
          </div>
        )}
      </div>

      {/* QUICK FILTER BAR */}
      <div className="bg-white rounded-[4px] border border-[#d6d6d6] px-3 py-2 flex flex-wrap items-center justify-between gap-2.5 transition-all">
        {/* Left: Quick Search Input */}
        <div className="relative w-52 sm:w-64">
          <Search className="w-3.5 h-3.5 text-[#7f7f7f] absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm mã hoặc tên dự án..."
            value={quickSearch}
            onChange={(e) => setQuickSearch(e.target.value)}
            className="w-full h-8 pl-8 pr-6 text-xs font-body bg-[#fafafa] border border-[#d6d6d6] rounded-[4px] focus:outline-hidden focus:border-[#466fa1] text-[#202020] placeholder-[#9f9f9f] transition-all"
          />
          {quickSearch && (
            <button
              type="button"
              onClick={() => setQuickSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#7f7f7f] hover:text-[#202020] text-xs font-bold cursor-pointer"
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
            className={`h-8 px-2.5 rounded-[4px] border transition-colors whitespace-nowrap cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-[#f1f5f9] text-[#1e293b] border-[#cbd5e1] font-bold'
                : 'bg-white text-[#5f5f5f] border-[#d6d6d6] hover:bg-[#f8fafc]'
            }`}
          >
            Tất cả ({projects.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('strategic')}
            className={`h-8 px-2.5 rounded-[4px] border transition-colors whitespace-nowrap cursor-pointer ${
              statusFilter === 'strategic'
                ? 'bg-[#b25e00] text-white border-[#b25e00] font-bold shadow-xs'
                : 'bg-[#fffdf5] text-[#b25e00] border-[#fed7aa] hover:bg-[#fff7ed]'
            }`}
          >
            ⭐ Chiến lược ({strategicCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('Chưa triển khai')}
            className={`h-8 px-2.5 rounded-[4px] border transition-colors whitespace-nowrap cursor-pointer ${
              statusFilter === 'Chưa triển khai'
                ? 'bg-[#52525b] text-white border-[#52525b] font-bold'
                : 'bg-[#f4f4f5] text-[#52525b] border-[#e4e4e7] hover:bg-[#ebebee]'
            }`}
          >
            Chưa triển khai ({notStartedCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('Đang triển khai')}
            className={`h-8 px-2.5 rounded-[4px] border transition-colors whitespace-nowrap cursor-pointer ${
              statusFilter === 'Đang triển khai'
                ? 'bg-[#466fa1] text-white border-[#466fa1] font-bold'
                : 'bg-[#eef4fb] text-[#1d508d] border-[#c2d7f0] hover:bg-[#e2eefa]'
            }`}
          >
            Đang triển khai ({inProgressCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('Tạm dừng')}
            className={`h-8 px-2.5 rounded-[4px] border transition-colors whitespace-nowrap cursor-pointer ${
              statusFilter === 'Tạm dừng'
                ? 'bg-[#da1e28] text-white border-[#da1e28] font-bold'
                : 'bg-[#f8d4d6] text-[#7b1117] border-[#ffd0d3] hover:bg-[#f5c6c9]'
            }`}
          >
            Tạm dừng ({pausedCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('Hoàn thành')}
            className={`h-8 px-2.5 rounded-[4px] border transition-colors whitespace-nowrap cursor-pointer ${
              statusFilter === 'Hoàn thành'
                ? 'bg-[#24a148] text-white border-[#24a148] font-bold'
                : 'bg-[#e2f6e9] text-[#1b7a37] border-[#b8e8c4] hover:bg-[#d0f0dc]'
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

          return (
            <div
              key={proj.id}
              id={`project-card-${proj.id}`}
              className={`bg-white rounded-[4px] border p-5 transition-all flex flex-col justify-between space-y-4 group ${
                memberRelation?.isRelated
                  ? 'border-[#963861]/40 shadow-xs'
                  : 'border-[#d6d6d6]'
              }`}
            >
              <div className="space-y-3">
                {/* Header Row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3
                      onClick={() => openProjectDrawer(proj)}
                      className="font-ui text-base font-bold text-[#202020] hover:text-[#b13460] cursor-pointer transition-colors leading-snug flex items-center gap-1.5"
                      title="Nhấp để xem thông tin chi tiết (Right Sidebar Drawer khổ lớn)"
                    >
                      {proj.isStrategic && (
                        <span className="text-[#d97706] text-base shrink-0" title="Dự án chiến lược - Toà soạn đặc biệt quan tâm">
                          ⭐
                        </span>
                      )}
                      <span>{proj.name}</span>
                      <PanelRight className="w-4 h-4 text-[#b13460] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </h3>

                    {/* History Log Button according to AGENTS.md Standard */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setHistoryModalProject(proj);
                      }}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-ui font-semibold text-[#7f7f7f] hover:text-[#b13460] bg-[#fafafa] hover:bg-[#fcf0f5] rounded-[4px] border border-[#e6e6e6] hover:border-[#f3c2d4] transition-colors cursor-pointer"
                      title={`Xem lịch sử thay đổi dự án (${proj.history?.length || 0} bản ghi)`}
                    >
                      <History className="w-3 h-3 text-[#b13460]" />
                      <span>Lịch sử</span>
                      {proj.history && proj.history.length > 0 && (
                        <span className="font-num font-bold text-[#b13460]">({proj.history.length})</span>
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {proj.isStrategic && (
                      <span className="text-xs font-ui font-bold px-2 py-0.5 rounded-[4px] bg-[#fff8e6] text-[#b25e00] border border-[#ffe3a3] inline-flex items-center gap-1 shadow-2xs">
                        <Sparkles className="w-3 h-3 text-[#d97706]" />
                        <span>Chiến lược</span>
                      </span>
                    )}
                    <span
                      className={`text-xs font-ui font-bold px-2.5 py-1 rounded-[4px] border ${
                        proj.status === 'Đang triển khai'
                          ? 'bg-[#eef4fb] text-[#1d508d] border-[#c2d7f0]'
                          : proj.status === 'Chưa triển khai'
                          ? 'bg-[#f4f4f5] text-[#52525b] border-[#e4e4e7]'
                          : proj.status === 'Tạm dừng'
                          ? 'bg-[#fff0f1] text-[#da1e28] border-[#ffd0d3]'
                          : 'bg-[#e2f6e9] text-[#24a148] border-[#b8e8c4]'
                      }`}
                    >
                      {proj.status}
                    </span>
                  </div>
                </div>

                {/* Mục tiêu dự án (thay thế phần mô tả theo yêu cầu) */}
                <div className="space-y-1.5 text-xs font-ui">
                  <div className="text-[11px] text-[#1b7a37] bg-[#f2faf4] px-2.5 py-2 rounded-[4px] border border-[#d2edd7] flex items-start gap-1.5">
                    <Target className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#24a148]" />
                    <div className="flex-1 space-y-0.5">
                      <span className="font-bold block text-[#1b7a37]">Mục tiêu & KPI:</span>
                      <p className="text-[#303030] leading-relaxed line-clamp-2 font-normal">
                        {proj.objective || proj.description || 'Chưa cập nhật mục tiêu dự án.'}
                      </p>
                    </div>
                  </div>
                  {proj.productOwner && (
                    <div className="text-[11px] text-[#5f5f5f] flex items-center gap-1.5 px-0.5">
                      <User className="w-3 h-3 text-[#b13460]" />
                      <span><strong className="text-[#202020]">Product Owner:</strong> {formatPoDisplay(proj.productOwner)}</span>
                    </div>
                  )}
                </div>

                {/* ROLE BREAKDOWN SECTION (Phân công theo 4 vai trò chuẩn theo AGENTS.md) */}
                <div className="pt-2 border-t border-[#f0f0f0] space-y-2">
                  <div className="text-xs font-ui font-bold text-[#5f5f5f] flex items-center gap-1">
                    <User className="w-3 h-3" />
                    <span>Nhân sự phụ trách theo vai trò:</span>
                  </div>

                  {hasRoles ? (
                    <div className="grid grid-cols-2 gap-2 text-xs font-body">
                      {/* Product Manager */}
                      {proj.roles?.pm && proj.roles.pm.length > 0 && (
                        <div className="bg-[#fafafa] p-2 rounded-[4px] border border-[#f0f0f0] flex flex-col gap-0.5">
                          <div className="flex items-center gap-1 text-[11px] font-bold text-[#b13460]">
                            <Briefcase className="w-3 h-3" />
                            <span>Product Manager:</span>
                          </div>
                          <div className="text-[#202020] font-medium pl-4">
                            {proj.roles.pm.map((r) => formatProductMemberWithPhone(r, members)).join(', ')}
                          </div>
                        </div>
                      )}

                      {/* Designer */}
                      {proj.roles?.designer && proj.roles.designer.length > 0 && (
                        <div className="bg-[#fafafa] p-2 rounded-[4px] border border-[#f0f0f0] flex flex-col gap-0.5">
                          <div className="flex items-center gap-1 text-[11px] font-bold text-[#b26b00]">
                            <Palette className="w-3 h-3" />
                            <span>UX/UI Designer:</span>
                          </div>
                          <div className="text-[#202020] font-medium pl-4">
                            {proj.roles.designer.map((r) => formatProductMemberWithPhone(r, members)).join(', ')}
                          </div>
                        </div>
                      )}

                      {/* SEO */}
                      {proj.roles?.seo && proj.roles.seo.length > 0 && (
                        <div className="bg-[#fafafa] p-2 rounded-[4px] border border-[#f0f0f0] flex flex-col gap-0.5">
                          <div className="flex items-center gap-1 text-[11px] font-bold text-[#24a148]">
                            <Search className="w-3 h-3" />
                            <span>SEO Specialist:</span>
                          </div>
                          <div className="text-[#202020] font-medium pl-4">
                            {proj.roles.seo.map((r) => formatProductMemberWithPhone(r, members)).join(', ')}
                          </div>
                        </div>
                      )}

                      {/* Data */}
                      {proj.roles?.data && proj.roles.data.length > 0 && (
                        <div className="bg-[#fafafa] p-2 rounded-[4px] border border-[#f0f0f0] flex flex-col gap-0.5">
                          <div className="flex items-center gap-1 text-[11px] font-bold text-[#1d508d]">
                            <BarChart3 className="w-3 h-3" />
                            <span>Data Specialist:</span>
                          </div>
                          <div className="text-[#202020] font-medium pl-4">
                            {proj.roles.data.map((r) => formatProductMemberWithPhone(r, members)).join(', ')}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-[#5f5f5f] bg-[#fafafa] p-2 rounded-[4px] border border-[#f0f0f0]">
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
                <div className="pt-3 border-t border-[#f0f0f0] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-[#b13460]" />
                      <span className="font-ui font-bold text-[#202020]">
                        Timeline
                      </span>
                      {phaseList.length > 0 && (
                        <span className="font-ui text-[11px] text-[#5f5f5f] bg-[#f3f3f3] px-1.5 py-0.5 rounded-[4px] border border-[#d6d6d6]">
                          {completedPhases.length}/{phaseList.length} xong
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => openProjectDrawer(proj)}
                      className="text-[11px] font-ui text-[#466fa1] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Chi tiết</span>
                      <PanelRight className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Visual Stepper Timeline Box (Vertical Layout) */}
                  <div className="bg-[#fafafa] p-3.5 rounded-[4px] border border-[#d6d6d6] space-y-3">
                    <div className="relative pl-5 space-y-3.5 before:absolute before:left-[7px] before:top-2.5 before:bottom-2.5 before:w-[2px] before:bg-[#d6d6d6]">
                      {/* Start Node */}
                      <div className="relative flex flex-col sm:flex-row sm:items-center gap-2 text-xs font-ui">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="absolute -left-[17px] w-3 h-3 rounded-full bg-[#963861] border-2 border-white ring-1 ring-[#f4c2d7] shrink-0" />
                          <span className="font-bold text-[#5f5f5f]">Bắt đầu:</span>
                        </div>
                        <div className="w-32 shrink-0 font-ui text-[11px] text-[#5f5f5f]">
                          {formatDateShort(proj.startDate || '2026-09-01')}
                        </div>
                        <div className="w-32 shrink-0 flex items-center">
                          <span className="w-28 justify-center text-center text-[11px] font-ui font-medium text-[#7f7f7f] bg-white px-2 py-0.5 rounded-[4px] border border-[#d6d6d6] inline-flex items-center">
                            Khởi động
                          </span>
                        </div>
                        <div className="w-6 shrink-0" />
                      </div>

                      {/* Phase Nodes */}
                      {phaseList.length === 0 ? (
                        <div className="text-[11px] text-[#7f7f7f] font-ui">Chưa thiết lập giai đoạn nào.</div>
                      ) : (
                        phaseList.map((ph, idx) => {
                          const isDone = ph.status === 'Đã hoàn thành';
                          const isBlocked = ph.status === 'Bị nghẽn';
                          const isInProg = ph.status === 'Đang triển khai';
                          const dotBg = isDone ? 'bg-[#24a148]' : isBlocked ? 'bg-[#da1e28]' : isInProg ? 'bg-[#0590de]' : 'bg-[#9f9f9f]';
                          const ringColor = isDone ? 'ring-[#24a148]/30' : isBlocked ? 'ring-[#da1e28]/30' : isInProg ? 'ring-[#0590de]/30' : 'ring-[#d6d6d6]';

                          return (
                            <div key={ph.id} className="relative flex flex-col sm:flex-row sm:items-center gap-2 text-xs font-ui group/phase">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <div className={`absolute -left-[18px] w-3.5 h-3.5 rounded-full ${dotBg} border-2 border-white ring-2 ${ringColor} flex items-center justify-center text-white text-[8px] font-bold shrink-0`}>
                                  {isDone ? '✓' : isBlocked ? '!' : (idx + 1)}
                                </div>
                                <span className="font-bold text-[#202020] truncate" title={ph.name}>
                                  {formatPhaseName(ph.name, idx)}
                                </span>
                              </div>

                              <div className="w-32 shrink-0 font-ui text-[11px] text-[#5f5f5f]">
                                {formatDateShort(ph.dueDate)}
                              </div>

                              <div className="w-32 shrink-0 flex items-center">
                                {renderPhaseStatusBadge(ph.status)}
                              </div>

                              <div className="w-6 shrink-0 flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => handleOpenPhaseModalWithPhase(proj, ph)}
                                  className="opacity-0 group-hover/phase:opacity-100 p-1 text-[#7f7f7f] hover:text-[#b13460] hover:bg-[#fce6eb] rounded transition-all cursor-pointer"
                                  title="Chỉnh sửa phase này"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}

                      {/* Go-Live Target Node */}
                      <div className="relative flex flex-col sm:flex-row sm:items-center gap-2 text-xs font-ui pt-0.5">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="absolute -left-[18px] w-3.5 h-3.5 rounded-full bg-[#b13460] text-white flex items-center justify-center text-[8px] font-bold border-2 border-white ring-2 ring-[#f3c2d4] shrink-0">
                            ★
                          </div>
                          <span className="font-bold text-[#b13460]">Mốc ra mắt:</span>
                        </div>

                        <div className="w-32 shrink-0 font-ui font-bold text-[11px] text-[#202020]">
                          {formatDateShort(proj.targetDate)}
                        </div>

                        <div className="w-32 shrink-0 flex items-center">
                          <span className="w-28 justify-center text-center text-[11px] font-ui font-bold text-[#b13460] bg-[#fcf0f5] px-2 py-0.5 rounded-[4px] border border-[#f3c2d4] inline-flex items-center">
                            Ra mắt
                          </span>
                        </div>

                        <div className="w-6 shrink-0" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* PHẦN 3: LIÊN KẾT DỰ ÁN (PROJECT LINKS CHUẨN AGENTS.MD) */}
                {Boolean(
                  proj.linkOrderTech ||
                  proj.linkChat ||
                  proj.linkDashboard ||
                  proj.linkReport ||
                  proj.linkBeta ||
                  proj.linkProduction ||
                  (proj.customLinks && proj.customLinks.length > 0)
                ) && (
                  <div className="pt-2.5 border-t border-[#f0f0f0] space-y-1.5">
                    <div className="text-[11px] font-ui font-bold text-[#5f5f5f] flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <ExternalLink className="w-3 h-3 text-[#b13460]" />
                        <span>Liên kết vận hành & nghiệm thu:</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {proj.linkOrderTech && (
                        <a
                          href={proj.linkOrderTech}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[3px] bg-[#fafafa] border border-[#d6d6d6] hover:bg-[#fcf0f5] hover:border-[#b13460] hover:text-[#b13460] text-[#5f5f5f] text-[11px] font-medium transition-colors"
                          title="Yêu cầu kỹ thuật / Ticket Jira"
                        >
                          <FileText className="w-3 h-3 text-[#b13460]" />
                          <span>Tech</span>
                        </a>
                      )}
                      {proj.linkChat && (
                        <a
                          href={proj.linkChat}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[3px] bg-[#fafafa] border border-[#d6d6d6] hover:bg-[#fcf0f5] hover:border-[#24a148] hover:text-[#24a148] text-[#5f5f5f] text-[11px] font-medium transition-colors"
                          title="Nhóm trao đổi trực tuyến"
                        >
                          <MessageSquare className="w-3 h-3 text-[#24a148]" />
                          <span>Chat</span>
                        </a>
                      )}
                      {proj.linkDashboard && (
                        <a
                          href={proj.linkDashboard}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[3px] bg-[#fafafa] border border-[#d6d6d6] hover:bg-[#fcf0f5] hover:border-[#b26b00] hover:text-[#b26b00] text-[#5f5f5f] text-[11px] font-medium transition-colors"
                          title="Bảng theo dõi chỉ số đo lường hiệu quả"
                        >
                          <LayoutDashboard className="w-3 h-3 text-[#b26b00]" />
                          <span>Dashboard</span>
                        </a>
                      )}
                      {proj.linkReport && (
                        <a
                          href={proj.linkReport}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[3px] bg-[#fafafa] border border-[#d6d6d6] hover:bg-[#fcf0f5] hover:border-[#1d508d] hover:text-[#1d508d] text-[#5f5f5f] text-[11px] font-medium transition-colors"
                          title="Báo cáo tổng kết / nghiệm thu"
                        >
                          <TrendingUp className="w-3 h-3 text-[#1d508d]" />
                          <span>Report</span>
                        </a>
                      )}
                      {proj.linkBeta && (
                        <a
                          href={proj.linkBeta}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[3px] bg-[#fafafa] border border-[#d6d6d6] hover:bg-[#fcf0f5] hover:border-[#ca8a04] hover:text-[#ca8a04] text-[#5f5f5f] text-[11px] font-medium transition-colors"
                          title="Môi trường thử nghiệm Beta"
                        >
                          <FlaskConical className="w-3 h-3 text-[#ca8a04]" />
                          <span>Beta</span>
                        </a>
                      )}
                      {proj.linkProduction && (
                        <a
                          href={proj.linkProduction}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[3px] bg-[#fafafa] border border-[#d6d6d6] hover:bg-[#fcf0f5] hover:border-[#24a148] hover:text-[#24a148] text-[#5f5f5f] text-[11px] font-medium transition-colors"
                          title="Phiên bản chính thức trên VnExpress"
                        >
                          <Globe className="w-3 h-3 text-[#24a148]" />
                          <span>Prod</span>
                        </a>
                      )}
                      {proj.customLinks?.map((cl) => (
                        <a
                          key={cl.id}
                          href={cl.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[3px] bg-[#fafafa] border border-[#d6d6d6] hover:bg-[#fcf0f5] hover:border-[#466fa1] hover:text-[#466fa1] text-[#5f5f5f] text-[11px] font-medium transition-colors"
                        >
                          <ExternalLink className="w-3 h-3 text-[#466fa1]" />
                          <span>{cl.title}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* PHẦN 4: GHI CHÚ ĐIỀU HÀNH & BIÊN BẢN HỌP CHUẨN AGENTS.MD */}
                {proj.notes && proj.notes.length > 0 && (
                  <div
                    onClick={() => openProjectDrawer(proj)}
                    className="p-2.5 bg-[#fbfbfb] rounded-[4px] border border-[#e6e6e6] text-xs font-ui cursor-pointer hover:bg-[#f5f5f5] hover:border-[#b13460]/40 transition-colors"
                    title="Nhấp để xem toàn bộ danh sách ghi chú tại Right Sidebar Drawer"
                  >
                    <div className="flex items-center justify-between text-[11px] text-[#7f7f7f] mb-1">
                      <span className="font-bold flex items-center gap-1 text-[#202020]">
                        <FileText className="w-3 h-3 text-[#b13460]" />
                        <span>Ghi chú điều hành gần nhất ({proj.notes.length}):</span>
                      </span>
                      <span className="font-num text-[10px] text-[#7f7f7f]">{proj.notes[proj.notes.length - 1].createdAt}</span>
                    </div>
                    <div className="text-[#5f5f5f] text-[11px] line-clamp-1 italic">
                      <strong className="text-[#202020] not-italic">{proj.notes[proj.notes.length - 1].author}:</strong> "{proj.notes[proj.notes.length - 1].content}"
                    </div>
                  </div>
                )}
              </div>

              {/* Task statistics breakdown & actions */}
              <div className="pt-4 border-t border-[#f0f0f0] flex items-center justify-between text-xs font-ui">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-[#5f5f5f]">
                    <Clock className="w-3.5 h-3.5 text-[#b13460]" />
                    <span>Đang làm: <strong className="font-num text-[#202020]">{activeTasks.length}</strong></span>
                  </div>

                  <div className="flex items-center gap-1 text-[#24a148]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#24a148]" />
                    <span>Xong: <strong className="font-num">{completedTasks.length}</strong></span>
                  </div>

                  {blockedTasks.length > 0 && (
                    <span className="text-[#da1e28] font-bold bg-[#f8d4d6] px-1.5 py-0.5 rounded-[4px] border border-[#da1e28]">
                      {blockedTasks.length} nghẽn
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openProjectDrawer(proj)}
                    className="px-2.5 py-1 bg-[#fcf0f5] text-[#b13460] border border-[#f3c2d4] hover:bg-[#b13460] hover:text-white rounded-[4px] transition-colors font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                    title="Xem thông tin chi tiết dự án"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Chi tiết</span>
                  </button>

                  <button
                    onClick={() => onSelectProjectFilter(proj.id)}
                    className="px-3 py-1 bg-[#466fa1] text-white rounded-[4px] hover:bg-[#345378] transition-colors font-bold text-xs cursor-pointer"
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
                      className="p-1.5 text-[#7f7f7f] hover:text-[#da1e28] hover:bg-[#fff0f1] rounded-[4px] cursor-pointer"
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

      {/* QUICK PHASE MANAGEMENT MODAL */}
      {selectedPhaseProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-[4px] border border-[#d6d6d6] overflow-hidden my-8 space-y-0">
            {/* Modal Header */}
            <div className="p-5 bg-[#fafafa] border-b border-[#e6e6e6] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#b13460]" />
                <div>
                  <h3 className="font-ui text-base font-bold text-[#202020]">
                    Quản lý Giai đoạn (Phases)
                  </h3>
                  <p className="text-xs text-[#5f5f5f]">{selectedPhaseProject.name}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPhaseProject(null)}
                className="p-1 rounded-full text-[#7f7f7f] hover:text-[#202020] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs font-body max-h-[75vh] overflow-y-auto">
              {/* Existing Phases List */}
              <div className="space-y-3">
                <h4 className="font-ui font-bold text-[#202020] text-sm">Danh sách Giai đoạn hiện tại:</h4>

                {(!selectedPhaseProject.phases || selectedPhaseProject.phases.length === 0) ? (
                  <div className="p-4 bg-[#fafafa] border border-dashed border-[#d6d6d6] rounded-[4px] text-center text-[#7f7f7f]">
                    Dự án này chưa được chia giai đoạn. Vui lòng thêm giai đoạn bên dưới.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedPhaseProject.phases.map((ph, idx) => (
                      <div key={ph.id} className="p-3 bg-white rounded-[4px] border border-[#d6d6d6] space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 font-ui font-bold text-[#202020]">
                            <span className="text-[#b13460] font-num">#{idx + 1}</span>
                            <span>{formatPhaseName(ph.name, idx)}</span>
                          </div>
                          {renderPhaseStatusBadge(ph.status)}
                        </div>

                        {ph.description && <p className="text-xs text-[#5f5f5f]">{ph.description}</p>}

                        <div className="flex flex-wrap items-center justify-between pt-1 border-t border-[#f0f0f0] gap-2">
                          <div className="text-[11px] font-ui text-[#7f7f7f] flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-[#b13460]" />
                            <span><strong>{formatDateShort(ph.dueDate)}</strong></span>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Quick status change buttons */}
                            <select
                              value={ph.status}
                              onChange={(e) => handleQuickStatusChange(ph.id, e.target.value as PhaseStatus)}
                              className="text-[11px] p-1 border border-[#d6d6d6] rounded-[4px] bg-[#fafafa]"
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
                              className="p-1 text-[#7f7f7f] hover:text-[#202020]"
                              title="Sửa giai đoạn"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleDeletePhaseFromProject(ph.id)}
                              className="p-1 text-[#7f7f7f] hover:text-[#da1e28]"
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
              <div className="p-4 bg-[#fcf0f5] border border-[#f3c2d4] rounded-[10px] space-y-3">
                <div className="font-ui font-bold text-[#b13460] text-xs flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Plus className="w-4 h-4" />
                    <span>{editingPhaseId ? 'Cập nhật giai đoạn' : 'Thêm giai đoạn triển khai mới'}</span>
                  </div>
                  <span className="text-[10px] text-[#7f7f7f] italic font-normal">
                    * Tự động sinh tiền tố & tự xếp theo thời gian
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-bold text-[#5f5f5f]">Nội dung giai đoạn:</label>
                      <input
                        type="text"
                        placeholder="VD: Khảo sát & PRD, Thiết kế..."
                        value={newPhaseName}
                        onChange={(e) => setNewPhaseName(e.target.value)}
                        className="w-full p-2 border border-[#d6d6d6] rounded-[6px] text-xs bg-white"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-[#5f5f5f]">Thời hạn hoàn thành:</label>
                      <input
                        type="date"
                        value={newPhaseDueDate}
                        onChange={(e) => setNewPhaseDueDate(e.target.value)}
                        className="w-full p-2 border border-[#d6d6d6] rounded-[6px] text-xs font-num bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-bold text-[#5f5f5f]">Trạng thái:</label>
                      <select
                        value={newPhaseStatus}
                        onChange={(e) => setNewPhaseStatus(e.target.value as PhaseStatus)}
                        className="w-full p-2 border border-[#d6d6d6] rounded-[6px] text-xs bg-white"
                      >
                        <option value="Chưa bắt đầu">⚪ Chưa bắt đầu</option>
                        <option value="Đang triển khai">🔵 Đang triển khai</option>
                        <option value="Bị nghẽn">🔴 Bị nghẽn</option>
                        <option value="Đã hoàn thành">🟢 Đã hoàn thành</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-[#5f5f5f]">Mô tả tóm tắt:</label>
                      <input
                        type="text"
                        placeholder="Nội dung chính cần đạt..."
                        value={newPhaseDesc}
                        onChange={(e) => setNewPhaseDesc(e.target.value)}
                        className="w-full p-2 border border-[#d6d6d6] rounded-[6px] text-xs bg-white"
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
                        className="px-3 py-1.5 border border-[#d6d6d6] rounded-[6px] bg-white font-bold"
                      >
                        Hủy sửa
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleAddPhaseToProject}
                      className="px-4 py-1.5 bg-[#b13460] hover:bg-[#8f274c] text-white font-bold rounded-[6px] flex items-center gap-1"
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
                  className="px-5 py-2 bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#334155] border border-[#cbd5e1] font-bold rounded-[6px] transition-colors cursor-pointer"
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
