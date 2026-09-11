/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { MemberItem, TaskItem } from '../types';
import {
  getDailyAccountabilityStats,
  formatDailyUrgeReport,
  MemberAccountabilityStatus,
} from '../utils/dailyAccountability';
import { formatDateWithEnDay } from '../utils/formatters';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  User,
  ExternalLink,
  Filter,
  Flame,
  ShieldAlert,
} from 'lucide-react';

interface DailyCompletionAlertProps {
  members: MemberItem[];
  tasks: TaskItem[];
  currentAuthUser?: MemberItem | null;
  onSelectAssignee: (assigneeName: string) => void;
  selectedAssignee?: string;
}

export const DailyCompletionAlert: React.FC<DailyCompletionAlertProps> = ({
  members,
  tasks,
  currentAuthUser,
  onSelectAssignee,
  selectedAssignee,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [copied, setCopied] = useState(false);

  const stats = getDailyAccountabilityStats(members, tasks, undefined, currentAuthUser);

  const handleCopyUrge = (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = formatDailyUrgeReport(stats);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  // Nếu 100% nhân sự đã có task hoàn thành hôm nay
  if (stats.missingMembers.length === 0) {
    return (
      <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-[12px] p-3.5 shadow-2xs transition-all">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#22c55e]/15 text-[#15803d] flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-title text-sm font-semibold text-[#166534]">
                Tiến độ ngày đạt chỉ tiêu: 100% nhân sự Manager & Executive đã có công việc hoàn thành hôm nay
              </h4>
              <p className="text-xs font-ui text-[#15803d]">
                {stats.compliantMembers.length}/{stats.totalApplicable} nhân sự đã hoàn tất ít nhất 1 nhiệm vụ • {formatDateWithEnDay(new Date())}
              </p>
            </div>
          </div>
          <span className="text-xs font-num font-bold px-2.5 py-1 rounded-full bg-[#dcfce7] text-[#166534] border border-[#bbf7d0]">
            100% Hoàn thành
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#fffdfa] border border-[#f59e0b]/40 rounded-[12px] shadow-2xs overflow-hidden transition-all">
      {/* Header Banner */}
      <div
        className="px-4 py-3 bg-[#fffbeb] border-b border-[#fef08a] flex items-center justify-between gap-3 cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-[#f59e0b]/20 text-[#b45309] flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4 text-[#d97706]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-title text-[13.5px] font-semibold text-[#92400e]">
                Cảnh báo tiến độ ngày: {stats.missingMembers.length}/{stats.totalApplicable} nhân sự chưa có task hoàn thành hôm nay
              </h4>
              <span className="text-[10px] font-num font-bold px-2 py-0.5 rounded-full bg-[#fef3c7] text-[#b45309] border border-[#fde68a]">
                {stats.missingMembers.length} chưa xong
              </span>
            </div>
            <p className="text-[11px] font-ui text-[#b45309]">
              Quy chuẩn: 100% nhân sự cấp Manager & Executive cần có task hoàn thành từng ngày • {formatDateWithEnDay(new Date())}
            </p>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopyUrge}
            className="px-2.5 py-1.5 rounded-[6px] text-xs font-ui font-semibold bg-white border border-[#fde68a] text-[#b45309] hover:bg-[#fef3c7] transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title="Sao chép nội dung đôn đốc gửi vào Lark / Zalo / Slack"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#15803d]" />
                <span className="text-[#15803d]">Đã chép</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-[#b45309]" />
                <span className="hidden sm:inline">Sao chép đôn đốc</span>
              </>
            )}
          </button>

          <button
            type="button"
            className="p-1 text-[#b45309] hover:bg-[#fef3c7] rounded-[4px] transition-colors"
            title={isExpanded ? 'Thu gọn' : 'Mở rộng'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expandable Body */}
      {isExpanded && (
        <div className="p-4 space-y-3">
          {/* Personalized Warning Callout for logged in user */}
          {stats.isCurrentUserMissing && currentAuthUser && (
            <div className="bg-[#fff1f2] border border-[#fecdd3] rounded-[8px] p-3 flex items-start gap-2.5">
              <Flame className="w-4 h-4 text-[#e11d48] shrink-0 mt-0.5" />
              <div className="text-xs font-ui">
                <span className="font-bold text-[#be123c]">
                  Nhắc nhở cá nhân ({currentAuthUser.name}):
                </span>{' '}
                <span className="text-[#9f1239]">
                  Bạn chưa có công việc nào được đánh dấu hoàn thành trong ngày hôm nay. Hãy cập nhật tiến độ hoặc kết quả công việc để hoàn thành chỉ tiêu ngày!
                </span>
              </div>
            </div>
          )}

          {/* List of missing members */}
          <div>
            <div className="text-[11px] font-ui text-[#78350f] font-semibold mb-2 flex items-center justify-between">
              <span>Bấm vào nhân sự để xem & đôn đốc các công việc đang làm:</span>
              <span className="text-[10px] text-[#92400e]">
                Đã hoàn thành: {stats.compliantMembers.length}/{stats.totalApplicable} người
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {stats.missingMembers.map((item) => {
                const isSelected = selectedAssignee === item.member.name;
                const isManager = item.role === 'Manager';
                return (
                  <button
                    key={item.member.id}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        onSelectAssignee('Tất cả');
                      } else {
                        onSelectAssignee(item.member.name);
                      }
                    }}
                    className={`group px-2.5 py-1.5 rounded-[8px] text-xs font-ui border transition-all text-left flex items-center gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-[#92400e] text-white border-[#78350f] shadow-xs'
                        : 'bg-white text-[#292524] border-[#e7e5e4] hover:border-[#f59e0b] hover:bg-[#fffdfa]'
                    }`}
                    title={`Bấm để lọc ${item.activeTasksCount} công việc đang làm của ${item.member.name}`}
                  >
                    {/* Avatar Initials */}
                    <div
                      className={`w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : isManager
                          ? 'bg-[#eff6ff] text-[#1d4ed8]'
                          : 'bg-[#f0fdf4] text-[#15803d]'
                      }`}
                    >
                      {item.member.name.split(' ').slice(-1)[0].slice(0, 1)}
                    </div>

                    {/* Member Name */}
                    <span className="font-medium">{item.member.name}</span>

                    {/* Role Badge */}
                    <span
                      className={`text-[9px] font-num px-1 py-0.2 rounded font-semibold ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : isManager
                          ? 'bg-[#dbeafe] text-[#1e40af]'
                          : 'bg-[#e2e8f0] text-[#475569]'
                      }`}
                    >
                      {item.role === 'Manager' ? 'PM' : item.member.team?.replace('UX/UI ', '') || 'Exc'}
                    </span>

                    {/* Active Tasks Count */}
                    <span
                      className={`text-[10px] font-num px-1.5 py-0.2 rounded-full font-bold ${
                        isSelected
                          ? 'bg-white text-[#92400e]'
                          : item.activeTasksCount > 0
                          ? 'bg-[#fff7ed] text-[#c2410c] border border-[#ffedd5]'
                          : 'bg-[#f5f5f4] text-[#78716c]'
                      }`}
                    >
                      {item.activeTasksCount} việc
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
