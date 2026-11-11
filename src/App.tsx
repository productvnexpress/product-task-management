/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  TaskItem,
  ProjectItem,
  MemberItem,
  FilterState,
  ActiveTab,
  TaskStatus,
  TeamType,
  PriorityLevel,
  DueFilterType,
  TrashItem,
  TaskLogItem,
  NotificationItem,
  RecurrenceFrequency,
  FolderItem,
} from './types';
import { INITIAL_PROJECTS, INITIAL_MEMBERS, INITIAL_TASKS } from './data/initialData';
import {
  INITIAL_FOLDERS,
  ensureProjectsHaveFolder,
  getFolderPath,
  inferProjectFolderId,
  isDirectFolderTask,
  isTaskMatchingFolderFilter,
  loadFoldersFromStorage,
  saveFoldersToStorage,
  getDescendantFolderIds,
  getTaskEffectiveFolderId,
} from './utils/folderUtils';
import { FolderManagerModal } from './components/FolderManagerModal';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { ActiveFiltersBar } from './components/ActiveFiltersBar';
import { QuickAddBar } from './components/QuickAddBar';
import { TaskViewBar, GroupModeTabs, QuickView } from './components/tasks/TaskViewBar';
import { TaskGroupMode, groupTasksByDue, sortTasksByUrgency, DueBucketKey } from './utils/taskViewUtils';
import { MobileQuickAddDrawer } from './components/MobileQuickAddDrawer';
import { CommandPalette, PaletteCommand } from './components/CommandPalette';
import { MobileTabBar } from './components/MobileTabBar';
import { UndoToast, UndoToastState } from './components/UndoToast';
import { TaskItemRow } from './components/TaskItemRow';
import { TaskDetailDrawer } from './components/TaskDetailDrawer';
import { NotificationDrawer } from './components/NotificationDrawer';
import { NotificationToastContainer } from './components/NotificationToastContainer';
import { WebPushPromptBanner } from './components/WebPushPromptBanner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { StandupModal } from './components/StandupModal';
import { LoginView } from './components/LoginView';
import { ProfileModal } from './components/ProfileModal';
import { ForceChangePasswordModal } from './components/ForceChangePasswordModal';
import { AdminSendMessageModal } from './components/AdminSendMessageModal';
import { getCurrentAuthUser, logout, syncPasswordsFromSupabase, isUserUsingDefaultPassword, checkAndLogoutIfDefaultPassword } from './utils/authService';
import { DailyCompletionAlert } from './components/DailyCompletionAlert';
import { DailyLeaveNotice, useProductLeaves } from './components/DailyLeaveNotice';
import { getDailyDueTaskStats } from './utils/dailyAccountability';
import { MondayWeeklySummary } from './components/MondayWeeklySummary';
import { UpcomingHolidayBanner } from './components/UpcomingHolidayBanner';
import { CompleteTaskModal } from './components/CompleteTaskModal';
import { workingTimeService } from './services/workingTimeService';
import { recurringTaskService } from './services/recurringTaskService';
import { notificationRuleService } from './services/notificationRuleService';
import { fetchMasterChecklistTemplateFromSupabase } from './data/defaultProjectChecklist';
import { checkAndDispatchProjectDeadlineNotifications } from './utils/projectDeadlineAlerts';
import { checkAndDispatchDailyCloseTaskNotifications } from './utils/dailyCloseTaskAlerts';
import { checkAndDispatchDailyMorningTaskNotifications } from './utils/dailyMorningTaskAlerts';
import { parseCurrentRoute, updateBrowserUrl, ParsedRoute } from './utils/urlRouting';
import { TaskPersonalScope } from './components/PersonalizationBanner';
import { isTaskForMember, isTaskInMemberProjects, getMemberProjectRelation, isSamePersonName, getProjectPMs, getProductMembers } from './utils/memberPersonalization';
import { isTaskOverdue, isTaskDueToday, isTaskDueSoon, getTodayDateString, normalizeDateString, formatTaskDueDisplay } from './utils/dateUtils';
import { formatDateWithEnDay } from './utils/formatters';
import { extractMentions, getTaskThreadParticipants } from './utils/mentionUtils';
import { NextTaskSuggestions, type NextSuggestState } from './components/NextTaskSuggestions';
import {
  canSuggestFor,
  turnSuggestOffToday,
  fetchNextSuggestions,
  reportSuggestionAccepted,
  type NextSuggestion,
  type SuggestTrigger,
} from './services/suggestService';
import { isValidUrl, normalizeUrl } from './utils/urlValidator';
import { deduplicateNotifications } from './utils/notificationDeduplication';
import { recordTaskChanges, createCreationLog, deduplicateTaskLogs } from './utils/taskLogUtils';
import { wmsDataService } from './services/wmsDataService';
import { getUserRole, canPermanentDeleteTrash, canEmptyTrash } from './utils/rbac';
import { canViewTeamPerformance } from './utils/teamPerformance';
import { normalizeProjectStatus } from './utils/projectSortingUtils';
import {
  initWebPushListener,
  dispatchNotificationWebPush,
  showWebPushNotification,
  isWebPushEnabledByUser,
} from './utils/webPushNotifications';
import { Filter, CheckSquare, Plus, AlertTriangle, Layers, Globe, Star, Briefcase, Folder, CheckCircle2, ChevronRight, Bell, BarChart3, FolderKanban, Sun, AlertOctagon, CalendarClock, User as UserIcon, Users as UsersIcon, TrendingUp } from './components/vds/icons';
import { VdsButton } from './components/vds';

export function App() {
  // Current time state
  const [currentDate] = useState(new Date());

  // Database Connection State (Supabase Live / Offline Cache)
  const [isDbConnected, setIsDbConnected] = useState<boolean | null>(null);

  // Folders state (Cây thư mục phân cấp: VnExpress -> Thể thao, Thế giới..., Ngôi sao, English, Tia sáng)
  const [folders, setFolders] = useState<FolderItem[]>(() => loadFoldersFromStorage());
  const [isFolderManagerOpen, setIsFolderManagerOpen] = useState(false);

  // Main persistence states
  const [projects, setProjects] = useState<ProjectItem[]>(() => {
    const saved = localStorage.getItem('vne_projects_v9');
    const rawList: ProjectItem[] = saved ? JSON.parse(saved) : INITIAL_PROJECTS;
    return ensureProjectsHaveFolder(
      rawList.map((p) => {
        const customLinks = p.links?.custom || p.customLinks || [];
        const hasLinksObj = p.links !== undefined;
        return {
          ...p,
          status: normalizeProjectStatus(p.status),
          linkOrderTech: hasLinksObj ? (p.links?.orderTech || undefined) : (p.linkOrderTech || undefined),
          linkChat: hasLinksObj ? (p.links?.chat || undefined) : (p.linkChat || undefined),
          linkDashboard: hasLinksObj ? (p.links?.dashboard || undefined) : (p.linkDashboard || undefined),
          linkReport: hasLinksObj ? (p.links?.report || undefined) : (p.linkReport || undefined),
          linkBeta: hasLinksObj ? (p.links?.beta || undefined) : (p.linkBeta || undefined),
          linkProduction: hasLinksObj ? (p.links?.production || undefined) : (p.linkProduction || undefined),
          links: {
            orderTech: hasLinksObj ? (p.links?.orderTech || undefined) : (p.linkOrderTech || undefined),
            chat: hasLinksObj ? (p.links?.chat || undefined) : (p.linkChat || undefined),
            dashboard: hasLinksObj ? (p.links?.dashboard || undefined) : (p.linkDashboard || undefined),
            report: hasLinksObj ? (p.links?.report || undefined) : (p.linkReport || undefined),
            beta: hasLinksObj ? (p.links?.beta || undefined) : (p.linkBeta || undefined),
            production: hasLinksObj ? (p.links?.production || undefined) : (p.linkProduction || undefined),
            custom: customLinks,
          },
          customLinks,
        };
      })
    );
  });

  const [members, setMembers] = useState<MemberItem[]>(() => {
    const saved = localStorage.getItem('vne_members_v11');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return INITIAL_MEMBERS;
      }
    }
    const prevSaved = localStorage.getItem('vne_members_v10') || localStorage.getItem('vne_members_v9');
    if (prevSaved) {
      try {
        const parsed: MemberItem[] = JSON.parse(prevSaved);
        // Map over INITIAL_MEMBERS to ensure newly updated salutations and official records take precedence
        const parsedMap = new Map(parsed.map((m) => [m.id, m]));
        const merged = INITIAL_MEMBERS.map((im) => {
          const prev = parsedMap.get(im.id);
          return prev ? { ...im, ...prev, salutation: im.salutation || prev.salutation } : im;
        });
        // Include any custom created members
        const initialIds = new Set(INITIAL_MEMBERS.map((m) => m.id));
        const customMembers = parsed.filter((m) => !initialIds.has(m.id));
        return [...merged, ...customMembers];
      } catch (e) {
        return INITIAL_MEMBERS;
      }
    }
    return INITIAL_MEMBERS;
  });

  const [tasks, setTasks] = useState<TaskItem[]>(() => {
    const saved = localStorage.getItem('vne_tasks_v9');
    return saved ? JSON.parse(saved) : INITIAL_TASKS;
  });

  const [trash, setTrash] = useState<TrashItem[]>(() => {
    const saved = localStorage.getItem('vne_trash_v1');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    const saved = localStorage.getItem('vne_notifications_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return deduplicateNotifications(parsed);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const notificationsRef = useRef(notifications);
  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  const tasksRef = useRef(tasks);
  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  const trashRef = useRef(trash);
  useEffect(() => {
    trashRef.current = trash;
  }, [trash]);

  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);

  // Active view tab state (Friendly URL synchronized)
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    return parseCurrentRoute().tab;
  });

  // Khi chuyển tab (trang A sang trang B), tự động cuộn lên đầu trang
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
  }, [activeTab]);

  // Pending deep link route waiting for data (tasks / projects) to load
  const [pendingRoute, setPendingRoute] = useState<ParsedRoute | null>(() => parseCurrentRoute());

// Helper to determine default perspective by RBAC role:
// 1. Admin: Toàn bộ phận
// 2. Manager: Dự án của tôi
// 3. Executive: Của tôi
// Các trang ít dùng hơn được tải khi cần để trang Công việc mở nhanh trên mobile
const ProjectsManager = lazy(() => import('./components/ProjectsManager').then((m) => ({ default: m.ProjectsManager })));
const MembersManager = lazy(() => import('./components/MembersManager').then((m) => ({ default: m.MembersManager })));
const TrashManager = lazy(() => import('./components/TrashManager').then((m) => ({ default: m.TrashManager })));
const SettingsManager = lazy(() => import('./components/SettingsManager').then((m) => ({ default: m.SettingsManager })));
const ProjectDetailsDrawer = lazy(() =>
  import('./components/ProjectDetailsDrawer').then((m) => ({ default: m.ProjectDetailsDrawer }))
);
const AdminReportView = lazy(() => import('./components/AdminReportView').then((m) => ({ default: m.AdminReportView })));
const TeamPerformanceView = lazy(() =>
  import('./components/TeamPerformanceView').then((m) => ({ default: m.TeamPerformanceView }))
);

// Tải trước các gói phụ khi trình duyệt rảnh để chuyển trang không phải chờ
const prefetchSecondaryViews = () => {
  const run = () => {
    import('./components/ProjectsManager');
    import('./components/ProjectDetailsDrawer');
    import('./components/AdminReportView');
    import('./components/MembersManager');
    import('./components/TrashManager');
    import('./components/SettingsManager');
  };
  const w = window as Window & { requestIdleCallback?: (cb: () => void) => number };
  if (w.requestIdleCallback) w.requestIdleCallback(run);
  else window.setTimeout(run, 1500);
};

const ViewFallback = () => (
  <div className="space-y-3 animate-pulse" aria-busy="true" aria-label="Đang tải">
    <div className="h-24 rounded-vds-lg bg-surface border border-divider" />
    <div className="h-40 rounded-vds-lg bg-surface border border-divider" />
    <div className="h-40 rounded-vds-lg bg-surface border border-divider" />
  </div>
);

const getDefaultPerspectiveForUser = (user: MemberItem | null) => {
  if (!user) {
    return {
      activeMember: null,
      scope: 'all' as TaskPersonalScope,
      assignee: 'Tất cả',
    };
  }
  const role = getUserRole(user);
  if (role === 'Admin') {
    return {
      activeMember: null,
      scope: 'all' as TaskPersonalScope,
      assignee: 'Tất cả',
    };
  } else if (role === 'Manager') {
    return {
      activeMember: user,
      scope: 'my_projects_tasks' as TaskPersonalScope,
      assignee: 'Tất cả',
    };
  } else {
    return {
      activeMember: user,
      scope: 'my_tasks' as TaskPersonalScope,
      assignee: user.name,
    };
  }
};

  // Login notice message (ví dụ khi bị logout do chưa đổi mật khẩu mặc định)
  const [loginNoticeMessage, setLoginNoticeMessage] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem('vne_auth_user');
      if (saved) {
        const u = saved.trim().toLowerCase();
        if (isUserUsingDefaultPassword(u)) {
          return 'Tài khoản chưa đổi mật khẩu mặc định. Vui lòng đăng nhập lại để cập nhật mật khẩu mới.';
        }
      }
    } catch {}
    return null;
  });

  // Authentication state for Product group (Tự động đăng xuất nếu chưa đổi mật khẩu mặc định)
  const [currentAuthUser, setCurrentAuthUser] = useState<MemberItem | null>(() => {
    const user = getCurrentAuthUser(members);
    if (user) {
      const u = (user.username || user.id).toLowerCase();
      if (isUserUsingDefaultPassword(u)) {
        logout();
        return null;
      }
    }
    return user;
  });

  const currentAuthUserRef = useRef(currentAuthUser);
  useEffect(() => {
    currentAuthUserRef.current = currentAuthUser;
  }, [currentAuthUser]);

  // Trang Hiệu quả team: chỉ tài khoản tienngoc. Tài khoản khác bị đưa về Công việc.
  const canViewPerformance = canViewTeamPerformance(currentAuthUser);
  useEffect(() => {
    if (activeTab === 'performance' && currentAuthUser && !canViewPerformance) {
      setActiveTab('tasks');
    }
  }, [activeTab, currentAuthUser, canViewPerformance]);

  // Modal bắt buộc đổi mật khẩu khi đăng nhập bằng mật khẩu mặc định
  const [forceChangePasswordUser, setForceChangePasswordUser] = useState<MemberItem | null>(null);

  // Modal gửi thông điệp Quản trị (mở từ NotificationDrawer hoặc MembersManager)
  const [isAdminBroadcastModalOpen, setIsAdminBroadcastModalOpen] = useState(false);

  // Profile & Change Password Modal state
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileModalInitialTab, setProfileModalInitialTab] = useState<'profile' | 'password'>('profile');

  // Modal bắt buộc nhập Link hoàn thành
  const [taskToCompleteModal, setTaskToCompleteModal] = useState<TaskItem | null>(null);

  // Mobile dedicated quick add drawer state (FAB or header trigger)
  const [isMobileQuickAddOpen, setIsMobileQuickAddOpen] = useState(false);

  // Mobile sidebar drawer state (Hamburger menu)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  // Drawer Dự án chỉ được tải & gắn vào DOM từ lần mở đầu tiên (giữ lại để có hiệu ứng đóng)
  const [hasOpenedProjectDrawer, setHasOpenedProjectDrawer] = useState(false);
  useEffect(() => {
    prefetchSecondaryViews();
  }, []);
  const [undoToast, setUndoToast] = useState<UndoToastState | null>(null);
  const [nextSuggest, setNextSuggest] = useState<NextSuggestState | null>(null);
  const nextSuggestSource = useRef<{ task: TaskItem; logId: string } | null>(null);
  const nextSuggestRequest = useRef(0);
  const nextSuggestTimer = useRef<number | undefined>(undefined);
  const dismissNextSuggest = useCallback(() => setNextSuggest(null), []);
  const dismissUndoToast = useCallback(() => setUndoToast(null), []);

  // Cách nhóm danh sách việc: theo hạn (mặc định cho Chuyên viên) hoặc theo dự án
  const [groupMode, setGroupMode] = useState<TaskGroupMode>(() => {
    try {
      const saved = localStorage.getItem('wms_task_group_mode');
      if (saved === 'due' || saved === 'project') return saved;
    } catch {}
    return getUserRole(currentAuthUser) === 'Executive' ? 'due' : 'project';
  });
  useEffect(() => {
    try {
      if (localStorage.getItem('wms_task_group_mode')) return;
    } catch {}
    if (currentAuthUser) setGroupMode(getUserRole(currentAuthUser) === 'Executive' ? 'due' : 'project');
  }, [currentAuthUser]);
  const handleGroupModeChange = (mode: TaskGroupMode) => {
    setGroupMode(mode);
    try {
      localStorage.setItem('wms_task_group_mode', mode);
    } catch {}
  };

  // Khối "Đã hoàn thành" thu gọn mặc định để danh sách việc cần làm luôn ở trên cùng
  const [showCompleted, setShowCompleted] = useState(false);
  const [completedLimit, setCompletedLimit] = useState(15);

  const handleOpenProfile = (tab: 'profile' | 'password' = 'profile') => {
    setProfileModalInitialTab(tab);
    setIsProfileModalOpen(true);
  };

  const handleLoginSuccess = (user: MemberItem, mustChangePassword?: boolean) => {
    setLoginNoticeMessage(null);
    setCurrentAuthUser(user);
    if (mustChangePassword) {
      setForceChangePasswordUser(user);
    }
    const def = getDefaultPerspectiveForUser(user);
    setActiveProductMember(def.activeMember);
    setFilterState((prev) => ({
      ...prev,
      projectId: 'all',
      team: 'Tất cả',
      status: 'Tất cả',
      assignee: def.assignee,
      dueFilter: 'all',
      searchQuery: '',
    }));
    setTaskPersonalScope(def.scope);
  };

  const handleLogout = useCallback(() => {
    logout();
    setCurrentAuthUser(null);
    setForceChangePasswordUser(null);
    setActiveProductMember(null);
    setFilterState((prev) => ({
      ...prev,
      assignee: 'Tất cả',
    }));
    localStorage.removeItem('vne_active_product_member_id');
  }, []);

  // Active Product member account for perspective filtering: null means 'Toàn bộ phận'
  const [activeProductMember, setActiveProductMember] = useState<MemberItem | null>(() => {
    const user = getCurrentAuthUser(members);
    return getDefaultPerspectiveForUser(user).activeMember;
  });

  // Task personalization view scope: 'my_tasks' | 'my_projects_tasks' | 'all'
  const [taskPersonalScope, setTaskPersonalScope] = useState<TaskPersonalScope>(() => {
    const user = getCurrentAuthUser(members);
    return getDefaultPerspectiveForUser(user).scope;
  });

  // Sync active product member account to LocalStorage
  useEffect(() => {
    if (activeProductMember) {
      localStorage.setItem('vne_active_product_member_id', activeProductMember.id);
    } else {
      localStorage.setItem('vne_active_product_member_id', 'all');
    }
  }, [activeProductMember]);

  // Product Leaves Data (Hôm nay & 3 ngày làm việc tới)
  const productLeavesData = useProductLeaves(members);

  // Kiểm tra xem có cảnh báo chưa có task đến hạn hôm nay hay không
  const hasMissingTasksAlert = useMemo(() => {
    if (!workingTimeService.isWorkingDay(new Date())) return false;
    const stats = getDailyDueTaskStats(members, tasks, projects, currentAuthUser, activeProductMember);
    if (stats.roleScope === 'Executive') {
      const exec = stats.targetMembers[0];
      return Boolean(exec && !exec.hasTaskDueToday && !exec.isOnLeaveToday);
    }
    return stats.missingMembers.length > 0;
  }, [members, tasks, projects, currentAuthUser, activeProductMember]);

  // Perspective Change Handler (Toàn bộ phận / Của tôi / Dự án của tôi / Đồng nghiệp)
  const handlePerspectiveChange = (scope: TaskPersonalScope, member?: MemberItem | null) => {
    if (scope === 'all' || !member) {
      setActiveProductMember(null);
      setFilterState((prev) => ({ ...prev, assignee: 'Tất cả' }));
      setTaskPersonalScope('all');
    } else if (scope === 'my_projects_tasks') {
      setActiveProductMember(member);
      setFilterState((prev) => ({ ...prev, assignee: 'Tất cả' }));
      setTaskPersonalScope('my_projects_tasks');
    } else {
      setActiveProductMember(member);
      setFilterState((prev) => ({ ...prev, assignee: member.name }));
      setTaskPersonalScope('my_tasks');
    }
  };

  // Unified handler when a product member is selected/changed
  const handleSelectProductMember = (member: MemberItem | null) => {
    setActiveProductMember(member);
    if (member) {
      setFilterState((prev) => ({
        ...prev,
        assignee: member.name,
      }));
      setTaskPersonalScope('my_tasks');
    } else {
      setFilterState((prev) => ({
        ...prev,
        assignee: 'Tất cả',
      }));
      setTaskPersonalScope('all');
    }
  };

  // Handler để lọc nhanh công việc theo nhân sự khi bấm vào tên ở TaskItemRow hoặc Drawer
  const handleFilterByAssignee = (assigneeName: string) => {
    if (!assigneeName) return;
    const cleanAssignee = assigneeName.trim();
    const foundMember = members.find((m) => isSamePersonName(m.name, cleanAssignee));
    if (foundMember) {
      handleSelectProductMember(foundMember);
    } else {
      setActiveProductMember(null);
      setFilterState((prev) => ({
        ...prev,
        assignee: cleanAssignee,
      }));
      setTaskPersonalScope('my_tasks');
    }
    setActiveTab('tasks');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Filter states
  const [filterState, setFilterState] = useState<FilterState>(() => {
    const user = getCurrentAuthUser(members);
    const def = getDefaultPerspectiveForUser(user);
    return {
      projectId: 'all',
      folderId: 'all',
      team: 'Tất cả',
      status: 'Tất cả',
      assignee: def.assignee,
      dueFilter: 'all',
      searchQuery: '',
    };
  });

  // Đặt lại toàn bộ bộ lọc và góc nhìn về mặc định công việc của từng tài khoản
  const handleResetToDefaultView = useCallback(() => {
    const def = getDefaultPerspectiveForUser(currentAuthUser);
    setActiveProductMember(def.activeMember);
    setTaskPersonalScope(def.scope);
    setFilterState({
      projectId: 'all',
      folderId: 'all',
      team: 'Tất cả',
      status: 'Tất cả',
      assignee: def.assignee,
      dueFilter: 'all',
      searchQuery: '',
    });
  }, [currentAuthUser]);

  // Bấm vào Logo: Chuyển về tab Công việc và đặt lại về mặc định công việc của User
  const handleLogoClick = useCallback(() => {
    setActiveTab('tasks');
    setIsDrawerOpen(false);
    setIsProjectDrawerOpen(false);
    setIsStandupOpen(false);
    handleResetToDefaultView();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [handleResetToDefaultView]);

  // Drawer & Modal states
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isStandupOpen, setIsStandupOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [selectedProjectIdForDrawer, setSelectedProjectIdForDrawer] = useState<string | null>(null);
  const [isProjectDrawerOpen, setIsProjectDrawerOpen] = useState(false);
  const [isCreateProjectDrawer, setIsCreateProjectDrawer] = useState(false);
  useEffect(() => {
    if (isProjectDrawerOpen) setHasOpenedProjectDrawer(true);
  }, [isProjectDrawerOpen]);

  // Phím tắt toàn cục: ⌘K / Ctrl+K hoặc "/" mở bảng lệnh, "N" thêm việc nhanh
  useEffect(() => {
    const isTyping = (el: EventTarget | null) => {
      const node = el as HTMLElement | null;
      if (!node) return false;
      const tag = node.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || node.isContentEditable;
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsPaletteOpen((v) => !v);
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      const anyOverlayOpen = isDrawerOpen || isProjectDrawerOpen || isNotificationDrawerOpen || isMobileQuickAddOpen;
      if (e.key === '/' && !anyOverlayOpen) {
        e.preventDefault();
        setIsPaletteOpen(true);
      } else if ((e.key === 'n' || e.key === 'N') && !anyOverlayOpen && !isPaletteOpen) {
        e.preventDefault();
        setActiveTab('tasks');
        if (window.innerWidth < 768) setIsMobileQuickAddOpen(true);
        else setTimeout(() => document.getElementById('quick-add-input')?.focus(), 80);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isDrawerOpen, isProjectDrawerOpen, isNotificationDrawerOpen, isMobileQuickAddOpen, isPaletteOpen]);

  const selectedProjectForDrawer = useMemo(() => {
    if (!selectedProjectIdForDrawer) return null;
    const target = (selectedProjectIdForDrawer || '').toLowerCase();
    return (
      projects.find(
        (p) =>
          (p.id || '').toLowerCase() === target ||
          (p.code || '').toLowerCase() === target ||
          (p.name || '').toLowerCase() === target
      ) || null
    );
  }, [projects, selectedProjectIdForDrawer]);

  const handleOpenProjectDetail = (projectId: string) => {
    setSelectedProjectIdForDrawer(projectId);
    setIsCreateProjectDrawer(false);
    setIsProjectDrawerOpen(true);
  };

  const handleOpenAddProject = () => {
    setSelectedProjectIdForDrawer(null);
    setIsCreateProjectDrawer(true);
    setIsProjectDrawerOpen(true);
  };

  const handleOpenAddMember = () => {
    setActiveTab('members');
    setIsAddMemberOpen(true);
  };

  // Tự động điều hướng và mở Drawer khi có deep link trong URL
  useEffect(() => {
    if (!pendingRoute) return;

    if (pendingRoute.taskId && tasks.length > 0) {
      const foundTask = tasks.find((t) => t.id === pendingRoute.taskId);
      if (foundTask) {
        setSelectedTask(foundTask);
        setIsDrawerOpen(true);
        setActiveTab('tasks');
        setPendingRoute((prev) => (prev ? { ...prev, taskId: undefined } : null));
      }
    }

    if (pendingRoute.projectIdOrCode && projects.length > 0) {
      const target = (pendingRoute.projectIdOrCode || '').toLowerCase();
      const foundProject = projects.find(
        (p) =>
          (p.code || '').toLowerCase() === target ||
          (p.id || '').toLowerCase() === target ||
          (p.name || '').toLowerCase() === target
      );
      if (foundProject) {
        setSelectedProjectIdForDrawer(foundProject.id);
        setIsCreateProjectDrawer(false);
        setIsProjectDrawerOpen(true);
        setPendingRoute((prev) => (prev ? { ...prev, projectIdOrCode: undefined } : null));
      }
    }

    if (pendingRoute.projectFilter) {
      setFilterState((f) => ({ ...f, projectId: pendingRoute.projectFilter! }));
      setPendingRoute((prev) => (prev ? { ...prev, projectFilter: undefined } : null));
    }
  }, [tasks, projects, pendingRoute]);

  // Đồng bộ Friendly URL lên trình duyệt khi chuyển tab hoặc mở/đóng ngăn chi tiết
  useEffect(() => {
    if (isDrawerOpen && selectedTask) {
      updateBrowserUrl({ tab: 'tasks', task: selectedTask });
    } else if (isProjectDrawerOpen && selectedProjectForDrawer && !isCreateProjectDrawer) {
      updateBrowserUrl({ tab: 'projects', project: selectedProjectForDrawer });
    } else {
      updateBrowserUrl({
        tab: activeTab,
        projectFilter:
          activeTab === 'tasks' &&
          filterState.projectId !== 'Tất cả' &&
          filterState.projectId !== 'all'
            ? filterState.projectId
            : null,
      });
    }
  }, [
    activeTab,
    isDrawerOpen,
    selectedTask,
    isProjectDrawerOpen,
    selectedProjectForDrawer,
    isCreateProjectDrawer,
    filterState.projectId,
  ]);

  // Hỗ trợ phím điều hướng Back / Forward của trình duyệt (Popstate)
  useEffect(() => {
    const handlePopState = () => {
      const route = parseCurrentRoute();
      setActiveTab(route.tab);

      if (route.taskId) {
        const foundTask = tasks.find((t) => t.id === route.taskId);
        if (foundTask) {
          setSelectedTask(foundTask);
          setIsDrawerOpen(true);
        }
      } else {
        setIsDrawerOpen(false);
      }

      if (route.projectIdOrCode) {
        const target = (route.projectIdOrCode || '').toLowerCase();
        const foundProj = projects.find(
          (p) =>
            (p.code || '').toLowerCase() === target ||
            (p.id || '').toLowerCase() === target ||
            (p.name || '').toLowerCase() === target
        );
        if (foundProj) {
          setSelectedProjectIdForDrawer(foundProj.id);
          setIsProjectDrawerOpen(true);
        }
      } else {
        setIsProjectDrawerOpen(false);
      }

      if (route.projectFilter) {
        setFilterState((f) => ({ ...f, projectId: route.projectFilter! }));
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [tasks, projects]);

  // Sync to LocalStorage
  useEffect(() => {
    saveFoldersToStorage(folders);
  }, [folders]);

  useEffect(() => {
    localStorage.setItem('vne_projects_v9', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem('vne_members_v11', JSON.stringify(members));
  }, [members]);

  useEffect(() => {
    localStorage.setItem('vne_tasks_v9', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('vne_trash_v1', JSON.stringify(trash));
  }, [trash]);

  useEffect(() => {
    localStorage.setItem('vne_notifications_v1', JSON.stringify(notifications));
  }, [notifications]);

  // Lắng nghe sự kiện click thông báo từ Service Worker để mở Task chi tiết
  useEffect(() => {
    const cleanup = initWebPushListener((taskId) => {
      const target = tasks.find((t) => t.id === taskId);
      if (target) {
        setSelectedTask(target);
      }
    });
    return () => cleanup();
  }, [tasks]);

  // Tự động nhắc nhở đầu việc đến hạn/quá hạn qua Web Push Notification khi truy cập
  useEffect(() => {
    if (!currentAuthUser || !isWebPushEnabledByUser()) return;

    const todayStr = getTodayDateString();
    const storageKey = `vne_web_push_daily_${currentAuthUser.id}_${todayStr}`;
    if (localStorage.getItem(storageKey)) return;

    const userTasks = tasks.filter((t) => isTaskForMember(t, currentAuthUser));
    const dueTodayTasks = userTasks.filter((t) => {
      const d = normalizeDateString(t.dueDate);
      return d === todayStr && t.status !== 'Hoàn thành';
    });
    const overdueTasks = userTasks.filter((t) => {
      const d = normalizeDateString(t.dueDate);
      return d !== '' && d < todayStr && t.status !== 'Hoàn thành';
    });

    if (dueTodayTasks.length > 0 || overdueTasks.length > 0) {
      localStorage.setItem(storageKey, 'true');
      const title =
        overdueTasks.length > 0
          ? `⚠️ WMS: Bạn có ${overdueTasks.length} việc quá hạn!`
          : `📅 WMS: Hôm nay bạn có ${dueTodayTasks.length} việc đến hạn`;
      const body =
        overdueTasks.length > 0
          ? `Cùng ${dueTodayTasks.length} việc đến hạn hôm nay. Hãy rà soát tiến độ nhé!`
          : `Ưu tiên hoàn thành các đầu việc đúng hạn trong ngày làm việc hôm nay.`;

      showWebPushNotification(title, {
        body,
        tag: `daily-reminder-${todayStr}`,
      });
    }
  }, [currentAuthUser, tasks]);

  // Load and sync data with Supabase on mount + Realtime collaboration
  const loadSupabaseData = useCallback(async () => {
    try {
      // Đồng bộ mật khẩu người dùng
      await syncPasswordsFromSupabase();
      const authUser = currentAuthUserRef.current;
      if (authUser) {
        const u = (authUser.username || authUser.id).toLowerCase();
        if (isUserUsingDefaultPassword(u)) {
          handleLogout();
          setLoginNoticeMessage('Tài khoản chưa đổi mật khẩu mặc định. Vui lòng đăng nhập lại để cập nhật mật khẩu mới.');
        }
      }

      const [mems, projs, tsks, trsh, notifs, flds] = await Promise.all([
        wmsDataService.fetchMembers(),
        wmsDataService.fetchProjects(),
        wmsDataService.fetchTasks(),
        wmsDataService.fetchTrash(),
        wmsDataService.fetchNotifications(),
        wmsDataService.fetchFolders().catch(() => null),
        workingTimeService.initFromSupabase().catch((e) => {
          console.warn('[workingTimeService] Supabase init warning:', e);
          return null;
        }),
        recurringTaskService.initFromSupabase().catch((e) => {
          console.warn('[recurringTaskService] Supabase init warning:', e);
          return null;
        }),
        fetchMasterChecklistTemplateFromSupabase().catch((e) => {
          console.warn('[defaultProjectChecklist] Supabase init warning:', e);
          return null;
        }),
      ]);

      if (flds && flds.length > 0) {
        setFolders(flds);
      }

      if (projs && projs.length > 0) {
        // Tự động kiểm tra và đồng bộ các dự án được tạo ở local cache chưa kịp lưu vào Supabase
        const dbProjIds = new Set(projs.map((p) => p.id));
        const dbProjCodes = new Set(projs.map((p) => (p.code || '').toUpperCase()));
        const localSaved = localStorage.getItem('vne_projects_v9');
        let localList: ProjectItem[] = [];
        if (localSaved) {
          try {
            localList = JSON.parse(localSaved);
          } catch (e) {}
        }
        const unsynced = localList.filter(
          (lp) => !dbProjIds.has(lp.id) && !dbProjCodes.has((lp.code || '').toUpperCase()) && lp.id !== 'proj-others'
        );

        if (unsynced.length > 0) {
          console.log(`[Supabase WMS] Phát hiện ${unsynced.length} dự án cục bộ chưa có trên Supabase. Đang tự động đẩy lên...`);
          for (const up of unsynced) {
            try {
              await wmsDataService.saveProject(up);
              console.log(`[Supabase WMS] ✅ Đã đẩy dự án "${up.name}" lên Supabase thành công!`);
            } catch (e) {
              console.warn('[Supabase WMS] Lỗi khi đồng bộ dự án cục bộ:', up.name, e);
            }
          }
          const refreshed = await wmsDataService.fetchProjects();
          if (refreshed && refreshed.length > 0) {
            setProjects(ensureProjectsHaveFolder(refreshed.map((p) => ({ ...p, status: normalizeProjectStatus(p.status) }))));
          } else {
            setProjects(ensureProjectsHaveFolder(projs.map((p) => ({ ...p, status: normalizeProjectStatus(p.status) }))));
          }
        } else {
          setProjects(ensureProjectsHaveFolder(projs.map((p) => ({ ...p, status: normalizeProjectStatus(p.status) }))));
        }
      }
      if (tsks) setTasks(tsks);
      if (trsh) setTrash(trsh);
      if (notifs && notifs.length > 0) setNotifications(notifs);

      setIsDbConnected(true);
      console.log(
        `%c[Supabase WMS] ✅ Đã kết nối Live Database: ${tsks?.length || 0} công việc, ${projs?.length || 0} dự án, ${mems?.length || 0} nhân sự.`,
        'color: #059669; font-weight: bold;'
      );
    } catch (err) {
      setIsDbConnected(false);
      console.warn('[Supabase WMS] ⚠️ Đang chạy ở chế độ offline / local cache:', err);
    }
  }, [handleLogout]);

  useEffect(() => {
    loadSupabaseData();

    // Lắng nghe cập nhật Realtime từ Supabase (hỗ trợ nhiều máy làm việc đồng thời)
    const unsubscribe = wmsDataService.subscribeToChanges({
      onTasksChange: async () => {
        try {
          const freshTasks = await wmsDataService.fetchTasks();
          if (freshTasks) setTasks(freshTasks);
        } catch (e) {}
      },
      onProjectsChange: async () => {
        try {
          const freshProjects = await wmsDataService.fetchProjects();
          if (freshProjects && freshProjects.length > 0) {
            setProjects(freshProjects.map((p) => ({ ...p, status: normalizeProjectStatus(p.status) })));
          }
        } catch (e) {}
      },
      onTrashChange: async () => {
        try {
          const freshTrash = await wmsDataService.fetchTrash();
          setTrash(freshTrash);
        } catch (e) {}
      },
      onNotificationsChange: async () => {
        try {
          const freshNotifs = await wmsDataService.fetchNotifications();
          if (freshNotifs && freshNotifs.length > 0) setNotifications(freshNotifs);
        } catch (e) {}
      },
    });

    return () => {
      unsubscribe();
    };
  }, [loadSupabaseData]);

  // Cơ chế tự động refresh hệ thống sau mỗi 3 giờ (chu kỳ 3h/lần theo quy chuẩn)
  useEffect(() => {
    const AUTO_REFRESH_INTERVAL_MS = 3 * 60 * 60 * 1000; // 3 giờ

    // 1. Tự động tải lại dữ liệu mới từ Supabase mỗi 3 giờ
    const refreshTimer = setInterval(() => {
      console.log('[App] ⏰ Chu kỳ 3h: Tự động refresh dữ liệu và đồng bộ hệ thống...');
      loadSupabaseData();
    }, AUTO_REFRESH_INTERVAL_MS);

    // 2. Lắng nghe sự kiện kích hoạt auto-refresh từ autoCacheService
    const handleAutoRefreshEvent = () => {
      console.log('[App] 🔄 Nhận tín hiệu tự động refresh (chu kỳ 3h) từ AutoCacheService...');
      loadSupabaseData();

      // Kiểm tra an toàn trước khi reload toàn bộ trang:
      // Không reload nếu người dùng đang mở ngăn chỉnh sửa, tạo dự án, thêm nhân sự hoặc đang gõ phím
      const isDrawerActive = isDrawerOpen || isProjectDrawerOpen || isAddMemberOpen || isCreateProjectDrawer;
      const isInputActive = Boolean(
        document.activeElement &&
        (document.activeElement.tagName === 'INPUT' ||
         document.activeElement.tagName === 'TEXTAREA' ||
         document.activeElement.getAttribute('contenteditable') === 'true')
      );

      if (!isDrawerActive && !isInputActive) {
        console.log('[App] Người dùng đang ở trạng thái rảnh rỗi. Thực hiện làm mới trang web...');
        window.location.reload();
      } else {
        console.log('[App] Người dùng đang tương tác hoặc mở ngăn tác vụ. Đã làm mới dữ liệu ngầm, hoãn tải lại trang.');
      }
    };

    window.addEventListener('vne_trigger_auto_refresh', handleAutoRefreshEvent);

    return () => {
      clearInterval(refreshTimer);
      window.removeEventListener('vne_trigger_auto_refresh', handleAutoRefreshEvent);
    };
  }, [loadSupabaseData, isDrawerOpen, isProjectDrawerOpen, isAddMemberOpen, isCreateProjectDrawer]);

  // Reset to initial data
  const handleResetData = () => {
    if (confirm('Khôi phục toàn bộ danh sách dự án, nhân sự và công việc về mặc định?')) {
      setProjects(INITIAL_PROJECTS);
      setMembers(INITIAL_MEMBERS);
      setTasks(INITIAL_TASKS);
      setTrash([]);
      setFilterState({
        projectId: 'all',
        team: 'Tất cả',
        status: 'Tất cả',
        assignee: 'Tất cả',
        dueFilter: 'all',
        searchQuery: '',
      });
      setActiveTab('tasks');
    }
  };

  // Notifications filtering for active account (hỗ trợ cả tài khoản đăng nhập và nhân sự đang chọn xem)
  const currentViewingUser = activeProductMember || currentAuthUser;
  const currentUserName = currentViewingUser?.name;
  const userNotifications = useMemo(() => {
    if (!currentUserName) return [];
    return deduplicateNotifications(notifications.filter((n) => isSamePersonName(n.recipientName, currentUserName)));
  }, [notifications, currentUserName]);

  const unreadNotificationsCount = useMemo(() => {
    return userNotifications.filter((n) => !n.isRead).length;
  }, [userNotifications]);

  // Helper dispatching targeted notifications based on project roles
  const createAndDispatchNotifications = (
    newOrUpdatedTask: TaskItem,
    actionType: 'created' | 'status_changed' | 'reassigned' | 'updated' | 'comment' | 'deadline_selected',
    actorName: string,
    extra?: { oldAssignee?: string; oldStatus?: string; note?: string; oldDueDate?: string; newDueDate?: string }
  ) => {
    const proj = projects.find(
      (p) => p.id === newOrUpdatedTask.projectId || p.name === newOrUpdatedTask.projectName
    );
    const projectName = proj?.name || newOrUpdatedTask.projectName || 'Dự án';
    // Tìm tất cả PM phụ trách dự án (roles.pm, leadName, createdBy hoặc fallback về PM ban)
    const pms = getProjectPMs(proj, members);

    const newNotifs: NotificationItem[] = [];

    if (actionType === 'created') {
      // 1. Executive tạo task trong dự án -> Bắn thông báo cho Product Manager phụ trách dự án đó
      pms.forEach((pmName) => {
        if (pmName && !isSamePersonName(pmName, actorName)) {
          const pmMember = members.find((m) => isSamePersonName(m.name, pmName));
          newNotifs.push({
            id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
            recipientName: pmName,
            recipientId: pmMember?.username || pmMember?.id,
            actorName,
            projectId: proj?.id,
            projectName,
            taskId: newOrUpdatedTask.id,
            taskTitle: newOrUpdatedTask.title,
            type: 'task_created',
            title: `Task mới trong ${projectName.replace('Dự án ', '')}`,
            content: `${actorName} đã tạo công việc "${newOrUpdatedTask.title}"`,
            isRead: false,
            createdAt: new Date().toISOString(),
          });
        }
      });

      // 2. Giao việc cho người khác -> Bắn thông báo cho người nhận việc
      if (newOrUpdatedTask.assignee && !isSamePersonName(newOrUpdatedTask.assignee, actorName)) {
        const assigneeMember = members.find((m) => isSamePersonName(m.name, newOrUpdatedTask.assignee));
        const hasDueDate = Boolean(newOrUpdatedTask.dueDate);
        newNotifs.push({
          id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          recipientName: newOrUpdatedTask.assignee,
          recipientId: assigneeMember?.username || assigneeMember?.id,
          actorName,
          projectId: proj?.id,
          projectName,
          taskId: newOrUpdatedTask.id,
          taskTitle: newOrUpdatedTask.title,
          type: 'task_assigned',
          title: hasDueDate
            ? `Bạn được giao việc trong ${projectName.replace('Dự án ', '')}`
            : `Giao việc chưa có hạn: ${newOrUpdatedTask.title}`,
          content: hasDueDate
            ? `${actorName} đã giao cho bạn: "${newOrUpdatedTask.title}"`
            : `${actorName} đã giao cho bạn: "${newOrUpdatedTask.title}". Vui lòng chọn hạn hoàn thành.`,
          isRead: false,
          createdAt: new Date().toISOString(),
        });
      }
    } else if (actionType === 'deadline_selected') {
      // Người B chọn hạn hoàn thành -> Bắn thông báo cho người A (task.createdBy) và PM
      const creatorName = newOrUpdatedTask.createdBy;
      const targetRecipients = new Set<string>();
      if (creatorName && !isSamePersonName(creatorName, actorName)) {
        targetRecipients.add(creatorName);
      }
      pms.forEach((pm) => {
        if (pm && !isSamePersonName(pm, actorName)) {
          targetRecipients.add(pm);
        }
      });

      targetRecipients.forEach((recip) => {
        const recipMember = members.find((m) => isSamePersonName(m.name, recip));
        newNotifs.push({
          id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          recipientName: recip,
          recipientId: recipMember?.username || recipMember?.id,
          actorName,
          projectId: proj?.id,
          projectName,
          taskId: newOrUpdatedTask.id,
          taskTitle: newOrUpdatedTask.title,
          type: 'task_deadline_selected',
          title: `Đã chọn hạn: ${newOrUpdatedTask.title}`,
          content: `${actorName} đã chọn hạn hoàn thành: ${formatDateWithEnDay(newOrUpdatedTask.dueDate)}`,
          isRead: false,
          createdAt: new Date().toISOString(),
        });
      });
    } else if (actionType === 'status_changed') {
      if (newOrUpdatedTask.status === 'Hoàn thành') {
        const recipients = new Set([...pms, newOrUpdatedTask.createdBy || '']);
        recipients.forEach((recip) => {
          if (recip && !isSamePersonName(recip, actorName)) {
            const recipMember = members.find((m) => isSamePersonName(m.name, recip));
            newNotifs.push({
              id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
              recipientName: recip,
              recipientId: recipMember?.username || recipMember?.id,
              actorName,
              projectId: proj?.id,
              projectName,
              taskId: newOrUpdatedTask.id,
              taskTitle: newOrUpdatedTask.title,
              type: 'task_completed',
              title: `Đã hoàn thành: ${newOrUpdatedTask.title}`,
              content: `${actorName} đã hoàn thành công việc "${newOrUpdatedTask.title}"`,
              isRead: false,
              createdAt: new Date().toISOString(),
            });
          }
        });
      } else if (newOrUpdatedTask.status === 'Bị nghẽn') {
        const recipients = new Set([...pms, newOrUpdatedTask.createdBy || '']);
        recipients.forEach((recip) => {
          if (recip && !isSamePersonName(recip, actorName)) {
            const recipMember = members.find((m) => isSamePersonName(m.name, recip));
            newNotifs.push({
              id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
              recipientName: recip,
              recipientId: recipMember?.username || recipMember?.id,
              actorName,
              projectId: proj?.id,
              projectName,
              taskId: newOrUpdatedTask.id,
              taskTitle: newOrUpdatedTask.title,
              type: 'task_blocked',
              title: `🚨 Bị nghẽn trong ${projectName.replace('Dự án ', '')}`,
              content: `${actorName} báo nghẽn: "${newOrUpdatedTask.title}"${extra?.note ? ` (${extra.note})` : ''}`,
              isRead: false,
              createdAt: new Date().toISOString(),
            });
          }
        });
      } else if (newOrUpdatedTask.status === 'Đang làm') {
        // Thông báo cho người tạo việc (A) và PM khi task bắt đầu được làm
        const recipients = new Set([...pms, newOrUpdatedTask.createdBy || '']);
        recipients.forEach((recip) => {
          if (recip && !isSamePersonName(recip, actorName)) {
            const recipMember = members.find((m) => isSamePersonName(m.name, recip));
            newNotifs.push({
              id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
              recipientName: recip,
              recipientId: recipMember?.username || recipMember?.id,
              actorName,
              projectId: proj?.id,
              projectName,
              taskId: newOrUpdatedTask.id,
              taskTitle: newOrUpdatedTask.title,
              type: 'task_updated',
              title: `Đang làm: ${newOrUpdatedTask.title}`,
              content: `${actorName} đã bắt đầu thực hiện: "${newOrUpdatedTask.title}"`,
              isRead: false,
              createdAt: new Date().toISOString(),
            });
          }
        });
      }
    } else if (actionType === 'updated') {
      pms.forEach((pmName) => {
        if (pmName && !isSamePersonName(pmName, actorName)) {
          const pmMember = members.find((m) => isSamePersonName(m.name, pmName));
          newNotifs.push({
            id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
            recipientName: pmName,
            recipientId: pmMember?.username || pmMember?.id,
            actorName,
            projectId: proj?.id,
            projectName,
            taskId: newOrUpdatedTask.id,
            taskTitle: newOrUpdatedTask.title,
            type: 'task_updated',
            title: `Cập nhật công việc trong ${projectName.replace('Dự án ', '')}`,
            content: `${actorName} đã cập nhật công việc "${newOrUpdatedTask.title}"${extra?.note ? `: ${extra.note}` : ''}`,
            isRead: false,
            createdAt: new Date().toISOString(),
          });
        }
      });
    } else if (actionType === 'reassigned') {
      if (newOrUpdatedTask.assignee && !isSamePersonName(newOrUpdatedTask.assignee, actorName)) {
        const assigneeMember = members.find((m) => isSamePersonName(m.name, newOrUpdatedTask.assignee));
        newNotifs.push({
          id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          recipientName: newOrUpdatedTask.assignee,
          recipientId: assigneeMember?.username || assigneeMember?.id,
          actorName,
          projectId: proj?.id,
          projectName,
          taskId: newOrUpdatedTask.id,
          taskTitle: newOrUpdatedTask.title,
          type: 'task_assigned',
          title: `Chuyển giao việc trong ${projectName.replace('Dự án ', '')}`,
          content: `${actorName} đã chuyển giao cho bạn: "${newOrUpdatedTask.title}"`,
          isRead: false,
          createdAt: new Date().toISOString(),
        });
      }
    } else if (actionType === 'comment') {
      const rawNote = (extra?.note || '').trim();
      const commentSnippet = rawNote.length > 120 ? rawNote.slice(0, 117) + '...' : rawNote;

      // 1. Quét và gửi thông báo đích danh cho những người được tag bằng @ (Ưu tiên cao nhất)
      const mentionedMembers = extractMentions(rawNote, members);
      const taggedNames = new Set<string>();

      mentionedMembers.forEach((m) => {
        if (!isSamePersonName(m.name, actorName)) {
          taggedNames.add(m.name);
          newNotifs.push({
            id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
            recipientName: m.name,
            recipientId: m.username || m.id,
            actorName,
            projectId: proj?.id,
            projectName,
            taskId: newOrUpdatedTask.id,
            taskTitle: newOrUpdatedTask.title,
            type: 'task_comment',
            title: `Nhắc đến bạn: ${newOrUpdatedTask.title}`,
            content: `${actorName}: "${commentSnippet}"`,
            isRead: false,
            createdAt: new Date().toISOString(),
          });
        }
      });

      // 2. Gửi thông báo cho đối tượng đang trao đổi (Assignee, người bình luận trước đó, người tạo việc)
      const threadParticipants = getTaskThreadParticipants(newOrUpdatedTask, actorName);
      threadParticipants.forEach((participantName) => {
        // Bỏ qua nếu đã nhận thông báo mention hoặc là chính người gửi
        if (
          taggedNames.has(participantName) ||
          isSamePersonName(participantName, actorName) ||
          newNotifs.some((n) => isSamePersonName(n.recipientName, participantName))
        ) {
          return;
        }

        const participantMember = members.find((m) => isSamePersonName(m.name, participantName));
        const isAssignee = isSamePersonName(participantName, newOrUpdatedTask.assignee);

        newNotifs.push({
          id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          recipientName: participantName,
          recipientId: participantMember?.username || participantMember?.id,
          actorName,
          projectId: proj?.id,
          projectName,
          taskId: newOrUpdatedTask.id,
          taskTitle: newOrUpdatedTask.title,
          type: 'task_comment',
          title: isAssignee
            ? `Trao đổi công việc: ${newOrUpdatedTask.title}`
            : `Phản hồi trao đổi: ${newOrUpdatedTask.title}`,
          content: `${actorName}: "${commentSnippet}"`,
          isRead: false,
          createdAt: new Date().toISOString(),
        });
      });

      // 3. Thông báo cho PM phụ trách dự án nếu chưa nằm trong danh sách trên
      pms.forEach((pmName) => {
        if (
          pmName &&
          !isSamePersonName(pmName, actorName) &&
          !taggedNames.has(pmName) &&
          !newNotifs.some((n) => isSamePersonName(n.recipientName, pmName))
        ) {
          const pmMember = members.find((m) => isSamePersonName(m.name, pmName));
          newNotifs.push({
            id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
            recipientName: pmName,
            recipientId: pmMember?.username || pmMember?.id,
            actorName,
            projectId: proj?.id,
            projectName,
            taskId: newOrUpdatedTask.id,
            taskTitle: newOrUpdatedTask.title,
            type: 'task_comment',
            title: `Trao đổi trong ${projectName.replace('Dự án ', '')}`,
            content: `${actorName}: "${commentSnippet}"`,
            isRead: false,
            createdAt: new Date().toISOString(),
          });
        }
      });
    }

    // Với các hành động khác (như updated, status_changed...) nếu có tag @ trong ghi chú, vẫn bắn thông báo tag
    if (actionType !== 'comment' && extra?.note) {
      const rawNote = extra.note.trim();
      const commentSnippet = rawNote.length > 120 ? rawNote.slice(0, 117) + '...' : rawNote;
      const mentionedMembers = extractMentions(rawNote, members);
      mentionedMembers.forEach((m) => {
        if (
          !isSamePersonName(m.name, actorName) &&
          !newNotifs.some((n) => isSamePersonName(n.recipientName, m.name))
        ) {
          newNotifs.push({
            id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
            recipientName: m.name,
            recipientId: m.username || m.id,
            actorName,
            projectId: proj?.id,
            projectName,
            taskId: newOrUpdatedTask.id,
            taskTitle: newOrUpdatedTask.title,
            type: 'task_comment',
            title: `Nhắc đến bạn: ${newOrUpdatedTask.title}`,
            content: `${actorName}: "${commentSnippet}"`,
            isRead: false,
            createdAt: new Date().toISOString(),
          });
        }
      });
    }

    if (newNotifs.length > 0) {
      // Áp dụng quy tắc cấu hình tuỳ biến (Custom templates & check enabled status) từ notificationRuleService
      const filteredAndCustomizedNotifs = newNotifs
        .filter((n) => {
          const rule = notificationRuleService.getActiveRuleForTrigger(n.type);
          if (rule && !rule.enabled) return false;
          // Kiểm tra lọc ưu tiên khẩn cấp nếu có quy định
          if (rule?.triggerConditions?.priorityFilter === 'Khẩn cấp' && newOrUpdatedTask.priority !== 'Khẩn cấp') {
            return false;
          }
          // Kiểm tra lọc dự án nếu có quy định
          if (
            rule?.triggerConditions?.projectFilter &&
            rule.triggerConditions.projectFilter !== 'all' &&
            Array.isArray(rule.triggerConditions.projectFilter) &&
            !rule.triggerConditions.projectFilter.includes(newOrUpdatedTask.projectId || '')
          ) {
            return false;
          }
          return true;
        })
        .map((n) => {
          const rule = notificationRuleService.getActiveRuleForTrigger(n.type);
          if (rule) {
            const vars = {
              taskTitle: n.taskTitle || newOrUpdatedTask.title,
              projectName: n.projectName.replace('Dự án ', ''),
              actorName: n.actorName,
              note: extra?.note || '',
              dueDate: newOrUpdatedTask.dueDate ? formatDateWithEnDay(newOrUpdatedTask.dueDate) : 'Chưa có hạn',
            };
            return {
              ...n,
              title: notificationRuleService.interpolate(rule.titleTemplate, vars) || n.title,
              content: notificationRuleService.interpolate(rule.contentTemplate, vars) || n.content,
            };
          }
          return n;
        });

      if (filteredAndCustomizedNotifs.length > 0) {
        setNotifications((prev) => deduplicateNotifications([...filteredAndCustomizedNotifs, ...prev]));
        filteredAndCustomizedNotifs.forEach((n) => {
          wmsDataService.saveNotification(n).catch(console.warn);

          // Bắn thông báo đẩy Web Push nếu người nhận là tài khoản hiện tại hoặc active member
          const isTargetUser =
            (currentUserName && isSamePersonName(n.recipientName, currentUserName)) ||
            (activeProductMember && isSamePersonName(n.recipientName, activeProductMember.name));

          if (isTargetUser) {
            dispatchNotificationWebPush(n, () => {
              if (n.taskId) {
                const target = tasks.find((t) => t.id === n.taskId);
                if (target) setSelectedTask(target);
              }
            });
          }
        });
      }
    }
  };

  // Tạo thông báo thử nghiệm nhanh để kiểm tra kênh chuông
  const handleSendTestNotification = () => {
    if (!currentUserName) return;
    const testNotif: NotificationItem = {
      id: 'notif-test-' + Date.now(),
      recipientName: currentUserName,
      actorName: 'Hệ thống WMS',
      projectName: 'Dự án mẫu',
      type: 'task_created',
      title: 'Kiểm tra chuông thông báo WMS',
      content: `Kênh thông báo cá nhân của ${currentUserName} đang hoạt động chuẩn xác!`,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    setNotifications((prev) => deduplicateNotifications([testNotif, ...prev]));
    wmsDataService.saveNotification(testNotif).catch(console.warn);
    dispatchNotificationWebPush(testNotif);
  };

  // Automated Recurring Tasks Engine (Admin/System)
  // Tự động kiểm tra và sinh task mới lúc 8:00 AM vào các ngày theo chu kỳ lặp lại
  useEffect(() => {
    const runCheck = () => {
      recurringTaskService.checkAndExecuteDueRecurringTasks(
        (newTask) => {
          console.log(
            `%c[RecurringEngine] 🔁 Tự động tạo task mới theo chu kỳ: "${newTask.title}" cho ${newTask.assignee}`,
            'color: #963861; font-weight: bold;'
          );
          setTasks((prev) => {
            if (prev.some((t) => t.id === newTask.id)) return prev;
            return [newTask, ...prev];
          });
          wmsDataService
            .saveTask(newTask, newTask.logs?.[0])
            .catch((e) => console.error('Supabase recurring task save error:', e));
          createAndDispatchNotifications(newTask, 'created', 'Hệ thống (Theo chu kỳ)');
        },
        tasksRef.current,
        trashRef.current,
        new Date()
      );
    };

    // 1. Quét ngay khi khởi động
    runCheck();

    // 2. Chạy ticker mỗi 60 giây để đảm bảo đúng mốc 08:00 AM
    const ticker = setInterval(runCheck, 60000);

    return () => clearInterval(ticker);
  }, []);

  // Automated Project & Phase Deadline Alerts Engine (Before 3 Days)
  // Tự động kiểm tra và gửi thông báo cho PM và nhân sự dự án khi giai đoạn hoặc deadline dự án còn <= 3 ngày hoặc quá hạn
  useEffect(() => {
    if (projects.length === 0) return;

    const runDeadlineCheck = () => {
      checkAndDispatchProjectDeadlineNotifications(
        projects,
        tasks,
        members,
        notificationsRef.current,
        (newNotif) => {
          console.log(
            `%c[DeadlineEngine] ⏰ Cảnh báo hạn chót: "${newNotif.title}" cho ${newNotif.recipientName}`,
            'color: #d97706; font-weight: bold;'
          );
          setNotifications((prev) => deduplicateNotifications([newNotif, ...prev]));
          wmsDataService
            .saveNotification(newNotif)
            .catch((e) => console.error('Supabase deadline notification save error:', e));

          const isTargetUser =
            (currentUserName && isSamePersonName(newNotif.recipientName, currentUserName)) ||
            (activeProductMember && isSamePersonName(newNotif.recipientName, activeProductMember.name));

          if (isTargetUser) {
            dispatchNotificationWebPush(newNotif, () => {
              if (newNotif.projectId) handleOpenProjectDetail(newNotif.projectId);
            });
          }
        }
      );
    };

    // 1. Quét sau 2.5s khi dữ liệu khởi động ổn định
    const initialTimer = setTimeout(runDeadlineCheck, 2500);

    // 2. Chạy ticker định kỳ mỗi 10 phút
    const deadlineTicker = setInterval(runDeadlineCheck, 600000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(deadlineTicker);
    };
  }, [projects, tasks, members, currentUserName, activeProductMember]);

  // Automated 08:30 & 16:30 Daily Notifications Engine
  // 1. Lúc 08:30 sáng: Tự động kiểm tra và nhắc nhở nhân sự Product chưa có task đến hạn hôm nay
  // 2. Lúc 16:30 chiều: Tự động kiểm tra và nhắc đóng task trước khi kết thúc ca làm việc
  useEffect(() => {
    if (members.length === 0 || tasks.length === 0) return;

    const runMorningTaskCheck = () => {
      checkAndDispatchDailyMorningTaskNotifications(
        tasks,
        members,
        (newNotif) => {
          console.log(
            `%c[MorningTaskEngine] ⏰ Nhắc việc 08:30: "${newNotif.title}" cho ${newNotif.recipientName}`,
            'color: #963861; font-weight: bold;'
          );
          setNotifications((prev) => deduplicateNotifications([newNotif, ...prev]));
          wmsDataService
            .saveNotification(newNotif)
            .catch((e) => console.error('Supabase morning task notification save error:', e));

          const isTargetUser =
            (currentUserName && isSamePersonName(newNotif.recipientName, currentUserName)) ||
            (activeProductMember && isSamePersonName(newNotif.recipientName, activeProductMember.name));

          if (isTargetUser) {
            dispatchNotificationWebPush(newNotif, () => {
              setActiveTab('tasks');
            });
          }
        },
        new Date(),
        notificationsRef.current
      );
    };

    const runCloseTaskCheck = () => {
      checkAndDispatchDailyCloseTaskNotifications(
        tasks,
        members,
        (newNotif) => {
          console.log(
            `%c[CloseTaskEngine] ⏰ Nhắc đóng task 16:30: "${newNotif.title}" cho ${newNotif.recipientName}`,
            'color: #963861; font-weight: bold;'
          );
          setNotifications((prev) => deduplicateNotifications([newNotif, ...prev]));
          wmsDataService
            .saveNotification(newNotif)
            .catch((e) => console.error('Supabase close task notification save error:', e));

          const isTargetUser =
            (currentUserName && isSamePersonName(newNotif.recipientName, currentUserName)) ||
            (activeProductMember && isSamePersonName(newNotif.recipientName, activeProductMember.name));

          if (isTargetUser) {
            dispatchNotificationWebPush(newNotif, () => {
              setActiveTab('tasks');
            });
          }
        },
        new Date(),
        notificationsRef.current
      );
    };

    const runAllDailyChecks = () => {
      runMorningTaskCheck();
      runCloseTaskCheck();
    };

    // 1. Quét sau 3s khi dữ liệu khởi động ổn định
    const initialTimer = setTimeout(runAllDailyChecks, 3000);

    // 2. Chạy ticker định kỳ mỗi 60 giây
    const dailyTicker = setInterval(runAllDailyChecks, 60000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(dailyTicker);
    };
  }, [tasks, members, currentUserName, activeProductMember]);

  const handleSelectNotification = (item: NotificationItem) => {
    // 1. Đánh dấu đã đọc
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
    );
    wmsDataService.markNotificationAsRead(item.id).catch(console.warn);

    // 2. Mở Drawer chi tiết công việc nếu có taskId
    if (item.taskId) {
      const foundTask = tasks.find((t) => t.id === item.taskId);
      if (foundTask) {
        setSelectedTask(foundTask);
        setIsDrawerOpen(true);
        setIsNotificationDrawerOpen(false);
        return;
      }
    }

    // 3. Nếu không có taskId nhưng có projectId thì mở Drawer chi tiết dự án
    if (item.projectId) {
      const foundProj = projects.find(
        (p) => p.id === item.projectId || p.name === item.projectName
      );
      if (foundProj) {
        handleOpenProjectDetail(foundProj.id);
        setIsNotificationDrawerOpen(false);
        return;
      }
    }

    // 4. Nếu là thông báo nhắc việc 08:30 hoặc nhắc đóng task 16:30, chuyển ngay sang tab Công việc
    if (item.type === 'daily_close_reminder' || item.type === 'daily_task_reminder') {
      setActiveTab('tasks');
      setFilterState((f) => ({ ...f, dueFilter: 'today', assignee: item.recipientName }));
      setIsNotificationDrawerOpen(false);
      return;
    }
  };

  const handleMarkAllNotificationsAsRead = () => {
    if (!currentUserName) return;
    setNotifications((prev) =>
      prev.map((n) => (isSamePersonName(n.recipientName, currentUserName) ? { ...n, isRead: true } : n))
    );
    wmsDataService.markAllNotificationsAsRead(currentUserName).catch(console.warn);
  };

  const handleDeleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleSendAdminBroadcast = async (newNotifs: NotificationItem[]) => {
    if (!newNotifs || newNotifs.length === 0) return;
    try {
      for (const n of newNotifs) {
        await wmsDataService.saveNotification(n);
        dispatchNotificationWebPush(n);
      }
      setNotifications((prev) => deduplicateNotifications([...newNotifs, ...prev]));
    } catch (err) {
      console.error('Lỗi khi gửi thông báo Admin broadcast:', err);
    }
  };

  // Task Operations
  // Gợi ý việc tiếp theo (Claude Haiku qua /api/suggest). Phần phụ: lỗi hay chậm đều không ảnh hưởng thao tác chính.
  const requestNextSuggestions = (task: TaskItem, trigger: SuggestTrigger) => {
    if (!currentAuthUser || !canSuggestFor(task)) return;
    const requestId = ++nextSuggestRequest.current;
    window.clearTimeout(nextSuggestTimer.current);
    // Chờ một nhịp rồi mới gọi: thêm hay đóng nhiều việc liên tiếp thì chỉ việc cuối cùng tốn một lượt gọi Claude.
    nextSuggestTimer.current = window.setTimeout(() => {
      fetchNextSuggestions(currentAuthUser, trigger, task).then((result) => {
        // Bỏ kết quả cũ nếu người dùng đã thao tác việc khác trong lúc chờ.
        if (!result || requestId !== nextSuggestRequest.current) return;
        nextSuggestSource.current = { task, logId: result.logId };
        setNextSuggest({ id: Date.now(), trigger, sourceTitle: task.title, items: result.suggestions, added: [] });
      });
    }, trigger === 'created' ? 6000 : 2500);
  };

  const handleToggleComplete = (taskId: string, authorName?: string) => {
    const actor = authorName || currentAuthUser?.name || activeProductMember?.name;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Nếu đang chưa hoàn thành và muốn chuyển sang hoàn thành, nhưng CHƯA CÓ resultLink hoặc link không đúng định dạng URL -> buộc nhập link
    if (task.status !== 'Hoàn thành' && (!task.resultLink || !isValidUrl(task.resultLink))) {
      setTaskToCompleteModal(task);
      return;
    }

    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const isComp = t.status === 'Hoàn thành';
          const updated: TaskItem = {
            ...t,
            status: isComp ? 'Đang làm' : 'Hoàn thành',
            progress: isComp ? 50 : 100,
            updatedAt: new Date().toISOString(),
            completedAt: isComp ? undefined : new Date().toISOString(),
          };
          const logged = recordTaskChanges(t, updated, actor || t.assignee);
          if (selectedTask?.id === taskId) {
            setSelectedTask(logged);
          }
          wmsDataService.saveTask(logged, logged.logs?.[0]).catch((e) => console.error('Supabase error:', e));
          createAndDispatchNotifications(logged, 'status_changed', actor || logged.assignee, { oldStatus: t.status });
          if (!isComp) requestNextSuggestions(logged, 'completed');
          if (!isComp && t.recurringRuleId) {
            recurringTaskService.onTaskCompleted(t.recurringRuleId);
          }
          return logged;
        }
        return t;
      })
    );
  };

  const handleUpdateTaskStatus = (taskId: string, newStatus: TaskStatus, authorName?: string, customNote?: string) => {
    const actor = authorName || currentAuthUser?.name || activeProductMember?.name;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Nếu chọn 'Hoàn thành' mà CHƯA CÓ resultLink hoặc link không đúng định dạng URL -> buộc nhập link
    if (newStatus === 'Hoàn thành' && (!task.resultLink || !isValidUrl(task.resultLink))) {
      setTaskToCompleteModal(task);
      return;
    }

    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const isComp = newStatus === 'Hoàn thành';
          const updated: TaskItem = {
            ...t,
            status: newStatus,
            progress: isComp ? 100 : (t.status === 'Hoàn thành' ? 50 : t.progress),
            updatedAt: new Date().toISOString(),
            completedAt: isComp ? (t.completedAt || new Date().toISOString()) : undefined,
          };
          const logged = recordTaskChanges(t, updated, actor || t.assignee, customNote);
          if (selectedTask?.id === taskId) {
            setSelectedTask(logged);
          }
          wmsDataService.saveTask(logged, logged.logs?.[0]).catch((e) => console.error('Supabase error:', e));
          createAndDispatchNotifications(logged, 'status_changed', actor || logged.assignee, { oldStatus: t.status, note: customNote });
          if (isComp && t.status !== 'Hoàn thành') requestNextSuggestions(logged, 'completed');
          if (isComp && t.recurringRuleId) {
            recurringTaskService.onTaskCompleted(t.recurringRuleId);
          }
          return logged;
        }
        return t;
      })
    );
  };

  const handleConfirmCompleteWithLink = (taskId: string, resultLink: string) => {
    const actor = currentAuthUser?.name || activeProductMember?.name;
    const finalLink = normalizeUrl(resultLink);
    if (!isValidUrl(finalLink)) return;
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const updated: TaskItem = {
            ...t,
            status: 'Hoàn thành',
            progress: 100,
            resultLink: finalLink,
            updatedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
          };
          const note = `Hoàn thành công việc kèm link: ${finalLink}`;
          const logged = recordTaskChanges(t, updated, actor || t.assignee, note);
          if (selectedTask?.id === taskId) {
            setSelectedTask(logged);
          }
          wmsDataService.saveTask(logged, logged.logs?.[0]).catch((e) => console.error('Supabase error:', e));
          createAndDispatchNotifications(logged, 'status_changed', actor || logged.assignee, {
            oldStatus: t.status,
            note,
          });
          requestNextSuggestions(logged, 'completed');
          if (t.recurringRuleId) {
            recurringTaskService.onTaskCompleted(t.recurringRuleId);
          }
          return logged;
        }
        return t;
      })
    );
  };

  const handleAddTask = (
    newTaskData: {
      id?: string;
      title: string;
      projectId: string;
      projectName: string;
      folderId?: string;
      folderName?: string;
      team: TeamType;
      assignee: string;
      dueDate?: string;
      estimateMinutes?: number;
      priority: PriorityLevel;
      details?: string;
      phaseId?: string;
      phaseName?: string;
      isRecurring?: boolean;
      recurringRuleId?: string;
      recurringFrequency?: RecurrenceFrequency;
    },
    authorName?: string
  ) => {
    const creator = authorName || currentAuthUser?.name || activeProductMember?.name || newTaskData.assignee;
    const taskDueDate = newTaskData.dueDate || '';
    const generatedId = newTaskData.id || (newTaskData.recurringRuleId
      ? `task-rec-${newTaskData.recurringRuleId}-${taskDueDate || 'periodic'}`
      : 'task-' + Date.now());

    const rawTask: TaskItem = {
      id: generatedId,
      title: newTaskData.title,
      projectId: newTaskData.projectId,
      projectName: newTaskData.projectName,
      folderId: newTaskData.folderId,
      folderName: newTaskData.folderName,
      team: newTaskData.team,
      assignee: newTaskData.assignee,
      status: 'Chưa làm',
      progress: 0,
      priority: newTaskData.priority,
      dueDate: taskDueDate,
      estimateMinutes: newTaskData.estimateMinutes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      details: newTaskData.details || '',
      phaseId: newTaskData.phaseId,
      phaseName: newTaskData.phaseName,
      isRecurring: newTaskData.isRecurring,
      recurringRuleId: newTaskData.recurringRuleId,
      recurringFrequency: newTaskData.recurringFrequency,
      subtasks: [],
      logs: [],
      createdBy: creator,
    };

    const initLog = createCreationLog(rawTask, creator);
    const newTask: TaskItem = {
      ...rawTask,
      logs: [initLog],
    };

    setTasks((prev) => [newTask, ...prev]);
    wmsDataService.saveTask(newTask, initLog).catch((e) => console.error('Supabase error:', e));
    createAndDispatchNotifications(newTask, 'created', creator);
    return newTask;
  };

  const handleUpdateTaskDueDate = (taskId: string, newDueDate: string, authorName?: string) => {
    const actor = authorName || currentAuthUser?.name || activeProductMember?.name;
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const oldDueDate = t.dueDate;
          const updated: TaskItem = {
            ...t,
            dueDate: newDueDate,
            updatedAt: new Date().toISOString(),
          };
          const rawLogged = recordTaskChanges(t, updated, actor || t.assignee);
          const cleanLogs: TaskLogItem[] = deduplicateTaskLogs(rawLogged.logs || []);
          const logged: TaskItem = { ...rawLogged, logs: cleanLogs };
          if (selectedTask?.id === taskId) {
            setSelectedTask(logged);
          }
          wmsDataService.saveTask(logged, logged.logs?.[0]).catch((e) => console.error('Supabase error:', e));
          createAndDispatchNotifications(logged, 'deadline_selected', actor || logged.assignee, {
            oldDueDate,
            newDueDate,
          });
          return logged;
        }
        return t;
      })
    );
  };

  const handleSaveTask = (updatedTask: TaskItem, authorName?: string, customNote?: string) => {
    const actor = authorName || currentAuthUser?.name || activeProductMember?.name;
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === updatedTask.id) {
          const isComp = updatedTask.status === 'Hoàn thành';
          const taskWithCompletedAt: TaskItem = {
            ...updatedTask,
            completedAt: isComp ? (updatedTask.completedAt || t.completedAt || new Date().toISOString()) : undefined,
          };
          const rawLogged = recordTaskChanges(t, taskWithCompletedAt, actor || updatedTask.assignee, customNote);
          const cleanLogs: TaskLogItem[] = deduplicateTaskLogs(rawLogged.logs || []);
          const logged: TaskItem = { ...rawLogged, logs: cleanLogs };
          if (selectedTask?.id === updatedTask.id) {
            setSelectedTask(logged);
          }
          wmsDataService.saveTask(logged, logged.logs?.[0]).catch((e) => console.error('Supabase error:', e));
          if (updatedTask.status !== t.status) {
            createAndDispatchNotifications(logged, 'status_changed', actor || logged.assignee, { oldStatus: t.status, note: customNote });
          }
          if (updatedTask.assignee !== t.assignee) {
            createAndDispatchNotifications(logged, 'reassigned', actor || logged.assignee, { oldAssignee: t.assignee });
          }
          const hasDueDateChanged = updatedTask.dueDate !== t.dueDate;
          if (hasDueDateChanged && updatedTask.dueDate) {
            createAndDispatchNotifications(logged, 'deadline_selected', actor || logged.assignee, {
              oldDueDate: t.dueDate,
              newDueDate: updatedTask.dueDate,
              note: customNote,
            });
          }
          const hasContentChanges =
            updatedTask.title !== t.title ||
            updatedTask.dueDate !== t.dueDate ||
            updatedTask.priority !== t.priority ||
            updatedTask.resultLink !== t.resultLink ||
            Boolean(customNote);

          if (hasContentChanges && updatedTask.status === t.status && updatedTask.assignee === t.assignee && !hasDueDateChanged) {
            const actType = customNote && (
              updatedTask.title === t.title &&
              updatedTask.dueDate === t.dueDate &&
              updatedTask.priority === t.priority &&
              updatedTask.resultLink === t.resultLink
            ) ? 'comment' : 'updated';
            createAndDispatchNotifications(logged, actType, actor || logged.assignee, { note: customNote });
          }
          if (isComp && t.status !== 'Hoàn thành') requestNextSuggestions(logged, 'completed');
          if (isComp && t.status !== 'Hoàn thành' && t.recurringRuleId) {
            recurringTaskService.onTaskCompleted(t.recurringRuleId);
          }
          return logged;
        }
        return t;
      })
    );
  };

  const handleDeleteTask = (taskId: string, isPermanent = false) => {
    const taskToDelete = tasks.find((t) => t.id === taskId);
    if (taskToDelete) {
      if (isPermanent) {
        wmsDataService.deleteTaskPermanently(taskId).catch((e) => console.error('Supabase error:', e));
      } else {
        const now = new Date();
        const deletionAuthor = currentAuthUser?.name || activeProductMember?.name || 'Hệ thống';
        const deletionLog: TaskLogItem = {
          id: 'log-' + Date.now(),
          author: deletionAuthor,
          timestamp: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
          action: 'Chuyển vào Thùng rác',
          changes: [{ field: 'Trạng thái', oldValue: taskToDelete.status, newValue: 'Thùng rác' }],
          note: `Công việc được xoá bởi ${deletionAuthor}`,
        };
        const taskWithLog: TaskItem = {
          ...taskToDelete,
          logs: [deletionLog, ...(taskToDelete.logs || [])],
        };

        const trashItem: TrashItem = {
          id: 'trash-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
          originalId: taskToDelete.id,
          type: 'task',
          title: taskToDelete.title,
          subtitle: `${taskToDelete.projectName} • ${taskToDelete.assignee}`,
          deletedAt: now.toISOString(),
          deletedBy: deletionAuthor,
          data: taskWithLog,
        };
        setTrash((prev) => [trashItem, ...prev]);
        wmsDataService.deleteTask(taskId, trashItem).catch((e) => console.error('Supabase error:', e));
      }
    }
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    if (selectedTask?.id === taskId) {
      setIsDrawerOpen(false);
      setSelectedTask(null);
    }
  };

  // Project Operations
  const handleAddProject = async (newProjData: Omit<ProjectItem, 'id'>) => {
    const newProj: ProjectItem = {
      ...newProjData,
      id: 'proj-' + Date.now(),
      createdBy: currentAuthUser?.name || activeProductMember?.name,
    };
    setProjects((prev) => [...prev, newProj]);
    try {
      await wmsDataService.saveProject(newProj, newProj.history?.[0]);
      console.log(`%c[handleAddProject] ✅ Đã lưu dự án "${newProj.name}" (${newProj.id}) [Mã: ${newProj.code}] vào Supabase thành công!`, 'color: #059669; font-weight: bold;');
      // Đồng bộ lại mã nếu backend tự sinh mã duy nhất mới
      setProjects((prev) => prev.map((p) => (p.id === newProj.id ? { ...newProj } : p)));
    } catch (e: any) {
      console.error('Lỗi khi ghi nhận dự án mới vào Supabase:', e);
      alert(`⚠️ Không thể lưu dự án vào cơ sở dữ liệu: ${e?.message || 'Lỗi kết nối'}`);
    }
  };

  const handleUpdateProject = async (updatedProj: ProjectItem) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === updatedProj.id ? updatedProj : p))
    );
    // Also sync task project names
    setTasks((prev) =>
      prev.map((t) =>
        t.projectId === updatedProj.id
          ? { ...t, projectName: updatedProj.name }
          : t
      )
    );
    try {
      await wmsDataService.saveProject(updatedProj, updatedProj.history?.[0]);
      console.log(`%c[handleUpdateProject] ✅ Đã cập nhật dự án "${updatedProj.name}" vào Supabase!`, 'color: #059669; font-weight: bold;');
    } catch (e: any) {
      console.error('Lỗi khi cập nhật dự án trên Supabase:', e);
    }
  };

  const handleDeleteProject = (projId: string) => {
    const projToDelete = projects.find((p) => p.id === projId);
    if (projToDelete) {
      const now = new Date();
      const deletionAuthor = currentAuthUser?.name || activeProductMember?.name || 'Hệ thống';
      const deletionNote = {
        id: 'note-' + Date.now(),
        author: deletionAuthor,
        content: `Dự án được chuyển vào Thùng rác bởi ${deletionAuthor}.`,
        createdAt: now.toISOString(),
      };
      const projWithNote: ProjectItem = {
        ...projToDelete,
        notes: [deletionNote, ...(projToDelete.notes || [])],
      };
      const trashItem: TrashItem = {
        id: 'trash-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
        originalId: projToDelete.id,
        type: 'project',
        title: projToDelete.name,
        subtitle: `Mã: ${projToDelete.code} • ${projToDelete.status}`,
        deletedAt: now.toISOString(),
        deletedBy: deletionAuthor,
        data: projWithNote,
      };
      setTrash((prev) => [trashItem, ...prev]);
      wmsDataService.deleteProject(projId, trashItem).catch((e) => console.error('Supabase error:', e));
    }
    setProjects((prev) => prev.filter((p) => p.id !== projId));
    if (filterState.projectId === projId) {
      setFilterState((prev) => ({ ...prev, projectId: 'all' }));
    }
  };

  // Member Operations
  const handleAddMember = (newMemData: Omit<MemberItem, 'id'>) => {
    const newMem: MemberItem = {
      ...newMemData,
      id: 'mem-' + Date.now(),
    };
    setMembers((prev) => [...prev, newMem]);
    wmsDataService.saveMember(newMem).catch((e) => console.error('Supabase error:', e));
  };

  const handleUpdateMember = (updatedMem: MemberItem) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === updatedMem.id ? updatedMem : m))
    );
    wmsDataService.saveMember(updatedMem).catch((e) => console.error('Supabase error:', e));
  };

  const handleDeleteMember = (memId: string) => {
    const memToDelete = members.find((m) => m.id === memId);
    if (memToDelete) {
      const now = new Date();
      const deletionAuthor = currentAuthUser?.name || activeProductMember?.name || 'Hệ thống';
      const trashItem: TrashItem = {
        id: 'trash-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
        originalId: memToDelete.id,
        type: 'member',
        title: memToDelete.name,
        subtitle: `${memToDelete.title} • ${memToDelete.department} (${memToDelete.region})`,
        deletedAt: now.toISOString(),
        deletedBy: deletionAuthor,
        data: memToDelete,
      };
      setTrash((prev) => [trashItem, ...prev]);
      wmsDataService.deleteMember(memId, trashItem).catch((e) => console.error('Supabase error:', e));
    }
    setMembers((prev) => prev.filter((m) => m.id !== memId));
  };

  // Trash Operations
  const currentUserForAuth = currentAuthUser || activeProductMember;
  const isTienNgoc = useMemo(() => {
    return canPermanentDeleteTrash(currentUserForAuth);
  }, [currentUserForAuth]);

  const handleRestoreTrashItem = (trashId: string) => {
    const item = trash.find((t) => t.id === trashId);
    if (!item) return;

    if (item.type === 'task') {
      const taskData = item.data as TaskItem;
      setTasks((prev) => {
        if (prev.some((t) => t.id === taskData.id)) return prev;
        return [taskData, ...prev];
      });
    } else if (item.type === 'project') {
      const projData = item.data as ProjectItem;
      setProjects((prev) => {
        if (prev.some((p) => p.id === projData.id)) return prev;
        return [...prev, projData];
      });
    } else if (item.type === 'member') {
      const memData = item.data as MemberItem;
      setMembers((prev) => {
        if (prev.some((m) => m.id === memData.id)) return prev;
        return [...prev, memData];
      });
    }

    setTrash((prev) => prev.filter((t) => t.id !== trashId));
    wmsDataService.restoreFromTrash(item).catch((e) => console.error('Supabase error:', e));
  };

  const handleEmptyTrash = () => {
    if (!canEmptyTrash(currentUserForAuth)) {
      alert('Chỉ có tài khoản Đặng Tiến Ngọc (tienngoc) mới có quyền dọn sạch Thùng rác.');
      return;
    }
    setTrash([]);
    wmsDataService.emptyTrash().catch((e) => console.error('Supabase error:', e));
  };

  const handlePermanentDeleteItem = (trashId: string) => {
    if (!canPermanentDeleteTrash(currentUserForAuth)) {
      alert('Chỉ có tài khoản Đặng Tiến Ngọc (tienngoc) mới có quyền xoá vĩnh viễn dữ liệu.');
      return;
    }
    setTrash((prev) => prev.filter((t) => t.id !== trashId));
    wmsDataService.deleteTrashPermanently(trashId).catch((e) => console.error('Supabase error:', e));
  };

  // Filter Tasks Calculation
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // 0. Account Personalization Scope
      if (activeProductMember) {
        if (taskPersonalScope === 'my_tasks') {
          if (!isTaskForMember(t, activeProductMember)) {
            return false;
          }
        } else if (taskPersonalScope === 'my_projects_tasks') {
          if (!isTaskInMemberProjects(t, activeProductMember, projects)) {
            return false;
          }
        }
      }

      // 1. Project Filter
      if (
        filterState.projectId !== 'all' &&
        t.projectId !== filterState.projectId &&
        t.projectName !== projects.find((p) => p.id === filterState.projectId)?.name
      ) {
        return false;
      }

      // 1b. Folder Filter
      if (
        filterState.folderId &&
        filterState.folderId !== 'all' &&
        !isTaskMatchingFolderFilter(t, filterState.folderId, projects, folders)
      ) {
        return false;
      }

      // 2. Team Filter
      if (filterState.team !== 'Tất cả' && t.team !== filterState.team) {
        return false;
      }

      // 3. Status Filter
      if (filterState.status !== 'Tất cả' && t.status !== filterState.status) {
        return false;
      }

      // 3b. Assignee / Member Filter
      if (
        filterState.assignee &&
        filterState.assignee !== 'Tất cả' &&
        taskPersonalScope !== 'my_projects_tasks' &&
        !isSamePersonName(t.assignee, filterState.assignee)
      ) {
        return false;
      }

      // 4. Due Date Filter
      if (filterState.dueFilter === 'today' && !isTaskDueToday(t)) {
        return false;
      }
      if (filterState.dueFilter === 'overdue' && !isTaskOverdue(t)) {
        return false;
      }
      if (filterState.dueFilter === 'soon' && !isTaskDueSoon(t)) {
        return false;
      }
      if (
        filterState.dueFilter === 'custom' &&
        filterState.customDueDate &&
        normalizeDateString(t.dueDate) !== filterState.customDueDate
      ) {
        return false;
      }

      // 5. Search Query
      if (filterState.searchQuery.trim()) {
        const q = filterState.searchQuery.toLowerCase();
        const matchTitle = (t.title || '').toLowerCase().includes(q);
        const matchAssignee = (t.assignee || '').toLowerCase().includes(q);
        const matchProject = (t.projectName || '').toLowerCase().includes(q);
        const matchFolder = (t.folderName || '').toLowerCase().includes(q);
        const matchDetails = (t.details || '').toLowerCase().includes(q);
        if (!matchTitle && !matchAssignee && !matchProject && !matchFolder && !matchDetails) {
          return false;
        }
      }

      return true;
    });
  }, [tasks, filterState, projects, folders, activeProductMember, taskPersonalScope]);

  // Active vs Completed Tasks separation
  const activeTasks = useMemo(
    () => filteredTasks.filter((t) => t.status !== 'Hoàn thành'),
    [filteredTasks]
  );
  const completedTasks = useMemo(() => {
    return filteredTasks
      .filter((t) => t.status === 'Hoàn thành')
      .sort((a, b) => {
        // 1. So sánh ngày hạn hoàn thành (dueDate: YYYY-MM-DD) từ mới nhất đến cũ nhất
        const dateA = a.dueDate ? a.dueDate.slice(0, 10) : '';
        const dateB = b.dueDate ? b.dueDate.slice(0, 10) : '';

        if (dateA !== dateB) {
          if (dateA && dateB) {
            return dateB.localeCompare(dateA); // Mới nhất lên đầu
          }
          return dateB ? 1 : -1;
        }

        // 2. Nếu cùng ngày hạn, so sánh thời điểm hoàn thành (completedAt) từ mới đến cũ
        const compA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
        const compB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
        if (compA !== compB) {
          return compB - compA;
        }

        // 3. Nếu không có completedAt, so sánh thời điểm log hoàn thành
        const getLogCompletionTime = (t: TaskItem): number => {
          if (!t.logs || t.logs.length === 0) return 0;
          const log = t.logs.find(
            (l) =>
              l.changes?.some((c) => c.field === 'Trạng thái' && c.newValue === 'Hoàn thành') ||
              l.action?.toLowerCase().includes('hoàn thành')
          );
          return log?.timestamp ? new Date(log.timestamp).getTime() : 0;
        };

        const logA = getLogCompletionTime(a);
        const logB = getLogCompletionTime(b);
        if (logA !== logB) {
          return logB - logA;
        }

        // 4. So sánh thời điểm cập nhật (updatedAt) từ mới đến cũ
        const updateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const updateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        if (updateA !== updateB) {
          return updateB - updateA;
        }

        // 5. So sánh thời điểm tạo (createdAt) từ mới đến cũ
        const createA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const createB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        if (createA !== createB) {
          return createB - createA;
        }

        return (b.id || '').localeCompare(a.id || '');
      });
  }, [filteredTasks]);

  // Group active tasks by project or direct folder if 'all' projects selected
  const activeTasksByProject = useMemo(() => {
    const groups: Record<string, TaskItem[]> = {};
    activeTasks.forEach((t) => {
      const groupKey = isDirectFolderTask(t)
        ? `folder:${t.folderId || 'folder-vne'}`
        : (t.projectName || 'Chưa xác định (Others)');
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(t);
    });
    return groups;
  }, [activeTasks]);

  // Overall Task Counts
  const taskStats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'Hoàn thành').length;
    const blocked = tasks.filter((t) => t.status === 'Bị nghẽn').length;
    const inProgress = total - completed;
    return { total, completed, inProgress, blocked };
  }, [tasks]);

  const myActiveTasksCount = useMemo(() => {
    if (!currentAuthUser) return 0;
    return tasks.filter((t) => isTaskForMember(t, currentAuthUser) && t.status !== 'Hoàn thành').length;
  }, [tasks, currentAuthUser]);

  const myProjectsCount = useMemo(() => {
    if (!currentAuthUser) return 0;
    return projects.filter((p) => getMemberProjectRelation(p, currentAuthUser, tasks).isRelated).length;
  }, [projects, currentAuthUser, tasks]);

  // Active target member for sidebar badge calculations
  const targetMemberForCounts = useMemo(() => {
    return activeProductMember || (filterState.assignee !== 'Tất cả' ? members.find((m) => isSamePersonName(m.name, filterState.assignee)) : null);
  }, [activeProductMember, filterState.assignee, members]);

  // Task counts by project for sidebar badges (dynamically filtered by selected member / scope)
  const taskCountsByProject = useMemo(() => {
    const counts: Record<string, number> = {};
    projects.forEach((p) => {
      counts[p.id] = tasks.filter((t) => {
        const matchesProj = t.projectId === p.id || t.projectName === p.name;
        if (!matchesProj || t.status === 'Hoàn thành') return false;

        if (activeProductMember) {
          if (taskPersonalScope === 'my_tasks') {
            return isTaskForMember(t, activeProductMember);
          }
        } else if (targetMemberForCounts && filterState.assignee !== 'Tất cả') {
          return isTaskForMember(t, targetMemberForCounts);
        }
        return true;
      }).length;
    });
    return counts;
  }, [tasks, projects, activeProductMember, taskPersonalScope, targetMemberForCounts, filterState.assignee]);

  // Task counts by folder (bao gồm cả công việc trực tiếp trong folder và công việc thuộc các dự án trong folder/folder con)
  const taskCountsByFolder = useMemo(() => {
    const counts: Record<string, number> = {};
    folders.forEach((f) => {
      counts[f.id] = tasks.filter((t) => {
        if (t.status === 'Hoàn thành') return false;
        if (!isTaskMatchingFolderFilter(t, f.id, projects, folders)) return false;

        if (activeProductMember) {
          if (taskPersonalScope === 'my_tasks') {
            return isTaskForMember(t, activeProductMember);
          }
        } else if (targetMemberForCounts && filterState.assignee !== 'Tất cả') {
          return isTaskForMember(t, targetMemberForCounts);
        }
        return true;
      }).length;
    });
    return counts;
  }, [tasks, projects, folders, activeProductMember, taskPersonalScope, targetMemberForCounts, filterState.assignee]);

  // Scoped tasks for due date calculations & reminder panel (respecting active scope and filters, excluding dueFilter itself)
  const scopedTasksForDue = useMemo(() => {
    return tasks.filter((t) => {
      // 0. Account Personalization Scope
      if (activeProductMember) {
        if (taskPersonalScope === 'my_tasks') {
          if (!isTaskForMember(t, activeProductMember)) {
            return false;
          }
        } else if (taskPersonalScope === 'my_projects_tasks') {
          if (!isTaskInMemberProjects(t, activeProductMember, projects)) {
            return false;
          }
        }
      }

      // 1. Project Filter
      if (
        filterState.projectId !== 'all' &&
        t.projectId !== filterState.projectId &&
        t.projectName !== projects.find((p) => p.id === filterState.projectId)?.name
      ) {
        return false;
      }

      // 1b. Folder Filter
      if (
        filterState.folderId &&
        filterState.folderId !== 'all' &&
        !isTaskMatchingFolderFilter(t, filterState.folderId, projects, folders)
      ) {
        return false;
      }

      // 2. Team Filter
      if (filterState.team !== 'Tất cả' && t.team !== filterState.team) {
        return false;
      }

      // 3. Assignee / Member Filter
      if (
        filterState.assignee &&
        filterState.assignee !== 'Tất cả' &&
        taskPersonalScope !== 'my_projects_tasks' &&
        !isSamePersonName(t.assignee, filterState.assignee)
      ) {
        return false;
      }

      return true;
    });
  }, [tasks, activeProductMember, taskPersonalScope, projects, folders, filterState.projectId, filterState.folderId, filterState.team, filterState.assignee]);

  // Today and Overdue counts for filters (dynamically scoped)
  const todayCount = useMemo(() => {
    return scopedTasksForDue.filter((t) => isTaskDueToday(t)).length;
  }, [scopedTasksForDue]);

  const overdueCount = useMemo(() => {
    return scopedTasksForDue.filter((t) => isTaskOverdue(t)).length;
  }, [scopedTasksForDue]);

  // Bộ đếm cho thanh lọc nhanh (theo phạm vi đang xem, không tính bộ lọc thời hạn/trạng thái)
  const quickViewCounts = useMemo(() => {
    const active = scopedTasksForDue.filter((t) => t.status !== 'Hoàn thành');
    return {
      all: active.length,
      overdue: active.filter((t) => isTaskOverdue(t)).length,
      today: active.filter((t) => isTaskDueToday(t)).length,
      soon: active.filter((t) => isTaskDueSoon(t)).length,
      blocked: active.filter((t) => t.status === 'Bị nghẽn').length,
    };
  }, [scopedTasksForDue]);

  const activeQuickView: QuickView | 'custom' = useMemo(() => {
    if (filterState.dueFilter === 'custom') return 'custom';
    if (filterState.status === 'Bị nghẽn' && filterState.dueFilter === 'all') return 'blocked';
    if (filterState.dueFilter === 'overdue') return 'overdue';
    if (filterState.dueFilter === 'today') return 'today';
    if (filterState.dueFilter === 'soon') return 'soon';
    return 'all';
  }, [filterState.dueFilter, filterState.status]);

  const handleSelectQuickView = useCallback((view: QuickView) => {
    setFilterState((f) => ({
      ...f,
      dueFilter: view === 'overdue' || view === 'today' || view === 'soon' ? view : 'all',
      customDueDate: undefined,
      status: view === 'blocked' ? 'Bị nghẽn' : 'Tất cả',
    }));
  }, []);

  // Nhóm theo dự án: việc gấp nhất lên đầu mỗi nhóm, nhóm có việc gấp nhất lên trước
  const sortedProjectGroups = useMemo(() => {
    return Object.entries(activeTasksByProject)
      .map(([key, list]) => [key, sortTasksByUrgency(list)] as [string, TaskItem[]])
      .sort(([, a], [, b]) => {
        const dueA = normalizeDateString(a[0]?.dueDate) || '9999-12-31';
        const dueB = normalizeDateString(b[0]?.dueDate) || '9999-12-31';
        return dueA.localeCompare(dueB);
      });
  }, [activeTasksByProject]);

  const dueBuckets = useMemo(() => groupTasksByDue(activeTasks), [activeTasks]);

  const activeTabTitles: Record<ActiveTab, string> = {
    tasks: 'Công việc',
    projects: 'Dự án',
    members: 'Nhân sự',
    trash: 'Thùng rác',
    settings: 'Thiết lập',
    reports: 'Báo cáo',
    performance: 'Hiệu quả team',
  };

  // If not authenticated, display LoginView
  if (!currentAuthUser) {
    return (
      <LoginView
        members={members}
        onLoginSuccess={handleLoginSuccess}
        noticeMessage={loginNoticeMessage || undefined}
      />
    );
  }

  const openTaskDetail = (t: TaskItem) => {
    setSelectedTask(t);
    setIsDrawerOpen(true);
  };

  const openQuickAdd = () => {
    setActiveTab('tasks');
    if (window.innerWidth < 768) {
      setIsMobileQuickAddOpen(true);
    } else {
      setTimeout(() => document.getElementById('quick-add-input')?.focus(), 80);
    }
  };

  // Thao tác nhanh trên hàng việc: luôn kèm Hoàn tác để người dùng thao tác mạnh tay mà không sợ nhầm
  const showUndo = (message: string, onUndo?: () => void) =>
    setUndoToast({ id: Date.now(), message, onUndo });

  /** Thêm việc từ form của người dùng rồi hỏi gợi ý việc tiếp theo. */
  const handleAddTaskWithSuggestions = (data: Parameters<typeof handleAddTask>[0]) => {
    const created = handleAddTask(data);
    requestNextSuggestions(created, 'created');
  };

  /** Biến một gợi ý thành việc thật, kế thừa dự án và giai đoạn của việc gốc. */
  const handleAddSuggestedTask = (item: NextSuggestion) => {
    const source = nextSuggestSource.current;
    if (!source) return;
    const member = members.find((m) => isSamePersonName(m.name, item.assignee));
    handleAddTask({
      title: item.title,
      projectId: source.task.projectId,
      projectName: source.task.projectName,
      folderId: source.task.folderId,
      folderName: source.task.folderName,
      phaseId: source.task.phaseId,
      phaseName: source.task.phaseName,
      team: member?.team || source.task.team,
      assignee: member?.name || source.task.assignee,
      dueDate: item.dueDate,
      estimateMinutes: item.estimateMinutes,
      priority: 'Bình thường',
    });
    reportSuggestionAccepted(currentAuthUser, source.logId, item.title);
    setNextSuggest((cur) => (cur ? { ...cur, added: [...cur.added, item.title] } : cur));
  };

  const quickUpdateDueDate = (taskId: string, newDate: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const oldDate = task.dueDate || '';
    handleUpdateTaskDueDate(taskId, newDate);
    showUndo(`Dời sang ${formatTaskDueDisplay(newDate)}: ${task.title}`, () =>
      handleUpdateTaskDueDate(taskId, oldDate)
    );
  };

  const quickToggleComplete = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const willComplete = task.status !== 'Hoàn thành';
    const needsLink = willComplete && (!task.resultLink || !isValidUrl(task.resultLink));
    handleToggleComplete(taskId);
    if (needsLink) return; // Mở hộp nhập link kết quả, chưa đổi trạng thái
    showUndo(willComplete ? `Đã xong: ${task.title}` : `Mở lại: ${task.title}`, () =>
      handleUpdateTaskStatus(taskId, task.status)
    );
  };

  const quickUpdateStatus = (taskId: string, newStatus: TaskStatus) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;
    const needsLink = newStatus === 'Hoàn thành' && (!task.resultLink || !isValidUrl(task.resultLink));
    handleUpdateTaskStatus(taskId, newStatus);
    if (needsLink) return;
    showUndo(`${newStatus}: ${task.title}`, () => handleUpdateTaskStatus(taskId, task.status));
  };

  const renderTaskRow = (task: TaskItem, showProjectBadge = false) => (
    <TaskItemRow
      key={task.id}
      task={task}
      members={members}
      projects={projects}
      currentAuthUser={currentAuthUser}
      isMyTask={currentAuthUser ? isTaskForMember(task, currentAuthUser) : false}
      onToggleComplete={quickToggleComplete}
      onSelectTask={openTaskDetail}
      onUpdateStatus={quickUpdateStatus}
      onDeleteTask={handleDeleteTask}
      onOpenProjectDetail={handleOpenProjectDetail}
      showProjectBadge={showProjectBadge}
      onFilterByAssignee={handleFilterByAssignee}
      onUpdateDueDate={quickUpdateDueDate}
    />
  );

  const paletteCommands: PaletteCommand[] = [
    { id: 'add', label: 'Thêm việc mới', icon: Plus, shortcut: 'N', keywords: 'tao them cong viec task new', run: openQuickAdd },
    {
      id: 'today',
      label: 'Việc hạn hôm nay',
      hint: `${quickViewCounts.today} việc`,
      icon: Sun,
      keywords: 'hom nay today han',
      run: () => {
        setActiveTab('tasks');
        handleSelectQuickView('today');
      },
    },
    {
      id: 'overdue',
      label: 'Việc quá hạn',
      hint: `${quickViewCounts.overdue} việc`,
      icon: AlertOctagon,
      keywords: 'qua han tre overdue',
      run: () => {
        setActiveTab('tasks');
        handleSelectQuickView('overdue');
      },
    },
    {
      id: 'mine',
      label: 'Chỉ xem việc của tôi',
      icon: UserIcon,
      keywords: 'cua toi minh ca nhan',
      run: () => {
        setActiveTab('tasks');
        handlePerspectiveChange('my_tasks', currentAuthUser);
      },
    },
    {
      id: 'all',
      label: 'Xem toàn bộ phận',
      icon: UsersIcon,
      keywords: 'toan ban tat ca bo phan',
      run: () => {
        setActiveTab('tasks');
        handlePerspectiveChange('all', null);
      },
    },
    {
      id: 'group-due',
      label: groupMode === 'due' ? 'Nhóm việc theo dự án' : 'Nhóm việc theo hạn',
      icon: CalendarClock,
      keywords: 'nhom sap xep group',
      run: () => handleGroupModeChange(groupMode === 'due' ? 'project' : 'due'),
    },
    { id: 'projects', label: 'Đi tới Dự án', icon: FolderKanban, keywords: 'du an project', run: () => setActiveTab('projects') },
    { id: 'reports', label: 'Đi tới Báo cáo', icon: BarChart3, keywords: 'bao cao report lich', run: () => setActiveTab('reports') },
    ...(canViewPerformance
      ? [{ id: 'performance', label: 'Đi tới Hiệu quả team', icon: TrendingUp, keywords: 'hieu qua team performance danh gia', run: () => setActiveTab('performance') }]
      : []),
    {
      id: 'notifs',
      label: 'Mở thông báo',
      hint: unreadNotificationsCount ? `${unreadNotificationsCount} chưa đọc` : undefined,
      icon: Bell,
      keywords: 'thong bao chuong notification',
      run: () => setIsNotificationDrawerOpen(true),
    },
  ];

  const DUE_BUCKET_STYLE: Record<DueBucketKey, { dot: string; text: string }> = {
    overdue: { dot: 'bg-negative-solid', text: 'text-negative' },
    today: { dot: 'bg-warning-solid', text: 'text-warning' },
    tomorrow: { dot: 'bg-warning-solid', text: 'text-warning' },
    week: { dot: 'bg-support-solid', text: 'text-support' },
    later: { dot: 'bg-icon-subdued', text: 'text-ink-lighter' },
    none: { dot: 'bg-surface-300', text: 'text-subdued' },
  };

  const hasNarrowingFilters =
    filterState.projectId !== 'all' ||
    (filterState.folderId && filterState.folderId !== 'all') ||
    filterState.team !== 'Tất cả' ||
    filterState.status !== 'Tất cả' ||
    filterState.dueFilter !== 'all' ||
    Boolean(filterState.searchQuery);

  const emptyStateCopy = (() => {
    if (filterState.searchQuery) return { title: `Không thấy việc khớp “${filterState.searchQuery}”`, sub: 'Thử từ khoá khác hoặc xoá bộ lọc.' };
    switch (activeQuickView) {
      case 'overdue':
        return { title: 'Không còn việc quá hạn', sub: 'Mọi việc đều trong hạn. Giữ nhịp này nhé.' };
      case 'today':
        return { title: 'Hôm nay không còn việc đến hạn', sub: 'Có thể kéo việc của ngày mai lên làm trước.' };
      case 'soon':
        return { title: '3 ngày tới chưa có việc đến hạn', sub: 'Lên kế hoạch sớm để tránh dồn việc.' };
      case 'blocked':
        return { title: 'Không có việc bị nghẽn', sub: 'Tất cả việc đang thông suốt.' };
      case 'custom':
        return { title: 'Ngày này không có việc đến hạn', sub: 'Chọn ngày khác hoặc bỏ lọc theo ngày.' };
      default:
        return hasNarrowingFilters
          ? { title: 'Không có việc khớp bộ lọc', sub: 'Bỏ bớt bộ lọc để xem thêm.' }
          : { title: 'Chưa có việc cần làm', sub: 'Thêm việc đầu tiên để bắt đầu ngày làm việc.' };
    }
  })();

  return (
    <div className="min-h-screen bg-surface-100 text-ink flex flex-row antialiased font-body w-full max-w-full overflow-x-clip">
      {/* 1. LEFT SIDEBAR (Pinned Fixed Left Sidebar with Folders & Projects Tree) */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        projects={projects}
        folders={folders}
        members={members}
        activeProductMember={activeProductMember}
        currentAuthUser={currentAuthUser}
        selectedProjectId={filterState.projectId}
        onSelectProject={(id) => setFilterState((f) => ({ ...f, projectId: id, folderId: 'all' }))}
        selectedFolderId={filterState.folderId || 'all'}
        onSelectFolder={(folderId) => setFilterState((f) => ({ ...f, folderId, projectId: 'all' }))}
        selectedTeam={filterState.team}
        onSelectTeam={(team) => setFilterState((f) => ({ ...f, team }))}
        selectedStatus={filterState.status}
        onSelectStatus={(status) => setFilterState((f) => ({ ...f, status }))}
        selectedAssignee={filterState.assignee}
        onSelectAssignee={(assignee) => setFilterState((f) => ({ ...f, assignee }))}
        selectedDueFilter={filterState.dueFilter}
        onSelectDueFilter={(dueFilter) =>
          setFilterState((f) => ({
            ...f,
            dueFilter,
            customDueDate: dueFilter === 'custom' ? f.customDueDate : undefined,
          }))
        }
        customDueDate={filterState.customDueDate}
        onSelectCustomDate={(date) =>
          setFilterState((f) => ({ ...f, dueFilter: 'custom', customDueDate: date }))
        }
        todayCount={todayCount}
        overdueCount={overdueCount}
        searchQuery={filterState.searchQuery}
        onSearchChange={(q) => setFilterState((f) => ({ ...f, searchQuery: q }))}
        taskCountsByProject={taskCountsByProject}
        taskCountsByFolder={taskCountsByFolder}
        totalActiveTasks={taskStats.inProgress}
        trashCount={trash.length}
        blockedCount={taskStats.blocked}
        onOpenQuickAdd={() => {
          setActiveTab('tasks');
          if (window.innerWidth < 768) {
            setIsMobileQuickAddOpen(true);
          } else {
            setTimeout(() => {
              document.getElementById('quick-add-input')?.focus();
            }, 100);
          }
        }}
        onOpenAddProject={handleOpenAddProject}
        onOpenFolderManager={() => setIsFolderManagerOpen(true)}
        onOpenAddMember={handleOpenAddMember}
        onResetData={handleResetData}
        onLogoClick={handleLogoClick}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* 2. MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen w-full">
        {/* Sticky Header & Active Filters Bar Container (Luôn được ghim ở đầu trang khi cuộn) */}
        <div className="sticky top-0 z-20 bg-surface ">
          {/* Header Bar */}
          <Header
            currentDate={currentDate}
            onToggleSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
            onOpenSearch={() => setIsPaletteOpen(true)}
            onOpenStandup={() => setIsStandupOpen(true)}
            onOpenQuickAdd={() => {
              setActiveTab('tasks');
              if (window.innerWidth < 768) {
                setIsMobileQuickAddOpen(true);
              } else {
                setTimeout(() => {
                  document.getElementById('quick-add-input')?.focus();
                }, 100);
              }
            }}
            onOpenAddProject={handleOpenAddProject}
            onOpenAddMember={handleOpenAddMember}
            taskStats={taskStats}
            activeTabTitle={activeTabTitles[activeTab]}
            activeTab={activeTab}
            members={members}
            activeProductMember={activeProductMember}
            onSelectProductMember={handleSelectProductMember}
            tasks={tasks}
            projects={projects}
            currentAuthUser={currentAuthUser}
            onOpenProfile={handleOpenProfile}
            onLogout={handleLogout}
            isDbConnected={isDbConnected}
            unreadNotificationsCount={unreadNotificationsCount}
            onOpenNotifications={() => setIsNotificationDrawerOpen(true)}
            personalScope={taskPersonalScope}
            onChangeScope={handlePerspectiveChange}
          />

          {/* Active Filters Bar (Pinned right beside Left Sidebar) */}
          <ActiveFiltersBar
            filterState={filterState}
            projects={projects}
            folders={folders}
            members={members}
            taskPersonalScope={taskPersonalScope}
            activeProductMember={activeProductMember}
            currentAuthUser={currentAuthUser}
            onClearProject={() => setFilterState((f) => ({ ...f, projectId: 'all' }))}
            onClearFolder={() => setFilterState((f) => ({ ...f, folderId: 'all' }))}
            onClearAssignee={() => {
              const def = getDefaultPerspectiveForUser(currentAuthUser);
              setActiveProductMember(def.activeMember);
              setTaskPersonalScope(def.scope);
              setFilterState((f) => ({ ...f, assignee: def.assignee }));
            }}
            onClearTeam={() => setFilterState((f) => ({ ...f, team: 'Tất cả' }))}
            onClearStatus={() => setFilterState((f) => ({ ...f, status: 'Tất cả' }))}
            onClearDue={() => setFilterState((f) => ({ ...f, dueFilter: 'all' }))}
            onClearSearch={() => setFilterState((f) => ({ ...f, searchQuery: '' }))}
            onClearPersonalScope={() => {
              const def = getDefaultPerspectiveForUser(currentAuthUser);
              setActiveProductMember(def.activeMember);
              setTaskPersonalScope(def.scope);
              setFilterState((f) => ({ ...f, assignee: def.assignee }));
            }}
            onClearAll={handleResetToDefaultView}
            onSelectProject={(projId) => setFilterState((f) => ({ ...f, projectId: projId, folderId: 'all' }))}
            onSelectFolder={(folderId) => setFilterState((f) => ({ ...f, folderId, projectId: 'all' }))}
            onSelectStatus={(status) => setFilterState((f) => ({ ...f, status }))}
            onSelectDue={(dueFilter) => setFilterState((f) => ({ ...f, dueFilter }))}
            onSelectTeam={(team) => setFilterState((f) => ({ ...f, team }))}
            onSelectAssignee={(assignee) => setFilterState((f) => ({ ...f, assignee }))}
          />
        </div>

        {/* Main Body */}
        <main
          className={`flex-1 px-4 md:px-6 pt-4 pb-28 md:py-8 w-full mx-auto ${
            activeTab === 'settings' ? 'max-w-[1440px]' : 'max-w-[1040px]'
          }`}
        >
          <Suspense fallback={<ViewFallback />}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="w-full space-y-6"
            >
              {/* VIEW 1: TASKS LIST VIEW */}
              {activeTab === 'tasks' && (
                <div className="space-y-6 animate-fade-in">
                  {/* TOP CONTROLS: Filter 1, Filter 2, Search (QuickAddBar), and Section Header */}
                  {/* Aligned in the 800px column with left gutter spacer (192px/208px) on desktop, exactly as user's sketch */}
                  <div className="flex flex-col md:flex-row items-start gap-4 lg:gap-6">
                    <div className="hidden md:block w-48 lg:w-52 shrink-0" />
                    <div className="w-full max-w-[800px] space-y-6">
                      {/* Subtle Web Push Personalized Prompt Banner */}
                      <WebPushPromptBanner
                        onOpenNotifications={() => setIsNotificationDrawerOpen(true)}
                      />

                      {/* Thông báo Kỳ nghỉ lễ sắp tới (trong vòng 5 ngày) - Tách riêng 1 dòng nổi bật, nhiều màu sắc */}
                      <UpcomingHolidayBanner customDays={5} />

                      {/* Box Thống kê Kết quả công việc Tuần trước (Sáng thứ Hai cho từng tài khoản Product) */}
                      <MondayWeeklySummary
                        members={members}
                        tasks={tasks}
                        projects={projects}
                        currentAuthUser={currentAuthUser}
                        activeProductMember={activeProductMember}
                        onSelectTask={(task) => {
                          setSelectedTask(task);
                          setIsDrawerOpen(true);
                        }}
                      />

                      {/* Khu vực Cảnh báo tiến độ ngày & Lịch nghỉ phép: Chỉ hiển thị khi có cảnh báo hoặc có người nghỉ */}
                      {workingTimeService.isWorkingDay(new Date()) ? (
                        hasMissingTasksAlert && productLeavesData.hasAnyLeave ? (
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-stretch">
                            <div className="md:col-span-7 flex flex-col">
                              <DailyCompletionAlert
                                members={members}
                                tasks={tasks}
                                projects={projects}
                                currentAuthUser={currentAuthUser}
                                activeProductMember={activeProductMember}
                                selectedAssignee={filterState.assignee !== 'Tất cả' ? filterState.assignee : undefined}
                                onSelectAssignee={(assigneeName) => {
                                  setFilterState((f) => ({ ...f, assignee: assigneeName }));
                                }}
                              />
                            </div>
                            <div className="md:col-span-5 flex flex-col">
                              <DailyLeaveNotice members={members} leaveData={productLeavesData} />
                            </div>
                          </div>
                        ) : hasMissingTasksAlert ? (
                          <DailyCompletionAlert
                            members={members}
                            tasks={tasks}
                            projects={projects}
                            currentAuthUser={currentAuthUser}
                            activeProductMember={activeProductMember}
                            selectedAssignee={filterState.assignee !== 'Tất cả' ? filterState.assignee : undefined}
                            onSelectAssignee={(assigneeName) => {
                              setFilterState((f) => ({ ...f, assignee: assigneeName }));
                            }}
                          />
                        ) : productLeavesData.hasAnyLeave ? (
                          <div className="w-full">
                            <DailyLeaveNotice members={members} leaveData={productLeavesData} isSingleLine={true} />
                          </div>
                        ) : null
                      ) : (
                        productLeavesData.hasAnyLeave ? (
                          <div className="w-full">
                            <DailyLeaveNotice members={members} leaveData={productLeavesData} isSingleLine={true} />
                          </div>
                        ) : null
                      )}

                      {/* Quick Add Form Box */}
                      <QuickAddBar
                        projects={projects}
                        folders={folders}
                        tasks={tasks}
                        members={members}
                        onAddTask={handleAddTaskWithSuggestions}
                        defaultProjectId={
                          filterState.projectId !== 'all' ? filterState.projectId : undefined
                        }
                        defaultFolderId={
                          filterState.folderId && filterState.folderId !== 'all' ? filterState.folderId : undefined
                        }
                        defaultAssignee={activeProductMember?.name || currentAuthUser?.name}
                        currentUser={currentAuthUser || activeProductMember}
                        onUpdateProjectChecklist={(projId, updatedChecklist) => {
                          const targetProj = projects.find((p) => p.id === projId);
                          if (targetProj) {
                            handleUpdateProject({ ...targetProj, checklist: updatedChecklist });
                          }
                        }}
                      />

                      {/* Thanh lọc nhanh 1 chạm + chuyển cách nhóm */}
                      <div className="space-y-2.5 pt-1">
                        <div className="flex items-center justify-between gap-3 px-0.5">
                          <div className="flex items-baseline gap-2 min-w-0">
                            <h3 className="vds-text-heading-xs text-ink shrink-0">
                              Cần làm <span className="font-num text-subdued font-normal">{activeTasks.length}</span>
                            </h3>
                            {filterState.searchQuery && (
                              <button
                                type="button"
                                onClick={() => setFilterState((f) => ({ ...f, searchQuery: '' }))}
                                className="text-xs font-ui text-link underline underline-offset-2 cursor-pointer truncate"
                              >
                                Tìm “{filterState.searchQuery}” ✕
                              </button>
                            )}
                          </div>
                          <GroupModeTabs value={groupMode} onChange={handleGroupModeChange} />
                        </div>
                        <TaskViewBar
                          activeView={activeQuickView}
                          counts={quickViewCounts}
                          customLabel={
                            filterState.customDueDate ? `Ngày ${formatDateWithEnDay(filterState.customDueDate)}` : undefined
                          }
                          onSelectView={handleSelectQuickView}
                          onClearCustom={() => setFilterState((f) => ({ ...f, dueFilter: 'all', customDueDate: undefined }))}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Active Tasks Content */}
                  {activeTasks.length === 0 ? (
                    <div className="flex flex-col md:flex-row items-start gap-4 lg:gap-6">
                      <div className="hidden md:block w-48 lg:w-52 shrink-0" />
                      <div className="w-full max-w-[800px]">
                        <div className="bg-surface rounded-vds-lg border border-line px-6 py-10 text-center">
                          <div className="w-11 h-11 rounded-full bg-surface-positive text-positive flex items-center justify-center mx-auto">
                            <CheckCircle2 className="w-5 h-5" />
                          </div>
                          <p className="mt-3 font-title text-[15px] font-semibold text-ink">{emptyStateCopy.title}</p>
                          <p className="mt-1 text-[13px] font-ui text-subdued">{emptyStateCopy.sub}</p>
                          <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
                            <VdsButton variant="accent" size="sm" iconLeft="Add" onClick={openQuickAdd}>
                              Thêm việc
                            </VdsButton>
                            {hasNarrowingFilters && (
                              <button
                                type="button"
                                onClick={handleResetToDefaultView}
                                className="h-9 px-3.5 rounded-vds-lg border border-line bg-surface hover:bg-surface-100 text-ink-lighter text-[13px] font-ui font-semibold cursor-pointer"
                              >
                                Xoá bộ lọc
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : groupMode === 'due' ? (
                    // Nhóm theo hạn: Quá hạn → Hôm nay → Ngày mai → 7 ngày tới → Sau đó → Chưa có hạn
                    <div className="space-y-5 md:space-y-8">
                      {dueBuckets.map((bucket, idx) => {
                        const style = DUE_BUCKET_STYLE[bucket.key];
                        return (
                          <section
                            key={bucket.key}
                            aria-label={bucket.label}
                            className={idx > 0 ? 'md:border-t md:border-line md:pt-8' : ''}
                          >
                            <div className="flex flex-col md:flex-row items-start gap-2 md:gap-4 lg:gap-6">
                              <div className="flex md:hidden items-center gap-2 w-full px-0.5">
                                <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                                <span className={`font-title text-[14px] font-semibold ${style.text}`}>{bucket.label}</span>
                                <span className="text-[12px] font-num text-subdued-lighter">{bucket.tasks.length}</span>
                              </div>
                              <div className="hidden md:block w-48 lg:w-52 shrink-0 md:sticky md:top-28 self-start pt-1">
                                <div className="flex items-center gap-2">
                                  <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                                  <span className={`font-title text-[14px] font-semibold ${style.text}`}>{bucket.label}</span>
                                </div>
                                <div className="pl-4 mt-1 text-xs font-ui text-subdued">{bucket.tasks.length} việc</div>
                              </div>
                              <div className="w-full max-w-[800px]">
                                <div className="bg-surface rounded-vds-lg border border-line overflow-hidden">
                                  {bucket.tasks.map((task) => renderTaskRow(task, true))}
                                </div>
                              </div>
                            </div>
                          </section>
                        );
                      })}
                    </div>
                  ) : filterState.projectId === 'all' ? (
                    // Grouped by Project or Direct Folder: Anchor on Left (Pinned), 800px Tasks Card on Right
                    <div className="space-y-6 md:space-y-8">
                      {sortedProjectGroups.map(
                        ([groupKey, projTasks], idx) => {
                          const isDirectFolderGroup = groupKey.startsWith('folder:');
                          const directFolderId = isDirectFolderGroup ? groupKey.replace('folder:', '') : undefined;
                          const directFolderPath = directFolderId
                            ? (getFolderPath(directFolderId, folders) || projTasks[0]?.folderName || projTasks[0]?.projectName || 'Thư mục')
                            : '';

                          const targetProj = isDirectFolderGroup
                            ? undefined
                            : projects.find(
                                (p) => p.name === groupKey || p.id === projTasks[0]?.projectId
                              );
                          const projFolderPath = targetProj
                            ? getFolderPath(targetProj.folderId || inferProjectFolderId(targetProj), folders)
                            : '';
                          const displayTitle = isDirectFolderGroup ? directFolderPath : groupKey;

                          return (
                            <div
                              key={groupKey}
                              className={idx > 0 ? 'border-t border-line pt-6 md:pt-8' : ''}
                            >
                              <div className="flex flex-col md:flex-row items-start gap-4 lg:gap-6">
                                {/* Mobile: 1 dòng duy nhất cho phần dự án / thư mục */}
                                <div className="flex md:hidden items-center justify-between w-full py-1.5 px-0.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (isDirectFolderGroup && directFolderId) {
                                        setFilterState((prev) => ({
                                          ...prev,
                                          folderId: prev.folderId === directFolderId ? 'all' : directFolderId,
                                          projectId: 'all',
                                        }));
                                      } else if (targetProj) {
                                        setFilterState((prev) => ({
                                          ...prev,
                                          projectId: prev.projectId === targetProj.id ? 'all' : targetProj.id,
                                        }));
                                      }
                                    }}
                                    className="group/title flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer"
                                    title={
                                      isDirectFolderGroup
                                        ? `Bấm để lọc theo thư mục: ${displayTitle}`
                                        : `Bấm để lọc công việc theo dự án: ${displayTitle}`
                                    }
                                  >
                                    <Folder className={`w-4 h-4 shrink-0 ${isDirectFolderGroup ? 'text-accent' : 'text-subdued group-hover/title:text-support'}`} />
                                    <span className="font-title text-[14px] font-semibold text-ink group-hover/title:text-support truncate">
                                      {displayTitle}
                                    </span>
                                    {isDirectFolderGroup && (
                                      <span className="text-[10px] font-ui text-accent bg-surface-accent-faint border border-line px-1.5 py-0.2 rounded-vds-md shrink-0 font-medium">
                                        Tinh chỉnh
                                      </span>
                                    )}
                                    {targetProj?.isStrategic && (
                                      <span className="text-warning text-xs shrink-0" title="Dự án chiến lược">⭐</span>
                                    )}
                                    {targetProj?.code && (
                                      <span className="font-num text-[10px] text-ink-lighter bg-surface-200 border border-line px-1.5 py-0.2 rounded-vds-md shrink-0 font-medium">
                                        {targetProj.code}
                                      </span>
                                    )}
                                    <span className="text-xs font-ui text-subdued shrink-0">
                                      ({projTasks.length})
                                    </span>
                                  </button>

                                  {targetProj && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenProjectDetail(targetProj.id);
                                      }}
                                      className="p-1 text-support hover:bg-surface-info rounded-vds-lg transition-colors shrink-0 flex items-center justify-center cursor-pointer ml-2"
                                      title={`Xem thông tin dự án ${displayTitle}`}
                                    >
                                      <span className="text-base font-bold leading-none">→</span>
                                    </button>
                                  )}
                                </div>

                                {/* Desktop: Cột trái Tên dự án / Thư mục pin theo khi cuộn */}
                                <div className="hidden md:block w-48 lg:w-52 shrink-0 md:sticky md:top-28 self-start pt-1">
                                  <div className="p-2 -ml-2 rounded-vds-lg hover:bg-black/[0.03] transition-colors">
                                    {/* Nhãn Thư mục cha của dự án */}
                                    {!isDirectFolderGroup && projFolderPath && (
                                      <div className="pl-6 mb-1">
                                        <span className="text-[10px] font-ui font-medium text-accent bg-surface-accent-faint px-1.5 py-0.5 rounded-vds-md border border-line inline-block truncate max-w-full">
                                          📁 {projFolderPath}
                                        </span>
                                      </div>
                                    )}

                                    {/* Vùng 1: Bấm vào tên dự án / thư mục sẽ lọc công việc */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (isDirectFolderGroup && directFolderId) {
                                          setFilterState((prev) => ({
                                            ...prev,
                                            folderId: prev.folderId === directFolderId ? 'all' : directFolderId,
                                            projectId: 'all',
                                          }));
                                        } else if (targetProj) {
                                          setFilterState((prev) => ({
                                            ...prev,
                                            projectId: prev.projectId === targetProj.id ? 'all' : targetProj.id,
                                          }));
                                        }
                                      }}
                                      className="group/title text-left cursor-pointer block w-full"
                                      title={
                                        isDirectFolderGroup
                                          ? `Bấm để lọc công việc theo thư mục: ${displayTitle}`
                                          : `Bấm để lọc công việc theo dự án: ${displayTitle}`
                                      }
                                    >
                                      <div className="flex items-start gap-2 min-w-0">
                                        <Folder className={`w-4 h-4 transition-colors shrink-0 mt-0.5 ${isDirectFolderGroup ? 'text-accent' : 'text-subdued group-hover/title:text-support'}`} />
                                        <div className="min-w-0 flex-1">
                                          <span className="font-title text-[14px] font-normal text-ink group-hover/title:text-support group-hover/title:underline underline-offset-2 transition-colors block leading-snug break-words">
                                            {displayTitle}
                                          </span>
                                        </div>
                                        {targetProj?.isStrategic && (
                                          <span className="text-warning text-xs shrink-0" title="Dự án chiến lược">⭐</span>
                                        )}
                                      </div>
                                      <div className="flex items-center flex-wrap gap-1.5 pl-6 text-xs font-ui mt-1.5">
                                        {isDirectFolderGroup ? (
                                          <span className="text-[10px] font-ui text-accent bg-surface-accent-faint border border-line px-1.5 py-0.5 rounded-vds-md font-medium">
                                            Trực tiếp trong folder
                                          </span>
                                        ) : targetProj?.code ? (
                                          <span className="font-num text-[10px] text-ink-lighter bg-surface-200 border border-line px-1.5 py-0.5 rounded-vds-md font-medium">
                                            {targetProj.code}
                                          </span>
                                        ) : null}
                                        <span className="text-xs font-ui text-subdued">
                                          {projTasks.length} việc
                                        </span>
                                      </div>
                                    </button>

                                    {/* Vùng 2: Bấm vào Thông tin dự án sẽ hiển thị thông tin ở Right Sidebar */}
                                    {targetProj && (
                                      <div className="pl-6 pt-1.5">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenProjectDetail(targetProj.id);
                                          }}
                                          className="group/info text-xs font-ui text-support hover:text-support hover:underline underline-offset-2 inline-flex items-center gap-1 cursor-pointer transition-colors"
                                          title={`Bấm để xem thông tin dự án ${displayTitle} ở Right Sidebar`}
                                        >
                                          <span>Thông tin dự án</span>
                                          <span className="group-hover/info:translate-x-0.5 transition-transform">→</span>
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Cột phải: 800px Card công việc trình bày như cũ (card trắng bo tròn 12px, viền e0e0e0, divide-y f0f0f0) */}
                                <div className="w-full max-w-[800px]">
                                  <div className="bg-surface rounded-vds-lg border border-line overflow-hidden">
                                    {projTasks.map((task) => renderTaskRow(task))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        }
                      )}
                    </div>
                  ) : (
                    // Single project list
                    <div>
                      {(() => {
                        const curProj = projects.find((p) => p.id === filterState.projectId);
                        const curProjFolderPath = curProj
                          ? getFolderPath(curProj.folderId || inferProjectFolderId(curProj), folders)
                          : '';
                        return (
                          <div className="flex flex-col md:flex-row items-start gap-4 lg:gap-6">
                            {/* Mobile: 1 dòng duy nhất cho dự án đơn lẻ */}
                            {curProj && (
                              <div className="flex md:hidden items-center justify-between w-full py-1.5 px-0.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFilterState((prev) => ({ ...prev, projectId: 'all' }));
                                  }}
                                  className="group/title flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer"
                                  title={`Đang lọc: ${curProj.name}. Bấm để xem tất cả dự án`}
                                >
                                  <Folder className="w-4 h-4 text-support shrink-0" />
                                  <span className="font-title text-[14px] font-semibold text-support truncate">
                                    {curProj.name}
                                  </span>
                                  {curProj.code && (
                                    <span className="font-num text-[10px] text-ink-lighter bg-surface-200 border border-line px-1.5 py-0.2 rounded-vds-md shrink-0 font-medium">
                                      {curProj.code}
                                    </span>
                                  )}
                                  <span className="text-xs font-ui text-subdued shrink-0">
                                    ({activeTasks.length})
                                  </span>
                                  <span className="text-[10px] font-ui text-accent shrink-0 font-medium">
                                    ✕ Bỏ lọc
                                  </span>
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenProjectDetail(curProj.id);
                                  }}
                                  className="p-1 text-support hover:bg-surface-info rounded-vds-lg transition-colors shrink-0 flex items-center justify-center cursor-pointer ml-2"
                                  title={`Xem thông tin dự án ${curProj.name}`}
                                >
                                  <span className="text-base font-bold leading-none">→</span>
                                </button>
                              </div>
                            )}

                            {/* Desktop: Cột trái Tên dự án pin theo khi cuộn */}
                            <div className="hidden md:block w-48 lg:w-52 shrink-0 md:sticky md:top-28 self-start pt-1">
                              {curProj ? (
                                <div className="p-2 -ml-2 rounded-vds-lg hover:bg-black/[0.03] transition-colors">
                                  {curProjFolderPath && (
                                    <div className="pl-6 mb-1">
                                      <span className="text-[10px] font-ui font-medium text-accent bg-surface-accent-faint px-1.5 py-0.5 rounded-vds-md border border-line inline-block truncate max-w-full">
                                        📁 {curProjFolderPath}
                                      </span>
                                    </div>
                                  )}
                                  {/* Vùng 1: Bấm vào tên dự án sẽ bỏ lọc dự án (xem tất cả) */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setFilterState((prev) => ({ ...prev, projectId: 'all' }));
                                    }}
                                    className="group/title text-left cursor-pointer block w-full"
                                    title={`Đang lọc dự án: ${curProj.name}. Bấm để xem tất cả dự án`}
                                  >
                                    <div className="flex items-start gap-2 min-w-0">
                                      <Folder className="w-4 h-4 text-support transition-colors shrink-0 mt-0.5" />
                                      <div className="min-w-0 flex-1">
                                        <span className="font-title text-[14px] font-normal text-support group-hover/title:underline underline-offset-2 transition-colors block leading-snug break-words">
                                          {curProj.name}
                                        </span>
                                      </div>
                                      {curProj.isStrategic && (
                                        <span className="text-warning text-xs shrink-0" title="Dự án chiến lược">⭐</span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1.5 pl-6 text-xs font-ui mt-1.5">
                                      {curProj.code && (
                                        <span className="font-num text-[10px] text-ink-lighter bg-surface-200 border border-line px-1.5 py-0.5 rounded-vds-md font-medium">
                                          {curProj.code}
                                        </span>
                                      )}
                                      <span className="text-xs font-ui text-subdued">
                                        {activeTasks.length} việc
                                      </span>
                                      <span className="text-[10px] font-ui text-accent ml-auto group-hover/title:underline">
                                        ✕ Bỏ lọc
                                      </span>
                                    </div>
                                  </button>

                                  {/* Vùng 2: Bấm vào Thông tin dự án sẽ hiển thị thông tin ở Right Sidebar */}
                                  <div className="pl-6 pt-1.5">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenProjectDetail(curProj.id);
                                      }}
                                      className="group/info text-xs font-ui text-support hover:text-support hover:underline underline-offset-2 inline-flex items-center gap-1 cursor-pointer transition-colors"
                                      title={`Bấm để xem thông tin dự án ${curProj.name} ở Right Sidebar`}
                                    >
                                      <span>Thông tin dự án</span>
                                      <span className="group-hover/info:translate-x-0.5 transition-transform">→</span>
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-xs font-ui text-subdued p-2">Dự án</div>
                              )}
                            </div>

                            {/* Cột phải: 800px Card công việc trình bày như cũ */}
                            <div className="w-full max-w-[800px]">
                              <div className="bg-surface rounded-vds-lg border border-line overflow-hidden">
                                {sortTasksByUrgency(activeTasks).map((task) => renderTaskRow(task))}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Đã hoàn thành: thu gọn mặc định */}
                  {completedTasks.length > 0 && (
                    <div className="flex flex-col md:flex-row items-start gap-2 md:gap-4 lg:gap-6 pt-2">
                      <div className="hidden md:block w-48 lg:w-52 shrink-0" />
                      <div className="w-full max-w-[800px]">
                        <button
                          type="button"
                          onClick={() => setShowCompleted((v) => !v)}
                          aria-expanded={showCompleted}
                          className="w-full flex items-center gap-2 px-1 py-2 text-left cursor-pointer group/done"
                        >
                          <ChevronRight
                            className={`w-4 h-4 text-subdued-lighter transition-transform ${showCompleted ? 'rotate-90' : ''}`}
                          />
                          <CheckCircle2 className="w-4 h-4 text-positive" />
                          <span className="font-title text-[14px] font-semibold text-ink-lighter group-hover/done:text-ink">
                            Đã hoàn thành
                          </span>
                          <span className="text-[12px] font-num text-subdued-lighter">{completedTasks.length}</span>
                        </button>
                        <AnimatePresence initial={false}>
                          {showCompleted && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                              className="overflow-hidden"
                            >
                              <div className="bg-surface rounded-vds-lg border border-line overflow-hidden mt-1">
                                {completedTasks.slice(0, completedLimit).map((task) => renderTaskRow(task, true))}
                              </div>
                              {completedTasks.length > completedLimit && (
                                <button
                                  type="button"
                                  onClick={() => setCompletedLimit((n) => n + 30)}
                                  className="mt-2 w-full h-9 rounded-vds-lg text-[13px] font-ui font-semibold text-ink-lighter hover:bg-surface hover:text-ink border border-transparent hover:border-line cursor-pointer"
                                >
                                  Xem thêm {Math.min(30, completedTasks.length - completedLimit)} việc
                                </button>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  )}
                </div>
              )}

          {/* VIEW 2: PROJECTS MANAGEMENT */}
          {activeTab === 'projects' && (
            <ProjectsManager
              projects={projects}
              folders={folders}
              tasks={tasks}
              members={members}
              filterState={filterState}
              onAddProject={handleAddProject}
              onUpdateProject={handleUpdateProject}
              onDeleteProject={handleDeleteProject}
              onSelectProjectFilter={(projId) => {
                setFilterState((f) => ({ ...f, projectId: projId, folderId: 'all' }));
                setActiveTab('tasks');
              }}
              activeProductMember={activeProductMember}
              currentAuthUser={currentAuthUser}
              onOpenProjectDetail={handleOpenProjectDetail}
              onOpenAddProject={handleOpenAddProject}
              onOpenFolderManager={() => setIsFolderManagerOpen(true)}
            />
          )}

          {/* VIEW 3: MEMBERS MANAGEMENT */}
          {activeTab === 'members' && (
            <MembersManager
              members={members}
              tasks={tasks}
              projects={projects}
              filterState={filterState}
              onAddMember={handleAddMember}
              onUpdateMember={handleUpdateMember}
              onDeleteMember={handleDeleteMember}
              isCreateOpen={isAddMemberOpen}
              onCloseCreate={() => setIsAddMemberOpen(false)}
              activeProductMember={activeProductMember}
              currentAuthUser={currentAuthUser}
              onSelectProductMember={handleSelectProductMember}
              onSendAdminBroadcast={handleSendAdminBroadcast}
            />
          )}

              {/* VIEW 4: TRASH MANAGEMENT */}
              {activeTab === 'trash' && (
                <ErrorBoundary fallbackTitle="Không thể tải giao diện Thùng rác">
                  <TrashManager
                    trash={trash}
                    activeProductMember={activeProductMember}
                    currentAuthUser={currentAuthUser}
                    onRestoreItem={handleRestoreTrashItem}
                    onEmptyTrash={handleEmptyTrash}
                    onPermanentDeleteItem={handlePermanentDeleteItem}
                  />
                </ErrorBoundary>
              )}

              {/* VIEW 5: SETTINGS MANAGEMENT (ADMIN ONLY) */}
              {activeTab === 'settings' && (
                <ErrorBoundary fallbackTitle="Không thể tải giao diện Thiết lập">
                  <SettingsManager
                    members={members}
                    tasks={tasks}
                    projects={projects}
                    currentAuthUser={currentAuthUser}
                    onAddTask={handleAddTask}
                    onUpdateMember={handleUpdateMember}
                    onSendNotification={(notif) => {
                      setNotifications((prev) => deduplicateNotifications([notif, ...prev]));
                      wmsDataService.saveNotification(notif).catch(() => {});
                      dispatchNotificationWebPush(notif);
                    }}
                  />
                </ErrorBoundary>
              )}

              {/* VIEW 6: REPORTS (ALL PRODUCT STAFF) */}
              {activeTab === 'reports' && (
                <ErrorBoundary fallbackTitle="Không thể tải giao diện Báo cáo">
                  <AdminReportView
                    tasks={tasks}
                    projects={projects}
                    members={members}
                    activeProductMember={activeProductMember}
                    selectedProjectId={filterState.projectId}
                    selectedTeam={filterState.team}
                    onOpenTaskDetail={(task) => {
                      setSelectedTask(task);
                      setIsDrawerOpen(true);
                    }}
                    onSelectProject={(projId) => {
                      setFilterState((f) => ({ ...f, projectId: projId }));
                      setActiveTab('tasks');
                    }}
                    onOpenDateInTasks={(dateStr) => {
                      setFilterState((f) => ({ ...f, dueFilter: 'custom', customDueDate: dateStr }));
                      setActiveTab('tasks');
                    }}
                  />
                </ErrorBoundary>
              )}
              {/* VIEW 7: HIỆU QUẢ TEAM (CHỈ TÀI KHOẢN tienngoc) */}
              {activeTab === 'performance' && canViewPerformance && (
                <ErrorBoundary fallbackTitle="Không thể tải giao diện Hiệu quả team">
                  <TeamPerformanceView
                    tasks={tasks}
                    projects={projects}
                    members={members}
                    onOpenTaskDetail={(task) => {
                      setSelectedTask(task);
                      setIsDrawerOpen(true);
                    }}
                  />
                </ErrorBoundary>
              )}
            </motion.div>
          </AnimatePresence>
          </Suspense>
        </main>
      </div>

      {/* Task Details Drawer */}
      <TaskDetailDrawer
        task={selectedTask}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        projects={projects}
        folders={folders}
        members={members}
        onSaveTask={handleSaveTask}
        onDeleteTask={handleDeleteTask}
        activeProductMember={activeProductMember}
        currentAuthUser={currentAuthUser}
        onOpenProjectDetail={handleOpenProjectDetail}
        onFilterByAssignee={handleFilterByAssignee}
      />

      {/* Project Details Drawer (Accessible from any view, including Tasks page) */}
      {hasOpenedProjectDrawer && (
      <Suspense fallback={null}>
      <ProjectDetailsDrawer
        project={selectedProjectForDrawer}
        projects={projects}
        folders={folders}
        tasks={tasks}
        members={members}
        isOpen={isProjectDrawerOpen}
        isCreateMode={isCreateProjectDrawer}
        onClose={() => {
          setIsProjectDrawerOpen(false);
          setIsCreateProjectDrawer(false);
        }}
        onSaveProject={handleUpdateProject}
        onCreateProject={handleAddProject}
        onSelectProjectTasks={(projectId) => {
          setFilterState((f) => ({ ...f, projectId, folderId: 'all' }));
          setActiveTab('tasks');
          setIsProjectDrawerOpen(false);
        }}
        activeProductMember={activeProductMember}
        currentAuthUser={currentAuthUser}
        onOpenFolderManager={() => setIsFolderManagerOpen(true)}
      />
      </Suspense>
      )}

      {/* Right Sidebar Personal Notifications Drawer */}
      <NotificationDrawer
        isOpen={isNotificationDrawerOpen}
        onClose={() => setIsNotificationDrawerOpen(false)}
        notifications={userNotifications}
        allNotifications={notifications}
        currentUser={currentViewingUser}
        onSelectNotification={handleSelectNotification}
        onMarkAllAsRead={handleMarkAllNotificationsAsRead}
        onDeleteNotification={handleDeleteNotification}
        onSendTestNotification={handleSendTestNotification}
        onOpenAdminBroadcast={
          getUserRole(currentAuthUser || activeProductMember) === 'Admin'
            ? () => setIsAdminBroadcastModalOpen(true)
            : undefined
        }
      />

      {/* Standup Report Modal */}
      <StandupModal
        isOpen={isStandupOpen}
        onClose={() => setIsStandupOpen(false)}
        tasks={tasks}
      />

      {/* Profile & Password Management Modal */}
      {currentAuthUser && (
        <ProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          member={currentAuthUser}
          initialTab={profileModalInitialTab}
        />
      )}

      {/* Floating Real-time In-App Notification Toast Container */}
      <NotificationToastContainer
        onOpenTask={(taskId) => {
          const t = tasks.find((item) => item.id === taskId);
          if (t) setSelectedTask(t);
        }}
      />

      {/* Modal bắt buộc nhập Link hoàn thành khi đánh dấu hoàn thành */}
      {taskToCompleteModal && (
        <CompleteTaskModal
          task={taskToCompleteModal}
          isOpen={Boolean(taskToCompleteModal)}
          onClose={() => setTaskToCompleteModal(null)}
          onConfirm={handleConfirmCompleteWithLink}
        />
      )}

      {/* Modal bắt buộc đổi mật khẩu khi đăng nhập bằng mật khẩu mặc định */}
      {forceChangePasswordUser && (
        <ForceChangePasswordModal
          isOpen={Boolean(forceChangePasswordUser)}
          member={forceChangePasswordUser}
          onSuccess={() => {
            setForceChangePasswordUser(null);
          }}
          onLogout={() => {
            setForceChangePasswordUser(null);
            handleLogout();
          }}
        />
      )}

      {/* Modal Admin gửi thông điệp Quản trị trực tiếp từ Notification Drawer */}
      {isAdminBroadcastModalOpen && (currentAuthUser || activeProductMember) && (
        <AdminSendMessageModal
          isOpen={isAdminBroadcastModalOpen}
          members={members}
          currentUser={currentAuthUser || activeProductMember!}
          onClose={() => setIsAdminBroadcastModalOpen(false)}
          onSend={async (notifs) => {
            await handleSendAdminBroadcast(notifs);
          }}
        />
      )}

      {/* Thanh điều hướng đáy (mobile) */}
      <MobileTabBar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 0 });
        }}
        onQuickAdd={() => setIsMobileQuickAddOpen(true)}
        onOpenMenu={() => setIsMobileSidebarOpen(true)}
        taskBadge={quickViewCounts.overdue}
      />

      <UndoToast toast={undoToast} onDismiss={dismissUndoToast} />
      <NextTaskSuggestions
        state={nextSuggest}
        currentUserName={currentAuthUser?.name}
        onAdd={handleAddSuggestedTask}
        onDismiss={dismissNextSuggest}
        onTurnOffToday={() => {
          turnSuggestOffToday();
          setNextSuggest(null);
        }}
      />

      {/* Bảng lệnh & tìm kiếm nhanh (⌘K) */}
      <CommandPalette
        isOpen={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
        commands={paletteCommands}
        tasks={tasks}
        projects={projects}
        members={getProductMembers(members)}
        currentUser={currentAuthUser}
        onOpenTask={openTaskDetail}
        onFilterProject={(projectId) => {
          setActiveTab('tasks');
          setFilterState((f) => ({ ...f, projectId, folderId: 'all' }));
        }}
        onFilterMember={(m) => {
          setActiveTab('tasks');
          handleSelectProductMember(m);
        }}
      />

      {/* Dedicated Mobile Quick Add Sheet Drawer */}
      <MobileQuickAddDrawer
        isOpen={isMobileQuickAddOpen}
        onClose={() => setIsMobileQuickAddOpen(false)}
        projects={projects}
        folders={folders}
        tasks={tasks}
        members={members}
        onAddTask={handleAddTaskWithSuggestions}
        defaultProjectId={filterState.projectId !== 'all' ? filterState.projectId : undefined}
        defaultFolderId={filterState.folderId && filterState.folderId !== 'all' ? filterState.folderId : undefined}
        defaultAssignee={activeProductMember?.name || currentAuthUser?.name}
        currentUser={currentAuthUser || activeProductMember}
      />

      {/* Modal Quản lý Cây Thư mục (VnExpress -> Thể thao, Thế giới..., Ngôi sao, English, Tia sáng) */}
      <FolderManagerModal
        isOpen={isFolderManagerOpen}
        onClose={() => setIsFolderManagerOpen(false)}
        folders={folders}
        projects={projects}
        tasks={tasks}
        onUpdateFolders={(nextFolders, deletedId) => {
          setFolders(nextFolders);
          saveFoldersToStorage(nextFolders);
          wmsDataService.saveFolders(nextFolders).catch(() => {});
          if (deletedId) {
            wmsDataService.deleteFolderFromDb(deletedId).catch(() => {});
            if (filterState.folderId === deletedId) {
              setFilterState((f) => ({ ...f, folderId: 'all' }));
            }
          }
        }}
      />
    </div>
  );
}

export default App;
