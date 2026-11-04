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
} from './vds/icons';
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
        <div className="bg-surface-negative border border-line rounded-vds-lg p-4 space-y-3">
          <div className="flex items-center gap-2 text-negative font-ui font-bold text-xs">
            <Trash2 className="w-4 h-4" />
            <span>Thông tin xoá dữ liệu (Deletion Audit Log)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-ui bg-surface/90 p-3 rounded-vds-lg border border-line">
            <div className="space-y-1">
              <span className="text-xs text-subdued flex items-center gap-1">
                <User className="w-3 h-3 text-negative" />
                <span>Người thực hiện xoá:</span>
              </span>
              <p className="font-bold text-accent text-sm">
                {item.deletedBy || 'Hệ thống'}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-subdued flex items-center gap-1">
                <Clock className="w-3 h-3 text-negative" />
                <span>Thời điểm xoá:</span>
              </span>
              <p className="font-medium text-ink">
                {formatDateWithEnDay(item.deletedAt, true) || 'Chưa xác định'}
              </p>
            </div>
          </div>

          <p className="text-xs font-ui text-subdued leading-relaxed">
            ℹ️ Toàn bộ thông tin, nội dung và lịch sử của mục này vẫn được bảo lưu an toàn. Nhấp nút <strong>Khôi phục mục này</strong> bên dưới để đưa dữ liệu trở lại hoạt động bình thường.
          </p>
        </div>

        {/* DETAILS FOR TASK */}
        {item.type === 'task' && (() => {
          const task = item.data as TaskItem | undefined;
          if (!task) {
            return (
              <div className="p-4 bg-surface-100 border border-line rounded-vds-lg text-xs font-ui text-subdued">
                Không tìm thấy dữ liệu chi tiết của công việc này.
              </div>
            );
          }

          return (
            <div className="space-y-5">
              {/* Title */}
              <div className="space-y-1">
                <label className="text-xs font-ui font-bold text-subdued-lighter">
                  Tiêu đề công việc
                </label>
                <h2 className="font-title text-base font-bold text-ink leading-snug">
                  {task.title || item.title || 'Không có tiêu đề'}
                </h2>
              </div>

              {/* Primary Meta Grid */}
              <div className="grid grid-cols-2 gap-3 bg-surface-100 p-4 rounded-vds-lg border border-line text-xs font-ui">
                <div className="space-y-1">
                  <span className="text-subdued text-xs">Dự án:</span>
                  <p className="font-bold text-support flex items-center gap-1.5">
                    <FolderKanban className="w-3.5 h-3.5 shrink-0" />
                    <span>{task.projectName || 'Chưa gán dự án'}</span>
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-subdued text-xs">Giai đoạn:</span>
                  <p className="font-medium text-ink">
                    {task.phaseName || 'Chưa gán giai đoạn'}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-subdued text-xs">Người phụ trách:</span>
                  <p className="font-bold text-ink flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-subdued shrink-0" />
                    <span>{task.assignee || 'Chưa phân công'}</span>
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-subdued text-xs">Nhóm chuyên môn:</span>
                  <p className="font-medium text-ink-lighter">
                    {task.team || 'Chưa xác định'}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-subdued text-xs">Trạng thái khi xoá:</span>
                  <div>
                    <span className="inline-block px-2 py-0.5 rounded-vds-md font-bold text-xs bg-surface border border-line text-ink">
                      {task.status || 'Chưa làm'}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-subdued text-xs">Mức độ ưu tiên:</span>
                  <div>
                    <span
                      className={`inline-block px-2 py-0.5 rounded-vds-md font-bold text-xs ${
                        task.priority === 'Khẩn cấp'
                          ? 'bg-surface-negative text-negative border border-line'
                          : task.priority === 'Ưu tiên cao'
                          ? 'bg-surface-warning text-warning border border-line'
                          : 'bg-surface text-ink-lighter border border-line'
                      }`}
                    >
                      {task.priority || 'Bình thường'}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-subdued text-xs">Hạn hoàn thành:</span>
                  <p className="font-ui font-medium text-ink flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-subdued shrink-0" />
                    <span>{formatDateWithEnDay(task.dueDate) || 'Chưa đặt hạn'}</span>
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-subdued text-xs">Tiến độ thực tế:</span>
                  <p className="font-num font-bold text-ink">
                    {task.progress ?? 0}%
                  </p>
                </div>
              </div>

              {/* Blocker Reason */}
              {task.blockerReason && (
                <div className="p-3 bg-surface-negative border border-line rounded-vds-lg space-y-1 text-xs font-ui">
                  <span className="font-bold text-negative flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Lý do bị nghẽn:</span>
                  </span>
                  <p className="text-accent">{task.blockerReason}</p>
                </div>
              )}

              {/* Links */}
              {(task.workLink || task.resultLink) && (
                <div className="space-y-2 text-xs font-ui">
                  <label className="text-xs font-ui font-bold text-subdued-lighter">
                    Liên kết tài liệu
                  </label>
                  <div className="space-y-1.5">
                    {task.workLink && (
                      <a
                        href={task.workLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2.5 bg-surface-100 hover:bg-surface-200 rounded-vds-lg border border-line text-support hover:underline"
                      >
                        <Link className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate flex-1 font-medium">{task.workLink}</span>
                        <ExternalLink className="w-3 h-3 shrink-0 text-subdued" />
                      </a>
                    )}
                    {task.resultLink && (
                      <a
                        href={task.resultLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2.5 bg-surface-100 hover:bg-surface-200 rounded-vds-lg border border-line text-positive hover:underline"
                      >
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate flex-1 font-medium">{task.resultLink}</span>
                        <ExternalLink className="w-3 h-3 shrink-0 text-subdued" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              {(task.latestUpdateNote || task.details || (task as any).notes) && (
                <div className="space-y-1.5 text-xs font-ui">
                  <label className="text-xs font-ui font-bold text-subdued-lighter">
                    Ghi chú cập nhật
                  </label>
                  <div className="p-3 bg-surface-100 rounded-vds-lg border border-line text-ink-lighter leading-relaxed">
                    {task.latestUpdateNote || task.details || (task as any).notes}
                  </div>
                </div>
              )}

              {/* Logs */}
              {Array.isArray(task.logs) && task.logs.length > 0 && (
                <div className="space-y-2 text-xs font-ui">
                  <label className="text-xs font-ui font-bold text-subdued-lighter flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5" />
                    <span>Nhật ký thay đổi ({task.logs.length})</span>
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
                    {task.logs.map((log, idx) => (
                      <div
                        key={log?.id || idx}
                        className="p-3 bg-surface-100 rounded-vds-lg border border-line space-y-1"
                      >
                        <div className="flex items-center justify-between text-xs text-subdued">
                          <span className="font-bold text-ink">{log?.author || 'Hệ thống'}</span>
                          <span>{formatDateWithEnDay(log?.timestamp, true)}</span>
                        </div>
                        <p className="font-medium text-ink">{log?.action || ''}</p>
                        {Array.isArray(log?.changes) && log.changes.length > 0 && (
                          <div className="text-xs text-subdued space-y-0.5 pt-1 border-t border-divider">
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
              <div className="p-4 bg-surface-100 border border-line rounded-vds-lg text-xs font-ui text-subdued">
                Không tìm thấy dữ liệu chi tiết của dự án này.
              </div>
            );
          }

          return (
            <div className="space-y-5">
              {/* Name & Code */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-num text-xs font-bold px-2 py-0.5 rounded-vds-md bg-surface-info text-support border border-line">
                    {proj.code || 'VNE'}
                  </span>
                  <span className="text-xs font-ui font-bold px-2 py-0.5 rounded-vds-md bg-surface-200 text-ink-lighter border border-line">
                    {proj.status || 'Đang triển khai'}
                  </span>
                </div>
                <h2 className="font-title text-base font-bold text-ink">
                  {proj.name || item.title || 'Dự án không tên'}
                </h2>
              </div>

              {/* Meta Grid */}
              <div className="grid grid-cols-2 gap-3 bg-surface-100 p-4 rounded-vds-lg border border-line text-xs font-ui">
                <div className="space-y-1">
                  <span className="text-subdued text-xs">Ngày bắt đầu:</span>
                  <p className="font-medium text-ink">{formatDateWithEnDay(proj.startDate) || 'Chưa cập nhật'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-subdued text-xs">Hạn hoàn thành:</span>
                  <p className="font-medium text-ink">{formatDateWithEnDay(proj.targetDate) || 'Chưa cập nhật'}</p>
                </div>
                <div className="space-y-1 col-span-2">
                  <span className="text-subdued text-xs">Product Owner:</span>
                  <p className="font-bold text-ink">{proj.productOwner || 'Chưa cập nhật'}</p>
                </div>
              </div>

              {/* Description & KPI */}
              {proj.description && (
                <div className="space-y-1.5 text-xs font-ui">
                  <label className="text-xs font-ui font-bold text-subdued-lighter">
                    Mô tả dự án
                  </label>
                  <div className="p-3 bg-surface-100 rounded-vds-lg border border-line text-ink-lighter leading-relaxed">
                    {proj.description}
                  </div>
                </div>
              )}

              {proj.objective && (
                <div className="space-y-1.5 text-xs font-ui">
                  <label className="text-xs font-ui font-bold text-subdued-lighter">
                    Mục tiêu & KPI
                  </label>
                  <div className="p-3 bg-surface-positive rounded-vds-lg border border-line text-positive leading-relaxed font-medium">
                    {proj.objective}
                  </div>
                </div>
              )}

              {/* Phases */}
              {Array.isArray(proj.phases) && proj.phases.length > 0 && (
                <div className="space-y-2 text-xs font-ui">
                  <label className="text-xs font-ui font-bold text-subdued-lighter">
                    Các giai đoạn ({proj.phases.length})
                  </label>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin">
                    {proj.phases.map((ph, idx) => (
                      <div key={ph?.id || idx} className="p-3 bg-surface rounded-vds-lg border border-line flex items-center justify-between">
                        <div className="space-y-0.5">
                          <p className="font-bold text-ink">{ph?.name || 'Giai đoạn'}</p>
                          <p className="text-xs text-subdued">Hạn: {formatDateWithEnDay(ph?.dueDate) || 'Chưa đặt'}</p>
                        </div>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-vds-md bg-surface-200 text-ink-lighter">
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
              <div className="p-4 bg-surface-100 border border-line rounded-vds-lg text-xs font-ui text-subdued">
                Không tìm thấy dữ liệu chi tiết của nhân sự này.
              </div>
            );
          }

          return (
            <div className="space-y-5">
              {/* Name & Salutation */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-ui font-bold px-2 py-0.5 rounded-vds-md bg-surface-positive text-positive border border-line">
                    {mem.group === 'Product' ? 'Ban Sản phẩm - Công nghệ' : 'Stakeholder'}
                  </span>
                  <span className="text-xs font-ui font-bold px-2 py-0.5 rounded-vds-md bg-surface-200 text-ink-lighter border border-line">
                    {mem.region || 'Hà Nội'}
                  </span>
                </div>
                <h2 className="font-title text-base font-bold text-ink">
                  {mem.salutation ? `${mem.salutation} ` : ''}{mem.name || item.title}
                </h2>
                {mem.username && (
                  <p className="text-xs font-num text-subdued">@{mem.username}</p>
                )}
              </div>

              {/* Meta Grid */}
              <div className="grid grid-cols-2 gap-3 bg-surface-100 p-4 rounded-vds-lg border border-line text-xs font-ui">
                <div className="space-y-1">
                  <span className="text-subdued text-xs">Chức vụ:</span>
                  <p className="font-bold text-ink">{mem.title || 'Nhân sự'}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-subdued text-xs">Phòng ban / Ban:</span>
                  <p className="font-medium text-ink">{mem.department || 'Ban Sản phẩm - Công nghệ'}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-subdued text-xs">Nhóm chuyên môn:</span>
                  <p className="font-bold text-accent">{mem.team || 'Chưa gán'}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-subdued text-xs">IP Phone:</span>
                  <p className="font-num font-bold text-ink">{mem.ipPhone || '—'}</p>
                </div>

                <div className="space-y-1 col-span-2">
                  <span className="text-subdued text-xs">Email công việc:</span>
                  <p className="font-medium text-support">{mem.email || '—'}</p>
                </div>

                {mem.gmail && (
                  <div className="space-y-1 col-span-2">
                    <span className="text-subdued text-xs">Gmail cá nhân:</span>
                    <p className="font-medium text-ink-lighter">{mem.gmail}</p>
                  </div>
                )}

                {mem.joinDate && (
                  <div className="space-y-1 col-span-2">
                    <span className="text-subdued text-xs">Ngày vào làm:</span>
                    <p className="font-medium text-ink">{mem.joinDate}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Fallback for other item types */}
        {item.type !== 'task' && item.type !== 'project' && item.type !== 'member' && (
          <div className="p-4 bg-surface-100 border border-line rounded-vds-lg text-xs font-ui text-subdued">
            Không hỗ trợ hiển thị chi tiết cho loại mục này.
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};
