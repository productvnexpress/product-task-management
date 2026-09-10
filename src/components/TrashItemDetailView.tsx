/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { TrashItem, TaskItem, ProjectItem, MemberItem } from '../types';
import {
  Trash2,
  FolderKanban,
  User,
  Calendar,
  AlertTriangle,
  Link,
  ExternalLink,
  History,
  Clock,
  CheckSquare,
} from 'lucide-react';
import { formatDateWithEnDay } from '../utils/formatters';
import { ErrorBoundary } from './ErrorBoundary';

interface TrashItemDetailViewProps {
  item: TrashItem;
}

export const TrashItemDetailView: React.FC<TrashItemDetailViewProps> = ({ item }) => {
  return (
    <ErrorBoundary fallbackTitle="Không thể hiển thị chi tiết mục đã xoá">
      <div className="space-y-6">
        {/* DELETION AUDIT BOX (Log ai xoá, xoá khi nào) */}
        <div className="bg-[#fff8f9] border border-[#fecdd3] rounded-[10px] p-4 space-y-3">
          <div className="flex items-center gap-2 text-[#be123c] font-ui font-bold text-xs">
            <Trash2 className="w-4 h-4" />
            <span>Thông tin xoá dữ liệu (Deletion Audit Log)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-ui bg-white/90 p-3 rounded-[8px] border border-[#ffe4e6]">
            <div className="space-y-1">
              <span className="text-[11px] text-[#71717a] flex items-center gap-1">
                <User className="w-3 h-3 text-[#be123c]" />
                <span>Người thực hiện xoá:</span>
              </span>
              <p className="font-bold text-[#963861] text-sm">
                {item.deletedBy || 'Hệ thống'}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] text-[#71717a] flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#be123c]" />
                <span>Thời điểm xoá:</span>
              </span>
              <p className="font-medium text-[#202020]">
                {formatDateWithEnDay(item.deletedAt, true) || 'Chưa xác định'}
              </p>
            </div>
          </div>

          <p className="text-[11px] font-ui text-[#71717a] leading-relaxed">
            ℹ️ Toàn bộ thông tin, nội dung và lịch sử của mục này vẫn được bảo lưu an toàn. Nhấp nút <strong>Khôi phục mục này</strong> bên dưới để đưa dữ liệu trở lại hoạt động bình thường.
          </p>
        </div>

        {/* DETAILS FOR TASK */}
        {item.type === 'task' && (() => {
          const task = item.data as TaskItem | undefined;
          if (!task) {
            return (
              <div className="p-4 bg-[#fafafa] border border-[#e4e4e7] rounded-[8px] text-xs font-ui text-[#71717a]">
                Không tìm thấy dữ liệu chi tiết của công việc này.
              </div>
            );
          }

          return (
            <div className="space-y-5">
              {/* Title */}
              <div className="space-y-1">
                <label className="text-[11px] font-ui font-extrabold uppercase tracking-wider text-[#9f9f9f]">
                  Tiêu đề công việc
                </label>
                <h2 className="font-title text-base font-bold text-[#202020] leading-snug">
                  {task.title || item.title || 'Không có tiêu đề'}
                </h2>
              </div>

              {/* Primary Meta Grid */}
              <div className="grid grid-cols-2 gap-3 bg-[#fafafa] p-4 rounded-[10px] border border-[#e4e4e7] text-xs font-ui">
                <div className="space-y-1">
                  <span className="text-[#71717a] text-[11px]">Dự án:</span>
                  <p className="font-bold text-[#1e609c] flex items-center gap-1.5">
                    <FolderKanban className="w-3.5 h-3.5 shrink-0" />
                    <span>{task.projectName || 'Chưa gán dự án'}</span>
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[#71717a] text-[11px]">Giai đoạn:</span>
                  <p className="font-medium text-[#202020]">
                    {task.phaseName || 'Chưa gán giai đoạn'}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[#71717a] text-[11px]">Người phụ trách:</span>
                  <p className="font-bold text-[#202020] flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#71717a] shrink-0" />
                    <span>{task.assignee || 'Chưa phân công'}</span>
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[#71717a] text-[11px]">Nhóm chuyên môn:</span>
                  <p className="font-medium text-[#52525b]">
                    {task.team || 'Chưa xác định'}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[#71717a] text-[11px]">Trạng thái khi xoá:</span>
                  <div>
                    <span className="inline-block px-2 py-0.5 rounded-[4px] font-bold text-[11px] bg-white border border-[#d4d4d8] text-[#202020]">
                      {task.status || 'Chưa làm'}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[#71717a] text-[11px]">Mức độ ưu tiên:</span>
                  <div>
                    <span
                      className={`inline-block px-2 py-0.5 rounded-[4px] font-bold text-[11px] ${
                        task.priority === 'Khẩn cấp'
                          ? 'bg-[#fff1f2] text-[#be123c] border border-[#fecdd3]'
                          : task.priority === 'Ưu tiên cao'
                          ? 'bg-[#fef3c7] text-[#92400e] border border-[#fde68a]'
                          : 'bg-white text-[#52525b] border border-[#d4d4d8]'
                      }`}
                    >
                      {task.priority || 'Bình thường'}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[#71717a] text-[11px]">Hạn hoàn thành:</span>
                  <p className="font-ui font-medium text-[#202020] flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#71717a] shrink-0" />
                    <span>{formatDateWithEnDay(task.dueDate) || 'Chưa đặt hạn'}</span>
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[#71717a] text-[11px]">Tiến độ thực tế:</span>
                  <p className="font-num font-bold text-[#202020]">
                    {task.progress ?? 0}%
                  </p>
                </div>
              </div>

              {/* Blocker Reason */}
              {task.blockerReason && (
                <div className="p-3 bg-[#fff1f2] border border-[#fecdd3] rounded-[8px] space-y-1 text-xs font-ui">
                  <span className="font-bold text-[#be123c] flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Lý do bị nghẽn:</span>
                  </span>
                  <p className="text-[#881337]">{task.blockerReason}</p>
                </div>
              )}

              {/* Links */}
              {(task.workLink || task.resultLink) && (
                <div className="space-y-2 text-xs font-ui">
                  <label className="text-[11px] font-ui font-extrabold uppercase tracking-wider text-[#9f9f9f]">
                    Liên kết tài liệu
                  </label>
                  <div className="space-y-1.5">
                    {task.workLink && (
                      <a
                        href={task.workLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2.5 bg-[#fafafa] hover:bg-[#f4f4f5] rounded-[6px] border border-[#e4e4e7] text-[#1e609c] hover:underline"
                      >
                        <Link className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate flex-1 font-medium">{task.workLink}</span>
                        <ExternalLink className="w-3 h-3 shrink-0 text-[#71717a]" />
                      </a>
                    )}
                    {task.resultLink && (
                      <a
                        href={task.resultLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2.5 bg-[#fafafa] hover:bg-[#f4f4f5] rounded-[6px] border border-[#e4e4e7] text-[#166534] hover:underline"
                      >
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate flex-1 font-medium">{task.resultLink}</span>
                        <ExternalLink className="w-3 h-3 shrink-0 text-[#71717a]" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              {(task.latestUpdateNote || task.details || (task as any).notes) && (
                <div className="space-y-1.5 text-xs font-ui">
                  <label className="text-[11px] font-ui font-extrabold uppercase tracking-wider text-[#9f9f9f]">
                    Ghi chú cập nhật
                  </label>
                  <div className="p-3 bg-[#fafafa] rounded-[8px] border border-[#e4e4e7] text-[#3f3f46] leading-relaxed">
                    {task.latestUpdateNote || task.details || (task as any).notes}
                  </div>
                </div>
              )}

              {/* Logs */}
              {Array.isArray(task.logs) && task.logs.length > 0 && (
                <div className="space-y-2 text-xs font-ui">
                  <label className="text-[11px] font-ui font-extrabold uppercase tracking-wider text-[#9f9f9f] flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5" />
                    <span>Nhật ký thay đổi ({task.logs.length})</span>
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
                    {task.logs.map((log, idx) => (
                      <div
                        key={log?.id || idx}
                        className="p-3 bg-[#fafafa] rounded-[8px] border border-[#e4e4e7] space-y-1"
                      >
                        <div className="flex items-center justify-between text-[11px] text-[#71717a]">
                          <span className="font-bold text-[#202020]">{log?.author || 'Hệ thống'}</span>
                          <span>{log?.timestamp || ''}</span>
                        </div>
                        <p className="font-medium text-[#202020]">{log?.action || ''}</p>
                        {Array.isArray(log?.changes) && log.changes.length > 0 && (
                          <div className="text-[11px] text-[#71717a] space-y-0.5 pt-1 border-t border-[#f4f4f5]">
                            {log.changes.map((ch, i) => (
                              <p key={i}>
                                • {ch?.field ? `${ch.field}: ` : ''}{ch?.oldValue ?? ''} ➔ {ch?.newValue ?? ''}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* DETAILS FOR PROJECT */}
        {item.type === 'project' && (() => {
          const proj = item.data as ProjectItem | undefined;
          if (!proj) {
            return (
              <div className="p-4 bg-[#fafafa] border border-[#e4e4e7] rounded-[8px] text-xs font-ui text-[#71717a]">
                Không tìm thấy dữ liệu chi tiết của dự án này.
              </div>
            );
          }

          return (
            <div className="space-y-5">
              {/* Name & Code */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-num text-xs font-bold px-2 py-0.5 rounded-[4px] bg-[#edf5fd] text-[#1e609c] border border-[#cfe2fe]">
                    {proj.code || 'VNE'}
                  </span>
                  <span className="text-xs font-ui font-bold px-2 py-0.5 rounded-[4px] bg-[#f4f4f5] text-[#52525b] border border-[#e4e4e7]">
                    {proj.status || 'Đang triển khai'}
                  </span>
                </div>
                <h2 className="font-title text-base font-bold text-[#202020]">
                  {proj.name || item.title || 'Dự án không tên'}
                </h2>
              </div>

              {/* Meta Grid */}
              <div className="grid grid-cols-2 gap-3 bg-[#fafafa] p-4 rounded-[10px] border border-[#e4e4e7] text-xs font-ui">
                <div className="space-y-1">
                  <span className="text-[#71717a] text-[11px]">Ngày bắt đầu:</span>
                  <p className="font-medium text-[#202020]">{formatDateWithEnDay(proj.startDate) || 'Chưa cập nhật'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[#71717a] text-[11px]">Hạn hoàn thành:</span>
                  <p className="font-medium text-[#202020]">{formatDateWithEnDay(proj.targetDate) || 'Chưa cập nhật'}</p>
                </div>
                <div className="space-y-1 col-span-2">
                  <span className="text-[#71717a] text-[11px]">Product Owner:</span>
                  <p className="font-bold text-[#202020]">{proj.productOwner || 'Chưa cập nhật'}</p>
                </div>
              </div>

              {/* Description & KPI */}
              {proj.description && (
                <div className="space-y-1.5 text-xs font-ui">
                  <label className="text-[11px] font-ui font-extrabold uppercase tracking-wider text-[#9f9f9f]">
                    Mô tả dự án
                  </label>
                  <div className="p-3 bg-[#fafafa] rounded-[8px] border border-[#e4e4e7] text-[#3f3f46] leading-relaxed">
                    {proj.description}
                  </div>
                </div>
              )}

              {proj.objective && (
                <div className="space-y-1.5 text-xs font-ui">
                  <label className="text-[11px] font-ui font-extrabold uppercase tracking-wider text-[#9f9f9f]">
                    Mục tiêu & KPI
                  </label>
                  <div className="p-3 bg-[#f0fdf4] rounded-[8px] border border-[#bbf7d0] text-[#166534] leading-relaxed font-medium">
                    {proj.objective}
                  </div>
                </div>
              )}

              {/* Phases */}
              {Array.isArray(proj.phases) && proj.phases.length > 0 && (
                <div className="space-y-2 text-xs font-ui">
                  <label className="text-[11px] font-ui font-extrabold uppercase tracking-wider text-[#9f9f9f]">
                    Các giai đoạn ({proj.phases.length})
                  </label>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin">
                    {proj.phases.map((ph, idx) => (
                      <div key={ph?.id || idx} className="p-3 bg-white rounded-[6px] border border-[#e4e4e7] flex items-center justify-between">
                        <div className="space-y-0.5">
                          <p className="font-bold text-[#202020]">{ph?.name || 'Giai đoạn'}</p>
                          <p className="text-[11px] text-[#71717a]">Hạn: {formatDateWithEnDay(ph?.dueDate) || 'Chưa đặt'}</p>
                        </div>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-[4px] bg-[#f4f4f5] text-[#52525b]">
                          {ph?.status || 'Chưa bắt đầu'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* DETAILS FOR MEMBER */}
        {item.type === 'member' && (() => {
          const mem = item.data as MemberItem | undefined;
          if (!mem) {
            return (
              <div className="p-4 bg-[#fafafa] border border-[#e4e4e7] rounded-[8px] text-xs font-ui text-[#71717a]">
                Không tìm thấy dữ liệu chi tiết của nhân sự này.
              </div>
            );
          }

          return (
            <div className="space-y-5">
              {/* Name & Salutation */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-ui font-bold px-2 py-0.5 rounded-[4px] bg-[#f0fdf4] text-[#166534] border border-[#bbf7d0]">
                    {mem.group === 'Product' ? 'Ban Sản phẩm - Công nghệ' : 'Stakeholder'}
                  </span>
                  <span className="text-xs font-ui font-bold px-2 py-0.5 rounded-[4px] bg-[#f4f4f5] text-[#52525b] border border-[#e4e4e7]">
                    {mem.region || 'Hà Nội'}
                  </span>
                </div>
                <h2 className="font-title text-base font-bold text-[#202020]">
                  {mem.salutation ? `${mem.salutation} ` : ''}{mem.name || item.title}
                </h2>
                {mem.username && (
                  <p className="text-xs font-num text-[#71717a]">@{mem.username}</p>
                )}
              </div>

              {/* Meta Grid */}
              <div className="grid grid-cols-2 gap-3 bg-[#fafafa] p-4 rounded-[10px] border border-[#e4e4e7] text-xs font-ui">
                <div className="space-y-1">
                  <span className="text-[#71717a] text-[11px]">Chức vụ:</span>
                  <p className="font-bold text-[#202020]">{mem.title || 'Nhân sự'}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-[#71717a] text-[11px]">Phòng ban / Ban:</span>
                  <p className="font-medium text-[#202020]">{mem.department || 'Ban Sản phẩm - Công nghệ'}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-[#71717a] text-[11px]">Nhóm chuyên môn:</span>
                  <p className="font-bold text-[#963861]">{mem.team || 'Chưa gán'}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-[#71717a] text-[11px]">IP Phone:</span>
                  <p className="font-num font-bold text-[#202020]">{mem.ipPhone || '—'}</p>
                </div>

                <div className="space-y-1 col-span-2">
                  <span className="text-[#71717a] text-[11px]">Email công việc:</span>
                  <p className="font-medium text-[#1e609c]">{mem.email || '—'}</p>
                </div>

                {mem.gmail && (
                  <div className="space-y-1 col-span-2">
                    <span className="text-[#71717a] text-[11px]">Gmail cá nhân:</span>
                    <p className="font-medium text-[#52525b]">{mem.gmail}</p>
                  </div>
                )}

                {mem.joinDate && (
                  <div className="space-y-1 col-span-2">
                    <span className="text-[#71717a] text-[11px]">Ngày vào làm:</span>
                    <p className="font-medium text-[#202020]">{mem.joinDate}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Fallback for other item types */}
        {item.type !== 'task' && item.type !== 'project' && item.type !== 'member' && (
          <div className="p-4 bg-[#fafafa] border border-[#e4e4e7] rounded-[8px] text-xs font-ui text-[#71717a]">
            Không hỗ trợ hiển thị chi tiết cho loại mục này.
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};
