/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { MemberItem, TaskItem, ProjectItem } from '../types';
import { getMemberPersonalStats } from '../utils/memberPersonalization';
import {
  Briefcase,
  Clock,
  AlertTriangle,
  X,
  Phone,
  Sparkles,
  Filter,
  User,
  Star,
  Globe,
} from 'lucide-react';

export type TaskPersonalScope = 'my_tasks' | 'my_projects_tasks' | 'all';

interface PersonalizationBannerProps {
  member: MemberItem;
  currentAuthUser?: MemberItem | null;
  tasks: TaskItem[];
  projects: ProjectItem[];
  personalScope: TaskPersonalScope;
  onChangeScope: (scope: TaskPersonalScope) => void;
  onClearMember: () => void;
  onSelectMyTasks?: () => void;
}

export const PersonalizationBanner: React.FC<PersonalizationBannerProps> = ({
  member,
  currentAuthUser,
  tasks,
  projects,
  personalScope,
  onChangeScope,
  onClearMember,
  onSelectMyTasks,
}) => {
  const stats = getMemberPersonalStats(member, tasks, projects);
  const isMe = currentAuthUser && member.id === currentAuthUser.id;

  return (
    <div
      className={`border rounded-[12px] p-4 shadow-sm space-y-3 relative overflow-hidden transition-all ${
        isMe
          ? 'bg-[#ffffff] border-[#963861]/30'
          : 'bg-[#ffffff] border-[#3b82f6]/30'
      }`}
    >
      {/* Main Info Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-full text-white font-title font-bold text-sm flex items-center justify-center shadow-xs shrink-0 ${
              isMe ? 'bg-[#963861]' : 'bg-[#2563eb]'
            }`}
          >
            {member.name.split(' ').slice(-1)[0].slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-ui text-[#71717a]">
                {member.salutation || 'Thành viên'}
              </span>
              <h3 className="font-title text-base font-bold text-[#18181b]">
                {member.name}
              </h3>
              {member.ipPhone && (
                <span className="text-xs font-num text-[#71717a] bg-[#f4f4f5] px-2 py-0.5 rounded-full border border-[#e4e4e7] flex items-center gap-1">
                  <Phone className="w-3 h-3 text-[#71717a]" />
                  <span>IP: {member.ipPhone}</span>
                </span>
              )}
            </div>
            <p className="text-xs font-ui text-[#963861] font-medium">
              {member.title || member.team}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
        <div className="bg-[#fafafa] border border-[#e4e4e7] rounded-[8px] p-2.5 text-left">
          <span className="text-[11px] font-ui text-[#71717a] block">
            Đang làm
          </span>
          <span className="font-num text-base font-bold text-[#18181b]">
            {stats.activeTasks}
          </span>
        </div>

        <div className="bg-[#fff7ed] border border-[#ffedd5] rounded-[8px] p-2.5 text-left">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-ui text-[#c2410c]">Hạn hôm nay</span>
            <Clock className="w-3 h-3 text-[#ea580c]" />
          </div>
          <span className="font-num text-base font-bold text-[#c2410c]">
            {stats.todayTasks}
          </span>
        </div>

        <div className="bg-[#fef2f2] border border-[#fee2e2] rounded-[8px] p-2.5 text-left">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-ui text-[#dc2626]">Quá hạn</span>
            <AlertTriangle className="w-3 h-3 text-[#dc2626]" />
          </div>
          <span className="font-num text-base font-bold text-[#dc2626]">
            {stats.overdueTasks}
          </span>
        </div>

        <div className="bg-[#eff6ff] border border-[#dbeafe] rounded-[8px] p-2.5 text-left">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-ui text-[#1d4ed8]">Dự án tham gia</span>
            <Briefcase className="w-3 h-3 text-[#2563eb]" />
          </div>
          <span className="font-num text-base font-bold text-[#1d4ed8]">
            {stats.relatedProjectsCount}
          </span>
        </div>
      </div>

      {/* Segmented Perspective Control */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#f0f0f0]">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-ui text-[#71717a] flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5 text-[#963861]" />
            <span>Lọc:</span>
          </span>

          <button
            onClick={() => onChangeScope('my_tasks')}
            className={`px-3 py-1 rounded-[6px] text-xs font-ui font-bold transition-all cursor-pointer ${
              personalScope === 'my_tasks'
                ? isMe
                  ? 'bg-[#963861] text-white shadow-2xs'
                  : 'bg-[#2563eb] text-white shadow-2xs'
                : 'bg-[#f4f4f5] text-[#52525b] hover:bg-[#e4e4e7]'
            }`}
          >
            {isMe ? `⭐ Của tôi (${stats.activeTasks})` : `👤 Việc ${member.name.split(' ').slice(-1)[0]} phụ trách (${stats.activeTasks})`}
          </button>

          <button
            onClick={() => onChangeScope('my_projects_tasks')}
            className={`px-3 py-1 rounded-[6px] text-xs font-ui font-bold transition-all cursor-pointer ${
              personalScope === 'my_projects_tasks'
                ? isMe
                  ? 'bg-[#963861] text-white shadow-2xs'
                  : 'bg-[#2563eb] text-white shadow-2xs'
                : 'bg-[#f4f4f5] text-[#52525b] hover:bg-[#e4e4e7]'
            }`}
          >
            📁 Dự án của tôi
          </button>

          <button
            onClick={() => {
              onChangeScope('all');
              onClearMember();
            }}
            className="px-3 py-1 rounded-[6px] text-xs font-ui font-medium bg-[#f4f4f5] text-[#52525b] hover:bg-[#e4e4e7] transition-all cursor-pointer flex items-center gap-1"
            title="Quay lại hiển thị toàn bộ công việc"
          >
            <Globe className="w-3 h-3" />
            <span>Toàn bộ phận</span>
          </button>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {!isMe && currentAuthUser && onSelectMyTasks && (
            <button
              onClick={onSelectMyTasks}
              className="text-xs font-ui text-[#963861] hover:underline font-bold flex items-center gap-1 cursor-pointer"
            >
              <Star className="w-3 h-3 fill-current" />
              <span>Của tôi</span>
            </button>
          )}

          <button
            onClick={onClearMember}
            className="text-xs font-ui text-[#71717a] hover:text-[#dc2626] flex items-center gap-1 transition-colors cursor-pointer ml-1"
            title="Thoát bộ lọc nhân sự để xem toàn bộ phận"
          >
            <X className="w-3.5 h-3.5" />
            <span>Toàn bộ phận</span>
          </button>
        </div>
      </div>
    </div>
  );
};
