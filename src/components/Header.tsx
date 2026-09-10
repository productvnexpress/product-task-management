/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { formatDateWithEnDay, getInitials } from '../utils/formatters';
import { getTeamColor } from '../utils/colors';
import { Plus, User, KeyRound, LogOut, ChevronDown, Bell } from 'lucide-react';
import { MemberItem, TaskItem, ProjectItem, ActiveTab, TeamType, TaskPersonalScope } from '../types';
import { AccountSwitcher } from './AccountSwitcher';
import { canCreateProject, canCreateMember, getUserRole, getRoleDisplayInfo } from '../utils/rbac';

interface HeaderProps {
  currentDate: Date;
  onOpenQuickAdd: () => void;
  onOpenStandup?: () => void;
  onOpenAddProject?: () => void;
  onOpenAddMember?: () => void;
  taskStats: { total: number; completed: number; inProgress: number; blocked: number };
  activeTabTitle: string;
  activeTab: ActiveTab;
  members: MemberItem[];
  activeProductMember: MemberItem | null;
  onSelectProductMember: (member: MemberItem | null) => void;
  tasks: TaskItem[];
  projects: ProjectItem[];
  currentAuthUser?: MemberItem | null;
  onOpenProfile?: (tab?: 'profile' | 'password') => void;
  onLogout?: () => void;
  isDbConnected?: boolean | null;
  unreadNotificationsCount?: number;
  onOpenNotifications?: () => void;
  personalScope?: TaskPersonalScope;
  onChangeScope?: (scope: TaskPersonalScope, member?: MemberItem | null) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentDate,
  onOpenQuickAdd,
  onOpenAddProject,
  onOpenAddMember,
  activeTabTitle,
  activeTab,
  members,
  activeProductMember,
  onSelectProductMember,
  tasks,
  projects,
  currentAuthUser,
  onOpenProfile,
  onLogout,
  isDbConnected,
  unreadNotificationsCount = 0,
  onOpenNotifications,
  personalScope,
  onChangeScope,
}) => {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    if (isProfileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isProfileMenuOpen]);

  const userToShow = currentAuthUser || activeProductMember;
  const userRole = getUserRole(userToShow);
  const roleInfo = getRoleDisplayInfo(userRole);
  const userTeamCol = userToShow ? getTeamColor(userToShow.team) : null;
  return (
    <header className="bg-[#ffffff] border-b border-[#e0e0e0] px-4 md:px-6 py-4 sticky top-0 z-20 shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-4 max-w-[1040px] w-full mx-auto">
        {/* Left title & timestamp */}
        <div className="space-y-0.5">
          <div className="flex items-center gap-3">
            <h2 className="font-title text-2xl font-bold text-[#202020] tracking-tight">
              {activeTabTitle}
            </h2>
            {isDbConnected === true && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-ui font-semibold bg-[#ecfdf5] text-[#047857] border border-[#a7f3d0]" title="Đang kết nối trực tiếp với Supabase Database (Realtime)">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
                Supabase Live
              </span>
            )}
            {isDbConnected === false && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-ui font-semibold bg-[#fffbeb] text-[#b45309] border border-[#fde68a]" title="Không thể kết nối Supabase, đang dùng bộ nhớ tạm LocalStorage">
                <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
                Offline Cache
              </span>
            )}
            {isDbConnected === null && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-ui font-semibold bg-[#f8fafc] text-[#64748b] border border-[#e2e8f0]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#94a3b8] animate-ping" />
                Đang kết nối...
              </span>
            )}
          </div>
          <p className="font-ui text-xs text-[#7f7f7f]">
            {formatDateWithEnDay(currentDate)}
          </p>
        </div>

        {/* Right actions: User Profile Menu + CTA button tailored to active tab */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* 1. Perspective Selector: Toàn ban / Việc của tôi / Đồng nghiệp */}
          <AccountSwitcher
            members={members}
            activeMember={activeProductMember}
            onSelectMember={onSelectProductMember}
            currentAuthUser={currentAuthUser}
            tasks={tasks}
            projects={projects}
            personalScope={personalScope}
            onChangeScope={onChangeScope}
          />

          {/* Bell Notification Trigger Button */}
          {userToShow && (
            <button
              type="button"
              onClick={onOpenNotifications}
              className="relative h-9 w-9 rounded-[8px] bg-white border border-[#cbd5e1] hover:border-[#963861] hover:bg-[#fffbfd] transition-all flex items-center justify-center cursor-pointer shadow-2xs text-[#475569] hover:text-[#963861]"
              title={`Thông báo cá nhân ${unreadNotificationsCount > 0 ? `(${unreadNotificationsCount} chưa đọc)` : ''}`}
            >
              <Bell className="w-4 h-4" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-[#dc2626] text-white text-[9px] font-num font-bold ring-2 ring-white shadow-xs">
                  {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                </span>
              )}
            </button>
          )}

          {/* 2. User Profile Menu: Thông tin đăng nhập & Đổi mật khẩu */}
          {userToShow && (
            <div className="relative inline-block text-left" ref={profileMenuRef}>
              <button
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="h-9 px-2.5 sm:px-3 rounded-[8px] bg-white border border-[#cbd5e1] hover:border-[#963861] transition-all flex items-center gap-2 cursor-pointer shadow-2xs hover:bg-[#fffbfd]"
                title="Tài khoản & Quản lý mật khẩu"
              >
                <div
                  className={`w-6 h-6 rounded-full ${userTeamCol?.bg || 'bg-[#963861]'} text-white flex items-center justify-center text-[10px] font-bold shrink-0 shadow-xs`}
                >
                  {getInitials(userToShow.name)}
                </div>
                <div className="text-left hidden md:flex items-center gap-1.5">
                  <span className="text-xs font-ui font-bold text-[#1e293b] max-w-[120px] truncate">
                    {userToShow.name}
                  </span>
                  <span className="font-mono text-[10px] text-[#963861] font-semibold">
                    @{userToShow.username || userToShow.id}
                  </span>
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-[#64748b] transition-transform shrink-0 ${
                    isProfileMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Dropdown Menu */}
              {isProfileMenuOpen && (
                <div className="absolute right-0 mt-1.5 w-64 bg-white rounded-[10px] border border-[#e2e8f0] shadow-xl z-50 overflow-hidden py-1 animate-fade-in font-body">
                  {/* User info banner */}
                  <div className="px-3.5 py-2.5 border-b border-[#f1f5f9] bg-[#f8fafc]">
                    <p className="text-xs font-title font-bold text-[#1e293b] truncate">
                      {userToShow.name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className="font-mono text-[10px] text-[#963861] font-bold">
                        @{userToShow.username || userToShow.id}
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${roleInfo.badgeClass}`}>
                        {roleInfo.shortLabel}
                      </span>
                      <span className="text-[10px] text-[#64748b]">• {userToShow.team}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <button
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      onOpenProfile?.('profile');
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs text-[#334155] hover:bg-[#f8fafc] flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <User className="w-3.5 h-3.5 text-[#64748b]" />
                    <span>Hồ sơ cá nhân</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      onOpenProfile?.('password');
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs text-[#334155] hover:bg-[#f8fafc] flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-[#64748b]" />
                    <span>Đổi mật khẩu</span>
                  </button>

                  <div className="border-t border-[#f1f5f9] my-1" />

                  {onLogout && (
                    <button
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full px-3.5 py-2 text-left text-xs text-[#dc2626] hover:bg-[#fef2f2] flex items-center gap-2 transition-colors cursor-pointer font-bold"
                    >
                      <LogOut className="w-3.5 h-3.5 text-[#dc2626]" />
                      <span>Đăng xuất</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'projects' && canCreateProject(currentAuthUser) ? (
            <button
              onClick={onOpenAddProject}
              className="h-9 px-4 rounded-[8px] bg-[#b13460] hover:bg-[#8f274c] text-white font-ui text-xs font-bold flex items-center gap-2 transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo dự án mới</span>
            </button>
          ) : activeTab === 'members' && canCreateMember(currentAuthUser) ? (
            <button
              onClick={onOpenAddMember}
              className="h-9 px-4 rounded-[8px] bg-[#24a148] hover:bg-[#1d8239] text-white font-ui text-xs font-bold flex items-center gap-2 transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo nhân sự mới</span>
            </button>
          ) : (
            <button
              onClick={onOpenQuickAdd}
              className="h-9 px-4 rounded-[8px] bg-[#963861] hover:bg-[#832e52] text-white font-ui text-xs font-bold flex items-center gap-2 transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo việc mới</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};


