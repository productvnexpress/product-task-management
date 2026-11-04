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
} from './vds/icons';
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
  const [selectedTrashIds, setSelectedTrashIds] = useState<Set<string>>(new Set());
  const [isConfirmBulkPermanentOpen, setIsConfirmBulkPermanentOpen] = useState(false);

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
        const matchTitle = (item.title || '').toLowerCase().includes(q);
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
    setSelectedTrashIds(new Set());
    setIsConfirmEmptyOpen(false);
  };

  const isAllFilteredSelected = useMemo(() => {
    if (filteredTrash.length === 0) return false;
    return filteredTrash.every((item) => selectedTrashIds.has(item.id));
  }, [filteredTrash, selectedTrashIds]);

  const handleToggleSelectAll = () => {
    if (isAllFilteredSelected) {
      setSelectedTrashIds((prev) => {
        const next = new Set(prev);
        filteredTrash.forEach((item) => next.delete(item.id));
        return next;
      });
    } else {
      setSelectedTrashIds((prev) => {
        const next = new Set(prev);
        filteredTrash.forEach((item) => next.add(item.id));
        return next;
      });
    }
  };

  const handleToggleSelectItem = (id: string) => {
    setSelectedTrashIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBulkPermanentDelete = () => {
    if (!isTienNgoc) {
      alert('Quyền hạn bị từ chối: Chỉ tài khoản của Đặng Tiến Ngọc (tienngoc) mới có quyền xoá vĩnh viễn.');
      return;
    }
    setIsConfirmBulkPermanentOpen(true);
  };

  const handleConfirmBulkPermanent = () => {
    selectedTrashIds.forEach((id) => {
      onPermanentDeleteItem(id);
    });
    setSelectedTrashIds(new Set());
    setIsConfirmBulkPermanentOpen(false);
  };

  const handleBulkRestore = () => {
    selectedTrashIds.forEach((id) => {
      const item = trash.find((t) => t.id === id);
      if (item && canRestoreTrashItem(effectiveUser, item)) {
        onRestoreItem(id);
      }
    });
    setSelectedTrashIds(new Set());
  };

  const getTypeBadge = (type?: TrashItemType | string) => {
    switch (type) {
      case 'task':
        return {
          icon: <CheckSquare className="w-3.5 h-3.5 text-accent" />,
          label: 'Công việc',
          style: 'bg-surface-accent-faint text-accent border-line',
        };
      case 'project':
        return {
          icon: <FolderKanban className="w-3.5 h-3.5 text-support" />,
          label: 'Dự án',
          style: 'bg-surface-info text-support border-line',
        };
      case 'member':
        return {
          icon: <Users className="w-3.5 h-3.5 text-positive" />,
          label: 'Nhân sự',
          style: 'bg-surface-positive text-positive border-line',
        };
      default:
        return {
          icon: <CheckSquare className="w-3.5 h-3.5 text-subdued" />,
          label: 'Mục',
          style: 'bg-surface-200 text-subdued border-line',
        };
    }
  };

  return (
    <div className="w-full max-w-[800px] mx-auto space-y-6 animate-fade-in">
      {/* 1. HEADER CONTAINER */}
      <div className="bg-surface rounded-vds-lg border border-line p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-vds-lg bg-surface-negative border border-line flex items-center justify-center text-negative">
                <Trash2 className="w-4 h-4" />
              </div>
              <h2 className="font-title text-xl font-bold text-ink">
                Thùng rác
              </h2>
              <span className="text-xs font-num font-bold px-2 py-0.5 rounded-full bg-surface-200 text-ink-lighter border border-line">
                {trash.length} mục
              </span>
            </div>
            <p className="text-xs font-ui text-subdued">
              Lưu trữ các công việc, dự án và nhân sự đã bị xoá. Dữ liệu có thể được xem chi tiết và khôi phục về danh sách tác nghiệp bất cứ lúc nào.
            </p>
          </div>

          {/* Action Button: Empty Trash (tienngoc only) */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleEmptyClick}
              disabled={trash.length === 0 || !isTienNgoc}
              className={`h-9 px-4 rounded-vds-lg font-ui text-xs font-bold flex items-center gap-2 transition ${
                trash.length === 0
                  ? 'bg-surface-200 text-subdued-lighter border border-line cursor-not-allowed opacity-60'
                  : isTienNgoc
                  ? 'bg-negative-solid hover:bg-negative-solid text-on-color cursor-pointer active:scale-[0.98]'
                  : 'bg-surface-200 text-subdued-lighter border border-line cursor-not-allowed'
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
                <Lock className="w-3.5 h-3.5 text-subdued-lighter" />
              )}
              <span>Dọn sạch thùng rác</span>
            </button>
          </div>
        </div>

        {/* Permission Info Note */}
        <div className="p-3 bg-surface-100 rounded-vds-lg border border-line flex items-center justify-between gap-3 text-xs font-ui">
          <div className="flex items-center gap-2 text-ink-lighter">
            <Info className="w-4 h-4 text-support shrink-0" />
            <span>
              <strong>Quy chuẩn bảo mật:</strong> Dữ liệu xoá được bảo lưu trong Thùng rác. Chỉ tài khoản của{' '}
              <strong className="text-accent">Đặng Tiến Ngọc (tienngoc)</strong> mới có quyền thực hiện dọn sạch (Empty) vĩnh viễn.
            </span>
          </div>

          <div className="shrink-0 flex items-center gap-1.5">
            <span className="text-xs text-subdued">Tài khoản hiện tại:</span>
            {effectiveUser ? (
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-vds-md border flex items-center gap-1.5 ${roleInfo.badgeClass}`}
              >
                <span>{effectiveUser.name}</span>
                <span className="opacity-75">• {roleInfo.shortLabel}</span>
              </span>
            ) : (
              <span className="text-xs text-subdued-lighter italic">Chưa đăng nhập tài khoản</span>
            )}
          </div>
        </div>
      </div>

      {/* 2. FILTER & SEARCH CONTROLS */}
      <div className="bg-surface rounded-vds-lg border border-line p-4 flex flex-wrap items-center justify-between gap-3">
        {/* Type Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap text-xs font-ui">
          <button
            onClick={() => setSelectedType('all')}
            className={`px-3 py-1.5 rounded-vds-lg font-bold transition-colors cursor-pointer ${
              selectedType === 'all'
                ? 'bg-surface-selected text-accent ring-1 ring-inset ring-line-accent-soft'
                : 'bg-surface-200 text-ink-lighter hover:bg-surface-300'
            }`}
          >
            Tất cả ({counts.all})
          </button>
          <button
            onClick={() => setSelectedType('task')}
            className={`px-3 py-1.5 rounded-vds-lg font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
              selectedType === 'task'
                ? 'bg-surface-selected text-accent ring-1 ring-inset ring-line-accent-soft'
                : 'bg-surface-200 text-ink-lighter hover:bg-surface-300'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Công việc ({counts.task})</span>
          </button>
          <button
            onClick={() => setSelectedType('project')}
            className={`px-3 py-1.5 rounded-vds-lg font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
              selectedType === 'project'
                ? 'bg-surface-selected text-accent ring-1 ring-inset ring-line-accent-soft'
                : 'bg-surface-200 text-ink-lighter hover:bg-surface-300'
            }`}
          >
            <FolderKanban className="w-3.5 h-3.5" />
            <span>Dự án ({counts.project})</span>
          </button>
          <button
            onClick={() => setSelectedType('member')}
            className={`px-3 py-1.5 rounded-vds-lg font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
              selectedType === 'member'
                ? 'bg-surface-selected text-accent ring-1 ring-inset ring-line-accent-soft'
                : 'bg-surface-200 text-ink-lighter hover:bg-surface-300'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Nhân sự ({counts.member})</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-subdued absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm trong thùng rác..."
            className="w-full pl-8 pr-7 py-1.5 text-xs font-body bg-surface-100 border border-line focus:border-line-accent focus:bg-surface rounded-vds-lg text-ink placeholder-subdued-lighter focus:outline-hidden"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-subdued hover:text-ink p-0.5 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* 3. ITEMS LIST */}
      <div className="bg-surface rounded-vds-lg border border-line overflow-hidden">
        {filteredTrash.length > 0 && (
          <div className="p-3 bg-surface-100 border-b border-line flex items-center justify-between gap-3 flex-wrap text-xs font-ui">
            <div className="flex items-center gap-2.5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isAllFilteredSelected}
                  onChange={handleToggleSelectAll}
                  className="w-4 h-4 rounded text-accent border-line focus:ring-line-accent cursor-pointer"
                />
                <span className="font-bold text-ink">
                  {selectedTrashIds.size > 0
                    ? `Đã chọn ${selectedTrashIds.size} mục`
                    : 'Chọn tất cả'}
                </span>
              </label>
              {selectedTrashIds.size > 0 && (
                <button
                  onClick={() => setSelectedTrashIds(new Set())}
                  className="text-xs text-subdued hover:text-ink underline cursor-pointer"
                >
                  Bỏ chọn
                </button>
              )}
            </div>

            {selectedTrashIds.size > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBulkRestore}
                  className="px-3 py-1.5 rounded-vds-lg bg-surface-positive text-positive border border-line hover:bg-surface-positive font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer "
                  title="Khôi phục các mục đã chọn"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Khôi phục ({selectedTrashIds.size})</span>
                </button>

                {isTienNgoc && (
                  <button
                    onClick={handleBulkPermanentDelete}
                    className="px-3 py-1.5 rounded-vds-lg bg-surface-negative text-negative border border-line hover:bg-surface-negative font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer "
                    title="Xoá vĩnh viễn các mục đã chọn"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xoá vĩnh viễn ({selectedTrashIds.size})</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {filteredTrash.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-surface-200 text-subdued-lighter flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-title text-base font-bold text-ink">
              Thùng rác trống
            </h3>
            <p className="text-xs font-ui text-subdued max-w-sm mx-auto">
              {searchQuery
                ? 'Không tìm thấy mục nào khớp với từ khóa tìm kiếm.'
                : 'Hiện không có công việc, dự án hoặc nhân sự nào trong thùng rác.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-divider">
            {filteredTrash.map((item) => {
              const badge = getTypeBadge(item.type);
              const isSelected = selectedTrashIds.has(item.id);
              return (
                <div
                  key={item.id}
                  className={`p-4 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 group ${
                    isSelected ? 'bg-surface-100' : 'hover:bg-surface-100'
                  }`}
                >
                  {/* Left: Checkbox + Type Badge + Title + Subtitle + Deletion Log */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="mt-1 shrink-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelectItem(item.id)}
                        className="w-4 h-4 rounded text-accent border-line focus:ring-line-accent cursor-pointer"
                      />
                    </div>

                    <div className="mt-0.5 shrink-0">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-ui font-bold px-2 py-0.5 rounded-vds-md border ${badge.style}`}
                      >
                        {badge.icon}
                        <span>{badge.label}</span>
                      </span>
                    </div>

                    <div className="space-y-1 min-w-0 flex-1">
                      <h4
                        onClick={() => setSelectedDetailItem(item)}
                        className="font-title text-sm font-bold text-ink leading-snug break-words hover:text-accent cursor-pointer transition-colors"
                        title="Bấm để xem chi tiết"
                      >
                        {item.title}
                      </h4>
                      {item.subtitle && (
                        <p className="text-xs font-ui text-ink-lighter truncate">
                          {item.subtitle}
                        </p>
                      )}

                      {/* Deletion Log: Who deleted & when */}
                      <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs font-ui text-subdued">
                        <span className="inline-flex items-center gap-1 text-negative font-medium">
                          <Clock className="w-3 h-3 text-negative" />
                          <span>Đã xoá: {formatDateWithEnDay(item.deletedAt, true)}</span>
                        </span>
                        {item.deletedBy && (
                          <>
                            <span className="text-icon-subdued">•</span>
                            <span className="inline-flex items-center gap-1 font-medium text-ink-lighter">
                              <User className="w-3 h-3 text-accent" />
                              <span>Người xoá: <strong className="text-accent">{item.deletedBy}</strong></span>
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
                      className="h-8 px-2.5 rounded-vds-lg bg-surface-200 text-ink-lighter hover:bg-surface-300 border border-line text-xs font-ui font-medium flex items-center gap-1 transition-colors cursor-pointer"
                      title="Xem chi tiết nội dung đã xoá"
                    >
                      <Eye className="w-3.5 h-3.5 text-ink-lighter" />
                      <span>Chi tiết</span>
                    </button>

                    {/* Restore Button */}
                    {canRestoreTrashItem(effectiveUser, item) ? (
                      <button
                        onClick={() => onRestoreItem(item.id)}
                        className="h-8 px-3 rounded-vds-lg bg-surface-positive text-positive border border-line hover:bg-surface-positive text-xs font-ui font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Khôi phục mục này về vị trí cũ"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Khôi phục</span>
                      </button>
                    ) : (
                      <button
                        disabled
                        className="h-8 px-2.5 rounded-vds-lg bg-surface-200 text-subdued-lighter border border-line text-xs font-ui font-medium flex items-center gap-1.5 cursor-not-allowed opacity-60"
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
                        className="h-8 px-2.5 rounded-vds-lg text-subdued hover:text-negative hover:bg-surface-negative text-xs font-ui font-medium flex items-center gap-1 transition-colors cursor-pointer"
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
          <div className="relative w-full max-w-[620px] bg-surface h-full shadow-sheet flex flex-col z-10 animate-in slide-in-from-right duration-200 border-l border-line">
            {/* Drawer Header */}
            <div className="px-6 py-4 border-b border-line flex items-center justify-between bg-surface-100">
              <div className="flex items-center gap-2.5">
                <span
                  className={`inline-flex items-center gap-1 text-xs font-ui font-bold px-2.5 py-1 rounded-vds-lg border ${
                    getTypeBadge(selectedDetailItem.type).style
                  }`}
                >
                  {getTypeBadge(selectedDetailItem.type).icon}
                  <span>{getTypeBadge(selectedDetailItem.type).label}</span>
                </span>
                <h3 className="font-title text-sm font-bold text-ink">
                  Chi tiết mục trong thùng rác
                </h3>
              </div>

              <button
                onClick={() => setSelectedDetailItem(null)}
                className="w-8 h-8 rounded-full hover:bg-surface-300 flex items-center justify-center text-ink-lighter hover:text-ink transition-colors cursor-pointer"
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
            <div className="px-6 py-4 border-t border-line bg-surface-100 flex items-center justify-between gap-3">
              <div>
                {isTienNgoc && (
                  <button
                    onClick={() => {
                      setItemToDeletePermanently(selectedDetailItem);
                      setSelectedDetailItem(null);
                    }}
                    className="h-9 px-3 rounded-vds-lg text-negative hover:bg-surface-negative border border-line text-xs font-ui font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xoá vĩnh viễn</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedDetailItem(null)}
                  className="h-9 px-4 rounded-vds-lg bg-surface border border-line text-ink-lighter hover:bg-surface-200 text-xs font-ui font-medium transition-colors cursor-pointer"
                >
                  Đóng
                </button>
                {canRestoreTrashItem(effectiveUser, selectedDetailItem) ? (
                  <button
                    onClick={() => {
                      onRestoreItem(selectedDetailItem.id);
                      setSelectedDetailItem(null);
                    }}
                    className="h-9 px-4 rounded-vds-lg bg-positive-solid hover:bg-positive-solid text-on-color text-xs font-ui font-bold flex items-center gap-1.5 transition cursor-pointer active:scale-[0.98]"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Khôi phục mục này</span>
                  </button>
                ) : (
                  <span className="text-xs text-subdued-lighter italic px-2">
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
          <div className="bg-surface rounded-vds-lg border border-line max-w-md w-full p-6 shadow-sheet space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-surface-negative border border-line flex items-center justify-center text-negative shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-title text-base font-bold text-ink">
                  Xác nhận dọn sạch thùng rác?
                </h3>
                <p className="text-xs font-ui text-ink-lighter leading-relaxed">
                  Hành động này sẽ xoá vĩnh viễn toàn bộ <strong>{trash.length} mục</strong> trong Thùng rác. Dữ liệu sau khi dọn sạch sẽ <strong>không thể khôi phục lại</strong>.
                </p>
              </div>
            </div>

            <div className="p-3 bg-surface-100 rounded-vds-lg border border-line text-xs font-ui text-ink-lighter">
              Người thực hiện: <strong className="text-accent">{effectiveUser?.name || 'Đặng Tiến Ngọc'}</strong>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-divider">
              <button
                onClick={() => setIsConfirmEmptyOpen(false)}
                className="px-4 py-2 rounded-vds-lg text-xs font-ui font-medium text-ink-lighter hover:bg-surface-200 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirmEmpty}
                className="px-4 py-2 rounded-vds-lg bg-negative-solid hover:bg-negative-solid text-on-color text-xs font-ui font-bold flex items-center gap-1.5 transition cursor-pointer"
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
          <div className="bg-surface rounded-vds-lg border border-line max-w-md w-full p-6 shadow-sheet space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-surface-negative border border-line flex items-center justify-center text-negative shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-title text-base font-bold text-ink">
                  Xoá vĩnh viễn mục này?
                </h3>
                <p className="text-xs font-ui text-ink-lighter leading-relaxed">
                  Bạn có chắc chắn muốn xoá vĩnh viễn: <strong className="text-ink">"{itemToDeletePermanently.title}"</strong>? Mục này sẽ không thể khôi phục lại.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-divider">
              <button
                onClick={() => setItemToDeletePermanently(null)}
                className="px-4 py-2 rounded-vds-lg text-xs font-ui font-medium text-ink-lighter hover:bg-surface-200 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={() => {
                  onPermanentDeleteItem(itemToDeletePermanently.id);
                  setItemToDeletePermanently(null);
                }}
                className="px-4 py-2 rounded-vds-lg bg-negative-solid hover:bg-negative-solid text-on-color text-xs font-ui font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xoá vĩnh viễn</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. CONFIRM BULK PERMANENT DELETE MODAL */}
      {isConfirmBulkPermanentOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-surface rounded-vds-lg border border-line max-w-md w-full p-6 shadow-sheet space-y-4 font-ui">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-surface-negative border border-line flex items-center justify-center text-negative shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-title text-base font-bold text-ink">
                  Xoá vĩnh viễn {selectedTrashIds.size} mục đã chọn?
                </h3>
                <p className="text-xs text-ink-lighter leading-relaxed">
                  Bạn có chắc chắn muốn xoá vĩnh viễn <strong>{selectedTrashIds.size} mục</strong> đã chọn khỏi hệ thống? Các mục này sẽ <strong>không thể khôi phục lại</strong>.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-divider">
              <button
                onClick={() => setIsConfirmBulkPermanentOpen(false)}
                className="px-4 py-2 rounded-vds-lg text-xs font-ui font-medium text-ink-lighter hover:bg-surface-200 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirmBulkPermanent}
                className="px-4 py-2 rounded-vds-lg bg-negative-solid hover:bg-negative-solid text-on-color text-xs font-ui font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xác nhận xoá vĩnh viễn</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
