/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProjectItem, ProjectHistoryLog, ProjectHistoryChange, ProjectPhase } from '../types';
import { formatDateWithEnDay } from './formatters';

export function formatProjectLogTimestamp(isoString?: string, includeTime: boolean = false): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;
  return formatDateWithEnDay(date, includeTime);
}

/**
 * Creates an initial project creation log if none exists
 */
export function createProjectInitialLog(project: ProjectItem, authorName?: string): ProjectHistoryLog {
  const author = authorName || project.roles?.pm?.[0] || 'Hệ thống';
  return {
    id: `plog-${project.id}-init`,
    timestamp: project.startDate ? `${project.startDate}T08:30:00.000Z` : '2026-09-01T08:30:00.000Z',
    author,
    action: 'Khởi tạo dự án',
    changes: [
      { field: 'Tên dự án', newValue: project.name },
      { field: 'Mã dự án', newValue: project.code },
      { field: 'Trạng thái', newValue: project.status },
      { field: 'Ngày bắt đầu', newValue: formatDateWithEnDay(project.startDate || '2026-09-01') },
      { field: 'Hạn hoàn thành', newValue: formatDateWithEnDay(project.targetDate) },
      ...(project.productOwner ? [{ field: 'Product Owner', newValue: project.productOwner }] : []),
    ],
    note: 'Khởi tạo hồ sơ dự án theo kế hoạch Ban Sản phẩm công nghệ VnExpress 2026.',
  };
}

/**
 * Compares oldProject vs updatedProject and generates a detailed ProjectHistoryLog
 */
export function recordProjectOverviewChanges(
  oldProject: ProjectItem,
  updatedProject: ProjectItem,
  authorName?: string,
  customNote?: string
): ProjectHistoryLog | null {
  const changes: ProjectHistoryChange[] = [];

  if (oldProject.name !== updatedProject.name) {
    changes.push({
      field: 'Tên dự án',
      oldValue: oldProject.name,
      newValue: updatedProject.name,
    });
  }

  if (oldProject.code !== updatedProject.code) {
    changes.push({
      field: 'Mã dự án',
      oldValue: oldProject.code,
      newValue: updatedProject.code,
    });
  }

  if (oldProject.status !== updatedProject.status) {
    changes.push({
      field: 'Trạng thái dự án',
      oldValue: oldProject.status,
      newValue: updatedProject.status,
    });
  }

  if (oldProject.startDate !== updatedProject.startDate) {
    changes.push({
      field: 'Ngày bắt đầu',
      oldValue: oldProject.startDate ? formatDateWithEnDay(oldProject.startDate) : 'Chưa đặt',
      newValue: updatedProject.startDate ? formatDateWithEnDay(updatedProject.startDate) : 'Chưa đặt',
    });
  }

  if (oldProject.targetDate !== updatedProject.targetDate) {
    changes.push({
      field: 'Hạn hoàn thành',
      oldValue: oldProject.targetDate ? formatDateWithEnDay(oldProject.targetDate) : 'Chưa đặt',
      newValue: updatedProject.targetDate ? formatDateWithEnDay(updatedProject.targetDate) : 'Chưa đặt',
    });
  }

  if (oldProject.productOwner !== updatedProject.productOwner) {
    changes.push({
      field: 'Product Owner',
      oldValue: oldProject.productOwner || 'Chưa có',
      newValue: updatedProject.productOwner || 'Chưa có',
    });
  }

  if (oldProject.description !== updatedProject.description) {
    changes.push({
      field: 'Mô tả phạm vi',
      oldValue: oldProject.description ? (oldProject.description.length > 40 ? oldProject.description.slice(0, 40) + '...' : oldProject.description) : 'Trống',
      newValue: updatedProject.description ? (updatedProject.description.length > 40 ? updatedProject.description.slice(0, 40) + '...' : updatedProject.description) : 'Trống',
    });
  }

  if (oldProject.objective !== updatedProject.objective) {
    changes.push({
      field: 'Mục tiêu & KPI',
      oldValue: oldProject.objective ? (oldProject.objective.length > 40 ? oldProject.objective.slice(0, 40) + '...' : oldProject.objective) : 'Trống',
      newValue: updatedProject.objective ? (updatedProject.objective.length > 40 ? updatedProject.objective.slice(0, 40) + '...' : updatedProject.objective) : 'Trống',
    });
  }

  // Compare roles
  const oldPm = (oldProject.roles?.pm || []).join(', ');
  const newPm = (updatedProject.roles?.pm || []).join(', ');
  if (oldPm !== newPm) {
    changes.push({ field: 'Product Manager (PM)', oldValue: oldPm || 'Chưa gán', newValue: newPm || 'Chưa gán' });
  }

  const oldDesigner = (oldProject.roles?.designer || []).join(', ');
  const newDesigner = (updatedProject.roles?.designer || []).join(', ');
  if (oldDesigner !== newDesigner) {
    changes.push({ field: 'UX/UI Designer', oldValue: oldDesigner || 'Chưa gán', newValue: newDesigner || 'Chưa gán' });
  }

  const oldSeo = (oldProject.roles?.seo || []).join(', ');
  const newSeo = (updatedProject.roles?.seo || []).join(', ');
  if (oldSeo !== newSeo) {
    changes.push({ field: 'SEO', oldValue: oldSeo || 'Chưa gán', newValue: newSeo || 'Chưa gán' });
  }

  const oldData = (oldProject.roles?.data || []).join(', ');
  const newData = (updatedProject.roles?.data || []).join(', ');
  if (oldData !== newData) {
    changes.push({ field: 'Data Specialist', oldValue: oldData || 'Chưa gán', newValue: newData || 'Chưa gán' });
  }

  if (changes.length === 0) return null;

  const author = authorName || updatedProject.roles?.pm?.[0] || 'Hệ thống';
  return {
    id: `plog-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    timestamp: new Date().toISOString(),
    author,
    action: 'Cập nhật thông tin tổng quan',
    changes,
    note: customNote || `Đã cập nhật ${changes.length} mục thông tin dự án.`,
  };
}

/**
 * Creates log when a phase is modified
 */
export function recordPhaseUpdateLog(
  oldPhase: ProjectPhase,
  newPhase: ProjectPhase,
  authorName?: string
): ProjectHistoryLog | null {
  const changes: ProjectHistoryChange[] = [];

  if (oldPhase.name !== newPhase.name) {
    changes.push({
      field: 'Tên giai đoạn',
      oldValue: oldPhase.name,
      newValue: newPhase.name,
    });
  }

  if (oldPhase.status !== newPhase.status) {
    changes.push({
      field: 'Trạng thái giai đoạn',
      oldValue: oldPhase.status,
      newValue: newPhase.status,
    });
  }

  if (oldPhase.dueDate !== newPhase.dueDate) {
    changes.push({
      field: 'Hạn hoàn thành giai đoạn',
      oldValue: oldPhase.dueDate ? formatDateWithEnDay(oldPhase.dueDate) : 'Chưa đặt',
      newValue: newPhase.dueDate ? formatDateWithEnDay(newPhase.dueDate) : 'Chưa đặt',
    });
  }

  if (oldPhase.description !== newPhase.description) {
    changes.push({
      field: 'Mô tả giai đoạn',
      oldValue: oldPhase.description || 'Trống',
      newValue: newPhase.description || 'Trống',
    });
  }

  if (changes.length === 0) return null;

  return {
    id: `plog-ph-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    timestamp: new Date().toISOString(),
    author: authorName || 'Hệ thống',
    action: `Cập nhật giai đoạn: ${newPhase.name}`,
    changes,
    note: `Điều chỉnh thông tin tiến độ của giai đoạn "${newPhase.name}".`,
  };
}
