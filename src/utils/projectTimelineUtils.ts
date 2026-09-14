/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProjectItem, MemberItem, ProjectPhase } from '../types';
import { getTodayDateString, normalizeDateString, getDaysDifference } from './dateUtils';
import { isSamePersonName } from './memberPersonalization';
import { formatDateWithEnDay } from './formatters';

export interface ProjectDateBounds {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  durationDays: number;
}

export type OverlapSeverity = 'critical' | 'moderate' | 'deadline_collision' | 'parallel';

export interface ProjectOverlapDetail {
  projectA: ProjectItem;
  projectB: ProjectItem;
  overlapStartDate: string;
  overlapEndDate: string;
  overlapDays: number;
  severity: OverlapSeverity;
  sharedPMs: string[];
  sharedDesigners: string[];
  sharedOthers: string[];
  isDeadlineCollision: boolean; // targetDate cách nhau <= 3 ngày
  description: string;
}

export interface ProjectOverlapSummary {
  projectId: string;
  hasOverlap: boolean;
  criticalCount: number;
  moderateCount: number;
  deadlineCollisionCount: number;
  conflictingProjectNames: string[];
  conflictingMemberNames: string[];
}

export interface MemberWorkloadItem {
  member: MemberItem;
  role: string;
  activeProjectsCount: number;
  projects: ProjectItem[];
  loadLevel: 'Bình thường' | 'Bận rộn' | 'Quá tải';
  warningMessage?: string;
}

/**
 * Xác định khoảng ngày bắt đầu và kết thúc chuẩn xác của dự án
 */
export function getProjectDateBounds(project: ProjectItem): ProjectDateBounds {
  const targetDate = normalizeDateString(project.targetDate) || getTodayDateString();

  let startDate = '';
  if (project.startDate) {
    startDate = normalizeDateString(project.startDate);
  } else if (project.phases && project.phases.length > 0) {
    // Sắp xếp các phase theo ngày
    const validPhaseDates = project.phases
      .map((p) => normalizeDateString(p.dueDate))
      .filter(Boolean)
      .sort();
    if (validPhaseDates.length > 0) {
      // Ước lượng ngày bắt đầu trước phase 1 khoảng 20 ngày
      const p1Date = new Date(validPhaseDates[0]);
      p1Date.setDate(p1Date.getDate() - 20);
      startDate = getTodayDateString(p1Date);
    }
  } else if (project.createdAt) {
    startDate = normalizeDateString(project.createdAt);
  }

  // Fallback an toàn: trước targetDate 45 ngày
  if (!startDate || startDate >= targetDate) {
    const d = new Date(targetDate);
    d.setDate(d.getDate() - 45);
    startDate = getTodayDateString(d);
  }

  const durationDays = Math.max(1, getDaysDifference(targetDate, startDate));

  return {
    startDate,
    endDate: targetDate,
    durationDays,
  };
}

/**
 * Rút gọn tên PM để hiển thị thẳng hàng trên bảng (ví dụ: Ngọc, Hiếu, Huy Anh)
 */
export function formatPmShortName(rawName?: string): string {
  if (!rawName) return '—';
  let clean = rawName.trim().replace(/^PM\s*:\s*/i, '').replace(/^[-,•]\s*/, '');
  if (!clean) return '—';

  // Nếu có nhiều người thì lấy người đầu tiên
  if (clean.includes(',')) {
    clean = clean.split(',')[0].trim();
  }

  // Giữ nguyên các tên ghép 2 từ thông dụng
  const compoundGivenNames = [
    'Huy Anh', 'Tuấn Anh', 'Quang Anh', 'Đức Anh', 'Minh Anh', 'Nhật Anh', 'Hoàng Anh',
    'Thế Anh', 'Việt Anh', 'Hải Anh', 'Thành Đạt', 'Minh Trí', 'Hải Đăng', 'Quốc Bảo',
    'Bảo Ngọc', 'Minh Ngọc', 'Hồng Ngọc', 'Kim Ngân'
  ];

  for (const compound of compoundGivenNames) {
    if (clean.toLowerCase().endsWith(compound.toLowerCase())) {
      return compound;
    }
  }

  const parts = clean.split(/\s+/);
  return parts[parts.length - 1] || clean;
}

/**
 * Trích xuất toàn bộ nhân sự tham gia dự án
 */
export function getProjectTeamMembers(project: ProjectItem): {
  pms: string[];
  designers: string[];
  seos: string[];
  datas: string[];
  all: string[];
} {
  const pms = [...(project.roles?.pm || [])];
  if (project.leadName) {
    project.leadName.split(/[,&]/).forEach((n) => {
      const trimmed = n.trim();
      if (trimmed && !pms.some((p) => isSamePersonName(p, trimmed))) {
        pms.push(trimmed);
      }
    });
  }

  const designers = [...(project.roles?.designer || [])];
  const seos = [...(project.roles?.seo || [])];
  const datas = [...(project.roles?.data || [])];

  const allSet = new Set<string>();
  [...pms, ...designers, ...seos, ...datas].forEach((name) => {
    if (name.trim()) allSet.add(name.trim());
  });

  return {
    pms,
    designers,
    seos,
    datas,
    all: Array.from(allSet),
  };
}

/**
 * Phát hiện toàn diện các cặp dự án bị chồng lấn thời gian & xung đột nhân sự
 */
export function detectProjectOverlaps(projects: ProjectItem[]): {
  overlapDetails: ProjectOverlapDetail[];
  projectOverlapMap: Map<string, ProjectOverlapSummary>;
  criticalConflictsCount: number;
  deadlineCollisionsCount: number;
  totalOverlappingPairs: number;
} {
  const overlapDetails: ProjectOverlapDetail[] = [];
  const projectOverlapMap = new Map<string, ProjectOverlapSummary>();

  // Khởi tạo map cho toàn bộ dự án
  projects.forEach((p) => {
    projectOverlapMap.set(p.id, {
      projectId: p.id,
      hasOverlap: false,
      criticalCount: 0,
      moderateCount: 0,
      deadlineCollisionCount: 0,
      conflictingProjectNames: [],
      conflictingMemberNames: [],
    });
  });

  const boundsMap = new Map<string, ProjectDateBounds>();
  const teamMap = new Map<string, ReturnType<typeof getProjectTeamMembers>>();

  projects.forEach((p) => {
    boundsMap.set(p.id, getProjectDateBounds(p));
    teamMap.set(p.id, getProjectTeamMembers(p));
  });

  for (let i = 0; i < projects.length; i++) {
    for (let j = i + 1; j < projects.length; j++) {
      const pA = projects[i];
      const pB = projects[j];

      // Bỏ qua dự án đã hoàn thành hoặc tạm dừng nếu không muốn tính xung đột
      if (pA.status === 'Hoàn thành' || pB.status === 'Hoàn thành') continue;

      const bA = boundsMap.get(pA.id)!;
      const bB = boundsMap.get(pB.id)!;

      // Kiểm tra giao nhau mốc thời gian: max(startA, startB) <= min(endA, endB)
      const overlapStart = bA.startDate > bB.startDate ? bA.startDate : bB.startDate;
      const overlapEnd = bA.endDate < bB.endDate ? bA.endDate : bB.endDate;

      const isTimeOverlapping = overlapStart <= overlapEnd;
      const daysDiffTarget = Math.abs(getDaysDifference(bA.endDate, bB.endDate));
      const isDeadlineCollision = daysDiffTarget <= 3; // Cùng kết thúc sát nhau

      if (isTimeOverlapping || isDeadlineCollision) {
        const teamA = teamMap.get(pA.id)!;
        const teamB = teamMap.get(pB.id)!;

        // Tìm nhân sự chung
        const sharedPMs = teamA.pms.filter((pmA) =>
          teamB.pms.some((pmB) => isSamePersonName(pmA, pmB))
        );
        const sharedDesigners = teamA.designers.filter((desA) =>
          teamB.designers.some((desB) => isSamePersonName(desA, desB))
        );
        const sharedOthers = [
          ...teamA.seos.filter((sA) => teamB.seos.some((sB) => isSamePersonName(sA, sB))),
          ...teamA.datas.filter((dA) => teamB.datas.some((dB) => isSamePersonName(dA, dB))),
        ];

        let severity: OverlapSeverity = 'parallel';
        let description = '';

        if (sharedPMs.length > 0 || sharedDesigners.length > 0) {
          severity = 'critical';
          const names = [...sharedPMs, ...sharedDesigners].join(', ');
          description = `Trùng nhân sự: ${names}`;
        } else if (sharedOthers.length > 0) {
          severity = 'moderate';
          const names = sharedOthers.join(', ');
          description = `Trùng hỗ trợ: ${names}`;
        } else if (isDeadlineCollision) {
          severity = 'deadline_collision';
          description = `Sát hạn chót (cách ${daysDiffTarget} ngày)`;
        } else {
          severity = 'parallel';
          description = `Song song ${getDaysDifference(overlapEnd, overlapStart)} ngày`;
        }

        const overlapDays = isTimeOverlapping
          ? Math.max(1, getDaysDifference(overlapEnd, overlapStart))
          : 0;

        overlapDetails.push({
          projectA: pA,
          projectB: pB,
          overlapStartDate: overlapStart,
          overlapEndDate: overlapEnd,
          overlapDays,
          severity,
          sharedPMs,
          sharedDesigners,
          sharedOthers,
          isDeadlineCollision,
          description,
        });

        // Cập nhật map cho pA
        const sumA = projectOverlapMap.get(pA.id)!;
        sumA.hasOverlap = true;
        if (severity === 'critical') sumA.criticalCount++;
        else if (severity === 'moderate') sumA.moderateCount++;
        if (isDeadlineCollision) sumA.deadlineCollisionCount++;
        if (!sumA.conflictingProjectNames.includes(pB.name)) {
          sumA.conflictingProjectNames.push(pB.name);
        }
        [...sharedPMs, ...sharedDesigners, ...sharedOthers].forEach((name) => {
          if (!sumA.conflictingMemberNames.includes(name)) {
            sumA.conflictingMemberNames.push(name);
          }
        });

        // Cập nhật map cho pB
        const sumB = projectOverlapMap.get(pB.id)!;
        sumB.hasOverlap = true;
        if (severity === 'critical') sumB.criticalCount++;
        else if (severity === 'moderate') sumB.moderateCount++;
        if (isDeadlineCollision) sumB.deadlineCollisionCount++;
        if (!sumB.conflictingProjectNames.includes(pA.name)) {
          sumB.conflictingProjectNames.push(pA.name);
        }
        [...sharedPMs, ...sharedDesigners, ...sharedOthers].forEach((name) => {
          if (!sumB.conflictingMemberNames.includes(name)) {
            sumB.conflictingMemberNames.push(name);
          }
        });
      }
    }
  }

  const criticalConflictsCount = overlapDetails.filter((d) => d.severity === 'critical').length;
  const deadlineCollisionsCount = overlapDetails.filter((d) => d.isDeadlineCollision).length;

  return {
    overlapDetails,
    projectOverlapMap,
    criticalConflictsCount,
    deadlineCollisionsCount,
    totalOverlappingPairs: overlapDetails.length,
  };
}

/**
 * Tính toán ma trận tải trọng nhân sự trong kỳ
 */
export function calculateMemberWorkload(
  projects: ProjectItem[],
  members: MemberItem[],
  targetPeriodStart: string,
  targetPeriodEnd: string
): MemberWorkloadItem[] {
  // Chỉ xét nhân sự Product
  const productMembers = members.filter(
    (m) => m.team && ['Product Manager', 'UX/UI Designer', 'SEO', 'Data'].includes(m.team)
  );

  return productMembers.map((member) => {
    // Tìm các dự án đang chạy mà nhân sự này tham gia
    const activeProjects = projects.filter((p) => {
      if (p.status === 'Hoàn thành') return false;
      const bounds = getProjectDateBounds(p);
      // Có giao nhau với kỳ targetPeriod
      const inPeriod =
        bounds.startDate <= targetPeriodEnd && bounds.endDate >= targetPeriodStart;
      if (!inPeriod) return false;

      const team = getProjectTeamMembers(p);
      return team.all.some((n) => isSamePersonName(n, member.name));
    });

    const count = activeProjects.length;
    let loadLevel: 'Bình thường' | 'Bận rộn' | 'Quá tải' = 'Bình thường';
    let warningMessage: string | undefined = undefined;

    if (count >= 3) {
      loadLevel = 'Quá tải';
      warningMessage = `Phụ trách ${count} dự án đồng thời trong kỳ`;
    } else if (count === 2) {
      loadLevel = 'Bận rộn';
      warningMessage = `Tham gia 2 dự án song song`;
    } else if (count === 1) {
      loadLevel = 'Bình thường';
    }

    return {
      member,
      role: member.team,
      activeProjectsCount: count,
      projects: activeProjects,
      loadLevel,
      warningMessage,
    };
  }).sort((a, b) => b.activeProjectsCount - a.activeProjectsCount);
}

/**
 * Tạo thang đo dòng thời gian (Timeline Scale) cho Month / Week / Day
 */
export interface TimeScaleColumn {
  id: string;
  label: string;
  subLabel?: string;
  startDate: string;
  endDate: string;
  isToday?: boolean;
}

export function generateTimeScale(
  viewMode: 'day' | 'week' | 'month',
  refDate: Date = new Date()
): {
  columns: TimeScaleColumn[];
  minDate: string;
  maxDate: string;
  windowLabel: string;
} {
  const todayStr = getTodayDateString(refDate);

  if (viewMode === 'month') {
    // Hiển thị 5 tháng: Tháng trước, Tháng hiện tại, và 3 tháng tiếp theo
    const currentYear = refDate.getFullYear();
    const currentMonth = refDate.getMonth(); // 0-11
    const columns: TimeScaleColumn[] = [];

    for (let i = -1; i <= 3; i++) {
      const d = new Date(currentYear, currentMonth + i, 1);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      const lastDay = new Date(y, m, 0);

      const sDate = getTodayDateString(d);
      const eDate = getTodayDateString(lastDay);

      columns.push({
        id: `m-${y}-${m}`,
        label: `Tháng ${m}/${y}`,
        subLabel: `${d.getDate()}/${m} - ${lastDay.getDate()}/${m}`,
        startDate: sDate,
        endDate: eDate,
        isToday: todayStr >= sDate && todayStr <= eDate,
      });
    }

    return {
      columns,
      minDate: columns[0].startDate,
      maxDate: columns[columns.length - 1].endDate,
      windowLabel: `${columns[0].label} – ${columns[columns.length - 1].label}`,
    };
  }

  if (viewMode === 'week') {
    // Hiển thị 8 tuần xung quanh ngày hiện tại (-2 tuần đến +5 tuần)
    const columns: TimeScaleColumn[] = [];
    const d = new Date(refDate);
    const dayOfWeek = d.getDay(); // 0 = CN, 1 = T2
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const currentMonday = new Date(d);
    currentMonday.setDate(d.getDate() + diffToMonday);

    for (let w = -2; w <= 5; w++) {
      const wMon = new Date(currentMonday);
      wMon.setDate(currentMonday.getDate() + w * 7);

      const wSun = new Date(wMon);
      wSun.setDate(wMon.getDate() + 6);

      const sDate = getTodayDateString(wMon);
      const eDate = getTodayDateString(wSun);

      const weekNum = getWeekNumber(wMon);

      columns.push({
        id: `w-${sDate}`,
        label: `Tuần ${weekNum}`,
        subLabel: `${wMon.getDate()}/${wMon.getMonth() + 1} - ${wSun.getDate()}/${wSun.getMonth() + 1}`,
        startDate: sDate,
        endDate: eDate,
        isToday: todayStr >= sDate && todayStr <= eDate,
      });
    }

    return {
      columns,
      minDate: columns[0].startDate,
      maxDate: columns[columns.length - 1].endDate,
      windowLabel: `${columns[0].subLabel} – ${columns[columns.length - 1].subLabel}`,
    };
  }

  // viewMode === 'day'
  // Hiển thị 21 ngày: 4 ngày trước + hôm nay + 16 ngày tới
  const columns: TimeScaleColumn[] = [];
  const startDay = new Date(refDate);
  startDay.setDate(refDate.getDate() - 4);

  for (let i = 0; i < 21; i++) {
    const cur = new Date(startDay);
    cur.setDate(startDay.getDate() + i);
    const cStr = getTodayDateString(cur);

    const dayName = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][cur.getDay()];

    columns.push({
      id: `d-${cStr}`,
      label: `${dayName} ${cur.getDate()}/${cur.getMonth() + 1}`,
      startDate: cStr,
      endDate: cStr,
      isToday: cStr === todayStr,
    });
  }

  return {
    columns,
    minDate: columns[0].startDate,
    maxDate: columns[columns.length - 1].endDate,
    windowLabel: `${columns[0].startDate} – ${columns[columns.length - 1].endDate}`,
  };
}

/**
 * Tính số thứ tự tuần trong năm (ISO Week Number)
 */
function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Tính toán tọa độ vị trí phần trăm (%) của một dải ngày trên timeline
 */
export function calculateTimelinePosition(
  startDate: string,
  endDate: string,
  minDate: string,
  maxDate: string
): { leftPercent: number; widthPercent: number; isVisible: boolean } {
  const minMs = new Date(minDate + 'T00:00:00').getTime();
  const maxMs = new Date(maxDate + 'T23:59:59').getTime();
  const totalMs = maxMs - minMs;

  if (totalMs <= 0) return { leftPercent: 0, widthPercent: 0, isVisible: false };

  const startMs = new Date(startDate + 'T00:00:00').getTime();
  const endMs = new Date(endDate + 'T23:59:59').getTime();

  // Kiểm tra xem có nằm ngoài phạm vi hiển thị không
  if (endMs < minMs || startMs > maxMs) {
    return { leftPercent: 0, widthPercent: 0, isVisible: false };
  }

  const boundedStartMs = Math.max(minMs, startMs);
  const boundedEndMs = Math.min(maxMs, endMs);

  const leftPercent = Math.max(0, ((boundedStartMs - minMs) / totalMs) * 100);
  const widthPercent = Math.max(
    1.5,
    Math.min(100 - leftPercent, ((boundedEndMs - boundedStartMs) / totalMs) * 100)
  );

  return {
    leftPercent,
    widthPercent,
    isVisible: true,
  };
}
