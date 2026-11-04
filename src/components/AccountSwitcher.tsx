/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { MemberItem, TaskItem, ProjectItem, TeamType, TaskPersonalScope } from '../types';
import { getProductMembers, isTaskForMember, getMemberProjectRelation } from '../utils/memberPersonalization';
import {
  Users,
  Check,
  ChevronDown,
  Search,
  Sparkles,
  X,
  Globe,
  Star,
  User,
  Briefcase,
} from './vds/icons';

interface AccountSwitcherProps {
  members: MemberItem[];
  activeMember: MemberItem | null;
  onSelectMember: (member: MemberItem | null) => void;
  currentAuthUser?: MemberItem | null;
  tasks?: TaskItem[];
  projects?: ProjectItem[];
  compact?: boolean;
  personalScope?: TaskPersonalScope;
  onChangeScope?: (scope: TaskPersonalScope, member?: MemberItem | null) => void;
}

const getTeamColor = (team: TeamType) => {
  switch (team) {
    case 'Product Manager':
      return { bg: 'bg-accent-solid', lightBg: 'bg-surface-accent-faint', text: 'text-accent', border: 'border-line' };
    case 'UX/UI Designer':
      return { bg: 'bg-support-solid', lightBg: 'bg-surface-info', text: 'text-info', border: 'border-line' };
    case 'SEO':
      return { bg: 'bg-extreme-solid', lightBg: 'bg-surface-100', text: 'text-extreme', border: 'border-line' };
    case 'Data':
      return { bg: 'bg-positive-solid', lightBg: 'bg-surface-positive', text: 'text-positive', border: 'border-line' };
    default:
      return { bg: 'bg-icon-strong', lightBg: 'bg-surface-200', text: 'text-ink-lighter', border: 'border-line' };
  }
};

const getInitials = (fullName: string) => {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const AccountSwitcher: React.FC<AccountSwitcherProps> = ({
  members,
  activeMember,
  onSelectMember,
  currentAuthUser,
  tasks = [],
  projects = [],
  personalScope = 'all',
  onChangeScope,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const productMembers = useMemo(() => {
    const list = [...getProductMembers(members)];
    return list.sort((a, b) => {
      const getLastName = (m: MemberItem) => {
        if (m.firstName) return m.firstName;
        const parts = m.name.trim().split(/\s+/);
        return parts[parts.length - 1] || m.name;
      };
      const nameA = getLastName(a);
      const nameB = getLastName(b);
      const cmp = nameA.localeCompare(nameB, 'vi');
      if (cmp !== 0) return cmp;
      return a.name.localeCompare(b.name, 'vi');
    });
  }, [members]);

  // Member task counts mapping
  const memberTaskCounts = useMemo(() => {
    const map: Record<string, number> = {};
    productMembers.forEach((mem) => {
      map[mem.id] = tasks.filter(
        (t) => isTaskForMember(t, mem) && t.status !== 'Hoàn thành'
      ).length;
    });
    return map;
  }, [productMembers, tasks]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const isViewingAll = !activeMember || personalScope === 'all';
  const isViewingMyTasks =
    activeMember && currentAuthUser && activeMember.id === currentAuthUser.id && personalScope === 'my_tasks';
  const isViewingMyProjects =
    activeMember && currentAuthUser && activeMember.id === currentAuthUser.id && personalScope === 'my_projects_tasks';
  const isViewingColleague =
    activeMember && (!currentAuthUser || activeMember.id !== currentAuthUser.id);

  const myProjectsCount = useMemo(() => {
    if (!currentAuthUser) return 0;
    return projects.filter((p) => getMemberProjectRelation(p, currentAuthUser, tasks).isRelated).length;
  }, [projects, currentAuthUser, tasks]);

  const filteredMembers = useMemo(() => {
    return productMembers.filter((m) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        (m.name || '').toLowerCase().includes(q) ||
        (m.title || '').toLowerCase().includes(q) ||
        (m.team || '').toLowerCase().includes(q) ||
        (m.username || '').toLowerCase().includes(q) ||
        (m.ipPhone || '').includes(q)
      );
    });
  }, [productMembers, search]);

  const activeColor = activeMember ? getTeamColor(activeMember.team) : null;
  const myTasksCount = currentAuthUser ? (memberTaskCounts[currentAuthUser.id] || 0) : 0;
  const totalActiveTasksCount = useMemo(
    () => tasks.filter((t) => t.status !== 'Hoàn thành').length,
    [tasks]
  );

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`h-9 px-3 rounded-vds-lg border transition flex items-center gap-2 cursor-pointer ${
          isViewingAll
            ? 'bg-surface border-line text-ink hover:border-line-accent hover:bg-surface-100'
            : isViewingMyTasks
            ? 'bg-surface-accent-faint border-line text-accent hover:border-line-accent hover:bg-surface-accent'
            : isViewingMyProjects
            ? 'bg-surface-info border-line text-info hover:border-line-info hover:bg-surface-info'
            : 'bg-surface-info border-line text-support hover:border-line-info'
        }`}
        title="Chuyển đổi góc nhìn: Toàn bộ phận / Của tôi / Dự án của tôi / Xem theo đồng nghiệp"
      >
        {isViewingAll ? (
          <>
            <div className="w-6 h-6 rounded-full bg-surface-200 text-ink-lighter border border-line flex items-center justify-center shrink-0">
              <Globe className="w-3.5 h-3.5 text-ink-lighter" />
            </div>
            <div className="text-left hidden sm:flex items-center gap-1.5">
              <span className="text-xs font-ui font-bold text-ink">
                Toàn bộ phận
              </span>
              <span className="text-[10px] font-num bg-surface-300 text-ink-lighter px-1.5 py-0.2 rounded-full font-bold">
                Tất cả
              </span>
            </div>
          </>
        ) : isViewingMyTasks ? (
          <>
            <div className="w-6 h-6 rounded-full bg-accent-solid text-on-color flex items-center justify-center text-[10px] font-bold shrink-0 ">
              <Star className="w-3 h-3 fill-current" />
            </div>
            <div className="text-left hidden sm:flex items-center gap-1.5">
              <span className="text-xs font-ui font-bold text-accent max-w-[130px] truncate">
                Của tôi
              </span>
              <span className="text-[10px] font-num bg-accent-solid/10 text-accent px-1.5 py-0.2 rounded-full font-bold">
                {myTasksCount}
              </span>
            </div>
          </>
        ) : isViewingMyProjects ? (
          <>
            <div className="w-6 h-6 rounded-full bg-support-solid text-on-color flex items-center justify-center text-[10px] font-bold shrink-0 ">
              <Briefcase className="w-3.5 h-3.5" />
            </div>
            <div className="text-left hidden sm:flex items-center gap-1.5">
              <span className="text-xs font-ui font-bold text-info max-w-[130px] truncate">
                Dự án của tôi
              </span>
              <span className="text-[10px] font-num bg-surface-info text-info px-1.5 py-0.2 rounded-full font-bold border border-line">
                {myProjectsCount}
              </span>
            </div>
          </>
        ) : (
          <>
            <div
              className={`w-6 h-6 rounded-full ${activeColor?.bg || 'bg-support-solid'} text-on-color flex items-center justify-center text-[10px] font-bold shrink-0 `}
            >
              {activeMember ? getInitials(activeMember.name) : 'DN'}
            </div>
            <div className="text-left hidden sm:flex items-center gap-1.5">
              <span className="text-xs font-ui font-bold text-ink max-w-[120px] truncate">
                {activeMember?.name}
              </span>
              <span className="text-[10px] font-num bg-surface-info text-support px-1.5 py-0.2 rounded-full font-bold">
                {activeMember ? (memberTaskCounts[activeMember.id] || 0) : 0}
              </span>
            </div>
          </>
        )}

        <ChevronDown
          className={`w-3.5 h-3.5 text-subdued transition-transform shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-80 bg-surface rounded-vds-lg border border-line shadow-sheet z-50 overflow-hidden animate-fade-in font-body">
          {/* Header */}
          <div className="bg-surface-100 px-3.5 py-2.5 border-b border-line">
            <div className="flex items-center justify-between mb-2">
              <span className="font-title text-xs font-bold text-ink flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-accent" />
                Lọc theo nhân sự
              </span>
              <span className="text-[10px] font-ui text-subdued">
                {productMembers.length} nhân sự
              </span>
            </div>

            {/* Quick Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-subdued-lighter absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm đồng nghiệp..."
                className="w-full pl-8 pr-7 py-1 text-xs font-body bg-surface border border-line focus:border-line-accent rounded-vds-lg text-ink placeholder-subdued-lighter focus:outline-hidden"
                autoFocus
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-subdued-lighter hover:text-ink"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Primary View Options */}
          <div className="p-1.5 border-b border-divider bg-surface space-y-1">
            {/* 1. Toàn bộ phận */}
            <button
              onClick={() => {
                if (onChangeScope) {
                  onChangeScope('all', null);
                } else {
                  onSelectMember(null);
                }
                setIsOpen(false);
              }}
              className={`w-full px-2.5 py-2 rounded-vds-lg text-left flex items-center justify-between transition-colors cursor-pointer ${
                isViewingAll
                  ? 'bg-surface-200 border border-line'
                  : 'hover:bg-surface-100'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-full bg-surface-200 border border-line text-ink-lighter flex items-center justify-center shrink-0">
                  <Globe className="w-3.5 h-3.5 text-ink-lighter" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-ui font-bold text-ink">
                    Toàn bộ phận
                  </div>
                </div>
              </div>
              {isViewingAll && (
                <Check className="w-4 h-4 text-positive stroke-[2.5] shrink-0 ml-2" />
              )}
            </button>

            {/* 2. Của tôi (Việc của tôi) */}
            {currentAuthUser && (
              <button
                onClick={() => {
                  if (onChangeScope) {
                    onChangeScope('my_tasks', currentAuthUser);
                  } else {
                    onSelectMember(currentAuthUser);
                  }
                  setIsOpen(false);
                }}
                className={`w-full px-2.5 py-2 rounded-vds-lg text-left flex items-center justify-between transition-colors cursor-pointer ${
                  isViewingMyTasks
                    ? 'bg-surface-accent-faint border border-line'
                    : 'hover:bg-surface-100'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-accent-solid text-on-color flex items-center justify-center shrink-0 ">
                    <Star className="w-3.5 h-3.5 fill-current" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-ui font-bold text-accent flex items-center gap-1.5">
                      <span>Của tôi</span>
                      <span className="text-[10px] font-mono font-bold text-accent/80">
                        ({currentAuthUser.name})
                      </span>
                    </div>
                  </div>
                </div>
                {isViewingMyTasks && (
                  <Check className="w-4 h-4 text-accent stroke-[2.5] shrink-0 ml-2" />
                )}
              </button>
            )}

            {/* 3. Dự án của tôi */}
            {currentAuthUser && (
              <button
                onClick={() => {
                  if (onChangeScope) {
                    onChangeScope('my_projects_tasks', currentAuthUser);
                  } else {
                    onSelectMember(currentAuthUser);
                  }
                  setIsOpen(false);
                }}
                className={`w-full px-2.5 py-2 rounded-vds-lg text-left flex items-center justify-between transition-colors cursor-pointer ${
                  isViewingMyProjects
                    ? 'bg-surface-info border border-line'
                    : 'hover:bg-surface-100'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-support-solid text-on-color flex items-center justify-center shrink-0 ">
                    <Briefcase className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-ui font-bold text-info flex items-center gap-1.5">
                      <span>Dự án của tôi</span>
                      <span className="text-[10px] font-mono font-bold text-info/80">
                        ({myProjectsCount} dự án)
                      </span>
                    </div>
                  </div>
                </div>
                {isViewingMyProjects && (
                  <Check className="w-4 h-4 text-info stroke-[2.5] shrink-0 ml-2" />
                )}
              </button>
            )}
          </div>

          {/* Section: Đồng nghiệp */}
          <div className="px-3 pt-2 pb-1">
            <span className="text-[10px] font-ui font-bold text-subdued-lighter">
              Đồng nghiệp
            </span>
          </div>

          {/* Colleagues List */}
          <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5">
            {filteredMembers.length === 0 ? (
              <div className="p-4 text-center text-xs text-subdued">
                Không tìm thấy nhân sự
              </div>
            ) : (
              filteredMembers.map((mem) => {
                const isSelected = activeMember?.id === mem.id;
                const isMe = currentAuthUser?.id === mem.id;
                const col = getTeamColor(mem.team);
                const count = memberTaskCounts[mem.id] || 0;

                return (
                  <button
                    key={mem.id}
                    onClick={() => {
                      onSelectMember(mem);
                      setIsOpen(false);
                    }}
                    className={`w-full px-2.5 py-1.5 rounded-vds-lg text-left flex items-center justify-between transition cursor-pointer ${
                      isSelected
                        ? `${col.lightBg} border ${col.border} `
                        : 'hover:bg-surface-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-full ${col.bg} text-on-color flex items-center justify-center text-[10px] font-bold shrink-0 `}
                      >
                        {getInitials(mem.name)}
                      </div>
                      <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-ui font-bold text-ink truncate">
                          {mem.name}
                        </span>
                        {isMe && (
                          <span className="text-[10px] font-ui font-bold px-1.5 py-0.2 rounded-full bg-accent-solid/10 text-accent">
                            Tôi
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-ui font-medium px-1.5 py-0.2 rounded-sm ${col.lightBg} ${col.text} border ${col.border} shrink-0`}
                        >
                          {mem.title || mem.team}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="text-[10px] font-num text-subdued bg-surface-200 px-1.5 py-0.2 rounded-full font-bold">
                        {count} việc
                      </span>
                      {isSelected && (
                        <Check className="w-4 h-4 text-positive stroke-[2.5]" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer for active perspective */}
          {activeMember && (
            <div className="bg-surface-100 px-3 py-2 border-t border-line flex items-center justify-between text-xs font-ui">
              <span className="text-subdued truncate max-w-[190px]">
                Đang xem: <strong className="text-ink">{activeMember.name}</strong>
              </span>
              <button
                onClick={() => {
                  onSelectMember(null);
                  setIsOpen(false);
                }}
                className="text-accent font-bold hover:underline cursor-pointer flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                <span>Toàn bộ phận</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
