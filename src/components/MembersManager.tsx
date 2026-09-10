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
  Check
} from 'lucide-react';
import { canCreateMember, canEditMember, canDeleteMember, getUserRole } from '../utils/rbac';

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
}) => {
  const effectiveUser = currentAuthUser || activeProductMember;
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

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
      <div className="bg-[#f0f0f0] p-1.5 rounded-[10px] border border-[#e0e0e0] flex items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveGroupTab('Product')}
          className={`flex-1 py-2.5 px-4 rounded-[8px] font-ui text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeGroupTab === 'Product'
              ? 'bg-white text-[#1d508d] shadow-2xs border border-[#d0d0d0]'
              : 'text-[#606060] hover:text-[#202020] hover:bg-white/60'
          }`}
        >
          <Briefcase className={`w-4 h-4 ${activeGroupTab === 'Product' ? 'text-[#1d508d]' : 'text-[#707070]'}`} />
          <span>1. Nhóm Product</span>
          <span
            className={`font-num text-[11px] px-2 py-0.5 rounded-full font-bold ${
              activeGroupTab === 'Product'
                ? 'bg-[#eef4fb] text-[#1d508d] border border-[#c2d7f0]'
                : 'bg-[#e4e4e4] text-[#707070]'
            }`}
          >
            {productMembers.length} nhân sự
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveGroupTab('Stakeholder')}
          className={`flex-1 py-2.5 px-4 rounded-[8px] font-ui text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeGroupTab === 'Stakeholder'
              ? 'bg-white text-[#b13460] shadow-2xs border border-[#d0d0d0]'
              : 'text-[#606060] hover:text-[#202020] hover:bg-white/60'
          }`}
        >
          <Building className={`w-4 h-4 ${activeGroupTab === 'Stakeholder' ? 'text-[#b13460]' : 'text-[#707070]'}`} />
          <span>2. Nhóm Stakeholder</span>
          <span
            className={`font-num text-[11px] px-2 py-0.5 rounded-full font-bold ${
              activeGroupTab === 'Stakeholder'
                ? 'bg-[#fcf0f5] text-[#b13460] border border-[#f3c2d4]'
                : 'bg-[#e4e4e4] text-[#707070]'
            }`}
          >
            {rawStakeholderMembers.length} nhân sự
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: PRODUCT MANAGEMENT VIEW */}
      {/* ========================================================================= */}
      {activeGroupTab === 'Product' && (
        <div className="space-y-8 animate-fade-in">
          {/* Sub-groups by Specialty */}
          {PRODUCT_TEAMS.map((teamName) => {
            const teamMembers = productMembers.filter((m) => m.team === teamName);

            const teamColors: Record<string, string> = {
              'Product Manager': 'bg-[#eef4fb] text-[#1d508d] border-[#c2d7f0]',
              'UX/UI Designer': 'bg-[#fcf0f5] text-[#b13460] border-[#f3c2d4]',
              SEO: 'bg-[#f0f8f1] text-[#24a148] border-[#c1e8c7]',
              Data: 'bg-[#fcf5e8] text-[#b26b00] border-[#f5dbb0]',
            };

            return (
              <div key={teamName} className="space-y-4">
                {/* Team Title Header */}
                <div className="flex items-center justify-between border-b border-[#e0e0e0] pb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-[6px] border text-xs font-ui font-bold ${
                        teamColors[teamName]
                      }`}
                    >
                      {teamName}
                    </span>
                    <span className="font-num text-xs font-bold text-[#7f7f7f]">
                      ({teamMembers.length} nhân sự)
                    </span>
                  </div>

                  {canCreateMember(effectiveUser) && (
                    <button
                      onClick={() => openAddModal('Product', teamName)}
                      className="text-xs font-ui font-bold text-[#466fa1] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm thành viên {teamName}</span>
                    </button>
                  )}
                </div>

                {/* Members Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {teamMembers.length === 0 ? (
                    <div className="col-span-full p-4 bg-white rounded-[8px] border border-dashed border-[#d6d6d6] text-center text-xs text-[#7f7f7f]">
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
                          className={`bg-white rounded-[10px] border p-4 shadow-2xs hover:shadow-md transition-all space-y-3 flex flex-col justify-between ${
                            isActiveAccount
                              ? 'border-[#963861] ring-2 ring-[#963861]/20 bg-[#fffdfd]'
                              : 'border-[#e0e0e0]'
                          }`}
                        >
                          <div className="space-y-2.5">
                            {/* Top Row: Name & Status */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-full bg-[#f0f0f0] text-[#202020] font-ui font-bold flex items-center justify-center text-sm border border-[#d6d6d6] shrink-0">
                                  {mem.name.charAt(0)}
                                </div>
                                <div>
                                  <h4 className="font-body text-sm text-[#202020] flex items-center gap-1.5 flex-wrap">
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
                                            {sal && <span className="font-normal text-[#5f5f5f]">{sal} </span>}
                                            <span className="font-bold text-[#202020]">{cleanName}</span>
                                            {mem.ipPhone && <span className="font-normal text-[#7f7f7f]"> - {mem.ipPhone}</span>}
                                          </>
                                        );
                                      })()}
                                    </span>
                                    {mem.username && (
                                      <span className="text-[11px] font-normal text-[#7f7f7f]">
                                        (@{mem.username})
                                      </span>
                                    )}
                                  </h4>
                                  <p className="text-[11px] font-ui text-[#5f5f5f]">
                                    {mem.title} • {mem.department || 'Sản phẩm công nghệ'}
                                  </p>
                                </div>
                              </div>

                              {mem.status && mem.status !== 'Sẵn sàng' && (
                                <span
                                  className={`text-[10px] font-ui font-bold px-2 py-0.5 rounded-full ${
                                    mem.status === 'Đang bận'
                                      ? 'bg-[#fcf5e8] text-[#b26b00]'
                                      : 'bg-[#f4f4f4] text-[#7f7f7f]'
                                  }`}
                                >
                                  {mem.status}
                                </span>
                              )}
                            </div>

                            {/* Detail Badges: Region, IP Phone, Join Date */}
                            <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-ui">
                              {mem.region && (
                                <span className="bg-[#f0f4f8] text-[#334e68] px-2 py-0.5 rounded-[4px] border border-[#d9e2ec] flex items-center gap-1 font-medium">
                                  <MapPin className="w-3 h-3 text-[#627d98]" />
                                  {mem.region}
                                </span>
                              )}
                              {mem.ipPhone && (
                                <span className="bg-[#fcf5e8] text-[#9c5b00] px-2 py-0.5 rounded-[4px] border border-[#f5dbb0] flex items-center gap-1 font-num font-medium">
                                  <PhoneCall className="w-3 h-3 text-[#b26b00]" />
                                  IP: {mem.ipPhone}
                                </span>
                              )}
                              {mem.joinDate && (
                                <span className="bg-[#f4f4f5] text-[#52525b] px-2 py-0.5 rounded-[4px] border border-[#e4e4e7] flex items-center gap-1 font-num">
                                  <Calendar className="w-3 h-3 text-[#a1a1aa]" />
                                  Vào: {mem.joinDate}
                                </span>
                              )}
                            </div>

                            {/* Assigned Projects */}
                            {assignedProjects.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1 pt-1">
                                <span className="text-[10px] text-[#707070] font-medium mr-1">Dự án:</span>
                                {assignedProjects.slice(0, 3).map((p) => (
                                  <span
                                    key={p.id}
                                    className="text-[10px] bg-[#f8f9fa] border border-[#e2e8f0] px-1.5 py-0.5 rounded text-[#334e68] font-medium truncate max-w-[120px]"
                                    title={p.name}
                                  >
                                    {p.name}
                                  </span>
                                ))}
                                {assignedProjects.length > 3 && (
                                  <span className="text-[10px] text-[#808080] font-num">
                                    +{assignedProjects.length - 3}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Emails with Copy Feature */}
                            <div className="space-y-1 text-xs font-num text-[#5f5f5f] pt-1">
                              <div className="flex items-center justify-between group/mail">
                                <a
                                  href={`mailto:${mem.email}`}
                                  className="flex items-center gap-1.5 truncate hover:text-[#1d508d] hover:underline"
                                  title={mem.email}
                                >
                                  <Mail className="w-3.5 h-3.5 text-[#24a148] shrink-0" />
                                  <span className="truncate">{mem.email}</span>
                                </a>
                                <button
                                  type="button"
                                  onClick={(e) => handleCopyEmail(mem.email, e)}
                                  className="p-1 hover:bg-[#f0f0f0] rounded text-[#808080] hover:text-[#202020] transition-colors ml-1 shrink-0 cursor-pointer"
                                  title="Sao chép email"
                                >
                                  {copiedEmail === mem.email ? (
                                    <Check className="w-3.5 h-3.5 text-[#24a148]" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                              {mem.gmail && (
                                <div className="flex items-center justify-between group/gmail">
                                  <a
                                    href={`mailto:${mem.gmail}`}
                                    className="flex items-center gap-1.5 truncate text-[11px] text-[#7f7f7f] hover:text-[#1d508d] hover:underline"
                                    title={mem.gmail}
                                  >
                                    <AtSign className="w-3.5 h-3.5 text-[#9f9f9f] shrink-0" />
                                    <span className="truncate">{mem.gmail}</span>
                                  </a>
                                  <button
                                    type="button"
                                    onClick={(e) => handleCopyEmail(mem.gmail, e)}
                                    className="p-1 hover:bg-[#f0f0f0] rounded text-[#808080] hover:text-[#202020] transition-colors ml-1 shrink-0 cursor-pointer"
                                    title="Sao chép Gmail"
                                  >
                                    {copiedEmail === mem.gmail ? (
                                      <Check className="w-3 h-3 text-[#24a148]" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Task assignments info */}
                          <div className="pt-3 border-t border-[#f0f0f0] flex items-center justify-between text-xs font-ui">
                            <div className="flex items-center gap-3">
                              <span className="flex items-center gap-1 text-[#5f5f5f]">
                                <Clock className="w-3.5 h-3.5 text-[#b13460]" />
                                <span>Đang làm: <strong className="font-num text-[#202020]">{activeCount}</strong></span>
                              </span>

                              <span className="flex items-center gap-1 text-[#24a148]">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Xong: <strong className="font-num">{completedCount}</strong></span>
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {onSelectProductMember && (
                                <button
                                  type="button"
                                  onClick={() => onSelectProductMember(isActiveAccount ? null : mem)}
                                  className={`px-2 py-0.5 text-[11px] font-ui font-bold rounded-[4px] transition-colors cursor-pointer ${
                                    isActiveAccount
                                      ? 'bg-[#963861] text-white'
                                      : 'bg-[#fafafa] text-[#52525b] hover:bg-[#963861] hover:text-white border border-[#d4d4d8]'
                                  }`}
                                  title={isActiveAccount ? 'Nhấp để bỏ chọn' : `Chuyển làm tài khoản chính: ${mem.name}`}
                                >
                                  {isActiveAccount ? 'Đang chọn' : 'Đăng nhập'}
                                </button>
                              )}
                              {canEditMember(effectiveUser, mem) && (
                                <button
                                  onClick={() => openEditModal(mem)}
                                  className="p-1 text-[#7f7f7f] hover:text-[#202020] hover:bg-[#f0f0f0] rounded-[4px] cursor-pointer"
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
                                  className="p-1 text-[#7f7f7f] hover:text-[#da1e28] hover:bg-[#fff0f1] rounded-[4px] cursor-pointer"
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
          <div className="bg-white p-4 rounded-[10px] border border-[#e0e0e0] shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* Region Filter */}
              <div className="flex items-center gap-1 bg-[#f4f4f4] p-1 rounded-[6px] text-xs font-ui">
                <span className="text-[#606060] font-medium px-2 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#627d98]" />
                  Vùng:
                </span>
                {(['Tất cả', 'Hà Nội', 'TP HCM'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setStakeholderRegionFilter(r)}
                    className={`px-2.5 py-1 rounded-[4px] font-semibold transition-all cursor-pointer ${
                      stakeholderRegionFilter === r
                        ? 'bg-white text-[#1d508d] shadow-2xs font-bold'
                        : 'text-[#505050] hover:text-[#202020]'
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
                  className="px-3 py-1.5 bg-white border border-[#d0d0d0] rounded-[6px] text-xs font-ui text-[#202020] font-medium focus:border-[#b13460] cursor-pointer"
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
              <Search className="w-3.5 h-3.5 text-[#7f7f7f] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={stakeholderSearchQuery}
                onChange={(e) => setStakeholderSearchQuery(e.target.value)}
                placeholder="Tìm tên, ban, chức vụ, IP..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-[#d0d0d0] rounded-[6px] text-[#202020] focus:border-[#b13460]"
              />
              {stakeholderSearchQuery && (
                <button
                  type="button"
                  onClick={() => setStakeholderSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#999] hover:text-[#333]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Stakeholders Count and Add button */}
          <div className="flex items-center justify-between px-1">
            <p className="text-xs font-ui text-[#5f5f5f]">
              Hiển thị <strong>{filteredStakeholders.length}</strong> / <strong>{rawStakeholderMembers.length}</strong> Stakeholder
              {stakeholderDeptFilter !== 'Tất cả' && ` thuộc ${stakeholderDeptFilter}`}
              {stakeholderRegionFilter !== 'Tất cả' && ` tại ${stakeholderRegionFilter}`}
            </p>

            {canCreateMember(effectiveUser) && (
              <button
                onClick={() => openAddModal('Stakeholder')}
                className="text-xs font-ui font-bold text-[#b13460] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm Stakeholder</span>
              </button>
            )}
          </div>

          {/* Stakeholders Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredStakeholders.length === 0 ? (
              <div className="col-span-full p-8 bg-white rounded-[10px] border border-dashed border-[#d6d6d6] text-center text-xs text-[#7f7f7f] space-y-2">
                <Users className="w-8 h-8 text-[#b0b0b0] mx-auto" />
                <p>Không tìm thấy Stakeholder nào phù hợp với bộ lọc hiện tại.</p>
                <button
                  onClick={() => {
                    setStakeholderDeptFilter('Tất cả');
                    setStakeholderRegionFilter('Tất cả');
                    setStakeholderSearchQuery('');
                  }}
                  className="text-xs text-[#1d508d] font-semibold underline cursor-pointer"
                >
                  Đặt lại bộ lọc
                </button>
              </div>
            ) : (
              filteredStakeholders.map((mem) => {
                // Find projects where this stakeholder is PO
                const poProjects = projects.filter(
                  (p) => p.productOwner && (p.productOwner.includes(mem.name) || mem.name.includes(p.productOwner))
                );

                const isBBT = mem.department === 'BBT';

                return (
                  <div
                    key={mem.id}
                    className={`bg-white rounded-[10px] border p-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-3 ${
                      isBBT ? 'border-[#e4c4d0] bg-linear-to-b from-[#fffbfc] to-white' : 'border-[#e0e0e0]'
                    }`}
                  >
                    <div className="space-y-2.5">
                      {/* Top Header: Avatar, Name, Username */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center font-ui font-bold text-sm shrink-0 border ${
                              isBBT
                                ? 'bg-[#fcf0f5] text-[#b13460] border-[#f3c2d4]'
                                : 'bg-[#eef4fb] text-[#1d508d] border-[#c2d7f0]'
                            }`}
                          >
                            {mem.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-body text-sm text-[#202020] truncate flex items-center gap-1.5" title={mem.name}>
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
                                      {sal && <span className="font-normal text-[#5f5f5f]">{sal} </span>}
                                      <span className="font-bold text-[#202020]">{cleanName}</span>
                                      {mem.ipPhone && <span className="font-normal text-[#7f7f7f]"> - {mem.ipPhone}</span>}
                                    </>
                                  );
                                })()}
                              </span>
                            </h4>
                            {mem.username && (
                              <p className="text-[11px] font-mono text-[#7f7f7f] truncate">
                                @{mem.username}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Region Tag */}
                        {mem.region && (
                          <span
                            className={`text-[10px] font-ui font-bold px-2 py-0.5 rounded-[4px] shrink-0 border flex items-center gap-1 ${
                              mem.region === 'TP HCM'
                                ? 'bg-[#fdf4e8] text-[#b26b00] border-[#f5dbb0]'
                                : 'bg-[#f0f4f8] text-[#334e68] border-[#d9e2ec]'
                            }`}
                          >
                            <MapPin className="w-2.5 h-2.5" />
                            {mem.region}
                          </span>
                        )}
                      </div>

                      {/* Role & Department Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="bg-[#f1f5f9] text-[#1e293b] border border-[#cbd5e1] px-2 py-0.5 rounded-[4px] font-ui font-bold text-[11px]">
                          {mem.title || 'Đại diện'}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-[4px] font-ui font-medium text-[11px] border ${
                            isBBT
                              ? 'bg-[#fcf0f5] text-[#b13460] border-[#f3c2d4]'
                              : 'bg-[#f4f4f4] text-[#404040] border-[#e0e0e0]'
                          }`}
                        >
                          {mem.department || 'Ban'}
                        </span>
                        {mem.ipPhone && (
                          <span className="bg-[#fcf5e8] text-[#9c5b00] px-1.5 py-0.5 rounded-[4px] border border-[#f5dbb0] font-num text-[11px] font-semibold flex items-center gap-1">
                            <PhoneCall className="w-2.5 h-2.5 text-[#b26b00]" />
                            {mem.ipPhone}
                          </span>
                        )}
                      </div>

                      {/* Product Owner Indicator */}
                      {poProjects.length > 0 && (
                        <div className="bg-[#fcf0f5] p-2 rounded-[6px] border border-[#f3c2d4] space-y-1">
                          <span className="text-[10px] font-ui font-bold text-[#b13460] flex items-center gap-1">
                            <Award className="w-3 h-3 text-[#b13460]" />
                            Product Owner phụ trách:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {poProjects.map((p) => (
                              <span
                                key={p.id}
                                className="text-[10px] bg-white border border-[#f3c2d4] px-1.5 py-0.5 rounded text-[#b13460] font-bold"
                              >
                                {p.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Contact Info with Copy Feature */}
                      <div className="space-y-1 text-xs font-num text-[#5f5f5f] pt-1">
                        <div className="flex items-center justify-between group/mail">
                          <a
                            href={`mailto:${mem.email}`}
                            className="flex items-center gap-1.5 truncate hover:text-[#1d508d] hover:underline"
                            title={mem.email}
                          >
                            <Mail className="w-3.5 h-3.5 text-[#24a148] shrink-0" />
                            <span className="truncate">{mem.email}</span>
                          </a>
                          <button
                            type="button"
                            onClick={(e) => handleCopyEmail(mem.email, e)}
                            className="p-1 hover:bg-[#f0f0f0] rounded text-[#808080] hover:text-[#202020] transition-colors ml-1 shrink-0 cursor-pointer"
                            title="Sao chép email"
                          >
                            {copiedEmail === mem.email ? (
                              <Check className="w-3.5 h-3.5 text-[#24a148]" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        {mem.gmail && (
                          <div className="flex items-center justify-between group/gmail">
                            <a
                              href={`mailto:${mem.gmail}`}
                              className="flex items-center gap-1.5 truncate text-[11px] text-[#7f7f7f] hover:text-[#1d508d] hover:underline"
                              title={mem.gmail}
                            >
                              <AtSign className="w-3.5 h-3.5 text-[#9f9f9f] shrink-0" />
                              <span className="truncate" title={mem.gmail}>
                                {mem.gmail}
                              </span>
                            </a>
                            <button
                              type="button"
                              onClick={(e) => handleCopyEmail(mem.gmail, e)}
                              className="p-1 hover:bg-[#f0f0f0] rounded text-[#808080] hover:text-[#202020] transition-colors ml-1 shrink-0 cursor-pointer"
                              title="Sao chép Gmail"
                            >
                              {copiedEmail === mem.gmail ? (
                                <Check className="w-3.5 h-3.5 text-[#24a148]" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="pt-2.5 border-t border-[#f0f0f0] flex items-center justify-between text-xs font-ui">
                      <span className="text-[10px] font-ui text-[#808080]">
                        Nhóm: <strong>Stakeholder</strong>
                      </span>

                      <div className="flex items-center gap-1">
                        {canEditMember(effectiveUser, mem) && (
                          <button
                            onClick={() => openEditModal(mem)}
                            className="p-1 text-[#7f7f7f] hover:text-[#202020] hover:bg-[#f0f0f0] rounded-[4px] cursor-pointer"
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
                            className="p-1 text-[#7f7f7f] hover:text-[#da1e28] hover:bg-[#fff0f1] rounded-[4px] cursor-pointer"
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
          <div className="bg-white w-full max-w-lg rounded-[12px] border border-[#d6d6d6] shadow-xl overflow-hidden space-y-4 my-8">
            <div className="p-5 bg-[#fafafa] border-b border-[#e6e6e6] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#b13460]" />
                <h3 className="font-title text-base font-bold text-[#202020]">
                  {editingMember ? 'Chỉnh sửa thông tin nhân sự' : 'Thêm nhân sự mới'}
                </h3>
              </div>
              <button
                onClick={closeModal}
                className="p-1 rounded-full text-[#7f7f7f] hover:text-[#202020] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs font-body max-h-[80vh] overflow-y-auto">
              {/* Group Selector: Product vs Stakeholder */}
              <div className="space-y-1.5 bg-[#f8f9fa] p-3 rounded-[8px] border border-[#e0e0e0]">
                <label className="font-ui font-bold text-[#303030] block">Phân loại Nhóm nhân sự *:</label>
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
                    className={`p-2.5 rounded-[6px] border text-xs font-ui font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                      memberGroup === 'Product'
                        ? 'bg-[#eef4fb] text-[#1d508d] border-[#c2d7f0] shadow-2xs'
                        : 'bg-white text-[#505050] border-[#d0d0d0]'
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
                    className={`p-2.5 rounded-[6px] border text-xs font-ui font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                      memberGroup === 'Stakeholder'
                        ? 'bg-[#fcf0f5] text-[#b13460] border-[#f3c2d4] shadow-2xs'
                        : 'bg-white text-[#505050] border-[#d0d0d0]'
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
                  <label className="font-ui font-bold text-[#5f5f5f]">Danh xưng:</label>
                  <select
                    value={salutation}
                    onChange={(e) => setSalutation(e.target.value)}
                    className="w-full p-2.5 border border-[#d6d6d6] focus:border-[#b13460] rounded-[6px] text-[#202020] bg-white font-medium cursor-pointer"
                  >
                    <option value="">(Không)</option>
                    <option value="Anh">Anh</option>
                    <option value="Chị">Chị</option>
                    <option value="Ông">Ông</option>
                    <option value="Bà">Bà</option>
                  </select>
                </div>
                <div className="space-y-1 col-span-3">
                  <label className="font-ui font-bold text-[#5f5f5f]">Họ tên đầy đủ *:</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ví dụ: Phạm Văn Hiếu, Trần Huy Anh..."
                    className="w-full p-2.5 border border-[#d6d6d6] focus:border-[#b13460] rounded-[6px] text-[#202020] font-medium"
                  />
                </div>
              </div>

              {/* Last Name, First Name, Username */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-ui font-bold text-[#5f5f5f]">Họ:</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Phạm"
                    className="w-full p-2 border border-[#d6d6d6] rounded-[6px] text-[#202020]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-ui font-bold text-[#5f5f5f]">Tên:</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Hiếu"
                    className="w-full p-2 border border-[#d6d6d6] rounded-[6px] text-[#202020]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-ui font-bold text-[#5f5f5f]">Tài khoản:</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="phamhieu"
                    className="w-full p-2 border border-[#d6d6d6] rounded-[6px] text-[#202020] font-mono"
                  />
                </div>
              </div>

              {/* Specific fields depending on Group */}
              {memberGroup === 'Product' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-ui font-bold text-[#5f5f5f]">Nhóm chuyên môn:</label>
                    <select
                      value={team}
                      onChange={(e) => setTeam(e.target.value as TeamType)}
                      className="w-full p-2.5 border border-[#d6d6d6] rounded-[6px] text-[#202020] font-ui"
                    >
                      {PRODUCT_TEAMS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-ui font-bold text-[#5f5f5f]">Chức vụ:</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Quản lý sản phẩm, Thiết kế..."
                      className="w-full p-2.5 border border-[#d6d6d6] rounded-[6px] text-[#202020]"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-ui font-bold text-[#5f5f5f]">Ban / Đơn vị *:</label>
                    <input
                      type="text"
                      required
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="BBT, Thời sự Hà Nội, Pháp luật..."
                      className="w-full p-2.5 border border-[#d6d6d6] rounded-[6px] text-[#202020] font-ui"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-ui font-bold text-[#5f5f5f]">Chức vụ *:</label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="TBT, P. TBT, Trưởng ban, Phó ban, SD..."
                      className="w-full p-2.5 border border-[#d6d6d6] rounded-[6px] text-[#202020]"
                    />
                  </div>
                </div>
              )}

              {/* Region, Department (for Product), IP Phone */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-ui font-bold text-[#5f5f5f]">Vùng:</label>
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full p-2 border border-[#d6d6d6] rounded-[6px] text-[#202020]"
                  >
                    <option value="Hà Nội">Hà Nội</option>
                    <option value="TP HCM">TP HCM</option>
                  </select>
                </div>

                {memberGroup === 'Product' && (
                  <div className="space-y-1">
                    <label className="font-ui font-bold text-[#5f5f5f]">Ban:</label>
                    <input
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="Sản phẩm công nghệ"
                      className="w-full p-2 border border-[#d6d6d6] rounded-[6px] text-[#202020]"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="font-ui font-bold text-[#5f5f5f]">IP Phone:</label>
                  <input
                    type="text"
                    value={ipPhone}
                    onChange={(e) => setIpPhone(e.target.value)}
                    placeholder="4501, 4847..."
                    className="w-full p-2 border border-[#d6d6d6] rounded-[6px] text-[#202020] font-mono"
                  />
                </div>
              </div>

              {/* Email & Gmail */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-ui font-bold text-[#5f5f5f]">Email VnExpress:</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="phamhieu@vnexpress.net"
                    className="w-full p-2 border border-[#d6d6d6] rounded-[6px] text-[#202020] font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-ui font-bold text-[#5f5f5f]">Gmail cá nhân:</label>
                  <input
                    type="email"
                    value={gmail}
                    onChange={(e) => setGmail(e.target.value)}
                    placeholder="haiduyld2010@gmail.com"
                    className="w-full p-2 border border-[#d6d6d6] rounded-[6px] text-[#202020] font-mono"
                  />
                </div>
              </div>

              {/* Join Date & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-ui font-bold text-[#5f5f5f]">Ngày vào công ty:</label>
                  <input
                    type="text"
                    value={joinDate}
                    onChange={(e) => setJoinDate(e.target.value)}
                    placeholder="17/02/2014"
                    className="w-full p-2 border border-[#d6d6d6] rounded-[6px] text-[#202020] font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-ui font-bold text-[#5f5f5f]">Trạng thái:</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full p-2 border border-[#d6d6d6] rounded-[6px] text-[#202020] font-ui"
                  >
                    <option value="Sẵn sàng">🟢 Sẵn sàng</option>
                    <option value="Đang bận">🟡 Đang bận</option>
                    <option value="Vắng mặt">⚪ Vắng mặt</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-[#f0f0f0] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-[#d6d6d6] rounded-[6px] text-[#202020] font-ui font-bold cursor-pointer hover:bg-[#f4f4f4]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#24a148] text-white rounded-[6px] font-ui font-bold hover:bg-[#1d8239] cursor-pointer shadow-2xs"
                >
                  {editingMember ? 'Lưu thay đổi' : 'Tạo nhân sự'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
