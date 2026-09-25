/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { TaskItem } from '../types';
import { CheckCircle2, X, ExternalLink, Link2, AlertCircle } from 'lucide-react';
import { isValidUrl, validateResultLink, normalizeUrl } from '../utils/urlValidator';

interface CompleteTaskModalProps {
  task: TaskItem;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (taskId: string, resultLink: string) => void;
}

export const CompleteTaskModal: React.FC<CompleteTaskModalProps> = ({
  task,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [resultLink, setResultLink] = useState(task.resultLink || '');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleUseWorkLink = () => {
    if (task.workLink) {
      if (!isValidUrl(task.workLink)) {
        setError('Link làm việc hiện tại không đúng định dạng URL hợp lệ.');
        return;
      }
      setResultLink(task.workLink);
      setError('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateResultLink(resultLink);
    if (!validation.isValid) {
      setError(validation.error || 'Link không đúng định dạng URL.');
      return;
    }
    const finalLink = validation.normalizedUrl || normalizeUrl(resultLink);
    onConfirm(task.id, finalLink);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div
        className="bg-white rounded-[12px] border border-[#e0e0e0] max-w-md w-full p-5 sm:p-6 shadow-xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#f0f0f0] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#f0fdf4] text-[#166534] flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-[#15803d]" />
            </div>
            <h3 className="font-title font-bold text-sm text-[#202020]">
              Hoàn thành công việc
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-[#71717a] hover:text-[#202020] hover:bg-[#f0f0f0] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Task Title Context */}
        <div className="p-3 bg-[#f8fafc] border border-[#e2e8f0] rounded-[8px]">
          <span className="text-[11px] font-ui font-semibold text-[#64748b] block mb-0.5">
            Công việc:
          </span>
          <p className="font-title text-xs font-bold text-[#1e293b] leading-snug">
            {task.title}
          </p>
          <div className="flex items-center gap-2 text-[11px] font-ui text-[#64748b] mt-1.5">
            <span>{task.projectName}</span>
            <span>•</span>
            <span>{task.assignee}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-ui font-bold text-[#3f3f46]">
                Link hoàn thành: <span className="text-[#dc2626]">*</span>
              </label>

              {task.workLink && (
                <button
                  type="button"
                  onClick={handleUseWorkLink}
                  className="text-[11px] font-ui font-semibold text-[#963861] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Link2 className="w-3 h-3" />
                  <span>Dùng link làm việc</span>
                </button>
              )}
            </div>

            <input
              type="text"
              autoFocus
              required
              value={resultLink}
              onChange={(e) => {
                setResultLink(e.target.value);
                if (error) setError('');
              }}
              placeholder="https://... (Figma, PRD, Báo cáo, Code, Staging...)"
              className={`w-full px-3 py-2 border rounded-[6px] text-xs font-ui text-[#202020] focus:outline-hidden ${
                error
                  ? 'border-[#dc2626] focus:border-[#dc2626] bg-[#fef2f2]'
                  : 'border-[#d4d4d8] focus:border-[#15803d]'
              }`}
            />

            {error && (
              <p className="text-[11px] font-ui text-[#dc2626] font-semibold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </p>
            )}

            {isValidUrl(resultLink) && (
              <div className="flex items-center justify-between text-[11px] font-ui bg-[#f0fdf4] text-[#166534] px-2.5 py-1.5 rounded-[6px] border border-[#bbf7d0]">
                <span className="truncate max-w-[260px]">Đích đến: {normalizeUrl(resultLink)}</span>
                <a
                  href={normalizeUrl(resultLink)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold hover:underline flex items-center gap-1 shrink-0 ml-2"
                >
                  <span>Mở kiểm tra</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            <p className="text-[11px] font-ui text-[#71717a]">
              Bắt buộc nhập đường dẫn kết quả sản phẩm để hoàn tất và lưu vết nghiệm thu.
            </p>
            <p className="text-[11px] font-ui text-[#963861] font-medium">
              * Lưu ý: Đảm bảo các thành viên Product có thể truy cập link.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#f0f0f0]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-[6px] border border-[#d4d4d8] text-xs font-ui font-semibold text-[#52525b] hover:bg-[#f4f4f5] cursor-pointer"
            >
              Huỷ
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-[6px] bg-[#15803d] hover:bg-[#166534] text-white text-xs font-ui font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Xác nhận hoàn thành</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
