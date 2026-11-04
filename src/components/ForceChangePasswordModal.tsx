/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MemberItem } from '../types';
import { forceUpdatePassword, DEFAULT_PRODUCT_PASSWORD } from '../utils/authService';
import { Lock, Eye, EyeOff, ShieldAlert, CheckCircle2, AlertCircle } from './vds/icons';

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
        className="w-full max-w-md bg-surface rounded-vds-xl shadow-sheet border border-line overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-surface-negative to-surface-accent-faint border-b border-line">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-negative-solid text-on-color flex items-center justify-center shrink-0 ">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-title text-base sm:text-lg font-bold text-ink">
                Yêu cầu đổi mật khẩu mới
              </h2>
              <p className="text-xs text-subdued font-ui mt-0.5">
                Tài khoản: <strong className="text-accent">@{member.username || member.id}</strong> ({member.name})
              </p>
            </div>
          </div>
        </div>

        {/* Content & Form */}
        <div className="p-6 space-y-4">
          <p className="text-xs font-ui text-ink-lighter leading-relaxed">
            Để đảm bảo an toàn dữ liệu hệ thống WMS, bạn cần thiết lập mật khẩu riêng trước khi tiếp tục làm việc.
          </p>

          <AnimatePresence>
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3 bg-surface-negative border border-line rounded-vds-lg flex items-start gap-2 text-xs text-negative"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-negative" />
                <span className="font-medium leading-relaxed">{errorMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* New Password */}
            <div className="space-y-1.5">
              <label className="block text-xs font-ui font-bold text-ink-lighter">
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
                  className="w-full px-3 py-2.5 bg-surface border border-line focus:border-line-accent focus:ring-2 focus:ring-line-accent/10 rounded-vds-lg text-xs font-medium text-ink outline-hidden font-mono"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-subdued-lighter hover:text-ink-lighter cursor-pointer"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="block text-xs font-ui font-bold text-ink-lighter">
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
                  className="w-full px-3 py-2.5 bg-surface border border-line focus:border-line-accent focus:ring-2 focus:ring-line-accent/10 rounded-vds-lg text-xs font-medium text-ink outline-hidden font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-subdued-lighter hover:text-ink-lighter cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-accent-solid hover:bg-accent-solid-hover text-on-color font-ui text-xs font-bold rounded-vds-lg transition-colors shadow-pop flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 mt-2"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-surface/30 border-t-white rounded-full animate-spin" />
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
                className="w-full text-center text-xs font-ui text-subdued hover:text-ink hover:underline pt-1 cursor-pointer"
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
