/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { TaskItem } from '../types';
import { CheckCircle2, X, ExternalLink, Link2, AlertCircle } from './vds/icons';
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
        className="bg-surface rounded-vds-lg border border-line max-w-md w-full p-5 sm:p-6 shadow-sheet space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-divider pb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-surface-positive text-positive flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-positive" />
            </div>
            <h3 className="font-title font-bold text-sm text-ink">
              Hoàn thành công việc
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-subdued hover:text-ink hover:bg-surface-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Task Title Context */}
        <div className="p-3 bg-surface-100 border border-line rounded-vds-lg">
          <span className="text-xs font-ui font-semibold text-subdued block mb-0.5">
            Công việc:
          </span>
          <p className="font-title text-xs font-bold text-ink leading-snug">
            {task.title}
          </p>
          <div className="flex items-center gap-2 text-xs font-ui text-subdued mt-1.5">
            <span>{task.projectName}</span>
            <span>•</span>
            <span>{task.assignee}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-ui font-bold text-ink-lighter">
                Link hoàn thành: <span className="text-negative">*</span>
              </label>

              {task.workLink && (
                <button
                  type="button"
                  onClick={handleUseWorkLink}
                  className="text-xs font-ui font-semibold text-accent hover:underline flex items-center gap-1 cursor-pointer"
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
              className={`w-full px-3 py-2 border rounded-vds-lg text-xs font-ui text-ink focus:outline-hidden ${
                error
                  ? 'border-line-negative focus:border-line-negative bg-surface-negative'
                  : 'border-line focus:border-line-positive'
              }`}
            />

            {error && (
              <p className="text-xs font-ui text-negative font-semibold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </p>
            )}

            {isValidUrl(resultLink) && (
              <div className="flex items-center justify-between text-xs font-ui bg-surface-positive text-positive px-2.5 py-1.5 rounded-vds-lg border border-line">
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

            <p className="text-xs font-ui text-subdued">
              Bắt buộc nhập đường dẫn kết quả sản phẩm để hoàn tất và lưu vết nghiệm thu.
            </p>
            <p className="text-xs font-ui text-accent font-medium">
              * Lưu ý: Đảm bảo các thành viên Product có thể truy cập link.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-divider">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-vds-lg border border-line text-xs font-ui font-semibold text-ink-lighter hover:bg-surface-200 cursor-pointer"
            >
              Huỷ
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-vds-lg bg-positive-solid hover:bg-positive-solid text-on-color text-xs font-ui font-bold cursor-pointer flex items-center gap-1.5"
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
