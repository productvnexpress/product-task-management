/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { FolderItem, ProjectItem } from '../types';
import { Folder, FolderPlus, Plus, Edit2, Trash2, X, Check, ChevronRight } from 'lucide-react';

interface FolderManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: FolderItem[];
  projects: ProjectItem[];
  onSaveFolders: (updatedFolders: FolderItem[]) => void;
  onDeleteFolder?: (folderId: string) => void;
}

export const FolderManagerModal: React.FC<FolderManagerModalProps> = ({
  isOpen,
  onClose,
  folders,
  projects,
  onSaveFolders,
  onDeleteFolder,
}) => {
  const [newName, setNewName] = useState('');
  const [newParentId, setNewParentId] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingParentId, setEditingParentId] = useState<string>('');

  if (!isOpen) return null;

  const rootFolders = folders
    .filter((f) => !f.parentId)
    .sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99) || a.name.localeCompare(b.name, 'vi'));

  const handleAddFolder = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;

    const slug = trimmed
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const newFolder: FolderItem = {
      id: `folder-${slug}-${Date.now().toString().slice(-4)}`,
      name: trimmed,
      parentId: newParentId || undefined,
      code: slug.toUpperCase().slice(0, 12),
      sortOrder: folders.length + 1,
    };

    onSaveFolders([...folders, newFolder]);
    setNewName('');
  };

  const handleStartEdit = (folder: FolderItem) => {
    setEditingId(folder.id);
    setEditingName(folder.name);
    setEditingParentId(folder.parentId || '');
  };

  const handleSaveEdit = (folderId: string) => {
    const trimmed = editingName.trim();
    if (!trimmed) return;
    const updated = folders.map((f) =>
      f.id === folderId
        ? {
            ...f,
            name: trimmed,
            parentId: editingParentId && editingParentId !== folderId ? editingParentId : undefined,
          }
        : f
    );
    onSaveFolders(updated);
    setEditingId(null);
  };

  const handleDelete = (folder: FolderItem) => {
    const childCount = folders.filter((f) => f.parentId === folder.id).length;
    const projCount = projects.filter((p) => p.folderId === folder.id).length;
    if (childCount > 0 || projCount > 0) {
      alert(
        `Thư mục "${folder.name}" đang chứa ${childCount} thư mục con và ${projCount} dự án. Vui lòng chuyển các mục sang thư mục khác trước khi xóa.`
      );
      return;
    }
    const updated = folders.filter((f) => f.id !== folder.id);
    onSaveFolders(updated);
    onDeleteFolder?.(folder.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-[12px] border border-[#e0e0e0] shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#f0f0f0] flex items-center justify-between bg-[#fafafa]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[8px] bg-[#fdf2f7] border border-[#f4c2d7] flex items-center justify-center text-[#963861]">
              <Folder className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-title text-sm font-bold text-[#202020]">
                Quản lý Thư mục Sản phẩm & Chuyên mục
              </h3>
              <p className="text-[11px] font-ui text-[#64748b]">
                Tổ chức cây thư mục (VnExpress › Thể thao, Thế giới... / Ngôi sao / English / Tia sáng)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-[#71717a] hover:text-[#202020] hover:bg-[#f0f0f0] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form thêm thư mục mới */}
        <form onSubmit={handleAddFolder} className="p-4 border-b border-[#f0f0f0] bg-[#fcfcfc] space-y-2.5">
          <div className="text-[11px] font-ui font-bold text-[#475569] uppercase tracking-wider">
            Thêm thư mục mới
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={newParentId}
              onChange={(e) => setNewParentId(e.target.value)}
              className="px-2.5 py-2 text-xs font-ui bg-white border border-[#d6d6d6] rounded-[8px] text-[#202020] focus:border-[#963861] focus:outline-hidden sm:w-44"
              title="Chọn cấp thư mục"
            >
              <option value="">📁 Thư mục gốc (Cấp 1)</option>
              {rootFolders.map((rf) => (
                <option key={rf.id} value={rf.id}>
                  ↳ Thuộc {rf.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={newParentId ? 'Tên chuyên mục (VD: Pháp luật, Đời sống...)' : 'Tên sản phẩm (VD: VnExpress, Ngôi sao...)'}
              className="flex-1 px-3 py-2 text-xs font-ui bg-white border border-[#d6d6d6] rounded-[8px] text-[#202020] focus:border-[#963861] focus:outline-hidden"
            />
            <button
              type="submit"
              disabled={!newName.trim()}
              className="px-3.5 py-2 rounded-[8px] bg-[#963861] hover:bg-[#80284f] disabled:opacity-40 text-white text-xs font-ui font-bold flex items-center justify-center gap-1.5 cursor-pointer shrink-0 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm</span>
            </button>
          </div>
        </form>

        {/* Danh sách cây thư mục */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
          {rootFolders.map((root) => {
            const children = folders
              .filter((f) => f.parentId === root.id)
              .sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99) || a.name.localeCompare(b.name, 'vi'));
            const rootProjCount = projects.filter((p) => p.folderId === root.id).length;

            return (
              <div key={root.id} className="border border-[#e5e7eb] rounded-[10px] overflow-hidden bg-white">
                {/* Root Row */}
                <div className="px-3.5 py-2.5 bg-[#f8fafc] flex items-center justify-between gap-2">
                  {editingId === root.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="flex-1 px-2.5 py-1 text-xs font-ui bg-white border border-[#963861] rounded-[6px]"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(root.id)}
                        className="p-1 text-[#24a148] hover:bg-[#f0fdf4] rounded cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="p-1 text-[#71717a] hover:bg-[#f4f4f5] rounded cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 min-w-0">
                        <Folder className="w-4 h-4 text-[#963861] shrink-0" />
                        <span className="font-title text-xs font-bold text-[#202020] truncate">
                          {root.name}
                        </span>
                        <span className="text-[10px] font-ui text-[#64748b] bg-white border border-[#e2e8f0] px-1.5 py-0.2 rounded-full">
                          {children.length > 0 ? `${children.length} mục con` : `${rootProjCount} dự án`}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setNewParentId(root.id);
                          }}
                          className="px-2 py-0.5 text-[10px] font-ui font-medium text-[#963861] hover:bg-[#fdf2f7] rounded cursor-pointer"
                          title={`Thêm mục con vào ${root.name}`}
                        >
                          + Mục con
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStartEdit(root)}
                          className="p-1 text-[#64748b] hover:text-[#202020] rounded cursor-pointer"
                          title="Đổi tên"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(root)}
                          className="p-1 text-[#64748b] hover:text-[#dc2626] rounded cursor-pointer"
                          title="Xóa thư mục"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Children */}
                {children.length > 0 && (
                  <div className="divide-y divide-[#f1f5f9]">
                    {children.map((child) => {
                      const childProjCount = projects.filter((p) => p.folderId === child.id).length;
                      return (
                        <div
                          key={child.id}
                          className="pl-7 pr-3.5 py-2 flex items-center justify-between gap-2 hover:bg-[#fafafa]"
                        >
                          {editingId === child.id ? (
                            <div className="flex items-center gap-2 flex-1">
                              <input
                                type="text"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                className="flex-1 px-2.5 py-1 text-xs font-ui bg-white border border-[#963861] rounded-[6px]"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveEdit(child.id)}
                                className="p-1 text-[#24a148] hover:bg-[#f0fdf4] rounded cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
                                className="p-1 text-[#71717a] hover:bg-[#f4f4f5] rounded cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2 min-w-0">
                                <ChevronRight className="w-3 h-3 text-[#94a3b8] shrink-0" />
                                <Folder className="w-3.5 h-3.5 text-[#3b629b] shrink-0" />
                                <span className="font-ui text-xs text-[#334155] truncate">
                                  {child.name}
                                </span>
                                {childProjCount > 0 && (
                                  <span className="text-[10px] font-ui text-[#64748b] bg-[#f1f5f9] px-1.5 py-0.2 rounded-full">
                                    {childProjCount} dự án
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(child)}
                                  className="p-1 text-[#94a3b8] hover:text-[#202020] rounded cursor-pointer"
                                  title="Đổi tên"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(child)}
                                  className="p-1 text-[#94a3b8] hover:text-[#dc2626] rounded cursor-pointer"
                                  title="Xóa"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#f0f0f0] bg-[#fafafa] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-[8px] bg-[#202020] hover:bg-[#333333] text-white text-xs font-ui font-bold cursor-pointer transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
