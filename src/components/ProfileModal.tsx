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
} from './vds/icons';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: MemberItem;
  initialTab?: 'profile' | 'password';
}

const getTeamColor = (team: TeamType) => {
  switch (team) {
    case 'Product Manager':
      return { bg: 'bg-accent-solid', lightBg: 'bg-surface-accent-faint', text: 'text-accent', border: 'border-line' };
    case 'UX/UI Designer':
      return { bg: 'bg-support-solid', lightBg: 'bg-surface-info', text: 'text-info', border: 'border-line' };
    case 'SEO':
      return { bg: 'bg-extreme-solid', lightBg: 'bg-surface-100', text: 'text-extreme', border: 'border-line' };
    case 'Data':
      return { bg: 'bg-positive-solid', lightBg: 'bg-surface-positive', text: 'text-positive', border: 'border-line' };
    default:
      return { bg: 'bg-icon-strong', lightBg: 'bg-surface-200', text: 'text-ink-lighter', border: 'border-line' };
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

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
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
    try {
      const username = member.username || member.id;
      const res = await changePassword(username, currentPassword, newPassword);
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
    } catch {
      setIsSubmitting(false);
      setErrorMsg('Không thể đổi mật khẩu. Vui lòng thử lại.');
    }
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
            className="relative w-full max-w-[560px] bg-surface rounded-vds-xl shadow-sheet border border-line z-10 overflow-hidden flex flex-col font-body my-auto max-h-[90vh]"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-line flex items-center justify-between bg-surface">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full ${teamCol.bg} text-on-color font-bold flex items-center justify-center text-sm shrink-0`}
                >
                  {getInitials(member.name)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-title text-base font-bold text-ink">
                      {member.name}
                    </h3>
                    <span className="font-mono text-xs text-subdued bg-surface-200 px-1.5 py-0.5 rounded font-medium">
                      @{member.username || member.id}
                    </span>
                  </div>
                  <p className="text-xs text-subdued">
                    {member.title} • {member.team}
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 text-subdued-lighter hover:text-ink hover:bg-surface-200 rounded-lg transition-colors cursor-pointer"
                title="Đóng (ESC)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs Navigation */}
            <div className="flex border-b border-line bg-surface-100 px-6 pt-2">
              <button
                onClick={() => {
                  setActiveTab('profile');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className={`pb-2.5 px-3 font-ui text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'profile'
                    ? 'border-line-accent text-accent'
                    : 'border-transparent text-subdued hover:text-ink'
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
                className={`pb-2.5 px-3 font-ui text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'password'
                    ? 'border-line-accent text-accent'
                    : 'border-transparent text-subdued hover:text-ink'
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
                  <div className="bg-surface-100 border border-line p-3 rounded-vds-lg flex items-start gap-2.5 text-xs text-subdued">
                    <Shield className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      Thông tin hồ sơ nhân sự do Ban Sản phẩm - Công nghệ quản lý tập trung theo tài liệu SSOT. Bạn có quyền xem và chỉ được phép{' '}
                      <button
                        onClick={() => setActiveTab('password')}
                        className="text-accent font-bold underline cursor-pointer"
                      >
                        thay đổi mật khẩu cá nhân
                      </button>
                      .
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Họ tên */}
                    <div className="p-2.5 bg-surface-100 border border-line rounded-vds-lg">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-subdued mb-1">
                        <User className="w-3.5 h-3.5" />
                        <span>Họ và tên</span>
                      </div>
                      <p className="font-title font-bold text-xs text-ink">
                        {member.name}
                      </p>
                    </div>

                    {/* Tên tài khoản */}
                    <div className="p-2.5 bg-surface-100 border border-line rounded-vds-lg">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-subdued mb-1">
                        <Lock className="w-3.5 h-3.5" />
                        <span>Tài khoản đăng nhập</span>
                      </div>
                      <p className="font-mono font-bold text-xs text-accent">
                        @{member.username || member.id}
                      </p>
                    </div>

                    {/* Chức vụ & Nhóm */}
                    <div className="p-2.5 bg-surface-100 border border-line rounded-vds-lg">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-subdued mb-1">
                        <Briefcase className="w-3.5 h-3.5" />
                        <span>Chức vụ & Nhóm</span>
                      </div>
                      <p className="font-medium text-xs text-ink">
                        {member.title} • <span className="font-bold text-accent">{member.team}</span>
                      </p>
                    </div>

                    {/* Phòng ban & Vùng */}
                    <div className="p-2.5 bg-surface-100 border border-line rounded-vds-lg">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-subdued mb-1">
                        <Building2 className="w-3.5 h-3.5" />
                        <span>Đơn vị & Vùng</span>
                      </div>
                      <p className="font-medium text-xs text-ink">
                        {member.department} • <span className="font-bold">{member.region}</span>
                      </p>
                    </div>

                    {/* Email VnExpress */}
                    <div className="p-2.5 bg-surface-100 border border-line rounded-vds-lg">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-subdued mb-1">
                        <Mail className="w-3.5 h-3.5 text-info" />
                        <span>Email VnExpress</span>
                      </div>
                      <a
                        href={`mailto:${member.email}`}
                        className="font-mono text-xs text-info hover:underline truncate block"
                      >
                        {member.email}
                      </a>
                    </div>

                    {/* IP Phone */}
                    <div className="p-2.5 bg-surface-100 border border-line rounded-vds-lg">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-subdued mb-1">
                        <Phone className="w-3.5 h-3.5 text-positive" />
                        <span>IP Phone nội bộ</span>
                      </div>
                      <p className="font-mono font-bold text-xs text-positive">
                        {member.ipPhone || 'Chưa thiết lập'}
                      </p>
                    </div>

                    {/* Ngày vào làm */}
                    {member.joinDate && (() => {
                      const workStats = workingTimeService.calculateDaysWorked(member.joinDate, member.name);
                      if (!workStats.isValid) return null;
                      return (
                        <div className="p-2.5 bg-surface-100 border border-line rounded-vds-lg sm:col-span-2">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-subdued mb-1">
                            <Calendar className="w-3.5 h-3.5 text-accent" />
                            <span>Ngày vào làm (Vào)</span>
                          </div>
                          <p className="font-ui text-xs text-ink font-medium flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-accent">{workStats.formattedDate}</span>
                            <span className="text-xs text-ink-lighter bg-surface px-2 py-0.5 rounded border border-line font-num">
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
                      className="px-4 py-2 rounded-vds-lg bg-accent-solid hover:bg-accent-solid-hover text-on-color font-ui text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
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
                    <div className="p-3 bg-surface-positive border border-line rounded-vds-lg flex items-center gap-2 text-xs text-positive">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-positive" />
                      <span className="font-bold">{successMsg}</span>
                    </div>
                  )}

                  {/* Error Alert */}
                  {errorMsg && (
                    <div className="p-3 bg-surface-negative border border-line rounded-vds-lg flex items-center gap-2 text-xs text-negative">
                      <AlertCircle className="w-4 h-4 shrink-0 text-negative" />
                      <span className="font-medium">{errorMsg}</span>
                    </div>
                  )}

                  {/* Current Password */}
                  <div className="space-y-1.5">
                    <label className="block font-ui text-xs font-bold text-ink-lighter">
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
                        className="w-full pl-3 pr-10 py-2.5 bg-surface border border-line focus:border-line-accent focus:ring-2 focus:ring-line-accent/10 rounded-vds-lg text-xs font-mono text-ink outline-hidden"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-subdued-lighter hover:text-ink-lighter cursor-pointer"
                      >
                        {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div className="space-y-1.5">
                    <label className="block font-ui text-xs font-bold text-ink-lighter">
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
                        className="w-full pl-3 pr-10 py-2.5 bg-surface border border-line focus:border-line-accent focus:ring-2 focus:ring-line-accent/10 rounded-vds-lg text-xs font-mono text-ink outline-hidden"
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

                  {/* Confirm New Password */}
                  <div className="space-y-1.5">
                    <label className="block font-ui text-xs font-bold text-ink-lighter">
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
                        className="w-full pl-3 pr-10 py-2.5 bg-surface border border-line focus:border-line-accent focus:ring-2 focus:ring-line-accent/10 rounded-vds-lg text-xs font-mono text-ink outline-hidden"
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

                  {/* Actions */}
                  <div className="pt-2 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => setActiveTab('profile')}
                      className="px-4 py-2 rounded-vds-lg border border-line text-ink-lighter hover:bg-surface-200 font-ui text-xs font-bold transition-colors cursor-pointer"
                    >
                      Hủy thao tác
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-5 py-2 rounded-vds-lg bg-accent-solid hover:bg-accent-solid-hover text-on-color font-ui text-xs font-bold transition flex items-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      {isSubmitting ? (
                        <span className="flex items-center gap-1.5">
                          <span className="w-3.5 h-3.5 border-2 border-surface/30 border-t-white rounded-full animate-spin" />
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
