/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { TaskItem, TaskStatus } from '../types';
import { formatDateWithEnDay, formatPercentage } from '../utils/formatters';
import { X, Send, History, AlertCircle } from 'lucide-react';

interface QuickLogModalProps {
  task: TaskItem;
  isOpen: boolean;
  onClose: () => void;
  onAddLog: (taskId: string, note: string, newProgress: number, newStatus: TaskStatus, blockerReason?: string) => void;
}

export const QuickLogModal: React.FC<QuickLogModalProps> = ({
  task,
  isOpen,
  onClose,
  onAddLog,
}) => {
  const [note, setNote] = useState('');
  const [progress, setProgress] = useState(task?.progress || 0);
  const [status, setStatus] = useState<TaskStatus>(task?.status || 'Chưa làm');
  const [blocker, setBlocker] = useState(task?.blockerReason || '');

  React.useEffect(() => {
    if (task) {
      setProgress(task.progress);
      setStatus(task.status);
      setBlocker(task.blockerReason || '');
      setNote('');
    }
  }, [task, isOpen]);

  if (!isOpen || !task) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim() && progress === task.progress && status === task.status) {
      onClose();
      return;
    }

    onAddLog(
      task.id,
      note.trim() || `Cập nhật tiến độ thành ${progress}% (${status})`,
      progress,
      status,
      status === 'Bị nghẽn' ? blocker : undefined
    );
    onClose();
  };

  const handleQuickProgress = (val: number) => {
    setProgress(val);
    if (val === 100) {
      setStatus('Hoàn thành');
    } else if (val > 0 && status === 'Chưa làm') {
      setStatus('Đang làm');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      {/* Modal Container: Flat, 4px border radius, no drop-shadow */}
      <div className="bg-[#ffffff] border border-[#5f5f5f] rounded-[4px] w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 bg-[#fafafa] border-b border-[rgba(0,0,0,0.15)] flex items-center justify-between">
          <div>
            <span className="font-ui text-xs text-[#b13460] font-bold">
              Nhật ký và Cập nhật tiến độ
            </span>
            <h3 className="font-title text-base font-bold text-[#202020] line-clamp-1">
              {task.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#7f7f7f] hover:text-[#202020] rounded-[4px]"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {/* Quick Progress Buttons */}
          <div>
            <label className="block font-ui text-xs text-[#5f5f5f] mb-1.5 font-bold">
              Cập nhật tỷ lệ hoàn thành:
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[0, 25, 50, 75, 90, 100].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleQuickProgress(val)}
                  className={`h-[32px] px-3 rounded-[4px] font-num text-xs transition-colors ${
                    progress === val
                      ? 'bg-[#b13460] text-white font-bold'
                      : 'bg-[#f3f3f3] text-[#5f5f5f] hover:bg-[#e1e1e1] border border-[#d6d6d6]'
                  }`}
                >
                  {val}%
                </button>
              ))}
              <span className="font-num text-xs text-[#202020] ml-2">
                Hiện tại: <strong>{formatPercentage(progress, 0)}</strong>
              </span>
            </div>
          </div>

          {/* Status Selection */}
          <div>
            <label className="block font-ui text-xs text-[#5f5f5f] mb-1.5 font-bold">
              Trạng thái công việc:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {(['Chưa làm', 'Đang làm', 'Bị nghẽn', 'Hoàn thành'] as TaskStatus[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`py-1.5 px-2 rounded-[4px] border font-ui text-xs transition-colors text-center cursor-pointer ${
                    status === s
                      ? s === 'Đang làm'
                        ? 'bg-[#eef4fb] text-[#1d508d] font-bold border-[#c2d7f0]'
                        : s === 'Bị nghẽn'
                        ? 'bg-[#fef2f2] text-[#b91c1c] font-bold border-[#fecaca]'
                        : s === 'Hoàn thành'
                        ? 'bg-[#f0fdf4] text-[#166534] font-bold border-[#bbf7d0]'
                        : 'bg-[#f1f5f9] text-[#1e293b] font-bold border-[#cbd5e1]'
                      : 'bg-[#fafafa] text-[#5f5f5f] border-[#d6d6d6] hover:bg-white hover:border-[#9f9f9f]'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* If Status is 'Bị nghẽn', show Blocker reason field */}
          {status === 'Bị nghẽn' && (
            <div className="p-3 bg-[#f8d4d6]/60 border border-[#da1e28] rounded-[4px]">
              <label className="flex items-center gap-1 font-ui text-xs text-[#da1e28] font-bold mb-1">
                <AlertCircle className="w-3.5 h-3.5" />
                Nguyên nhân bị nghẽn / Cần hỗ trợ gì:
              </label>
              <input
                type="text"
                value={blocker}
                onChange={(e) => setBlocker(e.target.value)}
                placeholder="Ví dụ: Đang chờ ban biên tập duyệt slug, thiếu dữ liệu từ đội Data..."
                className="w-full h-[36px] px-3 bg-[#ffffff] border border-[#da1e28] rounded-[4px] font-body text-xs text-[#202020] focus:outline-none"
              />
            </div>
          )}

          {/* Fast Note Input */}
          <div>
            <label className="block font-ui text-xs text-[#5f5f5f] mb-1 font-bold">
              Ghi chú tiến độ mới:
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Nhập nội dung ngắn: kết quả vừa hoàn thành, công việc tiếp theo trong ngày..."
              rows={3}
              className="w-full p-2.5 bg-[#fafafa] border border-[#9f9f9f] rounded-[4px] font-body text-xs text-[#202020] placeholder-[#9f9f9f] focus:outline-none"
            />
          </div>

          {/* History Timeline */}
          <div>
            <div className="flex items-center gap-1.5 font-ui text-xs text-[#7f7f7f] mb-2 font-bold border-t border-[rgba(0,0,0,0.06)] pt-3">
              <History className="w-3.5 h-3.5" />
              <span>Lịch sử cập nhật ({task.logs.length}):</span>
            </div>

            {task.logs.length === 0 ? (
              <div className="text-xs font-body text-[#9f9f9f]">
                Chưa có ghi chú cập nhật nào trước đây.
              </div>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {task.logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-2 bg-[#fafafa] border border-[#ececec] rounded-[4px] text-xs font-body"
                  >
                    <div className="flex items-center justify-between text-[#7f7f7f] mb-1">
                      <span className="font-ui font-bold text-[#5f5f5f]">{log.author}</span>
                      <span className="font-ui text-[11px] text-[#7f7f7f]">
                        {formatDateWithEnDay(log.timestamp, true)}
                      </span>
                    </div>
                    <p className="text-[#202020]">{log.note}</p>
                    {((log as any).previousProgress !== undefined || (log as any).newProgress !== undefined) && (
                      <div className="mt-1 text-[11px] font-num text-[#7f7f7f]">
                        Tiến độ: {(log as any).previousProgress ?? 0}% → {(log as any).newProgress ?? 0}%
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-3 bg-[#fafafa] border-t border-[rgba(0,0,0,0.15)] flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-[36px] px-3 rounded-[8px] border border-[#d6d6d6] bg-[#ffffff] font-ui text-xs text-[#5f5f5f] hover:text-[#202020] state-layer-std"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="h-[36px] px-4 rounded-[8px] bg-[#466fa1] text-white font-ui text-xs font-bold flex items-center gap-1.5 state-layer-on-color"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Lưu cập nhật</span>
          </button>
        </div>
      </div>
    </div>
  );
};
