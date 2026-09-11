/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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
} from '../types';
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
} from 'lucide-react';
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
import { canEditProject } from '../utils/rbac';
import { normalizeProjectStatus } from '../utils/projectSortingUtils';

interface ProjectDetailsDrawerProps {
  project: ProjectItem | null;
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
}

export const ProjectDetailsDrawer: React.FC<ProjectDetailsDrawerProps> = ({
  project,
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
}) => {
  const effectiveUser = currentAuthUser || activeProductMember;
  const userRole = getUserRole(effectiveUser);
  const canManagePhases = userRole === 'Admin' || userRole === 'Manager';
  // Mode state: Default to false (View Mode) as requested
  const [isEditing, setIsEditing] = useState(false);

  // Form State for Cột Trái (Left Column)
  const [name, setName] = useState(project?.name || '');
  const [code, setCode] = useState(project?.code || '');
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
  const [linkOrderTech, setLinkOrderTech] = useState(project?.links?.orderTech || '');
  const [linkChat, setLinkChat] = useState(project?.links?.chat || '');
  const [linkDashboard, setLinkDashboard] = useState(project?.links?.dashboard || '');
  const [linkReport, setLinkReport] = useState(project?.links?.report || '');
  const [linkBeta, setLinkBeta] = useState(project?.links?.beta || '');
  const [linkProduction, setLinkProduction] = useState(project?.links?.production || '');
  const [customLinks, setCustomLinks] = useState<ProjectCustomLink[]>(
    project?.links?.custom || project?.customLinks || []
  );

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

  // Sync state when project prop updates or drawer opens
  useEffect(() => {
    if (isCreateMode || !project) {
      setName('');
      setCode('VNE-PRJ');
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

      setLinkOrderTech(project.links?.orderTech || '');
      setLinkChat(project.links?.chat || '');
      setLinkDashboard(project.links?.dashboard || '');
      setLinkReport(project.links?.report || '');
      setLinkBeta(project.links?.beta || '');
      setLinkProduction(project.links?.production || '');
      setCustomLinks(project.links?.custom || project.customLinks || []);

      // Normalize phases chronologically from near to far and auto-number
      setPhases(normalizeAndNumberPhases(project.phases || []));
      setNotes(project.notes || []);

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
  }, [project, isOpen, isCreateMode, members, activeProductMember, currentAuthUser]);

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

      setLinkOrderTech(project.links?.orderTech || '');
      setLinkChat(project.links?.chat || '');
      setLinkDashboard(project.links?.dashboard || '');
      setLinkReport(project.links?.report || '');
      setLinkBeta(project.links?.beta || '');
      setLinkProduction(project.links?.production || '');
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
      m.name.toLowerCase().includes(query) ||
      fullNameWithSalutation.toLowerCase().includes(query) ||
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

    if (!isEditing && project) {
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

    if (!isEditing && project) {
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

    const initialLog: ProjectHistoryLog = {
      id: `plog-${Date.now()}`,
      timestamp: new Date().toISOString(),
      author: currentActorName,
      action: 'Khởi tạo thông tin dự án mới',
      changes: [
        { field: 'Tên dự án', newValue: name.trim() },
        { field: 'Mã dự án', newValue: code.trim().toUpperCase() || 'VNE-PRJ' },
        { field: 'Trạng thái', newValue: status },
        { field: 'Phụ trách chính', newValue: leadNameSummary },
      ],
      note: 'Dự án được tạo mới trên hệ thống qua thanh bên Quản lý Dự án.',
    };

    const newProjPayload: Omit<ProjectItem, 'id'> = {
      name: name.trim(),
      code: code.trim().toUpperCase() || 'VNE-PRJ',
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

    const preliminaryProject: ProjectItem = {
      ...(project || {} as ProjectItem),
      name: name.trim(),
      code: code.trim().toUpperCase() || 'VNE-PRJ',
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
      links,
      customLinks: validCustomLinks,
      notes,
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
    code: code || 'VNE-PRJ',
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
    history: historyLogs,
  };

  const canEdit = isCreateMode ? true : canEditProject(effectiveUser, currentProjectView);

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
      badgeBg: 'bg-[#fcf0f5]',
      badgeText: 'text-[#b13460]',
      badgeBorder: 'border-[#f3c2d4]',
      buttonBg: 'bg-[#b13460]',
    },
    {
      id: 'chat',
      title: 'Chat Group',
      url: linkChat,
      setUrl: setLinkChat,
      placeholder: 'https://chat.fpt.com/group/...',
      icon: MessageSquare,
      badgeBg: 'bg-[#e2f6e9]',
      badgeText: 'text-[#24a148]',
      badgeBorder: 'border-[#b8e8c4]',
      buttonBg: 'bg-[#24a148]',
    },
    {
      id: 'dashboard',
      title: 'Dashboard',
      url: linkDashboard,
      setUrl: setLinkDashboard,
      placeholder: 'https://app.powerbi.com/groups/...',
      icon: LayoutDashboard,
      badgeBg: 'bg-[#fcf5e8]',
      badgeText: 'text-[#b26b00]',
      badgeBorder: 'border-[#f5dbb0]',
      buttonBg: 'bg-[#b26b00]',
    },
    {
      id: 'report',
      title: 'Report',
      url: linkReport,
      setUrl: setLinkReport,
      placeholder: 'https://docs.google.com/presentation/...',
      icon: TrendingUp,
      badgeBg: 'bg-[#eef4fb]',
      badgeText: 'text-[#1d508d]',
      badgeBorder: 'border-[#c2d7f0]',
      buttonBg: 'bg-[#1d508d]',
    },
    {
      id: 'beta',
      title: 'Beta',
      url: linkBeta,
      setUrl: setLinkBeta,
      placeholder: 'https://beta.vnexpress.net/...',
      icon: FlaskConical,
      badgeBg: 'bg-[#fefce8]',
      badgeText: 'text-[#ca8a04]',
      badgeBorder: 'border-[#fef08a]',
      buttonBg: 'bg-[#ca8a04]',
    },
    {
      id: 'production',
      title: 'Production',
      url: linkProduction,
      setUrl: setLinkProduction,
      placeholder: 'https://vnexpress.net/...',
      icon: Globe,
      badgeBg: 'bg-[#e2f6e9]',
      badgeText: 'text-[#24a148]',
      badgeBorder: 'border-[#b8e8c4]',
      buttonBg: 'bg-[#24a148]',
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
            className="relative z-10 bg-white w-full max-w-[800px] h-full shadow-2xl flex flex-col border-l border-[#d0d0d0] overflow-hidden"
          >
            {/* Drawer Header */}
        <div className="px-5 py-3.5 bg-[#fafafa] border-b border-[#e0e0e0] flex items-center justify-between gap-3 shrink-0">
          {/* Bên trái: Tên dự án và icon History xem lịch sử điều chỉnh */}
          <div className="flex items-center gap-2.5 min-w-0">
            {isCreateMode && (
              <div className="w-6 h-6 rounded-full bg-[#fcf0f5] border border-[#f3c2d4] text-[#b13460] flex items-center justify-center font-bold shrink-0">
                <Plus className="w-3.5 h-3.5" />
              </div>
            )}
            <h2 className="font-title text-base sm:text-lg font-bold text-[#202020] truncate flex items-center gap-1.5" title={name}>
              {isStrategic && (
                <span className="text-[#d97706] text-base shrink-0" title="Dự án chiến lược - Toà soạn đặc biệt quan tâm">
                  ⭐
                </span>
              )}
              <span className="truncate">{isCreateMode ? (name.trim() || 'Tạo dự án mới') : (name || 'Chưa đặt tên dự án')}</span>
            </h2>
            {isCreateMode ? (
              <span className="text-[10px] font-bold text-[#b13460] bg-[#fcf0f5] px-2 py-0.5 rounded border border-[#f3c2d4] shrink-0">
                Tạo mới
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setIsHistoryOpen(true)}
                className="p-1.5 text-[#505050] hover:text-[#1d508d] hover:bg-[#eef4fb] rounded-[6px] border border-[#d0d0d0] hover:border-[#c2d7f0] transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer shadow-2xs group"
                title="Xem lịch sử điều chỉnh dự án chi tiết"
              >
                <History className="w-4 h-4 text-[#1d508d] group-hover:rotate-[-20deg] transition-transform" />
                <span className="text-[11px] font-ui font-semibold text-[#1d508d] hidden sm:inline">Lịch sử</span>
                {historyLogs.length > 0 && (
                  <span className="font-num text-[10px] font-bold bg-[#1d508d] text-white px-1.5 py-0.2 rounded-full leading-none">
                    {historyLogs.length}
                  </span>
                )}
              </button>
            )}
          </div>

          {/* Bên phải: Tag Status, Button Close kèm text "ESC để đóng". */}
          <div className="flex items-center gap-2 shrink-0">
            {isSavedToast && (
              <span className="text-xs font-semibold text-[#24a148] bg-[#e2f6e9] border border-[#b8e8c4] px-2.5 py-1 rounded-[6px] hidden md:flex items-center gap-1 animate-fade-in">
                <Check className="w-3.5 h-3.5" /> Đã lưu!
              </span>
            )}

            {/* Tag Chiến lược */}
            {isStrategic && (
              <span className="text-xs font-ui font-bold px-2.5 py-1 rounded-full border bg-[#fffbeb] text-[#b45309] border-[#fde68a] shrink-0 flex items-center gap-1">
                ⭐ Chiến lược
              </span>
            )}

            {/* Tag Status */}
            <span
              className={`text-xs font-ui font-semibold px-2.5 py-1 rounded-full border shrink-0 ${
                normalizeProjectStatus(status) === 'Chưa triển khai'
                  ? 'bg-[#f4f4f5] text-[#52525b] border-[#e4e4e7]'
                  : normalizeProjectStatus(status) === 'Đang triển khai'
                  ? 'bg-[#eef4fb] text-[#1d508d] border-[#c2d7f0]'
                  : normalizeProjectStatus(status) === 'Tạm dừng'
                  ? 'bg-[#fff0f1] text-[#da1e28] border-[#ffd0d3]'
                  : 'bg-[#e2f6e9] text-[#24a148] border-[#b8e8c4]'
              }`}
            >
              ● {normalizeProjectStatus(status)}
            </span>

            {/* Button Sao chép liên kết Friendly URL */}
            {!isCreateMode && project && (
              <button
                type="button"
                onClick={handleCopyLink}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-ui font-semibold rounded-[6px] border transition-colors cursor-pointer shadow-2xs shrink-0 ${
                  isCopied
                    ? 'bg-[#e2f6e9] text-[#24a148] border-[#b8e8c4]'
                    : 'bg-white text-[#505050] hover:text-[#202020] hover:bg-[#f0f0f0] border-[#d0d0d0]'
                }`}
                title="Sao chép liên kết dự án để gửi đồng nghiệp"
              >
                {isCopied ? (
                  <Check className="w-3.5 h-3.5 text-[#24a148]" />
                ) : (
                  <Share2 className="w-3.5 h-3.5 text-[#7f7f7f]" />
                )}
                <span>{isCopied ? 'Đã chép link' : 'Sao chép link'}</span>
              </button>
            )}

            {/* Button Close kèm text "ESC để đóng" */}
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-ui font-semibold text-[#505050] hover:text-[#202020] bg-white hover:bg-[#f0f0f0] rounded-[6px] border border-[#d0d0d0] transition-colors cursor-pointer shadow-2xs shrink-0"
              title="Đóng ngăn chi tiết (Phím ESC)"
            >
              <X className="w-4 h-4 text-[#7f7f7f]" />
              <span>ESC để đóng</span>
            </button>
          </div>
        </div>

        {/* Drawer Body - Single Screen Scrollable Content */}
        <div className="p-5 overflow-y-auto font-body text-xs text-[#202020] flex-1 space-y-6">

          {/* ==================== SECTION 1: TỔNG QUAN ==================== */}
          <div className="bg-[#fcfcfc] p-4 rounded-[10px] border border-[#e0e0e0] space-y-4 shadow-2xs">
            <div className="flex items-center justify-between border-b border-[#e6e6e6] pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#fcf0f5] border border-[#f3c2d4] text-[#b13460] flex items-center justify-center font-bold">
                  <FolderKanban className="w-3.5 h-3.5" />
                </div>
                <h3 className="font-title text-sm font-bold text-[#b13460]">
                  1. Tổng quan
                </h3>
              </div>

              {/* Nút Chỉnh sửa / Lưu thông tin Tổng quan */}
              <div className="flex items-center gap-1.5">
                {isCreateMode ? (
                  <span className="text-[11px] font-bold text-[#b13460] bg-[#fcf0f5] px-2 py-0.5 rounded border border-[#f3c2d4]">
                    Nhập thông tin
                  </span>
                ) : !isEditing ? (
                  canEdit ? (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="px-3 py-1 rounded-[6px] bg-[#b13460] hover:bg-[#8f274c] text-white text-xs font-ui font-bold flex items-center gap-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer"
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
                      className="px-2.5 py-1 text-xs font-semibold text-[#5f5f5f] hover:bg-[#f0f0f0] rounded-[6px] transition-colors cursor-pointer"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      className="px-3 py-1 rounded-[6px] bg-[#24a148] hover:bg-[#1f873d] text-white text-xs font-ui font-bold flex items-center gap-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer"
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
                <label className="font-ui text-xs font-semibold text-[#303030] block">
                  Tên dự án <span className="text-[#da1e28]">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-[#d0d0d0] rounded-[6px] text-xs font-semibold text-[#202020] bg-white focus:border-[#b13460] focus:ring-1 focus:ring-[#fcf0f5]"
                />
              </div>
            ) : (
              <div className="bg-white p-3 rounded-[8px] border border-[#e6e6e6]">
                <span className="text-[11px] text-[#7f7f7f] font-ui block mb-0.5">Tên dự án</span>
                <h4 className="font-title text-base font-bold text-[#202020]">{name}</h4>
              </div>
            )}

            {/* Dự án chiến lược (Checkbox) */}
            <div className="bg-white p-3 rounded-[8px] border border-[#e6e6e6]">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isStrategic}
                  disabled={!isEditing}
                  onChange={(e) => setIsStrategic(e.target.checked)}
                  className="w-4 h-4 rounded text-[#b13460] focus:ring-[#b13460] cursor-pointer disabled:opacity-60"
                />
                <div className="text-xs font-ui">
                  <span className="font-bold text-[#18181b] flex items-center gap-1">
                    ⭐ Dự án chiến lược
                  </span>
                  <span className="text-[11px] text-[#71717a] block">
                    Dự án chiến lược cấp Toà soạn / Công ty đặc biệt quan tâm, ưu tiên nguồn lực triển khai
                  </span>
                </div>
              </label>
            </div>

            {/* Trạng thái & Thời gian */}
            {isEditing ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-ui text-xs font-semibold text-[#303030] block">
                    Trạng thái:
                  </label>
                  <select
                    value={normalizeProjectStatus(status)}
                    onChange={(e) => setStatus(normalizeProjectStatus(e.target.value))}
                    className="w-full px-2.5 py-1.5 border border-[#d0d0d0] rounded-[6px] text-xs font-semibold text-[#202020] bg-white font-ui focus:border-[#1d508d]"
                  >
                    <option value="Chưa triển khai">⚪ Chưa triển khai</option>
                    <option value="Đang triển khai">🔵 Đang triển khai</option>
                    <option value="Tạm dừng">🔴 Tạm dừng</option>
                    <option value="Hoàn thành">🟢 Hoàn thành</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-ui text-xs font-semibold text-[#303030] flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#1d508d]" />
                    <span>Bắt đầu:</span>
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-[#d0d0d0] rounded-[6px] text-xs font-num font-semibold text-[#202020] bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-ui text-xs font-semibold text-[#303030] flex items-center gap-1">
                    <Target className="w-3.5 h-3.5 text-[#b13460]" />
                    <span>Hoàn thành:</span>
                  </label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-[#d0d0d0] rounded-[6px] text-xs font-num font-bold text-[#b13460] bg-white"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white p-2.5 rounded-[6px] border border-[#e0e0e0]">
                  <span className="text-[11px] text-[#7f7f7f] font-ui block mb-1">Trạng thái</span>
                  <span
                    className={`inline-block text-xs font-ui font-semibold px-2.5 py-1 rounded-full border ${
                      normalizeProjectStatus(status) === 'Chưa triển khai'
                        ? 'bg-[#f4f4f5] text-[#52525b] border-[#e4e4e7]'
                        : normalizeProjectStatus(status) === 'Đang triển khai'
                        ? 'bg-[#eef4fb] text-[#1d508d] border-[#c2d7f0]'
                        : normalizeProjectStatus(status) === 'Tạm dừng'
                        ? 'bg-[#fff0f1] text-[#da1e28] border-[#ffd0d3]'
                        : 'bg-[#e2f6e9] text-[#24a148] border-[#b8e8c4]'
                    }`}
                  >
                    ● {normalizeProjectStatus(status)}
                  </span>
                </div>

                <div className="bg-white p-2.5 rounded-[6px] border border-[#e0e0e0]">
                  <span className="text-[11px] text-[#7f7f7f] font-ui block mb-0.5">Bắt đầu</span>
                  <span className="font-ui text-xs font-semibold text-[#202020] flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#1d508d]" />
                    {formatDateShort(startDate)}
                  </span>
                </div>

                <div className="bg-white p-2.5 rounded-[6px] border border-[#e0e0e0]">
                  <span className="text-[11px] text-[#7f7f7f] font-ui block mb-0.5">Hoàn thành</span>
                  <span className="font-ui text-xs font-bold text-[#b13460] flex items-center gap-1">
                    <Target className="w-3.5 h-3.5 text-[#b13460]" />
                    {formatDateShort(targetDate)}
                  </span>
                </div>
              </div>
            )}

            {/* Mô tả & Mục tiêu */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-ui text-xs font-semibold text-[#303030] flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#b13460]" />
                  <span>Mô tả:</span>
                </label>
                {isEditing ? (
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Mô tả nội dung và phạm vi sản phẩm..."
                    className="w-full p-2.5 border border-[#d0d0d0] rounded-[6px] text-xs text-[#202020] bg-white leading-relaxed focus:border-[#b13460] focus:ring-1 focus:ring-[#fcf0f5]"
                  />
                ) : (
                  <div className="bg-white p-3 rounded-[6px] border border-[#e0e0e0] text-xs text-[#303030] leading-relaxed min-h-[60px]">
                    {description || <span className="text-[#7f7f7f]">Chưa có thông tin mô tả.</span>}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="font-ui text-xs font-semibold text-[#303030] flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-[#24a148]" />
                  <span>Mục tiêu:</span>
                </label>
                {isEditing ? (
                  <textarea
                    rows={3}
                    value={objective}
                    onChange={(e) => setObjective(e.target.value)}
                    placeholder="Mục tiêu sản phẩm và chỉ số KPI kỳ vọng..."
                    className="w-full p-2.5 border border-[#d0d0d0] rounded-[6px] text-xs text-[#202020] bg-white leading-relaxed focus:border-[#b13460] focus:ring-1 focus:ring-[#fcf0f5]"
                  />
                ) : (
                  <div className="bg-white p-3 rounded-[6px] border border-[#e0e0e0] text-xs text-[#303030] leading-relaxed min-h-[60px]">
                    {objective || <span className="text-[#7f7f7f]">Chưa có mục tiêu KPI.</span>}
                  </div>
                )}
              </div>
            </div>

            {/* Product Owner (Stakeholder đại diện bài toán sản phẩm & nghiệm thu KPI) */}
            <div className="space-y-2 bg-white p-3 rounded-[8px] border border-[#e0e0e0] relative">
              <div className="flex items-center justify-between">
                <label className="font-ui text-xs font-bold text-[#303030] flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-[#b13460]" />
                  <span>Product Owner (Stakeholders):</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[#7f7f7f] hidden sm:inline">
                    Đại diện Tòa soạn / Nghiệp vụ
                  </span>
                  {!isEditing && canEdit && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(true);
                        setIsPoDropdownOpen(true);
                      }}
                      className="text-[11px] font-semibold text-[#b13460] hover:text-[#8f274c] hover:underline flex items-center gap-1 cursor-pointer"
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
                            className="inline-flex items-center gap-1.5 bg-[#fcf0f5] text-[#b13460] border border-[#f3c2d4] px-2.5 py-1 rounded-[6px] text-xs font-semibold shadow-2xs"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-[#b13460]" />
                            <span className="font-bold">{displayName}</span>
                            {matchedMember && (
                              <span className="text-[10px] text-[#8f274c] font-normal border-l border-[#f3c2d4] pl-1.5">
                                {matchedMember.title} {matchedMember.department ? `(${matchedMember.department})` : ''}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-xs text-[#7f7f7f] font-normal bg-[#fafafa] p-2.5 rounded-[6px] border border-dashed border-[#d6d6d6] flex items-center justify-between">
                      <span>Chưa phân công Product Owner cho dự án này.</span>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditing(true);
                            setIsPoDropdownOpen(true);
                          }}
                          className="text-[11px] font-semibold text-[#b13460] hover:underline cursor-pointer"
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
                  <div className="p-2 bg-white border border-[#d0d0d0] focus-within:border-[#b13460] rounded-[6px] transition-colors relative">
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
                            className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-[4px] bg-[#fcf0f5] text-[#b13460] border border-[#f3c2d4]"
                          >
                            <span>{displayName}</span>
                            {matchedMember && (
                              <span className="text-[10px] text-[#8f274c] opacity-80 hidden md:inline">
                                ({matchedMember.title})
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemovePo(poName)}
                              className="hover:text-[#8f274c] hover:bg-[#fbdde8] p-0.5 rounded-full cursor-pointer ml-0.5"
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
                        className="flex-1 min-w-[200px] text-xs font-ui bg-transparent outline-none text-[#202020] placeholder:text-[#9e9e9e] py-1"
                      />

                      {selectedPoList.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setProductOwner('')}
                          className="text-[11px] text-[#7f7f7f] hover:text-[#da1e28] px-1.5 py-0.5 rounded hover:bg-[#fee2e2] cursor-pointer"
                          title="Xóa tất cả Product Owners đã chọn"
                        >
                          Xóa hết
                        </button>
                      )}
                    </div>

                    {/* Suggestions Dropdown */}
                    {isPoDropdownOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-[#d6d6d6] rounded-[8px] shadow-xl max-h-64 overflow-y-auto z-40 p-2">
                        {/* Dropdown Header */}
                        <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-[#f0f0f0]">
                          <span className="text-[10px] font-bold text-[#7f7f7f] uppercase tracking-wider">
                            Danh sách Stakeholders ({availableStakeholders.length})
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsPoDropdownOpen(false)}
                            className="text-xs text-[#5f5f5f] hover:text-[#202020] font-semibold px-1.5 py-0.5 rounded hover:bg-[#f0f0f0] cursor-pointer"
                          >
                            Đóng ✕
                          </button>
                        </div>

                        {/* Department Filter Pills */}
                        <div className="flex flex-wrap gap-1 mb-2 pb-1 border-b border-[#f5f5f5]">
                          {stakeholderDepts.map((dept) => (
                            <button
                              key={dept}
                              type="button"
                              onClick={() => setPoFilterDept(dept)}
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                                poFilterDept === dept
                                  ? 'bg-[#b13460] text-white'
                                  : 'bg-[#f5f5f5] text-[#5f5f5f] hover:bg-[#e8e8e8]'
                              }`}
                            >
                              {dept}
                            </button>
                          ))}
                        </div>

                        {/* Allow adding custom typed value */}
                        {poSearchQuery.trim() && !candidateStakeholders.some((m) => m.name.toLowerCase() === poSearchQuery.trim().toLowerCase()) && (
                          <div className="mb-2 p-1.5 bg-[#fcf0f5] border border-[#f3c2d4] rounded-[6px] flex items-center justify-between">
                            <span className="text-xs text-[#b13460]">
                              Thêm thực thể/tên tùy chỉnh: <strong>"{poSearchQuery.trim()}"</strong>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleAddPo(poSearchQuery.trim())}
                              className="px-2 py-0.5 rounded bg-[#b13460] text-white text-[11px] font-bold hover:bg-[#8f274c] cursor-pointer"
                            >
                              + Thêm
                            </button>
                          </div>
                        )}

                        {/* Candidate List */}
                        {availableStakeholders.length === 0 ? (
                          <div className="px-3 py-4 text-xs text-[#7f7f7f] text-center italic">
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
                                  className="w-full text-left px-2.5 py-1.5 rounded-[6px] hover:bg-[#fcf0f5] hover:border-[#f3c2d4] border border-transparent flex items-center justify-between text-xs transition-colors cursor-pointer group"
                                >
                                  <div>
                                    <div className="font-bold text-[#202020] group-hover:text-[#b13460] flex items-center gap-1.5">
                                      <span>{formalName}</span>
                                      {m.region && (
                                        <span className="text-[10px] font-normal text-[#7f7f7f] bg-[#f0f0f0] px-1.5 py-0.2 rounded">
                                          {m.region}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[11px] text-[#5f5f5f]">
                                      <span className="font-semibold text-[#303030]">{m.title || 'Stakeholder'}</span>
                                      {m.department && <span> • {m.department}</span>}
                                    </div>
                                  </div>
                                  <span className="text-[11px] font-bold text-[#b13460] bg-[#fcf0f5] group-hover:bg-[#b13460] group-hover:text-white px-2 py-1 rounded transition-colors shrink-0">
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
                  <p className="text-[11px] text-[#7f7f7f] italic">
                    * Tìm và chọn một hoặc nhiều đại diện Stakeholder (Ban Biên tập / Lãnh đạo ban nội dung) phụ trách bài toán sản phẩm và nghiệm thu KPI.
                  </p>
                </div>
              )}
            </div>

            {/* Sản phẩm: Phân công nhân sự theo Nhóm Chuyên môn */}
            <div className="space-y-2 pt-1">
              <label className="font-ui text-xs font-bold text-[#202020] block">
                Sản phẩm:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Role 1: Product Manager */}
                <div className="space-y-1.5 bg-white p-2.5 rounded-[6px] border border-[#e6e6e6]">
                  <span className="font-ui text-xs font-bold text-[#b13460] flex items-center gap-1">
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
                            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-[#b13460] text-white shadow-2xs'
                                : 'bg-[#f0f0f0] text-[#5f5f5f] hover:bg-[#e0e0e0]'
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
                          <span key={name} className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#fcf0f5] text-[#b13460] border border-[#f3c2d4]">
                            {formatProductMemberWithPhone(name, members)}
                          </span>
                        ))
                      ) : (
                        <span className="text-[#7f7f7f] text-[11px]">Chưa phân công PM</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Role 2: UX/UI Designer */}
                <div className="space-y-1.5 bg-white p-2.5 rounded-[6px] border border-[#e6e6e6]">
                  <span className="font-ui text-xs font-bold text-[#b26b00] flex items-center gap-1">
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
                            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-[#b26b00] text-white shadow-2xs'
                                : 'bg-[#f0f0f0] text-[#5f5f5f] hover:bg-[#e0e0e0]'
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
                          <span key={name} className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#fcf5e8] text-[#b26b00] border border-[#f5dbb0]">
                            {formatProductMemberWithPhone(name, members)}
                          </span>
                        ))
                      ) : (
                        <span className="text-[#7f7f7f] text-[11px]">Chưa phân công Thiết kế</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Role 3: SEO */}
                <div className="space-y-1.5 bg-white p-2.5 rounded-[6px] border border-[#e6e6e6]">
                  <span className="font-ui text-xs font-bold text-[#24a148] flex items-center gap-1">
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
                            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-[#24a148] text-white shadow-2xs'
                                : 'bg-[#f0f0f0] text-[#5f5f5f] hover:bg-[#e0e0e0]'
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
                          <span key={name} className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#e2f6e9] text-[#24a148] border border-[#b8e8c4]">
                            {formatProductMemberWithPhone(name, members)}
                          </span>
                        ))
                      ) : (
                        <span className="text-[#7f7f7f] text-[11px]">Chưa phân công SEO</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Role 4: Data */}
                <div className="space-y-1.5 bg-white p-2.5 rounded-[6px] border border-[#e6e6e6]">
                  <span className="font-ui text-xs font-bold text-[#1d508d] flex items-center gap-1">
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
                            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-[#1d508d] text-white shadow-2xs'
                                : 'bg-[#f0f0f0] text-[#5f5f5f] hover:bg-[#e0e0e0]'
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
                          <span key={name} className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#eef4fb] text-[#1d508d] border border-[#c2d7f0]">
                            {formatProductMemberWithPhone(name, members)}
                          </span>
                        ))
                      ) : (
                        <span className="text-[#7f7f7f] text-[11px]">Chưa phân công Dữ liệu</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ==================== SECTION 2: GIAI ĐOẠN ==================== */}
          <div className="bg-[#fcfcfc] p-4 rounded-[10px] border border-[#e0e0e0] space-y-4 shadow-2xs">
            <div className="flex items-center justify-between border-b border-[#e6e6e6] pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#eef4fb] border border-[#c2d7f0] text-[#1d508d] flex items-center justify-center font-bold">
                  <Calendar className="w-3.5 h-3.5" />
                </div>
                <h3 className="font-title text-sm font-bold text-[#1d508d]">
                  2. Giai đoạn ({phases.length})
                </h3>
              </div>

              {!isAddingPhase && (
                canManagePhases ? (
                  <button
                    type="button"
                    onClick={() => setIsAddingPhase(true)}
                    className="px-2.5 py-1 text-xs font-semibold text-[#1d508d] bg-[#eef4fb] hover:bg-[#dbe9f8] border border-[#c2d7f0] rounded-[6px] flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm giai đoạn</span>
                  </button>
                ) : (
                  <span className="text-[11px] text-[#7f7f7f] font-ui italic">
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
              <div className="bg-white p-3.5 rounded-[8px] border border-[#1d508d] space-y-3 animate-fade-in shadow-2xs">
                <div className="flex items-center justify-between">
                  <h4 className="font-title text-xs font-bold text-[#1d508d] flex items-center gap-1.5">
                    <Plus className="w-4 h-4" />
                    <span>Thêm Giai đoạn mới vào Lộ trình</span>
                  </h4>
                  <span className="text-[10px] font-bold text-[#1d508d] bg-[#eef4fb] px-2 py-0.5 rounded border border-[#c2d7f0]">
                    Tự sinh Giai đoạn theo thời gian
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#303030]">
                      Nội dung giai đoạn <span className="text-[#da1e28]">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="VD: Khảo sát & PRD, Thiết kế UI/UX, Kiểm thử tải..."
                      value={newPhaseName}
                      onChange={(e) => setNewPhaseName(e.target.value)}
                      className="w-full p-2 border border-[#d0d0d0] rounded-[6px] text-xs text-[#202020] bg-white focus:border-[#1d508d] focus:ring-1 focus:ring-[#eef4fb]"
                    />
                    <p className="text-[10px] text-[#7f7f7f] italic">
                      * Không cần nhập "Giai đoạn 1, 2...", hệ thống sẽ tự động sắp xếp theo thời gian từ gần đến xa và tự gán số.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#303030]">
                      Hạn hoàn thành <span className="text-[#da1e28]">*</span>
                    </label>
                    <input
                      type="date"
                      value={newPhaseDueDate}
                      onChange={(e) => setNewPhaseDueDate(e.target.value)}
                      className="w-full p-2 border border-[#d0d0d0] rounded-[6px] text-xs font-num bg-white focus:border-[#1d508d] focus:ring-1 focus:ring-[#eef4fb]"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-[#303030]">
                    Mô tả giai đoạn / Tiêu chí bàn giao (không bắt buộc):
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Mô tả nội dung, tiêu chí bàn giao..."
                    value={newPhaseDesc}
                    onChange={(e) => setNewPhaseDesc(e.target.value)}
                    className="w-full p-2 border border-[#d0d0d0] rounded-[6px] text-xs text-[#202020] bg-white focus:border-[#1d508d] focus:ring-1 focus:ring-[#eef4fb]"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingPhase(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-[#5f5f5f] bg-[#f0f0f0] hover:bg-[#e0e0e0] rounded-[6px] cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleAddPhase}
                    className="px-4 py-1.5 text-xs font-semibold text-white bg-[#1d508d] hover:bg-[#153a66] rounded-[6px] shadow-2xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Lưu giai đoạn</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ==================== SECTION 3: LIÊN KẾT ==================== */}
          <div className="bg-[#fcfcfc] p-4 rounded-[10px] border border-[#e0e0e0] space-y-4 shadow-2xs">
            <div className="flex items-center justify-between border-b border-[#e6e6e6] pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#e2f6e9] border border-[#b8e8c4] text-[#24a148] flex items-center justify-center font-bold">
                  <ExternalLink className="w-3.5 h-3.5" />
                </div>
                <h3 className="font-title text-sm font-bold text-[#24a148]">
                  3. Liên kết
                </h3>
              </div>
              <span className="text-[11px] text-[#7f7f7f] font-ui">
                {isEditing ? 'Nhập đường dẫn liên kết' : 'Chọn liên kết để truy cập trực tiếp'}
              </span>
            </div>

            {/* 6 Tiêu chuẩn: Order Tech, Chat Group, Dashboard, Report, Beta, Production */}
            {isEditing ? (
              /* EDIT MODE FOR 6 STANDARD LINKS */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {linkItems.map((item) => {
                  const IconComp = item.icon;
                  return (
                    <div key={item.id} className="space-y-0.5">
                      <label className="font-ui text-[11px] font-semibold text-[#5f5f5f] flex items-center gap-1">
                        <IconComp className="w-3 h-3 text-[#b13460]" />
                        <span>{item.title}:</span>
                      </label>
                      <div className="flex gap-1">
                        <input
                          type="url"
                          value={item.url}
                          onChange={(e) => item.setUrl(e.target.value)}
                          placeholder={item.placeholder}
                          className="flex-1 px-2 py-1 border border-[#d0d0d0] rounded-[4px] text-xs text-[#202020] bg-white"
                        />
                        {item.url && (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 bg-[#fcf0f5] text-[#b13460] border border-[#f3c2d4] rounded-[4px] hover:bg-[#b13460] hover:text-white transition-colors"
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
                      className="bg-white p-2.5 rounded-[8px] border border-[#e0e0e0] flex items-center justify-between gap-2 hover:border-[#24a148] transition-all group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`p-1.5 rounded-[6px] ${item.badgeBg} ${item.badgeText} ${item.badgeBorder} border shrink-0`}>
                          <IconComp className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="font-ui text-xs font-bold text-[#202020] block truncate">
                            {item.title}
                          </span>
                          <span className="text-[11px] text-[#7f7f7f] block truncate font-num">
                            {hasUrl ? item.url : 'Chưa cập nhật liên kết'}
                          </span>
                        </div>
                      </div>

                      {hasUrl ? (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-[6px] bg-[#e2f6e9] text-[#24a148] border border-[#b8e8c4] group-hover:bg-[#24a148] group-hover:text-white font-ui text-xs font-bold flex items-center gap-1 transition-colors shrink-0"
                          title="Mở trong tab mới"
                        >
                          <span>Mở</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-[11px] text-[#a0a0a0] font-ui px-2 py-0.5 bg-[#f0f0f0] rounded-[4px] shrink-0">
                          Chưa có liên kết
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Custom Links (Tự thêm liên kết theo nhu cầu gồm Title và Link) */}
            <div className="pt-2 border-t border-[#f0f0f0] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-ui text-xs font-bold text-[#303030] flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-[#1d508d]" />
                  <span>Liên kết tùy chọn bổ sung ({customLinks.length}):</span>
                </span>
                {!isAddingCustomLink && (
                  <button
                    type="button"
                    onClick={() => setIsAddingCustomLink(true)}
                    className="text-[11px] font-semibold text-[#1d508d] hover:text-[#143765] flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm liên kết mới</span>
                  </button>
                )}
              </div>

              {/* Form Thêm Custom Link */}
              {isAddingCustomLink && (
                <div className="bg-white p-3 rounded-[8px] border border-[#1d508d] space-y-2.5 animate-fade-in shadow-xs">
                  <div className="text-xs font-bold text-[#1d508d]">Thêm liên kết mới:</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-0.5">
                      <label className="text-[11px] font-semibold text-[#505050]">Title (Tiêu đề):</label>
                      <input
                        type="text"
                        placeholder="VD: Tài liệu thiết kế Figma, API Docs..."
                        value={newCustomTitle}
                        onChange={(e) => setNewCustomTitle(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-[#d0d0d0] rounded-[6px] text-xs text-[#202020]"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-[11px] font-semibold text-[#505050]">Link (Đường dẫn):</label>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={newCustomUrl}
                        onChange={(e) => setNewCustomUrl(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-[#d0d0d0] rounded-[6px] text-xs text-[#202020]"
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
                      className="px-2.5 py-1 text-xs font-semibold text-[#5f5f5f] hover:bg-[#f0f0f0] rounded-[4px] cursor-pointer"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={handleAddCustomLink}
                      disabled={!newCustomTitle.trim() || !newCustomUrl.trim()}
                      className="px-3 py-1 text-xs font-semibold text-white bg-[#1d508d] hover:bg-[#163f70] rounded-[4px] disabled:opacity-50 cursor-pointer"
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
                      className="bg-white p-2.5 rounded-[6px] border border-[#e0e0e0] flex items-center justify-between gap-2 hover:border-[#1d508d] transition-colors"
                    >
                      <div className="min-w-0 flex items-center gap-2">
                        <Link2 className="w-3.5 h-3.5 text-[#1d508d] shrink-0" />
                        <div className="min-w-0">
                          <span className="font-ui text-xs font-bold text-[#202020] block truncate">
                            {cl.title}
                          </span>
                          <span className="text-[11px] text-[#7f7f7f] block truncate font-num">
                            {cl.url}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <a
                          href={cl.url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2 py-0.5 rounded-[4px] bg-[#eef4fb] text-[#1d508d] border border-[#c2d7f0] hover:bg-[#1d508d] hover:text-white text-[11px] font-bold flex items-center gap-1 transition-colors"
                          title="Mở trong tab mới"
                        >
                          <span>Mở</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomLink(cl.id)}
                          className="p-1 text-[#a0a0a0] hover:text-[#da1e28] hover:bg-[#fff0f1] rounded-[4px] transition-colors cursor-pointer"
                          title="Xóa liên kết"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                !isAddingCustomLink && (
                  <p className="text-[11px] text-[#7f7f7f] bg-white p-2.5 rounded-[6px] border border-dashed border-[#e0e0e0] text-center">
                    Chưa có liên kết tùy chọn nào. Bấm &quot;Thêm liên kết mới&quot; để bổ sung đường dẫn theo nhu cầu.
                  </p>
                )
              )}
            </div>
          </div>

          {/* ==================== SECTION 4: GHI CHÚ ==================== */}
          <div className="bg-[#fcfcfc] p-4 rounded-[10px] border border-[#e0e0e0] space-y-4 shadow-2xs">
            <div className="flex items-center justify-between border-b border-[#e6e6e6] pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#fcf0f5] border border-[#f3c2d4] text-[#b13460] flex items-center justify-center font-bold">
                  <MessageSquare className="w-3.5 h-3.5" />
                </div>
                <h3 className="font-title text-sm font-bold text-[#b13460]">
                  4. Ghi chú ({notes.length})
                </h3>
              </div>
              <span className="text-[11px] text-[#7f7f7f] font-ui">
                Lưu vết thông tin trao đổi, quyết định nhanh và lưu ý dự án
              </span>
            </div>

            {/* Form Thêm Ghi chú */}
            <div className="bg-white p-3.5 rounded-[8px] border border-[#e0e0e0] space-y-3 shadow-xs">
              <h4 className="font-title text-xs font-bold text-[#202020] flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-[#b13460]" />
                <span>Thêm ghi chú mới</span>
              </h4>

              <div className="space-y-2">
                {/* Người ghi chú - Cố định người đang đăng nhập */}
                <div className="space-y-1">
                  <label className="font-ui text-xs font-semibold text-[#303030] flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-[#b13460]" />
                    <span>Người ghi chú:</span>
                  </label>
                  <div className="px-3 py-1.5 bg-[#f8f9fa] border border-[#d0d0d0] rounded-[6px] text-xs font-semibold text-[#202020]">
                    {currentActorName}
                  </div>
                </div>

                {/* Nội dung */}
                <div className="space-y-1">
                  <label className="font-ui text-xs font-semibold text-[#303030] flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-[#1d508d]" />
                    <span>Nội dung:</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Nhập nội dung ghi chú, quyết định kỹ thuật, thống nhất thiết kế hoặc lưu ý quan trọng..."
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                    className="w-full p-2.5 border border-[#d0d0d0] rounded-[6px] text-xs text-[#202020] bg-white leading-relaxed focus:border-[#b13460] focus:ring-1 focus:ring-[#fcf0f5]"
                  />
                </div>

                {/* Submit button */}
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleAddNote}
                    disabled={!newNoteContent.trim()}
                    className="px-4 py-2 rounded-[6px] bg-[#b13460] hover:bg-[#8f274c] text-white text-xs font-ui font-bold flex items-center gap-1.5 shadow-2xs transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Thêm ghi chú</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Danh sách Ghi chú */}
            <div className="space-y-2.5">
              <h4 className="font-ui text-xs font-bold text-[#303030]">
                Nhật ký ghi chú ({notes.length}):
              </h4>

              {notes.length === 0 ? (
                <div className="bg-white p-5 rounded-[8px] border border-[#e0e0e0] text-center space-y-1">
                  <MessageSquare className="w-7 h-7 text-[#b0b0b0] mx-auto" />
                  <p className="text-xs font-semibold text-[#5f5f5f]">Chưa có ghi chú nào cho dự án này</p>
                  <p className="text-[11px] text-[#808080]">
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
                        className="bg-white p-3.5 rounded-[8px] border border-[#e0e0e0] space-y-2 hover:border-[#b13460]/40 transition-colors shadow-2xs"
                      >
                        <div className="flex items-center justify-between gap-2 border-b border-[#f0f0f0] pb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-6 h-6 rounded-full bg-[#fcf0f5] border border-[#f3c2d4] text-[#b13460] flex items-center justify-center font-bold text-xs shrink-0">
                              {authorInitial}
                            </div>
                            <span className="font-ui text-xs font-bold text-[#202020] truncate">
                              {note.author}
                            </span>
                            <span className="text-[11px] text-[#808080] font-ui shrink-0">
                              • {formattedDate}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveNote(note.id)}
                            className="p-1 text-[#a0a0a0] hover:text-[#da1e28] hover:bg-[#fff0f1] rounded-[4px] transition-colors cursor-pointer"
                            title="Xóa ghi chú này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Nội dung ghi chú */}
                        <div className="text-xs text-[#303030] leading-relaxed whitespace-pre-wrap">
                          {note.content}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Drawer Sticky Footer */}
        <div className="px-5 py-3 bg-[#fafafa] border-t border-[#e0e0e0] flex items-center justify-between shrink-0">
          <div className="text-[11px] text-[#7f7f7f] font-ui flex items-center gap-1.5">
            {isCreateMode ? (
              <span className="text-[#b13460] font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#b13460] animate-ping"></span>
                Tạo dự án mới — Điền thông tin và nhấn Tạo dự án mới
              </span>
            ) : isEditing ? (
              <span className="text-[#b13460] font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#b13460] animate-ping"></span>
                Chế độ Chỉnh sửa
              </span>
            ) : (
              <span className="text-[#1d508d] font-semibold flex items-center gap-1">
                <Eye className="w-3.5 h-3.5 text-[#1d508d]" />
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
                  className="px-3.5 py-1.5 text-xs font-semibold text-[#5f5f5f] hover:bg-[#f0f0f0] rounded-[6px] transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleCreateNewProject}
                  className="px-5 py-2 bg-[#b13460] hover:bg-[#8f274c] text-white text-xs font-ui font-bold rounded-[6px] shadow-sm flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
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
                  className="px-3.5 py-1.5 text-xs font-semibold text-[#5f5f5f] hover:bg-[#f0f0f0] rounded-[6px] transition-colors cursor-pointer"
                >
                  Đóng
                </button>
                {canEdit ? (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-1.5 bg-[#b13460] hover:bg-[#8f274c] text-white text-xs font-semibold rounded-[6px] shadow-2xs flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Chỉnh sửa thông tin</span>
                  </button>
                ) : (
                  <span className="text-xs text-[#71717a] font-ui bg-[#f4f4f5] px-2.5 py-1 rounded-[6px] border border-[#e4e4e7]">
                    🔒 Chế độ xem
                  </span>
                )}
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-3.5 py-1.5 text-xs font-semibold text-[#5f5f5f] hover:bg-[#f0f0f0] rounded-[6px] transition-colors"
                >
                  Hủy thay đổi
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-4 py-1.5 bg-[#24a148] hover:bg-[#1f873d] text-white text-xs font-semibold rounded-[6px] shadow-2xs flex items-center gap-1.5 transition-transform active:scale-95"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Lưu thay đổi</span>
                </button>
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
