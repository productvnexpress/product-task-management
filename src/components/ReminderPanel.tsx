/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { TaskItem, DueFilterType } from '../types';
import {
  isTaskOverdue,
  isTaskDueToday,
  isTaskDueSoon,
  getTaskDueDateInfo,
  getTodayDateString,
} from '../utils/dateUtils';
import { formatDateWithEnDay } from '../utils/formatters';
import {
  AlertTriangle,
  Clock,
  Calendar,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Send,
  ExternalLink,
  Flame,
  CheckCircle2,
  Filter,
} from 'lucide-react';

interface ReminderPanelProps {
  tasks: TaskItem[];
  activeDueFilter: DueFilterType;
  onSelectDueFilter: (filter: DueFilterType) => void;
  onSelectTask: (task: TaskItem) => void;
}

export const ReminderPanel: React.FC<ReminderPanelProps> = ({
  tasks,
  activeDueFilter,
  onSelectDueFilter,
  onSelectTask,
}) => {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const todayStr = getTodayDateString();

  // Tasks categories
  const overdueTasks = tasks.filter((t) => isTaskOverdue(t));
  const todayTasks = tasks.filter((t) => isTaskDueToday(t));
  const soonTasks = tasks.filter((t) => isTaskDueSoon(t));

  // Generate formatted reminder text for Slack/Zalo/Email
  const handleCopyUrgeReport = () => {
    let report = `📢 BÁO CÁO ĐÔN ĐỐC TIẾN ĐỘ CÔNG VIỆC (${formatDateWithEnDay(new Date())})\n`;
    report += `===============================================\n\n`;

    if (overdueTasks.length > 0) {
      report += `🚨 CÔNG VIỆC QUÁ HẠN (${overdueTasks.length}):\n`;
      overdueTasks.forEach((t, i) => {
        const info = getTaskDueDateInfo(t.dueDate, t.status);
        report += `${i + 1}. [${t.projectName}] ${t.title}\n`;
        report += `   👉 Người phụ trách: ${t.assignee} (${t.team})\n`;
        report += `   📅 Hạn chót: ${t.dueDate} (${info.label}) | Trạng thái: ${t.status}\n`;
        if (t.workLink) report += `   🔗 Link: ${t.workLink}\n`;
        report += `\n`;
      });
    } else {
      report += `✅ Không có công việc nào bị quá hạn.\n\n`;
    }

    if (todayTasks.length > 0) {
      report += `⏰ CẦN HOÀN THÀNH HÔM NAY (${todayTasks.length}):\n`;
      todayTasks.forEach((t, i) => {
        report += `${i + 1}. [${t.projectName}] ${t.title}\n`;
        report += `   👉 Người phụ trách: ${t.assignee} (${t.team})\n`;
        report += `   📅 Hạn chót: Hôm nay (${t.dueDate}) | Trạng thái: ${t.status}\n`;
        if (t.workLink) report += `   🔗 Link: ${t.workLink}\n`;
        report += `\n`;
      });
    } else {
      report += `✨ Không có công việc cần hoàn thành gấp trong ngày hôm nay.\n\n`;
    }

    if (soonTasks.length > 0) {
      report += `⚠️ SẮP ĐẾN HẠN TRONG 3 NGÀY TỚI (${soonTasks.length}):\n`;
      soonTasks.forEach((t, i) => {
        const info = getTaskDueDateInfo(t.dueDate, t.status);
        report += `${i + 1}. [${t.projectName}] ${t.title} - ${t.assignee} (${info.label})\n`;
      });
      report += `\n`;
    }

    report += `===============================================\n`;
    report += `Đề nghị các nhân sự kiểm tra và cập nhật tiến độ / link kết quả kịp thời!`;

    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="bg-white rounded-[12px] border border-[#e0e0e0] shadow-2xs overflow-hidden transition-all">
      {/* Quick Filter Selector Tabs Bar */}
      <div className="bg-[#f8f9fa] px-4 py-2.5 border-b border-[#e0e0e0] flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none flex-1">
          <span className="text-xs font-ui text-[#5f5f5f] mr-1 flex items-center gap-1 font-bold shrink-0">
            <Filter className="w-3.5 h-3.5 text-[#5f5f5f]" />
            Lọc thời hạn:
          </span>

        {/* Option 1: Tất cả */}
        <button
          onClick={() => onSelectDueFilter('all')}
          className={`px-3 py-1.5 rounded-[6px] text-xs font-ui font-bold flex items-center gap-1.5 transition-all shrink-0 ${
            activeDueFilter === 'all'
              ? 'bg-[#f1f5f9] text-[#1e293b] border border-[#cbd5e1] shadow-2xs'
              : 'bg-white text-[#5f5f5f] border border-[#d6d6d6] hover:bg-[#f8fafc]'
          }`}
        >
          <span>Tất cả</span>
          <span className={`text-[10px] font-num px-1.5 py-0.2 rounded-full ${activeDueFilter === 'all' ? 'bg-[#e2e8f0] text-[#334155]' : 'bg-[#f0f0f0] text-[#7f7f7f]'}`}>
            {tasks.length}
          </span>
        </button>

        {/* Option 2: Cần hoàn thành trong ngày (Today) */}
        <button
          onClick={() => onSelectDueFilter('today')}
          className={`px-3 py-1.5 rounded-[6px] text-xs font-ui font-bold flex items-center gap-1.5 transition-all shrink-0 ${
            activeDueFilter === 'today'
              ? 'bg-[#ea580c] text-white shadow-2xs'
              : todayTasks.length > 0
              ? 'bg-[#fff7ed] text-[#ea580c] border border-[#ffedd5] hover:bg-[#ffedd5]'
              : 'bg-white text-[#5f5f5f] border border-[#d6d6d6] hover:bg-[#f0f0f0]'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>⏰ Hạn hôm nay</span>
          <span
            className={`text-[10px] font-num px-1.5 py-0.2 rounded-full font-extrabold ${
              activeDueFilter === 'today'
                ? 'bg-white/25 text-white'
                : 'bg-[#ea580c] text-white'
            }`}
          >
            {todayTasks.length}
          </span>
        </button>

        {/* Option 3: Quá hạn (Overdue) */}
        <button
          onClick={() => onSelectDueFilter('overdue')}
          className={`px-3 py-1.5 rounded-[6px] text-xs font-ui font-bold flex items-center gap-1.5 transition-all shrink-0 ${
            activeDueFilter === 'overdue'
              ? 'bg-[#da1e28] text-white shadow-2xs'
              : overdueTasks.length > 0
              ? 'bg-[#fff0f1] text-[#da1e28] border border-[#fbd3d6] hover:bg-[#fbd3d6]/50'
              : 'bg-white text-[#5f5f5f] border border-[#d6d6d6] hover:bg-[#f0f0f0]'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>🚨 Quá hạn</span>
          <span
            className={`text-[10px] font-num px-1.5 py-0.2 rounded-full font-extrabold ${
              activeDueFilter === 'overdue'
                ? 'bg-white/25 text-white'
                : 'bg-[#da1e28] text-white'
            }`}
          >
            {overdueTasks.length}
          </span>
        </button>

        {/* Option 4: Sắp đến hạn (Soon - 3 days) */}
        <button
          onClick={() => onSelectDueFilter('soon')}
          className={`px-3 py-1.5 rounded-[6px] text-xs font-ui font-bold flex items-center gap-1.5 transition-all shrink-0 ${
            activeDueFilter === 'soon'
              ? 'bg-[#ca8a04] text-white shadow-2xs'
              : soonTasks.length > 0
              ? 'bg-[#fefce8] text-[#ca8a04] border border-[#fef08a] hover:bg-[#fef08a]/50'
              : 'bg-white text-[#5f5f5f] border border-[#d6d6d6] hover:bg-[#f0f0f0]'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>⚠️ Sắp đến hạn (3 ngày)</span>
          <span
            className={`text-[10px] font-num px-1.5 py-0.2 rounded-full font-extrabold ${
              activeDueFilter === 'soon'
                ? 'bg-white/25 text-white'
                : 'bg-[#ca8a04] text-white'
            }`}
          >
            {soonTasks.length}
          </span>
        </button>
        </div>
      </div>
    </div>
  );
};
