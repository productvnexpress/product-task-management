/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MemberItem } from '../types';
import { login, DEFAULT_PRODUCT_PASSWORD, isProductMember } from '../utils/authService';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  Sparkles,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

interface LoginViewProps {
  members: MemberItem[];
  onLoginSuccess: (user: MemberItem) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ members, onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showQuickSelect, setShowQuickSelect] = useState(false);

  // Lọc 12 nhân sự nhóm Product
  const productMembers = members.filter(isProductMember);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('Vui lòng nhập tên tài khoản (username).');
      return;
    }
    if (!password) {
      setError('Vui lòng nhập mật khẩu.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const res = login(username, password, members);
      setIsLoading(false);

      if (res.success && res.user) {
        onLoginSuccess(res.user);
      } else {
        setError(res.error || 'Đăng nhập không thành công.');
      }
    }, 250);
  };

  const handleSelectMemberChip = (mem: MemberItem) => {
    setUsername(mem.username || mem.id);
    setPassword(DEFAULT_PRODUCT_PASSWORD);
    setError('');
    setShowQuickSelect(false);
  };

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden font-body">
      {/* Decorative background gradients */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#963861]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#0f62fe]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="w-full max-w-[440px] bg-white rounded-[16px] border border-[#e2e8f0] shadow-xl p-6 sm:p-8 relative z-10"
      >
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-[12px] bg-[#963861] text-white shadow-md mb-3">
            <span className="font-title font-black text-xl tracking-tight">VnE</span>
          </div>
          <h1 className="font-title text-xl sm:text-2xl font-black text-[#1e293b] tracking-tight">
            Ban Sản phẩm - Công nghệ
          </h1>
          <p className="text-xs text-[#64748b] mt-1 font-ui">
            Hệ thống Quản lý Công việc & Dự án (WMS)
          </p>
        </div>

        {/* Error Notification */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -8 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="mb-4 p-3 bg-[#fef2f2] border border-[#fecaca] rounded-[8px] flex items-start gap-2.5 text-xs text-[#b91c1c] overflow-hidden"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#dc2626]" />
              <span className="font-medium leading-relaxed">{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block font-ui text-xs font-bold text-[#475569]">
                Tên tài khoản (Account)
              </label>
              <button
                type="button"
                onClick={() => setShowQuickSelect(!showQuickSelect)}
                className="text-[11px] font-bold text-[#963861] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                <span>Gợi ý 12 nhân sự</span>
              </button>
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#94a3b8]">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Ví dụ: tienngoc, huyanh, duytung..."
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#cbd5e1] focus:border-[#963861] focus:ring-2 focus:ring-[#963861]/10 rounded-[8px] text-xs font-medium text-[#1e293b] placeholder-[#94a3b8] transition-all outline-hidden"
                autoFocus
              />
            </div>

            {/* Quick Member Selector Drawer/Dropdown */}
            <AnimatePresence>
              {showQuickSelect && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden border border-[#e2e8f0] rounded-[8px] bg-[#f8fafc] p-2 mt-2"
                >
                  <p className="text-[10px] text-[#64748b] font-bold mb-1.5 px-1 uppercase tracking-wider">
                    Nhấp chọn tài khoản Product:
                  </p>
                  <div className="grid grid-cols-2 gap-1 max-h-44 overflow-y-auto pr-1">
                    {productMembers.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleSelectMemberChip(m)}
                        className="text-left px-2 py-1.5 rounded-[6px] hover:bg-white hover:border-[#cbd5e1] border border-transparent text-xs transition-colors flex flex-col cursor-pointer"
                      >
                        <span className="font-bold text-[#1e293b] truncate text-[11px]">
                          {m.name}
                        </span>
                        <span className="text-[10px] text-[#963861] font-mono">
                          @{m.username}
                        </span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <label className="block font-ui text-xs font-bold text-[#475569]">
              Mật khẩu
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#94a3b8]">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Nhập mật khẩu..."
                className="w-full pl-9 pr-10 py-2.5 bg-white border border-[#cbd5e1] focus:border-[#963861] focus:ring-2 focus:ring-[#963861]/10 rounded-[8px] text-xs font-medium text-[#1e293b] placeholder-[#94a3b8] transition-all outline-hidden font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#94a3b8] hover:text-[#475569] cursor-pointer"
                title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-2.5 px-4 bg-[#963861] hover:bg-[#832e52] text-white font-ui text-xs font-bold rounded-[8px] transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Đang xác thực...
              </span>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Đăng nhập</span>
              </>
            )}
          </motion.button>
        </form>

        {/* Default Password Helper Card */}
        <div className="mt-5 p-3 rounded-[8px] bg-[#fffbfd] border border-[#f3c2d4] text-[11px] text-[#64748b] flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-[#963861] shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold text-[#963861]">Mật khẩu mặc định ban đầu:</span>{' '}
            <code className="font-mono font-bold text-[#1e293b] bg-white px-1.5 py-0.5 rounded border border-[#e2e8f0]">
              {DEFAULT_PRODUCT_PASSWORD}
            </code>
            <p className="text-[10px] text-[#64748b] mt-0.5">
              Bạn có thể đổi mật khẩu mới trong mục Quản lý Hồ sơ cá nhân sau khi đăng nhập.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Footer copyright */}
      <div className="mt-6 text-center text-xs text-[#94a3b8] font-ui">
        © 2026 Ban Sản phẩm - Công nghệ VnExpress. Single Source of Truth (SSOT).
      </div>
    </div>
  );
};
