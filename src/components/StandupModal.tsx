/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TaskItem, TeamType } from '../types';
import { X, Copy, Check, FileText } from './vds/icons';
import { formatDateShort } from '../utils/formatters';

interface StandupModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: TaskItem[];
}

export const StandupModal: React.FC<StandupModalProps> = ({
  isOpen,
  onClose,
  tasks,
}) => {
  const [copied, setCopied] = useState(false);
  const [filterTeam, setFilterTeam] = useState<'Tất cả' | TeamType>('Tất cả');

  const filteredTasks = tasks.filter(
    (t) => filterTeam === 'Tất cả' || t.team === filterTeam
  );

  // Group tasks by project name
  const tasksByProject: Record<string, TaskItem[]> = {};
  filteredTasks.forEach((t) => {
    if (!tasksByProject[t.projectName]) {
      tasksByProject[t.projectName] = [];
    }
    tasksByProject[t.projectName].push(t);
  });

  // Generate plain text report
  const generateReportText = (): string => {
    let report = `📋 BÁO CÁO TIẾN ĐỘ HÀNG NGÀY (DAILY STANDUP) - BỘ PHẬN SẢN PHẨM\n`;
    report += `🗓️ Ngày: ${formatDateShort(new Date().toISOString())}\n`;
    report += `--------------------------------------------------\n\n`;

    Object.entries(tasksByProject).forEach(([projectName, projectTasks]) => {
      report += `📁 ${projectName.toUpperCase()}\n`;

      const completed = projectTasks.filter((t) => t.status === 'Hoàn thành');
      const inProgress = projectTasks.filter(
        (t) => t.status === 'Đang làm' || t.status === 'Chưa làm'
      );
      const blocked = projectTasks.filter((t) => t.status === 'Bị nghẽn');

      if (completed.length > 0) {
        report += `  ✅ Đã hoàn thành:\n`;
        completed.forEach((t) => {
          report += `     - [${t.team}] ${t.title} (${t.assignee})\n`;
        });
      }

      if (inProgress.length > 0) {
        report += `  🔄 Đang triển khai:\n`;
        inProgress.forEach((t) => {
          report += `     - [${t.team}] ${t.title} - Status: ${t.status} (${t.assignee})\n`;
        });
      }

      if (blocked.length > 0) {
        report += `  ⚠️ Bị nghẽn / Cần hỗ trợ:\n`;
        blocked.forEach((t) => {
          report += `     - [${t.team}] ${t.title} -> Lý do: ${t.blockerReason || 'Cần phối hợp'} (${t.assignee})\n`;
        });
      }

      report += `\n`;
    });

    report += `--------------------------------------------------\n`;
    report += `Gửi từ Ứng dụng Quản lý Công việc Sản phẩm VnExpress.`;
    return report;
  };

  const reportContent = generateReportText();

  const handleCopy = () => {
    navigator.clipboard.writeText(reportContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden">
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={onClose}
          />

          {/* Modal Dialog Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 bg-surface w-full max-w-2xl rounded-vds-lg border border-line shadow-sheet overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Modal Header */}
            <div className="p-5 bg-surface-100 border-b border-line flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-accent" />
                <h2 className="font-title text-base font-bold text-ink">
                  Xuất báo cáo Standup hàng ngày
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-full text-subdued hover:text-ink hover:bg-surface-300 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Team filter bar */}
            <div className="px-5 py-2.5 bg-surface-200 border-b border-line flex items-center gap-2 text-xs font-ui">
              <span className="font-bold text-ink-lighter">Lọc theo nhóm:</span>
              {(['Tất cả', 'Product Manager', 'UX/UI Designer', 'SEO', 'Data'] as const).map(
                (team) => (
                  <button
                    key={team}
                    onClick={() => setFilterTeam(team)}
                    className={`px-2.5 py-1 rounded-vds-lg transition-colors cursor-pointer ${
                      filterTeam === team
                        ? 'bg-surface-selected text-accent font-bold ring-1 ring-inset ring-line-accent-soft'
                        : 'bg-surface text-ink-lighter hover:bg-surface-300'
                    }`}
                  >
                    {team}
                  </button>
                )
              )}
            </div>

            {/* Preview Content */}
            <div className="p-5 flex-1 overflow-y-auto">
              <textarea
                readOnly
                value={reportContent}
                rows={14}
                className="w-full text-xs font-num p-3 bg-surface-100 border border-line rounded-vds-lg text-ink focus:outline-hidden leading-relaxed"
              />
            </div>

            {/* Modal Footer */}
            <div className="p-5 bg-surface-100 border-t border-line flex items-center justify-between">
              <p className="text-xs font-body text-ink-lighter">
                Sao chép nội dung này để dán vào kênh Slack / Teams của bộ phận.
              </p>
              <button
                onClick={handleCopy}
                className="px-5 py-2 bg-accent-solid text-on-color text-xs font-ui font-bold rounded-vds-lg hover:bg-accent-solid-hover transition-colors flex items-center gap-2 cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-on-color" />
                    <span>Đã sao chép!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Sao chép báo cáo</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
