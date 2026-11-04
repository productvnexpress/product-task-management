/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MemberItem, NotificationItem } from '../types';
import { isSamePersonName, getProductMembers } from '../utils/memberPersonalization';
import {
  Send,
  X,
  Search,
  CheckSquare,
  Square,
  Users,
  AlertCircle,
  Megaphone,
  CheckCircle2,
} from './vds/icons';

interface AdminSendMessageModalProps {
  isOpen: boolean;
  members: MemberItem[];
  currentUser: MemberItem;
  initialRecipientName?: string;
  onClose: () => void;
  onSend: (notifications: NotificationItem[]) => Promise<void> | void;
}

export const AdminSendMessageModal: React.FC<AdminSendMessageModalProps> = ({
  isOpen,
  members,
  currentUser,
  initialRecipientName,
  onClose,
  onSend,
}) => {
  const productMembers = useMemo(() => getProductMembers(members), [members]);

  // Selected recipient keys (lowercase username or name)
  const [selectedKeys, setSelectedKeys] = useState<string[]>(() => {
    if (initialRecipientName) {
      const match = members.find((m) => isSamePersonName(m.name, initialRecipientName));
      if (match) return [(match.username || match.name).toLowerCase()];
    }
    return [];
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Sync initialRecipientName when modal opens
  React.useEffect(() => {
    if (isOpen) {
      if (initialRecipientName) {
        const match = members.find((m) => isSamePersonName(m.name, initialRecipientName));
        if (match) {
          setSelectedKeys([(match.username || match.name).toLowerCase()]);
        }
      }
      setErrorMsg('');
      setIsSending(false);
    }
  }, [isOpen, initialRecipientName, members]);

  if (!isOpen) return null;

  const filteredMembers = productMembers.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      (m.username || '').toLowerCase().includes(q) ||
      (m.team || '').toLowerCase().includes(q)
    );
  });

  const toggleMember = (m: MemberItem) => {
    const key = (m.username || m.name).toLowerCase();
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const selectAllProduct = () => {
    setSelectedKeys(productMembers.map((m) => (m.username || m.name).toLowerCase()));
  };

  const selectByTeam = (team: string) => {
    const keys = productMembers
      .filter((m) => m.team === team)
      .map((m) => (m.username || m.name).toLowerCase());
    setSelectedKeys(keys);
  };

  const clearSelection = () => {
    setSelectedKeys([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (selectedKeys.length === 0) {
      setErrorMsg('Vui lòng chọn ít nhất một nhân sự nhận thông điệp.');
      return;
    }
    if (!title.trim()) {
      setErrorMsg('Vui lòng nhập tiêu đề thông điệp.');
      return;
    }
    if (!content.trim()) {
      setErrorMsg('Vui lòng nhập nội dung thông điệp.');
      return;
    }

    const recipients = productMembers.filter((m) =>
      selectedKeys.includes((m.username || m.name).toLowerCase())
    );

    const nowIso = new Date().toISOString();
    const cleanTitle = title.trim();
    const cleanContent = content.trim();

    const notifs: NotificationItem[] = recipients.map((m) => {
      const safeKey = (m.username || m.name).toLowerCase().replace(/[\s\/\\]+/g, '_');
      return {
        id: `notif-admin-msg-${Date.now()}-${safeKey}`,
        recipientName: m.name,
        recipientId: m.username || m.id,
        actorName: `${currentUser.name} (Admin)`,
        projectName: 'Thông điệp Quản trị',
        type: 'admin_broadcast',
        title: cleanTitle,
        content: cleanContent,
        isRead: false,
        createdAt: nowIso,
      };
    });

    setIsSending(true);
    try {
      await onSend(notifs);
      setIsSending(false);
      onClose();
    } catch {
      setIsSending(false);
      setErrorMsg('Không thể gửi thông điệp. Vui lòng thử lại.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs font-body">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        className="w-full max-w-lg bg-surface rounded-vds-xl shadow-sheet border border-line overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-5 border-b border-divider flex items-center justify-between bg-gradient-to-r from-surface-100 to-surface-support">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-extreme-solid text-on-color flex items-center justify-center shrink-0 ">
              <Megaphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-title text-sm sm:text-base font-bold text-ink">
                Gửi thông điệp quản trị
              </h3>
              <p className="text-xs font-ui text-subdued">
                Người gửi: <strong className="text-extreme">{currentUser.name}</strong> (Quản trị viên)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-subdued-lighter hover:text-ink rounded-full hover:bg-surface-300 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          <AnimatePresence>
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3 bg-surface-negative border border-line rounded-vds-lg flex items-start gap-2 text-xs text-negative"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-negative" />
                <span className="leading-relaxed">{errorMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Recipient Selection Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-ui font-bold text-ink-lighter flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-extreme" />
                <span>Người nhận:</span>
                <span className="text-extreme font-extrabold bg-surface-200 px-2 py-0.5 rounded-full text-xs">
                  {selectedKeys.length} nhân sự
                </span>
              </label>

              {/* Quick Pills */}
              <div className="flex items-center gap-1 text-[10px] font-ui">
                <button
                  type="button"
                  onClick={selectAllProduct}
                  className="px-2 py-0.5 rounded-vds-md bg-surface-200 hover:bg-surface-200 text-extreme font-bold cursor-pointer transition-colors"
                >
                  Tất cả ({productMembers.length})
                </button>
                <button
                  type="button"
                  onClick={() => selectByTeam('Product Manager')}
                  className="px-1.5 py-0.5 rounded-vds-md bg-surface-200 hover:bg-surface-300 text-ink-lighter font-medium cursor-pointer transition-colors"
                >
                  PM
                </button>
                <button
                  type="button"
                  onClick={() => selectByTeam('UX/UI Designer')}
                  className="px-1.5 py-0.5 rounded-vds-md bg-surface-200 hover:bg-surface-300 text-ink-lighter font-medium cursor-pointer transition-colors"
                >
                  Design
                </button>
                <button
                  type="button"
                  onClick={() => selectByTeam('SEO')}
                  className="px-1.5 py-0.5 rounded-vds-md bg-surface-200 hover:bg-surface-300 text-ink-lighter font-medium cursor-pointer transition-colors"
                >
                  SEO
                </button>
                <button
                  type="button"
                  onClick={() => selectByTeam('Data')}
                  className="px-1.5 py-0.5 rounded-vds-md bg-surface-200 hover:bg-surface-300 text-ink-lighter font-medium cursor-pointer transition-colors"
                >
                  Data
                </button>
                {selectedKeys.length > 0 && (
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="px-1.5 py-0.5 rounded-vds-md text-negative hover:bg-surface-negative font-medium cursor-pointer transition-colors"
                  >
                    Bỏ chọn
                  </button>
                )}
              </div>
            </div>

            {/* Member Checkbox List with Search */}
            <div className="border border-line rounded-vds-lg overflow-hidden bg-surface">
              <div className="p-2 border-b border-divider bg-surface-100 flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-subdued-lighter shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm nhân sự theo tên, username..."
                  className="w-full text-xs font-ui bg-transparent outline-hidden text-ink placeholder-subdued-lighter"
                />
              </div>

              <div className="max-h-36 overflow-y-auto p-1.5 divide-y divide-divider">
                {filteredMembers.map((m) => {
                  const key = (m.username || m.name).toLowerCase();
                  const isSelected = selectedKeys.includes(key);
                  return (
                    <div
                      key={m.id}
                      onClick={() => toggleMember(m)}
                      className={`flex items-center justify-between p-2 rounded-vds-lg text-xs font-ui cursor-pointer transition-colors ${
                        isSelected ? 'bg-surface-100 text-extreme' : 'hover:bg-surface-100 text-ink-lighter'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-extreme shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-icon-subdued shrink-0" />
                        )}
                        <span className="font-bold truncate">{m.name}</span>
                        <span className="text-[10px] text-subdued">@{m.username || m.id}</span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-200 text-subdued shrink-0 font-medium">
                        {m.team}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Title Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-ui font-bold text-ink-lighter">
              Tiêu đề thông điệp
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              placeholder="Ví dụ: Nhắc nhở nộp báo cáo quý, Kế hoạch triển khai release..."
              className="w-full px-3 py-2 bg-surface border border-line focus:border-line-support focus:ring-2 focus:ring-line-support/10 rounded-vds-lg text-xs font-medium text-ink outline-hidden"
            />
          </div>

          {/* Content Textarea */}
          <div className="space-y-1.5">
            <label className="block text-xs font-ui font-bold text-ink-lighter">
              Nội dung thông điệp
            </label>
            <textarea
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              rows={4}
              placeholder="Nhập nội dung ngắn gọn, súc tích gửi tới các nhân sự được chọn..."
              className="w-full px-3 py-2 bg-surface border border-line focus:border-line-support focus:ring-2 focus:ring-line-support/10 rounded-vds-lg text-xs font-medium text-ink outline-hidden leading-relaxed resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-divider">
            <button
              type="button"
              onClick={onClose}
              disabled={isSending}
              className="px-3.5 py-2 text-xs font-ui font-medium text-subdued hover:bg-surface-200 rounded-vds-lg cursor-pointer transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSending || selectedKeys.length === 0}
              className="px-4 py-2 bg-extreme-solid hover:bg-extreme-solid text-on-color font-ui text-xs font-bold rounded-vds-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {isSending ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 border-2 border-surface/30 border-t-white rounded-full animate-spin" />
                  Đang phát thông điệp...
                </span>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Gửi tới {selectedKeys.length} nhân sự</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
