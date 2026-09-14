/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
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
} from './types';
import { INITIAL_PROJECTS, INITIAL_MEMBERS, INITIAL_TASKS } from './data/initialData';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { ActiveFiltersBar } from './components/ActiveFiltersBar';
import { QuickAddBar } from './components/QuickAddBar';
import { TaskItemRow } from './components/TaskItemRow';
import { TaskDetailDrawer } from './components/TaskDetailDrawer';
import { ProjectDetailsDrawer } from './components/ProjectDetailsDrawer';
import { NotificationDrawer } from './components/NotificationDrawer';
import { NotificationToastContainer } from './components/NotificationToastContainer';
import { WebPushPromptBanner } from './components/WebPushPromptBanner';
import { ProjectsManager } from './components/ProjectsManager';
import { MembersManager } from './components/MembersManager';
import { TrashManager } from './components/TrashManager';
import { SettingsManager } from './components/SettingsManager';
import { AdminReportView } from './components/AdminReportView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { StandupModal } from './components/StandupModal';
import { LoginView } from './components/LoginView';
import { ProfileModal } from './components/ProfileModal';
import { getCurrentAuthUser, logout, syncPasswordsFromSupabase } from './utils/authService';
import { ReminderPanel } from './components/ReminderPanel';
import { DailyCompletionAlert } from './components/DailyCompletionAlert';
import { DailyLeaveNotice, useProductLeaves } from './components/DailyLeaveNotice';
import { UpcomingHolidayBanner } from './components/UpcomingHolidayBanner';
import { CompleteTaskModal } from './components/CompleteTaskModal';
import { workingTimeService } from './services/workingTimeService';
import { parseCurrentRoute, updateBrowserUrl, ParsedRoute } from './utils/urlRouting';
import { PersonalizationBanner, TaskPersonalScope } from './components/PersonalizationBanner';
import { isTaskForMember, isTaskInMemberProjects, getMemberProjectRelation, isSamePersonName } from './utils/memberPersonalization';
import { isTaskOverdue, isTaskDueToday, isTaskDueSoon, getTodayDateString, normalizeDateString } from './utils/dateUtils';
import { recordTaskChanges, createCreationLog } from './utils/taskLogUtils';
import { wmsDataService } from './services/wmsDataService';
import { getUserRole, canPermanentDeleteTrash, canEmptyTrash } from './utils/rbac';
import { normalizeProjectStatus } from './utils/projectSortingUtils';
import {
  initWebPushListener,
  dispatchNotificationWebPush,
  showWebPushNotification,
  isWebPushEnabledByUser,
} from './utils/webPushNotifications';
import { Filter, CheckSquare, Plus, AlertTriangle, Layers, Globe, Star, Briefcase, Folder, CheckCircle2 } from 'lucide-react';

export function App() {
  // Current time state
  const [currentDate] = useState(new Date());

  // Database Connection State (Supabase Live / Offline Cache)
  const [isDbConnected, setIsDbConnected] = useState<boolean | null>(null);

  // Main persistence states
  const [projects, setProjects] = useState<ProjectItem[]>(() => {
    const saved = localStorage.getItem('vne_projects_v9');
    const rawList: ProjectItem[] = saved ? JSON.parse(saved) : INITIAL_PROJECTS;
    return rawList.map((p) => ({
      ...p,
      status: normalizeProjectStatus(p.status),
    }));
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
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);

  // Active view tab state (Friendly URL synchronized)
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    return parseCurrentRoute().tab;
  });

  // Pending deep link route waiting for data (tasks / projects) to load
  const [pendingRoute, setPendingRoute] = useState<ParsedRoute | null>(() => parseCurrentRoute());

// Helper to determine default perspective by RBAC role:
// 1. Admin: Toàn bộ phận
// 2. Manager: Dự án của tôi
// 3. Executive: Của tôi
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

  // Authentication state for Product group
  const [currentAuthUser, setCurrentAuthUser] = useState<MemberItem | null>(() => {
    return getCurrentAuthUser(members);
  });

  // Profile & Change Password Modal state
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileModalInitialTab, setProfileModalInitialTab] = useState<'profile' | 'password'>('profile');

  // Modal bắt buộc nhập Link hoàn thành
  const [taskToCompleteModal, setTaskToCompleteModal] = useState<TaskItem | null>(null);

  const handleOpenProfile = (tab: 'profile' | 'password' = 'profile') => {
    setProfileModalInitialTab(tab);
    setIsProfileModalOpen(true);
  };

  const handleLoginSuccess = (user: MemberItem) => {
    setCurrentAuthUser(user);
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

  const handleLogout = () => {
    logout();
    setCurrentAuthUser(null);
    setActiveProductMember(null);
    setFilterState((prev) => ({
      ...prev,
      assignee: 'Tất cả',
    }));
    localStorage.removeItem('vne_active_product_member_id');
  };

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

  // Filter states
  const [filterState, setFilterState] = useState<FilterState>(() => {
    const user = getCurrentAuthUser(members);
    const def = getDefaultPerspectiveForUser(user);
    return {
      projectId: 'all',
      team: 'Tất cả',
      status: 'Tất cả',
      assignee: def.assignee,
      dueFilter: 'all',
      searchQuery: '',
    };
  });

  // Drawer & Modal states
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isStandupOpen, setIsStandupOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [selectedProjectIdForDrawer, setSelectedProjectIdForDrawer] = useState<string | null>(null);
  const [isProjectDrawerOpen, setIsProjectDrawerOpen] = useState(false);
  const [isCreateProjectDrawer, setIsCreateProjectDrawer] = useState(false);

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
  useEffect(() => {
    let isMounted = true;

    const loadSupabaseData = async () => {
      try {
        // Đồng bộ mật khẩu người dùng
        syncPasswordsFromSupabase();

        const [mems, projs, tsks, trsh, notifs] = await Promise.all([
          wmsDataService.fetchMembers(),
          wmsDataService.fetchProjects(),
          wmsDataService.fetchTasks(),
          wmsDataService.fetchTrash(),
          wmsDataService.fetchNotifications(),
          workingTimeService.initFromSupabase().catch((e) => {
            console.warn('[workingTimeService] Supabase init warning:', e);
            return null;
          }),
        ]);

        if (!isMounted) return;

        if (mems && mems.length > 0) setMembers(mems);
        if (projs && projs.length > 0) {
          setProjects(projs.map((p) => ({ ...p, status: normalizeProjectStatus(p.status) })));
        }
        if (tsks) setTasks(tsks);
        if (trsh) setTrash(trsh);
        if (notifs) setNotifications(notifs);

        setIsDbConnected(true);
        console.log(
          `%c[Supabase WMS] ✅ Đã kết nối Live Database: ${tsks?.length || 0} công việc, ${projs?.length || 0} dự án, ${mems?.length || 0} nhân sự.`,
          'color: #059669; font-weight: bold;'
        );
      } catch (err) {
        setIsDbConnected(false);
        console.warn('[Supabase WMS] ⚠️ Đang chạy ở chế độ offline / local cache:', err);
      }
    };

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
          if (freshNotifs) setNotifications(freshNotifs);
        } catch (e) {}
      },
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

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

  // Notifications filtering for active account
  const currentUserName = currentAuthUser?.name || activeProductMember?.name;
  const userNotifications = useMemo(() => {
    if (!currentUserName) return [];
    return notifications.filter((n) => n.recipientName === currentUserName);
  }, [notifications, currentUserName]);

  const unreadNotificationsCount = useMemo(() => {
    return userNotifications.filter((n) => !n.isRead).length;
  }, [userNotifications]);

  // Helper dispatching targeted notifications based on project roles
  const createAndDispatchNotifications = (
    newOrUpdatedTask: TaskItem,
    actionType: 'created' | 'status_changed' | 'reassigned',
    actorName: string,
    extra?: { oldAssignee?: string; oldStatus?: string; note?: string }
  ) => {
    const proj = projects.find(
      (p) => p.id === newOrUpdatedTask.projectId || p.name === newOrUpdatedTask.projectName
    );
    const projectName = proj?.name || newOrUpdatedTask.projectName || 'Dự án';
    const pms = proj?.roles?.pm || (proj?.leadName ? proj.leadName.split(',').map((s) => s.trim()) : []);

    const newNotifs: NotificationItem[] = [];

    if (actionType === 'created') {
      // 1. Executive tạo task trong dự án -> Bắn thông báo cho Product Manager phụ trách dự án đó
      pms.forEach((pmName) => {
        if (pmName && pmName !== actorName) {
          newNotifs.push({
            id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
            recipientName: pmName,
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
      if (newOrUpdatedTask.assignee && newOrUpdatedTask.assignee !== actorName) {
        newNotifs.push({
          id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          recipientName: newOrUpdatedTask.assignee,
          actorName,
          projectId: proj?.id,
          projectName,
          taskId: newOrUpdatedTask.id,
          taskTitle: newOrUpdatedTask.title,
          type: 'task_assigned',
          title: `Bạn được giao việc trong ${projectName.replace('Dự án ', '')}`,
          content: `${actorName} đã giao cho bạn: "${newOrUpdatedTask.title}"`,
          isRead: false,
          createdAt: new Date().toISOString(),
        });
      }
    } else if (actionType === 'status_changed') {
      if (newOrUpdatedTask.status === 'Hoàn thành') {
        const recipients = new Set([...pms, newOrUpdatedTask.createdBy || '']);
        recipients.forEach((recip) => {
          if (recip && recip !== actorName) {
            newNotifs.push({
              id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
              recipientName: recip,
              actorName,
              projectId: proj?.id,
              projectName,
              taskId: newOrUpdatedTask.id,
              taskTitle: newOrUpdatedTask.title,
              type: 'task_completed',
              title: `Hoàn thành việc trong ${projectName.replace('Dự án ', '')}`,
              content: `${actorName} đã hoàn thành công việc "${newOrUpdatedTask.title}"`,
              isRead: false,
              createdAt: new Date().toISOString(),
            });
          }
        });
      } else if (newOrUpdatedTask.status === 'Bị nghẽn') {
        pms.forEach((pmName) => {
          if (pmName && pmName !== actorName) {
            newNotifs.push({
              id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
              recipientName: pmName,
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
      }
    } else if (actionType === 'reassigned') {
      if (newOrUpdatedTask.assignee && newOrUpdatedTask.assignee !== actorName) {
        newNotifs.push({
          id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          recipientName: newOrUpdatedTask.assignee,
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
    }

    if (newNotifs.length > 0) {
      setNotifications((prev) => [...newNotifs, ...prev]);
      newNotifs.forEach((n) => {
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
  };

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
      }
    }
  };

  const handleMarkAllNotificationsAsRead = () => {
    if (!currentUserName) return;
    setNotifications((prev) =>
      prev.map((n) => (n.recipientName === currentUserName ? { ...n, isRead: true } : n))
    );
    wmsDataService.markAllNotificationsAsRead(currentUserName).catch(console.warn);
  };

  const handleDeleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // Task Operations
  const handleToggleComplete = (taskId: string, authorName?: string) => {
    const actor = authorName || currentAuthUser?.name || activeProductMember?.name;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Nếu đang chưa hoàn thành và muốn chuyển sang hoàn thành, nhưng CHƯA CÓ resultLink -> buộc nhập link
    if (task.status !== 'Hoàn thành' && !task.resultLink) {
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

    // Nếu chọn 'Hoàn thành' mà CHƯA CÓ resultLink -> buộc nhập link
    if (newStatus === 'Hoàn thành' && !task.resultLink) {
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
          return logged;
        }
        return t;
      })
    );
  };

  const handleConfirmCompleteWithLink = (taskId: string, resultLink: string) => {
    const actor = currentAuthUser?.name || activeProductMember?.name;
    const finalLink = resultLink.trim();
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
          return logged;
        }
        return t;
      })
    );
  };

  const handleAddTask = (
    newTaskData: {
      title: string;
      projectId: string;
      projectName: string;
      team: TeamType;
      assignee: string;
      dueDate: string;
      priority: PriorityLevel;
      details?: string;
    },
    authorName?: string
  ) => {
    const creator = authorName || currentAuthUser?.name || newTaskData.assignee;
    const rawTask: TaskItem = {
      id: 'task-' + Date.now(),
      title: newTaskData.title,
      projectId: newTaskData.projectId,
      projectName: newTaskData.projectName,
      team: newTaskData.team,
      assignee: newTaskData.assignee,
      status: 'Chưa làm',
      progress: 0,
      priority: newTaskData.priority,
      dueDate: newTaskData.dueDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      details: newTaskData.details || '',
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
          const logged = recordTaskChanges(t, taskWithCompletedAt, actor || updatedTask.assignee, customNote);
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
          return logged;
        }
        return t;
      })
    );
  };

  const handleDeleteTask = (taskId: string) => {
    const taskToDelete = tasks.find((t) => t.id === taskId);
    if (taskToDelete) {
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
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    if (selectedTask?.id === taskId) {
      setIsDrawerOpen(false);
      setSelectedTask(null);
    }
  };

  // Project Operations
  const handleAddProject = (newProjData: Omit<ProjectItem, 'id'>) => {
    const newProj: ProjectItem = {
      ...newProjData,
      id: 'proj-' + Date.now(),
      createdBy: currentAuthUser?.name || activeProductMember?.name,
    };
    setProjects((prev) => [...prev, newProj]);
    wmsDataService.saveProject(newProj, newProj.history?.[0]).catch((e) => console.error('Supabase error:', e));
  };

  const handleUpdateProject = (updatedProj: ProjectItem) => {
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
    wmsDataService.saveProject(updatedProj, updatedProj.history?.[0]).catch((e) => console.error('Supabase error:', e));
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

      // 5. Search Query
      if (filterState.searchQuery.trim()) {
        const q = filterState.searchQuery.toLowerCase();
        const matchTitle = (t.title || '').toLowerCase().includes(q);
        const matchAssignee = (t.assignee || '').toLowerCase().includes(q);
        const matchProject = (t.projectName || '').toLowerCase().includes(q);
        const matchDetails = (t.details || '').toLowerCase().includes(q);
        if (!matchTitle && !matchAssignee && !matchProject && !matchDetails) {
          return false;
        }
      }

      return true;
    });
  }, [tasks, filterState, projects, activeProductMember, taskPersonalScope]);

  // Active vs Completed Tasks separation
  const activeTasks = useMemo(
    () => filteredTasks.filter((t) => t.status !== 'Hoàn thành'),
    [filteredTasks]
  );
  const completedTasks = useMemo(
    () => filteredTasks.filter((t) => t.status === 'Hoàn thành'),
    [filteredTasks]
  );

  // Group active tasks by project if 'all' projects selected
  const activeTasksByProject = useMemo(() => {
    const groups: Record<string, TaskItem[]> = {};
    activeTasks.forEach((t) => {
      if (!groups[t.projectName]) {
        groups[t.projectName] = [];
      }
      groups[t.projectName].push(t);
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
  }, [tasks, activeProductMember, taskPersonalScope, projects, filterState.projectId, filterState.team, filterState.assignee]);

  // Today and Overdue counts for filters (dynamically scoped)
  const todayCount = useMemo(() => {
    return scopedTasksForDue.filter((t) => isTaskDueToday(t)).length;
  }, [scopedTasksForDue]);

  const overdueCount = useMemo(() => {
    return scopedTasksForDue.filter((t) => isTaskOverdue(t)).length;
  }, [scopedTasksForDue]);

  const activeTabTitles: Record<ActiveTab, string> = {
    tasks: 'Công việc',
    projects: 'Dự án',
    members: 'Nhân sự',
    trash: 'Thùng rác',
    settings: 'Thiết lập',
    reports: 'Báo cáo',
  };

  // If not authenticated, display LoginView
  if (!currentAuthUser) {
    return (
      <LoginView
        members={members}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#202020] flex flex-row antialiased font-body">
      {/* 1. LEFT SIDEBAR (Contains Logo, Navigation, & All Filters) */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        projects={projects}
        members={members}
        activeProductMember={activeProductMember}
        currentAuthUser={currentAuthUser}
        selectedProjectId={filterState.projectId}
        onSelectProject={(id) => setFilterState((f) => ({ ...f, projectId: id }))}
        selectedTeam={filterState.team}
        onSelectTeam={(team) => setFilterState((f) => ({ ...f, team }))}
        selectedStatus={filterState.status}
        onSelectStatus={(status) => setFilterState((f) => ({ ...f, status }))}
        selectedAssignee={filterState.assignee}
        onSelectAssignee={(assignee) => setFilterState((f) => ({ ...f, assignee }))}
        selectedDueFilter={filterState.dueFilter}
        onSelectDueFilter={(dueFilter) => setFilterState((f) => ({ ...f, dueFilter }))}
        todayCount={todayCount}
        overdueCount={overdueCount}
        searchQuery={filterState.searchQuery}
        onSearchChange={(q) => setFilterState((f) => ({ ...f, searchQuery: q }))}
        taskCountsByProject={taskCountsByProject}
        totalActiveTasks={taskStats.inProgress}
        trashCount={trash.length}
        blockedCount={taskStats.blocked}
        onOpenQuickAdd={() => {
          setActiveTab('tasks');
          setTimeout(() => {
            document.getElementById('quick-add-input')?.focus();
          }, 100);
        }}
        onOpenAddProject={handleOpenAddProject}
        onOpenAddMember={handleOpenAddMember}
        onResetData={handleResetData}
      />

      {/* 2. MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Header Bar */}
        <Header
          currentDate={currentDate}
          onOpenStandup={() => setIsStandupOpen(true)}
          onOpenQuickAdd={() => {
            setActiveTab('tasks');
            setTimeout(() => {
              document.getElementById('quick-add-input')?.focus();
            }, 100);
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
          taskPersonalScope={taskPersonalScope}
          activeProductMember={activeProductMember}
          onClearProject={() => setFilterState((f) => ({ ...f, projectId: 'all' }))}
          onClearAssignee={() => {
            setFilterState((f) => ({ ...f, assignee: 'Tất cả' }));
            if (activeProductMember) setActiveProductMember(null);
          }}
          onClearTeam={() => setFilterState((f) => ({ ...f, team: 'Tất cả' }))}
          onClearStatus={() => setFilterState((f) => ({ ...f, status: 'Tất cả' }))}
          onClearDue={() => setFilterState((f) => ({ ...f, dueFilter: 'all' }))}
          onClearSearch={() => setFilterState((f) => ({ ...f, searchQuery: '' }))}
          onClearPersonalScope={() => setTaskPersonalScope('all')}
          onClearAll={() => {
            setFilterState({
              projectId: 'all',
              team: 'Tất cả',
              status: 'Tất cả',
              assignee: 'Tất cả',
              dueFilter: 'all',
              searchQuery: '',
            });
            setActiveProductMember(null);
            setTaskPersonalScope('all');
          }}
        />

        {/* Main Body */}
        <main className="flex-1 px-4 md:px-6 py-6 md:py-8 w-full max-w-[1040px] mx-auto">
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
                      {/* Perspective Control Bar: Fast 1-click access to Toàn ban, Việc của tôi, Dự án của tôi */}
                      {!activeProductMember ? (
                        <div className="bg-white border border-[#e2e8f0] rounded-[10px] p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-ui font-bold text-[#64748b] flex items-center gap-1.5">
                              <Filter className="w-3.5 h-3.5 text-[#963861]" />
                              <span>Lọc:</span>
                            </span>

                            <button
                              type="button"
                              onClick={() => handleSelectProductMember(null)}
                              className="px-3 py-1.5 rounded-[6px] text-xs font-ui font-bold bg-[#1e293b] text-white shadow-2xs cursor-pointer flex items-center gap-1.5"
                            >
                              <Globe className="w-3.5 h-3.5" />
                              <span>Toàn bộ phận</span>
                            </button>

                            {currentAuthUser && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleSelectProductMember(currentAuthUser)}
                                  className="px-3 py-1.5 rounded-[6px] text-xs font-ui font-bold bg-[#fcf0f5] text-[#963861] hover:bg-[#fae6ee] border border-[#f3c2d4] transition-all cursor-pointer flex items-center gap-1.5"
                                  title="Lọc nhanh danh sách công việc do bạn phụ trách"
                                >
                                  <Star className="w-3.5 h-3.5 fill-current" />
                                  <span>Của tôi ({myActiveTasksCount})</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveProductMember(currentAuthUser);
                                    setFilterState((prev) => ({ ...prev, assignee: 'Tất cả' }));
                                    setTaskPersonalScope('my_projects_tasks');
                                  }}
                                  className="px-3 py-1.5 rounded-[6px] text-xs font-ui font-bold bg-[#eff6ff] text-[#1d4ed8] hover:bg-[#dbeafe] border border-[#bfdbfe] transition-all cursor-pointer flex items-center gap-1.5"
                                  title="Lọc các công việc nằm trong những dự án bạn tham gia"
                                >
                                  <Briefcase className="w-3.5 h-3.5" />
                                  <span>Dự án của tôi ({myProjectsCount})</span>
                                </button>
                              </>
                            )}
                          </div>

                          <div className="text-xs font-ui text-[#64748b] hidden sm:block">
                            <strong className="text-[#1e293b]">{tasks.length} công việc</strong>
                          </div>
                        </div>
                      ) : (
                        <PersonalizationBanner
                          member={activeProductMember}
                          currentAuthUser={currentAuthUser}
                          tasks={tasks}
                          projects={projects}
                          personalScope={taskPersonalScope}
                          onChangeScope={setTaskPersonalScope}
                          onClearMember={() => handleSelectProductMember(null)}
                          onSelectMyTasks={() => currentAuthUser && handleSelectProductMember(currentAuthUser)}
                        />
                      )}

                      {/* Subtle Web Push Personalized Prompt Banner */}
                      <WebPushPromptBanner
                        onOpenNotifications={() => setIsNotificationDrawerOpen(true)}
                      />

                      {/* Thông báo Kỳ nghỉ lễ sắp tới (trong vòng 5 ngày) - Tách riêng 1 dòng nổi bật, nhiều màu sắc */}
                      <UpcomingHolidayBanner customDays={5} />

                      {/* Khu vực Cảnh báo tiến độ ngày & Lịch nghỉ phép: Căn chỉnh cân đối tỷ lệ ngang và đồng bộ chiều cao items-stretch */}
                      {productLeavesData.hasAnyLeave ? (
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
                      ) : (
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
                      )}

                      {/* Reminder & Urge Control Panel */}
                      <ReminderPanel
                        tasks={scopedTasksForDue}
                        members={members}
                        activeDueFilter={filterState.dueFilter}
                        onSelectDueFilter={(dueFilter) => setFilterState((f) => ({ ...f, dueFilter }))}
                        onSelectTask={(task) => {
                          setSelectedTask(task);
                          setIsDrawerOpen(true);
                        }}
                      />

                      {/* Quick Add Form Box */}
                      <QuickAddBar
                        projects={projects}
                        tasks={tasks}
                        members={members}
                        onAddTask={handleAddTask}
                        defaultProjectId={
                          filterState.projectId !== 'all' ? filterState.projectId : undefined
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

                      {/* Active Tasks Section Header */}
                      <div className="flex flex-wrap items-center justify-between gap-3 px-1 pt-1">
                        <div className="flex items-center gap-2">
                          <CheckSquare className="w-5 h-5 text-[#963861]" />
                          <h3 className="font-title text-base font-normal text-[#202020]">
                            Công việc đang thực hiện ({activeTasks.length})
                          </h3>
                        </div>

                        {/* Active Filter Badges */}
                        <div className="flex flex-wrap items-center gap-2">
                          {filterState.projectId !== 'all' && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-ui bg-[#fcf0f5] text-[#b13460] px-3 py-1 rounded-full border border-[#f3c2d4] font-bold">
                              <button
                                type="button"
                                onClick={() => handleOpenProjectDetail(filterState.projectId)}
                                className="hover:underline flex items-center gap-1 cursor-pointer"
                                title="Bấm để xem chi tiết dự án này"
                              >
                                <span>Dự án: {projects.find((p) => p.id === filterState.projectId)?.name}</span>
                                <span className="text-[10px] text-[#b13460]">↗</span>
                              </button>
                              <button
                                onClick={() => setFilterState((f) => ({ ...f, projectId: 'all' }))}
                                className="hover:text-[#8f274c] text-[10px] ml-1"
                                title="Bỏ lọc theo dự án"
                              >
                                ✕
                              </button>
                            </span>
                          )}

                          {filterState.assignee && filterState.assignee !== 'Tất cả' && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-ui bg-[#f0f8f1] text-[#24a148] px-3 py-1 rounded-full border border-[#c3e6cb] font-bold">
                              <span>Nhân sự: {filterState.assignee}</span>
                              <button
                                onClick={() => setFilterState((f) => ({ ...f, assignee: 'Tất cả' }))}
                                className="hover:text-[#187230] text-[10px]"
                              >
                                ✕
                              </button>
                            </span>
                          )}

                          {filterState.team !== 'Tất cả' && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-ui bg-[#eef4fb] text-[#1d508d] px-3 py-1 rounded-full border border-[#c3d9f0] font-bold">
                              <span>Nhóm: {filterState.team}</span>
                              <button
                                onClick={() => setFilterState((f) => ({ ...f, team: 'Tất cả' }))}
                                className="hover:text-[#133763] text-[10px]"
                              >
                                ✕
                              </button>
                            </span>
                          )}

                          {filterState.status !== 'Tất cả' && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-ui bg-[#f4f4f4] text-[#202020] px-3 py-1 rounded-full border border-[#d6d6d6] font-bold">
                              <span>Trạng thái: {filterState.status}</span>
                              <button
                                onClick={() => setFilterState((f) => ({ ...f, status: 'Tất cả' }))}
                                className="hover:text-[#000000] text-[10px]"
                              >
                                ✕
                              </button>
                            </span>
                          )}

                          {filterState.dueFilter !== 'all' && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-ui bg-[#fff7ed] text-[#ea580c] px-3 py-1 rounded-full border border-[#fed7aa] font-bold">
                              <span>
                                Thời hạn:{' '}
                                {filterState.dueFilter === 'today'
                                  ? 'Hạn hôm nay'
                                  : filterState.dueFilter === 'overdue'
                                  ? 'Quá hạn'
                                  : 'Sắp đến hạn'}
                              </span>
                              <button
                                onClick={() => setFilterState((f) => ({ ...f, dueFilter: 'all' }))}
                                className="hover:text-[#c2410c] text-[10px]"
                              >
                                ✕
                              </button>
                            </span>
                          )}

                          {(filterState.projectId !== 'all' ||
                            filterState.assignee !== 'Tất cả' ||
                            filterState.team !== 'Tất cả' ||
                            filterState.status !== 'Tất cả' ||
                            filterState.dueFilter !== 'all' ||
                            filterState.searchQuery) && (
                            <button
                              onClick={() =>
                                setFilterState({
                                  projectId: 'all',
                                  team: 'Tất cả',
                                  status: 'Tất cả',
                                  assignee: 'Tất cả',
                                  dueFilter: 'all',
                                  searchQuery: '',
                                })
                              }
                              className="text-[11px] font-ui text-[#b13460] hover:underline px-1 font-bold"
                            >
                              Xóa tất cả bộ lọc
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Active Tasks Content */}
                  {activeTasks.length === 0 ? (
                    <div className="flex flex-col md:flex-row items-start gap-4 lg:gap-6">
                      <div className="hidden md:block w-48 lg:w-52 shrink-0" />
                      <div className="w-full max-w-[800px]">
                        <div className="bg-white rounded-[12px] border border-[#e0e0e0] shadow-2xs p-12 text-center space-y-3">
                          <div className="w-12 h-12 rounded-full bg-[#f4f4f4] text-[#7f7f7f] flex items-center justify-center mx-auto text-xl">
                            ✓
                          </div>
                          <p className="font-title text-base font-bold text-[#202020]">
                            Không có công việc nào trong danh sách
                          </p>
                          <p className="text-xs font-body text-[#7f7f7f] max-w-md mx-auto">
                            Hãy tạo công việc mới hoặc thử bỏ các bộ lọc trên thanh bên (sidebar).
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : filterState.projectId === 'all' ? (
                    // Grouped by Project Name: Project Name on Left (Pinned), 800px Tasks Card on Right
                    <div className="space-y-6 md:space-y-8">
                      {Object.entries(activeTasksByProject).map(
                        ([projName, projTasks], idx) => {
                          const targetProj = projects.find(
                            (p) => p.name === projName || p.id === projTasks[0]?.projectId
                          );
                          return (
                            <div
                              key={projName}
                              className={idx > 0 ? 'border-t border-[#e5e7eb] pt-6 md:pt-8' : ''}
                            >
                              <div className="flex flex-col md:flex-row items-start gap-4 lg:gap-6">
                                {/* Cột trái: Tên dự án nằm ngoài bên trái, pin theo khi cuộn */}
                                <div className="w-full md:w-48 lg:w-52 shrink-0 md:sticky md:top-24 self-start pt-1">
                                  <div className="p-2 -ml-2 rounded-[8px] hover:bg-black/[0.03] transition-colors">
                                    {/* Vùng 1: Bấm vào tên dự án sẽ lọc công việc theo dự án */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (targetProj) {
                                          setFilterState((prev) => ({
                                            ...prev,
                                            projectId: prev.projectId === targetProj.id ? 'all' : targetProj.id,
                                          }));
                                        }
                                      }}
                                      className="group/title text-left cursor-pointer block w-full"
                                      title={`Bấm để lọc công việc theo dự án: ${projName}`}
                                    >
                                      <div className="flex items-start gap-2 min-w-0">
                                        <Folder className="w-4 h-4 text-[#71717a] group-hover/title:text-[#1e609c] transition-colors shrink-0 mt-0.5" />
                                        <div className="min-w-0 flex-1">
                                          <span className="font-title text-[14px] font-normal text-[#202020] group-hover/title:text-[#1e609c] group-hover/title:underline underline-offset-2 transition-colors block leading-snug break-words">
                                            {projName}
                                          </span>
                                        </div>
                                        {targetProj?.isStrategic && (
                                          <span className="text-[#d97706] text-xs shrink-0" title="Dự án chiến lược">⭐</span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1.5 pl-6 text-xs font-ui mt-1.5">
                                        {targetProj?.code && (
                                          <span className="font-num text-[10px] text-[#475569] bg-[#f1f5f9] border border-[#cbd5e1] px-1.5 py-0.5 rounded-[4px] font-medium">
                                            {targetProj.code}
                                          </span>
                                        )}
                                        <span className="text-[11px] font-ui text-[#64748b]">
                                          {projTasks.length} việc
                                        </span>
                                      </div>
                                    </button>

                                    {/* Vùng 2: Bấm vào Thông tin dự án sẽ hiển thị thông tin ở Right Sidebar */}
                                    <div className="pl-6 pt-1.5">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (targetProj) {
                                            handleOpenProjectDetail(targetProj.id);
                                          }
                                        }}
                                        className="group/info text-[11px] font-ui text-[#1e609c] hover:text-[#154673] hover:underline underline-offset-2 inline-flex items-center gap-1 cursor-pointer transition-colors"
                                        title={`Bấm để xem thông tin dự án ${projName} ở Right Sidebar`}
                                      >
                                        <span>Thông tin dự án</span>
                                        <span className="group-hover/info:translate-x-0.5 transition-transform">→</span>
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                {/* Cột phải: 800px Card công việc trình bày như cũ (card trắng bo tròn 12px, viền e0e0e0, divide-y f0f0f0) */}
                                <div className="w-full max-w-[800px]">
                                  <div className="bg-white rounded-[12px] border border-[#e0e0e0] shadow-2xs divide-y divide-[#f0f0f0] overflow-hidden">
                                    {projTasks.map((task) => (
                                      <TaskItemRow
                                        key={task.id}
                                        task={task}
                                        members={members}
                                        projects={projects}
                                        currentAuthUser={currentAuthUser}
                                        isMyTask={currentAuthUser ? isTaskForMember(task, currentAuthUser) : false}
                                        onToggleComplete={handleToggleComplete}
                                        onSelectTask={(t) => {
                                          setSelectedTask(t);
                                          setIsDrawerOpen(true);
                                        }}
                                        onUpdateStatus={handleUpdateTaskStatus}
                                        onDeleteTask={handleDeleteTask}
                                        onOpenProjectDetail={handleOpenProjectDetail}
                                      />
                                    ))}
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
                        return (
                          <div className="flex flex-col md:flex-row items-start gap-4 lg:gap-6">
                            {/* Cột trái: Tên dự án nằm ngoài bên trái, pin theo khi cuộn */}
                            <div className="w-full md:w-48 lg:w-52 shrink-0 md:sticky md:top-24 self-start pt-1">
                              {curProj ? (
                                <div className="p-2 -ml-2 rounded-[8px] hover:bg-black/[0.03] transition-colors">
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
                                      <Folder className="w-4 h-4 text-[#1e609c] transition-colors shrink-0 mt-0.5" />
                                      <div className="min-w-0 flex-1">
                                        <span className="font-title text-[14px] font-normal text-[#1e609c] group-hover/title:underline underline-offset-2 transition-colors block leading-snug break-words">
                                          {curProj.name}
                                        </span>
                                      </div>
                                      {curProj.isStrategic && (
                                        <span className="text-[#d97706] text-xs shrink-0" title="Dự án chiến lược">⭐</span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1.5 pl-6 text-xs font-ui mt-1.5">
                                      {curProj.code && (
                                        <span className="font-num text-[10px] text-[#475569] bg-[#f1f5f9] border border-[#cbd5e1] px-1.5 py-0.5 rounded-[4px] font-medium">
                                          {curProj.code}
                                        </span>
                                      )}
                                      <span className="text-[11px] font-ui text-[#64748b]">
                                        {activeTasks.length} việc
                                      </span>
                                      <span className="text-[10px] font-ui text-[#963861] ml-auto group-hover/title:underline">
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
                                      className="group/info text-[11px] font-ui text-[#1e609c] hover:text-[#154673] hover:underline underline-offset-2 inline-flex items-center gap-1 cursor-pointer transition-colors"
                                      title={`Bấm để xem thông tin dự án ${curProj.name} ở Right Sidebar`}
                                    >
                                      <span>Thông tin dự án</span>
                                      <span className="group-hover/info:translate-x-0.5 transition-transform">→</span>
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-xs font-ui text-[#64748b] p-2">Dự án</div>
                              )}
                            </div>

                            {/* Cột phải: 800px Card công việc trình bày như cũ */}
                            <div className="w-full max-w-[800px]">
                              <div className="bg-white rounded-[12px] border border-[#e0e0e0] shadow-2xs divide-y divide-[#f0f0f0] overflow-hidden">
                                {activeTasks.map((task) => (
                                  <TaskItemRow
                                    key={task.id}
                                    task={task}
                                    members={members}
                                    projects={projects}
                                    currentAuthUser={currentAuthUser}
                                    isMyTask={currentAuthUser ? isTaskForMember(task, currentAuthUser) : false}
                                    onToggleComplete={handleToggleComplete}
                                    onSelectTask={(t) => {
                                      setSelectedTask(t);
                                      setIsDrawerOpen(true);
                                    }}
                                    onUpdateStatus={handleUpdateTaskStatus}
                                    onDeleteTask={handleDeleteTask}
                                    onOpenProjectDetail={handleOpenProjectDetail}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Completed Tasks Container */}
                  {completedTasks.length > 0 && (
                    <div className="border-t border-[#e5e7eb] pt-6 md:pt-8">
                      <div className="flex flex-col md:flex-row items-start gap-4 lg:gap-6">
                        {/* Left Column: Anchor (Pinned) */}
                        <div className="w-full md:w-48 lg:w-52 shrink-0 md:sticky md:top-24 self-start pt-1">
                          <div className="p-2 -ml-2 space-y-1">
                            <div className="flex items-center gap-2 text-[#24a148]">
                              <CheckCircle2 className="w-4 h-4 text-[#24a148] shrink-0" />
                              <span className="font-title text-[14px] font-normal text-[#24a148]">
                                Đã hoàn thành
                              </span>
                            </div>
                            <div className="pl-6 text-[11px] font-ui text-[#64748b]">
                              {completedTasks.length} việc
                            </div>
                          </div>
                        </div>

                        {/* Right Column: 800px Completed Tasks Card (như cũ) */}
                        <div className="w-full max-w-[800px]">
                          <div className="bg-white rounded-[12px] border border-[#e0e0e0] shadow-2xs divide-y divide-[#f0f0f0] overflow-hidden">
                            {completedTasks.map((task) => (
                              <TaskItemRow
                                key={task.id}
                                task={task}
                                members={members}
                                projects={projects}
                                currentAuthUser={currentAuthUser}
                                isMyTask={currentAuthUser ? isTaskForMember(task, currentAuthUser) : false}
                                onToggleComplete={handleToggleComplete}
                                onSelectTask={(t) => {
                                  setSelectedTask(t);
                                  setIsDrawerOpen(true);
                                }}
                                onUpdateStatus={handleUpdateTaskStatus}
                                onDeleteTask={handleDeleteTask}
                                onOpenProjectDetail={handleOpenProjectDetail}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

          {/* VIEW 2: PROJECTS MANAGEMENT */}
          {activeTab === 'projects' && (
            <ProjectsManager
              projects={projects}
              tasks={tasks}
              members={members}
              filterState={filterState}
              onAddProject={handleAddProject}
              onUpdateProject={handleUpdateProject}
              onDeleteProject={handleDeleteProject}
              onSelectProjectFilter={(projId) => {
                setFilterState((f) => ({ ...f, projectId: projId }));
                setActiveTab('tasks');
              }}
              activeProductMember={activeProductMember}
              currentAuthUser={currentAuthUser}
              onOpenProjectDetail={handleOpenProjectDetail}
              onOpenAddProject={handleOpenAddProject}
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
                  />
                </ErrorBoundary>
              )}

              {/* VIEW 6: ADMIN REPORTS (ADMIN ONLY) */}
              {activeTab === 'reports' && (
                <ErrorBoundary fallbackTitle="Không thể tải giao diện Báo cáo Quản trị">
                  {getUserRole(currentAuthUser) === 'Admin' ? (
                    <AdminReportView
                      tasks={tasks}
                      projects={projects}
                      members={members}
                      currentAuthUser={currentAuthUser}
                      onOpenTaskDetail={(task) => {
                        setSelectedTask(task);
                        setIsDrawerOpen(true);
                      }}
                      onSelectProject={(projId) => {
                        setFilterState((f) => ({ ...f, projectId: projId }));
                        setActiveTab('tasks');
                      }}
                    />
                  ) : (
                    <div className="p-12 text-center text-xs font-ui text-[#7f7f7f]">
                      Bạn không có quyền truy cập trang Báo cáo Quản trị. Vui lòng đăng nhập với tài khoản Admin.
                    </div>
                  )}
                </ErrorBoundary>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Task Details Drawer */}
      <TaskDetailDrawer
        task={selectedTask}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        projects={projects}
        members={members}
        onSaveTask={handleSaveTask}
        onDeleteTask={handleDeleteTask}
        activeProductMember={activeProductMember}
        currentAuthUser={currentAuthUser}
        onOpenProjectDetail={handleOpenProjectDetail}
      />

      {/* Project Details Drawer (Accessible from any view, including Tasks page) */}
      <ProjectDetailsDrawer
        project={selectedProjectForDrawer}
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
          setFilterState((f) => ({ ...f, projectId }));
          setActiveTab('tasks');
          setIsProjectDrawerOpen(false);
        }}
        activeProductMember={activeProductMember}
        currentAuthUser={currentAuthUser}
      />

      {/* Right Sidebar Personal Notifications Drawer */}
      <NotificationDrawer
        isOpen={isNotificationDrawerOpen}
        onClose={() => setIsNotificationDrawerOpen(false)}
        notifications={userNotifications}
        currentUser={currentAuthUser || activeProductMember}
        onSelectNotification={handleSelectNotification}
        onMarkAllAsRead={handleMarkAllNotificationsAsRead}
        onDeleteNotification={handleDeleteNotification}
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
    </div>
  );
}

export default App;
