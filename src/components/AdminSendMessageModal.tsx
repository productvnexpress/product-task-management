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
} from 'lucide-react';

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
        className="w-full max-w-lg bg-white rounded-[16px] shadow-2xl border border-[#e2e8f0] overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-5 border-b border-[#f1f5f9] flex items-center justify-between bg-gradient-to-r from-[#faf5ff] to-[#f5f3ff]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#7e22ce] text-white flex items-center justify-center shrink-0 shadow-sm">
              <Megaphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-title text-sm sm:text-base font-bold text-[#1e293b]">
                Gửi thông điệp quản trị
              </h3>
              <p className="text-[11px] font-ui text-[#64748b]">
                Người gửi: <strong className="text-[#7e22ce]">{currentUser.name}</strong> (Quản trị viên)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#94a3b8] hover:text-[#1e293b] rounded-full hover:bg-[#e2e8f0] cursor-pointer"
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
                className="p-3 bg-[#fef2f2] border border-[#fecaca] rounded-[8px] flex items-start gap-2 text-xs text-[#b91c1c]"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#dc2626]" />
                <span className="leading-relaxed">{errorMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Recipient Selection Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-ui font-bold text-[#334155] flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#7e22ce]" />
                <span>Người nhận:</span>
                <span className="text-[#7e22ce] font-extrabold bg-[#f3e8ff] px-2 py-0.5 rounded-full text-[11px]">
                  {selectedKeys.length} nhân sự
                </span>
              </label>

              {/* Quick Pills */}
              <div className="flex items-center gap-1 text-[10px] font-ui">
                <button
                  type="button"
                  onClick={selectAllProduct}
                  className="px-2 py-0.5 rounded-[4px] bg-[#f3e8ff] hover:bg-[#e9d5ff] text-[#7e22ce] font-bold cursor-pointer transition-colors"
                >
                  Tất cả ({productMembers.length})
                </button>
                <button
                  type="button"
                  onClick={() => selectByTeam('Product Manager')}
                  className="px-1.5 py-0.5 rounded-[4px] bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#475569] font-medium cursor-pointer transition-colors"
                >
                  PM
                </button>
                <button
                  type="button"
                  onClick={() => selectByTeam('UX/UI Designer')}
                  className="px-1.5 py-0.5 rounded-[4px] bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#475569] font-medium cursor-pointer transition-colors"
                >
                  Design
                </button>
                <button
                  type="button"
                  onClick={() => selectByTeam('SEO')}
                  className="px-1.5 py-0.5 rounded-[4px] bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#475569] font-medium cursor-pointer transition-colors"
                >
                  SEO
                </button>
                <button
                  type="button"
                  onClick={() => selectByTeam('Data')}
                  className="px-1.5 py-0.5 rounded-[4px] bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#475569] font-medium cursor-pointer transition-colors"
                >
                  Data
                </button>
                {selectedKeys.length > 0 && (
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="px-1.5 py-0.5 rounded-[4px] text-[#dc2626] hover:bg-[#fef2f2] font-medium cursor-pointer transition-colors"
                  >
                    Bỏ chọn
                  </button>
                )}
              </div>
            </div>

            {/* Member Checkbox List with Search */}
            <div className="border border-[#cbd5e1] rounded-[8px] overflow-hidden bg-white">
              <div className="p-2 border-b border-[#f1f5f9] bg-[#f8fafc] flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-[#94a3b8] shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm nhân sự theo tên, username..."
                  className="w-full text-xs font-ui bg-transparent outline-hidden text-[#1e293b] placeholder-[#94a3b8]"
                />
              </div>

              <div className="max-h-36 overflow-y-auto p-1.5 divide-y divide-[#f1f5f9]">
                {filteredMembers.map((m) => {
                  const key = (m.username || m.name).toLowerCase();
                  const isSelected = selectedKeys.includes(key);
                  return (
                    <div
                      key={m.id}
                      onClick={() => toggleMember(m)}
                      className={`flex items-center justify-between p-2 rounded-[6px] text-xs font-ui cursor-pointer transition-colors ${
                        isSelected ? 'bg-[#faf5ff] text-[#7e22ce]' : 'hover:bg-[#f8fafc] text-[#334155]'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-[#7e22ce] shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-[#cbd5e1] shrink-0" />
                        )}
                        <span className="font-bold truncate">{m.name}</span>
                        <span className="text-[10px] text-[#64748b]">@{m.username || m.id}</span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#f1f5f9] text-[#64748b] shrink-0 font-medium">
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
            <label className="block text-xs font-ui font-bold text-[#334155]">
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
              className="w-full px-3 py-2 bg-white border border-[#cbd5e1] focus:border-[#7e22ce] focus:ring-2 focus:ring-[#7e22ce]/10 rounded-[8px] text-xs font-medium text-[#1e293b] outline-hidden"
            />
          </div>

          {/* Content Textarea */}
          <div className="space-y-1.5">
            <label className="block text-xs font-ui font-bold text-[#334155]">
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
              className="w-full px-3 py-2 bg-white border border-[#cbd5e1] focus:border-[#7e22ce] focus:ring-2 focus:ring-[#7e22ce]/10 rounded-[8px] text-xs font-medium text-[#1e293b] outline-hidden leading-relaxed resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#f1f5f9]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSending}
              className="px-3.5 py-2 text-xs font-ui font-medium text-[#64748b] hover:bg-[#f1f5f9] rounded-[8px] cursor-pointer transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSending || selectedKeys.length === 0}
              className="px-4 py-2 bg-[#7e22ce] hover:bg-[#6b21a8] text-white font-ui text-xs font-bold rounded-[8px] transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {isSending ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
