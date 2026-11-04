/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { FolderItem, ProjectItem, TaskItem } from '../types';
import { Folder, FolderPlus, Plus, Edit2, Trash2, X, Check, ChevronRight } from './vds/icons';

interface FolderManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: FolderItem[];
  projects: ProjectItem[];
  tasks?: TaskItem[];
  onSaveFolders?: (updatedFolders: FolderItem[]) => void;
  onDeleteFolder?: (folderId: string) => void;
  onUpdateFolders?: (updatedFolders: FolderItem[], deletedId?: string) => void;
}

export const FolderManagerModal: React.FC<FolderManagerModalProps> = ({
  isOpen,
  onClose,
  folders,
  projects,
  tasks = [],
  onSaveFolders,
  onDeleteFolder,
  onUpdateFolders,
}) => {
  const [newName, setNewName] = useState('');
  const [newParentId, setNewParentId] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingParentId, setEditingParentId] = useState<string>('');

  if (!isOpen) return null;

  const commitFolders = (updatedFolders: FolderItem[], deletedId?: string) => {
    onSaveFolders?.(updatedFolders);
    if (deletedId) {
      onDeleteFolder?.(deletedId);
    }
    onUpdateFolders?.(updatedFolders, deletedId);
  };

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

    commitFolders([...folders, newFolder]);
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
    commitFolders(updated);
    setEditingId(null);
  };

  const handleDelete = (folder: FolderItem) => {
    const childCount = folders.filter((f) => f.parentId === folder.id).length;
    const projCount = projects.filter((p) => p.folderId === folder.id).length;
    const taskCount = tasks.filter(
      (t) => t.folderId === folder.id || t.projectId === `folder:${folder.id}`
    ).length;
    if (childCount > 0 || projCount > 0 || taskCount > 0) {
      alert(
        `Thư mục "${folder.name}" đang chứa ${childCount} thư mục con, ${projCount} dự án và ${taskCount} công việc. Vui lòng chuyển các mục sang thư mục khác trước khi xóa.`
      );
      return;
    }
    const updated = folders.filter((f) => f.id !== folder.id);
    commitFolders(updated, folder.id);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-surface rounded-vds-lg border border-line shadow-sheet w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-divider flex items-center justify-between bg-surface-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-vds-lg bg-surface-accent-faint border border-line flex items-center justify-center text-accent">
              <Folder className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-title text-sm font-bold text-ink">
                Quản lý Thư mục Sản phẩm & Chuyên mục
              </h3>
              <p className="text-xs font-ui text-subdued">
                Tổ chức cây thư mục (VnExpress › Thể thao, Thế giới... / Ngôi sao / English / Tia sáng)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-subdued hover:text-ink hover:bg-surface-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form thêm thư mục mới */}
        <form onSubmit={handleAddFolder} className="p-4 border-b border-divider bg-surface-100 space-y-2.5">
          <div className="text-xs font-ui font-bold text-ink-lighter">
            Thêm thư mục mới
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={newParentId}
              onChange={(e) => setNewParentId(e.target.value)}
              className="px-2.5 py-2 text-xs font-ui bg-surface border border-line rounded-vds-lg text-ink focus:border-line-accent focus:outline-hidden sm:w-44"
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
              className="flex-1 px-3 py-2 text-xs font-ui bg-surface border border-line rounded-vds-lg text-ink focus:border-line-accent focus:outline-hidden"
            />
            <button
              type="submit"
              disabled={!newName.trim()}
              className="px-3.5 py-2 rounded-vds-lg bg-accent-solid hover:bg-accent-solid-hover disabled:opacity-40 text-on-color text-xs font-ui font-bold flex items-center justify-center gap-1.5 cursor-pointer shrink-0 transition-colors"
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
              <div key={root.id} className="border border-line rounded-vds-lg overflow-hidden bg-surface">
                {/* Root Row */}
                <div className="px-3.5 py-2.5 bg-surface-100 flex items-center justify-between gap-2">
                  {editingId === root.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="flex-1 px-2.5 py-1 text-xs font-ui bg-surface border border-line-accent rounded-vds-lg"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(root.id)}
                        className="p-1 text-positive hover:bg-surface-positive rounded cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="p-1 text-subdued hover:bg-surface-200 rounded cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 min-w-0">
                        <Folder className="w-4 h-4 text-accent shrink-0" />
                        <span className="font-title text-xs font-bold text-ink truncate">
                          {root.name}
                        </span>
                        <span className="text-[10px] font-ui text-subdued bg-surface border border-line px-1.5 py-0.2 rounded-full">
                          {children.length > 0 ? `${children.length} mục con` : `${rootProjCount} dự án`}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setNewParentId(root.id);
                          }}
                          className="px-2 py-0.5 text-[10px] font-ui font-medium text-accent hover:bg-surface-accent-faint rounded cursor-pointer"
                          title={`Thêm mục con vào ${root.name}`}
                        >
                          + Mục con
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStartEdit(root)}
                          className="p-1 text-subdued hover:text-ink rounded cursor-pointer"
                          title="Đổi tên"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(root)}
                          className="p-1 text-subdued hover:text-negative rounded cursor-pointer"
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
                  <div className="divide-y divide-divider">
                    {children.map((child) => {
                      const childProjCount = projects.filter((p) => p.folderId === child.id).length;
                      return (
                        <div
                          key={child.id}
                          className="pl-7 pr-3.5 py-2 flex items-center justify-between gap-2 hover:bg-surface-100"
                        >
                          {editingId === child.id ? (
                            <div className="flex items-center gap-2 flex-1">
                              <input
                                type="text"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                className="flex-1 px-2.5 py-1 text-xs font-ui bg-surface border border-line-accent rounded-vds-lg"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveEdit(child.id)}
                                className="p-1 text-positive hover:bg-surface-positive rounded cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
                                className="p-1 text-subdued hover:bg-surface-200 rounded cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2 min-w-0">
                                <ChevronRight className="w-3 h-3 text-subdued-lighter shrink-0" />
                                <Folder className="w-3.5 h-3.5 text-support shrink-0" />
                                <span className="font-ui text-xs text-ink-lighter truncate">
                                  {child.name}
                                </span>
                                {childProjCount > 0 && (
                                  <span className="text-[10px] font-ui text-subdued bg-surface-200 px-1.5 py-0.2 rounded-full">
                                    {childProjCount} dự án
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(child)}
                                  className="p-1 text-subdued-lighter hover:text-ink rounded cursor-pointer"
                                  title="Đổi tên"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(child)}
                                  className="p-1 text-subdued-lighter hover:text-negative rounded cursor-pointer"
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
        <div className="px-5 py-3 border-t border-divider bg-surface-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-vds-lg bg-surface-200 hover:bg-surface-300 text-ink text-xs font-ui font-bold cursor-pointer transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
