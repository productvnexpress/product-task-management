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
} from 'lucide-react';

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
      l.author.toLowerCase().includes(term) ||
      l.action.toLowerCase().includes(term) ||
      (l.note && l.note.toLowerCase().includes(term)) ||
      l.changes.some(
        (c) =>
          c.field.toLowerCase().includes(term) ||
          (c.oldValue && c.oldValue.toLowerCase().includes(term)) ||
          (c.newValue && c.newValue.toLowerCase().includes(term))
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
            className="relative z-10 bg-white w-full max-w-2xl max-h-[85vh] rounded-[12px] shadow-2xl border border-[#d0d0d0] flex flex-col overflow-hidden"
          >
            {/* Modal Header */}
        <div className="px-5 py-4 bg-[#fafafa] border-b border-[#e6e6e6] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#eef4fb] border border-[#c2d7f0] text-[#1d508d] flex items-center justify-center shrink-0">
              <History className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-title text-sm sm:text-base font-bold text-[#202020] truncate">
                Lịch sử điều chỉnh dự án
              </h3>
              <p className="text-xs text-[#5f5f5f] truncate font-ui font-semibold">
                {project.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="font-num text-xs font-bold text-[#1d508d] bg-[#eef4fb] px-2.5 py-1 rounded-full border border-[#c2d7f0]">
              {logs.length} bản ghi
            </span>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-[#7f7f7f] hover:text-[#202020] hover:bg-[#ececec] rounded-[6px] transition-colors cursor-pointer"
              title="Đóng (ESC)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action & Search Bar */}
        <div className="px-5 py-3 bg-[#fdfdfd] border-b border-[#ececec] flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-[#888] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo người sửa, hành động, trường thay đổi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-[#d0d0d0] rounded-[6px] text-[#202020] placeholder:text-[#888] focus:border-[#1d508d]"
            />
          </div>

          {onAddManualLog && !isAddingManual && (
            <button
              type="button"
              onClick={() => setIsAddingManual(true)}
              className="px-3 py-1.5 text-xs font-ui font-bold text-[#1d508d] bg-[#eef4fb] hover:bg-[#dfeaf7] border border-[#c2d7f0] rounded-[6px] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ghi nhận mốc mới</span>
            </button>
          )}
        </div>

        {/* Optional Manual Log Entry Form */}
        {isAddingManual && (
          <div className="px-5 py-3 bg-[#f8fafc] border-b border-[#e2e8f0] space-y-2.5 animate-fade-in">
            <div className="text-xs font-bold text-[#1d508d] flex items-center justify-between">
              <span>Ghi nhận mốc sự kiện / Quyết định điều chỉnh:</span>
              <button
                type="button"
                onClick={() => setIsAddingManual(false)}
                className="text-[11px] text-[#7f7f7f] hover:text-[#202020]"
              >
                Hủy
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#505050]">Người ghi nhận:</label>
                <select
                  value={manualAuthor}
                  onChange={(e) => setManualAuthor(e.target.value)}
                  className="w-full p-1.5 border border-[#cbd5e1] rounded-[6px] text-xs bg-white text-[#0f172a]"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.name}>
                      {m.name} ({m.team})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#505050]">Loại hành động:</label>
                <input
                  type="text"
                  value={manualAction}
                  onChange={(e) => setManualAction(e.target.value)}
                  className="w-full p-1.5 border border-[#cbd5e1] rounded-[6px] text-xs bg-white text-[#0f172a]"
                  placeholder="VD: Họp thống nhất chỉ tiêu OKR..."
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#505050]">Nội dung chi tiết:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualNote}
                  onChange={(e) => setManualNote(e.target.value)}
                  placeholder="Ghi nhận tóm tắt nội dung thay đổi hoặc kết luận quan trọng..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateManualLog();
                  }}
                  className="flex-1 p-1.5 border border-[#cbd5e1] rounded-[6px] text-xs bg-white text-[#0f172a]"
                />
                <button
                  type="button"
                  onClick={handleCreateManualLog}
                  disabled={!manualNote.trim()}
                  className="px-3 py-1.5 bg-[#1d508d] hover:bg-[#153e6f] text-white text-xs font-bold rounded-[6px] disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Lưu</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Body - Log Entries List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 font-body bg-[#fafafa]">
          {filteredLogs.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-[8px] border border-dashed border-[#d6d6d6] text-xs text-[#7f7f7f] space-y-2">
              <History className="w-8 h-8 text-[#d6d6d6] mx-auto" />
              <p className="font-bold text-[#303030]">Chưa có lịch sử điều chỉnh nào</p>
              <p className="max-w-md mx-auto">
                Mọi thao tác điều chỉnh thông tin dự án, thay đổi trạng thái, cập nhật hạn hoàn thành, điều chỉnh giai đoạn hoặc thêm liên kết sẽ được tự động ghi nhận tại đây.
              </p>
            </div>
          ) : (
            <div className="space-y-3.5 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-[#e2e8f0]">
              {filteredLogs.map((log) => (
                <div key={log.id} className="relative pl-8 space-y-1.5 group">
                  {/* Timeline bullet */}
                  <div className="absolute left-1.5 top-1 -translate-x-1/2 w-5 h-5 rounded-full bg-white border-2 border-[#1d508d] flex items-center justify-center z-10 shadow-2xs">
                    <Clock className="w-2.5 h-2.5 text-[#1d508d]" />
                  </div>

                  {/* Log Content Card */}
                  <div className="bg-white p-3.5 rounded-[8px] border border-[#e2e8f0] shadow-2xs space-y-2 hover:border-[#c2d7f0] transition-colors">
                    {/* Header line of log */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f1f5f9] pb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-ui font-bold text-xs text-[#0f172a] flex items-center gap-1">
                          <User className="w-3 h-3 text-[#1d508d]" />
                          <span>{log.author}</span>
                        </span>
                        <span className="text-[#cbd5e1]">•</span>
                        <span className="text-[11px] font-bold text-[#1d508d] bg-[#eef4fb] px-2 py-0.5 rounded-[4px] border border-[#c2d7f0]">
                          {log.action}
                        </span>
                      </div>

                      <span className="text-[11px] font-num text-[#64748b] flex items-center gap-1 shrink-0">
                        <Clock className="w-3 h-3 text-[#94a3b8]" />
                        {formatProjectLogTimestamp(log.timestamp)}
                      </span>
                    </div>

                    {/* Detailed field changes */}
                    {log.changes && log.changes.length > 0 && (
                      <div className="space-y-1.5 pt-0.5">
                        <div className="text-[11px] font-semibold text-[#505050] flex items-center gap-1">
                          <Tag className="w-3 h-3 text-[#1d508d]" />
                          <span>Chi tiết các nội dung điều chỉnh ({log.changes.length}):</span>
                        </div>
                        <div className="divide-y divide-[#f1f5f9] bg-[#f8fafc] rounded-[6px] border border-[#e2e8f0] overflow-hidden text-xs">
                          {log.changes.map((change, cIdx) => (
                            <div
                              key={cIdx}
                              className="p-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 hover:bg-[#f1f5f9] transition-colors"
                            >
                              <span className="font-ui font-semibold text-[#334155] sm:w-1/3 shrink-0">
                                {change.field}:
                              </span>
                              <div className="flex items-center gap-1.5 sm:w-2/3 min-w-0 text-[11px]">
                                {change.oldValue !== undefined ? (
                                  <>
                                    <span className="text-[#64748b] bg-white px-1.5 py-0.5 rounded border border-[#e2e8f0] truncate max-w-[160px]">
                                      {change.oldValue || <span className="text-[#94a3b8]">Trống</span>}
                                    </span>
                                    <ArrowRight className="w-3 h-3 text-[#94a3b8] shrink-0" />
                                    <span className="font-bold text-[#0f172a] bg-[#ecfdf5] text-[#047857] px-1.5 py-0.5 rounded border border-[#a7f3d0] truncate max-w-[200px]">
                                      {change.newValue || <span className="text-[#94a3b8]">Trống</span>}
                                    </span>
                                  </>
                                ) : (
                                  <span className="font-bold text-[#0f172a] bg-[#ecfdf5] text-[#047857] px-1.5 py-0.5 rounded border border-[#a7f3d0] truncate">
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
                      <div className="text-[11px] text-[#475569] bg-[#fdfdfd] p-2 rounded-[4px] border border-[#e2e8f0] flex items-start gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-[#64748b] shrink-0 mt-0.5" />
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
        <div className="px-5 py-3 bg-[#fafafa] border-t border-[#e6e6e6] flex items-center justify-between text-xs text-[#7f7f7f] shrink-0 font-ui">
          <span>Hệ thống tự động lưu vết mọi lần chỉnh sửa dự án</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[#1d508d] hover:bg-[#143765] text-white font-semibold rounded-[6px] transition-colors cursor-pointer"
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
