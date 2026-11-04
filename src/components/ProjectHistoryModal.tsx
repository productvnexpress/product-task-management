/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ProjectItem, ProjectHistoryLog, MemberItem } from '../types';
import { formatProjectLogTimestamp } from '../utils/projectLogUtils';
import {
  History,
  X,
  Clock,
  User,
  ArrowRight,
  Plus,
  Send,
  FileText,
  Tag,
  Search,
} from './vds/icons';

interface ProjectHistoryModalProps {
  project: ProjectItem;
  isOpen: boolean;
  onClose: () => void;
  members: MemberItem[];
  onAddManualLog?: (log: ProjectHistoryLog) => void;
}

export const ProjectHistoryModal: React.FC<ProjectHistoryModalProps> = ({
  project,
  isOpen,
  onClose,
  members,
  onAddManualLog,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingManual, setIsAddingManual] = useState(false);
  const [manualAuthor, setManualAuthor] = useState(
    project.roles?.pm?.[0] || members[0]?.name || 'Hệ thống'
  );
  const [manualAction, setManualAction] = useState('Ghi nhận mốc tiến độ');
  const [manualNote, setManualNote] = useState('');

  const logs = project.history || [];

  const filteredLogs = logs.filter((l) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (l.author || '').toLowerCase().includes(term) ||
      (l.action || '').toLowerCase().includes(term) ||
      (l.note && (l.note || '').toLowerCase().includes(term)) ||
      l.changes.some(
        (c) =>
          (c.field || '').toLowerCase().includes(term) ||
          (c.oldValue && (c.oldValue || '').toLowerCase().includes(term)) ||
          (c.newValue && (c.newValue || '').toLowerCase().includes(term))
      )
    );
  });

  const handleCreateManualLog = () => {
    if (!manualNote.trim() || !onAddManualLog) return;
    const newLog: ProjectHistoryLog = {
      id: `plog-manual-${Date.now()}`,
      timestamp: new Date().toISOString(),
      author: manualAuthor,
      action: manualAction,
      changes: [{ field: 'Ghi nhận thủ công', newValue: manualNote.trim() }],
      note: manualNote.trim(),
    };
    onAddManualLog(newLog);
    setManualNote('');
    setIsAddingManual(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={onClose}
          />

          {/* Dialog Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 bg-surface w-full max-w-2xl max-h-[85vh] rounded-vds-lg shadow-sheet border border-line flex flex-col overflow-hidden"
          >
            {/* Modal Header */}
        <div className="px-5 py-4 bg-surface-100 border-b border-line flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-surface-support border border-line text-support flex items-center justify-center shrink-0">
              <History className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-title text-sm sm:text-base font-bold text-ink truncate">
                Lịch sử điều chỉnh dự án
              </h3>
              <p className="text-xs text-ink-lighter truncate font-ui font-semibold">
                {project.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="font-num text-xs font-bold text-support bg-surface-support px-2.5 py-1 rounded-full border border-line">
              {logs.length} bản ghi
            </span>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-subdued hover:text-ink hover:bg-surface-300 rounded-vds-lg transition-colors cursor-pointer"
              title="Đóng (ESC)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action & Search Bar */}
        <div className="px-5 py-3 bg-surface-100 border-b border-divider flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-subdued absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo người sửa, hành động, trường thay đổi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface border border-line rounded-vds-lg text-ink placeholder:text-subdued focus:border-line-support"
            />
          </div>

          {onAddManualLog && !isAddingManual && (
            <button
              type="button"
              onClick={() => setIsAddingManual(true)}
              className="px-3 py-1.5 text-xs font-ui font-bold text-support bg-surface-support hover:bg-surface-support border border-line rounded-vds-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ghi nhận mốc mới</span>
            </button>
          )}
        </div>

        {/* Optional Manual Log Entry Form */}
        {isAddingManual && (
          <div className="px-5 py-3 bg-surface-100 border-b border-line space-y-2.5 animate-fade-in">
            <div className="text-xs font-bold text-support flex items-center justify-between">
              <span>Ghi nhận mốc sự kiện / Quyết định điều chỉnh:</span>
              <button
                type="button"
                onClick={() => setIsAddingManual(false)}
                className="text-xs text-subdued hover:text-ink"
              >
                Hủy
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-ink-lighter">Người ghi nhận:</label>
                <select
                  value={manualAuthor}
                  onChange={(e) => setManualAuthor(e.target.value)}
                  className="w-full p-1.5 border border-line rounded-vds-lg text-xs bg-surface text-ink"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.name}>
                      {m.name} ({m.team})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-ink-lighter">Loại hành động:</label>
                <input
                  type="text"
                  value={manualAction}
                  onChange={(e) => setManualAction(e.target.value)}
                  className="w-full p-1.5 border border-line rounded-vds-lg text-xs bg-surface text-ink"
                  placeholder="VD: Họp thống nhất chỉ tiêu OKR..."
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-ink-lighter">Nội dung chi tiết:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualNote}
                  onChange={(e) => setManualNote(e.target.value)}
                  placeholder="Ghi nhận tóm tắt nội dung thay đổi hoặc kết luận quan trọng..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateManualLog();
                  }}
                  className="flex-1 p-1.5 border border-line rounded-vds-lg text-xs bg-surface text-ink"
                />
                <button
                  type="button"
                  onClick={handleCreateManualLog}
                  disabled={!manualNote.trim()}
                  className="px-3 py-1.5 bg-support-solid hover:bg-support-solid text-on-color text-xs font-bold rounded-vds-lg disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Lưu</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Body - Log Entries List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 font-body bg-surface-100">
          {filteredLogs.length === 0 ? (
            <div className="p-8 text-center bg-surface rounded-vds-lg border border-dashed border-line text-xs text-subdued space-y-2">
              <History className="w-8 h-8 text-icon-subdued mx-auto" />
              <p className="font-bold text-ink">Chưa có lịch sử điều chỉnh nào</p>
              <p className="max-w-md mx-auto">
                Mọi thao tác điều chỉnh thông tin dự án, thay đổi trạng thái, cập nhật hạn hoàn thành, điều chỉnh giai đoạn hoặc thêm liên kết sẽ được tự động ghi nhận tại đây.
              </p>
            </div>
          ) : (
            <div className="space-y-3.5 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-surface-300">
              {filteredLogs.map((log) => (
                <div key={log.id} className="relative pl-8 space-y-1.5 group">
                  {/* Timeline bullet */}
                  <div className="absolute left-1.5 top-1 -translate-x-1/2 w-5 h-5 rounded-full bg-surface border-2 border-line-support flex items-center justify-center z-10 ">
                    <Clock className="w-2.5 h-2.5 text-support" />
                  </div>

                  {/* Log Content Card */}
                  <div className="bg-surface p-3.5 rounded-vds-lg border border-line space-y-2 hover:border-line transition-colors">
                    {/* Header line of log */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-divider pb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-ui font-bold text-xs text-ink flex items-center gap-1">
                          <User className="w-3 h-3 text-support" />
                          <span>{log.author}</span>
                        </span>
                        <span className="text-icon-subdued">•</span>
                        <span className="text-xs font-bold text-support bg-surface-support px-2 py-0.5 rounded-vds-md border border-line">
                          {log.action}
                        </span>
                      </div>

                      <span className="text-xs font-ui text-subdued flex items-center gap-1 shrink-0">
                        <Clock className="w-3 h-3 text-subdued-lighter" />
                        {formatProjectLogTimestamp(log.timestamp)}
                      </span>
                    </div>

                    {/* Detailed field changes */}
                    {log.changes && log.changes.length > 0 && (
                      <div className="space-y-1.5 pt-0.5">
                        <div className="text-xs font-semibold text-ink-lighter flex items-center gap-1">
                          <Tag className="w-3 h-3 text-support" />
                          <span>Chi tiết các nội dung điều chỉnh ({log.changes.length}):</span>
                        </div>
                        <div className="divide-y divide-divider bg-surface-100 rounded-vds-lg border border-line overflow-hidden text-xs">
                          {log.changes.map((change, cIdx) => (
                            <div
                              key={cIdx}
                              className="p-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 hover:bg-surface-200 transition-colors"
                            >
                              <span className="font-ui font-semibold text-ink-lighter sm:w-1/3 shrink-0">
                                {change.field}:
                              </span>
                              <div className="flex items-center gap-1.5 sm:w-2/3 min-w-0 text-xs">
                                {change.oldValue !== undefined ? (
                                  <>
                                    <span className="text-subdued bg-surface px-1.5 py-0.5 rounded border border-line truncate max-w-[160px]">
                                      {change.oldValue || <span className="text-subdued-lighter">Trống</span>}
                                    </span>
                                    <ArrowRight className="w-3 h-3 text-subdued-lighter shrink-0" />
                                    <span className="font-bold text-ink bg-surface-positive text-positive px-1.5 py-0.5 rounded border border-line truncate max-w-[200px]">
                                      {change.newValue || <span className="text-subdued-lighter">Trống</span>}
                                    </span>
                                  </>
                                ) : (
                                  <span className="font-bold text-ink bg-surface-positive text-positive px-1.5 py-0.5 rounded border border-line truncate">
                                    {change.newValue}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Additional Note */}
                    {log.note && (
                      <div className="text-xs text-ink-lighter bg-surface-100 p-2 rounded-vds-md border border-line flex items-start gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-subdued shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{log.note}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-surface-100 border-t border-line flex items-center justify-between text-xs text-subdued shrink-0 font-ui">
          <span>Hệ thống tự động lưu vết mọi lần chỉnh sửa dự án</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-support-solid hover:bg-support-solid text-on-color font-semibold rounded-vds-lg transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </motion.div>
    </div>
  )}
</AnimatePresence>
);
};
