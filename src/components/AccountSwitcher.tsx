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
} from 'lucide-react';

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
      return { bg: 'bg-[#963861]', lightBg: 'bg-[#fcf0f5]', text: 'text-[#963861]', border: 'border-[#f3c2d4]' };
    case 'UX/UI Designer':
      return { bg: 'bg-[#0f62fe]', lightBg: 'bg-[#eff6ff]', text: 'text-[#1d4ed8]', border: 'border-[#bfdbfe]' };
    case 'SEO':
      return { bg: 'bg-[#7c3aed]', lightBg: 'bg-[#faf5ff]', text: 'text-[#7e22ce]', border: 'border-[#e9d5ff]' };
    case 'Data':
      return { bg: 'bg-[#0d9488]', lightBg: 'bg-[#f0fdfa]', text: 'text-[#0f766e]', border: 'border-[#99f6e4]' };
    default:
      return { bg: 'bg-[#52525b]', lightBg: 'bg-[#f4f4f5]', text: 'text-[#52525b]', border: 'border-[#e4e4e7]' };
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
        m.name.toLowerCase().includes(q) ||
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
        className={`h-9 px-3 rounded-[8px] border transition-all flex items-center gap-2 cursor-pointer shadow-2xs ${
          isViewingAll
            ? 'bg-[#ffffff] border-[#cbd5e1] text-[#1e293b] hover:border-[#963861] hover:bg-[#fffbfd]'
            : isViewingMyTasks
            ? 'bg-[#fcf0f5] border-[#f3c2d4] text-[#963861] hover:border-[#963861] hover:bg-[#fae6ee]'
            : isViewingMyProjects
            ? 'bg-[#eff6ff] border-[#bfdbfe] text-[#1d4ed8] hover:border-[#3b82f6] hover:bg-[#dbeafe]'
            : 'bg-[#eff6ff] border-[#bfdbfe] text-[#1e40af] hover:border-[#3b82f6]'
        }`}
        title="Chuyển đổi góc nhìn: Toàn bộ phận / Của tôi / Dự án của tôi / Xem theo đồng nghiệp"
      >
        {isViewingAll ? (
          <>
            <div className="w-6 h-6 rounded-full bg-[#f1f5f9] text-[#475569] border border-[#cbd5e1] flex items-center justify-center shrink-0">
              <Globe className="w-3.5 h-3.5 text-[#475569]" />
            </div>
            <div className="text-left flex items-center gap-1.5">
              <span className="text-xs font-ui font-bold text-[#1e293b]">
                Toàn bộ phận
              </span>
              <span className="text-[10px] font-num bg-[#e2e8f0] text-[#475569] px-1.5 py-0.2 rounded-full font-bold">
                Tất cả
              </span>
            </div>
          </>
        ) : isViewingMyTasks ? (
          <>
            <div className="w-6 h-6 rounded-full bg-[#963861] text-white flex items-center justify-center text-[10px] font-bold shrink-0 shadow-xs">
              <Star className="w-3 h-3 fill-current" />
            </div>
            <div className="text-left flex items-center gap-1.5">
              <span className="text-xs font-ui font-bold text-[#963861] max-w-[130px] truncate">
                Của tôi
              </span>
              <span className="text-[10px] font-num bg-[#963861]/10 text-[#963861] px-1.5 py-0.2 rounded-full font-bold">
                {myTasksCount}
              </span>
            </div>
          </>
        ) : isViewingMyProjects ? (
          <>
            <div className="w-6 h-6 rounded-full bg-[#1d4ed8] text-white flex items-center justify-center text-[10px] font-bold shrink-0 shadow-xs">
              <Briefcase className="w-3.5 h-3.5" />
            </div>
            <div className="text-left flex items-center gap-1.5">
              <span className="text-xs font-ui font-bold text-[#1d4ed8] max-w-[130px] truncate">
                Dự án của tôi
              </span>
              <span className="text-[10px] font-num bg-[#eff6ff] text-[#1d4ed8] px-1.5 py-0.2 rounded-full font-bold border border-[#bfdbfe]">
                {myProjectsCount}
              </span>
            </div>
          </>
        ) : (
          <>
            <div
              className={`w-6 h-6 rounded-full ${activeColor?.bg || 'bg-[#2563eb]'} text-white flex items-center justify-center text-[10px] font-bold shrink-0 shadow-xs`}
            >
              {activeMember ? getInitials(activeMember.name) : 'DN'}
            </div>
            <div className="text-left flex items-center gap-1.5">
              <span className="text-xs font-ui font-bold text-[#1e293b] max-w-[120px] truncate">
                {activeMember?.name}
              </span>
              <span className="text-[10px] font-num bg-[#dbeafe] text-[#1e40af] px-1.5 py-0.2 rounded-full font-bold">
                {activeMember ? (memberTaskCounts[activeMember.id] || 0) : 0}
              </span>
            </div>
          </>
        )}

        <ChevronDown
          className={`w-3.5 h-3.5 text-[#64748b] transition-transform shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-80 bg-white rounded-[10px] border border-[#e2e8f0] shadow-xl z-50 overflow-hidden animate-fade-in font-body">
          {/* Header */}
          <div className="bg-[#f8fafc] px-3.5 py-2.5 border-b border-[#e2e8f0]">
            <div className="flex items-center justify-between mb-2">
              <span className="font-title text-xs font-bold text-[#1e293b] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#963861]" />
                Lọc theo nhân sự
              </span>
              <span className="text-[10px] font-ui text-[#64748b]">
                {productMembers.length} nhân sự
              </span>
            </div>

            {/* Quick Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#94a3b8] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm đồng nghiệp..."
                className="w-full pl-8 pr-7 py-1 text-xs font-body bg-white border border-[#cbd5e1] focus:border-[#963861] rounded-[6px] text-[#1e293b] placeholder-[#94a3b8] focus:outline-hidden"
                autoFocus
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#1e293b]"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Primary View Options */}
          <div className="p-1.5 border-b border-[#f1f5f9] bg-white space-y-1">
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
              className={`w-full px-2.5 py-2 rounded-[6px] text-left flex items-center justify-between transition-colors cursor-pointer ${
                isViewingAll
                  ? 'bg-[#f1f5f9] border border-[#cbd5e1]'
                  : 'hover:bg-[#f8fafc]'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-full bg-[#f1f5f9] border border-[#cbd5e1] text-[#475569] flex items-center justify-center shrink-0">
                  <Globe className="w-3.5 h-3.5 text-[#475569]" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-ui font-bold text-[#1e293b]">
                    Toàn bộ phận
                  </div>
                </div>
              </div>
              {isViewingAll && (
                <Check className="w-4 h-4 text-[#166534] stroke-[2.5] shrink-0 ml-2" />
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
                className={`w-full px-2.5 py-2 rounded-[6px] text-left flex items-center justify-between transition-colors cursor-pointer ${
                  isViewingMyTasks
                    ? 'bg-[#fcf0f5] border border-[#f3c2d4]'
                    : 'hover:bg-[#fff9fb]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-[#963861] text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <Star className="w-3.5 h-3.5 fill-current" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-ui font-bold text-[#963861] flex items-center gap-1.5">
                      <span>Của tôi</span>
                      <span className="text-[10px] font-mono font-bold text-[#963861]/80">
                        ({currentAuthUser.name})
                      </span>
                    </div>
                  </div>
                </div>
                {isViewingMyTasks && (
                  <Check className="w-4 h-4 text-[#963861] stroke-[2.5] shrink-0 ml-2" />
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
                className={`w-full px-2.5 py-2 rounded-[6px] text-left flex items-center justify-between transition-colors cursor-pointer ${
                  isViewingMyProjects
                    ? 'bg-[#eff6ff] border border-[#bfdbfe]'
                    : 'hover:bg-[#f8fafc]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-[#1d4ed8] text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <Briefcase className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-ui font-bold text-[#1d4ed8] flex items-center gap-1.5">
                      <span>Dự án của tôi</span>
                      <span className="text-[10px] font-mono font-bold text-[#1d4ed8]/80">
                        ({myProjectsCount} dự án)
                      </span>
                    </div>
                  </div>
                </div>
                {isViewingMyProjects && (
                  <Check className="w-4 h-4 text-[#1d4ed8] stroke-[2.5] shrink-0 ml-2" />
                )}
              </button>
            )}
          </div>

          {/* Section: Đồng nghiệp */}
          <div className="px-3 pt-2 pb-1">
            <span className="text-[10px] font-ui font-bold text-[#94a3b8] uppercase tracking-wider">
              Đồng nghiệp
            </span>
          </div>

          {/* Colleagues List */}
          <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5">
            {filteredMembers.length === 0 ? (
              <div className="p-4 text-center text-xs text-[#64748b]">
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
                    className={`w-full px-2.5 py-1.5 rounded-[6px] text-left flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? `${col.lightBg} border ${col.border} shadow-2xs`
                        : 'hover:bg-[#f8fafc]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-full ${col.bg} text-white flex items-center justify-center text-[10px] font-bold shrink-0 shadow-2xs`}
                      >
                        {getInitials(mem.name)}
                      </div>
                      <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-ui font-bold text-[#1e293b] truncate">
                          {mem.name}
                        </span>
                        {isMe && (
                          <span className="text-[10px] font-ui font-bold px-1.5 py-0.2 rounded-full bg-[#963861]/10 text-[#963861]">
                            Tôi
                          </span>
                        )}
                        <span
                          className={`text-[9px] font-ui font-medium px-1.5 py-0.2 rounded-sm ${col.lightBg} ${col.text} border ${col.border} shrink-0`}
                        >
                          {mem.title || mem.team}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="text-[10px] font-num text-[#64748b] bg-[#f1f5f9] px-1.5 py-0.2 rounded-full font-bold">
                        {count} việc
                      </span>
                      {isSelected && (
                        <Check className="w-4 h-4 text-[#166534] stroke-[2.5]" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer for active perspective */}
          {activeMember && (
            <div className="bg-[#f8fafc] px-3 py-2 border-t border-[#e2e8f0] flex items-center justify-between text-[11px] font-ui">
              <span className="text-[#64748b] truncate max-w-[190px]">
                Đang xem: <strong className="text-[#1e293b]">{activeMember.name}</strong>
              </span>
              <button
                onClick={() => {
                  onSelectMember(null);
                  setIsOpen(false);
                }}
                className="text-[#963861] font-bold hover:underline cursor-pointer flex items-center gap-1"
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
