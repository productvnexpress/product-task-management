/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { formatDateWithEnDay, getInitials } from '../utils/formatters';
import { getTeamColor } from '../utils/colors';
import { User, KeyRound, LogOut, ChevronDown, Bell, Search, DarkTheme } from './vds/icons';
import { MemberItem, TaskItem, ProjectItem, ActiveTab, TeamType, TaskPersonalScope } from '../types';
import { AccountSwitcher } from './AccountSwitcher';
import { useThemePref } from '../utils/theme';
import { getUserRole, getRoleDisplayInfo } from '../utils/rbac';

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
  onToggleSidebar?: () => void;
  onOpenSearch?: () => void;
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
  onToggleSidebar,
  onOpenSearch,
}) => {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [themePref, setThemePref] = useThemePref();
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
    <header className="bg-surface border-b border-line px-4 md:px-6 py-3.5 md:py-4">
      <div className="flex items-center justify-between gap-3 max-w-[1040px] w-full mx-auto">
        {/* Left: Mobile Menu Toggle + Title & timestamp */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2 md:gap-3 flex-wrap">
              <h2 className="font-title text-xl md:text-2xl font-bold text-ink tracking-tight truncate">
                {activeTabTitle}
              </h2>
              {isDbConnected === true && (
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-ui font-semibold bg-surface-positive text-positive border border-line shrink-0" title="Đang kết nối trực tiếp với Supabase Database (Realtime)">
                  <span className="w-1.5 h-1.5 rounded-full bg-positive-solid animate-pulse" />
                  <span className="hidden sm:inline">Supabase Live</span>
                  <span className="sm:hidden">Live</span>
                </span>
              )}
              {isDbConnected === false && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-ui font-semibold bg-surface-warning text-warning border border-line shrink-0" title="Không thể kết nối Supabase, đang dùng bộ nhớ tạm LocalStorage">
                  <span className="w-1.5 h-1.5 rounded-full bg-warning-solid" />
                  <span className="hidden sm:inline">Offline Cache</span>
                  <span className="sm:hidden">Offline</span>
                </span>
              )}
              {isDbConnected === null && (
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-ui font-semibold bg-surface-100 text-subdued border border-line shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-icon-subdued animate-ping" />
                  <span className="hidden sm:inline">Đang kết nối...</span>
                </span>
              )}
            </div>
            <p className="font-ui text-xs text-subdued truncate">
              {formatDateWithEnDay(currentDate)}
            </p>
          </div>
        </div>

        {/* Right actions: User Profile Menu + CTA button tailored to active tab */}
        <div className="flex items-center gap-2 shrink-0">
          {onOpenSearch && (
            <button
              type="button"
              onClick={onOpenSearch}
              className="h-9 w-9 lg:w-auto lg:pl-2.5 lg:pr-2 rounded-vds-lg bg-surface border border-line hover:border-line-accent text-ink-lighter hover:text-accent flex items-center justify-center lg:justify-start gap-2 cursor-pointer transition-colors"
              aria-label="Tìm kiếm và lệnh nhanh"
              title="Tìm kiếm (⌘K hoặc /)"
            >
              <Search className="w-4 h-4" />
              <span className="hidden lg:inline text-xs font-ui text-subdued-lighter w-28 text-left">Tìm nhanh…</span>
              <span className="hidden lg:inline-flex kbd">⌘K</span>
            </button>
          )}

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
              className="relative h-9 w-9 rounded-vds-lg bg-surface border border-line hover:border-line-accent hover:bg-surface-100 transition flex items-center justify-center cursor-pointer text-ink-lighter hover:text-accent"
              title={`Thông báo cá nhân ${unreadNotificationsCount > 0 ? `(${unreadNotificationsCount} chưa đọc)` : ''}`}
            >
              <Bell className="w-4 h-4" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-negative-solid text-on-color text-[10px] font-num font-bold ring-2 ring-surface ">
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
                className="h-9 px-1.5 sm:px-3 rounded-vds-lg bg-surface border border-line hover:border-line-accent transition-colors flex items-center gap-2 cursor-pointer hover:bg-surface-100"
                title="Tài khoản & Quản lý mật khẩu"
              >
                <div
                  className={`w-6 h-6 rounded-full ${userTeamCol?.bg || 'bg-accent-solid'} text-on-color flex items-center justify-center text-[10px] font-bold shrink-0 `}
                >
                  {getInitials(userToShow.name)}
                </div>
                <div className="text-left hidden md:flex items-center gap-1.5">
                  <span className="text-xs font-ui font-bold text-ink max-w-[120px] truncate">
                    {userToShow.name}
                  </span>
                  <span className="font-mono text-[10px] text-accent font-semibold">
                    @{userToShow.username || userToShow.id}
                  </span>
                </div>
                <ChevronDown
                  className={`hidden sm:block w-3.5 h-3.5 text-subdued transition-transform shrink-0 ${
                    isProfileMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Dropdown Menu */}
              {isProfileMenuOpen && (
                <div className="absolute right-0 mt-1.5 w-64 bg-surface rounded-vds-lg border border-line shadow-sheet z-50 overflow-hidden py-1 animate-fade-in font-body">
                  {/* User info banner */}
                  <div className="px-3.5 py-2.5 border-b border-divider bg-surface-100">
                    <p className="text-xs font-title font-bold text-ink truncate">
                      {userToShow.name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className="font-mono text-[10px] text-accent font-bold">
                        @{userToShow.username || userToShow.id}
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${roleInfo.badgeClass}`}>
                        {roleInfo.shortLabel}
                      </span>
                      <span className="text-[10px] text-subdued">• {userToShow.team}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <button
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      onOpenProfile?.('profile');
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs text-ink-lighter hover:bg-surface-100 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <User className="w-3.5 h-3.5 text-subdued" />
                    <span>Hồ sơ cá nhân</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      onOpenProfile?.('password');
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs text-ink-lighter hover:bg-surface-100 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-subdued" />
                    <span>Đổi mật khẩu</span>
                  </button>

                  <div className="border-t border-divider my-1" />

                  <div className="px-3.5 py-2 flex items-center gap-2">
                    <DarkTheme className="w-3.5 h-3.5 text-subdued shrink-0" />
                    <span className="text-xs text-ink-lighter flex-1">Giao diện</span>
                    <div role="radiogroup" aria-label="Giao diện" className="flex items-center gap-0.5 p-0.5 rounded-vds-md bg-surface-200">
                      {(
                        [
                          { id: 'light', label: 'Sáng' },
                          { id: 'dark', label: 'Tối' },
                          { id: 'system', label: 'Tự động' },
                        ] as const
                      ).map((o) => (
                        <button
                          key={o.id}
                          type="button"
                          role="radio"
                          aria-checked={themePref === o.id}
                          onClick={() => setThemePref(o.id)}
                          className={`h-6 px-2 rounded-vds-md text-[10px] font-ui font-bold cursor-pointer transition-colors ${
                            themePref === o.id ? 'bg-surface text-accent' : 'text-subdued hover:text-ink'
                          }`}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-divider my-1" />

                  {onLogout && (
                    <button
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full px-3.5 py-2 text-left text-xs text-negative hover:bg-surface-negative flex items-center gap-2 transition-colors cursor-pointer font-bold"
                    >
                      <LogOut className="w-3.5 h-3.5 text-negative" />
                      <span>Đăng xuất</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </header>
  );
};


