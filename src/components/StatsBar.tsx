/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { TaskItem, TeamType } from '../types';
import { formatPercentage, formatVnNumber } from '../utils/formatters';
import { AlertCircle, CheckCircle2, Clock, PlayCircle, Layers } from './vds/icons';

interface StatsBarProps {
  tasks: TaskItem[];
  selectedTeam: 'Tất cả' | TeamType;
  onSelectTeam: (team: 'Tất cả' | TeamType) => void;
  statusFilter: string;
  onSelectStatus: (status: any) => void;
}

export const StatsBar: React.FC<StatsBarProps> = ({
  tasks,
  selectedTeam,
  onSelectTeam,
  statusFilter,
  onSelectStatus,
}) => {
  const filteredByTeam = selectedTeam === 'Tất cả' 
    ? tasks 
    : tasks.filter(t => t.team === selectedTeam);

  const total = filteredByTeam.length;
  const notStarted = filteredByTeam.filter(t => t.status === 'Chưa làm').length;
  const inProgress = filteredByTeam.filter(t => t.status === 'Đang làm').length;
  const blocked = filteredByTeam.filter(t => t.status === 'Bị nghẽn').length;
  const completed = filteredByTeam.filter(t => t.status === 'Hoàn thành').length;

  const avgProgress = total > 0 
    ? filteredByTeam.reduce((acc, t) => acc + t.progress, 0) / total 
    : 0;

  const teams: ('Tất cả' | TeamType)[] = [
    'Tất cả',
    'Product Manager',
    'UX/UI Designer',
    'SEO',
    'Data',
  ];

  return (
    <div className="bg-surface border-b border-line pb-3 pt-2">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Top row: Team tabs (VnExpress styled tabs) */}
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3 border-b border-divider pb-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-ui text-xs text-subdued mr-1">Bộ phận:</span>
            {teams.map(team => {
              const count = team === 'Tất cả' ? tasks.length : tasks.filter(t => t.team === team).length;
              const isSelected = selectedTeam === team;
              return (
                <button
                  key={team}
                  onClick={() => onSelectTeam(team)}
                  className={`h-[32px] px-3 rounded-vds-lg text-[13px] font-ui transition-colors flex items-center gap-1.5 state-layer-std ${
                    isSelected
                      ? 'bg-surface-selected text-accent font-bold ring-1 ring-inset ring-line-accent-soft'
                      : 'bg-surface-100 text-ink-lighter hover:text-ink border border-line'
                  }`}
                >
                  <span>{team}</span>
                  <span className={`text-xs px-1.5 py-0.2 rounded-full font-num ${
                    isSelected ? 'bg-[rgba(255,255,255,0.25)] text-on-color' : 'bg-surface-300 text-ink-lighter'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick status progress summary indicator */}
          <div className="flex items-center gap-2 text-xs font-body text-ink-lighter">
            <span>Tiến độ chung:</span>
            <div className="w-24 h-2 bg-surface-300 rounded-vds-sm overflow-hidden">
              <div
                className="h-full bg-positive-solid transition"
                style={{ width: `${avgProgress}%` }}
              />
            </div>
            <span className="font-num font-bold text-ink">
              {formatPercentage(avgProgress)}
            </span>
          </div>
        </div>

        {/* Bottom row: Quick Metric Badges (clickable to filter status rapidly) */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {/* Total */}
          <button
            onClick={() => onSelectStatus('Tất cả')}
            className={`p-2.5 rounded-vds-md border text-left transition-colors state-layer-std ${
              statusFilter === 'Tất cả'
                ? 'bg-surface-200 border-line-strong'
                : 'bg-surface-100 border-line hover:border-line-regular'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-ui text-xs text-ink-lighter flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-ink-lighter" />
                Tổng công việc
              </span>
              <span className="font-num text-lg font-bold text-ink">
                {formatVnNumber(total)}
              </span>
            </div>
          </button>

          {/* Chưa làm */}
          <button
            onClick={() => onSelectStatus(statusFilter === 'Chưa làm' ? 'Tất cả' : 'Chưa làm')}
            className={`p-2.5 rounded-vds-md border text-left transition-colors state-layer-std ${
              statusFilter === 'Chưa làm'
                ? 'bg-surface-200 border-line-strong'
                : 'bg-surface-100 border-line hover:border-line-regular'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-ui text-xs text-ink-lighter flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-subdued" />
                Chưa làm
              </span>
              <span className="font-num text-lg font-bold text-ink">
                {formatVnNumber(notStarted)}
              </span>
            </div>
          </button>

          {/* In progress */}
          <button
            onClick={() => onSelectStatus(statusFilter === 'Đang làm' ? 'Tất cả' : 'Đang làm')}
            className={`p-2.5 rounded-vds-md border text-left transition-colors state-layer-std ${
              statusFilter === 'Đang làm'
                ? 'bg-surface-support border-line-support'
                : 'bg-surface-100 border-line hover:border-line-regular'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-ui text-xs text-support flex items-center gap-1">
                <PlayCircle className="w-3.5 h-3.5 text-support" />
                Đang làm
              </span>
              <span className="font-num text-lg font-bold text-support">
                {formatVnNumber(inProgress)}
              </span>
            </div>
          </button>

          {/* Blocked (Vướng mắc/Nghẽn) */}
          <button
            onClick={() => onSelectStatus(statusFilter === 'Bị nghẽn' ? 'Tất cả' : 'Bị nghẽn')}
            className={`p-2.5 rounded-vds-md border text-left transition-colors state-layer-std ${
              statusFilter === 'Bị nghẽn'
                ? 'bg-surface-negative border-line-negative'
                : blocked > 0
                ? 'bg-surface-negative/40 border-line-negative/50 hover:border-line-negative'
                : 'bg-surface-100 border-line hover:border-line-regular'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-ui text-xs text-negative flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-negative" />
                Bị nghẽn
              </span>
              <span className="font-num text-lg font-bold text-negative">
                {formatVnNumber(blocked)}
              </span>
            </div>
          </button>

          {/* Completed */}
          <button
            onClick={() => onSelectStatus(statusFilter === 'Hoàn thành' ? 'Tất cả' : 'Hoàn thành')}
            className={`p-2.5 rounded-vds-md border text-left transition-colors state-layer-std ${
              statusFilter === 'Hoàn thành'
                ? 'bg-surface-positive border-line-positive'
                : 'bg-surface-100 border-line hover:border-line-regular'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-ui text-xs text-positive flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-positive" />
                Hoàn thành
              </span>
              <span className="font-num text-lg font-bold text-positive">
                {formatVnNumber(completed)}
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
