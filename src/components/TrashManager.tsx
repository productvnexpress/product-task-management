/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  TrashItem,
  TrashItemType,
  MemberItem,
  TaskItem,
  ProjectItem,
} from '../types';
import {
  Trash2,
  RotateCcw,
  Search,
  CheckSquare,
  FolderKanban,
  Users,
  Lock,
  AlertTriangle,
  Clock,
  User,
  Info,
  X,
  Eye,
  ExternalLink,
  Calendar,
  History,
  Link,
} from 'lucide-react';
import { formatDateWithEnDay } from '../utils/formatters';
import { ErrorBoundary } from './ErrorBoundary';
import { TrashItemDetailView } from './TrashItemDetailView';
import {
  canRestoreTrashItem,
  canEmptyTrash,
  canPermanentDeleteTrash,
  getUserRole,
  getRoleDisplayInfo,
} from '../utils/rbac';

interface TrashManagerProps {
  trash: TrashItem[];
  activeProductMember: MemberItem | null;
  currentAuthUser?: MemberItem | null;
  onRestoreItem: (trashId: string) => void;
  onEmptyTrash: () => void;
  onPermanentDeleteItem: (trashId: string) => void;
}

export const TrashManager: React.FC<TrashManagerProps> = ({
  trash,
  activeProductMember,
  currentAuthUser,
  onRestoreItem,
  onEmptyTrash,
  onPermanentDeleteItem,
}) => {
  const effectiveUser = currentAuthUser || activeProductMember;
  const userRole = getUserRole(effectiveUser);
  const roleInfo = getRoleDisplayInfo(userRole);
  const [selectedType, setSelectedType] = useState<'all' | TrashItemType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isConfirmEmptyOpen, setIsConfirmEmptyOpen] = useState(false);
  const [itemToDeletePermanently, setItemToDeletePermanently] = useState<TrashItem | null>(null);
  const [selectedDetailItem, setSelectedDetailItem] = useState<TrashItem | null>(null);

  // Close drawer on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedDetailItem) {
          setSelectedDetailItem(null);
        } else if (isConfirmEmptyOpen) {
          setIsConfirmEmptyOpen(false);
        } else if (itemToDeletePermanently) {
          setItemToDeletePermanently(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDetailItem, isConfirmEmptyOpen, itemToDeletePermanently]);

  // Check authorization: Only Admin ('tienngoc') can empty trash or permanently delete
  const isTienNgoc = useMemo(() => {
    return canEmptyTrash(effectiveUser);
  }, [effectiveUser]);

  // Counts by type
  const counts = useMemo(() => {
    const taskCount = trash.filter((t) => t.type === 'task').length;
    const projectCount = trash.filter((t) => t.type === 'project').length;
    const memberCount = trash.filter((t) => t.type === 'member').length;
    return { all: trash.length, task: taskCount, project: projectCount, member: memberCount };
  }, [trash]);

  // Filtered trash items
  const filteredTrash = useMemo(() => {
    return trash.filter((item) => {
      if (selectedType !== 'all' && item.type !== selectedType) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchSubtitle = (item.subtitle || '').toLowerCase().includes(q);
        const matchAuthor = (item.deletedBy || '').toLowerCase().includes(q);
        if (!matchTitle && !matchSubtitle && !matchAuthor) {
          return false;
        }
      }
      return true;
    });
  }, [trash, selectedType, searchQuery]);

  const handleEmptyClick = () => {
    if (!isTienNgoc) {
      alert('Quyền hạn bị từ chối: Chỉ tài khoản của Đặng Tiến Ngọc (tienngoc) mới có quyền dọn sạch thùng rác.');
      return;
    }
    setIsConfirmEmptyOpen(true);
  };

  const handleConfirmEmpty = () => {
    if (!isTienNgoc) return;
    onEmptyTrash();
    setIsConfirmEmptyOpen(false);
  };

  const getTypeBadge = (type?: TrashItemType | string) => {
    switch (type) {
      case 'task':
        return {
          icon: <CheckSquare className="w-3.5 h-3.5 text-[#963861]" />,
          label: 'Công việc',
          style: 'bg-[#fcf0f5] text-[#963861] border-[#f3c2d4]',
        };
      case 'project':
        return {
          icon: <FolderKanban className="w-3.5 h-3.5 text-[#1e609c]" />,
          label: 'Dự án',
          style: 'bg-[#edf5fd] text-[#1e609c] border-[#cfe2fe]',
        };
      case 'member':
        return {
          icon: <Users className="w-3.5 h-3.5 text-[#166534]" />,
          label: 'Nhân sự',
          style: 'bg-[#f0fdf4] text-[#166534] border-[#bbf7d0]',
        };
      default:
        return {
          icon: <CheckSquare className="w-3.5 h-3.5 text-[#71717a]" />,
          label: 'Mục',
          style: 'bg-[#f4f4f5] text-[#71717a] border-[#d4d4d8]',
        };
    }
  };

  return (
    <div className="w-full max-w-[800px] mx-auto space-y-6 animate-fade-in">
      {/* 1. HEADER CONTAINER */}
      <div className="bg-white rounded-[12px] border border-[#e0e0e0] p-6 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-[8px] bg-[#fff1f2] border border-[#fecdd3] flex items-center justify-center text-[#be123c]">
                <Trash2 className="w-4 h-4" />
              </div>
              <h2 className="font-title text-xl font-bold text-[#202020]">
                Thùng rác
              </h2>
              <span className="text-xs font-num font-bold px-2 py-0.5 rounded-full bg-[#f4f4f5] text-[#52525b] border border-[#e4e4e7]">
                {trash.length} mục
              </span>
            </div>
            <p className="text-xs font-ui text-[#71717a]">
              Lưu trữ các công việc, dự án và nhân sự đã bị xoá. Dữ liệu có thể được xem chi tiết và khôi phục về danh sách tác nghiệp bất cứ lúc nào.
            </p>
          </div>

          {/* Action Button: Empty Trash (tienngoc only) */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleEmptyClick}
              disabled={trash.length === 0 || !isTienNgoc}
              className={`h-9 px-4 rounded-[8px] font-ui text-xs font-bold flex items-center gap-2 transition-all shadow-xs ${
                trash.length === 0
                  ? 'bg-[#f4f4f5] text-[#a1a1aa] border border-[#e4e4e7] cursor-not-allowed opacity-60'
                  : isTienNgoc
                  ? 'bg-[#be123c] hover:bg-[#9f1239] text-white cursor-pointer active:scale-[0.98]'
                  : 'bg-[#f4f4f5] text-[#a1a1aa] border border-[#e4e4e7] cursor-not-allowed'
              }`}
              title={
                !isTienNgoc
                  ? 'Chỉ tài khoản của tienngoc mới có quyền dọn sạch thùng rác'
                  : 'Dọn sạch toàn bộ dữ liệu trong thùng rác'
              }
            >
              {isTienNgoc ? (
                <Trash2 className="w-3.5 h-3.5" />
              ) : (
                <Lock className="w-3.5 h-3.5 text-[#a1a1aa]" />
              )}
              <span>Dọn sạch thùng rác</span>
            </button>
          </div>
        </div>

        {/* Permission Info Note */}
        <div className="p-3 bg-[#fafafa] rounded-[8px] border border-[#e4e4e7] flex items-center justify-between gap-3 text-xs font-ui">
          <div className="flex items-center gap-2 text-[#52525b]">
            <Info className="w-4 h-4 text-[#466fa1] shrink-0" />
            <span>
              <strong>Quy chuẩn bảo mật:</strong> Dữ liệu xoá được bảo lưu trong Thùng rác. Chỉ tài khoản của{' '}
              <strong className="text-[#963861]">Đặng Tiến Ngọc (tienngoc)</strong> mới có quyền thực hiện dọn sạch (Empty) vĩnh viễn.
            </span>
          </div>

          <div className="shrink-0 flex items-center gap-1.5">
            <span className="text-[11px] text-[#71717a]">Tài khoản hiện tại:</span>
            {effectiveUser ? (
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-[4px] border flex items-center gap-1.5 ${roleInfo.badgeClass}`}
              >
                <span>{effectiveUser.name}</span>
                <span className="opacity-75">• {roleInfo.shortLabel}</span>
              </span>
            ) : (
              <span className="text-[11px] text-[#a1a1aa] italic">Chưa đăng nhập tài khoản</span>
            )}
          </div>
        </div>
      </div>

      {/* 2. FILTER & SEARCH CONTROLS */}
      <div className="bg-white rounded-[10px] border border-[#e0e0e0] p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        {/* Type Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap text-xs font-ui">
          <button
            onClick={() => setSelectedType('all')}
            className={`px-3 py-1.5 rounded-[6px] font-bold transition-colors cursor-pointer ${
              selectedType === 'all'
                ? 'bg-[#202020] text-white'
                : 'bg-[#f4f4f5] text-[#52525b] hover:bg-[#e4e4e7]'
            }`}
          >
            Tất cả ({counts.all})
          </button>
          <button
            onClick={() => setSelectedType('task')}
            className={`px-3 py-1.5 rounded-[6px] font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
              selectedType === 'task'
                ? 'bg-[#963861] text-white'
                : 'bg-[#f4f4f5] text-[#52525b] hover:bg-[#e4e4e7]'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Công việc ({counts.task})</span>
          </button>
          <button
            onClick={() => setSelectedType('project')}
            className={`px-3 py-1.5 rounded-[6px] font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
              selectedType === 'project'
                ? 'bg-[#1e609c] text-white'
                : 'bg-[#f4f4f5] text-[#52525b] hover:bg-[#e4e4e7]'
            }`}
          >
            <FolderKanban className="w-3.5 h-3.5" />
            <span>Dự án ({counts.project})</span>
          </button>
          <button
            onClick={() => setSelectedType('member')}
            className={`px-3 py-1.5 rounded-[6px] font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
              selectedType === 'member'
                ? 'bg-[#166534] text-white'
                : 'bg-[#f4f4f5] text-[#52525b] hover:bg-[#e4e4e7]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Nhân sự ({counts.member})</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-[#7f7f7f] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm trong thùng rác..."
            className="w-full pl-8 pr-7 py-1.5 text-xs font-body bg-[#fafafa] border border-[#d6d6d6] focus:border-[#963861] focus:bg-white rounded-[6px] text-[#202020] placeholder-[#9f9f9f] focus:outline-hidden"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7f7f7f] hover:text-[#202020] p-0.5 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* 3. ITEMS LIST */}
      <div className="bg-white rounded-[12px] border border-[#e0e0e0] shadow-2xs overflow-hidden">
        {filteredTrash.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#f4f4f5] text-[#a1a1aa] flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-title text-base font-bold text-[#202020]">
              Thùng rác trống
            </h3>
            <p className="text-xs font-ui text-[#71717a] max-w-sm mx-auto">
              {searchQuery
                ? 'Không tìm thấy mục nào khớp với từ khóa tìm kiếm.'
                : 'Hiện không có công việc, dự án hoặc nhân sự nào trong thùng rác.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#f0f0f0]">
            {filteredTrash.map((item) => {
              const badge = getTypeBadge(item.type);
              return (
                <div
                  key={item.id}
                  className="p-4 hover:bg-[#fafafa] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  {/* Left: Type Badge + Title + Subtitle + Deletion Log */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="mt-0.5 shrink-0">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-ui font-bold px-2 py-0.5 rounded-[4px] border ${badge.style}`}
                      >
                        {badge.icon}
                        <span>{badge.label}</span>
                      </span>
                    </div>

                    <div className="space-y-1 min-w-0 flex-1">
                      <h4
                        onClick={() => setSelectedDetailItem(item)}
                        className="font-title text-sm font-bold text-[#18181b] leading-snug break-words hover:text-[#963861] cursor-pointer transition-colors"
                        title="Bấm để xem chi tiết"
                      >
                        {item.title}
                      </h4>
                      {item.subtitle && (
                        <p className="text-xs font-ui text-[#52525b] truncate">
                          {item.subtitle}
                        </p>
                      )}

                      {/* Deletion Log: Who deleted & when */}
                      <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px] font-ui text-[#71717a]">
                        <span className="inline-flex items-center gap-1 text-[#be123c] font-medium">
                          <Clock className="w-3 h-3 text-[#be123c]" />
                          <span>Đã xoá: {formatDateWithEnDay(item.deletedAt, true)}</span>
                        </span>
                        {item.deletedBy && (
                          <>
                            <span className="text-[#d4d4d8]">•</span>
                            <span className="inline-flex items-center gap-1 font-medium text-[#52525b]">
                              <User className="w-3 h-3 text-[#963861]" />
                              <span>Người xoá: <strong className="text-[#963861]">{item.deletedBy}</strong></span>
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {/* View Details Button */}
                    <button
                      onClick={() => setSelectedDetailItem(item)}
                      className="h-8 px-2.5 rounded-[6px] bg-[#f4f4f5] text-[#3f3f46] hover:bg-[#e4e4e7] border border-[#d4d4d8] text-xs font-ui font-medium flex items-center gap-1 transition-colors cursor-pointer"
                      title="Xem chi tiết nội dung đã xoá"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#52525b]" />
                      <span>Chi tiết</span>
                    </button>

                    {/* Restore Button */}
                    {canRestoreTrashItem(effectiveUser, item) ? (
                      <button
                        onClick={() => onRestoreItem(item.id)}
                        className="h-8 px-3 rounded-[6px] bg-[#f0fdf4] text-[#166534] border border-[#bbf7d0] hover:bg-[#dcfce7] text-xs font-ui font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Khôi phục mục này về vị trí cũ"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Khôi phục</span>
                      </button>
                    ) : (
                      <button
                        disabled
                        className="h-8 px-2.5 rounded-[6px] bg-[#f4f4f5] text-[#a1a1aa] border border-[#e4e4e7] text-xs font-ui font-medium flex items-center gap-1.5 cursor-not-allowed opacity-60"
                        title="Chỉ người đã xoá hoặc Admin mới có quyền khôi phục"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Khôi phục</span>
                      </button>
                    )}

                    {/* Permanent Delete Button (tienngoc only) */}
                    {isTienNgoc && (
                      <button
                        onClick={() => setItemToDeletePermanently(item)}
                        className="h-8 px-2.5 rounded-[6px] text-[#71717a] hover:text-[#be123c] hover:bg-[#fff1f2] text-xs font-ui font-medium flex items-center gap-1 transition-colors cursor-pointer"
                        title="Xoá vĩnh viễn mục này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden md:inline">Xoá vĩnh viễn</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. DETAIL DRAWER FOR TRASH ITEM */}
      {selectedDetailItem && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-fade-in cursor-pointer"
            onClick={() => setSelectedDetailItem(null)}
          />

          {/* Slide-over Drawer Panel */}
          <div className="relative w-full max-w-[620px] bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200 border-l border-[#e0e0e0]">
            {/* Drawer Header */}
            <div className="px-6 py-4 border-b border-[#e0e0e0] flex items-center justify-between bg-[#fafafa]">
              <div className="flex items-center gap-2.5">
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-ui font-bold px-2.5 py-1 rounded-[6px] border ${
                    getTypeBadge(selectedDetailItem.type).style
                  }`}
                >
                  {getTypeBadge(selectedDetailItem.type).icon}
                  <span>{getTypeBadge(selectedDetailItem.type).label}</span>
                </span>
                <h3 className="font-title text-sm font-bold text-[#202020]">
                  Chi tiết mục trong thùng rác
                </h3>
              </div>

              <button
                onClick={() => setSelectedDetailItem(null)}
                className="w-8 h-8 rounded-full hover:bg-[#e4e4e7] flex items-center justify-center text-[#52525b] hover:text-[#202020] transition-colors cursor-pointer"
                title="Đóng (ESC)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
              <TrashItemDetailView item={selectedDetailItem} />
            </div>

            {/* Drawer Footer */}
            <div className="px-6 py-4 border-t border-[#e0e0e0] bg-[#fafafa] flex items-center justify-between gap-3">
              <div>
                {isTienNgoc && (
                  <button
                    onClick={() => {
                      setItemToDeletePermanently(selectedDetailItem);
                      setSelectedDetailItem(null);
                    }}
                    className="h-9 px-3 rounded-[6px] text-[#be123c] hover:bg-[#fff1f2] border border-[#fecdd3] text-xs font-ui font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xoá vĩnh viễn</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedDetailItem(null)}
                  className="h-9 px-4 rounded-[6px] bg-white border border-[#d4d4d8] text-[#52525b] hover:bg-[#f4f4f5] text-xs font-ui font-medium transition-colors cursor-pointer"
                >
                  Đóng
                </button>
                {canRestoreTrashItem(effectiveUser, selectedDetailItem) ? (
                  <button
                    onClick={() => {
                      onRestoreItem(selectedDetailItem.id);
                      setSelectedDetailItem(null);
                    }}
                    className="h-9 px-4 rounded-[6px] bg-[#166534] hover:bg-[#14532d] text-white text-xs font-ui font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-[0.98]"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Khôi phục mục này</span>
                  </button>
                ) : (
                  <span className="text-xs text-[#a1a1aa] italic px-2">
                    Chỉ người đã xoá hoặc Admin mới có quyền khôi phục
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. CONFIRM EMPTY TRASH MODAL */}
      {isConfirmEmptyOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-[12px] border border-[#e0e0e0] max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-[#fff1f2] border border-[#fecdd3] flex items-center justify-center text-[#be123c] shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-title text-base font-bold text-[#202020]">
                  Xác nhận dọn sạch thùng rác?
                </h3>
                <p className="text-xs font-ui text-[#52525b] leading-relaxed">
                  Hành động này sẽ xoá vĩnh viễn toàn bộ <strong>{trash.length} mục</strong> trong Thùng rác. Dữ liệu sau khi dọn sạch sẽ <strong>không thể khôi phục lại</strong>.
                </p>
              </div>
            </div>

            <div className="p-3 bg-[#fafafa] rounded-[6px] border border-[#e4e4e7] text-[11px] font-ui text-[#52525b]">
              Người thực hiện: <strong className="text-[#963861]">{effectiveUser?.name || 'Đặng Tiến Ngọc'}</strong>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#f0f0f0]">
              <button
                onClick={() => setIsConfirmEmptyOpen(false)}
                className="px-4 py-2 rounded-[6px] text-xs font-ui font-medium text-[#52525b] hover:bg-[#f4f4f5] cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirmEmpty}
                className="px-4 py-2 rounded-[6px] bg-[#be123c] hover:bg-[#9f1239] text-white text-xs font-ui font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xác nhận dọn sạch</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. CONFIRM SINGLE PERMANENT DELETE MODAL */}
      {itemToDeletePermanently && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-[12px] border border-[#e0e0e0] max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-[#fff1f2] border border-[#fecdd3] flex items-center justify-center text-[#be123c] shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-title text-base font-bold text-[#202020]">
                  Xoá vĩnh viễn mục này?
                </h3>
                <p className="text-xs font-ui text-[#52525b] leading-relaxed">
                  Bạn có chắc chắn muốn xoá vĩnh viễn: <strong className="text-[#18181b]">"{itemToDeletePermanently.title}"</strong>? Mục này sẽ không thể khôi phục lại.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#f0f0f0]">
              <button
                onClick={() => setItemToDeletePermanently(null)}
                className="px-4 py-2 rounded-[6px] text-xs font-ui font-medium text-[#52525b] hover:bg-[#f4f4f5] cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={() => {
                  onPermanentDeleteItem(itemToDeletePermanently.id);
                  setItemToDeletePermanently(null);
                }}
                className="px-4 py-2 rounded-[6px] bg-[#be123c] hover:bg-[#9f1239] text-white text-xs font-ui font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xoá vĩnh viễn</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
