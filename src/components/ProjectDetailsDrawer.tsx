/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ProjectItem,
  ProjectStatus,
  TaskItem,
  MemberItem,
  ProjectPhase,
  PhaseStatus,
  ProjectRoles,
  ProjectLinks,
  ProjectCustomLink,
  ProjectNoteItem,
  ProjectHistoryLog,
  ProjectChecklistItem,
  FolderItem,
} from '../types';
import { getFlattenedFolderOptions, getFolderPath, inferProjectFolderId, INITIAL_FOLDERS } from '../utils/folderUtils';
import { ProjectChecklistSection } from './ProjectChecklistSection';
import { normalizeProjectChecklist } from '../data/defaultProjectChecklist';
import { wmsDataService } from '../services/wmsDataService';
import {
  X,
  Calendar,
  User,
  UserCheck,
  ExternalLink,
  Layers,
  Clock,
  CheckCircle2,
  Briefcase,
  Palette,
  Search,
  BarChart3,
  MessageSquare,
  FileText,
  LayoutDashboard,
  TrendingUp,
  FlaskConical,
  Globe,
  Target,
  FolderKanban,
  Save,
  Plus,
  Trash2,
  Check,
  ArrowRight,
  Edit2,
  Eye,
  Link2,
  Send,
  History,
  Share2,
  CheckSquare,
} from './vds/icons';
import { VdsButton } from './vds';
import { getProjectFriendlyUrl, copyUrlToClipboard } from '../utils/urlRouting';
import { formatDateShort, formatDateWithEnDay, formatMemberWithPhone, formatProductMemberWithPhone, formatStakeholderMemberWithPhone, formatMemberListWithPhone } from '../utils/formatters';
import { ProjectTimelineView } from './ProjectTimelineView';
import { calculateProjectForecast } from '../utils/projectForecastUtils';
import { ProjectHistoryModal } from './ProjectHistoryModal';
import { getUserRole } from '../utils/rbac';
import {
  recordProjectOverviewChanges,
  recordPhaseUpdateLog,
  createProjectInitialLog,
} from '../utils/projectLogUtils';
import {
  cleanPhaseTitle,
  formatPhaseName,
  sortPhasesByDate,
  normalizeAndNumberPhases,
} from '../utils/phaseUtils';
import { canEditProject, canEditProjectLinks } from '../utils/rbac';
import { normalizeProjectStatus, generateProjectCode } from '../utils/projectSortingUtils';

interface ProjectDetailsDrawerProps {
  project: ProjectItem | null;
  projects?: ProjectItem[];
  folders?: FolderItem[];
  tasks: TaskItem[];
  members: MemberItem[];
  isOpen: boolean;
  onClose: () => void;
  onSaveProject: (updatedProject: ProjectItem) => void;
  onCreateProject?: (newProject: Omit<ProjectItem, 'id'>) => void;
  onSelectProjectTasks: (projectId: string) => void;
  isCreateMode?: boolean;
  activeProductMember?: MemberItem | null;
  currentAuthUser?: MemberItem | null;
  onOpenFolderManager?: () => void;
}

export const ProjectDetailsDrawer: React.FC<ProjectDetailsDrawerProps> = ({
  project,
  projects = [],
  folders = INITIAL_FOLDERS,
  tasks,
  members,
  isOpen,
  onClose,
  onSaveProject,
  onCreateProject,
  onSelectProjectTasks,
  isCreateMode = false,
  activeProductMember,
  currentAuthUser,
  onOpenFolderManager,
}) => {
  const effectiveUser = currentAuthUser || activeProductMember;
  const userRole = getUserRole(effectiveUser);
  const canManagePhases = userRole === 'Admin' || userRole === 'Manager';
  // Mode state: Default to false (View Mode) as requested
  const [isEditing, setIsEditing] = useState(false);

  // Form State for Cột Trái (Left Column)
  const [name, setName] = useState(project?.name || '');
  const [code, setCode] = useState(project?.code || '');
  const [folderId, setFolderId] = useState(project?.folderId || (project ? inferProjectFolderId(project) : 'folder-vne'));
  const [isCodeManuallyEdited, setIsCodeManuallyEdited] = useState(false);
  const [description, setDescription] = useState(project?.description || '');
  const [objective, setObjective] = useState(project?.objective || '');
  const [productOwner, setProductOwner] = useState(project?.productOwner || '');
  const [poSearchQuery, setPoSearchQuery] = useState('');
  const [isPoDropdownOpen, setIsPoDropdownOpen] = useState(false);
  const [poFilterDept, setPoFilterDept] = useState<string>('Tất cả');

  const [status, setStatus] = useState<ProjectStatus>(normalizeProjectStatus(project?.status) || 'Đang triển khai');
  const [isStrategic, setIsStrategic] = useState<boolean>(project?.isStrategic || false);
  const [startDate, setStartDate] = useState(project?.startDate || '2026-09-01');
  const [targetDate, setTargetDate] = useState(project?.targetDate || '2026-11-30');

  // Roles State
  const [pmMembers, setPmMembers] = useState<string[]>(project?.roles?.pm || []);
  const [designerMembers, setDesignerMembers] = useState<string[]>(project?.roles?.designer || []);
  const [seoMembers, setSeoMembers] = useState<string[]>(project?.roles?.seo || []);
  const [dataMembers, setDataMembers] = useState<string[]>(project?.roles?.data || []);

  // Links State
  const [linkOrderTech, setLinkOrderTech] = useState(
    project?.links?.orderTech !== undefined ? (project.links.orderTech || '') : (project?.linkOrderTech || '')
  );
  const [linkChat, setLinkChat] = useState(
    project?.links?.chat !== undefined ? (project.links.chat || '') : (project?.linkChat || '')
  );
  const [linkDashboard, setLinkDashboard] = useState(
    project?.links?.dashboard !== undefined ? (project.links.dashboard || '') : (project?.linkDashboard || '')
  );
  const [linkReport, setLinkReport] = useState(
    project?.links?.report !== undefined ? (project.links.report || '') : (project?.linkReport || '')
  );
  const [linkBeta, setLinkBeta] = useState(
    project?.links?.beta !== undefined ? (project.links.beta || '') : (project?.linkBeta || '')
  );
  const [linkProduction, setLinkProduction] = useState(
    project?.links?.production !== undefined ? (project.links.production || '') : (project?.linkProduction || '')
  );
  const [customLinks, setCustomLinks] = useState<ProjectCustomLink[]>(
    project?.links?.custom || project?.customLinks || []
  );

  // Section 3: Links Editing State (cho phép UX/UI Designer và PM chỉnh sửa riêng phần Links)
  const [isEditingLinksSection, setIsEditingLinksSection] = useState(false);

  // Quick Add Custom Link State
  const [isAddingCustomLink, setIsAddingCustomLink] = useState(false);
  const [newCustomTitle, setNewCustomTitle] = useState('');
  const [newCustomUrl, setNewCustomUrl] = useState('');

  // Phases State
  const [phases, setPhases] = useState<ProjectPhase[]>(project?.phases || []);

  // New Phase Form State
  const [isAddingPhase, setIsAddingPhase] = useState(false);
  const [newPhaseName, setNewPhaseName] = useState('');
  const [newPhaseDueDate, setNewPhaseDueDate] = useState('2026-10-15');
  const [newPhaseStatus, setNewPhaseStatus] = useState<PhaseStatus>('Chưa bắt đầu');
  const [newPhaseDesc, setNewPhaseDesc] = useState('');

  // Notes State
  const [notes, setNotes] = useState<ProjectNoteItem[]>(project?.notes || []);
  const [newNoteAuthor, setNewNoteAuthor] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');

  // Checklist State (34 tiêu chuẩn Product Management)
  const [checklist, setChecklist] = useState<ProjectChecklistItem[]>(() =>
    normalizeProjectChecklist(project?.checklist)
  );

  const handleUpdateChecklist = (updatedChecklist: ProjectChecklistItem[]) => {
    setChecklist(updatedChecklist);
    if (project && !isCreateMode) {
      const updatedProject: ProjectItem = {
        ...project,
        checklist: updatedChecklist,
      };
      onSaveProject(updatedProject);
    }
  };

  // Tự động đồng bộ khi Master Checklist Template thay đổi từ màn hình Thiết lập
  useEffect(() => {
    const handleTemplateUpdated = () => {
      setChecklist(normalizeProjectChecklist(project?.checklist));
    };
    window.addEventListener('wms_checklist_template_updated', handleTemplateUpdated);
    return () => window.removeEventListener('wms_checklist_template_updated', handleTemplateUpdated);
  }, [project]);

  // History Log Modal State
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Copy Friendly URL State
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyLink = async () => {
    if (!project) return;
    const url = getProjectFriendlyUrl(project);
    const success = await copyUrlToClipboard(url);
    if (success) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };
  const [historyLogs, setHistoryLogs] = useState<ProjectHistoryLog[]>([]);

  // Toast / Save notification state
  const [isSavedToast, setIsSavedToast] = useState(false);

  const currentActorName = currentAuthUser?.name || activeProductMember?.name || members[0]?.name || 'Hệ thống';

  // Quick Navigation Section Menu State
  const scrollBodyRef = useRef<HTMLDivElement>(null);
  const [activeNav, setActiveNav] = useState<string>('project-drawer-section-overview');

  const scrollToSection = (sectionId: string) => {
    setActiveNav(sectionId);
    const container = scrollBodyRef.current;
    const target = document.getElementById(sectionId);
    if (container && target) {
      const containerRect = container.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const offsetTop = targetRect.top - containerRect.top + container.scrollTop - 12;
      container.scrollTo({
        top: Math.max(0, offsetTop),
        behavior: 'smooth',
      });
    }
  };

  useEffect(() => {
    const container = scrollBodyRef.current;
    if (!container || !isOpen) return;

    const handleScroll = () => {
      const sectionIds = [
        'project-drawer-section-overview',
        'project-drawer-section-phases',
        'project-drawer-section-links',
        'project-drawer-section-notes',
      ];
      const containerTop = container.getBoundingClientRect().top;

      let current = sectionIds[0];
      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top - containerTop <= 110) {
            current = id;
          }
        }
      }
      setActiveNav(current);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setActiveNav('project-drawer-section-overview');
    }
  }, [isOpen, project?.id]);

  // Sync state when project prop updates or drawer opens
  useEffect(() => {
    if (isCreateMode || !project) {
      setName('');
      setCode('');
      setFolderId(folders[0]?.id || 'folder-vne');
      setIsCodeManuallyEdited(false);
      setDescription('');
      setObjective('');
      setProductOwner('');
      setPoSearchQuery('');
      setIsPoDropdownOpen(false);
      setPoFilterDept('Tất cả');
      setStatus('Đang triển khai');
      setIsStrategic(false);
      setStartDate('2026-09-01');
      setTargetDate('2026-11-30');

      if (activeProductMember) {
        if (activeProductMember.team === 'Product Manager') {
          setPmMembers([activeProductMember.name]);
          setDesignerMembers([]);
          setSeoMembers([]);
          setDataMembers([]);
        } else if (activeProductMember.team === 'UX/UI Designer') {
          setPmMembers(members[0] ? [members[0].name] : []);
          setDesignerMembers([activeProductMember.name]);
          setSeoMembers([]);
          setDataMembers([]);
        } else if (activeProductMember.team === 'SEO') {
          setPmMembers(members[0] ? [members[0].name] : []);
          setDesignerMembers([]);
          setSeoMembers([activeProductMember.name]);
          setDataMembers([]);
        } else if (activeProductMember.team === 'Data') {
          setPmMembers(members[0] ? [members[0].name] : []);
          setDesignerMembers([]);
          setSeoMembers([]);
          setDataMembers([activeProductMember.name]);
        } else {
          setPmMembers(members[0] ? [members[0].name] : []);
          setDesignerMembers([]);
          setSeoMembers([]);
          setDataMembers([]);
        }
      } else {
        setPmMembers(members[0] ? [members[0].name] : []);
        setDesignerMembers([]);
        setSeoMembers([]);
        setDataMembers([]);
      }

      setLinkOrderTech('');
      setLinkChat('');
      setLinkDashboard('');
      setLinkReport('');
      setLinkBeta('');
      setLinkProduction('');
      setCustomLinks([]);

      setPhases([]);
      setNotes([]);
      setHistoryLogs([]);
      setChecklist(normalizeProjectChecklist([]));

      setNewNoteAuthor(currentActorName);
      setNewNoteContent('');
      setIsAddingCustomLink(false);
      setNewCustomTitle('');
      setNewCustomUrl('');

      // Create mode is always editable immediately
      setIsEditing(true);
      setIsAddingPhase(false);
      setIsHistoryOpen(false);
    } else if (project) {
      setName(project.name);
      setCode(project.code);
      setFolderId(project.folderId || inferProjectFolderId(project));
      setDescription(project.description || '');
      setObjective(project.objective || '');
      setProductOwner(project.productOwner || '');
      setPoSearchQuery('');
      setIsPoDropdownOpen(false);
      setPoFilterDept('Tất cả');
      setStatus(normalizeProjectStatus(project.status));
      setIsStrategic(project.isStrategic || false);
      setStartDate(project.startDate || '2026-09-01');
      setTargetDate(project.targetDate || '2026-11-30');

      setPmMembers(project.roles?.pm || (project.leadName ? [project.leadName.split(',')[0].trim()] : []));
      setDesignerMembers(project.roles?.designer || []);
      setSeoMembers(project.roles?.seo || []);
      setDataMembers(project.roles?.data || []);

      setLinkOrderTech(project.links?.orderTech !== undefined ? (project.links.orderTech || '') : (project.linkOrderTech || ''));
      setLinkChat(project.links?.chat !== undefined ? (project.links.chat || '') : (project.linkChat || ''));
      setLinkDashboard(project.links?.dashboard !== undefined ? (project.links.dashboard || '') : (project.linkDashboard || ''));
      setLinkReport(project.links?.report !== undefined ? (project.links.report || '') : (project.linkReport || ''));
      setLinkBeta(project.links?.beta !== undefined ? (project.links.beta || '') : (project.linkBeta || ''));
      setLinkProduction(project.links?.production !== undefined ? (project.links.production || '') : (project.linkProduction || ''));
      setCustomLinks(project.links?.custom || project.customLinks || []);

      // Normalize phases chronologically from near to far and auto-number
      setPhases(normalizeAndNumberPhases(project.phases || []));
      setNotes(project.notes || []);
      setChecklist(normalizeProjectChecklist(project.checklist));

      // Initialize history logs
      const currentLogs = project.history && project.history.length > 0
        ? project.history
        : [createProjectInitialLog(project, currentActorName)];
      setHistoryLogs(currentLogs);

      // Default author for new note to active member, first PM, or first member
      const defaultAuthor = currentAuthUser?.name || activeProductMember?.name || project.roles?.pm?.[0] || members[0]?.name || 'Hệ thống';
      setNewNoteAuthor(defaultAuthor);
      setNewNoteContent('');
      setIsAddingCustomLink(false);
      setNewCustomTitle('');
      setNewCustomUrl('');

      // Always reset to View mode when opening a project
      setIsEditing(false);
      setIsAddingPhase(false);
      setIsHistoryOpen(false);
    }
  }, [project, isOpen, isCreateMode, members, activeProductMember, currentAuthUser, folders]);

  // Handle ESC key press to close modal or drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isHistoryOpen) {
          setIsHistoryOpen(false);
        } else {
          onClose();
        }
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, isHistoryOpen, onClose]);

  // Reset form to current project prop values
  const handleCancelEdit = () => {
    if (isCreateMode) {
      onClose();
      return;
    }
    if (project) {
      setName(project.name);
      setCode(project.code);
      setFolderId(project.folderId || inferProjectFolderId(project));
      setDescription(project.description || '');
      setObjective(project.objective || '');
      setProductOwner(project.productOwner || '');
      setPoSearchQuery('');
      setIsPoDropdownOpen(false);
      setPoFilterDept('Tất cả');
      setStatus(normalizeProjectStatus(project.status));
      setStartDate(project.startDate || '2026-09-01');
      setTargetDate(project.targetDate || '2026-11-30');

      setPmMembers(project.roles?.pm || (project.leadName ? [project.leadName.split(',')[0].trim()] : []));
      setDesignerMembers(project.roles?.designer || []);
      setSeoMembers(project.roles?.seo || []);
      setDataMembers(project.roles?.data || []);

      setLinkOrderTech(project.links?.orderTech !== undefined ? (project.links.orderTech || '') : (project.linkOrderTech || ''));
      setLinkChat(project.links?.chat !== undefined ? (project.links.chat || '') : (project.linkChat || ''));
      setLinkDashboard(project.links?.dashboard !== undefined ? (project.links.dashboard || '') : (project.linkDashboard || ''));
      setLinkReport(project.links?.report !== undefined ? (project.links.report || '') : (project.linkReport || ''));
      setLinkBeta(project.links?.beta !== undefined ? (project.links.beta || '') : (project.linkBeta || ''));
      setLinkProduction(project.links?.production !== undefined ? (project.links.production || '') : (project.linkProduction || ''));
      setCustomLinks(project.links?.custom || project.customLinks || []);

      setPhases(project.phases || []);
      setNotes(project.notes || []);
    }
    setIsEditing(false);
    setIsAddingPhase(false);
    setIsAddingCustomLink(false);
    setIsPoDropdownOpen(false);
    setPoSearchQuery('');
  };

  // Product Owner (Stakeholders) parsing & Search Logic
  const selectedPoList = productOwner
    ? productOwner.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const stakeholderMembers = members.filter(
    (m) => m.group === 'Stakeholder' || m.team === 'Stakeholder'
  );
  const candidateStakeholders = stakeholderMembers.length > 0 ? stakeholderMembers : members;

  const getFormattedPoName = (rawPo: string) => {
    return formatStakeholderMemberWithPhone(rawPo, members);
  };

  // Distinct departments for filter tabs
  const stakeholderDepts = [
    'Tất cả',
    ...Array.from(
      new Set(
        candidateStakeholders
          .map((m) => m.department)
          .filter((d): d is string => Boolean(d))
      )
    ).slice(0, 7),
  ];

  const availableStakeholders = candidateStakeholders.filter((m) => {
    const fullNameWithSalutation = formatStakeholderMemberWithPhone(m, members);
    const isAlreadySelected =
      selectedPoList.includes(m.name) ||
      selectedPoList.includes(fullNameWithSalutation) ||
      selectedPoList.some((s) => s.includes(m.name));
    if (isAlreadySelected) return false;

    if (poFilterDept !== 'Tất cả' && m.department !== poFilterDept) {
      return false;
    }

    if (!poSearchQuery.trim()) return true;

    const query = poSearchQuery.toLowerCase();
    return (
      (m.name || '').toLowerCase().includes(query) ||
      (fullNameWithSalutation || '').toLowerCase().includes(query) ||
      (m.salutation || '').toLowerCase().includes(query) ||
      (m.department || '').toLowerCase().includes(query) ||
      (m.title || '').toLowerCase().includes(query) ||
      (m.region || '').toLowerCase().includes(query) ||
      (m.ipPhone || '').includes(query)
    );
  });

  const handleAddPo = (nameToAdd: string) => {
    const trimmed = nameToAdd.trim();
    if (!trimmed) return;
    const formatted = getFormattedPoName(trimmed);
    if (!selectedPoList.includes(formatted) && !selectedPoList.includes(trimmed)) {
      const updated = [...selectedPoList, formatted].join(', ');
      setProductOwner(updated);
    }
    setPoSearchQuery('');
    setIsPoDropdownOpen(false);
  };

  const handleRemovePo = (nameToRemove: string) => {
    const updated = selectedPoList.filter((item) => item !== nameToRemove && getFormattedPoName(item) !== nameToRemove).join(', ');
    setProductOwner(updated);
  };

  // Member teams mapping according to AGENTS.md
  const pmTeamMembers = members.filter((m) => m.team === 'Product Manager' || m.title?.includes('Quản lý'));
  const designerTeamMembers = members.filter((m) => m.team === 'UX/UI Designer' || m.title?.includes('Thiết kế'));
  const seoTeamMembers = members.filter((m) => m.team === 'SEO');
  const dataTeamMembers = members.filter((m) => m.team === 'Data' || m.title?.includes('Dữ liệu'));

  const toggleMemberRole = (
    memberName: string,
    currentList: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    if (currentList.includes(memberName)) {
      setList(currentList.filter((m) => m !== memberName));
    } else {
      setList([...currentList, memberName]);
    }
  };

  const handleAddPhase = () => {
    if (!canManagePhases) return;
    if (!newPhaseName.trim()) return;
    const cleanTitle = cleanPhaseTitle(newPhaseName.trim());
    const newPhase: ProjectPhase = {
      id: `phase-${Date.now()}`,
      name: cleanTitle,
      dueDate: newPhaseDueDate,
      status: newPhaseStatus,
      description: newPhaseDesc.trim() || undefined,
    };
    // Sắp xếp các giai đoạn theo thời gian từ gần đến xa & tự động sinh Giai đoạn 1, Giai đoạn 2...
    const updatedPhases = normalizeAndNumberPhases([...phases, newPhase]);
    setPhases(updatedPhases);
    setNewPhaseName('');
    setNewPhaseDesc('');
    setIsAddingPhase(false);

    const newlyAdded = updatedPhases.find((p) => p.id === newPhase.id) || newPhase;

    // Record phase addition history log
    const logItem: ProjectHistoryLog = {
      id: `plog-${Date.now()}`,
      timestamp: new Date().toISOString(),
      author: currentActorName,
      action: `Thêm giai đoạn mới: ${newlyAdded.name}`,
      changes: [
        { field: 'Tên giai đoạn', newValue: newlyAdded.name },
        { field: 'Hạn hoàn thành', newValue: formatDateWithEnDay(newlyAdded.dueDate) },
        { field: 'Trạng thái', newValue: newlyAdded.status },
        ...(newlyAdded.description ? [{ field: 'Mô tả', newValue: newlyAdded.description }] : []),
      ],
      note: 'Bổ sung giai đoạn mới vào lộ trình thực hiện dự án (tự động đánh số theo mốc thời gian).',
    };
    const updatedHistory = [logItem, ...historyLogs];
    setHistoryLogs(updatedHistory);

    if (project && !isCreateMode) {
      onSaveProject({
        ...project,
        phases: updatedPhases,
        history: updatedHistory,
      });
      setIsSavedToast(true);
      setTimeout(() => setIsSavedToast(false), 2000);
    }
  };

  // Phase editing handler
  const handleUpdatePhase = (phaseId: string, updatedFields: Partial<ProjectPhase>) => {
    const oldPhase = phases.find((p) => p.id === phaseId);
    if (!oldPhase) return;

    const modifiedList = phases.map((p) => {
      if (p.id === phaseId) {
        return {
          ...p,
          ...updatedFields,
          name: updatedFields.name !== undefined ? cleanPhaseTitle(updatedFields.name) : cleanPhaseTitle(p.name),
        };
      }
      return p;
    });

    // Sắp xếp các giai đoạn theo thời gian từ gần đến xa & tự động sinh Giai đoạn 1, Giai đoạn 2...
    const updatedPhases = normalizeAndNumberPhases(modifiedList);
    setPhases(updatedPhases);

    const updatedTargetPhase = updatedPhases.find((p) => p.id === phaseId);
    const logItem = updatedTargetPhase ? recordPhaseUpdateLog(oldPhase, updatedTargetPhase, currentActorName) : null;
    let updatedHistory = historyLogs;
    if (logItem) {
      updatedHistory = [logItem, ...historyLogs];
      setHistoryLogs(updatedHistory);
    }

    if (project && !isCreateMode) {
      onSaveProject({
        ...project,
        phases: updatedPhases,
        history: updatedHistory,
      });
      setIsSavedToast(true);
      setTimeout(() => setIsSavedToast(false), 2000);
    }
  };

  const handleDeletePhase = (phaseId: string) => {
    const deletedPhase = phases.find((p) => p.id === phaseId);
    const updatedPhases = normalizeAndNumberPhases(phases.filter((p) => p.id !== phaseId));
    setPhases(updatedPhases);

    // Xóa trực tiếp khỏi Supabase ngay lập tức
    wmsDataService.deletePhase(phaseId).catch((err) => {
      console.error('[handleDeletePhase] Lỗi khi xóa phase trực tiếp:', err);
    });

    if (deletedPhase) {
      const logItem: ProjectHistoryLog = {
        id: `plog-${Date.now()}`,
        timestamp: new Date().toISOString(),
        author: currentActorName,
        action: `Xóa giai đoạn: ${deletedPhase.name}`,
        changes: [{ field: 'Giai đoạn bị xóa', oldValue: deletedPhase.name }],
        note: 'Đã loại bỏ giai đoạn khỏi lộ trình thực hiện dự án.',
      };
      const updatedHistory = [logItem, ...historyLogs];
      setHistoryLogs(updatedHistory);

      if (project && !isCreateMode) {
        onSaveProject({
          ...project,
          phases: updatedPhases,
          history: updatedHistory,
        });
        setIsSavedToast(true);
        setTimeout(() => setIsSavedToast(false), 2000);
      }
    }
  };

  const handleUpdatePhaseStatus = (phaseId: string, newStatus: PhaseStatus) => {
    handleUpdatePhase(phaseId, { status: newStatus });
  };

  // Custom Links handlers
  const handleAddCustomLink = () => {
    if (!newCustomTitle.trim() || !newCustomUrl.trim()) return;
    const newL: ProjectCustomLink = {
      id: `link-${Date.now()}`,
      title: newCustomTitle.trim(),
      url: newCustomUrl.trim(),
    };
    const updated = [...customLinks, newL];
    setCustomLinks(updated);
    setNewCustomTitle('');
    setNewCustomUrl('');
    setIsAddingCustomLink(false);

    const logItem: ProjectHistoryLog = {
      id: `plog-${Date.now()}`,
      timestamp: new Date().toISOString(),
      author: currentActorName,
      action: `Thêm liên kết bổ sung: ${newL.title}`,
      changes: [{ field: 'Liên kết', newValue: `${newL.title} (${newL.url})` }],
    };
    const updatedHistory = [logItem, ...historyLogs];
    setHistoryLogs(updatedHistory);

    if (!isEditing && !isEditingLinksSection && project) {
      const updatedProject: ProjectItem = {
        ...project,
        links: {
          ...project.links,
          custom: updated,
        },
        customLinks: updated,
        history: updatedHistory,
      };
      onSaveProject(updatedProject);
    }
  };

  const handleRemoveCustomLink = (linkId: string) => {
    const targetLink = customLinks.find((l) => l.id === linkId);
    const updated = customLinks.filter((l) => l.id !== linkId);
    setCustomLinks(updated);

    const logItem: ProjectHistoryLog = {
      id: `plog-${Date.now()}`,
      timestamp: new Date().toISOString(),
      author: currentActorName,
      action: `Xóa liên kết bổ sung: ${targetLink?.title || 'Liên kết'}`,
      changes: [{ field: 'Liên kết bị xóa', oldValue: targetLink?.title }],
    };
    const updatedHistory = [logItem, ...historyLogs];
    setHistoryLogs(updatedHistory);

    if (!isEditing && !isEditingLinksSection && project) {
      const updatedProject: ProjectItem = {
        ...project,
        links: {
          ...project.links,
          custom: updated,
        },
        customLinks: updated,
        history: updatedHistory,
      };
      onSaveProject(updatedProject);
    }
  };

  const handleUpdateCustomLink = (id: string, field: 'title' | 'url', value: string) => {
    setCustomLinks(customLinks.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
  };

  // Notes handlers
  const handleAddNote = () => {
    if (!newNoteContent.trim()) return;
    const author = currentActorName;
    const newNote: ProjectNoteItem = {
      id: `note-${Date.now()}`,
      author,
      content: newNoteContent.trim(),
      createdAt: new Date().toISOString(),
    };
    const updatedNotes = [newNote, ...notes];
    setNotes(updatedNotes);
    setNewNoteContent('');

    const logItem: ProjectHistoryLog = {
      id: `plog-${Date.now()}`,
      timestamp: new Date().toISOString(),
      author,
      action: 'Thêm ghi chú dự án mới',
      changes: [{ field: 'Ghi chú', newValue: newNote.content }],
    };
    const updatedHistory = [logItem, ...historyLogs];
    setHistoryLogs(updatedHistory);

    if (!isEditing && project) {
      const updatedProject: ProjectItem = {
        ...project,
        notes: updatedNotes,
        history: updatedHistory,
      };
      onSaveProject(updatedProject);
    }
  };

  const handleRemoveNote = (noteId: string) => {
    const updatedNotes = notes.filter((n) => n.id !== noteId);
    setNotes(updatedNotes);
    if (!isEditing && project) {
      const updatedProject: ProjectItem = {
        ...project,
        notes: updatedNotes,
      };
      onSaveProject(updatedProject);
    }
  };

  // Manual log handler from ProjectHistoryModal
  const handleAddManualProjectLog = (newLog: ProjectHistoryLog) => {
    const updated = [newLog, ...historyLogs];
    setHistoryLogs(updated);
    if (project) {
      onSaveProject({ ...project, history: updated });
    }
  };

  const handleCreateNewProject = () => {
    if (!name.trim()) {
      alert('Vui lòng nhập Tên dự án.');
      return;
    }

    const roles: ProjectRoles = {
      pm: pmMembers,
      designer: designerMembers,
      seo: seoMembers,
      data: dataMembers,
    };

    const validCustomLinks = customLinks.filter((l) => l.title.trim() && l.url.trim());
    const links: ProjectLinks = {
      orderTech: linkOrderTech.trim() || undefined,
      chat: linkChat.trim() || undefined,
      dashboard: linkDashboard.trim() || undefined,
      report: linkReport.trim() || undefined,
      beta: linkBeta.trim() || undefined,
      production: linkProduction.trim() || undefined,
      custom: validCustomLinks.length > 0 ? validCustomLinks : undefined,
    };

    const allAssigned = Array.from(new Set([...pmMembers, ...designerMembers, ...seoMembers, ...dataMembers]));
    const leadNameSummary = allAssigned.length > 0 ? allAssigned.join(', ') : (productOwner.trim() || 'Chưa phân công');

    const normalizedPhases = normalizeAndNumberPhases(phases);
    const existingCodes = (projects || []).map((p) => p.code);
    const finalCode = (code && code.trim())
      ? code.trim().toUpperCase()
      : generateProjectCode(name.trim(), existingCodes);

    const initialLog: ProjectHistoryLog = {
      id: `plog-${Date.now()}`,
      timestamp: new Date().toISOString(),
      author: currentActorName,
      action: 'Khởi tạo thông tin dự án mới',
      changes: [
        { field: 'Tên dự án', newValue: name.trim() },
        { field: 'Mã dự án', newValue: finalCode },
        { field: 'Trạng thái', newValue: status },
        { field: 'Phụ trách chính', newValue: leadNameSummary },
      ],
      note: 'Dự án được tạo mới trên hệ thống qua thanh bên Quản lý Dự án.',
    };

    const newProjPayload: Omit<ProjectItem, 'id'> = {
      name: name.trim(),
      code: finalCode,
      folderId: folderId || 'folder-vne',
      description: description.trim(),
      objective: objective.trim(),
      productOwner: productOwner.trim(),
      startDate,
      targetDate,
      isStrategic,
      status: normalizeProjectStatus(status),
      leadName: leadNameSummary,
      roles,
      phases: normalizedPhases,
      links,
      customLinks: validCustomLinks,
      notes,
      checklist,
      history: [initialLog],
      createdAt: new Date().toISOString(),
    };

    if (onCreateProject) {
      onCreateProject(newProjPayload);
    } else {
      onSaveProject({
        id: `proj-${Date.now()}`,
        ...newProjPayload,
      });
    }

    setIsSavedToast(true);
    setTimeout(() => {
      setIsSavedToast(false);
      onClose();
    }, 200);
  };

  const handleSave = () => {
    if (isCreateMode) {
      handleCreateNewProject();
      return;
    }

    const roles: ProjectRoles = {
      pm: pmMembers,
      designer: designerMembers,
      seo: seoMembers,
      data: dataMembers,
    };

    const validCustomLinks = customLinks.filter((l) => l.title.trim() && l.url.trim());

    const links: ProjectLinks = {
      orderTech: linkOrderTech.trim() || undefined,
      chat: linkChat.trim() || undefined,
      dashboard: linkDashboard.trim() || undefined,
      report: linkReport.trim() || undefined,
      beta: linkBeta.trim() || undefined,
      production: linkProduction.trim() || undefined,
      custom: validCustomLinks,
    };

    const allAssigned = Array.from(new Set([...pmMembers, ...designerMembers, ...seoMembers, ...dataMembers]));
    const leadNameSummary = allAssigned.length > 0 ? allAssigned.join(', ') : 'Chưa phân công';

    const otherCodes = (projects || []).filter((p) => p.id !== project?.id).map((p) => p.code);
    const finalCode = (code && code.trim())
      ? code.trim().toUpperCase()
      : (project?.code || generateProjectCode(name.trim(), otherCodes));

    const preliminaryProject: ProjectItem = {
      ...(project || {} as ProjectItem),
      name: name.trim(),
      code: finalCode,
      folderId: folderId || project?.folderId || 'folder-vne',
      description: description.trim(),
      objective: objective.trim(),
      productOwner: productOwner.trim(),
      startDate,
      targetDate,
      isStrategic,
      status: normalizeProjectStatus(status),
      leadName: leadNameSummary,
      roles,
      phases,
      linkOrderTech: links.orderTech,
      linkChat: links.chat,
      linkDashboard: links.dashboard,
      linkReport: links.report,
      linkBeta: links.beta,
      linkProduction: links.production,
      links,
      customLinks: validCustomLinks,
      notes,
      checklist,
    };

    // Calculate overview changes and record history log
    let updatedHistory = historyLogs;
    if (project) {
      const overviewLog = recordProjectOverviewChanges(
        project,
        preliminaryProject,
        currentActorName
      );
      if (overviewLog) {
        updatedHistory = [overviewLog, ...historyLogs];
        setHistoryLogs(updatedHistory);
      }
    }

    const updatedProject: ProjectItem = {
      ...preliminaryProject,
      history: updatedHistory,
    };

    onSaveProject(updatedProject);
    setIsSavedToast(true);
    setIsEditing(false);
    setTimeout(() => setIsSavedToast(false), 2500);
  };

  // Handler lưu riêng cho Section 3: Liên kết (hỗ trợ UX/UI Designer & PM cập nhật nhanh)
  const handleSaveLinksSection = () => {
    if (!project) return;

    const validCustomLinks = customLinks.filter((l) => l.title.trim() && l.url.trim());

    const links: ProjectLinks = {
      orderTech: linkOrderTech.trim() || undefined,
      chat: linkChat.trim() || undefined,
      dashboard: linkDashboard.trim() || undefined,
      report: linkReport.trim() || undefined,
      beta: linkBeta.trim() || undefined,
      production: linkProduction.trim() || undefined,
      custom: validCustomLinks,
    };

    const preliminaryProject: ProjectItem = {
      ...project,
      linkOrderTech: links.orderTech,
      linkChat: links.chat,
      linkDashboard: links.dashboard,
      linkReport: links.report,
      linkBeta: links.beta,
      linkProduction: links.production,
      links,
      customLinks: validCustomLinks,
    };

    let updatedHistory = historyLogs;
    const overviewLog = recordProjectOverviewChanges(
      project,
      preliminaryProject,
      currentActorName
    );
    if (overviewLog) {
      updatedHistory = [overviewLog, ...historyLogs];
      setHistoryLogs(updatedHistory);
    }

    const updatedProject: ProjectItem = {
      ...preliminaryProject,
      history: updatedHistory,
    };

    onSaveProject(updatedProject);
    setIsSavedToast(true);
    setIsEditingLinksSection(false);
    setTimeout(() => setIsSavedToast(false), 2500);
  };

  const handleCancelEditLinksSection = () => {
    setLinkOrderTech(project?.links?.orderTech !== undefined ? (project.links.orderTech || '') : (project?.linkOrderTech || ''));
    setLinkChat(project?.links?.chat !== undefined ? (project.links.chat || '') : (project?.linkChat || ''));
    setLinkDashboard(project?.links?.dashboard !== undefined ? (project.links.dashboard || '') : (project?.linkDashboard || ''));
    setLinkReport(project?.links?.report !== undefined ? (project.links.report || '') : (project?.linkReport || ''));
    setLinkBeta(project?.links?.beta !== undefined ? (project.links.beta || '') : (project?.linkBeta || ''));
    setLinkProduction(project?.links?.production !== undefined ? (project.links.production || '') : (project?.linkProduction || ''));
    setCustomLinks(project?.links?.custom || project?.customLinks || []);
    setIsAddingCustomLink(false);
    setIsEditingLinksSection(false);
  };

  // Task Stats for this project
  const projTasks = project
    ? tasks.filter((t) => t.projectId === project.id || t.projectName === project.name)
    : [];
  const activeTasks = projTasks.filter((t) => t.status !== 'Hoàn thành');
  const completedTasks = projTasks.filter((t) => t.status === 'Hoàn thành');
  const blockedTasks = projTasks.filter((t) => t.status === 'Bị nghẽn');
  const completedPhases = phases.filter((p) => p.status === 'Đã hoàn thành');

  const currentProjectView: ProjectItem = {
    id: project?.id || 'draft-new-project',
    name: name || 'Dự án mới',
    code: code || (project?.code || generateProjectCode(name, (projects || []).map(p => p.code))),
    description,
    objective,
    productOwner,
    startDate,
    targetDate,
    status,
    leadName: Array.from(new Set([...pmMembers, ...designerMembers, ...seoMembers, ...dataMembers])).join(', ') || productOwner || 'Chưa phân công',
    roles: {
      pm: pmMembers,
      designer: designerMembers,
      seo: seoMembers,
      data: dataMembers,
    },
    phases,
    links: {
      orderTech: linkOrderTech,
      chat: linkChat,
      dashboard: linkDashboard,
      report: linkReport,
      beta: linkBeta,
      production: linkProduction,
      custom: customLinks,
    },
    customLinks,
    notes,
    checklist,
    history: historyLogs,
  };

  const canEdit = isCreateMode ? true : canEditProject(effectiveUser, currentProjectView);
  const canEditLinks = isCreateMode ? true : canEditProjectLinks(effectiveUser, currentProjectView);

  const forecast = calculateProjectForecast(currentProjectView, projTasks);

  // List of 6 standard links data helper
  const linkItems = [
    {
      id: 'orderTech',
      title: 'Order Tech',
      url: linkOrderTech,
      setUrl: setLinkOrderTech,
      placeholder: 'https://place.fpt.com/groups/...',
      icon: FileText,
      badgeBg: 'bg-surface-accent-faint',
      badgeText: 'text-accent',
      badgeBorder: 'border-line',
      buttonBg: 'bg-accent-solid',
    },
    {
      id: 'chat',
      title: 'Chat Group',
      url: linkChat,
      setUrl: setLinkChat,
      placeholder: 'https://chat.fpt.com/group/...',
      icon: MessageSquare,
      badgeBg: 'bg-surface-positive',
      badgeText: 'text-positive',
      badgeBorder: 'border-line',
      buttonBg: 'bg-positive-solid',
    },
    {
      id: 'dashboard',
      title: 'Dashboard',
      url: linkDashboard,
      setUrl: setLinkDashboard,
      placeholder: 'https://app.powerbi.com/groups/...',
      icon: LayoutDashboard,
      badgeBg: 'bg-surface-warning',
      badgeText: 'text-warning',
      badgeBorder: 'border-line',
      buttonBg: 'bg-warning-solid',
    },
    {
      id: 'report',
      title: 'Report',
      url: linkReport,
      setUrl: setLinkReport,
      placeholder: 'https://docs.google.com/presentation/...',
      icon: TrendingUp,
      badgeBg: 'bg-surface-support',
      badgeText: 'text-support',
      badgeBorder: 'border-line',
      buttonBg: 'bg-support-solid',
    },
    {
      id: 'beta',
      title: 'Beta',
      url: linkBeta,
      setUrl: setLinkBeta,
      placeholder: 'https://beta.vnexpress.net/...',
      icon: FlaskConical,
      badgeBg: 'bg-surface-warning',
      badgeText: 'text-warning',
      badgeBorder: 'border-line',
      buttonBg: 'bg-warning-solid',
    },
    {
      id: 'production',
      title: 'Production',
      url: linkProduction,
      setUrl: setLinkProduction,
      placeholder: 'https://vnexpress.net/...',
      icon: Globe,
      badgeBg: 'bg-surface-positive',
      badgeText: 'text-positive',
      badgeBorder: 'border-line',
      buttonBg: 'bg-positive-solid',
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (project || isCreateMode) && (
        <div className="fixed inset-0 z-50 flex justify-end overflow-hidden">
          {/* Background overlay click to close */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={onClose}
          />

          {/* Right Sidebar Drawer Content - Max Width 800px */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300, mass: 0.8 }}
            className="relative z-10 bg-surface w-full max-w-[800px] h-full shadow-sheet flex flex-col border-l border-line overflow-hidden"
          >
            {/* Drawer Header */}
        <div className="px-5 py-3.5 bg-surface-100 border-b border-line flex items-center justify-between gap-3 shrink-0">
          {/* Bên trái: Tên dự án và icon History xem lịch sử điều chỉnh */}
          <div className="flex items-center gap-2.5 min-w-0">
            {isCreateMode && (
              <div className="w-6 h-6 rounded-full bg-surface-accent-faint border border-line text-accent flex items-center justify-center font-bold shrink-0">
                <Plus className="w-3.5 h-3.5" />
              </div>
            )}
            <h2 className="font-title text-base sm:text-lg font-bold text-ink truncate flex items-center gap-1.5" title={name}>
              {isStrategic && (
                <span className="text-warning text-base shrink-0" title="Dự án chiến lược - Toà soạn đặc biệt quan tâm">
                  ⭐
                </span>
              )}
              <span className="truncate">{isCreateMode ? (name.trim() || 'Tạo dự án mới') : (name || 'Chưa đặt tên dự án')}</span>
            </h2>
            {isCreateMode ? (
              <span className="text-[10px] font-bold text-accent bg-surface-accent-faint px-2 py-0.5 rounded border border-line shrink-0">
                Tạo mới
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setIsHistoryOpen(true)}
                className="p-1.5 text-ink-lighter hover:text-support hover:bg-surface-support rounded-vds-lg border border-line hover:border-line transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer group"
                title="Xem lịch sử điều chỉnh dự án chi tiết"
              >
                <History className="w-4 h-4 text-support group-hover:rotate-[-20deg] transition-transform" />
                <span className="text-xs font-ui font-semibold text-support hidden sm:inline">Lịch sử</span>
                {historyLogs.length > 0 && (
                  <span className="font-num text-[10px] font-bold bg-support-solid text-on-color px-1.5 py-0.2 rounded-full leading-none">
                    {historyLogs.length}
                  </span>
                )}
              </button>
            )}
          </div>

          {/* Bên phải: Tag Status, Button Close kèm text "ESC để đóng". */}
          <div className="flex items-center gap-2 shrink-0">
            {isSavedToast && (
              <span className="text-xs font-semibold text-positive bg-surface-positive border border-line px-2.5 py-1 rounded-vds-lg hidden md:flex items-center gap-1 animate-fade-in">
                <Check className="w-3.5 h-3.5" /> Đã lưu!
              </span>
            )}

            {/* Tag Chiến lược */}
            {isStrategic && (
              <span className="text-xs font-ui font-bold px-2.5 py-1 rounded-full border bg-surface-warning text-warning border-line shrink-0 flex items-center gap-1">
                ⭐ Chiến lược
              </span>
            )}

            {/* Tag Status */}
            <span
              className={`text-xs font-ui font-semibold px-2.5 py-1 rounded-full border shrink-0 ${
                normalizeProjectStatus(status) === 'Chưa triển khai'
                  ? 'bg-surface-200 text-ink-lighter border-line'
                  : normalizeProjectStatus(status) === 'Đang triển khai'
                  ? 'bg-surface-support text-support border-line'
                  : normalizeProjectStatus(status) === 'Tạm dừng'
                  ? 'bg-surface-negative text-negative border-line'
                  : 'bg-surface-positive text-positive border-line'
              }`}
            >
              ● {normalizeProjectStatus(status)}
            </span>

            {/* Button Sao chép liên kết Friendly URL */}
            {!isCreateMode && project && (
              <button
                type="button"
                onClick={handleCopyLink}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-ui font-semibold rounded-vds-lg border transition-colors cursor-pointer shrink-0 ${
                  isCopied
                    ? 'bg-surface-positive text-positive border-line'
                    : 'bg-surface text-ink-lighter hover:text-ink hover:bg-surface-200 border-line'
                }`}
                title="Sao chép liên kết dự án để gửi đồng nghiệp"
              >
                {isCopied ? (
                  <Check className="w-3.5 h-3.5 text-positive" />
                ) : (
                  <Share2 className="w-3.5 h-3.5 text-subdued" />
                )}
                <span>{isCopied ? 'Đã chép link' : 'Sao chép link'}</span>
              </button>
            )}

            {/* Button Close kèm text "ESC để đóng" */}
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-ui font-semibold text-ink-lighter hover:text-ink bg-surface hover:bg-surface-200 rounded-vds-lg border border-line transition-colors cursor-pointer shrink-0"
              title="Đóng ngăn chi tiết (Phím ESC)"
            >
              <X className="w-4 h-4 text-subdued" />
              <span>ESC để đóng</span>
            </button>
          </div>
        </div>

        {/* Sub-header: Pinned Section Quick Navigation Menu */}
        <div className="px-5 py-2 bg-surface-100 border-b border-line flex items-center gap-1.5 shrink-0 overflow-x-auto scrollbar-none z-10">
          <button
            type="button"
            onClick={() => scrollToSection('project-drawer-section-overview')}
            className={`px-3 py-1.5 text-xs font-ui rounded-vds-lg transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeNav === 'project-drawer-section-overview'
                ? 'bg-surface-selected text-accent font-bold ring-1 ring-inset ring-line-accent-soft'
                : 'text-ink-lighter hover:text-ink hover:bg-surface-200 bg-surface border border-line font-medium'
            }`}
          >
            <FolderKanban className="w-3.5 h-3.5" />
            <span>Tổng quan</span>
          </button>

          <button
            type="button"
            onClick={() => scrollToSection('project-drawer-section-phases')}
            className={`px-3 py-1.5 text-xs font-ui rounded-vds-lg transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeNav === 'project-drawer-section-phases'
                ? 'bg-surface-selected text-accent font-bold ring-1 ring-inset ring-line-accent-soft'
                : 'text-ink-lighter hover:text-ink hover:bg-surface-200 bg-surface border border-line font-medium'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Giai đoạn</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-num font-bold ${
                activeNav === 'project-drawer-section-phases'
                  ? 'bg-surface/20 text-on-color'
                  : 'bg-surface-200 text-ink-lighter'
              }`}
            >
              {phases.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => scrollToSection('project-drawer-section-links')}
            className={`px-3 py-1.5 text-xs font-ui rounded-vds-lg transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeNav === 'project-drawer-section-links'
                ? 'bg-surface-selected text-accent font-bold ring-1 ring-inset ring-line-accent-soft'
                : 'text-ink-lighter hover:text-ink hover:bg-surface-200 bg-surface border border-line font-medium'
            }`}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Liên kết</span>
          </button>

          <button
            type="button"
            onClick={() => scrollToSection('project-drawer-section-notes')}
            className={`px-3 py-1.5 text-xs font-ui rounded-vds-lg transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeNav === 'project-drawer-section-notes'
                ? 'bg-surface-selected text-accent font-bold ring-1 ring-inset ring-line-accent-soft'
                : 'text-ink-lighter hover:text-ink hover:bg-surface-200 bg-surface border border-line font-medium'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Ghi chú</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-num font-bold ${
                activeNav === 'project-drawer-section-notes'
                  ? 'bg-surface/20 text-on-color'
                  : 'bg-surface-200 text-ink-lighter'
              }`}
            >
              {notes.length}
            </span>
          </button>
        </div>

        {/* Drawer Body - Single Screen Scrollable Content */}
        <div ref={scrollBodyRef} className="p-5 overflow-y-auto font-body text-xs text-ink flex-1 space-y-6 scroll-smooth">

          {/* ==================== SECTION 1: TỔNG QUAN ==================== */}
          <div id="project-drawer-section-overview" className="bg-surface-100 p-4 rounded-vds-lg border border-line space-y-4 scroll-mt-2">
            <div className="flex items-center justify-between border-b border-line pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-surface-accent-faint border border-line text-accent flex items-center justify-center font-bold">
                  <FolderKanban className="w-3.5 h-3.5" />
                </div>
                <h3 className="font-title text-sm font-bold text-accent">
                  1. Tổng quan
                </h3>
              </div>

              {/* Nút Chỉnh sửa / Lưu thông tin Tổng quan */}
              <div className="flex items-center gap-1.5">
                {isCreateMode ? (
                  <span className="text-xs font-bold text-accent bg-surface-accent-faint px-2 py-0.5 rounded border border-line">
                    Nhập thông tin
                  </span>
                ) : !isEditing ? (
                  canEdit ? (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="px-3 py-1 rounded-vds-lg bg-accent-solid hover:bg-accent-solid-hover text-on-color text-xs font-ui font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Chỉnh sửa</span>
                    </button>
                  ) : null
                ) : (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="px-2.5 py-1 text-xs font-semibold text-ink-lighter hover:bg-surface-200 rounded-vds-lg transition-colors cursor-pointer"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      className="px-3 py-1 rounded-vds-lg bg-positive-solid hover:bg-positive-solid text-on-color text-xs font-ui font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                    >
                      <Save className="w-3 h-3" />
                      <span>Lưu thay đổi</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Tên dự án */}
            {isEditing ? (
              <div className="space-y-1">
                <label className="font-ui text-xs font-semibold text-ink block">
                  Tên dự án <span className="text-negative">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    const newName = e.target.value;
                    setName(newName);
                    if (isCreateMode && !isCodeManuallyEdited) {
                      const existingCodes = (projects || []).map((p) => p.code);
                      setCode(generateProjectCode(newName, existingCodes));
                    }
                  }}
                  placeholder="Nhập tên dự án..."
                  className="w-full px-2.5 py-1.5 border border-line rounded-vds-lg text-xs font-semibold text-ink bg-surface focus:border-line-accent focus:ring-1 focus:ring-line"
                />
              </div>
            ) : (
              <div className="bg-surface p-3 rounded-vds-lg border border-line">
                <span className="text-xs text-subdued font-ui block mb-0.5">Tên dự án</span>
                <h4 className="font-title text-base font-bold text-ink">{name}</h4>
              </div>
            )}

            {/* Thư mục (Folder) & Mã dự án (Code) */}
            {isEditing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="font-ui text-xs font-semibold text-ink block">
                      Thư mục (Folder) <span className="text-negative">*</span>
                    </label>
                    {onOpenFolderManager && (
                      <button
                        type="button"
                        onClick={onOpenFolderManager}
                        className="text-xs font-ui font-semibold text-accent hover:underline cursor-pointer"
                      >
                        + Thêm thư mục
                      </button>
                    )}
                  </div>
                  <select
                    value={folderId}
                    onChange={(e) => setFolderId(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-line rounded-vds-lg text-xs font-semibold text-ink bg-surface font-ui focus:border-line-accent"
                  >
                    {getFlattenedFolderOptions(folders).map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        📁 {opt.fullPath}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="font-ui text-xs font-semibold text-ink block">
                      Mã dự án <span className="text-negative">*</span>
                    </label>
                    <span className="text-[10px] text-subdued font-ui">
                      Ví dụ: VNE-XE
                    </span>
                  </div>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => {
                      setIsCodeManuallyEdited(true);
                      setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''));
                    }}
                    placeholder="VNE-XXX"
                    className="w-full px-2.5 py-1.5 border border-line rounded-vds-lg text-xs font-semibold text-ink bg-surface focus:border-line-accent focus:ring-1 focus:ring-line"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-surface p-3 rounded-vds-lg border border-line">
                  <span className="text-xs text-subdued font-ui block mb-0.5">Thư mục (Folder)</span>
                  <span className="font-ui text-xs font-bold text-accent bg-surface-accent-faint px-2 py-0.5 rounded border border-line inline-flex items-center gap-1">
                    📁 {getFolderPath(folderId, folders) || 'VnExpress'}
                  </span>
                </div>
                <div className="bg-surface p-3 rounded-vds-lg border border-line">
                  <span className="text-xs text-subdued font-ui block mb-0.5">Mã dự án</span>
                  <span className="font-ui text-xs font-bold text-accent bg-surface-accent-faint px-2 py-0.5 rounded border border-line">
                    {code || 'Chưa có mã'}
                  </span>
                </div>
              </div>
            )}

            {/* Dự án chiến lược (Checkbox) */}
            <div className="bg-surface p-3 rounded-vds-lg border border-line">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isStrategic}
                  disabled={!isEditing}
                  onChange={(e) => setIsStrategic(e.target.checked)}
                  className="w-4 h-4 rounded text-accent focus:ring-line-accent cursor-pointer disabled:opacity-60"
                />
                <div className="text-xs font-ui">
                  <span className="font-bold text-ink flex items-center gap-1">
                    ⭐ Dự án chiến lược
                  </span>
                  <span className="text-xs text-subdued block">
                    Dự án chiến lược cấp Toà soạn / Công ty đặc biệt quan tâm, ưu tiên nguồn lực triển khai
                  </span>
                </div>
              </label>
            </div>

            {/* Trạng thái & Thời gian */}
            {isEditing ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-ui text-xs font-semibold text-ink block">
                    Trạng thái:
                  </label>
                  <select
                    value={normalizeProjectStatus(status)}
                    onChange={(e) => setStatus(normalizeProjectStatus(e.target.value))}
                    className="w-full px-2.5 py-1.5 border border-line rounded-vds-lg text-xs font-semibold text-ink bg-surface font-ui focus:border-line-support"
                  >
                    <option value="Chưa triển khai">⚪ Chưa triển khai</option>
                    <option value="Đang triển khai">🔵 Đang triển khai</option>
                    <option value="Tạm dừng">🔴 Tạm dừng</option>
                    <option value="Hoàn thành">🟢 Hoàn thành</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-ui text-xs font-semibold text-ink flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-support" />
                    <span>Bắt đầu:</span>
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-line rounded-vds-lg text-xs font-num font-semibold text-ink bg-surface"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-ui text-xs font-semibold text-ink flex items-center gap-1">
                    <Target className="w-3.5 h-3.5 text-accent" />
                    <span>Hoàn thành:</span>
                  </label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-line rounded-vds-lg text-xs font-num font-bold text-accent bg-surface"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-surface p-2.5 rounded-vds-lg border border-line">
                  <span className="text-xs text-subdued font-ui block mb-1">Trạng thái</span>
                  <span
                    className={`inline-block text-xs font-ui font-semibold px-2.5 py-1 rounded-full border ${
                      normalizeProjectStatus(status) === 'Chưa triển khai'
                        ? 'bg-surface-200 text-ink-lighter border-line'
                        : normalizeProjectStatus(status) === 'Đang triển khai'
                        ? 'bg-surface-support text-support border-line'
                        : normalizeProjectStatus(status) === 'Tạm dừng'
                        ? 'bg-surface-negative text-negative border-line'
                        : 'bg-surface-positive text-positive border-line'
                    }`}
                  >
                    ● {normalizeProjectStatus(status)}
                  </span>
                </div>

                <div className="bg-surface p-2.5 rounded-vds-lg border border-line">
                  <span className="text-xs text-subdued font-ui block mb-0.5">Bắt đầu</span>
                  <span className="font-ui text-xs font-semibold text-ink flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-support" />
                    {formatDateShort(startDate)}
                  </span>
                </div>

                <div className="bg-surface p-2.5 rounded-vds-lg border border-line">
                  <span className="text-xs text-subdued font-ui block mb-0.5">Hoàn thành</span>
                  <span className="font-ui text-xs font-bold text-accent flex items-center gap-1">
                    <Target className="w-3.5 h-3.5 text-accent" />
                    {formatDateShort(targetDate)}
                  </span>
                </div>
              </div>
            )}

            {/* Mô tả & Mục tiêu */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-ui text-xs font-semibold text-ink flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-accent" />
                  <span>Mô tả:</span>
                </label>
                {isEditing ? (
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Mô tả nội dung và phạm vi sản phẩm..."
                    className="w-full p-2.5 border border-line rounded-vds-lg text-xs text-ink bg-surface leading-relaxed focus:border-line-accent focus:ring-1 focus:ring-line"
                  />
                ) : (
                  <div className="bg-surface p-3 rounded-vds-lg border border-line text-xs text-ink leading-relaxed min-h-[60px]">
                    {description || <span className="text-subdued">Chưa có thông tin mô tả.</span>}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="font-ui text-xs font-semibold text-ink flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-positive" />
                  <span>Mục tiêu:</span>
                </label>
                {isEditing ? (
                  <textarea
                    rows={3}
                    value={objective}
                    onChange={(e) => setObjective(e.target.value)}
                    placeholder="Mục tiêu sản phẩm và chỉ số KPI kỳ vọng..."
                    className="w-full p-2.5 border border-line rounded-vds-lg text-xs text-ink bg-surface leading-relaxed focus:border-line-accent focus:ring-1 focus:ring-line"
                  />
                ) : (
                  <div className="bg-surface p-3 rounded-vds-lg border border-line text-xs text-ink leading-relaxed min-h-[60px]">
                    {objective || <span className="text-subdued">Chưa có mục tiêu KPI.</span>}
                  </div>
                )}
              </div>
            </div>

            {/* Product Owner (Stakeholder đại diện bài toán sản phẩm & nghiệm thu KPI) */}
            <div className="space-y-2 bg-surface p-3 rounded-vds-lg border border-line relative">
              <div className="flex items-center justify-between">
                <label className="font-ui text-xs font-bold text-ink flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-accent" />
                  <span>Product Owner (Stakeholders):</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-subdued hidden sm:inline">
                    Đại diện Tòa soạn / Nghiệp vụ
                  </span>
                  {!isEditing && canEdit && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(true);
                        setIsPoDropdownOpen(true);
                      }}
                      className="text-xs font-semibold text-accent hover:text-accent hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>{selectedPoList.length > 0 ? 'Thay đổi' : '+ Chọn PO'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* View Mode */}
              {!isEditing ? (
                <div className="pt-0.5">
                  {selectedPoList.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedPoList.map((poName) => {
                        const matchedMember = members.find(
                          (m) =>
                            m.name === poName ||
                            (m.salutation && `${m.salutation} ${m.name}` === poName) ||
                            poName.endsWith(m.name)
                        );
                        const displayName = getFormattedPoName(poName);
                        return (
                          <div
                            key={poName}
                            className="inline-flex items-center gap-1.5 bg-surface-accent-faint text-accent border border-line px-2.5 py-1 rounded-vds-lg text-xs font-semibold "
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-accent-solid" />
                            <span className="font-bold">{displayName}</span>
                            {matchedMember && (
                              <span className="text-[10px] text-accent font-normal border-l border-line pl-1.5">
                                {matchedMember.title} {matchedMember.department ? `(${matchedMember.department})` : ''}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-xs text-subdued font-normal bg-surface-100 p-2.5 rounded-vds-lg border border-dashed border-line flex items-center justify-between">
                      <span>Chưa phân công Product Owner cho dự án này.</span>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditing(true);
                            setIsPoDropdownOpen(true);
                          }}
                          className="text-xs font-semibold text-accent hover:underline cursor-pointer"
                        >
                          + Phân công ngay
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* Edit Mode: Searchable & Selectable Dropdown + Badges */
                <div className="space-y-2">
                  <div className="p-2 bg-surface border border-line focus-within:border-line-accent rounded-vds-lg transition-colors relative">
                    <div className="flex flex-wrap items-center gap-1.5 min-h-[32px]">
                      {selectedPoList.map((poName) => {
                        const matchedMember = members.find(
                          (m) =>
                            m.name === poName ||
                            (m.salutation && `${m.salutation} ${m.name}` === poName) ||
                            poName.endsWith(m.name)
                        );
                        const displayName = getFormattedPoName(poName);
                        return (
                          <span
                            key={poName}
                            className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-vds-md bg-surface-accent-faint text-accent border border-line"
                          >
                            <span>{displayName}</span>
                            {matchedMember && (
                              <span className="text-[10px] text-accent opacity-80 hidden md:inline">
                                ({matchedMember.title})
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemovePo(poName)}
                              className="hover:text-accent hover:bg-surface-accent p-0.5 rounded-full cursor-pointer ml-0.5"
                              title={`Bỏ chọn ${displayName}`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        );
                      })}

                      <input
                        type="text"
                        value={poSearchQuery}
                        onChange={(e) => {
                          setPoSearchQuery(e.target.value);
                          setIsPoDropdownOpen(true);
                        }}
                        onFocus={() => setIsPoDropdownOpen(true)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && poSearchQuery.trim()) {
                            e.preventDefault();
                            handleAddPo(poSearchQuery.trim());
                          } else if (e.key === 'Escape') {
                            setIsPoDropdownOpen(false);
                          }
                        }}
                        placeholder={
                          selectedPoList.length === 0
                            ? 'Gõ tìm kiếm Stakeholder theo tên, ban, chức vụ (hoặc nhập tên mới)...'
                            : 'Thêm Stakeholder khác...'
                        }
                        className="flex-1 min-w-[200px] text-xs font-ui bg-transparent outline-none text-ink placeholder:text-subdued-lighter py-1"
                      />

                      {selectedPoList.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setProductOwner('')}
                          className="text-xs text-subdued hover:text-negative px-1.5 py-0.5 rounded hover:bg-surface-negative cursor-pointer"
                          title="Xóa tất cả Product Owners đã chọn"
                        >
                          Xóa hết
                        </button>
                      )}
                    </div>

                    {/* Suggestions Dropdown */}
                    {isPoDropdownOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 bg-surface border border-line rounded-vds-lg shadow-sheet max-h-64 overflow-y-auto z-40 p-2">
                        {/* Dropdown Header */}
                        <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-divider">
                          <span className="text-[10px] font-bold text-subdued">
                            Danh sách Stakeholders ({availableStakeholders.length})
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsPoDropdownOpen(false)}
                            className="text-xs text-ink-lighter hover:text-ink font-semibold px-1.5 py-0.5 rounded hover:bg-surface-200 cursor-pointer"
                          >
                            Đóng ✕
                          </button>
                        </div>

                        {/* Department Filter Pills */}
                        <div className="flex flex-wrap gap-1 mb-2 pb-1 border-b border-divider">
                          {stakeholderDepts.map((dept) => (
                            <button
                              key={dept}
                              type="button"
                              onClick={() => setPoFilterDept(dept)}
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                                poFilterDept === dept
                                  ? 'bg-surface-selected text-accent ring-1 ring-inset ring-line-accent-soft'
                                  : 'bg-surface-200 text-ink-lighter hover:bg-surface-300'
                              }`}
                            >
                              {dept}
                            </button>
                          ))}
                        </div>

                        {/* Allow adding custom typed value */}
                        {poSearchQuery.trim() && !candidateStakeholders.some((m) => m.name.toLowerCase() === poSearchQuery.trim().toLowerCase()) && (
                          <div className="mb-2 p-1.5 bg-surface-accent-faint border border-line rounded-vds-lg flex items-center justify-between">
                            <span className="text-xs text-accent">
                              Thêm thực thể/tên tùy chỉnh: <strong>"{poSearchQuery.trim()}"</strong>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleAddPo(poSearchQuery.trim())}
                              className="px-2 py-0.5 rounded bg-accent-solid text-on-color text-xs font-bold hover:bg-accent-solid-hover cursor-pointer"
                            >
                              + Thêm
                            </button>
                          </div>
                        )}

                        {/* Candidate List */}
                        {availableStakeholders.length === 0 ? (
                          <div className="px-3 py-4 text-xs text-subdued text-center italic">
                            Không tìm thấy Stakeholder phù hợp. Bạn có thể nhấn Enter hoặc nút "+ Thêm" để lưu tên tùy chỉnh.
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {availableStakeholders.map((m) => {
                              const formalName = formatMemberWithPhone(m);
                              return (
                                <button
                                  key={m.id}
                                  type="button"
                                  onClick={() => handleAddPo(formalName)}
                                  className="w-full text-left px-2.5 py-1.5 rounded-vds-lg hover:bg-surface-accent-faint hover:border-line border border-transparent flex items-center justify-between text-xs transition-colors cursor-pointer group"
                                >
                                  <div>
                                    <div className="font-bold text-ink group-hover:text-accent flex items-center gap-1.5">
                                      <span>{formalName}</span>
                                      {m.region && (
                                        <span className="text-[10px] font-normal text-subdued bg-surface-200 px-1.5 py-0.2 rounded">
                                          {m.region}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-xs text-ink-lighter">
                                      <span className="font-semibold text-ink">{m.title || 'Stakeholder'}</span>
                                      {m.department && <span> • {m.department}</span>}
                                    </div>
                                  </div>
                                  <span className="text-xs font-bold text-accent bg-surface-accent-faint group-hover:bg-accent-solid group-hover:text-on-color px-2 py-1 rounded transition-colors shrink-0">
                                    + Chọn
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-subdued italic">
                    * Tìm và chọn một hoặc nhiều đại diện Stakeholder (Ban Biên tập / Lãnh đạo ban nội dung) phụ trách bài toán sản phẩm và nghiệm thu KPI.
                  </p>
                </div>
              )}
            </div>

            {/* Sản phẩm: Phân công nhân sự theo Nhóm Chuyên môn */}
            <div className="space-y-2 pt-1">
              <label className="font-ui text-xs font-bold text-ink block">
                Sản phẩm:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Role 1: Product Manager */}
                <div className="space-y-1.5 bg-surface p-2.5 rounded-vds-lg border border-line">
                  <span className="font-ui text-xs font-bold text-accent flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>Product Manager:</span>
                  </span>
                  {isEditing ? (
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {pmTeamMembers.map((m) => {
                        const isSelected = pmMembers.includes(m.name);
                        return (
                          <button
                            type="button"
                            key={m.id}
                            onClick={() => toggleMemberRole(m.name, pmMembers, setPmMembers)}
                            className={`px-2 py-0.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-surface-selected text-accent ring-1 ring-inset ring-line-accent-soft'
                                : 'bg-surface-200 text-ink-lighter hover:bg-surface-300'
                            }`}
                          >
                            {isSelected ? '✓ ' : '+ '}{formatProductMemberWithPhone(m)}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {pmMembers.length > 0 ? (
                        pmMembers.map((name) => (
                          <span key={name} className="px-2 py-0.5 rounded-full text-xs font-semibold bg-surface-accent-faint text-accent border border-line">
                            {formatProductMemberWithPhone(name, members)}
                          </span>
                        ))
                      ) : (
                        <span className="text-subdued text-xs">Chưa phân công PM</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Role 2: UX/UI Designer */}
                <div className="space-y-1.5 bg-surface p-2.5 rounded-vds-lg border border-line">
                  <span className="font-ui text-xs font-bold text-warning flex items-center gap-1">
                    <Palette className="w-3.5 h-3.5" />
                    <span>UX/UI Designer:</span>
                  </span>
                  {isEditing ? (
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {designerTeamMembers.map((m) => {
                        const isSelected = designerMembers.includes(m.name);
                        return (
                          <button
                            type="button"
                            key={m.id}
                            onClick={() => toggleMemberRole(m.name, designerMembers, setDesignerMembers)}
                            className={`px-2 py-0.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-surface-selected text-accent ring-1 ring-inset ring-line-accent-soft'
                                : 'bg-surface-200 text-ink-lighter hover:bg-surface-300'
                            }`}
                          >
                            {isSelected ? '✓ ' : '+ '}{formatProductMemberWithPhone(m)}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {designerMembers.length > 0 ? (
                        designerMembers.map((name) => (
                          <span key={name} className="px-2 py-0.5 rounded-full text-xs font-semibold bg-surface-warning text-warning border border-line">
                            {formatProductMemberWithPhone(name, members)}
                          </span>
                        ))
                      ) : (
                        <span className="text-subdued text-xs">Chưa phân công Thiết kế</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Role 3: SEO */}
                <div className="space-y-1.5 bg-surface p-2.5 rounded-vds-lg border border-line">
                  <span className="font-ui text-xs font-bold text-positive flex items-center gap-1">
                    <Search className="w-3.5 h-3.5" />
                    <span>SEO:</span>
                  </span>
                  {isEditing ? (
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {seoTeamMembers.map((m) => {
                        const isSelected = seoMembers.includes(m.name);
                        return (
                          <button
                            type="button"
                            key={m.id}
                            onClick={() => toggleMemberRole(m.name, seoMembers, setSeoMembers)}
                            className={`px-2 py-0.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-surface-selected text-accent ring-1 ring-inset ring-line-accent-soft'
                                : 'bg-surface-200 text-ink-lighter hover:bg-surface-300'
                            }`}
                          >
                            {isSelected ? '✓ ' : '+ '}{formatProductMemberWithPhone(m)}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {seoMembers.length > 0 ? (
                        seoMembers.map((name) => (
                          <span key={name} className="px-2 py-0.5 rounded-full text-xs font-semibold bg-surface-positive text-positive border border-line">
                            {formatProductMemberWithPhone(name, members)}
                          </span>
                        ))
                      ) : (
                        <span className="text-subdued text-xs">Chưa phân công SEO</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Role 4: Data */}
                <div className="space-y-1.5 bg-surface p-2.5 rounded-vds-lg border border-line">
                  <span className="font-ui text-xs font-bold text-support flex items-center gap-1">
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>Data:</span>
                  </span>
                  {isEditing ? (
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {dataTeamMembers.map((m) => {
                        const isSelected = dataMembers.includes(m.name);
                        return (
                          <button
                            type="button"
                            key={m.id}
                            onClick={() => toggleMemberRole(m.name, dataMembers, setDataMembers)}
                            className={`px-2 py-0.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-surface-selected text-accent ring-1 ring-inset ring-line-accent-soft'
                                : 'bg-surface-200 text-ink-lighter hover:bg-surface-300'
                            }`}
                          >
                            {isSelected ? '✓ ' : '+ '}{formatProductMemberWithPhone(m)}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {dataMembers.length > 0 ? (
                        dataMembers.map((name) => (
                          <span key={name} className="px-2 py-0.5 rounded-full text-xs font-semibold bg-surface-support text-support border border-line">
                            {formatProductMemberWithPhone(name, members)}
                          </span>
                        ))
                      ) : (
                        <span className="text-subdued text-xs">Chưa phân công Dữ liệu</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ==================== SECTION 2: GIAI ĐOẠN ==================== */}
          <div id="project-drawer-section-phases" className="bg-surface-100 p-4 rounded-vds-lg border border-line space-y-4 scroll-mt-2">
            <div className="flex items-center justify-between border-b border-line pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-surface-support border border-line text-support flex items-center justify-center font-bold">
                  <Calendar className="w-3.5 h-3.5" />
                </div>
                <h3 className="font-title text-sm font-bold text-support">
                  2. Giai đoạn ({phases.length})
                </h3>
              </div>

              {!isAddingPhase && (
                canManagePhases ? (
                  <button
                    type="button"
                    onClick={() => setIsAddingPhase(true)}
                    className="px-2.5 py-1 text-xs font-semibold text-support bg-surface-support hover:bg-surface-support border border-line rounded-vds-lg flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm giai đoạn</span>
                  </button>
                ) : (
                  <span className="text-xs text-subdued font-ui italic">
                    Chỉ Manager & Admin được thêm giai đoạn
                  </span>
                )
              )}
            </div>

            <ProjectTimelineView
              project={currentProjectView}
              tasks={tasks}
              isEditing={true}
              onUpdatePhaseStatus={handleUpdatePhaseStatus}
              onUpdatePhase={handleUpdatePhase}
              onDeletePhase={handleDeletePhase}
              onAddPhaseClick={canManagePhases ? () => setIsAddingPhase(true) : undefined}
            />

            {/* Form Thêm Phase */}
            {isAddingPhase && (
              <div className="bg-surface p-3.5 rounded-vds-lg border border-line-support space-y-3 animate-fade-in ">
                <div className="flex items-center justify-between">
                  <h4 className="font-title text-xs font-bold text-support flex items-center gap-1.5">
                    <Plus className="w-4 h-4" />
                    <span>Thêm Giai đoạn mới vào Lộ trình</span>
                  </h4>
                  <span className="text-[10px] font-bold text-support bg-surface-support px-2 py-0.5 rounded border border-line">
                    Tự sinh Giai đoạn theo thời gian
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-ink">
                      Nội dung giai đoạn <span className="text-negative">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="VD: Khảo sát & PRD, Thiết kế UI/UX, Kiểm thử tải..."
                      value={newPhaseName}
                      onChange={(e) => setNewPhaseName(e.target.value)}
                      className="w-full p-2 border border-line rounded-vds-lg text-xs text-ink bg-surface focus:border-line-support focus:ring-1 focus:ring-line"
                    />
                    <p className="text-[10px] text-subdued italic">
                      * Không cần nhập "Giai đoạn 1, 2...", hệ thống sẽ tự động sắp xếp theo thời gian từ gần đến xa và tự gán số.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-ink">
                      Hạn hoàn thành <span className="text-negative">*</span>
                    </label>
                    <input
                      type="date"
                      value={newPhaseDueDate}
                      onChange={(e) => setNewPhaseDueDate(e.target.value)}
                      className="w-full p-2 border border-line rounded-vds-lg text-xs font-num bg-surface focus:border-line-support focus:ring-1 focus:ring-line"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-ink">
                    Mô tả giai đoạn / Tiêu chí bàn giao (không bắt buộc):
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Mô tả nội dung, tiêu chí bàn giao..."
                    value={newPhaseDesc}
                    onChange={(e) => setNewPhaseDesc(e.target.value)}
                    className="w-full p-2 border border-line rounded-vds-lg text-xs text-ink bg-surface focus:border-line-support focus:ring-1 focus:ring-line"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingPhase(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-ink-lighter bg-surface-200 hover:bg-surface-300 rounded-vds-lg cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleAddPhase}
                    className="px-4 py-1.5 text-xs font-semibold text-on-color bg-support-solid hover:bg-support-solid rounded-vds-lg cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Lưu giai đoạn</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ==================== SECTION 3: LIÊN KẾT ==================== */}
          <div id="project-drawer-section-links" className="bg-surface-100 p-4 rounded-vds-lg border border-line space-y-4 scroll-mt-2">
            <div className="flex items-center justify-between border-b border-line pb-2.5 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-surface-positive border border-line text-positive flex items-center justify-center font-bold">
                  <ExternalLink className="w-3.5 h-3.5" />
                </div>
                <h3 className="font-title text-sm font-bold text-positive">
                  3. Liên kết
                </h3>
              </div>

              <div className="flex items-center gap-2">
                {!isEditing && canEditLinks && (
                  !isEditingLinksSection ? (
                    <button
                      type="button"
                      onClick={() => setIsEditingLinksSection(true)}
                      className="px-2.5 py-1 rounded-vds-lg bg-surface-positive hover:bg-surface-positive text-positive border border-line text-xs font-ui font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      title="Chỉnh sửa các liên kết của dự án (UX/UI Designer & PM)"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Sửa liên kết</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleCancelEditLinksSection}
                        className="px-2.5 py-1 text-xs font-semibold text-ink-lighter hover:bg-surface-200 rounded-vds-lg transition-colors cursor-pointer"
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveLinksSection}
                        className="px-2.5 py-1 rounded-vds-lg bg-positive-solid hover:bg-positive-solid text-on-color text-xs font-ui font-bold flex items-center gap-1 transition-colors cursor-pointer "
                      >
                        <Save className="w-3 h-3" />
                        <span>Lưu liên kết</span>
                      </button>
                    </div>
                  )
                )}
                <span className="text-xs text-subdued font-ui hidden sm:inline">
                  {isEditing || isEditingLinksSection ? 'Nhập đường dẫn liên kết' : 'Chọn liên kết để truy cập trực tiếp'}
                </span>
              </div>
            </div>

            {/* 6 Tiêu chuẩn: Order Tech, Chat Group, Dashboard, Report, Beta, Production */}
            {isEditing || isEditingLinksSection ? (
              /* EDIT MODE FOR 6 STANDARD LINKS */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {linkItems.map((item) => {
                  const IconComp = item.icon;
                  return (
                    <div key={item.id} className="space-y-0.5">
                      <label className="font-ui text-xs font-semibold text-ink-lighter flex items-center gap-1">
                        <IconComp className="w-3 h-3 text-accent" />
                        <span>{item.title}:</span>
                      </label>
                      <div className="flex gap-1">
                        <input
                          type="url"
                          value={item.url}
                          onChange={(e) => item.setUrl(e.target.value)}
                          placeholder={item.placeholder}
                          className="flex-1 px-2 py-1 border border-line rounded-vds-md text-xs text-ink bg-surface"
                        />
                        {item.url && (
                          <button
                            type="button"
                            onClick={() => item.setUrl('')}
                            className="p-1 text-subdued-lighter hover:text-negative hover:bg-surface-negative border border-line rounded-vds-md transition-colors cursor-pointer"
                            title="Xóa liên kết này"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {item.url && (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 bg-surface-accent-faint text-accent border border-line rounded-vds-md hover:bg-accent-solid hover:text-on-color transition-colors"
                            title="Thử truy cập"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* VIEW MODE FOR 6 STANDARD LINKS */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {linkItems.map((item) => {
                  const IconComp = item.icon;
                  const hasUrl = Boolean(item.url && item.url.trim());

                  return (
                    <div
                      key={item.id}
                      className="bg-surface p-2.5 rounded-vds-lg border border-line flex items-center justify-between gap-2 hover:border-line-positive transition group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`p-1.5 rounded-vds-lg ${item.badgeBg} ${item.badgeText} ${item.badgeBorder} border shrink-0`}>
                          <IconComp className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="font-ui text-xs font-bold text-ink block truncate">
                            {item.title}
                          </span>
                          <span className="text-xs text-subdued block truncate font-num">
                            {hasUrl ? item.url : 'Chưa cập nhật liên kết'}
                          </span>
                        </div>
                      </div>

                      {hasUrl ? (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-vds-lg bg-surface-positive text-positive border border-line group-hover:bg-positive-solid group-hover:text-on-color font-ui text-xs font-bold flex items-center gap-1 transition-colors shrink-0"
                          title="Mở trong tab mới"
                        >
                          <span>Mở</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-xs text-subdued-lighter font-ui px-2 py-0.5 bg-surface-200 rounded-vds-md shrink-0">
                          Chưa có liên kết
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Custom Links (Tự thêm liên kết theo nhu cầu gồm Title và Link) */}
            <div className="pt-2 border-t border-divider space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-ui text-xs font-bold text-ink flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-support" />
                  <span>Liên kết tùy chọn bổ sung ({customLinks.length}):</span>
                </span>
                {!isAddingCustomLink && canEditLinks && (
                  <button
                    type="button"
                    onClick={() => setIsAddingCustomLink(true)}
                    className="text-xs font-semibold text-support hover:text-support flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm liên kết mới</span>
                  </button>
                )}
              </div>

              {/* Form Thêm Custom Link */}
              {isAddingCustomLink && (
                <div className="bg-surface p-3 rounded-vds-lg border border-line-support space-y-2.5 animate-fade-in ">
                  <div className="text-xs font-bold text-support">Thêm liên kết mới:</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-0.5">
                      <label className="text-xs font-semibold text-ink-lighter">Title (Tiêu đề):</label>
                      <input
                        type="text"
                        placeholder="VD: Tài liệu thiết kế Figma, API Docs..."
                        value={newCustomTitle}
                        onChange={(e) => setNewCustomTitle(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-line rounded-vds-lg text-xs text-ink"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-xs font-semibold text-ink-lighter">Link (Đường dẫn):</label>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={newCustomUrl}
                        onChange={(e) => setNewCustomUrl(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-line rounded-vds-lg text-xs text-ink"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingCustomLink(false);
                        setNewCustomTitle('');
                        setNewCustomUrl('');
                      }}
                      className="px-2.5 py-1 text-xs font-semibold text-ink-lighter hover:bg-surface-200 rounded-vds-md cursor-pointer"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={handleAddCustomLink}
                      disabled={!newCustomTitle.trim() || !newCustomUrl.trim()}
                      className="px-3 py-1 text-xs font-semibold text-on-color bg-support-solid hover:bg-support-solid rounded-vds-md disabled:opacity-50 cursor-pointer"
                    >
                      Thêm
                    </button>
                  </div>
                </div>
              )}

              {/* Danh sách Custom Links */}
              {customLinks.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {customLinks.map((cl) => (
                    <div
                      key={cl.id}
                      className="bg-surface p-2.5 rounded-vds-lg border border-line flex items-center justify-between gap-2 hover:border-line-support transition-colors"
                    >
                      <div className="min-w-0 flex items-center gap-2">
                        <Link2 className="w-3.5 h-3.5 text-support shrink-0" />
                        <div className="min-w-0">
                          <span className="font-ui text-xs font-bold text-ink block truncate">
                            {cl.title}
                          </span>
                          <span className="text-xs text-subdued block truncate font-num">
                            {cl.url}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <a
                          href={cl.url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2 py-0.5 rounded-vds-md bg-surface-support text-support border border-line hover:bg-support-solid hover:text-on-color text-xs font-bold flex items-center gap-1 transition-colors"
                          title="Mở trong tab mới"
                        >
                          <span>Mở</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        {canEditLinks && (
                          <button
                            type="button"
                            onClick={() => handleRemoveCustomLink(cl.id)}
                            className="p-1 text-subdued-lighter hover:text-negative hover:bg-surface-negative rounded-vds-md transition-colors cursor-pointer"
                            title="Xóa liên kết"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                !isAddingCustomLink && (
                  <p className="text-xs text-subdued bg-surface p-2.5 rounded-vds-lg border border-dashed border-line text-center">
                    Chưa có liên kết tùy chọn nào. Bấm &quot;Thêm liên kết mới&quot; để bổ sung đường dẫn theo nhu cầu.
                  </p>
                )
              )}
            </div>
          </div>

          {/* ==================== SECTION 4: GHI CHÚ ==================== */}
          <div id="project-drawer-section-notes" className="bg-surface-100 p-4 rounded-vds-lg border border-line space-y-4 scroll-mt-2">
            <div className="flex items-center justify-between border-b border-line pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-surface-accent-faint border border-line text-accent flex items-center justify-center font-bold">
                  <MessageSquare className="w-3.5 h-3.5" />
                </div>
                <h3 className="font-title text-sm font-bold text-accent">
                  4. Ghi chú ({notes.length})
                </h3>
              </div>
              <span className="text-xs text-subdued font-ui">
                Lưu vết thông tin trao đổi, quyết định nhanh và lưu ý dự án
              </span>
            </div>

            {/* Form Thêm Ghi chú */}
            <div className="bg-surface p-3.5 rounded-vds-lg border border-line space-y-3 ">
              <h4 className="font-title text-xs font-bold text-ink flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-accent" />
                <span>Thêm ghi chú mới</span>
              </h4>

              <div className="space-y-2">
                {/* Người ghi chú - Cố định người đang đăng nhập */}
                <div className="space-y-1">
                  <label className="font-ui text-xs font-semibold text-ink flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-accent" />
                    <span>Người ghi chú:</span>
                  </label>
                  <div className="px-3 py-1.5 bg-surface-100 border border-line rounded-vds-lg text-xs font-semibold text-ink">
                    {currentActorName}
                  </div>
                </div>

                {/* Nội dung */}
                <div className="space-y-1">
                  <label className="font-ui text-xs font-semibold text-ink flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-support" />
                    <span>Nội dung:</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Nhập nội dung ghi chú, quyết định kỹ thuật, thống nhất thiết kế hoặc lưu ý quan trọng..."
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                    className="w-full p-2.5 border border-line rounded-vds-lg text-xs text-ink bg-surface leading-relaxed focus:border-line-accent focus:ring-1 focus:ring-line"
                  />
                </div>

                {/* Submit button */}
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleAddNote}
                    disabled={!newNoteContent.trim()}
                    className="px-4 py-2 rounded-vds-lg bg-accent-solid hover:bg-accent-solid-hover text-on-color text-xs font-ui font-bold flex items-center gap-1.5 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Thêm ghi chú</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Danh sách Ghi chú */}
            <div className="space-y-2.5">
              <h4 className="font-ui text-xs font-bold text-ink">
                Nhật ký ghi chú ({notes.length}):
              </h4>

              {notes.length === 0 ? (
                <div className="bg-surface p-5 rounded-vds-lg border border-line text-center space-y-1">
                  <MessageSquare className="w-7 h-7 text-subdued-lighter mx-auto" />
                  <p className="text-xs font-semibold text-ink-lighter">Chưa có ghi chú nào cho dự án này</p>
                  <p className="text-xs text-subdued">
                    Sử dụng biểu mẫu phía trên để lưu lại trao đổi, quyết định sản phẩm hoặc lưu ý triển khai.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {notes.map((note) => {
                    const formattedDate = note.createdAt
                      ? formatDateWithEnDay(note.createdAt, true)
                      : 'Hôm nay';
                    const authorInitial = note.author ? note.author.charAt(note.author.lastIndexOf(' ') + 1 || 0) : 'N';

                    return (
                      <div
                        key={note.id}
                        className="bg-surface p-3.5 rounded-vds-lg border border-line space-y-2 hover:border-line-accent/40 transition-colors "
                      >
                        <div className="flex items-center justify-between gap-2 border-b border-divider pb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-6 h-6 rounded-full bg-surface-accent-faint border border-line text-accent flex items-center justify-center font-bold text-xs shrink-0">
                              {authorInitial}
                            </div>
                            <span className="font-ui text-xs font-bold text-ink truncate">
                              {note.author}
                            </span>
                            <span className="text-xs text-subdued font-ui shrink-0">
                              • {formattedDate}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveNote(note.id)}
                            className="p-1 text-subdued-lighter hover:text-negative hover:bg-surface-negative rounded-vds-md transition-colors cursor-pointer"
                            title="Xóa ghi chú này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Nội dung ghi chú */}
                        <div className="text-xs text-ink leading-relaxed whitespace-pre-wrap">
                          {note.content}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ==================== SECTION 5: CHECKLIST DỰ ÁN (TẠM ẨN VỚI NGƯỜI DÙNG, GIỮ TRONG THIẾT LẬP) ==================== */}
          {/* Tạm thời ẩn phần checklist không hiển thị với user theo yêu cầu */}

        </div>

        {/* Drawer Sticky Footer */}
        <div className="px-5 py-3 bg-surface-100 border-t border-line flex items-center justify-between shrink-0">
          <div className="text-xs text-subdued font-ui flex items-center gap-1.5">
            {isCreateMode ? (
              <span className="text-accent font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-accent-solid animate-ping"></span>
                Tạo dự án mới — Điền thông tin và nhấn Tạo dự án mới
              </span>
            ) : isEditing ? (
              <span className="text-accent font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-accent-solid animate-ping"></span>
                Chế độ Chỉnh sửa
              </span>
            ) : (
              <span className="text-support font-semibold flex items-center gap-1">
                <Eye className="w-3.5 h-3.5 text-support" />
                Chế độ Xem — Chọn liên kết để truy cập trực tiếp
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isCreateMode ? (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 text-xs font-semibold text-ink-lighter hover:bg-surface-200 rounded-vds-lg transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleCreateNewProject}
                  className="px-5 py-2 bg-accent-solid hover:bg-accent-solid-hover text-on-color text-xs font-ui font-bold rounded-vds-lg flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tạo dự án mới</span>
                </button>
              </>
            ) : !isEditing ? (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 text-xs font-semibold text-ink-lighter hover:bg-surface-200 rounded-vds-lg transition-colors cursor-pointer"
                >
                  Đóng
                </button>
                {canEdit ? (
                  <VdsButton variant="accent" size="sm" iconLeft="Edit" onClick={() => setIsEditing(true)}>
                    Chỉnh sửa thông tin
                  </VdsButton>
                ) : (
                  <span className="text-xs text-subdued font-ui bg-surface-200 px-2.5 py-1 rounded-vds-lg border border-line">
                    🔒 Chế độ xem
                  </span>
                )}
              </>
            ) : (
              <>
                <VdsButton variant="ghost" size="sm" onClick={handleCancelEdit}>
                  Huỷ thay đổi
                </VdsButton>
                <VdsButton variant="accent" size="sm" iconLeft="Checkmark" onClick={handleSave}>
                  Lưu thay đổi
                </VdsButton>
              </>
            )}
          </div>
        </div>

          {/* Modal Xem & Ghi nhận Lịch sử điều chỉnh dự án */}
          {isHistoryOpen && (
            <ProjectHistoryModal
              project={{ ...currentProjectView, history: historyLogs }}
              isOpen={isHistoryOpen}
              onClose={() => setIsHistoryOpen(false)}
              members={members}
              onAddManualLog={handleAddManualProjectLog}
            />
          )}
        </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
