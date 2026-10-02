/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MemberItem } from '../types';
import { forceUpdatePassword, DEFAULT_PRODUCT_PASSWORD } from '../utils/authService';
import { Lock, Eye, EyeOff, ShieldAlert, CheckCircle2, AlertCircle } from 'lucide-react';

interface ForceChangePasswordModalProps {
  isOpen: boolean;
  member: MemberItem;
  onSuccess: () => void;
  onLogout?: () => void;
}

export const ForceChangePasswordModal: React.FC<ForceChangePasswordModalProps> = ({
  isOpen,
  member,
  onSuccess,
  onLogout,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!newPassword) {
      setErrorMsg('Vui lòng nhập mật khẩu mới.');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg('Mật khẩu mới phải có tối thiểu 6 ký tự.');
      return;
    }
    if (newPassword === DEFAULT_PRODUCT_PASSWORD) {
      setErrorMsg('Vui lòng đặt mật khẩu mới riêng, không dùng mật khẩu mặc định.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Xác nhận mật khẩu mới không trùng khớp.');
      return;
    }

    setIsSubmitting(true);
    try {
      const username = member.username || member.id;
      const res = await forceUpdatePassword(username, newPassword);
      setIsSubmitting(false);

      if (res.success) {
        onSuccess();
      } else {
        setErrorMsg(res.error || 'Không thể cập nhật mật khẩu. Vui lòng thử lại.');
      }
    } catch {
      setIsSubmitting(false);
      setErrorMsg('Lỗi kết nối. Vui lòng thử lại.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-body">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="w-full max-w-md bg-white rounded-[16px] shadow-2xl border border-[#e2e8f0] overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-[#fff1f2] to-[#fdf2f8] border-b border-[#fecdd3]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#be123c] text-white flex items-center justify-center shrink-0 shadow-sm">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-title text-base sm:text-lg font-bold text-[#1e293b]">
                Yêu cầu đổi mật khẩu mới
              </h2>
              <p className="text-xs text-[#64748b] font-ui mt-0.5">
                Tài khoản: <strong className="text-[#963861]">@{member.username || member.id}</strong> ({member.name})
              </p>
            </div>
          </div>
        </div>

        {/* Content & Form */}
        <div className="p-6 space-y-4">
          <p className="text-xs font-ui text-[#475569] leading-relaxed">
            Để đảm bảo an toàn dữ liệu hệ thống WMS, bạn cần thiết lập mật khẩu riêng trước khi tiếp tục làm việc.
          </p>

          <AnimatePresence>
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3 bg-[#fef2f2] border border-[#fecaca] rounded-[8px] flex items-start gap-2 text-xs text-[#b91c1c]"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#dc2626]" />
                <span className="font-medium leading-relaxed">{errorMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* New Password */}
            <div className="space-y-1.5">
              <label className="block text-xs font-ui font-bold text-[#334155]">
                Mật khẩu mới
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder="Tối thiểu 6 ký tự..."
                  className="w-full px-3 py-2.5 bg-white border border-[#cbd5e1] focus:border-[#963861] focus:ring-2 focus:ring-[#963861]/10 rounded-[8px] text-xs font-medium text-[#1e293b] outline-hidden font-mono"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#94a3b8] hover:text-[#475569] cursor-pointer"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="block text-xs font-ui font-bold text-[#334155]">
                Xác nhận mật khẩu mới
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder="Nhập lại mật khẩu mới..."
                  className="w-full px-3 py-2.5 bg-white border border-[#cbd5e1] focus:border-[#963861] focus:ring-2 focus:ring-[#963861]/10 rounded-[8px] text-xs font-medium text-[#1e293b] outline-hidden font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#94a3b8] hover:text-[#475569] cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-[#963861] hover:bg-[#832e52] text-white font-ui text-xs font-bold rounded-[8px] transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 mt-2"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Đang lưu mật khẩu...
                </span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Xác nhận & Vào hệ thống</span>
                </>
              )}
            </button>

            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="w-full text-center text-xs font-ui text-[#64748b] hover:text-[#0f172a] hover:underline pt-1 cursor-pointer"
              >
                Đăng xuất tài khoản
              </button>
            )}
          </form>
        </div>
      </motion.div>
    </div>
  );
};
