/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { TaskItem, TeamType } from '../types';
import { formatPercentage, formatVnNumber } from '../utils/formatters';
import { AlertCircle, CheckCircle2, Clock, PlayCircle, Layers } from 'lucide-react';

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
    <div className="bg-[#ffffff] border-b border-[rgba(0,0,0,0.15)] pb-3 pt-2">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Top row: Team tabs (VnExpress styled tabs) */}
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3 border-b border-[rgba(0,0,0,0.06)] pb-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-ui text-xs text-[#7f7f7f] mr-1">Bộ phận:</span>
            {teams.map(team => {
              const count = team === 'Tất cả' ? tasks.length : tasks.filter(t => t.team === team).length;
              const isSelected = selectedTeam === team;
              return (
                <button
                  key={team}
                  onClick={() => onSelectTeam(team)}
                  className={`h-[32px] px-3 rounded-[8px] text-[13px] font-ui transition-colors flex items-center gap-1.5 state-layer-std ${
                    isSelected
                      ? 'bg-[#b13460] text-[#ffffff] font-bold'
                      : 'bg-[#fafafa] text-[#5f5f5f] hover:text-[#202020] border border-[#d6d6d6]'
                  }`}
                >
                  <span>{team}</span>
                  <span className={`text-xs px-1.5 py-0.2 rounded-full font-num ${
                    isSelected ? 'bg-[rgba(255,255,255,0.25)] text-[#ffffff]' : 'bg-[#ececec] text-[#5f5f5f]'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick status progress summary indicator */}
          <div className="flex items-center gap-2 text-xs font-body text-[#5f5f5f]">
            <span>Tiến độ chung:</span>
            <div className="w-24 h-2 bg-[#ececec] rounded-[2px] overflow-hidden">
              <div
                className="h-full bg-[#24a148] transition-all"
                style={{ width: `${avgProgress}%` }}
              />
            </div>
            <span className="font-num font-bold text-[#202020]">
              {formatPercentage(avgProgress)}
            </span>
          </div>
        </div>

        {/* Bottom row: Quick Metric Badges (clickable to filter status rapidly) */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {/* Total */}
          <button
            onClick={() => onSelectStatus('Tất cả')}
            className={`p-2.5 rounded-[4px] border text-left transition-colors state-layer-std ${
              statusFilter === 'Tất cả'
                ? 'bg-[#f3f3f3] border-[#5f5f5f]'
                : 'bg-[#fafafa] border-[#d6d6d6] hover:border-[#9f9f9f]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-ui text-xs text-[#5f5f5f] flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-[#5f5f5f]" />
                Tổng công việc
              </span>
              <span className="font-num text-lg font-bold text-[#202020]">
                {formatVnNumber(total)}
              </span>
            </div>
          </button>

          {/* Chưa làm */}
          <button
            onClick={() => onSelectStatus(statusFilter === 'Chưa làm' ? 'Tất cả' : 'Chưa làm')}
            className={`p-2.5 rounded-[4px] border text-left transition-colors state-layer-std ${
              statusFilter === 'Chưa làm'
                ? 'bg-[#f4f4f5] border-[#71717a]'
                : 'bg-[#fafafa] border-[#d6d6d6] hover:border-[#9f9f9f]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-ui text-xs text-[#52525b] flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#71717a]" />
                Chưa làm
              </span>
              <span className="font-num text-lg font-bold text-[#202020]">
                {formatVnNumber(notStarted)}
              </span>
            </div>
          </button>

          {/* In progress */}
          <button
            onClick={() => onSelectStatus(statusFilter === 'Đang làm' ? 'Tất cả' : 'Đang làm')}
            className={`p-2.5 rounded-[4px] border text-left transition-colors state-layer-std ${
              statusFilter === 'Đang làm'
                ? 'bg-[#eaf0f8] border-[#466fa1]'
                : 'bg-[#fafafa] border-[#d6d6d6] hover:border-[#9f9f9f]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-ui text-xs text-[#365983] flex items-center gap-1">
                <PlayCircle className="w-3.5 h-3.5 text-[#466fa1]" />
                Đang làm
              </span>
              <span className="font-num text-lg font-bold text-[#365983]">
                {formatVnNumber(inProgress)}
              </span>
            </div>
          </button>

          {/* Blocked (Vướng mắc/Nghẽn) */}
          <button
            onClick={() => onSelectStatus(statusFilter === 'Bị nghẽn' ? 'Tất cả' : 'Bị nghẽn')}
            className={`p-2.5 rounded-[4px] border text-left transition-colors state-layer-std ${
              statusFilter === 'Bị nghẽn'
                ? 'bg-[#f8d4d6] border-[#da1e28]'
                : blocked > 0
                ? 'bg-[#f8d4d6]/40 border-[#da1e28]/50 hover:border-[#da1e28]'
                : 'bg-[#fafafa] border-[#d6d6d6] hover:border-[#9f9f9f]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-ui text-xs text-[#da1e28] flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-[#da1e28]" />
                Bị nghẽn
              </span>
              <span className="font-num text-lg font-bold text-[#da1e28]">
                {formatVnNumber(blocked)}
              </span>
            </div>
          </button>

          {/* Completed */}
          <button
            onClick={() => onSelectStatus(statusFilter === 'Hoàn thành' ? 'Tất cả' : 'Hoàn thành')}
            className={`p-2.5 rounded-[4px] border text-left transition-colors state-layer-std ${
              statusFilter === 'Hoàn thành'
                ? 'bg-[#d5eddc] border-[#24a148]'
                : 'bg-[#fafafa] border-[#d6d6d6] hover:border-[#9f9f9f]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-ui text-xs text-[#24a148] flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#24a148]" />
                Hoàn thành
              </span>
              <span className="font-num text-lg font-bold text-[#24a148]">
                {formatVnNumber(completed)}
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
