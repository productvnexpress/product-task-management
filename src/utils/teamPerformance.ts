/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * PHÂN TÍCH HIỆU QUẢ TEAM (Team Performance Analysis)
 * ----------------------------------------------------
 * Chạy hoàn toàn trên trình duyệt, không gọi API AI.
 * Toàn bộ đánh giá dựa trên dữ liệu WMS có sẵn (tasks, logs, projects, nghỉ phép, ngày lễ)
 * và một bộ luật tường minh (rule-based). Mỗi kết luận luôn đi kèm lý do để người xem kiểm chứng.
 *
 * 1. Ngày công: mỗi ngày làm việc của một người (đã trừ lễ, nghỉ phép) được chia đều
 *    cho các task đang mở trong ngày đó (từ lúc "Đang làm"/tạo đến lúc bấm "Hoàn thành").
 * 2. Dòng việc: gom task theo dự án; task ở Others/folder được gom theo tiền tố tiêu đề
 *    ("Giải bóng rổ trẻ | ...", "Audio News: ...").
 * 3. Tín hiệu nội dung: từ khoá trong tiêu đề (đầu ra, làm lại, điều phối, báo cáo định kỳ, việc nhỏ).
 * 4. Đánh giá: cộng/trừ điểm theo luật → Đáng / Xem lại / Không đáng, kèm danh sách lý do.
 */

import { MemberItem, ProjectItem, TaskItem } from '../types';
import { workingTimeService } from '../services/workingTimeService';
import { getTaskCompletionDate } from './reportUtils';
import { getTodayDateString } from './dateUtils';
import { stripDiacritics, checkTitleQuality } from './titleQuality';
import { isSamePersonName } from './memberPersonalization';
import { formatDateWithEnDay } from './formatters';

// ==========================================
// 0. QUYỀN TRUY CẬP
// ==========================================

/** Tính năng dành riêng tài khoản Đặng Tiến Ngọc (tienngoc). Không mở theo role Admin được gán. */
export function canViewTeamPerformance(user?: MemberItem | null): boolean {
  if (!user) return false;
  const username = (user.username || '').trim().toLowerCase();
  const email = (user.email || '').trim().toLowerCase();
  return username === 'tienngoc' || email === 'tienngoc@vnexpress.net';
}

// ==========================================
// 1. KỲ PHÂN TÍCH
// ==========================================

export type PerfPeriodType = 'week' | 'month';

export interface PerfPeriod {
  type: PerfPeriodType;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  label: string;
}

const pad = (n: number) => String(n).padStart(2, '0');
const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromIso = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};
const addDays = (s: string, n: number) => {
  const d = fromIso(s);
  d.setDate(d.getDate() + n);
  return toIso(d);
};

/** Kỳ chứa ngày tham chiếu, dịch đi `offset` kỳ (-1 = kỳ trước). */
export function getPerfPeriod(type: PerfPeriodType, offset = 0, refDate: Date = new Date()): PerfPeriod {
  if (type === 'week') {
    const d = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
    const day = d.getDay();
    d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day) + offset * 7);
    const start = toIso(d);
    const end = addDays(start, 6);
    const week = getIsoWeek(d);
    return {
      type,
      startDate: start,
      endDate: end,
      label: `Tuần ${week} · ${formatDateWithEnDay(start)} – ${formatDateWithEnDay(end)}`,
    };
  }
  const first = new Date(refDate.getFullYear(), refDate.getMonth() + offset, 1);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
  return {
    type,
    startDate: toIso(first),
    endDate: toIso(last),
    label: `Tháng ${first.getMonth() + 1}/${first.getFullYear()}`,
  };
}

function getIsoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

// ==========================================
// 2. TỪ ĐIỂN TÍN HIỆU NỘI DUNG (không dấu, chữ thường)
// ==========================================

const SIGNALS = {
  output: ['order', 'spec', 'publish', 'public ', 'release', 'production', 'ra mat', 'ban giao', 'handoff', 'deploy', 'go live', 'golive', 'dua len', 'xuat ban'],
  rework: ['update', 'cap nhat', 'dieu chinh', 'sua lai', 'lam lai', 'demo lai', 'sau hop', 'sau cuoc hop', 'feedback', 'feeback', 'gop y', 'tiep tuc', 'chinh sua', 'toi uu lai', 'fix'],
  coordination: ['review', 'xin duyet', 'duyet ', 'theo doi', 'follow', 'trao doi', 'tong hop comment', 'bao cao tien do', 'hop ', 'check ', 'test', 'verify', 'kiem thu'],
  recurringReport: ['bao cao dinh ky', 'hang tuan', 'bao cao tuan', 'weekly', 'so lieu quy', 'du lieu quy', 'bao cao thang', 'bao cao quy', 'similarweb', '9m'],
  smallUnit: ['logo', 'slogan', 'banner', 'avatar', 'icon '],
} as const;

export type SignalKey = keyof typeof SIGNALS;

function normalizeText(s: string): string {
  return ` ${stripDiacritics((s || '').toLowerCase()).replace(/[^a-z0-9]+/g, ' ').trim()} `;
}

function detectSignals(title: string, isRecurring?: boolean): Record<SignalKey, boolean> {
  const t = normalizeText(title);
  const has = (list: readonly string[]) => list.some((k) => t.includes(` ${k.trim()} `) || t.includes(` ${k.trim()}`));
  return {
    output: has(SIGNALS.output),
    rework: has(SIGNALS.rework),
    coordination: has(SIGNALS.coordination),
    recurringReport: Boolean(isRecurring) || has(SIGNALS.recurringReport),
    smallUnit: has(SIGNALS.smallUnit),
  };
}

// ==========================================
// 3. MỐC THỜI GIAN TỪ LOG
// ==========================================

function logTime(ts: string): Date | null {
  const d = new Date(ts);
  return isNaN(d.getTime()) ? null : d;
}

function isStatusChangeTo(log: NonNullable<TaskItem['logs']>[number], status: string): boolean {
  return (log.changes || []).some((c) => c.field === 'Trạng thái' && c.newValue === status) ||
    (log.action || '').includes(`➔ ${status}`);
}

/** Ngày bắt đầu làm thực tế: lần đầu chuyển "Đang làm", nếu không có thì ngày tạo. */
function getStartDate(task: TaskItem): string {
  const logs = [...(task.logs || [])].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const started = logs.find((l) => isStatusChangeTo(l, 'Đang làm'));
  const d = logTime(started?.timestamp || task.createdAt);
  return d ? toIso(d) : (task.dueDate || getTodayDateString());
}

/** Ngày bấm "Hoàn thành" lần đầu (phục vụ tính công, khác với ngày hoàn thành đã điều chỉnh). */
function getFirstDoneClick(task: TaskItem): string | undefined {
  const logs = [...(task.logs || [])].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const done = logs.find((l) => isStatusChangeTo(l, 'Hoàn thành'));
  const d = done ? logTime(done.timestamp) : null;
  return d ? toIso(d) : undefined;
}

// ==========================================
// 4. KIỂU DỮ LIỆU KẾT QUẢ
// ==========================================

export type Verdict = 'worth' | 'review' | 'not_worth';

export const VERDICT_LABEL: Record<Verdict, string> = {
  worth: 'Đáng',
  review: 'Xem lại',
  not_worth: 'Không đáng',
};

export interface TaskPerf {
  task: TaskItem;
  personDays: number;
  completionDate?: string;
  lateDays: number | null; // null = chưa hoàn thành
  isOpenOverdue: boolean;
  extensions: number;
  wasBlocked: boolean;
  isVague: boolean;
  signals: Record<SignalKey, boolean>;
  streamKey: string;
}

export interface StreamPerf {
  key: string;
  label: string;
  projectId?: string;
  hasRealProject: boolean;
  tasks: TaskPerf[];
  personDays: number;
  lateCount: number;
  doneCount: number;
  members: { name: string; personDays: number; count: number }[];
  ratios: Record<SignalKey, number>;
  verdict: Verdict;
  score: number;
  reasons: { text: string; tone: 'plus' | 'minus' }[];
  projectMeta?: string;
}

export interface MemberPerf {
  member: MemberItem;
  tasks: TaskPerf[];
  streams: StreamPerf[];
  taskCount: number;
  doneCount: number;
  onTimeCount: number;
  onTimeRate: number | null;
  late1: number;
  late2: number;
  openOverdue: number;
  personDays: number;
  capacityDays: number;
  leaveDays: number;
  idleDays: string[];
  extensions: number;
  blocked: number;
  vagueTitles: TaskPerf[];
  othersShare: number;
  verdictDays: Record<Verdict, number>;
  flags: string[];
  summary: string;
}

export interface Recommendation {
  title: string;
  detail: string;
  recoverableDays: number;
  owner: string;
}

export interface TeamPerfReport {
  period: PerfPeriod;
  workingDays: number;
  taskCount: number;
  doneCount: number;
  onTimeCount: number;
  onTimeRate: number | null;
  personDays: number;
  members: MemberPerf[];
  projects: StreamPerf[];
  verdictDays: Record<Verdict, number>;
  recommendations: Recommendation[];
  unclassifiedCount: number;
}

// ==========================================
// 5. GOM DÒNG VIỆC
// ==========================================

const OTHERS_RX = /chưa xác định|others/i;

function getTitlePrefix(title: string): string | null {
  const m = title.match(/^\s*\[?([^|:\]]{3,40}?)\]?\s*[|:]\s+\S/);
  if (!m) return null;
  const p = m[1].trim();
  // Bỏ tiền tố chung chung không mang nghĩa dòng việc
  if (/^(mb|pc|gấp|gap|fo|re|fw)$/i.test(stripDiacritics(p))) return null;
  return p;
}

function streamOf(task: TaskItem, projectsById: Map<string, ProjectItem>): { key: string; label: string; projectId?: string; real: boolean } {
  const proj = task.projectId ? projectsById.get(task.projectId) : undefined;
  const projName = proj?.name || task.projectName || '';
  if (proj && !OTHERS_RX.test(projName)) {
    return { key: `p:${proj.id}`, label: proj.name, projectId: proj.id, real: true };
  }
  const prefix = getTitlePrefix(task.title);
  if (prefix) {
    return { key: `t:${normalizeText(prefix).trim()}`, label: prefix, real: false };
  }
  // Chỉ dùng folder khi task nằm trực tiếp trong folder (không thuộc Others) và là folder con
  const isDirectFolder = !task.projectId || task.projectId.startsWith('folder:') || /^\[Folder:/.test(task.projectName || '');
  const folder = isDirectFolder ? (task.projectName || '').replace(/^\[Folder:[^\]]+\]\s*/, '') || task.folderName || '' : '';
  if (folder && folder.includes('›') && !OTHERS_RX.test(folder)) {
    const short = folder.split('›').pop()!.trim();
    return { key: `f:${normalizeText(short).trim()}`, label: `Folder ${short}`, real: false };
  }
  return { key: 'x:others', label: 'Việc lẻ (Others)', real: false };
}

// ==========================================
// 6. LUẬT ĐÁNH GIÁ DÒNG VIỆC
// ==========================================

function projectMetaText(p?: ProjectItem, today = getTodayDateString()): string | undefined {
  if (!p) return undefined;
  const parts: string[] = [p.status];
  if (p.isStrategic) parts.push('Chiến lược');
  if (p.targetDate) parts.push(p.targetDate < today && !/hoàn thành/i.test(p.status) ? `Hạn ${formatDateWithEnDay(p.targetDate)} đã qua` : `Hạn ${formatDateWithEnDay(p.targetDate)}`);
  if (p.objective) parts.push(`KPI: ${p.objective.replace(/\s+/g, ' ').slice(0, 90)}`);
  return parts.join(' · ');
}

function evaluateStream(s: Omit<StreamPerf, 'verdict' | 'score' | 'reasons'>, project?: ProjectItem, today = getTodayDateString()): Pick<StreamPerf, 'verdict' | 'score' | 'reasons'> {
  const reasons: StreamPerf['reasons'] = [];
  let score = 0;
  const n = s.tasks.length;
  const pct = (x: number) => `${Math.round(x * 100)}%`;

  if (project?.isStrategic) { score += 2; reasons.push({ tone: 'plus', text: 'Dự án chiến lược.' }); }
  if (project?.objective && project.objective.trim().length > 5) { score += 1; reasons.push({ tone: 'plus', text: 'Dự án có mục tiêu/KPI rõ.' }); }
  if (s.ratios.output >= 0.3) { score += 1; reasons.push({ tone: 'plus', text: `${pct(s.ratios.output)} task có đầu ra cụ thể (order, spec, publish, release).` }); }

  if (!s.hasRealProject && s.personDays >= 3) { score -= 1; reasons.push({ tone: 'minus', text: `${s.personDays.toFixed(1)} ngày công nhưng chưa có dự án, KPI hay người duyệt trong WMS.` }); }
  if (n >= 3 && s.ratios.rework >= 0.4) { score -= 1; reasons.push({ tone: 'minus', text: `${pct(s.ratios.rework)} task là sửa, cập nhật, làm lại theo feedback.` }); }
  if (s.doneCount >= 2 && s.lateCount / s.doneCount >= 0.4) { score -= 1; reasons.push({ tone: 'minus', text: `${s.lateCount}/${s.doneCount} task đóng trễ hạn.` }); }
  if (n >= 2 && s.ratios.coordination >= 0.5) { score -= 1; reasons.push({ tone: 'minus', text: `${pct(s.ratios.coordination)} task là review, xin duyệt, theo dõi, báo cáo tiến độ.` }); }
  if (s.personDays >= 2 && s.ratios.recurringReport >= 0.5) { score -= 2; reasons.push({ tone: 'minus', text: 'Phần lớn là báo cáo, số liệu định kỳ. Nên tự động hoá.' }); }
  const small = s.tasks.filter((t) => t.signals.smallUnit);
  const heavySmall = small.filter((t) => t.personDays >= 0.75);
  if (heavySmall.length > 0 && heavySmall.length / Math.max(n, 1) >= 0.25) {
    score -= 1; reasons.push({ tone: 'minus', text: `${heavySmall.length} việc nhỏ (logo, banner…) chiếm gần trọn ngày công.` });
  }
  if (project?.targetDate && project.targetDate < today && !/hoàn thành/i.test(project.status)) {
    score -= 1; reasons.push({ tone: 'minus', text: `Dự án đã qua hạn ${formatDateWithEnDay(project.targetDate)} nhưng chưa hoàn thành.` });
  }
  if (reasons.length === 0) reasons.push({ tone: 'plus', text: 'Không có tín hiệu bất thường.' });

  const verdict: Verdict = score >= 1 ? 'worth' : score <= -2 ? 'not_worth' : 'review';
  // Dòng việc không có tín hiệu xấu nào vẫn được xem là đáng
  const finalVerdict: Verdict = verdict === 'review' && !reasons.some((r) => r.tone === 'minus') ? 'worth' : verdict;
  return { verdict: finalVerdict, score, reasons };
}

function buildStream(key: string, label: string, list: TaskPerf[], hasRealProject: boolean, project?: ProjectItem, today?: string): StreamPerf {
  const pdSum = list.reduce((a, t) => a + t.personDays, 0);
  const memberMap = new Map<string, { name: string; personDays: number; count: number }>();
  list.forEach((t) => {
    const m = memberMap.get(t.task.assignee) || { name: t.task.assignee, personDays: 0, count: 0 };
    m.personDays += t.personDays;
    m.count += 1;
    memberMap.set(t.task.assignee, m);
  });
  const ratio = (k: SignalKey) => (list.length ? list.filter((t) => t.signals[k]).length / list.length : 0);
  const base = {
    key,
    label,
    projectId: project?.id,
    hasRealProject,
    tasks: list,
    personDays: pdSum,
    lateCount: list.filter((t) => (t.lateDays ?? 0) > 0 || t.isOpenOverdue).length,
    doneCount: list.filter((t) => t.lateDays !== null).length,
    members: [...memberMap.values()].sort((a, b) => b.personDays - a.personDays),
    ratios: {
      output: ratio('output'),
      rework: ratio('rework'),
      coordination: ratio('coordination'),
      recurringReport: ratio('recurringReport'),
      smallUnit: ratio('smallUnit'),
    },
    projectMeta: project ? projectMetaText(project, today) : hasRealProject ? undefined : 'Chưa có dự án trong WMS',
  };
  return { ...base, ...evaluateStream(base, project, today) };
}

// ==========================================
// 7. HÀM CHÍNH
// ==========================================

export function analyzeTeamPerformance(
  tasks: TaskItem[],
  projects: ProjectItem[],
  members: MemberItem[],
  period: PerfPeriod,
  refDate: Date = new Date()
): TeamPerfReport {
  const today = getTodayDateString(refDate);
  const projectsById = new Map(projects.map((p) => [p.id, p]));
  const productMembers = members.filter((m) => m.group === 'Product');

  const periodEnd = period.endDate < today ? period.endDate : today;
  const days: string[] = [];
  for (let d = period.startDate; d <= period.endDate; d = addDays(d, 1)) days.push(d);
  const workingDays = days.filter((d) => workingTimeService.getWorkingDayWeight(d) > 0).length;

  const memberReports: MemberPerf[] = [];
  const allTaskPerfs: TaskPerf[] = [];

  for (const member of productMembers) {
    const own = tasks.filter((t) => isSamePersonName(t.assignee, member.name));
    // 7.1 Khoảng thời gian làm từng task
    const spans = new Map<string, { s: string; e: string }>();
    own.forEach((t) => {
      const due = t.dueDate || toIso(new Date(t.createdAt));
      let s = getStartDate(t);
      const e = getFirstDoneClick(t) || (t.status === 'Hoàn thành' ? (getTaskCompletionDate(t) || due) : (today > due ? today : due));
      const minStart = addDays(due, -10); // bỏ qua trạng thái "Đang làm" treo quá lâu
      if (s < minStart) s = minStart;
      spans.set(t.id, { s: s <= e ? s : e, e });
    });

    // 7.2 Chia ngày công (cửa sổ rộng hơn kỳ 45 ngày để task kéo dài được tính đủ)
    const alloc = new Map<string, number>();
    const winStart = addDays(period.startDate, -45);
    const winEnd = addDays(period.endDate, 15) < today ? addDays(period.endDate, 15) : today;
    for (let d = winStart; d <= winEnd; d = addDays(d, 1)) {
      const w = workingTimeService.getWorkingDayWeight(d, member.name);
      if (w <= 0) continue;
      const active = own.filter((t) => {
        const sp = spans.get(t.id)!;
        return sp.s <= d && d <= sp.e;
      });
      active.forEach((t) => alloc.set(t.id, (alloc.get(t.id) || 0) + w / active.length));
    }

    // 7.3 Task thuộc kỳ: có hạn trong kỳ
    const inPeriod = own.filter((t) => t.dueDate && t.dueDate >= period.startDate && t.dueDate <= period.endDate);
    const perfs: TaskPerf[] = inPeriod.map((t) => {
      const completion = t.status === 'Hoàn thành' ? getTaskCompletionDate(t) : undefined;
      const lateDays = completion ? Math.round((fromIso(completion).getTime() - fromIso(t.dueDate!).getTime()) / 86400000) : null;
      const logs = t.logs || [];
      return {
        task: t,
        personDays: alloc.get(t.id) || 0,
        completionDate: completion,
        lateDays,
        isOpenOverdue: !completion && t.dueDate! < today,
        extensions: logs.filter((l) => /gia hạn|đổi thời hạn/i.test(l.action || '')).length,
        wasBlocked: t.status === 'Bị nghẽn' || logs.some((l) => isStatusChangeTo(l, 'Bị nghẽn')),
        isVague: checkTitleQuality(t.title).isVague,
        signals: detectSignals(t.title, t.isRecurring),
        streamKey: streamOf(t, projectsById).key,
      };
    });
    allTaskPerfs.push(...perfs);

    // 7.4 Dòng việc của thành viên
    const groups = new Map<string, TaskPerf[]>();
    const labels = new Map<string, { label: string; real: boolean; projectId?: string }>();
    perfs.forEach((p) => {
      const st = streamOf(p.task, projectsById);
      groups.set(st.key, [...(groups.get(st.key) || []), p]);
      labels.set(st.key, { label: st.label, real: st.real, projectId: st.projectId });
    });
    const streams = [...groups.entries()]
      .map(([k, list]) => {
        const l = labels.get(k)!;
        return buildStream(k, l.label, list, l.real, l.projectId ? projectsById.get(l.projectId) : undefined, today);
      })
      .sort((a, b) => b.personDays - a.personDays);

    // 7.5 Chỉ số
    const done = perfs.filter((p) => p.lateDays !== null);
    const onTime = done.filter((p) => (p.lateDays ?? 0) <= 0).length;
    const capacityDays = days.filter((d) => d <= periodEnd).reduce((a, d) => a + workingTimeService.getWorkingDayWeight(d, member.name), 0);
    const baseDays = days.filter((d) => d <= periodEnd).reduce((a, d) => a + workingTimeService.getWorkingDayWeight(d), 0);
    const idleDays = days.filter((d) => d <= periodEnd && workingTimeService.getWorkingDayWeight(d, member.name) >= 1 &&
      !own.some((t) => { const sp = spans.get(t.id)!; return sp.s <= d && d <= sp.e; }));
    const pdSum = perfs.reduce((a, p) => a + p.personDays, 0);
    const othersDays = streams.filter((s) => !s.hasRealProject).reduce((a, s) => a + s.personDays, 0);
    const verdictDays: Record<Verdict, number> = { worth: 0, review: 0, not_worth: 0 };
    streams.forEach((s) => { verdictDays[s.verdict] += s.personDays; });

    const flags: string[] = [];
    const late1 = done.filter((p) => p.lateDays === 1).length;
    const late2 = done.filter((p) => (p.lateDays ?? 0) >= 2).length;
    const openOverdue = perfs.filter((p) => p.isOpenOverdue).length;
    if (late1 >= 3) flags.push(`${late1} task đóng trễ 1 ngày: thường do sáng hôm sau mới bấm hoàn thành.`);
    if (late2 >= 2) flags.push(`${late2} task trễ từ 2 ngày trở lên.`);
    if (openOverdue > 0) flags.push(`${openOverdue} task quá hạn chưa đóng.`);
    if (idleDays.length >= 2) flags.push(`${idleDays.length} ngày làm việc không có task nào đang mở.`);
    const ext = perfs.reduce((a, p) => a + p.extensions, 0);
    if (ext >= 3) flags.push(`${ext} lần gia hạn.`);
    const blocked = perfs.filter((p) => p.wasBlocked).length;
    if (blocked >= 2) flags.push(`${blocked} task từng bị nghẽn.`);
    if (pdSum > 0 && othersDays / pdSum >= 0.4) flags.push(`${Math.round((100 * othersDays) / pdSum)}% công nằm ngoài dự án (Others, folder).`);
    if (streams.length >= 6) flags.push(`Làm trên ${streams.length} dòng việc, dễ phân tán.`);
    const vague = perfs.filter((p) => p.isVague);
    if (vague.length >= 2) flags.push(`${vague.length} tiêu đề task quá chung chung.`);
    const leaveDays = Math.max(0, baseDays - capacityDays);

    const onTimeRate = done.length ? onTime / done.length : null;
    const top = streams[0];
    const summaryParts: string[] = [];
    if (perfs.length === 0) summaryParts.push('Không có task có hạn trong kỳ.');
    else {
      if (top) summaryParts.push(`Công tập trung nhiều nhất vào ${top.label} (${Math.round((100 * top.personDays) / Math.max(pdSum, 0.01))}%).`);
      const worthPct = pdSum ? verdictDays.worth / pdSum : 0;
      if (worthPct >= 0.7) summaryParts.push('Phần lớn công đi vào dòng việc đáng làm.');
      else if (verdictDays.not_worth / Math.max(pdSum, 0.01) >= 0.25) summaryParts.push('Có phần công đáng kể chưa tương xứng giá trị.');
      else summaryParts.push('Một phần công cần xem lại cách làm.');
    }

    memberReports.push({
      member,
      tasks: perfs,
      streams,
      taskCount: perfs.length,
      doneCount: done.length,
      onTimeCount: onTime,
      onTimeRate,
      late1,
      late2,
      openOverdue,
      personDays: pdSum,
      capacityDays,
      leaveDays,
      idleDays,
      extensions: ext,
      blocked,
      vagueTitles: vague,
      othersShare: pdSum ? othersDays / pdSum : 0,
      verdictDays,
      flags,
      summary: summaryParts.join(' '),
    });
  }

  // 7.6 Lớp dự án (gộp toàn ban)
  const projGroups = new Map<string, TaskPerf[]>();
  allTaskPerfs.forEach((p) => projGroups.set(p.streamKey, [...(projGroups.get(p.streamKey) || []), p]));
  const projectsPerf = [...projGroups.entries()]
    .map(([k, list]) => {
      const st = streamOf(list[0].task, projectsById);
      return buildStream(k, st.label, list, st.real, st.projectId ? projectsById.get(st.projectId) : undefined, today);
    })
    .sort((a, b) => b.personDays - a.personDays);

  const verdictDays: Record<Verdict, number> = { worth: 0, review: 0, not_worth: 0 };
  projectsPerf.forEach((s) => { verdictDays[s.verdict] += s.personDays; });

  // 7.7 Khuyến nghị lấy lại ngày công
  const recs: Recommendation[] = [];
  memberReports.forEach((m) => {
    // Báo cáo định kỳ xét trên toàn bộ task của người đó (thường bị rải ở nhiều dự án)
    const reports = m.tasks.filter((t) => t.signals.recurringReport);
    const reportDays = reports.reduce((a, t) => a + t.personDays, 0);
    if (reportDays >= 1.5) {
      recs.push({
        owner: m.member.name,
        title: 'Tự động hoá báo cáo, số liệu định kỳ',
        detail: `${reports.length} task báo cáo định kỳ, ${reportDays.toFixed(1).replace('.', ',')} ngày công.`,
        recoverableDays: reportDays * 0.6,
      });
    }
    m.streams.forEach((s) => {
      const owner = m.member.name;
      if (s.ratios.recurringReport >= 0.5) {
        return;
      } else if (s.tasks.length >= 3 && s.ratios.rework >= 0.4) {
        recs.push({ owner, title: `Chốt yêu cầu trước khi làm: ${s.label}`, detail: `${Math.round(s.ratios.rework * 100)}% task là làm lại theo feedback.`, recoverableDays: s.personDays * s.ratios.rework * 0.5 });
      } else if (s.tasks.length >= 2 && s.ratios.coordination >= 0.5) {
        recs.push({ owner, title: `Giảm vòng review, xin duyệt: ${s.label}`, detail: `${Math.round(s.ratios.coordination * 100)}% task là điều phối.`, recoverableDays: s.personDays * 0.4 });
      } else if (!s.hasRealProject && s.personDays >= 3) {
        recs.push({ owner, title: `Lập dự án hoặc dừng: ${s.label}`, detail: `${s.personDays.toFixed(1)} ngày công chưa có dự án và người duyệt.`, recoverableDays: 0 });
      }
    });
  });
  recs.sort((a, b) => b.recoverableDays - a.recoverableDays);

  const done = allTaskPerfs.filter((p) => p.lateDays !== null);
  const onTime = done.filter((p) => (p.lateDays ?? 0) <= 0).length;

  return {
    period,
    workingDays,
    taskCount: allTaskPerfs.length,
    doneCount: done.length,
    onTimeCount: onTime,
    onTimeRate: done.length ? onTime / done.length : null,
    personDays: allTaskPerfs.reduce((a, p) => a + p.personDays, 0),
    members: memberReports.sort((a, b) => b.personDays - a.personDays),
    projects: projectsPerf,
    verdictDays,
    recommendations: recs.slice(0, 8),
    unclassifiedCount: allTaskPerfs.filter((p) => !p.streamKey.startsWith('p:')).length,
  };
}
