/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MemberItem, TeamType } from '../types';
import { changePassword } from '../utils/authService';
import { workingTimeService } from '../services/workingTimeService';
import {
  X,
  User,
  KeyRound,
  Shield,
  Mail,
  Phone,
  Building2,
  MapPin,
  Calendar,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Lock,
} from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: MemberItem;
  initialTab?: 'profile' | 'password';
}

const getTeamColor = (team: TeamType) => {
  switch (team) {
    case 'Product Manager':
      return { bg: 'bg-[#963861]', lightBg: 'bg-[#fcf0f5]', text: 'text-[#963861]', border: 'border-[#f3c2d4]' };
    case 'UX/UI Designer':
      return { bg: 'bg-[#0f62fe]', lightBg: 'bg-[#eff6ff]', text: 'text-[#1d4ed8]', border: 'border-[#bfdbfe]' };
    case 'SEO':
      return { bg: 'bg-[#7c3aed]', lightBg: 'bg-[#faf5ff]', text: 'text-[#7e22ce]', border: 'border-[#e9d5ff]' };
    case 'Data':
      return { bg: 'bg-[#0d9488]', lightBg: 'bg-[#f0fdfa]', text: 'text-[#0f766e]', border: 'border-[#99f6e4]' };
    default:
      return { bg: 'bg-[#52525b]', lightBg: 'bg-[#f4f4f5]', text: 'text-[#52525b]', border: 'border-[#e4e4e7]' };
  }
};

const getInitials = (fullName: string) => {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  member,
  initialTab = 'profile',
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>(initialTab);

  // Form states for change password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [isOpen, initialTab]);

  // ESC key handler to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleChangePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!currentPassword) {
      setErrorMsg('Vui lòng nhập mật khẩu hiện tại.');
      return;
    }
    if (!newPassword) {
      setErrorMsg('Vui lòng nhập mật khẩu mới.');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg('Mật khẩu mới phải có tối thiểu 6 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Xác nhận mật khẩu mới không trùng khớp.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const username = member.username || member.id;
      const res = changePassword(username, currentPassword, newPassword);
      setIsSubmitting(false);

      if (res.success) {
        setSuccessMsg('Đổi mật khẩu thành công! Mật khẩu mới đã được áp dụng.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          onClose();
        }, 1400);
      } else {
        setErrorMsg(res.error || 'Không thể đổi mật khẩu. Vui lòng thử lại.');
      }
    }, 200);
  };

  const teamCol = getTeamColor(member.team);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={onClose}
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="relative w-full max-w-[560px] bg-white rounded-[14px] shadow-2xl border border-[#e2e8f0] z-10 overflow-hidden flex flex-col font-body my-auto max-h-[90vh]"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-[#e2e8f0] flex items-center justify-between bg-[#ffffff]">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full ${teamCol.bg} text-white font-bold flex items-center justify-center text-sm shadow-sm shrink-0`}
                >
                  {getInitials(member.name)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-title text-base font-bold text-[#1e293b]">
                      {member.name}
                    </h3>
                    <span className="font-mono text-xs text-[#64748b] bg-[#f1f5f9] px-1.5 py-0.5 rounded font-medium">
                      @{member.username || member.id}
                    </span>
                  </div>
                  <p className="text-xs text-[#64748b]">
                    {member.title} • {member.team}
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 text-[#94a3b8] hover:text-[#1e293b] hover:bg-[#f1f5f9] rounded-lg transition-colors cursor-pointer"
                title="Đóng (ESC)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs Navigation */}
            <div className="flex border-b border-[#e2e8f0] bg-[#f8fafc] px-6 pt-2">
              <button
                onClick={() => {
                  setActiveTab('profile');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className={`pb-2.5 px-3 font-ui text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'profile'
                    ? 'border-[#963861] text-[#963861]'
                    : 'border-transparent text-[#64748b] hover:text-[#1e293b]'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Hồ sơ cá nhân</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('password');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className={`pb-2.5 px-3 font-ui text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'password'
                    ? 'border-[#963861] text-[#963861]'
                    : 'border-transparent text-[#64748b] hover:text-[#1e293b]'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Đổi mật khẩu</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              {activeTab === 'profile' ? (
                /* TAB 1: PROFILE INFO (READ-ONLY) */
                <div className="space-y-4">
                  <div className="bg-[#fffbfd] border border-[#f3c2d4] p-3 rounded-[8px] flex items-start gap-2.5 text-xs text-[#64748b]">
                    <Shield className="w-4 h-4 text-[#963861] shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      Thông tin hồ sơ nhân sự do Ban Sản phẩm - Công nghệ quản lý tập trung theo tài liệu SSOT. Bạn có quyền xem và chỉ được phép{' '}
                      <button
                        onClick={() => setActiveTab('password')}
                        className="text-[#963861] font-bold underline cursor-pointer"
                      >
                        thay đổi mật khẩu cá nhân
                      </button>
                      .
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Họ tên */}
                    <div className="p-2.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-[8px]">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#64748b] uppercase tracking-wider mb-1">
                        <User className="w-3.5 h-3.5" />
                        <span>Họ và tên</span>
                      </div>
                      <p className="font-title font-bold text-xs text-[#1e293b]">
                        {member.name}
                      </p>
                    </div>

                    {/* Tên tài khoản */}
                    <div className="p-2.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-[8px]">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#64748b] uppercase tracking-wider mb-1">
                        <Lock className="w-3.5 h-3.5" />
                        <span>Tài khoản đăng nhập</span>
                      </div>
                      <p className="font-mono font-bold text-xs text-[#963861]">
                        @{member.username || member.id}
                      </p>
                    </div>

                    {/* Chức vụ & Nhóm */}
                    <div className="p-2.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-[8px]">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#64748b] uppercase tracking-wider mb-1">
                        <Briefcase className="w-3.5 h-3.5" />
                        <span>Chức vụ & Nhóm</span>
                      </div>
                      <p className="font-medium text-xs text-[#1e293b]">
                        {member.title} • <span className="font-bold text-[#963861]">{member.team}</span>
                      </p>
                    </div>

                    {/* Phòng ban & Vùng */}
                    <div className="p-2.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-[8px]">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#64748b] uppercase tracking-wider mb-1">
                        <Building2 className="w-3.5 h-3.5" />
                        <span>Đơn vị & Vùng</span>
                      </div>
                      <p className="font-medium text-xs text-[#1e293b]">
                        {member.department} • <span className="font-bold">{member.region}</span>
                      </p>
                    </div>

                    {/* Email VnExpress */}
                    <div className="p-2.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-[8px]">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#64748b] uppercase tracking-wider mb-1">
                        <Mail className="w-3.5 h-3.5 text-[#0f62fe]" />
                        <span>Email VnExpress</span>
                      </div>
                      <a
                        href={`mailto:${member.email}`}
                        className="font-mono text-xs text-[#0f62fe] hover:underline truncate block"
                      >
                        {member.email}
                      </a>
                    </div>

                    {/* IP Phone */}
                    <div className="p-2.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-[8px]">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#64748b] uppercase tracking-wider mb-1">
                        <Phone className="w-3.5 h-3.5 text-[#16a34a]" />
                        <span>IP Phone nội bộ</span>
                      </div>
                      <p className="font-mono font-bold text-xs text-[#16a34a]">
                        {member.ipPhone || 'Chưa thiết lập'}
                      </p>
                    </div>

                    {/* Ngày vào làm */}
                    {member.joinDate && (() => {
                      const workStats = workingTimeService.calculateDaysWorked(member.joinDate, member.name);
                      if (!workStats.isValid) return null;
                      return (
                        <div className="p-2.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-[8px] sm:col-span-2">
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#64748b] uppercase tracking-wider mb-1">
                            <Calendar className="w-3.5 h-3.5 text-[#b13460]" />
                            <span>Ngày vào làm (Vào)</span>
                          </div>
                          <p className="font-ui text-xs text-[#202020] font-medium flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-[#963861]">{workStats.formattedDate}</span>
                            <span className="text-[11px] text-[#52525b] bg-white px-2 py-0.5 rounded border border-[#e4e4e7] font-num">
                              {workStats.workingDays.toLocaleString('vi-VN')} ngày làm việc ({workStats.calendarDays.toLocaleString('vi-VN')} ngày)
                            </span>
                          </p>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Button chuyển sang tab Đổi mật khẩu */}
                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => setActiveTab('password')}
                      className="px-4 py-2 rounded-[8px] bg-[#963861] hover:bg-[#832e52] text-white font-ui text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Đổi mật khẩu tài khoản</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* TAB 2: CHANGE PASSWORD */
                <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
                  {/* Success Alert */}
                  {successMsg && (
                    <div className="p-3 bg-[#f0fdf4] border border-[#bbf7d0] rounded-[8px] flex items-center gap-2 text-xs text-[#15803d]">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-[#16a34a]" />
                      <span className="font-bold">{successMsg}</span>
                    </div>
                  )}

                  {/* Error Alert */}
                  {errorMsg && (
                    <div className="p-3 bg-[#fef2f2] border border-[#fecaca] rounded-[8px] flex items-center gap-2 text-xs text-[#b91c1c]">
                      <AlertCircle className="w-4 h-4 shrink-0 text-[#dc2626]" />
                      <span className="font-medium">{errorMsg}</span>
                    </div>
                  )}

                  {/* Current Password */}
                  <div className="space-y-1.5">
                    <label className="block font-ui text-xs font-bold text-[#475569]">
                      Mật khẩu hiện tại
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => {
                          setCurrentPassword(e.target.value);
                          if (errorMsg) setErrorMsg('');
                        }}
                        placeholder="Nhập mật khẩu hiện tại (mặc định là @26022001!)..."
                        className="w-full pl-3 pr-10 py-2.5 bg-white border border-[#cbd5e1] focus:border-[#963861] focus:ring-2 focus:ring-[#963861]/10 rounded-[8px] text-xs font-mono text-[#1e293b] outline-hidden"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#94a3b8] hover:text-[#475569] cursor-pointer"
                      >
                        {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div className="space-y-1.5">
                    <label className="block font-ui text-xs font-bold text-[#475569]">
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
                        placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)..."
                        className="w-full pl-3 pr-10 py-2.5 bg-white border border-[#cbd5e1] focus:border-[#963861] focus:ring-2 focus:ring-[#963861]/10 rounded-[8px] text-xs font-mono text-[#1e293b] outline-hidden"
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

                  {/* Confirm New Password */}
                  <div className="space-y-1.5">
                    <label className="block font-ui text-xs font-bold text-[#475569]">
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
                        className="w-full pl-3 pr-10 py-2.5 bg-white border border-[#cbd5e1] focus:border-[#963861] focus:ring-2 focus:ring-[#963861]/10 rounded-[8px] text-xs font-mono text-[#1e293b] outline-hidden"
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

                  {/* Actions */}
                  <div className="pt-2 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => setActiveTab('profile')}
                      className="px-4 py-2 rounded-[8px] border border-[#cbd5e1] text-[#475569] hover:bg-[#f1f5f9] font-ui text-xs font-bold transition-colors cursor-pointer"
                    >
                      Hủy thao tác
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-5 py-2 rounded-[8px] bg-[#963861] hover:bg-[#832e52] text-white font-ui text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      {isSubmitting ? (
                        <span className="flex items-center gap-1.5">
                          <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Đang lưu...
                        </span>
                      ) : (
                        <span>Cập nhật mật khẩu</span>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
