/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProjectItem, ProjectPhase, TaskItem } from '../types';

export type ForecastHealth = 'On Track' | 'At Risk' | 'Delayed' | 'Completed';

export interface ProjectTimelineForecast {
  health: ForecastHealth;
  healthLabel: string;
  healthColor: string;
  healthBg: string;
  healthBorder: string;
  predictedDate: string;
  varianceDays: number; // positive = days delayed, negative = days earlier, 0 = on time
  varianceText: string;
  confidenceScore: number; // 0 - 100%
  completedPhasesCount: number;
  totalPhasesCount: number;
  progressPercent: number;
  daysToTarget: number; // days from today to final milestone targetDate
  isTargetOverdue: boolean;
  activePhase: ProjectPhase | null;
  riskFactors: string[];
  recommendations: string[];
  summary: string;
}

/**
 * Parses date string (YYYY-MM-DD) into Date object at midnight UTC/local
 */
export function parseDateSafe(dateStr?: string): Date {
  if (!dateStr) return new Date();
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  return new Date(dateStr);
}

/**
 * Calculates day difference (b - a in days)
 */
export function diffInDays(from: Date, to: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((to.getTime() - from.getTime()) / msPerDay);
}

/**
 * Format date to YYYY-MM-DD
 */
export function formatDateIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Computes deep timeline forecast and phase progression for a Project
 */
export function calculateProjectForecast(
  project: ProjectItem,
  projectTasks: TaskItem[] = [],
  referenceDateStr = '2026-09-03' // Using current system date
): ProjectTimelineForecast {
  const today = parseDateSafe(referenceDateStr);
  const targetDate = parseDateSafe(project.targetDate || '2026-11-30');
  const daysToTarget = diffInDays(today, targetDate);
  const isTargetOverdue = daysToTarget < 0 && project.status !== 'Hoàn thành' && (project.status as string) !== 'Đã hoàn thành';

  const phases = project.phases || [];
  const totalPhasesCount = phases.length;
  const completedPhases = phases.filter((p) => p.status === 'Đã hoàn thành');
  const completedPhasesCount = completedPhases.length;
  const blockedPhases = phases.filter((p) => p.status === 'Bị nghẽn');
  const inProgressPhases = phases.filter((p) => p.status === 'Đang triển khai');

  // Find active phase (currently in progress or first non-completed)
  const activePhase = inProgressPhases[0] || phases.find((p) => p.status !== 'Đã hoàn thành') || null;

  // Task metrics for this project
  const blockedTasks = projectTasks.filter((t) => t.status === 'Bị nghẽn');
  const uncompletedTasks = projectTasks.filter((t) => t.status !== 'Hoàn thành');

  const riskFactors: string[] = [];
  const recommendations: string[] = [];

  // Evaluate Phase risks
  phases.forEach((ph, idx) => {
    const phDate = parseDateSafe(ph.dueDate);
    const daysLeft = diffInDays(today, phDate);

    if (ph.status === 'Bị nghẽn') {
      riskFactors.push(`Phase ${idx + 1} ("${ph.name}") đang bị nghẽn tiến độ.`);
    } else if (ph.status !== 'Đã hoàn thành' && daysLeft < 0) {
      riskFactors.push(`Phase ${idx + 1} ("${ph.name}") đã quá hạn ${Math.abs(daysLeft)} ngày nhưng chưa hoàn thành.`);
    } else if (ph.status === 'Đang triển khai' && daysLeft >= 0 && daysLeft <= 3) {
      riskFactors.push(`Phase ${idx + 1} ("${ph.name}") sắp đến hạn trong ${daysLeft} ngày nữa.`);
    }
  });

  if (blockedTasks.length > 0) {
    riskFactors.push(`Có ${blockedTasks.length} công việc đang bị nghẽn cần các bộ phận hỗ trợ.`);
  }

  if (isTargetOverdue) {
    riskFactors.push(`Mốc ra mắt cuối cùng (${project.targetDate}) đã quá hạn ${Math.abs(daysToTarget)} ngày.`);
  }

  // Calculate Health & Variance
  let health: ForecastHealth = 'On Track';
  let varianceDays = 0;
  let confidenceScore = 90;

  if (project.status === 'Hoàn thành' || (project.status as string) === 'Đã hoàn thành') {
    health = 'Completed';
    varianceDays = 0;
    confidenceScore = 100;
  } else if (project.status === 'Tạm dừng' || blockedPhases.length > 0 || isTargetOverdue || blockedTasks.length >= 2) {
    health = 'Delayed';
    // Delayed projects typically push target date by 7 to 21 days
    varianceDays = blockedPhases.length > 0 ? 12 : (isTargetOverdue ? Math.abs(daysToTarget) + 7 : 10);
    confidenceScore = Math.max(40, 75 - riskFactors.length * 10);
  } else if (riskFactors.length > 0 || inProgressPhases.some((p) => diffInDays(today, parseDateSafe(p.dueDate)) <= 3)) {
    health = 'At Risk';
    varianceDays = 4;
    confidenceScore = 70;
  } else {
    health = 'On Track';
    varianceDays = 0;
    confidenceScore = 92;
  }

  // Calculate Predicted Completion Date
  const predictedDateObj = new Date(targetDate.getTime());
  if (varianceDays > 0) {
    predictedDateObj.setDate(predictedDateObj.getDate() + varianceDays);
  }
  const predictedDate = formatDateIso(predictedDateObj);

  // Recommendations formulation
  if (health === 'Delayed') {
    if (blockedPhases.length > 0) {
      recommendations.push(`Khẩn trương họp tháo gỡ tắc nghẽn cho ${blockedPhases[0].name} để không làm lùi mốc cuối.`);
    }
    if (blockedTasks.length > 0) {
      recommendations.push(`Ưu tiên giải quyết ${blockedTasks.length} task bị nghẽn từ các đơn vị kỹ thuật/đối tác.`);
    }
    recommendations.push(`Đề xuất điều chỉnh mốc ra mắt sang khoảng ${predictedDate} nếu phát sinh thêm phụ thuộc.`);
  } else if (health === 'At Risk') {
    recommendations.push(`Tăng cường phối hợp giữa PM và Thiết kế/SEO để chốt nghiệm thu phase đang chạy.`);
    recommendations.push(`Theo dõi sát sao hạn chót phase tiếp theo để kịp tiến độ.`);
  } else if (health === 'Completed') {
    recommendations.push(`Dự án đã cán đích thành công. Tiến hành đo lường hiệu quả và báo cáo KPI.`);
  } else {
    recommendations.push(`Tiến độ các phase đang bám sát kế hoạch. Duy trì nhịp độ triển khai hiện tại.`);
    recommendations.push(`Chuẩn bị tài liệu nghiệm thu cho mốc ra mắt ngày ${project.targetDate}.`);
  }

  // Health label and colors
  let healthLabel = 'Đúng tiến độ';
  let healthColor = 'text-[#24a148]';
  let healthBg = 'bg-[#e2f6e9]';
  let healthBorder = 'border-[#b8e8c4]';

  if (health === 'Completed') {
    healthLabel = 'Đã hoàn thành';
    healthColor = 'text-[#15803d]';
    healthBg = 'bg-[#f0fdf4]';
    healthBorder = 'border-[#bbf7d0]';
  } else if (health === 'At Risk') {
    healthLabel = 'Có nguy cơ trễ';
    healthColor = 'text-[#b26b00]';
    healthBg = 'bg-[#fcf5e8]';
    healthBorder = 'border-[#f5dbb0]';
  } else if (health === 'Delayed') {
    healthLabel = 'Dự báo trễ hạn';
    healthColor = 'text-[#da1e28]';
    healthBg = 'bg-[#fff0f1]';
    healthBorder = 'border-[#ffd0d3]';
  }

  // Variance text
  let varianceText = 'Đúng kế hoạch (±0 ngày)';
  if (health === 'Completed') {
    varianceText = 'Đã về đích thành công';
  } else if (varianceDays > 0) {
    varianceText = `Dự kiến chậm ${varianceDays} ngày so với mốc cuối`;
  } else if (varianceDays < 0) {
    varianceText = `Dự kiến sớm ${Math.abs(varianceDays)} ngày so với mốc cuối`;
  }

  // Overall progress percent based on phases & tasks
  const phaseWeight = totalPhasesCount > 0 ? (completedPhasesCount / totalPhasesCount) * 70 : 35;
  const taskWeight = projectTasks.length > 0 ? ((projectTasks.length - uncompletedTasks.length) / projectTasks.length) * 30 : 15;
  const progressPercent = (project.status === 'Hoàn thành' || (project.status as string) === 'Đã hoàn thành') ? 100 : Math.min(95, Math.round(phaseWeight + taskWeight));

  // Summary
  let summary = '';
  if (health === 'Completed') {
    summary = `Dự án "${project.name}" đã hoàn thành xuất sắc toàn bộ ${totalPhasesCount} giai đoạn và mốc ra mắt.`;
  } else if (health === 'Delayed') {
    summary = `Dự án có nguy cơ trễ hạn khoảng ${varianceDays} ngày do ${blockedPhases.length > 0 ? blockedPhases[0].name : 'tắc nghẽn phát sinh'}. Ngày hoàn thành dự kiến: ${predictedDate}.`;
  } else if (health === 'At Risk') {
    summary = `Tiến độ cần lưu ý, một số hạng mục đang sát hạn. Dự kiến hoàn thành vào khoảng ${predictedDate}.`;
  } else {
    summary = `Dự án đang triển khai thuận lợi, bám sát kế hoạch ra mắt vào ngày ${project.targetDate}.`;
  }

  return {
    health,
    healthLabel,
    healthColor,
    healthBg,
    healthBorder,
    predictedDate,
    varianceDays,
    varianceText,
    confidenceScore,
    completedPhasesCount,
    totalPhasesCount,
    progressPercent,
    daysToTarget,
    isTargetOverdue,
    activePhase,
    riskFactors,
    recommendations,
    summary,
  };
}
