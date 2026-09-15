/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
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

  const activeSourceList =
    isManagerOrAdmin && scope === 'department'
      ? (allNotifications && allNotifications.length > 0 ? allNotifications : notifications)
      : notifications;

  const unreadCount = activeSourceList.filter((n) => !n.isRead).length;

  const displayedNotifications = activeSourceList.filter((n) => {
    if (filterMode === 'unread') return !n.isRead;
    return true;
  });

  const renderTypeIcon = (type: NotificationType) => {
    switch (type) {
      case 'task_assigned':
        return (
          <div className="w-8 h-8 rounded-full bg-[#fdf2f7] text-[#963861] border border-[#f4c2d7] flex items-center justify-center shrink-0">
            <UserCheck className="w-4 h-4" />
          </div>
        );
      case 'task_created':
        return (
          <div className="w-8 h-8 rounded-full bg-[#eef4fb] text-[#1d508d] border border-[#c2d7f0] flex items-center justify-center shrink-0">
            <PlusCircle className="w-4 h-4" />
          </div>
        );
      case 'task_blocked':
        return (
          <div className="w-8 h-8 rounded-full bg-[#fef2f2] text-[#dc2626] border border-[#fecaca] flex items-center justify-center shrink-0 animate-pulse">
            <AlertTriangle className="w-4 h-4" />
          </div>
        );
      case 'task_completed':
        return (
          <div className="w-8 h-8 rounded-full bg-[#e2f6e9] text-[#24a148] border border-[#b8e8c4] flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        );
      case 'task_updated':
      default:
        return (
          <div className="w-8 h-8 rounded-full bg-[#f8fafc] text-[#475569] border border-[#e2e8f0] flex items-center justify-center shrink-0">
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
            className="relative z-10 bg-white w-full max-w-[440px] sm:max-w-[480px] h-full shadow-2xl flex flex-col border-l border-[#e5e7eb] overflow-hidden"
          >
            {/* Drawer Header */}
            <div className="px-5 py-4 bg-[#fafafa] border-b border-[#e5e7eb] flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-[6px] bg-[#fcf0f5] border border-[#f3c2d4] text-[#963861] flex items-center justify-center shrink-0">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-title text-base font-bold text-[#1e293b] flex items-center gap-2">
                    <span>Thông báo</span>
                    {unreadCount > 0 && (
                      <span className="text-[11px] font-num font-bold px-1.5 py-0.2 rounded-full bg-[#dc2626] text-white">
                        {unreadCount}
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] font-ui text-[#64748b]">
                    Cập nhật công việc và dự án
                  </p>
                </div>
              </div>

              {/* Close ESC Button */}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-[#64748b] hover:text-[#0f172a] hover:bg-[#f1f5f9] rounded-[6px] transition-colors cursor-pointer"
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
            <div className="px-5 py-2.5 bg-white border-b border-[#e5e7eb] flex flex-col gap-2 shrink-0">
              {/* Scope Switcher for Manager and Admin */}
              {isManagerOrAdmin && allNotifications && (
                <div className="flex items-center gap-1.5 p-1 bg-[#f8fafc] border border-[#e2e8f0] rounded-[6px]">
                  <button
                    type="button"
                    onClick={() => setScope('mine')}
                    className={`flex-1 py-1 text-xs font-ui font-semibold rounded-[4px] transition-all cursor-pointer ${
                      scope === 'mine'
                        ? 'bg-white text-[#963861] shadow-2xs'
                        : 'text-[#64748b] hover:text-[#1e293b]'
                    }`}
                  >
                    Việc của tôi ({notifications.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setScope('department')}
                    className={`flex-1 py-1 text-xs font-ui font-semibold rounded-[4px] transition-all cursor-pointer ${
                      scope === 'department'
                        ? 'bg-white text-[#963861] shadow-2xs'
                        : 'text-[#64748b] hover:text-[#1e293b]'
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
                    className={`px-2.5 py-1 rounded-[4px] font-semibold transition-colors cursor-pointer ${
                      filterMode === 'all'
                        ? 'bg-[#1e293b] text-white'
                        : 'text-[#64748b] hover:bg-[#f1f5f9]'
                    }`}
                  >
                    Tất cả ({activeSourceList.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode('unread')}
                    className={`px-2.5 py-1 rounded-[4px] font-semibold transition-colors cursor-pointer ${
                      filterMode === 'unread'
                        ? 'bg-[#1e293b] text-white'
                        : 'text-[#64748b] hover:bg-[#f1f5f9]'
                    }`}
                  >
                    Chưa đọc ({unreadCount})
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {onSendTestNotification && (
                    <button
                      type="button"
                      onClick={onSendTestNotification}
                      className="text-[11px] font-ui font-medium text-[#64748b] hover:text-[#963861] flex items-center gap-1 cursor-pointer transition-colors"
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
                      className="text-[11px] font-ui font-medium text-[#963861] hover:text-[#78234a] hover:underline flex items-center gap-1 cursor-pointer"
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
            <div className="flex-1 overflow-y-auto divide-y divide-[#f1f5f9]">
              {displayedNotifications.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-[#f8fafc] text-[#94a3b8] flex items-center justify-center mx-auto text-xl">
                    <Bell className="w-6 h-6 stroke-[1.5]" />
                  </div>
                  <p className="font-ui text-sm font-bold text-[#334155]">
                    {filterMode === 'unread' ? 'Không có thông báo chưa đọc' : 'Chưa có thông báo nào'}
                  </p>
                  <p className="text-xs font-body text-[#94a3b8] max-w-xs mx-auto leading-relaxed">
                    Khi các thành viên Executive tạo việc, hoàn thành hoặc cập nhật tiến độ, bạn sẽ nhận được thông báo tại đây.
                  </p>
                  {onSendTestNotification && (
                    <button
                      type="button"
                      onClick={onSendTestNotification}
                      className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#fcf0f5] hover:bg-[#fae1ed] text-[#963861] border border-[#f3c2d4] text-xs font-ui font-medium cursor-pointer transition-colors shadow-2xs"
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
                          ? 'bg-[#fdf9fb] hover:bg-[#fbf2f6]'
                          : 'bg-white hover:bg-[#f8fafc]'
                      }`}
                    >
                      {/* Unread Accent Dot */}
                      {!n.isRead && (
                        <span
                          className="absolute left-1.5 top-5 w-1.5 h-1.5 rounded-full bg-[#963861]"
                          title="Chưa đọc"
                        />
                      )}

                      {/* Icon */}
                      {renderTypeIcon(n.type)}

                      {/* Content */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1 text-[10px] font-ui font-semibold text-[#1d508d] bg-[#eef4fb] px-1.5 py-0.2 rounded border border-[#c2d7f0] truncate max-w-[200px]">
                            <FolderKanban className="w-2.5 h-2.5 shrink-0" />
                            <span className="truncate">{n.projectName.replace('Dự án ', '')}</span>
                          </span>

                          <span className="text-[10px] font-ui text-[#94a3b8] shrink-0">
                            {formatNotificationTime(n.createdAt)}
                          </span>
                        </div>

                        <h4 className="text-xs font-ui font-bold text-[#1e293b] group-hover:text-[#963861] transition-colors line-clamp-1">
                          {n.title}
                        </h4>

                        <p className="text-xs font-body text-[#475569] leading-snug line-clamp-2">
                          {n.content}
                        </p>

                        {/* Task Title if available */}
                        {n.taskTitle && (
                          <div className="pt-1 flex items-center gap-1 text-[11px] font-ui text-[#64748b]">
                            <span className="font-semibold text-[#334155]">Công việc:</span>
                            <span className="truncate text-[#0f172a]">{n.taskTitle}</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity text-[#963861] shrink-0 ml-auto" />
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
                          className="opacity-0 group-hover:opacity-100 p-1 text-[#94a3b8] hover:text-[#dc2626] rounded-[4px] hover:bg-white transition-all cursor-pointer shrink-0"
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
            <div className="p-3 bg-[#fafafa] border-t border-[#e5e7eb] text-center shrink-0">
              <span className="text-[11px] font-ui text-[#94a3b8]">
                Nhấp vào thông báo để mở chi tiết công việc tương ứng
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
