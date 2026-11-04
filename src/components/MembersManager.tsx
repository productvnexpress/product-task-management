/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { MemberItem, MemberGroup, TeamType, TaskItem, ProjectItem, FilterState } from '../types';
import {
  Users,
  Plus,
  Mail,
  CheckCircle2,
  Clock,
  Trash2,
  Edit2,
  X,
  PhoneCall,
  MapPin,
  Calendar,
  AtSign,
  Building,
  Filter,
  Briefcase,
  Layers,
  Search,
  UserCheck,
  Award,
  Tag,
  Copy,
  Check,
  KeyRound,
  Megaphone
} from './vds/icons';
import { canCreateMember, canEditMember, canDeleteMember, getUserRole } from '../utils/rbac';
import { workingTimeService } from '../services/workingTimeService';
import { AdminResetPasswordModal } from './AdminResetPasswordModal';
import { AdminSendMessageModal } from './AdminSendMessageModal';

/**
 * Sắp xếp nhân sự theo thứ tự ABC tiếng Việt:
 * Ưu tiên Tên gọi (firstName), nếu trùng tên thì xét tiếp theo Họ (lastName)
 */
export function sortMembersByName(members: MemberItem[]): MemberItem[] {
  return [...members].sort((a, b) => {
    const firstA = a.firstName || a.name.trim().split(/\s+/).slice(-1)[0];
    const firstB = b.firstName || b.name.trim().split(/\s+/).slice(-1)[0];
    const cmpFirst = firstA.localeCompare(firstB, 'vi');
    if (cmpFirst !== 0) return cmpFirst;
    const lastA = a.lastName || a.name.trim().split(/\s+/)[0];
    const lastB = b.lastName || b.name.trim().split(/\s+/)[0];
    return lastA.localeCompare(lastB, 'vi');
  });
}

interface MembersManagerProps {
  members: MemberItem[];
  tasks: TaskItem[];
  projects?: ProjectItem[];
  filterState?: FilterState;
  onAddMember: (member: Omit<MemberItem, 'id'>) => void;
  onUpdateMember: (member: MemberItem) => void;
  onDeleteMember: (id: string) => void;
  isCreateOpen?: boolean;
  onCloseCreate?: () => void;
  activeProductMember?: MemberItem | null;
  currentAuthUser?: MemberItem | null;
  onSelectProductMember?: (member: MemberItem | null) => void;
  onSendAdminBroadcast?: (notifs: import('../types').NotificationItem[]) => Promise<void> | void;
}

const PRODUCT_TEAMS: TeamType[] = ['Product Manager', 'UX/UI Designer', 'SEO', 'Data'];

export const MembersManager: React.FC<MembersManagerProps> = ({
  members,
  tasks,
  projects = [],
  filterState,
  onAddMember,
  onUpdateMember,
  onDeleteMember,
  isCreateOpen,
  onCloseCreate,
  activeProductMember,
  currentAuthUser,
  onSelectProductMember,
  onSendAdminBroadcast,
}) => {
  const effectiveUser = currentAuthUser || activeProductMember;
  const isAdmin = getUserRole(effectiveUser) === 'Admin';
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  // Admin Features State
  const [resetPasswordMember, setResetPasswordMember] = useState<MemberItem | null>(null);
  const [isSendMessageOpen, setIsSendMessageOpen] = useState(false);
  const [selectedRecipientForMessage, setSelectedRecipientForMessage] = useState<MemberItem | null>(null);
  const [adminActionNotice, setAdminActionNotice] = useState<string | null>(null);

  const handleCopyEmail = (email: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => {
      setCopiedEmail((prev) => (prev === email ? null : prev));
    }, 2000);
  };
  const [activeGroupTab, setActiveGroupTab] = useState<MemberGroup>('Product');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<MemberItem | null>(null);

  useEffect(() => {
    if (isCreateOpen) {
      openAddModal();
    }
  }, [isCreateOpen]);

  // Stakeholder specific local filters
  const [stakeholderRegionFilter, setStakeholderRegionFilter] = useState<'Tất cả' | 'Hà Nội' | 'TP HCM'>('Tất cả');
  const [stakeholderDeptFilter, setStakeholderDeptFilter] = useState<string>('Tất cả');
  const [stakeholderSearchQuery, setStakeholderSearchQuery] = useState<string>('');

  // Form state
  const [memberGroup, setMemberGroup] = useState<MemberGroup>('Product');
  const [salutation, setSalutation] = useState('');
  const [name, setName] = useState('');
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [username, setUsername] = useState('');
  const [region, setRegion] = useState('Hà Nội');
  const [department, setDepartment] = useState('Sản phẩm công nghệ');
  const [team, setTeam] = useState<TeamType>('Product Manager');
  const [title, setTitle] = useState('');
  const [ipPhone, setIpPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gmail, setGmail] = useState('');
  const [joinDate, setJoinDate] = useState('');
  const [status, setStatus] = useState<MemberItem['status']>('Sẵn sàng');

  // Filter members based on global filterState
  const filteredMembers = useMemo(() => {
    if (!filterState) return members;
    return members.filter((m) => {
      // 1. Team filter (only applies if filterState.team is set and not 'Tất cả')
      if (filterState.team !== 'Tất cả' && m.team !== filterState.team) {
        return false;
      }

      // 2. Assignee / Member filter
      if (filterState.assignee && filterState.assignee !== 'Tất cả' && m.name !== filterState.assignee) {
        return false;
      }

      // 3. Project filter
      if (filterState.projectId !== 'all') {
        const proj = projects.find((p) => p.id === filterState.projectId);
        const projName = proj?.name || '';
        const memberHasTaskInProj = tasks.some(
          (t) => t.assignee === m.name && (t.projectId === filterState.projectId || t.projectName === projName)
        );
        const memberInProjRoles = proj?.roles && (
          proj.roles.pm?.includes(m.name) ||
          proj.roles.designer?.includes(m.name) ||
          proj.roles.seo?.includes(m.name) ||
          proj.roles.data?.includes(m.name) ||
          proj.productOwner === m.name
        );
        if (!memberHasTaskInProj && !memberInProjRoles) {
          return false;
        }
      }

      // 4. Status filter
      if (filterState.status !== 'Tất cả') {
        const memberHasTaskWithStatus = tasks.some(
          (t) => t.assignee === m.name && t.status === filterState.status
        );
        if (!memberHasTaskWithStatus && (m.status as string) !== (filterState.status as string)) {
          return false;
        }
      }

      // 5. Search query
      if (filterState.searchQuery.trim()) {
        const q = filterState.searchQuery.toLowerCase();
        const matchName = m.name.toLowerCase().includes(q);
        const matchUser = (m.username || '').toLowerCase().includes(q);
        const matchEmail = (m.email || '').toLowerCase().includes(q);
        const matchTitle = (m.title || '').toLowerCase().includes(q);
        const matchTeam = m.team.toLowerCase().includes(q);
        const matchRegion = (m.region || '').toLowerCase().includes(q);
        const matchDept = (m.department || '').toLowerCase().includes(q);
        if (!matchName && !matchUser && !matchEmail && !matchTitle && !matchTeam && !matchRegion && !matchDept) {
          return false;
        }
      }

      return true;
    });
  }, [members, filterState, tasks, projects]);

  // Split into 2 primary groups
  const productMembers = useMemo(() => {
    return filteredMembers.filter(
      (m) => m.group === 'Product' || (!m.group && m.team !== 'Stakeholder')
    );
  }, [filteredMembers]);

  const rawStakeholderMembers = useMemo(() => {
    return filteredMembers.filter(
      (m) => m.group === 'Stakeholder' || m.team === 'Stakeholder'
    );
  }, [filteredMembers]);

  // List of distinct departments for Stakeholder filter
  const stakeholderDepartments = useMemo(() => {
    const set = new Set<string>();
    rawStakeholderMembers.forEach((m) => {
      if (m.department) set.add(m.department);
    });
    return Array.from(set).sort((a, b) => {
      if (a === 'BBT') return -1;
      if (b === 'BBT') return 1;
      return a.localeCompare(b, 'vi');
    });
  }, [rawStakeholderMembers]);

  // Filtered Stakeholders with local filters
  const filteredStakeholders = useMemo(() => {
    return rawStakeholderMembers.filter((m) => {
      if (stakeholderRegionFilter !== 'Tất cả' && m.region !== stakeholderRegionFilter) {
        return false;
      }
      if (stakeholderDeptFilter !== 'Tất cả' && m.department !== stakeholderDeptFilter) {
        return false;
      }
      if (stakeholderSearchQuery.trim()) {
        const q = stakeholderSearchQuery.toLowerCase();
        const matchName = m.name.toLowerCase().includes(q);
        const matchUser = (m.username || '').toLowerCase().includes(q);
        const matchEmail = (m.email || '').toLowerCase().includes(q);
        const matchTitle = (m.title || '').toLowerCase().includes(q);
        const matchDept = (m.department || '').toLowerCase().includes(q);
        const matchPhone = (m.ipPhone || '').toLowerCase().includes(q);
        if (!matchName && !matchUser && !matchEmail && !matchTitle && !matchDept && !matchPhone) {
          return false;
        }
      }
      return true;
    });
  }, [rawStakeholderMembers, stakeholderRegionFilter, stakeholderDeptFilter, stakeholderSearchQuery]);

  const openAddModal = (defaultGroup?: MemberGroup, defaultTeam?: TeamType) => {
    const selectedGroup = defaultGroup || activeGroupTab;
    setEditingMember(null);
    setMemberGroup(selectedGroup);
    setSalutation('');
    setName('');
    setLastName('');
    setFirstName('');
    setUsername('');
    setRegion('Hà Nội');
    if (selectedGroup === 'Stakeholder') {
      setDepartment('BBT');
      setTeam('Stakeholder');
      setTitle('Trưởng ban');
    } else {
      setDepartment('Sản phẩm công nghệ');
      setTeam(defaultTeam || 'Product Manager');
      setTitle('Quản lý sản phẩm');
    }
    setIpPhone('');
    setEmail('');
    setGmail('');
    setJoinDate('');
    setStatus('Sẵn sàng');
    setIsModalOpen(true);
  };

  const openEditModal = (mem: MemberItem) => {
    setEditingMember(mem);
    const resolvedGroup: MemberGroup = mem.group || (mem.team === 'Stakeholder' ? 'Stakeholder' : 'Product');
    setMemberGroup(resolvedGroup);
    setSalutation(mem.salutation || '');
    setName(mem.name);
    setLastName(mem.lastName || '');
    setFirstName(mem.firstName || '');
    setUsername(mem.username || '');
    setRegion(mem.region || 'Hà Nội');
    setDepartment(mem.department || (resolvedGroup === 'Product' ? 'Sản phẩm công nghệ' : 'BBT'));
    setTeam(mem.team);
    setTitle(mem.title);
    setIpPhone(mem.ipPhone || '');
    setEmail(mem.email);
    setGmail(mem.gmail || '');
    setJoinDate(mem.joinDate || '');
    setStatus(mem.status);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const finalTeam = memberGroup === 'Stakeholder' ? 'Stakeholder' : team;
    const finalDept = department.trim() || (memberGroup === 'Product' ? 'Sản phẩm công nghệ' : 'Ban');

    const memberPayload: Omit<MemberItem, 'id'> = {
      name: name.trim(),
      salutation: salutation.trim() || undefined,
      lastName: lastName.trim(),
      firstName: firstName.trim(),
      username: username.trim(),
      region: region.trim(),
      department: finalDept,
      group: memberGroup,
      team: finalTeam,
      title: title.trim() || (memberGroup === 'Product' ? 'Thành viên' : 'Đại diện'),
      ipPhone: ipPhone.trim(),
      email: email.trim() || `${username.trim() || name.toLowerCase().replace(/\s+/g, '')}@vnexpress.net`,
      gmail: gmail.trim(),
      joinDate: joinDate.trim(),
      status,
    };

    if (editingMember) {
      onUpdateMember({
        ...editingMember,
        ...memberPayload,
      });
    } else {
      onAddMember(memberPayload);
    }

    closeModal();
  };

  const closeModal = () => {
    setIsModalOpen(false);
    onCloseCreate?.();
  };

  return (
    <div className="space-y-6 animate-fade-in w-full max-w-[800px] mx-auto pb-12">
      {/* 2 Primary Group Tabs Switcher */}
      <div className="bg-surface-200 p-1.5 rounded-vds-lg border border-line flex items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveGroupTab('Product')}
          className={`flex-1 py-2.5 px-4 rounded-vds-lg font-ui text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            activeGroupTab === 'Product'
              ? 'bg-surface text-support border border-line'
              : 'text-ink-lighter hover:text-ink hover:bg-surface/60'
          }`}
        >
          <Briefcase className={`w-4 h-4 ${activeGroupTab === 'Product' ? 'text-support' : 'text-ink-lighter'}`} />
          <span>1. Nhóm Product</span>
          <span
            className={`font-num text-xs px-2 py-0.5 rounded-full font-bold ${
              activeGroupTab === 'Product'
                ? 'bg-surface-support text-support border border-line'
                : 'bg-surface-300 text-ink-lighter'
            }`}
          >
            {productMembers.length} nhân sự
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveGroupTab('Stakeholder')}
          className={`flex-1 py-2.5 px-4 rounded-vds-lg font-ui text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            activeGroupTab === 'Stakeholder'
              ? 'bg-surface text-accent border border-line'
              : 'text-ink-lighter hover:text-ink hover:bg-surface/60'
          }`}
        >
          <Building className={`w-4 h-4 ${activeGroupTab === 'Stakeholder' ? 'text-accent' : 'text-ink-lighter'}`} />
          <span>2. Nhóm Stakeholder</span>
          <span
            className={`font-num text-xs px-2 py-0.5 rounded-full font-bold ${
              activeGroupTab === 'Stakeholder'
                ? 'bg-surface-accent-faint text-accent border border-line'
                : 'bg-surface-300 text-ink-lighter'
            }`}
          >
            {rawStakeholderMembers.length} nhân sự
          </span>
        </button>
      </div>

      {/* Admin Broadcast Bar */}
      {isAdmin && (
        <div className="bg-gradient-to-r from-surface-100 to-surface-200 border border-line rounded-vds-lg p-3.5 flex items-center justify-between gap-3 ">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-extreme-solid text-on-color flex items-center justify-center shrink-0 ">
              <Megaphone className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-ui font-bold text-extreme">Thông điệp Quản trị</h4>
              <p className="text-xs text-extreme/80">Gửi thông báo trực tiếp đến một hoặc nhiều thành viên Ban Sản phẩm</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedRecipientForMessage(null);
              setIsSendMessageOpen(true);
            }}
            className="px-3 py-1.5 bg-extreme-solid hover:bg-extreme-solid text-on-color text-xs font-ui font-bold rounded-vds-lg transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Megaphone className="w-3.5 h-3.5" />
            <span>Gửi thông điệp</span>
          </button>
        </div>
      )}

      {/* Admin Action Notice */}
      {adminActionNotice && (
        <div className="bg-surface-positive border border-line text-positive px-3.5 py-2.5 rounded-vds-lg text-xs flex items-center justify-between animate-fade-in font-ui font-medium">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-positive" />
            <span>{adminActionNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setAdminActionNotice(null)}
            className="text-positive hover:text-positive cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: PRODUCT MANAGEMENT VIEW */}
      {/* ========================================================================= */}
      {activeGroupTab === 'Product' && (
        <div className="space-y-8 animate-fade-in">
          {/* Sub-groups by Specialty */}
          {PRODUCT_TEAMS.map((teamName) => {
            const teamMembers = sortMembersByName(productMembers.filter((m) => m.team === teamName));

            const teamColors: Record<string, string> = {
              'Product Manager': 'bg-surface-support text-support border-line',
              'UX/UI Designer': 'bg-surface-accent-faint text-accent border-line',
              SEO: 'bg-surface-positive text-positive border-line',
              Data: 'bg-surface-warning text-warning border-line',
            };

            return (
              <div key={teamName} className="space-y-4">
                {/* Team Title Header */}
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-vds-lg border text-xs font-ui font-bold ${
                        teamColors[teamName]
                      }`}
                    >
                      {teamName}
                    </span>
                    <span className="font-num text-xs font-bold text-subdued">
                      ({teamMembers.length} nhân sự)
                    </span>
                  </div>

                  {canCreateMember(effectiveUser) && (
                    <button
                      onClick={() => openAddModal('Product', teamName)}
                      className="text-xs font-ui font-bold text-support hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm thành viên {teamName}</span>
                    </button>
                  )}
                </div>

                {/* Members Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {teamMembers.length === 0 ? (
                    <div className="col-span-full p-4 bg-surface rounded-vds-lg border border-dashed border-line text-center text-xs text-subdued">
                      Chưa có nhân sự thuộc nhóm này.
                    </div>
                  ) : (
                    teamMembers.map((mem) => {
                      const memberTasks = tasks.filter((t) => t.assignee === mem.name);
                      const activeCount = memberTasks.filter((t) => t.status !== 'Hoàn thành').length;
                      const completedCount = memberTasks.filter((t) => t.status === 'Hoàn thành').length;

                      // Find projects lead by this member
                      const assignedProjects = projects.filter(
                        (p) =>
                          p.roles?.pm?.includes(mem.name) ||
                          p.roles?.designer?.includes(mem.name) ||
                          p.roles?.seo?.includes(mem.name) ||
                          p.roles?.data?.includes(mem.name) ||
                          p.leadName?.includes(mem.name)
                      );

                      const isActiveAccount = activeProductMember?.id === mem.id;

                      return (
                        <div
                          key={mem.id}
                          className={`bg-surface rounded-vds-lg border p-4 hover:shadow-pop transition space-y-3 flex flex-col justify-between ${
                            isActiveAccount
                              ? 'border-line-accent ring-2 ring-line-accent/20 bg-surface-100'
                              : 'border-line'
                          }`}
                        >
                          <div className="space-y-2.5">
                            {/* Top Row: Name & Status */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-full bg-surface-200 text-ink font-ui font-bold flex items-center justify-center text-sm border border-line shrink-0">
                                  {mem.name.charAt(0)}
                                </div>
                                <div>
                                  <h4 className="font-body text-sm text-ink flex items-center gap-1.5 flex-wrap">
                                    <span>
                                      {(() => {
                                        let sal = mem.salutation || '';
                                        let cleanName = mem.name;
                                        if (cleanName.startsWith('Anh ')) {
                                          sal = 'Anh';
                                          cleanName = cleanName.slice(4);
                                        } else if (cleanName.startsWith('Chị ')) {
                                          sal = 'Chị';
                                          cleanName = cleanName.slice(4);
                                        }
                                        return (
                                          <>
                                            {sal && <span className="font-normal text-ink-lighter">{sal} </span>}
                                            <span className="font-bold text-ink">{cleanName}</span>
                                            {mem.ipPhone && <span className="font-normal text-subdued"> - {mem.ipPhone}</span>}
                                          </>
                                        );
                                      })()}
                                    </span>
                                    {mem.username && (
                                      <span className="text-xs font-normal text-subdued">
                                        (@{mem.username})
                                      </span>
                                    )}
                                  </h4>
                                  <p className="text-xs font-ui text-ink-lighter">
                                    {mem.title} • {mem.department || 'Sản phẩm công nghệ'}
                                  </p>
                                </div>
                              </div>

                              {mem.status && mem.status !== 'Sẵn sàng' && (
                                <span
                                  className={`text-[10px] font-ui font-bold px-2 py-0.5 rounded-full ${
                                    mem.status === 'Đang bận'
                                      ? 'bg-surface-warning text-warning'
                                      : 'bg-surface-200 text-subdued'
                                  }`}
                                >
                                  {mem.status}
                                </span>
                              )}
                            </div>

                            {/* Detail Badges: Region, IP Phone, Join Date */}
                            <div className="flex flex-wrap items-center gap-1.5 text-xs font-ui">
                              {mem.region && (
                                <span className="bg-surface-200 text-support px-2 py-0.5 rounded-vds-md border border-line flex items-center gap-1 font-medium">
                                  <MapPin className="w-3 h-3 text-support" />
                                  {mem.region}
                                </span>
                              )}
                              {mem.ipPhone && (
                                <span className="bg-surface-warning text-warning px-2 py-0.5 rounded-vds-md border border-line flex items-center gap-1 font-num font-medium">
                                  <PhoneCall className="w-3 h-3 text-warning" />
                                  IP: {mem.ipPhone}
                                </span>
                              )}
                              {mem.joinDate && (() => {
                                const workStats = workingTimeService.calculateDaysWorked(mem.joinDate, mem.name);
                                if (!workStats.isValid) {
                                  return (
                                    <span className="bg-surface-200 text-ink-lighter px-2 py-0.5 rounded-vds-md border border-line flex items-center gap-1 font-num text-xs">
                                      <Calendar className="w-3 h-3 text-subdued-lighter" />
                                      Vào: {mem.joinDate}
                                    </span>
                                  );
                                }
                                return (
                                  <span
                                    className="bg-surface-200 text-ink-lighter px-2 py-0.5 rounded-vds-md border border-line flex items-center gap-1 font-num text-xs"
                                    title={`Vào làm: ${workStats.formattedDate} • ${workStats.workingDays.toLocaleString('vi-VN')} ngày làm việc (Thứ 2 - Thứ 6, trừ lễ & nghỉ) / ${workStats.calendarDays.toLocaleString('vi-VN')} ngày dương lịch`}
                                  >
                                    <Calendar className="w-3 h-3 text-subdued-lighter shrink-0" />
                                    <span>Vào: <strong className="font-semibold text-ink-lighter">{workStats.formattedDate}</strong> ({workStats.workingDays.toLocaleString('vi-VN')} ngày)</span>
                                  </span>
                                );
                              })()}
                            </div>

                            {/* Assigned Projects */}
                            {assignedProjects.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1 pt-1">
                                <span className="text-[10px] text-ink-lighter font-medium mr-1">Dự án:</span>
                                {assignedProjects.slice(0, 3).map((p) => (
                                  <span
                                    key={p.id}
                                    className="text-[10px] bg-surface-100 border border-line px-1.5 py-0.5 rounded text-support font-medium truncate max-w-[120px]"
                                    title={p.name}
                                  >
                                    {p.name}
                                  </span>
                                ))}
                                {assignedProjects.length > 3 && (
                                  <span className="text-[10px] text-subdued font-num">
                                    +{assignedProjects.length - 3}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Emails with Copy Feature */}
                            <div className="space-y-1 text-xs font-num text-ink-lighter pt-1">
                              <div className="flex items-center justify-between group/mail">
                                <a
                                  href={`mailto:${mem.email}`}
                                  className="flex items-center gap-1.5 truncate hover:text-support hover:underline"
                                  title={mem.email}
                                >
                                  <Mail className="w-3.5 h-3.5 text-positive shrink-0" />
                                  <span className="truncate">{mem.email}</span>
                                </a>
                                <button
                                  type="button"
                                  onClick={(e) => handleCopyEmail(mem.email, e)}
                                  className="p-1 hover:bg-surface-200 rounded text-subdued hover:text-ink transition-colors ml-1 shrink-0 cursor-pointer"
                                  title="Sao chép email"
                                >
                                  {copiedEmail === mem.email ? (
                                    <Check className="w-3.5 h-3.5 text-positive" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                              {mem.gmail && (
                                <div className="flex items-center justify-between group/gmail">
                                  <a
                                    href={`mailto:${mem.gmail}`}
                                    className="flex items-center gap-1.5 truncate text-xs text-subdued hover:text-support hover:underline"
                                    title={mem.gmail}
                                  >
                                    <AtSign className="w-3.5 h-3.5 text-subdued-lighter shrink-0" />
                                    <span className="truncate">{mem.gmail}</span>
                                  </a>
                                  <button
                                    type="button"
                                    onClick={(e) => handleCopyEmail(mem.gmail, e)}
                                    className="p-1 hover:bg-surface-200 rounded text-subdued hover:text-ink transition-colors ml-1 shrink-0 cursor-pointer"
                                    title="Sao chép Gmail"
                                  >
                                    {copiedEmail === mem.gmail ? (
                                      <Check className="w-3 h-3 text-positive" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Task assignments info */}
                          <div className="pt-3 border-t border-divider flex items-center justify-between text-xs font-ui">
                            <div className="flex items-center gap-3">
                              <span className="flex items-center gap-1 text-ink-lighter">
                                <Clock className="w-3.5 h-3.5 text-accent" />
                                <span>Đang làm: <strong className="font-num text-ink">{activeCount}</strong></span>
                              </span>

                              <span className="flex items-center gap-1 text-positive">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Xong: <strong className="font-num">{completedCount}</strong></span>
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {onSelectProductMember && (
                                <button
                                  type="button"
                                  onClick={() => onSelectProductMember(isActiveAccount ? null : mem)}
                                  className={`px-2 py-0.5 text-xs font-ui font-bold rounded-vds-md transition-colors cursor-pointer ${
                                    isActiveAccount
                                      ? 'bg-surface-selected text-accent ring-1 ring-inset ring-line-accent-soft'
                                      : 'bg-surface-100 text-ink-lighter hover:bg-accent-solid hover:text-on-color border border-line'
                                  }`}
                                  title={isActiveAccount ? 'Nhấp để bỏ chọn' : `Chuyển làm tài khoản chính: ${mem.name}`}
                                >
                                  {isActiveAccount ? 'Đang chọn' : 'Đăng nhập'}
                                </button>
                              )}
                              {isAdmin && (
                                <button
                                  type="button"
                                  onClick={() => setResetPasswordMember(mem)}
                                  className="p-1 text-subdued hover:text-warning hover:bg-surface-warning rounded-vds-md cursor-pointer transition-colors"
                                  title={`Reset mật khẩu cho @${mem.username || mem.name}`}
                                >
                                  <KeyRound className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {isAdmin && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedRecipientForMessage(mem);
                                    setIsSendMessageOpen(true);
                                  }}
                                  className="p-1 text-subdued hover:text-extreme hover:bg-surface-100 rounded-vds-md cursor-pointer transition-colors"
                                  title={`Gửi thông điệp riêng cho @${mem.username || mem.name}`}
                                >
                                  <Megaphone className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {canEditMember(effectiveUser, mem) && (
                                <button
                                  onClick={() => openEditModal(mem)}
                                  className="p-1 text-subdued hover:text-ink hover:bg-surface-200 rounded-vds-md cursor-pointer"
                                  title="Chỉnh sửa thông tin"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {canDeleteMember(effectiveUser, mem) && (
                                <button
                                  onClick={() => {
                                    if (confirm(`Xóa nhân sự "${mem.name}"?`)) {
                                      onDeleteMember(mem.id);
                                    }
                                  }}
                                  className="p-1 text-subdued hover:text-negative hover:bg-surface-negative rounded-vds-md cursor-pointer"
                                  title="Xóa nhân sự"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: STAKEHOLDER MANAGEMENT VIEW */}
      {/* ========================================================================= */}
      {activeGroupTab === 'Stakeholder' && (
        <div className="space-y-6 animate-fade-in">
          {/* Stakeholder Filters & Search Bar */}
          <div className="bg-surface p-4 rounded-vds-lg border border-line flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* Region Filter */}
              <div className="flex items-center gap-1 bg-surface-200 p-1 rounded-vds-lg text-xs font-ui">
                <span className="text-ink-lighter font-medium px-2 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-support" />
                  Vùng:
                </span>
                {(['Tất cả', 'Hà Nội', 'TP HCM'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setStakeholderRegionFilter(r)}
                    className={`px-2.5 py-1 rounded-vds-md font-semibold transition cursor-pointer ${
                      stakeholderRegionFilter === r
                        ? 'bg-surface text-support font-bold'
                        : 'text-ink-lighter hover:text-ink'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>

              {/* Department Dropdown Filter */}
              <div className="flex items-center gap-1.5">
                <select
                  value={stakeholderDeptFilter}
                  onChange={(e) => setStakeholderDeptFilter(e.target.value)}
                  className="px-3 py-1.5 bg-surface border border-line rounded-vds-lg text-xs font-ui text-ink font-medium focus:border-line-accent cursor-pointer"
                >
                  <option value="Tất cả">Tất cả Ban / Phòng ({rawStakeholderMembers.length})</option>
                  {stakeholderDepartments.map((dept) => {
                    const count = rawStakeholderMembers.filter((m) => m.department === dept).length;
                    return (
                      <option key={dept} value={dept}>
                        {dept} ({count})
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* Search Input for Stakeholders */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-subdued absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={stakeholderSearchQuery}
                onChange={(e) => setStakeholderSearchQuery(e.target.value)}
                placeholder="Tìm tên, ban, chức vụ, IP..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface border border-line rounded-vds-lg text-ink focus:border-line-accent"
              />
              {stakeholderSearchQuery && (
                <button
                  type="button"
                  onClick={() => setStakeholderSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-subdued-lighter hover:text-ink"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Stakeholders Count and Add button */}
          <div className="flex items-center justify-between px-1">
            <p className="text-xs font-ui text-ink-lighter">
              Hiển thị <strong>{filteredStakeholders.length}</strong> / <strong>{rawStakeholderMembers.length}</strong> Stakeholder
              {stakeholderDeptFilter !== 'Tất cả' && ` thuộc ${stakeholderDeptFilter}`}
              {stakeholderRegionFilter !== 'Tất cả' && ` tại ${stakeholderRegionFilter}`}
            </p>

            {canCreateMember(effectiveUser) && (
              <button
                onClick={() => openAddModal('Stakeholder')}
                className="text-xs font-ui font-bold text-accent hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm Stakeholder</span>
              </button>
            )}
          </div>

          {/* Stakeholders Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredStakeholders.length === 0 ? (
              <div className="col-span-full p-8 bg-surface rounded-vds-lg border border-dashed border-line text-center text-xs text-subdued space-y-2">
                <Users className="w-8 h-8 text-subdued-lighter mx-auto" />
                <p>Không tìm thấy Stakeholder nào phù hợp với bộ lọc hiện tại.</p>
                <button
                  onClick={() => {
                    setStakeholderDeptFilter('Tất cả');
                    setStakeholderRegionFilter('Tất cả');
                    setStakeholderSearchQuery('');
                  }}
                  className="text-xs text-support font-semibold underline cursor-pointer"
                >
                  Đặt lại bộ lọc
                </button>
              </div>
            ) : (
              sortMembersByName(filteredStakeholders).map((mem) => {
                // Find projects where this stakeholder is PO
                const poProjects = projects.filter(
                  (p) => p.productOwner && (p.productOwner.includes(mem.name) || mem.name.includes(p.productOwner))
                );

                const isBBT = mem.department === 'BBT';

                return (
                  <div
                    key={mem.id}
                    className={`bg-surface rounded-vds-lg border p-4 hover:shadow-pop transition flex flex-col justify-between space-y-3 ${
                      isBBT ? 'border-line bg-linear-to-b from-surface-100 to-surface' : 'border-line'
                    }`}
                  >
                    <div className="space-y-2.5">
                      {/* Top Header: Avatar, Name, Username */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center font-ui font-bold text-sm shrink-0 border ${
                              isBBT
                                ? 'bg-surface-accent-faint text-accent border-line'
                                : 'bg-surface-support text-support border-line'
                            }`}
                          >
                            {mem.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-body text-sm text-ink truncate flex items-center gap-1.5" title={mem.name}>
                              <span>
                                {(() => {
                                  let sal = mem.salutation || '';
                                  let cleanName = mem.name;
                                  if (cleanName.startsWith('Anh ')) {
                                    sal = 'Anh';
                                    cleanName = cleanName.slice(4);
                                  } else if (cleanName.startsWith('Chị ')) {
                                    sal = 'Chị';
                                    cleanName = cleanName.slice(4);
                                  }
                                  return (
                                    <>
                                      {sal && <span className="font-normal text-ink-lighter">{sal} </span>}
                                      <span className="font-bold text-ink">{cleanName}</span>
                                      {mem.ipPhone && <span className="font-normal text-subdued"> - {mem.ipPhone}</span>}
                                    </>
                                  );
                                })()}
                              </span>
                            </h4>
                            {mem.username && (
                              <p className="text-xs font-mono text-subdued truncate">
                                @{mem.username}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Region Tag */}
                        {mem.region && (
                          <span
                            className={`text-[10px] font-ui font-bold px-2 py-0.5 rounded-vds-md shrink-0 border flex items-center gap-1 ${
                              mem.region === 'TP HCM'
                                ? 'bg-surface-warning text-warning border-line'
                                : 'bg-surface-200 text-support border-line'
                            }`}
                          >
                            <MapPin className="w-2.5 h-2.5" />
                            {mem.region}
                          </span>
                        )}
                      </div>

                      {/* Role & Department Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="bg-surface-200 text-ink border border-line px-2 py-0.5 rounded-vds-md font-ui font-bold text-xs">
                          {mem.title || 'Đại diện'}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-vds-md font-ui font-medium text-xs border ${
                            isBBT
                              ? 'bg-surface-accent-faint text-accent border-line'
                              : 'bg-surface-200 text-ink-lighter border-line'
                          }`}
                        >
                          {mem.department || 'Ban'}
                        </span>
                        {mem.ipPhone && (
                          <span className="bg-surface-warning text-warning px-1.5 py-0.5 rounded-vds-md border border-line font-num text-xs font-semibold flex items-center gap-1">
                            <PhoneCall className="w-2.5 h-2.5 text-warning" />
                            {mem.ipPhone}
                          </span>
                        )}
                      </div>

                      {/* Product Owner Indicator */}
                      {poProjects.length > 0 && (
                        <div className="bg-surface-accent-faint p-2 rounded-vds-lg border border-line space-y-1">
                          <span className="text-[10px] font-ui font-bold text-accent flex items-center gap-1">
                            <Award className="w-3 h-3 text-accent" />
                            Product Owner phụ trách:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {poProjects.map((p) => (
                              <span
                                key={p.id}
                                className="text-[10px] bg-surface border border-line px-1.5 py-0.5 rounded text-accent font-bold"
                              >
                                {p.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Contact Info with Copy Feature */}
                      <div className="space-y-1 text-xs font-num text-ink-lighter pt-1">
                        <div className="flex items-center justify-between group/mail">
                          <a
                            href={`mailto:${mem.email}`}
                            className="flex items-center gap-1.5 truncate hover:text-support hover:underline"
                            title={mem.email}
                          >
                            <Mail className="w-3.5 h-3.5 text-positive shrink-0" />
                            <span className="truncate">{mem.email}</span>
                          </a>
                          <button
                            type="button"
                            onClick={(e) => handleCopyEmail(mem.email, e)}
                            className="p-1 hover:bg-surface-200 rounded text-subdued hover:text-ink transition-colors ml-1 shrink-0 cursor-pointer"
                            title="Sao chép email"
                          >
                            {copiedEmail === mem.email ? (
                              <Check className="w-3.5 h-3.5 text-positive" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        {mem.gmail && (
                          <div className="flex items-center justify-between group/gmail">
                            <a
                              href={`mailto:${mem.gmail}`}
                              className="flex items-center gap-1.5 truncate text-xs text-subdued hover:text-support hover:underline"
                              title={mem.gmail}
                            >
                              <AtSign className="w-3.5 h-3.5 text-subdued-lighter shrink-0" />
                              <span className="truncate" title={mem.gmail}>
                                {mem.gmail}
                              </span>
                            </a>
                            <button
                              type="button"
                              onClick={(e) => handleCopyEmail(mem.gmail, e)}
                              className="p-1 hover:bg-surface-200 rounded text-subdued hover:text-ink transition-colors ml-1 shrink-0 cursor-pointer"
                              title="Sao chép Gmail"
                            >
                              {copiedEmail === mem.gmail ? (
                                <Check className="w-3.5 h-3.5 text-positive" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="pt-2.5 border-t border-divider flex items-center justify-between text-xs font-ui">
                      <span className="text-[10px] font-ui text-subdued">
                        Nhóm: <strong>Stakeholder</strong>
                      </span>

                      <div className="flex items-center gap-1">
                        {canEditMember(effectiveUser, mem) && (
                          <button
                            onClick={() => openEditModal(mem)}
                            className="p-1 text-subdued hover:text-ink hover:bg-surface-200 rounded-vds-md cursor-pointer"
                            title="Chỉnh sửa thông tin"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {canDeleteMember(effectiveUser, mem) && (
                          <button
                            onClick={() => {
                              if (confirm(`Xóa Stakeholder "${mem.name}"?`)) {
                                onDeleteMember(mem.id);
                              }
                            }}
                            className="p-1 text-subdued hover:text-negative hover:bg-surface-negative rounded-vds-md cursor-pointer"
                            title="Xóa Stakeholder"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT MEMBER */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in overflow-y-auto">
          <div className="bg-surface w-full max-w-lg rounded-vds-lg border border-line shadow-sheet overflow-hidden space-y-4 my-8">
            <div className="p-5 bg-surface-100 border-b border-line flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-accent" />
                <h3 className="font-title text-base font-bold text-ink">
                  {editingMember ? 'Chỉnh sửa thông tin nhân sự' : 'Thêm nhân sự mới'}
                </h3>
              </div>
              <button
                onClick={closeModal}
                className="p-1 rounded-full text-subdued hover:text-ink cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs font-body max-h-[80vh] overflow-y-auto">
              {/* Group Selector: Product vs Stakeholder */}
              <div className="space-y-1.5 bg-surface-100 p-3 rounded-vds-lg border border-line">
                <label className="font-ui font-bold text-ink block">Phân loại Nhóm nhân sự *:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMemberGroup('Product');
                      if (!department || department === 'BBT') {
                        setDepartment('Sản phẩm công nghệ');
                      }
                      if (team === 'Stakeholder') {
                        setTeam('Product Manager');
                      }
                    }}
                    className={`p-2.5 rounded-vds-lg border text-xs font-ui font-bold flex items-center justify-center gap-1.5 cursor-pointer transition ${
                      memberGroup === 'Product'
                        ? 'bg-surface-support text-support border-line '
                        : 'bg-surface text-ink-lighter border-line'
                    }`}
                  >
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>1. Nhóm Product</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMemberGroup('Stakeholder');
                      setTeam('Stakeholder');
                      if (!department || department === 'Sản phẩm công nghệ') {
                        setDepartment('BBT');
                      }
                    }}
                    className={`p-2.5 rounded-vds-lg border text-xs font-ui font-bold flex items-center justify-center gap-1.5 cursor-pointer transition ${
                      memberGroup === 'Stakeholder'
                        ? 'bg-surface-accent-faint text-accent border-line '
                        : 'bg-surface text-ink-lighter border-line'
                    }`}
                  >
                    <Building className="w-3.5 h-3.5" />
                    <span>2. Nhóm Stakeholder</span>
                  </button>
                </div>
              </div>

              {/* Salutation & Full name input */}
              <div className="grid grid-cols-4 gap-3">
                <div className="space-y-1 col-span-1">
                  <label className="font-ui font-bold text-ink-lighter">Danh xưng:</label>
                  <select
                    value={salutation}
                    onChange={(e) => setSalutation(e.target.value)}
                    className="w-full p-2.5 border border-line focus:border-line-accent rounded-vds-lg text-ink bg-surface font-medium cursor-pointer"
                  >
                    <option value="">(Không)</option>
                    <option value="Anh">Anh</option>
                    <option value="Chị">Chị</option>
                    <option value="Ông">Ông</option>
                    <option value="Bà">Bà</option>
                  </select>
                </div>
                <div className="space-y-1 col-span-3">
                  <label className="font-ui font-bold text-ink-lighter">Họ tên đầy đủ *:</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ví dụ: Phạm Văn Hiếu, Trần Huy Anh..."
                    className="w-full p-2.5 border border-line focus:border-line-accent rounded-vds-lg text-ink font-medium"
                  />
                </div>
              </div>

              {/* Last Name, First Name, Username */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-ui font-bold text-ink-lighter">Họ:</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Phạm"
                    className="w-full p-2 border border-line rounded-vds-lg text-ink"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-ui font-bold text-ink-lighter">Tên:</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Hiếu"
                    className="w-full p-2 border border-line rounded-vds-lg text-ink"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-ui font-bold text-ink-lighter">Tài khoản:</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="phamhieu"
                    className="w-full p-2 border border-line rounded-vds-lg text-ink font-mono"
                  />
                </div>
              </div>

              {/* Specific fields depending on Group */}
              {memberGroup === 'Product' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-ui font-bold text-ink-lighter">Nhóm chuyên môn:</label>
                    <select
                      value={team}
                      onChange={(e) => setTeam(e.target.value as TeamType)}
                      className="w-full p-2.5 border border-line rounded-vds-lg text-ink font-ui"
                    >
                      {PRODUCT_TEAMS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-ui font-bold text-ink-lighter">Chức vụ:</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Quản lý sản phẩm, Thiết kế..."
                      className="w-full p-2.5 border border-line rounded-vds-lg text-ink"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-ui font-bold text-ink-lighter">Ban / Đơn vị *:</label>
                    <input
                      type="text"
                      required
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="BBT, Thời sự Hà Nội, Pháp luật..."
                      className="w-full p-2.5 border border-line rounded-vds-lg text-ink font-ui"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-ui font-bold text-ink-lighter">Chức vụ *:</label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="TBT, P. TBT, Trưởng ban, Phó ban, SD..."
                      className="w-full p-2.5 border border-line rounded-vds-lg text-ink"
                    />
                  </div>
                </div>
              )}

              {/* Region, Department (for Product), IP Phone */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-ui font-bold text-ink-lighter">Vùng:</label>
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full p-2 border border-line rounded-vds-lg text-ink"
                  >
                    <option value="Hà Nội">Hà Nội</option>
                    <option value="TP HCM">TP HCM</option>
                  </select>
                </div>

                {memberGroup === 'Product' && (
                  <div className="space-y-1">
                    <label className="font-ui font-bold text-ink-lighter">Ban:</label>
                    <input
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="Sản phẩm công nghệ"
                      className="w-full p-2 border border-line rounded-vds-lg text-ink"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="font-ui font-bold text-ink-lighter">IP Phone:</label>
                  <input
                    type="text"
                    value={ipPhone}
                    onChange={(e) => setIpPhone(e.target.value)}
                    placeholder="4501, 4847..."
                    className="w-full p-2 border border-line rounded-vds-lg text-ink font-mono"
                  />
                </div>
              </div>

              {/* Email & Gmail */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-ui font-bold text-ink-lighter">Email VnExpress:</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="phamhieu@vnexpress.net"
                    className="w-full p-2 border border-line rounded-vds-lg text-ink font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-ui font-bold text-ink-lighter">Gmail cá nhân:</label>
                  <input
                    type="email"
                    value={gmail}
                    onChange={(e) => setGmail(e.target.value)}
                    placeholder="haiduyld2010@gmail.com"
                    className="w-full p-2 border border-line rounded-vds-lg text-ink font-mono"
                  />
                </div>
              </div>

              {/* Join Date & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-ui font-bold text-ink-lighter">Ngày vào công ty:</label>
                  <input
                    type="text"
                    value={joinDate}
                    onChange={(e) => setJoinDate(e.target.value)}
                    placeholder="17/02/2014"
                    className="w-full p-2 border border-line rounded-vds-lg text-ink font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-ui font-bold text-ink-lighter">Trạng thái:</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full p-2 border border-line rounded-vds-lg text-ink font-ui"
                  >
                    <option value="Sẵn sàng">🟢 Sẵn sàng</option>
                    <option value="Đang bận">🟡 Đang bận</option>
                    <option value="Vắng mặt">⚪ Vắng mặt</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-divider flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-line rounded-vds-lg text-ink font-ui font-bold cursor-pointer hover:bg-surface-200"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-positive-solid text-on-color rounded-vds-lg font-ui font-bold hover:bg-positive-solid cursor-pointer "
                >
                  {editingMember ? 'Lưu thay đổi' : 'Tạo nhân sự'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Reset Password Modal */}
      {isAdmin && resetPasswordMember && (
        <AdminResetPasswordModal
          isOpen={Boolean(resetPasswordMember)}
          member={resetPasswordMember}
          onClose={() => setResetPasswordMember(null)}
          onSuccess={(msg) => {
            setResetPasswordMember(null);
            setAdminActionNotice(msg);
          }}
        />
      )}

      {/* Admin Send Message Modal */}
      {isAdmin && effectiveUser && (
        <AdminSendMessageModal
          isOpen={isSendMessageOpen}
          members={members}
          currentUser={effectiveUser}
          initialRecipientName={selectedRecipientForMessage?.name}
          onClose={() => {
            setIsSendMessageOpen(false);
            setSelectedRecipientForMessage(null);
          }}
          onSend={async (notifs) => {
            if (onSendAdminBroadcast) {
              await onSendAdminBroadcast(notifs);
            }
            setAdminActionNotice(`Đã gửi thông điệp tới ${notifs.length} nhân sự.`);
          }}
        />
      )}
    </div>
  );
};
