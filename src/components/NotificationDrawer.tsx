/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell,
  BellRing,
  X,
  CheckCheck,
  UserCheck,
  PlusCircle,
  AlertTriangle,
  CheckCircle2,
  FolderKanban,
  Clock,
  ExternalLink,
  Trash2,
  Send,
  Calendar,
  Flag,
  MessageSquare,
  AtSign,
  Megaphone,
} from './vds/icons';
import { formatDateWithEnDay } from '../utils/formatters';
import { NotificationItem, NotificationType, MemberItem } from '../types';
import { getUserRole } from '../utils/rbac';
import {
  getWebPushPermission,
  isWebPushEnabledByUser,
  setWebPushEnabledByUser,
  WebPushPermissionState,
} from '../utils/webPushNotifications';
import { PersonalizedWebPushCard } from './PersonalizedWebPushCard';
import { deduplicateNotifications } from '../utils/notificationDeduplication';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  allNotifications?: NotificationItem[];
  currentUser: MemberItem | null;
  onSelectNotification: (item: NotificationItem) => void;
  onMarkAllAsRead: () => void;
  onDeleteNotification?: (id: string) => void;
  onSendTestNotification?: () => void;
  onOpenAdminBroadcast?: () => void;
}

function formatNotificationTime(isoStr: string): string {
  try {
    const date = new Date(isoStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays === 1) {
      const h = String(date.getHours()).padStart(2, '0');
      const m = String(date.getMinutes()).padStart(2, '0');
      return `Hôm qua, ${h}:${m}`;
    }
    return formatDateWithEnDay(date, true);
  } catch (e) {
    return isoStr;
  }
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  allNotifications,
  currentUser,
  onSelectNotification,
  onMarkAllAsRead,
  onDeleteNotification,
  onSendTestNotification,
  onOpenAdminBroadcast,
}) => {
  const role = getUserRole(currentUser);
  const isManagerOrAdmin = role === 'Admin' || role === 'Manager';
  const [scope, setScope] = useState<'mine' | 'department'>('mine');
  const [filterMode, setFilterMode] = useState<'all' | 'unread'>('all');
  const [pushPermission, setPushPermission] = useState<WebPushPermissionState>('default');
  const [isPushEnabled, setIsPushEnabled] = useState<boolean>(true);

  useEffect(() => {
    if (isOpen) {
      setPushPermission(getWebPushPermission());
      setIsPushEnabled(isWebPushEnabledByUser());
    }
  }, [isOpen]);

  // Đóng khi bấm phím ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const activeSourceList = useMemo(() => {
    const raw =
      isManagerOrAdmin && scope === 'department'
        ? (allNotifications && allNotifications.length > 0 ? allNotifications : notifications)
        : notifications;
    return deduplicateNotifications(raw);
  }, [isManagerOrAdmin, scope, allNotifications, notifications]);

  const unreadCount = activeSourceList.filter((n) => !n.isRead).length;

  const displayedNotifications = activeSourceList.filter((n) => {
    if (filterMode === 'unread') return !n.isRead;
    return true;
  });

  const renderTypeIcon = (type: NotificationType) => {
    switch (type) {
      case 'task_assigned':
        return (
          <div className="w-8 h-8 rounded-full bg-surface-accent-faint text-accent border border-line flex items-center justify-center shrink-0">
            <UserCheck className="w-4 h-4" />
          </div>
        );
      case 'task_deadline_selected':
        return (
          <div className="w-8 h-8 rounded-full bg-surface-info text-info border border-line flex items-center justify-center shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
        );
      case 'task_comment':
        return (
          <div className="w-8 h-8 rounded-full bg-surface-accent-faint text-accent border border-line flex items-center justify-center shrink-0">
            <MessageSquare className="w-4 h-4" />
          </div>
        );
      case 'task_created':
        return (
          <div className="w-8 h-8 rounded-full bg-surface-support text-support border border-line flex items-center justify-center shrink-0">
            <PlusCircle className="w-4 h-4" />
          </div>
        );
      case 'task_blocked':
        return (
          <div className="w-8 h-8 rounded-full bg-surface-negative text-negative border border-line flex items-center justify-center shrink-0 animate-pulse">
            <AlertTriangle className="w-4 h-4" />
          </div>
        );
      case 'task_completed':
        return (
          <div className="w-8 h-8 rounded-full bg-surface-positive text-positive border border-line flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        );
      case 'phase_due_soon':
        return (
          <div className="w-8 h-8 rounded-full bg-surface-warning text-warning border border-line flex items-center justify-center shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
        );
      case 'project_due_soon':
        return (
          <div className="w-8 h-8 rounded-full bg-surface-negative text-negative border border-line flex items-center justify-center shrink-0 animate-pulse">
            <Flag className="w-4 h-4" />
          </div>
        );
      case 'daily_close_reminder':
        return (
          <div className="w-8 h-8 rounded-full bg-surface-accent-faint text-accent border border-line flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4" />
          </div>
        );
      case 'daily_task_reminder':
        return (
          <div className="w-8 h-8 rounded-full bg-surface-accent-faint text-accent border border-line flex items-center justify-center shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
        );
      case 'admin_broadcast':
        return (
          <div className="w-8 h-8 rounded-full bg-surface-200 text-extreme border border-line flex items-center justify-center shrink-0">
            <Megaphone className="w-4 h-4" />
          </div>
        );
      case 'task_updated':
      default:
        return (
          <div className="w-8 h-8 rounded-full bg-surface-100 text-ink-lighter border border-line flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4" />
          </div>
        );
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* Backdrop mờ */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-2xs transition-opacity cursor-pointer"
          />

          {/* Right Sidebar Drawer Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300, mass: 0.8 }}
            className="relative z-10 bg-surface w-full max-w-[440px] sm:max-w-[480px] h-full shadow-sheet flex flex-col border-l border-line overflow-hidden"
          >
            {/* Drawer Header */}
            <div className="px-5 py-4 bg-surface-100 border-b border-line flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-vds-lg bg-surface-accent-faint border border-line text-accent flex items-center justify-center shrink-0">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-title text-base font-bold text-ink flex items-center gap-2">
                    <span>Thông báo</span>
                    {unreadCount > 0 && (
                      <span className="text-xs font-num font-bold px-1.5 py-0.2 rounded-full bg-negative-solid text-on-color">
                        {unreadCount}
                      </span>
                    )}
                  </h3>
                  <p className="text-xs font-ui text-subdued">
                    Cập nhật công việc và dự án
                  </p>
                </div>
              </div>

              {/* Close ESC Button */}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-subdued hover:text-ink hover:bg-surface-200 rounded-vds-lg transition-colors cursor-pointer"
                title="Đóng (Phím ESC)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Personalized Web Push Notification Card */}
            {pushPermission !== 'unsupported' && (
              <PersonalizedWebPushCard
                permission={pushPermission}
                isEnabled={isPushEnabled}
                onPermissionChange={setPushPermission}
                onToggleEnabled={(enabled) => {
                  setWebPushEnabledByUser(enabled);
                  setIsPushEnabled(enabled);
                }}
              />
            )}

            {/* Filter Tabs & Quick Action Bar */}
            <div className="px-5 py-2.5 bg-surface border-b border-line flex flex-col gap-2 shrink-0">
              {/* Scope Switcher for Manager and Admin */}
              {isManagerOrAdmin && allNotifications && (
                <div className="flex items-center gap-1.5 p-1 bg-surface-100 border border-line rounded-vds-lg">
                  <button
                    type="button"
                    onClick={() => setScope('mine')}
                    className={`flex-1 py-1 text-xs font-ui font-semibold rounded-vds-md transition cursor-pointer ${
                      scope === 'mine'
                        ? 'bg-surface text-accent '
                        : 'text-subdued hover:text-ink'
                    }`}
                  >
                    Việc của tôi ({notifications.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setScope('department')}
                    className={`flex-1 py-1 text-xs font-ui font-semibold rounded-vds-md transition cursor-pointer ${
                      scope === 'department'
                        ? 'bg-surface text-accent '
                        : 'text-subdued hover:text-ink'
                    }`}
                  >
                    Toàn bộ phận ({allNotifications.length})
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-ui">
                  <button
                    type="button"
                    onClick={() => setFilterMode('all')}
                    className={`px-2.5 py-1 rounded-vds-md font-semibold transition-colors cursor-pointer ${
                      filterMode === 'all'
                        ? 'bg-surface-selected text-accent ring-1 ring-inset ring-line-accent-soft'
                        : 'text-subdued hover:bg-surface-200'
                    }`}
                  >
                    Tất cả ({activeSourceList.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode('unread')}
                    className={`px-2.5 py-1 rounded-vds-md font-semibold transition-colors cursor-pointer ${
                      filterMode === 'unread'
                        ? 'bg-surface-selected text-accent ring-1 ring-inset ring-line-accent-soft'
                        : 'text-subdued hover:bg-surface-200'
                    }`}
                  >
                    Chưa đọc ({unreadCount})
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {role === 'Admin' && onOpenAdminBroadcast && (
                    <button
                      type="button"
                      onClick={onOpenAdminBroadcast}
                      className="text-xs font-ui font-bold text-extreme bg-surface-200 hover:bg-surface-200 px-2 py-0.5 rounded-vds-md flex items-center gap-1 cursor-pointer transition-colors"
                      title="Admin gửi thông điệp riêng cho một hoặc nhiều nhân sự"
                    >
                      <Megaphone className="w-3 h-3" />
                      <span className="hidden sm:inline">Gửi thông điệp</span>
                    </button>
                  )}

                  {onSendTestNotification && (
                    <button
                      type="button"
                      onClick={onSendTestNotification}
                      className="text-xs font-ui font-medium text-subdued hover:text-accent flex items-center gap-1 cursor-pointer transition-colors"
                      title="Gửi 1 thông báo thử nghiệm để kiểm tra kênh nhận"
                    >
                      <Send className="w-3 h-3" />
                      <span className="hidden sm:inline">Thử chuông</span>
                    </button>
                  )}

                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={onMarkAllAsRead}
                      className="text-xs font-ui font-medium text-accent hover:text-accent hover:underline flex items-center gap-1 cursor-pointer"
                      title="Đánh dấu tất cả đã đọc"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>Đã đọc</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Notifications List Body */}
            <div className="flex-1 overflow-y-auto divide-y divide-divider">
              {displayedNotifications.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-surface-100 text-subdued-lighter flex items-center justify-center mx-auto text-xl">
                    <Bell className="w-6 h-6 stroke-[1.5]" />
                  </div>
                  <p className="font-ui text-sm font-bold text-ink-lighter">
                    {filterMode === 'unread' ? 'Không có thông báo chưa đọc' : 'Chưa có thông báo nào'}
                  </p>
                  <p className="text-xs font-body text-subdued-lighter max-w-xs mx-auto leading-relaxed">
                    Khi các thành viên Executive tạo việc, hoàn thành hoặc cập nhật tiến độ, bạn sẽ nhận được thông báo tại đây.
                  </p>
                  {onSendTestNotification && (
                    <button
                      type="button"
                      onClick={onSendTestNotification}
                      className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-vds-lg bg-surface-accent-faint hover:bg-surface-accent text-accent border border-line text-xs font-ui font-medium cursor-pointer transition-colors "
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Gửi thông báo thử nghiệm</span>
                    </button>
                  )}
                </div>
              ) : (
                displayedNotifications.map((n) => {
                  return (
                    <div
                      key={n.id}
                      onClick={() => onSelectNotification(n)}
                      className={`p-4 transition-colors flex items-start gap-3 group cursor-pointer relative ${
                        !n.isRead
                          ? 'bg-surface-100 hover:bg-surface-accent-faint'
                          : 'bg-surface hover:bg-surface-100'
                      }`}
                    >
                      {/* Unread Accent Dot */}
                      {!n.isRead && (
                        <span
                          className="absolute left-1.5 top-5 w-1.5 h-1.5 rounded-full bg-accent-solid"
                          title="Chưa đọc"
                        />
                      )}

                      {/* Icon */}
                      {renderTypeIcon(n.type)}

                      {/* Content */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1 text-[10px] font-ui font-semibold text-support bg-surface-support px-1.5 py-0.2 rounded border border-line truncate max-w-[200px]">
                            <FolderKanban className="w-2.5 h-2.5 shrink-0" />
                            <span className="truncate">{n.projectName.replace('Dự án ', '')}</span>
                          </span>

                          <span className="text-[10px] font-ui text-subdued-lighter shrink-0">
                            {formatNotificationTime(n.createdAt)}
                          </span>
                        </div>

                        <h4 className="text-xs font-ui font-bold text-ink group-hover:text-accent transition-colors line-clamp-1">
                          {n.title}
                        </h4>

                        <p className="text-xs font-body text-ink-lighter leading-snug line-clamp-2">
                          {n.content}
                        </p>

                        {/* Task Title if available */}
                        {n.taskTitle && (
                          <div className="pt-1 flex items-center gap-1 text-xs font-ui text-subdued">
                            <span className="font-semibold text-ink-lighter">Công việc:</span>
                            <span className="truncate text-ink">{n.taskTitle}</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity text-accent shrink-0 ml-auto" />
                          </div>
                        )}
                      </div>

                      {/* Quick Delete action button on hover */}
                      {onDeleteNotification && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteNotification(n.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-subdued-lighter hover:text-negative rounded-vds-md hover:bg-surface transition cursor-pointer shrink-0"
                          title="Xóa thông báo này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Information */}
            <div className="p-3 bg-surface-100 border-t border-line text-center shrink-0">
              <span className="text-xs font-ui text-subdued-lighter">
                Nhấp vào thông báo để mở chi tiết công việc tương ứng
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
