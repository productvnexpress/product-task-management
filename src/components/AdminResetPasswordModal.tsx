/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MemberItem } from '../types';
import { adminResetPassword, DEFAULT_PRODUCT_PASSWORD } from '../utils/authService';
import { KeyRound, X, Check, AlertCircle, ShieldAlert, Eye, EyeOff } from 'lucide-react';

interface AdminResetPasswordModalProps {
  isOpen: boolean;
  member: MemberItem | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export const AdminResetPasswordModal: React.FC<AdminResetPasswordModalProps> = ({
  isOpen,
  member,
  onClose,
  onSuccess,
}) => {
  const [resetType, setResetType] = useState<'default' | 'custom'>('default');
  const [customPassword, setCustomPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !member) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (resetType === 'custom') {
      if (!customPassword.trim()) {
        setErrorMsg('Vui lòng nhập mật khẩu mới tạm thời.');
        return;
      }
      if (customPassword.trim().length < 6) {
        setErrorMsg('Mật khẩu tạm thời phải có tối thiểu 6 ký tự.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const username = member.username || member.id;
      const res = await adminResetPassword(
        username,
        resetType,
        resetType === 'custom' ? customPassword : undefined
      );
      setIsSubmitting(false);

      if (res.success) {
        onSuccess(
          res.message ||
            `Đã reset mật khẩu cho ${member.name}. User sẽ phải đổi mật khẩu khi đăng nhập.`
        );
        onClose();
      } else {
        setErrorMsg(res.error || 'Không thể reset mật khẩu.');
      }
    } catch {
      setIsSubmitting(false);
      setErrorMsg('Lỗi kết nối. Vui lòng thử lại.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs font-body">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-md bg-white rounded-[16px] shadow-2xl border border-[#e2e8f0] overflow-hidden"
      >
        {/* Header */}
        <div className="p-5 border-b border-[#f1f5f9] flex items-center justify-between bg-[#f8fafc]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#fdf2f7] text-[#963861] border border-[#f3c2d4] flex items-center justify-center shrink-0">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-title text-sm font-bold text-[#1e293b]">
                Reset mật khẩu nhân sự
              </h3>
              <p className="text-[11px] font-ui text-[#64748b]">
                {member.name} (@{member.username || member.id})
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="p-3 bg-[#fff7ed] border border-[#fed7aa] rounded-[8px] flex items-start gap-2 text-xs text-[#9a3412]">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-[#ea580c]" />
            <span className="leading-relaxed text-[11px]">
              Sau khi reset, user sẽ <strong>bắt buộc phải đổi mật khẩu mới</strong> ngay ở lần đăng nhập tiếp theo.
            </span>
          </div>

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

          {/* Reset Options */}
          <div className="space-y-2">
            <label className="block text-xs font-ui font-bold text-[#334155]">
              Phương thức đặt lại:
            </label>
            <div className="space-y-2 text-xs font-ui">
              <label
                className={`flex items-start gap-2.5 p-3 rounded-[8px] border cursor-pointer transition-colors ${
                  resetType === 'default'
                    ? 'border-[#963861] bg-[#fdf2f7]/60'
                    : 'border-[#e2e8f0] hover:bg-[#f8fafc]'
                }`}
              >
                <input
                  type="radio"
                  name="resetType"
                  value="default"
                  checked={resetType === 'default'}
                  onChange={() => setResetType('default')}
                  className="mt-0.5 text-[#963861] focus:ring-[#963861]"
                />
                <div>
                  <span className="font-bold text-[#1e293b]">Đặt lại về mật khẩu mặc định</span>
                  <p className="text-[11px] text-[#64748b] mt-0.5">
                    Mật khẩu sẽ là <code className="font-mono bg-white px-1 border rounded text-[#963861]">{DEFAULT_PRODUCT_PASSWORD}</code>.
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-2.5 p-3 rounded-[8px] border cursor-pointer transition-colors ${
                  resetType === 'custom'
                    ? 'border-[#963861] bg-[#fdf2f7]/60'
                    : 'border-[#e2e8f0] hover:bg-[#f8fafc]'
                }`}
              >
                <input
                  type="radio"
                  name="resetType"
                  value="custom"
                  checked={resetType === 'custom'}
                  onChange={() => setResetType('custom')}
                  className="mt-0.5 text-[#963861] focus:ring-[#963861]"
                />
                <div>
                  <span className="font-bold text-[#1e293b]">Thiết lập mật khẩu tạm thời cụ thể</span>
                  <p className="text-[11px] text-[#64748b] mt-0.5">
                    Tự đặt mật khẩu mới để cấp trực tiếp cho nhân sự.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Custom Password Input */}
          {resetType === 'custom' && (
            <div className="space-y-1.5 pt-1">
              <label className="block text-xs font-ui font-bold text-[#334155]">
                Mật khẩu tạm thời mới
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={customPassword}
                  onChange={(e) => {
                    setCustomPassword(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder="Nhập mật khẩu tạm thời (tối thiểu 6 ký tự)..."
                  className="w-full px-3 py-2 bg-white border border-[#cbd5e1] focus:border-[#963861] focus:ring-2 focus:ring-[#963861]/10 rounded-[8px] text-xs font-medium text-[#1e293b] outline-hidden font-mono"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#94a3b8] hover:text-[#475569] cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3.5 py-2 text-xs font-ui font-medium text-[#64748b] hover:bg-[#f1f5f9] rounded-[8px] cursor-pointer transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-[#963861] hover:bg-[#832e52] text-white font-ui text-xs font-bold rounded-[8px] transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Đang xử lý...
                </span>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Xác nhận Reset</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
