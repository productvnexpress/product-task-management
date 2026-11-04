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
} from './vds/icons';

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
      className={`border rounded-vds-lg p-4 space-y-3 relative overflow-hidden transition ${
        isMe
          ? 'bg-surface border-line-accent/30'
          : 'bg-surface border-line-info/30'
      }`}
    >
      {/* Main Info Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-full text-on-color font-title font-bold text-sm flex items-center justify-center shrink-0 ${
              isMe ? 'bg-accent-solid' : 'bg-support-solid'
            }`}
          >
            {member.name.split(' ').slice(-1)[0].slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-ui text-subdued">
                {member.salutation || 'Thành viên'}
              </span>
              <h3 className="font-title text-base font-bold text-ink">
                {member.name}
              </h3>
              {member.ipPhone && (
                <span className="text-xs font-num text-subdued bg-surface-200 px-2 py-0.5 rounded-full border border-line flex items-center gap-1">
                  <Phone className="w-3 h-3 text-subdued" />
                  <span>IP: {member.ipPhone}</span>
                </span>
              )}
            </div>
            <p className="text-xs font-ui text-accent font-medium">
              {member.title || member.team}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
        <div className="bg-surface-100 border border-line rounded-vds-lg p-2.5 text-left">
          <span className="text-xs font-ui text-subdued block">
            Đang làm
          </span>
          <span className="font-num text-base font-bold text-ink">
            {stats.activeTasks}
          </span>
        </div>

        <div className="bg-surface-warning border border-line rounded-vds-lg p-2.5 text-left">
          <div className="flex items-center justify-between">
            <span className="text-xs font-ui text-warning">Hạn hôm nay</span>
            <Clock className="w-3 h-3 text-warning" />
          </div>
          <span className="font-num text-base font-bold text-warning">
            {stats.todayTasks}
          </span>
        </div>

        <div className="bg-surface-negative border border-line rounded-vds-lg p-2.5 text-left">
          <div className="flex items-center justify-between">
            <span className="text-xs font-ui text-negative">Quá hạn</span>
            <AlertTriangle className="w-3 h-3 text-negative" />
          </div>
          <span className="font-num text-base font-bold text-negative">
            {stats.overdueTasks}
          </span>
        </div>

        <div className="bg-surface-info border border-line rounded-vds-lg p-2.5 text-left">
          <div className="flex items-center justify-between">
            <span className="text-xs font-ui text-info">Dự án tham gia</span>
            <Briefcase className="w-3 h-3 text-info" />
          </div>
          <span className="font-num text-base font-bold text-info">
            {stats.relatedProjectsCount}
          </span>
        </div>
      </div>

      {/* Segmented Perspective Control */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-divider">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-ui text-subdued flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5 text-accent" />
            <span>Lọc:</span>
          </span>

          <button
            onClick={() => onChangeScope('my_tasks')}
            className={`px-3 py-1 rounded-vds-lg text-xs font-ui font-bold transition cursor-pointer ${
              personalScope === 'my_tasks'
                ? isMe
                  ? 'bg-surface-selected text-accent ring-1 ring-inset ring-line-accent-soft'
                  : 'bg-support-solid text-on-color '
                : 'bg-surface-200 text-ink-lighter hover:bg-surface-300'
            }`}
          >
            {isMe ? `⭐ Của tôi (${stats.activeTasks})` : `👤 Việc ${member.name.split(' ').slice(-1)[0]} phụ trách (${stats.activeTasks})`}
          </button>

          <button
            onClick={() => onChangeScope('my_projects_tasks')}
            className={`px-3 py-1 rounded-vds-lg text-xs font-ui font-bold transition cursor-pointer ${
              personalScope === 'my_projects_tasks'
                ? isMe
                  ? 'bg-surface-selected text-accent ring-1 ring-inset ring-line-accent-soft'
                  : 'bg-support-solid text-on-color '
                : 'bg-surface-200 text-ink-lighter hover:bg-surface-300'
            }`}
          >
            📁 Dự án của tôi
          </button>

          <button
            onClick={() => {
              onChangeScope('all');
              onClearMember();
            }}
            className="px-3 py-1 rounded-vds-lg text-xs font-ui font-medium bg-surface-200 text-ink-lighter hover:bg-surface-300 transition cursor-pointer flex items-center gap-1"
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
              className="text-xs font-ui text-accent hover:underline font-bold flex items-center gap-1 cursor-pointer"
            >
              <Star className="w-3 h-3 fill-current" />
              <span>Của tôi</span>
            </button>
          )}

          <button
            onClick={onClearMember}
            className="text-xs font-ui text-subdued hover:text-negative flex items-center gap-1 transition-colors cursor-pointer ml-1"
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
